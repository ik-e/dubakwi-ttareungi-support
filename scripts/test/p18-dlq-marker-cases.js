const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-dlq.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
const code = nodes.get("D02 계약 검사와 안전 차단")?.parameters.jsCode;
if (!code) throw new Error("D02 validator missing");
const execute = new Function("$json", code);
const effect = (status) => ({status});
const input = {
  op: "put", scope: "dubakwi-team", request_id: "req-2", case_id: "case-1",
  jira_issue_id: "10001", jira_issue_key: "JBYS-1", failed_step: "H51",
  error_code: "partial_effect", summary: "alert marker unknown", attempts: 1,
  effects: {created_or_reused: effect("confirmed"), context_saved: effect("confirmed"), closed: effect("none"), assigned: effect("confirmed"), alert: effect("confirmed")},
  recovery: {version: 1, mode: "jira_ref", action: "alert_marker", args: null, reference: {jira_issue_id: "10001", case_id: "case-1", owner_id: "citizen-a"}, reason: "marker write unknown"},
  last_execution_id: "exec-2",
};
const result = execute(input)[0].json;
if (result.error_code !== "dlq_backend_unconfigured") throw new Error(`alert_marker rejected: ${JSON.stringify(result)}`);
if (result.payload._dedupe_ref !== "case:case-1:alert_marker") throw new Error(`stable case dedupe missing: ${JSON.stringify(result)}`);
if (result.payload.last_execution_id !== "exec-2" || result.payload.request_id !== "req-2") throw new Error("latest request/execution references were lost");
const query = nodes.get("D04 PostgreSQL DLQ 저장")?.parameters?.options?.queryReplacement ?? "";
if (!query.includes("D02 계약 검사와 안전 차단") || !query.includes("payload")) throw new Error("normalized DLQ payload is not sent to PostgreSQL");

console.log("P18 alert_marker validation and case deduplication: 4/4 passed");
