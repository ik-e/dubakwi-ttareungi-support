# 저장소 워크플로우 실제 노드·연결

2026-11-09 최종 로컬 JSON을 직접 읽은 목록이다. 설계용 단계명과 실제 노드명을 구분한다. JSON 부록의 SHA-256은 UTF-8 BOM 제거·CRLF→LF 정규화 후 계산한 값이다. VM의 별도 PR36 ID/URL/Credential 치환 및 전체 source 동일성을 이 목록으로 보증하지 않는다.

## dubakwi-dlq.json

[JSON 원본](../../../workflows/dubakwi-dlq.json) · 노드 6 · 연결 5

| 실제 노드명 | 종류 |
| --- | --- |
| D01 DLQ 명령 수신 | n8n-nodes-base.executeWorkflowTrigger |
| D02 계약 검사와 안전 차단 | n8n-nodes-base.code |
| D03 실제 DLQ 호출 여부 | n8n-nodes-base.if |
| D04 PostgreSQL DLQ 저장 | n8n-nodes-base.postgres |
| D05 DLQ 결과 정규화 | n8n-nodes-base.code |
| D06 계약 거절 반환 | n8n-nodes-base.noOp |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| D01 DLQ 명령 수신 | main/0 | D02 계약 검사와 안전 차단 | main/0 |
| D02 계약 검사와 안전 차단 | main/0 | D03 실제 DLQ 호출 여부 | main/0 |
| D03 실제 DLQ 호출 여부 | main/0 | D04 PostgreSQL DLQ 저장 | main/0 |
| D03 실제 DLQ 호출 여부 | main/1 | D06 계약 거절 반환 | main/0 |
| D04 PostgreSQL DLQ 저장 | main/0 | D05 DLQ 결과 정규화 | main/0 |

## dubakwi-errors.json

[JSON 원본](../../../workflows/dubakwi-errors.json) · 노드 9 · 연결 8

| 실제 노드명 | 종류 |
| --- | --- |
| E01 예상 밖 오류 수신 | n8n-nodes-base.errorTrigger |
| E02 오류 가림과 안전 차단 | n8n-nodes-base.code |
| E03 저장 설정 확인 | n8n-nodes-base.if |
| E05 중단 요청 상태 확인 | n8n-nodes-base.executeWorkflow |
| E06 DLQ 요청 구성 | n8n-nodes-base.code |
| E04 오류 보관 | n8n-nodes-base.executeWorkflow |
| E08 오류 경로 안전 종료 | n8n-nodes-base.code |
| E07 설정 미완료 안전 종료 | n8n-nodes-base.code |
| E09 운영 실패 알림 | n8n-nodes-base.httpRequest |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| E01 예상 밖 오류 수신 | main/0 | E02 오류 가림과 안전 차단 | main/0 |
| E02 오류 가림과 안전 차단 | main/0 | E03 저장 설정 확인 | main/0 |
| E03 저장 설정 확인 | main/0 | E05 중단 요청 상태 확인 | main/0 |
| E03 저장 설정 확인 | main/1 | E07 설정 미완료 안전 종료 | main/0 |
| E05 중단 요청 상태 확인 | main/0 | E06 DLQ 요청 구성 | main/0 |
| E06 DLQ 요청 구성 | main/0 | E04 오류 보관 | main/0 |
| E04 오류 보관 | main/0 | E09 운영 실패 알림 | main/0 |
| E09 운영 실패 알림 | main/0 | E08 오류 경로 안전 종료 | main/0 |

## dubakwi-handoff.json

[JSON 원본](../../../workflows/dubakwi-handoff.json) · 노드 71 · 연결 91

