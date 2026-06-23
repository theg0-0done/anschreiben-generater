import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";
import type { FormData } from "./types";
import { fillTemplate, buildRecipientLines } from "./template";

// A4 dimensions in points (72pt/inch)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

const MARGIN_LEFT = 62;
const MARGIN_RIGHT = PAGE_WIDTH - 62;
const MARGIN_TOP = PAGE_HEIGHT - 55;
const TEXT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;

interface DrawCtx {
  page: ReturnType<PDFDocument["addPage"]>;
  normal: PDFFont;
  bold: PDFFont;
}

/** Wrap a single string (may contain \n) into lines fitting maxWidth. */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const result: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      result.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

function drawLeft(
  ctx: DrawCtx,
  text: string,
  x: number,
  y: number,
  size: number,
  useBold = false
) {
  const font = useBold ? ctx.bold : ctx.normal;
  ctx.page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
}

function drawRight(
  ctx: DrawCtx,
  text: string,
  rightEdge: number,
  y: number,
  size: number
) {
  const w = ctx.normal.widthOfTextAtSize(text, size);
  ctx.page.drawText(text, {
    x: rightEdge - w,
    y,
    size,
    font: ctx.normal,
    color: rgb(0, 0, 0),
  });
}

/** Generate a one-page A4 cover letter PDF from structured form data. */
export async function generateCoverLetterPdf(formData: FormData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: DrawCtx = { page, normal, bold };

  const SMALL = 9;
  const BODY = 10.5;
  const lh = (s: number) => s * 1.42;

  let y = MARGIN_TOP;

  // ── Sender block (top right) ──────────────────────────────────────────────
  const senderLines = [
    "Said Fateh",
    "Ibn Zayddoune 297",
    "31000 Sefrou, Marokko",
    "fatehsaid05@gmail.com",
    "+212 762 895 481",
  ];
  if (formData.branch === "informatik") {
    senderLines.push("https://fatehsaid.com/de");
  }

  for (const line of senderLines) {
    drawRight(ctx, line, MARGIN_RIGHT, y, SMALL);
    y -= lh(SMALL);
  }
  y -= 8;

  // ── Space between sender and receiver ─────────────────────────────────────
  y -= 18;

  // ── Recipient block (left) ────────────────────────────────────────────────
  for (const line of buildRecipientLines(formData)) {
    drawLeft(ctx, line, MARGIN_LEFT, y, BODY);
    y -= lh(BODY);
  }
  y -= 12;

  // ── Date (right) ──────────────────────────────────────────────────────────
  const today = new Date();
  const dateString = today.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  drawRight(ctx, `Sefrou, den ${dateString}`, MARGIN_RIGHT, y, BODY);
  y -= lh(BODY) * 2;

  // ── Subject line (bold) ───────────────────────────────────────────────────
  let { body, subject } = fillTemplate(formData);

  if (formData.coverLetterTemplate) {
    const hook = formData.customHook || "";
    const salutationLine = (formData.contactSalutation === "Herr" && formData.contactPerson)
      ? `Sehr geehrter Herr ${formData.contactPerson},`
      : (formData.contactSalutation === "Frau" && formData.contactPerson)
        ? `Sehr geehrte Frau ${formData.contactPerson},`
        : "Sehr geehrte Damen und Herren,";

    let finalTemplate = formData.coverLetterTemplate;

    // Replace generic salutation with specific one if found
    if (finalTemplate.startsWith("Sehr geehrte Damen und Herren,")) {
      finalTemplate = finalTemplate.replace("Sehr geehrte Damen und Herren,", salutationLine);
    } else {
      const lines = finalTemplate.split("\n");
      if (lines.length > 0 && lines[0].startsWith("Sehr geehrte")) {
        lines[0] = salutationLine;
        finalTemplate = lines.join("\n");
      }
    }

    // Insert the hook
    if (finalTemplate.includes("[COMPANY_HOOK]")) {
      body = finalTemplate.replace("[COMPANY_HOOK]", hook);
    } else {
      const lines = finalTemplate.split("\n");
      let insertIdx = 1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") {
          insertIdx = i + 1;
          break;
        }
      }
      if (hook) {
        lines.splice(insertIdx, 0, hook, "");
      }
      body = lines.join("\n");
    }
  }

  for (const line of wrapText(subject, bold, BODY, TEXT_WIDTH)) {
    drawLeft(ctx, line, MARGIN_LEFT, y, BODY, true);
    y -= lh(BODY);
  }
  y -= lh(BODY) * 0.5;

  // ── Body paragraphs ───────────────────────────────────────────────────────
  let hasWarnedOverflow = false;
  for (const para of body.split(/\n\n+/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    for (const line of wrapText(trimmed, normal, BODY, TEXT_WIDTH)) {
      if (y < 55) {
        if (!hasWarnedOverflow) {
          console.warn("[PDF Generator] WARNING: Cover letter content exceeds one page and will be truncated!");
          hasWarnedOverflow = true;
        }
        break; // never overflow the page
      }
      drawLeft(ctx, line, MARGIN_LEFT, y, BODY);
      y -= lh(BODY);
    }
    y -= lh(BODY) * 0.45; // paragraph gap
  }

  return doc.save();
}
