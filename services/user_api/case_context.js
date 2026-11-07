// Canonical n8n Code library. build_case_context_nodes.py embeds this function
// into exported workflows; no runtime filesystem/require permission is needed.
function caseContextLibrary() {
  const MARKER = '[dubakwi-case-context:v1]';
  const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const text = v => typeof v === 'string' && v.length > 0;
  const fail = code => { throw new Error(code); };
  const sorted = v => Array.isArray(v) ? v.map(sorted) : object(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
  const canonical = v => JSON.stringify(sorted(v));
  // SHA256 is embedded below by the source generator, with Unicode parity tests.
  const sha256hex = (text) => {
  const rr = (v, a) => (v >>> a) | (v << (32 - a));
  const maxWord = Math.pow(2, 32);
  const bytes = encodeURIComponent(String(text)).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const bitLength = bytes.length * 8;
  let hash = [];
  const k = [];
  let primes = 0;
  const composite = {};
  for (let c = 2; primes < 64; c++) {
    if (!composite[c]) {
      for (let i = 0; i < 313; i += c) composite[i] = c;
      hash[primes] = (Math.pow(c, 0.5) * maxWord) | 0;
      k[primes++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
    }
  }
  let s = bytes + '\x80';
  while (s.length % 64 - 56) s += '\x00';
  const words = [];
  for (let i = 0; i < s.length; i++) words[i >> 2] |= s.charCodeAt(i) << ((3 - i) % 4) * 8;
  words[words.length] = (bitLength / maxWord) | 0;
  words[words.length] = bitLength;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const old = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  let out = '';
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
  return out;
};

  const digest = value => sha256hex(JSON.stringify(value));
  const caseLabel = b => 'dubakwi-' + digest([b.scope, b.owner_id, b.first_request_id]).slice(0, 40);
  const eventId = s => digest([s.scope, s.case_id, s.request_id, s.phase]);
  function jiraText(value) {
    if (typeof value === 'string') return value;
    if (!object(value)) return fail('context_invalid');
    if (value.type === 'text') return typeof value.text === 'string' ? value.text : fail('context_invalid');
    if (value.type === 'hardBreak') return '\n';
    if (!['doc', 'paragraph', 'codeBlock', 'bulletList', 'orderedList', 'listItem'].includes(value.type)
        || !Array.isArray(value.content ?? [])) return fail('context_invalid');
    return (value.content ?? []).map(jiraText).join(['doc', 'bulletList', 'orderedList', 'listItem'].includes(value.type) ? '\n' : '');
  }
  function validateFacts(f) {
    if (!object(f) || typeof f.summary !== 'string') return fail('context_invalid');
    for (const k of ['reported', 'confirmed']) {
      if (!Array.isArray(f[k])) return fail('context_invalid');
      for (const x of f[k]) {
        if (!object(x) || !text(x.key) || typeof x.value !== 'string'
            || !['user', 'document', 'api'].includes(x.origin)
            || ('reference' in x && typeof x.reference !== 'string')
            || (k === 'confirmed' && x.origin === 'user')) return fail('context_invalid');
      }
    }
    for (const k of ['attempted_actions', 'missing', 'uncertainties']) {
      if (!Array.isArray(f[k]) || !f[k].every(x => typeof x === 'string')) return fail('context_invalid');
    }
    if (!Array.isArray(f.evidence_refs) || !f.evidence_refs.every(x => object(x) && text(x.doc)
        && text(x.section) && typeof x.score === 'number' && Number.isFinite(x.score)
        )) return fail('context_invalid');
    if (/\b0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}\b|[\w.+-]+@[\w-]+\.[\w.-]+/.test(JSON.stringify(f))) return fail('context_unmasked');
  }
  function validateSnapshot(s, b) {
    if (!object(s) || s.schema_version !== 1) return fail('context_invalid');
    for (const k of ['scope', 'case_id', 'owner_id', 'first_request_id', 'ticket_key']) {
      if (!text(b[k]) || s[k] !== b[k]) return fail('context_not_linked');
    }
    if (!Number.isInteger(s.revision) || s.revision < 1 || !text(s.request_id) || s.request_id.length > 64
        || !['wait', 'handoff', 'close', 'followup', 'save'].includes(s.phase) || s.event_id !== eventId(s)) return fail('context_invalid');
    const p = s.support;
    if (!object(p) || p.version !== null) return fail('context_invalid');
    for (const k of ['case_id', 'owner_id', 'first_request_id']) if (p[k] !== b[k]) return fail('context_not_linked');
    if (p.ticket_id !== b.ticket_key || !Number.isInteger(p.attempt) || p.attempt < 1
        || !['received', 'waiting_info', 'handed_off', 'closed_guidance', 'closed_rejected'].includes(p.status)
        || ![null, 'support', 'security'].includes(p.assignee_role ?? null)
        || ![null, 'normal', 'high'].includes(p.priority ?? null)
        || (p.status === 'handed_off' && (!p.assignee_role || !p.priority))) return fail('context_invalid');
    validateFacts(s.facts);
    if (encodeURIComponent(JSON.stringify(s)).replace(/%[A-F0-9]{2}|./g, 'x').length > 16000) return fail('context_too_large');
    return s;
  }
  function validateIssue(issue, b) {
    const f = issue?.fields ?? {};
    const lines = jiraText(f.description ?? '').split(/\r?\n/);
    if (!/^JBYS-[0-9]+$/.test(issue?.key ?? '') || issue.key !== b.ticket_key
        || !Array.isArray(f.labels) || !f.labels.includes(caseLabel(b))
        || !lines.includes('case_id: ' + b.case_id)
        || !lines.includes('first_request_id: ' + b.first_request_id)) return fail('context_not_linked');
  }
  function selectSnapshot(comments, b, authors, requestId = null) {
    if (!Array.isArray(authors) || !authors.length) return fail('context_author_unconfigured');
    const events = new Map(), revisions = new Map(), candidates = [];
    for (const c of comments) {
      const body = jiraText(c.body ?? '');
      if (!body.startsWith(MARKER + '\n')) continue;
      if (!authors.includes(c.author?.accountId)) return fail('context_author_denied');
      let s;
      try { s = JSON.parse(body.slice(MARKER.length + 1)); } catch { return fail('context_invalid'); }
      validateSnapshot(s, b);
      const value = canonical(s);
      for (const [key, map] of [[s.event_id, events], [s.revision, revisions]]) {
        if (map.has(key) && map.get(key) !== value) return fail('context_conflict');
        map.set(key, value);
      }
      if (requestId === null || s.request_id === requestId) candidates.push(s);
    }
    if (!candidates.length) return fail('context_missing');
    return candidates.reduce((a, b) => a.revision >= b.revision ? a : b);
  }
  function buildSnapshot(b, requestId, phase, revision, support, facts) {
    const s = {schema_version: 1, ...b, request_id: requestId, phase, revision, support, facts};
    s.event_id = eventId(s);
    return validateSnapshot(s, b);
  }
  function readPages(pages) {
    const comments = [];
    let expected = 0, total = null;
    for (const page of pages) {
      if (!object(page) || !Number.isInteger(page.total) || !Number.isInteger(page.startAt)
          || !Array.isArray(page.comments) || page.startAt !== expected
          || (total !== null && total !== page.total) || page.total < 0) return fail('context_incomplete');
      total = page.total;
      comments.push(...page.comments);
      expected += page.comments.length;
    }
    if (total === null || expected !== total) return fail('context_incomplete');
    return comments;
  }
  return {MARKER, canonical, digest, caseLabel, eventId, jiraText, validateFacts,
    validateSnapshot, validateIssue, selectSnapshot, buildSnapshot, readPages};
}
if (typeof module !== 'undefined') module.exports = caseContextLibrary;
