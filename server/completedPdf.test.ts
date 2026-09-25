import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { renderCompletedPdf } from "./completedPdf";

// Valid tiny PNG fixture; no network or mail transport is used.
const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlWIGAAAAAASUVORK5CYII=";

test("appends both signers, their signature/initial images, and full long text to real PDF", async () => {
  const source = await PDFDocument.create();
  source.addPage([595, 842]);
  const notes = Array.from({ length: 90 }, (_, i) => `note${i}`).join(" ");
  const fields = [
    { id: "s1", type: "signature", label: "Signer A signature", signerId: "a" },
    { id: "i1", type: "initials", label: "Signer A initials", signerId: "a" },
    { id: "n1", type: "notes", label: "Notes", signerId: "a" },
    { id: "s2", type: "signature", label: "Signer B signature", signerId: "b" },
  ];
  const output = await renderCompletedPdf(await source.save(), [
    { signerName: "Signer A", signatureData: image, fieldResponses: [
      { id: "s1", value: image }, { id: "i1", value: image }, { id: "n1", value: notes },
    ] },
    { signerName: "Signer B", signatureData: image, fieldResponses: [{ id: "s2", value: image }] },
  ], fields);
  const pdf = await PDFDocument.load(output);
  assert.ok(pdf.getPageCount() >= 2);
  // 3 image drawings must survive in the saved PDF (one signature per signer + initials).
  assert.ok((Buffer.from(output).toString("latin1").match(/\/Subtype\s*\/Image/g) || []).length >= 3);
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const parsed = await pdfjs.getDocument({ data: new Uint8Array(output), useSystemFonts: true, isEvalSupported: false }).promise;
  let text = "";
  for (let index = 1; index <= parsed.numPages; index++) {
    const content = await (await parsed.getPage(index)).getTextContent();
    text += content.items.map((item: any) => item.str).join(" ");
  }
  assert.match(text, /Signer A initials/);
  assert.match(text, /Signer B signature/);
  assert.match(text, /note0/);
  assert.match(text, /note89/);
  await parsed.destroy();
});

test("unsupported glyphs refuse to produce a silently corrupted completed PDF", async () => {
  const source = await PDFDocument.create();
  source.addPage();
  await assert.rejects(renderCompletedPdf(await source.save(),
    [{ signerName: "Signer A", signatureData: image, fieldResponses: [{ id: "notes", value: "note 😀" }] }],
    [{ id: "notes", type: "notes", label: "Notes" }]), /unsupported characters/);
});