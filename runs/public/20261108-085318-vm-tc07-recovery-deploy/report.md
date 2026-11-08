# TC-07 VM 복구 저장소 적용·검증

- 실행 ID: `20261108-085318-vm-tc07-recovery-deploy`
- 실행일: 2026-11-08 KST
- 환경: Edge 웹 SSH, VM PostgreSQL 16.15
- 배포 원본: PR #51 병합 코드 `b323a26` (현재 `main`에 포함)
- 범위: restore DB claim 경합, live service DB migrations 010–016, operator/runtime 권한 및 inspect 확인

## 복원 DB 경합 시험

- 앞선 중단 실행에서 남은 synthetic claim을 recovery release로 해제했다. 결과는 DLQ `pending`(revision 2), 요청 `failed`(revision 3), 원 execution 보존이다. Jira/Discord driver는 실행하지 않았다.
- 두 번째 synthetic fixture에 동시에 `recovery_claim`을 호출했다. `dubakwi_recovery_operator` 역할에서 1건은 `ok=true`로 `reprocessing`을 획득했고 다른 1건은 `recovery_conflict`로 거절됐다.
- 승자 claim은 recovery release로 되돌렸다. 최종 DLQ는 `pending`, 요청은 `failed`이며 두 fixture 모두 restore DB 밖의 효과를 만들지 않았다.
- 최초 재시험은 fixture scope 접미사를 빠뜨려 두 요청이 모두 `recovery_conflict`였다. 쓰기는 발생하지 않았다. 정정된 scope로 재시험한 결과만 경합 통과로 집계했다.

## 라이브 서비스 DB 적용

- 직전 실행 [백업·복원 리허설](../20261108-080045-vm-tc07-recovery/report.md)의 fresh private backup, 별도 restore DB, migrations 010–016, 세 controlled-recovery 계약 통과를 선행 증거로 사용했다.
- VM의 배포 소스는 `b323a26`이고 worktree clean이었다. migrations 010–016의 SHA-256 7개가 로컬 검토본과 모두 일치했다.
- `dubakwi_service`에 010→016을 파일 순서로 `ON_ERROR_STOP=1` 적용했다. 일곱 migration 모두 COMMIT까지 완료했다.
- 사후 권한 확인: `dubakwi_recovery_operator`는 NOLOGIN이며 superuser/CREATEDB/CREATEROLE/INHERIT가 모두 false다. dispatcher 실행 권한은 operator에 있고 `dubakwi_runtime`에는 없다.
- live DB의 최신 DLQ를 읽기 전용 `inspect`로 확인했다. 반환은 `ok=true`, DLQ `pending`, 요청 `unknown`이었다. table 직접 SELECT 권한은 operator에 주지 않았다.
- n8n에 canonical `dubakwi-recovery-operator` workflow는 없었다. 기존 `R01 TC07 operator E2E 20261107` 사본은 활성 상태였고 새 dispatcher 대신 `recovery_finish`를 직접 호출하므로 비활성화했다. 별도 credential은 변경하지 않았다.
- canonical workflow 파일 import를 시작했으나 Edge 제어 연결이 file chooser 단계에서 중단되어 반입하지 못했다. 새 workflow의 활성화도 없었다. 기존 credential 이름은 UI에서 보였지만 실제 LOGIN의 role membership/권한은 검증하지 않았다.
- 라이브 state/DLQ 행을 변경하는 recovery 명령, Jira·Discord 호출, credential 변경은 하지 않았다.

## 판정과 남은 조건

- 복원 DB claim 경합과 live migrations 010–016 적용은 통과했다.
- live role-as-operator inspect는 통과했다. 기존 workflow에서 `dubakwi-recovery-operator`라는 credential 이름을 보았지만 해당 LOGIN 권한은 검증하지 않았다. canonical operator workflow는 미반입/미활성 상태이며, 구형 test copy는 비활성화했다.
- 따라서 TC-07의 저장 계층 배포는 진행됐으나 담당자가 canonical workflow를 통해 운용할 수 있는 상태는 아니다. dedicated LOGIN/Credential 경계를 검증하고, canonical workflow를 inactive로 반입한 뒤 credential을 통한 inspect-only 확인을 거쳐야 한다. 사용자 승인 전에는 recovery LOGIN을 만들거나 기존 runtime 권한을 넓히지 않는다.
- 실제 Jira/Discord action 수행·효과 조회, recovery complete, 사용자/담당자 종단, 운영 crash/stale lease는 미실행이다. TC-07 전체와 P26 전체 회귀는 통과로 판정하지 않는다.
