# Team user and ownership API deployment

This service supplies the reviewed `data/users.json` and `data/records.json`
fixtures without modifying the course data-api.

## Contract

- Internal URL: `http://dubakwi-user-api:8801`
- Authentication: `X-Internal-Key`, using the same private value as the n8n
  Credential named `dubakwi-internal-key`
- `GET /employees/<id>` returns only `id`, `role`, and `access_levels`.
- `GET /records/<ticket_id>?requester=<actor_id>` returns a record only when
  `owner_id` equals the authenticated requester's server-confirmed actor ID.
- Unknown users and records return 404. Wrong ownership returns 403. Missing or
  wrong internal authentication returns 401.
- The service has no published host port. Course data-api remains unchanged.

## R01 deployment sequence

1. Confirm the existing n8n Docker network name and a private key file with
   parent mode 700 and file mode 600. Do not print the key.
2. Validate `infra/user-api-compose.yaml` with a private env file containing
   `DUBAKWI_N8N_NETWORK` and `DUBAKWI_INTERNAL_KEY_FILE`.
3. Build and start only `user-api`; do not restart n8n or the course data-api.
4. From the n8n container/network, verify health, 401 without a key, citizen-a
   200/public, support-demo 200/public+restricted, unregistered-zz 404, own
   T-DEMO-01 200 with masked contact, and citizen-a reading T-DEMO-02 as 403.
5. Change B04 to the internal URL and attach `dubakwi-internal-key`. Do not copy
   the secret into workflow JSON. Keep the course data-api deployment available
   for its separate course evidence.

Example requests intentionally omit the secret value:

```text
GET http://dubakwi-user-api:8801/employees/citizen-a
GET http://dubakwi-user-api:8801/records/T-DEMO-01?requester=citizen-a
```

Deployment and live n8n evidence remain incomplete until R01 performs these
steps on the VM and R05 records the official registered/unregistered/ownership
cases.
