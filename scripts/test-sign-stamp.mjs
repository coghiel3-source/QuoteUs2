// Verifies the in-line landlord signature stamping end-to-end.
// 1. Builds a sample "Lease Co-Guarantee Agreement" PDF (17 pages) with the
//    same invisible "__SIG_ANCHOR_LANDLORD__" marker the editor embeds.
// 2. Runs the same stamping logic the server uses.
// 3. Renders the signature page to PNG so the result can be inspected.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", ".local", "sign-test");
fs.mkdirSync(OUT_DIR, { recursive: true });

const MM_TO_PT = 72 / 25.4;
const A4_W = 595, A4_H = 842;

// ── 1. Build a sample 17-page agreement, signature line on the last page ──
async function buildSampleAgreement() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  for (let p = 1; p <= 17; p++) {
    const page = pdf.addPage([A4_W, A4_H]);
    if (p < 17) {
      page.drawText(`Lease Co-Guarantee Agreement — Page ${p}`, {
        x: 50, y: A4_H - 60, size: 14, font: fontBold,
      });
      page.drawText("Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(8), {
        x: 50, y: A4_H - 100, size: 10, font, maxWidth: A4_W - 100, lineHeight: 14,
      });
    } else {
      // Last page: mimic the signature page from LeaseDocumentEditor
      page.drawText("Representations.", { x: 50, y: 780, size: 11, font: fontBold });
      page.drawText("Each Party warrants execution authority. " + "Lorem ipsum ".repeat(8),
        { x: 50, y: 760, size: 10, font, maxWidth: A4_W - 100, lineHeight: 14 });
      page.drawText("- End of Agreement - Signature Page Follows -",
        { x: 130, y: 680, size: 11, font });
      page.drawText("IN WITNESS WHEREOF",
        { x: 220, y: 640, size: 12, font: fontBold });
      page.drawText("the Parties have executed this Agreement as of the Effective Date.",
        { x: 130, y: 610, size: 11, font });
      // Two-column signature block
      // ── Left column: Pensio (already-signed) ──
      const colY = 540;
      page.drawText("Accepted, Acknowledged and Agreed:", { x: 50, y: colY, size: 10, font });
      page.drawText("By: Pensio Risk Management Group Inc.", { x: 50, y: colY - 20, size: 10, font });
      page.drawLine({ start: { x: 50, y: colY - 90 }, end: { x: 50 + 220, y: colY - 90 }, thickness: 0.7, color: rgb(0,0,0) });
      page.drawText("Jim Milankov", { x: 50, y: colY - 105, size: 10, font });
      page.drawText("President", { x: 50, y: colY - 120, size: 10, font });
      // ── Right column: Landlord (TO BE SIGNED) ──
      const rx = 320;
      page.drawText("Accepted, Acknowledged and Agreed:", { x: rx, y: colY, size: 10, font });
      page.drawText("By: Landlord", { x: rx, y: colY - 20, size: 10, font });
      // Visible signature line
      const lineY = colY - 60;
      const lineW = 220;
      page.drawLine({ start: { x: rx, y: lineY }, end: { x: rx + lineW, y: lineY }, thickness: 0.7 });
      page.drawText("(signature)", { x: rx, y: lineY - 14, size: 9, font, color: rgb(0.5,0.5,0.5) });
      page.drawText("Signature will appear here after signing", { x: rx, y: lineY - 26, size: 9, font, color: rgb(0.5,0.5,0.5) });
      page.drawText("Landlord (or Landlord's Property Manager, if authorized)", { x: rx, y: lineY - 50, size: 9, font });

      // ── Invisible marker exactly as the client editor embeds it ──
      // Editor encodes width in mm; convert pts→mm for the marker payload.
      const lineWmm = lineW / MM_TO_PT;
      page.drawText(`__SIG_ANCHOR_LANDLORD__W=${lineWmm.toFixed(1)}`, {
        x: rx, y: lineY, size: 6, font, color: rgb(1, 1, 1),
      });
    }
  }
  return Buffer.from(await pdf.save());
}

// ── 2. Build a sample signature PNG (cursive-like) ──
async function makeSignaturePng() {
  // Minimal PNG with a "signature-looking" black squiggle drawn via pdf-lib trick:
  // create a 1-page PDF, draw lines, render to PNG via pdftoppm.
  const sigPdf = await PDFDocument.create();
  const page = sigPdf.addPage([400, 120]);
  // simulate a handwritten name with a few bezier-like segments using strokes
  const pts = [
    [10, 60], [40, 90], [70, 30], [100, 70], [130, 50],
    [160, 80], [190, 40], [220, 70], [250, 45], [280, 75],
    [310, 50], [340, 70], [370, 55],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    page.drawLine({ start: { x: pts[i][0], y: pts[i][1] }, end: { x: pts[i+1][0], y: pts[i+1][1] }, thickness: 2, color: rgb(0,0,0) });
  }
  const buf = Buffer.from(await sigPdf.save());
  const tmpPdf = path.join(OUT_DIR, "sig.pdf");
  fs.writeFileSync(tmpPdf, buf);
  execSync(`pdftoppm -r 150 -png "${tmpPdf}" "${path.join(OUT_DIR, "sig")}"`);
  const pngPath = path.join(OUT_DIR, "sig-1.png");
  return "data:image/png;base64," + fs.readFileSync(pngPath).toString("base64");
}

