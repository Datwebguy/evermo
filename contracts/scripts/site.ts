// Publishes the app as a DeWEB site in Evermo's own container: activates the container's name (DomainBinding, at the fee
// the contract asks for right now) and uploads every file of app/dist through SiteRegistry, 24,000 bytes per chunk.
// Files already on chain with the same SHA-256 are skipped, so the script can be run again after a stop or a rebuild.
//
//   HOLDER_KEY=… (holder of Evermo's identity) NAME=xlayer SITE_NAME=evermo.xyz [MONTHS=12] [XLAYER_RPC_URL=…] [CONFIRM=yes] \
//   npx tsx scripts/site.ts
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider, Wallet, formatEther, hexlify } from "ethers";

const env = (k: string, d?: string) => { const v = process.env[k] ?? d; if (v === undefined) throw new Error(`Missing ${k}`); return v; };
const rpcUrl = env("XLAYER_RPC_URL", "https://rpc.xlayer.tech"), name = env("NAME", "xlayer");
const root = new URL("../../", import.meta.url);
const st = JSON.parse(readFileSync(new URL(`deployments/${name}.json`, root), "utf8"));
if (!st["sender.opened"]) throw new Error("Evermo's identity is not deployed yet (run deploy.ts with ALERTS=yes)");
const container: string = st["sender.opened"];
const p = new JsonRpcProvider(rpcUrl, 196, { staticNetwork: true, cacheTimeout: -1 });
const me = new Wallet(env("HOLDER_KEY"), p);
const SITES = "0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6", BINDING = "0x68809Fd2fb343aA57D0aeB7f33Defe477c9666f9";
const sites = new Contract(SITES, [
  "function putFile(address container, string path, string contentType, bytes32 sha256Hash, bytes data)",
  "function appendChunk(address container, string path, uint256 expectIndex, bytes data)",
  "function setFallback(address container, string path)",
  "function fileInfo(address, string) view returns (uint32 size, string contentType, bytes32 sha256Hash, uint40 updatedAt, uint256 chunkCount)",
  "function canEdit(address container, address who) view returns (bool)"], me);
const binding = new Contract(BINDING, ["function monthlyFee() view returns (uint256)", "function isContainerLive(address) view returns (bool)",
  "function bind(string name, address container, uint256 months) payable"], me);

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8" };
const dist = fileURLToPath(new URL("app/dist/", root));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
// index.html last, so the page never points at files that are not there yet.
const files = walk(dist).sort((a, b) => (a.endsWith("index.html") ? 1 : b.endsWith("index.html") ? -1 : a.localeCompare(b)));
const CHUNK = 24000;

if (!(await sites.canEdit(container, me.address))) throw new Error(`${me.address} cannot edit the site of ${container}`);
const fee: bigint = await binding.monthlyFee(), months = BigInt(env("MONTHS", "12"));
const bytes = files.reduce((s, f) => s + statSync(f).size, 0);
console.log(`\nSite of Evermo's container ${container}`);
console.log(`  files     ${files.length}, ${(bytes / 1024).toFixed(0)} KB in ${files.reduce((s, f) => s + Math.ceil(statSync(f).size / CHUNK), 0)} chunks`);
console.log(`  name fee  ${formatEther(fee)} OKB a month (read now), ${months} months = ${formatEther(fee * months)} OKB`);
if (rpcUrl.includes("rpc.xlayer.tech") && process.env.CONFIRM !== "yes") { console.log("\nMainnet: nothing sent. Run again with CONFIRM=yes.\n"); process.exit(0); }
const before = await p.getBalance(me.address);

if (!(await binding.isContainerLive(container))) {
  await (await binding.bind(env("SITE_NAME"), container, months, { value: fee * months })).wait();
  console.log(`  ok     name ${env("SITE_NAME")} activated for ${months} months`);
} else console.log("  done   name already active");

for (const f of files) {
  const path = relative(dist, f).split("\\").join("/"), data = readFileSync(f);
  const hash = "0x" + createHash("sha256").update(data).digest("hex");
  const info = await sites.fileInfo(container, path).catch(() => null);
  if (info && info.sha256Hash === hash && Number(info.size) === data.length) { console.log(`  same   ${path}`); continue; }
  const type = TYPES[extname(f)] ?? "application/octet-stream";
  await (await sites.putFile(container, path, type, hash, hexlify(data.subarray(0, CHUNK)))).wait();
  for (let i = 1; i * CHUNK < data.length; i++) await (await sites.appendChunk(container, path, i, hexlify(data.subarray(i * CHUNK, (i + 1) * CHUNK)))).wait();
  const after = await sites.fileInfo(container, path);
  if (after.sha256Hash !== hash) throw new Error(`${path}: stored file does not match`);
  console.log(`  ok     ${path}  ${(data.length / 1024).toFixed(1)} KB`);
}
await (await sites.setFallback(container, "index.html")).wait();
console.log(`\nDone. Spent ${formatEther(before - (await p.getBalance(me.address)))} OKB. Live: ${await binding.isContainerLive(container)}\n`);
