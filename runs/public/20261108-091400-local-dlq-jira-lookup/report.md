# TC-07 조회 전용 DLQ 목록·Jira 연결 구현 및 로컬 검증

- 실행 ID: `20261108-091400-local-dlq-jira-lookup`
- 실행일: 2026-11-08 KST
- 환경: Windows local worktree, Node.js 24.22.1, 임시 PostgreSQL 16.15 컨테이너
- 기준선: `main` `b705be3`; 작업 브랜치 `r01/p18-dlq-jira-lookup`의 미커밋 후보
- 범위: 미해결 DLQ 목록·상세 inspect·연결 Jira 상태/담당자 read-only GET

## 구현

- migration 017 `recovery_list(jsonb)`를 추가했다. 지정 scope의 `pending`/`reprocessing`만 반환하며 page size 1~50, offset 0~10,000으로 제한한다. summary, recovery capsule, effect payload, Response는 반환하지 않는다.
- 별도 `dubakwi_dlq_reader` NOLOGIN 역할과 `recovery_lookup` SECURITY DEFINER dispatcher를 추가했다. 공개 EXECUTE를 회수하고 reader에 dispatcher만 허용했다. recovery dispatcher, helper 직접 실행, operator direct table SELECT, runtime list/recovery EXECUTE는 허용하지 않는다.
- 비활성 manual workflow `dubakwi-dlq-lookup`은 `list` 또는 `inspect`만 입력받는다. 별도 `dubakwi-dlq-reader` credential과 기존 Jira read credential을 참조한다. Inspect에서 `JBYS-<number>`로 확인된 이슈 키가 있을 때만 `/rest/api/2/issue/{key}?fields=status,assignee` GET을 호출한다.
- `recovery_lookup(inspect)` sanitizes the database result before returning: selected DLQ metadata plus request processing status only. It drops owner, Response, recovery capsule, and effects inside SQL, before the n8n Postgres node can persist the raw result.
- Jira 출력은 키·상태 ID/이름·담당자 표시명으로 제한한다. Jira 상세, 이메일, 요약, issue description, DLQ 복구 capsule/Response는 최종 출력에서 제외한다.
- 이 workflow에 webhook·claim/resume/finish/complete/release, Jira POST/PUT/PATCH/DELETE 노드는 없다. 목록 결과에서 고른 DLQ 상세는 다음 실행의 inspect 입력으로 조회한다.

## 검증 결과

- `node scripts/test/tc07-dlq-lookup-workflow-contract.js`: 33 checks 통과.
- 기존 TC-07/P18 관련 회귀: operator input 25/25, finish capsule 3/3, handoff capsule 6 checks, recovery parity 8/8 통과. 문서 링크 검사 22 files/771 links/58 anchors 오류0, 공개 파일 검사 575 files/1139 links 오류0, `git diff --check` 통과.
- `tscan staged`는 로컬에 도구가 없어 실행하지 못했다. 공개 후보·비밀 패턴 검사는 `check_public_files.py`로 대체했다.
- workflow JSON parse 통과.
- 임시 PostgreSQL 16.15 fresh database에 migrations 001~017을 파일 순서로 적용: 전체 COMMIT까지 통과.
- 추가 [read-only list 계약](../../../infra/db/verification/operator-dlq-list-contract.sql): scope 격리, pending/reprocessing 포함, resolved 제외, pagination/has_more, 상한 거절, capsule/summary 미노출을 확인하고 fixture를 rollback했다.
- full-chain 권한 확인: `dubakwi_dlq_reader`로 read-only dispatcher list와 selected inspect 성공, recovery dispatcher·helper direct execute=false, direct dead_letters SELECT=false, `dubakwi_runtime`의 list/recovery dispatcher EXECUTE=false.
- 첫 workflow contract 실행은 테스트 harness가 n8n의 이전 노드 참조 `$()`를 제공하지 않아 중단됐다. harness를 보완해 재실행했고 이후 read-only reader-role과 DB inspect sanitization 검사를 추가해 33 checks를 통과했다. 첫 결과를 성공으로 덮어쓰지 않는다.
- 첫 SQL 호출은 PowerShell 인용 전달이 어긋나 psql 연결 오류가 났다. 다음 minimal fixture 계약 실행은 test table에 `resolved_at` 컬럼이 없어 setup 오류로 실패했다. 이를 숨기지 않고 새 empty PostgreSQL database에 실제 migrations 001~017 전체를 적용해 올바른 스키마에서 계약을 다시 통과시켰다.
- 최초 full-chain read-only inspect 계약은 migration 017의 `jsonb_object_length(jsonb)`가 PostgreSQL 16에 없어서 실패했다. 필요한 key 존재 검사를 JSONB `?&` 연산자로 바꾸고, migrations 001~017 전체를 새 빈 DB에 재적용한 뒤 list·inspect sanitization·권한 계약을 모두 통과시켰다. 초기 실패 기록은 유지한다.
- workflow contract의 dispatcher 검사도 CRLF/LF 줄바꿈 가정으로 한 차례 실패했다. 줄바꿈을 허용하는 정규식으로 고친 뒤 33 checks가 통과했다.

## VM/외부 연동 경계

- 이 migration과 workflow는 아직 main에 병합·review되지 않았고 VM에 반입하지 않았다. migration 017의 fresh private backup/restore rehearsal, 검토된 기본 브랜치, VM apply, dedicated reader LOGIN/Credential provision과 권한 확인이 남아 있다.
- Jira live GET, n8n inactive import, VM credential 실제 연결 확인은 실행하지 않았다. 조회 경로는 기존 recovery operator credential을 재사용하지 않고 dedicated `dubakwi-dlq-reader` LOGIN/Credential 및 기존 Jira read credential을 요구한다.
- DLQ/state live write 0, Jira/Discord write 0, Jira GET 0, workflow import/activation 0.
- 구형 `R01 TC07 operator E2E 20261107`은 이전 VM 실행에서 `recovery_finish` 직접 호출이라 비활성화된 상태를 유지한다. 새 lookup workflow가 import·검증되기 전까지 VM 운영자 조회 경로가 완료된 것은 아니다.

## 판정

조회 전용 구현 후보와 local contract는 완료했다. 사용자가 요청한 VM에서의 실제 DLQ 목록→선택 inspect→Jira 상태/담당 조회까지는 VM migration, inactive workflow import, credential 연결 및 Jira GET 확인이 선행돼야 하므로 **실연동 완료로 판정하지 않는다**. 재처리·Jira 변경은 이번 범위 밖이다.
