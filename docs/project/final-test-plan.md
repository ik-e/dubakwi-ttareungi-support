# PR36 최종 통합 시험 계획

<!-- final-closeout-current -->
11/09 최종 동기화: 기존 시험 재사용을 원칙으로 60사례·64요구의 누락 없는 근거표를 작성했다. 새 서비스 요청·고장 주입은 없다. 대표 시연의 저장/감사 확인, Jira All 큐, 문서·발표·패키지 검사는 [마감 기록](../../runs/public/20261109-112300-local-final-closeout/report.md)에 정리한다. 다음의 날짜별 계획·차단 기록은 과거 증거로 보존한다.
<!-- /final-closeout-current -->

- 작성일: 2026-11-08 KST
- 문서 버전: v1.26 (2026-11-09 전수 근거 추적·최종 제출 정리)
- 상태: 계획된 PR36 RAG 검색/권한 시험은 [matrix 16/16](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md), QR 및 SR-WF12 Support 종단 증거로 완료 판정한다. J02 담당자 처리와 사용자 확인 Discord 알림 수신, TC-07 bounded DLQ list/inspect 및 연결 Jira GET도 각 증거 범위에서 확인됐다. TC-07 retry/recovery action은 사용자가 정한 조회 전용 완료 범위 밖이며 구현·검증하지 않았다. D10 및 TC-15는 [16:05 환경 준비 점검](../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md)에서 실행 환경 미준비로 BLOCKED/NOT RUN 종결했다. 이는 기능 통과가 아니다. SQLite execution row의 `running` 표기와 index 처리시간 미측정은 기록상 한계이며 추가 시험 gate가 아니다. D05 미등록 계정과 J04 타인 소유 문의 거부 경계는 각각의 live 실행 범위에서 확인했다. 60개 사례·64개 요구 ID의 개별 판정·근거·한계 연결을 [최종 근거표](../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md)로 완료했다. 제출 산출물과 검사 범위는 [마감 기록](../../runs/public/20261109-112300-local-final-closeout/report.md)에 연결했다. 전체 실행 PASS를 뜻하지 않는다. 저장소 `main` `dd919d7`과 VM 이미지/workflow의 완전한 source mapping은 입증되지 않아 VM 결과를 이 커밋에서 실행한 것으로 합산하지 않는다.
- D04 추가 실행: [2026-11-08 14:43 KST](../../runs/public/20261108-144413-vm-discord-d04-lookup/report.md)에서 완료된 기존 synthetic 문의 상태를 Discord 비공개 응답으로 재확인했다. 사용자 화면 응답은 통과, Jira/DB read log는 미검증으로 구분한다.
- D03 Jira 대조: [2026-11-08 15:21 KST](../../runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md)에서 동일 case/first_request_id의 Jira context revision 1~3과 같은 ticket_key를 확인해 Jira 재사용·후속 누적을 통과로 보강했다. 별도 Discord ID를 사용한 미등록/타인 소유권 UI 시험과 담당자 직접 열람·알림 수신은 여전히 별도 증거가 필요하다.
- D06 타인 소유 문의: [2026-11-08 15:30 KST](../../runs/public/20261108-153000-vm-discord-d06-cross-owner/report.md)에서 현재 등록 Discord 세션으로 기존 R05의 열린 타인 소유 synthetic case_ref를 제출했다. 봇은 일반 연결값 오류만 반환했고, Jira 검색에서 시험 문구의 신규 이슈는 없었다. DB state/DLQ 직접 조회는 하지 않았다.
- 코드 기준: 로컬/원격 `main` `dd919d7`
- VM 기준: [초기 읽기 전용 snapshot](../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md) 및 [2026-11-08 12:08 KST runtime 재확인](../../runs/public/20261108-120800-vm-runtime-refresh/report.md). 이미지 ID prefix/tag와 workflow 매핑은 초기 snapshot 기준이며 재확인에서는 container health/version만 확인했다. VM 시험 결과는 이미지 ID와 workflow 식별자로 기록하며 `dd919d7`에서 실행한 것처럼 합산하지 않는다.
- 관련 원본: [시스템 설계](SYSTEM-DESIGN.md), [워크플로우 설계](WORKFLOW-DESIGN.md), [RAG 설계](RAG-ARCHITECTURE.md), [저장소 설계](STORAGE-DESIGN.md), [개발 원장](../DEVELOPMENT-PLAN.md), [마감 상태](implementation-status-and-closeout-plan.md)

2026-11-08 v1.25 동기화 기록: 현재 구현 증거와 사용자 확정 범위를 상단 판정에 반영했다. TC-07 retry/recovery action은 이번 완료 범위 밖, D10·TC-15는 환경 미준비 BLOCKED/NOT RUN, 남은 마감은 60 사례·64 요구 ID 추적과 제출 검사로 구분했다. VM 이미지·workflow와 저장소 `dd919d7`의 완전한 source mapping은 미확인 상태로 유지한다.

## 1. 목표와 시험 범위

시민 문의의 기대 결과, 실제 Jira 효과와 담당자 처리, RAG 근거·권한, 최소 상태/DLQ, 오류 경계가 같은 요청·티켓으로 연결되는지 검증한다. 설계된 지원 기능을 전체 적용하되, 구현되지 않은 기능을 통과로 바꾸지 않는다.

계획 대상은 `cases/`의 60개 사례 정의, `infra/contracts/full-system-coverage.json`의 64개 요구 ID, 이용자 UAT D01–D10, Jira J01–J04, 운영자 DLQ list/inspect, TC-07 복구 범위 및 TC-15 고장 경로다. 같은 실행이 여러 요구를 덮을 수 있으나 각 요구 ID는 개별 판정표에 남긴다.

