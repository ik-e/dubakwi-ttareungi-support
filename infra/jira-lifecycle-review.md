# Jira 티켓 수명주기 설계 대조

상위 요구별 추적은 [설계·구현 대조표](design-implementation-mapping.md)를 참조한다. 이 문서는 Jira J01~J03의 코드 근거를 상세히 설명한다.

- 확인일: 2026-11-06 KST / R01
- 기준: main eb747df, 현재 통합 PR36 및 R05 원격 시험 보고서
- 판정: **부분 구현·부분 실연동 확인. 설계대로 전체 완성 판정 불가.**
- 방법: 저장소 원본 정적 대조와 기존 실행 증거 검토. 이번에 VM/Jira/DB 변경·새 문의 실행은 하지 않았다. 현재 VM 배포본 전체를 새로 내보내 대조한 것은 아니다.
- 책임의 원본: [팀 헌장](../docs/project/TEAM-CHARTER.md). 요구의 원본: [워크플로우](../docs/project/WORKFLOW-DESIGN.md), [저장소](../docs/project/STORAGE-DESIGN.md), [시스템](../docs/project/SYSTEM-DESIGN.md).

## 1. 항목별 판정

| 설계 항목 | 현재 구현·증거 | 판정 |
| --- | --- | --- |
| 생성 전 prepare·생성 후 bind | handoff/state 구현. 정상305와 이관532 실측에서 생성·연결·저장 확인 | 대표 경로 확인 |
| 근거 안내 후 Jira 종료·Resolution·save/finish | 정상305에서 종료·독립 재조회done·DBcompleted·DLQ0, R05 정상S1판정 | 대표 경로 통과 |
| 정보 보완·같은 case 재사용·횟수 한도 | R05 TC01/TC01b에서 보완왕복→한도이관 응답 확인. 전체 Jira/DB/중복효과 대조는 남음 | 부분 확인 |
| 담당 배정·문맥·알림 수락·열린 상태 | support532/534에서 confirmed·독립담당일치/열림·DBcompleted·DLQ0. 메일수신은 요구 밖이며 수락과 구분. security는 R05 WF12 응답 확인이나 직접효과 대조 미완료 | support 대표 경로 확인, 전체 미판정 |
| 실제 생성된 접수 건의 본인/타인 조회 | H04가 사용자API records를 호출하고 서버는 JSON 파일을 읽음. 실제 Jira 조회 원본과의 연결은 코드에서 확인되지 않음 | 실제 연동 보완 필요 |
| 이미 이관된 case의 후속 요청 | R05 TC14 반복 실패. case_begin의 waiting_info 고정·빈facts 반환과 본체 재분류 경로 확인 | 결함 후보, 수정·재시험 필요 |
| 종료 후 동일case 거절·새case 분리 | Jira done 검사·case_closed 반환 구현. 실제 종단 재시험 증거는 미취합 | 구현 확인, 실측 필요 |
| 재전송·재생성·재배정·재알림 방지 | label/연결검증/표식 구현. R05 WF09 응답 재사용 확인. 추가 Jira/LLM/알림0의 직접 대조는 남음 | 부분 확인 |
| 부분실패·known ID·DLQ·재전송 차단 | 과거279 및322/336 unknown/partial_effect·pending 보존 확인. 전체 고장주입·이중실패·동시성 공식 판정 미완료 | 대표 실패 보존 확인 |
| 운영자 재개 | 자동 재개 드라이버 없음. TC07 not_implemented | 미구현 한계로 유지 |

## 2. 실제 보완해야 할 항목

### J01 실제 접수 조회의 원본 연결 — R04, R02 소비 계약·R05 판정

[handoff](../workflows/dubakwi-handoff.json)의 H04는 `GET dubakwi-user-api:8801/records/<target_ticket_id>`를 호출한다. [사용자 API](../services/user_api/server.py)의 RECORDS_FILE/records 분기는 파일에서 ticket_id·owner_id·status를 읽는다. 저장소의 [records](../data/records.json)는 T-DEMO 모의 기록이며 실제 Jira 상태를 읽는 구현은 아니다. 실제 생성된 Jira key가 이 파일에 없으면 not_found가 나고, H22는403/404를모두denied로정규화한다.