| 실제 노드명 | 종류 |
| --- | --- |
| H01 도구 요청 | n8n-nodes-base.webhook |
| H02 요청 계약 검사 | n8n-nodes-base.code |
| H03 저장 준비 필요 | n8n-nodes-base.if |
| H14 Jira 전 상태 저장 | n8n-nodes-base.executeWorkflow |
| H13 도구 응답 | n8n-nodes-base.respondToWebhook |
| H21 조회 실행 여부 | n8n-nodes-base.if |
| H04 본인 기록 조회 | n8n-nodes-base.httpRequest |
| H22 조회 결과 정규화 | n8n-nodes-base.code |
| H15 저장 결과 판정 | n8n-nodes-base.code |
| H16 Jira 실행 허용 | n8n-nodes-base.if |
| H23 중복 조회 준비 | n8n-nodes-base.code |
| H29 Jira 기존 건 조회 | n8n-nodes-base.httpRequest |
| H24 생성 판정 | n8n-nodes-base.code |
| H25 생성 필요 | n8n-nodes-base.if |
| H05 Jira 티켓 생성 | n8n-nodes-base.httpRequest |
| H06 티켓 식별 확인 | n8n-nodes-base.code |
| H26 티켓 연결 필요 | n8n-nodes-base.if |
| H30 연결 입력 구성 | n8n-nodes-base.code |
| H17 티켓 연결 저장 | n8n-nodes-base.executeWorkflow |
| H18 연결 저장 판정 | n8n-nodes-base.code |
| H07 종료 분기 | n8n-nodes-base.if |
| H27 이관 분기 | n8n-nodes-base.if |
| H31 종료 전환 조회 준비 | n8n-nodes-base.code |
| H32 Jira 전환 조회 | n8n-nodes-base.httpRequest |
| H33 종료 계획 | n8n-nodes-base.code |
| H34 종료 실행 가능 | n8n-nodes-base.if |
| H08 Jira 안내 종료 | n8n-nodes-base.httpRequest |
| H36 종료 판정 | n8n-nodes-base.code |
| H37 담당 후보 조회 준비 | n8n-nodes-base.code |
| H38 Jira 담당 후보 조회 | n8n-nodes-base.httpRequest |
| H39 배정 계획 | n8n-nodes-base.code |
| H40 배정 실행 가능 | n8n-nodes-base.if |
| H09 Jira 맥락 저장·배정 | n8n-nodes-base.httpRequest |
| H42 배정 판정 | n8n-nodes-base.code |
| H10 배정 확인 | n8n-nodes-base.if |
| H19 알림 의도 저장 | n8n-nodes-base.executeWorkflow |
| H20 알림 실행 허용 | n8n-nodes-base.code |
| H43 알림 실행 허용 | n8n-nodes-base.if |
| H11 담당 알림 | n8n-nodes-base.httpRequest |
| H44 알림 판정 | n8n-nodes-base.code |
| H49 알림 성공 표식 필요 | n8n-nodes-base.if |
| H50 Jira 알림 성공 표식 | n8n-nodes-base.httpRequest |
| H51 알림 성공 표식 판정 | n8n-nodes-base.code |
| H12 티켓 결과 구성 | n8n-nodes-base.code |
| H48 보완 횟수 갱신 필요 | n8n-nodes-base.if |
| H45 보완 횟수 갱신 준비 | n8n-nodes-base.code |
| H46 Jira 보완 횟수 저장 | n8n-nodes-base.httpRequest |
| H47 보완 횟수 판정 | n8n-nodes-base.code |
| H52 검증 문맥 조회 준비 | n8n-nodes-base.code |
| H63 문맥 읽기 허용 | n8n-nodes-base.if |
| H53 Jira 문맥 연결 조회 | n8n-nodes-base.httpRequest |
| H54 문맥 댓글 조회 준비 | n8n-nodes-base.code |
| H55 Jira 전체 문맥 댓글 조회 | n8n-nodes-base.httpRequest |
| H56 문맥 검증과 조건부 기록 계획 | n8n-nodes-base.code |
| H57 새 문맥 기록 필요 | n8n-nodes-base.if |
| H58 Jira 가린 문맥 저장 | n8n-nodes-base.httpRequest |
| H59 저장 문맥 재조회 준비 | n8n-nodes-base.code |
| H60 Jira 저장 문맥 재조회 | n8n-nodes-base.httpRequest |
| H61 문맥 저장 재조회 판정 | n8n-nodes-base.code |
| H70 외부 쓰기 마감 검사 H05 | n8n-nodes-base.code |
| H71 외부 쓰기 허용 H05 | n8n-nodes-base.if |
| H72 외부 쓰기 마감 검사 H08 | n8n-nodes-base.code |
| H73 외부 쓰기 허용 H08 | n8n-nodes-base.if |
| H74 외부 쓰기 마감 검사 H09 | n8n-nodes-base.code |
| H75 외부 쓰기 허용 H09 | n8n-nodes-base.if |
| H76 외부 쓰기 마감 검사 H11 | n8n-nodes-base.code |
| H77 외부 쓰기 허용 H11 | n8n-nodes-base.if |
| H78 외부 쓰기 마감 검사 H46 | n8n-nodes-base.code |
| H79 외부 쓰기 허용 H46 | n8n-nodes-base.if |
| H80 외부 쓰기 마감 검사 H50 | n8n-nodes-base.code |
| H81 외부 쓰기 허용 H50 | n8n-nodes-base.if |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| H01 도구 요청 | main/0 | H02 요청 계약 검사 | main/0 |
| H02 요청 계약 검사 | main/0 | H03 저장 준비 필요 | main/0 |
| H03 저장 준비 필요 | main/0 | H14 Jira 전 상태 저장 | main/0 |
| H03 저장 준비 필요 | main/1 | H21 조회 실행 여부 | main/0 |
| H14 Jira 전 상태 저장 | main/0 | H15 저장 결과 판정 | main/0 |
| H21 조회 실행 여부 | main/0 | H04 본인 기록 조회 | main/0 |
| H21 조회 실행 여부 | main/1 | H13 도구 응답 | main/0 |
| H04 본인 기록 조회 | main/0 | H22 조회 결과 정규화 | main/0 |
| H22 조회 결과 정규화 | main/0 | H13 도구 응답 | main/0 |
| H15 저장 결과 판정 | main/0 | H16 Jira 실행 허용 | main/0 |
| H16 Jira 실행 허용 | main/0 | H23 중복 조회 준비 | main/0 |
| H16 Jira 실행 허용 | main/1 | H13 도구 응답 | main/0 |
| H23 중복 조회 준비 | main/0 | H29 Jira 기존 건 조회 | main/0 |
| H29 Jira 기존 건 조회 | main/0 | H24 생성 판정 | main/0 |
| H24 생성 판정 | main/0 | H25 생성 필요 | main/0 |
| H25 생성 필요 | main/0 | H70 외부 쓰기 마감 검사 H05 | main/0 |
| H25 생성 필요 | main/1 | H06 티켓 식별 확인 | main/0 |
| H05 Jira 티켓 생성 | main/0 | H06 티켓 식별 확인 | main/0 |
| H06 티켓 식별 확인 | main/0 | H26 티켓 연결 필요 | main/0 |
| H26 티켓 연결 필요 | main/0 | H30 연결 입력 구성 | main/0 |
| H26 티켓 연결 필요 | main/1 | H12 티켓 결과 구성 | main/0 |
| H30 연결 입력 구성 | main/0 | H17 티켓 연결 저장 | main/0 |
| H17 티켓 연결 저장 | main/0 | H18 연결 저장 판정 | main/0 |
| H18 연결 저장 판정 | main/0 | H52 검증 문맥 조회 준비 | main/0 |
| H07 종료 분기 | main/0 | H31 종료 전환 조회 준비 | main/0 |
| H07 종료 분기 | main/1 | H27 이관 분기 | main/0 |
| H27 이관 분기 | main/0 | H37 담당 후보 조회 준비 | main/0 |
| H27 이관 분기 | main/1 | H48 보완 횟수 갱신 필요 | main/0 |
| H31 종료 전환 조회 준비 | main/0 | H32 Jira 전환 조회 | main/0 |
| H32 Jira 전환 조회 | main/0 | H33 종료 계획 | main/0 |
| H33 종료 계획 | main/0 | H34 종료 실행 가능 | main/0 |
| H34 종료 실행 가능 | main/0 | H72 외부 쓰기 마감 검사 H08 | main/0 |
| H34 종료 실행 가능 | main/1 | H12 티켓 결과 구성 | main/0 |
| H08 Jira 안내 종료 | main/0 | H36 종료 판정 | main/0 |
| H36 종료 판정 | main/0 | H12 티켓 결과 구성 | main/0 |
| H37 담당 후보 조회 준비 | main/0 | H38 Jira 담당 후보 조회 | main/0 |
| H38 Jira 담당 후보 조회 | main/0 | H39 배정 계획 | main/0 |
| H39 배정 계획 | main/0 | H40 배정 실행 가능 | main/0 |
| H40 배정 실행 가능 | main/0 | H74 외부 쓰기 마감 검사 H09 | main/0 |
| H40 배정 실행 가능 | main/1 | H48 보완 횟수 갱신 필요 | main/0 |
| H09 Jira 맥락 저장·배정 | main/0 | H42 배정 판정 | main/0 |
| H42 배정 판정 | main/0 | H10 배정 확인 | main/0 |
| H10 배정 확인 | main/0 | H19 알림 의도 저장 | main/0 |
| H10 배정 확인 | main/1 | H12 티켓 결과 구성 | main/0 |
| H19 알림 의도 저장 | main/0 | H20 알림 실행 허용 | main/0 |
| H20 알림 실행 허용 | main/0 | H43 알림 실행 허용 | main/0 |
| H43 알림 실행 허용 | main/0 | H76 외부 쓰기 마감 검사 H11 | main/0 |
| H43 알림 실행 허용 | main/1 | H12 티켓 결과 구성 | main/0 |
| H11 담당 알림 | main/0 | H44 알림 판정 | main/0 |
| H44 알림 판정 | main/0 | H49 알림 성공 표식 필요 | main/0 |
| H49 알림 성공 표식 필요 | main/0 | H80 외부 쓰기 마감 검사 H50 | main/0 |
| H49 알림 성공 표식 필요 | main/1 | H12 티켓 결과 구성 | main/0 |
| H50 Jira 알림 성공 표식 | main/0 | H51 알림 성공 표식 판정 | main/0 |
| H51 알림 성공 표식 판정 | main/0 | H12 티켓 결과 구성 | main/0 |
| H12 티켓 결과 구성 | main/0 | H13 도구 응답 | main/0 |
| H48 보완 횟수 갱신 필요 | main/0 | H45 보완 횟수 갱신 준비 | main/0 |
| H48 보완 횟수 갱신 필요 | main/1 | H12 티켓 결과 구성 | main/0 |
| H45 보완 횟수 갱신 준비 | main/0 | H78 외부 쓰기 마감 검사 H46 | main/0 |
| H46 Jira 보완 횟수 저장 | main/0 | H47 보완 횟수 판정 | main/0 |
| H47 보완 횟수 판정 | main/0 | H12 티켓 결과 구성 | main/0 |
| H52 검증 문맥 조회 준비 | main/0 | H63 문맥 읽기 허용 | main/0 |
| H63 문맥 읽기 허용 | main/0 | H53 Jira 문맥 연결 조회 | main/0 |
| H63 문맥 읽기 허용 | main/1 | H12 티켓 결과 구성 | main/0 |
| H53 Jira 문맥 연결 조회 | main/0 | H54 문맥 댓글 조회 준비 | main/0 |
| H54 문맥 댓글 조회 준비 | main/0 | H55 Jira 전체 문맥 댓글 조회 | main/0 |
| H55 Jira 전체 문맥 댓글 조회 | main/0 | H56 문맥 검증과 조건부 기록 계획 | main/0 |
| H56 문맥 검증과 조건부 기록 계획 | main/0 | H57 새 문맥 기록 필요 | main/0 |
| H57 새 문맥 기록 필요 | main/0 | H58 Jira 가린 문맥 저장 | main/0 |
| H57 새 문맥 기록 필요 | main/1 | H07 종료 분기 | main/0 |
| H58 Jira 가린 문맥 저장 | main/0 | H59 저장 문맥 재조회 준비 | main/0 |
| H59 저장 문맥 재조회 준비 | main/0 | H60 Jira 저장 문맥 재조회 | main/0 |
| H60 Jira 저장 문맥 재조회 | main/0 | H61 문맥 저장 재조회 판정 | main/0 |
| H61 문맥 저장 재조회 판정 | main/0 | H07 종료 분기 | main/0 |
| H70 외부 쓰기 마감 검사 H05 | main/0 | H71 외부 쓰기 허용 H05 | main/0 |
| H71 외부 쓰기 허용 H05 | main/0 | H05 Jira 티켓 생성 | main/0 |
| H71 외부 쓰기 허용 H05 | main/1 | H12 티켓 결과 구성 | main/0 |
| H72 외부 쓰기 마감 검사 H08 | main/0 | H73 외부 쓰기 허용 H08 | main/0 |
| H73 외부 쓰기 허용 H08 | main/0 | H08 Jira 안내 종료 | main/0 |
| H73 외부 쓰기 허용 H08 | main/1 | H12 티켓 결과 구성 | main/0 |
| H74 외부 쓰기 마감 검사 H09 | main/0 | H75 외부 쓰기 허용 H09 | main/0 |
| H75 외부 쓰기 허용 H09 | main/0 | H09 Jira 맥락 저장·배정 | main/0 |
| H75 외부 쓰기 허용 H09 | main/1 | H12 티켓 결과 구성 | main/0 |
| H76 외부 쓰기 마감 검사 H11 | main/0 | H77 외부 쓰기 허용 H11 | main/0 |
| H77 외부 쓰기 허용 H11 | main/0 | H11 담당 알림 | main/0 |
| H77 외부 쓰기 허용 H11 | main/1 | H12 티켓 결과 구성 | main/0 |
| H78 외부 쓰기 마감 검사 H46 | main/0 | H79 외부 쓰기 허용 H46 | main/0 |
| H79 외부 쓰기 허용 H46 | main/0 | H46 Jira 보완 횟수 저장 | main/0 |
| H79 외부 쓰기 허용 H46 | main/1 | H12 티켓 결과 구성 | main/0 |
| H80 외부 쓰기 마감 검사 H50 | main/0 | H81 외부 쓰기 허용 H50 | main/0 |
| H81 외부 쓰기 허용 H50 | main/0 | H50 Jira 알림 성공 표식 | main/0 |
| H81 외부 쓰기 허용 H50 | main/1 | H12 티켓 결과 구성 | main/0 |

