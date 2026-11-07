# PR36 원본 PR 파일별 수용 결정

2026-11-07 / R01. 열린 원본10건의95개 PR-파일 항목을 검토했다. 동일 경로가 여러 PR에 있으면 각각 대조했다. `수용 결정 완료`는 전체 기능·VM 통과나 원본 PR 종료를 뜻하지 않는다. 원본 head/파일 해시/전체 원문은 Git 제외된 이번 로컬 감사 원장에 보존한다. PR36 자체와 새 코드도 별도 전체 후보 manifest에 포함한다.

| PR | 고정 head | 경로 | 처리 | 근거 |
|---|---|---|---|---|
| #24 | `dfcaff2` | `.gitattributes` | 현행 공개 정책 유지 | 현행 텍스트 LF와 PDF 바이너리 처리 유지; JS LF만 추가. PR24의 공개 허용 확대는 채택하지 않음 |
| #24 | `dfcaff2` | `.gitignore` | 현행 공개 정책 유지 | 현행 공개 차단 유지; .dockerignore 정확한 예외만 추가. PDF/원문/이미지 일괄 허용 제외 |
| #24 | `dfcaff2` | `docs/output/pdf/RAG-presentation-script.md` | 가림·경로 이동 수용 | docs/project/presentation/r03-rag-script.md로 역할 ID 가림·당시 결과 한계 추가; 원문은 로컬 보존 |
| #24 | `dfcaff2` | `docs/output/pdf/두바퀴_RAG_발표자료.pdf` | 비공개 보존·공개 제외 | 9쪽 검토·렌더 기록 보존. 포함 원문 화면의 공개 권리 미확정; 공개 미수용은 명시적 제외 결정 |
| #24 | `dfcaff2` | `docs/project/RAG-ARCHITECTURE.md` | 공식 RAG 원본에 통합 | 공식 원본과 제출요약 관계 유지. PR24 청킹/권한·PR45 실패796/미측정/재색인 경계 수용 |
| #24 | `dfcaff2` | `docs/rag-knowledge/r03-vm-index-handoff.md` | 날짜별 역사 수용 | PR24의 날짜별6~8절을 역사로 추가; 현재 VM 판정을 새로 선언하지 않음 |
| #24 | `dfcaff2` | `docs/rag-knowledge/rag-architecture-template.md` | 현행 원본으로 대체 | 공식 RAG-ARCHITECTURE와 rag-architecture 요약으로 대체. 청킹13질문 비교/한계는 현행 요약과 원본 runs로 보존 |
| #24 | `dfcaff2` | `docs/rag-knowledge/rag-permission-integration-test-plan.md` | 현행 추가 변경과 통합 | 현재 원본의 추가 계약/서식 보완을 유지하며 경로별 기능/문서 검사로 확인 |
| #24 | `dfcaff2` | `runs/public/20261105-120437-chunk-retrieval-comparison/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #24 | `dfcaff2` | `runs/public/20261105-141845-local-rag-permission-fixture-review/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #24 | `dfcaff2` | `scripts/test/check_public_files.py` | 현행 공개 정책 유지 | 현행 공개 검사와 바이너리 차단이 우선. PR24 PDF 예외는 재배포 근거 없어 미채택 |
| #24 | `dfcaff2` | `scripts/test/test_git_public_files.py` | 현행 공개 정책 유지 | 현행 바이너리 차단 회귀 유지. PDF 허용 시험을 추가하지 않음 |
| #29 | `f45c39a` | `README.md` | 현재 진입 링크로 통합 | 현재 진입 안내를 유지하고 PR36 후보·파일/설계 수용 문서로 연결. 과거 통합 인계는 역사 문서로 보존 |
| #29 | `f45c39a` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #29 | `f45c39a` | `docs/PRESENTATION-PLAN.md` | 현행 발표 계획 유지 | 현재 발표자/자료역할·측정/미실행 구분 유지; 옛 팀 인계 참조는 새 통합 수용 문서로 대체 |
| #29 | `f45c39a` | `docs/project/README.md` | 현재 진입 링크로 통합 | 현재 산출물 목록 유지; 결과서·역사·현재 후보 연결 추가 |
| #29 | `f45c39a` | `docs/project/SYSTEM-DESIGN.md` | 현행 설계로 통합 | 기존 범위·상태·경로와 현재 로컬 후보11절로 수용. 옛 미적용 문구는 현재 완료 상태로 덮지 않음 |
| #29 | `f45c39a` | `docs/project/TEAM-CHARTER.md` | 현재 대리 편집 근거로 통합 | 원래 역할 책임 유지; 사용자 전 경로 통합 대리 편집 지시 기록. 기존 제한 인계를 현재 전체 소유권 변경으로 해석하지 않음 |
| #29 | `f45c39a` | `docs/project/daily/DAY80.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #29 | `f45c39a` | `docs/project/daily/DAY81.md` | 후속 데일리 유지 | 최신 데일리에82일차11/09 14:50 마감이 이미 포함. PR29의 이전 부분 진행은 원본 보존·새 source-history로 연결 |
| #29 | `f45c39a` | `docs/project/presentation/integration-brief.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #29 | `f45c39a` | `infra/README.md` | 현행 운영 안내로 통합 | 현행 배포/보안 경계와 현재 후보 링크로 통합. 과거 DB/시민 공급 관측은 원본 runs와 역사 인덱스로 보존 |
| #29 | `f45c39a` | `infra/team-integration.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #29 | `f45c39a` | `runs/public/20261105-150648-local-r01-integration/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #29 | `f45c39a` | `runs/public/20261105-150648-local-r01-integration/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #29 | `f45c39a` | `runs/public/20261105-191506-local-pr-triage/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #29 | `f45c39a` | `runs/public/20261105-225822-local-integration-baseline/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #29 | `f45c39a` | `runs/public/20261106-095944-local-independent-readiness/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #29 | `f45c39a` | `runs/public/20261106-104806-local-daily-drafts/day80-original.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #29 | `f45c39a` | `runs/public/20261106-104806-local-daily-drafts/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #32 | `538fb97` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #32 | `538fb97` | `runs/public/20261105-161433-vm-storage-user-api/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #32 | `538fb97` | `runs/public/20261105-161433-vm-storage-user-api/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #32 | `538fb97` | `runs/public/20261106-090913-vm-handoff-recheck/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #32 | `538fb97` | `runs/public/20261106-090913-vm-handoff-recheck/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #32 | `538fb97` | `runs/public/20261106-101302-vm-operations-backup/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #32 | `538fb97` | `runs/public/20261106-101302-vm-operations-backup/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #33 | `403ee43` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #33 | `403ee43` | `docs/project/README.md` | 현재 진입 링크로 통합 | 현재 산출물 목록 유지; 결과서·역사·현재 후보 연결 추가 |
| #33 | `403ee43` | `infra/README.md` | 현행 운영 안내로 통합 | 현행 배포/보안 경계와 현재 후보 링크로 통합. 과거 DB/시민 공급 관측은 원본 runs와 역사 인덱스로 보존 |
| #33 | `403ee43` | `infra/vm-preflight.md` | 현행 안내·역사 링크 유지 | 현재 최초점검/후속 경계 유지; PR33 시민 공급의 당시 관측은 가린 report/summary 및 source-history 인덱스로 연결 |
| #33 | `403ee43` | `runs/public/20261105-164023-vm-p13-citizens/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #33 | `403ee43` | `runs/public/20261105-164023-vm-p13-citizens/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #34 | `53f7c59` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #34 | `53f7c59` | `runs/public/20261105-165132-vm-r04-start-ready/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #34 | `53f7c59` | `runs/public/20261105-165132-vm-r04-start-ready/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-184250-local-case-review/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-184250-local-case-review/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-185423-vm-jira-case-readiness/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-185423-vm-jira-case-readiness/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-192841-local-p27-followup/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-192841-local-p27-followup/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-194913-local-p27-168c79c-review/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261105-194913-local-p27-168c79c-review/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-053658-local-p27-1b83d18-review/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-053658-local-p27-1b83d18-review/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-054257-vm-integration-progress/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-054257-vm-integration-progress/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-081647-local-r04-refresh/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-081647-local-r04-refresh/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-102401-local-r01-r04-handoff/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-102401-local-r01-r04-handoff/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-104417-local-r01-retry-review/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-104417-local-r01-retry-review/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-104719-vm-dlq-clone-verify/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-104719-vm-dlq-clone-verify/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-111251-vm-r01-scope-audit/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #35 | `ccc0764` | `runs/public/20261106-111251-vm-r01-scope-audit/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #39 | `a558b70` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #39 | `a558b70` | `docs/project/README.md` | 현재 진입 링크로 통합 | 현재 산출물 목록 유지; 결과서·역사·현재 후보 연결 추가 |
| #39 | `a558b70` | `docs/project/TEAM-CHARTER.md` | 현재 대리 편집 근거로 통합 | 원래 역할 책임 유지; 사용자 전 경로 통합 대리 편집 지시 기록. 기존 제한 인계를 현재 전체 소유권 변경으로 해석하지 않음 |
| #39 | `a558b70` | `infra/README.md` | 현행 운영 안내로 통합 | 현행 배포/보안 경계와 현재 후보 링크로 통합. 과거 DB/시민 공급 관측은 원본 runs와 역사 인덱스로 보존 |
| #39 | `a558b70` | `infra/errors-recovery-handoff.md` | 현재 수동 안전 절차로 대체 | 현재 수동 fail/claim/resolve 전제와 무자동재개 절차로 재작성. 과거 인계와 실행 증거는 별도 보존 |
| #39 | `a558b70` | `runs/public/20261106-105725-local-p20-r05-handoff/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #43 | `0d0c955` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #43 | `0d0c955` | `runs/public/20261106-175341-local-n8n-p19-llm-time-fault/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #43 | `0d0c955` | `runs/public/20261106-180722-local-n8n-p19-pr31-knowledge-vs-support/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #43 | `0d0c955` | `scripts/test/make_llm_time_fault.py` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #43 | `0d0c955` | `scripts/test/test_make_llm_time_fault.py` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #43 | `0d0c955` | `scripts/test/vm-p19-real-test.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #44 | `6b19fc4` | `docs/DEVELOPMENT-PLAN.md` | 원장·역사 인덱스로 통합 | 현재 후보 진행과 PR별 역사 인덱스로 대체; 원본 개발 원장 스냅샷을 로컬 보존. 과거 진행/차단을 현재 완료로 재게시하지 않음 |
| #44 | `6b19fc4` | `docs/project/WORKFLOW-DESIGN.md` | 공통 계약으로 통합 | PR44 W02와 최신6b19fc4 B14 지연 분석 수용. null 공개 버전·문맥 저장·내부 deadline/최종save 계약 정정 포함 |
| #44 | `6b19fc4` | `runs/public/20261107-001950-local-p19-w02-closure/flow-cases.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #44 | `6b19fc4` | `runs/public/20261107-001950-local-p19-w02-closure/report.md` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #44 | `6b19fc4` | `runs/public/20261107-001950-local-p19-w02-closure/summary.json` | 역사 원본 보존 | 원본가린 증거를 동일 바이트로 보존; 최신 후보의 실행 결과로 재집계하지 않음 |
| #44 | `6b19fc4` | `scripts/test/support-skeleton-cases.js` | 기존 기대 유지·시험 추가 | 원본154 기대 결과 유지. 양성 mock의 잘못된 물리버전만 null로 교정하고 비null/대기문맥 거절3건 추가 |
| #44 | `6b19fc4` | `workflows/dubakwi-support.json` | 통합 후 경계 보완 | PR44 B08/B11/B23/B24/B25 수용 후 null 계약·wait 문맥 확인·저장 deadline·제한적 답변 검증 추가;157 Code 사례 |
| #45 | `aa98d26` | `docs/project/RAG-ARCHITECTURE.md` | 공식 RAG 원본에 통합 | 공식 원본과 제출요약 관계 유지. PR24 청킹/권한·PR45 실패796/미측정/재색인 경계 수용 |
| #45 | `aa98d26` | `docs/rag-knowledge/r03-concepts-reflection.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #45 | `aa98d26` | `docs/rag-knowledge/r03-evidence-review-20261107.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #45 | `aa98d26` | `docs/rag-knowledge/r03-final-handoff.md` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #45 | `aa98d26` | `docs/rag-knowledge/rag-architecture.md` | 제출 요약에 통합 | 공식 원본 참조와 당시 측정/PG 미래계획/현재미적용 경계를 함께 보존 |
| #45 | `aa98d26` | `scripts/dev/rag_latency_probe.py` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |
| #45 | `aa98d26` | `scripts/test/test_rag_latency_probe.py` | 원본 수용 | 원본 파일 그대로 수용; 기능 시험 또는 문서/공개 검사로 확인 |

