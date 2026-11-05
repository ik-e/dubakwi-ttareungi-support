# 서비스 저장소 관리 설계서 · 두바퀴

전체 구성과 요청·티켓·DLQ 상태의 관계는 [최상위 시스템 설계서](SYSTEM-DESIGN.md)를 참조한다. 저장 구조·계약·복구 상세의 원본은 이 문서다.

- 작성: 2026-11-03 KST / 버전·상태: **v0.5 PostgreSQL 저장 계약·검증 준비본, VM 연결 전**.
- 편집 책임: R04 연동·안정성. 인터페이스 검토 R02, 환경·보존 정책 R01, 확인 항목 검토 R05.
- 팀 보조 설계서다. 공식 워크플로우·RAG·실행 결과서 템플릿을 대체하지 않는다.
- 범위의 원본: [TOPIC](TOPIC.md). 전체 동작·공개 페이로드·오류 분기는 [워크플로우 설계서](WORKFLOW-DESIGN.md), 지식·벡터 저장은 [RAG 설계서](RAG-ARCHITECTURE.md), 작업 배정·진행은 [개발 계획](../DEVELOPMENT-PLAN.md).

## 1. 목적과 결정 상태

사용자와 정한 저장 범위는 **Jira 티켓 + 최소 처리 상태 + n8n 실행 기록 + DLQ**다. 시민 문의의 전체 원장과 전체 연동 이력 테이블은 추가하지 않는다.

| 항목 | 현재 상태 |
| --- | --- |
| Jira 티켓 관리 | 사용자 채택. 실제 계정·프로젝트·필드·연결은 확인 전 |
| 최소 처리 상태·실행 기록·DLQ | 사용자 채택. 상세 구조는 이 문서의 작업 기준 초안 |
| 물리 저장 | PostgreSQL의 request_state/dead_letters 2테이블 + n8n 기본 실행 기록. 마이그레이션 준비본은 구현, VM 배포·채택 검증 전 |
| 이전 3테이블 제안 | 제외. support_cases와 integration_events를 별도 구축하지 않음 |
| 실제 구현 | SQL·권한 마이그레이션,state/DLQ 저장 함수·검증 SQL 준비. DB 배포·n8n 실제 연결·재처리 실행은 미완료 |

PostgreSQL 제안 이유는 요청 고유키·조건부 갱신·DLQ 중복 제한을 관리하기 위해서다. 다른 저장 기능으로 같은 계약을 충족하면 물리 기술을 변경할 수 있다. 단순 GET 후 SET만 제공하는 저장소가 동시 요청까지 보장한다고 가정하지 않는다. 제공 data-api의 메모리 캐시·DLQ는 공통 시험에 사용 가능하지만 재시작 복구가 구현된 것으로 보지 않는다.

## 2. 저장 책임과 원본

| 관리 대상 | 저장 위치 | 원본으로 관리하는 정보 | 복제하지 않을 정보 |
| --- | --- | --- | --- |
| 시민 문의·티켓 | Jira | 시민 소유자·논리 문의ID·최초 요청ID,가린 문의 맥락·보완 횟수,답변·근거,담당자·우선순위·업무 상태·이력 | 별도 DB의 티켓 전체 사본 |
| 최소 처리 상태 | request_state 후보 | 요청 실행 상태,owner/input_hash,문의·Jira 연결,최종 응답,중단 위치 | 전체 대화·CaseFacts·Jira 변경 이력 |
| 상세 실행 기록 | n8n 자체 저장소 | 실행ID·노드·실행 결과·시간·오류 확인 | 별도 서비스 로그 테이블에 같은 원시 실행 복사 |
| 실패 대기열 | dead_letters 후보 | 확인·재처리가 필요한 실패·미확인 단계와 처리 결과 | 성공한 모든 API 호출의 전체 이력 |
| RAG 지식·색인 | RAG 설계서의 저장소 | 문서 원본·청크·벡터·색인 버전 | 이번 문서로 저장소 통합·변경 |

Jira 업무 상태와 request_state.processing_status는 다르다. 예를 들어 요청이 completed여도 Jira 티켓은 보완 대기나 담당 처리 중일 수 있다. 자동화의 이관 응답 완료를 티켓 문제 해결로 표시하지 않는다.

SupportCase/CaseFacts는 워크플로우가 조합하는 논리 객체다. 별도 테이블 생성을 뜻하지 않는다. 보완 요청은 최소 연결 정보를 확인하고 Jira에서 현재 소유권·맥락·횟수·상태를 읽어 처리한다. Jira reporter가 서비스 계정이면 시민 소유권의 근거로 사용하지 않는다.

### 2.1. P09 모의 사용자 공급과 data-api 경계

`data/users.json`은 팀 형식 사용자·권한의 원본이고 `data/records.json`은 소유권 시험 자료다. `unregistered-zz`는 미등록 시험을 위해 어느 사용자 공급 파일에도 넣지 않는다. 강의 data-api의 `{name,dept}` 형식은 dept를 역할로 승격하지 않고 citizen/public으로만 처리한다.

최종 팀 연동의 계약은 `{id,role,access_levels}` 형식이다. 다만 이 PR은 `users.json` fixture와 공급 계약만 준비하며, 그 파일을 실제 HTTP로 제공하는 팀 API 서버·컨테이너·n8n 어댑터는 포함하지 않는다. 실제 공급 구현의 위치, VM 내부 주소, 네트워크 별칭, Header Auth 적용 여부와 Credential 이름/ID는 R01의 배포 조건과 R02의 B05 소비 검토 뒤 확정한다. 등록 사용자는 HTTP 200에 팀 형식을, 미등록 사용자는 404를 반환해야 하며 임의 role/access_levels 입력은 받지 않는다.

