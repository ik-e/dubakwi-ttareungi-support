const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflowPath = path.join(root, "workflows", "dubakwi-state.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

if (workflow.id !== "dubakwiState01") {
  throw new Error(`unexpected workflow id: ${workflow.id}`);
}

const codeNode = workflow.nodes.find((node) => node.name === "S02 계약 검사와 안전 차단");
if (!codeNode) {
  throw new Error("S02 code node not found");
}

const execute = new Function("$json", codeNode.parameters.jsCode);
const failArgs = {status: "failed", current_step: "jira_create", error_code: "tickets_down"};

const skipped = execute({
  op: "fail",
  state_ref: null,
  scope: "support",
  execution_id: "execution-1",
  args: failArgs,
})[0].json;

if (skipped.ok !== true || skipped.skipped !== true || skipped.error_code !== null) {
  throw new Error(`unowned fail must be skipped safely: ${JSON.stringify(skipped)}`);
}

const invalid = execute({
  op: "fail",
  state_ref: null,
  scope: "support",
  execution_id: "execution-1",
  args: {...failArgs, unexpected: true},
})[0].json;

if (invalid.ok !== false || invalid.skipped !== false || invalid.error_code !== "invalid_state_request") {
  throw new Error(`invalid fail must be rejected: ${JSON.stringify(invalid)}`);
}

console.log("P12 state contract: 2/2 passed");
