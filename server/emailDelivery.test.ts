import { test } from "node:test";
import assert from "node:assert/strict";
import { sendMailWithDeadline } from "./emailDelivery";

test("returns successful delivery and does not close it early", async () => {
  let closed = false;
  const result = await sendMailWithDeadline({
    sendMail: async () => ({ messageId: "test-only" }),
    close: () => { closed = true; },
  }, {}, 100);
  assert.equal(result.messageId, "test-only");
  assert.equal(closed, false);
});

test("propagates SMTP failure without waiting for the deadline", async () => {
  await assert.rejects(sendMailWithDeadline({
    sendMail: async () => { throw new Error("SMTP unavailable"); },
    close: () => {},
  }, {}, 100), /SMTP unavailable/);
});

test("stalled delivery reaches its deadline and closes the connection", async () => {
  let closed = false;
  await assert.rejects(sendMailWithDeadline({
    sendMail: () => new Promise<never>(() => {}),
    close: () => { closed = true; },
  }, {}, 10), /Email delivery timed out/);
  assert.equal(closed, true);
});

test("a late SMTP rejection after timeout is handled", async () => {
  let rejectDelivery: (error: Error) => void = () => {};
  await assert.rejects(sendMailWithDeadline({
    sendMail: () => new Promise<never>((_, reject) => { rejectDelivery = reject; }),
    close: () => { rejectDelivery(new Error("Connection closed")); },
  }, {}, 10), /Email delivery timed out/);
});
