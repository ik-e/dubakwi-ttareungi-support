// handoff process 경로를 가짜 Jira/state 응답으로 끝까지 따라가 TicketResult를 확인한다.
// n8n을 실행하지 않는 구조·분기 시험이며 실제 Jira 호출 증거가 아니다.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const labelFor = (scope, owner, rid) => "dubakwi-" + crypto.createHash("sha256").update(JSON.stringify([scope, owner, rid])).digest("hex").slice(0, 40);

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-handoff.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
const CC = require("../../services/user_api/case_context.js")();

const linkFields = (over = {}) => ({
  labels: [labelFor("dubakwi-team", "citizen-a", "req-1")],
  description: ["[두바퀴 문의 접수]", "case_id: case-1", "first_request_id: req-1"].join("\n"),
  status: {statusCategory: {key: "indeterminate"}},
  ...over,
});

const stateRef = (rev) => ({
  scope: "dubakwi-team", request_id: "req-1", owner_id: "citizen-a", input_hash: "a".repeat(64), execution_id: "exec-1", state_revision: rev,
});
const baseRequest = (action) => ({
  kind: "process", request_id: "req-1", state_ref: stateRef(1), expected_case_version: null, case_id: "case-1", actor_id: "citizen-a",
  first_request_id: "req-1", attempt: 1, ticket_id: null, title: "QR 대여 문의 010-1234-5678", category: "rental", action,
  priority: action === "handoff" ? "high" : "normal", assignee_role: action === "handoff" ? "support" : null,
  context: {summary: "연락처 010-1234-5678 로 문의", reported: [], confirmed: [{key: "bike", value: "x", origin: "api", reference:"mock-api"}], attempted_actions: [], missing: [], uncertainties: [], evidence_refs: []},
  answer: "안내입니다. a@b.com", sources: [{doc: "rental-guide", section: "QR", score: 0.8}],
  close_status: action === "close" ? "closed_guidance" : null, transition_key: action,
});

function run(action, jira, opts = {}) {
  const outputs = new Map();
  const calls = [];
  const comments = [];
  const lookup = (name) => ({item: {json: outputs.get(name)},first:()=>({json:outputs.get(name)})});
  let current = "H01 도구 요청";
  let json = {body: {...baseRequest(action), ...(opts.req ?? {})}};
  let guard = 0;
  while (current && guard++ < 80) {
    const node = nodes.get(current);
    let results;
    if (node.type === "n8n-nodes-base.code") {
      results = new Function("$json", "$", "$input", node.parameters.jsCode.replaceAll("__JIRA_CONTEXT_AUTHORS_JSON__", opts.authors ?? '["service-test"]').replace("__ASSIGNEE_MAP_JSON__", opts.map ?? '{"support":"acct"}'))(json, lookup, {all:()=>[{json}]});
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
      if (current.startsWith('H53 ')) {
        const c=outputs.get('H52 검증 문맥 조회 준비').ctx;
        json={statusCode:200,body:{key:c.ticket.key,fields:linkFields({labels:[labelFor(c.request.state_ref.scope,c.request.actor_id,c.request.first_request_id)],description:'case_id: '+c.request.case_id+'\nfirst_request_id: '+c.request.first_request_id,status:{statusCategory:{key:c.ticket.done?'done':'indeterminate'}}})}};
      } else if (current.startsWith('H55 ') || current.startsWith('H60 ')) {
        const c=outputs.get('H52 검증 문맥 조회 준비').ctx;
        if(c.ticket.reused && comments.length===0){
          const r=c.request,b={scope:r.state_ref.scope,case_id:r.case_id,owner_id:r.actor_id,first_request_id:r.first_request_id,ticket_key:c.ticket.key};
          const mask=x=>typeof x==='string'?x.replace(/\b0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}\b/g,'***-****-****').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'***@***'):Array.isArray(x)?x.map(mask):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,mask(v)])):x;
          const support={case_id:r.case_id,owner_id:r.actor_id,ticket_id:c.ticket.key,first_request_id:r.first_request_id,attempt:r.attempt,version:null,status:r.action==='wait'?'waiting_info':r.action==='handoff'?'handed_off':r.close_status,assignee_role:r.action==='handoff'?r.assignee_role:null,priority:r.priority};
          const snap=CC.buildSnapshot(b,r.request_id,r.ticket_id?'followup':r.action,1,support,mask(r.context));
          comments.push({body:CC.MARKER+'\n'+JSON.stringify(snap),author:{accountId:'service-test'}});
        }
        json={statusCode:200,body:{startAt:0,total:comments.length,comments:[...comments]}};
      } else if(current.startsWith('H58 ')) {
        comments.push({body:json.req.body.body,author:{accountId:'service-test'}});
        json={statusCode:201,body:{id:'comment-test'}};
      } else json = jira(current, json.req) ?? {statusCode: 0};
    } else if (node.type === "n8n-nodes-base.executeWorkflow") {
      calls.push({node: current, op: json.op});
      json = opts.state ? opts.state(current, json) : {ok: true, skipped: false, error_code: null, state_ref: {...json.state_ref, state_revision: json.state_ref.state_revision + 1}};
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
  if (name === "H50 Jira 알림 성공 표식") return {statusCode: 204, body: ""};
  if (name === "H46 Jira 보완 횟수 저장") return {statusCode: 204, body: ""};
  throw new Error(`unexpected call ${name}`);
};
const withJira = (over) => (name, req) => (name in over ? over[name] : happy(name, req));

