# J01~J03 병렬 작업 공통 기준 v1.1

- 결정일: 2026-11-06 KST / R01 / 사용자 지시의 공통 결정·실행 분담
- 목표: 실제 접수 조회(J01), 이관 후 후속 요청(J02), 기존 사실 복원(J03)을 서로의 구현 완료를 기다리지 않고 개발·검사한다.
- 현재 상태: **작업 기준·예제 작성 및 로컬 반례 검증. 구현·VM 배포·공동 검토 완료를 뜻하지 않는다.**
- 기준: [64개 대조표](design-implementation-mapping.md), [Jira 상세 대조](jira-lifecycle-review.md), 기존 [업무 계약](../docs/project/WORKFLOW-DESIGN.md)·[저장 계약](../docs/project/STORAGE-DESIGN.md).
- 판정·예제: [기계 판독 예제](contracts/parallel-contract-v1.examples.json). 실제 ID·계정·키가 없는 모의 자료이며 기존 R05 cases/run_cases.py의 자동 실행 형식을 대체하지 않는다.

## 1. 먼저 고정하는 경계

1. 시민 Request/Response, LookupResult, TicketRequest/TicketResult, SaveRequest/SaveResult의 최상위 필드·성공 의미는 유지한다. TicketRequest.action은 close/wait/handoff만 사용한다. context_update 같은 새 시민 action을 만들지 않는다.
2. 내부 BeginResult.support에 선택 필드 `assignee_role`과 `priority`를 보완한다. 각각 support/security/null, normal/high/null이다. 추가 필드를 무시해도 JSON 파싱이 된다는 사실은 동작 호환을 뜻하지 않는다. **handed_off 복원 결과에서는 두 값이 검증된 값으로 제공돼야 하고 소비자도 이를 유지해야 한다.** 세부 변경은 3절을 따른다.
3. 담당자 연결 성공은 Jira 생성/재사용·문맥 저장·배정·알림 수락과 save/finish까지 확인한 상태다. 실제 담당자 열람·업무 해결·메일함 도착을 의미하지 않는다.
4. 정상 안내 종료는 실제 대여/반납/환불 해결이 아니다. 직원이 Jira에서 닫은 현재 상태와 챗봇의 안내 종료 의미를 구분한다.
5. 같은 case의 추가 진술은 같은 Jira에 연결한다. 조회 대상과 이번 조회 문의 티켓은 별개다. 오류·부재·타인·준비 안 됨을 같은 성공값으로 만들지 않는다.
6. 모의 자료는 의존 기능이 없어도 개발할 수 있게 하는 도구다. 로컬 통과를 VM·Jira·DB·공식 시험 통과로 기록하지 않는다.

이 기준에서 정하지 않은 내부 함수·노드 구현·라이브러리는 담당자가 결정한다. 공개 필드·권한·상태 의미·시간 예산이 바뀌면 계약 버전을 올리고 영향 역할·R05가 변경분을 확인한다. 매 노드 구현이나 모의 시험마다 재승인을 요구하지 않는다. 영향 검토는 기존 AGENTS에 따라 PR에서 한 번에 취합하며 회신을 받았다고 임의 기록하지 않는다.

## 2. 상태와 후속 요청의 확정 규칙

요청 처리 상태(processing/completed/failed/unknown), 논리 문의 상태, Jira의 실제 status, DLQ 상태를 서로 대체하지 않는다. Jira에서 `해야 할 일`이라는 이유만으로 waiting_info/handed_off를 구분하지 않는다. 논리 문의 상태는 검증된 Jira 문의 문맥에서 복원한다.

