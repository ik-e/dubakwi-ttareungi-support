# Team user and ownership API deployment

## PR36 local candidate — live records

Compose now fixes `DUBAKWI_RECORDS_MODE=jira`. File records are local fixture
mode only. Missing live configuration, DB/Jira failure and invalid context return
503 and never fall back to fixtures. `/employees` keeps its contract.

Preserve the VM's private five-user override with `DUBAKWI_USERS_OVERRIDE_FILE`
(read-only bind). Supply scope, HTTPS Jira origin and read-only private files:
DB DSN, Jira auth JSON (`email`/`token`), service-author accountId array. Pass that
array to `render_n8n_workflow.py --context-authors-file`; state also needs the
assignee map for final-save verification. Keep all real values outside Git.

Apply008/009 first. The API uses its own read-only DB login and refuses a
write-capable login. Jira calls are GET only, redirects refused, with a total
1.2-second read budget. Latest-completed binding, complete comments, trusted
author and current Jira state must agree. Staff-closed without a verified chatbot
close reason is generic `closed`.

The image includes locked psycopg and both provider/parser modules. Build context
is allowlisted by `.dockerignore`. Local health/UID10001/driver import and actual
PostgreSQL reader integration passed; Jira responses were mocked. Verify real
Jira reads, users/env/secret preservation and image digest before activation.

The DB driver is the optional `records` extra, so an unchanged bot build does not
gain a DB dependency. Local live-provider execution uses `uv run --locked --extra
records python -m services.user_api.server`; the API Dockerfile installs that same
locked extra. Fixture/Code-only tests do not need a database driver.

The guidance below is historical fixture deployment, not the live rollout order.
T-DEMO records are not live Jira ownership proof.

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


## 조회 응답 시간 경계의 로컬 보완

records provider는1.2초 내부 deadline과1.25초 응답 대기 제한을 사용한다. DNS/socket이 자체 timeout을 넘겨 대기해도503으로 답하며 읽기 작업만 최대4개까지 남길 수 있다. 슬롯이 차면 추가 작업을 대기열에 넣지 않고503으로 거절한다. 남은 작업에는 SELECT/GET만 허용되며 쓰기/재시도/모의 records fallback은 없다. 실제 VM 스케줄링·네트워크 지연은 별도 측정한다.
