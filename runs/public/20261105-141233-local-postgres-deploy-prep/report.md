# PostgreSQL 배포 준비본 검증

2026-11-05 KST · R01 P04/P18. 사용자 지시에 따라 구체적인 준비본을 작성하고 R04 저장/권한 검토 요청을 정리했다. 실제 VM/서비스 변경은0이다. [구조화 결과](summary.json), [배포/검토 안내](../../../infra/postgres-deployment.md), [Compose](../../../infra/postgres-compose.yaml)를 참조한다.

## 작성 범위

공식 postgres16.15-bookworm의 registry index digest를 조회해 고정했다. 기존 n8n과 별도 project의 DB 서비스1개, 공개 포트 없음·전용 external volume·기존 n8n external network·별칭dubakwi-postgres·파일 secrets3개·SCRAM·로그/종료/healthcheck를 준비했다. 자동 마이그레이션 mount는 없다. 실제 비밀 파일·환경 자원 이름·VM 식별자는 포함하지 않았다.

owner/runtime·마이그레이션·백업/복원·재시작·n8n Credential 순서와 R04에게 확인받을6개 항목을 문서화했다. 실제 명령 적용은 PR #23 수정 통과와 D01/환경 검토 후다. SQL·state/DLQ JSON은 이 준비본에서 변경하지 않았다.

## 실제 검사

로컬 Docker Compose5.6.1의 config --quiet와 canonical JSON 검사에서 구문·서비스1개·digest·무공개포트·external 볼륨/네트워크·별칭·파일 secrets3개·비밀번호 env 값 미포함·SCRAM을 확인했다. 임시 비밀 파일은 FAKE-COMPOSE-CHECK-ONLY 값이며 실제 Credential이 아니다. 테스트용 네트워크/볼륨 이름은 생성하지 않았다.

필수값 DATA_VOLUME·N8N_NETWORK·BOOTSTRAP_PASSWORD_FILE·OWNER_PASSWORD_FILE·RUNTIME_PASSWORD_FILE을 각각 제거한5개 사례는 모두 config 단계에서 차단됐다. Docker 컨테이너/볼륨/네트워크 생성·기동, 이미지 pull, 비밀 생성, VM 접속은0이다. image registry manifest 조회는 수행했으며 VM 아키텍처는 이번에 재확인하지 않았다.

문서20개/링크437개/앵커50개·공개 후보136개/링크511개·JSON·diff 검사에서 오류0을 확인했다. 저장소 Python/업무 워크플로우는 변경하지 않아 단위시험/Ruff를 이 준비본 검증으로 반복하지 않았다. CI의 공통 회귀와 이번 Compose 검사 및 실제 서비스 시험을 구분한다. tscan/Gitleaks는 미제공으로 공개 후보 검사는 부분 대체이며 전문 비밀/개인정보 검사 통과가 아니다.

## 적용 전 남은 조건

R04의 저장/권한/마이그레이션·복원 검토, PR #23 세 결함 수정과 재시험, 물리 DB 채택, 실제 VM 자원/아키텍처·파일 권한·기존망 alias·볼륨 확인이 필요하다. 이후 역할/SQL·TCP 인증·권한 거절·DB 재시작/복원·Credential·하위 기능 순서로 실제 검증한다. 기존 P11은 유지하고 S1 전에 P19로 전환하지 않는다.

R04에게는 준비본 PR의 reviewer 요청으로 전달한다. 검토 요청 전송과 실제 검토 회신을 구분하며, 회신을 받기 전에 동의/승인을 만들어 쓰지 않는다.
