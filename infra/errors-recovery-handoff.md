# 오류·재전송·운영자 확인 인계

- 기준일: 2026-11-06 KST / v0.1 / R01 인계 결정·로컬 계약 검사 완료, VM 검증 전.
- 기준: R04 PR #27 `86d78e7`, PR #28 `8c53cf7`, R02 사본 도구 `c4f1219`. 역할은 [팀 헌장](../docs/project/TEAM-CHARTER.md), 저장/복구 계약은 해당 PR의 STORAGE-DESIGN 3.3·4절을 따른다. 이 문서는 R01 배포·운영 인계이며 상세 저장 계약을 재정의하지 않는다.
- 새 로컬 증거: [scope·메시지·오류 경계 확인](../runs/public/20261106-105725-local-p20-r05-handoff/summary.json). 실제 VM의 적용 상태나 TC16/TC17 판정이 아니다.

## 1 동일 scope 생성과 배포 전 확인

기존 R01 결정인 `dubakwi-p19-real`을 VM 통합 후보의 고정 scope로 유지한다. 로컬 `dubakwi-dev`와 혼용하지 않는다. R01이 R02의 `scripts/test/make_vm_p19_real_bundle.py`를 아래 옵션으로 실행해 support·errors 사본을 함께 만든다. 도구는 아직 R02 PR #16 경로이므로 검토한 커밋에서 실행한다. 실제 환경 ID/키·후보 JSON은 Git 제외 경로에 둔다.

```text
--scope dubakwi-p19-real
--errors-ref 8c53cf7550c0374c3700693ca12130c3fa02d8e8
--state-workflow-id <확인된 state 사본 ID>
--dlq-workflow-id <확인된 DLQ 사본 ID>
```

R01은 반입 전에 다음을 대조해 배포 manifest에 남긴다.

- support의 B07a·X06a·X03a와 errors E02가 같은 scope를 사용하고, state·DLQ 참조 ID도 같다.
- support Error Workflow가 함께 만든 errors 사본 ID를 가리킨다.
- errors E02의 `const importedScope = ...` 대입값만 바뀌고 비교식의 `__DUBAKWI_SCOPE__`는 유지된다. 전체 일괄 치환은 금지한다.
- 도구의 `errors_copy.scope_matches_support`가 true다. Node가 없어 검사값이 null이면 VM 검증 완료로 취급하지 않는다.
- VM에서 환경 접근이 허용돼 `DUBAKWI_SCOPE`가 읽히면 그 값이 대입값보다 우선하므로 **실효 scope**도 일치해야 한다. 다른 scope의 기존 서비스에 영향을 줄 수 있는 전역 환경 변경을 임의로 하지 않는다.
- 원본 커밋·SHA-256·반입 결과를 현재 기준과 대조한다. `c4f1219` 도구의 기본 의존성 manifest는 state/DLQ/handoff=`1b83d18`, errors=`ff19178`이므로 현재 #27/#28 반영을 뜻하지 않는다. 기본값만 믿고 최신 배포라고 기록하지 말고, 실제 연결 원본과 대조한 의존성 명세를 R02/R04와 맞춘 뒤 진행한다.

로컬 검사에서는 같은 scope·다른 scope 거절·비교식 보존·동일 대상 연결·Error Workflow 지정까지 확인했다. VM 렌더·반입·게시·scope 주입은 이번 작업에서 하지 않았다. TC17은 저장 후 의도적 예외와 원 실행 종료를 확인하고, 동일 요청 재전송을 검사한다. scope 불일치 변형은 별도 시험 사본에만 적용하며 정상 후보를 덮어쓰지 않는다.

## 2 재전송 기대와 운영 알림 한계

| 경로 | 재전송 기대 | 자동 실행 |
| --- | --- | --- |
| support 직접 fail로 failed/unknown 기록 | 409 request_requires_review | 0 |
| errors가 원 실행 ID·같은 scope의 소유 processing 행을 찾아 unknown 기록 | 409 request_requires_review | 0 |
| errors가 소유 행을 찾지 못해 skipped, 기존 행이 processing 유지 | 409 request_in_progress | 0 |

begin 전에 중단되어 요청 상태가 처음부터 없는 경우까지 위 세 번째 행의 409를 보장하는 것은 아니다. TC17의 불일치 변형은 기존 processing 시험 행이 존재하는 조건을 먼저 확인한다.

시민 문구는 #27 S05를 따른다. request_requires_review는 “처리 결과 확인이 필요하며, 같은 요청은 자동으로 다시 실행하지 않습니다.”, request_in_progress는 “같은 요청을 처리하고 있습니다. 같은 요청은 자동으로 다시 실행하지 않습니다.”다. 접수·완료·자동 복구 약속이 없는지 R05가 확인한다.

errors의 운영 알림 전송은 미구현이다. DLQ에는 `effects.alert.status=none`, `error_code=alert_backend_unconfigured`가 남는다. E03 자체는 저장 설정 확인 노드이며 알림 발송 노드가 아니다. state·DLQ 동시 실패 시 E08은 `error_storage_failed`를 반환하고 n8n 실행 기록으로 확인한다. 이를 알림 성공이나 영속 실패 보존 성공으로 표현하지 않는다.

