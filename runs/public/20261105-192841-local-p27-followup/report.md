# P12/P18 최신 PR 검토와 배포 보류 조건

2026-11-05 KST · R01 · [구조화 결과](summary.json).

R04의 종료/save/재조회 성공 회신 후 최신 PR #27은 5737477로 갱신됐다. 이번 확인에서 실제 Jira 종료를 재실행한 것은 아니다. 공통 unittest79건 중72통과·HTTP7생략, Ruff check/format(51파일)이 통과했다. 005~006 및 case-contract.sql은 기존 로컬/VM 격리 DB 검증 대상60f8886과 바이트 변경이 없다.

기존 GitHub R01 changes-requested 검토의 P1을 최신 코드로 재현했다. H23은 req.a와 req/a를 같은 label로 바꾸며 scope/owner도 구분하지 않는다. H24는 검색 결과 첫 이슈를 case/owner 검증 없이 재사용한다. 이로 인해 다른 문의를 연결·변경할 수 있어 전체 PR 병합·서비스 적용은 보류한다. 충돌을 방지하는 요청 식별, 재사용 시 문의/소유권 검증, 충돌/다중 결과/다른 scope 회귀가 필요하다. R04 소유 원본은 수정하지 않았다.

담당 매핑 미설정 시 안전 실패 수정과 보완 횟수·조회 시도·Credential 참조 수정은 최신 원본에 포함됐다. 실제 담당자를 정하는 근거가 기존 설정에 없어 임의 계정을 선택하지 않았고 사용자에게 support/security 지정 담당을 요청했다. 웹 SSH가 로그인 화면으로 돌아가 실제 후보 조회도 재인증 대기다. 기존 데이터·workflow·Credential·Jira는 이번 확인에서 변경하지 않았다.

서비스 적용은 P1 수정·검토된 main 버전 확정 후 진행한다. 배포 전 DB 백업/버전/권한과 기존 case 함수 미적용 여부를 확인하고 005~006만 적용한다. 001~004 초기화를 반복하지 않는다. runtime 허용/거절과 기존 state_apply 불변을 확인한 뒤 대응 state workflow를 비활성 복제본에서 맞춰 검증한다. 기존 공유 Credential의 DB를 시험 DB로 바꾸지 않으며 시험 processing/DLQ/known ID는 유지한다. 후보 계정 조회와 담당 지정은 배정 API 호출과 분리한다.


후속 확인: 검토 중 PR head가 fdd0be1로 바뀌었으나 5737477 이후는 원장/실행 증거 추가이며 업무 코드와 SQL은 바뀌지 않았다. [R04 실행 증거](https://github.com/ik-e/dubakwi-ttareungi-support/blob/fdd0be140649a4a47ba833e7974ef303971e8abd/runs/public/20261105-192700-team-n8n-r04-jira-close/summary.json)는 종료/저장 시험의 사용 코드와 이후 배정 안전화 버전을 구분한다. 성공 보고를 최신 본체 전체 성공으로 확대하지 않는다.

사용자 요청대로 설계와 R02 본체 6e3f241의 B25를 대조했다. security 유형의 이관만 security, 그 외 이관은 support이며 close/wait는 null이다. 이관 담당 역할과 시민/직원 API의 접근 권한은 다른 의미다. 개인 Jira 계정은 D06 미확정으로 남아 있다. SSH 재인증 후 기존 Credential의 GET으로 배정 가능한 활성 계정1개를 확인하고, 두 논리 역할을 기존 시험 계정에 연결하는 시험 전용 초안을 비공개에 준비했다. 계정명/ID는 공개하지 않았고 실제 매핑이나 배정은 적용하지 않았다.

같은 읽기 전용 helper로 기존 시험 이슈의 done 상태·Resolution과 기존 배정 계정이 조회 후보와 같음을 확인했다. DB SELECT에서도 completed revision3/6의 응답 저장과 이전 processing revision2 보존을 확인했다. 서비스 case_lookup/case_begin 함수는 여전히 없어 005~006 미적용을 실제 확인했다. 새 미게시 helper1개 외 기존 업무 원본·데이터·Credential은 수정하지 않았으며 모든 HTTP 노드는 GET임을 내보낸 원본으로 확인했다. 원시 결과·계정 후보·workflow source·매핑 초안은 VM private 경로와 Git 제외 인계에만 보관한다.
