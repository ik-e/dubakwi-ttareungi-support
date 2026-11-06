# P18/P20 최신 marker 계약·007 검토

2026-11-06 KST · R01 · [구조화 결과](summary.json).

조회 시 PR #27은 공유된f306778보다 두 커밋 뒤의15e3c5a(알림시도 미확인 marker 통합·복구계약 대조 포함), #28은fc776e2다. 두 브랜치는 main9086cff 대비 뒤처짐0이며 CI/새 검토 worktree는 깨끗하다. R04 자신의 미커밋 없음은 전달 보고이며 그 PC를 조사하지 않았다. #16 원격 head는 조회 시6a963c6으로, 전달문의a57efb0과 구분한다.

독립 재실행: #27 unittest83건 중76통과·HTTP7생략, Ruff58파일·문서/공개후보 통과. #28 unittest76건 중69통과·HTTP7생략, Ruff50파일·문서/공개후보 통과. P20 스크립트의16/16은 로컬 코드/오류항목 주입 검증이며 실제 n8n Error Workflow 이중 장애 주입은 아니다. E05/E04 continueRegularOutput, E02 가린 문맥 참조, E08 안전종료를 확인해 이전 코드 결함의 수정을 구분한다. 실제 scope/운영알림·VM 판정은 후속이다.

P1: 같은 case의 기존 티켓에 알림 sent 표식과 같은 담당자가 있고 새 context.summary·attempt가 들어오면 H39가 쓰기계획 없이 done/context_saved=confirmed를 반환한다. H40 false는 H12로 바로 연결돼 새 사실·보완 횟수가 Jira에 저장되지 않는다. 배정/알림 중복 방지와 문맥 갱신은 별도 처리하고, 문맥 저장을 실제 확인한 뒤 confirmed로 해야 한다. 원 요청의 완전 재전송인지 새 보완인지도 구분해야 한다. 공개 설계는 최신 CaseFacts를 담당자가 Jira에서 읽을 수 있어야 한다.

P2: 실제 PostgreSQL16.15 격리 컨테이너에서1b83d18의001~006 환경을 만든 뒤 새007을 적용했다. 기존 일반 DLQ 행과runtime EXECUTE 권한은 같고 constraint/function/case/runtime-role 네 계약도 통과했다. D02 정규화를 거친 marker를 두 request로 보내도 failed_step=B27이면 같은dlq_id·deduplicated=true였다. 같은case의 다음marker에서 failed_step=H39로 바꾸면 다른ID가 생겨 pending행2개가 됐다. SQL의키가case대체참조뿐아니라failed_step/error_code도포함하기때문이다. 의도한요건이case단위1개라면키를맞추고,고정실패단계전제라면소비계약/검증을명시해야한다. 이 시험은 로컬 일회용DB뿐이며VM/서비스007을적용하지않았다. 컨테이너는시험후중지했다.

공개 STORAGE-DESIGN의 RecoveryCapsule action 표에는 alert_marker가 아직 없다. 원본 계약의 action/복구 의미/중복 기준과 R02 소비·R05 기대값을 함께 맞춰야 한다. R04 원본을 대리 편집하지 않았다. 새 기능은 이전1b83d18 실제 생성/save 증거로 완료 처리하지 않으며 이전 실행 기록은 보존한다. 새 문제 보완 뒤 #27 검토·병합→#16 main 반영→#28 재확인 및 VM 시험의 순서가 적절하다.
