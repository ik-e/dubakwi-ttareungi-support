# R04 Jira 종료 재시험 실행 증거 (20261105-192700-team-n8n-r04-jira-close)

실행일 2026-11-05(KST), 팀 n8n 편집기 실행. 가린 요약이며 도메인·계정·Credential·워크플로우 ID는 없다. 상세는 [summary.json](summary.json).

| 사례 | 실행 | 결과 |
| --- | --- | --- |
| state 스모크 | 203 | 통과 |
| 조회 본인/타인/없음/비활성 | 204~207 | 통과(타인·없음은 같은 denied) |
| begin → wait(JBYS-2 재사용) → bind | 208·209 | 통과, revision 2 |
| save, 문의 label 없음 | 212 | 예상된 실패(fail-closed, SQL 호출 0) |
| save 성공 | 215 | 통과, revision 3 |
| 이관(댓글·담당·알림) | 216·217 | 통과(첫 후보 배정은 이후 6d05ced에서 제거) |
| 종료 | 225 | 통과, 전환 ID는 실행 때 조회 |
| save 내부 finish | 228 | 통과, revision 6 |
| Jira·DB 최종 재조회 | - | Jira 완료·Resolution 완료, DB replay 일치 |
| 새 이슈 생성(라벨 중복 조회 후) | 231·232 | 통과, 조회 0건 → 생성 201 → bind rev 2 |
| 같은 요청 재전송(중복 방지) | 235 | 통과, 조회 1건 재사용·생성 0·보완 횟수 댓글 저장 |

사고 1건: 실행 222는 저장돼 있던 시험 노드가 실행되어 Bad request로 실패했고 JBYS-2는 바뀌지 않았다.

새 시험 이슈는 1건이며 키는 비공개로 전달한다(열림 상태로 보존). 미실행: 담당 매핑 성공 경로, 005~006 서비스 DB 적용 후 case_ref, Webhook 경유 호출, flow.py·tscan, Discord. S1 전체 성공으로 기록하지 않는다.
