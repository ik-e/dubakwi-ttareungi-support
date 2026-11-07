// dubakwi-state의 save가 Jira 문맥을 확인한 뒤에만 finish로 저장하는지 가짜 응답으로 따라간다.
// n8n·PostgreSQL·Jira를 실제로 실행하지 않는 구조·분기 시험이다.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const labelFor = (scope, owner, rid) => "dubakwi-" + crypto.createHash("sha256").update(JSON.stringify([scope, owner, rid])).digest("hex").slice(0, 40);

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-state.json"), "utf8"));
const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
const CC=require("../../services/user_api/case_context.js")();

const stateRef = (rev) => ({
  scope: "dubakwi-team", request_id: "req-1", owner_id: "citizen-a", input_hash: "a".repeat(64), execution_id: "exec-1", state_revision: rev,
});
const saveInput = (over = {}) => ({
  deadline_at:new Date(Date.now()+20000).toISOString(), op: "save", state_ref: stateRef(3), case_id: "case-1", first_request_id: "req-1", attempt: 1, expected_case_version: null, ticket_id: "JBYS-10",
  facts: {summary: "요약", reported: [], confirmed: [], attempted_actions: [], missing: [], uncertainties: [], evidence_refs: []},
  outcome: {mode: "guidance", route: "자동 답변", answer: "안내", sources: [], close_required: false, support_status: "closed_guidance", reason: null},
  response: {request_id: "req-1", route: "자동 답변", answer: "안내", sources: [], ticket: null, agents: [], security: {blocked_by: null, reason: null, masked: 0}},
  ...over,
});