현재 시험 대상 구성은 PR36 API와 UX API가 병렬로 있는 VM이다. 저장소에는 8개 `workflows/dubakwi-*.json` 원본이 있다. PR36 core, dual-storage, UX VM workflow 묶음은 서로 겹칠 수 있으므로 0단계에서 실제 workflow ID·이름·활성/게시 상태·호출자를 원본별로 연결한다. 기존 문의 로직·RAG/Jira/저장 통합은 R01 시험 범위다. R02 소유의 새 UX 표현·상호작용 결과는 별도 증거로 연결하고, R02 검토 회신을 R01 시험의 선행 조건으로 두지 않는다. n8n 전체 106개 workflow를 제품 범위로 오인하지 않으며, UX 쪽 별도 5 workflow 결과도 PR36 원본 검증을 대체하지 않는다.

## 2. 시험 원칙과 판정

- **기준 분리:** 로컬 코드 회귀, disposable DB, VM runtime, Discord/Jira 사용자 조작, 정적 문서 검사를 각각 다른 증거로 기록한다. 서로 다른 범위의 통과 수를 합산하지 않는다.
- **효과 대조:** HTTP 응답만으로 통과 처리하지 않는다. Discord 공개 범위, Jira key/상태/담당/문맥, DB state/DLQ revision, 호출 수 및 재전송 여부를 확인 가능한 실제 근거와 연결한다.
- **기존 시험 연계:** 기존 run을 먼저 기준선/commit·image/workflow·설정·사례 입력·기대값·증거 범위로 대조한다. 모두 동일하고 원자료 링크가 유효한 항목은 `재사용(기존 증거)`로 표시하며 이번 실행의 새 통과 수에 합산하지 않는다. 기준 버전/설정이 다르거나 증거가 mock·표본·부분 범위이면 그 사실을 붙여 차이를 재시험한다. 원 보고서는 수정하지 않고 새 run에서 연결한다.
- **최초 결과 보존:** 실패를 수정해 재시험할 때 새 실행 ID를 발급한다. 기존 실패 보고서·JSON·실행 이력을 덮지 않는다.
- **시험 데이터:** 새 Jira 사례는 synthetic 내용과 시험 계정만 사용한다. 실제 환불·요금 변경·대여/반납 조작은 하지 않는다. Jira 티켓 정리·삭제는 이 계획의 일부가 아니다.
- **장애 격리:** 고장 주입은 승인된 시험 사본·synthetic case·고유 case/request ID로만 수행한다. 트리거·fault switch의 켜기/끄기 상태를 기록하고 시험 뒤 원상태를 확인한다. 정상 운영 webhook으로 장애를 주입하지 않는다.
- **비밀·개인정보:** Credential 이름/참조와 유무만 기록한다. 키·토큰·원시 로그·실제 이름·Discord ID·실제 Jira key·문의 원문을 공개 결과에 넣지 않는다.
- **측정:** WF-11의 가이드 예시 `6초`는 운영 SLA가 아니다. 설계의 `20초` deadline과 `25초` 관측 상한을 판정 기준으로 사용하고, 지연·시도 수·외부 효과를 함께 기록한다.

| 판정 | 적용 기준 |
| --- | --- |
| 통과 | 기대 응답·Jira/저장 상태·근거·금지 부작용을 모두 관측했고 재현 가능한 증거가 있음 |
| 실패 | 실행이 완료됐고 현재 구현이 계약 기대와 다름. 최초 실패와 영향을 명시 |
| 차단 | 실행 전 필수 의존성/계정/기능이 없거나 실행 권한 경계가 충족되지 않음 |
| 미실행 | 계획됐으나 아직 실행하지 않음. 차단 사유가 확인되지 않은 단순 미수행 포함 |
| 해당 없음 | 요구가 현재 시스템 범위 밖임. 근거 문서/결정과 함께 기록 |

## 3. 실행 순서

이미 확인한 VM 기준선과 과거 성공 증거를 다시 실행하지 않고 재사용한다. 단계는 시험을 위한 순서만 정하며, 계정·기능이 없는 한 사례가 다른 독립 시나리오를 막지 않는다.

| 순서 | 작업 묶음 | 실행/재사용 범위 | 완료 기준 |
| --- | --- | --- | --- |
| 1 | 기준선·기존 결과 고정 | 11/8 VM snapshot/runtime, 11/7 PR36 통합, 11/8 D08 RAG smoke, 로컬 회귀, TC-07 DLQ list/inspect 결과를 근거로 연결. 실행환경에서 확인된 이미지 tag, workflow ID/게시 상태, DB migration, 시험 계정 경계를 요약 | 동일 환경에서 수행한 결과와 다른 버전/범위 증거를 구분. 전체 source JSON/credential mapping은 참고 한계로 기록하고 시험 선행조건으로 요구하지 않음. 기준선은 확보됨; 재실행 불필요 |
| 2 | 사용자·RAG·Jira 핵심 시나리오 | RAG는 PR36 대응 index/search로 `cases/search.json` 16개 전부 통과했고 QR 및 SR-WF12 Support 종단도 통과했다. Jira 표본의 접수·완료 후 본인 조회, DLQ 조회는 기존 run을 재사용한다. 남은 것은 사용자 가이드의 미판정 사례 및 담당자 직접 열람/실제 알림 수신처럼 독립 증거가 필요한 항목만이다. | 사례 ID마다 기존 evidence 또는 신규 판정이 연결됨. 등록되지 않은 계정/별도 계정이 없으면 해당 사례만 차단한다. RAG execution metadata 상태·색인 시간 관측은 추가 gate가 아니다. |
| 3 | 저장·DLQ 조회 및 오류 경계 | TC-07 VM list/inspect 및 연결 Jira GET 통과 증거와 기존 local/disposable 계약 시험을 재사용한다. 사용자가 정한 DLQ 완료 범위는 read-only 조회까지다. 운영자 retry/recovery action은 구현·검증 과제에서 제외한다. | DLQ 조회와 설계상 존재하는 recovery action을 구분하고, action 미구현을 이번 완료 기준의 실패로 세지 않는다. 기존 오류 회귀는 사례별 실제 실행 범위만 기록한다. |
| 4 | TC-15 격리 고장 종단 (최후순위) | 기존 사본에 운영 PR36 webhook 참조가 있어 격리 경로가 확인되지 않은 상태다. 이미 승인된 시험 범위는 유지하되, 안전한 고유 ingress/fault 배선을 기존 설정에서 확인할 수 있을 때만 요청 2건을 수행한다. | 격리 경계가 현재 확인되지 않으면 TC-15만 차단으로 종결하고 정상 경로/다른 테스트를 되돌리지 않는다. 사본을 새로 구현하거나 execution metadata 관측을 추가하지 않는다. |
| 5 | 최종 회귀·요구/산출물 마감 | 변경이 있었던 경로만 표적 재시험하고, 최종 코드 변경이 생긴 경우 로컬 전체 회귀. 60 case·64 requirement 판정표, 실행 결과서·원장·상세 설계·필수 발표/제출 산출물, 공개 파일과 비밀 검사 정리 | 모든 ID가 기존 근거 재사용/신규 통과/실패/차단/미실행 중 하나로 추적됨. 문서·산출물 검사를 통과하고 미완료 범위를 명시. 사용자 핵심 기준에 남은 필수 미구현이 있으면 최종 완료라고 하지 않음 |

