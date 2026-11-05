const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(
  fs.readFileSync(path.join(root, "workflows", "dubakwi-errors.json"), "utf8"),
);
const codeNode = workflow.nodes.find((node) => node.name === "E02 오류 가림과 안전 차단");
if (!codeNode) {
  throw new Error("E02 code node not found");
}

const execute = new Function("$json", codeNode.parameters.jsCode);
const secretMarkers = ["super-secret", "Bearer private-token", "db.internal", "stack-private"];
const result = execute({
  execution: {
    id: "execution-1",
    lastNodeExecuted: "H06 Jira 생성",
    error: {
      message: "https://db.internal super-secret",
      stack: "stack-private",
      credential: "Bearer private-token",
    },
  },
  workflow: {id: "workflow-1", name: "support"},
})[0].json;

const serialized = JSON.stringify(result);
for (const marker of secretMarkers) {
  if (serialized.includes(marker)) {
    throw new Error(`private error detail leaked: ${marker}`);
  }
}

if (
  result.error_code !== "workflow_runtime_error" ||
  result.effect !== "unknown" ||
  result.effect_plan !== "dlq_alert" ||
  result.known_ticket_id !== null
) {
  throw new Error(`unexpected safe error envelope: ${serialized}`);
}

const missingReference = execute({execution: {error: {message: "super-secret"}}})[0].json;
if (missingReference.effect !== "none" || missingReference.effect_plan !== "none") {
  throw new Error(`missing references must block recovery: ${JSON.stringify(missingReference)}`);
}

console.log("P20 error redaction: 2/2 passed");
