# R01 재전송 계약 정정·최신 문구 검토

2026-11-06 KST, 로컬 Windows에서 PR #27 `86d78e7`, #28 `8c53cf7`을 확인했다. 설정은 저장소 locked 의존성이며 실제 HTTP 시험은 비활성이다. 원본 코드·VM·Jira·서비스 DB는 수정하지 않았다.

## 검사 결과

각 분리 작업본에서 `uv run --locked python -X utf8 -m unittest discover -s scripts/test -p "test_*.py"`를 실행했다. #27은 84건 중 77통과·실제 HTTP 7생략, #28은 76건 중 69통과·실제 HTTP 7생략이다. #27에는 S05 문구 검사가 포함된다. 서비스 종단 통과가 아니다.

`f1c4fcb` 이후 `86d78e7` 변경은 state S05·해당 문구 시험·STORAGE-DESIGN 3.3의 3개 파일이다. 다음 R01 문구와 기대값이 일치한다.

- `request_in_progress`: 같은 요청을 처리하고 있습니다. 같은 요청은 자동으로 다시 실행하지 않습니다.
- `request_requires_review`: 처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다.
- `request_conflict`: 같은 요청 번호로 다른 내용이 들어왔습니다. 새 문의로 다시 보내 주세요.

## R02 정정 취합

[PR #27 R02 검토](https://github.com/ik-e/dubakwi-ttareungi-support/pull/27#issuecomment-6674394121)와 [PR #28 R02 검토](https://github.com/ik-e/dubakwi-ttareungi-support/pull/28#issuecomment-6674394835)를 취합했다. 렌더 범위·scope 처리·정정된 409 의미의 소비 동의이며 #28 전체 병합 승인이 아니다. 임시 PostgreSQL 실측은 R02 보고로 구분한다. R01은 state 라우팅과 SQL003의 조건부 갱신을 대조했으며 이번에 PostgreSQL이나 실제 errors 종단을 재실행하지 않았다.

같은 scope·원 실행 ID로 processing 행 하나를 찾으면 errors의 fail은 unknown으로 바꾸고 재전송은 `request_requires_review`다. 행을 찾지 못한 skipped는 생성·갱신을 하지 않는다. 기존 processing 행이 유지된 경우에만 `request_in_progress`다. begin 전 중단으로 행이 없는 경우까지 processing으로 해석하지 않는다. support와 errors에는 같은 scope를 주입해야 한다.

사용자가 전달한 R02의 팀 n8n X03 미실행 보고도 취합했다(원 Discord 링크·일시는 미제공). 이로써 R02와의 해당 시험 충돌은 해소됐지만 다른 호출자는 R04가 확인한다. 이미 동의한 지정 비활성 DLQ 복제본 갱신은 R04가 담당하고 변경 전 내보내기·Credential/ID/비활성 유지·변경 후 원본 대조를 지킨다. SQL007 적용 전 중복 제거 완료로 쓰지 않는다.

## 다음 인계

R02는 #27 S05 최종 문구에 FL35를 맞추고 기존 기준과 새 검토 커밋을 구분한다. R04는 위 DLQ 갱신 결과·원본 커밋/해시와 D06 담당 매핑 확정을 전달한다. R05는 최신 #27/#28 실패·재전송·복구 계약을 검토한다. 기존 보고의 재작성을 요구하지 않는다.

R01은 해당 검토 취합 후 #27 → #28 → #16 순서로 병합을 판단하고, 검토된 main에서 백업·SQL005→006→007·복제본 대조와 연결 확인을 수행한다. 실제 ErrorTrigger, 운영 알림, 전체 S1과 공식 판정은 미실행으로 유지한다.
