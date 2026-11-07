# 과거 실패 문의 DB·DLQ 확인

2026-11-06 KST, R01. 사용자가 전달한 R04 정상 경로 최종 확인과 미종료 시험 건 조회 요청에 따라 PostgreSQL 및 n8n metadata를 읽기 전용으로 대조했다. 실제 Jira/문의/소유자 식별자와 원시는 VM 비공개 인계에 보존했다.

해당 시험 건은 과거 실행279다. DB unknown/B29/partial_effect/revision3, 최종응답 없음이다. DLQ1건 pending/attempts1이며 생성 효과 confirmed, 배정 failed/assignee_unmapped, 종료·문맥저장·알림 none이다. 복구 action=assign과 known Jira 참조를 보존한다. 종료 실패가 아니라 배정에서 중단되어 종료를 시도하지 않은 상태다.

원 n8n 실행279는 success 및 stoppedAt 존재로 종료됐지만, 이는 오류를 정상 응답으로 처리한 실행 종료이며 업무 성공이 아니다. 현재 정상 통과305와 다른 요청이다. 자동 재개 드라이버가 없으므로 이 건을 재전송/재종료하거나 DB/DLQ를 완료로 바꾸지 않고 수동 확인 대상으로 보존한다. 이번 조회에서 Jira쓰기·DB변경·재시도는 없었다.

R04의 Jira/state/save/Discord 정상 대조 통과는 사용자 전달 회신으로 취합한다. 직접 PR 댓글의 동일 회신은 이번 gh 조회에서 확인되지 않아 수령 경로를 구분한다. R05 공식 전체 판정과 다른 역할 잔여 확인은 별도다.