## dubakwi-index.json

[JSON 원본](../../../workflows/dubakwi-index.json) · 노드 11 · 연결 14

| 실제 노드명 | 종류 |
| --- | --- |
| Manual | n8n-nodes-base.manualTrigger |
| Prepare chunks | n8n-nodes-base.code |
| One chunk | n8n-nodes-base.splitInBatches |
| Insert chunk | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Embeddings | @n8n/n8n-nodes-langchain.embeddingsOpenAi |
| Loader | @n8n/n8n-nodes-langchain.documentDefaultDataLoader |
| Start marker | n8n-nodes-base.code |
| Mark building | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Finish marker | n8n-nodes-base.code |
| Mark ready | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Readiness loader | @n8n/n8n-nodes-langchain.documentDefaultDataLoader |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| Manual | main/0 | Start marker | main/0 |
| Prepare chunks | main/0 | One chunk | main/0 |
| One chunk | main/0 | Finish marker | main/0 |
| One chunk | main/1 | Insert chunk | main/0 |
| Insert chunk | main/0 | One chunk | main/0 |
| Embeddings | ai_embedding/0 | Insert chunk | ai_embedding/0 |
| Embeddings | ai_embedding/0 | Mark building | ai_embedding/0 |
| Embeddings | ai_embedding/0 | Mark ready | ai_embedding/0 |
| Loader | ai_document/0 | Insert chunk | ai_document/0 |
| Start marker | main/0 | Mark building | main/0 |
| Mark building | main/0 | Prepare chunks | main/0 |
| Finish marker | main/0 | Mark ready | main/0 |
| Readiness loader | ai_document/0 | Mark building | ai_document/0 |
| Readiness loader | ai_document/0 | Mark ready | ai_document/0 |

