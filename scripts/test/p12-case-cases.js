// dubakwi-state의 begin(case_ref) 확인 경로를 가짜 DB·Jira 응답으로 따라간다.
// n8n·PostgreSQL·Jira를 실제로 실행하지 않는 구조·분기 시험이며 DB 함수 자체는 infra/db/verification/case-contract.sql이 맡는다.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const labelFor = (scope, owner, rid) => "dubakwi-" + crypto.createHash("sha256").update(JSON.stringify([scope, owner, rid])).digest("hex").slice(0, 40);

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-state.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));

const beginInput = (over = {}) => ({
  op: "begin", scope: "dubakwi-team", execution_id: "exec-2", input_hash: "b".repeat(64), actor: {id: "citizen-a"},
  request: {request_id: "req-2", question: "보완", attempt: 2, case_ref: "case-abc"}, ...over,
});

function run(input, fake) {
  const outputs = new Map();
  const calls = [];
  const lookup = (name) => ({item: {json: outputs.get(name)}});
  const evalExpr = (expr, json) => new Function("$json", "$", `return ${expr.replace(/^=\{\{\s*|\s*\}\}$/g, "")};`)(json, lookup);
  let current = "S01 상태 명령 수신";
  let json = input;
  outputs.set(current, json);
  let guard = 0;
  while (current && guard++ < 60) {
    const node = nodes.get(current);
    const next = () => workflow.connections[current]?.main[0]?.[0]?.node ?? null;
    if (current !== "S01 상태 명령 수신") {
      if (node.type === "n8n-nodes-base.code") {
        json = new Function("$json", "$", node.parameters.jsCode)(json, lookup)[0].json;
      } else if (node.type === "n8n-nodes-base.if") {
        const value = evalExpr(node.parameters.conditions.conditions[0].leftValue, json);
        outputs.set(current, json);
        current = workflow.connections[current]?.main[value ? 0 : 1]?.[0]?.node ?? null;
        continue;
      } else if (node.type === "n8n-nodes-base.httpRequest") {
        calls.push({jira: json.req.path});
        json = fake.jira ?? {statusCode: 0};
      } else if (node.type === "n8n-nodes-base.postgres") {
        const query = node.parameters.query;
        const payload = JSON.parse(evalExpr(node.parameters.options.queryReplacement, json));
        const fn = /state_apply|case_lookup|case_begin/.exec(query)[0];
        calls.push({sql: fn, payload});
        json = {result: JSON.stringify(fake[fn](payload))};
      } else if (node.type === "n8n-nodes-base.noOp") {
        return {result: json, calls};
      }
    }
    outputs.set(current, json);
    current = next();
  }
  throw new Error("flow did not reach S06");
}

const expect = (cond, msg, value) => {
  if (!cond) throw new Error(`${msg}: ${JSON.stringify(value)}`);
};
const needVerification = () => ({request_id: "req-2", mode: "error", state_ref: null, support: null, facts: null, response: null, http_status: 503, error_code: "case_verification_required"});
const jiraIssue = (category, text = "보완 횟수: 1", over = {}) => ({
  statusCode: 200,
  body: {
    key: "JBYS-10",
    fields: {
      labels: [labelFor("dubakwi-team", "citizen-a", "req-1")],
      status: {statusCategory: {key: category}},
      description: ["case_id: case-abc", "first_request_id: req-1", text].join("\n"),
      comment: {comments: [{body: "[두바퀴 담당자 이관]\n보완 횟수: 2"}]},
      ...over,
    },
  },
});
const ownedCase = {ok: true, found: true, owner_match: true, busy: false, jira_issue_key: "JBYS-10", first_request_id: "req-1"};
const base = (over) => ({state_apply: needVerification, case_lookup: () => ownedCase, case_begin: () => ({mode: "proceed"}), jira: jiraIssue("indeterminate"), ...over});

// 1. 정상 보완: 열린 Jira + 기존 보완 횟수를 읽어 case_begin에 전달, 결과를 그대로 반환
let r = run(beginInput(), base({case_begin: (p) => ({request_id: "req-2", mode: "proceed", support: {attempt: p.jira_attempt}, http_status: 200, error_code: null})}));
expect(r.result.mode === "proceed" && r.result.support.attempt === 2, "proceed with Jira attempt", r.result);
const cb = r.calls.find((c) => c.sql === "case_begin").payload;
expect(cb.jira_open === true && cb.jira_attempt === 2 && cb.request.case_ref === "case-abc", "case_begin payload", cb);
expect(r.calls.find((c) => c.sql === "case_lookup").payload.actor_id === "citizen-a", "lookup uses server actor", r.calls);