### 진행 중 중단 규칙

- baseline 변경이 실제로 발견된 경우에만 영향 받는 시나리오를 분리해 새 run으로 수행한다. unrelated 테스트는 계속한다.
- 한 계정·기능·실행본이 없으면 영향을 받는 사례만 `차단`한다. 다른 사례의 테스트를 연쇄 중단하지 않는다.
- RAG가 현재 실제 요청에서 근거 결과를 반환하면 기능 시험을 계속한다. 검색 실패가 관측된 경우 해당 사례와 원인을 기록하되, 벡터 store 쓰기/임베딩 비용/메모리 손실을 수반하는 재색인·재시작은 별도 필요성이 확인되기 전 실행하지 않는다.
- 실제 외부 효과가 예상과 다르거나 원 실행이 미확인 상태면 해당 효과 경로의 재호출만 멈추고 known ID와 evidence를 보존한다.
- 시험 사본/credential 경계가 TC-15에서만 필요한 조치는 TC-15 단계에서 점검한다. 앞선 독립 작업의 선행조건으로 삼지 않는다.
## 4. 전체 case·요구 매핑

### 4.1 `cases/` 60개 정의

| 파일 | 수 | 처리 방식 |
| --- | ---: | --- |
| `cases/common.json` | 17 | 일반 안내, 보완 한도, 이관, 본인 조회, 시간·오류 경계. 외부 호출 없이 판정되는 것과 VM 필수 항목 분리 |
| `cases/team.json` | 11 | Jira·저장·권한 및 팀 특화 계약. 사전 case/ref가 필요한 항목은 준비 결과 기록 |
| `cases/team-extended.json` | 13 | 다단계·장애 시나리오. TC05/07 등 저장·DLQ 사례는 묶음 3, TC15는 묶음 4에서 실행 |
| `cases/search.json` | 16 | RAG 검색 전용. 과거 실연동 및 현재 smoke 증거를 연결하고 미검증 검색/권한 항목을 현행 경로에서 판정 |
| `cases/p11-entry.json` | 3 | 입구 mock 시험이며 VM 업무 처리나 RAG/Jira 실연동 증거로 계산하지 않음 |
| **합계** | **60** | 각 사례의 `x_dubakwi.id`마다 PASS/FAIL/BLOCKED/NOT RUN와 run/evidence 위치를 기록 |

현행 ID 집합은 다음과 같다. `common.json`: WF01, WF02, WF02b, WF03, WF04, WF05, WF06, WF07, WF08, WF09-1, WF09-2, WF10, WF11, WF12, WF13a, WF13b, WF13c (17); `team.json`: TC03a, TC03b, TC03c, TC04, TC09a, TC09b, TC09c, TC11a, TC11b, TC12, TC13 (11); `team-extended.json`: TC01, TC01b, TC02, TC05, TC06, TC07, TC08, TC10, TC14, TC15, TC16, TC17, TC18 (13); `search.json`: SR-WF01, SR-WF02, SR-WF03, SR-WF04, SR-WF12, SR-TC04, SR-TC09a, SR-TC09b, SR-WF05, SR-R01, SR-R02, SR-R03, SR-R04, SR-STAFF01, SR-STAFF02, SR-OFF (16); `p11-entry.json`: P11-01, P11-02, P11-03 (3). 합계 60이며 파일 변경 시 이 ID 목록과 수를 다시 대조한다.

원 사례의 `expect`, `assert`, 설계 `open_items`를 결과에 맞게 수정하지 않는다. 구현 기대와 원 설계가 다르면 그 사례를 `계약 불일치/차단`으로 남기고 문서 원본에 결정 이력을 남긴다. 다단계 case는 요청별 개별 응답뿐 아니라 `case_ref`, Jira key, ticket 문맥 revision, state/DLQ와 호출 수를 함께 대조한다.

### 4.2 64개 수용 요구 (W01–W12)

| 패키지 | 요구 수 | 시험 내용과 주요 증거 |
| --- | ---: | --- |
| W01 채널·Discord | 6 | 등록/미등록, 비공개 응답, 같은 interaction 중복, 응답/봇 오류, 실제 수신 경계 |
| W02 support behavior | 13 | 분류·안내·보완·이관·조회·긴급·LLM 실패·저장 게이트 |
| W03 실제 records provider | 1 | owner/binding 조회, Jira 결과, target write 0, 가림 응답 |
| W04 case/context restore | 3 | 작성자/페이지·문맥 revision·facts 복원, 충돌/권한 |
| W05 Jira effects | 9 | create/reuse/assign/close/notify, idempotency, known ID, 외부효과 독립 조회 |
| W06 state/DLQ | 9 | 조건부 갱신·revision·claim/release/complete·unknown effect·재생 제한 |
| W07 RAG/permissions | 9 | 색인/chunk ACK/readiness·권한·인용·canary·오류·검색 지연 |
| W08 fault/verdict | 6 | 고장 전/후 상태, effect count, 중지·무재실행·판정 연결 |
| W09 deployment baseline | 2 | 코드/이미지/workflow/config 식별, 게시/비활성·credential 참조·변경 경계 |
| W10 isolated restore | 2 | 백업·복원·권한·restart·상태/검색 복구·RPO/RTO 측정 |
| W11 operations/limits | 2 | 보존·비밀 교체·수동 절차·미구현 범위 |
| W12 final closure | 2 | 60 case/64 requirement evidence 연결·문서/공개/재현 일치 |
| **합계** | **64** | `infra/contracts/full-system-coverage.json`의 원 ID별 판정 보존 |

