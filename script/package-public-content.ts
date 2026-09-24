import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import AdmZip from "adm-zip";

// Explicit source allowlist: never package .env, database exports or uploads.
const changed = [
  "client/index.html",
  "client/src/App.tsx",
  "client/src/main.tsx",
  "client/src/entry-server.tsx",
  "client/src/components/AIMascotChat.tsx",
  "client/src/components/Layout.tsx",
  "client/src/components/YouTubeAnalyticsPlayer.tsx",
  "client/src/lib/AuthContext.tsx",
  "client/src/pages/RentClock.tsx",
  "client/src/pages/useRentClock.ts",
  "script/build.ts",
  "script/prerender.test.ts",
  "server/seo.ts",
  "server/static.ts",
  "server/vite.ts",
];
const dependencies = [
  "shared/seo.ts",
  "server/seo.test.ts",
  "client/src/hooks/use-seo.ts",
  "client/public/robots.txt",
  "client/src/pages/RentGuaranteeGuide.tsx",
  "client/src/pages/rent-guarantee-guide.css",
  "client/src/pages/rent-clock.css",
  "client/src/pages/rentClockConfig.ts",
  "client/src/pages/rentClockCalculation.ts",
  "client/src/lib/rentClockAnalytics.ts",
];
const root = "QuoteUs_Public_Content_Update/";
const zip = new AdmZip();
const manifest: Record<string, string> = {};
for (const file of [...changed, ...dependencies]) {
  const data = fs.readFileSync(file);
  zip.addFile(`${root}updated-source/${file}`, data);
  manifest[file] = createHash("sha256").update(data).digest("hex");
}
// A fixed patch base is passed explicitly so rerunning after commits is safe.
const base = process.argv[2];
if (!base || !/^[a-f0-9]{40}$/.test(base)) {
  throw new Error("Usage: npx tsx script/package-public-content.ts <full pre-update git commit>");
}
let patch = "";
for (const file of changed) {
  try {
    execFileSync("git", ["cat-file", "-e", `${base}:${file}`], { stdio: "ignore" });
    patch += execFileSync("git", ["diff", "--binary", base, "--", file], { encoding: "utf8" });
  } catch {
    // New files may still be untracked when preparing the completion package.
    // Let git preserve exact trailing-newline/binary details.
    try {
      patch += execFileSync("git", ["diff", "--no-index", "--binary", "--", "/dev/null", file], { encoding: "utf8" });
    } catch (error: any) {
      if (error.status !== 1 || typeof error.stdout !== "string") throw error;
      patch += error.stdout; // git diff returns 1 when differences exist.
    }
  }
}
zip.addFile(`${root}changes.patch`, Buffer.from(patch));
zip.addFile(`${root}SHA256SUMS.json`, Buffer.from(JSON.stringify(manifest, null, 2) + "\n"));
zip.addFile(`${root}READ-ME-FIRST.md`, fs.readFileSync("dist-export/PUBLIC-CONTENT-UPDATE.md"));
zip.addFile(`${root}VERIFICATION.md`, fs.readFileSync("dist-export/PUBLIC-CONTENT-VERIFICATION.md"));
const output = path.resolve("dist-export/QuoteUs_Public_Content_Update.zip");
zip.writeZip(output);
console.log(`Created ${path.relative(process.cwd(), output)} with ${zip.getEntries().length} entries`);