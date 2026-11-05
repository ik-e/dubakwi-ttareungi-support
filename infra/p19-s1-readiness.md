# P19 실제 S1 고정 기준과 R01 준비

- v0.1 / 2026-11-06 KST / P12/P19, R01. [새 증거](../runs/public/20261106-062603-mixed-p19-s1-readiness/report.md).
- 상태: 고정 scope의 비활성 비공개 후보 준비 완료. 역할 검토·errors 수정·main 기반 적용 전으로, 실제 S1 게시 완료가 아니다.

## 1 고정 기준

| 대상 | 기준 |
| --- | --- |
| support 업무 원본 | 5e0026c; 생산자 묶음/문서6a963c6와 support Git blob 동일 |
| state/DLQ/handoff | 1b83d18 |
| errors | ff19178, 별도 수정 요청 중; 현재 후보에 Error Workflow 미연결 |
| 다음 전체 S1 scope | dubakwi-p19-real |
| 운영 유지 | 기존 P11. 시험 support는 별도 ID·경로를 사용 |

scope가 label 식별에 포함되므로 재전송/복구 중 변경하지 않는다. 다른 scope의 기존 시험 이슈를 이 시험에 재사용하지 않는다. R01 검사 시점 request_state/dead_letters는 모두0행이었으며 게시 직전에 충돌을 다시 확인한다. 이 조회는 scope를 DB에 예약하거나 다른 실행을 잠그는 조치가 아니다.

## 2 완료한 준비

1. #27 1b83d18의 R01 승인과 CI 통과 확인. 이전 상관키/무검증 재사용 결함에 대한 승인이며 영향 역할 검토·전체 S1을 대신하지 않는다.
2. R02 원본 Code 시험125/125통과. HTTP·Jira·LLM·DB는 대체값인 로컬 Code 시험이다.
3. VM SELECT에서 고정scope 요청0/DLQ0, 시험 support ID/경로 충돌0, case_lookup/case_begin없음, DUBAKWI_SCOPE미주입, health200을 확인했다. 기존 이미지로 network none/read_only·n8n 볼륨 readonly 조회 helper를 사용했으며 기존서비스를 재시작하지 않았다.
4. 앞선 비공개 후보는 다른 예행scope로 생성돼 있었다. 원본을 보존하고 기존 환경참조를 사용해 새 고정scope 후보를 생성했다. 실제LF파일과manifest 해시일치·Credential8참조·active=false를 확인했다. 환경 ID는 VM 반입 시 다시 대조해야 한다.

새 후보/manifest와 이전CRLF생성본은 Git 제외 runs/에 둔다. 실제 Credential ID·내부 연결값·원시 출력은 공개하지 않는다. 이 후보는 VM deploy 경로에 없고 반입/게시하지 않았다. #28 미해결 errors는 후보에 연결하지 않았다. 키를 새로 생성하거나 복사하지 않았다.

## 3 남은 통합 조건

| 조건 | 현재 상태와 다음 조치 |
| --- | --- |
| #27 영향 검토 | R02·R05 회신 미취합. 사용자는 별도 회신 없음을 확인. 검토 전 병합하지 않음 |
| #16 | 요청 검토/통합 필요. #27 병합 후 R02가 main 반영·설계서 충돌을 정리하고 support해시 확인 |
| #28 오류 처리 | E05 state 실행 throw가 E06/DLQ를 막는 P1, 운영 알림 미구현·scope 연결 미완료. R04 수정/한계 명시와 R02/R05 검토 필요 |
| 005~006/full state | 기존 별도DB 검증과 서비스 적용 구분. 검토된main과 백업 확인 후 owner/runtime·함수/권한·기존업무행 보존을 대조해 적용 |
| 담당 매핑 | D06의 시험 전용 매핑을 R04/R02가 확인. 임의 첫 계정 배정이나 운영 담당 확정 금지 |
| 전체 시간 | D05의 일반응답·WF11·B15/B27 및 저장/복구 시간 예산 확정 필요 |

저장소 [AGENTS](../AGENTS.md)의 검토·기본 브랜치 배포 절차를 따른다. 역할 검토 회신을 받은 것으로 만들거나 다른 소유자의 workflow/SQL을 이번 준비에서 수정하지 않았다. 이전 비공개 묶음 준비 및 제한 create/wait/save/replay 실연동은 [R01 PR #35](https://github.com/ik-e/dubakwi-ttareungi-support/pull/35)의 별도 증거다. 그 결과를 본체 전체 S1 성공으로 쓰지 않는다.

## 4 검토 후 실행 순서

1. 영향 검토 취합 → #27 병합 → R02의 #16 main 반영/충돌 해결/해시 재확인. #28의 필수 오류 기록 경계도 검토한다.
2. 새 변경 전 백업·대상 scope/현재 DB 확인 → main의005~006 적용/권한 검증 → 최신 state/DLQ/handoff/errors 사본의 원본·환경 치환 대조.
3. support와 errors의 동일scope 연결·담당 매핑·인증·ID/경로 충돌 확인 후 사본만 게시. n8n 재시작을 임의 전제하지 않는다.
4. 실제 S1 한 건에서 Jira생성1·종료, DB completed/최종응답, DLQ0을 확인. 같은 요청 재전송은 저장응답·추가 Jira/LLM/알림0을 확인한다. 실행ID와 가린 증거를 R02/R05에 인계한다.
5. 미확인 외부 효과는 새 요청으로 재시도해 숨기지 않는다. known ID/처리권/원 실행을 보존하고 사본 시험 후 게시 해제·기존 P11 보존을 확인한다.
