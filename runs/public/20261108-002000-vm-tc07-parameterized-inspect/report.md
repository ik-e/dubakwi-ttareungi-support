# TC-07 VM parameterized inspect correction

- 실행 시각: 2026-11-08 00:20 KST 전후
- 환경: Edge의 aio-t2 n8n UI, 기존 수동 TC-07 시험 workflow 및 PR36 PostgreSQL
- workflow: `R01 TC07 operator E2E 20261107` (`b4cc6f8be2d9492f8a508a545b85f2dc`), inactive/unpublished
- DB 역할: `dubakwi-recovery-operator` credential
- 판정: **inspect 통과, 복구 미실행**

## 실행

R02 입력의 DLQ ID를 `dlq-1fc0aa308982d11ff908eac554a791c1`로 바로잡았다. 이전 보고서의 ID는 마지막 `1`이 빠져 있었다. R03 쿼리는 parameterized 호출 `SELECT dubakwi_service.recovery_finish($1::jsonb) AS result;`이며 Query Parameters는 `{{ JSON.stringify($json.payload) }}`를 유지했다.

VM에서 함수가 `ok: true`인 inspect 결과를 반환했고, DLQ ID·scope·case 및 저장된 Jira/effect 문맥이 응답에 나타났다. 이는 parameterized 호출과 DB credential이 작동함을 확인한다. 이전 `recovery_not_found`의 원인은 parameter binding이 아니라 DLQ ID 오타였다.

inspect는 읽기 전용이다. 대상은 합성 fixture이며 Jira 키/ID가 `SYNTHETIC-NO-JIRA`다. 따라서 finish 호출, DLQ resolve, request completed 전환, Jira/Discord 호출은 하지 않았다. 시험 workflow는 비활성·미게시 상태로 두었다.

## 남은 범위

이 결과는 inspect 연결만 증명한다. 실제 Jira 효과를 대조한 성공 finish, conditionally claimed 재개, action별 retry, release/pending 복귀, 동시 운영자 경합 및 중단 복귀는 완료하지 않았다. TC-07 전체는 계속 부분 완료다.