현재 강의 원본의 `GET /employees/<name>`에는 별도 인증과 직원 조회 고장 스위치가 없다. 강의 API 호환 방식은 시민 정상·미등록 시험을 먼저 가능하게 하는 보조 경로일 뿐, 담당자의 restricted 권한 공급이나 최종 팀 API 구현이 아니다. 실제 조회→B05→RAG·소유권 종단 시험은 VM 공급과 R02/R03 연결 후 수행하며, fixture 정적 확인과 구분한다.

강의 data-api 호환 모드는 R01이 VM의 기존 `employees.json`을 저장소 밖에 백업한 뒤, `users.json`에서 role이 citizen인 세 ID를 아래 형식으로 기존 배열에 병합하고 `/data/employees.json`에 읽기 전용 마운트한다. 기존 강의 직원은 덮어쓰지 않는다. 이 형식은 담당자 권한을 표현할 수 없으므로 support/security는 넣지 않으며 시민·미등록 시험에만 사용한다.

```json
[{"name":"citizen-a","dept":"시민"},{"name":"citizen-b","dept":"시민"},{"name":"citizen-c","dept":"시민"}]
```

확인은 n8n 내부에서 `GET http://data-api:8800/employees/citizen-a`가 200과 `{name:"citizen-a",dept:"시민"}`을, `unregistered-zz`가 404를 반환하는지 본다. 팀 형식 모드는 `users.json`을 읽는 서버 경계가 200에 `{id,role,access_levels}`를 반환하도록 한다. 두 방식 모두 외부 공개 포트·사용자 입력 role/access_levels·저장소의 인증값은 허용하지 않는다. VM Header Auth가 필요하면 R01이 비공개 Credential로 주입한다.

### 2.2. P09 로컬 검증 기록 (2026-11-05)

아래 결과는 연락처·URL·Credential·원문 요청을 포함하지 않은 가린 요약이다. 공식 `runs/public/` 증거와 팀 판정은 R05 검토 뒤 별도로 연결한다.

| 확인 | 실행·결과 | 증명하지 않는 것 |
| --- | --- | --- |
| fixture 정적 검사 | 사용자 5명, 기록 4건, 사용자 ID 중복 0, `unregistered-zz` 공급 0, 모든 owner 참조 연결 확인 | HTTP 공급·VM 연결 |
| 강의 API 호환 확인 | 강의 `server.py` 로컬 실행에서 `citizen-a` 200, `unregistered-zz` 404 | 팀 형식 API·담당자 restricted 공급 |
| P11 B02/B05 Code 검사 | `node scripts/test/support-skeleton-cases.js --label p09-data-api-supply` → 50/50 | 실제 n8n·RAG·Jira 호출 |
| Python 공통 회귀 | `uv run --locked python -m unittest discover -s scripts/test -p 'test_*.py'` → 총 45개 중 38개 통과, HTTP 환경 의존 7개 생략 | 생략된 HTTP 시험 통과 |
| 코드·공개 후보 | Ruff check/format 통과, 공개 파일 105개 검사 오류 0, staged 비밀 패턴 0 | 실제 개인정보·운영 비밀의 서버 측 관리 |

검증 당시 기준 커밋은 `80c2153`, 기준 main은 `0e44fdb`다. 이 기록은 fixture와 계약의 로컬 검증 근거이며 실제 팀 API·B05→RAG·소유권 종단 성공으로 확대하지 않는다.

## 3. 최소 처리 상태 설계

### 3.1. 논리 구조와 제약

request_state는 **팀 범위의 요청ID당 1건**이다. 같은 문의의 보완 요청은 새 request_id와 같은 case_id/first_request_id/Jira 연결을 사용한다. 아래 SQL형 자료형은 PostgreSQL 채택 시의 후보이며 실행한 DDL이 아니다.

| 필드 | 자료형 후보·널 허용 | 의미 |
| --- | --- | --- |
| scope | text, NOT NULL | 팀 접두사/환경 범위. 서로 다른 시험 환경의 키 충돌 방지 |
| request_id | varchar(64), NOT NULL | 요청 식별자 |
| owner_id | text, NOT NULL | 서버가 확인한 시민 ID |
| input_hash | char(64), NOT NULL | 정규화 입력의 SHA-256 초안 |
| case_id,first_request_id | text, NOT NULL | 논리 문의·최초 요청 연결 |
| jira_issue_id,jira_issue_key | text, NULL 허용 | 생성 전 또는 생성 여부 불명은 null. 확인한 ID는 실패 시에도 유지 |
| processing_status | processing/completed/failed/unknown, NOT NULL | 현재 요청 처리 상태 |
| current_step | text, NOT NULL | 마지막 시작·확인 단계. 노드ID 또는 정해진 작업 코드 |
| error_code | text, NULL 허용 | failed/unknown일 때 필수인 가린 오류 코드. processing/completed에서는 null |
| response | JSON 객체, NULL 허용 | 공통 Response의 가린 최종 결과. completed일 때 필수 |
| execution_id | text, NULL 허용 | 원래 n8n 실행과의 연결 |
| revision | bigint, NOT NULL, 초기0 | 저장 레코드의 조건부 갱신·오래된 쓰기 거절용 |
| created_at,updated_at | timestamptz, NOT NULL | 서버 생성 시각,UTC |

