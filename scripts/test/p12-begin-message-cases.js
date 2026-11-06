// begin의 409 응답 문구가 코드별 확정 문구로 바뀌는지 확인한다(가짜 SQL 결과로 S05만 실행).
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(fs.readFileSync(path.join(root, "workflows", "dubakwi-state.json"), "utf8"));
const code = workflow.nodes.find((node) => node.name.startsWith("S05")).parameters.jsCode;
const run = (op, result) => new Function("$json", "$", code)({result: JSON.stringify(result)}, () => ({item: {json: {op, request: {request_id: "req-1"}}}}))[0].json;
const pending = (codeName, error) => ({request_id: "req-1", mode: "pending", state_ref: null, support: null, facts: null, response: {error, codes: [codeName]}, http_status: 409, error_code: codeName});
const expectText = (actual, expected, label) => {
  if (actual.response.error !== expected || actual.http_status !== 409 || actual.error_code !== actual.response.codes[0]) throw new Error(`${label}: ${JSON.stringify(actual)}`);
};

expectText(run("begin", pending("request_in_progress", "기존 요청을 먼저 확인해야 합니다.")), "같은 요청을 처리하고 있습니다. 잠시 뒤 결과를 확인하거나 새 문의로 다시 보내 주세요.", "in progress");
expectText(run("begin", pending("request_requires_review", "기존 요청을 먼저 확인해야 합니다.")), "이 요청은 처리 중 문제가 있어 자동으로 다시 처리하지 않습니다. 새 문의로 다시 보내 주세요.", "requires review");
expectText(run("begin", {...pending("request_conflict", "x"), mode: "conflict"}), "같은 요청 번호로 다른 내용이 들어왔습니다. 새 문의로 다시 보내 주세요.", "conflict");
// 다른 코드·다른 명령은 건드리지 않는다.
const busy = run("begin", pending("case_busy", "기존 요청을 먼저 확인해야 합니다."));
if (busy.response.error !== "기존 요청을 먼저 확인해야 합니다.") throw new Error("case_busy text must be unchanged");
const prepare = run("prepare", {request_id: "req-1", ok: true, skipped: false, state_ref: null, error_code: null});
if (prepare.response !== undefined) throw new Error("non-begin results must be unchanged");
for (const text of [pending("request_in_progress", "x"), pending("request_requires_review", "x")].map((r) => run("begin", r).response.error)) {
  if (/접수|완료|복구되/.test(text)) throw new Error(`citizen text must not promise intake, completion or recovery: ${text}`);
}
console.log("P12 begin 409 citizen messages: all checks passed");
