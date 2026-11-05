# R04 시작 준비 확인

2026-11-05 KST · R01 · P04/P18. [구조화 결과](summary.json). 앞선 배포는 [PR #32](https://github.com/ik-e/dubakwi-ttareungi-support/pull/32)와 구분한다.

사용자가 VM 작업 가능과 R04 시작 준비를 지시했다. 현재 네 비활성 복제본의 ID·Code·SQL·연결선과 미게시 상태가 배포 manifest와 같은지 확인했다. 기존 업무 원본과 Credential은 수정하지 않았다.

R01 전용 미게시 수동 helper 두 개를 만들었다. 실제 Postgres 읽기 실행168은 database=dubakwi_service, user=dubakwi_app, state_apply/dlq_apply 존재=true로 성공했다. state 호출 부모169·하위170도 성공했으며 S04 PostgreSQL과 S05가 실제 실행돼 ok=true·skipped=true를 반환했다. 새 scope의 상태 행은0이었다.

기존 workflow·Credential 행의 해시를 다시 비교해 불변을 확인했다. 네 복제본과 두 helper는 모두 미게시이며 n8n과 사용자API health는200이었다. 공용P11/P19·공유Credential·업무데이터·서비스·게시 상태는 변경하지 않았다. n8n 실행 기록과 별도 helper 두 개만 추가됐다.

최초 터미널 입력은 stale element로 전송 전에 거절됐다. 새 관측 후 재시도했으며 업무 실행 실패로 집계하지 않는다. 원시 결과·환경 ID·helper JSON·인계는 비공개로 보존한다. 두 helper에 한해 R04가 후속 편집을 인계받으며, 원래 업무 원본의 소유권은 유지한다.

R04는 위 실행을 확인한 뒤 자신의 새 namespace로 state/DLQ 계약과 Jira 메타데이터 시험을 시작할 수 있다. 다른 세션이 같은 대상에서 작업을 시작하면 동시 편집·실행을 조율한다. DUBAKWI_SCOPE·실제 errors 실행, Jira 업무 구현, DLQ 전체 복구·공식 회귀는 후속이다. 이번 무소유 skip 한 건을 전체 업무 성공으로 확대하지 않는다.
