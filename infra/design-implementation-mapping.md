# 설계·구현·배포·검증 대조표

J01~J03의 후속 실행 기준과 한정 편집 인계는 [병렬 작업 공통 기준 v1](parallel-integration-contract-v1.md)에 정리했다. 아래 원래 부족 항목은 이 기준 작성만으로 완료 처리하지 않는다.

전체 64개 행의 후속 작업·예정 인수 시험·의존성과 증거는 [전체 수정·검증 계획](full-system-closure-plan.md)·[항목별 매핑](contracts/full-system-coverage.json)에서 확인한다. 아래 표는 v1.0 조사 시점의 증거이며 이 연결을 추가했다고 판정을 올리지 않는다.

- 버전: v1.0 / 2026-11-06 KST / R01
- 목적: 설계 요구마다 현재 구현, 실행 증거, 부족한 부분, 수정·검증 담당과 종료 조건을 연결한다.
- 결론: **정상 안내와 대표 support 이관은 실제 확인됐으나 전체 설계의 구현·검증 완료는 아니다.**
- 코드 기준: main `eb747df`와 PR36 작업 사본. R02 후속 수정은 PR42, RAG 변경은 PR31로 병합됐지만 VM 반영 전이다.
- VM 기준: 마지막 확인 support `3e8547a`, state/DLQ/handoff `a930e24` 기반·담당 매핑 적용본, errors `8c53cf7`, 봇 `37ec341`. 이번 문서 작성 중 VM 전체를 새로 내보내거나 업무 요청을 실행하지 않았다.
- 증거 기준: R01 실행288/305/532와 R05 `r05/p19-s1-verdict@c85e200`, 결과서 초안 `r05/p23-execution-result@a5f50e8`. 후자의 원격 브랜치 자료를 main에 이미 통합한 것으로 취급하지 않는다.
- 문서 성격: 특정 시점의 대조·후속 작업 목록이다. 상태 원장은 [개발 계획](../docs/DEVELOPMENT-PLAN.md), 책임 원본은 [팀 헌장](../docs/project/TEAM-CHARTER.md)이다. 원래 설계·사례 기대값을 이 문서로 변경하지 않는다.
- 대조 항목: 채널8·본체9·Jira15·저장/복구10·RAG8·장애8·운영6, 총 **64개**. 항목 수는 공식 시험 건수나 통과율의 분모가 아니다.
- 기준 파일·해시·작성 검사: [검증 요약](../runs/public/20261106-230838-local-design-mapping/summary.json). 파일의 Git LF 원본 기준 해시이며 비공개 환경파일을 포함하지 않는다.

## 1. 읽는 방법과 한계

구현 여부, 배포 여부, 검증 수준을 분리한다. `대표 확인`은 표시된 한 경로의 실제 증거가 있다는 뜻이며 전체 권한·동시성·실패 검증 완료를 뜻하지 않는다. `응답 확인`은 Jira·DB·알림 효과까지 확인한 최종 통과가 아니다. `코드 보완`은 현재 원본에서 필요한 연결/동작이 부족한 항목이다. `배포 대기`는 수정 코드가 있으나 현행 VM에 적용되지 않은 항목이다. `검증 대기`는 코드가 있지만 필요한 실행 증거를 아직 확보하지 못한 항목이다. `미구현`은 한계로 기록하고 자동으로 통과/제외하지 않는다.

한 요구를 여러 행으로 나눠 0/1 통과율을 계산하지 않는다. 각 행의 완료 조건을 충족했는지 판정하고, R05의 공식 사례 판정과 연결한다. 설계의 독립적인 동작·불변 조건을 대상으로 한 대조이며 모든 자연어 문장이나 도표의 모든 엣지를 기계적으로 동치 증명한 것은 아니다. 미취합은 미구현과 다르다. 현재 VM 전체의 새 export, 개인별 모든 Discord 시험, 기존 전체 Jira 자료의 직접 대조는 이번 작업 범위가 아니다.

### 설계·구현 참조

