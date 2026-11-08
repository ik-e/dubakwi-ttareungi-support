#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/dubakwi-dlq-lookup.json'), 'utf8'));
const byName = (name) => workflow.nodes.find((node) => node.name === name);
const check = (condition, label) => { if (!condition) throw new Error(label); };
const run = (name, input, extra = {}) => new Function('$json', '$', byName(name).parameters.jsCode)(input, (nodeName) => ({item: extra.item ?? {json:{payload:{op:'inspect'}}}})).json;

check(workflow.active === false, 'lookup workflow must import inactive');
check(workflow.nodes.every((node) => node.type !== 'n8n-nodes-base.webhook'), 'lookup workflow must have no public webhook');
check(byName('D05 읽기 전용 DLQ 조회').parameters.query.includes('recovery_lookup($1::jsonb)'), 'lookup must remain parameterized');
check(byName('D05 읽기 전용 DLQ 조회').credentials.postgres.name === 'dubakwi-dlq-reader', 'lookup must use its dedicated read-only credential');
check(byName('D08 Jira 현재 상태 조회').parameters.method === 'GET', 'Jira lookup must be GET only');
check(byName('D08 Jira 현재 상태 조회').parameters.url.includes('fields=status,assignee'), 'Jira response fields must be limited');
check(byName('D08 Jira 현재 상태 조회').credentials.jiraSoftwareCloudApi.name === 'dubakwi-Jira SW Cloud account', 'reuse existing Jira credential');
check(workflow.nodes.every((node) => ['n8n-nodes-base.manualTrigger','n8n-nodes-base.set','n8n-nodes-base.code','n8n-nodes-base.if','n8n-nodes-base.postgres','n8n-nodes-base.httpRequest'].includes(node.type)), 'workflow uses only manual/read-only orchestration nodes');
check(workflow.nodes.filter((node) => node.type === 'n8n-nodes-base.httpRequest').every((node) => node.parameters.method === 'GET'), 'all HTTP calls must be GET');
check(byName('D05 읽기 전용 DLQ 조회').parameters.query.trim().startsWith('SELECT '), 'database call must be a SELECT lookup');

const valid = run('D03 입력 검증', {payload: JSON.stringify({op:'inspect', scope:'scope-a', dlq_id:'dlq-a', operator_id:'operator-a'})});
check(valid.valid, 'valid inspect input accepted');
check(run('D03 입력 검증', {payload: JSON.stringify({op:'list', scope:'scope-a', limit:20, offset:0})}).valid, 'valid bounded list input accepted');
for (const payload of [
  {op:'claim', scope:'scope-a', dlq_id:'dlq-a', operator_id:'operator-a'},
  {op:'inspect', scope:'scope-a', dlq_id:'dlq-a', operator_id:'operator-a', extra:'x'},
  {op:'inspect', scope:'scope-a', dlq_id:'', operator_id:'operator-a'},
  {op:'list', scope:'scope-a', limit:51},
  {op:'list', scope:'scope-a', offset:-1},
]) check(!run('D03 입력 검증', {payload: JSON.stringify(payload)}).valid, 'mutating, extra, or incomplete input rejected');
check(!run('D03 입력 검증', {payload:'{broken'}).valid, 'malformed JSON rejected');

