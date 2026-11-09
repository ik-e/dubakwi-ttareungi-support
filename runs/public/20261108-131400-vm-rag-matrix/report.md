# VM RAG 검색 사례 matrix 후속

- 실행일: 2026-11-08 13:14 KST
- 환경: aio-t2 VM, Edge web SSH, authenticated internal calls from PR36 user-api container to n8n
- 검색 대상: active legacy Support search `/webhook/dubakwi-search`; 대응 `dubakwi-index`는 [직전 실행](../20261108-130600-vm-rag-correct-pair/report.md)에서 완료
- 코드 기준: 로컬/원격 main `dd919d7` 계획 기준. 이 run은 현재 VM workflow와 memory state를 대상으로 함.

## 실행 결과 (16개 사례)

| Case | HTTP / status | 검증 | 판정 |
|---|---|---|---|
| SR-WF01 | 200 / `ok` | QR 기대 절 포함, public 근거 | 통과 |
| SR-WF02 | 200 / `ok` | 반납 미완료 기대 절 포함 | 통과 |
| SR-WF03 | 200 / `empty` | 근거 0 | 통과 |
| SR-WF04 | 200 / `ok` | 환불 안내 검색 결과 반환 | 통과 |
| SR-WF12 | 200 / `ok` | 원 입력에는 unrelated ticket follow-up이 함께 있어 기대 security 절이 상위 5개에서 누락. restricted evidence/canary는 없음 | **실패 (원 입력의 기대 근거 검색)** |
| SR-TC04 | 200 / `ok` | 개별 요금·환불 가상 설정 절 포함 | 통과 |
| SR-TC09a | 200 / `ok` | 반납 방법/미완료 기대 절 포함 | 통과 |
| SR-TC09b | 200 / `ok` | 로그인·계정 찾기 절 포함 | 통과 |
| SR-WF05 | 200 / `ok` | public evidence only, restricted evidence/canary 없음 | 통과 |
| SR-R01 | 200 / `ok` | public evidence only, handoff canary 없음 | 통과 |
| SR-R02 | 200 / `ok` | public evidence only, ticket-lifecycle canary 없음 | 통과 |
| SR-R03 | 200 / `ok` | role claim이 있어도 public evidence only, restricted/canary 없음 | 통과 |
| SR-R04 | 200 / `error` | `invalid_request`, 근거 0 | 통과 (잘못된 access level 거부) |
| SR-STAFF01 | 200 / `ok` | 허용된 staff 요청에 restricted evidence 포함 | 통과 |
| SR-STAFF02 | 200 / `ok` | 허용된 staff 요청에 restricted `ticket-lifecycle` evidence 포함 | 통과 |
| SR-OFF | 200 / `skipped` | 근거 0 | 통과 |

**집계:** 검색 사례 15 통과, 1 실패. 모든 호출이 HTTP 200이라는 사실만으로 사례 통과를 판정하지 않았고, 응답 status/절/접근 레벨/제한 canary를 함께 대조했다.

## SR-WF12 진단

원 입력 `따릉이 사칭 링크에 정보를 입력했어요. 제 반납 문의 T-DEMO-02도 어떻게 됐나요?`는 하나의 임베딩 query로 전달되어 반납·분실 관련 public 근거가 상위 결과를 차지했고, SR-WF12 기대 절은 상위 5개에 없었다. 이 원 결과는 보존한다.

두 개의 non-mutating diagnostic query를 추가했다.

- 보안 질문만 남긴 표현에서 `privacy-security-guide`의 `계정 노출·침해 의심 시 공개 초동 안내`를 반환했다.
- Support B13이 쓰는 보안 intent hint (`계정 정보 침해 의심 초동 안내`)와 티켓 ID를 제거한 나머지 context를 포함한 query에서도 동일 기대 절이 상위 결과에 포함됐다.
- 두 응답 모두 public 근거만 반환했고 restricted/canary 누출은 없었다.

이는 검색 index 자체가 문서를 빠뜨린 문제라기보다 multi-intent 원 query에서 보안 intent가 검색 우선순위에 반영되지 않는 문제다. Support query transform이 실제로 종단에서 적용되는지는 다음 항목 때문에 확인하지 못했다.

## 사용자 Support 종단 및 재시작 복구

- synthetic WF01 요청을 active `/webhook/dubakwi-support`로 전송했지만 HTTP 401 `Authorization data is wrong`로 거절됐다. credential을 우회하거나 추출하지 않았다. 검색 사례 16개는 내부 search credential 경로로 완료했으나 전체 문의 workflow answer/triage/save는 이 요청에서 실행되지 않았다. Jira/Discord/상태/DLQ 변경은 관측되지 않았다.
- n8n main process 재시작 시험은 수행하지 않았다. 현재 n8n instance를 재시작하면 활성 webhook 서비스가 중단되고 memory index가 소실될 수 있다. 단순 진단 과정에서 서비스 재시작을 안전하게 격리할 maintenance window를 확인할 수 없어 보류했다. Simple Vector Store 특성상 재시작 후 대응 index를 실행해야 한다.

## 결론

legacy RAG search의 현재 인덱스·검색·접근 제어·비활성 경로는 SR-WF12의 원 입력 검색 문제를 제외하고 표적 사례에서 동작한다. SR-WF12는 원 query 조건으로 실패이며 B13-style query hint가 retrieval target을 회복하는 진단은 통과했다. 사용자-facing Support 종단과 재시작 복구는 아직 확인하지 못했으므로 full RAG closeout은 아니다.

## 문서 정적 검사

- `check_project_docs.py`: 23 files, 860 local links, 58 anchors, errors 0.
- `check_public_files.py`: 606 candidates, 580 tracked, ignored tracked 0, 1,251 public local links, errors 0.
- `git diff --check`: passed; CRLF normalization warnings only.