| 약어 | 원본 |
| --- | --- |
| SYS | [시스템 설계](../docs/project/SYSTEM-DESIGN.md): 2 채널, 3 불변 조건, 4 상태, 5 S1~S8, 6 F01~F09 |
| WF | [워크플로우 설계](../docs/project/WORKFLOW-DESIGN.md): 4 노드/분기, 6 계약, 7 오류/시간/후속 제한 |
| ST | [저장소 설계](../docs/project/STORAGE-DESIGN.md): 2 원본, 3 처리권, 4 DLQ, 6 계약, 7 복구 |
| RAG | [RAG 설계](../docs/project/RAG-ARCHITECTURE.md): 1~4 지식/색인/검색/권한, 5 복구 |
| SUP | [support JSON](../workflows/dubakwi-support.json) |
| HAND | [handoff JSON](../workflows/dubakwi-handoff.json) |
| STATE | [state JSON](../workflows/dubakwi-state.json) |
| DLQ / ERR | [dlq JSON](../workflows/dubakwi-dlq.json) / [errors JSON](../workflows/dubakwi-errors.json) |
| SQL | [001~007·마이그레이션 안내](db/migrations/README.md), 특히 [003](db/migrations/003-create-storage-functions.sql)·[005](db/migrations/005-create-case-functions.sql)·[007](db/migrations/007-deduplicate-alert-marker-dlq.sql) |
| USER | [사용자 API](../services/user_api/server.py), [모의 users](../data/users.json)·[모의 records](../data/records.json) |
| BOT | [Discord 봇](../services/discord_bot/bot.py)·[어댑터](../services/discord_bot/adapter.py), [기동 안내](discord-bot.md) |
| IDX / SEARCH | [index JSON](../workflows/dubakwi-index.json) / [search JSON](../workflows/dubakwi-search.json) |

### 실행 증거