TC16은 support 오류 처리와 Error Workflow 경로를 분리한다. support의 과정 data-api 알림 시도와 실제 운영자에게 전달됐음을 구분하고, errors 경로에 운영 알림 1건을 공통 기대값으로 강제하지 않는다. 발표·결과서에 이 미구현·관측 한계를 그대로 기록한다. R05가 TC16/TC17을 편집하고 R02/R04가 경로별 HTTP·reason·효과 기대를 검토한다.

## 3 담당자·계정과 processing 안전 처리

- 실행 책임자: R01. 저장 상태/외부 효과/복구 판단 검토: R04. 시험 입력·증거·재전송 판정: R05.
- OS 접속: 사용자에게 이미 허용된 `r05tester` 웹 SSH 세션. sudo가 필요하면 기존 인증 절차를 사용한다. 이 인계로 R05에게 새 DB/관리 권한을 부여하지 않는다.
- 업무 명령 실행: R01이 기존 n8n `dubakwi-postgres` runtime Credential 또는 대응하는 기존 `dubakwi_app` 로그인으로 검토된 `state_apply`·`dlq_apply` 함수를 호출한다. VM의 실제 Credential/역할명·함수 버전·호출 접근은 실행 직전 확인해 비공개 운영 기록에 남긴다. owner/bootstrap 로그인은 일반 행 해제에 사용하지 않는다.
- runtime 계정으로 행 DELETE/TRUNCATE·직접 UPDATE·DB 초기화를 하지 않는다. DB 비밀번호·Credential ID를 공개 보고서에 복제하지 않는다.

순서는 다음과 같다.

1. R05가 시험 scope/request_id·원 execution_id·case/known Jira ID·관측 결과를 제공한다. R01/R04가 원 실행이 종료됐고 외부 변경이 더 진행되지 않는지 확인한다. 실행 중이면 아무 상태도 바꾸지 않는다.
2. R01이 scope·원 execution_id로 해당 processing 행이 정확히 하나인지 읽기 확인하고, Jira 생성/종료/배정/알림의 실제 효과와 알려진 ID를 기록한다. 불일치·미확인이면 중단하고 확인 필요를 유지한다.
3. R01이 state의 fail 공개 명령을 통해 조건부로 failed 또는 unknown과 가린 error_code를 기록한다. 아래 예시는 외부 효과가 미확인인 경우의 **검토용 요청 모양**이며 실행 완료를 뜻하지 않는다. 직접 테이블 갱신을 대신하는 `state_apply(payload)` 경계다.

```json
{
  "op": "fail",
  "scope": "dubakwi-p19-real",
  "execution_id": "<종료 확인한 원 실행 ID>",
  "state_ref": null,
  "args": {
    "status": "unknown",
    "current_step": "<실제로 중단된 단계>",
    "error_code": "operator_verification_required"
  }
}
```

4. 응답의 `ok`, `skipped`, StateRef와 새 revision을 확인한다. `skipped=true`는 행을 변경했다는 뜻이 아니다. 저장 상태와 오류가 실제로 바뀌었는지 다시 조회한다.
5. DLQ가 있으면 R04 복구 판단과 현재 revision을 확인하고 R01 또는 지정 운영자가 claim한다. 실제 효과 확인·복구 기록을 갖춘 뒤에만 resolve한다. DLQ가 없거나 두 저장이 실패했다면 기존 실행 기록을 근거로 R04와 수동 확인하며 가짜 DLQ 성공을 만들지 않는다.

**이 절차는 processing을 안전한 확인 상태로 전환하는 절차이며 같은 요청의 재실행 허용 절차가 아니다.** state.fail 후 failed/unknown도 활성 상태이므로 재전송은 request_requires_review로 계속 차단된다. DLQ resolve는 요청 상태를 completed나 processing으로 바꾸지 않는다. 현재 검토한 state_apply에는 원 요청을 조건부 재개하는 별도 op가 없다. R04의 재개 드라이버·소유권·새 execution/StateRef가 확인되기 전에는 manual_required를 유지하고 자동 재실행·행 삭제로 시험을 통과시키지 않는다. 성공했던 외부 변경을 반복하지 않는다.

재현 반복이 필요하면 R01/R04가 별도로 지정한 폐기 가능한 시험 DB와 새 시험 입력으로만 준비한다. 운영 DB·기존 문의의 scope를 바꾸거나 초기화하지 않는다. R05는 운영자 확인 결과를 받은 후 재전송으로 409와 중복 효과0을 검사한다. 복구 완료·재개 성공 시험은 구현 인계 후 별도 단계다.

## 4 인계 상태

동일 scope 생성의 로컬 검사와 409/오류 Code 검사는 통과했다. 실제 VM에서 같은 scope로 반입·연결됐는지, state.fail 운영 호출이 가능한지, TC16/TC17의 오류/재전송과 수동 복구가 맞는지는 미실행이다. R02/R04는 최신 의존성 manifest·실효 scope와 재개 드라이버를 확인하고, R05는 기대값을 경로별로 분리해 새 실행묶음으로 증거를 남긴다.
