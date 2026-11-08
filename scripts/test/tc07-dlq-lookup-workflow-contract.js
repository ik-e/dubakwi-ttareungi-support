#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/dubakwi-recovery-operator.json'), 'utf8'));
const byName = (name) => workflow.nodes.find((node) => node.name === name);
let checkCount = 0;
const check = (condition, label) => { checkCount += 1; if (!condition) throw new Error(label); };
const run = (name, input, refs = {}) => new Function('$json', '$', byName(name).parameters.jsCode)(
  input,
  (nodeName) => ({ item: { json: refs[nodeName] ?? { payload: { op: 'inspect' } } } }),
).json;

check(workflow.name === 'dubakwi-recovery-operator' && workflow.active === false, 'lookup must extend the existing inactive operator workflow');
check(workflow.nodes.every((node) => node.type !== 'n8n-nodes-base.webhook'), 'operator lookup must not add a public webhook');
check(workflow.nodes.some((node) => node.name === 'R04 제한 복구 함수 호출'), 'existing controlled recovery path must remain present');
check(byName('R03a 조회 전용 분기').type === 'n8n-nodes-base.if', 'lookup must branch away from recovery actions');
check(byName('R05 DLQ 읽기 전용 조회').parameters.query.includes('recovery_lookup($1::jsonb)'), 'lookup must remain parameterized');
check(byName('R05 DLQ 읽기 전용 조회').credentials.postgres.name === 'dubakwi-recovery-operator', 'reuse existing operator database credential');
check(byName('R08 Jira 상태·담당 조회').parameters.method === 'GET', 'Jira lookup must be GET only');
check(byName('R08 Jira 상태·담당 조회').parameters.url.includes('dubakwi-ttareungi-support.atlassian.net') && byName('R08 Jira 상태·담당 조회').parameters.url.includes('fields=status,assignee'), 'lookup must target existing Dubakwi project and limited fields');
check(byName('R08 Jira 상태·담당 조회').credentials.jiraSoftwareCloudApi.name === 'dubakwi-Jira SW Cloud account', 'reuse the existing Dubakwi Jira credential');
check(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.httpRequest').every((node) => node.parameters.method === 'GET'), 'all HTTP calls in operator lookup must be GET');
check(byName('R05 DLQ 읽기 전용 조회').parameters.query.trim().startsWith('SELECT '), 'database lookup must be SELECT through the dispatcher');

const inspectPayload = { op: 'inspect', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a' };
check(run('R02 복구 입력 검증', { payload: JSON.stringify(inspectPayload) }).valid, 'valid inspect input accepted');
const listPayload = { op: 'list', scope: 'scope-a', limit: 20, offset: 0 };
const listValidation = run('R02 복구 입력 검증', { payload: JSON.stringify(listPayload) });
check(listValidation.valid && listValidation.lookup, 'bounded list routes to lookup');
const inspectValidation = run('R02 복구 입력 검증', { payload: JSON.stringify(inspectPayload) });
check(inspectValidation.valid && inspectValidation.lookup, 'inspect routes to lookup');
for (const payload of [
  { op: 'claim', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a' },
  { op: 'inspect', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a', extra: 'x' },
  { op: 'inspect', scope: 'scope-a', dlq_id: '', operator_id: 'operator-a' },
  { op: 'list', scope: 'scope-a', limit: 51 },
  { op: 'list', scope: 'scope-a', offset: -1 },
  { op: 'list', scope: 'scope-a', recovery: true },
]) check(!run('R02 복구 입력 검증', { payload: JSON.stringify(payload) }).valid, 'mutating, extra, or incomplete input rejected');
check(!run('R02 복구 입력 검증', { payload: '{broken' }).valid, 'malformed JSON rejected');
check(run('R02 복구 입력 검증', { payload: JSON.stringify({ op: 'claim', scope: 's', dlq_id: 'd', operator_id: 'o', owner_id: 'o', input_hash: 'a'.repeat(64), expected_dlq_revision: 0, expected_state_revision: 0, original_execution_id: 'e1', recovery_execution_id: 'e2', verification: 'recovery_conditions_confirmed' }) }).valid, 'existing recovery validation remains intact');

const inspectRaw = { ok: true, dlq: { dlq_id: 'dlq-a', scope: 'scope-a', request_id: 'req-a', case_id: 'case-a', failed_step: 'H05', error_code: 'jira_timeout', replay_status: 'pending', revision: 4, last_execution_id: 'exec-a', jira_issue_id: '10042', jira_issue_key: 'JBYS-42', recovery: { args: { secret: 'omit' } } }, state: { processing_status: 'failed', jira_issue_key: 'JBYS-42', revision: 8, owner_id: 'private-owner', response: { answer: 'private answer' } } };
const inspect = run('R06 조회 결과 정리', { result: inspectRaw }, { 'R02 복구 입력 검증': { payload: inspectPayload } });
check(inspect.ok && inspect.dlq.jira_issue_key === 'JBYS-42' && inspect.jira_lookup.status === 'pending', 'linked DLQ prepared for Jira lookup');
check(inspect.state.processing_status === 'failed' && !JSON.stringify(inspect).includes('private answer') && !JSON.stringify(inspect).includes('private-owner'), 'only safe state metadata returned');
const list = run('R06 조회 결과 정리', { result: { ok: true, scope: 'scope-a', limit: 20, offset: 0, has_more: false, items: [{ dlq_id: 'dlq-a', request_id: 'request-a', case_id: 'case-a', jira_issue_id: '10042', jira_issue_key: 'JBYS-42', replay_status: 'pending', failed_step: 'H05', error_code: 'jira_timeout', revision: 4, recovery: { args: { secret: 'omit' } } }] } }, { 'R02 복구 입력 검증': { payload: { op: 'list', scope: 'scope-a' } } });
check(list.ok && list.operation === 'list' && list.items.length === 1 && list.items[0].jira_issue_key === 'JBYS-42', 'bounded DLQ list normalized');
check(!JSON.stringify(list).includes('secret'), 'list omits private recovery capsule');
const noLink = run('R06 조회 결과 정리', { result: { ok: true, dlq: { dlq_id: 'dlq-b', scope: 'scope-a', case_id: 'case-b', replay_status: 'pending', jira_issue_key: null }, state: { processing_status: 'failed', revision: 2 } } }, { 'R02 복구 입력 검증': { payload: inspectPayload } });
check(noLink.ok && noLink.jira_lookup.status === 'not_linked', 'unlinked DLQ does not invoke Jira');
const malformedKey = run('R06 조회 결과 정리', { result: { ok: true, dlq: { dlq_id: 'dlq-c', scope: 'scope-a', jira_issue_key: 'https://invalid' }, state: {} } }, { 'R02 복구 입력 검증': { payload: inspectPayload } });
check(malformedKey.jira_lookup.status === 'not_linked', 'untrusted Jira key is not used');

const jira = run('R09 Jira 결과 정리', { statusCode: 200, body: { key: 'JBYS-42', fields: { status: { id: '3', name: 'In Progress' }, assignee: { displayName: 'Agent A', emailAddress: 'private@example.invalid' }, summary: 'private summary' } } }, { 'R06 조회 결과 정리': inspect });
check(jira.jira_lookup.status === 'found' && jira.jira_lookup.issue_status.name === 'In Progress', 'Jira status normalized');
check(jira.jira_lookup.assignee.display_name === 'Agent A' && !JSON.stringify(jira).includes('private@example.invalid') && !JSON.stringify(jira).includes('private summary'), 'only assignee display name retained');
const notFound = run('R09 Jira 결과 정리', { statusCode: 404, body: { message: 'private detail' } }, { 'R06 조회 결과 정리': inspect });
check(notFound.jira_lookup.status === 'not_found' && !JSON.stringify(notFound).includes('private detail'), 'Jira 404 safely normalized');

const sql = fs.readFileSync(path.join(root, 'infra/db/migrations/017-operator-dlq-list.sql'), 'utf8');
check(sql.includes('SECURITY DEFINER') && sql.includes("replay_status IN ('pending', 'reprocessing')"), 'list is bounded to unresolved items under definer boundary');
check(!sql.includes('CREATE ROLE dubakwi_dlq_reader') && sql.includes('TO dubakwi_recovery_operator'), 'use the existing operator role without new DB login');
check(sql.includes('REVOKE ALL ON FUNCTION dubakwi_service.recovery_lookup(jsonb) FROM PUBLIC') && sql.includes('TO dubakwi_recovery_operator'), 'lookup dispatcher is granted to existing operator role');
check(/WHEN 'list'[\s\S]*WHEN 'inspect'[\s\S]*ELSE\s+RETURN jsonb_build_object\('ok', false, 'error_code', 'invalid_dlq_lookup_request'\)/.test(sql), 'dispatcher exposes only list and inspect');
const lookupFunction = sql.slice(sql.indexOf('CREATE FUNCTION dubakwi_service.recovery_lookup'));
check(lookupFunction.includes('recovery_finish(payload)') && !['owner_id', 'response', 'recovery', 'effects'].some((field) => lookupFunction.includes(`'${field}'`)), 'inspect output sanitized before n8n receives it');
check(sql.includes('limit_value > 50') && sql.includes('offset_value > 10000'), 'list pagination has hard bounds');

console.log(`TC-07 existing operator DLQ/Jira lookup workflow contract: ${checkCount} checks passed`);