## dubakwi-recovery-operator.json

[JSON 원본](../../../workflows/dubakwi-recovery-operator.json) · 노드 13 · 연결 13

| 실제 노드명 | 종류 |
| --- | --- |
| R01 수동 운영자 시작 | n8n-nodes-base.manualTrigger |
| R01a 복구 명령 입력 | n8n-nodes-base.set |
| R02 복구 입력 검증 | n8n-nodes-base.code |
| R03 실행 허용 | n8n-nodes-base.if |
| R03a 조회 전용 분기 | n8n-nodes-base.if |
| R04 제한 복구 함수 호출 | n8n-nodes-base.postgres |
| R05 DLQ 읽기 전용 조회 | n8n-nodes-base.postgres |
| R06 조회 결과 정리 | n8n-nodes-base.code |
| R07 연결된 Jira 있음 | n8n-nodes-base.if |
| R08 Jira 상태·담당 조회 | n8n-nodes-base.httpRequest |
| R09 Jira 결과 정리 | n8n-nodes-base.code |
| R10 조회 결과 반환 | n8n-nodes-base.code |
| R11 입력 거절 | n8n-nodes-base.noOp |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| R01 수동 운영자 시작 | main/0 | R01a 복구 명령 입력 | main/0 |
| R01a 복구 명령 입력 | main/0 | R02 복구 입력 검증 | main/0 |
| R02 복구 입력 검증 | main/0 | R03 실행 허용 | main/0 |
| R03 실행 허용 | main/0 | R03a 조회 전용 분기 | main/0 |
| R03 실행 허용 | main/1 | R11 입력 거절 | main/0 |
| R03a 조회 전용 분기 | main/0 | R05 DLQ 읽기 전용 조회 | main/0 |
| R03a 조회 전용 분기 | main/1 | R04 제한 복구 함수 호출 | main/0 |
| R05 DLQ 읽기 전용 조회 | main/0 | R06 조회 결과 정리 | main/0 |
| R06 조회 결과 정리 | main/0 | R07 연결된 Jira 있음 | main/0 |
| R07 연결된 Jira 있음 | main/0 | R08 Jira 상태·담당 조회 | main/0 |
| R07 연결된 Jira 있음 | main/1 | R10 조회 결과 반환 | main/0 |
| R08 Jira 상태·담당 조회 | main/0 | R09 Jira 결과 정리 | main/0 |
| R09 Jira 결과 정리 | main/0 | R10 조회 결과 반환 | main/0 |

