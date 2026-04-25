import { NextRequest, NextResponse } from "next/server";
import { FormDataSchema } from "@/lib/types";
import { generateCoverLetterPdf } from "@/lib/pdf-generator";
import { replacePageTwo } from "@/lib/pdf-merger";

/** Safe filename: letters, digits, hyphens, underscores only. */
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();
    const parsed = FormDataSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "Ungültige Eingabe";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const formData = parsed.data;

    // Step 1: Generate cover letter PDF from fixed template
    const coverLetterBytes = await generateCoverLetterPdf(formData);

    // Step 2: Merge or return standalone
    const companySlug = sanitizeFilename(formData.companyName || "Unbekannt");
    let finalPdfBytes: Uint8Array;
    let fileName: string;

    if (formData.mode === "full-resume") {
      finalPdfBytes = await replacePageTwo(coverLetterBytes, formData.branch);
      fileName = `Bewerbungsunterlagen_${companySlug}_Said_Fateh.pdf`;
    } else {
      finalPdfBytes = coverLetterBytes;
      fileName = `Anschreiben_${companySlug}_Said_Fateh.pdf`;
    }

    return new NextResponse(Buffer.from(finalPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-File-Name": encodeURIComponent(fileName),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Serverfehler";
    console.error("[generate] Error:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
