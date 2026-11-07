# P22 VM WF-09 재시험 (R05)

- 실행: 2026-11-06 20:33 KST, 실행·판정 R05. 대상은 VM 시험 사본 `R01 dubakwi-support P19 B17 3e8547a`(Webhook `dubakwi-support-p19-b17`)이고, 설정은 `r01-p19-b17-assignee`이다.
- 도구: `scripts/test/run_cases.py`, 브랜치 `r05/p07-r04-contract-cases` 커밋 `f30dc33`이다. `dirty: false`, 옵션은 `--path jira --no-hooks --check-logs --auth-required`이다.
- 재시험 사유: [이관 경로 시험](../20261106-174635-vm-p22-p19-handoff/report.md)에서 WF-09 첫 요청이 이관 조건을 채우지 못했다(R05 입력 문제). 질문 문장만 결제일·이용권·결제 수단·증상이 모두 들어가게 보완했다. 기대값은 바꾸지 않았다. 첫 실패 기록은 그대로 둔다.
- [결과 파일](summary.json): SHA-256 `ef0cca26…`, VM 원본과 같다. Jira key는 들어 있지 않다(가림 0건).

## 결과: 기대 충족

| 사례 | 결과 | 시간 | 판정 |
| --- | --- | --- | --- |
| WF09-1 첫 요청 | 담당자 이관, 티켓 생성, `duplicate: false` | 8.632초 | 통과 |
| WF09-2 같은 request_id 재전송 | 담당자 이관, 같은 티켓 ID·우선순위, `duplicate: true` | 0.289초 | 응답 판정 통과 |

- 공통 검사 G01·G02·G03·G06과 로그 L01~L03은 모두 통과했다.
- 두 번째 응답은 0.3초 만에 왔다. 저장된 응답을 재사용했다고 볼 수 있는 시간이다. 다만 LLM 호출·티켓 생성·재알림이 0회인지는 직접 확인하지 않았다.

## 남은 확인

- 이 요청의 Jira 이슈가 정확히 1건이고, 두 번째 요청 뒤 재배정·재알림이 없었는지(R04·Jira 확인).
- D02: 가이드·키트가 두 응답의 ticket 전체가 같기를 요구하는지 확인하기 전에는 WF-09 전체 통과로 기록하지 않는다. 이번에는 ID·우선순위·duplicate만 판정했다.
