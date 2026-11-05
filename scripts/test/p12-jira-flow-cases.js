// handoff process 경로를 가짜 Jira/state 응답으로 끝까지 따라가 TicketResult를 확인한다.
// n8n을 실행하지 않는 구조·분기 시험이며 실제 Jira 호출 증거가 아니다.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-handoff.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));

const stateRef = (rev) => ({
  scope: "dubakwi-team", request_id: "req-1", owner_id: "citizen-a", input_hash: "a".repeat(64), execution_id: "exec-1", state_revision: rev,
});
const baseRequest = (action) => ({
  kind: "process", request_id: "req-1", state_ref: stateRef(1), expected_case_version: null, case_id: "case-1", actor_id: "citizen-a",
  first_request_id: "req-1", attempt: 1, ticket_id: null, title: "QR 대여 문의 010-1234-5678", category: "rental", action,
  priority: action === "handoff" ? "high" : "normal", assignee_role: action === "handoff" ? "support" : null,
  context: {summary: "연락처 010-1234-5678 로 문의", reported: [], confirmed: [{key: "bike", value: "x", origin: "user"}], attempted_actions: [], missing: [], uncertainties: [], evidence_refs: []},
  answer: "안내입니다. a@b.com", sources: [{doc: "rental-guide", section: "QR", score: 0.8}],
  close_status: action === "close" ? "closed_guidance" : null, transition_key: action,
});

function run(action, jira, opts = {}) {
  const outputs = new Map();
  const calls = [];
  const lookup = (name) => ({item: {json: outputs.get(name)}});
  let current = "H01 도구 요청";
  let json = {body: {...baseRequest(action), ...(opts.req ?? {})}};
  let guard = 0;
  while (current && guard++ < 80) {
    const node = nodes.get(current);
    let results;
    if (node.type === "n8n-nodes-base.code") {
      results = new Function("$json", "$", node.parameters.jsCode.replace("__ASSIGNEE_MAP_JSON__", opts.map ?? '{"support":"acct"}'))(json, lookup);
      json = results[0].json;
    } else if (node.type === "n8n-nodes-base.if") {
      const expr = node.parameters.conditions.conditions[0].leftValue.replace(/^=\{\{\s*|\s*\}\}$/g, "");
      const value = new Function("$json", `return ${expr};`)(json);
      outputs.set(current, json);
      const edges = workflow.connections[current]?.main[value ? 0 : 1] ?? [];
      current = edges[0]?.node ?? null;
      continue;
    } else if (node.type === "n8n-nodes-base.httpRequest") {
      calls.push({node: current, req: json.req});
      json = jira(current, json.req) ?? {statusCode: 0};
    } else if (node.type === "n8n-nodes-base.executeWorkflow") {
      calls.push({node: current, op: json.op});
      json = opts.state ? opts.state(current, json) : {ok: true, skipped: false, error_code: null, state_ref: stateRef(json.state_ref.state_revision + 1)};
    } else if (node.type === "n8n-nodes-base.webhook") {
      json = {body: {...baseRequest(action), ...(opts.req ?? {})}};
    } else if (node.type === "n8n-nodes-base.respondToWebhook") {
      return {body: json.body, calls};
    }
    outputs.set(current, json);
    current = workflow.connections[current]?.main[0]?.[0]?.node ?? null;
  }
  throw new Error(`flow did not reach H13 for ${action}`);
}

const expect = (cond, msg, value) => {
  if (!cond) throw new Error(`${msg}: ${JSON.stringify(value)}`);
};
const happy = (name, req) => {
  if (name === "H29 Jira 기존 건 조회") return {statusCode: 200, body: {issues: []}};
  if (name === "H05 Jira 티켓 생성") return {statusCode: 201, body: {id: "10010", key: "JBYS-10"}};
  if (name === "H32 Jira 전환 조회") return {statusCode: 200, body: {transitions: [{id: "131", name: "Resolved", to: {name: "완료"}, fields: {resolution: {required: true, allowedValues: [{id: "1", name: "Done"}]}}}]}};
  if (name === "H08 Jira 안내 종료") return {statusCode: 204, body: ""};
  if (name === "H38 Jira 담당 후보 조회") return {statusCode: 200, body: [{accountId: "acct", active: true, accountType: "atlassian"}]};
  if (name === "H09 Jira 맥락 저장·배정") return {statusCode: 204, body: ""};
  if (name === "H11 담당 알림") return {statusCode: 200, body: {ok: true}};
  if (name === "H46 Jira 보완 횟수 저장") return {statusCode: 201, body: {id: "1"}};
  throw new Error(`unexpected call ${name}`);
};
const withJira = (over) => (name, req) => (name in over ? over[name] : happy(name, req));

