const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-handoff.json"), "utf8"));
const dlqWorkflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-dlq.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
const planNode = nodes.get("H39 배정 계획");
if (!planNode) throw new Error("H39 node missing");

const request = {assignee_role: "support", case_id: "case-1", priority: "normal", context: {summary: "문의", confirmed: [], missing: []}, attempt: 3};
const base = (labels, assigneeId = "acct-support") => ({
  request,
  state_ref: {owner_id: "citizen-a"},
  ticket: {id: "10001", key: "JBYS-1", reused: true, labels, assignee_id: assigneeId},
  effects: {created_or_reused: {status: "confirmed"}, context_saved: {status: "none"}, closed: {status: "none"}, assigned: {status: "none"}, alert: {status: "none"}},
  error_code: null,
});
const users = {statusCode: 200, body: [{active: true, accountType: "atlassian", accountId: "acct-support"}]};
const execute = (ctx) => {
  const code = planNode.parameters.jsCode.replace("__ASSIGNEE_MAP_JSON__", JSON.stringify({support: "acct-support"}));
  return new Function("$", "$json", code)(() => ({item: {json: {ctx}}}), users)[0].json;
};

let out = execute(base(["dubakwi-alert-sent-support"]));
if (out.route !== "done" || out.ctx.effects.assigned.status !== "confirmed" || out.ctx.effects.alert.status !== "confirmed") {
  throw new Error(`sent marker must suppress repeat assignment and alert: ${JSON.stringify(out)}`);
}

out = execute(base(["dubakwi-alert-attempted-support"]));
if (out.route !== "done" || out.ctx.error_code !== "partial_effect" || out.ctx.effects.alert.status !== "unknown" || out.ctx.recovery.action !== "alert_marker") {
  throw new Error(`attempt-only marker must stop automatic repeat: ${JSON.stringify(out)}`);
}
const dlqCode = dlqWorkflow.nodes.find((node) => node.name === "D02 계약 검사와 안전 차단")?.parameters.jsCode;
const validateDlq = new Function("$json", dlqCode);
const dlqInput = {
  op: "put", scope: "dubakwi-team", request_id: "req-next", case_id: "case-1",
  jira_issue_id: "10001", jira_issue_key: "JBYS-1", failed_step: "H39",
  error_code: out.ctx.error_code, summary: "alert result unknown", attempts: 1,
  effects: out.ctx.effects, recovery: out.ctx.recovery, last_execution_id: "exec-next",
};
const dlqResult = validateDlq(dlqInput)[0].json;
if (dlqResult.error_code !== "dlq_backend_unconfigured" || dlqResult.payload._dedupe_ref !== "case:case-1:alert_marker") {
  throw new Error(`attempt-only handoff must produce a case-deduplicated DLQ request: ${JSON.stringify(dlqResult)}`);
}

out = execute(base([]));
const labelAdds = out.req?.body?.update?.labels ?? [];
if (out.route !== "assign" || !labelAdds.some((item) => item.add === "dubakwi-alert-attempted-support")) {
  throw new Error(`first assignment must persist the attempt marker: ${JSON.stringify(out)}`);
}

if (nodes.get("H50 Jira 알림 성공 표식")?.parameters?.options?.timeout !== 2000) {
  throw new Error("alert success marker write must have a bounded timeout");
}
const markerEdges = workflow.connections["H49 알림 성공 표식 필요"]?.main ?? [];
if (markerEdges[0]?.[0]?.node !== "H50 Jira 알림 성공 표식" || markerEdges[1]?.[0]?.node !== "H12 티켓 결과 구성") {
  throw new Error("alert marker routing is incomplete");
}

console.log("P12 repeated assignment/alert suppression and DLQ handoff: 5/5 passed");
