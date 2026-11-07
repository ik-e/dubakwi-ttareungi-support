#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const workflow = JSON.parse(fs.readFileSync(path.join(root, 'workflows/dubakwi-handoff.json'), 'utf8'));
const code = (name) => workflow.nodes.find((node) => node.name === name).parameters.jsCode;
const check = (condition, message) => { if (!condition) throw new Error(message); };

const closeCtx = {
  request: { case_id: 'case-a', close_status: 'closed_guidance', answer: '답변 010-1234-5678 user@example.com' },
  state_ref: { owner_id: 'owner-a' }, ticket: { id: '100', key: 'JBYS-100' },
  effects: { context_saved: { status: 'none' }, closed: { status: 'none' } },
};
const closeRun = new Function('$json', '$', code('H36 종료 판정'));
closeRun({ statusCode: 500 }, (name) => ({ item: { json: { ctx: closeCtx } } }));
check(closeCtx.recovery.mode === 'payload' && closeCtx.recovery.action === 'close', 'close failure must preserve a replayable close capsule');
check(closeCtx.recovery.args.close_status === 'closed_guidance' && closeCtx.recovery.args.answer === '답변 ***-****-**** ***@***', 'close capsule must preserve the masked answer and target status');

const assignCtx = {
  request: { case_id: 'case-b', priority: 'high' }, state_ref: { owner_id: 'owner-b' },
  ticket: { id: '200', key: 'JBYS-200' }, effects: { assigned: { status: 'none' }, context_saved: { status: 'none' } },
};
const assignPlan = { ctx: assignCtx, req: { body: { fields: { assignee: { accountId: 'acct-200' } } } } };
const assignRun = new Function('$json', '$', code('H42 배정 판정'));
assignRun({ statusCode: 503 }, (name) => ({ item: { json: assignPlan } }));
check(assignCtx.recovery.mode === 'payload' && assignCtx.recovery.action === 'assign', 'assignment failure must preserve a replayable assignment capsule');
check(assignCtx.recovery.args.assignee_account_id === 'acct-200' && assignCtx.recovery.args.priority === 'high', 'assignment capsule must bind the selected account and priority');

const contextCtx = {
  request: { case_id: 'case-c' }, state_ref: { owner_id: 'owner-c' }, ticket: { id: '300', key: 'JBYS-300' },
  effects: { context_saved: { status: 'none' } },
};
const contextPlan = { ctx: contextCtx, deadline_at: new Date(Date.now() + 60000).toISOString(),
  snapshot: { schema_version: 1, request_id: 'request-c', event_id: 'event-c', facts: { summary: 'masked' } } };
const contextRun = new Function('$json', '$', '$input', code('H61 문맥 저장 재조회 판정'));
const contextResult = contextRun({}, () => ({ first: () => ({ json: contextPlan }) }), { all: () => [] })[0].json;
check(contextResult.ctx.recovery.mode === 'payload' && contextResult.ctx.recovery.action === 'context_update', 'failed context verification must preserve its validated snapshot');
check(contextResult.ctx.recovery.args.snapshot === contextPlan.snapshot, 'context capsule must carry the exact idempotent snapshot event');

console.log('TC-07 handoff recovery capsule contract: 6 checks passed');
