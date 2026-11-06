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
  state_ref: {owner_id: "citizen-a", input_hash: "a".repeat(64)},
  ticket: {id: "10001", key: "JBYS-1", reused: true, labels, assignee_id: assigneeId},
  effects: {created_or_reused: {status: "confirmed"}, context_saved: {status: "none"}, closed: {status: "none"}, assigned: {status: "none"}, alert: {status: "none"}},
  error_code: null,
});
const users = {statusCode: 200, body: [{active: true, accountType: "atlassian", accountId: "acct-support"}]};
const execute = (ctx) => {
  const code = planNode.parameters.jsCode.replace("__ASSIGNEE_MAP_JSON__", JSON.stringify({support: "acct-support"}));
  return new Function("$", "$json", code)(() => ({item: {json: {ctx}}}), users)[0].json;
};

let out = execute(base(["dubakwi-alert-sent-support", "dubakwi-context-" + "a".repeat(40)]));
if (out.route !== "done" || out.ctx.effects.assigned.status !== "confirmed" || out.ctx.effects.alert.status !== "confirmed") {
  throw new Error(`sent marker must suppress repeat assignment and alert: ${JSON.stringify(out)}`);
}

out = execute(base(["dubakwi-alert-sent-support"]));
if (out.route !== "context" || out.ctx.context_label !== "dubakwi-context-" + "a".repeat(40) || out.ctx.effects.assigned.status !== "confirmed" || out.ctx.effects.alert.status !== "confirmed") {
  throw new Error(`new supplement must route to context-only update: ${JSON.stringify(out)}`);
}

// 알림 시도 표식만 있고 이번 요청의 문맥 표식이 없으면: 문맥을 저장하기 전에는 confirmed로 표시하지 않고 문맥 저장 경로로 보낸다.
out = execute(base(["dubakwi-alert-attempted-support"]));
if (out.route !== "context" || out.ctx.context_label !== "dubakwi-context-" + "a".repeat(40) || out.ctx.effects.context_saved.status === "confirmed" || out.ctx.error_code !== "partial_effect" || out.ctx.effects.alert.status !== "unknown" || out.ctx.recovery.action !== "alert_marker") {
  throw new Error(`attempt-only marker with new context must go to the context path unconfirmed: ${JSON.stringify(out)}`);
}

// 같은 문맥 표식이 이미 있으면 다시 쓰지 않고, 알림 결과 확인이 필요한 상태로 멈춘다.
out = execute(base(["dubakwi-alert-attempted-support", "dubakwi-context-" + "a".repeat(40)]));
if (out.route !== "done" || out.ctx.effects.context_saved.status !== "confirmed" || out.ctx.error_code !== "partial_effect" || out.ctx.effects.alert.status !== "unknown" || out.ctx.recovery.action !== "alert_marker") {
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
if (out.route !== "assign" || !labelAdds.some((item) => item.add === "dubakwi-alert-attempted-support") || !labelAdds.some((item) => item.add === "dubakwi-context-" + "a".repeat(40))) {
  throw new Error(`first assignment must persist attempt and context markers: ${JSON.stringify(out)}`);
}

if (nodes.get("H50 Jira 알림 성공 표식")?.parameters?.options?.timeout !== 2000) {
  throw new Error("alert success marker write must have a bounded timeout");
}
const markerEdges = workflow.connections["H49 알림 성공 표식 필요"]?.main ?? [];
if (markerEdges[0]?.[0]?.node !== "H50 Jira 알림 성공 표식" || markerEdges[1]?.[0]?.node !== "H12 티켓 결과 구성") {
  throw new Error("alert marker routing is incomplete");
}

console.log("P12 repeated assignment/alert suppression and DLQ handoff: 7/7 passed");

// 종료(자동 답변) 경로의 HTTP 호출 timeout 합이 5.5초를 넘지 않아야 한다(R02 요청: 종료 경로 최악 8초 안쪽).
{
  const closeTimeouts = ["H29", "H32", "H08"].map((prefix) => {
    const node = [...nodes.values()].find((n) => n.name.startsWith(prefix));
    return node?.parameters?.options?.timeout;
  });
  if (closeTimeouts.some((v) => typeof v !== "number")) throw new Error("close path calls must have a bounded timeout");
  const total = closeTimeouts.reduce((a, b) => a + b, 0);
  if (total > 5500) throw new Error(`close path HTTP timeouts total ${total}ms > 5500ms`);
}
