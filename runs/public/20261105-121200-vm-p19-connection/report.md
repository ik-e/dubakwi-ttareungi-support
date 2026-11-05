# P19 VM Credential·검색·모델 연결 부분 시험

- 실행일: 2026-11-05 KST. R01 P04/P19, 기존 n8n 2.42.6.
- 원본: PR #16 `329778c0de476bc950ad2da866833ce5244f4b07`의 `workflows/dubakwi-support.json`. SHA-256은 [요약](summary.json)에 기록했다. R02 소유 원본은 수정하지 않았다.
- 기존 P11 시험은 반복하지 않았다. P11 게시·RAG·Credential을 보존하면서 미실행 연결만 확인했다.

## 준비와 검증 범위

변경 전 SQLite 온라인 백업과 n8n config 사본을 만들고 integrity_check=ok를 확인했다. 시작 시 워크플로우3·Credential3·실행44건이다. 실제 복원 시험은 하지 않았다.

P19 전체54노드는 별도 이름/경로의 비활성 `dubakwi-support-p19-staged`로 반입했다. 환경 name/id/versionId·Webhook path/id와 Credential 참조만 변경했다. VM DB의 실제 반입 결과에서 B01은 팀 키, B14·B15·B27은 내부 키, L01~L03은 기존 OpenAI ID로 연결됐음을7노드 모두 확인했다. Credential 이름만으로 자동 선택하지 않았다.

원본 B01·B10·B13·B14·B19·B20·L01~L03을 재사용한14노드 연결 시험 사본을 별도 Webhook으로 게시했다. 공개 시민 문맥과 단계 사이의 합성 문맥은 시험 fixture다. 실제 state·DLQ·handoff·Jira를 호출하지 않고 검증 모델 결과까지만 실행했다. 전체 P19의 저장 게이트를 생략한 서비스 성공으로 해석하지 않는다.

## 실제 결과

| 시험 | 관측 | 판정 |
| --- | --- | --- |
| P19-CONN-AUTH-01 | 팀 키 없는 요청403 | 연결 시험 인증 차단 통과 |
| P19-CONN-QR-01 | 팀 키 요청200, 분류 rental | 실제 L01 호출 통과 |
| B14 원본 HTTP 노드 | `http://127.0.0.1:5678/webhook/dubakwi-search`, HTTP200·status=ok·공개 근거5개 | 내부 주소·내부 키·검색 연결 통과 |
| L02/B19 | 실제 모델 출력 JSON·비어 있지 않은 답변·인용 ID 존재 | 작성 모델 연결 통과 |
| L03/B20 | 실제 모델 출력 JSON·grounded=true·policy_ok=true·issues0 | 검증 모델 연결 및 이번 문장 판정 통과 |
| 실행 기록 | 실행45 success, B10/B14/B19/B20/L01/L02/L03 모두 실행 | 응답만으로 모델 호출을 추정하지 않음 |

성공 요청 소요10.228초는 격리 시험 한 건의 측정값이다. WF-11의6초 기준 통과가 아니며 전체 P19에서 deadline·timeout·시간 예산을 다시 검증해야 한다. 전체 분기·답변 품질·재현성 시험은 이번 범위가 아니다.

## 종료와 인계

시험 사본은 unpublish했고 active=false·activeVersionId=null·경로404를 확인했다. P19 전체 사본도 비활성이다. DB 전후 비교로 기존 support/index/search의 노드·연결·설정·게시 버전과 기존 Credential 전체 행이 일치함을 확인했다. n8n health200이며 재시작은 하지 않았다. 운영 `/webhook/dubakwi-support`는 P11을 유지한다.

R02에 전달할 확인값은 내부 기본 주소 `http://127.0.0.1:5678/webhook/`, 검색 `dubakwi-search`, B01 `dubakwi-team-key`/`X-Team-Key`, B14·B15·B27 `dubakwi-internal-key`/`X-Internal-Key`, L01~L03 `dubakwi-openai`의 환경별 실제 ID다. 비밀 값과 실제 ID는 공개 기록에 복제하지 않는다. 이번 기록은 전달용 자료이며 별도 팀 메시지를 보내지 않았다.

B15·B27은 인증 참조 확인까지만 했고 handoff 실제 호출은 미실행이다. R04 사용자/권한 fixture·state/DLQ ID·handoff/Jira·Error Workflow 연결, P19 전체 VM 시험·R05 공식 판정이 남았다. 키 재입력은 필요 없다. 원시 실행과 시험 JSON·백업·실제 환경 매니페스트는 VM 제한 경로에 유지한다.

## 문서 검증

로컬 문서 검사20개·링크420개·앵커49개, 공개 후보120개·공개 링크473개에서 오류0을 확인했다. JSON 구문과 diff 공백도 확인했다. 저장소 Python/워크플로우 원본 변경이 없어 Ruff·기능 시험을 다시 실행하지 않았다. tscan/Gitleaks는 현재 환경에 없어 공개 후보 검사로 일부 대체했으며 전문 비밀/개인정보 검사 통과로 쓰지 않는다. 과거 실행 요약과 해시는 수정하지 않았다.
