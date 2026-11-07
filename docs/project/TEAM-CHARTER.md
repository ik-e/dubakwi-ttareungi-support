# 팀 헌장 · 두바퀴

2026-11-07 사용자 지시 인계: R01이 PR36의 통합 수정·검사·VM 반입·결과 취합을 관리하고 R02/R03/R04/R05의 최종 확인을 마지막에 묶어 받는다. 동시 편집은 하지 않으며 기존 경로 책임은 유지한다. [실행 결과](../../runs/public/20261107-170503-vm-pr36-integration/report.md)의 R01 관측을 역할별 공식 확인으로 대체하지 않는다.

- 작성일: 2026-11-02 KST
- 버전·상태: v0.14 / J01 한정 대리 편집 인계·병렬 작업 경계 추가. 기존 역할 소유권 유지, 영향 역할 확인은 PR36에서 취합
- 작성 형식: [공식 팀 헌장 템플릿 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md)
- 주제 기준: [주제 제안서 v0.7](TOPIC.md)

## 1. 팀

실명 대신 역할 ID를 사용한다. 공식 표의 `이름` 칸에 ID를 기입하며, 개발 계획의 ①~⑤는 각각 R01~R05에 대응한다. ID는 개발팀의 작업 책임을 뜻하며 서비스 이용자·티켓 담당자 계정과는 별개다.

| 이름 | 역할 (주 담당) | 함께 보는 역할 | 맡는 워크플로우 파일 |
| --- | --- | --- | --- |
| R01 | 팀장 (리드 · 통합) | R02 계약·통합 검토, R05 배포·제출 확인 | `dubakwi-support.json` 등 전체 변경의 병합·VM 배포. 직접 편집 소유자는 아래 역할을 따름 |
| R02 | 오케스트레이션 | R03 검색 연결, R04 도구·보안 연결, R05 흐름 시험 | `workflows/dubakwi-support.json` |
| R03 | RAG | R04 문서 권한, R05 검색 평가 | `workflows/dubakwi-index.json`, `workflows/dubakwi-search.json` |
| R04 | 연동 · 안정성 | R02 호출 계약, R03 권한 모델, R05 장애·중복 시험 | `workflows/dubakwi-handoff.json`, `workflows/dubakwi-state.json`, `workflows/dubakwi-dlq.json`, `workflows/dubakwi-errors.json` |
| R05 | 시험 · 품질 | R02·R03·R04 기대 결과·결함 검토, R01 VM·제출 확인 | `cases/common.json`, `cases/team.json`, `requests/*.json`, `runs/*.json` |

팀 이름은 **두바퀴**, 파일/웹훅/색인용 영문 접두사는 **dubakwi**다(2026-11-03 사용자 팀명 결정 반영). 같은 워크플로우의 편집 소유자는 1개 역할로 정한다. R01의 병합 권한은 R02의 메인 워크플로우 편집 책임을 대신하지 않는다.

문서·데이터 소유권은 다음과 같다.

- R01: `TOPIC.md`, 이 헌장, `SYSTEM-DESIGN.md` 취합, 루트 `README.md`·`AGENTS.md`, 개발·발표 관리 계획, `daily/`, `presentation/` 최종 편집. 최상위 설계의 담당 상세 내용은 R02~R05가 공동 검토한다.
- R02: `WORKFLOW-DESIGN.md` 편집 취합. R03·R04가 담당 내용과 실행 근거를 제공한다.
- R03: `RAG-ARCHITECTURE.md`, 루트 `knowledge/`의 서비스 지식 문서.
- R04: `STORAGE-DESIGN.md`, 루트 `data/users.json`·`data/records.json`, 티켓 생성·조회·상태 갱신/종료 및 담당 알림의 연동 계약 확인.
- R05: `EXECUTION-RESULT.md`, `images/`, 시험·시연 입력·실행 보고서. 실제 결함 수정은 해당 파일 소유자가 수행한다.

