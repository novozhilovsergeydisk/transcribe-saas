import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatDate, formatDuration } from "./utils";

export interface Segment {
  start: number;
  end: number;
  text: string;
}

export interface ExportInput {
  title: string;
  text: string | null;
  segments: Segment[];
  watermark: boolean;
  createdAt: Date;
  durationSec: number | null;
  language: string | null;
}

export interface ExportResult {
  body: string | Uint8Array;
  contentType: string;
  ext: string;
  binary: boolean;
}

const WATERMARK = "Расшифровано на сервисе «Голос в текст»";

const CONTENT_TYPES: Record<string, { contentType: string; ext: string; binary: boolean }> = {
  TXT: { contentType: "text/plain", ext: "txt", binary: false },
  SRT: { contentType: "application/x-subrip", ext: "srt", binary: false },
  VTT: { contentType: "text/vtt", ext: "vtt", binary: false },
  DOCX: {
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: "docx",
    binary: true,
  },
  PDF: { contentType: "application/pdf", ext: "pdf", binary: true },
};

// --- timecodes / subtitles -------------------------------------------------

function pad(n: number, width = 2): string {
  return String(Math.floor(n)).padStart(width, "0");
}

function timestamp(seconds: number, separator: "," | "."): string {
  const h = pad(seconds / 3600);
  const m = pad((seconds % 3600) / 60);
  const s = pad(seconds % 60);
  const ms = String(Math.round((seconds % 1) * 1000)).padStart(3, "0");
  return `${h}:${m}:${s}${separator}${ms}`;
}

function toSrt(segments: Segment[]): string {
  return segments
    .map(
      (seg, i) =>
        `${i + 1}\n${timestamp(seg.start, ",")} --> ${timestamp(seg.end, ",")}\n${seg.text.trim()}\n`
    )
    .join("\n");
}

function toVtt(segments: Segment[]): string {
  const body = segments
    .map(
      (seg) => `${timestamp(seg.start, ".")} --> ${timestamp(seg.end, ".")}\n${seg.text.trim()}\n`
    )
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

// --- shared content helpers ------------------------------------------------

function plainBody(input: ExportInput): string {
  return input.text?.trim() || input.segments.map((s) => s.text.trim()).join("\n");
}

function toTxt(input: ExportInput): string {
  let content = plainBody(input);
  if (input.watermark) {
    content += `\n\n---\n${WATERMARK}`;
  }
  return content;
}

function metaLine(input: ExportInput): string {
  const parts = [formatDate(input.createdAt)];
  if (input.durationSec) parts.push(formatDuration(input.durationSec));
  if (input.language && input.language !== "auto") parts.push(input.language.toUpperCase());
  return parts.join(" · ");
}

/** Splits free-form transcript text into display paragraphs. */
function textParagraphs(text: string): string[] {
  const blocks = text.split(/\n{2,}/).flatMap((b) => b.split(/\n/));
  return blocks.map((b) => b.trim()).filter(Boolean);
}

// --- DOCX ------------------------------------------------------------------

async function toDocx(input: ExportInput): Promise<Uint8Array> {
  const children: Paragraph[] = [
    new Paragraph({ text: input.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: metaLine(input), color: "808080", size: 18 })],
    }),
  ];

  if (input.segments.length > 0) {
    for (const seg of input.segments) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `[${formatDuration(seg.start)}] `, color: "2563EB", bold: true }),
            new TextRun({ text: seg.text.trim() }),
          ],
        })
      );
    }
  } else {
    for (const para of textParagraphs(plainBody(input))) {
      children.push(new Paragraph({ text: para, spacing: { after: 120 } }));
    }
  }

  if (input.watermark) {
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        children: [new TextRun({ text: WATERMARK, italics: true, color: "808080", size: 18 })],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc);
}

// --- PDF -------------------------------------------------------------------

const PAGE = { w: 595.28, h: 841.89 }; // A4 in points
const MARGIN = 56;
const MAX_W = PAGE.w - MARGIN * 2;

let fontCache: Buffer | null = null;
function loadFont(): Buffer {
  if (!fontCache) {
    fontCache = fs.readFileSync(path.join(process.cwd(), "src/lib/fonts/NotoSans-Regular.ttf"));
  }
  return fontCache;
}

