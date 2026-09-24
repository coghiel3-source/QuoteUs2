import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import express from "express";
import {
  exportedUploadPath,
  localDocumentPath,
  persistBufferToStorage,
  persistLocalFileToStorage,
  readFileFromAnyPath,
} from "./objectStorageHelper";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage/routes";

test("local documents persist, read and serve without Replit storage", async (t) => {
  const workspace = process.cwd();
  const previousMode = process.env.DOCUMENT_STORAGE_MODE;
  const previousDir = process.env.DOCUMENT_STORAGE_DIR;
  const previousPrivateDir = process.env.PRIVATE_OBJECT_DIR;
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "quoteus-documents-"));
  let server: ReturnType<ReturnType<typeof express>["listen"]> | undefined;

  try {
    process.chdir(temporary);
    process.env.DOCUMENT_STORAGE_MODE = "local";
    process.env.DOCUMENT_STORAGE_DIR = path.join(temporary, "durable");
    delete process.env.PRIVATE_OBJECT_DIR; // A cloud call would now fail.
    const pdf = Buffer.from("%PDF-1.4\nsigned document\n");

    await t.test("buffer and disk uploads retain object URLs and delete source only on success", async () => {
      const url = await persistBufferToStorage(pdf, "signed.pdf", "application/pdf");
      assert.match(url, /^\/objects\/uploads\/[0-9a-f-]+-signed\.pdf$/);
      assert.deepEqual(await fs.readFile(localDocumentPath(url.slice("/objects/".length))!), pdf);
      assert.deepEqual(await readFileFromAnyPath(url), pdf);

      const source = path.join(temporary, "incoming.pdf");
      await fs.writeFile(source, pdf);
      const secondUrl = await persistLocalFileToStorage(source, "incoming.pdf", "application/pdf");
      assert.deepEqual(await readFileFromAnyPath(secondUrl), pdf);
      await assert.rejects(fs.stat(source), { code: "ENOENT" });

      process.env.DOCUMENT_STORAGE_DIR = "not-an-absolute-path";
      const failedSource = path.join(temporary, "failed.pdf");
      await fs.writeFile(failedSource, pdf);
      await assert.rejects(persistLocalFileToStorage(failedSource, "failed.pdf"), /absolute path/);
      assert.deepEqual(await fs.readFile(failedSource), pdf);
      process.env.DOCUMENT_STORAGE_DIR = path.join(temporary, "durable");
    });

    await t.test("traversal and encoded paths are rejected", async () => {
      for (const id of ["uploads/../secret", "uploads/%2e%2e", "uploads/file/extra", "uploads\\secret"]) {
        assert.equal(localDocumentPath(id), null);
        assert.equal(exportedUploadPath(id), null);
        assert.equal(await readFileFromAnyPath(`/objects/${id}`), null);
      }
      assert.equal(await readFileFromAnyPath("/uploads/../secret"), null);
      assert.equal(await readFileFromAnyPath("/uploads/%2e%2e/secret"), null);
    });

    await t.test("exported object basename fallback and legacy /uploads reads", async () => {
      const exported = path.join(temporary, "client", "public", "uploads", "exported.pdf");
      await fs.mkdir(path.dirname(exported), { recursive: true });
      await fs.writeFile(exported, pdf);
      assert.deepEqual(await readFileFromAnyPath("/objects/uploads/exported.pdf"), pdf);
      assert.deepEqual(await readFileFromAnyPath("/uploads/exported.pdf"), pdf);
      const nested = path.join(path.dirname(exported), "doc-signatures", "legacy.pdf");
      await fs.mkdir(path.dirname(nested), { recursive: true });
      await fs.writeFile(nested, pdf);
      assert.deepEqual(await readFileFromAnyPath("/uploads/doc-signatures/legacy.pdf"), pdf);
    });

    await t.test("HTTP serves local PDF, exported fallback, and real 404", async () => {
      const app = express();
      registerObjectStorageRoutes(app);
      app.use((_req, res) => res.send("<html>SPA fallback</html>"));
      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve, reject) => {
        server!.once("listening", resolve);
        server!.once("error", reject);
      });
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const base = `http://127.0.0.1:${address.port}`;

      const url = await persistBufferToStorage(pdf, "served.pdf", "application/pdf");
      for (const objectPath of [url, "/objects/uploads/exported.pdf"]) {
        const response = await fetch(base + objectPath);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type") || "", /application\/pdf/);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
      }
      // The existing Replit-mode exported-copy fallback remains available too.
      process.env.DOCUMENT_STORAGE_MODE = "replit";
      const exportedResponse = await fetch(base + "/objects/uploads/exported.pdf");
      assert.equal(exportedResponse.status, 200);
      assert.equal(exportedResponse.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(Buffer.from(await exportedResponse.arrayBuffer()), pdf);
      process.env.DOCUMENT_STORAGE_MODE = "local";
      for (const objectPath of ["/objects/uploads/missing.pdf", "/objects/uploads/%2e%2e%2fsecret"]) {
        const response = await fetch(base + objectPath);
        assert.equal(response.status, 404);
        assert.match(response.headers.get("content-type") || "", /application\/json/);
        assert.deepEqual(await response.json(), { error: "Object not found" });
      }
    });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    process.chdir(workspace);
    if (previousMode === undefined) delete process.env.DOCUMENT_STORAGE_MODE;
    else process.env.DOCUMENT_STORAGE_MODE = previousMode;
    if (previousDir === undefined) delete process.env.DOCUMENT_STORAGE_DIR;
    else process.env.DOCUMENT_STORAGE_DIR = previousDir;
    if (previousPrivateDir === undefined) delete process.env.PRIVATE_OBJECT_DIR;
    else process.env.PRIVATE_OBJECT_DIR = previousPrivateDir;
    await fs.rm(temporary, { recursive: true, force: true });
  }
});