# TC-07 operator 수동 입력 경로 계약 검사

- 실행 시각: 2026-11-08 00:45 KST 전후
- 환경: local Node.js, workflow JSON 정적/Code node contract
- 대상: `workflows/dubakwi-recovery-operator.json`
- 판정: **수동 입력·입력 검증 경로 contract 통과**

## 확인 결과

- operator workflow가 inactive이며 webhook trigger가 없다.
- manual trigger가 JSON payload 입력 필드를 거쳐 strict input validator에 연결된다.
- inspect/finish/claim/release 명령의 정상 입력과 부적합 hash, 장문 사유, 재사용 execution ID, 잘못된 Jira 확인값, 임의 필드, 잘못된 JSON을 거부한다.
- PostgreSQL 호출은 parameterized `recovery_control($1::jsonb)`이며 전용 operator credential을 사용한다.
- 실행: `node scripts/test/tc07-operator-workflow-contract.js` — **17 checks passed**.

## 범위와 한계

이는 workflow JSON/Code 경로 검사이며 n8n에서 import·게시·실제 실행한 결과가 아니다. workflow는 Jira/Discord action driver가 아니며, claim 후 Jira 외부효과 실행, 새 StateRef 발급, 정상 요청 흐름의 마무리/resolve, crash recovery는 아직 구현되지 않았다. DB·VM·Jira·Discord 효과는 0이다.