const inspect = run('D06 inspect 결과 정리', {result:{ok:true, dlq:{dlq_id:'dlq-a', case_id:'case-a', failed_step:'H05', error_code:'jira_timeout', replay_status:'pending', revision:4, last_execution_id:'exec-a', jira_issue_id:'10042', jira_issue_key:'JBYS-42', recovery:{args:{secret:'omit'}}}, state:{processing_status:'failed', revision:8, owner_id:'private-owner', response:{answer:'private answer'}}}});
check(inspect.ok && inspect.dlq.jira_issue_key === 'JBYS-42' && inspect.jira_lookup.status === 'pending', 'linked DLQ prepared for read-only Jira lookup');
check(!Object.hasOwn(inspect, 'state') && !JSON.stringify(inspect).includes('private answer') && !JSON.stringify(inspect).includes('private-owner'), 'private state payload and owner omitted');
const list = run('D06 inspect 결과 정리', {result:{ok:true, scope:'scope-a', limit:20, offset:0, has_more:false, items:[{dlq_id:'dlq-a', request_id:'request-a', case_id:'case-a', jira_issue_key:'JBYS-42', replay_status:'pending', failed_step:'H05', error_code:'jira_timeout', revision:4, recovery:{args:{secret:'omit'}}}]}}, {item:{json:{payload:{op:'list'}}}});
check(list.ok && list.operation === 'list' && list.items.length === 1 && list.items[0].jira_issue_key === 'JBYS-42', 'bounded DLQ list normalized');
check(!JSON.stringify(list).includes('secret'), 'list omits private recovery capsule');
const withoutLink = run('D06 inspect 결과 정리', {result:{ok:true, dlq:{dlq_id:'dlq-b', case_id:'case-b', failed_step:'H05', error_code:'jira_timeout', replay_status:'pending', revision:1, last_execution_id:'exec-b', jira_issue_key:null}, state:{processing_status:'failed', revision:2}}});
check(withoutLink.ok && withoutLink.jira_lookup.status === 'not_linked', 'unlinked DLQ does not invoke Jira');
const malformedKey = run('D06 inspect 결과 정리', {result:{ok:true, dlq:{dlq_id:'dlq-c', case_id:'case-c', jira_issue_key:'https://invalid'}, state:{}}});
check(malformedKey.jira_lookup.status === 'not_linked', 'untrusted Jira key is not used');

const normalized = run('D09 Jira 조회 결과 정리', {statusCode:200, body:{key:'JBYS-42', fields:{status:{id:'3',name:'In Progress'}, assignee:{displayName:'Agent A', emailAddress:'private@example.invalid'}, summary:'private summary'}}}, {item:{json:inspect}});
check(normalized.jira_lookup.status === 'found' && normalized.jira_lookup.issue_status.name === 'In Progress', 'Jira status normalized');
check(normalized.jira_lookup.assignee.display_name === 'Agent A' && !JSON.stringify(normalized).includes('private@example.invalid') && !JSON.stringify(normalized).includes('private summary'), 'only assignee display name retained');
const notFound = run('D09 Jira 조회 결과 정리', {statusCode:404, body:{message:'private detail'}}, {item:{json:inspect}});
check(notFound.jira_lookup.status === 'not_found' && !JSON.stringify(notFound).includes('private detail'), 'Jira 404 is safely normalized');

const sql = fs.readFileSync(path.join(root, 'infra/db/migrations/017-operator-dlq-list.sql'), 'utf8');
check(sql.includes('SECURITY DEFINER') && sql.includes("replay_status IN ('pending', 'reprocessing')"), 'list is bounded to unresolved items under definer boundary');
check(sql.includes('CREATE ROLE dubakwi_dlq_reader') && sql.includes('NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT'), 'read-only role is nonprivileged and NOLOGIN');
check(sql.includes('REVOKE ALL ON FUNCTION dubakwi_service.recovery_lookup(jsonb) FROM PUBLIC') && sql.includes('TO dubakwi_dlq_reader'), 'read-only dispatcher is granted to reader role only');
check(/WHEN 'list'[\s\S]*WHEN 'inspect'[\s\S]*ELSE\s+RETURN jsonb_build_object\('ok', false, 'error_code', 'invalid_dlq_lookup_request'\)/.test(sql), 'dispatcher exposes only list and inspect');
const lookupFunction = sql.slice(sql.indexOf('CREATE FUNCTION dubakwi_service.recovery_lookup'));
check(lookupFunction.includes('recovery_finish(payload)') && !['owner_id','response','recovery','effects'].some((field) => lookupFunction.includes(`'${field}'`)), 'inspect output is sanitized before n8n receives it');
check(sql.includes('limit_value > 50') && sql.includes('offset_value > 10000'), 'list pagination has hard bounds');

console.log('TC-07 read-only DLQ/Jira lookup workflow contract: 33 checks passed');