// 2. Jira가 종료 상태면 jira_open:false로 case_begin이 case_closed를 정한다
r = run(beginInput(), base({jira: jiraIssue("done"), case_begin: (p) => ({request_id: "req-2", mode: "conflict", http_status: 409, error_code: p.jira_open ? null : "case_closed"})}));
expect(r.result.error_code === "case_closed" && r.result.http_status === 409, "closed case", r.result);

// 3. 알 수 없는 case·타인·진행 중은 Jira를 보지 않고 거절한다
for (const [name, lookup, code, http, mode] of [
  ["unknown", () => ({ok: true, found: false}), "invalid_case_ref", 400, "conflict"],
  ["other owner", () => ({ok: true, found: true, owner_match: false}), "case_access_denied", 403, "conflict"],
  ["busy", () => ({...ownedCase, busy: true}), "case_busy", 409, "pending"],
]) {
  r = run(beginInput(), base({case_lookup: lookup}));
  expect(r.result.error_code === code && r.result.http_status === http && r.result.mode === mode && r.result.state_ref === null, `${name} rejection`, r.result);
  expect(!r.calls.some((c) => c.jira || c.sql === "case_begin"), `${name} must not reach Jira or case_begin`, r.calls);
}
expect(r.result.support === null && r.result.facts === null, "no case content on rejection", r.result);

// 4. 확인 불가는 error로 끝나며 존재·종료로 단정하지 않는다
for (const [name, fake] of [
  ["jira 5xx", base({jira: {statusCode: 503, body: {}}})],
  ["jira no response", base({jira: undefined})],
  ["jira malformed", base({jira: {statusCode: 200, body: {fields: {}}}})],
  ["lookup failure", base({case_lookup: () => ({ok: false, error_code: "invalid_state_request"})})],
  ["no jira key", base({case_lookup: () => ({...ownedCase, jira_issue_key: null})})],
]) {
  r = run(beginInput(), fake);
  expect(r.result.mode === "error" && r.result.http_status === 503 && !r.calls.some((c) => c.sql === "case_begin"), `${name} must fail closed`, r);
}


// 4b. Jira 이슈가 이 case의 것이 아니면(키·소유자 label·case_id) 이어 가지 않는다
for (const [name, jira] of [
  ["other label", jiraIssue("indeterminate", "보완 횟수: 1", {labels: [labelFor("dubakwi-team", "citizen-b", "req-1")]})],
  ["other scope", jiraIssue("indeterminate", "보완 횟수: 1", {labels: [labelFor("other-scope", "citizen-a", "req-1")]})],
  ["other case", jiraIssue("indeterminate", "보완 횟수: 1", {description: "case_id: case-other\nfirst_request_id: req-1"})],
  ["other key", {statusCode: 200, body: {key: "JBYS-99", fields: jiraIssue("indeterminate").body.fields}}],
]) {
  r = run(beginInput(), base({jira}));
  expect(r.result.mode === "error" && r.result.http_status === 503 && r.result.error_code === "case_verification_required" && !r.calls.some((c) => c.sql === "case_begin"), `${name} must not continue the case`, r);
}

// 5. case_ref가 없거나 이미 판정된 begin은 보완 경로를 타지 않는다
r = run(beginInput({request: {request_id: "req-3", question: "신규", attempt: 1}}), base({state_apply: () => ({request_id: "req-3", mode: "proceed", state_ref: {state_revision: 0}, http_status: 200, error_code: null})}));
expect(r.result.mode === "proceed" && r.calls.length === 1 && r.calls[0].sql === "state_apply", "new request skips case flow", r);
r = run(beginInput(), base({state_apply: () => ({request_id: "req-2", mode: "replay", response: {request_id: "req-2"}, http_status: 200, error_code: null})}));
expect(r.result.mode === "replay" && r.calls.length === 1, "replay skips case flow", r);

console.log("P12 state case_ref verification: all checks passed");