위 문서 경로는 별도 표시가 없으면 `docs/project/` 기준이다. 작업 상태와 증거는 [개발 계획의 작업 원장](../DEVELOPMENT-PLAN.md#5-작업-원장)에 기록한다.

경로별 편집 책임의 원본은 아래 표다. 경로 용도는 [시스템 설계 9절](SYSTEM-DESIGN.md#9-프로젝트-경로와-배포-구조), 작업 방식은 [AGENTS](../../AGENTS.md)를 참조한다. 경로는 저장소 루트 기준이며 생성 예정 파일도 포함한다. 담당 변경 시 이 표와 개발 계획을 함께 갱신한다.

| 경로·파일 | 주 담당 | 검토자·지원 | 책임 범위 |
| --- | --- | --- | --- |
| README.md·AGENTS.md·.gitignore·.gitattributes·.env.example | R01 | R04 비밀/환경·R05 재현 | 공통 규칙·설정 항목 취합·진입 링크 |
| infra/README.md·vm-preflight.md·compose.yaml | R01 | R04 영속성·R02/R03 연결·R05 VM | 이미지/볼륨/네트워크·배포·업데이트·복구 |
| infra/postgres-compose.yaml·postgres-deployment.md | R01 | R04 저장/권한/마이그레이션·R05 재시작/복원 | 독립 DB 배포 준비·owner/runtime·비밀 주입·Credential 연결 조건. SQL 구현 소유권은 R04 유지 |
| pyproject.toml·uv.lock·.python-version·.github/workflows/quality.yml | R01 | R02/R03/R04 의존성·R05 품질 | Python3.12·uv·Ruff·CI 공통 환경 |
| docs/PUBLICATION.md·docs/PYTHON-DEVELOPMENT.md·scripts/dev/public-files.json·export_public.py | R01 | R04 비밀/제외 기준·R05 재현 | 로컬 보존·Git 공개 범위·선택적 내보내기·Python 기준·업로드 전 검토 |
| src/ttareungi_support/channels/discord_bot.py | R04 | R02 본체 계약·R01 Compose/비밀·R05 비공개/오류 | Discord Gateway·초기 응답·모의 사용자 매핑·최종 전송. 구현 전 |
| tests/channels/test_discord_bot.py | R05 | R04 구현·R02 판정 | 중복/보완·defer·토큰/전송 실패·소유권/비공개. 구현 전 |
| src/ttareungi_support/ | 기능별 R02/R03/R04 | 소비 기능 역할·R05 | 생성 시 파일별 소유자1개 지정·n8n 호출 계약/배포 명시 |
| tests/·scripts/test/check_public_files.py·test_git_public_files.py·test_public_export.py | R05 | 관련 구현 역할·R01 공개 도구 | 업무 시험·공개 제외/덮어쓰기/비밀 패턴 경계 시험 |
| infra/db/migrations/ | R04 | R01 배포/복구·R05 장애 | DB 채택 후 스키마·원자성·변경/복원 절차 |
| workflows/*-support.json | R02 | R03 검색·R04 연동·R05 판정 | 본체·업무 분기·최종 응답 |
| workflows/*-index.json·*-search.json | R03 | R04 권한·R05 검색 평가 | 색인·검색·활성 버전·복구 |
| workflows/*-handoff.json·*-state.json·*-dlq.json·*-errors.json | R04 | R02 공개 계약·R05 오류/복구 | Jira·조회·알림·저장·처리권·DLQ |
| knowledge/manifest.json·public/·restricted/ | R03 | R04 권한/모의 정책·R05 근거 | 지식·출처·적용 범위·버전/권한 |
| data/users.json·records.json | R04 | R03 권한 입력·R05 정답 연결 | 모의 사용자/소유권·API공급 방법 |
| cases/common.json·team.json·team-extended.json·p11-entry.json·requests/ | R05 | R02/R03/R04 관련 기대값 | 공통 판정 유지·시나리오/기능/데이터 연결 |
| runs/public/·docs/project/images/·docs/project/EXECUTION-RESULT.md | R05 | 전원 담당 증거·R01 제출 | 공개 JSON/Markdown 요약·실패/재시험·결과서. 원시 runs/화면은 로컬/팀 내부·제출 패키지로 구분 |
| scripts/README.md·scripts/dev/ | R01 | R04 저장/배포·R05 재현 | 공통 사용법 취합·환경/배포 도구 |
| scripts/test/ | R05 | R02/R03/R04 대상 기능 | 시험·검색 비교·측정 재현. R03이 검색 평가 로직 제공 |
| docs/TEAM-START.md·.github/pull_request_template.md·docs/project/TEAM-READINESS-REVIEW.md | R01 | 전원 역할/환경·R05 재현 | 팀 첫 실행·검토 양식·현재 공유 전 점검. 실제 담당자/권한은 별도 확인 |
| docs/project/SYSTEM-DESIGN.md | R01 | R02/R03/R04/R05 | 최상위 구성·상태 관계·경로·추적 취합 |
| docs/project/WORKFLOW-DESIGN.md | R02 | R03/R04/R05 | 업무 계약·노드/엣지·분기/오류 |
| docs/project/RAG-ARCHITECTURE.md | R03 | R02/R04/R05 | 검색·색인 내부와 실측 |
| docs/project/STORAGE-DESIGN.md | R04 | R02/R01/R05 | 저장 계약·처리 상태·DLQ·복구 |
| docs/project/{TOPIC,TEAM-CHARTER,README}.md·docs/{DEVELOPMENT-PLAN,PRESENTATION-PLAN}.md·docs/project/daily/·docs/project/presentation/ | R01 | 전원 담당 내용·R05 증거 | 범위·책임·진행·산출물 목록·발표 최종 편집. 중괄호는 각 파일 경로를 묶은 표기 |
| docs/guideline/ | R01 변경 취합 | 전원 요구 대조 | 보존 원문을 임의 수정하지 않고 변경 근거/원문 갱신 구분 |
| docs/research/·data/research/·scripts/research/ | R01 변경 취합 | 자료 제공 역할·R05 출처/재현 | 기존 하위 규칙 준수·조사/출처·원본 보존 |
| docs/project/reviews/ | R01 게시 취합 | 관련 설계 소유자·R05 재검증 | 새 검토 기록, 과거 보고서·증거 보존 |
| tmp/ | 생성 역할 | R01 정식화/정리 | 일시 작업만. 정식 도구/필수 데이터는 담당 경로로 이동 |

공통 파일은 주 담당이 최종 편집한다. 지원 역할은 담당 부분을 제공하고 검토하며, 소유자를 거치지 않는 동시 편집은 하지 않는다. 목록에 없는 새 경로는 목적·주 담당·검토자·의존 작업을 기록한 뒤 추가한다.

### J01~J03 한정 편집 인계 — 2026-11-06

사용자가 R01에 공통 부분을 정해 병렬 진행하도록 지시했다. [공통 기준 v1](../../infra/parallel-integration-contract-v1.md)을 이번 작업의 실행 분담으로 기록한다. 영구적인 역할 소유권 변경이 아니다.

- R01은 원소유 R04의 사용자 API **records 실제 조회 분기·전용 provider·해당 배포 환경만 대리 구현**한다. employees 등록·권한 정책은 바꾸지 않는다. R04가 같은 파일을 편집 중이면 그 diff를 먼저 인계받고 동시 편집하지 않는다.
- R02는 support 후속 분기·복원 결과 소비, R04는 state/새 마이그레이션·handoff의 상태/문맥/효과 보존을 담당한다. R04는 대리 인계 기간 USER records/provider를 병렬 수정하지 않는다.
- R03은 index/search/지식, R05는 사례·판정 도구와 공식 결과를 담당한다. 생산자 완료를 기다리지 않고 고정 모의 예제로 검사를 준비한다.
- 내부 SupportCase 보완과 조회 상태 의미의 영향 검토는 생산/소비 역할·R05가 PR36에서 한 번 확인한다. 예제 개발 착수와 VM 배포/공식 판정을 구분한다. 인계 시작·종료 버전과 원소유자의 회수 시점은 PR36에 기록한다.

## 2. 목표 (한 문장)

“따릉이 시민의 대여·반납·고장·요금/환불·후속 조회·개인정보/보안 문의를 모두 정상 접수 시 티켓으로 만들고, 근거로 답변 가능한 건은 안내 후 종료하며 정보 보완이나 담당자 처리가 필요한 건은 맥락을 유지해 연결한다.”

## 3. 범위

| 처리할 문의 유형 | 처리 방식 (자동 답변 / 보완 질문 / 항상 이관) | 근거 문서 |
| --- | --- | --- |
| 2026-11-03 | .gitignore·실제 Git 후보/강제 추적·공개 링크 검사 책임 반영 | 원문 유지·같은 폴더 개발·ZIP 선택화 |
| 2026-11-03 | Python 환경/잠금·린트/포맷·CI·공개 정책/허용 목록 책임 추가 | 로컬 원본 보존과 공개 검토본 생성·업무 Python 경계 구분 |
| 대여·잠금 해제 — U17~U20 | 분류 → 부족하면 질문 준비·티켓 생성·대기,근거 안내는 답변·검증 후 티켓 생성·종료. 미해소·상태 불일치는 이관 | [TOPIC 3절](TOPIC.md#3-범위), SRC-0048-E001, 예정 지식: rental-guide.md |
| 반납 완료 미확인 — U27·U28·U30 | 장소/시각·잠금·알림·표시 부족은 질문 준비·티켓 생성·대기,근거 안내는 답변·검증 후 티켓 생성·종료. 미확인 지속·개별 기록 검토는 이관 | [TOPIC 3절](TOPIC.md#3-범위), SRC-0018-E002, 예정 지식: return-guide.md |
| 고장·이동 곤란 — U21·U22 | 신고 방법은 답변·종료. 실제 신고·현장 조치 요청은 보완·이관, 신체 위험은 긴급 우선 | [TOPIC 3절](TOPIC.md#3-범위), SRC-0017-E001, 예정 지식: breakdown-report.md |
| 요금·환불 검토 — U12·U29·U31·U32 | 일반 기준·신청 방법은 답변·종료. 개별 청구·환불 판단·정정은 보완 후 항상 이관 | [TOPIC 3절](TOPIC.md#3-범위), SRC-0168-E001·SRC-0165-E001, 예정 지식: fees-refund-guide.md |
| 기존 문의 상태·후속 요청 — U37·U38 | 조회 문의도 티켓 생성, 본인 대상 건 상태 안내 후 조회 문의 티켓 종료. 상충·추가 판단은 이관 | [TOPIC 3절](TOPIC.md#3-범위), 과제용 조회 정책, 예정 지식: support-followup.md |
| 개인정보·계정 보안 우려 — U40 | 일반 안내는 답변·종료. 노출·침해 의심은 high 티켓·알림·담당자 이관과 초동 안내 | [TOPIC 3절](TOPIC.md#3-범위), 과제용 보안 정책, 예정 지식: privacy-security-guide.md |

Discord 이용자 입구와 Jira 티켓 관리는 사용자 결정이며 주제 적합성·6유형·웹훅+Jira 조합 표기·강사 확인은 미완료다. data-api는 공통 검증 경로로 유지한다. 세부 근거·가정은 TOPIC을 기준으로 하며, 실행 판정은 구현 전에 사례 파일에 작성한다.

하지 않을 것 (범위 밖):

- 실제 환불·요금 변경·강제 반납·원격 잠금 해제·배차·정비/출고 승인·기관 내부 DB 변경.
- 직원·협력업체의 별도 작업 문의, 후보 100개 전체와 조직 전체 협업 시스템 구현.
- 타인 기록·제한 문서 노출, 실제 시민 계정·거래·연락처 사용.
- 안내·접수·담당 알림을 실제 문제 해결로 표시하거나 미측정 효과를 성과로 제시하는 것.

## 4. 규칙

- Docker Compose를 배포 방식으로 채택한다. 상세 작업 절차는 [루트 AGENTS](../../AGENTS.md), 환경/복구는 [infra 안내](../../infra/README.md)를 단일 원본으로 삼는다. DB 제품·실제 배포 설정은 별도 확인한다.

- 공통 요청·응답·모듈 계약은 전원이 검토하고 R01이 변경을 승인·관리한다. 변경 사유·영향 파일·시험 항목을 함께 기록하며 공식 판정을 임의로 약화하지 않는다.
- 같은 워크플로우 파일의 편집 소유자는 1개 역할이다. 다른 소유자의 파일은 변경 요청 후 소유자가 수정하거나 사전 합의해 인계한다. 같은 파일을 동시에 편집하지 않는다.
- 각 역할은 변경분을 개별 시험하고 검토 요청한다. R01이 검토된 변경을 기본 브랜치에 병합한다. 저장소·브랜치 이름은 5절에서 확정한다.
- 기능 변경마다 관련 시험과 공통 회귀를 수행하고 커밋 메시지에 실제 통과/전체 수와 보고서 경로를 쓴다. 미실행은 미실행으로 표시한다. R05가 기대 결과·회귀 증거를 관리하고 각 구현 역할이 실패 원인을 수정한다.
- 모든 정상 신규 문의는 티켓화한다. 보완·재전송은 기존 건을 연결하고, 같은 request_id의 재전송으로 중복 티켓을 만들지 않는다. 생성·종료·알림 실패는 각각 확인된 결과대로 표시한다.
- 티켓 종료 지원은 R04가 실제 API로 확인하고 R02·R05와 계약·판정을 합의한다. 미지원이면 R01이 별도 구현 범위·일정·시험 비용을 조정한다. 단순 답변 문구로 종료 성공을 대신하지 않는다.
- 키·토큰은 n8n Credential에 보관하고 커밋 전 `tscan staged`를 수행한다. 질문·답변 원문 전체와 연락처를 실행 로그에 남기지 않고, 답변·티켓·알림·화면의 개인정보를 가린다.
- 81일차(11월 6일) 8교시 발표 이후 기능 동결. 이후에는 시험·결함 수정·문서·발표 준비만 수행한다.
- 팀 VM은 R01이 기본 브랜치에서 배포하고 하위 워크플로우·Error Workflow 연결을 확인한다. 배포 후 R05가 VM 공통 시험과 연결된 팀 시험을 수행하며 버전·보고서를 남긴다.
- 발표 자료는 R01이 최종 편집하고 R02~R05가 담당 근거를 제공한다. 발표자 F는 R01~R05 중 1개 ID로 지정하며 현재 미정이다. 기본 시연 조작은 R05가 맡고 F=R05이면 별도 조작 ID를 정한다. 발표·연습 시간에는 같은 역할에 구현 작업을 중복 배정하지 않는다.
- 막히면 30분 안에 팀에 공유하고 1시간이면 강사에게 문의한다. 원장에 원인·해결 역할·다음 조치를 기록하며 문서 작성만으로 구현·시험을 완료 처리하지 않는다.

## 5. 저장소 · 연락

| 항목 | 값 |
| --- | --- |
| 팀 이름·접두사 | 두바퀴 / dubakwi |
| 저장소 | [ik-e/dubakwi-ttareungi-support](https://github.com/ik-e/dubakwi-ttareungi-support), public, 기본 브랜치 main. R01이 팀 권한/검토·강사 접근을 별도 확인 |
| 이용자 채널 | Discord 슬래시 명령·본인 전용 응답. R04 Gateway 봇, R02 본체 연결. 앱/서버·봇 설치·등록 매핑은 D07에서 확인 |
| 웹훅 경로 | `POST /webhook/dubakwi-support`. 두바퀴 / dubakwi 확정 |
| 팀 VM | R01이 관리. 주소·계정·비밀번호·키는 여기에 쓰지 않음 |
| 회의 시각 | 매일 1교시 처음 10분. 역할 ID별 진행·막힘·인계·당일 목표 확인 |
| 협업 연락 채널 | 미정. R01이 전원과 합의해 기록 |
| 발표자 | F = 미정(R01~R05 중 1개 ID). 설명·질의 진행은 1명 |
| 시연 조작자 | R05 기본안. F=R05이면 별도 ID 지정 필요 |
| 발표 자료 | `docs/project/presentation/`, R01 최종 편집. 공용 파일 형식·파일명 미정 |

## 6. 바뀐 것

| 날짜 | 바뀐 것 | 까닭 |
| --- | --- | --- |
| 2026-11-03 | 사용자 업로드 요청으로 GitHub 공개 저장소 생성·주소 반영 | 첫 게시와 팀 역할/보호 설정·실제 서비스 구현 완료를 구분 |
| 2026-11-03 | Discord Gateway 봇·명령/비공개 응답·모의 사용자 매핑·시험/배포 책임 추가 | 이용자 채널 결정, 공통 시험 Webhook 유지 |
| 2026-11-03 | 팀 이름 두바퀴·기술 접두사 dubakwi 확정 및 현재 파일/웹훅 이름 동기화 | 사용자 팀명 결정 |
| 2026-11-03 | 팀 첫 실행·PR·공유 증거 경로 책임 보완 | 공개 Git에서도 팀 인계가 끊기지 않게 정리 |
| 2026-11-03 | 경로별 주 담당/검토자·Docker Compose 책임·작업 규칙 원본 지정 | 시스템 경로·개발 우선순위·의존성을 함께 관리 |
| 2026-11-03 | 일반/보완/긴급 처리 순서·Jira 범위·state/dlq 하위 기능 책임과 공통 계약 참조 동기화 | 검증 F01~F07 보완 및 역할별 내부 결정과 공통 경계 구분 |
| 2026-11-03 | R04의 STORAGE-DESIGN.md 편집 책임과 현행 TOPIC 참조 반영 | 최소 처리 상태·DLQ·실행 기록의 상세 설계를 별도 문서에서 관리 |
| 2026-11-02 | 공식 템플릿의 6개 절을 유지한 v0.1 초안 작성. 이름 칸에 R01~R05 사용 | 사용자 요청에 따라 실명 대신 역할 ID로 책임·소유권 관리 |
| 2026-11-02 | 시민 요청·정상 신규 문의 전체 티켓화·자동 답변 후 종료 및 담당 이관 반영 | TOPIC v0.2와 범위 일치 |

- 2026-11-04 v0.11 변경: infra/vm-preflight.md를 R01 환경/배포 안내 경로로 추가. 기존 R04 저장·R05 재현 검토 책임은 유지한다.
- 2026-11-05 v0.12 변경: PostgreSQL 전용 Compose/배포 준비 안내의 R01 편집·R04 저장/권한·R05 복원 검토 경로를 추가. 실제 VM DB 채택/적용·역할 검토 완료를 뜻하지 않는다.

- 2026-11-04 R05 인계 추가: cases/team-extended.json은 R05 주 담당, R02/R03/R04 관련 기대값 검토다. 파일은 r05/p06-flow-cases의 병합 후보에 있으며 이 책임 등록이 구현 병합·시험 통과를 뜻하지 않는다.

- 2026-11-05 v0.13: cases/p11-entry.json을 R05 소유·R02/R04 검토의 P11 골격 전용 임시 사례로 등록했다. team-extended.json의 기존 책임은 유지한다. 사용자가 R01에게 run_cases.py의 hook 실패 중단·관련 회귀시험 대리 수정을 인계했으며, 범위와 검증은 개발 원장의 P13/P25 기록을 따른다. 이후 시험 도구 책임은 R05가 유지한다.


## 2026-11-07 PR36 통합 대리 편집 기록

사용자가 모든 PR의 필요한 변경과 부족한 구현을 R01이 마무리하고 역할별 확인은 마지막에 받도록 지시했다. 이에 PR36 전용 작업 트리에서 support·state/handoff·errors/DLQ·사용자 API·RAG 인계·cases/runner·공통 문서의 로컬 통합 편집을 R01이 수행한다. 원래 역할별 책임은 위 표를 유지한다. 공유 VM/역할 사본의 동시 편집을 허용하는 지시로 확대하지 않으며 이번 범위는 로컬이다. 검토 회신은 실제로 수신한 뒤 기록한다.
