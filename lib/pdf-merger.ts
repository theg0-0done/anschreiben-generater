import { PDFDocument } from "pdf-lib";
import fs from "fs";
import path from "path";

/**
 * Replace page 2 (index 1) of the base Bewerbungsunterlagen PDF with the
 * generated cover letter page. All other pages remain exactly unchanged.
 *
 * Base PDF location: assets/Bewerbungsunterlagen.pdf (inside project root)
 */
export async function replacePageTwo(coverLetterBytes: Uint8Array): Promise<Uint8Array> {
  const basePdfPath = path.join(process.cwd(), "assets", "Bewerbungsunterlagen.pdf");

  if (!fs.existsSync(basePdfPath)) {
    throw new Error(
      "assets/Bewerbungsunterlagen.pdf not found. " +
        "Place your base Bewerbungsunterlagen PDF at assets/Bewerbungsunterlagen.pdf in the project root."
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

  // Copy the single cover letter page into the base document
  const [newPage] = await basePdf.copyPages(coverPdf, [0]);

  // Remove old page 2 (index 1), insert new one in its place
  basePdf.removePage(1);
  basePdf.insertPage(1, newPage);

  // useObjectStreams: false keeps the file smaller and more compatible
  return basePdf.save({ useObjectStreams: false });
}
