# VM Discord J04 타인 소유 문의 조회 경계

- 실행 ID: `20261108-160000-vm-discord-j04-cross-owner-case` (KST)
- 실행 시각: 2026-11-08 16:00 KST
- 환경: 등록 Discord 계정 `citizen-c`, Jira JBYS UI
- 대상: WF09 synthetic case (`citizen-a` 소유, Jira key 공개본 가림)
- 입력: `/문의` 질문 `기존 문의를 이어서 확인하고 싶습니다.`와 해당 티켓의 `case_id`와 같은 `case_ref`

## 결과

| 확인 | 판정 | 관측 |
| --- | --- | --- |
| 타인 소유 case_ref 조회 시도 | 통과 | 등록 사용자 `citizen-c`가 다른 synthetic owner `citizen-a`의 case_ref를 제출했다. |
| 개인정보 응답 경계 | 통과 | 봇은 본인 전용으로 “문의 연결값을 확인할 수 없습니다. 연결값을 다시 확인하시거나 새 문의로 접수해 주세요.”라는 일반 거절만 반환했다. 타인 문의 내용이나 Jira 키는 응답에 없었다. |
| 기존 Jira 이슈 상태/내용 | 통과(화면 범위) | 기존 synthetic 이슈는 `해야 할 일`(To Do) 상태 그대로였다. 마지막 업데이트는 약 2일 전으로 표시됐고 새 활동/메모는 없었다. |
| 새 Jira 이슈 생성 | 통과(검색 범위) | Jira 전체 텍스트에서 입력 질문을 검색해 일치 이슈가 0건임을 확인했다. |
| DB state/DLQ | 미확인 | 이번 실행에서 DB를 조회하지 않았다. |

## 결론과 한계

J04 Discord 경계는 타인 소유 문의의 일반 거절, 기존 Jira 티켓의 화면상 무변경, 새 일치 티켓 미검색으로 통과 판정한다. 외부 호출 부재나 DB state/DLQ 무변경까지 증명하지는 않는다. 기존 D06의 유사 cross-owner live 시험과 별도 실행으로 보존한다.