## dubakwi-search.json

[JSON 원본](../../../workflows/dubakwi-search.json) · 노드 19 · 연결 25

| 실제 노드명 | 종류 |
| --- | --- |
| Webhook | n8n-nodes-base.webhook |
| Validate request | n8n-nodes-base.code |
| Valid and enabled | n8n-nodes-base.if |
| Skip or error | n8n-nodes-base.code |
| Search public | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Is staff | n8n-nodes-base.if |
| Search restricted | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Staff result | n8n-nodes-base.code |
| Citizen result | n8n-nodes-base.code |
| Respond | n8n-nodes-base.respondToWebhook |
| Embeddings | @n8n/n8n-nodes-langchain.embeddingsOpenAi |
| Collect public | n8n-nodes-base.code |
| Read readiness | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Initial readiness | n8n-nodes-base.code |
| Is index ready | n8n-nodes-base.if |
| Index unavailable | n8n-nodes-base.code |
| Collect restricted | n8n-nodes-base.code |
| Final readiness staff | @n8n/n8n-nodes-langchain.vectorStoreInMemory |
| Final readiness citizen | @n8n/n8n-nodes-langchain.vectorStoreInMemory |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| Webhook | main/0 | Validate request | main/0 |
| Validate request | main/0 | Valid and enabled | main/0 |
| Valid and enabled | main/0 | Read readiness | main/0 |
| Valid and enabled | main/1 | Skip or error | main/0 |
| Skip or error | main/0 | Respond | main/0 |
| Search public | main/0 | Collect public | main/0 |
| Is staff | main/0 | Search restricted | main/0 |
| Is staff | main/1 | Final readiness citizen | main/0 |
| Search restricted | main/0 | Collect restricted | main/0 |
| Staff result | main/0 | Respond | main/0 |
| Citizen result | main/0 | Respond | main/0 |
| Embeddings | ai_embedding/0 | Search public | ai_embedding/0 |
| Embeddings | ai_embedding/0 | Search restricted | ai_embedding/0 |
| Embeddings | ai_embedding/0 | Read readiness | ai_embedding/0 |
| Embeddings | ai_embedding/0 | Final readiness staff | ai_embedding/0 |
| Embeddings | ai_embedding/0 | Final readiness citizen | ai_embedding/0 |
| Collect public | main/0 | Is staff | main/0 |
| Read readiness | main/0 | Initial readiness | main/0 |
| Initial readiness | main/0 | Is index ready | main/0 |
| Is index ready | main/0 | Search public | main/0 |
| Is index ready | main/1 | Index unavailable | main/0 |
| Index unavailable | main/0 | Respond | main/0 |
| Collect restricted | main/0 | Final readiness staff | main/0 |
| Final readiness staff | main/0 | Staff result | main/0 |
| Final readiness citizen | main/0 | Citizen result | main/0 |

## dubakwi-state.json

[JSON 원본](../../../workflows/dubakwi-state.json) · 노드 31 · 연결 39

