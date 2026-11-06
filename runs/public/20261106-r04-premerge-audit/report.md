# R04 병합 전 통합 점검

## 확인 결과

- PR #24 `dfcaff2`의 권한 시험 계획은 권한별 검색과 문의 소유권 시험을 구분하고 있으며, 정적 fixture 확인을 종단시험으로 주장하지 않는다.
- PR #31 `06e9223`은 시민은 public 검색만, support/security는 public 뒤 restricted 검색을 추가한다. 수집 단계에서도 결과 `access_level`이 요청 권한에 포함되는지 다시 확인한다.
- PR #27 `8f001fc`은 같은 case_ref 활성 처리권의 PostgreSQL 고유 인덱스, Jira label 선조회, 반복 배정·알림 표식을 사용한다.
- PR #28 `3d6a581`은 state와 DLQ가 각각 throw해도 가린 문맥으로 안전 종료한다.
- R04 workflow 4개의 ID·연결 대상·예상 배포 자리표시자·비밀값 패턴을 `check_r04_release_bundle.py`로 검사한다.

## 반입 전 필수 확인

R01은 Git 밖에서 Jira URL, support/security accountId 매핑, Credential 참조, scope와 Error Workflow 지정을 확인한다. 자리표시자가 남은 workflow를 게시하지 않는다. 반입 실패 시 시험 사본을 비활성화하고 기존 P11/P19 게시본·Credential·DB를 변경 전 상태로 유지한다.

## 판정 제한

이 기록은 로컬 정적·계약 검사다. 실제 사용자 API→B05→RAG 권한 전달, VM PostgreSQL/Jira, 서로 다른 신규 요청의 동시 생성, 전체 P19 S1과 R05 공식 판정은 미실행이다.
