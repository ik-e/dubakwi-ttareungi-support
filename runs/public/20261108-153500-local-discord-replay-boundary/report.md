# Discord D05/D10 로컬 경계 시험 및 VM 잔여 확인

- 실행 ID: `20261108-153500-local-discord-replay-boundary` (KST)
- 실행 시각: 2026-11-08 15:35 KST
- 환경: Windows 로컬, `uv run --locked`, PR36 저장소 작업 트리
- 검증 명령: `uv run --locked python -m unittest discover -s tests/channels -p test_discord_bot.py -v`

## 결과

| 시나리오 | 판정 | 근거와 범위 |
| --- | --- | --- |
| D05 사용자 매핑 누락 경계 | 로컬 부분 통과 | `test_user_map_lookup_and_unregistered`, 설정 파싱/필수 매핑 테스트 포함 어댑터 suite 전체 통과. 별도 미등록 Discord identity로 VM slash command를 실행한 것은 아님. |
| D10 같은 interaction replay 경계 | 로컬 부분 통과 | 동일 interaction에 대해 안정된 `dc-<interaction_id>` request_id를 재사용하는 두 단위 테스트 통과. Discord 플랫폼이 동일 interaction을 실제 재전달한 것은 아니며 저장 응답 및 외부 호출 0도 이 실행으로 입증하지 않음. |
| Discord adapter suite | 통과 | 22/22 unittest 통과. |
| TC-15 VM 격리 고장 종단 | 차단/미실행 | 기존 [사전 점검](../20261108-125600-vm-final-test-followup/report.md)에서 시험 Support 사본이 PR36 운영 search/handoff webhook 참조. 안전한 고유 ingress 및 fault 배선이 확인되지 않아 synthetic POST는 하지 않음. |
| 담당자 실 수신/열람 (J02) | 미검증 | 기존 읽기 전용 확인에서 현재 계정은 담당자 전용 알림 채널에 접근 제한. API assign/알림 표식은 사람의 수신/열람 증거가 아님. |

## 결론

저장소에서 검증 가능한 D05 등록 매핑 누락과 D10 안정 request_id 경계는 기존 어댑터 회귀 22/22로 통과했다. 이는 실 Discord 미등록 사용자, 플랫폼 재전달, 실제 외부 부작용 0을 검증한 것으로 확대 해석하지 않는다. VM 실 사용자 경로를 더 진행하려면 미등록 Discord identity와 실제 담당자 채널 권한이 필요하다. TC-15는 격리 배선 확인 없이 요청을 보내지 않았으며 안전 차단 조건을 준수했다.
