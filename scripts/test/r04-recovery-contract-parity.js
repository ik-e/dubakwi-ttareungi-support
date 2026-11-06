const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const read = (name) => fs.readFileSync(path.join(root, "workflows", name), "utf8");
const dlq = JSON.parse(read("dubakwi-dlq.json"));
const validator = dlq.nodes.find((node) => node.name === "D02 계약 검사와 안전 차단")?.parameters.jsCode ?? "";
const allowedMatch = validator.match(/const allowedActions = new Set\(\[([^\]]+)\]\)/);
if (!allowedMatch) throw new Error("DLQ allowedActions not found");
const allowed = new Set([...allowedMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]));

const producers = ["dubakwi-handoff.json", "dubakwi-state.json", "dubakwi-errors.json"]
  .filter((file) => fs.existsSync(path.join(root, "workflows", file)));
const produced = new Set();
for (const file of producers) {
  const text = read(file);
  for (const match of text.matchAll(/action:\s*'([^']+)'/g)) produced.add(match[1]);
  for (const match of text.matchAll(/refCap\('([^']+)'/g)) produced.add(match[1]);
}
const nonRecovery = new Set(["close", "wait", "handoff"]);
const recoveryActions = [...produced].filter((action) => !nonRecovery.has(action));
const missing = recoveryActions.filter((action) => !allowed.has(action));
if (missing.length) throw new Error(`recovery actions missing from DLQ contract: ${missing.sort().join(", ")}`);

const handoff = read("dubakwi-handoff.json");
const requiredFragments = [
  "refCap('alert_marker', '이전 알림 시도 결과를 확인해야 함')",
  "action:'alert_marker'",
  "dubakwi-alert-attempted-",
  "dubakwi-alert-sent-",
];
for (const fragment of requiredFragments) {
  if (!handoff.includes(fragment)) throw new Error(`repeat-alert contract fragment missing: ${fragment}`);
}

console.log(`R04 recovery/DLQ contract parity: ${recoveryActions.length}/${recoveryActions.length} actions covered`);