| 기존 상태·조건 | 새 요청 처리 | 반드시 유지/확인할 것 | 금지 |
| --- | --- | --- | --- |
| 새 문의(case_ref 없음) | 기존 신규 분류 흐름 | 새 case·새 first_request, 서버 actor | 의미 유사성만으로 기존 건 자동 합치기 |
| waiting_info, 본인·열림 | 기존 facts 복원 후 추가 진술 병합·분류 | 같은 case/key/first_request, 보완 횟수 | 빈 facts 초기화·기존 값 반복 질문 |
| handed_off, 본인·열림 | 담당자 후속 정보로 처리. triage는 추가 사실 추출에만 활용 | 같은 티켓·handed_off·최초 역할·기존 우선순위, 새 문맥 저장 | missing 때문에 ask/wait로 회귀·자동 재배정·재알림 |
| handed_off 후속에서 새 위험·역할 변경 필요 | 기존 결과를 지우지 않고 확인 필요 경로로 보존 | 새 위험 진술을 가린 문맥에 남기고 초동 안내/운영 확인 | 기존 담당 자동 교체·알림 반복, 위험 해결 약속 |
| Jira done | 기존 case 후속은409 case_closed | 새로운 독립 문의는 case_ref 없이 접수 | 기존 완료 건 자동 재개·다시 닫기 |
| 타인 case |403 case_access_denied | 지원 문맥·티켓·연락처 비노출 | 요청 actor 주장으로 소유권 변경 |
| 존재하지 않는 case_ref |400 invalid_case_ref | 일반 lookup의 부재와 경로 구분 | 임의 신규 case로 바꿔 처리 |
| 같은 case에 processing/failed/unknown 존재 |409 case_busy, 기존 요청 확인 안내 | 기존 known ID·잠금/처리권 | 우회용 새 request_id로 같은case 재실행 |
| 같은 request_id completed | 기존 응답 replay | request/owner/hash 대조·duplicate 의미 | 새 LLM·Jira·배정·알림 |
| 같은 request_id failed/unknown |409 request_requires_review | 실패·DLQ·복구 자료 | 시민 재전송으로 자동 재개 |
| 같은 request_id에 다른 입력/사용자 |409 request_conflict | 이전 응답 비노출 | 기존 건 덮기 |

보완 횟수는 기존 v1 규칙을 구체화한다. 신규는 `max(1, request.attempt ?? 1)`, waiting_info 후속은 `max(request.attempt ?? 1, stored_attempt + 1)`이다. handed_off의 단순 후속 정보 접수는 기존 stored_attempt를 유지한다. save·복구·재전송은 추가 증가하지 않는다. 사용자 입력의 attempt를 신뢰된 Jira 원본 대신 저장 원장으로 사용하지 않는다.

위 표는 조건 목록이며 실행 우선순위가 아니다. 인증·서버 actor 확인 후 같은 request_id의 owner/입력 hash 충돌을 먼저 검사한다. 일치하는 기존 요청은 completed replay, failed/unknown 차단, processing 대기를 처리한 뒤 종료한다. **그다음 새 request_id의 case_ref에 대해 본인 여부·처리권·Jira 종료를 검사한다.** 완료 요청의 재전송은 Jira가 닫혔어도 replay이며, 타인이 같은 ID를 보내면 이전 응답 없이 request_conflict다. 소유권 확인 전 facts를 반환하지 않는다.

**다른 장애·새로운 민원을 기존 case에 섞는 기능, 자동 우선순위/담당자 재조정은 이번 J01~J03에 추가하지 않는다.** 신규 사건은 별도 새 문의로 구분하는 기존 정책을 따른다. 모호한 위험을 LLM이 임의로 낮추거나 해결했다고 말하지 않는다.

## 3. R04 생산 → R02 소비: BeginResult/SupportCase

최상위 BeginResult는 기존 request_id/mode/state_ref/support/facts/response/http_status/error_code를 유지한다.

| support 필드 | 기준 |
| --- | --- |
| case_id/owner_id/first_request_id | 최초 문의의 검증된 값. 새 후속 request_id로 바꾸지 않음 |
| ticket_id | 기존 Jira key. 본인·문의 연결 검증 후 반환 |
| status | received/waiting_info/handed_off/closed_guidance/closed_rejected/needs_review. 기존 요청 처리 후 새 후속의 현재 Jira가 done이면 case_closed |
| attempt | 실제 Jira의 저장값. R02가2절에 따라 이번 유효 값을 계산 |
| version | 검증된 Jira 문의 버전 또는null. StateRef.state_revision과 혼용하지 않음 |
| assignee_role (선택 보완) | 신규/보완은null 허용, handed_off는 최초 이관 support/security 필수 |
| priority (선택 보완) | 신규/보완은null 허용, handed_off는 저장된 normal/high 필수 |

R04는 열림 여부·보완 횟수만 넘기고 나머지를 빈 값으로 복원하지 않는다. handed_off인데 역할/우선순위/문맥을 검증하지 못하면 received/waiting_info로 추정하지 않고 기존 state_error/확인 필요 경로를 사용한다. R02는 이 경우 새 배정·종료를 하지 않는다.

