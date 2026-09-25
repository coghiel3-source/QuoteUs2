import { test } from "node:test";
import { strict as assert } from "node:assert";
import { fieldDocumentIndex, nextGuideIndex } from "./docSignGuide";

test("guide starts at first missing required and advances past completed fields", () => {
  const steps = [
    { key: "name", required: true, complete: true },
    { key: "initials", required: true, complete: false },
    { key: "optional", required: false, complete: false },
    { key: "signature", required: true, complete: false },
  ];
  assert.equal(nextGuideIndex(steps, null, "start"), 1);
  assert.equal(nextGuideIndex(steps, "initials", "next"), 3);
  assert.equal(nextGuideIndex(steps, "signature", "next"), 1);
  assert.equal(nextGuideIndex(steps, "signature", "previous"), 2);
  assert.equal(nextGuideIndex(steps.map(step => ({ ...step, complete: true })), "initials", "next"), 2);
});

test("field navigation selects its own document; legacy fields use first document", () => {
  const files = [{ id: "a" }, { id: "b" }];
  assert.equal(fieldDocumentIndex({ fileId: "b" }, files), 1);
  assert.equal(fieldDocumentIndex({ documentIndex: 1 }, files), 1);
  assert.equal(fieldDocumentIndex({ docIndex: 1 }, files), 1);
  assert.equal(fieldDocumentIndex({ fileIndex: 5 }, files), 0);
  assert.equal(fieldDocumentIndex({}, files), 0);
});