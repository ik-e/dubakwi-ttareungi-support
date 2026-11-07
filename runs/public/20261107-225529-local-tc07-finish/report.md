# TC-07 finish 복원 slice 로컬 검증

- 실행 시각: 2026-11-07 22:55 KST
- 환경: 격리 disposable PostgreSQL 16.15-bookworm 및 로컬 Node 계약 검사
- 기준: `6f9561b` 위의 수정된 worktree
- 판정: **부분 통과**. 첫 finish 복원 slice만 검증했다. TC-07 전체 완료가 아니다.

## 확인 결과

- 001~010 마이그레이션을 빈 disposable DB에 순서대로 적용했다.
- `controlled-recovery-contract.sql`: 저장된 finish response 복원, 완료 후 같은 request replay, 중복 복구 차단, alert 효과 unknown 거부를 확인했다. 첫 실행에서 두 번째 synthetic fixture가 첫 request ID를 재사용해 실패했고, fixture ID를 분리한 후 재실행 통과했다.
- 권한 검사에서 runtime role의 `recovery_finish(jsonb)` 실행은 거부되고 recovery operator role 실행만 허용됨을 확인했다.
- B33 recovery capsule: 안전한 Jira 효과/티켓 문맥 일치 1건은 payload/finish 캡슐을 생성하고, alert unknown 및 티켓 ID 불일치 2건은 기존 Jira 참조 복구로 제한했다 (3/3).
- Support Code 회귀 157/157, recovery/DLQ action parity 8/8, 문서 링크 검사 720개와 앵커 59개 통과.

## 남은 검증

VM 적용과 환경별 operator login은 하지 않았다. 실제 Jira 상태 확인 후 operator 호출, 동시 운영자 경합, 호출 중단/재시작, finish 외 action은 남아 있다. 따라서 이를 사용자용 수동 재처리 기능의 전체 검증이나 TC-07 pass로 판정하지 않는다.