| ID | 증거와 확인 범위 |
| --- | --- |
| EV01 | [R01 DB/워크플로우 게시](../runs/public/20261106-124323-vm-p19-published/report.md): SQL005~007·권한·기존 자료 보존·사본 연결 |
| EV02 | [R01 정상288](../runs/public/20261106-154400-vm-p19-normal-pass/report.md): 실제 안내·Jira 종료·DB 최종 저장 |
| EV03 | [R01 Discord305](../runs/public/20261106-163939-vm-discord-normal/report.md), [R05 정상 판정](https://github.com/ik-e/dubakwi-ttareungi-support/blob/c85e2002f57e94dd753b68d3213ec9f14c03e83a/runs/public/20261106-162030-vm-p19-s1-r05-verdict/report.md): 정상 S1 한 건. 시각은 EV09 정정 참조 |
| EV04 | [R01 support 이관532](../runs/public/20261106-172441-vm-assignee-handoff/report.md): 하위534, Jira 배정·알림 수락·DB 완료·DLQ0 |
| EV05 | [R05 최초16건](https://github.com/ik-e/dubakwi-ttareungi-support/blob/c85e2002f57e94dd753b68d3213ec9f14c03e83a/runs/public/20261106-165456-vm-p22-p19-subset/report.md): 15건 기대 충족·TC12 실패 |
| EV06 | [R05 이관9건 두 회차](https://github.com/ik-e/dubakwi-ttareungi-support/blob/c85e2002f57e94dd753b68d3213ec9f14c03e83a/runs/public/20261106-174635-vm-p22-p19-handoff/report.md): 응답6건 충족·WF09 입력 문제·TC14 실패, 가린 대응표 |
| EV07 | [R05 25건 세 회차/시간5회](https://github.com/ik-e/dubakwi-ttareungi-support/blob/c85e2002f57e94dd753b68d3213ec9f14c03e83a/runs/public/20261106-205024-vm-p22-p19-repeat-r1/report.md): 22사례 응답 일관, WF01/TC12/TC14 미충족, 외부 효과 직접 대조 한계 |
| EV08 | [R05 WF09 재시험](https://github.com/ik-e/dubakwi-ttareungi-support/blob/c85e2002f57e94dd753b68d3213ec9f14c03e83a/runs/public/20261106-203339-vm-p22-wf09-retest/report.md): 같은 ID/티켓·duplicate 응답, 외부 효과0 직접 확인 전 |
| EV09 | [후속 수정 병합·시각 정정](../runs/public/20261106-175327-local-post-baseline-readiness/report.md): main과 VM 분리, 실행305 실제16:00:39.439 KST |
| EV10 | [시민5계정](../runs/public/20261106-162709-vm-five-citizens/report.md), [봇 기동](../runs/public/20261106-160000-vm-discord-start/report.md), [팀키 교체](../runs/public/20261106-150135-vm-team-key-rotation/report.md) |
| EV11 | [과거 실패279 보존](../runs/public/20261106-162014-vm-prior-failure-review/report.md), [Jira 상세 대조](jira-lifecycle-review.md): 과거322/336도 별도 확인, 실제 식별자는 비공개 |
| EV12 | [R02 문구/TC12 로컬 비교](../runs/public/20261106-173834-local-n8n-p19-provenance-tc12/summary.json), [PR43 고장 도구](https://github.com/ik-e/dubakwi-ttareungi-support/pull/43): VM 검증과 구분 |
| EV13 | [PR31 적용·원복 계획](../docs/rag-knowledge/p31-vm-index-recovery-plan.md), [R05 결과서 초안](https://github.com/ik-e/dubakwi-ttareungi-support/blob/a5f50e8eae569b855e1b9d4d7c0c8878a82c0010/docs/project/EXECUTION-RESULT.md) |

### 워크플로우 원본 확인 범위

| 원본 | 노드 수 | 주요 대조 행 |
| --- | --- | --- |
| support | 54 | C03/C04, B01~B09, J02/J13, S01~S06, E02/E05/E06 |
| handoff | 48 | J01/J04~J15, S05/S06, E01 |
| state | 20 | J02/J03/J06/J12, S01~S06, E07 |
| dlq | 6 | S07/S08, E01/E04 |
| errors | 8 | S09, E04/E07 |
| index | 11 | R01/R02/R07/R08 |
| search | 19 | R02~R07, E03 |

이는 원본 JSON의 노드 목록 대조다. 모든 노드를 실제 VM에서 각각 실행했다는 뜻은 아니다.

## 2. Discord·사용자·입력 경계

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| C01 | SYS2.1: 허용 서버/채널의 명령만 받기 | BOT create_bot, guild/channel 검사 | 코드 구현·EV03 대표 확인 | 다른 서버/채널 거절과 본체 호출0의 공식 시험 | R04 / R05 |
| C02 | SYS2.1/WF6.6: Discord ID를 등록 사용자로만 연결 | BOT Settings.user_map, USER employees | E10의5개 매핑·API200, 기존 두 매핑 보존 | 각 실제 계정의 정상 문의·미등록 거절/본체0 최종 대조 | R04·R01 / R05 |
| C03 | WF6.4: 역할·access_levels는 서버가 결정 | SUP B04/B05, USER | EV03 citizen/public, EV05/EV07 권한 거절 응답 | 사용자 자기소개로 승격0, support/security 양성 대조 | R02·R04·R03 / R05 |
| C04 | WF6: 길이·필수값·unknown_user 입력 검사 | SUP B02/B05, BOT build_support_request | EV05/EV07 WF13·TC09c 응답 확인 | 거절 요청의 Jira/LLM 부작용0을 사례별 대조 | R02·R04 / R05 |
| C05 | SYS2.1: 빠른 비공개 defer와 최종 비공개 응답 | BOT interaction.response.defer/followup | EV03 사용자 본인만 열람 확인 | defer 3초 기준 실측·초기응답 실패 시 본체0 | R04 / R05 |
| C06 | WF6.6: ticket.ticket_id·sources·case_ref 변환 | BOT adapter, SUP B33 | 로컬22시험·EV03 실제 답변/근거/연결값 | 이관·보완·조회·긴 답변의 실제 채널 판정 | R04·R02 / R05 |
| C07 | SYS2.1: 동일 interaction은 동일 request_id, 전송 실패로 업무 재실행0 | BOT dc-ID·run_support, STATE replay | 코드 구현·로컬 경계, 실제 재전달 미취합 | 동일 interaction 재전달·최종 전송 실패/토큰만료에서 Jira/LLM0 | R04·R02 / R05 |
| C08 | SYS3/WF6.6: 내부 코드·민감값 노출 없이 오류 안내 | BOT failure_message, 로그 제한 | 로컬 오류안내 검사·실제 미등록 거절 | 400/409/timeout/partial_effect의 실제 비공개 안내·중복 접수 유도0 | R04 / R05 |

## 3. 본체 분류·답변·시간 분기

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| B01 | WF4.1: triage/retriever/writer/verifier 책임 분리 | SUP B10~B21, L01~L03, SEARCH | EV02/EV03 전체 agents 확인 | 실패·skip 경로의 호출 유무는 해당 고장시험에서 대조 | R02·R03 / R05 |
| B02 | WF4.1/4.2: 긴급→한도→누락→사람판단→검색 우선순위 | SUP B11/B12/B17/B18 | EV06/EV07 다수 응답, 짧은 고장 high의 적정성 미판정 | 일반 고장/부상·주행위험을 나눠 기대 분기 검증 | R02 / R05·R04 |
| B03 | SYS S1: 근거 기반 안내·검증 뒤 티켓 종료/저장 | SUP B14/B19~B21/B27/B32 | EV03 정상S1 공식 한 건 통과 | EV07 WF01 search_error/답변 표현 흔들림을 수정·재시험 | R02·R03 / R05 |
| B04 | SYS S2: 정보 부족이면 필요한 사실을 물으며 완료 추정0 | SUP B22, B25 action=wait | EV05 보완 분기, TC12 반복 실패 | main c6b4644 보완문구는 VM미배포. TC12 최종 재판정 | R02 / R01 반입·R05 |
| B05 | WF4.1: 자료 경위 표현 대신 시민에게 직접 안내 | SUP B19의 L02 프롬프트, knowledge | EV12 로컬 개선, VM F-S1-03 남음 | PR42 반입·PR31 지식 변경을 구분해 같은 QR질문 재시험 | R02·R03 / R01·R05 |
| B06 | SYS S6: empty/검색오류/검증실패를 답변 성공으로 사용0 | SUP B17/B21→B23, SEARCH error 봉투 | 코드·EV06 WF03 응답, EV07 실제 오류 이관 | 실패 원인·Jira/DB 효과를 고장주입 시험으로 확인 | R02·R03·R04 / R05 |
| B07 | SYS S5: 긴급 이관 우선, 초동근거/조회 후속은 최초 성공 취소0 | SUP B30→B13→B24/B26, HAND | EV06/EV07 WF12 보안이관 응답 | security 담당·알림·후속문맥·재생성/재알림0 직접 대조 | R02·R04·R03 / R05 |
| B08 | WF7.5: 20초 처리 시한/25초 시험 실패선·단계 예약·무조건 쓰기 재시도0 | SUP B02/B17/L02/L03/B27 | 로컬145경계, EV03·EV04·EV07 측정 | B17 축소 모델제한 VM실측, 8초 목표(p50 8.062/p95 10.692) 개선/한계 기록 | R02·R04 / R05 |
| B09 | WF6/7: 효과 미확인은 성공/완료로 표현하지 않기 | SUP B28/X/B33, BOT | EV11 partial_effect·known ID 보존 | 시민 응답·DB/DLQ·알림의 실패별 일치와 원문 가림 시험 | R02·R04 / R05 |

## 4. Jira 티켓 수명주기와 소유권

J01~J03은 [선행 상세 대조](jira-lifecycle-review.md)와 같은 지적 ID다. 정적 코드에서 확인한 경로와 실제 VM 결함 판정을 구분한다.

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| J01 | SYS S4/ST2: 실제 접수 건의 본인 상태 조회·타인 거절 | HAND H04/H22→USER records | **코드 보완:** 파일기반 모의records, 실제Jira 상태 원본 연결 미확인 | 실제 Jira/state 소유권 조회 연결. WF06/07/TC13 본인/타인/없는건/가림 통과 | R04·R02 / R05 |
| J02 | SYS4/ST2: handed_off 문의 후속도 기존 이관 의미 유지 | STATE S17→SQL005 case_begin→SUP B08/B11 | **코드 보완:** waiting_info 고정. EV06/EV07 TC14 반복 실패와 관련 원인 후보 | 같은 티켓·handed_off·새문맥 저장·재배정/재알림0, 직접상태 대조 | R02·R04 / R05 |
| J03 | ST2/6: 기존 Jira CaseFacts를 복원·새 사실과 누적 | STATE S17, SQL005 빈facts, SUP B08/B11 | **코드 보완:** 횟수/열림만 전달, 기존facts 복원 경로 미확인 | 장소·시각·증상·시도/확인 사실을 다음 요청에서 유지·불필요 재질문0 | R04·R02 / R05 |
| J04 | SYS3/WF4.4: 생성 전 prepare 저장 게이트 | HAND H14/H15/H16, STATE | EV02/EV04 대표 실측·로컬 게이트시험 | prepare 실패 시 Jira 쓰기0 고장주입 | R04 / R05 |
| J05 | WF4.4: Jira 생성·필수 필드·업무 문맥 | HAND H23/H24/H05/H06 | EV03·EV04 실제 생성 확인 | 유형별 필드·가린내용·필수값 실패 대조 | R04·R02 / R05 |
| J06 | SYS3/ST3: 생성 확인 뒤 ID/key bind, 실패 시 known ID 보존 | HAND H30/H17/H18, STATE bind | EV03·EV04 정상 bind·EV11 known 보존 | bind 실패·응답유실에서 추가 생성/변경0와 복구캡슐 확인 | R04 / R05 |
| J07 | WF4.4: 키/label/본문case/first_request 연결 검증·충돌거절 | HAND H23/H24, STATE S08/S17 | 코드·로컬 불일치 회귀 | 다른문의키·해시충돌·다중검색·검색실패의 실제 쓰기0 | R04 / R05 |
| J08 | SYS S1: 안내 완료 전환·Resolution·중복 종료 방지 | HAND H31~H36 | EV03 POST204·독립done/Resolution완료 | 이미done 재호출·전환누락·필수필드/권한거절·동시외부변경 시험 | R04 / R05 |
| J09 | SYS S3: support 담당 배정·문맥·알림 수락 후 열린 상태 유지 | HAND H37~H51 | EV04 생성/문맥/배정/알림confirmed·독립담당일치·DB완료 | R04/R05 적용본 최종 대조·대표 외 유형 회귀 | R04 / R01·R05 |
| J10 | SYS S5: security 담당으로 실제 긴급 이관 | HAND H39 환경매핑, SUP role 결정 | 매핑배포·EV06/EV07 WF12 응답 확인 | 실제security accountId·문맥·알림·DB/DLQ 대조 전 전체통과 금지 | R04 / R05 |
| J11 | SYS S2: 보완 티켓 생성/재사용·이번횟수 저장 | HAND H45~H48, STATE S17/SQL005 | EV06/EV07 TC01/TC01b 응답 왕복·한도 | 단계별 Jira1건·횟수정확·상태/사실 누적, 재전송 증가0 확인 | R04·R02 / R05 |
| J12 | SYS4/ST3: 종료case_ref 자동 재개0·새 문의 분리 | STATE S17/SQL005 case_closed, SUP B08/B09 | 코드 구현 | 직원이Jira에서닫은경우 포함, 이전case409·새case정상·대상변경0 실제 시험 | R04·R02 / R05 |
| J13 | SYS S4: 조회 대상과 이번 조회 문의 티켓 분리 | SUP lookup/fixed→close, HAND lookup/process | 코드 구현, EV03 조회skipped는 통과증거 아님 | 조회 성공/거절 뒤 이번요청 종료·기존대상 변경0 | R02·R04 / R05 |
| J14 | WF4.4: 같은 case 반복 배정·알림 방지·불명확하면 자동 재알림0 | HAND context/attempted/sent 표식, DLQ alert_marker | 로컬 반복회귀, EV08 duplicate 응답 | 같은case/request 재전송 전후 Jira쓰기/알림0·표식실패 안전차단 실제 대조 | R04·R02 / R05 |
| J15 | ST2/6: Jira가 문의/맥락 원본, 처리 상태와 분리 | HAND 댓글/labels, STATE 최소 연결, USER 모의경계 | 기본구조 구현·J01/J03 누락 존재 | 기존Jira원본 읽기·현재상태·문맥 복원 연결, data/records로 실제이력복제0 | R04 / R02·R05 |

## 5. 처리 상태·DLQ·복구

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| S01 | ST3: scope/request_id 처리권·입력hash·owner 검증 | SQL001/003, STATE begin | EV01 물리적용·EV05/EV07 TC03 conflict응답 | 원문/타인결과 비노출·서로다른scope 격리와 DB효과 대조 | R04·R02 / R05 |
| S02 | ST3.2: completed replay·다른입력 conflict | SQL state_apply, SUP B08/B09 | EV08 동일ticket/duplicate, TC03응답 | replay의 LLM/Jira/배정/알림0·저장응답 주요필드 보존 확인 | R04·R02 / R05 |
| S03 | ST3.2: processing/failed/unknown 자동 재실행0 | STATE begin, SUP 409, BOT 안내 | EV11 unknown·pending 보존·로컬 계약 | TC17/18에서 request_in_progress/requires_review/case_busy·신규분리 대조 | R04·R02 / R05 |
| S04 | ST3.1/3.3: StateRef revision/execution 조건부 갱신·case 단독처리권 | SQL003/005 락·제약 | 코드·runtime권한 일부확인 | 실제동시요청·오래된revision·다른execution의 변경거절/쓰기0 | R04 / R05 |
| S05 | ST6: save는 Jira 문맥 검증과 finish 모두 성공해야ok | STATE S06~S11, SUP B32 | EV03 rev4·EV04 rev5·DB완료·응답8필드일치 | Jira문맥불일치·finish저장실패에서completed0·known보존·복구정보 | R04·R02 / R05 |
| S06 | ST3: 실패와 효과미확인 구분, known ID·중단위치 보존 | SQL fail, SUP X, ERR | EV11 실제unknown/partial_effect·pending | 생성응답유실·DB불능·fail까지실패의 각 경계 고장판정 | R04·R02 / R05 |
| S07 | ST4: DLQ put·claim·resolve 계약과 최소 복구자료 | DLQ/SQL003, RecoveryCapsule | 코드·로컬 계약·실제pending저장 | claim처리권/attempts·불법resolve·원실행종료/외부효과 확인 절차 | R04 / R05 |
| S08 | ST4: alert_marker는 같은 활성case DLQ 갱신 | SQL007, DLQ D02/D03 | EV01 적용·로컬 중복제거 회귀 | 실제동일dlq_id/deduplicated=true·단계/오류다르면분리·재알림0 | R04·R02 / R05 |
| S09 | WF7/ST6: Error Workflow 동일scope·원execution 귀속·재귀0 | ERR EV02~EV07, SUP errorWorkflow | EV01 scope검사·로컬16오류주입 | TC17 실제 예외·unknown·재전송차단·state/DLQ이중실패·비밀비노출 | R04·R02 / R05 |
| S10 | ST4/SYS S8: 운영 확인 후 남은 단계만 재개 | RecoveryCapsule·기존runtime함수 | **미구현:** 원요청 재개드라이버 없음, TC07 not_implemented | 성공으로세지않음. 범위유지면수동확인/차단한계를확정; 자동엔진은별도범위결정 | R01·R04 / R05 |

## 6. RAG·권한·답변 근거

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| R01 | RAG1: 지식·manifest·청크해시·가상정책/출처/적용범위 구분 | knowledge, prepare_rag_chunks, IDX I02 | 교육용44청크·로컬해시, PR31 main병합 | 승인대기와교육용시험구분, 실제적용지식/청크/버전manifest 기록 | R03 / R04·R05 |
| R02 | RAG2~4: 전수색인 ACK·ready·같은프로세스 메모리 | IDX/SEARCH readiness | 기존VM색인·대표검색확인 | PR31 **VM재색인대기**, 새44청크ACK/ready·정확버전·검색복구 | R03·R01 / R05 |
| R03 | SYS3/RAG1.3: 사용자API→B05→RAG public/restricted 전달 | SUP B05/B13, SEARCH partition/filter | EV03 R05 public요청·반환5public 확인 | 담당자양성·권한변조·혼합·빈권한·전달실수 사례, 전체노출0 판정 | R03·R02·R04 / R05 |
| R04 | RAG4: 시민 제한본문/문서ID/canary 비노출 | SEARCH 결과 access_level 재검사, SUP/BOT | EV05/EV07 권한거절응답, EV03 제한근거없음 | 반환본문·sources·Jira/알림·코드의 canary별검사, 허용담당자양성 대조 | R03·R04·R02 / R05 |
| R05 | WF6/RAG4: disabled/empty/error/index_not_ready 단일봉투 구분 | SEARCH 계약노드, SUP B17 | 코드·로컬, EV06 empty이관 | 현재VM readiness실패·metadata누락·시간초과·외부오류가empty로섞이지않음 확인 | R03·R02 / R05 |
| R06 | RAG4: QR·보안초동·환불 기대근거/인용·근거밖답변0 | SEARCH, SUP B19/B20 | EV03 QR대표판정·PR31오프라인개선 | PR31검색16사례/실패2건 재판정, 답변문장·citations·metadata 대조 | R03·R02 / R05 |
| R07 | RAG5: 재시작·색인실패 시 fail-closed·복원 | IDX readiness세대, EV13 계획 | 코드·이전일부시험/계획 | 동일VM 재시작/부분실패/이전전체재색인·공개/제한검색 복원실측. 즉시alias롤백미구현 | R03·R01 / R05 |
| R08 | RAG3/5: 임베딩·chunk수·토큰·비용·규모 한계 기록 | IDX·측정자료 | 일부chunk수/시간, 비용/규모 대부분미측정 | 미측정을성능보장으로쓰지않음. 채택범위측정·확장계획과실제PG상태DB분리 | R03·R01 / R05 |

## 7. 장애·보안·시간의 교차 경계

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| E01 | WF7/SYS S8: Jira 생성/종료/배정/알림 고장별 안전처리 | HAND·SUP X·DLQ, make_close_fault_copy | 로컬회귀·실제과거부분실패 | WF04/TC05~18 매트릭스와 실제고장사본/해제/중단검증·공식판정 | R04·R02 / R05 |
| E02 | WF7.5: LLM중단/timeout·단계시한 만료의 이관 | SUP L01~L03/B17, PR43 도구 | main게이트·EV07 실제llm_down, PR43로컬 | PR43 검토/병합/VM사본/주입해제. 자연발생오류를WF10/11주입통과로세지않음 | R02·R04 / R05 |
| E03 | WF7: 검색장애와 정상empty 구분·직접원인확인 | SEARCH·SUP B14/B17 | EV07 WF01 search_error | 실제검색실행/응답/잔여예산 대조·재현, 이후정상질문 반복기준충족 | R03·R02 / R05 |
| E04 | WF7/ST4: state와DLQ 모두실패해도 응답·가림·재귀안전 | ERR·SUP X·DLQ 계약 | 로컬오류주입 | TC16 실제이중실패·원문/키비노출·응답1회·자동재실행0 | R04·R02 / R05 |
| E05 | SYS3/WF7: 주입/권한위반/민감값가림을 출력·로그 전반에 적용 | SUP B03/B05/B33/B35, BOT, USER | EV05/EV07 차단·로그응답검사 | 숨긴지시의다른형태·답변/Jira/알림/실행로그 전체가림과양성대조 | R02·R04·R03 / R05 |
| E06 | WF7.5: B27 먼저timeout이면 효과미확인·쓰기 재시도0 | SUP B27 오류엣지·X, HAND | 로컬FL81/87·계약 | 실제중간timeout에서원handoff후속효과/known보존·DLQ/재전송차단 대조 | R02·R04 / R05 |
| E07 | ST7: 재시작 후 processing/reprocessing 수동확인·무단해제0 | DB영속화·runtime함수/운영절차 | 설계/배포·일부보존 | 재시작·원실행종료·외부효과·처리권 확인 후허용작업, 장기잠금한계기록 | R01·R04 / R05 |
| E08 | 시험기준: 동일사례 반복·시간수치·실패원인 보존 | R05 cases/run_cases/report | EV07 3회·5회실측. WF01/TC12/TC14 미충족 | 일부응답충족/검증미완료를pass로합산0; 안정성·8초목표·20초시한 분리판정 | R05 / R02·R03·R04 |

## 8. 배포·운영·문서·마감

| ID | 설계 요구 | 구현 위치 | 현재 증거·판정 | 부족한 부분 / 완료 조건 | 수정·확인 담당 |
| --- | --- | --- | --- | --- | --- |
| O01 | SYS9/AGENTS7: 검토된main·이미지ID·workflow/환경 고정 | Compose·배포manifest·EV01/EV04/EV09 | 실제기동/게시/고정이미지 기록 | 최신main과현행VM불일치 해소, 반입전백업/사전diff/역할시험창/원복 기록 | R01 / 각 소유자·R05 |
| O02 | ST7/infra: PG영속볼륨·무공개포트·최소권한·비밀파일 | postgres Compose/001~007·user/bot Compose | EV01 권한/함수·EV10 read_only/nonroot | 현행네트워크/TLS필요조건·비밀주입·API권한 주기점검, 운영기준 확정 | R01·R04 / R05 |
| O03 | ST7: DB와n8n암호화키/설정·Jira·색인 복구범위 분리 | postgres-deployment, infraREADME, EV13 | DB백업archive목록 확인·문서 | **전체복원미검증**. 격리복원→권한재적용→허용/거절→행/검색대조·시간/RPO/RTO 기록 | R01·R04·R03 / R05 |
| O04 | ST7/공개정책: 보존기간·삭제권한·키회전·공개가림 | Credential/비공개파일·gitignore·검사도구 | EV10 팀키회전/new400-old403·로컬패턴/공개검사 | retention·백업주기·원시실행로그설정 확정. tscan미제공 대체검사한계 유지 | R01·R04 / R05 |
| O05 | P23/P28: 설계·개발원장·결과서·실측 하나로동기화 | docs·EV09·EV13·PR36 | 결과서R05브랜치초안, 본문일부구상태존재 | 최신초안 검토/통합·원장P행갱신·실행305시각정정참조·main/VM/결과버전 일치 | R01·R05 / R02·R03·R04 |
| O06 | P25~P31: 최종회귀·실패/복구시연·발표/제출재현 | requests·결과/발표계획 | 요청/계획초안·실측일부 | 최종설정고정→전체필수사례→실제Discord리허설→문서/가림/재현검사·최종PR정리 | R01·R05 / 전원 |

## 9. 시나리오별 부족 항목 연결

| 설계 시나리오 | 연결 행 | 현재 판정과 다음 증거 |
| --- | --- | --- |
| S1 근거 안내 | C05/C06, B03/B05/B08, J04~J08, S05, R03/R06 | 정상한건공식통과. 최신문구/지식배포·WF01흔들림/성능 재시험 필요 |
| S2 보완 | B04, J03/J11, S04/S05 | 왕복/한도응답확인. TC12최신배포·이전사실누적/같은티켓·횟수직접대조 필요 |
| S3 사람판단 이관 | B02/B09, J09/J14, S05 | support대표실측확인. 재이관·후속TC14·알림중복효과 대조 필요 |
| S4 본인상태 | J01/J13, C03, R04 | 실제조회원본연결·본인/타인fixture가 선행. skipped를조회통과로세지않음 |
| S5 긴급복합 | B07, J10/J14, R03/R06 | WF12응답확인. security실제효과·초동조회·최초이관유지 직접대조 필요 |
| S6 근거/검증불충분 | B06, E02/E03 | 응답이관/실제오류확인. 제어된고장·Jira/DB효과와외부원인확인 필요 |
| S7 거절·재전송 | C04/C07, S01~S04, J07/J14, E05 | 다수응답충족. 충돌/중복/동시쓰기·LLM·알림0 실제대조 필요 |
| S8 부분실패·복구 | S06~S10, E01/E04/E06/E07, O03 | knownID/DLQ보존확인. 고장전범위/운영수동절차/복원미완료, TC07미구현 |

### 공식 시험 사례 연결

WF01→B03/B05/B08/R06, WF02/02b→B04/J03/J11, WF03→B06/R05, WF04→E01/S06/S07, WF05→C03/R03/R04, WF06/07→J01/J13, WF08→C04/E05, WF09→S02/J14, WF10/11→B08/E02/E06, WF12→B07/J10/R06, WF13→C04;  TC03→S01/S02, TC05/06→J06/S05/S06, TC07→S10, TC09/11→C04/E05, TC12→B04, TC13→J01/J13, TC14→J02/J03/J14, TC15/16→J14/E04, TC17/18→S03/S09/E07;  사례세부정의는 R05 소유 [common](../cases/common.json)·[team](../cases/team.json)·[확장](../cases/team-extended.json)의 해당 버전이 원본이며 원격수정본과 main 차이도 기록한다.

## 10. 처리 우선순위와 인계 결과

| 순서 | 처리 묶음 | 선행 조건 | 받아야 할 결과 |
| --- | --- | --- | --- |
| 1 | J01 실제조회·J02 이관후상태·J03 사실복원 | R04/R02 설계대조·편집인계·TC14원시읽기 | 수정원본/마이그레이션필요여부·계약영향·본인/타인/왕복/후속 회귀·배포/원복방법 |
| 2 | B04/B05·R02/R06 최신수정 반입 | R05시험종료인계·현재VM백업·정확main/hash | B17두노드반입/PR31별도재색인기록·TC12/F-S1-03·검색직접재시험 |
| 3 | E01/E02/E04/E06 고장사본·S03/04/J14 중복/동시성 | 주입/해제/안전중단 검증·역할별표 | 사례↔사본↔실행↔Jira↔DB/DLQ 대응·실패시효과보존·해제후정상 |
| 4 | O03/O04 운영복원·보존 | 격리복원대상·백업/키관리·서비스중단창 | 실제복원·권한/행/검색재확인·운영한계·보존/삭제조건 |
| 5 | O05/O06 최종판정·제출 | 필수결함해소/미구현명시·설정동결 | R05최종사례표·시연리허설·최신원장/문서/PR·공개/비밀/재현검사 |

시험 결과는 최소 `대조ID / 사례ID / 코드·VM·설정버전 / 실행ID / 응답 / Jira·state·DLQ·알림 효과 / pass·fail·unverified·not_implemented / 증거 / 다음조치`로 인계한다. 원본 요청·실제사용자ID·Jira key·계정매핑·키는 Git 제외 비공개로 전달하고 공개표에는 가린 대응값만 쓴다.

## 11. 범위와 미구현을 다루는 기준

자동 재개드라이버(TC07), 직원 UI, 실제 환불·요금정정·출동·원격잠금해제, 승인되지 않은 상담 전체이력DB는 현재 구현 범위에 추가하지 않는다. RAG용 pgvector 계획은 현재 PostgreSQL 최소상태/DLQ 실연동과 별개다. 미구현을 문서에서 지우거나 응답상 성공으로 감추지 않는다. 필수수명주기 누락과 명시적제외기능을 섞지 않는다.

완료 판정은 R01이 행의 증거를 취합하고 해당 생산/소비 역할·R05가 영향범위를 확인한 뒤 수행한다. J01~J03, 실제배포/필수시나리오 미실행, 반복실패가 남아 있는 상태에서 전체설계완료로 표시하지 않는다. 정상305·support532의 기존성공과 과거실패이력은 그대로 보존한다.

## 12. 변경 이력

| 버전 | 변경 |
| --- | --- |
| v1.0 / 2026-11-06 | 설계·원본코드·main/VM·대표실측·R05원격보고서를 요구별로 매핑. Jira J01~J03을 상세대조와 연결. 새 VM/업무 변경 없이 정적·기존증거 검토로 작성 |
