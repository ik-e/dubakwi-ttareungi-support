# P18 case 함수 격리 DB 검토

2026-11-05 KST · R01 · P18/P12 · [구조화 결과](summary.json).

PR #27의 검토 대상은 `60f8886b74319ddf809d71cf4dd5c3c3533c8d97`이다. R04 업무 원본은 수정하지 않았다. 로컬 Docker의 PostgreSQL 16.15를 VM과 같은 이미지 digest로 고정하고 네트워크 없음·공개 포트 없음·tmpfs 데이터의 일회용 환경에서 시험했다. 이 결과는 VM 배포 완료나 R05 공식 판정이 아니다.

001~006을 순서대로 적용했다. runtime 역할을 상속한 별도 로그인으로 constraint-contract, function-contract, case-contract, runtime-role-contract가 모두 통과했다. 서로 다른 두 요청이 같은 case의 처리권을 동시에 요구하는 추가 시험에서 하나만 proceed, 다른 하나는 case_busy가 됐다. runtime의 CREATE TABLE·ALTER·DROP·TRUNCATE·DELETE·CREATE FUNCTION은 모두 거절됐고 case 함수 실행 권한은 허용됐다.

추가 동시성 시험의 최초 시도는 Windows 기본 cp949 디코더가 한국어 응답을 읽지 못했다. DB 실행 결과와 구분해 보존했고 UTF-8 및 새로운 scope로 재시험해 통과했다. 기존 실패 자료는 덮어쓰지 않았다. P12 흐름 시뮬레이션 4종과 계약 거절 응답 시험 2건도 통과했다. 전체 unittest 78건을 이번 검토에서 재실행한 것은 아니다.

서비스 DB의 005~006 적용은 별도 변경이다. PR에는 역할별 담당자 대신 첫 활성 배정 후보를 선택하는 경로가 있고, 약 12초의 호출 합산을 전체 기한 보장으로 볼 수 없다. R02·R05의 계약/시간 검토와 R04의 실제 save·종료·case_ref 왕복 증거가 필요하다. VM state 복제본의 11노드 단계와 최신 원본의 20노드 단계를 구분해 인계해야 한다.