- 기본키는 (scope,request_id),status는 허용값만,revision은0이상이다. 같은 (scope,case_id)의 processing/failed/unknown은1건만 허용한다. PostgreSQL 채택 시 기존 request_state의 조건부 고유 인덱스로 구현하는 후보이며 새 테이블은 필요하지 않다. completed가 된 보완 응답 뒤 다음 요청이 처리권을 얻는다. 조회용 보조 인덱스는 (scope,case_id),(processing_status,updated_at)를 후보로 둔다.
- input_hash는 owner_id,trim/정규화 question,context,attempt 기본값1,case_ref의 고정 순서 JSON으로 계산한다. 정규화 규칙은 R02/R04가 동일하게 적용한다. 원문·Credential·서버 생성 시각은 해시 비교 대상에 넣지 않는다.
- Jira ID는 여러 보완 요청에서 같을 수 있으므로 request_state.jira_issue_id에 고유 제약을 두지 않는다. 생성·재사용의 기준은 first_request_id/기존 Jira 연결이다.
- revision은 이 레코드의 버전이며 공개 계약의 StateRef.state_revision으로 변환한다. SupportCase.version/SaveRequest.expected_case_version이 뜻하는 같은 문의의 보완 충돌 검사와 혼동하지 않는다. case_version이 실제 제공되면 별도 비교한다. 없는 환경은 version=null로 반환하고 같은 case의 활성 요청 단독 처리권과 각 Jira 변경 직전 상태 재확인을 사용한다. 버전 지원을 확인하지 않고0을 임의 버전으로 사용하지 않는다.
- jira_issue_id는 Jira 내부 불변 ID,jira_issue_key는 실제 프로젝트 표시 키다. 둘 다 내부에 보존하고 시민 응답의 ticket_id에는 실제 key를 반환한다. 현재 프로젝트 예시는 JBYS-1이며 BIKE 같은 예시 접두사를 고정값으로 사용하지 않는다.
- 물리 테이블은 Jira와 별개인 서비스 소유 영역에 두고 n8n 내부 테이블을 직접 수정하지 않는다. 같은 DB 서버를 쓰더라도 권한·스키마/DB 경계를 분리한다.

### 3.2. 최초 처리권·재전송 판정

| 상태·조건 | 결과 | 외부 효과 |
| --- | --- | --- |
| 처음 보는 request_id | 고유키 삽입이 성공한 실행만 처리권 획득,processing | 이 실행만 LLM·Jira 진행 |
| 기존 키와 다른 owner/hash | conflict | 새 티켓·LLM 실행0,기존 응답 비공개 |
| 동일 owner/hash + completed | replay | 저장 응답 재사용,티켓 재생성0 |
| 동일 owner/hash + processing | pending | HTTP409 처리 중,재실행0 |
| 동일 owner/hash + failed/unknown | pending,request_requires_review | 자동 재실행0,DLQ·기존 효과 먼저 확인 |
| 새 request_id이나 같은 case의 활성 요청 존재 | pending,case_busy | 새 요청의 처리권 획득0,기존 요청/문의 상태 변경0 |

기존 request_id를 먼저 owner/hash로 확인해 replay/pending/conflict를 판정한다. 새 보완 요청은 최소 연결 기록으로 scope·owner·활성 처리 유무를 먼저 확인한다. 이미 처리 중인 같은 case면pending,그 외에는 Jira의 소유권·열림 상태를 확인한 뒤 처리권을 획득한다. Jira 조회 장애는 error이며 존재하지 않는 case로 단정하지 않는다. case_ref 없으면 새 case_id/first_request_id를 할당한다. 최초 처리권은 요청/활성 case 고유키 삽입의 원자적 성공으로 판정한다. PostgreSQL을 채택하면 충돌을 처리하는 단일 삽입 또는 트랜잭션을 사용한다. 조건부 갱신은 owner/hash·허용 상태·기대한 revision을 대조하고 성공 시 revision을 증가시킨다. 여러 n8n 노드가 별도 연결로 호출됐다는 이유로 하나의 트랜잭션이라고 주장하지 않는다.

replay의 저장 응답 원본은 바꾸지 않는다. B08이 반환용 복사본의 이관 ticket.duplicate만 true로 표시하는 예외는 워크플로우6.4.5가 원본이며 추가 DB/Jira 쓰기는 없다. 동일 티켓 ID·우선순위·업무 내용은 유지한다.

### 3.3. 저장 시점과 상태 전이

| 시점 | 기록·전이 | 다음 동작 |
| --- | --- | --- |
| B07 입력·사용자 통과 | 최초 processing 생성 | 기록 불가면 LLM·티켓 생성 진행 금지 |
| Jira 등 외부 효과 시작 전 | current_step·execution_id·updated_at 갱신 | 갱신 확인 후 외부 호출 |
| Jira 생성·조회 확인 | 알려진 Jira ID/key 즉시 바인딩 | 최종 응답 저장 전에도 ID 보존 |
| B32 정상 결과 저장 | 가린 response와 completed를 함께 저장 | B33 최종 응답 |
| 명확한 업무 효과 실패 | processing→failed,DLQ 연결 | 완료·담당 연결 성공을 주장하지 않음 |
| 호출 응답 유실·효과 미확인 | processing→unknown,알려진 ID 보존 | Jira 실제 효과 확인 후 재처리 |
| 운영자가 확인 후 재처리 | failed/unknown→processing,새 execution 연결 | 성공 단계는 건너뛰고 실패 단계만 |

