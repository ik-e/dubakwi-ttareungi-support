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
if (nodes.get("E04 오류 보관")?.onError !== "continueRegularOutput") {
  throw new Error("DLQ failure must terminate safely without throwing recursively");
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

const safeEndCode = nodes.get("E08 오류 경로 안전 종료")?.parameters.jsCode;
if (typeof safeEndCode !== "string") throw new Error("safe error-path terminator is missing");
const safeEnd = new Function("$", "$json", safeEndCode);
const bothFailed = safeEnd(() => ({item: {json: result},first:()=>({json:result})}), {
  error: "DLQ postgres://private-host super-secret",
})[0].json;
if (bothFailed.error_code !== "error_storage_failed" || bothFailed.execution_id !== "execution-1") {
  throw new Error(`state/DLQ double failure was not terminated safely: ${JSON.stringify(bothFailed)}`);
}
if (JSON.stringify(bothFailed).includes("private-host") || JSON.stringify(bothFailed).includes("super-secret")) {
  throw new Error("DLQ failure detail leaked from the safe terminator");
}
const dlqConnections = workflow.connections["E04 오류 보관"]?.main?.[0] ?? [];
if (!dlqConnections.some((edge) => edge.node === "E09 운영 실패 알림")) {
  throw new Error("DLQ failure is not connected to the safe terminator");
}


// n8n 기본 설정에서는 $env를 읽는 순간 예외가 난다. E02는 멈추지 않고 안전하게 처리해야 한다.
const blockedEnv = new Proxy({}, {get() { throw new Error("access to env vars denied"); }});
const sample = {execution: {id: "execution-3", error: {message: "boom", node: {name: "B14"}}}, workflow: {id: "wf-1", name: "support"}};
const blocked = execute(sample, blockedEnv)[0].json;
if (blocked.storage_ready !== false) throw new Error(`blocked env must block storage safely: ${JSON.stringify(blocked)}`);
// 가져올 때 치환한 scope는 env가 막혀 있어도 쓸 수 있다.
const assignment = /(const importedScope = ')__DUBAKWI_SCOPE__(';)/;
const importedCode = codeNode.parameters.jsCode.replace(assignment, "$1dubakwi-dev$2");
const imported = new Function("$json", "$env", importedCode)(sample, blockedEnv)[0].json;
if (imported.storage_ready !== true || imported.scope !== "dubakwi-dev") throw new Error(`imported scope must be used when env is blocked: ${JSON.stringify(imported)}`);

// 전체 문자열 치환은 비교식까지 바꿔 저장이 항상 막힌다(대입문만 치환해야 한다).
const globalReplaced = codeNode.parameters.jsCode.split("__DUBAKWI_SCOPE__").join("dubakwi-dev");
const blockedByGlobal = new Function("$json", "$env", globalReplaced)(sample, blockedEnv)[0].json;
if (blockedByGlobal.storage_ready !== false) throw new Error("global replacement must keep storage blocked");
const alertNode=nodes.get("E09 운영 실패 알림");
if(alertNode.retryOnFail || alertNode.onError!=="continueRegularOutput" || alertNode.parameters.url!=="http://data-api:8800/alerts")throw new Error("operational alert must use the existing bounded backend without automatic retry");
for(const statusCode of [200,400,500,0]){
 const end=safeEnd(name=>({first:()=>({json:name.startsWith("E02")?result:{ok:true,dlq_id:"synthetic-dlq"}})}),{statusCode,error:"super-secret"})[0].json;
 const expected=statusCode===200?'confirmed':statusCode===400?'failed':'unknown';
 if(end.operational_alert.status!==expected||end.dlq_id!=="synthetic-dlq"||JSON.stringify(end).includes('super-secret'))throw new Error('operational alert result not safely distinguished');
}
if(workflow.settings?.errorWorkflow===workflow.id)throw new Error('recursive error workflow');
console.log("P20 state/DLQ safety 16 cases plus operational-alert acknowledgement checks passed");
