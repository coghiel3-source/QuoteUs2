import { PDFDocument, StandardFonts } from "pdf-lib";
import type { SigningField, SigningResponse } from "./signingCompletion";

type Signer = { signerName: string; signatureData?: string | null; fieldResponses?: SigningResponse[] };

/** Append every signer's answers to the original PDF without modifying its pages. */
export async function renderCompletedPdf(
  original: Uint8Array | Buffer,
  signers: Signer[],
  fields: SigningField[],
): Promise<Uint8Array> {
  if (!signers.length) throw new Error("No signer records");
  const pdf = await PDFDocument.load(original);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 785;
  const nextPage = (height: number) => {
    if (y - height < 55) { page = pdf.addPage([595, 842]); y = 785; }
  };
  // Standard PDF fonts have a limited WinAnsi charset. Fail rather than
  // silently replacing/truncating legal notes; the caller sends an unavailable-copy notice.
  const supported = (value: string) => {
    try {
      font.encodeText(value.replace(/[\r\n\t]/g, " "));
    } catch {
      throw new Error("Signing record contains unsupported characters");
    }
    return value;
  };
  const wrap = (value: string, width: number): string[] => {
    const lines: string[] = [];
    for (const paragraph of supported(value).replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n")) {
      let line = "";
      for (let word of paragraph.split(/(\s+)/).filter(Boolean)) {
        if (line.length + word.length > width && line) { lines.push(line); line = ""; }
        while (word.length > width) {
          // Preserve long unbroken tokens without dropping characters.
          if (line) { lines.push(line); line = ""; }
          lines.push(word.slice(0, width));
          word = word.slice(width);
        }
        line += word;
      }
      lines.push(line);
    }
    return lines;
  };
  const drawWrapped = (value: string, drawFont = font, size = 9) => {
    for (const line of wrap(value, 88)) {
      nextPage(16);
      if (line) page.drawText(line, { x: 48, y, size, font: drawFont });
      y -= 16;
    }
  };
  const drawImage = async (value: string, label: string) => {
    nextPage(95);
    drawWrapped(label);
    nextPage(65);
    y -= 53;
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new Error("Invalid signature image");
    const bytes = Buffer.from(value.split(",")[1], "base64");
    const image = value.startsWith("data:image/png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const scale = Math.min(220 / image.width, 48 / image.height);
    page.drawImage(image, { x: 50, y: y + 3, width: image.width * scale, height: image.height * scale });
    y -= 18;
  };
  drawWrapped("SIGNING RECORD", bold, 16);
  y -= 15;
  for (const signer of signers) {
    nextPage(105);
    drawWrapped(signer.signerName || "Signer", bold, 12);
    y -= 8;
    const images = new Set<string>();
    for (const answer of signer.fieldResponses || []) {
      const definition = fields.find(f => f.id === answer.id);
      if (!definition || !answer.value) continue;
      const label = definition.label || definition.id;
      if (definition.type === "signature" || definition.type === "initials") {
        await drawImage(answer.value, label);
        images.add(answer.value);
      } else {
        drawWrapped(`${label}: ${answer.value}`);
        y -= 6;
      }
    }
    if (signer.signatureData && !images.has(signer.signatureData)) {
      await drawImage(signer.signatureData, "Signature");
    }
    y -= 18;
  }
  return pdf.save();
}