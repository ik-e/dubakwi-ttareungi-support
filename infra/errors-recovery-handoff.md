# 오류 운영 알림과 수동 확인

2026-11-08 상태 보충: Edge VM의 parameterized `recovery_finish(inspect)`가 운영자 credential로 `ok:true`를 반환했다. 이후 migrations 011~016은 local disposable PostgreSQL에서만 확인했다. [저장 경계 계약 결과](../runs/public/20261108-010000-local-tc07-complete-contract/report.md)는 payload 없는 capsule의 안전 거절, CAS claim→resume의 새 StateRef, 실패 시 failed/pending 복귀, 확인된 action Response 저장과 DLQ resolved, unknown effect·중복 완료 거부를 포함한다. [Handoff capsule 시험](../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md)은 close/assign 및 검증된 H61 context snapshot 재개 입력을 local fixture로 확인했다. VM [read-only preflight](../runs/public/20261108-072200-vm-tc07-recovery-preflight/report.md)는 서비스 DB에 recovery dispatcher가 없음을 확인했다. Migration 015 complete는 운영자의 외부 Jira 확인 attestation을 받고 DB 상태만 원자 갱신하며 Jira/Discord를 호출하지 않는다. 실제 Jira action과 VM 반입은 미실행이다.

2026-11-07 R01 로컬 통합 후보. 자동 재처리 엔진은 범위 밖이다. migration 010은
확인된 Jira 효과와 저장된 Response가 있는 finish를 조건부 복원한다. migration 011/012는
조건부 claim/release 및 allowlist dispatcher를 추가하지만, 외부 실패 action을 실행하거나
원 요청을 재개하지 않는다.

## 알림을 구분하기

handoff의 담당 알림은 Jira 배정·업무 맥락과 관련된 효과다. errors의 E09는 기존 과정
data-api `/alerts`에 보내는 운영 실패 알림이며 담당 배정·환불·복구 완료가 아니다.
E02에서 가린 workflow/node/scope/원 execution·고정 메시지만 보낸다. raw message/stack·
Credential·원문 질문은 보내지 않는다. E09는1.5초·재시도0·실패해도 E08로 종료한다.

E04 DLQ 쓰기 뒤 알림을 한 번 시도한다. DLQ는 알림 전의 효과 스냅샷이며, E08의
operational_alert는 API 수락 confirmed / 명확한4xx failed / 결과 미확인 unknown을
구분한다. API 수락은 사람 열람·메일 수신 증거가 아니다. 별도 수신 대조는 미실행이다.
state·DLQ 모두 실패해도 원본 비밀을 복사하거나 Error Workflow를 재귀 호출하지 않는다.

## 운영자 확인 순서

1. 같은 요청의 새 유입을 막고 원 실행이 실제 종료됐는지 확인한다. scope·원 execution·
   owner·known Jira ID·처리권·최신 revision을 비공개로 대조한다.
2. Jira 현재 상태/생성·문맥·배정·알림 표식과 DB/DLQ를 읽기 전용으로 확인한다.
   효과를 알 수 없으면 unknown/manual_required를 유지하며 생성·종료·알림을 반복하지 않는다.
3. 요청 상태 정리가 필요하면 기존 state_apply의 fail 명령과 최신 StateRef를 사용한다.
   확실한 실패는 failed, 효과 미확인은 unknown이다. 원문 DB 행 UPDATE/DELETE는 금지한다.
4. TC-07은 전용 recovery operator workflow에서 `inspect→claim→resume` 순으로 진행한다.
   Claim은 action 인자가 있는 payload capsule만 허용한다. Jira-ref/args-null·manual_required는
   claim 전에 거절한다. 운영자는 Jira에서 그 실패 action만 직접 수행·확인한 뒤 같은
   execution/revision/효과/응답을 `complete`로 제출한다. 재시도 실패나 중단은 execution 종료와
   외부 효과를 다시 확인한 뒤 `release`해 pending으로 돌린다. `dlq_apply(op=resolve)`나 테이블
   직접 수정으로 recovery 성공을 흉내 내지 않는다.
5. fail 뒤에도 같은 request_id는 request_requires_review, 같은 case_ref는 case_busy
   차단이 유지되는지 확인한다. case_ref 없는 독립 신규 문의를 기존 문의 복구로 세지 않는다.

### TC-07 operator 저장 경계

`recovery_control(jsonb)`는 별도 `dubakwi_recovery_operator` 권한만 호출한다. `inspect`는
읽기만 한다. `claim`은 owner·input hash·원 execution·두 revision·known ticket·효과 확실성과
action별 replay payload를 검사하고 operator/execution을 capsule에 결합해 DLQ를 CAS한다.
`resume`은 request_state를 failed/unknown→processing으로 CAS 전이하고 새 StateRef를 반환한다.
`release`는 재개 실패/중단을 외부 효과 확인 후 failed/pending으로 복귀시키며 대상 효과의
최종 판정(`failed`/`unknown`/`confirmed`, bind는 `none`)을 같은 CAS에서 기록한다. `unknown`은
다음 claim을 차단하고 운영자의 Jira 효과 재확인을 요구한다. `confirmed`는 이미 적용됨으로
기록해 재실행 없이 complete할 수 있고, failed/unknown은 기존 reconciliation을 지워 새 확인을
요구한다. resume 전 claim을 반납할 때도 실행 종료/효과 재확인 attestation을 요구하고 DLQ의
last execution ID를 원 execution으로 복원해 다음 유효 claim이 막히지 않게 한다. `complete`는
확인된 target effect, 변경되지 않은 비대상 효과, Jira 연결, Response와 revision을 검증해
request_state completed와 DLQ resolved를 원자 저장한다. `finish`는 저장 Response 복원 별도
경로다. 모든 외부 Jira/Discord effect는 운영자가 확인·수행해야 하며 SQL 함수가 외부 호출을
하지 않는다. replay 자료가 없는 Jira-ref/args-null·unknown capsule은 claim을 거절한다.

수동 호출 원본은 `workflows/dubakwi-recovery-operator.json`이다. 비활성 Manual Trigger와
editable JSON input에서 parameterized `inspect/finish/claim/resume/complete/release`를 allowlist
라우팅한다. workflow 및 PostgreSQL 저장계약은
[2026-11-08 재검증](../runs/public/20261108-073512-local-tc07-unknown-effect-release/report.md)에서
통과했다. VM에는 010 inspect만 확인됐고 011~016과 workflow는 반입되지 않았다. Jira/Discord
action 실행 노드는 없으므로 운영자가 외부 UI에서 action을 수행·확인한다. Claim 이후 recovery
실행이 끝나지 않았거나 효과를 확인할 수 없으면 `complete`하지 말고 원 실행/recovery 실행
종료와 외부 효과를 대조한 뒤 최신 revision으로 `release`한다.

실제 요청/계정/키/DB 자료는 Git 제외 전달본으로만 관리한다. 기존 시험 건의 일괄 종료·
삭제·DLQ resolve는 이 문서로 승인하지 않는다. 상세 field/CAS 계약은
[저장소 설계](../docs/project/STORAGE-DESIGN.md#storage-contract)를 따른다.

VM 반입은 [migration runbook](db/migrations/README.md)의 reviewed default-branch,
restore DB rehearsal, private backup, runtime/operator role 분리 조건을 충족한 다음에만
진행한다. Recovery operator workflow는 비활성으로 가져와 별도 credential과 read-only
inspect를 확인하기 전까지 활성화하지 않는다.
