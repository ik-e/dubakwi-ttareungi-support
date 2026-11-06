# R04 VM 첫 연결시험 묶음

이 문서는 기존 P11/P19 게시본과 운영 자료를 바꾸지 않고 별도 비활성 시험 사본에서 실행한다. 키·토큰·Credential ID·accountId·원문 로그는 공개 결과에 남기지 않는다.

## 적용 전 확인

1. 대상 커밋, workflow ID, PostgreSQL 마이그레이션 001~006, 사용자 API와 Jira Credential을 비공개 기록에서 확인한다.
2. `check_r04_assignee_map.py <map.json> --candidates-file <jira-candidates.json>`로 support/security 매핑을 검사한다.
3. `request_state_one_active_case_idx`가 존재하고 runtime 계정에 스키마 변경·DELETE·TRUNCATE 권한이 없는지 확인한다.
4. 시험 전 기존 Jira 이슈·DB 자료를 일괄 삭제하지 않는다. 시험 전용 scope와 고유 request_id를 사용한다.

## 실행 순서와 기대 결과

| 순서 | 입력/고장 | 기대 결과 |
| --- | --- | --- |
| 1 | 등록 시민의 정상 문의 1건 | 사용자 조회→검색→Jira 생성→bind→종료→finish, 응답 1건, DLQ 0 |
| 2 | 1번과 동일 request_id·동일 입력 재전송 | 저장 응답 replay, Jira 추가 생성·배정·알림 0 |
| 3 | 같은 case_ref의 보완 요청을 동시에 2건 | DB 활성 case 처리권은 1건만 획득, 나머지는 pending/case_busy. Jira 추가 생성 0 |
| 4 | Jira 생성 5xx/응답 유실 | `tickets_down` 또는 `ticket_unknown`, known ID를 추측하지 않음, DLQ 1건 이하 |
| 5 | bind/state 중단 | 알려진 Jira ID 보존, 이후 종료·배정·알림 0, `state_error`와 복구 자료 |
| 6 | 알림 성공 뒤 같은 이관 재요청 | Jira 성공 표식 확인, 재배정·재알림 0 |
| 7 | 알림 시도 뒤 결과 미확인 재요청 | 자동 재알림 0, `partial_effect`, 수동 확인 복구 자료 |

각 실행은 HTTP 상태, 가린 응답, n8n 실행 ID, Jira key, state revision, DLQ ID와 호출 횟수만 기록한다. 전체 S1은 1번의 모든 단계와 최종 저장이 실제 VM에서 확인될 때만 통과로 판정한다.

## 정리와 복구

- 시험 workflow를 비활성화하고 Webhook 404를 확인한다.
- 시험 전용 Jira 이슈는 삭제하지 않고 `R04-TEST` label로 식별해 R01이 정한 전환으로 종료한다.
- DB 정리는 runtime 계정으로 하지 않는다. R01이 승인한 시험 DB·owner 절차만 사용한다.
- 기존 P11/P19 게시 상태, Credential 행 수, n8n healthz와 PostgreSQL 재시작 후 상태를 전후 비교한다.

## 현재 제한

- `(scope, case_id)` 활성 고유 인덱스는 같은 case_ref의 동시 처리권을 막는다.
- case_ref가 없는 서로 다른 신규 요청은 동일 문의인지 DB가 알 수 없으므로 Jira label 선조회만으로 생성 원자성을 보장하지 않는다. 실제 Jira 동시 시험 전에는 검색 지연 중복 생성 해결 완료로 판정하지 않는다.
