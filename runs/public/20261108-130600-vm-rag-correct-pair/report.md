# VM RAG 대응 index/search 짝 재검증

- 실행일: 2026-11-08 13:06 KST
- 환경: aio-t2 VM, Edge web SSH + n8n UI, PR36 user-api 컨테이너를 통해 n8n 내부 webhook 호출
- 코드 기준: `main` `dd919d7`로 기록된 계획 기준. VM workflow DB를 직접 읽어 실제 활성/경로/키를 대조했으며 저장소 기준과 동일하다고 가정하지 않음
- 앞선 관측: [12:56 RAG·TC-15 후속](../20261108-125600-vm-final-test-followup/report.md)

## 원인

VM n8n에는 서로 다른 두 검색 workflow 계열이 있다.

| 계열 | 검색 경로 | 검색 memory key | 대응 index |
|---|---|---|---|
| 기존 Support가 호출하는 `dubakwi-search` | `/webhook/dubakwi-search` | `dubakwi-demo-public`, `dubakwi-demo-restricted`, `dubakwi-demo-readiness` | `dubakwi-index` (`dubakwi-demo-*`) |
| PR36 전용 `R01 PR36 a657890 search` | `/webhook/dubakwi-search-pr36-a657890` | `dubakwi-pr36-a657890-public`, `-restricted`, `-readiness` | `R01 PR36 a657890 index` (`dubakwi-pr36-a657890-*`) |

12:56 시험은 후자의 index를 실행한 뒤 전자의 Support 검색 URL을 검사했다. 서로 다른 key namespace라 첫 결과 `index_not_ready`는 예상되는 불일치였다. 두 Search workflow는 VM에서 모두 active였고 index workflow는 Manual 실행 대상이었다. 저장소 `dubakwi-support.json`의 B14는 기본 경로 `/dubakwi-search`를 호출한다. API 직접 시험도 앞선 요청과 동일한 이 기본 경로를 사용했다.

## 조치와 관측

기존 `dubakwi-index` Manual workflow를 수정·게시하지 않고 n8n UI에서 실행했다. 44개 demo chunk와 readiness marker 단계가 완료됐다. 이어서 두 경로를 각각 시험했다.

| 사례 | 요청 경로/조건 | HTTP·응답 | 판정 |
|---|---|---|---|
| SR-WF01 | 기본 `/dubakwi-search`, 시민 QR query, public | 200 `ok`; 5개 public 근거. `rental-guide`의 QR 안내 절 포함 | 통과 |
| SR-WF03 | 기본 경로, 지원 근거가 없는 해외 장기 이용 query, public | 200 `empty`; 근거 0 | 통과 |
| SR-STAFF01 | 기본 경로, 직원 수준 `public+restricted`, 이관 정책 query | 200 `ok`; `handoff-policy` restricted 근거 포함 | 통과 |
| SR-R04 | 기본 경로, 잘못된 restricted-only access_levels | 200 `error`, `invalid_request`; 근거 0 | 통과(오류 입력 거부·근거 비노출) |
| SR-OFF | 기본 경로, enabled=false | 200 `skipped`; 근거 0 | 통과 |
| PR36 검색 독립 점검 | `/dubakwi-search-pr36-a657890`, public QR query | 200 `ok`; 5개 public 근거 | 통과 |

응답에는 문서 ID·절·접근수준만 기록했으며 본문은 실행 결과에 복사하지 않았다. Jira, Discord, support state, DLQ는 변경되지 않았다. 색인 시 기존 OpenAI Embeddings 노드가 demo corpus를 처리했다.

## 결론과 한계

- `index_not_ready`의 재현 원인은 index/search memory key namespace가 다른 workflow 계열을 섞어 시험한 데 있었다. 기존 Support 검색에 대응하는 index를 실행한 뒤 검색이 정상화됐다.
- 현재 VM 프로세스에서 public 검색, empty 결과, 직원 restricted 검색, invalid request, disabled 경계를 표적 확인했다. `cases/search.json` 전체 16개 사례를 수행한 것은 아니다.
- 두 RAG 계열의 동시 active 상태·중복 경로 구조는 유지됐고 workflow를 편집/게시하지 않았다. 현재 Support 호출은 기본 search URL이므로 두 계열을 정리하거나 reroute하는 변경은 이번 조치에 포함하지 않았다.
- Simple Vector Store는 메모리 기반이다. n8n 프로세스 재시작 시 데이터가 사라질 수 있으며, 재시작 뒤 대응 index를 다시 실행하는 운영 절차와 영속 저장소 적용은 별도 범위다.

## 변경 문서 정적 검증

- `check_project_docs.py`: 23 files, 852 local links, 58 anchors, errors 0.
- `check_public_files.py`: 604 candidates, 580 tracked, ignored tracked 0, 1,242 public local links, errors 0.
- `test_n8n_rag_artifacts.py`: 4/4 passed.
- `git diff --check`: passed; existing CRLF normalization warnings only.

