# PR #44 후보의 현재 main 계약 적합성 검사

- 실행일: 2026-11-07 21:40 KST
- 비교 대상: GitHub PR #44 head `6b19fc4` (`r02/p19-closure-w02`) vs current `origin/main` `6f9561b`
- 환경: 로컬 Node harness; VM/Jira/DB/Discord 호출 없음

## 결과

현재 main의 `support-skeleton-cases.js`를 PR #44의 `workflows/dubakwi-support.json` 임시 사본으로 실행했다.

- 현재 main workflow: 157/157 통과(2026-11-07 후속 재실행)
- PR #44 후보 workflow: 57/157 통과, 100개 실패
- 반복 오류: `R04 계약 검사 거절 save: invalid_state_request`
- 정적 검사 실패: 0

코드 대조에서 후보 B25 `TicketRequest`가 현재 필수인 `deadline_at`을 전달하지 않는 점을 확인했다. 이로 인해 mock handoff/state 계약에서 정상 시나리오도 저장 단계에서 거절된다. 후보 B28은 `wait` 액션의 성공 판정에서 `context_saved` 확인도 요구하지 않아 현재 main보다 약한 효과 검증이다. 현재 STORAGE-DESIGN은 미지원 `case_version`을 `null`로 유지하고 non-null expected version을 fail-closed로 다루므로, 버전 지원 생산자/소비자가 없는 상태에서 후보의 전체 변경을 수용할 수 없다.

## 판정

PR #44는 현재 head 그대로는 최신 main 통합 후보로 수용하지 않는다. 필요한 부분 변경이 있으면 먼저 `deadline_at`과 `wait/context_saved` 계약을 보존하는 최소 수정과 검증을 한 별도 diff로 적용한다. 현재 main의 로컬 회귀 결과는 그대로 유지하며, 이 검토는 실제 외부 연동·PR 병합을 수행하지 않았다.
