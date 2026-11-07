# 담당 매핑 반입 및 support 이관 실연동

2026-11-06 KST, R01. 사용자가 R05 시험 종료와 현재 반입 가능 상태를 확인했다. 실제 진행 중 실행0을 확인하고 현재 handoff를 비공개 백업한 뒤 R04가 제공한 support/security 매핑을 반입했다. H39 역할 매핑만 변경됐고 기존 workflow ID·다른 노드·연결·settings·Credential이 보존됐음을 게시 후 대조했다. 환경 적용이며 Git 원본의 자리표시자는 유지한다. 실제 계정·Jira/요청 식별자·원시는 비공개에 보관했다.

새 환불 문의1건으로 support 이관을 시험했다. 실행532, 하위534, HTTP200/8.674초/담당자 이관/needs_human/normal이다. 생성·문맥 저장·담당 배정·알림 효과 confirmed, 종료 none으로 반환됐다. native HTTP는 생성201·문맥/배정204·알림200·알림 성공 표식204다. 알림 API 수락을 확인한 것이며 담당자의 메일함 도착까지 확인하지 않았다.

독립 native Jira GET200에서 지정한 support accountId 일치와 열린 상태(해야 할 일/category new/resolution null)를 확인했다. DB completed/respond/revision5·최종응답 존재·주요8필드 일치·해당DLQ0이다. HTTP 응답의 timings 추가 필드 때문에 전체 객체 동일성은 false였지만 계약8필드는 모두 일치한다. 이관 업무는 Jira 티켓을 닫지 않고 직원 처리 대상으로 남기는 것이 정상이다.

security 매핑은 적용됐지만 실제 security 이관 시험은 하지 않았다. R04 최종 대조·R05 공식 판정, TC12 답변 및 긴급 분류 검토는 별도다. 기존 실패 건을 재전송/재배정/종료/정리하지 않았다. n8n 재시작·DB 직접 갱신 없이 기존 API/저장 게이트로 시험했다. 이번 support 경로 성공만으로 전체 시나리오 완료를 선언하지 않는다.
