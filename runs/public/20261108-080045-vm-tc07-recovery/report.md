# TC-07 VM 백업·복원 DB 리허설

- 실행 ID: `20261108-080045-vm-tc07-recovery`
- 일시: 2026-11-08 08:00 KST 전후
- 환경: aio-t2 웹 SSH, PostgreSQL 16.15
- 기준 소스: `main` / `b323a26` (PR #51 병합 후)
- 범위: 서비스 DB는 읽기만 수행하고 신규 복원 DB에서 recovery migrations와 계약을 시험

## 결과

- 서비스 DB의 fresh custom-format 백업을 저장소 밖 비공개 위치에 만들었다. 파일 권한은 `0600`이며 `pg_restore --list`로 아카이브를 검증했다. 백업 경로·해시·행 내용은 공개하지 않는다.
- 백업을 별도 빈 restore DB에 복원하고 소유권·ACL을 제외한 복원 절차를 확인했다. 복원 DB에 runtime 최소 grant를 다시 적용한 뒤 migrations 010–016을 파일 순서대로 적용했다.
- `controlled-recovery-contract.sql`, `controlled-recovery-claim-release-contract.sql`, `controlled-recovery-unknown-effect-contract.sql`이 모두 통과했다.
- migration 전후 `storage-snapshot.sql` 결과가 일치했다. 테스트용 fixture는 별도 restore DB 안에만 만든다.
- 두 운영자 claim의 경합 시험은 web SSH 연결이 끊겨 결과 로그를 확인하지 못했다. 복원 DB에서는 첫 claim의 `reprocessing` 상태만 관측했으며 두 번째 요청의 충돌 응답은 확인하지 못했다. 따라서 1승/1충돌 계약 통과로 집계하지 않는다. 재연결 후 restore DB의 중간 결과를 먼저 확인하고 다시 실행해야 한다.

## 라이브 변경 경계

- 서비스 DB의 migration 적용 건수: 0
- 서비스 state/DLQ 변경: 0
- n8n workflow import·활성화 및 credential 변경: 0
- Jira·Discord 외부 효과: 0

복원 DB 계약 리허설은 통과했지만 경합 확인과 operator 로그인/credential 검증이 남아 있다. 이 결과만으로 TC-07 전체 또는 운영 배포를 완료로 판정하지 않는다.