| 실제 노드명 | 종류 |
| --- | --- |
| S01 상태 명령 수신 | n8n-nodes-base.executeWorkflowTrigger |
| S02 계약 검사와 안전 차단 | n8n-nodes-base.code |
| S03 실제 저장 호출 여부 | n8n-nodes-base.if |
| S04 PostgreSQL 상태 저장 | n8n-nodes-base.postgres |
| S05 저장 결과 정규화 | n8n-nodes-base.code |
| S06 계약 거절 반환 | n8n-nodes-base.noOp |
| S07 저장 요청 여부 | n8n-nodes-base.if |
| S08 Jira 문맥 확인 요청 구성 | n8n-nodes-base.code |
| S09 Jira 문맥 확인 | n8n-nodes-base.httpRequest |
| S10 문맥 확인 판정 | n8n-nodes-base.code |
| S11 확인 통과 여부 | n8n-nodes-base.if |
| S12 보완 확인 필요 | n8n-nodes-base.if |
| S13 보완 case 조회 | n8n-nodes-base.postgres |
| S14 보완 대상 판정 | n8n-nodes-base.code |
| S15 Jira 확인 필요 | n8n-nodes-base.if |
| S16 Jira 보완 case 확인 | n8n-nodes-base.httpRequest |
| S17 Jira 열림 판정 | n8n-nodes-base.code |
| S18 보완 시작 가능 | n8n-nodes-base.if |
| S19 보완 처리권 획득 | n8n-nodes-base.postgres |
| S20 보완 결과 정규화 | n8n-nodes-base.code |
| S21 보완 문맥 댓글 조회 준비 | n8n-nodes-base.code |
| S22 Jira 보완 전체 댓글 조회 | n8n-nodes-base.httpRequest |
| S23 최종 문맥 댓글 조회 준비 | n8n-nodes-base.code |
| S24 Jira 최종 전체 댓글 조회 | n8n-nodes-base.httpRequest |
| S25 최종 문맥 수정 필요 | n8n-nodes-base.if |
| S26 Jira 최종 문맥 저장 | n8n-nodes-base.httpRequest |
| S27 최종 저장 재조회 준비 | n8n-nodes-base.code |
| S28 Jira 최종 저장 재조회 | n8n-nodes-base.httpRequest |
| S29 최종 저장 일치 판정 | n8n-nodes-base.code |
| S30 최종 저장 확인 통과 | n8n-nodes-base.if |
| S31 최종 문맥 읽기 허용 | n8n-nodes-base.if |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| S01 상태 명령 수신 | main/0 | S02 계약 검사와 안전 차단 | main/0 |
| S02 계약 검사와 안전 차단 | main/0 | S03 실제 저장 호출 여부 | main/0 |
| S03 실제 저장 호출 여부 | main/0 | S07 저장 요청 여부 | main/0 |
| S03 실제 저장 호출 여부 | main/1 | S06 계약 거절 반환 | main/0 |
| S04 PostgreSQL 상태 저장 | main/0 | S05 저장 결과 정규화 | main/0 |
| S07 저장 요청 여부 | main/0 | S08 Jira 문맥 확인 요청 구성 | main/0 |
| S07 저장 요청 여부 | main/1 | S04 PostgreSQL 상태 저장 | main/0 |
| S08 Jira 문맥 확인 요청 구성 | main/0 | S31 최종 문맥 읽기 허용 | main/0 |
| S09 Jira 문맥 확인 | main/0 | S23 최종 문맥 댓글 조회 준비 | main/0 |
| S10 문맥 확인 판정 | main/0 | S11 확인 통과 여부 | main/0 |
| S11 확인 통과 여부 | main/0 | S04 PostgreSQL 상태 저장 | main/0 |
| S11 확인 통과 여부 | main/1 | S25 최종 문맥 수정 필요 | main/0 |
| S05 저장 결과 정규화 | main/0 | S12 보완 확인 필요 | main/0 |
| S12 보완 확인 필요 | main/0 | S13 보완 case 조회 | main/0 |
| S12 보완 확인 필요 | main/1 | S06 계약 거절 반환 | main/0 |
| S13 보완 case 조회 | main/0 | S14 보완 대상 판정 | main/0 |
| S14 보완 대상 판정 | main/0 | S15 Jira 확인 필요 | main/0 |
| S15 Jira 확인 필요 | main/0 | S16 Jira 보완 case 확인 | main/0 |
| S15 Jira 확인 필요 | main/1 | S06 계약 거절 반환 | main/0 |
| S16 Jira 보완 case 확인 | main/0 | S21 보완 문맥 댓글 조회 준비 | main/0 |
| S17 Jira 열림 판정 | main/0 | S18 보완 시작 가능 | main/0 |
| S18 보완 시작 가능 | main/0 | S19 보완 처리권 획득 | main/0 |
| S18 보완 시작 가능 | main/1 | S06 계약 거절 반환 | main/0 |
| S19 보완 처리권 획득 | main/0 | S20 보완 결과 정규화 | main/0 |
| S20 보완 결과 정규화 | main/0 | S06 계약 거절 반환 | main/0 |
| S21 보완 문맥 댓글 조회 준비 | main/0 | S22 Jira 보완 전체 댓글 조회 | main/0 |
| S22 Jira 보완 전체 댓글 조회 | main/0 | S17 Jira 열림 판정 | main/0 |
| S23 최종 문맥 댓글 조회 준비 | main/0 | S24 Jira 최종 전체 댓글 조회 | main/0 |
| S24 Jira 최종 전체 댓글 조회 | main/0 | S10 문맥 확인 판정 | main/0 |
| S25 최종 문맥 수정 필요 | main/0 | S26 Jira 최종 문맥 저장 | main/0 |
| S25 최종 문맥 수정 필요 | main/1 | S06 계약 거절 반환 | main/0 |
| S26 Jira 최종 문맥 저장 | main/0 | S27 최종 저장 재조회 준비 | main/0 |
| S27 최종 저장 재조회 준비 | main/0 | S28 Jira 최종 저장 재조회 | main/0 |
| S28 Jira 최종 저장 재조회 | main/0 | S29 최종 저장 일치 판정 | main/0 |
| S29 최종 저장 일치 판정 | main/0 | S30 최종 저장 확인 통과 | main/0 |
| S30 최종 저장 확인 통과 | main/0 | S04 PostgreSQL 상태 저장 | main/0 |
| S30 최종 저장 확인 통과 | main/1 | S06 계약 거절 반환 | main/0 |
| S31 최종 문맥 읽기 허용 | main/0 | S09 Jira 문맥 확인 | main/0 |
| S31 최종 문맥 읽기 허용 | main/1 | S06 계약 거절 반환 | main/0 |

## dubakwi-support.json

[JSON 원본](../../../workflows/dubakwi-support.json) · 노드 54 · 연결 75