// 1. 안내 종료 성공: 생성+맥락+종료
let r = run("close", happy);
expect(r.body.error_code === null && r.body.ticket_id === "JBYS-10", "close success", r.body);
expect(["created_or_reused", "context_saved", "closed"].every((k) => r.body.effects[k].status === "confirmed"), "close effects", r.body.effects);
expect(r.body.state_ref.state_revision === 3, "bind result must replace state_ref", r.body.state_ref);
const create = r.calls.find((c) => c.node === "H05 Jira 티켓 생성").req;
expect(create.body.fields.labels[0] === "dubakwi-req-1" && create.body.fields.project.key === "JBYS", "create body", create);
expect(!/010-1234-5678|a@b\.com/.test(JSON.stringify(r.calls)), "personal data reached Jira", r.calls);
expect(r.calls.map((c) => c.op ?? c.node).join(">").indexOf("prepare") === 0, "prepare must precede Jira", r.calls);

// 2. 이관 성공: 생성+맥락+배정+알림, 알림 전 prepare
r = run("handoff", happy);
expect(r.body.error_code === null && r.body.effects.assigned.status === "confirmed" && r.body.effects.alert.status === "confirmed", "handoff success", r.body);
const order = r.calls.map((c) => c.op ?? c.node);
expect(order.indexOf("prepare", 1) > order.indexOf("H09 Jira 맥락 저장·배정"), "alert prepare must follow assignment", order);

// 3. 보완(wait): 생성만
r = run("wait", happy);
expect(r.body.error_code === null && r.body.effects.created_or_reused.status === "confirmed" && r.body.effects.closed.status === "none", "wait", r.body);

// 4. 같은 first_request_id가 이미 있으면 새로 만들지 않는다(WF-09)
r = run("close", withJira({"H29 Jira 기존 건 조회": {statusCode: 200, body: {issues: [{id: "10004", key: "JBYS-2"}]}}}));
expect(r.body.ticket_id === "JBYS-2" && !r.calls.some((c) => c.node === "H05 Jira 티켓 생성"), "duplicate must reuse", r);

// 5. 중복 조회 실패면 생성하지 않는다
r = run("close", withJira({"H29 Jira 기존 건 조회": {statusCode: 503, body: {}}}));
expect(r.body.error_code === "tickets_down" && r.body.ticket_id === null && !r.calls.some((c) => c.node === "H05 Jira 티켓 생성"), "search failure must not create", r.body);

// 6. 생성 4xx는 tickets_down, 5xx/무응답은 ticket_unknown이며 후속 변경이 없다
r = run("close", withJira({"H05 Jira 티켓 생성": {statusCode: 400, body: {}}}));
expect(r.body.error_code === "tickets_down" && r.calls.every((c) => c.op !== "bind"), "create 400", r.body);
r = run("close", withJira({"H05 Jira 티켓 생성": {statusCode: 0}}));
expect(r.body.error_code === "ticket_unknown" && r.body.effects.created_or_reused.status === "unknown" && r.body.recovery.action === "create", "create unknown", r.body);

// 7. Resolution 값이 없으면 종료 실패 → partial_effect, known ID 보존(JBYS-2 사례)
const noResolution = {statusCode: 200, body: {transitions: [{id: "131", name: "Resolved", to: {name: "완료"}, fields: {resolution: {required: true, allowedValues: []}}}]}};
r = run("close", withJira({"H32 Jira 전환 조회": noResolution}));
expect(r.body.error_code === "partial_effect" && r.body.ticket_id === "JBYS-10" && r.body.effects.created_or_reused.status === "confirmed" && r.body.effects.closed.status === "failed", "resolution missing", r.body);
expect(r.body.recovery.mode === "jira_ref" && r.body.recovery.action === "close" && r.body.recovery.reference.jira_issue_id === "10010", "close recovery", r.body.recovery);
expect(!r.calls.some((c) => c.node === "H08 Jira 안내 종료"), "must not close without resolution", r.calls);

