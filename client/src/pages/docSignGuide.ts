export interface GuideItem {
  key: string;
  required: boolean;
  complete: boolean;
}

export function nextGuideIndex(steps: GuideItem[], currentKey: string | null, direction: "start" | "next" | "previous"): number {
  if (!steps.length) return -1;
  const index = steps.findIndex(step => step.key === currentKey);
  if (direction === "previous") return Math.max(0, index - 1);
  if (direction === "start") {
    const missing = steps.findIndex(step => step.required && !step.complete);
    return missing < 0 ? 0 : missing;
  }
  const later = steps.findIndex((step, i) => i > index && step.required && !step.complete);
  if (later >= 0) return later;
  const missing = steps.findIndex(step => step.required && !step.complete);
  if (missing >= 0) return missing;
  return Math.min(index + 1, steps.length - 1);
}

export function fieldDocumentIndex(
  field: { documentId?: string; fileId?: string; documentIndex?: number; docIndex?: number; fileIndex?: number },
  files: { id?: string }[],
): number {
  const id = field.documentId || field.fileId;
  const byId = id ? files.findIndex(file => file.id === id) : -1;
  if (byId >= 0) return byId;
  const index = field.documentIndex ?? field.docIndex ?? field.fileIndex;
  return typeof index === "number" && Number.isInteger(index) && index >= 0 && index < files.length ? index : 0;
}