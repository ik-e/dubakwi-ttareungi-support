# VM Jira D03 티켓 대조 및 Discord 계정 경계 확인

- 실행 ID: `20261108-152100-vm-jira-d03-crosscheck` (KST)
- 실행 시각: 2026-11-08 15:21 KST
- 환경: 기존 PR36 Discord 봇, Edge Jira 로그인 세션, 로컬 채널 어댑터 검사
- 범위: 직전 D03 후속 응답의 Jira 이슈 대조, 등록 사용자 매핑 경계 검사

## 결과

| 검증 | 판정 | 관측 |
| --- | --- | --- |
| D03 Jira 티켓 재사용 | 통과 | Discord 후속 응답에서 확인된 synthetic Jira 이슈를 열었다. Jira 설명의 `case_id` 및 `first_request_id`가 Discord 흐름의 연결 건과 일치하고, Jira 댓글의 `dubakwi-case-context:v1` 기록에 revision 1, 2, 3과 동일한 `ticket_key`가 남아 있다. 추가 후속이 새 이슈 대신 같은 티켓에 기록된 것을 확인했다. |
| 담당자 전달 기록 | 부분 통과 | Jira 담당자 필드에 담당자가 지정되어 있고, 최신 전달 기록에 역할 `support`, 부족 정보 및 보완 횟수가 보인다. 실제 담당자가 읽고 처리했는지, Discord 알림을 받았는지는 확인하지 않았다. |
| Jira 처리 상태 | 관측 | 이슈 상세에서 상태는 `해야 할 일`(To Do)로 보였다. 이 실행에서는 상태를 변경하지 않았다. |
| 등록/미등록 사용자 경계 | 단위 검사 통과, 실 UI 미실행 | `parse_user_map`의 알려지지 않은 Discord ID 조회 결과와 설정 검사를 포함해 `uv run --locked python -m unittest tests.channels.test_discord_bot`의 22개 테스트가 통과했다. 봇 코드도 사용자 매핑 누락 시 지원 webhook 호출 전에 거부 응답을 반환한다. 다만 해당 interaction 분기 자체를 모의 Discord 상호작용으로 호출하는 테스트나 별도 계정의 실제 UI 결과는 이번 실행에서 얻지 않았다. |
| 별도 임시 Discord 계정의 라이브 경로 | 미실행 | 실제 별도 Discord ID의 세션을 사용하지 않았다. 저장소의 `citizen-a/b/c`는 내부 테스트 사용자 ID이며 Discord 플랫폼 계정 자체가 아니다. 타인의 ID를 사용하거나 기존 운영 매핑을 임시로 바꾸지 않았다. |

## 한계 및 후속

- Jira 티켓의 댓글과 현재 담당자 필드는 관리자 화면에서 확인했지만, 담당자 본인의 열람 및 실제 Discord 수신은 별도 증거가 없다.
- D05는 매핑 함수 단위 검사와 코드 경로 검토까지만 했다. 사용자 관점의 실 Discord 시험에는 별도 임시 Discord 계정 또는 승인된 시험 계정의 세션과 해당 계정의 서버 매핑이 필요하다.
- 기존 D03 원 실행 기록은 수정하지 않는다. 이번 교차 확인은 [D03 실행 기록](../20261108-144900-vm-discord-d03-verified/report.md)을 보강하는 별도 증거다.
