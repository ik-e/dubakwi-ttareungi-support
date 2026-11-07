# 전체 수정 계획 연결 검사

- 실행일: 2026-11-06 KST / R01 / 로컬 / P09~P31 잔여 계획
- 코드 조사 기준: `14bdd5a`, 이번 계획 v1.0 / 공통 기준 v1.2. 업무 JSON은 변경하지 않았다.
- [전체 수정·검증 계획](../../../infra/full-system-closure-plan.md), [64개 매핑](../../../infra/contracts/full-system-coverage.json), [검사 원본](../../../scripts/dev/check_full_system_coverage.py).
- [요약·LF 해시](summary.json), [오류 검출 확인](negative-checks.json).

## 결과

| 항목 | 결과 |
| --- | --- |
| 원래 대조 ID 연결 | 64/64, 누락·추가·중복0 |
| 작업 묶음 | 12개, 실연동 의존성 순환0 |
| 원래 완료 조건 보존 | 64개 일치, 조건 완화0 |
| 예정 인수 시험 | AC64개, 실제 runner 연결·실행 전 |
| Jira 문맥 fixture | support 연결·revision·event SHA-256·JSON 텍스트 왕복 확인 |
| 오류 검출 | 8개 의도적 오류 모두 검출 |
| 이번 실제 서비스 시험 | 0건 |

오류 검출은 검사기의 validate 함수에 사본을 넘겨 요구 삭제·중복·완료 조건 완화·없는 의존성·순환 의존성·무단 제외·문맥 owner 불일치·이벤트 hash 불일치를 각각 주입했다. 원본 JSON은 수정하지 않았다. baseline 문맥 fixture는 모의 값이며 실제 Jira의 작성자 권한·페이지·크기/ADF·동시성 동작을 증명하지 않는다.

## 재현과 판정 범위

저장소 루트에서 `uv run --locked python scripts/dev/check_full_system_coverage.py`를 실행한다. 새 기록은 `--output <새 경로>`로 저장한다. 같은 검사를 CI에도 추가했다.

검사 통과는 알려진 64개 요구에 작업과 시험 계획이 빠지지 않았다는 뜻이다. 자연어 설계의 모든 문장·미래 결함·실제 runner coverage를 증명하지 않는다. WF/TC 연결은 기존 대조표의 시나리오 참조이며 R05가 정식 사례 ID·버전·runner에 대응시켜야 한다. 자동 재개 S10/TC07은 not_implemented이며 수동 확인·차단 시험은 필수다.

D01~07은 R01 기준안이며 영향 역할 검토를 받은 것으로 표시하지 않았다. B08/B11/B24/B25의 기존 네 구현 차이, TC12/F-S1-03/TC14, VM 버전 차이와 고장/복원 미실행은 여전히 남아 있다. 이번 작업은 해당 누락을 계획과 마감 조건에 포함한 것이며 해결 완료로 집계하지 않는다.

## 추가 검사

Ruff check·format 통과(100파일), 문서 참조·공개 Git 후보 검사 오류0, diff 검사 통과. 공통 unittest는 97건 중90건 통과·환경 의존7건 생략이다. tscan은 환경에 없으므로 변경 후보13개 파일의 비밀 패턴·비공개 파일 추적 여부를 대체 확인했고 패턴 검출0이다. 전체 이력의 비밀 부재를 보증하지 않는다. CI 결과는 해당 커밋의 GitHub checks를 따른다. 전체 회귀는 기능 구현 완료 증거가 아니며 실제 VM 시험과 별개다.
