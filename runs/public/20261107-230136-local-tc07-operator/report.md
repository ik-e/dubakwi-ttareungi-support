# TC-07 운영자 workflow 입력 계약

- 실행 시각: 2026-11-07 23:01 KST
- 환경: 로컬 workflow JSON 및 Node 계약 검사
- 판정: **부분 통과**. 운영자 수동 호출 초안의 입력 안전성만 확인했다.

## 확인 결과

- `dubakwi-recovery-operator`는 비활성 Manual Trigger이며 외부 webhook이 없다.
- Postgres 호출은 `$1::jsonb` 파라미터를 사용하고 전용 `dubakwi-recovery-operator` Credential 이름을 참조한다. 환경 credential ID나 비밀번호는 JSON에 넣지 않았다.
- `inspect` 및 `finish` allowlist, 새 execution ID, revision 형식, `jira_effects_confirmed` attestation과 임의 필드 거부를 검사했다 (8/8).
- finish capsule 3/3, recovery/DLQ action parity 8/8, workflow JSON parse, 문서 링크/앵커 724/59를 통과했다.

## 한계

VM에 import하거나 Credential을 연결하지 않았다. 실제 Jira를 자동 조회하지 않으므로 운영자가 Jira와 원 실행 종료를 확인한 뒤에만 finish 요청을 작성해야 한다. 이 workflow는 finish 외 action을 수행하지 않으며 동시 경합·중단 복귀도 증명하지 않는다. TC-07 전체는 미완료다.