요구 ID의 원본 패키지 배정은 W01=C01,C02,C05–C08; W02=C03–C04,B01–B09,J02,J13; W03=J01; W04=J03,J12,J15; W05=J04–J11,J14; W06=S01–S09; W07=R01–R08,E03; W08=E01–E02,E04–E06,E08; W09=O01–O02; W10=E07,O03; W11=S10,O04; W12=O05–O06이다. 각 ID와 원 완료 조건을 `infra/contracts/full-system-coverage.json`과 재대조해 [64개 전체 판정표](../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md)를 채웠다. PARTIAL_EVIDENCE·BLOCKED·범위 밖은 완료 PASS로 바꾸지 않았다.

이 표의 요구 수는 해당 패키지의 적용 범위이지 개별 런타임 PASS 수가 아니다. 정적 coverage 누락 검사가 0이어도 런타임 통과로 간주하지 않는다.

### 4.3 저장소 workflow별 시험 연결

| 원본 workflow | 핵심 검증 | 실행 묶음·요구 |
| --- | --- | --- |
| `dubakwi-support.json` | 입력·권한 게이트, 분류/agent route, 답변 검증, 저장 finish gate, 응답 | 2–3; W01/W02/W08, common/team |
| `dubakwi-search.json` | public/restricted 권한, 근거·인용, empty/error/not-ready, 호출·지연 | 2; W07, search 16건 |
| `dubakwi-handoff.json` | owner 조회, Jira 생성·재사용·담당·종료, context/facts, 오류 envelope | 2–3; W03–W05, J01–J15·관련 TC |
| `dubakwi-index.json` | Manual 색인 workflow의 입력 manifest/권한/버전, chunk·embedding ACK와 실행 시 쓰기 효과. 기존 성공 증거가 있으므로 재색인은 상태 소실 등 실제 근거가 있을 때만 검토 | 2; W07, SR-R01 |
| `dubakwi-state.json` | begin/prepare/bind/save/finish, CAS/revision, replay/conflict, 효과 미확인 | 3; W06/W08, TC05/06/08/10/14/16–18 |
| `dubakwi-dlq.json` | DLQ insert/list/inspect/claim/release/complete 경계와 중복·unknown 제한 | 3–4; W06/W08, TC07 및 TC15/오류 사례 |
| `dubakwi-recovery-operator.json` | 기존 운영자 경로 list/inspect→Jira GET read-only, 입력 가림·권한. recovery action은 VM 미구현 증거와 분리 | 3; W06/W11, TC07 |
| `dubakwi-errors.json` | Error Trigger, error context/state/DLQ, 알림 결과·unknown 분기·재실행 방지 | 3–4; W08, TC15·오류 사례 |

각 행은 결과에서 확인한 실제 VM workflow ID/상태를 기록한다. source JSON·credential reference 전체 대조는 알려진 범위와 한계를 남기는 provenance 작업이며, 이미 동작이 검증된 VM 기능 시험의 선행조건은 아니다. 실제 시험 대상이 없을 때만 해당 workflow 항목을 차단한다.

### 4.4 사용자·담당자 수동 UAT

| 범주 | 시나리오 | 필수 관측 |
| --- | --- | --- |
| Discord 시민 D01–D10 | 근거 기반 안내, 이관, 같은 문의 보완, 본인 상태, 미등록, 타인 정보, 근거 부족, 고장, 요금/환불, 중복 안전 | 본인에게만 응답, 근거/route, case_ref, Jira/저장 효과. D06는 등록 계정으로 기존 R05 타인 소유 case를 제출한 live bot 시험을 재사용한다. D05는 실제 임시 Discord identity로 미등록 거절을 확인했다. 같은 interaction replay는 별도 harness에서만 |
| Jira J01–J04 | 접수·배정, 담당자의 실제 열람/처리, 완료 후 시민 상태, 다른 owner 거절 | exact issue key 연계, Jira history와 계정 직접 열람, 상태 조회·무변경 권한 거절 |
| 운영 DLQ 조회 | 기존 operator workflow `list`→`inspect`→연결 Jira GET | 조회 필드 가림, Jira GET, workflow 비활성·입력 초기화, 업무 state/DLQ/Jira/Discord writes 0. Jira 화면의 DLQ 관리 기능은 미지원으로 기록 |

이전 UAT 증거는 부분 활용한다: D02 이관과 Jira 문맥, J01/J03의 같은 티켓·완료 후 owner lookup은 이미 확인된 표본이다. D03 정의 문장은 Jira revision 1~3 같은 티켓 누적까지 확인했다. D06는 기존 R05 타인 소유 case에 대한 Discord live 거부로 확인했다. 담당자 직접 처리는 [J02 실행](../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md), 실제 Discord 알림 수신은 [사용자 확인](../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md)으로 완료 처리했다. D05는 [15:42 live 실행](../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md)에서 미등록 응답과 Jira 무일치를 확인했다. D10 실 플랫폼 replay는 별도 근거가 필요하다. J04는 [16:00 live 실행](../../runs/public/20261108-160000-vm-discord-j04-cross-owner-case/report.md)에서 거절 응답·기존 Jira 무변경·새 일치 티켓 미검색을 확인했다. [기존 실행](../../runs/public/20261108-104900-vm-discord-jira-uat/report.md)은 전체 가이드 통과가 아니다.

