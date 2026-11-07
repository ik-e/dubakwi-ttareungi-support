# PR36 기준선 후속 PR 분기 비교

- 확인일: 2026-11-07 21:41 KST
- 현재 `origin/main`·작업 브랜치 HEAD: `6f9561bae48ad5da44b726f95c18d29024ba0d0d`
- 방법: 연결된 GitHub PR 메타데이터 조회 + 로컬 remote-tracking tree의 파일 blob 비교

## PR 상태와 기준선 관계

| PR | GitHub 상태 확인 | 현재 `main` 대조 | 판정 |
|---|---|---|---|
| #36 | merged | 현재 main 기준선의 통합 PR | 완료 |
| #43 | open, mergeable | `make_llm_time_fault.py`, 해당 테스트, 시험 가이드와 과거 로컬 요약 파일 blob은 main과 동일. `DEVELOPMENT-PLAN.md`는 분기 오래된 전체 계획으로 main과 다름 | 코드/시험은 이미 포함; 오래된 원장 문서 때문에 PR 전체 병합 불필요 |
| #44 | open, not mergeable | support 본체 변경이 현재 main과 다름. head `6b19fc4` 후보 계약 실행은 57/157 통과·100 실패 | [별도 계약 검사](../20261107-214000-pr44-contract-review/report.md)상 현재 그대로 수용하지 않음 |
| #45 | open, not mergeable | RAG latency probe/시험 및 3개 인계 문서는 main blob과 동일. `docs/project/RAG-ARCHITECTURE.md`는 main의 최신 현황 머리말을 제거한 구버전 | 도구·인계 내용은 포함; 문서 후퇴를 포함한 전체 병합 불필요 |
| #49 | merged | Jira UX 유형 분리 변경이 main에 포함 | 완료 |
| #50 | merged | UX Discord 비밀 분리 경계가 main에 포함 | 완료 |

GitHub의 mergeable 값은 조회 시각의 메타데이터이며 PR을 병합하거나 변경하지 않았다. 열린 상태는 현재 main의 시험 도구 내용이 없다는 의미가 아니며, main과 blob이 같은 부분은 실제 파일 해시로 비교했다.

## 작업 트리

현재 작업 브랜치 `r01/p26-final-closure`는 `origin/main`과 같은 HEAD다. P26 보고서와 문서 갱신은 아직 working tree 변경이며 별도 커밋/푸시하지 않았다. 이 검사로 확인한 별도 제품 코드 변경은 없다.
