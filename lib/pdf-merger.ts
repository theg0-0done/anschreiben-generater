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
  if (insertIndex < 0 || insertIndex > totalPages) {
    throw new Error(
      `Base PDF has ${totalPages} page(s) — cannot insert at index ${insertIndex}.`
    );
  }

  const [newPage] = await basePdf.copyPages(coverPdf, [0]);
  basePdf.insertPage(insertIndex, newPage);

  return basePdf.save({ useObjectStreams: false });
}