| 실제 노드명 | 종류 |
| --- | --- |
| B01 문의 수신 | n8n-nodes-base.webhook |
| B02 입력 검사 | n8n-nodes-base.code |
| B03 입력 통과 | n8n-nodes-base.if |
| B04 사용자 확인 | n8n-nodes-base.httpRequest |
| B05 등록·권한 확인 | n8n-nodes-base.code |
| B06 사용자 통과 | n8n-nodes-base.if |
| B33 응답 구성 | n8n-nodes-base.code |
| B35 메타 기록 | n8n-nodes-base.httpRequest |
| B36 응답 | n8n-nodes-base.respondToWebhook |
| B07a BeginRequest 구성 | n8n-nodes-base.set |
| B07 요청 문맥 읽기 | n8n-nodes-base.executeWorkflow |
| B08 문맥 정리 | n8n-nodes-base.code |
| B09 신규·재전송 분기 | n8n-nodes-base.switch |
| B10 문의 분류 | @n8n/n8n-nodes-langchain.chainLlm |
| L01 분류 모델 | @n8n/n8n-nodes-langchain.lmChatOpenAi |
| B11 분류 판정 | n8n-nodes-base.code |
| B12 업무 분기 | n8n-nodes-base.switch |
| B13 검색·조회 준비 | n8n-nodes-base.code |
| B14 RAG 검색 | n8n-nodes-base.httpRequest |
| B15 본인 기록 조회 | n8n-nodes-base.httpRequest |
| B16 검색·조회 모으기 | n8n-nodes-base.merge |
| B17 근거 판정 | n8n-nodes-base.code |
| B18 답변 경로 | n8n-nodes-base.switch |
| B19 답변 생성 | @n8n/n8n-nodes-langchain.chainLlm |
| L02 답변 모델 | @n8n/n8n-nodes-langchain.lmChatOpenAi |
| B20 답변 검증 | @n8n/n8n-nodes-langchain.chainLlm |
| L03 검증 모델 | @n8n/n8n-nodes-langchain.lmChatOpenAi |
| B21 검증 판정 | n8n-nodes-base.code |
| B22 보완 질문 준비 | n8n-nodes-base.code |
| B23 이관 준비 | n8n-nodes-base.code |
| B24 고정 안내 준비 | n8n-nodes-base.code |
| B25 티켓 요청 준비 | n8n-nodes-base.code |
| B26 티켓 처리 필요 | n8n-nodes-base.if |
| B27 티켓 생성·처리 | n8n-nodes-base.httpRequest |
| B28 티켓 결과 확인 | n8n-nodes-base.code |
| B29 티켓 처리 확인 | n8n-nodes-base.if |
| B30 긴급 후속 필요 | n8n-nodes-base.if |
| B31 결과 저장 준비 | n8n-nodes-base.code |
| B37a 저장 준비 명령 | n8n-nodes-base.set |
| B37 최종 저장 의도 기록 | n8n-nodes-base.executeWorkflow |
| B38 저장 준비 결과 합성 | n8n-nodes-base.code |
| B39 최종 저장 실행 허용 | n8n-nodes-base.if |
| B32a SaveRequest 선택 | n8n-nodes-base.set |
| B32 결과 저장 | n8n-nodes-base.executeWorkflow |
| B34 응답 준비 확인 | n8n-nodes-base.if |
| X01 실패 분류 | n8n-nodes-base.code |
| X06a 실패 상태 명령 | n8n-nodes-base.set |
| X06 실패 상태 저장 | n8n-nodes-base.executeWorkflow |
| X07 실패 기록 결과 합성 | n8n-nodes-base.code |
| X02 실패 부작용 선택 | n8n-nodes-base.switch |
| X03a DLQ 요청 구성 | n8n-nodes-base.set |
| X03 실패 보관 | n8n-nodes-base.executeWorkflow |
| X04 실패 알림 | n8n-nodes-base.httpRequest |
| X05 실패 응답 준비 | n8n-nodes-base.code |