## 5. 필수 산출물 연결

| 개발계획 | 필수 결과물 | 시험 마감 시 확인 |
| --- | --- | --- |
| P22/P26 | case·요구별 `runs/public/<실행묶음ID>/report.md`와 `summary.json`; 비공개 원시는 Git 제외 `runs/<실행묶음ID>/` | 환경/버전, 입력·기대·실제, 판정, 외부 효과·측정, 실패/재시험 링크, 가림 |
| P14 | `docs/project/daily/DAY80.md` | 기존 발표①·기초 구현 상태를 역사 증거로 보존하고 최종 수행 결과와 혼동하지 않음 |
| P23/P27 | `docs/project/EXECUTION-RESULT.md`와 공유 증거 | 최초 실패 보존, 최종 run·범위별 결과·차단/미실행 연결 |
| P24 | `docs/project/daily/DAY81.md` | 발표·기능 동결 당시 상태와 누락을 역사적 기록과 최종 증거로 구분 |
| P25 | `requests/*.json` 및 demo sequence | 공식 시연 순서와 시험된 synthetic 입력·고장/복원 설명 연결 |
| P28 | README, 시스템·워크플로우·RAG·저장소 설계, `docs/DEVELOPMENT-PLAN.md` | 구현/실측/한계/재현 절차와 버전·문서 이력 동기화 |
| P29 | 발표 자료·발표자 메모, S09–S10 근거 | 수치가 실행 결과서와 일치하고 미실행은 계획으로 표시 |
| P30 | `docs/project/daily/DAY82.md` | 제출 전 결과·잔여 한계·시험 보고 상태 |
| P31 | 제출 후보 파일·경로 대응·기본 브랜치·DAY80/81/82 세 데일리·비밀/재현 검사 증거 | 후보 파일과 보고서/데일리/설계 링크 일치, `tscan staged` 및 최종 `tscan scan .` 실행. 도구 미제공이면 대체 검사와 한계를 기록 |

산출물이 누락되면 런타임 시험 PASS와 별개로 제출 준비 완료로 판정하지 않는다. 발표·데일리·제출 파일 검토는 서비스 시험 결과와 합산하지 않는다.

## 6. 기존 시험 증거의 재사용·재시험 경계

| 기존 증거 | 계획에서의 용도 | 재사용 한계 / 새로 필요한 확인 |
| --- | --- | --- |
| [VM baseline snapshot](../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md) + [runtime refresh/workflow UI](../../runs/public/20261108-120800-vm-runtime-refresh/report.md) | image ID/tag·n8n/DB 버전·PR36/dual/UX 게시 라벨·Index 미게시/실행 없음 | 최신 refresh는 컨테이너/version/UI만 재확인했다. OCI revision label, exact exported workflow JSON/credential bindings, current RAG memory population은 여전히 미확인 |
| [local case matrix](../../runs/public/20261107-214910-local-p26-case-matrix/report.md) | 사례 입력의 준비 가능/차단 상태와 기존 fixture 경계 | 2026-11-07 상태이므로 현행 60개 정의와 각 선행조건을 다시 대조; dry-run을 runtime PASS로 쓰지 않음 |
| [PR36 VM integration](../../runs/public/20261107-170503-vm-pr36-integration/report.md) | core VM 흐름·과거 실패·효과 대조의 기준 증거 | 기존 VM 구성/버전에서 실행한 표본이다. 최신 VM manifest와 매핑 후 같은 경로 여부만 결정하고 전체 회귀로 합산하지 않음 |
| [local P26 regression](../../runs/public/20261107-214804-local-p26-regression/report.md) | Python/Support/P12/P18–P20 등의 로컬 회귀 출발점 | VM 연동·Jira/Discord 외부 효과·RAG 실색인 증거가 아님. 코드/fixture가 현재 `dd919d7`과 일치하는지 확인 후 영향 범위만 재실행 |
| [local RAG contract](../../runs/public/20261107-204523-local-rag-contract/report.md) | 지식 artifact/청킹/offline retrieval/AUTH fixture | 현재 VM memory index 내용·권한별 실검색·citation 종단은 별도 확인 |
| [VM Jira lifecycle](../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md) | 동일 티켓 보완, owner/other/missing 조회, 완료 후 owner lookup | 표본 증거로 연결하고 UAT J02 담당자 직접 열람/처리·D03 가이드 입력·나머지 UAT를 대체하지 않음 |
| [VM TC-07 lookup](../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md) | list/inspect 및 linked Jira GET read-only slice | `recovery_control` action·claim/resume/complete 실연동을 통과 처리하지 않음 |
| [2026-11-08 Discord/Jira UAT](../../runs/public/20261108-104900-vm-discord-jira-uat/report.md) | D02와 이어진 Jira 문맥·상태 표본 | D03 입력 불일치, 직원 열람/수신 미확인, 다른 D/J 항목 미실행은 별도 상태로 남김 |
| [TC-15 local retest](../../runs/public/20261107-193015-local-p26-tc15-retest/report.md) 및 [VM 사본 준비](../../runs/public/20261107-210536-vm-tc15-h11-replacement/report.md) | local 후속 차단 계약과 VM 복제 준비 증거 | VM의 실제 synthetic 요청 2건·DLQ/Jira/effect 대조는 미실행 |

기존 증거는 사례별 판정표의 출처로 연결한다. 새 시험은 그 증거에서 바뀐 baseline·빠진 assertion·사용자/운영자 확인만 보완하고, 변경 또는 실패가 생기면 별도 run ID로 최초 결과를 보존한다.

## 7. 현행 사전조건·명시적 미완료