이 두 내부 선택 필드는 기존 시민 Request/Response에 노출하지 않는다. 원본 WORKFLOW/STORAGE 계약 문서 갱신은 각각 R02/R04가 맡는다. 예제에 추가됐다는 이유로 현재 VM도 생산한다고 가정하지 않는다.

### CaseFacts 병합

기존 필드 summary/reported/confirmed/attempted_actions/missing/uncertainties/evidence_refs와 Fact={key,value,origin,reference?}를 유지한다.

- 기존 값은 Jira의 검증된 가린 문맥에서 복원한다. 전체 상담 원문을 새 DB에 복제하지 않는다.
- 새 사용자 진술은 reported에 병합한다. 같은 key·같은 value는 중복을 만들지 않는다. 같은 key의 값이 바뀌면 최신 명시 진술을 사용하고 불일치/재확인 필요는 uncertainties에 남긴다. 과거 가린 문맥은 Jira에 보존한다.
- confirmed는 허용 API/문서로 확인된 사실만 유지·추가한다. 사용자 주장이나 LLM의 출력만으로 승격하지 않는다.
- attempted_actions/uncertainties는 중복을 제거한다. 새 입력에 없다는 이유로 기존 사실을 지우지 않는다.
- missing은 복원·병합된 사실에 근거해 다시 계산한다. 필수 사실의 값이 상충해 재확인이 필요하면 key가 있다는 이유만으로 missing에서 제거하지 않는다. 확인된 이전 사실은 사용자 진술로 덮지 않고 상충 진술과 불확실성을 함께 보존한다. handed_off에서 missing은 담당자 참고 정보이며 보완 질문 회귀 조건이 아니다.
- 근거는 허용된 Source/Evidence만 사용한다. 기존 reference를 새 검색 성공처럼 표시하지 않는다. 요약·티켓·알림·로그 가림은 기존 규칙을 따른다.

저장 위치·파싱·SQL 내부 인자는 R04가 결정한다. 이미 서비스에 적용된005/006은 덮어쓰지 않고 필요하면 **새 순번 마이그레이션**으로 변경한다. R02는 SQL 내부 필드 대신 위 BeginResult만 소비한다.

단, Jira 문맥을 R01 조회 provider와 R04 복원기가 모두 읽으므로 그 저장 형식은 R04만 사용하는 내부 사항으로 볼 수 없다. 개발 입력은 같은 검증된 support/facts 예제로 고정한다. **실제 연결 전에 R01·R04가 문맥의 버전·검증된 작성 주체·최신본 선택·case/owner/first_request 연결·가림 규칙과 동일 원본 fixture를 한 번 인계한다.** 이 읽기/쓰기 접점은 아직 미확정이며 J01/J03 실연동의 blocked_dependency다. 모의 개발은 가능하지만 저장 위치나 정규식을 각자 추정해 배포하지 않는다. 추가 상담 이력 DB를 도입하는 결정은 아니다.

## 4. R01 생산 → R04/R02 소비: 실제 조회 경계

기존 내부 API `GET /records/<Jira-key>?requester=<registered-user-id>`와 내부키 인증을 유지한다. scope·Jira 주소·DB/Jira Credential은 서버의 비공개 설정으로 결정하고 시민이 주입하지 못한다.

| 조건 | 내부 records API | handoff LookupResult | 시민 노출 |
| --- | --- | --- | --- |
| 본인·실제 문의 연결·현재 상태 읽기 성공 |200, 기존 ticket_id/case_id/owner_id/status/summary/contact 형태 |status=ok, record 및 observed_at | 확인한 현재 상태·가린 연락처만 |
| 타인 |403, 내용 없음 |status=denied, record=null, masked=0 | 부재와 같은 안내, 존재 여부 구분0 |
| 존재하지 않는 건 |404, 내용 없음 |status=denied, record=null, masked=0 | 타인과 같은 안내 |
| Jira/소유권 원본 읽기 장애·불완전 연결 |503 또는 현재 내부 오류 봉투 |status=error, record=null, lookup_error | 조회 실패 안내. 부재·타인·완료로 해석0 |
| enabled=false |records API 호출0 |status=skipped, record=null | 상태 조회 성공 주장0 |

본인 여부는 등록 사용자와 서버가 보관한 Jira/state 연결에 근거한다. Jira reporter가 서비스 계정이라는 이유로 모든 시민 소유로 보지 않는다. **실제 Jira 티켓·상태를 records.json에 계속 복제하는 방식은 채택하지 않는다.** 모의 파일은 모의 시험 전용으로 남긴다. 세부 읽기 provider·인증 주입은 R01 구현 범위이며 읽기 전용을 우선하고 실제 부여 권한을 기록한다.