| 시작 | 출력 타입/포트 | 도착 | 입력 타입/포트 |
| --- | --- | --- | --- |
| B01 문의 수신 | main/0 | B02 입력 검사 | main/0 |
| B02 입력 검사 | main/0 | B03 입력 통과 | main/0 |
| B03 입력 통과 | main/0 | B04 사용자 확인 | main/0 |
| B03 입력 통과 | main/1 | B33 응답 구성 | main/0 |
| B04 사용자 확인 | main/0 | B05 등록·권한 확인 | main/0 |
| B05 등록·권한 확인 | main/0 | B06 사용자 통과 | main/0 |
| B06 사용자 통과 | main/0 | B07a BeginRequest 구성 | main/0 |
| B06 사용자 통과 | main/1 | B33 응답 구성 | main/0 |
| B35 메타 기록 | main/0 | B36 응답 | main/0 |
| B07a BeginRequest 구성 | main/0 | B07 요청 문맥 읽기 | main/0 |
| B07 요청 문맥 읽기 | main/0 | B08 문맥 정리 | main/0 |
| B08 문맥 정리 | main/0 | B09 신규·재전송 분기 | main/0 |
| B09 신규·재전송 분기 | main/0 | B10 문의 분류 | main/0 |
| B09 신규·재전송 분기 | main/1 | B33 응답 구성 | main/0 |
| B09 신규·재전송 분기 | main/2 | B33 응답 구성 | main/0 |
| B09 신규·재전송 분기 | main/3 | B33 응답 구성 | main/0 |
| B09 신규·재전송 분기 | main/4 | X01 실패 분류 | main/0 |
| B10 문의 분류 | main/0 | B11 분류 판정 | main/0 |
| B11 분류 판정 | main/0 | B12 업무 분기 | main/0 |
| B12 업무 분기 | main/0 | B13 검색·조회 준비 | main/0 |
| B12 업무 분기 | main/1 | B22 보완 질문 준비 | main/0 |
| B12 업무 분기 | main/2 | B23 이관 준비 | main/0 |
| B12 업무 분기 | main/3 | B23 이관 준비 | main/0 |
| B12 업무 분기 | main/4 | X01 실패 분류 | main/0 |
| B13 검색·조회 준비 | main/0 | B14 RAG 검색 | main/0 |
| B13 검색·조회 준비 | main/0 | B15 본인 기록 조회 | main/0 |
| B14 RAG 검색 | main/0 | B16 검색·조회 모으기 | main/0 |
| B15 본인 기록 조회 | main/0 | B16 검색·조회 모으기 | main/1 |
| B16 검색·조회 모으기 | main/0 | B17 근거 판정 | main/0 |
| B17 근거 판정 | main/0 | B18 답변 경로 | main/0 |
| B18 답변 경로 | main/0 | B19 답변 생성 | main/0 |
| B18 답변 경로 | main/1 | B24 고정 안내 준비 | main/0 |
| B18 답변 경로 | main/2 | B23 이관 준비 | main/0 |
| B18 답변 경로 | main/3 | X01 실패 분류 | main/0 |
| B19 답변 생성 | main/0 | B20 답변 검증 | main/0 |
| B20 답변 검증 | main/0 | B21 검증 판정 | main/0 |
| B21 검증 판정 | main/0 | B25 티켓 요청 준비 | main/0 |
| B22 보완 질문 준비 | main/0 | B25 티켓 요청 준비 | main/0 |
| B23 이관 준비 | main/0 | B25 티켓 요청 준비 | main/0 |
| B24 고정 안내 준비 | main/0 | B25 티켓 요청 준비 | main/0 |
| B25 티켓 요청 준비 | main/0 | B26 티켓 처리 필요 | main/0 |
| B26 티켓 처리 필요 | main/0 | B27 티켓 생성·처리 | main/0 |
| B26 티켓 처리 필요 | main/1 | B31 결과 저장 준비 | main/0 |
| B27 티켓 생성·처리 | main/0 | B28 티켓 결과 확인 | main/0 |
| B28 티켓 결과 확인 | main/0 | B29 티켓 처리 확인 | main/0 |
| B29 티켓 처리 확인 | main/0 | B30 긴급 후속 필요 | main/0 |
| B29 티켓 처리 확인 | main/1 | X01 실패 분류 | main/0 |
| B30 긴급 후속 필요 | main/0 | B13 검색·조회 준비 | main/0 |
| B30 긴급 후속 필요 | main/1 | B31 결과 저장 준비 | main/0 |
| B31 결과 저장 준비 | main/0 | B37a 저장 준비 명령 | main/0 |
| B37a 저장 준비 명령 | main/0 | B37 최종 저장 의도 기록 | main/0 |
| B37 최종 저장 의도 기록 | main/0 | B38 저장 준비 결과 합성 | main/0 |
| B38 저장 준비 결과 합성 | main/0 | B39 최종 저장 실행 허용 | main/0 |
| B39 최종 저장 실행 허용 | main/0 | B32a SaveRequest 선택 | main/0 |
| B39 최종 저장 실행 허용 | main/1 | X01 실패 분류 | main/0 |
| B32a SaveRequest 선택 | main/0 | B32 결과 저장 | main/0 |
| B32 결과 저장 | main/0 | B33 응답 구성 | main/0 |
| B33 응답 구성 | main/0 | B34 응답 준비 확인 | main/0 |
| B34 응답 준비 확인 | main/0 | B35 메타 기록 | main/0 |
| B34 응답 준비 확인 | main/1 | X01 실패 분류 | main/0 |
| X01 실패 분류 | main/0 | X06a 실패 상태 명령 | main/0 |
| X06a 실패 상태 명령 | main/0 | X06 실패 상태 저장 | main/0 |
| X06 실패 상태 저장 | main/0 | X07 실패 기록 결과 합성 | main/0 |
| X07 실패 기록 결과 합성 | main/0 | X02 실패 부작용 선택 | main/0 |
| X02 실패 부작용 선택 | main/0 | X03a DLQ 요청 구성 | main/0 |
| X02 실패 부작용 선택 | main/1 | X04 실패 알림 | main/0 |
| X02 실패 부작용 선택 | main/2 | X05 실패 응답 준비 | main/0 |
| X02 실패 부작용 선택 | main/3 | X05 실패 응답 준비 | main/0 |
| X03a DLQ 요청 구성 | main/0 | X03 실패 보관 | main/0 |
| X03 실패 보관 | main/0 | X04 실패 알림 | main/0 |
| X04 실패 알림 | main/0 | X05 실패 응답 준비 | main/0 |
| X05 실패 응답 준비 | main/0 | B33 응답 구성 | main/0 |
| L01 분류 모델 | ai_languageModel/0 | B10 문의 분류 | ai_languageModel/0 |
| L02 답변 모델 | ai_languageModel/0 | B19 답변 생성 | ai_languageModel/0 |
| L03 검증 모델 | ai_languageModel/0 | B20 답변 검증 | ai_languageModel/0 |
