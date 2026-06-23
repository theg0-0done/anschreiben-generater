import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { FormDataSchema } from "@/lib/types";
import { generateCoverLetterPdf } from "@/lib/pdf-generator";
import { insertCoverLetterPage } from "@/lib/pdf-merger";

const anthropic = new Anthropic({ apiKey: process.env.CLAUD_API_KEY || "" });

// ─── In-process hook cache (shared with inline generation) ───────────────────
const HOOK_CACHE_MAX = 50;
const hookCache = new Map<string, string>();

function hookCacheKey(companyName: string, companyInfo: string, firstName: string, lastName: string, targetJob: string): string {
  return createHash("sha1")
    .update(`${companyName}|${companyInfo}|${firstName}|${lastName}|${targetJob}`)
    .digest("hex");
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + " …";
}

/** Generate a hook paragraph via AI (or return cached). */
async function generateHookInline(
  companyName: string,
  companyInfo: string,
  firstName: string,
  lastName: string,
  targetJob: string
): Promise<{ hook: string; cached: boolean }> {
  const trimmedInfo = truncateWords(companyInfo, 400);
  const key = hookCacheKey(companyName, trimmedInfo, firstName, lastName, targetJob);

  const cached = hookCache.get(key);
  if (cached) {
    console.log(`[generate/hook-inline] ✅ Cache HIT`);
    return { hook: cached, cached: true };
  }

  const applicantLine = (firstName && lastName && targetJob)
    ? `\nThe applicant's name is ${firstName} ${lastName} and they are applying for the position: "${targetJob}".`
    : "";

  const prompt = `You are an expert German career coach helping a candidate write a formal German cover letter (Anschreiben) for an Ausbildung application at the company "${companyName}".${applicantLine}

Here is information about the company and the job posting:
"${trimmedInfo}"

Your task is to write the FIRST paragraph (The Hook) of a formal German cover letter.
- The hook must be no more than 3 sentences and 80 words total. Prioritize the 1-2 most specific and compelling details from the company description rather than trying to include everything.
- It MUST reference specific, compelling details from the company info above.
- It MUST NOT include "Sehr geehrte Damen und Herren" or any salutation. Start directly with the text.
- Use formal "Sie". Use perfect, professional German.
- Return ONLY the paragraph text. Do NOT wrap it in quotes.

GENDER RULE — Job title consistency:
${(firstName && lastName && targetJob) ? `Infer the applicant's gender from their name ("${firstName} ${lastName}"). Use the correct gendered form of any job title mentioned (e.g. "Hotelfachmann" vs "Hotelfachfrau", "Fachinformatiker" vs "Fachinformatikerin"). If the job posting uses a neutral form such as "Fachinformatiker/in", you may mirror that neutral form, but you must NEVER default to the gender opposite to the applicant's. The gender must remain consistent throughout this paragraph.` : "Use gender-appropriate language based on the applicant's name if available."}`;

  const tAI = performance.now();
  console.log(`[generate/hook-inline] 🤖 AI call START`);
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }]
  });
  console.log(`[generate/hook-inline] 🤖 AI call END — ${(performance.now() - tAI).toFixed(0)}ms`);

  let hook = (response.content[0] as any).text.trim();
  if (hook) {
    hook = hook.charAt(0).toUpperCase() + hook.slice(1);

    // Hard safeguard: enforce word limit (80 words)
    const words = hook.split(/\s+/);
    if (words.length > 80) {
      console.warn(`[generate/hook-inline] WARNING: AI generated hook exceeds 80 words (${words.length} words). Truncating at last complete sentence.`);
      const truncated = words.slice(0, 80).join(" ");
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf("."),
        truncated.lastIndexOf("!"),
        truncated.lastIndexOf("?")
      );
      if (lastSentenceEnd > 0) {
        hook = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        hook = truncated + " ...";
      }
    }
  }

  // Store in cache
  if (hookCache.size >= HOOK_CACHE_MAX) {
    hookCache.delete(hookCache.keys().next().value!);
  }
  hookCache.set(key, hook);

  return { hook, cached: false };
}

/** Safe filename: letters, digits, hyphens, underscores only. */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const t0 = performance.now();
  try {
    const body: unknown = await req.json();
    const parsed = FormDataSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Ungültige Eingabe";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const formData = parsed.data;

    // ── Inline hook generation (eliminates a separate round-trip) ───────────
    // If companyInfo is provided but customHook is missing/empty, generate inline.
    let generatedHook: string | undefined;

    if (formData.companyInfo && !formData.customHook) {
      const tHook = performance.now();
      console.log(`[generate] 🪝 Inline hook generation START`);
      const result = await generateHookInline(
        formData.companyName,
        formData.companyInfo,
        formData.firstName ?? "",
        formData.lastName ?? "",
        formData.jobTitle
      );
      generatedHook = result.hook;
      // Apply the generated hook to formData so PDF generation uses it
      (formData as any).customHook = generatedHook;
      console.log(`[generate] 🪝 Inline hook generation END — ${(performance.now() - tHook).toFixed(0)}ms (cached: ${result.cached})`);
    }

    // Step 1: Generate cover letter PDF from fixed template
    const tPdf = performance.now();
    console.log(`[generate] 📄 PDF generation START`);
    const coverLetterBytes = await generateCoverLetterPdf(formData);
    console.log(`[generate] 📄 PDF generation END — ${(performance.now() - tPdf).toFixed(0)}ms`);

    // Step 2: Merge or return standalone
    const companySlug = sanitizeFilename(formData.companyName || "Unbekannt");
    let finalPdfBytes: Uint8Array;
    let fileName: string;

    if (formData.mode === "full-resume") {
      const tMerge = performance.now();
      console.log(`[generate] 📎 PDF merge START`);
      const insertIndex = Math.max(0, (formData.coverLetterPageNumber || 1) - 1);
      let basePdfBytes: Uint8Array | undefined;
      
      if (formData.resumeBase64) {
        const base64Data = formData.resumeBase64.split(",")[1] || formData.resumeBase64;
        basePdfBytes = Uint8Array.from(Buffer.from(base64Data, "base64"));
      }

      finalPdfBytes = await insertCoverLetterPage(coverLetterBytes, basePdfBytes, formData.branch, insertIndex);
      console.log(`[generate] 📎 PDF merge END — ${(performance.now() - tMerge).toFixed(0)}ms`);
      fileName = `Bewerbungsunterlagen_${companySlug}_Said_Fateh.pdf`;
    } else {
      finalPdfBytes = coverLetterBytes;
      fileName = `Anschreiben_${companySlug}_Said_Fateh.pdf`;
    }

    console.log(`[generate] ✅ Done — ${(performance.now() - t0).toFixed(0)}ms total`);

    // Build response — include generated hook so the client can display/edit it
    const response = new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-File-Name": encodeURIComponent(fileName),
      },
    });

    if (generatedHook) {
      response.headers.set("X-Generated-Hook", encodeURIComponent(generatedHook));
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Serverfehler";
    console.error(`[generate] ❌ Error after ${(performance.now() - (0)).toFixed(0)}ms:`, message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
