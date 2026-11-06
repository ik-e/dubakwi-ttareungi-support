# PR36 현행 상태 보완

2026-11-06 KST, R01. 이번 변경은 이미 확인한 VM 토큰 상태와 R03 검토/검색 실행 증거를 취합하고 #40 최신 변경을 로컬 재검사한 기록이다. 새 VM 호출·봇 기동·Jira/DB 변경은 하지 않았다. [기계 판독 요약](summary.json)을 따른다.

## 토큰 준비 완료

사용자가 숨김 입력 도구로 입력한 뒤 같은 채팅의 VM 확인에서 파일 비어있지 않음·0600·UID/GID65532를 확인했다. 기존 이미지의 network none/read-only 일회용 컨테이너에서 UID65532 읽기가 성공했다. 값은 출력하지 않았다. 이는 파일 준비 확인이며 Discord 로그인 유효성·봇 접속 성공을 뜻하지 않는다. 이전 증거의 토큰 미입력은 당시 관측으로 보존한다.

## Discord 최신 변경

#40 fc292314는6cda17d 대비 invalid_case_ref/case_access_denied 안내를 같게 하고 unknown_user 안내를 추가했다. 요청 구성/성공 응답 변환은 변경하지 않았다. R01 독립 작업본 어댑터20/20·관련4파일Ruff check/format통과다. 커밋 메시지의 R05 검토 언급을 정식 전체 승인으로 확대하지 않는다. 기존R02 계약확인과 최신변경검토·배포승인을구분한다.

## 검색 검토와 실제 실행 연결

[R03 검토](https://github.com/ik-e/dubakwi-ttareungi-support/pull/36#issuecomment-6677639989)는n8n2.42.6 load모드의includeDocumentMetadata누락이기본true라는소스검토다. 이 검토 자체가 VM 실행은 아니다. 별도 [최초 실제 실행](../20261106-142002-mixed-p19-first-run/report.md)의 검색259는해당현재VM본으로public근거5건·기대QR절2위를반환했다. 이 두 증거를연결해이번시민질문의검색준비를확인하며, 전체역할별권한·검색품질통과로확대하지않는다.

G0~G2 완료 유지, G3는B17시간게이트와담당매핑미확정으로목표미통과, G4는토큰/환경준비완료이나미기동, G5는미실행이다. 정상문의실패와known효과·DB unknown·DLQ pending은그대로보존한다.
