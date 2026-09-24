import fs from "fs";
import path from "path";
import crypto from "crypto";
import { objectStorageClient } from "./replit_integrations/object_storage";

function parseBucketPath(p: string): { bucketName: string; objectName: string } {
  const norm = p.startsWith("/") ? p : `/${p}`;
  const parts = norm.split("/");
  if (parts.length < 3) throw new Error(`Invalid bucket path: ${p}`);
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  return dir.endsWith("/") ? dir.slice(0, -1) : dir;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

export function useLocalDocumentStorage(): boolean {
  const mode = process.env.DOCUMENT_STORAGE_MODE;
  if (mode && mode !== "local" && mode !== "replit") {
    throw new Error("DOCUMENT_STORAGE_MODE must be 'local' or 'replit'");
  }
  return mode === "local";
}

function localDocumentDir(): string {
  // Off-Replit default is outside the web root and the application directory.
  // Production hosts should mount a persistent volume and set DOCUMENT_STORAGE_DIR.
  const dir = process.env.DOCUMENT_STORAGE_DIR || path.resolve(process.cwd(), "..", "quoteus-document-storage");
  if (!path.isAbsolute(dir)) throw new Error("DOCUMENT_STORAGE_DIR must be an absolute path");
  return dir;
}

/** Only generated single-file upload IDs are addressable from /objects. */
function validUploadEntity(entityId: string): boolean {
  return /^uploads\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(entityId) &&
    entityId.split("/")[1] !== "." && entityId.split("/")[1] !== "..";
}

export function localDocumentPath(entityId: string): string | null {
  if (!validUploadEntity(entityId)) return null;
  return path.join(localDocumentDir(), entityId);
}

export function exportedUploadPath(entityId: string): string | null {
  if (!validUploadEntity(entityId)) return null;
  return path.join(process.cwd(), "client", "public", "uploads", entityId.slice("uploads/".length));
}

async function readLocalFile(filePath: string): Promise<Buffer | null> {
  try {
    // Uploaded objects are regular files, never follow symlinks out of storage.
    if (!(await fs.promises.lstat(filePath)).isFile()) return null;
    return await fs.promises.readFile(filePath);
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Persist a Buffer to private object storage under uploads/<key>-<safeName>.
 * Returns a serve URL like `/objects/uploads/<key>-<safeName>`.
 */
export async function persistBufferToStorage(
  buf: Buffer,
  originalName: string,
  contentType?: string,
): Promise<string> {
  const key = crypto.randomUUID();
  const safe = sanitizeName(originalName || "file");
  const entityId = `uploads/${key}-${safe}`;
  if (useLocalDocumentStorage()) {
    const destination = localDocumentPath(entityId)!;
    await fs.promises.mkdir(path.dirname(destination), { recursive: true });
    // Exclusive creation prevents an existing file or symlink from being overwritten.
    await fs.promises.writeFile(destination, buf, { flag: "wx", mode: 0o600 });
    return `/objects/${entityId}`;
  }
  const fullPath = `${getPrivateDir()}/${entityId}`;
  const { bucketName, objectName } = parseBucketPath(fullPath);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  await file.save(buf, {
    contentType: contentType || "application/octet-stream",
    resumable: false,
  });
  return `/objects/${entityId}`;
}

/**
 * Read a local file from disk and persist to object storage. Removes the local
 * file on success. Returns `/objects/uploads/...` URL.
 */
export async function persistLocalFileToStorage(
  localPath: string,
  originalName: string,
  contentType?: string,
): Promise<string> {
  const buf = fs.readFileSync(localPath);
  const url = await persistBufferToStorage(buf, originalName, contentType);
  try { fs.unlinkSync(localPath); } catch {}
  return url;
}

/**
 * Read a file referenced by either `/objects/<entityId>` (object storage)
 * or a legacy `/uploads/...` (on-disk under client/public). Returns a Buffer
 * or null if not found.
 */
export async function readFileFromAnyPath(filePath: string): Promise<Buffer | null> {
  if (!filePath) return null;
  if (filePath.startsWith("/objects/")) {
    const entityId = filePath.slice("/objects/".length);
    const exported = exportedUploadPath(entityId);
    if (useLocalDocumentStorage()) {
      if (!exported) return null;
      return (await readLocalFile(localDocumentPath(entityId)!)) ?? await readLocalFile(exported);
    }
    try {
      const fullPath = `${getPrivateDir()}/${entityId}`;
      const { bucketName, objectName } = parseBucketPath(fullPath);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        const [buf] = await file.download();
        return buf;
      }
    } catch {
      // object storage unavailable (e.g. self-hosted) — try local disk below
    }
    // Fallback: exported copy on local disk under client/public/uploads/
    return exported ? readLocalFile(exported) : null;
  }
  // legacy disk path
  if (filePath.startsWith("/uploads/") || filePath.startsWith("uploads/")) {
    const rel = filePath.replace(/^\//, "");
    if (rel.split("/").some(part => part === "." || part === ".." || part.includes("\\") || part.includes("%"))) return null;
    return readLocalFile(path.join(process.cwd(), "client", "public", rel));
  }
  if (!path.isAbsolute(filePath)) return null;
  return readLocalFile(filePath);
}
