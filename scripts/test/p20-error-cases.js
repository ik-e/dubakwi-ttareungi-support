const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const workflow = JSON.parse(
  fs.readFileSync(path.join(root, "workflows", "dubakwi-errors.json"), "utf8"),
);
const codeNode = workflow.nodes.find((node) => node.name === "E02 오류 가림과 안전 차단");
if (!codeNode) {
  throw new Error("E02 code node not found");
}

const execute = new Function("$json", "$env", codeNode.parameters.jsCode);
const secretMarkers = ["super-secret", "Bearer private-token", "db.internal", "stack-private"];
const result = execute({
  execution: {
    id: "execution-1",
    lastNodeExecuted: "H06 Jira 생성",
    error: {
      message: "https://db.internal super-secret",
      stack: "stack-private",
      credential: "Bearer private-token",
    },
  },
  workflow: {id: "workflow-1", name: "support"},
}, {DUBAKWI_SCOPE: "dubakwi-team"})[0].json;

const serialized = JSON.stringify(result);
for (const marker of secretMarkers) {
  if (serialized.includes(marker)) {
    throw new Error(`private error detail leaked: ${marker}`);
  }
}

if (
  result.error_code !== "workflow_runtime_error" ||
  result.effect !== "unknown" ||
  result.effect_plan !== "dlq_alert" ||
  result.known_ticket_id !== null ||
  result.storage_ready !== true ||
  result.op !== "fail" ||
  result.args.status !== "unknown"
) {
  throw new Error(`unexpected safe error envelope: ${serialized}`);
}

const missingReference = execute(
  {execution: {error: {message: "super-secret"}}},
  {DUBAKWI_SCOPE: "dubakwi-team"},
)[0].json;
if (
  missingReference.effect !== "none" ||
  missingReference.effect_plan !== "none" ||
  missingReference.storage_ready !== false
) {
  throw new Error(`missing references must block recovery: ${JSON.stringify(missingReference)}`);
}

const missingScope = execute({
  execution: {id: "execution-2", lastNodeExecuted: "B14"},
  workflow: {id: "workflow-1"},
}, {})[0].json;
if (missingScope.storage_ready !== false || missingScope.scope !== null) {
  throw new Error(`missing scope must block storage: ${JSON.stringify(missingScope)}`);
}

const nodes = new Map(workflow.nodes.map((node) => [node.name, node]));
if (workflow.id !== "dubakwiErrors01") {
  throw new Error(`unexpected workflow id: ${workflow.id}`);
}
if (nodes.get("E05 중단 요청 상태 확인")?.parameters.workflowId?.value !== "dubakwiState01") {
  throw new Error("state workflow id is not pinned");
}
if (nodes.get("E05 중단 요청 상태 확인")?.onError !== "continueRegularOutput") {
  throw new Error("state failure must continue to the DLQ path");
}
if (nodes.get("E04 오류 보관")?.parameters.workflowId?.value !== "dubakwiDlq0001") {
  throw new Error("DLQ workflow id is not pinned");
}
if (!nodes.has("E03 저장 설정 확인") || !nodes.has("E07 설정 미완료 안전 종료")) {
  throw new Error("fail-closed configuration branch is missing");
}

const dlqCode = nodes.get("E06 DLQ 요청 구성")?.parameters.jsCode;
if (typeof dlqCode !== "string") {
  throw new Error("DLQ request builder is missing");
}
const buildDlq = new Function("$", "$json", dlqCode);
// state 하위 실행이 throw한 뒤 continueRegularOutput으로 전달되는 오류 항목을 주입한다.
// DLQ 요청은 이 항목의 원문이 아니라 E02에서 가린 원 문맥만 사용해야 한다.
const injectedStateFailure = {
  error: "state backend unavailable: postgres://private-host super-secret",
  stack: "stack-private",
};
const dlqRequest = buildDlq(
  () => ({item: {json: result}}),
  injectedStateFailure,
)[0].json;
const expectedDlqKeys = [
  "attempts", "case_id", "effects", "error_code", "failed_step", "jira_issue_id",
  "jira_issue_key", "last_execution_id", "op", "recovery", "request_id", "scope", "summary",
].sort();
if (JSON.stringify(Object.keys(dlqRequest).sort()) !== JSON.stringify(expectedDlqKeys)) {
  throw new Error(`unexpected DLQ keys: ${JSON.stringify(Object.keys(dlqRequest))}`);
}
if (
  dlqRequest.op !== "put" ||
  dlqRequest.scope !== "dubakwi-team" ||
  dlqRequest.last_execution_id !== "execution-1" ||
  dlqRequest.recovery.mode !== "manual_required"
) {
  throw new Error(`unexpected DLQ request: ${JSON.stringify(dlqRequest)}`);
}
const serializedDlq = JSON.stringify(dlqRequest);
for (const marker of ["private-host", "super-secret", "stack-private"]) {
  if (serializedDlq.includes(marker)) {
    throw new Error(`state failure detail leaked to DLQ: ${marker}`);
  }
}

const stateConnections = workflow.connections["E05 중단 요청 상태 확인"]?.main?.[0] ?? [];
if (!stateConnections.some((edge) => edge.node === "E06 DLQ 요청 구성")) {
  throw new Error("state failure continuation is not connected to the DLQ builder");
}

console.log("P20 error redaction/routing and state-failure injection: 12/12 passed");