contact는 등록 사용자 공급원의 허용 자료를 가려 반환한다. `phone`, `email` 키가 있으면 값은 이미 가려진 문자열이어야 한다. 없는 연락처를 만들어 넣거나 실제 원문을 반사하지 않는다. HAND H22는 이를 masked_phone/masked_email과 masked 수로 정규화한다.

논리 상태가 있으면 기존 enum을 사용한다. **직원이 Jira에서 닫아 statusCategory=done인데 안내 종료/거절 종료를 확인할 근거가 없으면 조회용 status=closed**로 정규화하고 R02는 ‘처리 종료’로 표시한다. 이는 LookupResult.record.status의 기존 string을 구체화하는 값이며 SupportCase enum에 closed를 추가하는 결정은 아니다. 직원 처리 완료를 안내 종료·환불 해결로 추정하지 않는다. 종료case의 후속 begin은2절의409 규칙이다.

조회 대상은 읽기만 한다. 이번 조회 문의의 Jira 생성·안내 종료는 기존 본체 경로가 처리하며 대상 이슈를 닫거나 상태를 바꾸지 않는다.

## 5. 이관 후 저장·효과 계약

| 작업 | 새 이관 | 이미 handed_off인 같은case의 새 후속 |
| --- | --- | --- |
| 생성/재사용 | 필요한 경우 생성 후 bind | 기존 Jira 재사용, 새 생성0 |
| 문맥 | 가린 사실·담당/우선순위·이관 의미 저장 | 기존 사실 복원·병합 후 새 문맥 저장 |
| 배정 | 검증된 역할 계정으로 지정 | 기존 담당 유지, 배정 PUT0 |
| 알림 | 사전 의도 저장 후 알림 수락·표식 확인 | 재알림0. 기존 확인된 표식/효과를 읽어 사용 |
| Jira 종료 | 하지 않음 | 하지 않음 |
| 요청 저장 | 문맥/배정/알림 확인 후 save 내부finish | 새 문맥 저장과 기존 이관 효과 확인 후 save 내부finish |

TicketRequest.action은 후속에서도 handoff를 사용한다. R04가 기존 이관 상태/담당/표식을 확인해 문맥 저장만 수행하는 내부 분기를 제공한다. `created_or_reused/context_saved/assigned/alert=confirmed`는 새 외부 호출 횟수와 별개다. 이미 존재하는 배정/알림을 실제 확인해 재사용한 경우 confirmed를 반환할 수 있으며, 확인 없이 true로 만들지 않는다.

기존 담당·표식이 수동 변경됐거나 알림 결과가 불명확하면 자동으로 덮거나 다시 알리지 않는다. partial_effect/확인 필요·known ID·recovery를 보존하고 성공으로 저장하지 않는다. save만 호출하면 Jira 문맥 확인 후 finish까지 수행하며 support가 별도 finish를 다시 호출하지 않는다. DLQ 기록은 X03이 한 번만 담당한다.

효과 횟수는 목적별로 센다. ‘배정 PUT0’은 assignee를 바꾸는 호출0이며 허용된 문맥 저장 PUT까지 금지하는 뜻이 아니다. 표식 조회만으로 이번 요청의 문맥 저장 성공을 주장하지 않는다. 새 위험의 별도 운영 확인 응답·상태 계약은 아직 미합의이므로 해당 예외를 정상 후속 성공으로 집계하지 않고 별도 미검증으로 남긴다. 자동 재배정·재알림은 계속 금지한다.

## 6. 편집 분담과 한 번의 인계

이 표는 사용자 지시에 따른 **J01~J03에 한정된 임시 대리 편집 인계 기록**이다. 파일 소유권 원본은 헌장을 유지한다. 아래 경로를 동시에 수정하지 않으며 실제 착수/종료 버전을 PR36에 기록한다.