따라서 실제 Jira 이슈를 만들고 번호만 시험 문장에 넣는 것으로 WF06/07/TC13 준비가 끝나지 않는다. 기존 계약 안에서 실제 Jira·state 소유권·상태 조회의 원본을 연결하고 본인 성공/타인 거절/없는 건/연락처 가림을 대조해야 한다. 자료 복제 금지·모의 데이터 경계를 지키며 소유자가 연동 방식을 정한다. 이 판정은 현재 코드와 마지막 배포 기록 기준이며 현재 VM의 비공개 records 파일을 새로 조회한 결과는 아니다.

### J02 이관 후 후속 요청의 상태 유지 — R02·R04 공동, R05 TC14

[005 함수](../infra/db/migrations/005-create-case-functions.sql)의 case_begin은 Jira 열림 여부를 받아 새 처리권을 만든 뒤 support.status를 `waiting_info`로 고정 반환한다. [state](../workflows/dubakwi-state.json)의 S17은 Jira 상태 category로 done 여부만 전달한다. [support](../workflows/dubakwi-support.json)의 B08은 이 상태를 수용하고 B11은 문의 내용·missing·attempt를 기준으로 다시 ask/handoff를 고른다. 기존 handed_off의 처리 의미를 유지하는 후속 전용 분기는 이 경로에서 확인되지 않았다.

R05 TC14는 이관 후 같은case 요청이 반복해서 보완 질문으로 돌아갔다. 위 정적 흐름은 원인 후보이며 해당 VM 실행의 전체상태를 새로 대조하기 전 단일 원인으로 확정하지 않는다. handed_off 유지·같은 티켓 사용·후속 문맥 저장·재배정/재알림0을 확인해야 한다. ticket=null은 보완응답 계약이므로 그 값만으로 Jira 티켓이 없어졌다고 판정하지 않는다.

### J03 기존 문의 사실 복원 — R04 저장 경계·R02 본체, R05 왕복 내용 판정

저장소 설계는 Jira에서 기존 소유권·맥락·횟수·상태를 읽어 SupportCase/CaseFacts를 구성하도록 요구한다. 하지만 S17의 case_begin_payload는 jira_open/jira_attempt만 보태고, case_begin은 facts를 빈객체/배열로 반환한다. 따라서 기존 Jira의 reported/confirmed/attempted_actions 등이 BeginResult에 복원되는 연결을 이 경로에서 확인하지 못했다.

보완 횟수와 티켓 재사용이 통과하더라도 앞서 받은 장소·시각·증상이 다음 요청으로 이어지는지 별도 확인해야 한다. 사실 누적·반복 질문 방지·새 정보 병합을 시험한다. 실제 내용 유실의 범위는 비공개 실행 대조 후 확정하며 새 상담이력 테이블을 임의 추가하지 않는다.

## 3. 완료 판정 전 필요한 증거

1. 실제 소유권이 연결된 citizen-a/b 문의로 본인 조회·타인 거절·없는 건·가림 확인.
2. 보완 왕복에서 같은 Jira/횟수뿐 아니라 기존 사실·상태가 유지됨을 확인.
3. TC14 후속에서 handed_off·기존 티켓 유지·새 문맥 저장·재배정/재알림0 확인.
4. support/security 각각 이관의 Jira 담당·문맥·알림 수락·DBcompleted/최종응답·DLQ 대조.
5. 생성/종료/배정/알림/저장 실패 및 중복/동시요청에서 외부효과·처리권·복구정보 대조.
6. 종료된 case_ref는 거절하고 별도 새 문의는 분리되는 실제 시험.

## 4. 운영 범위와 보존

Jira 프로젝트의 생성·종료 전환과 한 건의 담당 배정이 가능하다는 것은 전체 티켓 수명주기 완성의 충분한 증거가 아니다. 설계 범위의 조회·후속·실패 경계를 함께 확인해야 한다. 실제 직원의 업무 수행/환불/현장 조치·직원 UI·자동 재개 엔진은 이번 범위에 추가하지 않는다.

기존 실패 요청·Jira·DB·DLQ는 보존한다. 이번 검토에서는 기존 티켓 재전송·재배정·종료·상태정리를 하지 않았다. 수정은 각 소유자가 제공하고 R01이 환경 반입, R05가 공식 판정한다. PR36의 정상1건 통과 기록은 유지하되 전체 티켓 관리 완료로 확대하지 않는다.