// 8. 전환 ID는 이름으로 찾는다(상태마다 달라짐)
r = run("close", withJira({"H32 Jira 전환 조회": {statusCode: 200, body: {transitions: [{id: "101", name: "Approved", to: {name: "진행 중"}}, {id: "777", name: "Resolved", to: {name: "완료"}, fields: {resolution: {required: false}}}]}}}));
expect(r.calls.find((c) => c.node === "H08 Jira 안내 종료").req.body.transition.id === "777", "transition by name", r.calls);

// 9. bind 저장 실패: known ID 보존, 종료·배정 호출 없음
r = run("close", happy, {state: (name, input) => (input.op === "bind" ? {ok: false, skipped: false, state_ref: null, error_code: "state_error"} : {ok: true, skipped: false, error_code: null, state_ref: stateRef(input.state_ref.state_revision + 1)})});
expect(r.body.error_code === "state_error" && r.body.ticket_id === "JBYS-10" && r.body.state_saved === false && r.body.recovery.action === "bind", "bind failure", r.body);
expect(!r.calls.some((c) => c.node === "H32 Jira 전환 조회"), "no Jira change after bind failure", r.calls);

// 10. prepare 실패: Jira 호출 0
r = run("close", happy, {state: () => ({ok: false, skipped: false, state_ref: null, error_code: "state_error"})});
expect(r.body.error_code === "state_error" && r.calls.every((c) => c.op), "prepare failure must not call Jira", r);

// 11. 알림 실패·배정 불가는 성공으로 답하지 않는다
r = run("handoff", withJira({"H11 담당 알림": {statusCode: 500, body: {}}}));
expect(r.body.error_code === "partial_effect" && r.body.effects.assigned.status === "confirmed" && r.body.effects.alert.status === "unknown", "alert failure", r.body);
r = run("handoff", withJira({"H38 Jira 담당 후보 조회": {statusCode: 200, body: []}}));
expect(r.body.error_code === "partial_effect" && r.body.effects.assigned.error_code === "assignee_not_assignable" && r.body.recovery.action === "assign", "mapped assignee not assignable", r.body);

// 12. 역할별 담당 매핑이 없거나 깨져 있으면 첫 후보로 배정하지 않고 안전하게 실패한다
for (const map of ["{}", "__ASSIGNEE_MAP_JSON__", "not json", '{"security":"acct"}']) {
  r = run("handoff", happy, {map});
  expect(r.body.error_code === "partial_effect" && r.body.effects.assigned.status === "failed" && r.body.effects.assigned.error_code === "assignee_unmapped", `unmapped ${map} must fail`, r.body);
  expect(!r.calls.some((c) => c.node === "H09 Jira 맥락 저장·배정") && !r.calls.some((c) => c.node === "H11 담당 알림"), `no Jira write or alert without mapping ${map}`, r.calls);
  expect(r.body.ticket_id === "JBYS-10" && r.body.recovery.action === "assign", "known ID and recovery kept", r.body);
}

// 13. 보완(wait)에서 기존 Jira 이슈를 재사용하면 보완 횟수를 Jira에 남기고, 새로 만든 경우에는 추가로 쓰지 않는다
const existing = {"H29 Jira 기존 건 조회": {statusCode: 200, body: {id: "10004", key: "JBYS-2"}}};
r = run("wait", withJira(existing), {req: {ticket_id: "JBYS-2", attempt: 3}});
const note = r.calls.find((c) => c.node === "H46 Jira 보완 횟수 저장");
expect(r.body.error_code === null && r.body.effects.context_saved.status === "confirmed" && note && /보완 횟수: 3/.test(note.req.body.body), "attempt must be saved on reuse", r);
expect(note.req.path === "/rest/api/2/issue/JBYS-2/comment" && !/010-1234-5678|a@b\.com/.test(JSON.stringify(note.req)), "attempt note path and masking", note.req);
r = run("wait", happy);
expect(!r.calls.some((c) => c.node === "H46 Jira 보완 횟수 저장") && r.body.error_code === null, "new issue already carries attempt", r.calls);
for (const bad of [{statusCode: 403, body: {}}, {statusCode: 503, body: {}}, undefined]) {
  r = run("wait", withJira({...existing, "H46 Jira 보완 횟수 저장": bad}), {req: {ticket_id: "JBYS-2", attempt: 3}});
  expect(r.body.error_code === "partial_effect" && r.body.ticket_id === "JBYS-2" && r.body.recovery.action === "context_update" && r.body.effects.context_saved.error_code === "attempt_update_failed", "attempt update failure must not look like success", r.body);
}

console.log("P12 handoff Jira flow: 13 scenarios passed");