| 항목 | 현재 사실 | 시험 계획상 처리 |
| --- | --- | --- |
| RAG 현재 데이터 | VM에는 legacy `dubakwi-search`와 PR36 전용 search가 별도 key namespace로 있다. raw direct search 16건 중 15 pass/1 SR-WF12 relevance miss를 보존하며 PR36 Support intent-transform E2E는 별도 통과다. 14:02 n8n restart 후 PR36 index 44 items UI 성공 및 QR 근거 응답을 확인했다. SQLite #2167/#2211은 여전히 `running`/`stoppedAt=null`; index 시간 미측정이다. manifest 8개 승인 대기/색인 비활성, Simple Vector Store는 memory 기반이다 | [14:02 restart/reindex/QR](../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md), [13:30 SR-WF12 PR36 E2E](../../runs/public/20261108-133000-vm-pr36-rag-wf12-e2e/report.md), [13:25 QR E2E](../../runs/public/20261108-132500-vm-pr36-rag-e2e/report.md), [13:14 direct matrix](../../runs/public/20261108-131400-vm-rag-matrix/report.md)를 연결한다. 재색인 기능 경로는 한 번 확인됐고 execution metadata 정합성·index duration은 미해결 기록 한계로 유지한다 |
| 이미지 source provenance | VM image ID prefix와 tag는 고정됐지만 user API/Discord OCI revision labels 없음 | 해당 VM image ID로 시험 사실을 기록. `dd919d7` 소스 빌드라고 주장하지 않음 |
| TC-07 복구 action | DLQ list/inspect/Jira GET read-only 조회는 VM 통과. PR36 DB에 `recovery_control`이 없고 action recovery/verified complete는 미구현 | 현재 마감 범위는 사용자가 정한 조회까지만이다. 조회 결과를 재사용하고 복구 action은 미구현/범위 밖으로 표시하며 이번 완료 gate에 넣지 않는다. |
| D10 동일 interaction replay | adapter 단위 경계만 있음; live replay harness 없음 | BLOCKED/NOT RUN. 같은 interaction을 재전달할 환경이 없음 |
| TC-15 | 격리 미준비; 운영 webhook/shared DB 분리 미확인 | BLOCKED; 요청 없음 |
| 담당자 확인 | J02 처리 통과; 알림 수신은 사용자 확인 | [증거](../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md) |
| 별도 계정 권한 | D06는 등록된 현재 Discord identity와 R05 기존 타인 synthetic case 조합으로 live 거부 확인. D05 미등록 ID 거절은 실 Discord에서 통과, J04 타인 소유 case_ref 거절은 live 통과(화면/검색 범위) | [D05](../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md)와 [D06](../../runs/public/20261108-153000-vm-discord-d06-cross-owner/report.md)를 재사용한다. D06/J04의 DB state/DLQ 및 webhook 호출 효과는 직접 조회하지 않아 미확인 |

## 8. 테스트 결과 묶음·완료 판정

각 실행은 `YYYYMMDD-HHMMSS-vm-<짧은설명>` 형식의 KST ID로 `runs/public/<ID>/report.md`와 `summary.json`을 남긴다. 비공개 correlation/key/raw logs는 Git 제외 `runs/<ID>/`에 두고 공개본은 가린다. 결과에는 다음을 반드시 포함한다.

- source commit 또는 “VM image ID 시험”, image ID prefix, workflow name/ID·Published 상태, migration/version, RAG manifest/key/version, 실행일·환경
- 사례 ID/요구 ID, 선행 조건, 입력 형태, 기대 응답과 실제 응답 요약, Jira/state/DLQ/Discord 효과, 호출/재시도 수, PASS/FAIL/BLOCKED/NOT RUN
- fault-on/off와 workflow 활성 상태, 원 실행 종료·외부 효과 확인, 최초 실패 링크, 재시험 링크, 남은 위험/재현 순서
- 문서·공개 후보 검사와 실제 service test 결과를 분리한 요약

**전체 사용자 기준 완료**는 실행 가능한 60 사례와 64 요구를 기존 증거 재사용/신규 통과/실패/차단/미실행 중 하나로 추적하고, 핵심 정상 경로·RAG 권한/인용·Jira 생애주기·담당자 처리·저장/DLQ 조회 효과를 판정하며, 남은 차단/미구현이 사용자 결정 범위에서 허용됐다는 근거가 있을 때만 판정한다. RAG matrix는 16/16 통과했고 DLQ 범위는 read-only 조회까지다. 복구 action은 이번 마감 범위에서 제외한다. TC-15는 격리 조건을 만족하지 못하면 해당 항목만 차단/미실행으로 기록하며 다른 완료 증거를 무효화하지 않는다.

수정 시에는 영향 경로의 local suite → isolated/disposable failure test → VM targeted regression → 마지막에 full local regression 순으로 반복한다. 새 코드/노드 활성화나 업무 계약 변경은 이 계획의 시험 중 임의로 즉시 반영하지 않고 별도 변경으로 기록한 뒤 새 baseline/diff에서 재시험한다.





2026-11-08 Discord UAT 후속은 [실행 결과](../../runs/public/20261108-121900-vm-discord-uat-followup/report.md)에 기록했다. D07 내부 자료 거부, D08 안전 안내/인용, D09 환불 경계 질문은 응답 범위에서 확인했다. D02/D03의 Jira 연결·재사용은 이 회차에서 관측되지 않아 부분 판정이며 DB 효과도 독립 조회하지 않았다. 후속 D03 Jira 대조와 D06 타인 소유 접근 거부는 각각 별도 실행에서 보강했다. D05/D10, 담당자 직접 수신, TC-07 복구, TC-15는 완료로 올리지 않는다.



2026-11-08 [VM RAG readiness 점검](../../runs/public/20261108-122400-vm-rag-readiness/report.md)에서 현재 PR36 index workflow의 실행 이력 0, Manual trigger, Publish 비활성 상태를 확인했다. 이 index UI 이력은 0이지만 Manual 색인 실행 이력 저장 여부를 증명하지 않으며, 11/7 팀 VM 종단에서 재시작 뒤 44청크 색인·실제 검색이 확인됐고 11/8 D08에서 출처 응답이 관측됐다. RAG 기능 시험은 차단하지 않는다. 현재 memory population·문서/credential 계보는 부분 확인으로 남기고, 다음은 2번 묶음의 search 사례 matrix를 수행한다.