// 1. 안내 종료 성공: 생성+맥락+종료
let r = run("close", happy);
expect(r.body.error_code === null && r.body.ticket_id === "JBYS-10", "close success", r.body);
expect(["created_or_reused", "context_saved", "closed"].every((k) => r.body.effects[k].status === "confirmed"), "close effects", r.body.effects);
expect(r.body.state_ref.state_revision === 3, "bind result must replace state_ref", r.body.state_ref);
const create = r.calls.find((c) => c.node === "H05 Jira 티켓 생성").req;
expect(create.body.fields.labels[0] === labelFor("dubakwi-team", "citizen-a", "req-1") && create.body.fields.project.key === "JBYS", "create body", create);
expect(create.body.fields.description.split("\n").includes("case_id: case-1") && create.body.fields.description.split("\n").includes("first_request_id: req-1"), "description must carry the case identity lines", create);
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
r = run("close", withJira({"H29 Jira 기존 건 조회": {statusCode: 200, body: {issues: [{id: "10004", key: "JBYS-2", fields: linkFields()}]}}}));
expect(r.body.ticket_id === "JBYS-2" && !r.calls.some((c) => c.node === "H05 Jira 티켓 생성"), "duplicate must reuse", r);

// 5. 중복 조회 실패면 생성하지 않는다
r = run("close", withJira({"H29 Jira 기존 건 조회": {statusCode: 503, body: {}}}));
expect(r.body.error_code === "tickets_down" && r.body.ticket_id === null && !r.calls.some((c) => c.node === "H05 Jira 티켓 생성"), "search failure must not create", r.body);

// 6. 생성 4xx는 tickets_down, 5xx/무응답은 ticket_unknown이며 후속 변경이 없다
r = run("close", withJira({"H05 Jira 티켓 생성": {statusCode: 400, body: {}}}));
expect(r.body.error_code === "tickets_down" && r.calls.every((c) => c.op !== "bind"), "create 400", r.body);
r = run("close", withJira({"H05 Jira 티켓 생성": {statusCode: 0}}));
expect(r.body.error_code === "ticket_unknown" && r.body.effects.created_or_reused.status === "unknown" && r.body.recovery.action === "create", "create unknown", r.body);

// External rejection/error contracts are mocks, never actual Jira fault injection.
for (const statusCode of [401, 403, 429, 500, 503]) {
  const observed = run("close", withJira({"H05 Jira 티켓 생성": {statusCode, body:{}}}));
  expect(observed.body.error_code === (statusCode < 500 ? "tickets_down" : "ticket_unknown"), "create HTTP error classification", observed.body);
  expect(observed.calls.filter(c=>c.node === "H05 Jira 티켓 생성").length === 1 && observed.calls.every(c=>c.op !== "bind"), "no blind create retry/bind after HTTP rejection", observed.calls);
}

