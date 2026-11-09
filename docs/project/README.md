# 개발 산출물 관리

**공개용 최종 자료:** [필수산출물 3종과 12장 발표·대본·시연 절차](../../submission/public/README.md)를 main에서 확인한다. HTML 발표는 저장소를 내려받아 실행한다. 원문 첨부를 포함한 기존 로컬 제출본과 공개 사본의 차이는 [공개 검증 기록](../../runs/public/20261109-124900-local-public-submission/report.md)을 따른다.

<!-- final-closeout-current -->
**2026-11-09 최종 제출 정리.** 로컬 `submission/final/docs/`에 필수산출물3종 v1.0, `submission/final/presentation/team-presentation/`에12장·20분 HTML과 발표자 메모를 정리했다. [60사례·64요구 추적](../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md)·[실제 노드/연결](../../runs/public/20261109-112300-local-final-closeout/workflow-map.md)·[마감 검사](../../runs/public/20261109-112300-local-final-closeout/report.md)·[DAY82](daily/DAY82.md)를 연결한다. 아래 목록의 이전 버전/초안 설명은 날짜별 관리 이력이며 현행 요약은 이 문단과 마감 기록을 우선한다.
<!-- /final-closeout-current -->

이 문서는 개발 문서의 진입점과 실제 보관 위치를 안내합니다. 편집 원본은 현재 저장소 경로에 두고, 과제 제출 패키지는 공식 경로를 보존해 별도로 구성합니다. 과제 가이드 원문은 로컬 보존된 `docs/guideline/`에서 관리하며, 조사 근거와 외부 원문 위치는 [출처 안내](../../docs/PUBLIC-SOURCES.md)를 참조합니다.

팀원은 [첫 실행/인계 안내](../TEAM-START.md)와 [공유 전 전체 점검](TEAM-READINESS-REVIEW.md)을 먼저 확인합니다.

현재 시험 판정은 [PR36 최종 통합 시험 계획](final-test-plan.md)과 [개발 원장](../DEVELOPMENT-PLAN.md)을 확인합니다. 사용자 관점 기준선은 [구현 현황과 사용자 기준 마감 계획](implementation-status-and-closeout-plan.md), 구현·배포 경계는 각 상세 설계와 연결된 실행 근거를 따릅니다. 서로 다른 날짜·브랜치·VM 실행은 하나의 통과 수로 합산하지 않습니다.

## 산출물 목록

검토 보고서와 증거의 시점별 목록은 [reviews 대문 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)을 참조합니다. 재사용 도구는 [scripts/test](../../scripts/test/README.md), 일회성 작업은 [tmp 안내 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)로 구분합니다.

