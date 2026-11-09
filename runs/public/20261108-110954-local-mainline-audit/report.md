# 저장소 기준선·작업 트리·PR 분기 대조

- Run ID: `20261108-110954-local-mainline-audit` (KST)
- 확인일: 2026-11-08
- Remote: `origin` → `ik-e/dubakwi-ttareungi-support`

## 기준선 조치

- Fetch 후 원격 `main`은 `dd919d709649171336f13a29a0306fae4da702f2`였다.
- 현재 체크아웃 `r01/p18-dlq-jira-lookup`의 HEAD는 같은 SHA이며 `origin/main`과 같았다. 이는 PR36 이후 PR #46~#52와 P18 DLQ lookup 기록을 포함한다.
- 로컬 `main`은 `bad410c`였고 원격보다 뒤처져 있었다. 로컬 `main`이 다른 worktree에서 checkout되지 않았고 fast-forward ancestor 관계임을 확인한 후 `dd919d7`로 fast-forward했다. merge commit/rebase/reset은 하지 않았다.
- 현재 작업 브랜치와 원격 추적 브랜치는 변경하지 않았다. 다수의 기존 worktree·브랜치도 건드리거나 삭제하지 않았다.

## 작업 트리 분류

- 수정 문서: `docs/DEVELOPMENT-PLAN.md`, `docs/project/EXECUTION-RESULT.md`, `docs/project/implementation-status-and-closeout-plan.md`
- 신규 시험 자료: `cases/discord-jira-user-acceptance.md`, `runs/public/20261108-104900-vm-discord-jira-uat/`
- Python 서비스, n8n workflow JSON, SQL migration, knowledge artifact 변경은 없다.
- 이 파일들은 구현 변경이 아니라 시험/마감 기록이다. 커밋·push는 이 작업에서 하지 않았다.
- `runs/public/20261107-192148-local-p26-closeout/baseline-manifest.json`은 `6f9561b` 시점의 역사 자료로 보존한다. 새 기준 SHA를 반영해 과거 해시를 덮어쓰지 않았다.

## 다른 PR·작업 브랜치 판정

2026-11-08 조회 시 열린 PR은 #24, #29, #32, #33, #34, #35, #39, #43, #45였다. PR 상태를 바꾸거나 병합하지 않았다.

| PR | 현재 판단 | 확인 내용 |
|---|---|---|
| #24 RAG 권한 시험 준비 | 통째 병합 안 함 | 시험 계획 파일은 현재 main에 있으나 PR head와 내용이 다르다. 발표 PDF는 시험 기준선에 필요하지 않다. 기존 main 문서를 기준으로 후속 시험을 진행한다. |
| #29, #32~#35 | 통째 병합 안 함 | 주요 일일/VM/인계 실행 보고서 대표 경로는 main에 같은 내용으로 존재한다. 일부 계획 문서는 main과 차이가 있어 오래된 tree를 덮지 않는다. |
| #39 | 통째 병합 안 함 | handoff 문서가 main과 다르며 기능 병합 필요 근거가 아니다. 필요한 운영 사실이 빠졌는지만 후속 문서 대조에서 확인한다. |
| #43 | 추가 병합 불필요 | fault-copy 코드, 테스트, 실행 가이드와 대표 결과 파일을 현재 main과 비교해 동일함을 확인했다. PR은 아직 열려 있으며 자동 종료하지 않았다. |
| #45 | 통째 병합 안 함 | latency probe, 관련 테스트, handoff/evidence 문서는 main과 같다. RAG 아키텍처는 main과 달라 오래된 PR판으로 교체하지 않는다. |

나머지 원격 비병합 브랜치들도 역사적 작업물로 보존했다. 브랜치가 main에 없다는 사실만으로 합치지 않았다. PR #24의 고유 발표 산출물은 시험 실행 자료와 분리하고, 공개/제출 요구가 있을 때 따로 판단한다.

## 기준선 한계와 다음 단계

코드 기준선은 고정됐지만 전체 VM artifact manifest는 아직 고정되지 않았다. 배포 이미지 digest, 7개 업무 workflow 게시본 hash/active 상태, SQL migration snapshot, RAG index/knowledge revision, Jira·Discord 연결 버전을 비밀 없이 대조해야 실운영 시험 버전까지 재현 가능하게 고정된다. 이번 시험은 구현 변경 없이 현재 VM 관측을 기록한 것이며, 통합 테스트 전체 완료를 뜻하지 않는다.
