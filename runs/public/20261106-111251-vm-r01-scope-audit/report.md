# R01 VM S05 완료 확인·scope 및 사본 차이

2026-11-06 KST. Edge의 기존 웹 SSH 탭을 정확한 URL로 지정해 접속했다. 직전 창 전체 읽기의 URL 판별 실패는 VM 연결 장애가 아니었다. n8n SQLite를 read-only로 읽었으며 업무 workflow를 실행·반입·게시하지 않았다. 비교 원본은 #27 `86d78e7`, #28 `8c53cf7`, manifest 도구는 R02 `ef1b199`다.

## 완료 확인

지정된 비활성 state 시험 사본의 S05 parameters SHA-256은 `1f7f14332067568419eefffbc2187fd3ab42ec2f7316d9dcb83d9648a3b210f6`으로 `86d78e7`과 같다. 이전 검증의 구형 S05는 이미 갱신돼 이번에 다시 편집하지 않았다. state PostgreSQL Credential 연결은 기존 인계와 일치한다. 변경 전 state 11노드 백업과 DLQ 5노드 백업은 비활성으로 존재한다.

DLQ는 6개 노드 parameters의 순서 포함 집계 해시와 전체 connections 해시가 `86d78e7`과 같다. 해당 사본은 비활성·미게시다. SQL007 적용 여부나 실제 중복 제거 동작은 이번에 확인하지 않았다.

## 현재 사본과 후보의 차이

| 대상 | VM 노드 수 | 최신 후보 노드 수 | 판정 |
| --- | --- | --- | --- |
| state | 11 | 20 | S05 일치는 전체 원본 일치를 뜻하지 않음 |
| DLQ | 6 | 6 | parameters·connections 정적 일치 |
| handoff | 9 | 48 | 전체 최신 후보와 다름 |
| errors | 7 | 최신 scope fallback·guard 필요 | E02에 importedScope 대입값/대체 처리 없음 |

지정 네 사본은 모두 비활성·미게시이고, 조회 시 running/waiting/new 실행은 0건이었다. errors E05·E04는 지정된 state·DLQ 사본을 참조한다. P19 실제 시험 경로 `dubakwi-support-p19-real`은 아직 없다. 기존 support 운영본과 staged/mock 사본을 실제 시험 사본으로 간주하지 않았다.

## scope 진단

n8n 컨테이너 설정에서 `DUBAKWI_SCOPE`와 `N8N_BLOCK_ENV_ACCESS_IN_NODE`는 모두 미설정이었다. 미설정을 환경 접근 허용으로 해석하지 않는다. 현재 errors E02에는 최신 importedScope fallback이 없다.

VM에서 추출한 현재 E02 코드만 Node.js VM sandbox의 가짜 오류 입력으로 실행했다. 빈 환경 객체에서는 `scope=null`, `storage_ready=false`였고, 환경 접근을 거절하는 Proxy에서는 예외가 났다. 이는 실제 n8n Code 노드나 ErrorTrigger 실행이 아니며 업무 DB/Jira 호출은 없다. 따라서 현 VM의 support/errors 실효 scope 일치를 통과로 기록할 수 없다.

R02 도구가 만든 로컬 최신 후보의 `scope_matches_support=true`는 별도 사실이며 현재 VM 사본의 동작을 보증하지 않는다. 최신 전체 사본 반입 후 실제 n8n 실행 환경에서 scope를 확인해야 한다. 전역 보안 설정을 완화하거나 n8n을 재시작하지 않았다.

## 인계

- R02/R04: S05 추가 갱신은 필요 없다. 기존 백업은 보존한다. manifest의 최신 후보 표기와 현재 VM 반입본을 구분한다.
- R01: 영향 역할 검토·#27/#28 병합 뒤 검토된 main에서 전체 state·handoff·errors를 렌더·대조하고 support와 같은 scope/대상으로 반입한다. 사본 노드 차이는 확인된 배포 차이이며 원본 결함으로 단정하지 않는다.
- R05: 최신 실제 n8n scope와 409/ErrorTrigger 종단 확인 전에는 TC16/TC17·전체 S1을 통과로 기록하지 않는다.

실제 ID·서버 경로·원시 workflow는 Git 제외 VM 배포 폴더의 권한 제한 snapshot에만 보존했다. 이번 작업의 workflow 편집·업무 DB/Jira 쓰기는 0건이다.
