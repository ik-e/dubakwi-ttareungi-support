// Build-time patch for ONE verified n8n image. Not a post-execution scrubber.
// Fail closed on upstream source drift; never silently patch an unknown version.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const expected = 'afd0a6e02ce62b85c090a11acca1c1d207b9b6d15f21b87508af8fb4bf165039';
const modules = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm';
const candidates = fs.readdirSync(modules).filter(x => x.startsWith('n8n-nodes-base@')).map(x =>
  path.join(modules, x, 'node_modules/n8n-nodes-base/dist/nodes/Webhook/Webhook.node.js'))
  .filter(x => fs.existsSync(x));
if (candidates.length !== 1) throw new Error('Webhook source count mismatch');
const target = candidates[0];
const source = fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
if (crypto.createHash('sha256').update(source).digest('hex') !== expected) throw new Error('Unreviewed Webhook source');
const anchor = '        const node = context.getNode();\n        const rawOptions = node.parameters?.options;';
if (source.split(anchor).length !== 2) throw new Error('Webhook authentication boundary mismatch');
const patch = `        // DUBAKWI_AUTH_BOUNDARY_V2: native authentication has already succeeded.
        // Limit the behavior change to this team's path namespace.
        if (String(context.getNodeParameter('path', '')).startsWith('dubakwi-')) {
            const privateHeaders = new Set(['x-team-key', 'x-internal-key', 'authorization', 'cookie', 'proxy-authorization']);
            req.headers = Object.fromEntries(Object.entries(req.headers).filter(([name]) => !privateHeaders.has(name.toLowerCase())));
            if (Array.isArray(req.rawHeaders)) {
                const kept = [];
                for (let i = 0; i < req.rawHeaders.length; i += 2) {
                    if (!privateHeaders.has(String(req.rawHeaders[i]).toLowerCase())) kept.push(req.rawHeaders[i], req.rawHeaders[i + 1]);
                }
                req.rawHeaders = kept;
            }
        }
`;
const rejectAnchor = "resp.writeHead(error.responseCode, { 'WWW-Authenticate': 'Basic realm=\"Webhook\"' });";
if (source.split(rejectAnchor).length !== 2) throw new Error('Webhook rejection boundary mismatch');
// The project/guide contract requires 401 for authentication failure. Preserve
// native auth checking and unrelated paths; do not remap IP-policy/config errors.
const reject = `resp.writeHead(
                    context.getNodeParameter('authentication', 'none') === 'headerAuth'
                    && String(context.getNodeParameter('path', '')).startsWith('dubakwi-')
                    && [401, 403].includes(error.responseCode) ? 401 : error.responseCode,
                    { 'WWW-Authenticate': 'Basic realm="Webhook"' });`;
fs.writeFileSync(target, source.replace(anchor, patch + anchor).replace(rejectAnchor, reject));
process.stdout.write('Patched verified Webhook authentication output boundary\n');
