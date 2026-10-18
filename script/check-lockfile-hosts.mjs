import { readFileSync } from "node:fs";

// Do not configure npm's registry here. Replit installs must retain their
// security policy; the committed lockfile must also be usable outside Replit.
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const blocked = Object.entries(lock.packages).filter(([, pkg]) => {
  if (!pkg.resolved) return false;
  try {
    const host = new URL(pkg.resolved).hostname;
    return host === "localhost" || host.endsWith(".internal");
  } catch {
    return false;
  }
}).map(([name]) => name);

if (blocked.length) {
  console.error("Deployment blocked: package-lock.json contains internal-only download addresses.");
  console.error("Replace these with canonical registry URLs for the SAME versions and integrity hashes:");
  console.error(blocked.join("\n"));
  process.exit(1);
}
console.log("Lockfile deployment check passed: no internal-only download addresses.");