2026-11-08 v1.5: [현재 VM 후속](../../runs/public/20261108-125600-vm-final-test-followup/report.md)에서 index workflow 실행 뒤에도 SR-WF01이 `index_not_ready`임을 확인해 이전 readiness 가정을 업데이트했다. TC-15 Support 사본의 B14/B15/B27 운영 webhook 참조로 인해 사본 격리를 확인하기 전에는 요청을 보내지 않는 조건을 추가했다.
2026-11-08 v1.6: [대응 RAG workflow 재검증](../../runs/public/20261108-130600-vm-rag-correct-pair/report.md)으로 기존 Support search와 처음 실행한 PR36 index의 namespace 불일치를 원인으로 확인했다. matching `dubakwi-index` 후 5개 사례와 PR36 전용 search smoke를 별도 통과시켰고 전체 16개 search case는 미완료로 유지한다.
2026-11-08 v1.7: [전체 16개 RAG search matrix](../../runs/public/20261108-131400-vm-rag-matrix/report.md)를 실행해 15 pass/1 SR-WF12 relevance fail, B13-style hint 진단 통과, Support auth 401, restart recovery 미실행을 반영했다.
2026-11-08 v1.8: 올바른 `X-Team-Key`로 synthetic Support E2E 요청을 보냈다. HTTP 200이지만 active webhook이 `skeleton_mock` 이관 응답·empty sources를 반환해 RAG가 호출됐다고 판정하지 않았다. n8n execution 2167은 running 상태이며 stop/restart는 보류했다.
2026-11-08 v1.9: workflow 목록에서 active PR36 path `/dubakwi-support-pr36-a657890`과 paired search를 확인해 QR synthetic 요청을 실행했다. 자동 응답과 public `rental-guide` 근거가 반환되어 해당 user-facing RAG vertical slice 통과. 기존 `/dubakwi-support` 결과는 P11 skeleton endpoint였음을 분리. SR-WF12 및 restart/reindex recovery는 미완료.
2026-11-08 v1.10: SR-WF12 mixed security/ticket question을 active PR36 endpoint에 보냈다. B13 transform 후 expected public security evidence와 urgent high-priority Jira handoff `JBYS-172`를 확인해 E2E 통과. Raw direct-search fail은 재작성하지 않고 보존한다. Jira는 생성됐고 Discord receipt는 이번 run에서 직접 확인하지 않음. Restart/reindex recovery는 미완료.
2026-11-08 v1.11: Discord 앱의 민원 채널 기존 응답과 제한된 Jira 알림 채널을 읽기 전용 확인해 [별도 결과](../../runs/public/20261108-134000-vm-discord-alert-readonly/report.md)를 추가했다. 담당자 수신/열람은 계속 BLOCKED. 최종 정적 검사 23 files/882 links/58 anchors, 공개 후보 613/580 tracked/1,277 links, 오류 0; `git diff --check` 통과. `tscan scan .`은 실행했으나 이 환경에 `tscan` 실행 파일이 없어 시작되지 않았다. TC-07 recovery action, TC-15 격리 고장 종단, n8n restart/reindex recovery 및 제한 계정 경계는 미완료다.
2026-11-08 v1.12: 로컬 임시 메모 `tmp/vm-edge-web-ssh-resume.md`의 웹 SSH 재개 절차에 따라 로그인된 기존 Edge 탭에서 VM runtime을 재확인했다. 실제 n8n container의 SQLite를 read-only 조회해 PR36 index execution 2167 `running`, `stoppedAt=null`, 최신 일치 실행 1건을 확인했다. 실행 상태 조회는 가능하지만 복구는 수행하지 않았으며 현재 메모리 vector state 및 node data는 미확인으로 둔다. [별도 VM 결과](../../runs/public/20261108-134700-vm-rag-execution-refresh/report.md)를 연결한다.
2026-11-08 v1.13: n8n UI에서 execution #2167 상세와 전체 `Running` 필터에 항목이 없음을 확인했고, 다른 legacy `dubakwi-index` 성공 실행 #2170은 10.699초로 확인했다. 서로 다른 workflow/key namespace이므로 이를 PR36 색인 시간으로 일반화하지 않는다. 11/7 PR36 44청크 재색인·근거 E2E 성공은 있으나 색인 시간은 미측정이다. PR36 user E2E는 통과했으므로 RAG 서비스 failure는 미관측, execution persistence 불일치는 미해결로 기록한다. n8n UI에 실행 중지 대상이 없어 강제 중지나 재색인을 실행하지 않았으며 [대조 결과](../../runs/public/20261108-135700-vm-rag-execution-ui-crosscheck/report.md)를 추가한다.









2026-11-08 14:01 KST PR36 RAG 복구 재시험: [결과](../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md). n8n 컨테이너 재시작 후 PR36 전용 index UI 실행 44 items 성공, 후속 QR synthetic 문의는 HTTP 200 자동 답변과 public rental-guide 근거 2개를 반환했다. Jira/Discord 외부 효과는 없었다. SQLite는 #2167과 새 #2211 모두
unning으로 보여 UI/DB execution 상태 동기화는 여전히 미해결이다. 재색인 시간은 측정하지 않았고 이 재시험은 전체 RAG 권한·오류 matrix를 대체하지 않는다.



14:10 KST RAG follow-up: PR36 전용 경계 matrix 7건을 시도했으나 Edge Web SSH 결과 회수 전 UI 연결이 끊겨 처리 결과 불명이다. [기록](../../runs/public/20261108-141000-vm-pr36-rag-boundary-attempt/report.md). 사례를 통과/실패에 포함하지 않는다. 재개 때 request_id 중복 여부를 먼저 확인한다.

