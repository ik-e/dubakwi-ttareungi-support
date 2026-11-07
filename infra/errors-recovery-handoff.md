# 오류 운영 알림과 수동 확인

2026-11-07 R01 로컬 통합 후보. 저장 계약의 기존 함수만 사용한다. 자동 재개 엔진은
미구현이며 fail·DLQ resolve를 수행해도 원 요청이 재실행되지 않는다.

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
4. DLQ를 사람이 검토할 때만 dlq_apply(op=claim, scope, dlq_id, expected_revision,
   execution_id)로 처리권을 얻는다. 검토 결과가 확정됐을 때만 새 revision과 비어 있지 않은
   resolution으로 op=resolve를 호출한다. 이 두 명령은 업무 재실행 명령이 아니다.
5. fail 뒤에도 같은 request_id는 request_requires_review, 같은 case_ref는 case_busy
   차단이 유지되는지 확인한다. case_ref 없는 독립 신규 문의를 기존 문의 복구로 세지 않는다.

실제 요청/계정/키/DB 자료는 Git 제외 전달본으로만 관리한다. 기존 시험 건의 일괄 종료·
삭제·DLQ resolve는 이 문서로 승인하지 않는다. 상세 field/CAS 계약은
[저장소 설계](../docs/project/STORAGE-DESIGN.md#storage-contract)를 따른다.