// ── 3. Server-side stamping helpers (mirror of server/routes.ts) ──
async function findTextAnchorInPdf(pdfBytes, anchors) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(pdfBytes);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
  for (let pi = 0; pi < doc.numPages; pi++) {
    const page = await doc.getPage(pi + 1);
    const viewport = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      const s = (it.str || "").trim();
      if (!s) continue;
      items.push({ str: s, x: it.transform[4], y: it.transform[5], h: it.height || 10 });
    }
    for (const a of anchors) {
      const al = a.toLowerCase();
      const hit = items.find(i => i.str.toLowerCase().includes(al));
      if (hit) {
        await doc.destroy();
        return { pageIndex: pi, x: hit.x, y: hit.y, height: hit.h, pageWidth: viewport.width, pageHeight: viewport.height, matchedStr: hit.str };
      }
    }
  }
  await doc.destroy();
  return null;
}

async function stampSignatureOnPdf(pdfBytes, signatureDataUrl, signerName) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const base64 = signatureDataUrl.split(",")[1] || "";
  const imgBytes = Buffer.from(base64, "base64");
  const sigImage = await pdfDoc.embedPng(imgBytes);
  const anchor = await findTextAnchorInPdf(pdfBytes, [
    "__SIG_ANCHOR_LANDLORD__",
    "Signature will appear here after signing",
    "(signature)",
  ]);
  if (!anchor) { console.log("[!] no anchor found"); return null; }
  console.log("[anchor]", anchor);
  const targetPage = pdfDoc.getPage(anchor.pageIndex);
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  let lineWmm = 0;
  const wMatch = anchor.matchedStr.match(/W=([\d.]+)/);
  if (wMatch) lineWmm = parseFloat(wMatch[1]);
  const lineW = lineWmm > 0 ? lineWmm * MM_TO_PT : 220;
  const isInvisible = anchor.matchedStr.includes("__SIG_ANCHOR_LANDLORD__");
  const lineY = isInvisible ? anchor.y : anchor.y + anchor.height + 2;
  const lineX = anchor.x;
  if (!isInvisible) {
    targetPage.drawRectangle({ x: lineX - 1, y: anchor.y - anchor.height, width: lineW + 2, height: anchor.height * 3.2, color: rgb(1,1,1) });
  }
  const sigDims = sigImage.scale(1);
  const sigMaxW = Math.max(60, lineW - 10);
  const sigMaxH = 40;
  const sigScale = Math.min(sigMaxW / sigDims.width, sigMaxH / sigDims.height);
  const sigW = sigDims.width * sigScale;
  const sigH = sigDims.height * sigScale;
  targetPage.drawImage(sigImage, { x: lineX + 2, y: lineY + 1, width: sigW, height: sigH });
  const dateStr = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  if (isInvisible) {
    targetPage.drawText(signerName, { x: lineX, y: lineY - 11, size: 9, font: fontBold });
    targetPage.drawText(`Signed on ${dateStr}`, { x: lineX, y: lineY - 21, size: 7.5, font, color: rgb(0.4,0.4,0.4) });
  } else {
    targetPage.drawText(signerName, { x: lineX, y: anchor.y, size: 10, font: fontBold });
    targetPage.drawText(`Signed on ${dateStr}`, { x: lineX, y: anchor.y - 12, size: 9, font, color: rgb(0.4,0.4,0.4) });
  }
  return Buffer.from(await pdfDoc.save());
}

// ── Run end-to-end ──
const unsigned = await buildSampleAgreement();
fs.writeFileSync(path.join(OUT_DIR, "unsigned.pdf"), unsigned);
console.log("unsigned: 17 pages");

const sigDataUrl = await makeSignaturePng();
const signed = await stampSignatureOnPdf(unsigned, sigDataUrl, "John Q. Landlord");
if (!signed) { console.error("STAMP FAILED"); process.exit(1); }
const signedPath = path.join(OUT_DIR, "signed.pdf");
fs.writeFileSync(signedPath, signed);
console.log("signed PDF:", signedPath);

// Render page 17 to PNG so the result can be visually verified.
execSync(`pdftoppm -r 144 -f 17 -l 17 -png "${signedPath}" "${path.join(OUT_DIR, "signed-p17")}"`);
console.log("rendered: .local/sign-test/signed-p17-17.png");