## 보존과 제외의 의미

- 과거 README/원장/헌장의 미완료·환경 관측은 최신 배포 상태로 다시 게시하지 않는다. 아래 역사 인덱스와 각 날짜별 원본 증거로 보존한다.
- PR24 대본은 역할 ID로 가려 [발표 초안](../docs/project/presentation/r03-rag-script.md)에 수용했다. PDF9쪽과 원본 화면은 비공개로 보존하고 공개 예외는 채택하지 않았다.
- 이전 RAG template은 공식 [RAG 설계](../docs/project/RAG-ARCHITECTURE.md)·[제출 요약](../docs/rag-knowledge/rag-architecture.md)으로 대체했다.
- PR 없는 R054브랜치의53개 파일 수용 및3개 역사 충돌은 별도 원장으로 대조했다. 최초 실패·PASS*·TC07 미구현을 보존한다.
- 새 PR 없는 `r02/p05-workflow-flow-gif`9파일은 발표 그림과 공개 예외 변경이다. 패치와 해시를 비공개 보존하고 이번 결함 수정 후보에는 넣지 않았다. 누락된 업무 기능은 없다.
- main과 모든 원본 head가 바뀌면 재대조한다. 원격 CI/병합/역할 최종 확인은 별도다.

## 원본 기록 PR의 역사 인덱스

| 원본 | 보존된 의미 | 현행 대체 위치 |
|---|---|---|
| #29 | 팀 인계·P04 준비·P18 환경/계약 변경 이력 | `infra/team-integration.md`, `docs/project/presentation/integration-brief.md`, 현재 개발 원장 |
| #32 | DB/API 배포 부분 시험·별도 복원과 당시 한계 | `runs/public/20261105-161433-vm-storage-user-api/`, `runs/public/20261106-101302-vm-operations-backup/` |
| #33 | 기존6명+시민3명 호환 공급·P11 실행166 | `runs/public/20261105-164023-vm-p13-citizens/`; 현재 팀 user-api와 구별 |
| #34 | 비활성 R04 시작 게이트·무소유 state smoke | `runs/public/20261105-165132-vm-r04-start-ready/` |
| #35 | Jira Resolution 준비·case SQL 검토·충돌 재현/수정 확인 | 날짜별 `runs/public` 원본·현재 문맥/DB 통합 후보 |
| #39 | DLQ/state 사본 대조·재개 미구현·수동확인 | `infra/errors-recovery-handoff.md`, 현재 보안/운영 절차 |
