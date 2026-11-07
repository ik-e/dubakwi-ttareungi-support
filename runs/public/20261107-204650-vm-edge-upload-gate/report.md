# Edge 로컬 workflow 파일 업로드 경계 재확인

- 실행묶음 ID: `20261107-204650-vm-edge-upload-gate` (2026-11-07 KST)
- 환경: 사용자 Edge 브라우저의 n8n 페이지, Computer Use 파일 chooser
- 범위: 이미 승인된 비활성 handoff 시험 후보의 파일 선택 가능 여부만 재확인
- 결과: **차단 재현. import/저장/활성화 전에 실패**

사용자가 VM·n8n 접근 권한은 정상일 수 있다고 지적해, 설정을 변경하지 않고 n8n `More actions → Import → From file`을 다시 시도했다. 파일 선택 단계에서 Edge의 ChatGPT 확장이 로컬 파일 접근 권한이 필요하다는 안내와 함께 거부했다. 따라서 n8n 계정/API 권한 문제가 아니라 브라우저 확장 로컬 파일 접근 경계가 실제 차단점임을 재확인했다.

이 확인은 업로드나 import를 완료하지 않았다. 운영/시험 workflow, Jira, DB, DLQ, Discord에 변경·요청·알림이 발생하지 않았다. 확장 권한은 변경하지 않았다. 확인 전까지 TC-15는 미실행이다.

재개 조건: Edge에서 ChatGPT 확장 상세의 `Allow access to file URLs`가 켜진 상태여야 한다. 사용자가 설정을 확인/변경한 뒤 알리면 기존 승인 범위의 시험 사본 import를 이어간다.
