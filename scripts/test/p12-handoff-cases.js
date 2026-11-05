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
for (const nodeName of ["H14 Jira 전 상태 저장", "H17 티켓 연결 저장", "H19 알림 의도 저장"]) {
  if (nodes.get(nodeName)?.parameters.workflowId?.value !== "dubakwiState01") {
    throw new Error(`${nodeName} does not pin dubakwiState01`);
  }
}
// 허용하는 HTTP: 사용자 API 본인 기록 조회, 과정 알림 API, Jira(변수 기반 주소 + n8n Jira Credential)뿐이다.
for (const node of workflow.nodes.filter((n) => n.type === "n8n-nodes-base.httpRequest")) {
  const url = String(node.parameters.url ?? "");
  const isUserApi = node.name === "H04 본인 기록 조회" && url.startsWith("=http://dubakwi-user-api:8801/records/");
  const isAlert = node.name === "H11 담당 알림" && node.parameters.url === "={{ $json.req.url }}";
  const isJira = url === "={{ '__JIRA_BASE_URL__' + $json.req.path }}" &&
    node.parameters.nodeCredentialType === "jiraSoftwareCloudApi" &&
    node.credentials?.jiraSoftwareCloudApi?.name === "dubakwi-Jira SW Cloud account";
  if (!isUserApi && !isAlert && !isJira) throw new Error(`unexpected HTTP node: ${node.name}`);
}
if (JSON.stringify(workflow).includes("atlassian.net")) throw new Error("Jira domain must not be written in the workflow");

if (nodes.get("H04 본인 기록 조회").retryOnFail) throw new Error("lookup must try once to fit the caller timeout");
// 본인/타인 조회: H02 → H21 → H04 → H22 → H13 연결과 결과 판정.
const lookupRoute = execute({body: {
  kind: "lookup", request_id: "req-4", enabled: true, actor_id: "citizen-a", target_ticket_id: "T-1001",
}})[0].json;
if (lookupRoute.route !== "lookup" || lookupRoute.request.target_ticket_id !== "T-1001") {
  throw new Error(`enabled lookup was not routed: ${JSON.stringify(lookupRoute)}`);
}
const noTarget = execute({body: {
  kind: "lookup", request_id: "req-5", enabled: true, actor_id: "citizen-a", target_ticket_id: null,
}})[0].json;
if (noTarget.http_status !== 400 || noTarget.body.error_code !== "invalid_tool_request") {
  throw new Error(`lookup without target was not rejected: ${JSON.stringify(noTarget)}`);
}
const lookupJson = {request: {request_id: "req-4", actor_id: "citizen-a", target_ticket_id: "T-1001"}};
const normalize = (raw) => new Function("$json", "$", nodes.get("H22 조회 결과 정규화").parameters.jsCode)(
  raw, () => ({item: {json: lookupJson}}),
)[0].json.body;
const okBody = normalize({statusCode: 200, body: {
  ticket_id: "T-1001", owner_id: "citizen-a", status: "open", summary: "x",
  contact: {phone: "***-****-1234", email: "a***@example.com"},
}});
if (okBody.status !== "ok" || okBody.masked !== 2 || okBody.record.masked_phone !== "***-****-1234" || "summary" in okBody.record) {
  throw new Error(`own record was not returned masked: ${JSON.stringify(okBody)}`);
}
for (const code of [403, 404]) {
  const denied = normalize({statusCode: code, body: {error: "x"}});
  if (denied.status !== "denied" || denied.record !== null || denied.masked !== 0 || denied.error_code !== null) {
    throw new Error(`${code} was not an empty denied: ${JSON.stringify(denied)}`);
  }
}
const otherOwner = normalize({statusCode: 200, body: {ticket_id: "T-1001", owner_id: "citizen-b", status: "open", contact: {phone: "010-1111-2222"}}});
if (otherOwner.status !== "denied" || otherOwner.record !== null) {
  throw new Error(`other owner's record leaked: ${JSON.stringify(otherOwner)}`);
}
for (const raw of [{statusCode: 401, body: {}}, {statusCode: 503, body: {}}, {error: "timeout"}]) {
  const failed = normalize(raw);
  if (failed.status !== "error" || failed.record !== null || failed.error_code !== "lookup_error") {
    throw new Error(`lookup failure was not an error: ${JSON.stringify(failed)}`);
  }
}
const edges = workflow.connections;
const next = (from, branch = 0) => edges[from].main[branch].map((edge) => edge.node);
if (next("H03 저장 준비 필요", 1)[0] !== "H21 조회 실행 여부" || next("H21 조회 실행 여부")[0] !== "H04 본인 기록 조회" ||
    next("H04 본인 기록 조회")[0] !== "H22 조회 결과 정규화" || next("H22 조회 결과 정규화")[0] !== "H13 도구 응답" ||
    next("H21 조회 실행 여부", 1)[0] !== "H13 도구 응답") {
  throw new Error("lookup branch is not wired H03→H21→H04→H22→H13");
}

console.log("P12 handoff state gate and lookup: all checks passed");
