# VM 기준선 갱신 및 문서 검사

- 실행 ID: `20261108-120800-vm-runtime-refresh` (KST)
- 실행 시각: 2026-11-08 12:08 KST
- 코드 기준: 로컬/원격 main `dd919d709649171336f13a29a0306fae4da702f2`
- VM 환경: Edge의 기존 웹 SSH 세션, `aio-t2`
- 목적: 기존 읽기 전용 VM snapshot 이후 runtime 상태가 유지되는지 확인하고, 최신 계획 문서 검사 수행
- 범위: 웹 SSH에서 hostname, 시각, 컨테이너 상태, n8n/PostgreSQL 버전 확인. workflow 실행/게시, 색인, DB 변경, Jira/Discord 효과는 발생시키지 않음.

## VM 확인 결과

| 항목 | 관측 결과 |
|---|---|
| 호스트 | `aio-t2` |
| PR36 API | `dubakwi-user-api:pr36-a657890`, healthy |
| UX API | `dubakwi-user-api:ux-6f9561b`, healthy |
| Discord bot | `dubakwi-discord-bot:pr36-1328c63`, running |
| n8n | `dubakwi-n8n-auth-boundary:pr36-a657890`, running; CLI version `2.42.6` |
| PostgreSQL | `postgres:16.15-bookworm`, healthy; server version `16.15` |
| 기타 | course-data API, n8n runners, sandbox, SearXNG 컨테이너도 running/healthy로 표시됨 |

컨테이너 태그·상태와 n8n/PostgreSQL 버전은 2026-11-08 11:31 KST read-only snapshot과 일치했다. 이 확인은 컨테이너 health와 버전 확인이며 workflow 호출 성공, 실제 RAG 색인 내용, Jira/Discord 종단 동작을 증명하지 않는다. 명령 입력 과정에서 `date -Is` 옵션은 해당 컨테이너/CLI 조합에서 거부되었고, 첫 터미널 입력은 재시도 문자열이 합쳐져 Docker usage 오류를 냈다. 이후 개별 버전 명령은 정상 완료했다. 이 입력 오류는 서비스 상태 변경을 일으키지 않았다.

## 로컬 문서·계획 검사

| 검사 | 결과 | 한계 |
|---|---|---|
| `check_project_docs.py` | 통과: 문서 23, 로컬 링크 817, anchor 58, 오류 0 | 외부 링크·Mermaid·runtime 미검사 |
| `check_public_files.py` | 통과: 후보 591, 추적 580, 제외된 추적 파일 0, 공개 로컬 링크 1193, 오류 0 | Git 이력·원격·PII/라이선스 보증 아님 |
| `check_full_system_coverage.py` | 정적 계획 감사 통과: 요구 64, 패키지 12, runtime 시험 0 | 실행 계획/fixture 구조만 검사 |
| `git diff --check` | 통과 | 서비스 시험 아님 |

## 판정 및 다음 게이트

- runtime 버전/컨테이너 기준선은 유지됨.
- VM 시험을 main `dd919d7` 실행 결과로 합산하지 않는다. VM은 별도 이미지 tag `pr36-a657890`의 환경이다.
- 다음은 n8n workflow별 저장소 원본↔VM 이름/ID/게시 상태 매핑 및 DB/RAG readiness 확인이다. 이번 run에서는 아직 workflow 매핑을 갱신하지 않았다.
- 현 knowledge manifest는 승인 대기이며 Simple Vector Store는 프로세스 메모리형이다. 현재 index population이 확인되기 전에는 VM 사용자 RAG 시험을 통과로 판정하지 않는다.
- `recovery_control` 부재에 따른 TC-07 전체 복구 제한과 TC-15 격리 고장 종단은 미해결 상태로 유지한다.
- Jira/Discord/DB/workflow 쓰기 효과: 0.

## 참조

- 이전 상세 VM snapshot: [20261108-113100-vm-pr36-baseline-readonly](../20261108-113100-vm-pr36-baseline-readonly/report.md)
- 로컬 회귀: [20261108-115900-local-phase01-regression](../20261108-115900-local-phase01-regression/report.md)
- 시험 순서: [PR36 최종 통합 시험 계획](../../../docs/project/final-test-plan.md)

## n8n UI workflow 관측 (read-only)

기존 Edge 탭의 n8n Workflow 목록을 확인했다. UI 총계는 106개이며 이 수는 PR36 시험 범위가 아니다. PR36 관련 행은 다음과 같이 표시됐다.

| UI workflow | UI 게시 표시 | 확인 범위 |
|---|---|---|
| R01 PR36 a657890 support | Published | 목록 표시, workflow 상세 URL ID `dubakwiPR36a657Support` |
| R01 PR36 a657890 search | Published | 목록 표시 |
| R01 PR36 a657890 handoff | Published | 목록 표시 |
| R01 PR36 a657890 errors | Published | 목록 표시 |
| R01 PR36 a657890 dlq | Published | 목록 표시 |
| R01 PR36 a657890 state | Published | 목록 표시 |
| R01 PR36 a657890 index | Published 표시 없음 | 상세 ID `dubakwiPR36a657Index`; Manual trigger, Publish 버튼 비활성, Executions 화면 “No executions found” |
| R01 PR36 dual storage Support/Handoff/State/Dlq | Published | 목록 표시 |
| R01 PR36 dual storage Errors | Published 표시 없음 | 목록 표시 |
| dubakwi-ux errors/handoff/dlq/state/support (5개) | Published | 목록 표시 |
| dubakwi-recovery-operator | Published 표시 없음 | 목록 표시. 이 runtime refresh에서는 실행하지 않음 |

저장소 원본 JSON의 `name`은 `dubakwi-support`, `Dubakwi P16 educational demo search`, `Dubakwi P10 educational demo index`, `dubakwi-handoff · P12 Jira 연동` 등이며 VM PR36 행 이름과 일치하지 않는다. 이름만으로 동일 구현이라고 판정하지 않는다. 정확한 source revision, JSON hash, credential/hook bindings, downstream workflow reference까지 일치시키는 원본↔VM mapping은 아직 미완료다. VM index의 실행 이력이 없고 저장소가 메모리형이므로 live RAG population/readiness도 미확인이다.

이 화면 확인은 read-only였다. workflow 실행·저장·게시·활성 변경, RAG 색인, DB/Jira/Discord 쓰기는 수행하지 않았다.