completed는 Jira 티켓 종료 상태가 아니다. 분류·보완·이관 등 그 요청의 결과가 저장되어 재사용 가능하다는 뜻이다. 명확 실패 응답도 replay 가능하게 할지는 실패 상태의 현재는 failed/unknown을 pending으로 반환하고,외부 효과 미확인 요청을 completed로 위장하지 않는다.

failed/unknown은 같은 case의 새 요청을 의도적으로 막는 활성 상태다. 운영자가 외부 효과와 known ID를 확인하기 전에는 자동 해제하지 않는다. 시험 재실행은 runtime 계정으로 행을 삭제하지 않고,R01 또는 지정 마이그레이션 운영자가 폐기 가능한 시험 DB만 재생성한다. 운영 DB 초기화는 시험 절차에 포함하지 않는다.

오래된 processing이나 실행 기록의 삭제를 근거로 처리권을 자동 재발급하지 않는다. 원래 실행이 끝났는지와 Jira 효과를 확인한다. 재시작 시 처리 중 건은 확인 대상으로 남긴다. DB의 고유키·트랜잭션이 Jira 원격 생성을 원자적으로 보장하지는 않는다.

## 4. DLQ 설계와 재처리

### 4.1. 논리 구조

dead_letters는 **처리하지 못했거나 성공 여부가 불명확해 확인이 필요한 작업**을 저장한다. 일반 검색 결과 없음은 정상 이관 경로이며 그 자체를 장애 DLQ에 넣지 않는다.

| 필드 | 자료형 후보·규칙 | 의미 |
| --- | --- | --- |
| dlq_id | UUID 또는 동등 식별자, NOT NULL | DLQ 기본키 |
| scope,failure_key | text,NOT NULL | 팀 범위·같은 실패의 중복 기록 방지 키 |
| request_id,case_id | text,NULL 허용 | 관련 요청·문의 참조. 접수 전 예상 밖 중단은 확인 불가일 수 있음 |
| jira_issue_id,jira_issue_key | text,NULL 허용 | 확인된 외부 연결 |
| failed_step,error_code | text,NOT NULL | 실패 위치·공통 가린 코드 |
| summary | text,NOT NULL | 비밀·연락처 없는 짧은 요약. 원문 전체 제외 |
| attempts | integer,NOT NULL,0이상 | 해당 작업의 확인된 실행 시도수 |
| effects | JSON 객체,NOT NULL | 생성·맥락저장·종료·배정·알림의 confirmed/none/failed/unknown. 전체 호출 이력 아님 |
| recovery | RecoveryCapsule JSON,NOT NULL | 작업별 최소 가린 재처리 인자 또는 검증 가능한 Jira 참조. 상세 계약은6.1 |
| replay_status | pending/reprocessing/resolved,NOT NULL | 운영 재처리 상태 |
| last_execution_id | text,NULL 허용 | 마지막 관련 실행 |
| resolution | text,NULL 허용 | 확인·재처리 결과의 가린 요약 |
| revision | bigint,NOT NULL,초기0 | 동시 재처리 방지용 조건부 갱신 |
| created_at,updated_at,resolved_at | timestamptz,resolved_at만NULL 허용 | 생성·변경·해결 시각 |

동일 (scope,failure_key)는 활성 실패1건으로 관리한다. 요청이 확인되면 failure_key는 request_id/failed_step의 고정 구조 해시,요청을 모르면 원래 workflow/execution/node/error_code의 고정 구조 해시로 만든다. 예상 실패와 Error Workflow가 같은 실패를 중복 기록하면 같은 항목을 갱신한다. resolved 뒤 같은 단계가 다시 실패하면 원 항목을 재개하고 시각·사유를 갱신한다. 상세 시도 이력은 n8n 실행 기록을 참조한다. replay_status/updated_at 조회 인덱스를 후보로 둔다. 요청·소유권이 확인되지 않은 항목은 기록 조회만 하고 업무 재실행하지 않는다.

DLQ 기록은 최소 상태 저장이 실패한 경우에도 시도할 수 있어야 하므로 request_state 행이 반드시 존재해야 하는 물리 외래키로 막지 않는다. 두 저장이 같은 DB 장애로 모두 실패하면 가능한 n8n 실행 기록·운영 알림에 남기고 접수 성공을 약속하지 않는다. 별도 저장소를 추가해 모든 장애를 감추는 구조는 범위에 넣지 않는다.

### 4.2. 재처리 흐름

1. R04 또는 지정 운영 역할이 pending 항목의 처리권을 조건부 갱신으로 획득해 reprocessing으로 변경한다. R05는 확인 자료를 제공하고 운영 상태를 임의로 변경하지 않는다.
2. scope·소유자·요청 입력 일치·기존 n8n 실행 종료 여부와 실제 Jira 효과를 확인한다. 확인 권한/정보가 없으면 재실행하지 않고 pending으로 돌려 사유를 기록한다.
3. Jira 생성이 확인되면 기존 ID를 바인딩한다. 생성 여부 unknown일 때 새 key로 무조건 생성하지 않는다. Jira에서 연결 식별자로 실제 기존 건을 찾을 방법은 연동 구현 전 확인한다.
4. 효과/복구 자료 확인 뒤 운영 드라이버가 원래 failed/unknown 레코드를 processing으로 조건부 재개하고 새 execution_id/state_ref를 발급한다. 확인 전 정상 begin으로 처리권을 재발급하지 않는다. 이 운영 갱신은 R04의 DLQ 재처리 기능에 한정한다. recovery의 mode/필수 인자·권한·기대 상태를 먼저 확인한다. payload 또는 유효 Jira 참조가 없으면 manual_required로 유지하고 사용자 재문의/새 평가를 요청한다. 실행 기록ID만으로 데이터가 복원된다고 가정하지 않는다. 복원 가능한 경우만 성공한 생성·종료·배정·알림을 제외하고 실패 단계만 처리한다. 새 실행ID와 시도수를 갱신한다. recovery payload의 예전 state_ref/revision/expected_case_version을 그대로 사용하지 않고 운영 재개에서 얻은 새 StateRef와 재조회한 Jira 상태를 적용한다. 답변을 새로 작성해야 한다면 같은 단계 replay가 아니라 새 평가·검증 절차다. n8n Retry 전체 실행이 안전한지는 먼저 확인한다.
5. Jira 결과와 최소 상태/응답 저장을 확인한 뒤 resolved·resolution·resolved_at을 기록한다. 미확인 또는 실패가 남으면 pending으로 되돌린다.

