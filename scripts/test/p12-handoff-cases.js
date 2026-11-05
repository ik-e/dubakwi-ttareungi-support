const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(
  fs.readFileSync(path.join(root, "workflows", "dubakwi-handoff.json"), "utf8"),
);
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
const execute = new Function("$json", nodes.get("H02 요청 계약 검사").parameters.jsCode);

const invalid = execute({body: {kind: "process", request_id: "req-1"}})[0].json;
if (invalid.route !== "respond" || invalid.http_status !== 400 || invalid.body.error_code !== "invalid_tool_request") {
  throw new Error(`invalid process was not rejected: ${JSON.stringify(invalid)}`);
}

const skipped = execute({body: {
  kind: "lookup", request_id: "req-2", enabled: false, actor_id: "citizen-a", target_ticket_id: null,
}})[0].json;
if (skipped.body.status !== "skipped" || skipped.body.error_code !== null) {
  throw new Error(`disabled lookup was not skipped: ${JSON.stringify(skipped)}`);
}

const processRequest = {
  kind: "process", request_id: "req-3",
  state_ref: {scope: "dubakwi-team", request_id: "req-3", owner_id: "citizen-a", input_hash: "a".repeat(64), execution_id: "exec-3", state_revision: 0},
  expected_case_version: null, case_id: "case-3", actor_id: "citizen-a", first_request_id: "req-3",
  attempt: 1, ticket_id: null, title: "QR 대여 문의", category: "rental", action: "handoff", priority: "normal",
  assignee_role: "support", context: {summary: "요약", reported: [], confirmed: [], attempted_actions: [], missing: [], uncertainties: [], evidence_refs: []},
  answer: "담당자에게 전달합니다.", sources: [], close_status: null, transition_key: "handoff",
};
const prepared = execute({body: processRequest})[0].json;
if (prepared.route !== "prepare" || prepared.op !== "prepare" || prepared.args.current_step !== "H05") {
  throw new Error(`valid process did not prepare state: ${JSON.stringify(prepared)}`);
}

if (workflow.id !== "dubakwiHandoff01") throw new Error(`unexpected workflow id: ${workflow.id}`);
for (const nodeName of ["H14 Jira 전 상태 저장", "H17 Jira 미연결 상태 저장"]) {
  if (nodes.get(nodeName)?.parameters.workflowId?.value !== "dubakwiState01") {
    throw new Error(`${nodeName} does not pin dubakwiState01`);
  }
}
if (workflow.nodes.some((node) => node.type === "n8n-nodes-base.httpRequest")) {
  throw new Error("Jira HTTP must remain blocked before D01 fields and credentials are confirmed");
}

console.log("P12 handoff state gate: 6/6 passed");
