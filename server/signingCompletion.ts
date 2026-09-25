export type SigningField = { id: string; type?: string; label?: string; required?: boolean; signerId?: string };
export type SigningResponse = { id: string; type?: string; value: string };

export function completionCopyMessage(ready: boolean): string {
  return ready
    ? "A fully signed copy is attached to this email for your records."
    : "Your signatures have been saved and the signing process is complete, but a completed document copy is not currently available. Please contact QuoteUs.ca for a copy.";
}

export function isDuplicateSigningSubmission(status: string, signerStatus?: string): boolean {
  return status === "signed" || signerStatus === "signed";
}

export function completedSignerRecords(serialized: string | null): Array<{
  signerName: string; signatureData?: string; fieldResponses?: SigningResponse[];
}> {
  const signers = serialized ? JSON.parse(serialized) : [];
  if (!Array.isArray(signers) || signers.some(s => s.status !== "signed" || !s.signatureData)) {
    throw new Error("Signing record is not complete");
  }
  return signers;
}

export async function sendCompletionNotifications(
  recipients: string[],
  email: { subject: string; html: string; attachments: { filename: string; content: Buffer }[] },
  send: (options: { to: string; cc: string; subject: string; html: string; attachments: { filename: string; content: Buffer }[] }) => Promise<boolean>,
): Promise<"sent" | "failed" | "not_required"> {
  if (!recipients.length) return "not_required";
  const results = await Promise.all(recipients.map(async to => {
    try {
      return await send({ to, cc: "rgprocessing@quoteus.ca", ...email });
    } catch {
      return false;
    }
  }));
  return results.every(Boolean) ? "sent" : "failed";
}

/** Keep the immutable field definitions separate from the signers' captured answers. */
export function validateSigningResponses(
  fields: SigningField[],
  responses: unknown,
  signerId: string | undefined,
  signatureData: unknown,
): { error?: string; responses: SigningResponse[] } {
  const assigned = fields.filter(f => !signerId || !f.signerId || f.signerId === signerId);
  if (!Array.isArray(responses) || responses.some(r => !r || typeof r.id !== "string" || typeof r.value !== "string")) {
    return { error: "Invalid field responses", responses: [] };
  }
  const allowed = new Set(assigned.map(f => f.id));
  if (responses.some(r => !allowed.has(r.id)) || new Set(responses.map(r => r.id)).size !== responses.length) {
    return { error: "Responses contain unassigned or duplicate fields", responses: [] };
  }
  const values = new Map<string, string>(responses.map(r => [r.id, r.value]));
  const missing = assigned.find(f => f.required && !values.get(f.id)?.trim());
  if (missing) return { error: `Required field "${missing.label || missing.id}" is incomplete`, responses: [] };
  const hasSignatureField = assigned.some(f => f.type === "signature" || f.type === "initials");
  if (!hasSignatureField && (typeof signatureData !== "string" || !signatureData.startsWith("data:image/"))) {
    return { error: "A signature is required", responses: [] };
  }
  for (const field of assigned) {
    const value = values.get(field.id);
    if (value && (field.type === "signature" || field.type === "initials") && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value)) {
      return { error: "Invalid signature or initials image", responses: [] };
    }
  }
  return { responses: assigned.map(f => ({ id: f.id, type: f.type, value: values.get(f.id) || "" })) };
}