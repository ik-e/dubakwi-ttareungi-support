# 팀 Webhook 키와 n8n 실행 데이터

- 2026-11-07 KST / R01 / O04·E05·W09·W11 후속 보안 조치
- 사용자 요청: 키가 실행 기록에 남지 않도록 조치하고 현재 키의 교체 필요 여부 확인.
- 상태: **활성 팀 키 입구3개 이력 보존 해제 적용, 현재 키 교체 필요 확인. 실행 중/삭제 유예 DB 원문까지 완전 미저장은 미달. 키 교체 자체는 아직 하지 않았다.**
- [VM 대조 결과](../runs/public/20261107-093250-vm-execution-data-security/report.md). 실제 키·주소·ID·원복 백업은 비공개 인계에만 둔다.

## 확인한 노출과 적용 범위

R05의 실행849 발견을 VM의 읽기 전용 SQLite 조회로 대조했다. 현재 봇 팀 키 파일의 값이 해당 실행의 저장 데이터에 포함됨을 값 출력 없이 확인했다. 따라서 이미 폐기된 옛 키에만 해당하는 문제가 아니며 **현재 팀 키 교체가 필요하다**. 외부 공개 여부는 별도다. 이번 작업은 외부 유출이나 PDF 전체 검사를 수행하지 않았다.

인증 Credential이 정상이어도 Webhook의 출력 headers는 요청 데이터를 포함한다. 후속 Code 노드에서 헤더를 제거하는 것만으로 이미 저장된 입구 원문을 없앨 수 있다고 보지 않는다.

팀 키를 받는 활성 입구는 기존 support, P19 real support, P19 B17 support의3개다. 변경 전 JSON을 비공개700/600 백업하고 다음 workflow settings를 적용했다.

```json
{
  "saveDataErrorExecution": "none",
  "saveDataSuccessExecution": "none",
  "saveManualExecutions": false,
  "saveExecutionProgress": false
}
```

3개 모두 게시 상태를 유지하며 업무 노드·노드 내 Credential 참조·연결은 이전 자료와 일치했다. UI가 추가한 기본 설정은 비공개 전후 자료로 보존했다. B17은 검증 중 게시 해제/재게시를1회 수행했고 n8n 컨테이너 재시작은 하지 않았다. 이 변경은 TC12 등 업무 수정본 반입이 아니다. 인증은 그대로 유지한다.

비활성 팀 키 사본3개는 이번에 설정을 바꾸지 않았다. 활성화·수동 실행 전 아래 overlay를 반드시 적용한다. 별도 내부키를 받는 검색/handoff의 저장 정책까지 이번 조치로 완료됐다고 주장하지 않는다.

## 삭제 대기를 미저장으로 오인하지 않기

가림 기능은 현 UI에서 Upgrade로 비활성이다. 저장하지 않음을 선택해도 n8n은 실행 시작 시 DB에 임시 데이터를 넣고, 이력을 남기지 않는 실행은 삭제 대기(deletedAt)로 처리한다. 이번 고유 표식 요청에서 실제로 **삭제 대기 원문에도 키가 남아 있음**을 확인했다. 따라서 완료 이력을 보존하지 않는 설정과 DB 원문에 한 번도 키가 기록되지 않는 보장은 다르다.

초기 확인에서는 삭제 대기 행을 설정 미반영으로 잘못 판단했다. 후속 deletedAt 대조로 정정했다. 재게시만으로 원문 잔존이 해소됐다고 기록하지 않는다. 기존 실행849 및 과거 공식 증거를 일괄 삭제하거나 DB를 직접 수정하지 않았다.

원문을 엔진 저장 이전부터 차단하려면 인증 완료 후 키가 실행 입력으로 전달되지 않는 입구, 또는 원본 공유 키를 보내지 않는 검증된 단기 서명 인증 등 추가 설계가 필요하다. 새 서버·인증 계약 변경을 이번 설정 작업에 임의로 추가하지 않는다. R01·R02·R04·R05가 시험 관측과 인증을 유지하는 방법을 검토해야 한다. Enterprise 가림을 사용하더라도 표시 가림과 실제 저장/삭제 범위는 따로 검증한다.

공식 자료: [n8n 실행 데이터 관리](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/manage-execution-data), [가림 기능/Enterprise 조건](https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/redact-execution-data). 보존·삭제 유예의 실제 환경 값은 VM 인계에서 확인하며 기본값을 실측값으로 쓰지 않는다.

## 재배포·시험 인계

렌더링한 support 사본을 반입하기 전에 아래를 적용한다. 저장소 업무 JSON은 바꾸지 않고 새 비공개 파일을 만든다.

```sh
uv run --locked python scripts/dev/protect_n8n_execution_data.py --source runs/private-render/support.json --output runs/private-render/support-protected.json
```

이 도구는 지정한 Header Auth Webhook 사본의 settings만 바꾸며 API 호출·키 교체·기존 실행 삭제는 하지 않는다. **DB 임시 원문까지 차단하는 도구가 아니다.** 원복/재반입 시에도 과거의 저장 기본값을 무심코 복원하지 않는다. 설정이 사라진 사본은 활성화하지 않는다.

R05는 앞으로 해당 입구의 n8n 노드 원문 이력을 항상 볼 수 있다고 가정하지 않는다. 가린 응답·시각·코드/설정 버전·Jira/state/DLQ 효과를 별도 증거로 남기고, 상세 실행이 필요한 격리 시험은 사용 키의 폐기 시점과 관측 범위를 먼저 정한다. 과거 저장된 실행 증거는 그대로 보존한다.

현재 키 교체 시 대상은 n8n team-key Credential, 봇 팀 키 파일, 사용 중인 비공개 env/시험 인계·시험 담당자다. 같은 창에서 동기화하고 새키 인증 성공·구키403·봇 소비를 확인한다. Jira API 토큰이나 내부키를 이번 팀 키로 혼동하지 않는다. 현재 교체 필요성은 확인됐지만 Credential·봇 파일·시험 인계의 값은 아직 변경하지 않았다.
