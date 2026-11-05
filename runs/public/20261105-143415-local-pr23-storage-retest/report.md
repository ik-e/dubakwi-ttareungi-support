# PR #23 수정본 재검토

2026-11-05 KST · R01 P18/P12 · 대상365c419. 사용자가 PR #23/#25 완료 처리를 요청해 기존 실패 세 경계를 재시험했다. R04 SQL/JSON 원본은 수정하지 않았다. [구조화 결과](summary.json)를 따른다.

## 실제 결과

로컬 격리 PostgreSQL16.15에 원본001~004를 적용했다. 제공 제약 시험·수정 함수 시험(owner와 runtime 각각)·runtime-role 계약과 CREATE/DELETE/TRUNCATE/ALTER/DROP 거절을 확인했다. 기존 VM·서비스·Credential은 변경하지 않았다.

| 재시험 | 관측 | 판정 |
| --- | --- | --- |
| null-ref fail | 무소유는skipped, 소유 요청은unknown/revision1 저장. 원본S03 IF는DB로전달·S05정규화일치 | 기존 결함 해소 |
| stale/completed 대조군 | 예전revision prepare 거절, completed에null-ref fail은skipped·완료행보존 | 통과 |
| 활성 DLQ 중복put | reprocessing/revision1/복구execution보존, 현재revision을알아도두번째claim거절, 원claim resolve대조군성공 | 기존 결함 해소 |
| Jira 미확인save | attempt7/expected_case_version999의save가ok=false/tickets_down/recovery반환, DB는processing/revision1유지 | 거짓 성공 차단 |

첫 실행은 ALTER가 올바르게 `must be owner of table`로 거절됐지만 임시 harness가 `permission denied` 문자열만 허용해 중단했다. 첫 출력은 비공개 임시 증거에 보존했다. SQL/JSON을 바꾸지 않고 정상 소유권 거절 문구도 인정하도록 harness를 수정한 두 번째 실행에서 전체 검사가 통과했다. 서비스 실패를 통과로 덮어쓴 것이 아니다.

## 병합 판단

R01의 세 수정 요청은 저장/안전 실패 범위에서 해소됐다. 해당 버전은 **state/DLQ 저장 구현과 미준비 Jira 안전 차단 범위로 승인 가능**하다. 실제 Jira 문맥·보완 횟수·버전 갱신과 S1 정상 저장은 아직 미완료다. save가tickets_down으로중단되는것을정상접수/종료성공으로집계하지않는다. case_ref도Jira확인전case_verification_required를유지한다.

공통 unittest45건 중38통과·HTTP7생략, Ruff check/format40파일 통과. 새 보고서 전 문서20개/링크427개/앵커50개·공개 후보140개/링크493개 오류0을 확인했다. 새 증거의 링크/공개 후보/JSON/diff는 별도로 확인한다. tscan/Gitleaks 미제공으로 후보 검사는 부분 대체다.

로컬컨테이너는종료/자동제거했다. 실제n8n/Postgres접속·VM기동·비밀등록·실제동시복구·재시작/백업/복원·Jira·S1을이번통과에포함하지않는다. 신뢰된합성finish대조군의성공은Jira효과확인이아니다. PR #25는R04검토요청이남아있으며배포준비본검토와물리DB채택/VM적용조건을별도로유지한다.
