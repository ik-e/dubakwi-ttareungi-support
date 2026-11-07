# DLQ 복제본 대조와 S05 인계

2026-11-06 KST · R01 · P18/P20.

사용자가 전달한 R04 갱신 보고를 기존 웹 SSH에서 n8n CLI export로 직접 확인했다. workflow는 실행하지 않았다.

DLQ 원본은 87ee11c와 최신86d78e7이 동일하다. 지정된 R01 DLQ 복제본의 6개 노드 parameters와 전체 connections의 정규화 JSON SHA-256이 원본과 모두 같다. D03 false→D06 연결, 기존 workflow ID·PostgreSQL Credential·비활성 상태 유지도 확인했다. 명명된 변경 전 백업은 5노드·비활성으로 존재한다. 환경별 메타데이터까지 저장소와 동일하다는 의미는 아니다.

state 11노드 복제본의 S05 해시는9d7eaf2와 같아 아직86d78e7이 미반영이다. 새 문구 시험과 일반 회귀84건 중77통과·HTTP7생략, Ruff58파일·문서/공개후보/diff 검사가 통과했다. R04에게 이 비활성 시험 사본의 S05 parameters.jsCode만 갱신하는 범위를 인계한다. 변경 전 보존·호출 조율·ID/Credential/비활성/연결/다른 노드 유지가 조건이다. R01은 이번에 workflow를 편집하지 않았다.

백업은 복제본 회귀·SQL007 검증과 복구 기준 확인 전까지 보존한다. SQL007 적용 상태/실제 중복 제거는 이번 대조에서 확인하지 않았다. 업무 실행·DB/Jira 자료 쓰기·전체S1은 수행하지 않았고, 읽기용 임시 export 파일만 n8n 컨테이너에 생성했다. Credential export/decryption은 하지 않았다. 이미 받은 설명은 AGENTS3.1에 따라 취합하며 재작성을 요구하지 않는다. 원 Discord링크/시각은 제공되지 않았다.

