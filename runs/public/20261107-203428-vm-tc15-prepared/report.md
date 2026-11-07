# TC-15 라이브 워크플로우 사본 준비 및 import 차단 기록

- 실행묶음 ID: `20261107-203428-vm-tc15-prepared` (2026-11-07 KST)
- 기준: PR36 게시 워크플로우를 Edge 웹 n8n에서 직접 내보낸 사본
- 상태: **준비 완료, VM import·실행 미실시**
- 사용자 승인: 시험 사본 import·일시 활성화·synthetic 요청 2건·비활성화 승인 완료

## 확인한 내용

이전 사전 점검 뒤 n8n UI에서 게시 중인 PR36 support와 Jira handoff JSON을 각각 내보냈다. 내보낸 두 JSON을 기초로 운영 ID와 webhook path를 분리한 비활성 TC-15 시험 후보를 만들었다. Support의 handoff 연결만 시험용 경로로 바꾸고 PR36 state 및 DLQ 자식 workflow 참조를 보존했다. Handoff 사본은 Discord 노드를 synthetic HTTP 503 결과로 교체해 외부 Discord 전송을 차단하도록 구성했다. 두 사본의 `active`는 false이며, credential 참조는 유지되고 JSON 내 비밀값 패턴 검사는 0건이었다.

별도 로컬 구조 대조에서 라이브/후보 모두 support 54개, handoff 71개 노드를 유지했다. 후보에서 바뀐 노드는 각각 webhook 수신 경로와 support B27 handoff 전달, handoff webhook 수신 경로와 H11 알림 고장 주입 노드뿐이었다. 테스트 후보 ID·수신 경로는 운영본과 달랐고 Jira 노드 구성은 그대로였다.

내보낸 원본과 시험 후보 JSON은 webhook·credential 참조를 포함하는 비공개 로컬 파일이라 Git에서 제외했다. 가린 manifest와 해시만 비공개 증거의 존재/연결 확인에 사용한다.

## 중단 지점과 부작용

Import from file을 Edge에서 시도했지만 ChatGPT 브라우저 확장의 로컬 파일 접근이 꺼져 있어 파일 선택이 차단됐다. 이 권한은 사용자가 직접 켜야 하는 확장 설정이며 본 실행에서는 변경하지 않았다. n8n의 Import from URL 경로도 열어 보았으나 로컬 사본을 VM에 안전하게 전달하는 URL을 제공할 수 없어 실행하지 않았다.

따라서 시험 사본은 VM에 import/활성화되지 않았고 synthetic 요청도 보내지 않았다. Jira 이슈, Discord 메시지, PR36 공유 state/DLQ 기록을 새로 만들지 않았다. 운영 워크플로우를 변경·비활성화하지 않았다. **TC-15 결과는 미실행이며 통과로 판정하지 않는다.**

계속하려면 Edge에서 ChatGPT 확장의 “Allow access to file URLs” 권한을 사용자가 직접 켜야 한다. 그 뒤 승인된 시험을 두 요청만 실행하고, 복제 workflow 두 개를 비활성화한 다음 Jira/state/DLQ/execution 결과를 대조한다.

## 증거

- [가린 실행 요약](summary.json)
- 비공개 원본/후보 manifest: `runs/20261107-203428-vm-tc15-prepared/private-manifest.json`
- 이전 상태의 [실행 전 차단 기록](../20261107-203213-vm-tc15-preflight/report.md)은 원본으로 유지한다.
