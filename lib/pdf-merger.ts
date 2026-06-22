import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * Replace page 2 (index 1) of the base Bewerbungsunterlagen PDF with the
 * generated cover letter page. All other pages remain exactly unchanged.
 *
 * Base PDF location: assets/Bewerbungsunterlagen.pdf (inside project root)
 */
/**
 * Replace page 2 (index 1) of the base PDF with the generated cover letter page.
 * For Informatik: assets/Bewerbungsunterlagen.pdf
 * For Gastronomie: Prepends cover letter to assets/Gastronomie Lebenslauf.pdf
 */
export async function insertCoverLetterPage(
  coverLetterBytes: Uint8Array, 
  basePdfBytes?: Uint8Array,
  branch: "informatik" | "gastronomie" = "informatik",
  insertIndex: number = 1
): Promise<Uint8Array> {
  let baseBytes = basePdfBytes;
  
  if (!baseBytes) {
    const baseFile = branch === "gastronomie" 
      ? "Bewerbungsunterlagen_Hotelfachmann_Said_Fateh.pdf" 
      : "Bewerbungsunterlagen.pdf";
      
    const basePdfPath = path.join(process.cwd(), "assets", baseFile);

    if (!fs.existsSync(basePdfPath)) {
      throw new Error(
        `assets/${baseFile} not found. Please ensure it exists in the assets folder.`
      );
    }
    baseBytes = fs.readFileSync(basePdfPath);
  }
  const basePdf = await PDFDocument.load(baseBytes, { ignoreEncryption: true });
  const coverPdf = await PDFDocument.load(coverLetterBytes);

  const totalPages = basePdf.getPageCount();
  if (insertIndex < 0 || insertIndex > totalPages) {
    throw new Error(
      `Base PDF has ${totalPages} page(s) — cannot insert at index ${insertIndex}.`
    );
  }

  const [newPage] = await basePdf.copyPages(coverPdf, [0]);
  basePdf.insertPage(insertIndex, newPage);

  return basePdf.save({ useObjectStreams: false });
}
