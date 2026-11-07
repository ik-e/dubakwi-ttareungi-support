# TC-07 operator claim/release CAS verification

- 실행 시각: 2026-11-08 00:35 KST 전후
- 환경: 로컬 disposable PostgreSQL 16.15-bookworm, 외부 포트 게시 없음
- 기준: 현재 worktree migration 001~012
- 판정: **claim/release CAS 통과; action driver는 미완료**

## 확인

- 새 빈 DB에서 migration 001~012를 적용했다.
- `controlled-recovery-claim-release-contract.sql` 통과: owner/input hash/original execution/state+DLQ revision이 일치하는 failed action claim, attempts 증가, request 상태 유지, 중복/stale claim 거부, 작업 미실행 시 revision 조건부 pending 복귀, duplicate/stale release 거부, 비대상 alert 효과 unknown 거부를 확인했다.
- `controlled-recovery-contract.sql` 재통과: finish response 복원/replay/one-shot CAS와 unknown alert 효과 거부가 유지됐다.
- 동시 claim: 고유 scope의 합성 fixture에 두 개 세션이 같은 DLQ revision으로 동시에 claim했다. 첫 세션이 잠금을 유지한 상태에서 두 번째를 호출했고, 결과는 첫 요청 `ok:true`/`reprocessing`, 두 번째 `recovery_conflict`였다. 한 승자만 claim했다.
- 권한: runtime 역할은 claim/release/control 실행 권한이 없고 recovery operator 역할에만 부여됐다.
- Node 계약: 당시 출력에 operator 입력 12개 검사로 기록했다. 이후 assertion 수를 다시 세어 14개임을 확인했다. 후속 run에서 실행 입력을 통한 검증까지 확장해 17개를 통과했다. finish capsule 3/3, recovery/DLQ parity 8/8 통과.
- 최초 동시 실행 명령은 로컬 PowerShell 인용 오류로 PostgreSQL까지 도달하지 않았다. JSON을 stdin으로 전달해 재실행했고, 위 결과는 DB 응답으로 확인했다.
- 시험 후 ephemeral DB 컨테이너를 중지해 자동 제거했다. VM·Jira·Discord 영향은 0이다.

## 남은 범위

claim/release는 처리권과 pending 복귀만 관리한다. claim 성공 뒤 Jira/Discord 실패 단계별 실행·효과 재확인·새 StateRef 발급·완료/resolve 연결, crash 이후 stale `reprocessing` 회수, 운영자 credential을 사용한 VM 적용/시험은 남아 있다. migration 011/012는 shared VM에 적용하지 않았다.
