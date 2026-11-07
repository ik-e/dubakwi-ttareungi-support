#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const file = path.join(root, 'workflows/dubakwi-recovery-operator.json');
const workflow = JSON.parse(fs.readFileSync(file, 'utf8'));
const code = workflow.nodes.find((node) => node.name === 'R02 복구 입력 검증').parameters.jsCode;
const run = (payload) => {
  return new Function('$json', code)({ payload: JSON.stringify(payload) }).json;
};
const check = (condition, label) => { if (!condition) throw new Error(label); };

check(workflow.active === false, 'operator workflow must import inactive');
check(workflow.nodes.every((node) => node.type !== 'n8n-nodes-base.webhook'), 'operator workflow must not expose a webhook');
const input = workflow.nodes.find((node) => node.name === 'R01a 복구 명령 입력');
check(input?.parameters.assignments.assignments.some((field) => field.name === 'payload'), 'manual input field must exist');
check(workflow.connections['R01 수동 운영자 시작'].main[0][0].node === 'R01a 복구 명령 입력', 'manual trigger must reach editable input field');
const pg = workflow.nodes.find((node) => node.name === 'R04 제한 복구 함수 호출');
check(pg.parameters.query.includes('recovery_control($1::jsonb)'), 'database call must remain parameterized and routed');
check(pg.credentials.postgres.name === 'dubakwi-recovery-operator', 'must use dedicated operator credential');
check(!Object.hasOwn(pg.credentials.postgres, 'id'), 'environment credential ID must not be committed');

const inspect = run({ op: 'inspect', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a' });
check(inspect.valid && inspect.payload.op === 'inspect', 'valid inspect request');
const finish = run({ op: 'finish', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  expected_dlq_revision: 3, expected_state_revision: 7, original_execution_id: 'exec-old',
  recovery_execution_id: 'exec-recovery-1', verification: 'jira_effects_confirmed' });
check(finish.valid && finish.payload.op === 'finish', 'valid finish request');
const claim = run({ op: 'claim', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  owner_id: 'owner-a', input_hash: 'a'.repeat(64), expected_dlq_revision: 3,
  expected_state_revision: 7, original_execution_id: 'exec-old', recovery_execution_id: 'exec-recovery-2',
  verification: 'recovery_conditions_confirmed' });
check(claim.valid && claim.payload.op === 'claim', 'valid claim request');
check(run({ ...claim.payload, verification: 'recovery_unknown_effect_checked_absent' }).valid,
  'claim may reconcile unknown target as absent only with explicit external verification');
check(run({ ...claim.payload, verification: 'recovery_unknown_effect_checked_present' }).valid,
  'claim may adopt an already applied unknown target only with explicit external verification');
const release = run({ op: 'release', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  owner_id: 'owner-a', input_hash: 'a'.repeat(64), expected_dlq_revision: 4,
  expected_state_revision: 7, original_execution_id: 'exec-old', recovery_execution_id: 'exec-recovery-2',
  reason: 'synthetic recovery could not proceed', verification: 'recovery_execution_ended_and_effects_rechecked', target_effect_status: 'failed' });
check(release.valid && release.payload.op === 'release', 'valid release request');
check(run({ ...release.payload, target_effect_status: 'unknown' }).valid,
  'release records an unresolved target effect after a retry timeout');
check(run({ ...release.payload, target_effect_status: 'confirmed' }).valid,
  'release may record an effect verified as already applied');
check(!run({ ...release.payload, target_effect_status: 'maybe' }).valid,
  'release rejects an unrecognized effect status');
const { target_effect_status: _missingTargetEffectStatus, ...releaseWithoutEffectStatus } = release.payload;
check(!run(releaseWithoutEffectStatus).valid,
  'release requires an explicit target effect status');
const { verification: _missingReleaseVerification, ...releaseWithoutVerification } = release.payload;
check(!run(releaseWithoutVerification).valid,
  'release requires an execution-ended and effect-rechecked attestation');
const resume = run({ op: 'resume', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  owner_id: 'owner-a', input_hash: 'a'.repeat(64), expected_dlq_revision: 4,
  expected_state_revision: 7, original_execution_id: 'exec-old', recovery_execution_id: 'exec-recovery-2',
  verification: 'recovery_conditions_confirmed' });
check(resume.valid && resume.payload.op === 'resume', 'valid resume request');
const complete = run({ op: 'complete', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  owner_id: 'owner-a', input_hash: 'a'.repeat(64), expected_dlq_revision: 5,
  expected_state_revision: 8, original_execution_id: 'exec-old', recovery_execution_id: 'exec-recovery-2',
  jira_issue_id: '10042', jira_issue_key: 'JBYS-42',
  response: { request_id: 'request-a', route: '담당자 이관', answer: '접수했습니다.', ticket: { ticket_id: 'JBYS-42' } },
  effects: { created_or_reused: { status: 'confirmed' }, context_saved: { status: 'confirmed' },
    closed: { status: 'none' }, assigned: { status: 'confirmed' }, alert: { status: 'confirmed' } },
  verification: 'recovery_action_effects_confirmed' });
check(complete.valid && complete.payload.op === 'complete', 'valid complete request');
check(!run({ op: 'claim', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  owner_id: 'owner-a', input_hash: 'bad-hash', expected_dlq_revision: 3,
  expected_state_revision: 7, original_execution_id: 'exec-old', recovery_execution_id: 'exec-recovery-4',
  verification: 'recovery_conditions_confirmed' }).valid, 'malformed claim input hash denied');
check(!run({ op: 'release', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  owner_id: 'owner-a', input_hash: 'a'.repeat(64), expected_dlq_revision: 4,
  expected_state_revision: 7, original_execution_id: 'exec-old', recovery_execution_id: 'exec-recovery-2',
  reason: 'x'.repeat(201), verification: 'recovery_execution_ended_and_effects_rechecked', target_effect_status: 'failed' }).valid, 'overlong release reason denied');
check(!run({ op: 'finish', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  expected_dlq_revision: 3, expected_state_revision: 7, original_execution_id: 'exec-old',
  recovery_execution_id: 'exec-old', verification: 'jira_effects_confirmed' }).valid, 'execution ID reuse denied');
check(!run({ op: 'finish', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  expected_dlq_revision: 3, expected_state_revision: 7, original_execution_id: 'exec-old',
  recovery_execution_id: 'exec-recovery-2', verification: 'not_verified' }).valid, 'missing Jira attestation denied');
check(!run({ op: 'finish', scope: 'scope-a', dlq_id: 'dlq-a', operator_id: 'operator-a',
  expected_dlq_revision: 3, expected_state_revision: 7, original_execution_id: 'exec-old',
  recovery_execution_id: 'exec-recovery-3', verification: 'jira_effects_confirmed', sql: 'DELETE' }).valid,
  'extra arbitrary field denied');
check(!new Function('$json', code)({ payload: '{broken' }).json.valid, 'malformed payload JSON denied');

console.log('TC-07 operator workflow contract: 25 checks passed');