// 7. Resolution 값이 없으면 종료 실패 → partial_effect, known ID 보존(JBYS-2 사례)
const noResolution = {statusCode: 200, body: {transitions: [{id: "131", name: "Resolved", to: {name: "완료"}, fields: {resolution: {required: true, allowedValues: []}}}]}};
r = run("close", withJira({"H32 Jira 전환 조회": noResolution}));
expect(r.body.error_code === "partial_effect" && r.body.ticket_id === "JBYS-10" && r.body.effects.created_or_reused.status === "confirmed" && r.body.effects.closed.status === "failed", "resolution missing", r.body);
expect(r.body.recovery.mode === "payload" && r.body.recovery.action === "close" && r.body.recovery.reference.jira_issue_id === "10010", "close recovery", r.body.recovery);
expect(r.body.recovery.args.close_status === "closed_guidance" && typeof r.body.recovery.args.answer === "string", "close recovery capsule", r.body.recovery.args);
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
const existing = {"H29 Jira 기존 건 조회": {statusCode: 200, body: {id: "10004", key: "JBYS-2", fields: linkFields()}}};
r = run("wait", withJira(existing), {req: {ticket_id: "JBYS-2", attempt: 3}});
const note = r.calls.find((c) => c.node === "H46 Jira 보완 횟수 저장");
expect(r.body.error_code === null && r.body.effects.context_saved.status === "confirmed" && note && /보완 횟수: 3/.test(note.req.body.update.comment[0].add.body), "attempt must be saved on reuse", r);
expect(note.req.method === "PUT" && note.req.path === "/rest/api/2/issue/JBYS-2" && !/010-1234-5678|a@b\.com/.test(JSON.stringify(note.req)), "attempt note path and masking", note.req);
r = run("wait", happy);
expect(!r.calls.some((c) => c.node === "H46 Jira 보완 횟수 저장") && r.body.error_code === null, "new issue already carries attempt", r.calls);
for (const bad of [{statusCode: 403, body: {}}, {statusCode: 503, body: {}}, undefined]) {
  r = run("wait", withJira({...existing, "H46 Jira 보완 횟수 저장": bad}), {req: {ticket_id: "JBYS-2", attempt: 3}});
  expect(r.body.error_code === "partial_effect" && r.body.ticket_id === "JBYS-2" && r.body.recovery.action === "context_update" && r.body.effects.context_saved.error_code === "attempt_update_failed", "attempt update failure must not look like success", r.body);
}

// 14. 키로 재사용하는 이슈는 JBYS 문의이고 이 문의 label이 있어야 한다(다른 이슈에는 쓰지 않는다)
for (const [name, body] of [
  ["other label", {id: "1", key: "JBYS-9", fields: linkFields({labels: ["dubakwi-someone-else"]})}],
  ["no labels", {id: "1", key: "JBYS-9", fields: linkFields({labels: []})}],
  ["other project", {id: "2", key: "OTHER-1", fields: linkFields()}],
  ["other case", {id: "3", key: "JBYS-9", fields: linkFields({description: "case_id: case-other\nfirst_request_id: req-1"})}],
  ["no description", {id: "4", key: "JBYS-9", fields: linkFields({description: ""})}],
]) {
  r = run("close", withJira({"H29 Jira 기존 건 조회": {statusCode: 200, body}}), {req: {ticket_id: body.key}});
  expect(r.body.error_code === "tickets_down" && r.body.effects.created_or_reused.error_code === "ticket_not_linked", `${name} must not be reused`, r.body);
  expect(!r.calls.some((c) => ["H17 티켓 연결 저장", "H32 Jira 전환 조회", "H08 Jira 안내 종료", "H09 Jira 맥락 저장·배정", "H46 Jira 보완 횟수 저장"].includes(c.node)), `${name} must not be bound or written`, r.calls);
}

// 15. 이미 완료된 이슈를 다시 닫는 재시도는 Jira 쓰기 없이 성공으로 끝난다
const done = {"H29 Jira 기존 건 조회": {statusCode: 200, body: {id: "10004", key: "JBYS-2", fields: linkFields({status: {statusCategory: {key: "done"}}})}}};
r = run("close", withJira(done), {req: {ticket_id: "JBYS-2"}});
expect(r.body.error_code === null && r.body.effects.closed.status === "confirmed" && !r.calls.some((c) => c.node === "H08 Jira 안내 종료"), "already resolved close must be idempotent and not write", r);