| 역할 | 이번에 독립 진행할 범위 | 수정하지 않을 범위 | 개발 입력 / 인계 출력 |
| --- | --- | --- | --- |
| R01 | J01 실제조회 API records 분기와 전용 provider·배포/비공개 환경. 원소유 R04의 records 경계에 대한 대리 구현으로 기록 | employees 등록/권한 정책, support/handoff/state 업무 노드 | 예제의 본인/타인/부재/장애 → 실제 조회 provider·계약 검사·환경/원복 |
| R02 | J02 support B08/B11/B24/B25/B31 주변 후속 분기, SupportCase 소비·closed 표시·문서/회귀 | SQL/state/handoff/records provider | 고정 BeginResult/LookupResult 예제 → support 패치·무효과/저장 명령 기대값 |
| R03 | 지식/manifest/index/search·독립 색인/검색 검사·문서 | Jira/state·본체 후속 분기 | 기존 SearchRequest/Result → 버전/청크/ready/검색·복구 기록 |
| R04 | J03 state/새SQL의 상태·facts·역할/우선순위 복원, HAND 후속 문맥전용 분기·저장/효과 보호 | 이번 인계 범위의 USER records/provider | 검증된 Jira 사례+예제 → BeginResult/TicketResult/SaveResult·마이그레이션/원복·실제효과 |
| R05 | cases/고장모드 대응·판정기·사례/실행/효과 대조표 | 기능 소유자 원본을 시험 기대값에 맞춰 직접 수정하지 않음 | 공통 예제/현행 cases → 구간별 판정·공식 통합시험·실패/재시험 |

R01의 records 구현은 인계 범위가 명확한 전용 파일/분기에 한정한다. R04가 이미 같은 파일을 편집 중이면 덮지 않고 해당 diff를 먼저 인계받는다. R04는 H04/H22 기존 API 경계를 유지하므로 R01 provider 구현 완료를 기다리지 않고 모의 HTTP200/403/404/503으로 개발할 수 있다. R01은 R04의 새SQL이 없더라도 읽기 provider의 기존 Jira/state 조회 예제로 개발한다. 실제 owner/현재상태를 검증할 수 없는 환경은 통합 성공으로 표시하지 않는다.

R02는 확정 예제의 handed_off/기존facts를 사용해 본체를 먼저 완성한다. R04는 R02의 완성 workflow 없이 TicketRequest와 state 명령을 직접 시험한다. R05는 예제를 실행 가능한 검사로 옮기되 기대값을 구현 결과에 맞춰 완화하지 않는다.

## 7. 사본·식별자·공유 자원

- 기존 `dubakwi-p19-real`와 기존 요청/case/티켓은 보존한다. 진행 중인 case의 scope를 바꾸지 않는다.
- 신규 개발용 기본 이름은 `dubakwi-v1-r02`, `dubakwi-v1-r04`, 최종통합은 `dubakwi-v1-r05`다. **이름 예약안이며 실제 VM 생성 완료가 아니다.** R01이 권한·경로·충돌을 확인하고 반입한다.
- support와 errors의 scope, state/DLQ 호출 대상은 같은 사본 묶음에서 일치시킨다. 공개 Request로 scope를 받지 않는다. 기존 사건을 다른scope에 재사용하지 않는다.
- request_id는 실행묶음 prefix로 분리하고64자 이하로 유지한다. 중복/충돌 시험에 필요한 동일ID만 그 사례 안에서 공유한다.
- 각 소유자는 자기 사본만 편집한다. 공용 Credential·활성 원본·공유 Jira 프로젝트 설정은 R01의 통합 창에서만 바꾼다.
- R03의 독립 시험은 전용 public/restricted/readiness 메모리 키를 함께 사용한다. 기존 공용 키를 재색인하지 않는다. 격리 키 적용이 안 된 환경에서는 R01 창을 기다린다.
- 내부 주소·Credential ID·계정 매핑·비밀·실제 Jira 대응은 Git 제외 manifest로 전달한다. 계정·연락처를 코드/문서 예제에 넣지 않는다.

개발 원본/모의 시험은 병렬로 진행한다. 공유VM의 게시·재색인·고장 주입·최종통합 시험만 시간 창으로 직렬화한다. 같은 계정/외부API 호출 비용과 지연도 공유 자원으로 취급한다.

## 8. 고장 시험 공통 기준

| 유형 | 담당 | 준비해야 할 인터페이스 |
| --- | --- | --- |
| LLM·단계시간 | R02 | PR43 모드별 사본/버전·Webhook·켜기/끄기·기대reason/외부효과·해제 후 정상 |
| Jira·state·DLQ | R04 | 생성/종료/배정/알림/bind/save/이중실패별 경계·known ID·recovery·쓰기0/보존 조건 |
| 실행·판정 | R05 | 사례↔모드↔사본↔요청↔실행↔효과 대응, 단계확인·halted·미검증 분리 |
| 환경·시간 창 | R01 | 격리 사본·백업·비공개 설정·현재 실행 없음·원복과 해제 검증 |

