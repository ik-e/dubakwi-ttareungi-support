# 시연 리허설 서버 기록 대조 — 2026-11-09

사용자가 VM 웹 SSH에 재로그인한 뒤 같은 리허설 요청을 읽기 전용으로 확인했다. 새 Discord 문의·Jira 변경·서비스 재시작·로그 설정 변경은 수행하지 않았다. 앞선 [UI 관측](report.md)의 예외 사유 미확인을 이 기록으로 보완한다.

## 확인한 경로와 결과

운영 Discord 컨테이너의 `DUBAKWI_SUPPORT_WEBHOOK_URL`은 PR36 Support 경로였다. 현재 실행 이미지 표시는 Discord `pr36-1328c63`, user-api와 n8n 경계 이미지 `pr36-a657890`이었다. 태그 관측이며 로컬 HEAD와 VM 전체 소스가 일치한다는 증거는 아니다.

리허설의 같은 요청 ID로 업무 DB의 저장 응답과 data-api `/logs`의 B33 감사 메타데이터를 대조했다. 조회는 `BEGIN READ ONLY` 및 GET이었다. 처음 참고한 PR36 별도 보관 DB에는 대상 행이 없었고, 실제 운영 service DB에서 다섯 행을 찾았다. 자료가 없는 첫 조회를 서비스 미실행으로 해석하지 않았다.

| 장면 | 저장 상태 | 응답 경로 | 응답 사유 | 출처 수 | 같은 요청의 감사 기록 |
| --- | --- | --- | --- | --- | --- |
| QR 안내 | completed | 자동 답변 | 없음 | 1 | B33·HTTP 200·자동 답변 |
| 반납 최초 | completed | 보완 질문 | 없음 | 0 | B33·HTTP 200·보완 질문 |
| 반납 첫 보완 | completed | 보완 질문 | 없음 | 0 | B33·HTTP 200·보완 질문 |
| 반납 두 번째 보완 | completed | 담당자 이관 | attempt_limit | 0 | B33·HTTP 200·attempt_limit |
| 해외 이용 질문 | completed | 담당자 이관 | no_evidence | 0 | B33·HTTP 200·no_evidence |

정상 응답의 agents는 triage·retriever·writer·verifier였다. 나머지는 triage만 포함했다. agents 목록을 전체 실행 노드 이력으로 해석하지 않는다. 해외 이용 요청은 저장 응답과 감사 기록 양쪽에서 `no_evidence`여서 `needs_human` 직접 분기와 구분된다. 검색 빈 결과의 표준 이관 사유와 맞으며, 검색 근거 없음 시연으로 사용할 수 있다. 노드별 SearchResult 원문이나 검색 점수는 저장된 상세 실행에서 확인한 것이 아니다.

`completed`는 해당 요청의 응답 저장·처리 완료다. 담당자 Jira 티켓의 업무 완료와 다르며, 반납 티켓은 앞선 리허설에서 진행 중으로 바꿨다. HTTP 200을 실제 반납·환불 성공 또는 전체 시나리오 성공률로 해석하지 않는다.

## n8n 실행 화면과 별도 기록의 차이

앞선 UI 확인에서 성공·실패·수동 실행·진행 저장은 모두 `Do not save`였다. n8n 상세 이력의 부재와 업무 DB·별도 감사 메타데이터의 보존은 서로 다른 저장 경로다. 이번 다섯 요청은 실제 저장 결과와 감사 로그가 남았으므로 실행되지 않았다는 해석은 맞지 않는다.

이 확인을 위해 실행 저장을 켜거나 Credential·워크플로우·DB 행을 수정하지 않았다. 이전 보고서의 SQLite `running` 잔류 원인은 이번 작업에서 새로 조사하지 않았으며 해결됐다고 표시하지 않는다.

## 증거 보존과 발표 반영

실제 요청·문의·Jira·execution 연결값은 비공개 `runs/20261109-001140-vm-demo-rehearsal/backend-confirmation.json`에 기록했다. 웹 SSH 화면은 `backend-request-results.jpg`, `backend-audit-results.jpg`로 보존했다. 공개본은 가상 질문의 결과와 최소 메타데이터만 제공한다.

[확정 조작 절차](../../../docs/project/presentation/demo-rehearsal-runbook.md), 발표 9장 대본·화면 조작·근거·필수 산출물 대응에서 미확인 문구를 갱신했다. 반납은 보완 한도, 해외 이용은 검색 근거 없음이라는 서로 다른 이관 이유를 설명한다. 원본·상호작용·이전 날짜의 증거를 유지한다.

연속 5분 발표·현재 응답 성능·알림 수신·API 장애·DLQ 복구·전체 회귀는 별도다. 이번 요청의 대표 기능 리허설과 서버 기록 대조를 완료한 것이며 프로젝트 전체 완료 판정이 아니다.

발표 현행 버전 `story12-rehearsal-confirmed-20261109`의 정적·DOM 검사 53개가 통과했다. 로컬 발표 패키지의 `checks/story-check-2026-11-08T20-48-51-979Z.json`에 새 검증을 남겼다. 이전 미확인 단계의 발표 파일과 날짜별 사본·검사 결과를 보존했다.
