# TC-07 운영자 복구 VM 확인

- 실행 시각: 2026-11-07 23:45~23:50 KST (n8n 표시 시각을 KST로 환산)
- 환경: Edge 웹 SSH로 접속한 aio-t2 VM, n8n 및 PR36 PostgreSQL
- n8n workflow: `R01 TC07 operator E2E 20261107` (`b4cc6f8be2d9492f8a508a545b85f2dc`), 수동 실행·비활성·미게시
- DB/역할: `pr36_dual_storage_a657890` / `dubakwi_recovery_login`; n8n endpoint `172.18.0.8:5432`
- 판정: **부분 통과, 성공 복구 미완료**

## 확인 결과

- 저장한 n8n credential이 `dubakwi-recovery-operator`라는 이름으로 등록돼 있고 연결 테스트가 성공한 것을 확인했다.
- 임시 수동 workflow에서 실제 해당 credential을 선택해 DB와 `dubakwi_recovery_login` 역할로 연결했다.
- `recovery_finish(inspect)`를 literal JSON payload로 호출해 `ok: true`와 DLQ/state 정보를 받았다. 대상은 scope `tc07-operator-e2e-20261107`, DLQ `dlq-1fc0aa308982d11ff908eac554a791c`이다.
- `$1::jsonb` parameterized 함수 호출은 같은 입력으로 `recovery_not_found`를 반환했다. 별도 `$1::text`/`jsonb_typeof($1::jsonb)` probe는 기대한 JSON 전체 문자열과 `object`를 반환했다. 원인을 설명할 수 없어 성공 복구를 진행하지 않았다.
- `finish`를 Jira 효과 확인 attestation 없이 호출한 결과 `invalid_recovery_request`로 거절됐다. 사후 조회에서 DLQ는 `pending`/revision 0, request는 `failed`/revision 3 및 원 execution ID 그대로였다.
- synthetic fixture는 Jira ID가 `SYNTHETIC-NO-JIRA`이고 Discord 호출도 없다. 실제 티켓 완료나 효과 확인을 주장하지 않았다.
- 임시 workflow는 inactive/unpublished 상태이며 마지막 query를 읽기 전용 literal inspect로 복구했다.

## 남은 작업

parameterized function call의 `recovery_not_found` 원인을 확인하고 같은 inspect를 성공시켜야 한다. 성공 복구 경로는 실제 Jira 효과와 처리 상태를 확인할 수 있는 대상에 대해서만 실행한다. 이후 상태 completed와 DLQ resolved를 DB에서 확인하고, 중복/충돌 및 중단 복귀도 검증해야 TC-07 전체 통과로 판정할 수 있다.
