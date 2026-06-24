import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
// @ts-ignore
import pdf from "pdf-parse";

const anthropic = new Anthropic({ apiKey: process.env.CLAUD_API_KEY || "" });

// ─── In-process pitch cache ──────────────────────────────────────────────────
// Same pattern as generate-hook: avoids re-calling AI for identical inputs.
const PITCH_CACHE_MAX = 20;
const pitchCache = new Map<string, string>();

function cacheKey(targetJob: string, cvText: string, firstName: string, lastName: string): string {
  return createHash("sha1")
    .update(`${targetJob}|${cvText}|${firstName}|${lastName}`)
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
    const { targetJob, resumeBase64, firstName, lastName } = body;

    if (!targetJob || !resumeBase64 || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields (targetJob, resumeBase64, firstName, lastName)" },
        { status: 400 }
      );
    }

    // Parse PDF to text
    const tParse = performance.now();
    const buffer = Buffer.from(resumeBase64, "base64");
    const pdfData = await pdf(buffer);
    const rawCvText: string = pdfData.text;
    console.log(`[generate-pitch] 📄 PDF parse — ${(performance.now() - tParse).toFixed(0)}ms (${rawCvText.split(/\s+/).length} words extracted)`);

    // Truncate CV text to reduce input tokens — most meaningful content is
    // in the first 600 words; the tail is usually formatting artifacts.
    const cvText = truncateWords(rawCvText, 600);

    // Check cache before calling the AI
    const key = cacheKey(targetJob, cvText, firstName, lastName);
    const cached = pitchCache.get(key);
    if (cached) {
      console.log(`[generate-pitch] ✅ Cache HIT — ${(performance.now() - t0).toFixed(0)}ms total`);
      try {
        const parsed = JSON.parse(cached);
        return NextResponse.json({ template: parsed.template, fallbackHook: parsed.fallbackHook ?? "", cached: true });
      } catch {
        // Legacy cache entry (plain string) — return it as template with no fallback
        return NextResponse.json({ template: cached, fallbackHook: "", cached: true });
      }
    }

    const currentDate = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `You are an expert German career coach specializing in Ausbildung (apprenticeship) applications. You are helping a candidate apply for an apprenticeship as exactly: "${targetJob}".

Below is the applicant's extracted CV text. This is your ONLY source of truth. Every fact you use — skills, certifications, employers, dates, language levels, education — must come directly from this document. Never invent, assume, or upgrade any detail that is not explicitly present.

=== CURRENT DATE ===
Today's date is: ${currentDate}
=== END CURRENT DATE ===

=== APPLICANT CV TEXT ===
${cvText}
=== END CV TEXT ===

YOUR TASK: Write a formal German cover letter template (DIN 5008 style) based strictly on the CV above.

STRUCTURAL RULES:
- The template MUST contain the literal placeholder string "[COMPANY_HOOK]" exactly as written. Do NOT replace it with your own introduction or hook — that placeholder is filled separately at letter-creation time.
- The template has exactly this structure:

Sehr geehrte Damen und Herren,

[COMPANY_HOOK]

(PITCH PARAGRAPH — see rules below)

(CLOSING PARAGRAPH — see rules below)

Mit freundlichen Grüßen

${firstName} ${lastName}

---

GENERAL RULE — Accuracy over embellishment:
Every claim must be traceable to the CV. If something is not in the CV, do not include it.

RULE 1 — Gender consistency:
Detect the applicant's gender from the CV (name, title, pronouns). Use the correct gendered job title and grammar consistently throughout (e.g. "Hotelfachmann" vs "Hotelfachfrau", "motivierter" vs "motivierte"). This must match across the entire letter.

RULE 2 — Pitch paragraph (what TO include):
- Reference internships and jobs in chronological or relevance order, naming the actual employer(s) from the CV
- For internships, compare their end dates to Today's date (${currentDate}):
  - If the internship is ongoing or ends in the future relative to today, use "mein aktuelles Praktikum", "derzeit", or similar present phrasing.
  - If the internship ended in the past relative to today, use "mein letztes Praktikum", "mein jüngstes Praktikum", or past tense. NEVER use "aktuelles" for past internships.
- Pull concrete, named skills and standards exactly as written in the CV (e.g. "HACCP-Standards", "Kassensysteme", "Beschwerdemanagement", "Qualitätskontrolle") — do NOT paraphrase these into vaguer terms like "Kundenservice" or "gute Erfahrung"
- If the CV lists distinct learnings per role, briefly attribute one specific takeaway to each employer (short narrative > flat list)
- Mention relevant certifications tied to the field (food hygiene, safety training, IT certifications, etc.) if present in the CV
- Include relevant education, school subjects, or coursework from the CV

RULE 3 — Pitch paragraph (what NOT to include):
- Do NOT summarize away specific keywords/certifications in favor of generic soft-skill language
- Do NOT merge all experience into one vague sentence
- Do NOT fabricate additional employers, durations, or responsibilities not listed in the CV
- Do NOT collapse multiple distinct named certificates or courses into a single generic label. If the CV lists "CS50x", "CS50 Python", and "CS50 Web" as three separate courses, mention each by its specific name — never merge them into one term like "CS50-Onlinekurs".

RULE 4 — Portfolio / personal links:
- If the CV contains a personal website, portfolio link, or GitHub URL, it MUST appear somewhere in the generated letter (pitch or closing paragraph). Do NOT omit it under any circumstances.
- Include it naturally in context (e.g. "Weitere Projekte sind auf meinem Portfolio unter [URL] einsehbar.").

RULE 5 — Date ranges — verbatim accuracy:
- Copy all internship and employment date ranges EXACTLY as written in the CV. Do not round months, extend durations, or shift dates. For example, if the CV says "März 2024 – Mai 2024", write exactly that — never "Frühjahr 2024" or "bis Juni 2024".

RULE 6 — Closing paragraph (what TO include):
- List EVERY language mentioned in the CV, each with its actual stated proficiency level — including weaker ones (e.g. "Grundkenntnisse" in French must stay "Grundkenntnisse", never upgraded to "gut" or "fließend")
- Name any formal language certificate exactly as written (e.g. "ÖSD-Zertifikat B2") including the issuing body if available
- State the applicant's availability based on CV facts only (e.g. graduation year, current enrollment status). If no exact date is available, use a safe generic phrase like "ab sofort" or "zum nächstmöglichen Zeitpunkt"
- Include 2–3 core soft skills ONLY if they are explicitly listed in the CV (e.g. Zuverlässigkeit, Teamfähigkeit, Belastbarkeit)

RULE 7 — Closing paragraph (what NOT to include):
- NEVER invent a specific start date (month/year) unless it is explicitly present in the CV or user input
- Do NOT drop or downplay languages just because proficiency is low — partial language skills are still relevant
- Do NOT add soft skills, hobbies, or traits that are not in the source CV

RULE 8 — Tone & length:
- Confident and professional, not exaggerated or overly enthusiastic
- Each paragraph (pitch and closing) should be 4–6 sentences, suitable for a one-page Anschreiben
- Maintain natural, fluent German appropriate for a German Ausbildung application

Output ONLY the following two sections, separated by the exact delimiter lines shown below. Do not add any extra text before, between, or after the delimiters:

===TEMPLATE===
(The full cover letter template text here — everything from "Sehr geehrte Damen und Herren," to the signature "${firstName} ${lastName}")
===FALLBACK_HOOK===
(Write a single compelling German hook paragraph of 2–3 sentences — NO salutation, start directly with the text — that will serve as the opening of the cover letter when no company description is available. The paragraph MUST contain the literal placeholder [companyName] exactly once, used naturally in context, e.g. "bei [companyName] möchte ich…" or "die Ausbildung bei [companyName] bietet…". The hook must be grounded in the applicant's actual CV facts — name specific skills, experiences, or certifications. Do NOT use generic filler phrases. Use formal "Sie". Use perfect, professional German. Maximum 80 words.)

Do not use JSON. Do not wrap in code blocks.`;

    const tAI = performance.now();
    console.log(`[generate-pitch] 🤖 AI call START (model: claude-haiku-4-5, prompt ~${prompt.length} chars, cv ~${cvText.split(/\s+/).length} words)`);
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1600, // increased to fit template + fallback hook
      messages: [{ role: "user", content: prompt }]
    });
    console.log(`[generate-pitch] 🤖 AI call END — ${(performance.now() - tAI).toFixed(0)}ms`);

    const rawOutput = (response.content[0] as any).text.trim();

    // ── Parse the two sections ─────────────────────────────────────────────────
    const templateMarker = "===TEMPLATE===";
    const fallbackMarker = "===FALLBACK_HOOK===";
    const tmplStart = rawOutput.indexOf(templateMarker);
    const fallbackStart = rawOutput.indexOf(fallbackMarker);

    let template: string;
    let fallbackHook: string;

    if (tmplStart !== -1 && fallbackStart !== -1) {
      template = rawOutput.slice(tmplStart + templateMarker.length, fallbackStart).trim();
      fallbackHook = rawOutput.slice(fallbackStart + fallbackMarker.length).trim();
    } else {
      // Graceful degradation: response without delimiters
      console.warn("[generate-pitch] ⚠️  Could not find section delimiters — treating entire output as template");
      template = rawOutput;
      fallbackHook = "";
    }

    // Post-process: capitalize first letter of each paragraph in the template
    const tPost = performance.now();
    template = template.split('\n').map((line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      
      // Skip known boilerplate lines that shouldn't be touched
      if (
        trimmed.startsWith('Sehr geehrte') ||
        trimmed.startsWith('Mit freundlichen') ||
        trimmed === '[COMPANY_HOOK]' ||
        trimmed === `${firstName} ${lastName}`
      ) {
        return line;
      }
      
      // Capitalize first letter of the paragraph
      return line.charAt(0).toUpperCase() + line.slice(1);
    }).join('\n');
    console.log(`[generate-pitch] 📝 Post-process — ${(performance.now() - tPost).toFixed(0)}ms`);

    // Store in cache (evict oldest entry if at capacity)
    if (pitchCache.size >= PITCH_CACHE_MAX) {
      pitchCache.delete(pitchCache.keys().next().value!);
    }
    pitchCache.set(key, JSON.stringify({ template, fallbackHook }));

    console.log(`[generate-pitch] ✅ Done — ${(performance.now() - t0).toFixed(0)}ms total`);
    return NextResponse.json({ template, fallbackHook });

  } catch (error: any) {
    console.error(`[generate-pitch] ❌ Error after ${(performance.now() - (0)).toFixed(0)}ms:`, error);
    return NextResponse.json(
      { error: error.message || "An error occurred during generation" },
      { status: 500 }
    );
  }
}
