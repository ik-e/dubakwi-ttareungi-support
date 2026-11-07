# R01 PR36 정상 1건 후보 생성·VM 선행 확인

2026-11-06 KST. 사용자 전달 R02의 정상 Webhook 1건 우선 요청에 따라 #36 목표를 확인했다. 최종 목표는 Discord부터 사용자·AI/RAG·Jira 종료·DB 최종 저장·본인 비공개 응답까지이며 현재 우선은 G0~G3 실제 정상 Webhook 1건이다. 부수 UX·복구 엔진 작업을 추가하지 않았다.

## 후보와 로컬 확인

분리된 깨끗한 support `c5ed5fa`에서 R02 명령의 scope `dubakwi-p19-real`, `--errors-ref 8c53cf7`, `--r04-ref a930e24`를 사용하고 계획된 별도 시험 ID/경로와 비공개 Credential 참조를 넣어 support/errors를 생성했다. 기존 CRLF 생성본은 보존하고 LF 바이트 사본의 SHA-256을 manifest와 대조했다. 네 의존 원본 Git 바이트 해시도 일치하며 errors의 scope 검사가 통과했다. 이는 VM 실효 scope 시험이 아니다. Credential ID는 과거 후보의 준비값으로 반입 직전 재대조해야 한다.

support Code 시험136/136·정적 오류0, support unittest83건 중76통과/HTTP7생략, R04 `a930e24` unittest88건 중81통과/HTTP7생략이다. R04 Ruff check/format60파일 통과. `86d78e7` 이후 업무 JSON 변경은 handoff의 HTTP timeout 세 곳(2000→1500ms 두 곳,3500→2500ms 한 곳)이며 SQL은 이 변경분에서 바뀌지 않았다. 실제 Jira 지연이나 공식 시간 판정은 미측정이다.

중요: R02 생성기는 support/errors만 만든다. `--r04-ref`는 state/DLQ/handoff 원본을 manifest에 기록하지만 세 실제 사본을 생성·업데이트하지 않는다. 기존 VM의 구형 사본에 support만 연결해서는 최신 정상 시험 준비가 끝나지 않는다.

## VM G1 실제 조회

기존 Edge 웹 SSH에서 PostgreSQL과 n8n SQLite를 읽었다. 서비스 DB 함수는 state_ref_json/state_apply/dlq_apply 세 개만 있고 case_lookup/case_begin 및 alert-marker 인덱스가 없다. 같은 scope 요청0/DLQ0, n8n running/waiting/new 실행0이었다. 이는 SQL005~007 적용/권한 검증 완료가 아니다.

지정 기존 비활성 사본은 state11/DLQ5/handoff9/errors7노드로 조회됐다. 이전 DLQ6노드 증거와 현재5노드는 각각 당시 관측이며 과거 결과를 덮어쓰거나 현재 내용을 임의 복원하지 않았다. 후보 반입 직전에 다시 대조해야 한다. 실제 P19 시험 경로는 없고 현재 네 사본은 미게시다. Credential 이름/유형은 존재하지만 ID별 바인딩/비밀값 일치는 이번 조회에서 검증하지 않았다. n8n 이미지2.42.6, PostgreSQL16.15-bookworm 태그를 읽었으며 아직 배포용 이미지 digest manifest 확정은 아니다.

## 판정과 다음 단계

현재 **NOT READY**다. G0는 영향 검토/배포 원본 확정 전이며 #27/#28은 open이다. G1은 필요한005→006→007 및 runtime 권한·함수·백업 확인 전이고, G2는 전체 state/DLQ/handoff/errors 및 support 반입/게시 전이다. 저장소 AGENTS의 검토된 main 배포 규칙을 유지한다. 정상 1건을 이관 담당 매핑이나 추가 UX 작업으로 막지는 않는다.

R01이 위 선행을 해결한 뒤 호출 가능한 경로·동일 실효scope·실제 반입manifest·키 비공개 인계·실행 조회 방법을 제공한다. R03의 정상 질문/기대 문서·절을 고정하고 R02가 등록 사용자·새 request_id·case_ref 없이 정상1건을 실행한다. R04는 Jira 생성1/안내종료와 DB completed/최종응답을 확인하며 R05는 응답/근거와 실행 증거를 대조한다. 실패하면 최초 실패와 known ID를 보존하고 반복 실행으로 숨기지 않는다.

비공개 후보·manifest·NOT READY 호출/조회 인계는 Git 제외 runs에 준비했다. 아직 시험 키를 전달하거나 경로를 사용 가능하다고 안내하지 않았다. 이번 VM workflow/서비스 SQL 변경·실제 Jira/Discord 호출은0이다.
