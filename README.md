# 두바퀴 · 따릉이 시민 문의 지원 시스템

[GitHub 저장소](https://github.com/ik-e/dubakwi-ttareungi-support) · [품질 검사 실행](https://github.com/ik-e/dubakwi-ttareungi-support/actions)

두바퀴(dubakwi)는 Discord로 접수한 시민 문의를 RAG 근거 안내, 문의 정보 보완, Jira 담당자 연결로 처리하는 n8n 중심 MVP입니다. 이용자는 내부 시스템을 알 필요 없이 문의 결과를 받고, 담당자는 Jira에서 티켓을 확인하고 처리합니다.

## 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [현재 상태](#2-현재-상태)
3. [사용자 문의 처리 흐름](#3-사용자-문의-처리-흐름)
4. [주요 기능과 범위](#4-주요-기능과-범위)
5. [아키텍처 한눈에 보기](#5-아키텍처-한눈에-보기)
6. [실행·시연 방법](#6-실행시연-방법)
7. [검증 결과](#7-검증-결과)
8. [개발·운영 문서](#8-개발운영-문서)
9. [기여·보안 규칙](#9-기여보안-규칙)

## 1. 프로젝트 소개

시민이 자전거 대여·반납, 고장, 요금 등 지원 범위의 문의를 Discord로 보내면 시스템은 교육용으로 준비한 공개 지식과 본인 문의 정보를 바탕으로 안내하거나 담당자에게 전달합니다. 담당자 처리와 티켓 생애주기는 Jira에서 관리합니다.

## 2. 현재 상태

- 기준 저장소는 `main` `dd919d7`입니다. VM에는 PR36 API와 별도 UX API가 병렬로 배포되어 있습니다.
- PR36 RAG 검색·권한 matrix 16/16, QR 및 SR-WF12 Support 종단을 확인했습니다. 재시작 후 PR36 index의 UI 44 items 처리와 QR 근거 응답도 확인했습니다. 44를 저장 벡터 전수 개수로 간주하지 않습니다.
- Discord/Jira 이용자·담당자 시나리오와 TC-07 DLQ 조회는 개별 실행 증거로 판정합니다. DLQ는 bounded list/inspect와 연결 Jira GET까지이며 운영자 retry/recovery action은 이번 범위에 포함되지 않습니다.
- D10 동일 interaction replay와 TC-15 격리 고장 종단은 시험 환경 미준비로 `BLOCKED / NOT RUN`입니다. 이는 기능 통과가 아닙니다.
- VM 실행본과 저장소 커밋의 완전한 동일성은 입증되지 않았습니다. VM 결과는 각 보고서의 이미지·workflow 기준으로 확인합니다.
- [60개 사례·64개 요구 ID의 판정·근거·한계](runs/public/20261109-112300-local-final-closeout/evidence-matrix.md)를 모두 연결했습니다. 전체 실행 통과율을 뜻하지 않습니다.
- 11/09 대표 시연 3흐름·5요청의 저장/감사 일치와 Jira 담당자 처리를 확인했습니다. 현재 Jira All 큐에는 완료 티켓도 포함됩니다.
- 필수산출물 최종본은 로컬 `submission/final/docs/`, 12장 HTML 발표·대본은 `submission/final/presentation/team-presentation/`입니다. [마감 검사·제출 범위](runs/public/20261109-112300-local-final-closeout/report.md)와 [DAY82](docs/project/daily/DAY82.md)를 함께 확인하세요.

최신 판정은 [구현 현황과 마감 계획](docs/project/implementation-status-and-closeout-plan.md), [최종 통합 시험 계획](docs/project/final-test-plan.md), [실행 결과서](docs/project/EXECUTION-RESULT.md)에서 확인하세요.

## 3. 사용자 문의 처리 흐름

1. 시민이 Discord에서 문의를 보냅니다.
2. 시스템이 사용자 등록 여부, 요청 형식, 중복·소유권 경계를 확인합니다.
3. 분류 후 RAG에서 허용된 근거를 검색하고, 필요한 경우 본인 문의 상태를 조회합니다.
4. 근거가 충분하면 안내하고, 정보가 더 필요하면 Jira 문의를 만들거나 이어서 보완합니다.
5. 담당자 판단이 필요하면 Jira 티켓을 담당자에게 전달합니다. 담당자는 Jira에서 상태와 내부 처리 내용을 갱신합니다.
6. 실패는 상태와 DLQ 경계에서 안전하게 기록하며, 현재 운영자 기능은 DLQ 조회 범위입니다.

## 4. 주요 기능과 범위

| 구분 | 지원 범위 |
| --- | --- |
| 시민 문의 | 공개 근거 안내, 정보 보완, 본인 문의 상태 조회, 담당자 이관 |
| RAG·에이전트 | 공개/제한 지식 경계에 따른 검색, 근거 기반 답변 및 분류·이관 흐름 |
| Jira | 티켓 생성·재사용·담당 전달·상태 확인과 담당자 처리 |
| DLQ | 미해결 작업 목록·상세와 연결 Jira 상태/담당자 read-only 조회 |
| 오류 경계 | 알 수 없는 외부 효과와 중복 재호출을 구분하고 요청을 안전하게 제한 |

실제 시민 계정 인증, 기관 내부 시스템 변경, 환불·요금 변경·출동 실행, 직원 전용 UI, 자동 DLQ 재처리는 구현 범위에 포함하지 않습니다.

## 5. 아키텍처 한눈에 보기

| 구성 요소 | 역할 | 원본·상태 안내 |
| --- | --- | --- |
| Discord bot / user API | 문의 입력과 이용자 응답 | PR36 경로와 별도 UX API가 VM에서 병렬 동작 |
| n8n | 문의 분류, RAG·도구 호출, Jira·저장 흐름 오케스트레이션 | 버전 관리되는 workflow JSON은 `workflows/dubakwi-*.json` |
| RAG | 공개·제한 지식 검색과 근거 제공 | 문서·색인·권한 기준은 RAG 설계서 참조 |
| Jira | 문의 티켓, 담당자 배정·처리·생애주기 | Jira 상태는 자동화 요청 처리 상태와 구분 |
| PostgreSQL / n8n 기록 | 최소 요청 상태, DLQ, workflow 실행 정보 | 상세 저장 계약과 적용 범위는 저장소 설계서 참조 |

## 6. 실행·시연 방법

저장소의 Python 환경은 Python 3.12·uv·Ruff를 사용합니다. 로컬 환경 준비와 기본 품질·문서 검사는 다음처럼 실행합니다.

```sh
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked python scripts/test/check_project_docs.py
uv run --locked python scripts/test/check_public_files.py
uv run --locked python -m unittest discover -s scripts/test -p "test_*.py"
```

VM/n8n 재현은 환경별 credential과 workflow 연결이 필요합니다. [배포 안내](infra/README.md)와 [VM 기준선](runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md)을 먼저 확인하고, 위 로컬 검사를 VM 기능 시험으로 간주하지 마세요.

## 7. 검증 결과

- PR36 RAG search matrix: 16/16 기대 결과 통과.
- QR 문의와 SR-WF12 intent-transform Support 종단: 각 보고서 범위에서 통과.
- RAG 재시작 후 색인: 44 items 처리 및 QR 근거 응답을 한 번 확인. SQLite execution 기록의 `running` 잔류와 색인 시간 미측정은 별도 관측 한계입니다.
- DLQ 조회: VM에서 bounded list/inspect 및 연결 Jira 상태·담당자 GET을 확인. retry/recovery action 검증은 포함하지 않습니다.
- D10과 TC-15: 환경 미준비로 실행하지 않았습니다.

각 실행의 버전·범위·한계는 `runs/public/`의 날짜별 보고서와 [최종 시험 계획](docs/project/final-test-plan.md)에서 확인하세요. 서로 다른 환경의 통과 수를 합산하지 않습니다.

## 8. 개발·운영 문서

- [주제와 프로젝트 범위](docs/project/TOPIC.md) · [역할과 책임](docs/project/TEAM-CHARTER.md)
- [전체 시스템 설계](docs/project/SYSTEM-DESIGN.md) · [개발 산출물 안내](docs/project/README.md)
- [워크플로우 설계](docs/project/WORKFLOW-DESIGN.md) · [RAG 설계](docs/project/RAG-ARCHITECTURE.md) · [저장소 설계](docs/project/STORAGE-DESIGN.md)
- [실행 결과서](docs/project/EXECUTION-RESULT.md) · [구현 현황](docs/project/implementation-status-and-closeout-plan.md) · [최종 시험 계획](docs/project/final-test-plan.md)
- [개발 작업 원장](docs/DEVELOPMENT-PLAN.md) · [infra 안내](infra/README.md) · [Python 기준](docs/PYTHON-DEVELOPMENT.md)

## 9. 기여·보안 규칙

작업 전 저장소의 [AGENTS.md](AGENTS.md), [팀 헌장](docs/project/TEAM-CHARTER.md), 담당 설계와 개발 원장을 확인하세요. workflow JSON은 소유자가 수정·내보내기·검토한 뒤 버전 관리합니다. 비밀값·실제 개인정보·원시 실행 데이터는 저장소에 넣지 말고, 공개 파일과 링크를 검사한 뒤 변경을 공유합니다.

공개 정책은 [PUBLICATION.md](docs/PUBLICATION.md), 외부 조사 자료의 출처는 [출처 안내](docs/PUBLIC-SOURCES.md)를 참조하세요. GitHub Actions의 품질 검사 성공은 VM 기능 검증과 별개입니다.
