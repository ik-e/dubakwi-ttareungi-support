// dubakwi-state의 save가 Jira 문맥을 확인한 뒤에만 finish로 저장하는지 가짜 응답으로 따라간다.
// n8n·PostgreSQL·Jira를 실제로 실행하지 않는 구조·분기 시험이다.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-state.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));

const stateRef = (rev) => ({
  scope: "dubakwi-team", request_id: "req-1", owner_id: "citizen-a", input_hash: "a".repeat(64), execution_id: "exec-1", state_revision: rev,
});
const saveInput = (over = {}) => ({
  op: "save", state_ref: stateRef(3), case_id: "case-1", first_request_id: "req-1", attempt: 1, expected_case_version: null, ticket_id: "JBYS-10",
  facts: {summary: "요약", reported: [], confirmed: [], attempted_actions: [], missing: [], uncertainties: [], evidence_refs: []},
  outcome: {mode: "guidance", route: "자동 답변", answer: "안내", sources: [], close_required: false, support_status: "answered", reason: null},
  response: {request_id: "req-1", route: "자동 답변", answer: "안내", sources: [], ticket: null, agents: [], security: {blocked_by: null, reason: null, masked: 0}},
  ...over,
});

function run(input, jira) {
  const outputs = new Map();
  const calls = [];
  const lookup = (name) => ({item: {json: outputs.get(name)}});
  const evalExpr = (expr, json) => new Function("$json", "$", `return ${expr.replace(/^=\{\{\s*|\s*\}\}$/g, "")};`)(json, lookup);
  let current = "S01 상태 명령 수신";
  let json = input;
  outputs.set(current, json);
  let guard = 0;
  while (current && guard++ < 40) {
    const next = () => workflow.connections[current]?.main[0]?.[0]?.node ?? null;
    const node = nodes.get(current);
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
        json = jira ?? {statusCode: 0};
      } else if (node.type === "n8n-nodes-base.postgres") {
        const payload = JSON.parse(evalExpr(node.parameters.options.queryReplacement, json));
        calls.push({sql: payload.op});
        json = {result: JSON.stringify({request_id: payload.state_ref.request_id, ok: true, skipped: false, state_ref: stateRef(payload.state_ref.state_revision + 1), error_code: null})};
      } else if (node.type === "n8n-nodes-base.noOp") {
        return {result: json, calls};
      }
    }
    outputs.set(current, json);
    current = next();
  }
  return {result: json, calls};
}

const expect = (cond, msg, value) => {
  if (!cond) throw new Error(`${msg}: ${JSON.stringify(value)}`);
};
const issue = (labels) => ({statusCode: 200, body: {key: "JBYS-10", fields: {labels, status: {name: "Pending"}}}});

// 1. Jira 문맥 확인 통과 → finish로 저장하고 ok:true, 새 state_ref
let r = run(saveInput(), issue(["dubakwi-req-1"]));
expect(r.result.ok === true && r.result.state_ref.state_revision === 4 && r.result.error_code === null, "save success", r.result);
expect(r.calls.map((c) => c.jira ?? c.sql).join(",").endsWith("finish") && r.calls[0].jira.startsWith("/rest/api/2/issue/JBYS-10"), "jira check then finish", r.calls);
expect(r.result.recovery && r.result.recovery.mode === "manual_required", "save result must carry recovery", r.result);

// 2. Jira 확인 실패/불일치/버전 미지원 → SQL 호출 없이 ok:false
for (const [name, input, jira, code] of [
  ["jira 5xx", saveInput(), {statusCode: 503, body: {}}, "tickets_down"],
  ["jira 404", saveInput(), {statusCode: 404, body: {}}, "tickets_down"],
  ["no response", saveInput(), undefined, "tickets_down"],
  ["other label", saveInput(), issue(["dubakwi-other"]), "state_error"],
  ["other key", saveInput(), {statusCode: 200, body: {key: "JBYS-99", fields: {labels: ["dubakwi-req-1"]}}}, "tickets_down"],
  ["version given", saveInput({expected_case_version: 5}), issue(["dubakwi-req-1"]), "tickets_down"],
]) {
  r = run(input, jira);
  expect(r.result.ok === false && r.result.error_code === code && r.result.state_ref.state_revision === 3, `${name} must fail closed`, r.result);
  expect(!r.calls.some((c) => c.sql), `${name} must not call SQL`, r.calls);
  expect(r.result.recovery.action === "finish", `${name} recovery`, r.result.recovery);
}

// 3. 계약 오류는 Jira·SQL 호출 없이 거절(기존 동작 유지)
r = run(saveInput({ticket_id: ""}), issue(["dubakwi-req-1"]));
expect(r.result.ok === false && r.result.error_code === "invalid_state_request" && r.calls.length === 0, "invalid save", r);

// 4. save가 아닌 명령은 Jira를 거치지 않는다
r = run({op: "prepare", state_ref: stateRef(1), args: {current_step: "H05"}}, undefined);
expect(r.calls.length === 1 && r.calls[0].sql === "prepare", "prepare must skip Jira", r.calls);

console.log("P12 state save with Jira verification: all checks passed");
