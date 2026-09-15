import { PDFDocument } from "pdf-lib";

/**
 * Insert the generated cover letter page into the user's full resume PDF.
 * basePdfBytes MUST be provided — the caller is responsible for fetching
 * the user's resume from IndexedDB and passing it here.
 */
export async function insertCoverLetterPage(
  coverLetterBytes: Uint8Array,
  basePdfBytes: Uint8Array,
  _branch?: string,          // kept for API compatibility, no longer used server-side
  insertIndex: number = 1
): Promise<Uint8Array> {
  const basePdf = await PDFDocument.load(basePdfBytes, { ignoreEncryption: true });
  const coverPdf = await PDFDocument.load(coverLetterBytes);

  const totalPages = basePdf.getPageCount();
  // Clamp instead of rejecting — if the configured page number exceeds the
  // resume's actual page count, just append the cover letter as the last page.
  const clampedIndex = Math.min(Math.max(insertIndex, 0), totalPages);

  const [newPage] = await basePdf.copyPages(coverPdf, [0]);
  basePdf.insertPage(clampedIndex, newPage);

  return basePdf.save({ useObjectStreams: false });
}