고장은 사본의 정해진 한 경계에만 주입한다. production 권한을 빼거나 공용 Credential을 망가뜨리는 방식은 쓰지 않는다. 해제 검증 실패면 halted로 중단하고 다음 사례를 보내지 않는다. 외부 쓰기 결과가 불명확하면 전체 업무 재호출0·known ID 보존·partial_effect/DLQ로 확인한다. 자동 재개 TC07은 not_implemented로 유지한다.

## 9. 공통 완료 기준과 통합 순서

각 담당은 `계약v1 / 코드버전 / 바뀐 파일·노드 / 예제별 검사 / 미실행 / 실제 효과 / 배포·원복 / 다음 소비자`만 인계한다. 반복적으로 전체 상황 설명을 다시 작성하지 않는다.

1. 계약예제 검증: 같은 모의 입력에 같은 상태·오류·효과 기대값을 사용한다. 기능이 없어도 개발 가능하다.
2. 담당 기능 완료: 실제 담당 경계의 unit/Code/mock 검사를 수행하고, 원본·연결·기존 계약 유지 여부를 제출한다.
3. R01 반입: main 기준 버전/해시·백업·환경연결을 고정하고 구성별로 반입한다. 모두 끝날 때까지 코드 검토를 기다리지 않는다.
4. 구간 실연동: J01 본인/타인/없는건/장애, J03 facts복원/가림/충돌, J02 handed_off 후속/횟수유지/무재배정/무재알림을 각각 확인한다.
5. 최종통합: 고정 버전에서 R05가 TC12/F-S1-03·TC13/14·기존사실누적·중복/동시성·고장/해제·Discord를 대조한다. 응답뿐 아니라 Jira/DB/DLQ/알림까지 본다.

다른 기능의 미완료 때문에 막힌 항목은 blocked_dependency로 기록하되 자신의 코드 준비·예제 검사를 계속한다. 예제로 연결한 구간은 mock/local이며 실제통과로 표시하지 않는다. 누락 producer 데이터를 소비자가 추정하거나 빈값 성공으로 채워 우회하지 않는다.

반입은 배포와 기능 활성화를 구분한다. J02/J03은 지원하는 state/handoff 생산자와 support 소비자를 버전·해시로 묶고, handed_off 횟수/역할/우선순위 유지 및 facts 복원을 사본에서 확인한 뒤 함께 활성화한다. 조회 closed 생산자도 B24 표시 지원 확인 전 활성화하지 않는다. 계약 버전은 비공개 배포 manifest에 기록하며 시민 Request에 임의 버전 필드를 추가하지 않는다. 구버전 사본의 업무 의미를 바꾸는 혼합 배포를 금지한다.

## 10. 이번 결정의 변경 경계

확정: 소유권/현재상태 원본, handed_off 유지, facts 병합, 담당/알림 중복 효과, 대리 편집 범위, 독립 사본 이름/시험 창, 오류·완료 기준.

기존 계약의 명시 보완: 내부 SupportCase 선택필드2개, 조회용 closed 문자열, handed_off 후속의 보완횟수 유지. 변경분의 생산/소비 역할과 R05는 PR36에서 한 번 확인하고 상세 설계/회귀를 함께 갱신한다. 이미 승인됐다고 취급하지 않지만 각자의 예제 개발 착수를 기다리게 하지는 않는다.

새 서버·직원 UI·상담 전체이력DB·자동 재처리 엔진·실제 환불/현장 집행은 추가하지 않는다. 개인정보/비밀 주입·실제 권한 확대가 필요한 배포 단계는 실제 환경의 권한 규칙을 따르고 공통 계약 문서 작성으로 완료한 것으로 보지 않는다.

## 11. 검증 이력

- v1.0: 공통 기준·모의 예제 22개 작성. 구조 검사이며 구현 통과 증거는 아니었다.
- v1.1: [로컬 Code 노드 대조](../runs/public/20261106-233303-local-parallel-contract-validation/report.md)에서 검사 10개 중 부합 6개·구현 차이 4개를 확인했다. 완료 재전송 우선순위·상충 사실·목적별 효과 횟수·혼합 배포 금지를 보완하고 예제 3개를 추가했다. Jira 문맥 공통 읽기 형식과 새 위험 예외의 미합의를 명시했다. 업무 JSON·VM·Jira·DB는 변경하지 않았다.
