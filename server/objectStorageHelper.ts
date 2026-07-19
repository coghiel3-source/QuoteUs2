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
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
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
    if (entityId.startsWith("uploads/")) {
      const name = path.basename(entityId.slice("uploads/".length));
      const abs = path.join(process.cwd(), "client", "public", "uploads", name);
      if (fs.existsSync(abs)) return fs.readFileSync(abs);
    }
    return null;
  }
  // legacy disk path
  const rel = filePath.replace(/^\//, "");
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), "client", "public", rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
}
