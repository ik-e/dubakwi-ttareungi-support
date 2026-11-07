# TC-15 재개: 시험 웹훅 인증 점검

- 실행 시각: 2026-11-07 21:46 KST
- 환경: aio-t2 VM, Edge Web SSH 및 n8n UI
- 대상: 게시된 시험용 `pr36A657DualSupport` / `pr36A657DualHandoff` 복제본
- 판정: 중단, TC-15 미실행

## 관측

- 사용자가 Edge 웹 SSH 로그인 완료를 확인했다. SSH를 별도로 직접 열지 않고 기존 Edge 웹 터미널만 사용했다.
- 웹 터미널에서 `FLOW_WEBHOOK_KEY`와 `DUBAKWI_WEBHOOK_TOKEN`은 모두 미설정이었다. n8n과 runner 컨테이너 환경변수 이름을 검사했지만 해당 webhook key는 노출·제공되지 않았다.
- n8n UI에서 Support 복제본의 B01 수신 트리거는 비활성 상태였다. 원본 Support JSON 및 n8n 노드 설정은 Header Auth 자격 증명 이름 `dubakwi-team-key`를 참조한다. 시험 복제본 수신 경로는 이 인증 경계를 유지한다.
- Support B01 및 Handoff H01의 비활성 상태를 변경하지 않았다. n8n 인증을 약화하거나 자격 증명값을 추출하지 않았다.
- TC-15 synthetic POST는 한 건도 보내지 않았다. Jira 티켓, PR36 공유 DB 상태, DLQ, Discord 효과는 이번 점검으로 새로 발생하지 않았다.

## 다음 조건

기존 `dubakwi-team-key`를 안전하게 사용하는 실행 경로(예: 인증된 사내 runner)가 확인되면, 승인된 TC-15 첫 요청과 동일 case 후속 요청을 수행한다. 자격 증명값을 채팅이나 보고서에 기록하지 않는다. 인증 없는 webhook으로 사본을 바꾸는 것은 본 시험의 허용 범위로 간주하지 않는다.

## n8n UI 설정 재확인

- 시험 Support B01의 path는 dubakwi-pr36-dual-support다. Authentication은 Header Auth이며 선택된 credential 참조는 dubakwi-team-key다. credential 비밀값은 조회하거나 기록하지 않았다.
- B01은 Deactivated 상태이고 Listen for test event는 비활성화되어 있다. 활성화하거나 저장/게시하지 않았다.
- 이 확인으로 기존 credential이 VM 셸에서 바로 쓸 수 없다는 점과, 테스트 복제본도 별도 인증이 필요하다는 점을 재확인했다. 실행 경로가 생긴 것은 아니다.
