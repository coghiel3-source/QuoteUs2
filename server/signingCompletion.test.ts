import { test } from "node:test";
import assert from "node:assert/strict";
import { completedSignerRecords, completionCopyMessage, isDuplicateSigningSubmission, sendCompletionNotifications, validateSigningResponses } from "./signingCompletion";

const image = "data:image/png;base64,aGVsbG8=";
const fields = [
  { id: "sig-a", type: "signature", label: "Signature", required: true, signerId: "a" },
  { id: "initial-a", type: "initials", label: "Initials", required: true, signerId: "a" },
  { id: "sig-b", type: "signature", label: "Other signature", required: true, signerId: "b" },
];

test("rejects a missing assigned required field without requiring another signer's answers", () => {
  const result = validateSigningResponses(fields, [{ id: "sig-a", value: image }], "a", image);
  assert.match(result.error || "", /Initials/);
  assert.equal(validateSigningResponses(fields, [
    { id: "sig-a", value: image }, { id: "initial-a", value: image },
  ], "a", image).error, undefined);
});

test("rejects answers for another signer, duplicates, and malformed signature images", () => {
  assert.match(validateSigningResponses(fields, [{ id: "sig-b", value: image }], "a", image).error || "", /unassigned/);
  assert.match(validateSigningResponses(fields, [
    { id: "sig-a", value: image }, { id: "sig-a", value: image },
  ], "a", image).error || "", /duplicate/);
  assert.match(validateSigningResponses(fields, [
    { id: "sig-a", value: "fake" }, { id: "initial-a", value: image },
  ], "a", image).error || "", /Invalid signature/);
});

test("retains only assigned answers with original field types", () => {
  const result = validateSigningResponses(fields, [
    { id: "sig-a", type: "text", value: image },
    { id: "initial-a", type: "text", value: image },
  ], "a", image);
  assert.deepEqual(result.responses.map(r => r.type), ["signature", "initials"]);
  assert.equal(result.responses[0].value, image);
});

test("completion notifies each client with fixed CC and reports transport failures truthfully", async () => {
  const calls: Array<{ to: string; cc: string }> = [];
  const email = { subject: "Complete", html: "<p>Complete</p>", attachments: [{ filename: "signed.pdf", content: Buffer.from("pdf") }] };
  const result = await sendCompletionNotifications(["a@example.com", "b@example.com"], email, async options => {
    calls.push({ to: options.to, cc: options.cc });
    assert.equal(options.attachments[0].filename, "signed.pdf");
    return options.to === "a@example.com";
  });
  assert.equal(result, "failed");
  assert.deepEqual(calls, [
    { to: "a@example.com", cc: "rgprocessing@quoteus.ca" },
    { to: "b@example.com", cc: "rgprocessing@quoteus.ca" },
  ]);
  assert.equal(await sendCompletionNotifications([], email, async () => true), "not_required");
});

test("completion preserves every signer's signature and initials", () => {
  const signers = [
    { id: "a", status: "signed", signerName: "A", signatureData: image, fieldResponses: [
      { id: "sig-a", value: image }, { id: "initial-a", value: image },
    ] },
    { id: "b", status: "signed", signerName: "B", signatureData: image, fieldResponses: [
      { id: "sig-b", value: image },
    ] },
  ];
  assert.deepEqual(completedSignerRecords(JSON.stringify(signers)), signers);
  assert.throws(() => completedSignerRecords(JSON.stringify([{ ...signers[0], status: "pending" }])));
});

test("duplicate already-signed submissions are identified before notification", () => {
  assert.equal(isDuplicateSigningSubmission("partial", "signed"), true);
  assert.equal(isDuplicateSigningSubmission("signed", "pending"), true);
  assert.equal(isDuplicateSigningSubmission("partial", "pending"), false);
});

test("copy-preparation failure has a truthful confirmation independent of mail delivery", async () => {
  const email = { subject: "Signing Complete", html: completionCopyMessage(false), attachments: [] };
  const calls: any[] = [];
  const status = await sendCompletionNotifications(["client@example.com"], email, async options => {
    calls.push(options);
    return true;
  });
  assert.equal(status, "sent");
  assert.match(calls[0].html, /signatures have been saved/);
  assert.match(calls[0].html, /not currently available/);
  assert.deepEqual(calls[0].attachments, []);
  assert.equal(calls[0].cc, "rgprocessing@quoteus.ca");
});