function run(input, jira, opts = {}) {
  let comments = [];
  const outputs = new Map();
  const calls = [];
  const lookup = (name) => ({item: {json: outputs.get(name)},first:()=>({json:outputs.get(name)})});
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
        json = new Function("$json", "$", "$input", node.parameters.jsCode.replaceAll("__JIRA_CONTEXT_AUTHORS_JSON__", '["service-test"]'))(json, lookup, {all:()=>[{json}]})[0].json;
      } else if (node.type === "n8n-nodes-base.if") {
        const value = evalExpr(node.parameters.conditions.conditions[0].leftValue, json);
        outputs.set(current, json);
        current = workflow.connections[current]?.main[value ? 0 : 1]?.[0]?.node ?? null;
        continue;
      } else if (node.type === "n8n-nodes-base.httpRequest") {
        calls.push({jira: json.req.path});
        if(current.startsWith('S24 ')){
          const b={scope:input.state_ref.scope,owner_id:input.state_ref.owner_id,case_id:input.case_id,first_request_id:input.first_request_id,ticket_key:input.ticket_id};
          const support={case_id:input.case_id,owner_id:b.owner_id,ticket_id:input.ticket_id,first_request_id:input.first_request_id,attempt:input.attempt,version:null,status:input.outcome.support_status,assignee_role:null,priority:'normal'};
          const snap=CC.buildSnapshot(b,input.state_ref.request_id,'close',1,support,opts.previousFacts??input.facts);
          comments=[{body:CC.MARKER+'\n'+JSON.stringify(snap),author:{accountId:opts.badAuthor?'untrusted':'service-test'}}];
          json={statusCode:200,body:{startAt:0,total:comments.length,comments:[...comments]}};
        }else if(current.startsWith('S26 ')){
          if(!opts.dropWrite)comments.push({body:json.req.body.body,author:{accountId:'service-test'}});
          json={statusCode:opts.writeUnknown?0:201,body:{}};
        }else if(current.startsWith('S28 ')){
          json={statusCode:200,body:{startAt:0,total:comments.length,comments:[...comments]}};
        }else json = jira ?? {statusCode: 0};
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
const linked = (over = {}) => ({
  labels: [labelFor("dubakwi-team", "citizen-a", "req-1")],
  description: "case_id: case-1\nfirst_request_id: req-1",
  status: {name: "Done",statusCategory:{key:"done"}},
  ...over,
});
const issue = (fields) => ({statusCode: 200, body: {key: "JBYS-10", fields}});

// 1. Jira 문맥 확인 통과 → finish로 저장하고 ok:true, 새 state_ref
let r = run(saveInput(), issue(linked()));
expect(r.result.ok === true && r.result.state_ref.state_revision === 4 && r.result.error_code === null, "save success", r.result);
expect(r.calls.map((c) => c.jira ?? c.sql).join(",").endsWith("finish") && r.calls[0].jira.startsWith("/rest/api/2/issue/JBYS-10"), "jira check then finish", r.calls);
expect(r.result.recovery && r.result.recovery.mode === "manual_required", "save result must carry recovery", r.result);

// 2. Jira 확인 실패/불일치/버전 미지원 → SQL 호출 없이 ok:false
for (const [name, input, jira, code] of [
  ["jira 5xx", saveInput(), {statusCode: 503, body: {}}, "state_error"],
  ["jira 404", saveInput(), {statusCode: 404, body: {}}, "state_error"],
  ["no response", saveInput(), undefined, "state_error"],
  ["other label", saveInput(), issue(linked({labels: ["dubakwi-other"]})), "state_error"],
  ["other owner", saveInput(), issue(linked({labels: [labelFor("dubakwi-team", "citizen-b", "req-1")]})), "state_error"],
  ["other scope", saveInput(), issue(linked({labels: [labelFor("other-scope", "citizen-a", "req-1")]})), "state_error"],
  ["other case", saveInput(), issue(linked({description: "case_id: case-other\nfirst_request_id: req-1"})), "state_error"],
  ["no description", saveInput(), issue(linked({description: ""})), "state_error"],
  ["other key", saveInput(), {statusCode: 200, body: {key: "JBYS-99", fields: linked()}}, "state_error"],
  ["version given", saveInput({expected_case_version: 5}), issue(linked()), "invalid_state_request"],
]) {
  r = run(input, jira);
  expect(r.result.ok === false && r.result.error_code === code && (r.result.state_ref?.state_revision === 3 || r.result.error_code === "invalid_state_request"), `${name} must fail closed`, r.result);
  expect(!r.calls.some((c) => c.sql), `${name} must not call SQL`, r.calls);
  expect(r.result.recovery.action === "finish", `${name} recovery`, r.result.recovery);
}

// 3. 계약 오류는 Jira·SQL 호출 없이 거절(기존 동작 유지)
r = run(saveInput({ticket_id: ""}), issue(linked()));
expect(r.result.ok === false && r.result.error_code === "invalid_state_request" && r.calls.length === 0, "invalid save", r);

// 4. save가 아닌 명령은 Jira를 거치지 않는다
r = run({op: "prepare", state_ref: stateRef(1), args: {current_step: "H05"}}, undefined);
expect(r.calls.length === 1 && r.calls[0].sql === "prepare", "prepare must skip Jira", r.calls);

// 5. Final facts differ: write phase=save, read back, then finish. Lost write ACK is not an automatic retry.
const previousFacts={...saveInput().facts,summary:'initial context'};
for(const writeUnknown of [false,true]){
  r=run(saveInput(),issue(linked()),{previousFacts,writeUnknown});
  expect(r.result.ok===true,'amendment must finish only after readback',r);
  expect(r.calls.filter(c=>c.jira?.endsWith('/comment')).length===1,'one conditional amendment write',r.calls);
  expect(r.calls[r.calls.length-1].sql==='finish','finish after amendment verification',r.calls);
}
r=run(saveInput(),issue(linked()),{previousFacts,dropWrite:true});
expect(r.result.ok===false&&!r.calls.some(c=>c.sql),'lost or missing amendment must not finish',r);
r=run(saveInput(),issue(linked()),{badAuthor:true});
expect(r.result.ok===false&&!r.calls.some(c=>c.sql),'untrusted service comment must not finish',r);
r=run(saveInput({deadline_at:new Date(Date.now()-1000).toISOString()}),issue(linked()));
expect(r.result.ok===false&&r.calls.length===0,'expired save must not start HTTP or SQL',r);
console.log("P12 state save with Jira verification and final amendment: all checks passed");
