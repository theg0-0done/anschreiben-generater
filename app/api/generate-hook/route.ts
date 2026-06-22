import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";

const anthropic = new Anthropic({ apiKey: process.env.CLAUD_API_KEY || "" });

// ─── In-process hook cache ────────────────────────────────────────────────────
// Keeps the last 50 generated hooks in memory (per server process lifetime).
// Same company + same job ad text + same applicant → instant replay, no AI call.
const HOOK_CACHE_MAX = 50;
const hookCache = new Map<string, string>();

function cacheKey(companyName: string, companyInfo: string, firstName: string, lastName: string, targetJob: string): string {
  return createHash("sha1")
    .update(`${companyName}|${companyInfo}|${firstName}|${lastName}|${targetJob}`)
    .digest("hex");
}

function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + " …";
}

export async function POST(req: NextRequest) {
  const t0 = performance.now();
  try {
    if (!process.env.CLAUD_API_KEY) {
      return NextResponse.json(
        { error: "CLAUD_API_KEY is not configured in .env" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { companyName, companyInfo, firstName, lastName, targetJob } = body;

    if (!companyName || !companyInfo) {
      return NextResponse.json(
        { error: "Missing required fields (companyName, companyInfo)" },
        { status: 400 }
      );
    }

    // Truncate companyInfo to first 400 words — reduces input tokens by ~50%
    // for typical pasted job ads without losing the key details at the top.
    const trimmedInfo = truncateWords(companyInfo, 400);

    // Check cache before calling the AI
    const key = cacheKey(companyName, trimmedInfo, firstName ?? "", lastName ?? "", targetJob ?? "");
    const cached = hookCache.get(key);
    if (cached) {
      console.log(`[generate-hook] ✅ Cache HIT — ${(performance.now() - t0).toFixed(0)}ms total`);
      return NextResponse.json({ hook: cached, cached: true });
    }

    const applicantLine = (firstName && lastName && targetJob)
      ? `\nThe applicant's name is ${firstName} ${lastName} and they are applying for the position: "${targetJob}".`
      : "";

    const prompt = `You are an expert German career coach helping a candidate write a formal German cover letter (Anschreiben) for an Ausbildung application at the company "${companyName}".${applicantLine}

Here is information about the company and the job posting:
"${trimmedInfo}"

Your task is to write the FIRST paragraph (The Hook) of a formal German cover letter.
- It MUST reference specific, compelling details from the company info above.
- It MUST NOT include "Sehr geehrte Damen und Herren" or any salutation. Start directly with the text.
- Use formal "Sie". Use perfect, professional German.
- Return ONLY the paragraph text. Do NOT wrap it in quotes.

GENDER RULE — Job title consistency:
${(firstName && lastName && targetJob) ? `Infer the applicant's gender from their name ("${firstName} ${lastName}"). Use the correct gendered form of any job title mentioned (e.g. "Hotelfachmann" vs "Hotelfachfrau", "Fachinformatiker" vs "Fachinformatikerin"). If the job posting uses a neutral form such as "Fachinformatiker/in", you may mirror that neutral form, but you must NEVER default to the gender opposite to the applicant's. The gender must remain consistent throughout this paragraph.` : "Use gender-appropriate language based on the applicant's name if available."}`;

    const tAI = performance.now();
    console.log(`[generate-hook] 🤖 AI call START (model: claude-haiku-4-5, prompt ~${prompt.length} chars)`);
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    });
    console.log(`[generate-hook] 🤖 AI call END — ${(performance.now() - tAI).toFixed(0)}ms`);

    let hook = (response.content[0] as any).text.trim();
    if (hook) {
      // Force-capitalize the first letter of the hook
      hook = hook.charAt(0).toUpperCase() + hook.slice(1);
    }

    // Store in cache (evict oldest entry if at capacity)
    if (hookCache.size >= HOOK_CACHE_MAX) {
      hookCache.delete(hookCache.keys().next().value!);
    }
    hookCache.set(key, hook);

    console.log(`[generate-hook] ✅ Done — ${(performance.now() - t0).toFixed(0)}ms total`);
    return NextResponse.json({ hook });

  } catch (error: any) {
    console.error("Generate Hook API Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during generation" },
      { status: 500 }
    );
  }
}
