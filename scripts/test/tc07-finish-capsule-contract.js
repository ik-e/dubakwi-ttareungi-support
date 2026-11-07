#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/dubakwi-support.json'), 'utf8'));
const code = workflow.nodes.find((node) => node.name === 'B33 응답 구성').parameters.jsCode;
const run = new Function('$json', '$', code);
const response = {
  request_id: 'tc07-capsule-1', route: '자동 답변', answer: 'verified synthetic answer',
  sources: [], ticket: null, agents: ['triage', 'writer', 'verifier'],
  security: { blocked_by: null, reason: null, masked: 0 },
};
const effect = (status) => ({ status });
const effects = {
  created_or_reused: effect('confirmed'), context_saved: effect('confirmed'),
  closed: effect('confirmed'), assigned: effect('none'), alert: effect('none'),
};
const base = {
  request: { request_id: response.request_id }, received_at: new Date().toISOString(),
  response_candidate: response, support: { case_id: 'case-tc07', ticket_id: 'JBYS-70' },
  actor: { id: 'citizen-a' },
  ticket_result: { state_saved: true, ticket_id: 'JBYS-70', effects },
};
const finishRecovery = {
  version: 1, mode: 'jira_ref', action: 'finish', args: null,
  reference: { jira_issue_key: 'JBYS-70', case_id: 'case-tc07', owner_id: 'citizen-a' },
  reason: 'final state write failed after Jira context verification',
};

function execute(saved) {
  const $ = (name) => ({ first: () => ({ json: name === 'B38 저장 준비 결과 합성' ? base : null }) });
  return run(saved, $).json;
}

const safe = execute({
  request_id: response.request_id, ok: false, error_code: 'state_error',
  state_ref: { state_revision: 9 }, recovery: finishRecovery,
});
if (safe.recovery?.mode !== 'payload' || safe.recovery.action !== 'finish'
    || safe.recovery.args?.response?.answer !== response.answer || safe.response_ready !== false) {
  throw new Error(`verified finish response was not safely capsule-preserved: ${JSON.stringify(safe.recovery)}`);
}

const uncertainBase = {
  ...base,
  ticket_result: { ...base.ticket_result, effects: { ...effects, alert: effect('unknown') } },
};
const uncertain = new Function('$json', '$', code)({
  request_id: response.request_id, ok: false, error_code: 'state_error',
  recovery: finishRecovery,
}, (name) => ({ first: () => ({ json: name === 'B38 저장 준비 결과 합성' ? uncertainBase : null }) })).json;
if (uncertain.recovery?.mode !== 'jira_ref' || uncertain.recovery.action !== 'finish') {
  throw new Error('uncertain external alert effect must remain manual Jira inspection');
}

const mismatchedBase = { ...base, ticket_result: { ...base.ticket_result, ticket_id: 'JBYS-71' } };
const mismatched = new Function('$json', '$', code)({
  request_id: response.request_id, ok: false, error_code: 'state_error', recovery: finishRecovery,
}, (name) => ({ first: () => ({ json: name === 'B38 저장 준비 결과 합성' ? mismatchedBase : null }) })).json;
if (mismatched.recovery?.mode !== 'jira_ref') {
  throw new Error('ticket mismatch must not become a payload recovery capsule');
}

console.log('TC-07 finish capsule contract: 3/3 passed');