// 16. 검색 결과가 여러 건이거나 이 문의 것이 아니면 재사용도 새 생성도 하지 않는다
const search = (issues) => withJira({"H29 Jira 기존 건 조회": {statusCode: 200, body: {issues}}});
const mine = {id: "10004", key: "JBYS-2", fields: linkFields()};
const writes = ["H05 Jira 티켓 생성", "H17 티켓 연결 저장", "H32 Jira 전환 조회", "H08 Jira 안내 종료", "H09 Jira 맥락 저장·배정"];
for (const [name, issues, code] of [
  ["two results", [mine, {id: "10005", key: "JBYS-3", fields: linkFields()}], "ticket_ambiguous"],
  ["other case", [{id: "1", key: "JBYS-9", fields: linkFields({description: "case_id: case-other\nfirst_request_id: req-1"})}], "ticket_not_linked"],
  ["other first request", [{id: "1", key: "JBYS-9", fields: linkFields({description: "case_id: case-1\nfirst_request_id: req-other"})}], "ticket_not_linked"],
  ["other owner label", [{id: "1", key: "JBYS-9", fields: linkFields({labels: [labelFor("dubakwi-team", "citizen-b", "req-1")]})}], "ticket_not_linked"],
  ["other scope label", [{id: "1", key: "JBYS-9", fields: linkFields({labels: [labelFor("other-scope", "citizen-a", "req-1")]})}], "ticket_not_linked"],
  ["no description", [{id: "1", key: "JBYS-9", fields: linkFields({description: ""})}], "ticket_not_linked"],
  ["other project key", [{id: "1", key: "OTHER-5", fields: linkFields()}], "ticket_not_linked"],
]) {
  r = run("close", search(issues));
  expect(r.body.error_code === "tickets_down" && r.body.effects.created_or_reused.error_code === code, `${name} must not be reused`, r.body);
  expect(!r.calls.some((c) => writes.includes(c.node)), `${name} must not create, bind or write`, r.calls);
}
r = run("close", search([mine]));
expect(r.body.error_code === null && r.body.ticket_id === "JBYS-2" && !r.calls.some((c) => c.node === "H05 Jira 티켓 생성"), "a single matching result is reused", r.body);

// 17. 요청 ID 변환 충돌 방지: req.a·req/a·req_a와 다른 scope·소유자는 서로 다른 label이어야 한다
const seen = new Set();
for (const [scope, owner, rid] of [
  ["dubakwi-team", "citizen-a", "req.a"],
  ["dubakwi-team", "citizen-a", "req/a"],
  ["dubakwi-team", "citizen-a", "req_a"],
  ["other-scope", "citizen-a", "req.a"],
  ["dubakwi-team", "citizen-b", "req.a"],
]) {
  r = run("close", happy, {req: {first_request_id: rid, actor_id:owner, state_ref: {...stateRef(1), scope, owner_id: owner}}});
  const made = r.calls.find((c) => c.node === "H05 Jira 티켓 생성").req.body.fields.labels[0];
  expect(made === labelFor(scope, owner, rid) && !seen.has(made), `label for ${scope}/${owner}/${rid} must be unique`, made);
  seen.add(made);
}
expect(seen.size === 5, "five distinct labels", [...seen]);

// 18. 같은 이관 요청의 완전 재전송은 문맥·배정·알림을 다시 쓰지 않는다.
const contextLabel = "dubakwi-context-" + "a".repeat(40);
const completedHandoff = {"H29 Jira 기존 건 조회": {statusCode: 200, body: {id: "10004", key: "JBYS-2", fields: linkFields({labels: [labelFor("dubakwi-team", "citizen-a", "req-1"), "dubakwi-alert-sent-support", contextLabel], assignee: {accountId: "acct"}})}}};
r = run("handoff", withJira(completedHandoff), {req: {ticket_id: "JBYS-2"}});
expect(r.body.error_code === null && r.body.effects.context_saved.status === "confirmed" && r.body.effects.assigned.status === "confirmed" && r.body.effects.alert.status === "confirmed", "completed handoff replay", r.body);
expect(!r.calls.some((c) => ["H09 Jira 맥락 저장·배정", "H11 담당 알림", "H46 Jira 보완 횟수 저장"].includes(c.node)), "completed replay must not write Jira or alert", r.calls);

