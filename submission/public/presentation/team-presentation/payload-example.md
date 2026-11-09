# 검색 연결의 필드와 변환

기준: 2026-11-08 저장소 `workflows/dubakwi-support.json`의 B13·B14·B16·B17과 워크플로우 설계서 6.1. 아래 값은 설명용 가상 입력이며 VM 실행 로그가 아니다. 현재 저장소와 VM 전체 버전 일치는 별도 확인 항목이다.

## 연결과 인증

B13이 서버에서 확인한 actor.access_levels와 요청 문맥으로 search_request를 만든다. B14는 해당 객체를 JSON 본문으로 직렬화해 Header Auth가 설정된 검색 경로에 POST한다. 인증값은 n8n Credential에서 공급하며 예시에 포함하지 않는다.

B16은 검색과 본인 조회의 두 응답을 합친다. 응답 봉투·권한 검증과 다음 경로 판정은 **B17**이 수행한다. B16 자체가 근거 품질을 판정하는 것으로 설명하지 않는다.

## 필수·선택 필드

| 객체 | 필수 | 선택 또는 주의 |
| --- | --- | --- |
| SearchRequest | request_id, enabled, query, access_levels, deadline_at | 스키마의 별도 선택 필드 없음. 권한·검색 활성화는 서버 결정 |
| SearchResult | request_id, status, evidence, error_code | status는 ok/empty/skipped/error. error_code는 null도 필수 값 |
| Evidence | doc, section, chunk_id, text, score, access_level, version | source_url, applies_to, source_checked_at 선택 |

## 값이 변하는 예시

B14 응답의 예시:

```json
{"statusCode":200,"body":{"request_id":"demo-empty-01","status":"empty","evidence":[],"error_code":null}}
```

B15 조회는 비활성화된 사례여서 `status=skipped`, `record=null` 응답이라고 가정한다. B16이 두 응답을 모은 뒤 B17은 상태 코드, request_id 일치, 근거 배열과 권한을 검사한다. 검색을 수행했지만 근거가 없는 이 예시의 판정은 다음과 같다.

```json
{"search":{"status":"empty","evidence":[],"error_code":null},"answer_plan":"handoff","reason":"no_evidence"}
```

이것은 B17 결과 객체 중 설명에 필요한 필드만 발췌한 것이다. 같은 문맥의 나머지 필드를 삭제하는 변환이 아니다.

## 서로 다른 빈 결과

- empty: 검색했으나 근거 없음. 답변을 추측하지 않고 이관 경로를 선택한다.
- skipped: 호출 필요가 없어서 검색하지 않음. enabled 상태와 일치해야 한다.
- error: 검색 또는 응답 계약 실패. 외부 오류·요청 ID 불일치·허용하지 않은 권한의 근거를 성공으로 바꾸지 않는다.

성공 근거도 doc/section/chunk/text/version, 유한한 score와 서버가 허용한 access_level을 확인한 뒤 사용한다. LLM 작성·검증에 쓸 시간 예산이 부족하면 별도 경로로 판정한다.

## 연결 근거

- [워크플로우 설계 6절](../../../../docs/project/WORKFLOW-DESIGN.md#6-노드-간-페이로드-연결선마다)
- [워크플로우 JSON](../../../../workflows/dubakwi-support.json)