자동 재처리 엔진·메시지 브로커는 현재 범위에 추가하지 않는다. 재처리 명령·n8n 하위 흐름 호출 방식은 R04가 정하고 R02/R05와 실제 효과를 확인한다. 삭제나 단순 알림 수락을 해결 완료로 보지 않는다.

### 4.3. 재처리 자료의 최소 보존

- 생성 실패는 검증된 TicketRequest의 가린 title/category/priority/owner/case/최초 요청/context/answer/sources/action을 payload로 보관한다. Jira에 아직 없는 데이터를 원문 질문 대신 이 실패 캡슐로만 보존한다. 정상 성공 건의 전체 이력은 추가 저장하지 않는다.
- 이미 Jira에 저장된 안내·맥락은 jira_ref로 복원할 수 있다. 다만 읽을 필드·owner·case와 필요한 값이 실제 존재하는지 재처리 시 확인한다. H05 신규 생성에는 가린 문맥·답변/근거를 함께 저장해 복원 가능성을 높인다. 업데이트 실패로 아직 Jira에 없는 내용은 해당 실패의 가린 payload가 필요하다.
- bind 실패는 known Jira ID/key와 StateCommand.bind의 최소 인자를,finish 실패는 가린 Response·최신 참조·필요한 Jira 변경값을 보관한다. Jira 전체 이력·전체 대화를 복제하지 않는다.
- 예상 밖 중단으로 payload가 없거나 n8n 기록밖에 참조가 없으면 manual_required다. 외부 효과 확인은 할 수 있지만 같은 작업의 자동 replay를 약속하지 않는다. 요약에서 LLM이 원래 답변/파라미터를 추측해 복구하지 않는다.
- 미해결 DLQ의 payload/유효 Jira 참조는 해결될 때까지 함께 유지한다. n8n 실행 기록은 정리 가능하며 유일한 복구 원본으로 삼지 않는다. 보존 기준을 만족하지 못하면 replay 가능 표시를 제거한다.

## 5. n8n 실행 기록·메타 로그

n8n 자체 실행 저장소를 사용한다. 개발 중 필요한 성공·실패·수동 실행을 남기되,실제 저장 설정·볼륨·보존 기간·자동 정리는 환경 확인 후 결정한다. 현재 기본값이나 라이선스별 기능을 팀 환경에 그대로 가정하지 않는다.

| 구분 | 기록·사용 방법 |
| --- | --- |
| Executions | workflow/execution ID,실행 노드·시간·실패 지점·원시 외부 결과를 제한된 개발/운영 계정이 확인 |
| 메타 로그 | request_id,불투명 사용자ID,route/reason,문서ID/점수,시도수·시간·masked. 가이드의 POST /logs 계약을 유지하고 별도 상세 로그 테이블은 만들지 않음 |
| 결과서 증거 | 가린 runs/보고서·선별 캡처를 보존. 실행 기록 자동 정리로 제출 근거가 없어지지 않도록 분리 |

n8n 원시 노드 입출력에는 사용자 입력·외부 응답이 포함될 수 있다. Code에서 최종 답변을 가렸다고 이전 노드의 저장 데이터까지 가려지는 것은 아니다. 저장 범위·접근·실행 데이터 가림 기능의 사용 가능 여부를 확인하고 공개 캡처는 따로 가린다. 실제 시민 정보·업무 계정·Credential 원문을 시험 데이터/로그에 넣지 않는다.

예상 실패가 정상 출력으로 정규화되면 n8n 실행은 성공으로 끝날 수 있다. 실패 실행만 저장하도록 설정할 때 이런 사건이 사라지지 않게 request_state·DLQ·메타 로그와 execution_id로 확인한다. 실행 기록은 중복 처리권이나 티켓 업무 상태의 원본으로 사용하지 않는다.

## 6. 워크플로우 연결과 역할 경계