type Run = { text: string; color: ReturnType<typeof rgb>; size: number };

function sanitize(text: string): string {
  // Replace control chars with spaces so word-wrap layout stays predictable.
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    out += code < 32 || code === 127 ? " " : ch;
  }
  return out;
}

async function toPdf(input: ExportInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(loadFont(), { subset: true });

  const ink = rgb(0.1, 0.1, 0.12);
  const muted = rgb(0.5, 0.5, 0.55);
  const accent = rgb(0.15, 0.39, 0.92);

  let page: PDFPage = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - MARGIN;

  const newPage = () => {
    page = pdf.addPage([PAGE.w, PAGE.h]);
    y = PAGE.h - MARGIN;
  };

  // Lays out one paragraph (a sequence of same-size runs) with word wrapping,
  // breaking across pages as needed.
  const drawParagraph = (runs: Run[], spacingAfter = 6) => {
    const size = runs[0].size;
    const lineHeight = size * 1.45;
    const spaceW = font.widthOfTextAtSize(" ", size);
    if (y - lineHeight < MARGIN) newPage();

    let x = MARGIN;
    let atLineStart = true;

    const wrap = () => {
      x = MARGIN;
      y -= lineHeight;
      if (y - lineHeight < MARGIN) newPage();
      atLineStart = true;
    };
    const place = (word: string, color: ReturnType<typeof rgb>) => {
      page.drawText(word, { x, y: y - size, size, font, color });
      x += font.widthOfTextAtSize(word, size);
      atLineStart = false;
    };

    for (const run of runs) {
      const color = run.color;
      const words = sanitize(run.text).split(/\s+/).filter(Boolean);
      for (const word of words) {
        const w = font.widthOfTextAtSize(word, size);
        // A single word wider than the text column: hard-break per character.
        if (w > MAX_W) {
          let chunk = "";
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, size) > MAX_W && chunk) {
              if (!atLineStart) wrap();
              place(chunk, color);
              wrap();
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          if (chunk) {
            if (!atLineStart && x + spaceW + font.widthOfTextAtSize(chunk, size) > MARGIN + MAX_W) {
              wrap();
            } else if (!atLineStart) {
              x += spaceW;
            }
            place(chunk, color);
          }
          continue;
        }
        const advance = (atLineStart ? 0 : spaceW) + w;
        if (!atLineStart && x + advance > MARGIN + MAX_W) wrap();
        if (!atLineStart) x += spaceW;
        place(word, color);
      }
    }

    y -= lineHeight + spacingAfter;
  };

  drawParagraph([{ text: input.title, color: ink, size: 18 }], 4);
  drawParagraph([{ text: metaLine(input), color: muted, size: 9 }], 14);

  if (input.segments.length > 0) {
    for (const seg of input.segments) {
      drawParagraph(
        [
          { text: `[${formatDuration(seg.start)}]`, color: accent, size: 11 },
          { text: seg.text.trim(), color: ink, size: 11 },
        ],
        6
      );
    }
  } else {
    for (const para of textParagraphs(plainBody(input))) {
      drawParagraph([{ text: para, color: ink, size: 11 }], 8);
    }
  }

  if (input.watermark) {
    y -= 10;
    drawParagraph([{ text: WATERMARK, color: muted, size: 9 }], 0);
  }

  return pdf.save();
}

// --- entry point -----------------------------------------------------------

export async function buildExport(format: string, input: ExportInput): Promise<ExportResult> {
  const meta = CONTENT_TYPES[format] ?? CONTENT_TYPES.TXT;
  let body: string | Uint8Array;

  switch (format) {
    case "SRT":
      body = toSrt(input.segments);
      break;
    case "VTT":
      body = toVtt(input.segments);
      break;
    case "DOCX":
      body = await toDocx(input);
      break;
    case "PDF":
      body = await toPdf(input);
      break;
    case "TXT":
    default:
      body = toTxt(input);
      break;
  }

  return { body, contentType: meta.contentType, ext: meta.ext, binary: meta.binary };
}
