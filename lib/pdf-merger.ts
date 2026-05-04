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
export async function replacePageTwo(coverLetterBytes: Uint8Array, branch: "informatik" | "gastronomie" = "informatik"): Promise<Uint8Array> {
  const baseFile = branch === "gastronomie" 
    ? "Bewerbungsunterlagen_Hotelfachmann_Said_Fateh.pdf" 
    : "Bewerbungsunterlagen.pdf";
    
  const basePdfPath = path.join(process.cwd(), "assets", baseFile);

  if (!fs.existsSync(basePdfPath)) {
    throw new Error(
      `assets/${baseFile} not found. Please ensure it exists in the assets folder.`
    );
  }

  const baseBytes = fs.readFileSync(basePdfPath);
  const basePdf = await PDFDocument.load(baseBytes, { ignoreEncryption: true });
  const coverPdf = await PDFDocument.load(coverLetterBytes);

  const totalPages = basePdf.getPageCount();
  if (totalPages < 2) {
    throw new Error(
      `Base PDF has only ${totalPages} page(s) — page 2 cannot be replaced.`
    );
  }

  const [newPage] = await basePdf.copyPages(coverPdf, [0]);
  basePdf.removePage(1);
  basePdf.insertPage(1, newPage);

  return basePdf.save({ useObjectStreams: false });
}