// 19. 같은 담당자·알림 완료 뒤 새 보완은 문맥과 횟수만 저장하고 배정·알림은 반복하지 않는다.
const supplementHash = "b".repeat(64);
r = run("handoff", withJira(completedHandoff), {req: {request_id: "req-2", ticket_id: "JBYS-2", attempt: 2, state_ref: {...stateRef(2), request_id: "req-2", input_hash: supplementHash}, context: {...baseRequest("handoff").context, summary: "새 보완 내용"}}});
const contextUpdate = r.calls.find((c) => c.node === "H46 Jira 보완 횟수 저장");
expect(r.body.error_code === null && r.body.effects.context_saved.status === "confirmed" && r.body.effects.assigned.status === "confirmed" && r.body.effects.alert.status === "confirmed", "new supplement on completed handoff", r.body);
expect(contextUpdate && contextUpdate.req.body.update.labels[0].add === "dubakwi-context-" + supplementHash.slice(0, 40) && /보완 횟수: 2/.test(contextUpdate.req.body.update.comment[0].add.body), "new supplement context and attempt must be stored", contextUpdate);
expect(!r.calls.some((c) => ["H09 Jira 맥락 저장·배정", "H11 담당 알림"].includes(c.node)), "new supplement must not repeat assignment or alert", r.calls);

// 20. 알림 시도 표식만 있는 문의에 새 문맥이 오면 문맥만 저장하고(재배정·재알림 없음) 알림 확인 필요 상태로 남긴다
const attemptedOnly = {"H29 Jira 기존 건 조회": {statusCode: 200, body: {id: "10004", key: "JBYS-2", fields: linkFields({labels: [labelFor("dubakwi-team", "citizen-a", "req-1"), "dubakwi-alert-attempted-support"], assignee: {accountId: "acct"}})}}};
const noAlertWork = (calls) => !calls.some((c) => ["H09 Jira 맥락 저장·배정", "H11 담당 알림", "H19 알림 의도 저장", "H50 Jira 알림 성공 표식"].includes(c.node));
r = run("handoff", withJira(attemptedOnly), {req: {ticket_id: "JBYS-2"}});
const savedContext = r.calls.find((c) => c.node === "H46 Jira 보완 횟수 저장");
expect(savedContext && savedContext.req.body.update.labels.some((l) => l.add === "dubakwi-context-" + "a".repeat(40)) && noAlertWork(r.calls), "attempt-only marker must store the new context only", r.calls);
expect(r.body.error_code === "partial_effect" && r.body.effects.context_saved.status === "confirmed" && r.body.effects.alert.status === "unknown" && r.body.recovery.action === "alert_marker", "attempt-only marker stays partial after the context is stored", r.body);
r = run("handoff", withJira({...attemptedOnly, "H46 Jira 보완 횟수 저장": {statusCode: 503, body: {}}}), {req: {ticket_id: "JBYS-2"}});
expect(r.body.error_code === "partial_effect" && r.body.effects.context_saved.status === "unknown" && r.body.effects.context_saved.error_code === "attempt_update_failed" && r.body.recovery.action === "context_update" && noAlertWork(r.calls), "a failed context save must never look confirmed", r.body);

r=run("close",happy,{req:{deadline_at:new Date(Date.now()+500).toISOString()}});
expect(!r.calls.some(c=>["H05 Jira 티켓 생성","H08 Jira 안내 종료","H09 Jira 맥락 저장·배정","H11 담당 알림"].includes(c.node)),"insufficient deadline must prevent new external writes",r);
r=run("close",happy,{authors:"[]"});
expect(r.body.error_code==="tickets_down"&&r.calls.every(c=>!!c.op),"missing trusted-author configuration must not call Jira",r);
console.log("P12 handoff Jira flow: 21 scenarios plus deadline/config gates passed");
