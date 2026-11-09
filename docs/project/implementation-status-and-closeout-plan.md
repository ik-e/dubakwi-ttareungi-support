# 구현 현황과 사용자 기준 마감 계획

<!-- final-closeout-current -->
**11/09 현재:** 최종 자료 마감을 수행했다. 이전 날짜의 ‘추적표 미완료’·‘담당자 처리 전’ 문구는 당시 기록이며 현행은 [최종 근거표](../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md)와 [마감 검증](../../runs/public/20261109-112300-local-final-closeout/report.md)을 따른다. 새 기능·운영 고장 시험·VM 배포는 추가하지 않았다.
<!-- /final-closeout-current -->

- 작성일: 2026-11-08 KST
- 버전·상태: v5.6 / 코드 기준선은 `origin/main` `dd919d7`로 고정했다. PR #36과 후속 PR #46~#52가 포함된다. R02는 새 UX 개선, R01은 기존 업무 경로와 마감을 담당한다. PR36 RAG search 사례/권한 기능은 [16/16 통과](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md) 및 두 Support 종단으로 완료 판정했다. SQLite execution row의 `running` 표기와 색인 시간 미측정은 기록상 잔여 한계이며 추가 시험 gate가 아니다. D05/J04 거부 경계와 J02 담당자 직접 처리·사용자 확인 Discord 알림 수신을 최신 근거에 반영했다. D10/TC-15는 [환경 미준비](../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md)로 BLOCKED/NOT RUN 종결했으며 기능 통과가 아니다. TC-07은 DLQ list/inspect 및 연결 Jira GET read-only 조회를 확인했다. 운영자 retry/recovery action은 이번 완료 범위 밖이다. 60사례·64요구의 판정/근거표와 제출용 3문서·발표·DAY82를 정리했다. [마감 기록](../../runs/public/20261109-112300-local-final-closeout/report.md)에서 실제 검사·패키지·Git 상태를 확인한다. 전체 상세는 [최종 시험 계획 v1.26](final-test-plan.md)을 참조한다.
- 기준 코드: `main` `dd919d7` (PR #36 통합본, 후속 PR #46~#52 및 P18 DLQ 조회 기록 반영; 로컬/원격 main 일치)
- 기준 실행: [PR #36 실제 VM 통합 검증](../../runs/public/20261107-170503-vm-pr36-integration/report.md)
- 결정 방식: 사용자는 R01이 PR #36처럼 전체 마감을 통합 추진하고 타 역할의 검증 회신을 기다리지 않도록 지시했다. 이 문서는 R01 관측·판정만 기록하며 타 역할 승인이나 미실행 시험을 만들어내지 않는다.
- 사용자 수동 UAT 절차: [Discord·Jira 시나리오 시험 안내서](../../cases/discord-jira-user-acceptance.md). 시험 계획과 기존 실행 증거를 구분하며, 현재 지원되지 않는 Jira 기반 DLQ 관리는 차단 항목으로 표시한다.

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
| 보완·이관·조회 | [2026-11-07 VM Jira lifecycle](../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md)와 [J02 담당자 처리](../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md)에서 같은 synthetic 티켓 보완·상태전환·본인 조회, 담당자의 진행 처리·내부 메모를 확인했다. 담당자 Discord 알림 수신은 [사용자 확인](../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md)이다. | 담당자 처리는 확인됐다. 알림은 사용자 보고이며 독립 전송 로그가 없다. 실제 환불 완료를 뜻하지 않는다. D05·D06·J04 거부 경계는 각각의 개별 실행 범위만 통과했다. |
| RAG와 권한 | PR36 [search matrix](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md) 16/16, [QR Support E2E](../../runs/public/20261108-132500-vm-pr36-rag-e2e/report.md), [SR-WF12 E2E](../../runs/public/20261108-133000-vm-pr36-rag-wf12-e2e/report.md), [14:02 재시작 후 재색인·QR](../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md)를 확인했다. | 계획된 PR36 검색·권한 기능 시험과 한 번의 restart→reindex→QR 기능 경로는 확인됐다. SQLite execution row의 `running` 종료 상태 불일치와 색인 시간 미측정은 남은 관측 한계이며 추가 시험 gate가 아니다. |
| 업무·장애 회귀 | 과거 41개 정의 표본과 2026-11-06의 25건×3회, 2026-11-08 UAT 및 개별 실행 결과를 [최종 시험 계획](final-test-plan.md)에 연결했다. | 서로 다른 기준·범위의 수치를 합산해 전체 PASS로 표시하지 않는다. D10 replay와 TC-15 격리 고장 종단은 환경 미준비로 BLOCKED/NOT RUN이며 기능 통과가 아니다. |
| UX Jira·Discord 알림 | PR #49는 새 UX Jira 프로젝트 유형 `10003`을 렌더 사본에 선택 적용한다(기존 사이트 기본 `10006`은 유지). PR #50은 기존 user API 프로세스에 기본 비활성 `POST /alerts`를 추가했다. 렌더러는 UX 사본의 H11/X04/E09 전송 endpoint만 내부 API로 바꾸며 canonical `workflows/*.json`은 수정하지 않는다. 알림 URL은 API 전용 비밀 파일에서 읽고 n8n JSON/실행 항목에서 분리한다. | 두 PR은 main 병합 및 CI 통과 상태이나 새 Jira Credential/프로젝트 연결, UX API 비밀 설정, 별도 workflow 사본 적용, 실제 Discord 전송은 아직 미검증이다. 기본 운영 환경의 알림 동작은 비활성 설정을 유지한다. |
| 저장·DLQ·복원 | PostgreSQL state/save/fail/DLQ와 known ID 보존·동일 요청 차단을 확인했다. [TC-07 VM lookup](../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md)에서 migration 017 후 bounded list/sanitized inspect와 연결 Jira GET을 기존 비활성 manual test workflow에서 통과시켰다. | **조회 slice만** 통과. `recovery_control` 부재로 broader recovery contract가 미완료이고 DLQ retry/recovery action은 마감 범위에 포함되지 않는다. disposable DB 경합은 운영 RTO가 아니다. 운영 RPO/RTO·백업 주기는 확정/실측되지 않았다. |
| 보안 | 새 저장 실행 357건에서 현재 팀·내부·Jira·DB·OpenAI·봇 비밀값 일치 0건을 확인했고 새 키/폐기 키 인증 경계를 확인했다. | 과거 실행 원문·백업은 별도 보존 상태다. 전체 과거자료 소거 또는 모든 보존 정책 충족으로 확대하지 않는다. |
| 복구 구현·실연동 검증 | Local disposable 저장 경계 및 migration 010–016 restore/live 검사와 TC-07 read-only lookup을 각각 확인했다. Migration 017의 bounded DLQ/Jira 조회도 기존 비활성 manual test workflow에서 확인했다. | 현재 사용자 완료 범위는 조회까지다. 운영자 retry/recovery action은 범위 밖이며 구현·검증 완료로 주장하지 않는다. |

### 2026-11-07 Edge 웹 VM 읽기 점검

[읽기 전용 재점검 결과](../../runs/public/20261107-194606-vm-pr36-readonly-recheck/report.md)는 당시 VM 토폴로지 스냅샷이다. 이후 [승인된 synthetic J01/J02/J03 표본](../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md)에서 이관·보완 재사용·문맥 누적·권한별 조회·Jira 완료 후 시민 `closed` 조회·DB/DLQ 상태를 확인했다. 담당자 본인의 실제 업무 수행/수신은 확인하지 않았다. core workflow 실행 UI에 저장 실행이 없어 노드별 호출·모델 시간은 확인할 수 없다. TC-15는 승인됐다. Edge 파일 업로드 경로가 막혔지만 VM n8n UI에서 게시된 PR36 support/handoff를 직접 Duplicate 할 수 있음을 [재점검](../../runs/public/20261107-205221-vm-tc15-ui-duplication/report.md)했다. 새 사본은 아직 게시/활성화하거나 호출하지 않았다. 먼저 만든 미게시 support 초안 사본은 TC-15 대상에서 제외했고 보존했다. WF-11, RAG 실제 VM 권한/인용 종단, 전체 VM manifest도 계속 남는다.

세부 원본: [시스템 설계](SYSTEM-DESIGN.md), [워크플로우 설계](WORKFLOW-DESIGN.md), [RAG 설계](RAG-ARCHITECTURE.md), [저장소 설계](STORAGE-DESIGN.md), [실행 결과서](EXECUTION-RESULT.md), [64개 요구사항 실행 매핑](../../infra/contracts/full-system-coverage.json).

### 2026-11-08 VM PR36/UX 기준선 읽기 스냅샷

[읽기 전용 결과](../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md)에서 PR36 API와 UX API가 같은 VM에 병렬 배포되어 있음을 재확인했다. 이미지 태그는 각각 `pr36-a657890`, `ux-6f9561b`이고 Docker `29.9.2`, PostgreSQL `16.15`, n8n `2.42.6`이다. 이미지 ID prefix를 기록했으며 tag suffix는 기존 Git commit으로 확인했다. 앱 이미지의 OCI revision label은 비어 있어 source provenance는 확정하지 않았다. n8n 목록은 관련 PR36 core 6개 중 5개 Published, dual-storage 4개 중 3개 Published, UX 5개 모두 Published, recovery operator는 Published 표시 없음으로 보였다. PR36 index workflow ID와 memory key에 `a657890` namespace가 들어간 것은 확인했으나, workflow 미게시·실행 이력 없음·메모리 벡터 저장 특성 때문에 현재 index 적재/문서 revision은 미확인이다. PR36 DB에는 `recovery_list/lookup`과 `recovery_finish`가 있으나 `recovery_control`은 없다. 이번 snapshot은 서비스/DB/워크플로우를 변경하지 않았다.

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

전체 사례와 수용 요구를 의존성 순으로 실행할 상세 계획은 [PR36 최종 통합 시험 계획](final-test-plan.md)이다. 이 문서는 실행 계획이며 시험 결과를 뜻하지 않는다. 이번 계획의 시험 실행은 아직 시작하지 않았다.

R01은 사용자 지시에 따라 구현·통합·시험 창을 순차 진행한다. 타 역할의 검증 회신을 기다리는 것을 선행 조건으로 삼지 않는다. 기존 소유자·의존 코드·실제 상태를 확인하고, 대리 수정은 R01 통합 후보로 명확히 표시한다. 외부 서비스에서 실제로 하지 않은 행위를 통과 처리하지 않는다.

| 순서 | 마감 묶음 | 담당 | 선행 조건·의존성 | 할 일 | 완료 기준·증거 |
| --- | --- | --- | --- | --- | --- |
| 1 | 기준 버전·대상 고정 | R01 | 없음. 나머지 모든 트랙의 공통 기준 | main `dd919d7`은 고정했다. 실행 이미지, 7개 업무 워크플로우, SQL, RAG 색인/지식, 기존 Discord/Jira/DB 연결 및 PR #49/#50 UX 확장 버전은 새 비밀 없는 VM manifest로 대조한다. 기존 실패·미확인 이력은 건드리지 않는다. | 실행 전/후 같은 버전 manifest, 기존 VM 상태와 작업 scope의 충돌 없음 |
| 2 | 새 UX 표현·상호작용 개선 | R02 | 1 완료 후 시작. R01 핵심 트랙과 병렬 가능 | UX 사본의 이용자 안내 문구·화면/상호작용을 개선한다. Jira/API 연결 설정, Credential, 외부 효과와 업무 상태 전이는 R01이 기존 계약에 맞춰 구현·검증한다. | UX 표현·상호작용이 설계된 사용자 기대와 맞는 R02 증거. backend 연결/비밀/업무 계약은 R01 증거로 별도 판정 |
| 3 | 새 UX 사용성 확인 | R02 (UX 표면) · R01 (backend) | 2의 UX 변경과 backend 연결 구현 후. 4~7과 병렬 가능 | R02는 새 UX의 문구·상호작용 기대를 확인한다. R01은 Jira 유형/담당 매핑·문맥, API 연결, ack/전송/사람 수신 구분, 424 거절·502/503/504 미확인 효과와 무재시도를 시험한다. | R02 사용성 증거와 R01 Jira/API/Discord·DLQ 통합 증거를 분리 기록. 기존 시민 문의 처리/담당자 이관의 업무 결과는 R01이 직접 판정 |
| 4 | 사용자 결과 계약 정리 | R01 | 1 완료. 2~3과 병렬 가능; 5~7의 시험 사례 기반 | 기존 40개 실행 결과와 설계 시나리오를 시민 기대 결과와 Jira/DB/DLQ 효과로 연결한다. TC-15 최초 알림 미확인은 `unknown/partial_effect`와 known ID·DLQ로 확인하고, 같은 문의 후속은 기존 저장 계약의 `409 case_busy`·외부 호출 0으로 판정한다. 과거 200 기대와 실패는 보존한다. `alert_marker` DLQ dedup은 후속 차단과 분리해 모듈 시험으로 확인한다. | 각 사례에 입력·기대 응답·단계·티켓/담당 결과·금지 부작용·검증 근거가 연결되고 최초 불일치가 보존됨. TC-15의 각 단계가 상충 계약을 혼합하지 않음 |
| 5 | 시간 경로 계측·운영 한도 확인 | R01 | 기존 VM WF-11 표본 및 설계 deadline 확인 완료 | 가이드 `max_seconds: 6`은 예시로 유지하고 SLA로 승격하지 않는다. 기존 관측 8.288초와 20초 업무 deadline을 구분한다. 반복 성능 특성화·미측정 단계 시간은 현재 사용자 완료 기준의 추가 gate로 두지 않는다. | 기존 수치의 출처/해석을 구분 기록. 미측정 항목은 잔여 한계로 표시하고 통과 수치로 만들지 않음 |
| 6 | RAG·에이전트와 Jira 수명주기 종단 | R01 | 기존 VM/Jira/UAT 증거 재사용 및 11/8 표적 보강 완료 | 핵심 경로 RAG matrix 16/16, QR·SR-WF12 Support 종단, Jira 시민/담당자 처리 및 후속 조회 결과를 같은 scope의 각 run에서 연결한다. 새 UX의 화면/사용성 확인은 R02 범위로 분리한다. | 계획된 PR36 RAG 시험과 J02 담당자 처리는 해당 증거 범위에서 완료. 60 사례/64 요구 ID 전체 판정표는 별도 마감 작업이며 전체 PASS를 뜻하지 않음 |
| 7 | 오류·DLQ 조회 및 장애 경계 | R01 | TC-07 VM lookup 및 개별 오류/UAT 증거 확보; D10/TC-15 준비도 확인 완료 | DLQ list/inspect와 연결 Jira GET까지만 사용자 완료 범위다. retry/recovery action은 이번 범위에서 제외한다. D10 replay harness 및 TC-15 격리 경로가 준비되지 않아 요청을 보내지 않았다. | TC-07 조회 slice 통과, retry/recovery action은 범위 밖. D10/TC-15는 BLOCKED/NOT RUN으로 명시하고 기능 통과로 계산하지 않음 |
| 8 | 전체 회귀와 문서 마감 | R01 통합; UX 개선 결과는 R02 | 2~7 완료. 미실행/외부 확인 불가는 잔여로 명시하고 완료 판정에 포함 | 지원 범위 사용자 시나리오와 UX 사본을 정상·경계·실패·담당자 처리 묶음으로 회귀하고 결과를 설계·실행 결과·원장·시연 자료에 동기화한다. | 코드/설정/workflow/지식/UX bundle 버전, 보고서, 미달·미실행 한계와 재현 방법이 서로 일치 |

### 실행 체크리스트

- [x] **1 기준 고정 (부분 완료):** 저장소 기준은 `dd919d7`이다. VM image/tag와 일부 workflow/DB/RAG 상태를 [읽기 전용 기준선](../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md)으로 기록했다. OCI source provenance, 모든 workflow JSON hash/ID·credential/config manifest는 미확인이라 VM과 저장소의 완전 동일성은 입증하지 않았다.
- [x] **2 UX 분리 원칙 기록:** PR #49/#50은 병합됐고 새 UX API/사본·credential 경계는 설계에 기록했다. UX 프로젝트 credential 연결, 사본 적용과 실제 UX 알림은 미검증이므로 UX 실연동 완료로 보지 않는다.
- [ ] **3 UX 실연동:** 새 UX 프로젝트의 Jira 연결 및 PR #50 Discord 알림 endpoint/credential/오류 경계는 VM에 적용·시험하지 않았다. R02 UX 테스트와 R01 기존 업무 경로 판정을 섞지 않는다.
- [x] **4 결과 계약/요구 추적:** [60사례·64요구](../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md)의 원 기대·개별 판정·근거·한계를 연결했다. 자료 연결의 완료이며 전체 실행 PASS가 아니다.
- [x] **5 시간 계약 해석:** 가이드 6초는 예시이며 VM 관측 8.288초와 20초 업무 deadline을 구분했다. 반복 성능 특성화와 index duration은 추가 완료 gate가 아니라 미측정 한계로 남긴다.
- [x] **6 RAG/Jira 핵심 증거:** PR36 RAG matrix 16/16, QR·SR-WF12 Support 종단, J02 담당자 직접 처리 및 사용자가 확인한 알림 수신은 각 보고서의 범위에서 확인됐다. [RAG matrix](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md), [J02](../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md), [알림 수신 확인](../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md). 이는 60/64 전수 완료를 뜻하지 않는다.
- [x] **7 DLQ 조회/장애 경계 판정:** [TC-07 lookup](../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md)에서 bounded list/inspect와 Jira GET을 확인했다. 운영자 retry/recovery action은 이번 사용자 완료 범위 밖이다. [D10/TC-15 준비도](../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md)에서 두 항목은 BLOCKED/NOT RUN으로 종결했으며 기능 통과로 세지 않는다.
- [ ] **8 최종 제출 마감:** 제출용 3문서·DAY82·12장 발표/메모·근거 부록을 정리했고 [최종 검사 기록](../../runs/public/20261109-112300-local-final-closeout/report.md)에 패키지·Git 결과를 취합한다. 실제 강사 제출·현장 발표·전수 VM 재현은 미관측으로 유지한다.

각 체크는 해당 행의 완료 기준과 증거가 모두 충족된 뒤에만 표시한다. R02 새 UX 개선과 R01 핵심 업무 로직 마감은 별도 판정한다. 기존 문의 처리 경로의 미실행 필수 항목은 R01 마감에서 직접 검증한다. UX 개선 결과는 구분해 기록하되 R02 회신은 R01 핵심 트랙의 선행 조건이 아니다.

> **범위 정정:** 아래 TC-07 수동 재처리 세부 계획은 구현 후보와 과거 검토를 보존한 설계 기록이다. 현재 사용자가 확정한 완료 범위는 DLQ 조회(list/inspect)와 연결 Jira 정보 GET까지이며, 재시도·복구 action 구현/검증은 이번 마감의 요구사항이나 차단 조건이 아니다.

### TC-07 수동 재처리 세부 계획 — 과거 설계 기록, 현행 범위 제외

기준은 [저장소 설계 4.2~4.3](STORAGE-DESIGN.md)이다. 자동 재시도 엔진 대신 운영자가 외부 Jira 효과를 대조·수행한 뒤 실패 단계만 저장소 처리권으로 재개하는 절차다. finish 복원 slice는 VM inspect까지 확인했으며 실제 Jira 없는 fixture라 VM finish는 실행하지 않았다. [저장 경계 시험](../../runs/public/20261108-010000-local-tc07-complete-contract/report.md)에서 migrations 011~016의 CAS claim/resume/release/verified complete를 확인했고, [후속 producer 시험](../../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md)에서 close/assign 및 H61 context_update 인자 보존 6/6을 확인했다. create/alert 및 검증 snapshot 없는 context_update는 replay 가능하지 않다. 실제 Jira action은 운영자가 외부에서 확인/수행하며 VM migration/live 시험과 crash lease 운영은 미완료다.

현재 최신 [통합 local contract](../../runs/public/20261108-073512-local-tc07-unknown-effect-release/report.md)은 migrations 001~016와 finish·claim/release·unknown effect SQL 계약 3종을 통과했다. [VM 적용 결과](../../runs/public/20261108-085318-vm-tc07-recovery-deploy/report.md)는 migrations 010~016, restore DB 동시 claim 1승/1충돌과 release 복귀, live operator-only inspect를 확인했다. H36 close·H42 assign·검증된 H61 snapshot의 producer capsule은 [fixture 6/6](../../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md)이다. 외부 Jira/Discord effect는 운영자가 수행하는 설계이며 실제 수행/검증, 전용 LOGIN/Credential, inactive workflow import, stale crash-lease 운영 절차는 남아 있다.

| 단계 | 선행 조건 | 작업 | 완료 증거 |
|---|---|---|---|
| 7.1 계약 고정 | STORAGE-DESIGN 4.2~4.3, TC-07, 오류 복구 인계 대조 | 운영자 호출 경계, 허용 RecoveryCapsule action, `failed`와 `unknown`의 재개 조건, 중단 시 pending 복귀를 고정한다. 첫 vertical slice는 known Jira ID·저장된 Response가 있는 TC-06-v1 `finish` 실패다. | TC-07에 step·고장·해제·기대 상태가 채워지고 상태/필드/오류 의미가 문서 간 일치. 생성 응답 unknown인 TC-05는 기존 Jira 조회 연결 식별자를 확인하기 전 실행 범위에서 제외 |
| 7.2 저장소 CAS | 7.1 완료 | 임의 행 수정 없이 기존 state/DLQ 함수 경계를 확장한다. scope·request_id·owner·input_hash·기대 revision·원 실행 ID·DLQ ID/revision을 대조한다. 단일 operator만 claim하고 `failed/unknown→processing`에 새 execution_id/state revision/StateRef를 발급한다. 미실행/재개 불가 시 실행 종료 후 최신 revision으로 `reprocessing→pending`을 조건부 복귀하고 사유를 남긴다. | migration 011~014 구현. failed/unknown CAS resume, 새 StateRef, 재개 실행 실패 후 failed/pending 복귀를 [disposable 계약](../../runs/public/20261108-005000-local-tc07-resume-contract/report.md)에서 통과. stale/중복·unknown effect 거부와 동시 claim 1승은 [저장계약 시험](../../runs/public/20261108-004000-local-tc07-postchecks/report.md) 통과. 7.2 저장 layer 통과, VM migration 검증은 대기 |
| 7.3 실패 단계 드라이버 | 7.2 disposable DB 계약 통과 | `dubakwi-dlq`의 수동 operator 절차에서 DLQ capsule의 action과 인자를 확인하고, Jira/Discord에서 실패 효과만 실제 수행·검증한 뒤 `complete`를 제출한다. 인자가 없거나 효과가 unknown이면 claim 자체를 거부하고 pending/manual review로 둔다. 자동 전체 workflow replay는 하지 않는다. | `recovery_complete` 저장 contract가 verified effect·Response·Jira link·비대상 효과를 재검증하고 state completed/DLQ resolved를 원자 저장. Jira-ref args-null capsule 거부·중복 complete 거부 시험 통과. 실제 Jira/Discord action 수행은 live 미검증; capsule producer에 안전한 payload를 추가하고 action별 운영 지침/실연동 결과를 보완해야 함 |
| 7.4 실패·경합 사례 | 7.3 통과 | TC-07 기본 경로와 v1 고장 복구 전, v2 동시 운영자 경합을 구체화한다. finish 복구, known Jira ID bind, Jira 변경 직전 상태 재조회, 알림 미전송만 1회 시도를 action별로 시험한다. claim 뒤 복구 실패 시 요청은 failed/unknown, DLQ는 pending과 사유를 보존한다. 성공 뒤 같은 request_id replay를 검사한다. | 위험 외부 효과 재호출 0, 티켓 수 불변, 상태/DLQ revision·execution 이력 보존, stale/동시 claim 1승, alert 효과 상태별 호출 수, 후속 request replay 확인 |
| 7.5 격리·VM 시험 | 7.4 로컬 계약·workflow mock 통과 | PostgreSQL 16.15 disposable DB에 `001~009`와 신규 마이그레이션을 적용해 함수·경합 계약을 실행한다. restore 통과 후 fresh private backup과 hash가 일치하는 reviewed source로 live migration을 적용한다. operator role inspect까지만 확인하고 dedicated LOGIN/Credential·inactive workflow import를 별도 gate로 둔다. 운영 DB 초기화는 금지한다. | [VM recovery 결과](../../runs/public/20261108-085318-vm-tc07-recovery-deploy/report.md)에 migrations 010~016 적용·권한·inspect·경합 결과를 기록했다. 전체 action 복구와 Jira/Discord 외부 효과 대조는 별도 시험이며 완료 전이다. |

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
| 2026-11-08 | v3.9 | fresh backup/restore 계약 후 VM migrations 010~016을 hash 대조·순서 적용. restore DB 동시 claim 1승/1충돌·release 복귀와 live operator-only inspect를 확인. 전용 LOGIN/Credential·inactive workflow·실제 Jira action 복구는 남음 |
| 2026-11-08 | v4.1 | 조회 전용 DLQ list/inspect 및 linked Jira GET 워크플로우, 별도 NOLOGIN reader dispatcher와 bounded migration 017 추가. full disposable migration chain·role contract 및 33 local checks 통과; fresh restore rehearsal·리뷰·VM 적용/실 Jira GET은 pending |
| 2026-11-08 | v4.2 | 원격/로컬 `main`을 `dd919d7`로 고정하고 [P18 VM read-only DLQ/Jira 조회](../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md) 및 [Discord/Jira 핵심 UAT 부분 결과](../../runs/public/20261108-104900-vm-discord-jira-uat/report.md)를 동기화. recovery action·전체 VM artifact manifest·전체 사용자/장애 회귀는 미완료 |
| 2026-11-08 | v4.3 | [VM PR36/UX 읽기 전용 기준선](../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md)을 추가. PR36·UX 병렬 배포, 이미지 태그, n8n 게시 라벨, PR36 DB의 `recovery_control` 부재를 기록하고 전체 manifest·복구 검증은 미완료로 유지 |
| 2026-11-08 | v4.4 | 이미지 ID prefix·n8n/PostgreSQL 버전·Git tag suffix 매핑을 추가하고, OCI source provenance와 현재 RAG memory index 적재/문서 revision은 미확인임을 명시 |
| 2026-11-08 | v4.5 | 60개 사례·64개 수용 요구와 UAT/DLQ/오류 종단을 의존성 순으로 묶은 [최종 통합 시험 계획](final-test-plan.md)을 추가. 계획만 작성했으며 시험은 실행하지 않음 |
| 2026-11-08 | v4.6 | 가이드/요구 ID/8개 workflow/P23–P31 산출물 연결, 기존 시험 재사용 경계 및 사례·요구별 매핑을 [최종 통합 시험 계획](final-test-plan.md)에 추가·재검증. 서비스 시험은 미실행 |
| 2026-11-08 | v4.7 | VM RAG 두 workflow namespace 교차 시험을 원인으로 확인. matching `dubakwi-index` 후 public/restricted/empty/invalid/off 표적 검증 5개 통과와 PR36 전용 search smoke를 기록. [최종 시험 계획 v1.6](final-test-plan.md)·RAG 설계를 최신 결과에 맞추고 전체 16-case RAG 및 나머지 종단은 미완료로 유지 |
| 2026-11-08 | v4.8 | 16개 VM search case를 실행해 15/16 통과, SR-WF12 mixed-intent 기대 근거 누락 1건을 기록. B13-style security query hint 검색은 통과. `/dubakwi-support`는 auth mismatch 401로 미실행, n8n restart/reindex는 workflow 중단 가능성으로 보류. [시험 계획 v1.7](final-test-plan.md)·RAG 설계에 동기화 |
| 2026-11-08 | v4.9 | active PR36 Support webhook을 분리 확인해 QR RAG 답변 E2E와 SR-WF12 intent-transform→security evidence→urgent Jira handoff E2E를 통과시킴. `/dubakwi-support`는 P11 skeleton endpoint로 재분류. Raw direct-search SR-WF12 failure를 보존하고, running n8n index execution 2167 때문에 restart/reindex recovery를 미완료로 유지. 시험 계획 v1.10·RAG 설계·실행 결과 동기화 |
| 2026-11-08 | v5.0 | [Discord 읽기 전용 확인](../../runs/public/20261108-134000-vm-discord-alert-readonly/report.md)에서 기존 시민 UAT 응답을 재확인하고 제한된 Jira 알림 채널로 인해 담당자 실제 수신/열람을 BLOCKED로 판정. 문서 v1.11, 정적 링크/공개 후보 검사 결과를 동기화. TC-07 recovery action, TC-15 VM 고장 종단, n8n restart/reindex는 미완료 |
| 2026-11-08 | v5.1 | 로컬 임시 메모 `tmp/vm-edge-web-ssh-resume.md`의 절차를 사용해 PR36 Index 실행 상태를 VM에서 재확인. 실행 #2167이 `running`·`stoppedAt=null`, 해당 workflow 최근 실행 1건이다. 상태 조회는 가능하나 memory-safe recovery 조건을 확보하지 못해 재시작/재색인은 실행하지 않음. 최종 시험 계획 v1.12·RAG 설계 v0.18·실행 결과를 동기화 |
| 2026-11-08 | v5.2 | n8n execution UI에서 #2167 상세를 찾지 못했고 전체 Running filter도 비었음을 기록. 별도 legacy 색인 #2170 성공 10.699초와 이전 PR36 44청크 복구 성공을 서로 다른 범위로 유지. 최근 PR36 user RAG E2E 통과와 execution metadata 불일치를 분리 기록. n8n UI에 중지 대상이 없어 workflow/container 강제 종료 및 재색인은 보류. [대조 증거](../../runs/public/20261108-135700-vm-rag-execution-ui-crosscheck/report.md) |
| 2026-11-08 | v5.4 | 11/8 RAG 16/16, D05/J04 거부 경계, J02 담당자 처리·사용자 확인 알림 수신, TC-07 read-only lookup을 반영. D10/TC-15는 환경 미준비 BLOCKED/NOT RUN, TC-07 recovery action은 미구현으로 구분. 최신 판정은 [최종 시험 계획 v1.24](final-test-plan.md) 참조 |
| 2026-11-08 | v5.5 | 구현 기준 현황을 다시 동기화: TC-07 recovery action은 조회 전용 사용자 완료 범위 밖으로 명확화, migration 017 조회 반영, 60 사례·64 요구 추적과 제출 산출물 점검을 잔여 마감으로 고정. 최신 시험 판정은 [최종 시험 계획 v1.25](final-test-plan.md) 참조 |


## 2026-11-08 14:01 RAG 복구 후 상태

[재시험 결과](../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md)에서 n8n 재시작, PR36 전용 index 44 items UI 성공, 후속 QR 자동 답변 및 rental-guide 근거를 확인했다. 실행 DB는 #2167과 신규 #2211을 여전히 running으로 표시해 메타데이터 동기화는 미해결이다. 따라서 사용자 QR RAG 경로는 재색인 후 확인됐지만 실행 lifecycle 관측 및 미실행 TC-15 등 다른 통합 항목은 별도 미완료로 유지한다.

### 2026-11-08 PR36 RAG 표적 matrix 후속

[PR36 직접 검색 7-case 시험](../../runs/public/20261108-141600-vm-pr36-rag-matrix/report.md)은 표적 assertion 7/7 통과다. 비활성·invalid·empty·citizen canary·staff restricted·mixed security query를 PR36 path 자체에서 확인했다. 최초 Web SSH 입력의 구문 오류와 수정 batch 결과는 별도 run 기록으로 구분했다. 전체 16-case search matrix와 index 실행 lifecycle/소요시간은 아직 닫지 않았다.

### 2026-11-08 PR36 전체 RAG 검색 matrix와 잔여 경계

[전체 16-case 시험](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md)은 16/16 기대 결과 통과다. QR 및 SR-WF12 Support 종단 결과와 함께 PR36 RAG 검색·권한 기능 시험을 완료로 판정한다. SQLite execution row의 `running` 표기와 index 소요시간 미측정은 실행 관측/성능 기록의 잔여 한계로 보존하며 새 시험 gate로 만들지 않는다. J02 담당자 처리는 사용자 확인 Discord 알림 수신까지 각 실행 범위에서 확인했다. TC-07은 read-only 조회까지 확인했으며 retry/recovery action은 이번 범위 밖이다. D10/TC-15는 환경 미준비로 BLOCKED/NOT RUN 종결했다. 현재 남은 마감은 60 사례·64 요구 ID 추적, 공식 제출 파일 점검, `tscan` 및 VM 재현 여부 기록이다. 이 문서에 정의한 완료 범위를 넘는 추가 RAG 시험은 열지 않는다.
