// Read-only Code-node audit. Run: node <this-file> <repository-root>
// Exit 0 means the audit ran, NOT that the future contract is implemented.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(process.argv[2] || process.cwd());
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const examples = read('infra/contracts/parallel-contract-v1.examples.json');
const workflows = Object.fromEntries(['support', 'handoff'].map(k => [k, read(`workflows/dubakwi-${k}.json`)]));
const clone = x => structuredClone(x);
const code = (w, prefix) => workflows[w].nodes.find(n => n.name.startsWith(prefix + ' ')).parameters.jsCode;
const run = (w, prefix, input, ctx) => new Function('$', '$json', code(w, prefix))(
  () => ({first: () => ({json: ctx}), item: {json: ctx}}), input);
const results = [];
function check(id, node, expected, probe) {
  try {
    const observed = probe();
    results.push({id, node, expected, observed, status: JSON.stringify(observed) === JSON.stringify(expected) ? 'pass' : 'implementation_gap'});
  } catch (e) { results.push({id, node, status: 'probe_error', error: String(e)}); }
}
const base = () => ({request: {request_id: 'contract-followup-a', case_ref: 'case-contract-a', question: '추가 정보를 전달합니다.', attempt: 99}, actor: {id: 'citizen-a', role: 'citizen'}, security: {masked: 0}, deadline_at: new Date(Date.now() + 60000).toISOString(), time_budget: {search_ms: 3000, ticket_min_ms: 5000, tail_ms: 3500}});
check('A01', 'B08', 3, () => run('support', 'B08', clone(examples.fixtures.begin_handed_off), base()).json.support.attempt);
const follow = {...base(), support: {...clone(examples.fixtures.begin_handed_off.support), attempt: 1}, facts: clone(examples.fixtures.begin_handed_off.facts)};
const triage = {type: 'fees', urgency: 'normal', missing: ['charge_detail'], needs_human: false, facts: {summary: '추가 정보', reported: []}, target_ticket_id: null};
check('A02', 'B11', 'handoff', () => run('support', 'B11', {text: JSON.stringify(triage)}, clone(follow)).json.plan);
check('A03', 'B25', {role: 'security', priority: 'high'}, () => {
  const ctx = {...clone(follow), support: {...follow.support, assignee_role: 'security', priority: 'high'}, triage: {type: 'fees'}, plan: 'handoff', outcome: {mode: 'handoff', answer: '담당자에게 추가 정보를 연결합니다.', sources: []}};
  const t = run('support', 'B25', ctx).json.ticket_request;
  return {role: t.assignee_role, priority: t.priority};
});
check('A04', 'B24', true, () => run('support', 'B24', {plan: 'fixed', lookup: {status: 'ok', record: {ticket_id: 'JBYS-9001', status: 'closed'}}, search: {status: 'skipped'}}).json.outcome.answer.includes('처리 종료'));
const lookup = statusCode => run('handoff', 'H22', {statusCode}, {request: {request_id: 'mock', actor_id: 'citizen-a', target_ticket_id: 'JBYS-9001'}})[0].json.body;
check('A05', 'H22', true, () => JSON.stringify(lookup(403)) === JSON.stringify(lookup(404)));
check('A06', 'H22', {status: 'error', record: null, error: 'lookup_error'}, () => {const r = lookup(503); return {status: r.status, record: r.record, error: r.error_code};});
check('A07', 'H22', {status: 'ok', masked: 2}, () => {
  const r = run('handoff', 'H22', {statusCode: 200, body: {ticket_id: 'JBYS-9001', owner_id: 'citizen-a', status: 'handed_off', contact: {phone: '[가림]', email: '[가림]'}}}, {request: {request_id: 'mock', actor_id: 'citizen-a', target_ticket_id: 'JBYS-9001'}})[0].json.body;
  return {status: r.status, masked: r.masked};
});
function hand(labels) {
  const ctx = {request: {assignee_role: 'support', case_id: 'case-mock', priority: 'normal', context: {summary: '모의 문의', confirmed: [], missing: []}, attempt: 3}, state_ref: {owner_id: 'citizen-a', input_hash: 'a'.repeat(64)}, ticket: {id: 'mock-id', key: 'JBYS-9001', reused: true, labels, assignee_id: 'mock-account'}, effects: Object.fromEntries(['created_or_reused', 'context_saved', 'closed', 'assigned', 'alert'].map(k => [k, {status: k === 'created_or_reused' ? 'confirmed' : 'none'}])), error_code: null};
  return new Function('$', '$json', code('handoff', 'H39').replace('__ASSIGNEE_MAP_JSON__', JSON.stringify({support: 'mock-account'})))(() => ({item: {json: {ctx}}}), {statusCode: 200, body: [{active: true, accountType: 'atlassian', accountId: 'mock-account'}]})[0].json;
}
check('A08', 'H39', {route: 'context', assigned: 'confirmed', alert: 'confirmed'}, () => {const r = hand(['dubakwi-alert-sent-support']); return {route: r.route, assigned: r.ctx.effects.assigned.status, alert: r.ctx.effects.alert.status};});
check('A09', 'H39', {route: 'context', error: 'partial_effect', alert: 'unknown'}, () => {const r = hand(['dubakwi-alert-attempted-support']); return {route: r.route, error: r.ctx.error_code, alert: r.ctx.effects.alert.status};});
const ids = examples.cases.map(c => c.id);
check('A10', 'examples', true, () => ids.length === new Set(ids).size && examples.cases.every(c => typeof c.given !== 'string' || (c.given.startsWith('fixture:') && examples.fixtures[c.given.slice(8)])));
const summary = {environment: 'local Node; mocked node inputs; no HTTP/DB/Jira/n8n execution', baseline: '2cb28c3 business workflow sources', contract_version: examples.version, source_sha256: Object.fromEntries(['support', 'handoff'].map(k => [k, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, `workflows/dubakwi-${k}.json`))).digest('hex')])), counts: Object.fromEntries(['pass', 'implementation_gap', 'probe_error'].map(s => [s, results.filter(r => r.status === s).length])), results};
console.log(JSON.stringify(summary, null, 2));
if (summary.counts.probe_error) process.exitCode = 1;
