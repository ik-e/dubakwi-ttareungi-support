# 개발 산출물 관리

이번 개발의 제안서·헌장·설계·결과·데일리·발표 자료는 `docs/project/`에서 관리합니다. 조사 근거는 [research — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md), 과제 요구와 보존 원문은 [guideline — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)에 둡니다.

팀원은 [첫 실행/인계 안내](../TEAM-START.md)와 [공유 전 전체 점검](TEAM-READINESS-REVIEW.md)을 먼저 확인합니다.

## 산출물 목록

검토 보고서와 증거의 시점별 목록은 [reviews 대문 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)을 참조합니다. 재사용 도구는 [scripts/test](../../scripts/test/README.md), 일회성 작업은 [tmp 안내 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)로 구분합니다.

작성 기준: 2026-11-03. 아래는 문서 작성 상태와 편집 책임을 안내합니다. 개발 작업·승인·시험의 완료 증거와 상태는 [개발 계획의 작업 원장](../DEVELOPMENT-PLAN.md#5-작업-원장)에서 관리합니다. 실명 대신 [팀 헌장](TEAM-CHARTER.md)의 역할 ID R01~R05를 사용하며 기존 ①~⑤와 순서대로 대응합니다.

| 산출물·예정 위치 | 문서 상태 | 편집 책임 | 다음 작업 |
| --- | --- | --- | --- |
| [TOPIC.md](TOPIC.md) | 초안 v0.7 | ① 팀장·통합 | 문의 유형·구성 검토, 티켓 종료 계약 확인, 강사 확인 |
| [TEAM-CHARTER.md](TEAM-CHARTER.md) | 초안 v0.10 | R01 팀장·통합 | 역할 ID·파일 소유권·협업 규칙 검토, GitHub 팀 권한·발표 ID 확인(dubakwi 확정) |
| [SYSTEM-DESIGN.md](SYSTEM-DESIGN.md) | 초안 v0.7·최상위 논리 설계 | R01 취합·R02~R05 공동 검토 | 구성·상태·기능 추적·디렉터리 용도·Docker Compose 기준 확인 후 상세로 이동 |
| [Python 개발 기준](../PYTHON-DEVELOPMENT.md)·[공개 정책](../PUBLICATION.md) | 도구/설정 작성·서비스 구현 전 | R01·R05 품질/R04 공개 검토 | uv 잠금·Ruff·CI, 같은 폴더 .gitignore·Git 후보·공개 링크 검사 |
| [작업 규칙](../../AGENTS.md)·[배포 안내](../../infra/README.md) | 기준 작성·실제 배포 전 | R01·R04/R05 검토 | Git/n8n/시험·동기화·Docker 실행/복구, 환경 확인 후 compose 작성 |
| [WORKFLOW-DESIGN.md](WORKFLOW-DESIGN.md) | 초안 v0.13 | R02 오케스트레이션 | Jira 어댑터·공개 계약 검토,저장소 내부는 STORAGE-DESIGN 참조. D01~D07의 실행 관리는 개발 계획 참조 |
| [설계 v0.2 검증 보고서 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md) | 정적·문서 검증 기록 | R02 취합·전원 검토 | 이전 v0.2의 P1 3건·P2 7건 이력. 현행 설계 검토는 아래 종합 검증 참조 |
| [설계서 종합 검증 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md) | 문서 검증 완료·실행 미검증 | R02 취합·전원 검토 | v0.9/v0.2/v0.1 검증 시점의 P1 4건·P2 3건 기록. 현행 보완 결과는 후속 재검증 참조 |
| [보완·참조 재검증 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md) | 보완 시점의 문서 검증 기록·실행 미검증 | R02 취합·전원 검토 | 워크플로우 v0.10/RAG v0.3/저장소 v0.2 보완 당시 스냅샷. 이후 시스템/경로/규칙 추가와 본문 수정은 당시 해시의 검증 범위 밖 |
| [RAG-ARCHITECTURE.md](RAG-ARCHITECTURE.md) | 초안 v0.5·미측정 | R03 RAG | 검색·색인 내부 노드/엣지와 지식·청킹·임베딩·권한·복구 상세. 지식 작성·비교 측정 필요 |
| [STORAGE-DESIGN.md](STORAGE-DESIGN.md) | 초안 v0.4·팀 보조 설계 | R04 연동·안정성 | 최소 상태·DLQ·실행 기록 구조/운영. PostgreSQL 2테이블은 제안,실제 저장·연동 확인 필요 |
| `EXECUTION-RESULT.md` | 미작성 | ⑤ 시험·품질 | 기대/실제·실행 보고서·실패/수정·재시험·한계 |
| `daily/DAY80.md`·`DAY81.md`·`DAY82.md` | 미작성 | ① 취합·전원 참여 | 당일 작업 번호·증거·막힘·다음 목표 기록 |
| `images/` | 폴더 준비·자료 없음 | ⑤ 시험·품질 | 개인정보를 가린 실행 증거 |
| `presentation/` | 폴더 준비·자료 없음 | ① 편집·전원 제공 | [현행 발표 계획](../PRESENTATION-PLAN.md)에 따른 공용 파일·메모·리허설 기록. 계획 동기화와 실제 제작/연습 완료 구분 |

## 문서 참조와 정보의 원본

| 확인할 정보 | 원본 문서·위치 | 다른 문서에서의 사용 |
| --- | --- | --- |
| 주제·범위·제외 업무 | [TOPIC](TOPIC.md) | 헌장·설계는 이 범위를 구체화 |
| 역할·파일 소유권·협업 규칙 | [TEAM-CHARTER](TEAM-CHARTER.md) | 작업 배정·각 설계 편집 책임 |
| 전체 논리 구성·상태 관계·시나리오/기능 추적 | [SYSTEM-DESIGN](SYSTEM-DESIGN.md) | 최상위 개요에서 업무·RAG·저장 상세로 연결. 필드·enum 원본은 아래 상세 설계 유지 |
| 전체 순서·분기·업무 Request/Response·Ticket 계약 | [워크플로우6절](WORKFLOW-DESIGN.md#6-노드-간-페이로드-연결선마다) | RAG·저장소는 공개 업무 계약을 참조 |
| 저장 StateRef·Begin/State/SaveResult·복구 캡슐 | [저장소6.1](STORAGE-DESIGN.md#storage-contract) | 본체·Jira 어댑터·DLQ가 같은 봉투를 사용 |
| 청킹·검색·색인·RAG 내부 스키마 | [RAG](RAG-ARCHITECTURE.md) | 본체는 SearchRequest/SearchResult만 연결 |
| 최소 상태/DLQ 구조·보존·재처리 | [STORAGE-DESIGN](STORAGE-DESIGN.md) | 워크플로우는 호출 지점·실패 분기만 명시 |
| 경로별 주 담당·검토자 | [TEAM-CHARTER 경로표](TEAM-CHARTER.md#1-팀) | 시스템은 경로 용도, 개발 계획은 작업 책임 참조 |
| 작업 절차·변경 동기화 | [AGENTS](../../AGENTS.md) | 문서·Git·n8n·시험·배포 작업 시 적용 |
| Docker 배포·업데이트·백업/복구 | [infra 안내](../../infra/README.md) | compose 설정/실행과 VM 검증 연결 |
| 작업 번호·상태·담당·확인 시점 | [개발 계획](../DEVELOPMENT-PLAN.md) | 설계서에서 작업 상태를 중복 관리하지 않음 |
| 사실 근거·조사 한계 | [출처 원장 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md) | 공개 지식 작성 시 확인일·적용 범위 연결 |
| 실제 시험 결과 | cases/runs/실행 결과서(작성 전) | 검증 보고·설계 초안을 실행 증거로 대신하지 않음 |

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

| 공식 양식의 경로 | 팀 작성 원본 |
| --- | --- |
| `docs/TOPIC.md` | `docs/project/TOPIC.md` |
| `docs/TEAM-CHARTER.md` | `docs/project/TEAM-CHARTER.md` |
| `docs/WORKFLOW-DESIGN.md` | `docs/project/WORKFLOW-DESIGN.md` |
| `docs/RAG-ARCHITECTURE.md` | `docs/project/RAG-ARCHITECTURE.md` |
| `docs/STORAGE-DESIGN.md` (팀 보조 문서,제출 패키지 포함) | `docs/project/STORAGE-DESIGN.md` |
| `docs/SYSTEM-DESIGN.md` (팀 보조 문서,제출 패키지 포함) | `docs/project/SYSTEM-DESIGN.md` |
| `docs/EXECUTION-RESULT.md` | `docs/project/EXECUTION-RESULT.md` |
| `docs/daily/`·`docs/images/` | `docs/project/daily/`·`docs/project/images/` |

저장소 설계서는 추가 보조 문서이며 다른 설계서가 참조하므로 제출 패키지에도 포함하고 링크를 검사합니다. 제출 경로의 변경 허용 여부는 강사 확인 전입니다. 제출 도구가 공식 경로를 요구하면 팀장이 제출용 패키지에서 경로·상대 링크를 맞추고 재현·검사를 수행합니다. 개발 중에는 중복 편집본을 만들지 않습니다. 경로 대응 확인은 P31 제출 검사에 포함합니다.

[개발 계획](../DEVELOPMENT-PLAN.md) · [발표 계획](../PRESENTATION-PLAN.md) · [문서 대문](../README.md)