현황 확인일: 2026-11-08. 아래 표는 문서 위치와 현재 확인된 상태를 요약합니다. 작업별 완료 상태는 [개발 원장의 작업 원장](../DEVELOPMENT-PLAN.md#5-작업-원장), 시험별 판정은 [최종 시험 계획](final-test-plan.md)과 실행 결과를 원본으로 합니다. 역할 소유권은 [팀 헌장](TEAM-CHARTER.md)을 따릅니다.

| 원본·경로 | 2026-11-08 현재 상태 | 기준·다음 연결 |
| --- | --- | --- |
| [TOPIC.md](TOPIC.md)·[TEAM-CHARTER.md](TEAM-CHARTER.md) | 팀 작성 문서 보관. 주제 승인 상태는 제안서/원장 기준으로 확인 | 가이드 공식 제출 요구와 승인 여부를 구분. 역할·경로 소유권은 헌장 원본 |
| [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md) | 논리 설계 v0.12; 머리말에 11/7 적용 상태 v0.14 기록 | 최상위 구성·상태·범위에서 상세 설계로 연결. 본문 과거 표시는 당시 이력 |
| [WORKFLOW-DESIGN.md](WORKFLOW-DESIGN.md) | v0.23 실제 저장소 JSON 노드 수와 VM 기준선 날짜 표기 정정; VM 매핑 미확인 | 실제 배포·시험은 VM 증거 및 [개발 원장](../DEVELOPMENT-PLAN.md)에서 확인 |
| [RAG-ARCHITECTURE.md](RAG-ARCHITECTURE.md) | v0.24, PR36 RAG matrix 16/16·Support 종단 및 14:02 재시작 후 44건 재색인/QR 확인 연결 | SQLite execution `running` 표기와 색인 시간은 미해결 관측 한계. 기능 경로 재확인과 구분하며 추가 gate 아님 |
| [STORAGE-DESIGN.md](STORAGE-DESIGN.md) | v0.17; VM SQL 001~017 적용과 TC-07 read-only DLQ/Jira 조회 기록 | 저장 계약 원본. [TC-07 VM 조회 결과](../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md) 참조. 운영자 retry/recovery action은 이번 완료 범위 밖 |
| [구현 현황·마감 계획](implementation-status-and-closeout-plan.md)·[최종 통합 시험 계획](final-test-plan.md) | 각각 v5.6·v1.26 | PR36 기준선·사용자 완료 기준 및 현행 시험 판정의 요약 문서 |
| [EXECUTION-RESULT.md](EXECUTION-RESULT.md)·[최종 PR36 RAG matrix](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md) | 누적 실행 결과서와 날짜별 가린 보고서 존재. 최신 Discord/Jira UAT·RAG·DLQ·readiness 근거는 실행 묶음별 연결 | 최신 요약은 v5.5/v1.25 상태 문서를 참조. 수치와 판정 범위는 각 run 원본에서 확인. 실행 기록은 60개 사례·64개 요구 ID 추적을 대신하지 않음 |
| [daily/DAY80.md](daily/DAY80.md)·[DAY81.md](daily/DAY81.md)·[DAY82.md](daily/DAY82.md) | DAY80 과거 초안, DAY81 당일 결과 사후 정리, DAY82 11/09 실제 리허설·마감 정리 | 제출 스냅샷은 `submission/final/daily/DAY82.md`; 당일 활동·발표·리허설·제출 기록은 실제 증거로만 갱신 |
| [team cases](../../cases/team.json)·[demo sequence](../../requests/demo-sequence.json)·[support workflow](../../workflows/dubakwi-support.json)·[knowledge manifest](../../knowledge/manifest.json) | 시나리오·시연 요청·canonical workflow JSON·지식 자산 위치 | 저장소 원본과 VM 배포본은 별개로 확인. 전체 사례/요구 추적은 마감 작업 |
| [R03 presentation script](presentation/r03-rag-script.md)·`presentation/originals/received-20261108/` | 역할별 참고 문서 및 11/08 수신 원본 11개 보존. 통합 발표 원고는 `submission/final/presentation/FINAL-PRESENTATION.md` | 수신 원본은 보존 자료. 통합본은 확인된 개념·증거만 반영한 초안이며 리허설/발표 완료 아님 |
| 최종 제출 후보 | `submission/final/` (로컬 전용: `SUBMISSION-CANDIDATES.md`, `docs/WORKFLOW-DESIGN.md`, `docs/RAG-ARCHITECTURE.md`, `docs/EXECUTION-RESULT.md`, DAY82, 발표 원고) | 11/09 제출용 3종·발표·DAY82·근거 부록 정리. 실제 검사 결과와 미확인은 마감 기록에서 구분. 원본 가이드와 [P31](../DEVELOPMENT-PLAN.md#5-작업-원장)을 계속 대조 |

## 문서 참조와 정보의 원본

| 확인할 정보 | 원본 문서·위치 | 다른 문서에서의 사용 |
| --- | --- | --- |
| 주제·범위·제외 업무 | [TOPIC](TOPIC.md) | 헌장·설계는 이 범위를 구체화 |
| 역할·파일 소유권·협업 규칙 | [TEAM-CHARTER](TEAM-CHARTER.md) | 작업 배정·각 설계 편집 책임 |
| 전체 논리 구성·상태 관계·시나리오/기능 추적 | [SYSTEM-DESIGN](SYSTEM-DESIGN.md) | 최상위 개요에서 업무·RAG·저장 상세로 연결. 필드·enum 원본은 아래 상세 설계 유지 |
| 전체 순서·분기·업무 Request/Response·Ticket 계약 | [워크플로우6절](WORKFLOW-DESIGN.md#6-노드-간-페이로드-연결선마다) | RAG·저장소는 공개 업무 계약을 참조 |
| 저장 StateRef·Begin/State/SaveResult·복구 캡슐 | [저장소6.1](STORAGE-DESIGN.md#storage-contract) | 본체·Jira 어댑터·DLQ가 같은 봉투를 사용 |
| 청킹·검색·색인·RAG 내부 스키마 | [RAG](RAG-ARCHITECTURE.md) | 본체는 SearchRequest/SearchResult만 연결 |
| 최소 상태/DLQ 구조·보존 | [STORAGE-DESIGN](STORAGE-DESIGN.md) | 현재 검증 범위는 bounded DLQ list/inspect와 연결 Jira GET이며 recovery/retry action은 미구현 |
| 경로별 주 담당·검토자 | [TEAM-CHARTER 경로표](TEAM-CHARTER.md#1-팀) | 시스템은 경로 용도, 개발 계획은 작업 책임 참조 |
| 작업 절차·변경 동기화 | [AGENTS](../../AGENTS.md) | 문서·Git·n8n·시험·배포 작업 시 적용 |
| Docker 배포·업데이트·백업/복구 | [infra 안내](../../infra/README.md) | compose 설정/실행과 VM 검증 연결 |
| 작업 번호·상태·담당·확인 시점 | [개발 계획](../DEVELOPMENT-PLAN.md) | 설계서에서 작업 상태를 중복 관리하지 않음 |
| 사실 근거·조사 한계 | [출처 원장 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md) | 공개 지식 작성 시 확인일·적용 범위 연결 |
| 실제 시험 결과 | [PR36 최종 RAG matrix](../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md)·[실행 결과서](EXECUTION-RESULT.md) | 개별 가린 실행 보고서가 근거이며, 요약은 해당 증거 범위를 넘지 않음 |

공식 템플릿의 큰 절은 유지한다. 과거 검토 보고서는 당시 스냅샷이며 현행 설계의 상태는 후속 재검증 기록에서 구분한다. 공개 계약은 생산·소비 문서마다 복제 편집하지 않고 위 원본을 함께 갱신한다.

## 관리 규칙

- 초안과 최종본은 같은 파일에서 관리합니다. 문서 상단에 작성일·버전·상태를 표시하고 변경 이력을 남깁니다.
- 문서 상태는 `초안 → 검토 중 → 확정`으로 표시하며, 아직 없는 문서는 `미작성`입니다. 문서 확정과 서비스 구현·시험 완료는 구분합니다.
- 생성 전 파일은 코드 경로로, 생성 후에는 링크로 표시합니다. 구현·측정 결과가 없으면 빈 틀 또는 미확인 상태를 유지합니다.
- 이 목록은 문서 상태 안내입니다. P01~P31의 개발 상태·증거는 개발 계획에만 기록하고, 실행 수치는 결과서와 `runs/`를 참조합니다.
- 개발·발표 관리 계획은 `docs/DEVELOPMENT-PLAN.md`·`docs/PRESENTATION-PLAN.md`에서 유지합니다.
- 기존 조사·보존 원문·날짜별 이력은 이동하거나 내용·경로를 일괄 변경하지 않습니다.

## 실행 파일·데이터 위치

아래 표는 위치 요약입니다. 전체 경로·파일 용도는 [시스템 설계 9절](SYSTEM-DESIGN.md#9-프로젝트-경로와-배포-구조), 주 담당/검토자는 [헌장 경로표](TEAM-CHARTER.md#1-팀)가 원본입니다. 실행 파일은 실제 구현 때 생성하며, 현재 존재하는 안내·규칙과 구분합니다.

| 위치 | 내용 |
| --- | --- |
| `workflows/` | n8n 워크플로우 JSON |
| `knowledge/` | 서비스용 지식 문서 |
| `cases/` | 시험 입력·기대 결과 |
| `requests/` | 시연·개별 실행 요청 |
| `runs/` | 실행 보고서·측정 결과 |
| `data/users.json`·`data/records.json` | 모의 서비스 사용자·업무 기록 |
| `data/research/` | 기존 조사 원본·분석·출처 기록 |
| `infra/` | Docker Compose 배포·복구 안내, 환경 확인 후 compose·DB 마이그레이션 |
| `scripts/dev/`·`scripts/test/` | 필요한 때 생성하는 개발/배포·시험/측정 도구 |

## 공식 제출 경로와의 대응

공식 양식의 `docs/TOPIC.md` 등은 원문 그대로 보존합니다. 팀의 작성 원본은 다음 경로를 사용합니다.

| 가이드 제출 경로 | 팀 작성 원본 또는 현재 제출 후보 |
| --- | --- |
| `README.md`·`AGENTS.md` | 저장소 루트의 동일 파일 |
| `docs/TOPIC.md` | `docs/project/TOPIC.md` |
| `docs/TEAM-CHARTER.md` | `docs/project/TEAM-CHARTER.md` |
| `docs/WORKFLOW-DESIGN.md` | `docs/project/WORKFLOW-DESIGN.md` |
| `docs/RAG-ARCHITECTURE.md` | `docs/project/RAG-ARCHITECTURE.md` |
| `docs/EXECUTION-RESULT.md` | `docs/project/EXECUTION-RESULT.md` |
| `docs/daily/`·`docs/images/` | `docs/project/daily/`·`docs/project/images/` |
| `workflows/` | 동일한 canonical `workflows/dubakwi-*.json` 경로 |
| `knowledge/` | 동일 경로의 공개/제한 지식 및 `manifest.json` |
| `data/users.json`·`data/records.json` | 동일 경로의 가상 시험 데이터 |
| `cases/common.json`·`cases/team.json` | 동일 경로; `cases/team-extended.json`은 추가 팀 사례 |
| `requests/`·`runs/` | 동일 경로의 시연 입력과 가린 실행 증거 |
| 보조 설계 `docs/STORAGE-DESIGN.md`·`docs/SYSTEM-DESIGN.md` | 각각 `docs/project/STORAGE-DESIGN.md`·`docs/project/SYSTEM-DESIGN.md` |

보조 설계서는 다른 설계서가 참조하므로 공식 필수 세 문서와 구분해 제출 패키지에 함께 포함합니다. 위 표는 공식 경로와 작성 원본의 대응입니다. `submission/final/`에는 필수 산출물 3종의 링크 재기준화 스냅샷과 그 출처 안내, DAY82·후보 목록·발표 원고가 있습니다. 패키지의 나머지 필수 파일 수집, VM 재현·비밀 검사와 최종 제출은 완료되지 않았으며 P31에서 수행합니다.

[개발 계획](../DEVELOPMENT-PLAN.md) · [발표 계획](../PRESENTATION-PLAN.md) · [문서 대문](../README.md)

R01 후속 VM 실행 증거: [RAG 색인/검색과 data-api 진단](../../runs/public/20261105-111311-vm-rag-integration/report.md). R03 상세 문서의 역할 검토/반영과 공식 판정은 별도다.

R01 GitLab79 재사용 후속: [data-api·과정 도구 적용](../../runs/public/20261105-114531-vm-course79-data-api/report.md). 기존80경로 미제공/원본 인계 선행 해석과 구분한다.

R05 P13/P25 통합 산출물: [공통 사례](../../cases/common.json), [팀 사례](../../cases/team.json), [팀 확장](../../cases/team-extended.json), [P11 임시 입구 사례](../../cases/p11-entry.json), [시연 순서 초안](../../requests/demo-sequence.json), [R05 VM 부분 시험 보고서](../../runs/public/20261105-143325-vm-p13-official/report.md), [새 R01 통합 검토](../../runs/public/20261105-154737-local-r05-integration-review/summary.json). 사례 형식/도구·시연 초안·골격 부분 시험을 구분하며 P13 전체 완료·실제 시연 성공은 아니다.

- [따릉이 챗봇 조사 요약·출처](../rag-knowledge/chatbot_documents/README.md): 원문·사진은 내부 보관, 공개본은 직접 작성한 요약과 링크만 포함.


## PR36 로컬 통합 수용 기록

현재 후보의 원본 파일 수용·제외·역사 보존 및 설계 대조는 [로컬 수용 대조](../../infra/pr36-local-acceptance.md)를 따른다. [실행 결과서](EXECUTION-RESULT.md)는 과거 정상1건·반복/실패·PASS*·미실행을 구분하며 이번 로컬 시험을 실제 VM 통과로 합산하지 않는다. [R03 발표 대본](presentation/r03-rag-script.md)은 PR24 당시 초안이고 PDF/이미지는 공개하지 않았다.\n\n\n