공개 Request/Response·TicketResult·SaveRequest 등은 [워크플로우 설계서 6절](WORKFLOW-DESIGN.md#6-노드-간-페이로드-연결선마다)이 원본이다. 여기서는 StateRef·저장 명령/응답·RecoveryCapsule의 공개 계약과 저장 동작을 소유한다. Request/Response·업무 티켓 객체를 복제 편집하지 않는다. 고정 저장 경계는 dubakwi-state(begin/save/prepare/bind/finish/fail),DLQ 경계는 dubakwi-dlq(put/claim/resolve) 하위 기능으로 구현하며 별도 HTTP API 서버 신설을 강제하지 않는다. 드라이버별 내부 노드는 R04가 상세화한다.

| 위치 | 저장 기능 | 생산·소비 계약 |
| --- | --- | --- |
| B07/B08 | 최초 처리권 획득·기존 결과 확인,보완의 Jira 문맥 읽기 | mode=proceed/replay/conflict/pending/error. proceed는 논리 SupportCase/CaseFacts,replay는 가린 Response |
| H14/H15→H05 | prepare 후 저장 성공 확인 | 저장 실패이면 외부 생성0 |
| H06/H16→H17/H18→H07 | 알려진 Jira ID bind와 다음 H08/H09/B32 준비 | bind 실패는 다음 Jira 변경0,known ID·복구 캡슐 보존 |
| H19/H20→H11 | 알림 의도 prepare 확인 | 저장 실패이면 알림0,배정 성공 효과 보존 |
| H08/H09 | Jira 답변·맥락·보완·종료/담당 갱신 | Jira가 정보 원본. request_state에 CaseFacts 사본 저장 안 함 |
| B31→B37/B38/B39→B32/B33 | 최종 변경 의도 prepare→Jira 문맥 확인→finish | 준비 저장 실패면 후속 Jira 변경0,새 state_ref를 SaveRequest에 반영 |
| X01→X06→X07→X02 | claimed 요청을 fail로 failed/unknown 갱신 | 저장 실패도 DLQ/알림 계속,다른 owner·completed 덮기0 |
| E02→E05→E03 | 원 실행의 요청 상태 확인·기록 | 원 execution의 소유 요청을 확인 못하면 skipped |
| X03/E04 | 실패·미확인 DLQ 삽입/갱신 | RecoveryCapsule·가린 ErrorCtx·known ID·Effect 보존 |
| B35/E 실행 | 메타 로그·n8n 실행ID 연결 | 가이드 로그 계약·개인정보 가림 유지 |

물리 PostgreSQL 채택 시 R04는 SQL/저장 기능을 준비하고 R02는 본체에 연결한다. 기존 HTTP Request 노드는 논리 호출 위치를 나타내므로 실제로는 Postgres 노드·하위 워크플로우·HTTP 어댑터 중 선택해 명세를 갱신한다. 확인되지 않은 endpoint나 트랜잭션 경계를 구현 완료로 표시하지 않는다.

현재 준비본은 parameterized JSON 1개만 받는 `dubakwi_service.state_apply`와 `dubakwi_service.dlq_apply` 함수로 상태 명령과 DLQ 갱신을 원자적으로 수행한다. 신규 요청의 begin은 DB에서 처리할 수 있지만,기존 case_ref의 소유자·열림 상태는 Jira가 원본이므로 Jira 확인 전에는 `case_verification_required`로 중단한다. 이 중단을 정상 처리나 저장 완료로 집계하지 않는다. save는 dubakwi-state의 S07~S11이 Jira 이슈(ticket_id)를 조회해 key와 문의 label(dubakwi-<first_request_id>)이 일치할 때만 같은 워크플로우에서 finish로 저장하고 ok:true를 반환한다. 조회 실패·불일치·expected_case_version 제공(버전 확인 미지원)은 SQL 호출 없이 ok:false(tickets_down/state_error)와 finish 복구 정보로 끝난다. DB의 save 분기는 계속 fail-closed 방어선으로 남긴다. case_ref는 005~006 적용 뒤 dubakwi-state의 S12~S20이 case_lookup(읽기 전용) → Jira 열림·기존 보완 횟수 확인 → case_begin 순으로 처리한다. 알 수 없는 case 400 invalid_case_ref, 타인 403 case_access_denied(내용 없음), 종료 409 case_closed, 같은 case 진행 중 409 case_busy이며 Jira 조회 장애는 case 없음/종료로 단정하지 않고 503 error다. 005~006 적용 전에는 기존대로 case_verification_required로 멈춘다.

공통 data-api 시험 모드와 Jira 실연동 모드는 티켓·상태·DLQ의 물리 저장을 어댑터로 구분한다. 공통 시험의 DLQ1건 판정과 실제 경로의 보존 여부를 각각 확인한다. 무조건 두 저장소에 이중 기록해 건수·소유권·원본을 혼동하지 않는다. 모의 시험 통과가 실제 Jira 종료·DB 복구의 증거는 아니다.

<a id="storage-contract"></a>
### 6.1. 저장 경계의 공개 계약

이 절의 JSON 필드명과 enum은 R02/R04 공통 작업 기준이다. scope는 R01이 정한 환경 설정에서,owner_id/actor는 서버 조회에서,execution_id는 최초 본체 실행에서 생성한다. 시민 입력으로 이 값을 덮지 않는다. 하위 실행에서도 최초 execution_id를 보존한다. 실제 SQL/드라이버가 달라도 이 응답을 정규화한다. state 하위 기능은 BeginRequest(op=begin),SaveRequest(op=save),StateCommand의 고정 판별 필드만 받는다. save는 준비된 의도 확인→Jira 문맥 변경→finish의 고정 조합이며 임의 외부 작업을 실행하는 엔진이 아니다.

| 이름 | 고정 필드·자료형 | 필수 규칙 |
| --- | --- | --- |
| StateRef | scope:string,request_id:string,owner_id:string,input_hash:string,execution_id:string,state_revision:int>=0 | 최초 처리권을 얻은 후에만 발급. 갱신의 기대 버전은 이 state_revision. 현재 값은 성공 응답에서만 교체 |
| BeginRequest | op:begin,scope:string,execution_id:string,actor:Actor,request:Request,input_hash:string | 정규화 Request와 검증된 actor,case_ref와 attempt 포함. 해시 규칙은3.1 |
| BeginResult | request_id:string,mode:proceed/replay/pending/conflict/error,state_ref:StateRef／null,support:SupportCase／null,facts:CaseFacts／null,response:Response/InputError／null,http_status:int,error_code:string／null | 모든 필드 존재. proceed만 새 state_ref·support·facts 필수. replay는 response 필수. pending/conflict는state_ref=null·response=InputError. error는 처리권을 얻었다면 state_ref 유지 |
| StateCommand | op:prepare/bind/finish/fail,state_ref:StateRef／null,args:object | 고정 op와 허용 args만,임의 URL·코드·외부 작업 실행0. scope/owner/hash·원 실행·상태·버전 검증 |
| StateResult | request_id:string／null,ok:boolean,skipped:boolean,state_ref:StateRef／null,error_code:string／null | ok=true인 실제 갱신은 새 state_ref 필수·error_code=null. 실패는ok=false와가린코드. skipped는 fail의 처리권 없음/완료 건 보존에만 허용,prepare/bind/finish는 처리권 없음·충돌에ok=false. 요청 상태를 임의 변경하지 않음 |
| DlqWriteRequest | op:put,scope:string,request_id:string／null,case_id:string／null,failed_step:string,error_code:string,effects:object,recovery:RecoveryCapsule | 그 외4.1의 known ID/요약/시도/원 실행 포함. failure_key는 R04 서버가4.1 규칙으로 생성 |
| DlqResult | ok:boolean,dlq_id:string／null,deduplicated:boolean,error_code:string／null | 실제 보관/기존 항목 갱신 확인만ok=true. 실패해도 호출자는 알림·최종 오류 응답으로 진행 |
| SaveResult | request_id:string,ok:boolean,state_ref:StateRef／null,error_code:string／null,recovery:RecoveryCapsule | Jira 문맥 확인과 finish 저장이 모두 확인돼야ok=true. 둘 중 실패면후속응답은저장미확인·known ID 보존 |
| RecoveryCapsule | version:1,mode:payload/jira_ref/manual_required,action:create/bind/context_update/close/assign/alert/finish/inspect_only,args:object／null,reference:object／null,reason:string／null | 실패 작업만. payload는허용가린인자,jira_ref는Jira ID/case/owner와읽을필드,manual_required는추정실행0 |

| 명령 | args와 후조건 | 실패·미확인 |
| --- | --- | --- |
| prepare | current_step:string. processing의 단계·execution을 기록하고 revision 증가 | 실패하면 다음 Jira/알림 변경0 |
| bind | jira_issue_id,key,case_id,first_request_id,next_step:string. ID와다음단계 의도를 같은 저장에서 보존 | state_saved=false,error_code=state_error,known ID 유지·추가 Jira 변경0 |
| finish | response:Response,current_step=respond. 기존 Jira 연결 확인 후 completed/응답을 함께 저장 | 실패하면 Response가 있어도 정상 저장 완료로 답하지 않음 |
| fail | status:failed/unknown,current_step,error_code. 알려진 Jira ID는 보존 | 처리권이 없거나 이미 completed면skipped. 모르는 revision으로 강제 덮기0 |

E05의 fail은 state_ref가 없을 수 있다. 이때 서버 scope와 원 execution_id로 소유 레코드를 확인해 현재 revision을 얻는 운영 경로만 허용한다. 시민이 보낸 execution_id로 조회·수정하지 않는다. 외부 성공 여부가 불명이면 unknown이며,실패를 확인한 경우만 failed다.

Begin의 pending은 request_in_progress/case_busy/request_requires_review 중 이유를 보존해 HTTP409로 반환한다. conflict는 request_conflict409,invalid_case_ref400,case_access_denied403,case_closed409를 구분하며 지원 문맥을 노출하지 않는다. B08/B09는 이 상태를 일반 장애로 바꾸거나 상태 쓰기를 실행하지 않는다. 물리 오류나 잘못된 봉투는 mode=error다.

SupportCase.version은 실제 Jira 문의 버전을 확인했을 때 그 값,지원하지 않으면 null이다. SaveRequest.expected_case_version은 이에만 대응한다. 자동화 요청 사이 경합은3.1의 같은 case 활성 요청 단독 처리권으로 막는다. 담당자가 Jira에서 직접 바꾼 상태까지 로컬 revision이 보장하지 않으므로 Jira 변경 직전 owner·열림 상태·허용 전이를 다시 확인한다. 외부 전환 충돌은 덮어쓰지 않고 실패/재확인으로 남긴다.

보완 횟수는 Jira가 원본이다. BeginResult는 기존 저장 횟수를 읽어 반환하고, B08의 이번 유효 횟수 계산·TicketRequest.attempt/SaveRequest.attempt 계약은 워크플로우6.4.5를 따른다. R04는 전달한 횟수를 Jira에 동일 값으로 기록하며 저장 단계/복구마다 추가 증가하지 않는다. create/finish/context_update 복구 캡슐에도 해당 횟수를 보존한다. 요청 input_hash는 수신 Request 기준으로 유지하며 계산된 support.attempt 때문에 재전송 해시가 달라지지 않게 한다. request_state에 별도 전체 문맥/횟수 원장을 추가하지 않는다.

가상 begin 성공 예시(실제 실행 전):

```json
{"request_id":"req-01","mode":"proceed","state_ref":{"scope":"dubakwi-demo","request_id":"req-01","owner_id":"citizen-a","input_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","execution_id":"exec-01","state_revision":0},"support":{"case_id":"case-01","owner_id":"citizen-a","ticket_id":null,"first_request_id":"req-01","attempt":1,"version":null,"status":"received"},"facts":{"summary":"QR 대여 문의","reported":[],"confirmed":[],"attempted_actions":[],"missing":[],"uncertainties":[],"evidence_refs":[]},"response":null,"http_status":200,"error_code":null}
```

가상 bind 성공: prepare가 revision0→1을 반환한 후그1을 기대값으로 사용,bind는2를 반환한다.

```json
{"op":"bind","state_ref":{"scope":"dubakwi-demo","request_id":"req-01","owner_id":"citizen-a","input_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","execution_id":"exec-01","state_revision":1},"args":{"jira_issue_id":"10001","jira_issue_key":"JBYS-1","case_id":"case-01","first_request_id":"req-01","next_step":"H08"}}
```

```json
{"request_id":"req-01","ok":true,"skipped":false,"state_ref":{"scope":"dubakwi-demo","request_id":"req-01","owner_id":"citizen-a","input_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","execution_id":"exec-01","state_revision":2},"error_code":null}
```

가상 DLQ 복구 캡슐. 실제 Jira 연결·권한·최신 상태 확인 없이는 replay하지 않는다.

```json
{"version":1,"mode":"jira_ref","action":"close","args":null,"reference":{"jira_issue_id":"10001","jira_issue_key":"JBYS-1","case_id":"case-01","owner_id":"citizen-a","read_fields":["masked_answer","sources","target_close_status"]},"reason":"종료 전환 실패,필수값은 생성 시 Jira에 저장됨"}
```

RecoveryCapsule의 payload는 action별 허용 필드만 사용한다. create는 가린 TicketRequest,bind는Jira ID/key와원요청참조,next_step,finish는가린 SaveRequest/Response,close/context_update/assign/alert는대상과검증된가린변경값이다. n8n execution_id만 있는 reference는jira_ref가 아니며manual_required다. 비밀·임의 endpoint·임의 코드·전체 대화는허용하지않는다.

## 7. 보존·복구·권한

- request_state의 processing/failed/unknown과 DLQ의 pending/reprocessing은 자동 삭제하지 않는다. 재요청 기간·수동 확인 기간을 정하지 않은 상태에서 TTL로 지우지 않는다.
- completed 상태·가린 응답의 보존 기간은 중복 보장 기간과 함께 정한다. 이를 삭제하면 해당 요청ID의 중복 보장도 끝나므로,영구 중복방지로 설명하지 않는다.
- resolved DLQ·실행 기록·결과서 증거는 각각 보존 목적이 다르다. 일괄 무제한 보관하지 않고 실제 기간·접근 역할·삭제 방법을 R01/R04가 확정해 기록한다.
- PostgreSQL 채택 시 데이터 디렉터리는 영속 볼륨으로 관리하고 최소 상태/DLQ를 백업·복원 확인한다. DB 백업에 Jira 티켓·n8n Credential이 포함된다고 가정하지 않는다. n8n 자체 DB·암호화키·설정·Jira는 각 시스템의 별도 복구 범위다.
- 재시작 후 오래된 processing/reprocessing은 수동 확인 대상으로 조회한다. 외부 효과를 확인하지 않고 모두 재실행하거나 completed로 바꾸지 않는다.
- DB 접속 정보는 n8n Credential/환경 비밀로 관리한다. n8n 연결 계정은 해당 서비스 저장 영역에 필요한 권한만 부여한다. SQL은 파라미터로 전달한다. 시민이 DB/DLQ에 직접 접근하지 않는다.

## 8. 구현 전 남은 확인

| 항목 | 결정/확인 내용 | 담당·연결 |
| --- | --- | --- |
| 물리 저장 채택 | PostgreSQL 2테이블 안 또는 동등한 원자성·영속성을 제공하는 기존 기능. VM 자원·배포·접속 확인 | R04/R01,D01 |
| Jira 매핑 | owner/case/first_request/보완 횟수/문맥 필드,생성 미확인 건 조회,상태 전환·동시 보완 처리 | R04/R02,D01/D06 |
| 저장 호출 | 실제 노드 종류·typeVersion·SQL/필드·공통 명령 매핑. 공개 봉투와 버전 의미는6.1을 유지 | R04/R02,D03 |
| 중단·복구 | 생성 응답 유실·저장 장애·중복·재시작·재처리의 실제 효과,처리권 확인 방법 | R04/R05,D05 |
| 운영 설정 | 보존 기간·삭제·백업·복원·n8n 실행 저장/가림 설정과 역할 | R01/R04,D01/D03 |

이 표는 설계의 미확인 경계다. 세부 작업·기한·진행 상태는 개발 계획에서 관리하고 실행 증거는 cases/runs/실행 결과서에 둔다. 본 문서에 별도 종합 테스트 계획을 추가하지 않는다.

참고: [과정 서비스 환경 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md),[운영·오류 처리 가이드 — 공개본 제외 자료](../../docs/PUBLIC-SOURCES.md),[n8n Postgres 공식 문서](https://github.com/n8n-io/n8n-docs/blob/main/docs/integrations/builtin/app-nodes/n8n-nodes-base.postgres/README.md),[n8n 실행 기록 관리](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/manage-execution-data),[PostgreSQL 제약](https://www.postgresql.org/docs/current/ddl-constraints.html). 실제 버전·배포에서 기능을 확인해야 한다.
