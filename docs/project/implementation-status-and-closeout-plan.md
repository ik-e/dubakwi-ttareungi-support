# 구현 현황과 사용자 기준 마감 계획

- 작성일: 2026-11-08 KST
- 버전·상태: v3.7 / R02 새 UX 개선만 담당, R01 기존 업무 로직 통합·마감. TC-15 격리 State/DLQ 및 Support/Handoff 사본은 게시했으나 VM 요청 경로가 없어 요청 0건; Support B01·Handoff H01 트리거를 비활성화했다. 종단 시험은 미판정. TC-07 migration 010 finish 및 VM inspect가 확인됐다. migrations 011~016의 CAS claim/resume/effect-aware release/verified complete는 disposable DB에서 통과했으며 VM에는 미적용이다. VM read-only preflight에서 서비스 DB에 recovery dispatcher가 없음을 확인했다. operator workflow와 Handoff capsule 계약을 보강했다. release가 재개 action의 최종 효과 판정을 failed/unknown/confirmed로 기록하고 unknown 다음 claim을 Jira 재확인까지 막는 계약을 2026-11-08 disposable PostgreSQL에서 검증했다. 운영자가 Jira에서 실제 효과를 대조·수행한 뒤 complete를 제출해야 한다. create/alert producer capsule, 실제 Jira/VM 시험, stale claim 운영 절차는 미완료
- 기준 코드: `main` `6f9561b` (PR #36 통합본과 후속 PR #46~#50 반영)
- 기준 실행: [PR #36 실제 VM 통합 검증](../../runs/public/20261107-170503-vm-pr36-integration/report.md)
- 결정 방식: 사용자는 R01이 PR #36처럼 전체 마감을 통합 추진하고 타 역할의 검증 회신을 기다리지 않도록 지시했다. 이 문서는 R01 관측·판정만 기록하며 타 역할 승인이나 미실행 시험을 만들어내지 않는다.

## 1. 완료 기준

시민은 내부 모듈을 알 필요가 없다. 지원 범위에 든 문의를 했을 때 기대한 안내·보완·조회·담당자 연결을 받고, 담당자는 Jira에서 이관 내용을 확인해 업무를 처리할 수 있어야 한다. 실패 때 시스템은 성공했다고 꾸미거나 외부 변경을 중복 실행하지 않고 운영자가 확인할 자료를 남겨야 한다.

| 사용자·운영 결과 | 완료 조건 |
| --- | --- |
| 시민 문의 처리 | 대여·반납·고장·요금/환불·후속 조회·개인정보/보안의 설계 시나리오가 입력·권한·긴급도·보완 횟수에 맞는 안내, 보완 요청, 본인 조회, 이관 또는 거절 결과를 낸다. 근거 부족·조회 실패·모델 실패는 추측 답변으로 바꾸지 않는다. |
| RAG·에이전트 답변 | 허용 문서만 검색하고 답변 내용과 인용 근거가 일치한다. 공개/제한 권한, 빈 결과, 오류, 검증 실패를 실제 배포 경로에서 확인한다. 제한 근거·내부 설명·근거 없는 완료 주장이 시민 응답에 나오지 않는다. |
| Jira 티켓 생애주기 | 신규 접수, 같은 요청 재전송, 보완, 담당 이관, 안내 종료, 본인 조회의 티켓·상태·문맥이 서로 맞는다. 중복 생성은 없고 담당자·우선순위·필요 맥락이 보존된다. |
| 담당자 처리 가능 | 배정된 담당자가 Jira에서 티켓과 가린 맥락을 확인하고 실제 담당 업무를 수행할 수 있다. Jira API의 알림 수락은 사람의 수신·확인으로 간주하지 않는다. Jira 변경 후 시민 조회가 실제 상태를 반영하는 경로도 확인한다. |
| 오류·DLQ·복구 | 단계별 고장으로 성공·실패·효과 미확인을 구분한다. known Jira ID와 복구 정보가 남고 DLQ 중복 기록이 통제된다. 원 요청 종료·외부 효과·처리권 확인 없이 자동 재전송하지 않는다. 운영자의 수동 확인·해결 절차를 따라가며 범위 밖 자동 재개는 미구현으로 표시한다. |

자동 해결률 자체는 완료 조건이 아니다. 안전한 담당자 이관이 해당 시나리오의 기대 결과일 수 있다. 반대로 응답 HTTP 200만으로 업무 효과를 통과 처리하지 않는다.

## 2. PR #36 이후 구현·검증 기준선

| 영역 | 현재 증거 | 현재 판정과 빈틈 |
| --- | --- | --- |
| 정상 시민 종단 | 실제 Discord 비공개 응답 → 등록 사용자 확인 → 분류 → RAG → 답변/검증 → Jira 종료 → PostgreSQL completed/save → 독립 재조회가 일치했다. 대표 실행은 11.988초, 별도 표본은 14.817초·9.934초다. | 정상 경로가 실제 연결됨. 8초 목표는 충족하지 않았고 표본 수로 일반 성능을 보장하지 않는다. |
| 보완·이관·조회 | 기존 실행의 Jira 생성·문맥·배정·알림 API 수락에 더해, [2026-11-07 Edge VM 종단](../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md)에서 같은 티켓 보완, owner/other/missing 조회, Jira 완료 전환 뒤 owner 조회 `closed`, DB completed/respond와 DLQ 0을 관측했다. | 상태→시민 조회 연결은 synthetic ticket으로 확인. 현재 Jira 로그인으로 테스트 전환했으므로 배정된 직원이 직접 처리했다는 증거, 사람의 Discord 수신, 실제 환불 완료는 아니다. |
| RAG와 권한 | 최신 통합 검증에서 44청크를 재색인했고 실제 QR 질문의 근거 응답을 확인했다. [추가 로컬 표적 검사](../../runs/public/20261107-204523-local-rag-contract/report.md)에서 artifact 4개, 청킹 경계 7개, 오프라인 role filter 2개, 실제 B05→B13→RAG Validate Code fixture 7개와 producer/consumer fixture 3개가 통과했다. | 로컬 계약/fixture 결과이며 AUTH03/05/07의 일부도 모의 입력이다. 실제 VM 검색·사용자 identity API·권한별 증거/인용·오류와 Discord 종단은 미완료. HTTP RAG 7개도 OpenAI 사용료·내부 key·실행 webhook을 필요로 해 이 번들에서는 실행하지 않았다. |
| 업무·장애 회귀 | 기존 41개 정의 중 40개를 실행, 사례 assertion은 38개 충족·2개 불일치였다. 정상 29개/36단계와 장애 17개 실행묶음/21단계의 외부 효과 대조 불일치 0건이 보고됐다. 실행 정의 밖 준비 중단·반복도 별도 기록됐다. | 이 수치는 R01 VM 관측이며 공식 전체 PASS가 아니다. WF-11의 6초는 guide 예시 assertion이고 8.288초는 20초 운영 deadline 내 안전 이관이다. TC-15 원 기대 충돌·별도 격리 시험, TC-07의 실제 Jira finish 및 복구 action 확인이 남았다. |
| UX Jira·Discord 알림 | PR #49는 새 UX Jira 프로젝트 유형 `10003`을 렌더 사본에 선택 적용한다(기존 사이트 기본 `10006`은 유지). PR #50은 기존 user API 프로세스에 기본 비활성 `POST /alerts`를 추가했다. 렌더러는 UX 사본의 H11/X04/E09 전송 endpoint만 내부 API로 바꾸며 canonical `workflows/*.json`은 수정하지 않는다. 알림 URL은 API 전용 비밀 파일에서 읽고 n8n JSON/실행 항목에서 분리한다. | 두 PR은 main 병합 및 CI 통과 상태이나 새 Jira Credential/프로젝트 연결, UX API 비밀 설정, 별도 workflow 사본 적용, 실제 Discord 전송은 아직 미검증이다. 기본 운영 환경의 알림 동작은 비활성 설정을 유지한다. |
| 저장·DLQ·복원 | PostgreSQL state/save/fail/DLQ, known ID 보존, 동시 동일 요청 409/200 및 응답 재사용을 확인했다. 추가 [TC-07 local contract](../../runs/public/20261108-073512-local-tc07-unknown-effect-release/report.md)에서 migrations 001~016, finish·claim/release·unknown-effect SQL contract 3종, resume 전 claim release의 원 execution 복원, 재개 후 unknown effect의 재확인 강제와 already-applied adopt 경계를 통과했다. | SQL 저장 경계와 operator 입력 계약은 local 완료지만 VM migrations 011~016·workflow 연결, Jira/Discord 외부 action 수행·실제 티켓 복구는 미실행이다. TC-07 실연동은 부분 완료다. 이번 disposable DB 실행은 운영 RTO가 아니다. 운영 RPO/RTO·백업 주기·사람의 운영 알림 수신은 확정/실측되지 않았다. |
| 보안 | 새 저장 실행 357건에서 현재 팀·내부·Jira·DB·OpenAI·봇 비밀값 일치 0건을 확인했고 새 키/폐기 키 인증 경계를 확인했다. | 과거 실행 원문·백업은 별도 보존 상태다. 전체 과거자료 소거 또는 모든 보존 정책 충족으로 확대하지 않는다. |
| 복구 구현·실연동 검증 | TC-07 operator 저장 경계, action capsule 입력, CAS claim/resume/release/complete는 로컬 구현했다. | 자동/범용 재시도는 만들지 않는다. known ID·외부 효과·owner·원 실행 종료를 확인한 작업만 수동으로 재개하고, 불명확하거나 캡슐이 없는 건은 `manual_required`로 남긴다. VM migration/실제 Jira 복구/운영자 절차 검증은 아래 TC-07 세부 절의 미완료 항목이다. |

### 2026-11-07 Edge 웹 VM 읽기 점검

[읽기 전용 재점검 결과](../../runs/public/20261107-194606-vm-pr36-readonly-recheck/report.md)는 당시 VM 토폴로지 스냅샷이다. 이후 [승인된 synthetic J01/J02/J03 표본](../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md)에서 이관·보완 재사용·문맥 누적·권한별 조회·Jira 완료 후 시민 `closed` 조회·DB/DLQ 상태를 확인했다. 담당자 본인의 실제 업무 수행/수신은 확인하지 않았다. core workflow 실행 UI에 저장 실행이 없어 노드별 호출·모델 시간은 확인할 수 없다. TC-15는 승인됐다. Edge 파일 업로드 경로가 막혔지만 VM n8n UI에서 게시된 PR36 support/handoff를 직접 Duplicate 할 수 있음을 [재점검](../../runs/public/20261107-205221-vm-tc15-ui-duplication/report.md)했다. 새 사본은 아직 게시/활성화하거나 호출하지 않았다. 먼저 만든 미게시 support 초안 사본은 TC-15 대상에서 제외했고 보존했다. WF-11, RAG 실제 VM 권한/인용 종단, 전체 VM manifest도 계속 남는다.

세부 원본: [시스템 설계](SYSTEM-DESIGN.md), [워크플로우 설계](WORKFLOW-DESIGN.md), [RAG 설계](RAG-ARCHITECTURE.md), [저장소 설계](STORAGE-DESIGN.md), [실행 결과서](EXECUTION-RESULT.md), [64개 요구사항 실행 매핑](../../infra/contracts/full-system-coverage.json).

### 열린 PR과 현재 기준선

열린 PR의 리뷰 상태는 마감 작업의 선행 조건이 아니다. 필요한 변경은 최신 `main`과 대조해 채택 여부를 정하고, 같은 기능이 이미 들어갔으면 중복 반영하지 않는다.

| PR | 현재 상태 | 마감 계획에서의 처리 |
| --- | --- | --- |
| #49 Jira UX 생성 유형 | 병합됨 | `--jira-issue-type-id`는 비공개 렌더 사본에만 적용된다. 기존 workflow/기본 유형은 유지된다. 새 UX 프로젝트의 실제 생성·종료는 후속 시험이다. |
| #50 Discord UX 알림 API | 병합됨 | 기존 user API에 선택 `/alerts` 경계를 제공한다. 기본 비활성, 내부 인증, 단일 제한 전송, 거절/효과 미확인 구분과 무재시도다. 실제 UX VM 배포·Discord 전송은 미실행이다. [배포 안내](../../infra/user-api-deployment.md#optional-isolated-ux-discord-egress) |
| #44 P19 본체 후속 | 열림·base `eb747df`·현재 비교에서 mergeable 아님 | J02/J03 관련 B08/B11/B23/B24/B25 변경 일부는 최신 `main`의 FL95~FL103 및 157/157 회귀로 확인된다. 그러나 PR diff에는 아직 `main`에 없는 변경도 있다. 현재 STORAGE 계약은 case_version 미지원 시 `null`을 반환하고 expected_case_version 비null이면 fail-closed하도록 정하므로, 버전 생산자/소비자 계약 없이 PR 전체를 합치지 않는다. 후보 B28은 `wait`의 `context_saved` 필수 확인을 약화하고 B25의 `TicketRequest`에서 필수 `deadline_at`을 누락한다. PR head `6b19fc4`를 현재 157사례 하네스에 직접 넣은 별도 검토에서 57/157만 통과했고 나머지는 저장 계약의 `invalid_state_request`로 실패했다. PR 전면 수용은 현재 상태에서 부적절하다. |
| #43 LLM/시간 고장 사본 | 열림·오래된 base | 고장 사본 생성기·테스트·가이드·요약 JSON의 현재 `main` blob이 PR head와 동일해 기능은 이미 기준선에 포함됐다. PR의 개발 계획 문서는 오래된 전체 계획을 담고 있어 그대로 병합하지 않는다. |
| #45 RAG 최종 인계 | 열림·현재 비교에서 mergeable 아님 | 지연 probe/시험 및 인계 산출물은 현재 `main`에 동일 blob으로 포함됐다. PR의 RAG 아키텍처 파일은 최신 VM 적용 상태 머리말을 제거해 기존 문서를 후퇴시키므로 PR 그대로 병합하지 않는다. 실제 VM 권한/지연 종단은 별도 미완료다. |
| #24 RAG 권한 시험 준비 | 열림 | 권한 사례와 실행 조건은 마감 세트에 반영하되 fixture 정적 검사만으로 실제 권한 종단 완료로 판정하지 않는다. |

2026-11-07 21:36 KST GitHub 연결 상태 스냅샷: #36 merged, #49/#50 merged, #43 open·mergeable, #44 open·not mergeable, #45 open·not mergeable로 반환됐다. [분기 비교 보고서](../../runs/public/20261107-214120-pr-branch-audit/report.md)는 #43/#45의 현재 main과 같은 파일·오래된 문서 차이를 대조했다. PR이 열려 있는 것만으로 R01 통합을 막지는 않지만, 후보 계약 차이는 반영 전에 검사한다.

## 3. 우선 마감 계획

R01은 사용자 지시에 따라 구현·통합·시험 창을 순차 진행한다. 타 역할의 검증 회신을 기다리는 것을 선행 조건으로 삼지 않는다. 기존 소유자·의존 코드·실제 상태를 확인하고, 대리 수정은 R01 통합 후보로 명확히 표시한다. 외부 서비스에서 실제로 하지 않은 행위를 통과 처리하지 않는다.

| 순서 | 마감 묶음 | 담당 | 선행 조건·의존성 | 할 일 | 완료 기준·증거 |
| --- | --- | --- | --- | --- | --- |
| 1 | 기준 버전·대상 고정 | R01 | 없음. 나머지 모든 트랙의 공통 기준 | main `6f9561b`, 실행 이미지, 7개 업무 워크플로우, SQL, RAG 색인/지식, 기존 Discord/Jira/DB 연결과 PR #49/#50 UX 확장을 새 비밀 없는 manifest에 고정한다. 기존 실패·미확인 이력은 건드리지 않는다. | 실행 전/후 같은 버전 manifest, 기존 VM 상태와 작업 scope의 충돌 없음 |
| 2 | 새 UX 표현·상호작용 개선 | R02 | 1 완료 후 시작. R01 핵심 트랙과 병렬 가능 | UX 사본의 이용자 안내 문구·화면/상호작용을 개선한다. Jira/API 연결 설정, Credential, 외부 효과와 업무 상태 전이는 R01이 기존 계약에 맞춰 구현·검증한다. | UX 표현·상호작용이 설계된 사용자 기대와 맞는 R02 증거. backend 연결/비밀/업무 계약은 R01 증거로 별도 판정 |
| 3 | 새 UX 사용성 확인 | R02 (UX 표면) · R01 (backend) | 2의 UX 변경과 backend 연결 구현 후. 4~7과 병렬 가능 | R02는 새 UX의 문구·상호작용 기대를 확인한다. R01은 Jira 유형/담당 매핑·문맥, API 연결, ack/전송/사람 수신 구분, 424 거절·502/503/504 미확인 효과와 무재시도를 시험한다. | R02 사용성 증거와 R01 Jira/API/Discord·DLQ 통합 증거를 분리 기록. 기존 시민 문의 처리/담당자 이관의 업무 결과는 R01이 직접 판정 |
| 4 | 사용자 결과 계약 정리 | R01 | 1 완료. 2~3과 병렬 가능; 5~7의 시험 사례 기반 | 기존 40개 실행 결과와 설계 시나리오를 시민 기대 결과와 Jira/DB/DLQ 효과로 연결한다. TC-15 최초 알림 미확인은 `unknown/partial_effect`와 known ID·DLQ로 확인하고, 같은 문의 후속은 기존 저장 계약의 `409 case_busy`·외부 호출 0으로 판정한다. 과거 200 기대와 실패는 보존한다. `alert_marker` DLQ dedup은 후속 차단과 분리해 모듈 시험으로 확인한다. | 각 사례에 입력·기대 응답·단계·티켓/담당 결과·금지 부작용·검증 근거가 연결되고 최초 불일치가 보존됨. TC-15의 각 단계가 상충 계약을 혼합하지 않음 |
| 5 | 시간 경로 계측·운영 한도 확인 | R01 | 4의 결과 계약을 기준으로 진행. 6과 병렬 가능 | WF-11의 `max_seconds: 6`은 가이드 예시값으로 보존하되 운영 SLA로 간주하지 않는다. 실제 계약인 전체 deadline 20초와 관측 실패 상한 25초 내에서 lookup timeout→안전 이관→Jira/state 저장을 계측한다. 일반 응답 8초도 guide 목표 표본으로 별도 분류한다. | WF-11 반복 실측·가능한 단계 시간·응답/Jira/state/DLQ 효과가 한 실행 ID로 대조됨. 6초 초과는 guide 예시 기대 불일치로 기록하고 20초 deadline 위반과 혼동하지 않음 |
| 6 | RAG·에이전트와 Jira 수명주기 종단 | R01 | 4 완료. 5와 병렬 가능하나 timeout/writer 변경 영향 사례는 반영 후 재실행. R02 UX 시험과 병렬 | 핵심 경로의 public/근거 없음/restricted/권한 오류와 함께 Jira 수명주기 J01~J03을 확인한다. J01은 실제 생성 ticket의 본인 조회·타인 거절·없는 ticket·가림 및 read-only 효과, J02는 보완/이관 후 같은 ticket·역할·우선순위·횟수 유지와 재배정·재알림 0, J03은 Jira 저장 문맥에서 facts 복원·누적·충돌 확인을 포함한다. 담당자 ticket 처리 후 시민 후속 조회도 대조한다. 새 UX의 화면/사용성 개선 확인은 R02 범위다. 기존 주 경로의 사용자 문의 처리·Jira/Discord 연동 효과는 R01이 검증한다. | 검색 문서/절·답변 인용·route, J01~J03 API/Jira/state 대조, 담당 처리 후 시민 응답이 같은 실행/티켓으로 연결됨. Jira 읽기 경로는 부작용 0. 새 UX 개선 결과는 별도 bundle/실행 ID |
| 7 | 오류·DLQ와 복구 경계 | R01 | 1·4 완료. 5·6과 병렬 가능; 핵심 업무 알림 오류는 R01이 검증하며, 새 UX 전용 알림 개선 증거만 R02가 제공 | 기존 장애 회귀와 TC-07 수동 재처리를 분리한다. TC-07은 STORAGE-DESIGN 4.2 기준으로 아래 순서의 전용 세부 계획을 따른다. 자동/범용 재시도, 새 서버, 공개 webhook은 추가하지 않는다. | 장애·복구별 효과가 확인되고 위험한 외부 효과 재호출 0. TC-07 세부 완료 기준을 모두 만족한 뒤에만 미구현 판정을 해제 |
| 8 | 전체 회귀와 문서 마감 | R01 통합; UX 개선 결과는 R02 | 2~7 완료. 미실행/외부 확인 불가는 잔여로 명시하고 완료 판정에 포함 | 지원 범위 사용자 시나리오와 UX 사본을 정상·경계·실패·담당자 처리 묶음으로 회귀하고 결과를 설계·실행 결과·원장·시연 자료에 동기화한다. | 코드/설정/workflow/지식/UX bundle 버전, 보고서, 미달·미실행 한계와 재현 방법이 서로 일치 |

### 실행 체크리스트

- [ ] **1 기준 고정:** [로컬 코드·artifact manifest](../../runs/public/20261107-192148-local-p26-closeout/baseline-manifest.json)와 해시 목록을 만들었다. [Edge 웹 VM 재점검](../../runs/public/20261107-194606-vm-pr36-readonly-recheck/summary.json)에서 이미지 tag와 게시 workflow 일부를 읽었지만 전체 workflow·Credential/연결·SQL·색인·환경 설정 대조는 미완료다.
- [ ] **2 UX 사본:** R02가 사본을 구성했고 운영 경로와 분리됨을 diff/설정 증거로 확인했다.
- [ ] **3 UX 실연동:** R02가 Jira 티켓·담당 접근·Discord ack/채널 메시지와 오류 경계를 각각 기록했다.
- [ ] **4 결과 계약:** 대상 사례마다 이용자 기대 결과와 외부 효과·금지 부작용을 연결했고 TC-15의 unknown→case_busy 차단과 alert_marker dedup을 별도 판정했다.
- [ ] **5 시간 경로:** WF-11의 6초를 guide 예시로 분류하고, 반복 종단시간·단계별 지연·Jira/state/DLQ 효과를 20초 운영 deadline 및 25초 실패 관측 상한과 대조했다.
- [ ] **6 RAG/Jira 수명주기:** Jira 표본은 [live 결과](../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md)에서 J01 owner/other/missing 조회, J02 같은 티켓 보완, J03 문맥 누적 및 완료 전환 후 시민 `closed` 조회를 확인했다. [로컬 RAG 표적 시험](../../runs/public/20261107-204523-local-rag-contract/report.md)은 23개 fixture/자동 검사를 통과했지만 실제 VM 검색·권한·인용/오류 종단은 미검증이다. 담당 직원 직접 처리와 사람의 알림 수신도 확인되지 않아 전체 완료 기준은 미충족이다.
- [ ] **7 실패/DLQ·TC-07 진행 중:** 기존 로컬 [P18/P20 오류·DLQ 계약](../../runs/public/20261107-205400-local-error-dlq-contract/report.md)은 통과했다. [TC-07 finish 복원 slice](../../runs/public/20261107-225529-local-tc07-finish/report.md)에서 migration 010·B33 capsule gate와 disposable PostgreSQL 계약을 검증했고 [VM inspect](../../runs/public/20261108-002000-vm-tc07-parameterized-inspect/report.md)에서 operator credential의 parameterized DB 조회를 확인했다. 실제 Jira 대조 후 finish, 미실행 실패 pending 복귀, 경합·중단 복귀, 다른 recovery action은 미완료다. TC-15는 [Header Auth 호출 경로 부재](../../runs/public/20261107-214634-vm-tc15-auth-check/report.md)로 요청 0건이다. 생성 응답 unknown인 TC-05는 Jira 기존 티켓의 유일한 연결 확인 계약을 확보하기 전 재실행하지 않는다. `alert_marker` dedup과 TC-15 결과는 별도로 판정한다.
- [ ] **8 회귀/동기화:** 마지막 증거를 설계·실행 결과·개발 원장·README/시연 자료에 동기화하고 링크 검사를 통과했다.

각 체크는 해당 행의 완료 기준과 증거가 모두 충족된 뒤에만 표시한다. R02 새 UX 개선과 R01 핵심 업무 로직 마감은 별도 판정한다. 기존 문의 처리 경로의 미실행 필수 항목은 R01 마감에서 직접 검증한다. UX 개선 결과는 구분해 기록하되 R02 회신은 R01 핵심 트랙의 선행 조건이 아니다.

### TC-07 수동 재처리 세부 계획

기준은 [저장소 설계 4.2~4.3](STORAGE-DESIGN.md)이다. 자동 재시도 엔진 대신 운영자가 외부 Jira 효과를 대조·수행한 뒤 실패 단계만 저장소 처리권으로 재개하는 절차다. finish 복원 slice는 VM inspect까지 확인했으며 실제 Jira 없는 fixture라 VM finish는 실행하지 않았다. [저장 경계 시험](../../runs/public/20261108-010000-local-tc07-complete-contract/report.md)에서 migrations 011~016의 CAS claim/resume/release/verified complete를 확인했고, [후속 producer 시험](../../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md)에서 close/assign 및 H61 context_update 인자 보존 6/6을 확인했다. create/alert 및 검증 snapshot 없는 context_update는 replay 가능하지 않다. 실제 Jira action은 운영자가 외부에서 확인/수행하며 VM migration/live 시험과 crash lease 운영은 미완료다.

현재 최신 [통합 local contract](../../runs/public/20261108-073512-local-tc07-unknown-effect-release/report.md)은 migrations 001~016와 finish·claim/release·unknown effect SQL 계약 3종을 통과했다. 확인 내용은 재개 전 claim release의 실행 ID 복원, 재개 후 unknown 결과 보존과 외부 재확인 차단, confirmed action의 adopt/complete다. H36 close·H42 assign·검증된 H61 snapshot의 producer capsule은 [fixture 6/6](../../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md)이다. 외부 Jira/Discord effect는 운영자가 수행하는 설계이며 실제 수행/검증, VM migration 및 stale crash-lease 운영 절차는 남아 있다.

| 단계 | 선행 조건 | 작업 | 완료 증거 |
|---|---|---|---|
| 7.1 계약 고정 | STORAGE-DESIGN 4.2~4.3, TC-07, 오류 복구 인계 대조 | 운영자 호출 경계, 허용 RecoveryCapsule action, `failed`와 `unknown`의 재개 조건, 중단 시 pending 복귀를 고정한다. 첫 vertical slice는 known Jira ID·저장된 Response가 있는 TC-06-v1 `finish` 실패다. | TC-07에 step·고장·해제·기대 상태가 채워지고 상태/필드/오류 의미가 문서 간 일치. 생성 응답 unknown인 TC-05는 기존 Jira 조회 연결 식별자를 확인하기 전 실행 범위에서 제외 |
| 7.2 저장소 CAS | 7.1 완료 | 임의 행 수정 없이 기존 state/DLQ 함수 경계를 확장한다. scope·request_id·owner·input_hash·기대 revision·원 실행 ID·DLQ ID/revision을 대조한다. 단일 operator만 claim하고 `failed/unknown→processing`에 새 execution_id/state revision/StateRef를 발급한다. 미실행/재개 불가 시 실행 종료 후 최신 revision으로 `reprocessing→pending`을 조건부 복귀하고 사유를 남긴다. | migration 011~014 구현. failed/unknown CAS resume, 새 StateRef, 재개 실행 실패 후 failed/pending 복귀를 [disposable 계약](../../runs/public/20261108-005000-local-tc07-resume-contract/report.md)에서 통과. stale/중복·unknown effect 거부와 동시 claim 1승은 [저장계약 시험](../../runs/public/20261108-004000-local-tc07-postchecks/report.md) 통과. 7.2 저장 layer 통과, VM migration 검증은 대기 |
| 7.3 실패 단계 드라이버 | 7.2 disposable DB 계약 통과 | `dubakwi-dlq`의 수동 operator 절차에서 DLQ capsule의 action과 인자를 확인하고, Jira/Discord에서 실패 효과만 실제 수행·검증한 뒤 `complete`를 제출한다. 인자가 없거나 효과가 unknown이면 claim 자체를 거부하고 pending/manual review로 둔다. 자동 전체 workflow replay는 하지 않는다. | `recovery_complete` 저장 contract가 verified effect·Response·Jira link·비대상 효과를 재검증하고 state completed/DLQ resolved를 원자 저장. Jira-ref args-null capsule 거부·중복 complete 거부 시험 통과. 실제 Jira/Discord action 수행은 live 미검증; capsule producer에 안전한 payload를 추가하고 action별 운영 지침/실연동 결과를 보완해야 함 |
| 7.4 실패·경합 사례 | 7.3 통과 | TC-07 기본 경로와 v1 고장 복구 전, v2 동시 운영자 경합을 구체화한다. finish 복구, known Jira ID bind, Jira 변경 직전 상태 재조회, 알림 미전송만 1회 시도를 action별로 시험한다. claim 뒤 복구 실패 시 요청은 failed/unknown, DLQ는 pending과 사유를 보존한다. 성공 뒤 같은 request_id replay를 검사한다. | 위험 외부 효과 재호출 0, 티켓 수 불변, 상태/DLQ revision·execution 이력 보존, stale/동시 claim 1승, alert 효과 상태별 호출 수, 후속 request replay 확인 |
| 7.5 격리·VM 시험 | 7.4 로컬 계약·workflow mock 통과 | PostgreSQL 16.15 disposable DB에 `001~009`와 신규 마이그레이션을 적용해 함수·경합 계약을 실행한다. 통과 후에만 고유 scope의 synthetic Jira 문의로 VM을 확인하고 시험 workflow를 종료/비활성화한다. 운영 DB 초기화는 금지한다. | migration/workflow hash·환경·case ID·전후 상태·외부 효과 대조를 별도 runs에 기록. 로컬/mock과 VM 종단 판정을 구분하며 실패 이력은 보존 |

**TC-07 완료 기준:** 유효한 pending DLQ만 단 한 운영자가 claim한다. 원 실행 종료, scope·owner·입력 일치, known Jira 효과와 recovery 자료가 확인된 경우에만 새 execution/state revision으로 재개한다. 지정 실패 단계만 처리해 request_state를 completed, DLQ를 resolution과 함께 resolved로 저장한다. 동일 request_id는 외부 호출 없이 기존 응답을 replay한다. action별 성공 단계 재호출은 없고, alert는 미전송으로 확인된 경우만 한 번 보내며 이미 전송/미확인인 경우 보내지 않는다. 조건 불충족·미지원·미확인 효과는 재실행하지 않고 pending/unknown 또는 `manual_required`로 보존한다. 각 결과는 실제 시험 환경을 명시한다.

### 우선순위와 범위 경계

1. R01이 기본 `main`과 격리 경계를 고정하고 기존 문의 처리 로직·RAG/에이전트·Jira 수명주기·담당자 이관·DLQ/복구를 통합 마감한다. R02는 새 UX의 화면·문구·상호작용 개선만 맡는다. UX 사본의 Jira/API/Discord 동작과 기존 경로의 업무 로직·연동·실행 검증은 R01이 맡는다.
2. WF-11 `max_seconds: 6`은 guide 예시이므로 SLA로 승격하지 않는다. 8.288초 관측을 보존하고, 시스템 운영 한도인 20초 deadline과 25초 관측 실패 상한에 대해 반복 측정한다.
3. RAG 권한별 종단, 담당자의 Jira 처리와 시민 후속 조회를 확인한다.
4. TC-15를 제외한 핵심 정상/장애/DLQ 경로와 담당자 처리 및 시민 후속 조회를 직접 마무리한다. 새 UX 개선 결과는 별도 증거로 받으면 반영하되, R02의 작업이나 회신을 핵심 로직 검증의 선행 조건으로 두지 않는다. 사람 수신을 확인할 수 없으면 미확인으로 남긴다.
5. TC-15는 사용자가 지시한 대로 다른 마감 작업 뒤 마지막 VM 시험으로 실행한다. 시험용 인증 경로가 준비되기 전에는 보내지 않는다.
6. 직원 전용 UI, 새 서버, 전체 상담 이력, 자동 재처리 엔진, 실제 환불/요금 변경은 추가하지 않는다. PR #50의 선택 알림 API는 기존 user API를 재사용하며 별도 서버로 확장하지 않는다.

한 실행의 실패를 고친 재시험은 새 실행 ID로 남기고 원 실패를 유지한다. 완료 기준 미달은 공개 기대나 기존 시험값을 결과에 맞춰 낮추지 않는다. 외부 접근·실제 사용자 확인이 불가한 항목은 그 제약과 필요한 사용자 동작을 좁혀 기록한다.

## 4. 문서 변경 이력

| 날짜 | 버전 | 변경 |
| --- | --- | --- |
| 2026-11-07 | v0.2 | PR #50 UX 알림 API와 #49 Jira 렌더 설정을 기준선에 추가하고, 격리 UX 사본을 포함해 마감 순서를 갱신 |
| 2026-11-07 | v0.3 | 사용자 지시에 따라 UX 전용 사본·Jira/알림 실연동·기록을 R02 단일 담당으로 지정하고 R01 핵심 마감과 분리 |
| 2026-11-07 | v0.4 | 단계별 의존성·병렬 트랙·체크리스트·전체 완료 판정 규칙을 명시 |
| 2026-11-07 | v0.5 | TC-15의 unknown 후속 차단과 별도 alert_marker dedup 시험을 구분하고 J01~J03 Jira 종단 조건을 명시 |
| 2026-11-07 | v0.6 | 사용자 정정에 따라 R02는 새 UX 개선만 담당하고 기존 문의 로직·연동·핵심 검증은 R01 마감 범위로 명확화 |
| 2026-11-07 | v0.7 | Edge 웹 VM의 읽기 전용 점검을 기록하고 core/UX/mock 게시 경로와 전체 인스턴스 통계 범위를 구분. 라이브 승인 시험과 전체 manifest는 미완료로 유지 |
| 2026-11-07 | v0.8 | 승인된 synthetic Jira 표본의 보완/문맥 누적, owner/other/missing 경계, 완료 전환 후 시민 상태 조회를 추가. 담당 직원 실처리·사람 알림 수신과 나머지 마감 시험은 미확인으로 구분 |
| 2026-11-07 | v0.9 | 승인된 TC-15를 실행 전 점검하다가 라이브 Jira 핸드오프 JSON 미확보와 기존 후보의 로컬 원본 불일치를 확인. 외부 부작용 없이 시험 전 중단하고 선행 조건·미실행 증거를 기록 |
| 2026-11-07 | v1.0 | Edge n8n에서 PR36 support/handoff JSON을 확보해 비활성 격리 후보를 준비. 사용자 승인 후 import를 시도했으나 Edge 확장 파일 접근 권한에서 중단, 재시도로 차단을 확인. 시험 요청·Jira·DLQ 효과는 미발생이며 결과를 분리 기록 |
| 2026-11-07 | v1.1 | 파일 업로드 대신 VM n8n Duplicate로 게시 PR36 사본을 만들 수 있음을 확인. 잘못 선택한 미게시 초안 사본은 시험에서 제외하고, 게시본 복제본은 미게시/미실행으로 기록. P18/P20 로컬 오류·DLQ 계약 검사도 별도 증거로 추가 |
| 2026-11-07 | v1.2 | TC-15 handoff 사본에서 H11 HTTP Request를 Code 노드 `H11 담당 알림 (synthetic 503)`으로 정확히 교체하고 503 반환 코드 및 H43→H11→H49 배선을 확인. n8n Publish 버튼이 비활성으로 남아 synthetic 요청 2건은 아직 미실행이며, 게시 가능 경로를 계속 조사 |
| 2026-11-07 | v1.3 | dual State/DLQ 의존성과 dual Support/Handoff 격리 사본을 게시했으나 VM 웹 요청 경로가 없어 TC-15 미실행. Support B01·Handoff H01을 비활성화하고 148 Python 단위/계약 검사(7 skip) 및 P18/P19/P20/recovery Node 계약을 다시 실행. 로컬 통과와 live 미판정을 분리 기록 |





| 2026-11-07 | v1.4 | P12 업무 흐름 6개 표적 Node 회귀 재실행: Jira 21 시나리오, repeated handoff 7/7 등 로컬 Code 계약 통과. live Jira/DB/담당자/알림 효과와 분리 기록 |
| 2026-11-07 | v1.5 | PR #36/#43/#44/#45/#49/#50 원격 상태 재조회 및 PR #44 diff를 현재 STORAGE 계약·157개 support Code 검사와 대조. PR #44 전면 수용은 부적절해 버전 계약/보완 저장 gate 차이를 기록 |
| 2026-11-07 | v1.6 | PR #44 head `6b19fc4`를 현재 support-skeleton 157사례 하네스에서 별도 실행. 57/157 통과, 100건 `invalid_state_request`; TicketRequest `deadline_at` 누락이 확인되어 무검토 수용하지 않음 |
| 2026-11-07 | v1.7 | PR #43/#45의 head 파일을 `main` blob과 비교. 시험 도구·근거는 이미 동일 내용으로 통합됐고 잔여 문서는 전체 실행 계획/RAG 적용 상태를 후퇴시켜 PR 전체 병합 불필요 확인 |

### TC-15 재개 인증 사전조건 — 2026-11-07

[Edge VM 인증 점검](../../runs/public/20261107-214634-vm-tc15-auth-check/report.md)에서 웹 SSH 로그인과 사본 상태를 확인했다. Support B01의 Header Auth는 dubakwi-team-key를 참조하지만, VM 셸 및 관련 컨테이너에 시험용 webhook 환경변수가 없었다. 인증을 우회/약화하거나 비밀을 추출하지 않아 요청은 0건이며 TC-15는 미실행이다. 두 시험 트리거는 비활성 상태로 유지했고 이번 관측으로 새 Jira/DB/DLQ/Discord 효과는 없다. 기존 credential을 안전하게 사용하는 경로가 다음 실행 선행 조건이다.

### PR36 마감 로컬 회귀 재실행 — 2026-11-07

[회귀 보고서](../../runs/public/20261107-214804-local-p26-regression/report.md)와 [가린 요약](../../runs/public/20261107-214804-local-p26-regression/summary.json)에 현재 worktree 기준 결과를 기록했다. Python 148 통과/7 생략, Support 157/157, P12 6개 스크립트, P18 7/7, P19 producer/consumer 3개 및 AUTH-01..07 fixture, P20 16개, R04 8/8, verifier 경계 7/7이 통과했다. 모두 로컬 Code/mock/fixture이며 live RAG·TC-15·담당자 수신·WF-11 종단은 여전히 미검증이다. TC-15 인증 사전조건은 [별도 보고서](../../runs/public/20261107-214634-vm-tc15-auth-check/report.md)대로 미해결이다.
| 2026-11-07 | v1.8 | TC-15 재개 시 Edge VM의 Header Auth credential 호출 경로 부재를 확인해 요청 0건·비활성 트리거를 기록. 현 worktree 기준 Python/Node 전체 관련 로컬 회귀와 문서·공개 후보 검사 결과를 별도 묶음에 남기고 live 종단 미완료를 명시 |


### 전체 사례 명세 dry-run 준비도 — 2026-11-07

[사례 준비도 보고서](../../runs/public/20261107-214910-local-p26-case-matrix/report.md)에서 common/team/team-extended 41건을 요청 전 dry-run으로 해석했다. 27건은 payload 준비 가능, 13건은 수동 사전조건으로 차단, TC-07은 미구현이다. 27건은 실행 통과가 아니다. TC-01/01b/14 다단계 case_ref는 dry-run의 반환 응답 부재로만 미해결이다. 실제 workflow 전체 회귀 및 TC-15 VM 종단은 여전히 미완료다.
| 2026-11-07 | v1.9 | common/team/team-extended 사례 41건을 dry-run으로 분류(27 요청 준비, 13 선행조건 차단, TC-07 미구현). dry-run은 실제 시험 PASS가 아님을 보고서·원장에 명시 |



### 전체 요구 구조 감사 및 WF-11 시간 기대 해석 — 2026-11-07

[정적 감사](../../runs/public/20261107-215556-local-p26-coverage/report.md)는 64 요구/수용 시험, 12 패키지 연결을 오류 없이 확인했지만 런타임 시험 0건이다. WF-11 사례의 6초는 가이드 예시이지 시스템 SLA가 아니다. 실제 VM 응답 8.288초는 guide `max_seconds` assertion에는 미달하지만, 설계의 전체 20초 deadline을 넘지 않았고 안전 이관을 반환했다. ticket 최소예약 5초+tail 3.5초는 6초 예시를 충족할 수 없다는 이유만으로 구현 결함으로 판정하지 않는다. 반복/단계 계측은 성능 특성화로 남기고 TC-15는 후순위로 둔다.
| 2026-11-07 | v2.0 | 64개 요구 추적 구조를 정적 검사해 매핑 오류 0을 확인하되 runtime 0을 명시. WF-11의 6초 원 기대, VM 8.288초, 최소 ticket+tail 예약 8.5초의 충돌을 기록하고 기대/효과를 낮추지 않는 수정·반복 실측을 후속으로 둠. TC-15는 후순위 |


| 2026-11-07 | v2.1 | 사용자 지시에 따라 WF-11·RAG/Jira·TC-15 외 오류/DLQ/회귀를 먼저 진행하고 TC-15 VM 시험을 마지막 순서로 이동 |


| 2026-11-07 | v2.2 | WORKFLOW-DESIGN에 WF-11 원 기대 6초와 VM 8.288초, 현행 예산 예약 8.5초를 미달 관측으로 동기화하고 변경 없이 반복 측정 선행조건을 명시 |
| 2026-11-07 | v2.3 | TC-15를 WF-11, RAG/Jira 담당자 종단, TC-15 외 장애/DLQ 회귀 다음의 마지막 VM 시험으로 고정. 우선순위 목록의 줄바꿈을 복구하고 프로젝트 README·개발 원장의 문서 버전 참조를 동기화 |
| 2026-11-07 | v2.4 | WF-11의 사례 `max_seconds: 6`을 guide 예시로 재분류. 8.288초는 사례 assertion 불일치로 보존하되 운영 SLA 미달/구현 결함으로 승격하지 않고 20초 deadline 기준의 성능 특성화로 계획 수정 |
| 2026-11-07 | v2.5 | STORAGE-DESIGN 4.2~4.3 기준 TC-07 수동·조건부 재처리 계획 추가. TC-06-v1 finish 실패를 첫 vertical slice로 정하고 CAS·단계별 실행·경합·실패 복귀·disposable DB/VM 검증과 완료 기준 정의 |
| 2026-11-07 | v2.6 | TC-07 finish response 복원 slice 구현. 별도 operator 함수·응답 capsule guard·disposable DB 계약과 로컬 node 검사 추가. VM 배포 및 기타 action 경로는 미완료로 기록 |
| 2026-11-07 | v2.7 | 복구 operator용 비활성 Manual Trigger workflow와 입력 allowlist 계약 검사 추가. 실제 VM Credential 연결 및 live execution은 미확인 |
| 2026-11-08 | v2.8 | VM parameterized inspect의 ID 오타를 수정해 `ok:true` 확인. 잘못된 Jira 없는 synthetic fixture에서 finish를 억지로 실행하지 않고, 실제 Jira-backed finish·action retry·pending 복귀·경합/중단 복귀를 미완료로 유지 |
| 2026-11-08 | v2.9 | disposable PostgreSQL 16.15에서 migration 001~010과 TC-07 recovery contract를 재검증하고, runtime/operator 권한을 대조. 최초 역할 누락 설정 실패와 보정 후 통과를 함께 기록 |
| 2026-11-08 | v3.0 | migration 011/012 operator DLQ claim/release와 dispatcher를 추가. DLQ owner/input/execution/revision CAS, pending 복귀, effect-unknown 거부, 동시 claim 단일 승자와 operator 전용 권한을 disposable DB에서 검증. request_state processing 전이/StateRef, action driver/resolve와 VM 적용은 미완료 |
| 2026-11-08 | v3.1 | 최신 disposable SQL/권한 증거 동기화. operator workflow에 수동 JSON 입력 필드를 연결하고 strict validation 17/17을 확인. Jira action driver, request_state resume/StateRef, recovery completion/resolve, crash recovery와 VM 적용은 미완료 |
| 2026-11-08 | v3.2 | migration 013/014로 claimed request의 failed/unknown→processing CAS와 fresh StateRef, attested failed/pending recovery release를 추가. disposable PostgreSQL 001~014 계약 통과 및 operator workflow resume 입력 18/18 확인. action driver·성공 complete/resolve·stale claim·VM 적용은 미완료 |
| 2026-11-08 | v3.3 | migration 015/016의 verified completion 추가. 확인된 target effect와 비대상 효과·Response·Jira linkage를 CAS 대조해 state completed/DLQ resolved를 원자 저장. migration 011은 un-replayable Jira-ref capsule claim을 거절한다. 001~016 disposable 성공·실패·중복 계약 및 operator workflow 19/19 통과. 외부 Jira/Discord action은 운영자 수동 수행이며 기존 capsule payload 보강·VM/live 검증은 미완료 |
| 2026-11-08 | v3.4 | H36 close capsule에 close_status+masked answer, H42 assign capsule에 선택 account ID+priority를 보존. Local fixture 4/4. create/context_update/alert replay, VM migrations 011~016 및 실제 Jira 종단은 미완료 |
| 2026-11-08 | v3.5 | H61이 snapshot을 생성한 뒤 검증 재조회가 실패하면 해당 idempotent snapshot을 context_update payload로 보존. Focused fixture 6/6. create/alert 및 미검증 snapshot, VM/live 종단은 미완료 |
| 2026-11-08 | v3.6 | VM read-only catalog에서 recovery dispatcher 미설치 확인. DDL/role/state/DLQ 미변경. Migration runbook에 010~016 순서·restore rehearsal·operator/runtime 권한 경계 보강 |
