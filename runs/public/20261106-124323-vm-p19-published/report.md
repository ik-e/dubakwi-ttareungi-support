# R01 정상 Webhook 시험 사본 게시·R02 인계

2026-11-06 KST, P12/P19/P20. 사용자의 순차 진행 지시에 따라 #36의 정상 Webhook 1건을 위한 R01 환경 준비를 수행했다. **G1/G2 준비는 완료됐고 정상 문의 자체와 Discord 종단은 아직 실행하지 않았다.** 키·실제 서버/계정/환경 ID·원문은 저장소 밖 비공개 인계에만 둔다.

## 검토 취합과 main

기존 r05 채팅에서 사용자가 전달한 R05의 `86d78e7/8c53cf7` 실패·재전송 계약 검토를 찾아 취합했다(2026-11-06 KST, 원 Discord 링크·일시 미제공). 요청한 동일scope·운영알림/이중실패 한계·운영자 처리 인계는 #39에 정리됐으며 재개 미구현과 실제 오류 종단 미실행을 유지했다. R05의 전체 VM 승인으로 확대하지 않았다.

R02 [H 시간 행 정정](https://github.com/ik-e/dubakwi-ttareungi-support/pull/27#issuecomment-6675797984)은 소유자의 문구 인계로 원장에 기록한 뒤 `fc20425`에서 대리 반영했다. B27 timeout의 ticket_unknown/requires_review와 B27 전 deadline_exceeded를 구분했다. 업무 JSON/SQL은 `a930e24`와 같다. main의 원장 추가 기록 충돌은 양쪽 기록을 보존해 해결했다.

#27은 main `6849421`, #28은 main `c6dd178`로 병합했다. 결합 회귀89건 중82통과·실제HTTP7생략, Ruff61파일 및 문서/공개 검사 통과. R02에는 [#16 main 동기화 인계](https://github.com/ik-e/dubakwi-ttareungi-support/pull/16#issuecomment-6676356423)를 남겼다. 기존 합의의 별도 사전 시험 범위에서 support는 요청받은 `c5ed5fa`를 고정했고, #16의 정식 main 병합/새 head 자동 반입으로 표현하지 않는다.

## DB 적용

VM 저장소 사본을 검토된 main `c6dd178`에 고정하고 PostgreSQL owner 계정으로 custom archive 백업37396바이트를 생성했다. `pg_restore --list`가 통과했으며 이번 백업을 실제 복원하지는 않았다. 요청5행/DLQ1행의 전체 행 집계 해시를 적용 전후 대조해 같음을 확인했다.

SQL005→006→007을 해시 대조 후 적용했다. case_lookup/case_begin 존재·기존 runtime EXECUTE 권한·잘못된 입력 거절·DELETE 권한 거절을 확인했다. **이전 보고의 “SQL007 인덱스”라는 설명은 정정한다. SQL007은 dlq_apply 함수 교체이며 인덱스 부재로 적용 여부를 판정할 수 없다.** 이번에는 적용 전 함수 본문의 `_dedupe_ref` 부재와 적용 후 존재를 직접 확인했다. 현재003의 변경분도 같은 DLQ 함수 부분이므로007로 반영됐으며 다른 state 함수를 불필요하게 재적용하지 않았다.

## 반입과 게시

기존 운영/팀 시험 사본을 덮어쓰지 않고 별도 ID·경로로 state20/DLQ6/handoff48/errors8/support54노드를 준비했다. 하위 기능은 main의 원본(업무 파일은 a930e24/8c53cf7과 같음), support는 c5ed5fa다. Credential 이름·종류가 정확히1개인지 확인해 환경 ID를 연결했다. 담당 매핑은 빈 객체로 두었으므로 정상 안내 시험 전용이며 이관 담당 설정 완료가 아니다.

R02 생성기는 support/errors만 생성한다. state/DLQ/handoff는 main 원본을 별도로 렌더링했다. VM 호스트에 Node가 없어 생성기의 scope 실행 검사가 None으로 생략됐음을 기록하고, 컨테이너 Node로 E02의 env 접근 허용/차단 두 경우를 별도 검증했다. 이어 실제 n8n의 수동 scope 검사 실행 **254**가 성공했다. 해당 Code의 마지막 Check는 scope=`dubakwi-p19-real`·storage_ready=true를 단언하며 저장/Jira 호출은 없다.

첫 CLI 반입은 복사 파일의 root0600 소유권 때문에 EACCES로 실패했고 반입0개를 확인했다. n8n UID에 파일 소유권을 맞춘 재시도가 성공했다. H01은 원본에 Header Auth 연결이 없어 첫 게시가 거절됐으며 기존 internal Credential을 명시적으로 연결했다. 다음 게시 거절은 하위 state 미게시였으므로 **state → DLQ → errors → handoff → support** 순서로 정상 UI 게시했다. 실행 중 n8n에 즉시 반영되지 않는 CLI publish나 서비스 재시작을 사용하지 않았다.

게시 후 기존 워크플로우의 nodes/connections/settings/active/version 참조가 적용 전과 같았다. 새 사본의 코드·연결·오류 처리 설정과 Credential을 대조했다. handoff의 UI 저장에서 GET/json/database 기본값 생략과 조건 strict 기본값 명시26건이 발생해 허용된 기본값 정규화만 확인하고 재반입용 기능 사본과 게시 버전·해시를 새 비공개 manifest에 보존했다. raw JSON이 바이트 동일하다고 주장하지 않는다. 원 렌더본·실패 이력도 보존했다.

## 호출 가능 확인과 인계

| 대상 | 무인증 | 올바른 기존 키 + 빈 입력 |
| --- | --- | --- |
| support 시험 Webhook | 403 | 400 invalid_input |
| handoff 시험 Webhook | 403 | 400 invalid_tool_request |

빈 입력 실행은 **255·256**이며 사용자 조회/LLM/검색/Jira/업무 상태 변경으로 진행하지 않았다. 로컬 Windows에서 외부 HTTPS support 경로의 무인증403도 확인했다. 인증 점검 뒤에도 기존 업무 행 해시는 같다.

비공개 R02 인계 JSON에는 실제 HTTPS URL·X-Team-Key·기존 시험 키·등록 사용자·manifest·Executions 조회 URL·원복 방법이 들어 있다. 파일0600, 배포 디렉터리0700이며 키를 출력/커밋/공개 댓글로 전달하지 않았다. 실제 반입 manifest에는 원본 해시와 게시 버전·내보낸 사본 해시·이미지 태그/이미지 ID를 구분했다.

다음은 R03 질문/기대 근거를 고정한 뒤 R02가 새 request_id·case_ref 없이 등록 사용자로 정상1건을 호출하는 것이다. 최초 실패와 known ID를 보존하고 새 요청 반복으로 숨기지 않는다. 예상 밖 이관이 나오면 담당 매핑이 준비된 것으로 가정하지 말고 중단해 보고한다. R04는 Jira 생성1/안내 종료와 DB completed/최종응답을, R05는 근거/응답/실행 증거를 대조한다. Discord 연결은 그 다음이다.

R02의 후속 문서 a83ba59는 R03 질문 “QR이 안 읽혀요. 자전거번호로 대여하는 방법을 알려주세요.”와 기대 근거 rental-guide / QR 인식 또는 잠금 해제가 어려운 경우를 확정했다. c5ed5fa와 support JSON은 같아 현재 게시 기준을 바꾸지 않았다.