2026-11-08 14:14–14:16 KST PR36 RAG 표적 matrix: [결과](../../runs/public/20261108-141600-vm-pr36-rag-matrix/report.md). PR36 전용 search path의 public QR, empty, invalid access, disabled, citizen canary, staff restricted, mixed security 7개 assertion이 모두 통과했다. 이전 13:14 legacy path의 SR-WF12 raw query 실패를 PR36에 그대로 적용하지 않는다. PR36 index UI는 44 items 성공이지만 실행 UI 이력은 없고 SQLite #2211은 running/stoppedAt=null이다. 색인 시간은 미측정이다. 전체 16개 사례가 아니라 표적 7건이므로 full RAG matrix 완료로 처리하지 않는다.


2026-11-08 14:22 KST PR36 RAG 전체 search 사례: [실행 결과](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md). `cases/search.json` 16개가 PR36 전용 webhook에서 모두 명세 기대 결과를 반환했다(16/16). 시민 제한문서 비노출, staff 양성 2건, 빈 결과·잘못된 권한·비활성 경계를 포함한다. SQLite read-only 결과에서 해당 search 실행 #2228–#2243 전부 `running`/stoppedAt null; index #2211도 같은 상태다. 저장 설정은 성공/수동 실행/진행 기록을 모두 비활성화했다. UI 이력 미표시는 설정으로 설명되나 lingering running row의 원인은 미확정이다. 색인 시간도 미측정이다.


- D03 추가 실행: [14:48 Discord](../../runs/public/20261108-144900-vm-discord-d03-verified/report.md)와 [15:21 Jira 대조](../../runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md)에서 같은 case의 Jira ticket 재사용과 revision 1~3 누적을 확인했다. 담당자 지정과 handoff 기록은 있으나 실제 열람·Discord 수신은 미확인이다. [D06](../../runs/public/20261108-153000-vm-discord-d06-cross-owner/report.md)은 현재 Discord 등록 세션으로 기존 R05의 타인 소유 open case 접근을 시도해 일반 오류 거부와 신규 Jira issue 미생성을 확인했다. D05 live unregistered identity와 D10 replay는 미판정이다.

- 최신 사용자 시나리오 판정 연결: D01은 [PR36 VM 종단](../../runs/public/20261107-170503-vm-pr36-integration/report.md), D02/J01/J02 일부/J03은 [10:49 UAT](../../runs/public/20261108-104900-vm-discord-jira-uat/report.md), D07–D09는 [12:19 UAT](../../runs/public/20261108-121900-vm-discord-uat-followup/report.md), D04는 [14:43 조회](../../runs/public/20261108-144413-vm-discord-d04-lookup/report.md), D03은 [14:48 Discord](../../runs/public/20261108-144900-vm-discord-d03-verified/report.md)와 [15:21 Jira 대조](../../runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md)로 연결한다. 계정/담당자/replay 선행조건이 필요한 항목만 해당 범위에서 차단/미판정으로 남긴다.


2026-11-08 15:35 KST D05/D10 경계 및 잔여 확인: [실행 결과](../../runs/public/20261108-153500-local-discord-replay-boundary/report.md). `uv run --locked`로 Discord adapter unittest 22/22 통과. 미등록 map lookup과 동일 interaction의 안정 request_id 재사용은 로컬 부분 통과이며, 별도 Discord identity/실 플랫폼 replay는 미실행이다. 담당자 전용 채널 권한이 없는 J02 실 수신·열람은 미검증으로 둔다. TC-15 시험 사본은 기존 점검상 운영 PR36 search/handoff webhook 참조가 남아 안전한 고유 ingress/fault 배선이 확인되지 않았다. synthetic 요청을 보내지 않아 TC-15는 차단/미실행으로 종결하고 운영 경로는 변경하지 않았다.


2026-11-08 15:42 KST D05 미등록 계정 종단: [실행 결과](../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md)에서 Chrome Discord 임시 계정으로 문의를 보내고 본인 전용 미등록 거절 응답을 확인했다. Jira에서 동일 입력 문구를 검색해 일치 티켓이 없음을 확인했다. DB state/DLQ는 직접 확인하지 않았다. D05 실 Discord 미등록 경계는 통과로 판정한다.


2026-11-08 15:49 KST J02 담당자 직접 처리: [실행 결과](../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md). 기존 D02 synthetic 티켓에서 담당자와 현재 계정 표시가 일치했고, 상태 `진행 중`, 담당자 작성 내부 가상 처리 메모를 확인했다. 따라서 J02 담당자 직접 열람·처리는 통과다. Discord 알림 실제 전송/열람 및 DB state/DLQ는 미확인으로 남긴다.


2026-11-08 16:00 KST J04 타인 소유 문의 경계: [실행 결과](../../runs/public/20261108-160000-vm-discord-j04-cross-owner-case/report.md). 등록 `citizen-c`가 synthetic `citizen-a` case_ref를 조회해 일반 거절 응답을 받았다. Jira 기존 synthetic 티켓은 To Do 및 기존 업데이트 시각을 유지했고, 입력 질문 검색 결과 일치 이슈는 없었다. J04 live 개인정보 경계는 통과; DB state/DLQ·외부 호출 효과는 미확인이다.


2026-11-08 16:02 KST 담당자 Discord 알림 수신 확인: [사용자 확인 기록](../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md). 사용자가 기존 J02 담당자 알림을 실제로 수신했다고 확인해 완료 처리했다. 별도 Discord 화면/알림 로그를 독립 수집한 것은 아니다. 따라서 담당자 수신 확인은 완료이며 D10·TC-15·최종 요구 매핑만 남는다.


2026-11-08 16:05 KST D10/TC-15 환경 준비 확인: [점검 결과](../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md). D10 live interaction replay 및 외부 호출 관측 harness가 없고, TC-15는 운영 PR36 webhook/shared DB 경계를 배제하지 못해 둘 다 환경 미준비다. 사용자 지시에 따라 시험 요청 없이 BLOCKED/NOT RUN으로 종결하며, 통과로 표시하지 않는다.
