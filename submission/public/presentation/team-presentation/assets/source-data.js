window.SOURCE_DATA={
  "docs": [
    {
      "id": "r02-notes",
      "role": "R02",
      "title": "워크플로우 · 개념과 회고",
      "slides": [
        4,
        7
      ],
      "source": "sources/r02-notes.html",
      "blocks": [
        {
          "html": "<h1>두바퀴 R02 워크플로우 아키텍처 담당 자료</h1>"
        },
        {
          "html": "<h2>내가 담당한 일</h2>"
        },
        {
          "html": "<li>시민 문의가 들어온 뒤 입력 검사·사용자 확인·분류·검색·답변·검증·티켓 처리·저장·응답으로 이어지는 전체 워크플로우를 설계했다. 일반 안내, 정보 보완, 담당자 이관, 본인 상태 조회, 긴급 복합 문의의 경로를 구분했다.</li>"
        },
        {
          "html": "<li>n8n 본체 <code>dubakwi-support.json</code>의 노드와 연결선을 구성하고, 분류·답변 작성·검증을 맡는 LLM의 역할과 출력 형식을 나눴다.</li>"
        },
        {
          "html": "<li>R03의 검색 결과, R04의 Jira·상태 저장·DLQ와 연결하기 위해 요청·응답 필드와 실패 시 처리 기준을 맞췄다. 하위 기능 자체의 구현과 VM 배포는 해당 담당자의 역할로 구분했다.</li>"
        },
        {
          "html": "<li>입력 거절·재전송·보완 한도·근거 부족·검증 실패·저장 실패가 발생했을 때의 분기를 설계하고, 로컬 Code·n8n 시험 및 R05 검증에서 확인된 문제를 보완했다. 로컬 성공과 실제 연동·공식 판정은 구분해 기록했다.</li>"
        },
        {
          "html": "<h2>구현에 필요한 개념과 기술</h2>"
        },
        {
          "html": "<h3>1. 워크플로우 아키텍처와 오케스트레이션</h3>"
        },
        {
          "html": "<p>워크플로우는 여러 작업을 어떤 순서와 조건으로 실행할지 정한 흐름이다. 오케스트레이션은 검색, AI 답변, 티켓, 저장처럼 서로 다른 기능의 호출과 결과를 조정하는 역할이다. 저는 각 기능이 독립적으로 동작하는 것뿐 아니라, 앞 단계의 결과를 다음 단계가 올바르게 받아 처리하도록 전체 구조를 연결했다.</p>"
        },
        {
          "html": "<p>일반 안내의 기본 흐름은 <code>입력·검사 → 분류 → RAG·조회 → 답변 → 검증 → 티켓 생성·처리 → 저장·응답</code>이다. 모든 문의를 같은 순서로 처리하지 않고 상황에 따라 필요한 단계만 거치도록 했다.</p>"
        },
        {
          "html": "<h3>2. n8n 노드와 조건 분기</h3>"
        },
        {
          "html": "<p>n8n에서는 Webhook으로 요청을 받고, Code로 입력·결과를 검사하며, If와 Switch로 경로를 나눈다. HTTP Request는 검색·조회·티켓 기능을 호출하고, Execute Sub-workflow는 상태 저장 같은 하위 흐름을 연결한다. 마지막에는 Respond to Webhook으로 정규화한 응답을 반환한다.</p>"
        },
        {
          "html": "<p>분기에서는 우선순위가 중요했다. 긴급 문의는 보완이나 검색을 기다리지 않고 먼저 담당자에게 연결한다. 일반 문의의 정보가 부족하면 보완 질문을 하고, 서버에 저장된 보완 횟수가 한도에 도달하면 이관한다. 일반 안내의 티켓은 답변 검증 뒤에 생성·종료하도록 했다.</p>"
        },
        {
          "html": "<h3>3. LLM 역할 분리와 구조화된 출력</h3>"
        },
        {
          "html": "<p>LLM은 문의를 분류하는 <code>triage</code>, 허용된 근거로 답변하는 <code>writer</code>, 답변의 근거와 정책을 확인하는 <code>verifier</code>로 나눴다. 역할마다 입력과 JSON 출력 형식을 정하고, 임의로 권한을 부여하거나 업무 도구를 실행하지 않도록 했다.</p>"
        },
        {
          "html": "<p>검증 모델이 통과라고 응답해도 곧바로 안내하지 않는다. B21 Code 노드에서 JSON 형식, 인용 근거, 개인정보 가림, 정책과 적용 범위를 다시 확인한다. 근거가 부족하거나 검증에 실패하면 담당자 이관으로 전환한다. 모델 검사와 Code 검사를 함께 사용하지만, 이것이 답변의 정확성을 완전히 보장한다는 뜻은 아니다.</p>"
        },
        {
          "html": "<h3>4. API·JSON 계약과 결과 정규화</h3>"
        },
        {
          "html": "<p>API는 다른 기능을 호출하는 접점이며, JSON은 요청과 결과를 주고받는 구조화된 데이터 형식이다. 본체는 검색의 <code>SearchRequest/SearchResult</code>, 티켓의 <code>TicketRequest/TicketResult</code>, 저장의 <code>StateRef</code> 등 공통 계약을 사용한다.</p>"
        },
        {
          "html": "<p>단순히 HTTP 요청이 성공했는지만 보지 않고 실제 업무 효과가 확인됐는지 검사한다. 검색 결과가 없는 <code>empty</code>, 실행할 필요가 없는 <code>skipped</code>, 실패한 <code>error</code>를 구분하고, 티켓 결과에서는 생성·종료·배정·알림과 저장 여부를 각각 확인한다. 다른 담당자의 기능과 연결할 때 필드 이름뿐 아니라 성공과 실패의 의미까지 맞추는 것이 필요했다.</p>"
        },
        {
          "html": "<h3>5. 분기·병렬 구조와 보완·긴급 후속 흐름</h3>"
        },
        {
          "html": "<p>B13에서 준비한 요청은 B14의 RAG 검색과 B15의 본인 기록 조회로 갈라지고, B16에서 결과를 취합한다. 사용하지 않는 기능도 <code>skipped</code> 결과를 반환해 합류 조건을 분명히 했다. 다만 가지가 두 개라는 사실만으로 실제 동시 실행이나 처리 시간 단축을 주장할 수는 없다. 실행 순서와 시간은 실제 환경에서 확인해야 한다.</p>"
        },
        {
          "html": "<p>보완은 같은 실행 안에서 무한 반복하는 방식이 아니라, 새 <code>request_id</code>와 같은 <code>case_ref</code>로 다음 요청을 받아 이어간다. 긴급 문의는 최초 티켓·알림 확인 뒤 검색·조회로 돌아와 초동 안내를 보완하되, 티켓 재생성·재알림을 반복하지 않도록 가드를 둔다.</p>"
        },
        {
          "html": "<h3>6. 상태 관리·멱등성과 저장 게이트</h3>"
        },
        {
          "html": "<p><code>request_id</code>는 한 요청과 재전송을, <code>case_ref</code>는 이어지는 문의를 구분한다. 멱등성은 같은 요청을 반복해도 업무 효과가 중복되지 않도록 만드는 성질이다. 같은 소유자·입력의 완료 요청은 저장된 결과를 재사용하고, 처리 중이거나 효과 확인이 필요한 요청은 자동으로 전체 실행을 반복하지 않는다.</p>"
        },
        {
          "html": "<p>외부 변경 전에는 의도를 저장하는 <code>prepare</code>, 생성이 확인된 티켓 ID를 연결하는 <code>bind</code>, 최종 결과를 저장하는 <code>finish</code> 경계를 지킨다. 본체의 최종 저장도 B31 → B37 → B38 → B39 → B32 순서로 준비 결과와 실행 허용 여부를 확인한다. 저장 계약의 내부 구현은 R04가 맡고, 저는 본체가 이 게이트를 건너뛰지 않도록 호출·분기·결과 검사를 연결했다.</p>"
        },
        {
          "html": "<h3>7. 시간 예산과 부분실패 처리</h3>"
        },
        {
          "html": "<p>문의 처리에는 전체 응답 기한과 각 기능의 실행 한도가 필요하다. 설계에서는 전체 20초 안의 응답을 기준으로 검색·모델·티켓·마무리에 시간을 배분한다. 모델만 오래 기다려 티켓 처리나 최종 저장 시간을 잃지 않도록 남은 시간과 예약 시간을 함께 고려한다. 이 값은 설계·구현 기준이며 전체 사례에서 실측 통과했다는 의미는 아니다.</p>"
        },
        {
          "html": "<p>또한 명확한 실패와 성공 여부 미확인을 구분한다. Jira 생성 요청의 응답이 유실되면 실제로 생성됐을 수 있으므로 바로 다시 만들지 않는다. 확인한 ID와 효과를 보존하고 실패 상태·DLQ·운영 확인 경로로 연결한다. 자동 종료는 안내 제공 완료이고, 담당자 연결은 지정·알림 수락 확인이며, 실제 문제 해결이나 담당자 열람과는 다르다.</p>"
        },
        {
          "html": "<h2>관측 결과와 한계</h2>"
        },
        {
          "html": "<li>본체는 로컬 Code와 로컬 n8n에서 분류·검색·답변·검증·티켓·저장 연결을 시험했다. 실제 LLM·검색을 사용한 시험에서도 가짜 Jira·임시 저장소를 사용한 범위가 있으므로 실제 운영 연동 통과로 합산하지 않는다.</li>"
        },
        {
          "html": "<li>2026-11-06 실행 305는 등록 사용자의 정상 문의 1건이 연결된 기록이다. R05는 n8n 화면에서 검색 근거와 답변의 일치를 확인했지만 Discord·Jira·DB 독립 조회는 R01 보고에 의존했다. 정상 1건으로 전체 분기·권한·중복·장애·복구를 검증했다고 말하지 않는다.</li>"
        },
        {
          "html": "<li>B17의 시간 판정과 모델 실행 한도는 사용자 지시에 따른 R01 대리 수정·통합 기록이 있다. R02 본체 설계와 공동 보완의 역할을 구분하며, 줄인 한도의 성능은 별도 실측이 필요하다.</li>"
        },
        {
          "html": "<li>시민 답변에 내부 출처 설명이 섞이는 문제(F-S1-03)와 요금 문의의 보완 질문 문제(TC12)에 대한 로컬 수정·비교 기록이 있다. 확인한 기록 기준으로 VM 반영·R05 재시험 전까지 해결 완료로 표시하지 않는다.</li>"
        },
        {
          "html": "<li>실패 문의의 자동 재개, 외부 효과 미확인 뒤의 복구, 실제 동시 요청의 중복 방지와 전체 시간 기준은 별도 검증이 필요하다. 워크플로우가 연결됐다는 사실과 모든 업무 효과가 안전하게 확인됐다는 사실을 구분한다.</li>"
        },
        {
          "html": "<h2>소감</h2>"
        },
        {
          "html": "<p>처음에는 워크플로우 설계가 기능을 순서대로 연결하는 일이라고 생각했다. 직접 구성해 보니 어떤 조건에서 다음 단계로 넘어가야 하는지, 언제 멈추거나 사람에게 연결해야 하는지를 정하는 일이 더 중요했다. 특히 일반 안내와 긴급 문의의 티켓 생성 시점을 다르게 설계하면서, 같은 기능도 실행 순서에 따라 사용자 경험과 업무 의미가 달라진다는 것을 배웠다.</p>"
        },
        {
          "html": "<p>LLM이 답변을 만들었다고 해서 서비스가 끝나는 것도 아니었다. 근거와 정책을 검사하고, 티켓 처리와 저장이 확인된 뒤 어떤 수준의 완료를 사용자에게 안내할지 판단해야 했다. 정상 경로뿐 아니라 보완·검증 실패·응답 유실 같은 상황을 함께 설계하는 과정에서 안정적인 흐름의 중요성을 느꼈다.</p>"
        },
        {
          "html": "<p>R03·R04·R05와 연결하면서 노드가 정상 실행되는 것과 전체 서비스가 올바르게 동작하는 것이 다르다는 점을 알게 됐다. 같은 성공이라는 표현도 검색 성공, 티켓 생성 성공, 결과 저장 성공이 각각 달랐고, 이를 구분해 기록해야 다른 담당자와 문제를 정확히 확인할 수 있었다.</p>"
        },
        {
          "html": "<p>다음에는 구현 초기에 공통 요청·응답과 실패 사례를 더 구체적으로 맞추고, 부분실패·중복 요청·시간 예산을 함께 시험하고 싶다. 흐름도를 보기 좋게 만드는 데서 그치지 않고, 실제 실행 증거로 각 연결의 의미를 설명할 수 있는 설계를 하고 싶다.</p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r03-slides",
      "role": "R03",
      "title": "RAG · 발표 공개 정리 8장",
      "slides": [
        5,
        6
      ],
      "source": "sources/r03-slides.html",
      "blocks": [
        {
          "html": "<div class=\"eyebrow\">DUBAKWI / R03 장역할 담당자</div>"
        },
        {
          "html": "<h1>따릉이 상담을 돕는<br>RAG 데이터 처리</h1>"
        },
        {
          "html": "<p class=\"lead\">질문에 답하기 전에 관련 문서를 찾아<br>AI 답변의 근거로 활용합니다.</p>"
        },
        {
          "html": "<div class=\"flow\"><span>자료 수집</span><span>전처리</span><span>청킹</span><span>임베딩</span><span>저장·검색</span></div>"
        },
        {
          "html": "<p class=\"foot\">2026.11.07 확인한 기록 기준 · R01 최종 내용 확인 전</p>"
        },
        {
          "html": "<div class=\"eyebrow\">01 / 데이터 수집</div>"
        },
        {
          "html": "<h2>어떤 자료를 사용했나요?</h2>"
        },
        {
          "html": "<h3>따릉이 앱 챗봇</h3>"
        },
        {
          "html": "<p>대여·반납·요금·환불 등 메뉴와 하위 안내를 직접 확인했습니다.</p>"
        },
        {
          "html": "<h3>공개 안내</h3>"
        },
        {
          "html": "<p>서울시·서울시설공단의 공개 자료와 FAQ를 참고했습니다.</p>"
        },
        {
          "html": "<h3>시민용 6개 문서</h3>"
        },
        {
          "html": "<p>대여, 반납, 고장·사고, 요금·환불, 계정·보안, 후속 문의</p>"
        },
        {
          "html": "<h3>담당자용 2개 문서</h3>"
        },
        {
          "html": "<p>이관 정책과 티켓 처리 단계는 실제 기관 내부 규정이 아닌 <strong>교육용 가상 설정</strong>입니다.</p>"
        },
        {
          "html": "<p class=\"foot\">원문·사진은 내부 보관. 공개 자료는 조사 요약과 출처 링크를 사용합니다.</p>"
        },
        {
          "html": "<div class=\"eyebrow\">02 / 전처리와 청킹</div>"
        },
        {
          "html": "<h2>긴 문서를 작은 의미 단위로 나눴습니다</h2>"
        },
        {
          "html": "<h3>전처리</h3>"
        },
        {
          "html": "<p>주제별 Markdown으로 정리하고 출처·권한·버전과 실제/가상 표시를 관리합니다.</p>"
        },
        {
          "html": "<h3>청킹</h3>"
        },
        {
          "html": "<p>먼저 <code>##</code> 주제 절을 나눈 뒤, 각 절의 빈 줄로 구분된 문단을 청크로 만듭니다. 중복은 0자입니다.</p>"
        },
        {
          "html": "<p class=\"lead\"><span class=\"big\">44개</span> 청크 · 최소 61자 / 중앙 124.5자 / 최대 251자</p>"
        },
        {
          "html": "<p class=\"muted\">절 전체 방식은 41개였고 3개 절에서 실제·가상 정보가 섞였습니다. 공개 질문 13개 직접 임베딩 비교에서 두 방식 모두 기대 문서·절이 상위 3개에 포함됐습니다. 최종 답변 품질 시험은 아닙니다.</p>"
        },
        {
          "html": "<p class=\"foot\">수치는 2026-11-05 전처리 실측 · 토큰이 아닌 문자 수</p>"
        },
        {
          "html": "<div class=\"eyebrow\">03 / 임베딩과 검색</div>"
        },
        {
          "html": "<h2>질문과 문서의 의미를 비교합니다</h2>"
        },
        {
          "html": "<div class=\"flow\"><span>문서 청크</span><span>숫자 벡터</span><span>질문 벡터</span><span>유사도 비교</span><span>관련 근거</span></div>"
        },
        {
          "html": "<h3>임베딩 모델</h3>"
        },
        {
          "html": "<p><code>text-embedding-3-large</code><br>로컬에서 벡터 3,072차원을 확인했습니다.</p>"
        },
        {
          "html": "<h3>검색</h3>"
        },
        {
          "html": "<p>코사인 유사도로 비교해 최대 5개를 반환합니다. 점수 0.30은 시연용 임시 기준입니다.</p>"
        },
        {
          "html": "<p class=\"foot\">모델별 한국어 성능·실제 사용 비용 비교는 미측정입니다.</p>"
        },
        {
          "html": "<div class=\"eyebrow\">04 / 저장과 접근 권한</div>"
        },
        {
          "html": "<h2>누구에게 어떤 문서를 보여줄까요?</h2>"
        },
        {
          "html": "<h3>시민</h3>"
        },
        {
          "html": "<p><span class=\"pill\">public</span></p>"
        },
        {
          "html": "<p>시민용 안내 문서만 검색합니다.</p>"
        },
        {
          "html": "<h3>허용된 담당자</h3>"
        },
        {
          "html": "<p><span class=\"pill\">public + restricted</span></p>"
        },
        {
          "html": "<p>시민용 안내와 담당자용 가상 정책을 검색합니다.</p>"
        },
        {
          "html": "<p class=\"lead\">현재는 n8n <strong>Simple Vector Store 메모리</strong>에 저장합니다.</p>"
        },
        {
          "html": "<p class=\"muted\">재시작 시 재색인이 필요합니다. PostgreSQL·pgvector를 통한 RAG 벡터 영속 저장은 향후 계획이며, 현재 문의 상태 저장 DB와 구분합니다.</p>"
        },
        {
          "html": "<p class=\"foot\">인증된 내부 호출자가 전달한 권한을 검색 범위 선택에 사용합니다.</p>"
        },
        {
          "html": "<div class=\"eyebrow\">05 / 검색과 통합 확인</div>"
        },
        {
          "html": "<h2>실제 질문으로 결과를 확인했습니다</h2>"
        },
        {
          "html": "<h3>예시 질문</h3>"
        },
        {
          "html": "<p>“QR이 안 읽혀요. 자전거번호로 대여하는 방법을 알려주세요.”</p>"
        },
        {
          "html": "<p>기대 근거: <strong>rental-guide / QR 인식 또는 잠금 해제가 어려운 경우</strong></p>"
        },
        {
          "html": "<li>11월 5일 VM 검색 단독 시험: 16건 중 14건 통과, 2건 실패</li>"
        },
        {
          "html": "<li>실행 305: R05가 검색 결과 5건 모두 public, 기대 QR 절 2위, 답변 네 문장과 근거 일치를 확인</li>"
        },
        {
          "html": "<li>정상 문의 1건은 Discord부터 Jira·DB·비공개 응답까지 연결. R05는 Discord 화면과 Jira·DB 독립 조회에 R01 보고를 참고</li>"
        },
        {
          "html": "<p class=\"foot\">정상 1건은 전체 권한·장애·복구 시험 완료를 뜻하지 않습니다.</p>"
        },
        {
          "html": "<div class=\"eyebrow\">06 / 문제와 다음 단계</div>"
        },
        {
          "html": "<h2>검색 이후의 답변과 복구도 확인합니다</h2>"
        },
        {
          "html": "<h3>발견한 문제</h3>"
        },
        {
          "html": "<p>시민 답변에 내부 출처 메모가 섞였고, 다른 실행에서는 검색이 3초 제한을 넘어 이관됐습니다(약 3,018ms). 단계별 지연 원인은 미확인입니다.</p>"
        },
        {
          "html": "<h3>변경과 재시험</h3>"
        },
        {
          "html": "<p>R03 지식·검색과 R02 답변 생성 규칙은 별도 변경입니다. PR #31은 main에 병합됐으며 VM 적용·재색인과 재시험 상태는 R01 인계로 확인해야 합니다.</p>"
        },
        {
          "html": "<p class=\"muted\">시민 제한 요청 차단은 검색 단계의 권한 시험과 구분합니다. 즉시 색인 롤백 기능은 없으며, 실패 시 이전 색인본의 전체 재색인이 필요합니다.</p>"
        },
        {
          "html": "<p class=\"foot\"><a href=\"https://github.com/ik-e/dubakwi-ttareungi-support/pull/36\">전체 연동 PR #36</a> · <a href=\"https://github.com/ik-e/dubakwi-ttareungi-support/pull/31\">RAG 보완 PR #31</a> · R01 내용 확인 및 최종 편집 전</p>"
        },
        {
          "html": "<div class=\"eyebrow\">07 / 팀장 인계</div>"
        },
        {
          "html": "<h2>R01이 이어서 확인할 작업</h2>"
        },
        {
          "html": "<h3>색인·답변 재시험</h3>"
        },
        {
          "html": "<p>VM의 적용 버전을 확인하고 시험 시간을 조율한 뒤, 동일 질문을 검색 API와 전체 상담 흐름에서 각각 다시 시험합니다. 기존 결과와 실패 기록은 보존합니다.</p>"
        },
        {
          "html": "<h3>권한과 복구</h3>"
        },
        {
          "html": "<p>시민·담당자 권한이 실제 사용자 조회부터 검색까지 전달되는지, 재시작 후 재색인과 검색 복구가 되는지 확인합니다.</p>"
        },
        {
          "html": "<h3>느린 검색의 원인</h3>"
        },
        {
          "html": "<p>임베딩·검색·통신 시간을 나눠 측정한 뒤 전체 응답 시간 기준과 함께 판단합니다. 현재 원인은 확인되지 않았습니다.</p>"
        },
        {
          "html": "<h3>장기 개선</h3>"
        },
        {
          "html": "<p>PostgreSQL·pgvector 벡터 저장과 백업·복원은 별도 설계 및 검증 대상입니다. 기존 문의 상태 DB가 곧 RAG 저장소를 뜻하지 않습니다.</p>"
        },
        {
          "html": "<p class=\"foot\">공용 VM 수정·실제 권한 재시험은 팀이 정한 작업 시간에 진행 · <a href=\"https://github.com/ik-e/dubakwi-ttareungi-support/pull/36\">전체 연동 기록</a></p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r03-notes",
      "role": "R03",
      "title": "RAG · 개념과 회고",
      "slides": [
        5,
        6
      ],
      "source": "sources/r03-notes.html",
      "blocks": [
        {
          "html": "<h1>두바퀴 RAG 담당 자료 · 개념과 회고 초안</h1>"
        },
        {
          "html": "<p>작성: 장역할 담당자(R03) · 기준: 2026-11-07 확인 기록 · 발표 내용은 R01 검토용이다. 아래 소감은 전달된 작업 내용을 바탕으로 작성한 <strong>개인 소감 초안</strong>이므로 본인의 생각에 맞게 수정한다.</p>"
        },
        {
          "html": "<h2>내가 담당한 일</h2>"
        },
        {
          "html": "<li>따릉이 앱 챗봇과 공개 안내를 조사하고 시민용 안내 6개, 교육용 담당자 정책 2개를 정리했다. 실제 안내와 가상 설정을 구분하고 원문·사진은 팀 내부 보관 정책을 따랐다.</li>"
        },
        {
          "html": "<li>문서의 절과 문단을 청크로 만들어 OpenAI 임베딩과 n8n 메모리 기반 벡터 저장소에 색인하고, 권한별 검색과 근거 반환을 구성했다.</li>"
        },
        {
          "html": "<li>검색 정확도·접근 권한·실패·재색인 방법을 시험하고 R02·R04·R05와 검색 요청 및 근거 형식을 맞췄다.</li>"
        },
        {
          "html": "<li>실행 305의 정상 종단 결과와 R05 검토 범위, 후속 오류·원복 계획을 문서화했다. 전체 시나리오 통과는 별도다.</li>"
        },
        {
          "html": "<h2>구현에 필요한 개념과 기술</h2>"
        },
        {
          "html": "<h3>1. RAG와 출처 관리</h3>"
        },
        {
          "html": "<p>RAG는 질문과 관련된 자료를 먼저 검색하고 그 결과를 AI의 답변 근거로 사용하는 방식이다. 자료의 출처·확인 시점·버전을 함께 관리하면 답변의 근거와 오래된 내용을 확인할 수 있다. 실제 따릉이 안내와 두바퀴의 가상 업무 정책을 혼동하지 않도록 <code>[실제 안내]</code>, <code>[가상 설정]</code>을 구분했다.</p>"
        },
        {
          "html": "<h3>2. 전처리와 청킹</h3>"
        },
        {
          "html": "<p>전처리는 수집 자료를 주제별 Markdown으로 정리하는 과정이다. 청킹은 검색하기 쉽게 내용을 나누는 과정이다. <code>##</code> 절과 빈 줄로 나눈 문단을 기준으로 하고 인접 문단은 중복하지 않았다(오버랩 0자). 2026-11-05 전처리 기준 44개, 길이는 최소 61자·중앙 124.5자·최대 251자였다. 토큰 수가 아니라 문자 수다.</p>"
        },
        {
          "html": "<p>절 전체로 묶은 비교안은 41개였고 3개 절에서 실제·가상 정보가 섞였다. 공개 질문 13개를 직접 임베딩·코사인 방식으로 비교했을 때 두 방식 모두 기대 문서와 절이 상위 3개 안에 각각 13/13 포함됐다. 이 결과는 n8n 종단이나 최종 답변 품질 평가가 아니다.</p>"
        },
        {
          "html": "<h3>3. 임베딩과 유사도</h3>"
        },
        {
          "html": "<p>임베딩은 텍스트의 의미를 숫자 배열로 변환하는 것이다. <code>text-embedding-3-large</code>를 이용하며 로컬에서 3,072차원을 확인했다. 질문과 청크를 같은 방식으로 변환한 뒤 코사인 유사도로 비교한다. 상위 5개와 점수 기준 0.30은 초기 시연 설정이며 충분한 사례와 모델별 비용·성능 비교로 최적화한 값은 아니다.</p>"
        },
        {
          "html": "<h3>4. 저장소·권한·복구</h3>"
        },
        {
          "html": "<p>현재 시연은 n8n Simple Vector Store의 프로세스 메모리에 저장한다. 시민은 <code>public</code>, 허용된 담당자는 <code>public</code>과 <code>restricted</code>를 검색하도록 분리한다. 사용자 API→본체 B05→RAG 전달을 별도로 시험해야 하며 내부 호출자가 보낸 권한을 검색기가 신뢰하는 구조다.</p>"
        },
        {
          "html": "<p>메모리는 재시작 시 사라질 수 있어 원본과 workflow를 보존하고 수동 재색인해야 한다. 색인 준비 전에는 답변에 쓰지 않도록 한다. 기존 메모리 키를 교체하므로 실패 후 즉시 버전 롤백은 구현되지 않았고, 보존한 이전 색인본의 전체 재색인과 검증이 필요하다. VM 복구 시험은 미실행이다. 향후 PostgreSQL·pgvector 전환은 계획이며, 현재 문의 상태용 PostgreSQL과 RAG 벡터 저장은 구분한다.</p>"
        },
        {
          "html": "<h3>5. n8n·API와 협업</h3>"
        },
        {
          "html": "<p>n8n은 문서 색인과 검색 호출을 연결한다. 검색 API는 내부 인증을 사용하고 요청 ID와 <code>ok</code>, <code>empty</code>, <code>skipped</code>, <code>error</code> 상태, 문서명·절·청크·점수·권한 등의 근거를 반환한다. R02는 본체의 요청·답변, R04는 사용자·저장 연결, R05는 사례 판정을 맡았다. 서로의 필드와 실패 의미를 맞춰야 전체 흐름이 동작한다.</p>"
        },
        {
          "html": "<h2>관측 결과와 한계</h2>"
        },
        {
          "html": "<li>11월 5일 VM 검색 단독 16건 중 14건 통과·2건 실패. 보안 초동 및 대여 실패·환불 질문의 근거가 미흡했다. 기존 기록을 보존하고 변경본 적용 후 검색 직접 호출과 P19 경유를 나눠 재시험한다.</li>"
        },
        {
          "html": "<li>실행 305의 등록 사용자 정상 1건은 Discord부터 검색·답변·Jira·DB·비공개 응답까지 연결됐다. R05는 n8n 화면에서 public 근거 5건, 기대 QR 절 2위 및 답변 4문장의 근거 일치를 확인했고 Discord 화면·Jira/DB 독립 조회는 R01 보고에 의존했다. 전체 권한·장애·복구 통과를 뜻하지 않는다.</li>"
        },
        {
          "html": "<li>시민 답변의 내부 출처 표현(F-S1-03)과 보완 질문(TC12)은 로컬 수정 후보가 있으나 VM 반영·R05 재시험 전까지 미해결로 구분한다. TC12는 검색을 거치지 않는 본체 보완 질문 경로다.</li>"
        },
        {
          "html": "<li>PR #31 지식·검색 변경은 main 병합됐으나 VM 재색인은 별도 조율 상태다. <a href=\"../../../../docs/rag-knowledge/p31-vm-index-recovery-plan.md\">원복 준비</a>를 따른다.</li>"
        },
        {
          "html": "<li>R05의 WF-01 실행 #796에서 검색 응답이 약 3,018ms로 본체의 3초 제한을 넘어 담당자 이관됐다. 단계별 지연 시간은 측정되지 않아 실제 원인은 미확인이다. 로컬 모의 권한·청킹·워크플로 검사 13건은 통과했으며 인증 HTTP 7건은 내부 키 부재로 생략했다.</li>"
        },
        {
          "html": "<li>위 검색 지연과 권한 분리는 R01이 사용 중인 VM 버전·시험 창을 확인한 후 R02·R05와 실제 권한 경로 및 반복 검색을 검증하도록 인계한다. VM의 현재 적용 상태를 확인하기 전에는 최신 지식이 적용됐다고 단정하지 않는다.</li>"
        },
        {
          "html": "<h2>소감 초안 · 본인 확인 후 수정</h2>"
        },
        {
          "html": "<p>처음에는 RAG가 문서를 검색하는 기능이라고만 생각했다. 직접 만들어 보니 어떤 자료를 믿을 수 있는지, 실제 안내와 가상 정책을 어떻게 나누는지, 검색된 문장이 시민에게 어떻게 전달되는지까지 함께 고민해야 했다.</p>"
        },
        {
          "html": "<p>특히 자료 출처를 기록하려고 넣은 문장이 실제 답변에 섞였던 경험이 인상적이었다. 검색 결과가 맞더라도 사용자가 이해하기 쉬운 답변으로 이어지는지 별도로 확인해야 한다는 점을 배웠다.</p>"
        },
        {
          "html": "<p>또한 다른 담당자의 사용자 확인·본체·저장 기능과 연결하면서, 내 기능의 로컬 성공과 전체 서비스의 성공을 구분하는 것이 중요하다는 것을 알게 됐다. 다음에는 사례를 더 다양하게 준비하고 재색인·복구 방법도 구현 초기에 함께 검증하고 싶다.</p>"
        },
        {
          "html": "<h2>참고</h2>"
        },
        {
          "html": "<li><a href=\"../../../../docs/project/RAG-ARCHITECTURE.md\">RAG 공식 설계</a> · <a href=\"../../../../docs/rag-knowledge/rag-architecture.md\">제출용 설계 요약</a></li>"
        },
        {
          "html": "<li><a href=\"../../../../docs/rag-knowledge/r03-final-handoff.md\">R01 최종 인계</a> · <a href=\"../../../../docs/rag-knowledge/r03-evidence-review-20261107.md\">시험 결과 및 로컬 측정 도구</a></li>"
        },
        {
          "html": "<li><a href=\"https://github.com/ik-e/dubakwi-ttareungi-support/blob/r05/p19-s1-verdict/runs/public/20261106-162030-vm-p19-s1-r05-verdict/report.md\">정상 1건 R05 판정</a></li>"
        },
        {
          "html": "<li><a href=\"https://github.com/ik-e/dubakwi-ttareungi-support/pull/36\">전체 통합 PR #36</a> · <a href=\"https://github.com/ik-e/dubakwi-ttareungi-support/pull/31\">검색 개선 PR #31</a></li>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r04-slides",
      "role": "R04",
      "title": "연동과 안정성 · 구조·처리·개념",
      "slides": [
        3,
        7,
        8,
        10
      ],
      "source": "sources/r04-slides.html",
      "blocks": [
        {
          "html": "<p>\n\n\n\n\n<header>\n  <div class=\"brand\"><strong>두바퀴</strong><span>R04 · 역할 담당자</span></div>\n  \n</header>\n\n</p>"
        },
        {
          "html": "<div class=\"eyebrow\">Slide 1 · 담당 역할</div>"
        },
        {
          "html": "<h2>R04: 접수 대장(state)·Jira 연동(handoff)·실패 보관(DLQ)·Discord 어댑터 담당</h2>"
        },
        {
          "html": "<p class=\"sub\">문의 1건이 R02 본체를 지난 뒤의 기록, Jira, 실패 처리, Discord 입구를 맡았습니다.</p>"
        },
        {
          "html": "<div class=\"big\"><small>MY PART</small>R04</div>"
        },
        {
          "html": "<div class=\"verbs\"><span>기록하고</span><span>Jira에 넘기고</span><span>실패를 남기고</span><span>Discord로 받는다</span></div>"
        },
        {
          "html": "<h3 style=\"margin-top:6px\">R04 담당 기능 구조도</h3>"
        },
        {
          "html": "<div class=\"key\"><span><i class=\"sw me\"></i>R04가 만든 부품</span><span><i class=\"sw\"></i>외부 시스템 · 다른 역할</span><span style=\"color:#a0472c\">┄ 실패 경로</span></div>"
        },
        {
          "html": "<p>\n    <svg viewBox=\"0 0 1200 590\" role=\"img\" aria-label=\"R04 담당 기능 구조도: Discord 어댑터, 접수 대장, Jira 담당, 사용자 API, 실패 보관함, 오류 처리와 PostgreSQL, Jira, R02의 연결\" data-asset-index=\"5\">\n      <defs>\n        <marker id=\"sa\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#91ae6b\" style=\"fill: rgb(145, 174, 107); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker>\n        <marker id=\"sr\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#d08a70\" style=\"fill: rgb(208, 138, 112); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker>\n      </defs>\n      <rect class=\"vz\" x=\"190\" y=\"100\" width=\"800\" height=\"360\" rx=\"16\" style=\"fill: rgb(244, 248, 238); stroke: rgb(193, 210, 172); stroke-width: 1.4px; stroke-dasharray: 6px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"vzl\" x=\"970\" y=\"126\" text-anchor=\"end\" style=\"fill: rgb(106, 128, 102); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 700; text-anchor: end; opacity: 1;\">R04 담당 영역</text>\n\n      <rect class=\"ext\" x=\"10\" y=\"185\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(185, 195, 173); stroke-width: 1.4px; stroke-dasharray: 6px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"85\" y=\"214\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Discord</text><text class=\"vs\" x=\"85\" y=\"232\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">/문의 · 비공개 답변</text>\n      <rect class=\"ext\" x=\"440\" y=\"14\" width=\"330\" height=\"60\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(185, 195, 173); stroke-width: 1.4px; stroke-dasharray: 6px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"605\" y=\"40\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">R02 support 워크플로우</text><text class=\"vs\" x=\"605\" y=\"58\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">본체 · R04 영역 밖 (호출 경계)</text>\n      <rect class=\"ext\" x=\"1030\" y=\"185\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(185, 195, 173); stroke-width: 1.4px; stroke-dasharray: 6px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"1105\" y=\"214\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Jira (JBYS)</text><text class=\"vs\" x=\"1105\" y=\"232\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">티켓 · 전환 · 담당</text>\n      <rect class=\"ext\" x=\"450\" y=\"500\" width=\"240\" height=\"64\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(185, 195, 173); stroke-width: 1.4px; stroke-dasharray: 6px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"570\" y=\"527\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">PostgreSQL</text><text class=\"vs\" x=\"570\" y=\"545\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">state 표 · DLQ 표 · 상태 변경 함수</text>\n\n      <path class=\"vl\" d=\"M160 220H211\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"168\" y=\"212\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">/문의</text>\n      <path class=\"vl\" d=\"M300 160V44H436\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"308\" y=\"150\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">HTTP Webhook</text>\n      <path class=\"vl\" d=\"M575 74V156\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"582\" y=\"110\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">prepare · save</text>\n      <path class=\"vl\" d=\"M740 74C760 120 860 110 860 156\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"800\" y=\"104\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">티켓 처리 요청</text>\n      <path class=\"vl\" d=\"M432 74V378H389\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"420\" y=\"300\" transform=\"rotate(-90 420 300)\" text-anchor=\"middle\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: middle; opacity: 1;\">사용자 확인</text>\n      <path class=\"vl\" d=\"M765 208H674\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"706\" y=\"200\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">bind</text>\n      <path class=\"vl\" d=\"M955 208H1026\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"vl\" d=\"M670 236H705V522H694\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"712\" y=\"480\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">상태 기록</text>\n      <path class=\"vl\" d=\"M575 426V496\" marker-end=\"url(#sa)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"583\" y=\"470\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">실패 기록</text>\n      <path class=\"halo\" d=\"M820 256L674 352\" style=\"fill: none; stroke: rgb(252, 253, 249); stroke-width: 9px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><path class=\"vx\" d=\"M820 256L674 352\" marker-end=\"url(#sr)\" style=\"fill: none; stroke: rgb(208, 138, 112); stroke-width: 1.8px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlabr\" x=\"762\" y=\"318\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">실패 시</text>\n      <path class=\"halo\" d=\"M765 395H674\" style=\"fill: none; stroke: rgb(252, 253, 249); stroke-width: 9px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><path class=\"vx\" d=\"M765 395H674\" marker-end=\"url(#sr)\" style=\"fill: none; stroke: rgb(208, 138, 112); stroke-width: 1.8px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlabr\" x=\"716\" y=\"412\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">오류 기록</text>\n\n      <rect class=\"vg\" x=\"215\" y=\"160\" width=\"170\" height=\"96\" rx=\"13\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"300\" y=\"192\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Discord 어댑터</text><text class=\"vs\" x=\"300\" y=\"212\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">discord.py · /문의</text><text class=\"vs\" x=\"300\" y=\"229\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">사용자 매핑 · 비공개 응답</text>\n      <rect class=\"vg\" x=\"480\" y=\"160\" width=\"190\" height=\"96\" rx=\"13\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"575\" y=\"192\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">접수 대장 state</text><text class=\"vs\" x=\"575\" y=\"212\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">prepare · bind · finish</text><text class=\"vs\" x=\"575\" y=\"229\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">처리권 · 조건부 갱신</text>\n      <rect class=\"vg\" x=\"765\" y=\"160\" width=\"190\" height=\"96\" rx=\"13\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"860\" y=\"192\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Jira 담당 handoff</text><text class=\"vs\" x=\"860\" y=\"212\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">조회 · 생성 · 종료 전환</text><text class=\"vs\" x=\"860\" y=\"229\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">이관 · 담당 지정 · 알림</text>\n      <rect class=\"vg\" x=\"215\" y=\"330\" width=\"170\" height=\"96\" rx=\"13\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"300\" y=\"362\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">사용자·기록 조회 API</text><text class=\"vs\" x=\"300\" y=\"382\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">users.json · records.json</text><text class=\"vs\" x=\"300\" y=\"399\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">본인/타인 기록 구분</text>\n      <rect class=\"vg\" x=\"480\" y=\"330\" width=\"190\" height=\"96\" rx=\"13\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"575\" y=\"362\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">실패 보관함 DLQ</text><text class=\"vs\" x=\"575\" y=\"382\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">진행 상태 + 티켓 번호</text><text class=\"vs\" x=\"575\" y=\"399\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">이어서 복구</text>\n      <rect class=\"vg\" x=\"765\" y=\"330\" width=\"190\" height=\"96\" rx=\"13\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"860\" y=\"362\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">오류 처리 errors</text><text class=\"vs\" x=\"860\" y=\"382\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">개인정보 가림 · 기록</text><text class=\"vs\" x=\"860\" y=\"399\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">현재 초안</text>\n    </svg>\n    </p>"
        },
        {
          "html": "<div class=\"dgcap\"><b>읽는 법</b> · Discord 문의가 어댑터를 거쳐 R02 본체로 가고, R02는 접수 대장·Jira 담당·사용자 API를 호출합니다. 상태와 실패 기록은 PostgreSQL에 쌓이고, 티켓은 Jira가 보관합니다.</div>"
        },
        {
          "html": "<h3>담당 기능 개념도</h3>"
        },
        {
          "html": "<p>\n    <svg viewBox=\"0 0 1200 430\" role=\"img\" aria-label=\"한 문의가 접수 대장, Jira, 실패 보관함 세 곳에서 어긋나지 않게 하는 네 가지 원칙\" data-asset-index=\"6\">\n      <defs>\n        <marker id=\"ca\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#91ae6b\" style=\"fill: rgb(145, 174, 107); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker>\n        <marker id=\"cr\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#d08a70\" style=\"fill: rgb(208, 138, 112); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker>\n      </defs>\n      <text class=\"vt\" x=\"600\" y=\"30\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">한 문의가 세 곳에서 어긋나지 않게 하는 원리</text>\n      <path class=\"vl\" d=\"M135 160C135 70 1065 70 1065 160\" marker-start=\"url(#ca)\" marker-end=\"url(#ca)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <text class=\"vlab\" x=\"600\" y=\"78\" text-anchor=\"middle\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: middle; opacity: 1;\">③ 티켓 번호를 장부에 연결하고(bind), 바꾼 결과를 다시 확인한다(finish)</text>\n      <path class=\"vl\" d=\"M250 205H538\" marker-end=\"url(#ca)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"394\" y=\"196\" text-anchor=\"middle\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: middle; opacity: 1;\">① 장부에 먼저 적는다 (prepare)</text>\n      <path class=\"vl\" d=\"M950 205H662\" marker-end=\"url(#ca)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlab\" x=\"806\" y=\"196\" text-anchor=\"middle\" style=\"fill: rgb(93, 106, 88); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: middle; opacity: 1;\">② Jira는 한 번만 바꾼다</text>\n      <path class=\"vx\" d=\"M600 262V335\" marker-end=\"url(#cr)\" style=\"fill: none; stroke: rgb(208, 138, 112); stroke-width: 1.8px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vlabr\" x=\"612\" y=\"302\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 600; text-anchor: start; opacity: 1;\">④ 실패하면 번호와 끊긴 단계를 남긴다</text>\n\n      <rect class=\"vg\" x=\"20\" y=\"160\" width=\"230\" height=\"90\" rx=\"14\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"135\" y=\"194\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">접수 대장 (PostgreSQL)</text><text class=\"vs\" x=\"135\" y=\"214\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">무엇을 어디까지 했는지</text><text class=\"vs\" x=\"135\" y=\"231\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">같은 요청은 처리권 하나</text>\n      <rect class=\"vg\" x=\"950\" y=\"160\" width=\"230\" height=\"90\" rx=\"14\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"1065\" y=\"194\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Jira (JBYS)</text><text class=\"vs\" x=\"1065\" y=\"214\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">사람이 보는 처리 현황</text><text class=\"vs\" x=\"1065\" y=\"231\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">같은 문의 티켓은 하나</text>\n      <circle class=\"vc\" cx=\"600\" cy=\"205\" r=\"62\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"vct\" x=\"600\" y=\"200\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 800; text-anchor: middle; opacity: 1;\">문의 1건</text><text class=\"vcs\" x=\"600\" y=\"220\" text-anchor=\"middle\" style=\"fill: rgb(212, 239, 138); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 500; text-anchor: middle; opacity: 1;\">request_id</text>\n      <rect class=\"vr\" x=\"480\" y=\"340\" width=\"240\" height=\"70\" rx=\"14\" style=\"fill: rgb(251, 239, 233); stroke: rgb(217, 165, 143); stroke-width: 1.5px; stroke-dasharray: 5px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vtr\" x=\"600\" y=\"370\" text-anchor=\"middle\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">실패 보관함 (DLQ)</text><text class=\"vs\" x=\"600\" y=\"390\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">같은 단계를 반복하지 않고 이어서 복구</text>\n    </svg>\n    </p>"
        },
        {
          "html": "<div class=\"dgcap\"><b>한 문장</b> · 같은 문의는 <b>하나의 request_id</b>로 장부·Jira·보관함에 이어 두고, <b>먼저 적고 → 한 번만 바꾸고 → 다시 확인</b>하며, 실패하면 <b>번호를 남깁니다</b>.</div>"
        },
        {
          "html": "<h3>담당 부품 6개</h3>"
        },
        {
          "html": "<p><b>사용자·기록 조회 API</b></p>"
        },
        {
          "html": "<p>사용자 확인, 본인/타인 기록 구분 (시민 3명, 담당자 2명)</p>"
        },
        {
          "html": "<p><code>services/user_api</code></p>"
        },
        {
          "html": "<p><b>접수 대장 (state)</b></p>"
        },
        {
          "html": "<p>요청별 처리 상태를 PostgreSQL에 저장, 중복 차단</p>"
        },
        {
          "html": "<p><code>dubakwi-state.json</code></p>"
        },
        {
          "html": "<p><b>Jira 담당 (handoff)</b></p>"
        },
        {
          "html": "<p>티켓 조회·생성, 번호 연결, 종료, 담당 지정·알림</p>"
        },
        {
          "html": "<p><code>dubakwi-handoff.json</code></p>"
        },
        {
          "html": "<p><b>실패 보관함 (DLQ)</b></p>"
        },
        {
          "html": "<p>실패한 건의 진행 상태와 티켓 번호를 보관, 이어서 복구</p>"
        },
        {
          "html": "<p><code>dubakwi-dlq.json</code></p>"
        },
        {
          "html": "<p><b>오류 처리 (errors)</b></p>"
        },
        {
          "html": "<p>예상 못 한 오류를 개인정보 가려 기록·알림 (초안)</p>"
        },
        {
          "html": "<p><code>dubakwi-errors.json</code></p>"
        },
        {
          "html": "<p><b>Discord 어댑터</b></p>"
        },
        {
          "html": "<p><code>/문의</code>를 받아 R02 support Webhook 호출</p>"
        },
        {
          "html": "<p><code>services/discord_bot</code></p>"
        },
        {
          "html": "<h3>다른 역할과 맞춘 것</h3>"
        },
        {
          "html": "<div class=\"rid\">R01</div>"
        },
        {
          "html": "<div class=\"what\">서버 · DB 적용 · 배포</div>"
        },
        {
          "html": "<div class=\"deal\">담당 매핑 값 전달, 봇 기동, PR 병합</div>"
        },
        {
          "html": "<div class=\"rid\">R02<em>태경</em></div>"
        },
        {
          "html": "<div class=\"what\">본체 support 워크플로우</div>"
        },
        {
          "html": "<div class=\"deal\">save는 한 번만 호출, 완료 기록은 R04가 Jira 확인 후 처리. 어댑터 대기 25초</div>"
        },
        {
          "html": "<div class=\"rid\">R03</div>"
        },
        {
          "html": "<div class=\"what\">지식 검색 (RAG)</div>"
        },
        {
          "html": "<div class=\"deal\">사용자 API 권한이 검색 범위로 연결, 응답에 근거(sources) 표시</div>"
        },
        {
          "html": "<div class=\"rid\">R05</div>"
        },
        {
          "html": "<div class=\"what\">시험 · 품질</div>"
        },
        {
          "html": "<div class=\"deal\">시험 기대값을 결과에 맞춰 바꾸지 않음</div>"
        },
        {
          "html": "<div class=\"eyebrow\">Slide 2 · 구현한 것</div>"
        },
        {
          "html": "<h2>구현 내용: 중복 처리 방지, Jira 티켓 처리, 부분 실패 복구, Discord 비공개 접수</h2>"
        },
        {
          "html": "<p class=\"sub\">각 동작을 그림으로 나타냈고, 어디까지 확인했는지 배지로 구분했습니다.</p>"
        },
        {
          "html": "<h3>문의 1건 처리 순서 (R04 구간 1~6단계)</h3>"
        },
        {
          "html": "<div class=\"key\"><span><i class=\"sw me\"></i>R04 담당</span><span><i class=\"sw\"></i>다른 역할 (R02 본체, R03 지식 검색)</span><span>┄ 실패 시 경로</span></div>"
        },
        {
          "html": "<p>\n    <svg viewBox=\"0 0 1210 520\" role=\"img\" aria-label=\"문의 한 건이 시민에서 Discord 어댑터, R02 본체, R04 여섯 단계를 거쳐 비공개 답변으로 돌아오는 구조도\" data-asset-index=\"7\">\n      <defs>\n        <marker id=\"ar\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#91ae6b\" style=\"fill: rgb(145, 174, 107); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker>\n        <marker id=\"ad\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#b7a58a\" style=\"fill: rgb(183, 165, 138); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker>\n        \n      </defs>\n\n      <!-- R04 zone -->\n      <rect class=\"zone\" x=\"560\" y=\"60\" width=\"630\" height=\"320\" rx=\"16\" style=\"fill: rgb(244, 248, 238); stroke: rgb(193, 210, 172); stroke-width: 1.4px; stroke-dasharray: 6px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"zl\" x=\"580\" y=\"86\" style=\"fill: rgb(106, 128, 102); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 700; text-anchor: start; opacity: 1;\">R04 구간 · 접수 대장 + Jira 연결</text>\n\n      <!-- Row 1 -->\n      <rect class=\"nd\" x=\"20\" y=\"110\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(224, 230, 217); stroke-width: 1.2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"t\" x=\"95\" y=\"141\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">시민</text>\n      <text class=\"s\" x=\"95\" y=\"161\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">Discord /문의</text>\n\n      <rect class=\"me\" x=\"200\" y=\"110\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"t\" x=\"275\" y=\"141\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Discord 어댑터</text>\n      <text class=\"s\" x=\"275\" y=\"161\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">등록 사용자만 접수</text>\n\n      <rect class=\"nd\" x=\"380\" y=\"110\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(224, 230, 217); stroke-width: 1.2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"t\" x=\"455\" y=\"141\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">R02 본체</text>\n      <text class=\"s\" x=\"455\" y=\"161\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">분류·답변 (R03 검색)</text>\n\n      <rect class=\"me\" x=\"578\" y=\"110\" width=\"180\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <circle class=\"bd\" cx=\"598\" cy=\"130\" r=\"11\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"bn\" x=\"598\" y=\"134\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 12px; font-family: &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">1</text>\n      <text class=\"t\" x=\"676\" y=\"141\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">사용자 확인</text>\n      <text class=\"s\" x=\"676\" y=\"161\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">사용자 API</text>\n\n      <rect class=\"me\" x=\"788\" y=\"110\" width=\"180\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <circle class=\"bd\" cx=\"808\" cy=\"130\" r=\"11\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"bn\" x=\"808\" y=\"134\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 12px; font-family: &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">2</text>\n      <text class=\"t\" x=\"886\" y=\"141\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">장부에 먼저 기록</text>\n      <text class=\"s\" x=\"886\" y=\"161\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">state · 같은 요청 차단</text>\n\n      <rect class=\"me\" x=\"998\" y=\"110\" width=\"180\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <circle class=\"bd\" cx=\"1018\" cy=\"130\" r=\"11\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"bn\" x=\"1018\" y=\"134\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 12px; font-family: &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">3</text>\n      <text class=\"t\" x=\"1096\" y=\"141\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Jira 조회·생성</text>\n      <text class=\"s\" x=\"1096\" y=\"161\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">있으면 재사용</text>\n\n      <!-- Row 2 -->\n      <rect class=\"me\" x=\"998\" y=\"250\" width=\"180\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <circle class=\"bd\" cx=\"1018\" cy=\"270\" r=\"11\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"bn\" x=\"1018\" y=\"274\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 12px; font-family: &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">4</text>\n      <text class=\"t\" x=\"1096\" y=\"281\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">티켓 번호 연결</text>\n      <text class=\"s\" x=\"1096\" y=\"301\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">bind · 끊겨도 번호 남음</text>\n\n      <rect class=\"me\" x=\"788\" y=\"250\" width=\"180\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <circle class=\"bd\" cx=\"808\" cy=\"270\" r=\"11\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"bn\" x=\"808\" y=\"274\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 12px; font-family: &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">5</text>\n      <text class=\"t\" x=\"886\" y=\"281\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">종료 또는 이관</text>\n      <text class=\"s\" x=\"886\" y=\"301\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">답변은 종료 · 이관은 담당·알림</text>\n\n      <rect class=\"me\" x=\"578\" y=\"250\" width=\"180\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <circle class=\"bd\" cx=\"598\" cy=\"270\" r=\"11\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><text class=\"bn\" x=\"598\" y=\"274\" text-anchor=\"middle\" style=\"fill: rgb(255, 255, 255); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 12px; font-family: &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">6</text>\n      <text class=\"t\" x=\"676\" y=\"281\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">완료 기록</text>\n      <text class=\"s\" x=\"676\" y=\"301\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">Jira 다시 확인 후 save</text>\n\n      <rect class=\"nd\" x=\"380\" y=\"250\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(224, 230, 217); stroke-width: 1.2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"t\" x=\"455\" y=\"281\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">R02 응답</text>\n      <text class=\"s\" x=\"455\" y=\"301\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">결과 정리</text>\n\n      <rect class=\"me\" x=\"200\" y=\"250\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"t\" x=\"275\" y=\"281\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">비공개 답변</text>\n      <text class=\"s\" x=\"275\" y=\"301\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">접수번호 포함</text>\n\n      <rect class=\"nd\" x=\"20\" y=\"250\" width=\"150\" height=\"70\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(224, 230, 217); stroke-width: 1.2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"t\" x=\"95\" y=\"281\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 14px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">시민</text>\n      <text class=\"s\" x=\"95\" y=\"301\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">본인에게만 보임</text>\n\n      <!-- main flow -->\n      <path class=\"ln\" d=\"M170 145H196\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M350 145H376\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M530 145H574\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M758 145H784\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M968 145H994\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M1088 180V246\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M994 285H972\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M784 285H762\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M574 285H534\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M376 285H354\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"ln\" d=\"M196 285H174\" marker-end=\"url(#ar)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n\n      <!-- failure -->\n      <rect class=\"fail\" x=\"560\" y=\"420\" width=\"630\" height=\"70\" rx=\"12\" style=\"fill: rgb(251, 246, 238); stroke: rgb(227, 211, 184); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect>\n      <text class=\"ft\" x=\"580\" y=\"449\" style=\"fill: rgb(122, 100, 64); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, sans-serif; font-weight: 700; text-anchor: start; opacity: 1;\">실패하면 → 실패 보관함(DLQ) + 오류 처리(errors)</text>\n      <text class=\"fs\" x=\"580\" y=\"471\" style=\"fill: rgb(139, 122, 92); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 11px; font-family: &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\">어디까지 됐는지와 티켓 번호를 기록하고, 개인정보는 가려서 알립니다</text>\n      <path class=\"lf\" d=\"M1096 320V416\" marker-end=\"url(#ad)\" style=\"fill: none; stroke: rgb(201, 183, 154); stroke-width: 1.6px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"lf\" d=\"M886 320V416\" marker-end=\"url(#ad)\" style=\"fill: none; stroke: rgb(201, 183, 154); stroke-width: 1.6px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      <path class=\"lf\" d=\"M676 320V416\" marker-end=\"url(#ad)\" style=\"fill: none; stroke: rgb(201, 183, 154); stroke-width: 1.6px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n    </svg>\n  </p>"
        },
        {
          "html": "<h3>동작별 구현</h3>"
        },
        {
          "html": "<div class=\"panel-h\"><span class=\"num\">1</span><b>중복 처리 방지 (state)</b><span class=\"badge\">팀 n8n 확인</span></div>"
        },
        {
          "html": "<p>\n      <svg viewBox=\"0 0 520 215\" role=\"img\" aria-label=\"같은 request_id 요청이 두 번 들어와도 처리권을 가진 첫 요청만 Jira 티켓 1개를 만든다\" data-asset-index=\"8\">\n        <defs><marker id=\"m1\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#91ae6b\" style=\"fill: rgb(145, 174, 107); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker><marker id=\"m1r\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#d08a70\" style=\"fill: rgb(208, 138, 112); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker></defs>\n        <rect class=\"vn\" x=\"10\" y=\"30\" width=\"130\" height=\"46\" rx=\"11\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"75\" y=\"52\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">요청 ①</text><text class=\"vs\" x=\"75\" y=\"67\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">request_id 처음</text>\n        <rect class=\"vn\" x=\"10\" y=\"140\" width=\"130\" height=\"46\" rx=\"11\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"75\" y=\"162\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">같은 요청 재전송</text><text class=\"vs\" x=\"75\" y=\"177\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">같은 request_id</text>\n        <rect class=\"vg\" x=\"195\" y=\"72\" width=\"120\" height=\"72\" rx=\"14\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"255\" y=\"102\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">처리권 확인</text><text class=\"vs\" x=\"255\" y=\"119\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">prepare · 조건부 갱신</text>\n        <rect class=\"vg\" x=\"380\" y=\"30\" width=\"130\" height=\"46\" rx=\"11\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"445\" y=\"52\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">Jira 티켓 1개</text><text class=\"vs\" x=\"445\" y=\"67\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">처리 진행</text>\n        <rect class=\"vr\" x=\"380\" y=\"140\" width=\"130\" height=\"46\" rx=\"11\" style=\"fill: rgb(251, 239, 233); stroke: rgb(217, 165, 143); stroke-width: 1.5px; stroke-dasharray: 5px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vtr\" x=\"445\" y=\"162\" text-anchor=\"middle\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">차단</text><text class=\"vs\" x=\"445\" y=\"177\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">새 티켓 없음</text>\n        <path class=\"vl anim\" d=\"M140 53C170 53 170 100 191 104\" marker-end=\"url(#m1)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <path class=\"vl anim\" d=\"M140 163C170 163 170 116 191 112\" marker-end=\"url(#m1)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <path class=\"vl anim\" d=\"M315 96C345 96 345 53 376 53\" marker-end=\"url(#m1)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <path class=\"vx\" d=\"M315 120C345 120 345 163 376 163\" marker-end=\"url(#m1r)\" style=\"fill: none; stroke: rgb(208, 138, 112); stroke-width: 1.8px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n      </svg>\n      </p>"
        },
        {
          "html": "<div class=\"panel-f\"><code>prepare</code> 시작 기록 → <code>bind</code> 티켓 번호 연결 → <code>finish</code> Jira 재확인 후 완료</div>"
        },
        {
          "html": "<div class=\"panel-h\"><span class=\"num\">2</span><b>Jira 티켓 처리 (handoff)</b><span class=\"badge\">팀 n8n 확인</span></div>"
        },
        {
          "html": "<p>\n      <svg viewBox=\"0 0 520 215\" role=\"img\" aria-label=\"Jira 티켓 조회, 생성, 번호 연결 후 답변은 종료 전환, 이관은 댓글과 담당 지정과 알림\" data-asset-index=\"9\">\n        <defs><marker id=\"m2\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#91ae6b\" style=\"fill: rgb(145, 174, 107); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker></defs>\n        <rect class=\"vg\" x=\"8\" y=\"82\" width=\"86\" height=\"50\" rx=\"11\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"51\" y=\"104\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">① 조회</text><text class=\"vs\" x=\"51\" y=\"120\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">기존 티켓?</text>\n        <rect class=\"vg\" x=\"112\" y=\"82\" width=\"86\" height=\"50\" rx=\"11\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"155\" y=\"104\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">② 생성</text><text class=\"vs\" x=\"155\" y=\"120\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">없을 때만</text>\n        <rect class=\"vg\" x=\"216\" y=\"82\" width=\"86\" height=\"50\" rx=\"11\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"259\" y=\"104\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">③ bind</text><text class=\"vs\" x=\"259\" y=\"120\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">번호 연결</text>\n        <rect class=\"vn\" x=\"344\" y=\"26\" width=\"168\" height=\"56\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"428\" y=\"49\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">답변 → 종료 전환</text><text class=\"vs\" x=\"428\" y=\"66\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">이름으로 조회 (Resolved·Done·완료)</text>\n        <rect class=\"vn\" x=\"344\" y=\"130\" width=\"168\" height=\"56\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"428\" y=\"153\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">이관 → 담당·알림</text><text class=\"vs\" x=\"428\" y=\"170\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">댓글 + 담당 지정 + 알림</text>\n        <path class=\"vl anim\" d=\"M94 107H108\" marker-end=\"url(#m2)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><path class=\"vl anim\" d=\"M198 107H212\" marker-end=\"url(#m2)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <path class=\"vl anim\" d=\"M302 107C322 107 322 54 340 54\" marker-end=\"url(#m2)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <path class=\"vl anim\" d=\"M302 107C322 107 322 158 340 158\" marker-end=\"url(#m2)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <text class=\"vs\" x=\"8\" y=\"205\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\">종료 전환이 없으면 임의 처리 없이 중단: transition_unavailable</text>\n      </svg>\n      </p>"
        },
        {
          "html": "<div class=\"panel-f\">조회·생성·종료·이관을 팀 n8n에서 실제로 확인했습니다.</div>"
        },
        {
          "html": "<div class=\"panel-h\"><span class=\"num\">3</span><b>부분 실패 복구 (DLQ·errors)</b><span class=\"badge\">DLQ 확인 · errors 초안</span></div>"
        },
        {
          "html": "<p>\n      <svg viewBox=\"0 0 520 215\" role=\"img\" aria-label=\"티켓 생성과 번호 기록은 성공하고 종료 또는 배정이 실패하면 티켓 번호와 끊긴 단계를 DLQ에 보관한다\" data-asset-index=\"10\">\n        <defs><marker id=\"m3\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#d08a70\" style=\"fill: rgb(208, 138, 112); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker></defs>\n        <path d=\"M62 64H198M202 64H338\" stroke=\"#91ae6b\" stroke-width=\"3\" fill=\"none\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <circle class=\"vok\" cx=\"62\" cy=\"64\" r=\"20\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><path d=\"M53 64l6 6 11-12\" stroke=\"#fff\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"fill: none; stroke: rgb(255, 255, 255); stroke-width: 3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <circle class=\"vok\" cx=\"200\" cy=\"64\" r=\"20\" style=\"fill: rgb(59, 103, 66); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><path d=\"M191 64l6 6 11-12\" stroke=\"#fff\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"fill: none; stroke: rgb(255, 255, 255); stroke-width: 3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <circle class=\"vno\" cx=\"340\" cy=\"64\" r=\"20\" style=\"fill: rgb(196, 98, 63); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></circle><path d=\"M332 56l16 16M348 56l-16 16\" stroke=\"#fff\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" style=\"fill: none; stroke: rgb(255, 255, 255); stroke-width: 3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <text class=\"vt\" x=\"62\" y=\"106\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">티켓 생성</text><text class=\"vs\" x=\"62\" y=\"121\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">성공</text>\n        <text class=\"vt\" x=\"200\" y=\"106\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">번호 기록</text><text class=\"vs\" x=\"200\" y=\"121\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">성공</text>\n        <text class=\"vtr\" x=\"340\" y=\"106\" text-anchor=\"middle\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">종료·배정</text><text class=\"vs\" x=\"340\" y=\"121\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">실패 = partial_effect</text>\n        <rect class=\"vg\" x=\"262\" y=\"150\" width=\"248\" height=\"52\" rx=\"12\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"386\" y=\"172\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">DLQ 보관</text><text class=\"vs\" x=\"386\" y=\"188\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">티켓 번호 + 끊긴 단계 → 같은 단계 반복 안 함</text>\n        <path class=\"vx\" d=\"M340 128V146\" marker-end=\"url(#m3)\" style=\"fill: none; stroke: rgb(208, 138, 112); stroke-width: 1.8px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <rect class=\"vn\" x=\"8\" y=\"150\" width=\"228\" height=\"52\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"122\" y=\"172\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">PR #36 첫 정상 시험</text><text class=\"vs\" x=\"122\" y=\"188\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">담당 매핑 부재 → 번호가 남아 끊긴 곳 확인</text>\n      </svg>\n      </p>"
        },
        {
          "html": "<div class=\"panel-f\">errors 워크플로우는 초안: 개인정보 가림 구현, n8n 가져오기·중단 시험은 미실행.</div>"
        },
        {
          "html": "<div class=\"panel-h\"><span class=\"num\">4</span><b>Discord 비공개 접수 (어댑터)</b><span class=\"badge\">로컬 시험 완료</span></div>"
        },
        {
          "html": "<p>\n      <svg viewBox=\"0 0 520 215\" role=\"img\" aria-label=\"Discord 사용자가 문의 명령을 보내면 어댑터가 등록 사용자인지 확인하고 등록되면 R02 Webhook을 호출해 비공개 답변, 미등록이면 R02 호출 없이 거절한다\" data-asset-index=\"11\">\n        <defs><marker id=\"m4\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#91ae6b\" style=\"fill: rgb(145, 174, 107); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker><marker id=\"m4r\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"7\" markerHeight=\"7\" orient=\"auto-start-reverse\"><path d=\"M0 0L10 5L0 10z\" fill=\"#d08a70\" style=\"fill: rgb(208, 138, 112); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path></marker></defs>\n        <rect class=\"vn\" x=\"6\" y=\"82\" width=\"82\" height=\"50\" rx=\"11\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"47\" y=\"104\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">사용자</text><text class=\"vs\" x=\"47\" y=\"120\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">/문의</text>\n        <rect class=\"vg\" x=\"104\" y=\"82\" width=\"96\" height=\"50\" rx=\"11\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"152\" y=\"104\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">어댑터</text><text class=\"vs\" x=\"152\" y=\"120\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">비공개 defer</text>\n        <polygon class=\"vg\" points=\"262,62 322,107 262,152 202,107\" style=\"fill: rgb(237, 247, 217); stroke: rgb(113, 153, 76); stroke-width: 1.6px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></polygon><text class=\"vt\" x=\"262\" y=\"105\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">등록</text><text class=\"vt\" x=\"262\" y=\"120\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">사용자?</text>\n        <rect class=\"vn\" x=\"356\" y=\"26\" width=\"156\" height=\"52\" rx=\"12\" style=\"fill: rgb(255, 255, 255); stroke: rgb(213, 220, 203); stroke-width: 1.3px; stroke-dasharray: none; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vt\" x=\"434\" y=\"48\" text-anchor=\"middle\" style=\"fill: rgb(36, 48, 41); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">R02 Webhook 호출</text><text class=\"vs\" x=\"434\" y=\"64\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">→ 본인에게만 보이는 답변</text>\n        <rect class=\"vr\" x=\"356\" y=\"136\" width=\"156\" height=\"52\" rx=\"12\" style=\"fill: rgb(251, 239, 233); stroke: rgb(217, 165, 143); stroke-width: 1.5px; stroke-dasharray: 5px, 4px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></rect><text class=\"vtr\" x=\"434\" y=\"158\" text-anchor=\"middle\" style=\"fill: rgb(160, 71, 44); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 13px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 700; text-anchor: middle; opacity: 1;\">거절 안내</text><text class=\"vs\" x=\"434\" y=\"174\" text-anchor=\"middle\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: middle; opacity: 1;\">R02 호출 0건</text>\n        <path class=\"vl anim\" d=\"M88 107H100\" marker-end=\"url(#m4)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><path class=\"vl anim\" d=\"M200 107H204\" marker-end=\"url(#m4)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path>\n        <path class=\"vl anim\" d=\"M322 98C340 98 340 52 352 52\" marker-end=\"url(#m4)\" style=\"fill: none; stroke: rgb(145, 174, 107); stroke-width: 2px; stroke-dasharray: 6px, 6px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vs\" x=\"335\" y=\"82\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\">예</text>\n        <path class=\"vx\" d=\"M322 116C340 116 340 162 352 162\" marker-end=\"url(#m4r)\" style=\"fill: none; stroke: rgb(208, 138, 112); stroke-width: 1.8px; stroke-dasharray: 5px, 5px; font-size: 15px; font-family: &quot;DM Sans&quot;, &quot;Noto Sans KR&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\"></path><text class=\"vs\" x=\"335\" y=\"146\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\">아니오</text>\n        <text class=\"vs\" x=\"8\" y=\"205\" style=\"fill: rgb(111, 122, 104); stroke: none; stroke-width: 1px; stroke-dasharray: none; font-size: 10.5px; font-family: &quot;Noto Sans KR&quot;, &quot;DM Sans&quot;, sans-serif; font-weight: 400; text-anchor: start; opacity: 1;\">409 코드별 안내 문구 · 1900자 초과 시 답변만 줄여 접수번호 유지</text>\n      </svg>\n      </p>"
        },
        {
          "html": "<div class=\"panel-f\"><code>DUBAKWI_DISCORD_USER_MAP</code>으로 등록 사용자 연결 · 로그에는 request_id·상태·코드만 기록</div>"
        },
        {
          "html": "<h3>직접 구현·연결해 본 연동</h3>"
        },
        {
          "html": "<div class=\"chip\"><span>n8n Webhook 수동 추가<small>호출 확인</small></span></div>"
        },
        {
          "html": "<div class=\"chip\"><span>Discord 봇 연동<small>토큰·서버·채널 연결, 수동 테스트</small></span></div>"
        },
        {
          "html": "<div class=\"chip\"><span>Jira 연동<small>티켓 생성·조회</small></span></div>"
        },
        {
          "html": "<div class=\"chip extra\"><span>Jira 자동화 → Discord 알림<small>별도 실습</small></span></div>"
        },
        {
          "html": "<div class=\"chip extra\"><span>R02(태경) 흐름 HTTP 호출<small>앞뒤 노드 추가 · 별도 실습</small></span></div>"
        },
        {
          "html": "<h3>화면</h3>"
        },
        {
          "html": "<figure class=\"wide\"><div class=\"frame\"><p class=\"public-exclusion\">화면 캡처·원문 이미지는 로컬 보존본에 있습니다.</p></div><figcaption><b>C1 · n8n</b> dubakwi-state-p19-real 워크플로우 (접수 대장 state)</figcaption></figure>"
        },
        {
          "html": "<figure><div class=\"frame\"><p class=\"public-exclusion\">화면 캡처·원문 이미지는 로컬 보존본에 있습니다.</p></div><figcaption><b>C3 · Jira 보드</b> 문의 티켓이 생성되어 완료 상태로 이동 (시험 중 생성)</figcaption></figure>"
        },
        {
          "html": "<figure><div class=\"frame\"><p class=\"public-exclusion\">화면 캡처·원문 이미지는 로컬 보존본에 있습니다.</p></div><figcaption><b>C6 · Jira 자동화</b> 티켓 상태 변경이 Discord 알림으로 전달 (별도 실습)</figcaption></figure>"
        },
        {
          "html": "<figure><div class=\"frame\"><p class=\"public-exclusion\">화면 캡처·원문 이미지는 로컬 보존본에 있습니다.</p></div><figcaption><b>C4 · Discord</b> /문의 → 본인에게만 보이는 답변 (근거, 문의 연결값)</figcaption></figure>"
        },
        {
          "html": "<figure><div class=\"frame\"><p class=\"public-exclusion\">화면 캡처·원문 이미지는 로컬 보존본에 있습니다.</p></div><figcaption><b>C5 · 로컬 시험</b> Discord 어댑터 22건 통과 (실서버 아님)</figcaption></figure>"
        },
        {
          "html": "<div class=\"eyebrow\">Slide 3 · 개념과 기술</div>"
        },
        {
          "html": "<h2>구현 개념과 기술을 우리 프로젝트 문의 1건에 대입하면</h2>"
        },
        {
          "html": "<p class=\"sub\">시민이 Discord에서 보낸 \"QR이 안 읽혀요. 자전거번호로 대여하는 방법을 알려주세요.\" 문의 한 건이 지나가는 순서로, 어디에 어떤 개념과 기술이 쓰였는지 묶었습니다.</p>"
        },
        {
          "html": "<div>프로젝트 장면</div>"
        },
        {
          "html": "<div>개념</div>"
        },
        {
          "html": "<div>기술</div>"
        },
        {
          "html": "<div>확인한 증거</div>"
        },
        {
          "html": "<div class=\"wn\">1</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>Discord <code>/문의</code> 입력</b><span>3초 안에 본인에게만 보이는 대기 상태로 바꾸고 답변을 기다림</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">최소 권한</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">discord.py</span><span class=\"wtech\">Docker Compose</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C4</span><br>비공개 답변 확인</div>"
        },
        {
          "html": "<div class=\"wn\">2</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>등록 사용자 확인</b><span>Discord 계정을 두바퀴 사용자로 연결, 미등록 계정은 R02 호출 없이 거절</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">비밀 분리</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">Python 3.12 · uv</span><span class=\"wtech\">환경 변수</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C5</span><br>어댑터 시험 22건 통과</div>"
        },
        {
          "html": "<div class=\"wn\">3</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>request_id 부여 후 R02 호출</b><span>같은 문의는 같은 번호(<code>dc-</code> + interaction id)로 R02 support Webhook에 전달</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">멱등성</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">n8n Webhook</span><span class=\"wtech\">HTTP</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C1</span><br>n8n 워크플로우</div>"
        },
        {
          "html": "<div class=\"wn\">4</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>접수 대장에 먼저 기록</b><span>처음 시작한 요청만 처리권을 갖고, 상태가 예상과 같을 때만 갱신</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">처리권</span><span class=\"wcon\">조건부 갱신</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">PostgreSQL</span><span class=\"wtech\">n8n state</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C1</span><br>state 워크플로우</div>"
        },
        {
          "html": "<div class=\"wn\">5</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>Jira 티켓 생성 → 번호 연결 → 종료</b><span>같은 요청의 티켓을 먼저 조회하고 없을 때만 생성, 종료는 전환 이름으로 조회</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">외부 효과 확인</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">Jira</span><span class=\"wtech\">n8n handoff</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C3</span><br>완료된 문의 티켓</div>"
        },
        {
          "html": "<div class=\"wn\">6</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>종료나 담당 지정이 실패하면</b><span>티켓 번호와 끊긴 단계를 보관함에 기록하고 같은 단계는 반복하지 않음</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">partial_effect</span><span class=\"wcon\">DLQ</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">PostgreSQL</span><span class=\"wtech\">n8n errors</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">PR #36</span><br>담당 매핑 부재 사례</div>"
        },
        {
          "html": "<div class=\"wn\">7</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>근거와 함께 비공개 답변</b><span>R03 검색 근거(rental-guide)와 문의 연결값을 본인에게만 전달, 긴 답은 번호를 남기고 줄임</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">계약(입력·출력)</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">discord.py</span><span class=\"wtech\">R02·R03 응답 형식</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C4</span><br>근거·연결값 표시</div>"
        },
        {
          "html": "<div class=\"wn\">+</div>"
        },
        {
          "html": "<div class=\"wscene\"><b>Jira 상태 변경 알림 (별도 실습)</b><span>티켓이 바뀌면 Discord 채널로 알림을 보내는 자동화</span></div>"
        },
        {
          "html": "<div><span class=\"wcon\">이벤트 알림</span></div>"
        },
        {
          "html": "<div><span class=\"wtech\">Jira 자동화</span><span class=\"wtech\">Discord Webhook</span></div>"
        },
        {
          "html": "<div class=\"wev\"><span class=\"badge\">C6</span><br>#jira-알림 채널</div>"
        },
        {
          "html": "<div class=\"say\">같은 요청이 두 번 들어와도 <b>티켓은 하나</b>, 중간에 끊겨도 <b>번호는 남고</b>, 실패하면 <b>이어서 복구</b>할 수 있게 만들었습니다.</div>"
        },
        {
          "html": "<p>\n\n<footer>두바퀴 · R04 · 비밀값과 실제 ID는 넣지 않았습니다</footer>\n</p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r04-notes",
      "role": "R04",
      "title": "연동과 안정성 · 역할과 흐름",
      "slides": [
        3,
        7,
        8
      ],
      "source": "sources/r04-notes.html",
      "blocks": [
        {
          "html": "<h1>R04 역할 담당자 담당 기능 구조와 구현 개념</h1>"
        },
        {
          "html": "<h2>1. 담당 역할</h2>"
        },
        {
          "html": "<p>두바퀴 프로젝트에서 R04 역할 담당자는 <strong>사용자 문의가 실제 업무로 안전하게 이어지도록 외부 서비스와 저장 기능을 연결하는 역할</strong>을 담당했다.</p>"
        },
        {
          "html": "<p>AI가 만든 답변을 Jira 티켓으로 연결하고, 처리 상태를 저장하며, 같은 요청이 중복 처리되거나 실패한 작업이 사라지지 않도록 관리하는 부분이다.</p>"
        },
        {
          "html": "<p><strong>주요 담당 기능</strong></p>"
        },
        {
          "html": "<li>Discord 문의 입구와 결과 전달</li>"
        },
        {
          "html": "<li>사용자 권한·문의 소유권 확인</li>"
        },
        {
          "html": "<li>Jira 티켓 조회·생성·보완·종료·배정</li>"
        },
        {
          "html": "<li>State 저장과 중복 요청 방지</li>"
        },
        {
          "html": "<li>DLQ와 오류·복구 처리</li>"
        },
        {
          "html": "<h2>2. R04 담당 기능 독립 구조도</h2>"
        },
        {
          "html": "<p>다른 팀원의 AI 분류·RAG 기능을 제외하고 R04 담당 기능만 분리하면 다음과 같다.</p>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart LR\n    U[Discord 사용자] --&gt; D[Discord 어댑터]\n    D --&gt; N[n8n 연동]\n\n    N --&gt; A[사용자·소유권 확인]\n    N --&gt; S[State]\n    N --&gt; H[Jira Handoff]\n    N --&gt; E[오류 처리]\n\n    A --&gt; API[사용자 API]\n    S --&gt; DB[(PostgreSQL)]\n    H --&gt; J[Jira]\n    E --&gt; Q[(DLQ)]\n\n    H --&gt; R[처리 결과]\n    S --&gt; R\n    R --&gt; D\n    D --&gt; U\n</code></pre>"
        },
        {
          "html": "<p>R04는 단순히 서비스를 연결하는 것이 아니라, <strong>Jira 변경 전후의 상태를 확인하여 중복 티켓·잘못된 재처리·결과 유실을 막는 역할</strong>을 한다.</p>"
        },
        {
          "html": "<h2>3. R04 담당 기능 개념도</h2>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart TB\n    CORE[R04 연동·안정성]\n\n    CORE --&gt; ENTRY[입구 연결]\n    CORE --&gt; WORK[외부 업무 처리]\n    CORE --&gt; STATE[상태·중복 관리]\n    CORE --&gt; ERROR[실패·복구]\n    CORE --&gt; SECURITY[권한·비밀 보호]\n\n    ENTRY --&gt; DISCORD[Discord]\n    ENTRY --&gt; WEBHOOK[n8n Webhook]\n\n    WORK --&gt; JIRA[Jira 티켓]\n    WORK --&gt; ASSIGN[담당 배정·알림]\n\n    STATE --&gt; IDEMPOTENCY[멱등성]\n    STATE --&gt; POSTGRES[PostgreSQL]\n\n    ERROR --&gt; DLQ[DLQ]\n    ERROR --&gt; RECOVERY[Recovery Capsule]\n\n    SECURITY --&gt; USER[사용자·소유권]\n    SECURITY --&gt; SECRET[Credential·Secret]\n</code></pre>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>개념</th>\n<th>두바퀴 프로젝트에서의 의미</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Jira</td>\n<td>실제 민원 티켓과 업무 상태의 원본</td>\n</tr>\n<tr>\n<td>State</td>\n<td>요청의 처리 단계와 확인된 Jira ID 저장</td>\n</tr>\n<tr>\n<td>멱등성</td>\n<td>같은 요청이 다시 들어와도 티켓을 중복 생성하지 않음</td>\n</tr>\n<tr>\n<td>DLQ</td>\n<td>실패하거나 결과를 확인하지 못한 요청 보관</td>\n</tr>\n<tr>\n<td>Recovery Capsule</td>\n<td>복구에 필요한 최소 정보 저장</td>\n</tr>\n<tr>\n<td>Credential·Secret</td>\n<td>토큰과 비밀번호가 Git에 올라가지 않도록 분리</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>4. 전체 프로젝트에서 R04의 위치</h2>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart LR\n    C[사용자] --&gt; R04A[R04 Discord 입구]\n    R04A --&gt; R02A[R02 분류·답변]\n    R02A --&gt; R03[R03 RAG 검색]\n    R03 --&gt; R02B[R02 답변 검증]\n    R02B --&gt; R04B[R04 Jira·State·DLQ]\n    R04B --&gt; R02C[R02 최종 응답]\n    R02C --&gt; R04C[R04 Discord 전달]\n\n    R01[R01 통합·배포] -.-&gt; R04B\n    R05[R05 시험·품질] -.-&gt; R04B\n</code></pre>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>역할</th>\n<th>R04와 연결되는 부분</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>R01 지효</td>\n<td>VM 배포, PostgreSQL·네트워크·Credential, 병합</td>\n</tr>\n<tr>\n<td>R02 태경</td>\n<td>R04의 state·handoff·DLQ를 본체에서 호출</td>\n</tr>\n<tr>\n<td>R03 역할 담당자</td>\n<td>R04가 확인한 권한으로 검색 범위 분리</td>\n</tr>\n<tr>\n<td>R04 역할 담당자</td>\n<td>사용자·Jira·State·DLQ·오류·Discord 연동</td>\n</tr>\n<tr>\n<td>R05 기화</td>\n<td>정상·중복·장애·권한·복구 시험</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>5. 기능별 실제 처리 흐름</h2>"
        },
        {
          "html": "<h3>5.1 Discord 문의 전달</h3>"
        },
        {
          "html": "<pre><code class=\"language-text\">/문의 슬래시 명령\n    ↓\n허용 서버·채널 확인\n    ↓\nDiscord 사용자 ID와 문의 내용 변환\n    ↓\nn8n Webhook 호출\n    ↓\n가린 결과를 비공개로 전달\n</code></pre>"
        },
        {
          "html": "<p>Discord ID만으로 권한을 부여하지 않는다. 사용자 API가 등록 사용자와 역할을 다시 확인한다.</p>"
        },
        {
          "html": "<h3>5.2 사용자 권한·소유권 확인</h3>"
        },
        {
          "html": "<pre><code class=\"language-text\">사용자 조회\n    ├─ citizen → public\n    ├─ support/security → public + restricted\n    └─ 미등록·조회 장애 → 처리 중단\n</code></pre>"
        },
        {
          "html": "<p>문서 검색 권한과 Jira 문의 소유권은 별도로 확인한다. public 문서를 볼 수 있어도 다른 사용자의 문의를 조회할 수는 없다.</p>"
        },
        {
          "html": "<h3>5.3 Jira 티켓 처리</h3>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart TD\n    T[처리 요청] --&gt; P[State prepare]\n    P --&gt;|성공| L[Jira 기존 티켓 조회]\n    P --&gt;|실패| STOP[외부 변경 중단]\n    L --&gt;|기존 티켓| REUSE[연결 확인 후 재사용]\n    L --&gt;|없음| CREATE[신규 티켓 생성]\n    CREATE --&gt; B[생성 ID State bind]\n    B --&gt; C[문맥·보완 횟수 저장]\n    C --&gt; A{처리 종류}\n    A --&gt; CLOSE[종료]\n    A --&gt; ASSIGN[담당 배정·알림]\n    A --&gt; WAIT[보완 대기]\n</code></pre>"
        },
        {
          "html": "<p>Jira 변경 전에 <code>prepare</code>, 생성 직후 <code>bind</code>, 최종 결과 후 <code>finish</code>를 확인한다. 저장에 실패하면 다음 외부 변경을 중단한다.</p>"
        },
        {
          "html": "<h3>5.4 State와 중복 방지</h3>"
        },
        {
          "html": "<p>State에는 요청 ID, 소유자, 처리 단계, 확인된 Jira ID 등 안전한 처리에 필요한 최소 정보만 저장한다. 완전 재전송은 Jira 작업을 반복하지 않고, 새 보완 문의는 기존 티켓에 새 문맥과 횟수만 추가한다.</p>"
        },
        {
          "html": "<h3>5.5 DLQ와 오류 복구</h3>"
        },
        {
          "html": "<pre><code class=\"language-text\">작업 실패 또는 결과 미확인\n    ↓\n확인된 Jira ID와 처리 효과 보존\n    ↓\nRecovery Capsule 생성\n    ↓\nDLQ 저장\n    ↓\n실제 상태 확인 후 필요한 단계만 복구\n</code></pre>"
        },
        {
          "html": "<p>결과는 성공·실패·결과 미확인으로 구분한다. 결과를 확인하지 못한 작업은 바로 반복하지 않고 DLQ에 보관한 뒤 실제 상태를 먼저 확인한다.</p>"
        },
        {
          "html": "<h2>6. 사용 기술과 프로젝트 적용</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>기술</th>\n<th>프로젝트에서 사용한 목적</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>n8n</td>\n<td>API 호출 순서·조건 분기·하위 워크플로우 연결</td>\n</tr>\n<tr>\n<td>Webhook</td>\n<td>Discord 등 외부 요청 수신</td>\n</tr>\n<tr>\n<td>REST API</td>\n<td>Jira·사용자 API와 데이터 교환</td>\n</tr>\n<tr>\n<td>JSON</td>\n<td>서비스 사이의 입력·출력 계약</td>\n</tr>\n<tr>\n<td>Jira</td>\n<td>민원 티켓·담당자·상태·댓글·종료 관리</td>\n</tr>\n<tr>\n<td>PostgreSQL</td>\n<td>최소 처리 상태와 DLQ 영속 저장</td>\n</tr>\n<tr>\n<td>Discord Bot</td>\n<td>문의 슬래시 명령과 비공개 결과 전달</td>\n</tr>\n<tr>\n<td>Docker Compose</td>\n<td>서비스를 같은 VM 네트워크에서 실행</td>\n</tr>\n<tr>\n<td>Credential·Secret</td>\n<td>API 키·토큰·비밀번호를 코드와 분리</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>7. 주요 산출물</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>영역</th>\n<th>산출물</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Jira 연동</td>\n<td><code>workflows/dubakwi-handoff.json</code></td>\n</tr>\n<tr>\n<td>상태</td>\n<td><code>workflows/dubakwi-state.json</code></td>\n</tr>\n<tr>\n<td>DLQ</td>\n<td><code>workflows/dubakwi-dlq.json</code></td>\n</tr>\n<tr>\n<td>오류 처리</td>\n<td><code>workflows/dubakwi-errors.json</code></td>\n</tr>\n<tr>\n<td>저장 설계</td>\n<td><code>docs/project/STORAGE-DESIGN.md</code></td>\n</tr>\n<tr>\n<td>DB 변경</td>\n<td><code>infra/db/migrations/001~007</code></td>\n</tr>\n<tr>\n<td>사용자 공급</td>\n<td><code>services/user_api</code>·<code>data/users.json</code>·<code>records.json</code></td>\n</tr>\n<tr>\n<td>Discord</td>\n<td><code>services/discord_bot</code>·<code>infra/discord-bot-compose.yaml</code></td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>R04는 AI가 만든 답변이 실제 Jira 업무로 이어지고, 중복·실패·권한 문제 없이 처리될 수 있도록 연결하는 역할이다.</p>"
        },
        {
          "html": "<h2>8. 발표할 때 사용할 설명</h2>"
        },
        {
          "html": "<h3>30초 설명</h3>"
        },
        {
          "html": "<p>저는 두바퀴 프로젝트에서 연동과 안정성을 담당했습니다. Discord로 들어온 문의를 n8n에 전달하고, 처리 결과를 Jira 티켓으로 생성·조회·종료하는 흐름을 연결했습니다. 또한 같은 요청으로 티켓이 중복 생성되지 않도록 State를 관리하고, 실패하거나 결과를 확인할 수 없는 작업은 DLQ에 보관하도록 구성했습니다. 즉, AI의 답변이 실제 민원 업무로 안전하게 이어지도록 만드는 역할입니다.</p>"
        },
        {
          "html": "<h3>1분 설명</h3>"
        },
        {
          "html": "<p>제 담당은 R04 연동·안정성입니다. 사용자 입구인 Discord, 자동화 도구인 n8n, 업무 관리 도구인 Jira, 상태 저장용 PostgreSQL을 연결했습니다. 이 과정에서 가장 중요하게 본 것은 단순 연결이 아니라 외부 작업을 안전하게 관리하는 것이었습니다.</p>"
        },
        {
          "html": "<p>Jira 티켓을 만들기 전에는 처리 의도를 저장하고, 생성 직후에는 Jira ID를 기록하며, 마지막에는 처리 결과가 저장됐는지 확인하도록 했습니다. 같은 요청이 다시 들어오면 기존 티켓을 재사용하고, 새로운 보완 내용만 저장하여 배정과 알림이 반복되지 않게 했습니다. 실패하거나 성공 여부를 알 수 없는 작업은 바로 다시 실행하지 않고 DLQ에 남겨 실제 상태를 확인할 수 있도록 했습니다.</p>"
        },
        {
          "html": "<h2>9. 소감</h2>"
        },
        {
          "html": "<p>처음에는 API 연동이 한 서비스의 데이터를 다른 서비스로 전달하는 작업이라고 생각했다. 하지만 실제로 구현해 보니 요청이 중간에서 실패하거나, 작업은 성공했지만 응답을 받지 못하거나, 같은 요청이 다시 들어오는 상황까지 생각해야 했다.</p>"
        },
        {
          "html": "<p>특히 n8n을 통해 Discord와 Jira를 연결하고, Jira 티켓이 생성되기 전후의 상태를 직접 다뤄 본 경험이 기억에 남는다. 다른 팀원이 구현한 분류·검색·답변 기능과 내가 담당한 Jira·저장 기능을 하나의 흐름으로 연결하면서, 팀 프로젝트에서는 각 기능 자체뿐 아니라 서로 주고받는 데이터 형식과 오류 처리 기준도 중요하다는 것을 알게 됐다.</p>"
        },
        {
          "html": "<p>이번 프로젝트를 통해 AI가 답변을 만드는 과정만큼 그 답변을 실제 서비스와 안전하게 연결하는 과정도 중요하다는 것을 배웠다. R04 기능은 사용자 화면에서 직접 보이는 부분은 적지만, 중복 접수·결과 유실·권한 문제를 막기 위해 꼭 필요한 기반이라고 생각한다.</p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r04-script",
      "role": "R04",
      "title": "연동과 안정성 · 발표 원고",
      "slides": [
        3,
        7,
        8
      ],
      "source": "sources/r04-script.html",
      "blocks": [
        {
          "html": "<h1>R04 역할 담당자 발표문 (슬라이드 3장)</h1>"
        },
        {
          "html": "<p>슬라이드 번호는 <code>r04-3slides.html</code>과 같습니다. 대괄호 <code>[ ]</code>는 발표 직전에 결과를 보고 채우는 부분입니다. 전체 3~4분 기준입니다.</p>"
        },
        {
          "html": "<h2>슬라이드 1. 담당 역할</h2>"
        },
        {
          "html": "<p>R04를 맡은 역할 담당자입니다. 문의가 R02 본체를 지나고 나면, 그 뒤의 기록과 Jira, 실패 처리, 그리고 Discord 입구가 제 담당입니다.</p>"
        },
        {
          "html": "<p>구조도를 보시면, 왼쪽의 Discord에서 <code>/문의</code>가 들어오면 제 어댑터가 받아서 R02 본체로 넘깁니다. R02가 접수 대장, Jira 담당, 사용자 API를 부르고, 상태와 실패 기록은 PostgreSQL에, 티켓은 Jira에 쌓입니다. 점선은 실패했을 때 가는 길입니다.</p>"
        },
        {
          "html": "<p>개념도로 줄이면 한 문장입니다. 같은 문의를 하나의 request_id로 장부, Jira, 실패 보관함에 이어 두고, 먼저 적고, 한 번만 바꾸고, 다시 확인하고, 실패하면 번호를 남깁니다.</p>"
        },
        {
          "html": "<p>구체적으로는 여섯 가지입니다. 사용자와 기록을 조회하는 API, 요청 상태를 적는 접수 대장 state, Jira 티켓을 다루는 handoff, 실패한 건을 보관하는 DLQ, 오류 처리 워크플로우 errors, 그리고 Discord 어댑터입니다. errors는 아직 초안입니다.</p>"
        },
        {
          "html": "<p>다른 역할과는 이렇게 맞췄습니다. R01은 서버와 DB, 봇 기동, 병합을 맡고 있습니다. R02 태경님과는 save를 한 번만 부르고, 완료 기록은 제가 Jira를 확인한 뒤에 하기로 했습니다. R03의 검색 근거는 응답에 같이 보여주고, R05의 시험은 결과에 맞춰 기대값을 바꾸지 않기로 했습니다.</p>"
        },
        {
          "html": "<h2>슬라이드 2. 구현한 것</h2>"
        },
        {
          "html": "<p>구현한 건 네 가지입니다.</p>"
        },
        {
          "html": "<p>첫째, 같은 요청이 두 번 처리되지 않게 했습니다. request_id를 처리권으로 쓰고, 저장은 prepare, bind, finish 세 단계로 나눴습니다. 시작을 먼저 적고, 티켓 번호를 연결하고, Jira를 다시 확인한 뒤에 완료로 적습니다. 같은 요청을 다시 보내도 새 티켓이 안 생기는 것은 팀 n8n에서 확인했습니다.</p>"
        },
        {
          "html": "<p>둘째, Jira 티켓 처리입니다. 같은 요청의 티켓이 있는지 먼저 찾고 없을 때만 만듭니다. 답변은 종료하고, 이관은 댓글과 담당 지정, 알림을 보냅니다. 종료 전환은 이름으로 찾고, 없으면 임의로 처리하지 않고 멈춥니다.</p>"
        },
        {
          "html": "<p>셋째, 부분 실패입니다. 티켓은 만들어졌는데 종료나 배정이 실패하면 partial_effect로 기록하고, 티켓 번호와 끊긴 단계를 남깁니다. PR #36의 첫 정상 시험이 담당 매핑이 비어서 이렇게 끝났는데, 번호가 남아 있어서 어디서 끊겼는지 바로 알 수 있었습니다.</p>"
        },
        {
          "html": "<p>넷째, Discord 접수입니다. <code>/문의</code>를 받으면 3초 안에 본인에게만 보이는 대기 상태로 바꾸고, R02 Webhook을 호출해서 비공개로 답을 돌려줍니다. 등록되지 않은 계정은 R02를 부르지 않고 거절합니다. 오류는 코드마다 다른 안내를 하고, 답이 길어도 접수번호는 남깁니다.</p>"
        },
        {
          "html": "<p>그 밖에 직접 연결해 본 것도 있습니다. n8n Webhook을 수동으로 추가하고, Discord와 Jira를 연동했습니다. Jira 자동화로 티켓 변화를 Discord 알림으로 보내 보기도 했고, 태경님 흐름을 HTTP로 불러와서 앞뒤에 제 노드를 붙여 봤습니다. 이 둘은 팀 시스템과 별도로 해 본 실습입니다.</p>"
        },
        {
          "html": "<p>[화면 설명: n8n 워크플로우, Jira 티켓, Discord 답변 캡처를 차례로 보여줍니다. 실서버 시험을 못 했다면 \"이 화면은 로컬 시험입니다\"라고 먼저 말합니다.]</p>"
        },
        {
          "html": "<h2>슬라이드 3. 개념과 기술</h2>"
        },
        {
          "html": "<p>개념과 기술은 따로 외우기보다, 우리 프로젝트에서 문의 한 건이 지나가는 순서에 대입해서 설명드리겠습니다. 시민이 Discord에서 \"QR이 안 읽혀요, 자전거번호로 대여하는 방법을 알려주세요\"라고 보낸 경우입니다.</p>"
        },
        {
          "html": "<p>첫째, <code>/문의</code>를 받으면 3초 안에 본인에게만 보이는 대기 상태로 바꿉니다. 필요한 권한만 쓰는 최소 권한이고, discord.py와 Docker Compose로 구현했습니다. 실제로 비공개 답변이 나온 것은 이 화면에서 확인했습니다.</p>"
        },
        {
          "html": "<p>둘째, Discord 계정을 두바퀴 사용자로 연결하는 사용자 매핑입니다. 등록되지 않은 계정은 R02를 부르지 않고 거절하고, 토큰이나 매핑 값은 코드가 아니라 환경 변수로 넣습니다. 이 동작은 어댑터 시험 22건으로 확인했습니다.</p>"
        },
        {
          "html": "<p>셋째, 같은 문의에는 같은 request_id를 붙여서 R02 Webhook으로 보냅니다. 같은 요청을 두 번 해도 결과가 같은 멱등성이고, n8n Webhook과 HTTP로 연결했습니다.</p>"
        },
        {
          "html": "<p>넷째, 접수 대장에 먼저 기록합니다. 처음 시작한 요청만 처리권을 갖고, 상태가 예상과 같을 때만 바꾸는 조건부 갱신을 씁니다. PostgreSQL과 n8n state 워크플로우로 만들었습니다.</p>"
        },
        {
          "html": "<p>다섯째, Jira입니다. 같은 요청의 티켓이 있는지 먼저 찾고 없을 때만 만들고, 종료는 전환 이름으로 찾아서 실행합니다. 이렇게 생성되어 완료로 옮겨진 티켓을 Jira 보드에서 확인했습니다.</p>"
        },
        {
          "html": "<p>여섯째, 종료나 담당 지정이 실패하면 partial_effect로 기록하고, 티켓 번호와 끊긴 단계를 실패 보관함에 남깁니다. PR #36의 첫 정상 시험에서 담당 매핑이 비어 있어 실제로 이렇게 끝났습니다.</p>"
        },
        {
          "html": "<p>일곱째, R03의 검색 근거와 문의 연결값을 붙여 본인에게만 답을 돌려줍니다. 마지막으로, 별도 실습으로 Jira 자동화를 이용해 티켓이 바뀌면 Discord 채널로 알림이 가게 만들어 봤습니다.</p>"
        },
        {
          "html": "<p>정리하면, 같은 요청이 두 번 들어와도 티켓은 하나, 중간에 끊겨도 번호는 남고, 실패하면 이어서 복구할 수 있게 만들었습니다. 이상입니다.</p>"
        },
        {
          "html": "<h2>발표 전 확인</h2>"
        },
        {
          "html": "<li><input disabled=\"\" type=\"checkbox\"> 슬라이드 2 하단의 캡처 3개(C1 n8n, C3 Jira, C4 Discord) 확보 (Webhook 주소, 팀 키, 계정, ID 가림)</li>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r05-slides",
      "role": "R05",
      "title": "시험과 품질 · 발표 공개 정리 7장",
      "slides": [
        9,
        10,
        11
      ],
      "source": "sources/r05-slides.html",
      "blocks": [
        {
          "html": "<div class=\"tag\">R05 시험·품질 담당 구간</div>"
        },
        {
          "html": "<h1>S09 시험·성능 결과<br>S10 실패·개선·남은 한계</h1>"
        },
        {
          "html": "<p class=\"lead\">팀 VM 실제 연동 환경에서 시험하고, 숫자는 모두 실행 보고서(runs/)에서 옮겼습니다</p>"
        },
        {
          "html": "<h3>시험 환경</h3>"
        },
        {
          "html": "<div class=\"sub\">팀 VM n8n 시험 사본 (support 3e8547a)<br>실제 사용자 API · LLM · 검색 · Jira · PostgreSQL</div>"
        },
        {
          "html": "<h3>공식 판정 실행</h3>"
        },
        {
          "html": "<div class=\"sub\">2026-11-06 20:50~20:57<br>같은 설정으로 25건 × 3회 + WF-01 처리시간 5회</div>"
        },
        {
          "html": "<h3>근거 문서</h3>"
        },
        {
          "html": "<div class=\"sub\">실행 결과서 v0.8 (1~6절)<br>부록 실행 화면 17장</div>"
        },
        {
          "html": "<div class=\"foot\"><span>두바퀴 · 따릉이 시민 문의 지원</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — 이 장은 PPT에서 S09 앞에 붙이거나 생략해도 됩니다. \"지금부터는 실제 VM에서 시험한 결과입니다. 모든 숫자는 실행 보고서에서 옮긴 값입니다.\"</div>"
        },
        {
          "html": "<div class=\"tag\">S09 · 시험 범위</div>"
        },
        {
          "html": "<h1>무엇을 몇 번 시험했나</h1>"
        },
        {
          "html": "<p class=\"lead\">같은 설정으로 실행 가능한 25건을 3번씩 돌렸습니다 — 3번 모두 같아야 통과</p>"
        },
        {
          "html": "<h3>공통 시나리오 14유형</h3>"
        },
        {
          "html": "<div class=\"big ok\">8<small> / 14 유형</small></div>"
        },
        {
          "html": "<div class=\"sub\">3회 모두 기대 충족<br>실행 9유형 · <span class=\"warn\">WF-01 흔들림</span><br><span class=\"na\">미실행 5유형 (고장 3 · 조회 2)</span></div>"
        },
        {
          "html": "<h3>팀 시나리오 24건</h3>"
        },
        {
          "html": "<div class=\"big ok\">11<small> / 24 건</small></div>"
        },
        {
          "html": "<div class=\"sub\">3회 모두 기대 충족<br>실행 13건 · <span class=\"bad\">실패 2 (TC12·TC14)</span><br><span class=\"na\">미실행 10 · 미구현 1 (TC07)</span></div>"
        },
        {
          "html": "<h3>장애 시나리오 3유형</h3>"
        },
        {
          "html": "<div class=\"big na\">0<small> / 3 유형</small></div>"
        },
        {
          "html": "<div class=\"sub\">WF-04 외부 장애 · WF-10 LLM 멈춤 · WF-11 느린 API<br><span class=\"na\">고장 시험 사본 미제공으로 미실행</span></div>"
        },
        {
          "html": "<p class=\"note-row\">실행 단위 25건 × 3회 = 75회 실행 · 응답 90건 · 3회 모두 같은 결과 <b class=\"ok\">22 / 25건</b></p>"
        },
        {
          "html": "<div class=\"foot\"><span>근거: 실행 결과서 1·3절 (R1~R3 실행묶음)</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — \"공통 14유형 중 9유형을 실제 연동 환경에서 3번씩 돌렸고, 8유형은 세 번 모두 기대대로 나왔습니다. 고장과 조회 5유형은 시험용 사본과 데이터가 준비되지 않아 실행하지 못했고, 결과서에 사유와 함께 미실행으로 남겼습니다.\" 사례 수(건)와 실행 횟수(회)를 섞어 말하지 않기.</div>"
        },
        {
          "html": "<div class=\"tag\">S09 · 반복 결과</div>"
        },
        {
          "html": "<h1>3번 중 2번 통과는 통과가 아니다</h1>"
        },
        {
          "html": "<p class=\"lead\">LLM이 들어간 시나리오는 3회 반복으로 흔들림까지 기록했습니다</p>"
        },
        {
          "html": "<table>\n        <tbody><tr><th>판정</th><th>사례</th><th>3회</th></tr>\n        <tr><td><span class=\"pill p-ok\">3회 동일</span></td><td>보완 질문·한도 이관·근거 없음 이관·권한 없음·주입 차단·중복 처리·입력 오류·충돌·긴급 이관·과차단 없음</td><td><b class=\"ok\">22건</b></td></tr>\n        <tr><td><span class=\"pill p-warn\">흔들림</span></td><td>WF-01 정상 문의<br><span class=\"sub\">① 검색 3초 시간 초과로 이관 ③ 답 문장에 기대 단어 없음</span></td><td>FAIL · PASS · FAIL</td></tr>\n        <tr><td><span class=\"pill p-bad\">실패</span></td><td>TC12 애매한 문의 · TC14 이관 뒤 후속 요청</td><td>3회 모두 FAIL</td></tr>\n      </tbody></table>"
        },
        {
          "html": "<h3>응답 90건의 경로</h3>"
        },
        {
          "html": "<table style=\"font-size:17px\">\n        <tbody><tr><td>담당자 이관</td><td style=\"text-align:right\"><b>32</b></td></tr>\n        <tr><td>보완 질문</td><td style=\"text-align:right\"><b>20</b></td></tr>\n        <tr><td>자동 답변</td><td style=\"text-align:right\"><b>11</b></td></tr>\n        <tr><td>차단 (프롬프트 주입)</td><td style=\"text-align:right\"><b>9</b></td></tr>\n        <tr><td>HTTP 400 입력 오류 / 409 충돌</td><td style=\"text-align:right\"><b>9 / 6</b></td></tr>\n        <tr><td>권한 없음</td><td style=\"text-align:right\"><b>3</b></td></tr>\n      </tbody></table>"
        },
        {
          "html": "<div class=\"sub\">WF-01은 같은 질문 11번 중 9번 기대 충족</div>"
        },
        {
          "html": "<div class=\"foot\"><span>근거: 실행 결과서 1절·3.1~3.2절</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — \"25건 중 22건은 세 번 모두 같은 결과였습니다. WF-01 정상 문의는 한 번은 검색이 3초 제한을 넘겨 이관됐고, 한 번은 답 문장에 기대한 표현이 빠졌습니다. 그래서 통과가 아니라 흔들림으로 기록했습니다. 실패 두 건은 S10에서 설명합니다.\"</div>"
        },
        {
          "html": "<div class=\"tag\">S09 · 성능과 품질</div>"
        },
        {
          "html": "<h1>근거 없는 답·권한 위반 0건, 속도는 8초 목표 초과</h1>"
        },
        {
          "html": "<p class=\"lead\">모든 응답은 25초 상한 안 — 정상 문의는 LLM 3번과 Jira 처리가 시간의 대부분</p>"
        },
        {
          "html": "<h3>WF-01 처리시간</h3>"
        },
        {
          "html": "<div class=\"big warn\" style=\"font-size:40px\">8.06<small>초 p50</small></div>"
        },
        {
          "html": "<div class=\"sub\">p95 10.69초 · 5회 측정</div>"
        },
        {
          "html": "<h3>예외 처리 성공률</h3>"
        },
        {
          "html": "<div class=\"big ok\" style=\"font-size:40px\">39/39</div>"
        },
        {
          "html": "<div class=\"sub\">예외 13건 × 3회 (고장 3유형 제외)</div>"
        },
        {
          "html": "<h3>근거 없는 답 · 권한 위반</h3>"
        },
        {
          "html": "<div class=\"big ok\" style=\"font-size:40px\">0 · 0</div>"
        },
        {
          "html": "<div class=\"sub\">자동 답변 11건 전부 근거 있음</div>"
        },
        {
          "html": "<h3>요청당 LLM 호출</h3>"
        },
        {
          "html": "<div class=\"big\" style=\"font-size:40px\">≈0.98</div>"
        },
        {
          "html": "<div class=\"sub\">응답 agents 기준 추정값</div>"
        },
        {
          "html": "<h3>정상 문의 1건의 시간 구성 (n8n 실행 #305, 전체 13.1초)</h3>"
        },
        {
          "html": "<div style=\"width:41%;background:#1f7a4d\">LLM 3번 5.4초 · 41%</div>"
        },
        {
          "html": "<div style=\"width:24%;background:#3d6fb6\">Jira 3.2초 · 24%</div>"
        },
        {
          "html": "<div style=\"width:14%;background:#7a8ea6\">검색 1.9초</div>"
        },
        {
          "html": "<div style=\"width:21%;background:#c3cad2;color:#33404d\">기타 저장·분기 2.6초</div>"
        },
        {
          "html": "<div class=\"legend\"><span style=\"--c:#1f7a4d\">분류 1.86 + 작성 2.17 + 검증 1.36초</span><span style=\"--c:#3d6fb6\">티켓 생성·종료</span><span style=\"--c:#7a8ea6\">RAG 검색</span><span style=\"--c:#c3cad2\">하위 워크플로우·분기 등</span></div>"
        },
        {
          "html": "<div class=\"foot\"><span>근거: 실행 결과서 3절·3.2절 (처리시간 5회, n8n Logs 노드 시간 1회 측정)</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — \"근거 없는 답과 권한 위반은 0건이고, 실행한 예외 시나리오는 39번 모두 기대대로 처리됐습니다. 속도는 25초 상한은 지켰지만 정상 문의가 8초 목표를 넘었습니다. 시간을 나눠 보면 LLM 세 번과 Jira 처리가 3분의 2라 줄일 곳이 분명합니다.\" LLM 호출 수는 추정값이라고 꼭 말하기. 노드 시간은 한 번 잰 값.</div>"
        },
        {
          "html": "<div class=\"tag\">S10 · 대표 실패와 개선</div>"
        },
        {
          "html": "<h1>정상 문의가 끝까지 처리되지 않았다 → 고쳐서 통과</h1>"
        },
        {
          "html": "<p class=\"lead\">실패한 실행을 지우지 않고 보존하고, 같은 질문으로 다시 시험했습니다</p>"
        },
        {
          "html": "<div class=\"when\">11/6 14:33 · 실행 #266</div>"
        },
        {
          "html": "<h4 class=\"bad\">안내 종료 실패</h4>"
        },
        {
          "html": "<p>답변·검증까지 통과했지만 Jira에 <b>완료 전환이 없어</b> 종료 단계에서 멈춤 → 부분 실패로 이관, DLQ에 보존</p>"
        },
        {
          "html": "<div class=\"arrow\">→</div>"
        },
        {
          "html": "<div class=\"when\">11/6 15:16 · 실행 #279</div>"
        },
        {
          "html": "<h4 class=\"bad\">시간 예산 부족</h4>"
        },
        {
          "html": "<p>Jira 설정 확인 뒤 재시험. 남은 시간 <b>15,120ms &lt; 필요 15,500ms</b>로 답변 작성 전에 이관</p>"
        },
        {
          "html": "<div class=\"arrow\">→</div>"
        },
        {
          "html": "<div class=\"when\">11/6 16:00 · 실행 #305</div>"
        },
        {
          "html": "<h4 class=\"ok\">다섯 구간 모두 통과</h4>"
        },
        {
          "html": "<p>남은 시간에 맞춰 모델 한도를 조정(support 3e8547a). 입력 → 실행 → Jira 생성·종료 → DB 저장 → 응답 확인</p>"
        },
        {
          "html": "<h3>남은 위험</h3>"
        },
        {
          "html": "<div class=\"sub\" style=\"font-size:18px;color:var(--ink)\">같은 질문의 3회 반복은 <b class=\"warn\">2/3만 기대 충족</b> — 검색이 3초 제한을 넘기면 정상 문의도 이관됨 (#796, 검색 3,018ms)</div>"
        },
        {
          "html": "<div class=\"foot\"><span>근거: 실행 결과서 4.1절 · 실행 #266·#279·#305 보고서</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — \"첫 정상 실행은 Jira 종료 전환이 없어서, 두 번째는 시간 예산이 380ms 모자라서 실패했습니다. 두 실패 기록을 그대로 두고 원인을 고친 뒤 같은 질문으로 다시 돌려 다섯 구간 모두 통과를 확인했습니다. 다만 반복 시험에서는 검색 시간 초과로 한 번 더 흔들렸고, 이것이 남은 위험입니다.\"</div>"
        },
        {
          "html": "<div class=\"tag\">S10 · 두 번째 실패 (부록 A05)</div>"
        },
        {
          "html": "<h1>중복 요청 시험을 판정하지 못했다 → 입력 보완 → 통과</h1>"
        },
        {
          "html": "<p class=\"lead\">시스템 결함이 아니라 시험 입력의 문제 — 기대 결과는 바꾸지 않았습니다</p>"
        },
        {
          "html": "<h4 class=\"bad\">처음 (11/6 17:46·17:48, 2회)</h4>"
        },
        {
          "html": "<p>\"어제 이용권이 두 번 결제됐어요. 한 건 환불해 주세요.\"<br>→ 결제일·이용권·결제 수단이 없어 <b>보완 질문</b>으로 끝남<br>→ 이관이 안 되니 중복 처리를 판정할 수 없음</p>"
        },
        {
          "html": "<h4 class=\"ok\">보완 뒤 (11/6 20:33 재시험 + 3회 반복)</h4>"
        },
        {
          "html": "<p>\"11월 1일 오후에 30일 정기권을 앱에서 카드로 결제했는데 두 번 결제됐어요…\"<br>→ 1차 이관·티켓 생성, 2차 <b>같은 티켓 · duplicate: true · 0.3초</b><br>→ n8n에서 분류(LLM)·티켓 생성 노드 <b>미실행</b> 확인 (#849)</p>"
        },
        {
          "html": "<h3>배운 점</h3>"
        },
        {
          "html": "<div class=\"sub\" style=\"font-size:18px;color:var(--ink)\">시스템은 설계대로 정보를 더 물었다 — 실패를 지우지 않았기 때문에 <b>결함과 시험 입력 문제를 구분</b>할 수 있었다</div>"
        },
        {
          "html": "<div class=\"foot\"><span>근거: 실행 결과서 4.2절 · WF-09 재시험 · 실행 #849</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — \"중복 요청 시험은 처음에 판정조차 못 했습니다. 원인은 시스템이 아니라 시험 질문이 너무 짧아서 시스템이 설계대로 보완 질문을 한 것이었습니다. 질문만 보완하고 기대 결과는 그대로 둔 채 다시 시험해, 두 번째 요청이 같은 티켓을 0.3초 만에 돌려주고 LLM도 다시 부르지 않는 것을 확인했습니다.\"</div>"
        },
        {
          "html": "<div class=\"tag\">S10 · 남은 한계</div>"
        },
        {
          "html": "<h1>시험하지 않은 것을 통과로 말하지 않는다</h1>"
        },
        {
          "html": "<p class=\"lead\">미해결 결함과 검증 범위를 결과서에 그대로 기록했습니다</p>"
        },
        {
          "html": "<h3>미해결 결함</h3>"
        },
        {
          "html": "<li><b class=\"bad\">이관 뒤 후속 요청(TC14)</b>: 이관된 건에 정보를 더 보내면 다시 보완 질문으로 돌아감 — 5번 모두 같음, 설계 대조 중</li>"
        },
        {
          "html": "<li><b class=\"warn\">검색 3초 제한</b>: 검색이 늦으면 정상 문의도 이관됨</li>"
        },
        {
          "html": "<li><b class=\"warn\">애매한 문의(TC12)</b>: 반납·요금이 섞이면 한쪽 정보만 물음 — 수정본 미배포</li>"
        },
        {
          "html": "<h3>검증 범위의 한계</h3>"
        },
        {
          "html": "<li>고장 3유형·조회 2유형 <span class=\"na\">미실행</span> (시험 사본·데이터 미제공)</li>"
        },
        {
          "html": "<li>실제 시민 인증·기관 시스템 미연동, 사용자·접수 건은 모의 데이터</li>"
        },
        {
          "html": "<li>보안 발견: n8n 실행 기록에 팀 키가 평문으로 남음 → 저장 범위 조정 검토</li>"
        },
        {
          "html": "<div class=\"foot\"><span>근거: 실행 결과서 1.3·1.4·4.3·4.4절</span><span>R05</span></div>"
        },
        {
          "html": "<div class=\"notes\"><b>발표자 메모</b> — \"남은 결함 세 가지와 검증하지 못한 범위를 그대로 보여 드립니다. 특히 고장 시나리오는 실행하지 못했기 때문에 통과라고 말하지 않습니다. 시험 중 실행 기록에 팀 키가 남는 보안 문제도 찾아 기록했습니다.\" 질의응답에서 고장 시험을 물으면: \"설계와 사례 파일은 준비했고, 고장 사본이 없어 실행하지 못했다\"고 답하기.</div>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "r05-notes",
      "role": "R05",
      "title": "시험과 품질 · 결과·발표 메모",
      "slides": [
        9,
        10,
        11
      ],
      "source": "sources/r05-notes.html",
      "blocks": [
        {
          "html": "<h1>R05 시험·품질: 발표 자료·개념·소감</h1>"
        },
        {
          "html": "<li>작성: 2026-11-07 KST, R05 시험·품질</li>"
        },
        {
          "html": "<li>용도: 최종 발표 자료 취합(발표 총괄)에 제출할 R05 담당분</li>"
        },
        {
          "html": "<li>맡은 구간: <a href=\"../../../../docs/PRESENTATION-PLAN.md\">발표 계획</a>의 <strong>S09 시험·성능 결과</strong>, <strong>S10 실패·개선·한계</strong>(발표자 F가 설명), <strong>S08 VM 시연의 화면 조작</strong>, 부록 A02(전체 시험 결과)·A05(두 번째 실패 사례)</li>"
        },
        {
          "html": "<li>숫자 출처: <a href=\"../../../../docs/project/EXECUTION-RESULT.md\">실행 결과서 v0.8</a>. 모든 수치는 <code>runs/public/</code> 보고서에서 옮긴 값이다. 측정하지 않은 값은 슬라이드에도 \"미측정·미실행\"으로 쓴다.</li>"
        },
        {
          "html": "<li>발표용 HTML: 같은 폴더의 <code>r05-test-quality-slides.html</code>(PPT 변환 참고용, Git 추적 제외)</li>"
        },
        {
          "html": "<h2>1. 내가 맡은 구간의 발표 자료</h2>"
        },
        {
          "html": "<h3>S09-1. 무엇을 어떻게 시험했나</h3>"
        },
        {
          "html": "<li>핵심 메시지: 팀 VM의 실제 연동(사용자 API·LLM·검색·Jira·PostgreSQL)에서 같은 설정으로 25건을 3번씩 돌렸다.</li>"
        },
        {
          "html": "<li>화면 내용:</li>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>구분</th>\n<th>실행</th>\n<th>3회 모두 기대 충족</th>\n<th>비고</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>공통 시나리오</td>\n<td>14유형 중 9유형</td>\n<td><strong>8유형</strong></td>\n<td>WF-01 흔들림, 5유형 미실행(고장 3·조회 2)</td>\n</tr>\n<tr>\n<td>팀 시나리오</td>\n<td>24건 중 13건</td>\n<td><strong>11건</strong></td>\n<td>TC12·TC14 실패, 10건 미실행, TC07 미구현</td>\n</tr>\n<tr>\n<td>장애 시나리오</td>\n<td>3유형 중 0</td>\n<td>—</td>\n<td>고장 사본 미제공</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<li>발표자 메모: \"공통 14유형 중 9유형을 실제 연동 환경에서 3번씩 돌렸고, 8유형은 세 번 모두 기대대로 나왔습니다. 고장·조회 5유형은 시험용 사본과 데이터가 준비되지 않아 실행하지 못했고, 결과서에 사유와 함께 미실행으로 남겼습니다.\"</li>"
        },
        {
          "html": "<h3>S09-2. 3회 반복 결과</h3>"
        },
        {
          "html": "<li>핵심 메시지: 25건 중 22건은 세 번 모두 같은 결과였다. 3번 중 2번 통과는 통과로 세지 않았다.</li>"
        },
        {
          "html": "<p>화면 내용:</p>"
        },
        {
          "html": "<li>3회 동일 22건: 보완 질문·한도 이관·근거 없음 이관·권한 없음·주입 차단·중복 처리·입력 오류·충돌 409·긴급 이관·과차단 없음</li>"
        },
        {
          "html": "<li>흔들림 1건: WF-01 정상 문의(FAIL → PASS → FAIL)</li>"
        },
        {
          "html": "<li>실패 2건: TC12(애매한 문의의 보완 항목), TC14(이관 뒤 후속 요청)</li>"
        },
        {
          "html": "<li>응답 90건: 자동 답변 11, 담당자 이관 32, 보완 질문 20, 차단 9, 권한 없음 3, HTTP 400 9, HTTP 409 6</li>"
        },
        {
          "html": "<li>발표자 메모: \"WF-01은 한 번은 검색이 3초 제한을 넘겨 이관됐고, 한 번은 답 문장에 기대 단어가 빠졌습니다. 같은 질문을 11번 돌려 9번 기대대로 나왔습니다. 그래서 '통과'가 아니라 '흔들림'으로 기록했습니다.\"</li>"
        },
        {
          "html": "<h3>S09-3. 성능과 품질 지표</h3>"
        },
        {
          "html": "<li>화면 내용:</li>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>지표</th>\n<th>값</th>\n<th>근거</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>WF-01 처리시간</td>\n<td>p50 <strong>8.06초</strong> · p95 <strong>10.69초</strong> (5회, 평균 8.57초)</td>\n<td>처리시간 5회 측정</td>\n</tr>\n<tr>\n<td>예외 처리 성공률</td>\n<td><strong>39/39 (100%)</strong></td>\n<td>실행한 예외 시나리오 13건 × 3회</td>\n</tr>\n<tr>\n<td>근거 없는 답변</td>\n<td><strong>0건</strong></td>\n<td>자동 답변 11건 모두 근거 있음</td>\n</tr>\n<tr>\n<td>권한 위반</td>\n<td><strong>0건</strong></td>\n<td>WF-05 3회(남의 접수 건 WF-06은 미실행)</td>\n</tr>\n<tr>\n<td>요청당 LLM 호출</td>\n<td><strong>약 0.98번</strong>(추정)</td>\n<td>응답 agents 기준</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<li>정상 문의 1건(실행 #305, 13.1초)의 단계별 시간: LLM 3번 5.4초(41%), Jira 생성·종료 3.2초(24%), 검색 1.9초(14%), 사용자 확인 9ms</li>"
        },
        {
          "html": "<li>발표자 메모: \"모든 응답이 25초 상한 안에 들어왔지만 정상 문의는 8초 목표를 넘었습니다. 노드별 시간을 보면 LLM 세 번과 Jira 처리가 대부분이라 줄일 곳이 분명합니다. LLM 호출 수는 응답의 실행 역할로 센 추정값이라고 말합니다.\"</li>"
        },
        {
          "html": "<h3>S10-1. 대표 실패: 정상 문의가 끝까지 처리되지 않음 → 수정 → 통과</h3>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>단계</th>\n<th>내용</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>현상</td>\n<td>첫 실행(#266)은 Jira 안내 종료에서 멈춰 이관(<code>partial_effect</code>), 재시험(#279)은 답변 작성 전에 이관</td>\n</tr>\n<tr>\n<td>원인</td>\n<td>#266: Jira에 완료 전환이 없음. #279: 남은 시간 15,120ms가 작성·검증에 필요한 15,500ms보다 작음</td>\n</tr>\n<tr>\n<td>조치</td>\n<td>Jira 완료 전환·resolution 설정 확인, 남은 시간에 맞춰 모델 한도 조정(support <code>3e8547a</code>)</td>\n</tr>\n<tr>\n<td>재시험</td>\n<td>실행 #305가 입력→실행→Jira→DB→응답 다섯 구간 모두 통과</td>\n</tr>\n<tr>\n<td>남은 위험</td>\n<td>3회 반복에서 2/3만 기대 충족(검색 3초 시간 초과 1번)</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<li>발표자 메모: \"실패를 숨기지 않고 실패 실행 두 건을 그대로 보존했습니다. 원인을 고친 뒤 같은 질문으로 다시 돌려 통과를 확인했습니다.\"</li>"
        },
        {
          "html": "<h3>S10-2. 두 번째 실패: 중복 요청 시험을 판정하지 못함 → 입력 보완 → 통과 (부록 A05)</h3>"
        },
        {
          "html": "<li>현상: 중복 요청 시험의 첫 요청이 이관되지 않고 보완 질문으로 끝나 중복 처리를 판정할 수 없었다(2회 같은 결과).</li>"
        },
        {
          "html": "<li>원인: 시험 입력에 결제일·이용권·결제 수단이 없었다. 시스템은 설계대로 정보를 더 물었다(시험 쪽 문제).</li>"
        },
        {
          "html": "<li>조치: 질문 문장만 보완했다. 기대 결과는 바꾸지 않았고, 바꾼 이유를 사례 파일에 기록했다.</li>"
        },
        {
          "html": "<li>재시험: 두 번째 요청이 같은 티켓을 <code>duplicate: true</code>로 0.3초 만에 돌려줬다. n8n 화면에서 분류(LLM)·티켓 생성 노드가 실행되지 않은 것도 확인했다(실행 #849).</li>"
        },
        {
          "html": "<h3>S10-3. 남은 한계</h3>"
        },
        {
          "html": "<li><strong>이관 뒤 후속 요청</strong>(TC14): 이관된 건에 정보를 더 보내면 다시 보완 질문으로 돌아간다. 5번 모두 같다. 설계 대조 중이다.</li>"
        },
        {
          "html": "<li><strong>검색 3초 제한</strong>: 검색이 3초를 넘기면 정상 문의도 이관된다(#796, 3,018ms).</li>"
        },
        {
          "html": "<p><strong>검증 범위</strong>:</p>"
        },
        {
          "html": "<li>고장 3유형과 조회 2유형은 미실행이다.</li>"
        },
        {
          "html": "<li>실제 시민 인증과 기관 시스템은 연동하지 않았다. 사용자와 접수 건은 모의 데이터다.</li>"
        },
        {
          "html": "<li><strong>보안 발견</strong>: n8n 실행 기록에 팀 키가 평문으로 남는다. 저장 범위 조정을 검토 중이다.</li>"
        },
        {
          "html": "<li>발표자 메모: \"남은 한계는 결과서 4절과 1.4절에 그대로 적었습니다. 시험하지 않은 것을 통과로 말하지 않습니다.\"</li>"
        },
        {
          "html": "<h3>S08 시연에서 R05가 할 일</h3>"
        },
        {
          "html": "<li>발표자가 설명하는 동안 화면을 조작한다. 시연 순서는 <code>requests/demo-sequence.json</code> 7단계(정상 → 보완 질문 → 장애 → 이관·로그)다.</li>"
        },
        {
          "html": "<li>장애 시연(<code>demo-3-ticket-down.json</code>)은 Jira 고장 사본이 있어야 한다. 준비되지 않으면 이 단계는 실행 #796(검색 시간 초과 → 안전 이관) 화면으로 대체한다. 이때 저장된 화면이라고 말한다.</li>"
        },
        {
          "html": "<li>n8n 실행 화면을 띄울 때 <strong>B01 문의 수신 출력은 열지 않는다</strong>(팀 키가 보임).</li>"
        },
        {
          "html": "<h2>2. 시험에 필요한 개념·기술</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>개념·기술</th>\n<th>무엇인가</th>\n<th>이번 프로젝트에서 쓴 곳</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>기대 결과 먼저 쓰기</td>\n<td>만들기 전에 \"이렇게 나와야 한다\"를 정하고, 결과를 본 뒤 기대를 고치지 않는다</td>\n<td><code>cases/</code> 사례 파일. TC12는 기대 단어가 부족했지만 실패로 남겼다</td>\n</tr>\n<tr>\n<td>계약 칸으로 판정</td>\n<td>LLM 답 문장은 매번 다르므로 <code>route</code>·<code>sources</code>·<code>ticket</code>·<code>security</code> 같은 응답 칸으로 판정한다</td>\n<td>모든 사례의 <code>expect</code>·<code>assert</code></td>\n</tr>\n<tr>\n<td>공통·팀 시나리오</td>\n<td>모든 팀이 같은 14유형 + 우리 설계를 보여 주는 팀 사례 5개 이상</td>\n<td>공통 17건, 팀 24건</td>\n</tr>\n<tr>\n<td>3회 반복과 흔들림</td>\n<td>LLM이 들어간 시나리오는 3번 돌려 모두 같아야 통과. 다르면 원인(LLM 판단·시간 초과·외부 지연)을 적는다</td>\n<td>R1~R3 반복, WF-01 흔들림 분석</td>\n</tr>\n<tr>\n<td>p50·p95</td>\n<td>처리시간을 평균 대신 중앙값과 상위 5% 값으로 본다</td>\n<td>WF-01 5회 측정</td>\n</tr>\n<tr>\n<td>장애 주입과 복원</td>\n<td>고장 스위치를 켜고 시험한 뒤 반드시 끈다. <code>before</code>·<code>after</code>로 자동화</td>\n<td>사례 파일에 설계, 고장 사본이 없어 미실행</td>\n</tr>\n<tr>\n<td>중복 요청과 멱등성</td>\n<td>같은 <code>request_id</code>는 저장된 결과를 그대로 돌려주고, 내용이 다르면 409로 거절한다</td>\n<td>WF-09, TC03</td>\n</tr>\n<tr>\n<td>다단계 사례</td>\n<td>앞 응답의 값(연결값)을 다음 요청에 넣어 보완 왕복을 시험한다</td>\n<td>TC01·TC01b·TC14</td>\n</tr>\n<tr>\n<td>시험 도구</td>\n<td><code>scripts/test/run_cases.py</code>: 사례 실행, 판정, 공통 검사(G01<del>G06), 로그 검사(L01</del>L03), 결과 저장</td>\n<td>모든 VM 시험</td>\n</tr>\n<tr>\n<td>공개 기록과 원시 기록 분리</td>\n<td>원시 응답은 VM에만, 공개 기록은 Jira key·연결값·키를 가린 요약만</td>\n<td><code>runs/&lt;ID&gt;/</code>와 <code>runs/public/&lt;ID&gt;/</code></td>\n</tr>\n<tr>\n<td>해시로 같은 파일 확인</td>\n<td>VM 원본과 저장소 파일의 SHA-256을 비교해 옮기다 바뀌지 않았는지 확인</td>\n<td>모든 결과 파일</td>\n</tr>\n<tr>\n<td>n8n 실행 화면 읽기</td>\n<td>Executions·Logs에서 실행된 노드, 분기, 노드별 시간, 오류 출력을 본다</td>\n<td>대표 로그 3건, 단계별 시간</td>\n</tr>\n<tr>\n<td>Git 작업 규칙</td>\n<td><code>&lt;역할&gt;/&lt;P번호&gt;-&lt;내용&gt;</code> 브랜치, <code>P번호: 목적</code> 커밋, 검사·미실행 기록</td>\n<td>R05 브랜치 3개</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>3. 소감 + 기타</h2>"
        },
        {
          "html": "<blockquote>\n<p>아래 소감은 초안입니다. 본인 말투와 실제 느낌에 맞게 고쳐 주세요.</p>\n</blockquote>"
        },
        {
          "html": "<h3>소감 (초안)</h3>"
        },
        {
          "html": "<li>\"기대 결과를 먼저 쓰고, 결과에 맞춰 고치지 않는다\"는 규칙이 처음에는 답답했습니다. 그런데 TC12와 중복 요청 시험에서 실패를 그대로 남겨 두니, 시스템 결함과 시험 입력 문제를 나눠 볼 수 있었습니다. 실패 기록이 가장 쓸모 있는 증거라는 말을 직접 겪었습니다.</li>"
        },
        {
          "html": "<li>같은 질문도 11번 중 2번은 다르게 나왔습니다. LLM이 들어간 시스템은 한 번 통과로는 아무것도 말할 수 없고, 반복과 원인 분석이 시험의 핵심이라는 것을 알게 됐습니다.</li>"
        },
        {
          "html": "<li>숫자를 보고서에서만 옮기는 원칙 덕분에, 결과서의 모든 숫자를 누가 물어도 어느 실행에서 나왔는지 바로 답할 수 있게 됐습니다.</li>"
        },
        {
          "html": "<li>증거 화면을 캡처하다가 팀 키가 찍힌 일이 있었습니다. 증거를 남기는 일 자체도 보안 위험이 될 수 있다는 것을 배웠고, 그 덕분에 실행 기록에 키가 남는 문제를 찾았습니다.</li>"
        },
        {
          "html": "<li>아쉬운 점은 고장 시험과 조회 시험을 하지 못한 것입니다. 시험은 다른 역할의 준비에 기대는 부분이 많으니, 필요한 사본과 데이터를 더 일찍 구체적으로 요청했어야 했습니다.</li>"
        },
        {
          "html": "<h3>기타</h3>"
        },
        {
          "html": "<li>미해결 사항과 확인 요청은 <a href=\"../../../../docs/project/EXECUTION-RESULT.md\">실행 결과서</a> 4절·6절에 정리했다.</li>"
        },
        {
          "html": "<li>새 버전이 VM에 배포되면 3회 반복과 처리시간 측정을 다시 돌려 S09 숫자를 갱신한다. 명령은 그동안 쓴 것과 같다.</li>"
        },
        {
          "html": "<li>발표 화면에 쓸 실행 캡처 17장은 결과서 PDF 부록에 있다(팀 키·식별자 가림).</li>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "system",
      "role": "R01",
      "title": "시스템 설계 · 통합 기준",
      "slides": [
        1,
        2,
        3
      ],
      "source": "sources/system.html",
      "blocks": [
        {
          "html": "<h1>두바퀴 따릉이 시민 문의 지원 시스템 설계서</h1>"
        },
        {
          "html": "<p>현행 적용 상태: v0.14 / 2026-11-07. PR36 main a657890의 Discord→사용자 API→LLM/RAG→Jira→PostgreSQL save→비공개 응답을 실제 확인했다. 워크플로우 v0.20·저장소 v0.6·RAG v0.12와 <a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">검증 결과</a>를 함께 따른다. 정상 한 건의 성공과 전체 회귀·역할 최종 확인은 다르다. 아래 이전 버전의 미채택/미반영/미확인 표기는 당시 조사·설계 이력이며 현재 적용 상태로 읽지 않는다.</p>"
        },
        {
          "html": "<li>작성일: 2026-11-03 KST</li>"
        },
        {
          "html": "<li>버전·상태: v0.12 / PostgreSQL 독립 배포 준비 경로·미적용 경계 반영 초안</li>"
        },
        {
          "html": "<li>책임: R01 통합, R02 흐름, R03 RAG, R04 연동·저장, R05 검증 공동 검토</li>"
        },
        {
          "html": "<li>상세 기준: 워크플로우 v0.14, RAG v0.10, 저장소 v0.4. RAG 교육용 원본의 VM 수동 색인·검색 부분 시험은 <a href=\"../../../../runs/public/20261105-111311-vm-rag-integration/report.md\">최신 실행 증거</a>를 따른다. 실제 서버 사용자 인가·공식 판정·전체 종단 연결은 미확인이다.</li>"
        },
        {
          "html": "<p>시민 문의를 접수하고 근거로 안내하거나 담당자에게 연결한다. 모든 정상 신규 문의는 Jira 티켓으로 관리하며, 안내 완료·보완 대기·담당자 이관을 구분한다. 팀 이름은 두바퀴, 기술 접두사는 dubakwi다. 이 문서에서 시스템 전체 구성과 기능·상태·시나리오의 관계를 파악한 뒤 담당 상세 설계로 이동한다.</p>"
        },
        {
          "html": "<h2>1 목적과 설계 범위</h2>"
        },
        {
          "html": "<p>대상은 대여·반납·고장·요금/환불·후속 조회·개인정보/보안의 시민 문의다. 직원은 이관된 티켓을 처리하는 담당자다. 실제 환불·요금 변경·강제 반납·원격 잠금 해제·출동 승인과 직원용 별도 업무 화면은 구현 범위에서 제외한다. 자동 종료는 안내 제공 완료를 의미하며 실제 문제 해결을 판정하지 않는다.</p>"
        },
        {
          "html": "<p>범위와 가정의 원본은 <a href=\"../../../../docs/project/TOPIC.md\">주제 제안서</a>, 역할·파일 소유권은 <a href=\"../../../../docs/project/TEAM-CHARTER.md\">팀 헌장</a>이다. 이 문서는 전체 논리 구성을 소유하며 상세 필드·enum·노드·SQL을 복제 정의하지 않는다. 전체 동작을 변경하면 이 문서와 영향받는 상세 설계·시험을 함께 갱신한다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>관점</th>\n<th>읽을 문서</th>\n<th>관리하는 내용</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>전체 시스템</td>\n<td>이 문서</td>\n<td>구성 경계, 상태 간 관계, 기능·시나리오 추적</td>\n</tr>\n<tr>\n<td>업무 실행</td>\n<td><a href=\"../../../../docs/project/WORKFLOW-DESIGN.md\">워크플로우 설계</a></td>\n<td>노드·엣지, 업무 계약, 분기 우선순위, 티켓 효과와 오류</td>\n</tr>\n<tr>\n<td>검색 내부</td>\n<td><a href=\"../../../../docs/project/RAG-ARCHITECTURE.md\">RAG 설계</a></td>\n<td>지식·청킹·임베딩·색인·검색·복구</td>\n</tr>\n<tr>\n<td>저장과 복구</td>\n<td><a href=\"../../../../docs/project/STORAGE-DESIGN.md\">저장소 설계</a></td>\n<td>처리 상태·저장 계약·DLQ·실행 기록·재처리</td>\n</tr>\n<tr>\n<td>개발 순서</td>\n<td><a href=\"../../../../docs/DEVELOPMENT-PLAN.md#10-%EA%B3%B5%ED%86%B5-%EC%84%A4%EA%B3%84-%EA%B2%B0%EC%A0%95%EA%B3%BC-%EC%97%AD%ED%95%A0%EB%B3%84-%EA%B5%AC%ED%98%84-%EC%9D%B8%EA%B3%84\">개발 계획 10절</a></td>\n<td>작업·담당·선행 조건·D01~D06 결정</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>2 논리적 시스템 구성</h2>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart TD\n  Citizen[\"Discord 슬래시 명령\"] --&gt; Adapter[\"Python Discord 어댑터 R04\\n초기 비공개 응답·계약 변환\"]\n  Adapter --&gt; Main[\"n8n 본체 R02\\n입력·권한·분류·답변·검증·응답\"]\n  Test[\"공통 시험 도구\"] --&gt; Main\n  Main --&gt; Search[\"검색 하위 기능 R03\"]\n  Docs[\"출처를 확인한 지식 원본\"] --&gt; Index[\"색인 하위 기능 R03\"]\n  Index --&gt; Vector[\"권한별 벡터 색인\"]\n  Search --&gt; Vector\n  Main --&gt; Handoff[\"Jira 연동 R04\\n생성·조회·보완·종료·배정·알림\"]\n  Handoff --&gt; Jira[\"Jira 티켓 원본\"]\n  Handoff --&gt; Notify[\"담당 알림 채널\"]\n  Staff[\"직원 담당자\"] --&gt; Jira\n  Main --&gt; State[\"처리 상태 하위 기능 R04\"]\n  Handoff --&gt; State\n  State --&gt; Store[\"최소 처리 상태\"]\n  Main --&gt; Errors[\"예상 실패 처리와 Error Workflow R04\"]\n  Errors --&gt; DLQ[\"DLQ와 운영 확인\"]\n  Main -.-&gt; Exec[\"n8n 실행 기록과 메타 로그\"]\n  Ops[\"운영 확인 담당 R04\"] --&gt; DLQ\n  Ops --&gt; Jira\n</code></pre>"
        },
        {
          "html": "<p>화살표는 호출·조회·기록의 논리 관계다. 실제 포트·실행 순서·저장 게이트는 워크플로우 설계가 정의한다. 시민용 별도 UI는 전제하지 않으며 시험 요청 도구로 Webhook을 호출할 수 있다. 직원의 후속 작업은 Jira에서 수행한다. 직원의 실제 처리 완료를 서비스가 자동 동기화하는 별도 루프는 현재 범위에 포함하지 않는다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>경계</th>\n<th>책임과 데이터 원본</th>\n<th>주요 연결</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>본체</td>\n<td>서버 확인 사용자·권한, 처리 순서·응답 결정</td>\n<td>Request/Response, SearchRequest/SearchResult, TicketRequest/TicketResult</td>\n</tr>\n<tr>\n<td>RAG</td>\n<td>공개/제한 지식 분리, 허용 근거 반환</td>\n<td>근거·점수·문서/청크/버전, ok/empty/skipped/error</td>\n</tr>\n<tr>\n<td>Jira 연동</td>\n<td>문의 맥락·소유권·보완 횟수·담당·업무 상태</td>\n<td>물리 Jira 필드를 업무 계약으로 정규화</td>\n</tr>\n<tr>\n<td>최소 상태</td>\n<td>요청 처리권·중복 판정·Jira 연결·가린 최종 응답</td>\n<td>StateRef와 begin/prepare/bind/save/finish/fail</td>\n</tr>\n<tr>\n<td>DLQ</td>\n<td>실패·미확인 효과와 복구에 필요한 최소 자료</td>\n<td>RecoveryCapsule, 운영 claim/resolve</td>\n</tr>\n<tr>\n<td>실행 기록</td>\n<td>실행 위치·시간·오류 확인</td>\n<td>execution_id와 가린 메타 로그</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>Jira는 채택했다. 최소 상태·DLQ의 물리 저장은 PostgreSQL 2테이블 제안이며 최종 제품·배포 방식은 D01에서 정한다. RAG 벡터 색인은 이 두 테이블과 별개다. n8n 실행 기록만으로 업무 중복 방지나 영속 복구를 보장하지 않는다.</p>"
        },
        {
          "html": "<h3>2.1 Discord 이용자 채널</h3>"
        },
        {
          "html": "<p>2026-11-03 사용자 결정으로 Discord를 이용자 입구로 채택한다. 현재 팀원이 시민을 모의하여 시험한다. 본체 공통 Webhook·Request/Response·Jira·공통 시험은 유지하고, Discord 메시지 형식만 입구/출구에서 변환한다. Discord 계정 연결은 실제 시민 본인 인증을 구현했다는 뜻이 아니다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>공통 기준</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>구현 기본안</td>\n<td>Python 봇이 Gateway 상호작용을 수신하고 내부 n8n Header Auth Webhook을 호출한다. Discord HTTP Interactions Endpoint 방식과 혼용하지 않는다. SDK·실제 연결은 D07 확인 후 구현</td>\n</tr>\n<tr>\n<td>입력</td>\n<td><code>/문의 내용:&lt;질문&gt; case_ref:&lt;선택&gt;</code> 슬래시 명령 기본안. 일반 채팅 전체 수집·Message Content 특권 인텐트·첨부 수집은 기본 범위 밖</td>\n</tr>\n<tr>\n<td>초기 응답</td>\n<td>3초 안에 비공개 지연 응답(EPHEMERAL defer)을 확인한 뒤 본체 호출. 처리 중 표시는 Jira 접수 완료를 뜻하지 않음</td>\n</tr>\n<tr>\n<td>최종 응답</td>\n<td>본체의 가린 답변·출처·보완 연결값·확인된 티켓 효과를 본인 전용 응답으로 전송. 공용 채널 게시·자동 DM 대체 금지</td>\n</tr>\n<tr>\n<td>사용자</td>\n<td>Discord가 확인한 user ID를 서버 설정의 모의 이용자에 매핑. 표시 이름·명령의 자기소개로 권한 부여 금지. 미등록 사용자는 거절</td>\n</tr>\n<tr>\n<td>보완</td>\n<td>응답 case_ref를 다음 명령에 명시. 본체가 서버 소유권·열림 상태·보완 횟수를 다시 확인. 별도 대화 전체 저장 테이블 추가 없음</td>\n</tr>\n<tr>\n<td>중복·실패</td>\n<td>같은 interaction ID는 같은 request_id. 최종 전송 실패는 업무 처리 실패와 구분하고 티켓/LLM 전체 재실행 금지. 조회/재시도는 기존 요청 ID와 실제 효과 확인</td>\n</tr>\n<tr>\n<td>배포</td>\n<td>기존 n8n7개 워크플로우는 유지하고 Python discord-bot 프로세스를 Compose 별도 서비스로 추가할 기본안. 외부 Gateway 연결·내부 Webhook 통신·비밀 주입을 R01/R04 검증</td>\n</tr>\n<tr>\n<td>담당 알림</td>\n<td>Discord는 이용자 입구 결정이다. 직원 알림은 기존 Jira/알림 계약을 유지하며 공개 채널에 민원을 자동 전송하지 않음</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>상호작용 토큰은 공식 문서상15분 유효하지만 업무 응답 기한을15분으로 늘리지 않는다. 기존 timeout/deadline·WF-11 최종 응답 기준을 유지한다. 초기 응답 실패는 본체 실행 전에 중단하고, 전송 토큰 만료·봇 재시작 뒤 자동 재전송은 현재 보장하지 않는다. 비밀 토큰은 환경 비밀로 주입하고 원시 상호작용/토큰·실제 Discord 사용자/서버 ID를 공개 데이터·로그에 넣지 않는다.</p>"
        },
        {
          "html": "<p>정확한 변환 계약은 <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md#66-discord-%EC%9E%85%EC%B6%9C%EA%B5%AC-%EC%96%B4%EB%8C%91%ED%84%B0\">워크플로우6.6</a>, 파일 책임은 헌장, 구현/시험 선행 조건은 개발 계획 D07을 따른다. <a href=\"https://docs.discord.com/developers/interactions/receiving-and-responding\">Discord 공식 상호작용 문서</a>의3초·지연 응답·토큰 유효기간을 기준으로 하며 실제 봇 생성·서버 설치·연결은 미실행이다.</p>"
        },
        {
          "html": "<p>과정 검증용 data-api는 GitLab79 원본을 VM 내부망에 연결했다. 사용자 조회·메타 로그는 <a href=\"../../../../runs/public/20261105-114531-vm-course79-data-api/report.md\">후속 실행 증거</a>를 따른다. 이는 과정 모의 데이터/메모리 API이며 실제 Jira·영속 상태/DLQ 또는 R04 팀 권한 fixture의 완료를 뜻하지 않는다.</p>"
        },
        {
          "html": "<h2>3 식별자와 공통 불변 조건</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>식별자</th>\n<th>의미와 연결 규칙</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>request_id</td>\n<td>한 요청의 재전송 식별자. 같은 소유자·같은 입력만 저장 결과 재사용</td>\n</tr>\n<tr>\n<td>case_id / case_ref</td>\n<td>논리 문의의 내부 ID / 호출자에게 반환하는 연결값. 보완은 새 request_id와 같은 case_ref 사용</td>\n</tr>\n<tr>\n<td>first_request_id</td>\n<td>최초 문의와 Jira 생성·재사용을 연결하는 기준</td>\n</tr>\n<tr>\n<td>ticket_id</td>\n<td>이번 문의의 Jira 티켓. 생성 전에는 없을 수 있음</td>\n</tr>\n<tr>\n<td>target_ticket_id</td>\n<td>상태를 조회할 기존 건. 이번 문의 티켓과 구분</td>\n</tr>\n<tr>\n<td>execution_id</td>\n<td>최초 본체 실행과 저장·DLQ·실행 기록 연결</td>\n</tr>\n<tr>\n<td>state_revision / case_version</td>\n<td>요청 상태의 조건부 갱신 버전 / Jira 문의 충돌 검사 버전. 서로 대체하지 않음</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<li>입력·인증·권한·주입을 먼저 검사한다. 거절할 입력을 정상 접수로 취급하지 않는다.</li>"
        },
        {
          "html": "<li>정상 신규 문의당 티켓 하나를 목표로 하며 생성 응답 유실 시 실제 효과를 확인한다. 로컬 DB와 Jira가 하나의 트랜잭션이라는 가정은 하지 않는다.</li>"
        },
        {
          "html": "<li>권한은 서버가 판단하고 검색 전에 적용한다. 타인의 건·제한 문서를 답변·티켓·알림에 노출하지 않는다.</li>"
        },
        {
          "html": "<li>외부 변경 전 처리 의도를 저장하고, 확인한 Jira ID를 즉시 보존한다. 저장 확인 없이 다음 외부 변경으로 진행하지 않는다.</li>"
        },
        {
          "html": "<li>비이관 Response.ticket은 null이다. 보완 연결은 case_ref를 사용한다. 내부에 티켓이 없다는 의미로 해석하지 않는다.</li>"
        },
        {
          "html": "<li>성공·실패·성공 여부 미확인을 구분한다. 접수 실패나 알림 수락을 실제 담당자 인수·문제 해결로 표현하지 않는다.</li>"
        },
        {
          "html": "<p>정확한 필드와 오류 코드는 <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md#6-%EB%85%B8%EB%93%9C-%EA%B0%84-%ED%8E%98%EC%9D%B4%EB%A1%9C%EB%93%9C-%EC%97%B0%EA%B2%B0%EC%84%A0%EB%A7%88%EB%8B%A4\">워크플로우 6절</a>, 저장 버전·복구 자료는 <a href=\"../../../../docs/project/STORAGE-DESIGN.md#storage-contract\">저장소 공개 계약</a>을 따른다.</p>"
        },
        {
          "html": "<h2>4 상태와 전이</h2>"
        },
        {
          "html": "<h3>4.1 상태의 세 가지 축</h3>"
        },
        {
          "html": "<p>요청 실행 상태, 티켓 업무 상태, DLQ 복구 상태는 독립적으로 관리한다. 아래 티켓 상태명은 업무 의미이며 실제 Jira 상태명·전환 ID는 D01에서 매핑한다. needs_review는 시스템의 확인 필요 판정으로, Jira에 같은 상태가 실제 존재한다는 뜻은 아니다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>축</th>\n<th>상태</th>\n<th>완료 의미</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>요청 처리</td>\n<td>processing / completed / failed / unknown</td>\n<td>completed는 이번 요청의 가린 결과 저장 완료</td>\n</tr>\n<tr>\n<td>문의·티켓</td>\n<td>received / waiting_info / closed_guidance / closed_rejected / handed_off, 확인 필요 needs_review</td>\n<td>closed_guidance는 안내 완료, handed_off는 담당 연결 효과 확인</td>\n</tr>\n<tr>\n<td>DLQ 복구</td>\n<td>pending / reprocessing / resolved</td>\n<td>resolved는 해당 실패 확인·복구 결과 기록 완료</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h3>4.2 요청 처리 전이</h3>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">stateDiagram-v2\n  [*] --&gt; processing: 유효 요청과 원자적 처리권 획득\n  processing --&gt; completed: 결과와 최종 응답 저장 성공\n  processing --&gt; failed: 명확한 실패 기록\n  processing --&gt; unknown: 외부 효과 미확인 기록\n  failed --&gt; processing: 운영 확인 후 조건부 재개\n  unknown --&gt; processing: 외부 효과 확인 후 조건부 재개\n  completed --&gt; [*]: 동일 요청은 저장 결과 재사용\n</code></pre>"
        },
        {
          "html": "<p>이 도표는 저장된 상태의 전이다. 저장소 자체 장애로 failed/unknown 기록조차 실패하면 마지막 저장값이 processing으로 남을 수 있다. 응답·실행 기록·DLQ 등 가능한 경로에 확인 필요를 남기고, 오래된 processing을 자동 재실행하지 않는다.</p>"
        },
        {
          "html": "<p>운영자 복구의 저장 전이는 migrations 010–016의 별도 operator-only 경계로 구현한다. 2026-11-08 VM service DB에 적용했고 runtime 역할에는 dispatcher 권한이 없다. 복원 DB 경합 및 live read-only inspect 증거는 <a href=\"../../../../runs/public/20261108-085318-vm-tc07-recovery-deploy/report.md\">TC-07 실행 보고서</a>를 참조한다. 별도 PR36 dual-storage DB에는 기존 <code>recovery_finish(jsonb)</code>가 있었으며, 2026-11-08 migration 017을 백업·복원 리허설 뒤 적용했다. 기존 비활성 운영자 워크플로우에서 bounded list/inspect와 링크 Jira 상태·담당자 GET을 확인했다. <a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">조회 전용 실행 증거</a>는 TC-07 조회 slice만 통과를 의미하며 전체 복구 계약은 포함하지 않는다. 조회는 Jira/Discord 상태를 변경하지 않는다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>전이·입력</th>\n<th>조건과 수행 작업</th>\n<th>금지 사항</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>최초 → processing</td>\n<td>입력·사용자 확인, 요청과 활성 case의 원자적 처리권 획득</td>\n<td>저장 실패 후 LLM·Jira 변경 진행</td>\n</tr>\n<tr>\n<td>processing → completed</td>\n<td>분기별 외부 효과 확인, 가린 최종 응답과 상태 함께 저장</td>\n<td>티켓 종료와 같은 뜻으로 사용</td>\n</tr>\n<tr>\n<td>processing → failed/unknown</td>\n<td>확실한 실패/효과 불명을 구분, 알려진 ID·중단 위치 보존</td>\n<td>이미 성공한 단계 전체 반복</td>\n</tr>\n<tr>\n<td>failed/unknown → processing</td>\n<td>원 실행 종료·Jira 효과·복구 자료 확인, 새 execution과 최신 StateRef 확보</td>\n<td>시민 재전송에 의한 자동 복구</td>\n</tr>\n<tr>\n<td>같은 ID 재전송</td>\n<td>completed는 replay, processing/failed/unknown은 pending, 소유자·입력 불일치는 conflict</td>\n<td>타인 결과 반환·새 티켓 생성</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h3>4.3 문의와 티켓의 업무 전이</h3>"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart TD\n  New[\"신규 정상 문의\"] --&gt; Decide{\"업무 분류\"}\n  Decide --&gt; Guide[\"안내 생성·검증\"]\n  Decide --&gt; Ask[\"보완 질문 준비\"]\n  Decide --&gt; Human[\"사람 판단 또는 긴급 이관 준비\"]\n  Guide --&gt; Received[\"received 생성 또는 기존 건 확인\"]\n  Ask --&gt; Received\n  Human --&gt; Received\n  Received --&gt; Wait[\"waiting_info\"]\n  Received --&gt; Closed[\"closed_guidance\"]\n  Received --&gt; Reject[\"closed_rejected\"]\n  Received --&gt; Hand[\"handed_off\"]\n  Wait --&gt; Resume[\"새 요청으로 같은 case 재분류\"]\n  Resume --&gt; Decide\n  Received -.-&gt; Review[\"needs_review 확인 필요\"]\n  Wait -.-&gt; Review\n  Hand -.-&gt; Staff[\"직원이 Jira에서 후속 처리\"]\n</code></pre>"
        },
        {
          "html": "<p>화살표는 가능한 업무 전이다. received에서 임의 상태를 고르는 것이 아니라 다음 조건을 적용한다. 이 도표는 Jira 전환 API 호출 수나 별도 case 테이블을 정의하지 않는다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>목적 상태</th>\n<th>전이 조건과 확인할 효과</th>\n<th>요청 결과와 관계</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>waiting_info</td>\n<td>비긴급·보완 한도 미만·필수 정보 부족. 티켓 생성/재사용, 맥락·횟수·질문 저장</td>\n<td>보완 응답 저장 후 요청 completed, 티켓은 열림</td>\n</tr>\n<tr>\n<td>closed_guidance</td>\n<td>허용 근거 안내·검증 통과 또는 허용된 본인 상태 안내. 생성·문맥·외부 종료 확인</td>\n<td>최종 저장 후 요청 completed</td>\n</tr>\n<tr>\n<td>closed_rejected</td>\n<td>정상 접수된 건의 조회 권한 거절 등 종료 정책에 해당. 제한 내용 없는 거절 맥락·종료 확인</td>\n<td>접수 전 입력 거절과 구별. 상세 분기는 워크플로우 적용</td>\n</tr>\n<tr>\n<td>handed_off</td>\n<td>사람 판단·보완 한도·근거 부족·검증 실패·긴급. 생성/재사용·맥락·담당 지정·알림 수락 확인</td>\n<td>요청 completed 가능, 실제 직원 업무는 계속됨</td>\n</tr>\n<tr>\n<td>needs_review</td>\n<td>생성·종료·배정·알림·저장 중 실패/미확인</td>\n<td>성공 상태를 추정하지 않고 요청 failed/unknown 및 복구 경로로 연결</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>보완 요청은 소유자와 현재 Jira 상태를 재확인한다. 종료된 case_ref는 자동 재개하지 않고409로 새 문의를 안내한다. 새 문의는 case_ref를 생략하고 이전 번호를 context에 참조할 수 있다. 직원이 Jira에서 완료한 건도 다음 조회 시 실제 상태를 읽는다.</p>"
        },
        {
          "html": "<h3>4.4 DLQ 전이</h3>"
        },
        {
          "html": "<p>pending → reprocessing은 운영자가 외부 효과·복구 자료와 처리권을 확인했을 때만 허용한다. 확인/재처리 성공 시 resolved로, 다시 실패하면 pending으로 돌아가 시도·사유를 갱신한다. manual_required는 복구 캡슐의 모드이며 별도 DLQ 상태가 아니다. 자료가 부족하면 같은 작업의 자동 재실행을 하지 않는다. 상세 조건은 <a href=\"../../../../docs/project/STORAGE-DESIGN.md#4-dlq-%EC%84%A4%EA%B3%84%EC%99%80-%EC%9E%AC%EC%B2%98%EB%A6%AC\">저장소 4절</a>을 따른다.</p>"
        },
        {
          "html": "<h2>5 대표 시나리오와 종료 조건</h2>"
        },
        {
          "html": "<p>분류 우선순위는 긴급 → 분류/정책 실패 → 보완 한도 → 필수 정보 부족 → 사람 판단 → 검색이다. 비긴급 사람 판단 건도 필수 정보가 없으면 먼저 보완하며 긴급 건은 보완을 기다리지 않는다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>시나리오</th>\n<th>시작과 처리 순서</th>\n<th>티켓·저장·이용자 결과</th>\n<th>근거와 시험</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>S1 근거 안내</td>\n<td>QR 대여 방법 문의 → 입력/분류 → RAG → 답변 → 검증 → 티켓 생성·종료 → 최종 저장</td>\n<td>closed_guidance, 요청 completed, 자동 답변·sources</td>\n<td>U17~U20, WF-01</td>\n</tr>\n<tr>\n<td>S2 보완</td>\n<td>반납 미확인인데 장소/시각 부족 → 질문 준비 → 티켓 생성·보완 대기 → 응답. 다음 요청은 새 request_id+같은 case_ref로 재분류</td>\n<td>waiting_info, 각 응답 요청 completed. 충분해지면 S1/S3, 한도면 이관</td>\n<td>U27/U28/U30, WF-02/02b</td>\n</tr>\n<tr>\n<td>S3 사람 판단</td>\n<td>개별 환불·현장 조치 요청 → 필요 사실 확보 → 이관 준비 → 생성/재사용·맥락·배정·알림 → 저장</td>\n<td>handed_off, 요청 completed. 실제 환불·출동 완료라고 답하지 않음</td>\n<td>U22/U31, 팀 사례</td>\n</tr>\n<tr>\n<td>S4 본인 상태</td>\n<td>기존 문의 상태 요청 → 소유권 있는 대상 조회 → 고정 안내 → 이번 조회 문의 티켓 생성·종료 → 저장</td>\n<td>이번 건 closed_guidance, 대상 건 변경0. 타인 건은 제한 내용 없이 거절</td>\n<td>U37/U38, WF-06/07</td>\n</tr>\n<tr>\n<td>S5 긴급 복합</td>\n<td>사칭 링크 입력+본인 반납 문의 → 긴급 티켓·배정·알림 우선 → 초동 근거 검색·본인 조회 → 고정 안내·후속 맥락 저장</td>\n<td>handed_off 유지, 재생성·재알림0. 후속 조회 실패가 최초 이관 성공을 취소하지 않음</td>\n<td>U40+U37, WF-12</td>\n</tr>\n<tr>\n<td>S6 근거/검증 불충분</td>\n<td>정상 검색 empty 또는 답변 검증 실패 → 추측 안내 중단 → S3 이관</td>\n<td>담당자 이관, 빈 근거면 sources=[], 실제 연결 효과 확인</td>\n<td>WF-03, 팀 검증 실패</td>\n</tr>\n<tr>\n<td>S7 거절·재전송</td>\n<td>입력 오류·주입은 접수 전 거절. 같은 요청은 소유자/입력/상태 대조 후 replay/pending/conflict</td>\n<td>거절 건 신규 업무 티켓0, 재전송 중복 효과0</td>\n<td>WF-08/09/13, 팀 충돌</td>\n</tr>\n<tr>\n<td>S8 부분실패와 복구</td>\n<td>Jira 생성 응답 유실 또는 생성 뒤 저장 실패 → known ID/효과 보존 → 실패·미확인/DLQ → 운영 확인·조건부 재개</td>\n<td>미확인을 성공으로 응답하지 않음. 이미 생성한 건 확인 후 남은 단계만</td>\n<td>WF-04/10/11, 팀 저장 장애</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>S1<del>S5는 <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md#22-%EB%B6%84%EB%A5%98%EC%97%90%EC%84%9C-%EA%B0%88%EB%9D%BC%EC%A7%80%EB%8A%94-%EC%A0%95%EC%83%81-%EC%97%85%EB%AC%B4\">워크플로우 정상 시나리오</a>와 같은 ID다. S6</del>S8은 이 문서의 보조 시나리오이며 n8n 노드 ID가 아니다. 위 표는 시험 파일의 질문·기대값을 대체하지 않는다.</p>"
        },
        {
          "html": "<h2>6 기능과 구현 추적</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>기능 ID</th>\n<th>제공 기능과 입출력</th>\n<th>담당·상세 구현 위치</th>\n<th>시나리오·시험 연결</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>F01</td>\n<td>Request 검사·서버 사용자/권한 확인 → 허용 Ctx 또는 거절</td>\n<td>R02/R04, 본체 입력·권한 노드와 워크플로우 5~6절</td>\n<td>전체, WF-05/08/13</td>\n</tr>\n<tr>\n<td>F02</td>\n<td>요청/입력·case_ref → 처리권·replay/pending/conflict</td>\n<td>R04, state 및 저장소 3/6절, 본체 B07~B09</td>\n<td>S2/S7/S8, WF-09</td>\n</tr>\n<tr>\n<td>F03</td>\n<td>질문·서버 맥락 → 유형·긴급·부족 정보·사람 판단</td>\n<td>R02, B10/B11 이후 분기·워크플로우 4절</td>\n<td>S1~S6, WF-02/02b/12</td>\n</tr>\n<tr>\n<td>F04</td>\n<td>문서 → 권한별 색인, SearchRequest → SearchResult</td>\n<td>R03, index/search 및 RAG 설계</td>\n<td>S1/S5/S6, WF-01/03/05/12</td>\n</tr>\n<tr>\n<td>F05</td>\n<td>허용 근거 → 답변·검증 결과 → 안내 또는 이관</td>\n<td>R02, B19~B21 및 분기</td>\n<td>S1/S6, WF-01/10, 팀 검증 실패</td>\n</tr>\n<tr>\n<td>F06</td>\n<td>조회 대상·서버 owner → 허용 record/denied/error</td>\n<td>R04 어댑터/R02 안내, LookupResult·B24</td>\n<td>S4/S5, WF-06/07/11/12</td>\n</tr>\n<tr>\n<td>F07</td>\n<td>TicketRequest → 생성/보완/종료/배정/알림의 확인 효과</td>\n<td>R04, handoff H 노드·워크플로우 4/6절</td>\n<td>S1~S6/S8, WF-02b/04/09/12</td>\n</tr>\n<tr>\n<td>F08</td>\n<td>최신 StateRef·의도/ID/결과 → 저장 확인·최종 Response</td>\n<td>R04 저장/R02 연결, state·B32·H14~H20·저장소 6절</td>\n<td>전체, 팀 bind/finish 실패</td>\n</tr>\n<tr>\n<td>F09</td>\n<td>실패/미확인 효과 → DLQ·운영 확인·조건부 복구</td>\n<td>R04/R05, X/E 노드·dlq/errors·저장소 4절</td>\n<td>S8, WF-04/10/11, 팀 재처리</td>\n</tr>\n<tr>\n<td>F10</td>\n<td>실행·메타 정보 → 가린 기록·측정·시험 증거</td>\n<td>전원/R05 취합, 워크플로우 7절·저장소 5절</td>\n<td>공통14유형·팀5개 이상</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>생산자·소비자는 단일 원본의 계약을 따른다. 내부 청킹·프롬프트·SQL 선택은 담당자가 상세화하며, 공개 필드·성공 의미·권한·전이 조건을 바꾸면 R01과 영향받는 역할·R05가 함께 검토한다. 기능 ID는 이 문서의 추적용이며 이전 검증 보고서의 F01~F07 지적 번호와 별개다.</p>"
        },
        {
          "html": "<h2>7 가이드와 조사 적용</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>기준</th>\n<th>적용 위치와 의미</th>\n</tr>\n</thead>\n<tbody><tr>\n<td><a href=\"../../../../docs/PUBLIC-SOURCES.md\">참조 구조 — 공개본 제외 자료</a></td>\n<td>입력·분류·RAG·답변·검증·티켓·기록의 기본 순서와 3개 AI 역할. 모든 정상 신규 문의 티켓화는 팀의 추가 정책</td>\n</tr>\n<tr>\n<td><a href=\"../../../../docs/PUBLIC-SOURCES.md\">시나리오·공통 판정 — 공개본 제외 자료</a></td>\n<td>공통14유형의 조건·판정 유지. 시민 주제의 질문·모의 기록으로 변환</td>\n</tr>\n<tr>\n<td><a href=\"../../../../docs/PUBLIC-SOURCES.md\">RAG 가이드 — 공개본 제외 자료</a></td>\n<td>같은 질문으로 청킹 비교·모델/차원/점수·복구 시간/비용 측정. 결과는 RAG 설계에 반영</td>\n</tr>\n<tr>\n<td><a href=\"../../../../docs/PUBLIC-SOURCES.md\">안정성·보안 — 공개본 제외 자료</a></td>\n<td>예상 오류와 Error Workflow 분리, 멱등 재시도·권한·가림·DLQ</td>\n</tr>\n<tr>\n<td><a href=\"../../../../docs/PUBLIC-SOURCES.md\">시험 가이드 — 공개본 제외 자료</a></td>\n<td>공통14+팀5 이상, LLM3회 반복, 정상/예외/이관 로그와 실패2건 이상 재시험</td>\n</tr>\n<tr>\n<td><a href=\"../../../../docs/PUBLIC-SOURCES.md\">조사 시나리오 — 공개본 제외 자료</a>·<a href=\"../../../../docs/PUBLIC-SOURCES.md\">출처 원장 — 공개본 제외 자료</a></td>\n<td>U17~U40 중 선택 범위를 TOPIC·워크플로우 1절로 연결. 후보100개 전체 구현을 요구하지 않음</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>공개 조사로 기관 내부 담당 배정·환불 승인·보안 SOP를 확정하지 않는다. 서비스 지식에는 출처·확인일·적용 범위와 가상 정책을 표시한다. 자료 목록 확인(P01)은 필요한 기능을 찾는 출발점이며 전체 재사용·선행 실행 확정이 아니다.</p>"
        },
        {
          "html": "<h2>8 역할별 착수와 남은 공통 결정</h2>"
        },
        {
          "html": "<p>R02는 합의한 계약의 모의 하위 응답으로 정상 흐름을 구현하고, R03은 지식·검색 비교를, R04는 실제 Jira·물리 저장의 작은 연결 검증을, R05는 구현 전 기대 결과를 준비할 수 있다. R01은 환경·공통 결정과 통합 순서를 관리한다. R04의 Jira·상태·DLQ 작업은 범위가 넓으므로 일정과 지원은 개발 계획에서 조정한다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>실제 연결 전 결정</th>\n<th>연결 작업</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Jira 프로젝트·소유권/문의 필드·상태 전환·역할, 물리 저장·원자성·보존</td>\n<td>D01/D06, R04·R01 및 소비 역할</td>\n</tr>\n<tr>\n<td>case_ref·추가 응답 필드와 공통 시험 도구 호환</td>\n<td>D02, R02·R05</td>\n</tr>\n<tr>\n<td>n8n 실제 버전·원시 출력·AI 연결·실행 저장/가림</td>\n<td>D03, R02~R05</td>\n</tr>\n<tr>\n<td>지식·권한 매핑·검색 설정·버전 전환과 측정</td>\n<td>D04, R03·R04·R05</td>\n</tr>\n<tr>\n<td>단계별 timeout·전체 한도·재시도·복구 효과</td>\n<td>D05, R02·R04·R05</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>먼저 S1 한 건을 검색→검증→Jira 생성/종료→최종 저장→응답까지 연결한다. 이후 S2~S5와 오류·복구를 확장하며, 공통 시험 판정은 유지한다. 설계 기준은 모의 연결·작업 계획에 사용하고 실제 외부 효과·성능·검색 품질은 실행 증거로 확정한다.</p>"
        },
        {
          "html": "<h2>9 프로젝트 경로와 배포 구조</h2>"
        },
        {
          "html": "<p>Docker Compose를 채택한다. 디렉터리와 파일 용도의 원본은 이 절, 정확한 편집 소유자·검토자는 <a href=\"../../../../docs/project/TEAM-CHARTER.md#1-%ED%8C%80\">헌장 1절</a>, 작업 절차는 <a href=\"../../../../AGENTS.md\">루트 AGENTS</a>, 실행·복구는 <a href=\"../../../../infra/README.md\">infra 안내</a>가 관리한다. 생성 예정 파일은 코드 경로로 표시하며, 존재하지 않는 파일을 완료 산출물로 표시하지 않는다.</p>"
        },
        {
          "html": "<pre><code class=\"language-text\">proj_team2/\n├─ README.md / AGENTS.md / .gitignore\n├─ pyproject.toml / uv.lock / .python-version # Python3.12·uv·Ruff 공통 설정\n├─ .github/workflows/quality.yml    # 린트·포맷·문서·공개 도구 CI\n├─ src/ttareungi_support/           # 업무 Python 로직 작성 시 생성\n├─ tests/                          # 업무 로직 시험 작성 시 생성\n├─ dist/public/                    # 검토용 공개본 생성 결과, Git 제외\n├─ .env.example                    # Webhook·PostgreSQL 준비 설정 이름, 실제 비밀은 제외\n├─ workflows/                      # 7개 n8n JSON, 구현 시 생성\n│  └─ dubakwi-{support,index,search,handoff,state,dlq,errors}.json\n├─ knowledge/                      # 지식 작성 시 생성\n│  ├─ manifest.json\n│  ├─ public/\n│  └─ restricted/\n├─ data/\n│  ├─ users.json / records.json     # 모의 입력 작성 시 생성\n│  └─ research/                     # 기존 수집·분석 원본 유지\n├─ cases/common.json / team.json    # 검토 전 시험 명세\n│  └─ team-extended.json            # R05 새 형식 후보, 다단계/운영자 시험\n├─ requests/                        # 개별/시연 입력 작성 시 생성\n├─ runs/public/&lt;실행묶음ID&gt;/summary.json   # 실제 시험 시 생성\n├─ scripts/\n│  ├─ research/                     # 기존 도구 유지\n│  ├─ dev/                          # 개발·배포 도구 추가 시 생성\n│  └─ test/                         # 시험·측정 도구 추가 시 생성\n├─ infra/\n│  ├─ README.md / vm-preflight.md  # 운영 기준·기존 VM 점검/인계\n│  ├─ compose.yaml                  # VM 설정 확인 후 작성\n│  ├─ postgres-compose.yaml         # PostgreSQL만 추가하는 검토용 준비본, VM 미적용\n│  ├─ postgres-deployment.md        # DB/권한/백업·복원/Credential 조건·R04 검토\n│  └─ db/migrations/                # 물리 DB 채택 후 생성\n├─ docs/\n│  ├─ guideline/ / research/        # 기존 원문·조사 유지\n│  ├─ DEVELOPMENT-PLAN.md / PRESENTATION-PLAN.md\n│  └─ project/                      # 팀 산출물·검토·데일리·발표\n└─ tmp/                             # 임시 작업, 필수 실행 의존성 제외\n</code></pre>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>경로</th>\n<th>용도와 원본 경계</th>\n<th>책임 참조</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>루트 README·AGENTS·.gitignore·.env.example</td>\n<td>진입 안내·공동 규칙·비밀/생성물 제외·확인한 환경 설정 예시</td>\n<td>R01, 헌장 경로표</td>\n</tr>\n<tr>\n<td>pyproject.toml·uv.lock·.python-version·.github/workflows/quality.yml</td>\n<td>Python3.12·uv 잠금·Ruff 린트/포맷·CI. 로컬/CI 공통 명령</td>\n<td>R01, R05 품질 검토</td>\n</tr>\n<tr>\n<td>src/ttareungi_support/channels/discord_bot.py·tests/channels/test_discord_bot.py</td>\n<td>Discord Gateway 입출구·defer·사용자/계약 변환·전송과 경계 시험. 구현 시 생성</td>\n<td>R04 구현·R02 계약/R01 배포·R05 시험</td>\n</tr>\n<tr>\n<td>src/ttareungi_support/·tests/</td>\n<td>향후 Python 업무 코드와 시험. n8n 호출/배포 경계는 구현 전 계약화</td>\n<td>기능별 R02/R03/R04, 시험 R05</td>\n</tr>\n<tr>\n<td>scripts/dev/public-files.json·export_public.py·dist/</td>\n<td>선택적 ZIP 도구 목록·내보내기·생성 결과. 일상 Git 공개 범위는 .gitignore 기준</td>\n<td>R01, R04 비밀·R05 재현</td>\n</tr>\n<tr>\n<td>workflows/</td>\n<td>n8n 실행 JSON. 내보낸 버전과 VM 연결을 함께 관리</td>\n<td>본체 R02, 검색/색인 R03, 연동/상태/DLQ/오류 R04</td>\n</tr>\n<tr>\n<td>knowledge/manifest.json·public/·restricted/</td>\n<td>문서/출처/권한/버전 목록과 서비스 지식. 폴더 분리와 검색 전 권한 판정 병행</td>\n<td>R03, 권한 검토 R04</td>\n</tr>\n<tr>\n<td>data/users.json·records.json</td>\n<td>시민·소유권·업무 기록 모의 입력. 실제 상태 DB·Jira 사본 아님</td>\n<td>R04</td>\n</tr>\n<tr>\n<td>cases/·requests/</td>\n<td>기대 결과를 가진 반복 시험 / 개별 실행·시연 요청</td>\n<td>R05</td>\n</tr>\n<tr>\n<td>runs/public/·runs/&lt;실행묶음ID&gt;/</td>\n<td>검토한 가린 JSON/Markdown 공유 / 원시·비공개 결과 로컬 보존. summary와 상세 결과 구분</td>\n<td>R05, 구현 역할 증거 제공</td>\n</tr>\n<tr>\n<td>scripts/dev/·scripts/test/</td>\n<td>실행/배포 보조 / 시험·측정 재현 도구. 사용법은 scripts README에 연결</td>\n<td>R01 / R05, 도메인 검토 역할 지정</td>\n</tr>\n<tr>\n<td>infra/compose.yaml·README·vm-preflight.md</td>\n<td>n8n 단일 인스턴스·볼륨·네트워크·선택 DB의 배포/복구</td>\n<td>R01, 저장 검토 R04</td>\n</tr>\n<tr>\n<td>infra/postgres-compose.yaml·postgres-deployment.md</td>\n<td>기존 n8n 유지·별도 PostgreSQL project·파일 비밀·external 볼륨·준비/적용 조건 구분</td>\n<td>R01, 저장/권한 검토 R04·복원 검증 R05</td>\n</tr>\n<tr>\n<td>infra/db/migrations/</td>\n<td>채택한 물리 저장의 버전별 스키마 변경</td>\n<td>R04, 배포/복구 검토 R01</td>\n</tr>\n<tr>\n<td>docs/project/</td>\n<td>시스템·상세 설계·결과·증거 화면·이력. 문서별 원본 관계 유지</td>\n<td>헌장 문서 소유권</td>\n</tr>\n<tr>\n<td>docs/guideline·docs/research·data/research</td>\n<td>기존 요구·조사 원본. 서비스 입력으로 필요한 부분만 선별</td>\n<td>기존 영역 규칙과 헌장 경로표</td>\n</tr>\n<tr>\n<td>tmp/</td>\n<td>일회성 조사·검사·작업 파일. 검토 후 필요한 도구/증거만 정식 위치로 이동</td>\n<td>생성 역할, 공통 정리 R01</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>운영 데이터·Docker 볼륨·DB 백업·환경 비밀은 Git 밖에서 관리한다. <code>runs/</code>는 가린 시험 증거만 보관한다. 전체 서비스 DB나 원시 실행 데이터를 저장소에 복제하지 않는다. 물리 DB는 미채택이며 compose·이미지/환경 설정 확정은 개발 계획 D01/D03과 P04/P12의 선행 조건이다.</p>"
        },
        {
          "html": "<p>Python 실행/의존성·린트·포맷은 <a href=\"../../../../docs/PYTHON-DEVELOPMENT.md\">Python 개발 기준</a>, 공개 대상/제외·원문 링크 전환은 <a href=\"../../../../docs/PUBLICATION.md\">공개 정책</a>이 원본이다. Python을 사용해도 n8n 중심 흐름은 유지한다. Discord Gateway 봇 서비스는2.1의 기본안이며 그 밖의 독립 API 서버/컨테이너는 별도 설계한다. 기존 조사·원문은 로컬에 보존하고, 현재 폴더의 .gitignore로 선별한 팀 문서·도구만 Git 추적한다. 로컬 원문·비밀은 제외하며 ZIP은 선택 사항이다.</p>"
        },
        {
          "html": "<p>기존 VM n8n의 Compose와 데이터 볼륨을 유지한다. 로그인 사용자 홈의 dubakwi/deploy·backups·evidence는 Git 밖 운영 자료 경로이며 권한700으로 준비했다. 기존 설치·볼륨을 이곳으로 옮긴 것은 아니다. 새 infra/compose.yaml은 검토된 배포 구성 확정 후 작성하며 현재 실행 원본으로 사용하지 않는다. 확인 범위와 인계 조건은 <a href=\"../../../../infra/vm-preflight.md\">배포 전 점검</a>, 작업 상태는 개발 원장이 관리한다.</p>"
        },
        {
          "html": "<p>후속 <a href=\"../../../../infra/postgres-deployment.md\">PostgreSQL 독립 배포 준비</a>는 구체적인 검토 자료다. D01 물리 DB 채택·PR #23 수정 통과·R04 저장/권한 검토와 실제 VM 자원/아키텍처 확인 전에는 DB 기동·Credential 등록·P19 전환을 하지 않는다. 검토용 Compose 문법 통과를 VM 실행 증거로 쓰지 않는다.</p>"
        },
        {
          "html": "<h2>10 변경 기록</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>날짜</th>\n<th>버전</th>\n<th>내용</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>2026-11-05</td>\n<td>v0.12</td>\n<td>PostgreSQL 독립 Compose·배포 준비/검토 경로 추가. n8n 유지·미적용/DB 채택 조건·R04/R05 검토 경계 유지</td>\n</tr>\n<tr>\n<td>2026-11-05</td>\n<td>v0.11</td>\n<td>GitLab79 과정 모의 API 연결·사용자 조회/로그 저장 증거 연결. 실제 Jira·영속 저장·팀 권한은 후속</td>\n</tr>\n<tr>\n<td>2026-11-05</td>\n<td>v0.10</td>\n<td>R01 VM 수동 색인/실제 검색 부분 증거 연결. data-api 부재·인가/공식 판정/전체 종단 미완료 유지</td>\n</tr>\n<tr>\n<td>2026-11-04</td>\n<td>v0.9</td>\n<td>기존 VM 유지·운영 자료 경로·P04 점검/인계와 환경 예시 구분 반영</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.8</td>\n<td>P08 검토용 초안과 서비스 색인 원본의 경계를 RAG v0.8에 연결. 구성·계약 변경 없음</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.7</td>\n<td>두바퀴/dubakwi 확정·워크플로우/웹훅/색인 명명·현재 문서 참조 동기화</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.6</td>\n<td>팀 첫 실행/PR·가린 텍스트 공유 경로, 보완 횟수 전달·replay 표시·공통14 판정 인계 보완</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.5</td>\n<td>Discord 채택·Python Gateway 봇 기본안·비공개 응답/사용자 매핑·담당/시험/배포 경계 연결</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.4</td>\n<td>로컬 원문은 유지하고 .gitignore와 실제 Git 후보·공개 참조 완결성 검사로 전환. ZIP은 선택적 이력</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.3</td>\n<td>Python3.12·uv·Ruff·CI·업무 코드 예정 경로·공개 허용 목록/패키지 분리 기준 추가</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.2</td>\n<td>Docker Compose 채택·경로별 용도·책임 원본·운영 규칙/개발 의존성 연결</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>v0.1</td>\n<td>기존 상세 설계를 연결하는 최상위 구성·상태·시나리오·기능 추적 문서 작성</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p><a href=\"../../../../docs/project/README.md\">산출물 목록과 원본 관계</a> · <a href=\"../../../../docs/project/TOPIC.md\">주제</a> · <a href=\"../../../../docs/project/TEAM-CHARTER.md\">팀 헌장</a></p>"
        },
        {
          "html": "<li>2026-11-05 기준 참조 갱신: PR #10의 RAG v0.9 교육용 로컬 구현을 연결한다. 시스템 구성·공개 계약 변경과 서비스 검증 완료를 뜻하지 않는다.</li>"
        },
        {
          "html": "<h2>11 PR36 로컬 통합 후보의 현재 경계</h2>"
        },
        {
          "html": "<p>2026-11-07 / v0.13 로컬 통합 대조. 이전 날짜의 실행 이력은 보존한다. 상세 계약의 현재 로컬 추가분은 WORKFLOW-DESIGN의 통합 후보 절, STORAGE-DESIGN의 통합 후보 정정, RAG-ARCHITECTURE의 시점별 인계를 함께 따른다.</p>"
        },
        {
          "html": "<li>기존 user-api 서비스에 실제 DB 소유권과 Jira GET을 사용하는 records provider를 넣었다. 새로운 서버나 상담 이력 DB를 추가하지 않았다. 모의 data/records.json은 실환경 대체 원본이 아니다.</li>"
        },
        {
          "html": "<li>Jira 문맥 파서는 services/user_api/case_context.py와 case_context.js가 원본이다. n8n Code 내 사본은 scripts/dev/build_case_context_nodes.py로 생성·동일성 검사한다. 서버/워크플로우가 같은 문의 바인딩·작성자·완료 요청 문맥을 검증한다.</li>"
        },
        {
          "html": "<li>DB001~007을 보존한008/009 후보는 latest_completed 선택·검증된 문맥 복원·읽기 권한을 제공한다. 공개 version은 null, DB revision은 내부 조건부 갱신 값이다.</li>"
        },
        {
          "html": "<li>handoff의 문맥 저장·재조회와 state의 최종 save→finish가 성공해야 해당 처리를 완료로 답한다. 보완 대기도 문맥 저장 확인이 필요하다. 실패/미확인은 known ID와 수동 확인을 보존한다.</li>"
        },
        {
          "html": "<li>인증 후 실행 데이터 생성 전 헤더 제거를 위한 고정 n8n 이미지 후보가 있다. 격리 로컬 검증이며 VM에 배포하거나 현재 팀/내부 키를 교체한 상태가 아니다.</li>"
        },
        {
          "html": "<li><a href=\"../../../../infra/pr36-local-candidate.md\">로컬 검증 후보</a>와 <a href=\"../../../../infra/pr36-local-acceptance.md\">파일·설계 수용 대조</a>를 함께 본다. 실제 서비스 전체 PASS, 자동 재개, 직원 UI, 실제 환불/현장 집행은 추가로 선언하지 않는다.</li>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "charter",
      "role": "R01",
      "title": "팀 헌장 · 역할",
      "slides": [
        3
      ],
      "source": "sources/charter.html",
      "blocks": [
        {
          "html": "<h1>팀 헌장 · 두바퀴</h1>"
        },
        {
          "html": "<p>2026-11-07 사용자 지시: R01이 PR36처럼 기존 문의 처리 로직·연동·핵심 마감을 통합 진행하며 타 역할의 검증 회신을 선행 조건으로 기다리지 않는다. R02는 새 UX의 사용성 개선만 담당한다. 기존 소유권·동시 편집 제한은 유지하고 각 실행·판정의 출처를 구분한다. 현재 상태와 실행 순서는 <a href=\"../../../../docs/project/implementation-status-and-closeout-plan.md\">구현 현황·마감 계획</a>, 기준선은 <a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">실제 실행 결과</a>를 따른다.</p>"
        },
        {
          "html": "<li>작성일: 2026-11-02 KST</li>"
        },
        {
          "html": "<li>버전·상태: v0.17 / R01 기존 핵심 로직 통합, R02 새 UX 개선 담당을 기록. 기존 소유권·동시 편집 제한 유지</li>"
        },
        {
          "html": "<li>작성 형식: <a href=\"../../../../docs/PUBLIC-SOURCES.md\">공식 팀 헌장 템플릿 — 공개본 제외 자료</a></li>"
        },
        {
          "html": "<li>주제 기준: <a href=\"../../../../docs/project/TOPIC.md\">주제 제안서 v0.7</a></li>"
        },
        {
          "html": "<h2>1. 팀</h2>"
        },
        {
          "html": "<p>실명 대신 역할 ID를 사용한다. 공식 표의 <code>이름</code> 칸에 ID를 기입하며, 개발 계획의 ①<del>⑤는 각각 R01</del>R05에 대응한다. ID는 개발팀의 작업 책임을 뜻하며 서비스 이용자·티켓 담당자 계정과는 별개다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>이름</th>\n<th>역할 (주 담당)</th>\n<th>함께 보는 역할</th>\n<th>맡는 워크플로우 파일</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>R01</td>\n<td>팀장 (리드 · 통합)</td>\n<td>R02 계약·통합 검토, R05 배포·제출 확인</td>\n<td><code>dubakwi-support.json</code> 등 전체 변경의 병합·VM 배포. 직접 편집 소유자는 아래 역할을 따름</td>\n</tr>\n<tr>\n<td>R02</td>\n<td>오케스트레이션</td>\n<td>R03 검색 연결, R04 도구·보안 연결, R05 흐름 시험</td>\n<td><code>workflows/dubakwi-support.json</code></td>\n</tr>\n<tr>\n<td>R03</td>\n<td>RAG</td>\n<td>R04 문서 권한, R05 검색 평가</td>\n<td><code>workflows/dubakwi-index.json</code>, <code>workflows/dubakwi-search.json</code></td>\n</tr>\n<tr>\n<td>R04</td>\n<td>연동 · 안정성</td>\n<td>R02 호출 계약, R03 권한 모델, R05 장애·중복 시험</td>\n<td><code>workflows/dubakwi-handoff.json</code>, <code>workflows/dubakwi-state.json</code>, <code>workflows/dubakwi-dlq.json</code>, <code>workflows/dubakwi-errors.json</code></td>\n</tr>\n<tr>\n<td>R05</td>\n<td>시험 · 품질</td>\n<td>R02·R03·R04 기대 결과·결함 검토, R01 VM·제출 확인</td>\n<td><code>cases/common.json</code>, <code>cases/team.json</code>, <code>requests/*.json</code>, <code>runs/*.json</code></td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>팀 이름은 <strong>두바퀴</strong>, 파일/웹훅/색인용 영문 접두사는 <strong>dubakwi</strong>다(2026-11-03 사용자 팀명 결정 반영). 같은 워크플로우의 편집 소유자는 1개 역할로 정한다. R01의 병합 권한은 R02의 메인 워크플로우 편집 책임을 대신하지 않는다.</p>"
        },
        {
          "html": "<p>문서·데이터 소유권은 다음과 같다.</p>"
        },
        {
          "html": "<li>R01: <code>TOPIC.md</code>, 이 헌장, <code>SYSTEM-DESIGN.md</code> 취합, 루트 <code>README.md</code>·<code>AGENTS.md</code>, 개발·발표 관리 계획, <code>daily/</code>, <code>presentation/</code> 최종 편집. 최상위 설계의 담당 상세 내용은 R02~R05가 공동 검토한다.</li>"
        },
        {
          "html": "<li>R02: <code>WORKFLOW-DESIGN.md</code> 편집 취합. R03·R04가 담당 내용과 실행 근거를 제공한다.</li>"
        },
        {
          "html": "<li>R03: <code>RAG-ARCHITECTURE.md</code>, 루트 <code>knowledge/</code>의 서비스 지식 문서.</li>"
        },
        {
          "html": "<li>R04: <code>STORAGE-DESIGN.md</code>, 루트 <code>data/users.json</code>·<code>data/records.json</code>, 티켓 생성·조회·상태 갱신/종료 및 담당 알림의 연동 계약 확인.</li>"
        },
        {
          "html": "<li>R05: <code>EXECUTION-RESULT.md</code>, <code>images/</code>, 시험·시연 입력·실행 보고서. 실제 결함 수정은 해당 파일 소유자가 수행한다.</li>"
        },
        {
          "html": "<p>위 문서 경로는 별도 표시가 없으면 <code>docs/project/</code> 기준이다. 작업 상태와 증거는 <a href=\"../../../../docs/DEVELOPMENT-PLAN.md#5-%EC%9E%91%EC%97%85-%EC%9B%90%EC%9E%A5\">개발 계획의 작업 원장</a>에 기록한다.</p>"
        },
        {
          "html": "<p>경로별 편집 책임의 원본은 아래 표다. 경로 용도는 <a href=\"../../../../docs/project/SYSTEM-DESIGN.md#9-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B2%BD%EB%A1%9C%EC%99%80-%EB%B0%B0%ED%8F%AC-%EA%B5%AC%EC%A1%B0\">시스템 설계 9절</a>, 작업 방식은 <a href=\"../../../../AGENTS.md\">AGENTS</a>를 참조한다. 경로는 저장소 루트 기준이며 생성 예정 파일도 포함한다. 담당 변경 시 이 표와 개발 계획을 함께 갱신한다.</p>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>경로·파일</th>\n<th>주 담당</th>\n<th>검토자·지원</th>\n<th>책임 범위</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>README.md·AGENTS.md·.gitignore·.gitattributes·.env.example</td>\n<td>R01</td>\n<td>R04 비밀/환경·R05 재현</td>\n<td>공통 규칙·설정 항목 취합·진입 링크</td>\n</tr>\n<tr>\n<td>infra/README.md·vm-preflight.md·compose.yaml</td>\n<td>R01</td>\n<td>R04 영속성·R02/R03 연결·R05 VM</td>\n<td>이미지/볼륨/네트워크·배포·업데이트·복구</td>\n</tr>\n<tr>\n<td>infra/postgres-compose.yaml·postgres-deployment.md</td>\n<td>R01</td>\n<td>R04 저장/권한/마이그레이션·R05 재시작/복원</td>\n<td>독립 DB 배포 준비·owner/runtime·비밀 주입·Credential 연결 조건. SQL 구현 소유권은 R04 유지</td>\n</tr>\n<tr>\n<td>pyproject.toml·uv.lock·.python-version·.github/workflows/quality.yml</td>\n<td>R01</td>\n<td>R02/R03/R04 의존성·R05 품질</td>\n<td>Python3.12·uv·Ruff·CI 공통 환경</td>\n</tr>\n<tr>\n<td>docs/PUBLICATION.md·docs/PYTHON-DEVELOPMENT.md·scripts/dev/public-files.json·export_public.py</td>\n<td>R01</td>\n<td>R04 비밀/제외 기준·R05 재현</td>\n<td>로컬 보존·Git 공개 범위·선택적 내보내기·Python 기준·업로드 전 검토</td>\n</tr>\n<tr>\n<td>src/ttareungi_support/channels/discord_bot.py</td>\n<td>R04</td>\n<td>R02 본체 계약·R01 Compose/비밀·R05 비공개/오류</td>\n<td>Discord Gateway·초기 응답·모의 사용자 매핑·최종 전송. 구현 전</td>\n</tr>\n<tr>\n<td>tests/channels/test_discord_bot.py</td>\n<td>R05</td>\n<td>R04 구현·R02 판정</td>\n<td>중복/보완·defer·토큰/전송 실패·소유권/비공개. 구현 전</td>\n</tr>\n<tr>\n<td>src/ttareungi_support/</td>\n<td>기능별 R02/R03/R04</td>\n<td>소비 기능 역할·R05</td>\n<td>생성 시 파일별 소유자1개 지정·n8n 호출 계약/배포 명시</td>\n</tr>\n<tr>\n<td>tests/·scripts/test/check_public_files.py·test_git_public_files.py·test_public_export.py</td>\n<td>R05</td>\n<td>관련 구현 역할·R01 공개 도구</td>\n<td>업무 시험·공개 제외/덮어쓰기/비밀 패턴 경계 시험</td>\n</tr>\n<tr>\n<td>infra/db/migrations/</td>\n<td>R04</td>\n<td>R01 배포/복구·R05 장애</td>\n<td>DB 채택 후 스키마·원자성·변경/복원 절차</td>\n</tr>\n<tr>\n<td>workflows/*-support.json</td>\n<td>R02</td>\n<td>R03 검색·R04 연동·R05 판정</td>\n<td>본체·업무 분기·최종 응답</td>\n</tr>\n<tr>\n<td>workflows/<em>-index.json·</em>-search.json</td>\n<td>R03</td>\n<td>R04 권한·R05 검색 평가</td>\n<td>색인·검색·활성 버전·복구</td>\n</tr>\n<tr>\n<td>workflows/<em>-handoff.json·</em>-state.json·<em>-dlq.json·</em>-errors.json</td>\n<td>R04</td>\n<td>R02 공개 계약·R05 오류/복구</td>\n<td>Jira·조회·알림·저장·처리권·DLQ</td>\n</tr>\n<tr>\n<td>knowledge/manifest.json·public/·restricted/</td>\n<td>R03</td>\n<td>R04 권한/모의 정책·R05 근거</td>\n<td>지식·출처·적용 범위·버전/권한</td>\n</tr>\n<tr>\n<td>data/users.json·records.json</td>\n<td>R04</td>\n<td>R03 권한 입력·R05 정답 연결</td>\n<td>모의 사용자/소유권·API공급 방법</td>\n</tr>\n<tr>\n<td>cases/common.json·team.json·team-extended.json·p11-entry.json·requests/</td>\n<td>R05</td>\n<td>R02/R03/R04 관련 기대값</td>\n<td>공통 판정 유지·시나리오/기능/데이터 연결</td>\n</tr>\n<tr>\n<td>runs/public/·docs/project/images/·docs/project/EXECUTION-RESULT.md</td>\n<td>R05</td>\n<td>전원 담당 증거·R01 제출</td>\n<td>공개 JSON/Markdown 요약·실패/재시험·결과서. 원시 runs/화면은 로컬/팀 내부·제출 패키지로 구분</td>\n</tr>\n<tr>\n<td>scripts/README.md·scripts/dev/</td>\n<td>R01</td>\n<td>R04 저장/배포·R05 재현</td>\n<td>공통 사용법 취합·환경/배포 도구</td>\n</tr>\n<tr>\n<td>scripts/test/</td>\n<td>R05</td>\n<td>R02/R03/R04 대상 기능</td>\n<td>시험·검색 비교·측정 재현. R03이 검색 평가 로직 제공</td>\n</tr>\n<tr>\n<td>docs/TEAM-START.md·.github/pull_request_template.md·docs/project/TEAM-READINESS-REVIEW.md</td>\n<td>R01</td>\n<td>전원 역할/환경·R05 재현</td>\n<td>팀 첫 실행·검토 양식·현재 공유 전 점검. 실제 담당자/권한은 별도 확인</td>\n</tr>\n<tr>\n<td>docs/project/SYSTEM-DESIGN.md</td>\n<td>R01</td>\n<td>R02/R03/R04/R05</td>\n<td>최상위 구성·상태 관계·경로·추적 취합</td>\n</tr>\n<tr>\n<td>docs/project/WORKFLOW-DESIGN.md</td>\n<td>R02</td>\n<td>R03/R04/R05</td>\n<td>업무 계약·노드/엣지·분기/오류</td>\n</tr>\n<tr>\n<td>docs/project/RAG-ARCHITECTURE.md</td>\n<td>R03</td>\n<td>R02/R04/R05</td>\n<td>검색·색인 내부와 실측</td>\n</tr>\n<tr>\n<td>docs/project/STORAGE-DESIGN.md</td>\n<td>R04</td>\n<td>R02/R01/R05</td>\n<td>저장 계약·처리 상태·DLQ·복구</td>\n</tr>\n<tr>\n<td>docs/project/{TOPIC,TEAM-CHARTER,README}.md·docs/{DEVELOPMENT-PLAN,PRESENTATION-PLAN}.md·docs/project/daily/·docs/project/presentation/</td>\n<td>R01</td>\n<td>전원 담당 내용·R05 증거</td>\n<td>범위·책임·진행·산출물 목록·발표 최종 편집. 중괄호는 각 파일 경로를 묶은 표기</td>\n</tr>\n<tr>\n<td>docs/guideline/</td>\n<td>R01 변경 취합</td>\n<td>전원 요구 대조</td>\n<td>보존 원문을 임의 수정하지 않고 변경 근거/원문 갱신 구분</td>\n</tr>\n<tr>\n<td>docs/research/·data/research/·scripts/research/</td>\n<td>R01 변경 취합</td>\n<td>자료 제공 역할·R05 출처/재현</td>\n<td>기존 하위 규칙 준수·조사/출처·원본 보존</td>\n</tr>\n<tr>\n<td>docs/project/reviews/</td>\n<td>R01 게시 취합</td>\n<td>관련 설계 소유자·R05 재검증</td>\n<td>새 검토 기록, 과거 보고서·증거 보존</td>\n</tr>\n<tr>\n<td>tmp/</td>\n<td>생성 역할</td>\n<td>R01 정식화/정리</td>\n<td>일시 작업만. 정식 도구/필수 데이터는 담당 경로로 이동</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>공통 파일은 주 담당이 최종 편집한다. 지원 역할은 담당 부분을 제공하고 검토하며, 소유자를 거치지 않는 동시 편집은 하지 않는다. 목록에 없는 새 경로는 목적·주 담당·검토자·의존 작업을 기록한 뒤 추가한다.</p>"
        },
        {
          "html": "<h3>J01~J03 한정 편집 인계 — 2026-11-06</h3>"
        },
        {
          "html": "<p>사용자가 R01에 공통 부분을 정해 병렬 진행하도록 지시했다. <a href=\"../../../../infra/parallel-integration-contract-v1.md\">공통 기준 v1</a>을 이번 작업의 실행 분담으로 기록한다. 영구적인 역할 소유권 변경이 아니다.</p>"
        },
        {
          "html": "<li>R01은 원소유 R04의 사용자 API <strong>records 실제 조회 분기·전용 provider·해당 배포 환경만 대리 구현</strong>한다. employees 등록·권한 정책은 바꾸지 않는다. R04가 같은 파일을 편집 중이면 그 diff를 먼저 인계받고 동시 편집하지 않는다.</li>"
        },
        {
          "html": "<li>R02는 support 후속 분기·복원 결과 소비, R04는 state/새 마이그레이션·handoff의 상태/문맥/효과 보존을 담당한다. R04는 대리 인계 기간 USER records/provider를 병렬 수정하지 않는다.</li>"
        },
        {
          "html": "<li>R03은 index/search/지식, R05는 사례·판정 도구와 공식 결과를 담당한다. 생산자 완료를 기다리지 않고 고정 모의 예제로 검사를 준비한다.</li>"
        },
        {
          "html": "<li>내부 SupportCase 보완과 조회 상태 의미의 영향 검토는 생산/소비 역할·R05가 PR36에서 한 번 확인한다. 예제 개발 착수와 VM 배포/공식 판정을 구분한다. 인계 시작·종료 버전과 원소유자의 회수 시점은 PR36에 기록한다.</li>"
        },
        {
          "html": "<h2>2. 목표 (한 문장)</h2>"
        },
        {
          "html": "<p>“따릉이 시민의 대여·반납·고장·요금/환불·후속 조회·개인정보/보안 문의를 모두 정상 접수 시 티켓으로 만들고, 근거로 답변 가능한 건은 안내 후 종료하며 정보 보완이나 담당자 처리가 필요한 건은 맥락을 유지해 연결한다.”</p>"
        },
        {
          "html": "<h2>3. 범위</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>처리할 문의 유형</th>\n<th>처리 방식 (자동 답변 / 보완 질문 / 항상 이관)</th>\n<th>근거 문서</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>2026-11-03</td>\n<td>.gitignore·실제 Git 후보/강제 추적·공개 링크 검사 책임 반영</td>\n<td>원문 유지·같은 폴더 개발·ZIP 선택화</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>Python 환경/잠금·린트/포맷·CI·공개 정책/허용 목록 책임 추가</td>\n<td>로컬 원본 보존과 공개 검토본 생성·업무 Python 경계 구분</td>\n</tr>\n<tr>\n<td>대여·잠금 해제 — U17~U20</td>\n<td>분류 → 부족하면 질문 준비·티켓 생성·대기,근거 안내는 답변·검증 후 티켓 생성·종료. 미해소·상태 불일치는 이관</td>\n<td><a href=\"../../../../docs/project/TOPIC.md#3-%EB%B2%94%EC%9C%84\">TOPIC 3절</a>, SRC-0048-E001, 예정 지식: rental-guide.md</td>\n</tr>\n<tr>\n<td>반납 완료 미확인 — U27·U28·U30</td>\n<td>장소/시각·잠금·알림·표시 부족은 질문 준비·티켓 생성·대기,근거 안내는 답변·검증 후 티켓 생성·종료. 미확인 지속·개별 기록 검토는 이관</td>\n<td><a href=\"../../../../docs/project/TOPIC.md#3-%EB%B2%94%EC%9C%84\">TOPIC 3절</a>, SRC-0018-E002, 예정 지식: return-guide.md</td>\n</tr>\n<tr>\n<td>고장·이동 곤란 — U21·U22</td>\n<td>신고 방법은 답변·종료. 실제 신고·현장 조치 요청은 보완·이관, 신체 위험은 긴급 우선</td>\n<td><a href=\"../../../../docs/project/TOPIC.md#3-%EB%B2%94%EC%9C%84\">TOPIC 3절</a>, SRC-0017-E001, 예정 지식: breakdown-report.md</td>\n</tr>\n<tr>\n<td>요금·환불 검토 — U12·U29·U31·U32</td>\n<td>일반 기준·신청 방법은 답변·종료. 개별 청구·환불 판단·정정은 보완 후 항상 이관</td>\n<td><a href=\"../../../../docs/project/TOPIC.md#3-%EB%B2%94%EC%9C%84\">TOPIC 3절</a>, SRC-0168-E001·SRC-0165-E001, 예정 지식: fees-refund-guide.md</td>\n</tr>\n<tr>\n<td>기존 문의 상태·후속 요청 — U37·U38</td>\n<td>조회 문의도 티켓 생성, 본인 대상 건 상태 안내 후 조회 문의 티켓 종료. 상충·추가 판단은 이관</td>\n<td><a href=\"../../../../docs/project/TOPIC.md#3-%EB%B2%94%EC%9C%84\">TOPIC 3절</a>, 과제용 조회 정책, 예정 지식: support-followup.md</td>\n</tr>\n<tr>\n<td>개인정보·계정 보안 우려 — U40</td>\n<td>일반 안내는 답변·종료. 노출·침해 의심은 high 티켓·알림·담당자 이관과 초동 안내</td>\n<td><a href=\"../../../../docs/project/TOPIC.md#3-%EB%B2%94%EC%9C%84\">TOPIC 3절</a>, 과제용 보안 정책, 예정 지식: privacy-security-guide.md</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>Discord 이용자 입구와 Jira 티켓 관리는 사용자 결정이며 주제 적합성·6유형·웹훅+Jira 조합 표기·강사 확인은 미완료다. data-api는 공통 검증 경로로 유지한다. 세부 근거·가정은 TOPIC을 기준으로 하며, 실행 판정은 구현 전에 사례 파일에 작성한다.</p>"
        },
        {
          "html": "<p>하지 않을 것 (범위 밖):</p>"
        },
        {
          "html": "<li>실제 환불·요금 변경·강제 반납·원격 잠금 해제·배차·정비/출고 승인·기관 내부 DB 변경.</li>"
        },
        {
          "html": "<li>직원·협력업체의 별도 작업 문의, 후보 100개 전체와 조직 전체 협업 시스템 구현.</li>"
        },
        {
          "html": "<li>타인 기록·제한 문서 노출, 실제 시민 계정·거래·연락처 사용.</li>"
        },
        {
          "html": "<li>안내·접수·담당 알림을 실제 문제 해결로 표시하거나 미측정 효과를 성과로 제시하는 것.</li>"
        },
        {
          "html": "<h2>4. 규칙</h2>"
        },
        {
          "html": "<p>Docker Compose를 배포 방식으로 채택한다. 상세 작업 절차는 <a href=\"../../../../AGENTS.md\">루트 AGENTS</a>, 환경/복구는 <a href=\"../../../../infra/README.md\">infra 안내</a>를 단일 원본으로 삼는다. DB 제품·실제 배포 설정은 별도 확인한다.</p>"
        },
        {
          "html": "<p>공통 요청·응답·모듈 계약은 전원이 검토하고 R01이 변경을 승인·관리한다. 변경 사유·영향 파일·시험 항목을 함께 기록하며 공식 판정을 임의로 약화하지 않는다.</p>"
        },
        {
          "html": "<p>같은 워크플로우 파일의 편집 소유자는 1개 역할이다. 다른 소유자의 파일은 변경 요청 후 소유자가 수정하거나 사전 합의해 인계한다. 같은 파일을 동시에 편집하지 않는다.</p>"
        },
        {
          "html": "<p>각 역할은 변경분을 개별 시험하고 검토 요청한다. R01이 검토된 변경을 기본 브랜치에 병합한다. 저장소·브랜치 이름은 5절에서 확정한다.</p>"
        },
        {
          "html": "<p>기능 변경마다 관련 시험과 공통 회귀를 수행하고 커밋 메시지에 실제 통과/전체 수와 보고서 경로를 쓴다. 미실행은 미실행으로 표시한다. R05가 기대 결과·회귀 증거를 관리하고 각 구현 역할이 실패 원인을 수정한다.</p>"
        },
        {
          "html": "<p>모든 정상 신규 문의는 티켓화한다. 보완·재전송은 기존 건을 연결하고, 같은 request_id의 재전송으로 중복 티켓을 만들지 않는다. 생성·종료·알림 실패는 각각 확인된 결과대로 표시한다.</p>"
        },
        {
          "html": "<p>티켓 종료 지원은 R04가 실제 API로 확인하고 R02·R05와 계약·판정을 합의한다. 미지원이면 R01이 별도 구현 범위·일정·시험 비용을 조정한다. 단순 답변 문구로 종료 성공을 대신하지 않는다.</p>"
        },
        {
          "html": "<p>키·토큰은 n8n Credential에 보관하고 커밋 전 <code>tscan staged</code>를 수행한다. 질문·답변 원문 전체와 연락처를 실행 로그에 남기지 않고, 답변·티켓·알림·화면의 개인정보를 가린다.</p>"
        },
        {
          "html": "<p>81일차(11월 6일) 8교시 발표 이후 기능 동결. 이후에는 시험·결함 수정·문서·발표 준비만 수행한다.</p>"
        },
        {
          "html": "<p>팀 VM은 R01이 기본 브랜치에서 배포하고 하위 워크플로우·Error Workflow 연결을 확인한다. 배포 후 R05가 VM 공통 시험과 연결된 팀 시험을 수행하며 버전·보고서를 남긴다.</p>"
        },
        {
          "html": "<p>발표 자료는 R01이 최종 편집하고 R02<del>R05가 담당 근거를 제공한다. 발표자 F는 R01</del>R05 중 1개 ID로 지정하며 현재 미정이다. 기본 시연 조작은 R05가 맡고 F=R05이면 별도 조작 ID를 정한다. 발표·연습 시간에는 같은 역할에 구현 작업을 중복 배정하지 않는다.</p>"
        },
        {
          "html": "<p>막히면 30분 안에 팀에 공유하고 1시간이면 강사에게 문의한다. 원장에 원인·해결 역할·다음 조치를 기록하며 문서 작성만으로 구현·시험을 완료 처리하지 않는다.</p>"
        },
        {
          "html": "<h2>5. 저장소 · 연락</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>값</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>팀 이름·접두사</td>\n<td>두바퀴 / dubakwi</td>\n</tr>\n<tr>\n<td>저장소</td>\n<td><a href=\"https://github.com/ik-e/dubakwi-ttareungi-support\">ik-e/dubakwi-ttareungi-support</a>, public, 기본 브랜치 main. R01이 팀 권한/검토·강사 접근을 별도 확인</td>\n</tr>\n<tr>\n<td>이용자 채널</td>\n<td>Discord 슬래시 명령·본인 전용 응답. R04 Gateway 봇, R02 본체 연결. 앱/서버·봇 설치·등록 매핑은 D07에서 확인</td>\n</tr>\n<tr>\n<td>웹훅 경로</td>\n<td><code>POST /webhook/dubakwi-support</code>. 두바퀴 / dubakwi 확정</td>\n</tr>\n<tr>\n<td>팀 VM</td>\n<td>R01이 관리. 주소·계정·비밀번호·키는 여기에 쓰지 않음</td>\n</tr>\n<tr>\n<td>회의 시각</td>\n<td>매일 1교시 처음 10분. 역할 ID별 진행·막힘·인계·당일 목표 확인</td>\n</tr>\n<tr>\n<td>협업 연락 채널</td>\n<td>미정. R01이 전원과 합의해 기록</td>\n</tr>\n<tr>\n<td>발표자</td>\n<td>F = 미정(R01~R05 중 1개 ID). 설명·질의 진행은 1명</td>\n</tr>\n<tr>\n<td>시연 조작자</td>\n<td>R05 기본안. F=R05이면 별도 ID 지정 필요</td>\n</tr>\n<tr>\n<td>발표 자료</td>\n<td><code>docs/project/presentation/</code>, R01 최종 편집. 공용 파일 형식·파일명 미정</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>6. 바뀐 것</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>날짜</th>\n<th>바뀐 것</th>\n<th>까닭</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>2026-11-07</td>\n<td>핵심 마감은 R01 통합, 새 UX 개선은 R02, 기존 핵심 업무 로직은 R01 통합으로 구분</td>\n<td>사용자 지시 반영. UX 실연동과 핵심 마감 증거를 분리</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>사용자 업로드 요청으로 GitHub 공개 저장소 생성·주소 반영</td>\n<td>첫 게시와 팀 역할/보호 설정·실제 서비스 구현 완료를 구분</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>Discord Gateway 봇·명령/비공개 응답·모의 사용자 매핑·시험/배포 책임 추가</td>\n<td>이용자 채널 결정, 공통 시험 Webhook 유지</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>팀 이름 두바퀴·기술 접두사 dubakwi 확정 및 현재 파일/웹훅 이름 동기화</td>\n<td>사용자 팀명 결정</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>팀 첫 실행·PR·공유 증거 경로 책임 보완</td>\n<td>공개 Git에서도 팀 인계가 끊기지 않게 정리</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>경로별 주 담당/검토자·Docker Compose 책임·작업 규칙 원본 지정</td>\n<td>시스템 경로·개발 우선순위·의존성을 함께 관리</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>일반/보완/긴급 처리 순서·Jira 범위·state/dlq 하위 기능 책임과 공통 계약 참조 동기화</td>\n<td>검증 F01~F07 보완 및 역할별 내부 결정과 공통 경계 구분</td>\n</tr>\n<tr>\n<td>2026-11-03</td>\n<td>R04의 STORAGE-DESIGN.md 편집 책임과 현행 TOPIC 참조 반영</td>\n<td>최소 처리 상태·DLQ·실행 기록의 상세 설계를 별도 문서에서 관리</td>\n</tr>\n<tr>\n<td>2026-11-02</td>\n<td>공식 템플릿의 6개 절을 유지한 v0.1 초안 작성. 이름 칸에 R01~R05 사용</td>\n<td>사용자 요청에 따라 실명 대신 역할 ID로 책임·소유권 관리</td>\n</tr>\n<tr>\n<td>2026-11-02</td>\n<td>시민 요청·정상 신규 문의 전체 티켓화·자동 답변 후 종료 및 담당 이관 반영</td>\n<td>TOPIC v0.2와 범위 일치</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p>2026-11-04 v0.11 변경: infra/vm-preflight.md를 R01 환경/배포 안내 경로로 추가. 기존 R04 저장·R05 재현 검토 책임은 유지한다.</p>"
        },
        {
          "html": "<p>2026-11-05 v0.12 변경: PostgreSQL 전용 Compose/배포 준비 안내의 R01 편집·R04 저장/권한·R05 복원 검토 경로를 추가. 실제 VM DB 채택/적용·역할 검토 완료를 뜻하지 않는다.</p>"
        },
        {
          "html": "<p>2026-11-04 R05 인계 추가: cases/team-extended.json은 R05 주 담당, R02/R03/R04 관련 기대값 검토다. 파일은 r05/p06-flow-cases의 병합 후보에 있으며 이 책임 등록이 구현 병합·시험 통과를 뜻하지 않는다.</p>"
        },
        {
          "html": "<p>2026-11-05 v0.13: cases/p11-entry.json을 R05 소유·R02/R04 검토의 P11 골격 전용 임시 사례로 등록했다. team-extended.json의 기존 책임은 유지한다. 사용자가 R01에게 run_cases.py의 hook 실패 중단·관련 회귀시험 대리 수정을 인계했으며, 범위와 검증은 개발 원장의 P13/P25 기록을 따른다. 이후 시험 도구 책임은 R05가 유지한다.</p>"
        },
        {
          "html": "<h2>2026-11-07 PR36 통합 대리 편집 기록</h2>"
        },
        {
          "html": "<p>사용자가 PR36 이후 기존 문의 처리 로직·연동의 핵심 마감을 R01이 통합 진행하고 R02는 새 UX 개선만 맡도록 정정했다. R01은 기존 경로의 분류·RAG/에이전트·Jira 생애주기·담당자 전달·오류/DLQ와 그 시험/결과를 마무리한다. R02는 새 UX의 사용성·표현 개선을 맡으며 그 변경 결과는 핵심 로직 검증과 분리해 기록한다. 기존 파일 소유권과 공유 VM/사본의 동시 편집 제한은 유지하며, 실행하지 않은 시험이나 확인을 완료로 추정하지 않는다.</p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "guide",
      "role": "가이드",
      "title": "발표 요구사항 적용 요약",
      "slides": [
        1,
        8,
        11,
        12
      ],
      "source": "sources/guide.html",
      "blocks": [
        {
          "html": "<h2>발표 구성과 시간</h2><p>업무·역할 3분, 워크플로우 5분, RAG 4분, 시연 5분, 결과·결론 3분으로 본문 20분을 편성했습니다. 질의응답 5분은 별도입니다. 실제 연속 발표 시간은 미측정입니다.</p>",
          "index": 0
        },
        {
          "html": "<h2>필수산출물 대응</h2><p>워크플로우 설계서는 업무·역할·노드·분기·도구·페이로드·오류를 설명합니다. RAG 설계서는 원본·청킹·임베딩·검색 권한·복구를 설명합니다. 실행 결과서는 시험 조건·기대와 실제·실패·재시험·한계를 설명합니다.</p>",
          "index": 1
        },
        {
          "html": "<h2>시연 순서</h2><p>QR 근거 안내 → 같은 반납 문의의 보완과 세 번째 이관 → 무근거 이관 → Jira All에서 담당자 검토·진행 중·내부 메모를 보여줍니다. 실제 환불·반납 변경 기능은 포함하지 않습니다.</p>",
          "index": 2
        },
        {
          "html": "<h2>발표 자료의 근거</h2><p>각 장의 발표자 메모에서 대본·필수산출물·원본 보고서를 연결합니다. 검색 평가, 대표 종단 요청, 과거 반복 시험을 서로 다른 조건으로 설명합니다. 가이드 원문 자체는 공개 재배포하지 않고 이 프로젝트의 적용 결과만 제공합니다.</p>",
          "index": 3
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "latest-rag",
      "role": "후속 검증",
      "title": "11/08 · PR36 검색 16건",
      "slides": [
        6,
        9
      ],
      "source": "sources/latest-rag.html",
      "blocks": [
        {
          "html": "<h1>PR36 전용 RAG 전체 검색 matrix</h1>"
        },
        {
          "html": "<li>실행 ID: <code>20261108-142200-vm-pr36-rag-full-matrix</code> (KST)</li>"
        },
        {
          "html": "<li>실행 시각: 2026-11-08 14:22 KST</li>"
        },
        {
          "html": "<li>환경: aio-t2 VM, Edge Web SSH의 user-api 컨테이너 → PR36 search webhook</li>"
        },
        {
          "html": "<li>입력/기대값 원본: <code>cases/search.json</code> 16개 사례</li>"
        },
        {
          "html": "<li>대상: <code>R01 PR36 a657890 search</code> (<code>/webhook/dubakwi-search-pr36-a657890</code>)</li>"
        },
        {
          "html": "<h2>결과</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>사례</th>\n<th>응답 상태</th>\n<th>확인한 기대 결과</th>\n<th>판정</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>SR-WF01</td>\n<td><code>ok</code></td>\n<td>public rental-guide QR 절</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-WF02</td>\n<td><code>ok</code></td>\n<td>public return-guide 반납 미완료 절</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-WF03</td>\n<td><code>empty</code></td>\n<td>근거 0건</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-WF04</td>\n<td><code>ok</code></td>\n<td>fees-refund-guide</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-WF12</td>\n<td><code>ok</code></td>\n<td>privacy-security-guide의 계정 침해 공개 초동 안내</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-TC04</td>\n<td><code>ok</code></td>\n<td>fees-refund-guide 환불 근거</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-TC09a</td>\n<td><code>ok</code></td>\n<td>return-guide 반납 안내</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-TC09b</td>\n<td><code>ok</code></td>\n<td>privacy-security-guide 로그인/계정 찾기</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-WF05</td>\n<td><code>ok</code></td>\n<td>시민 내부 정책 요청에도 public 근거만 반환</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-R01</td>\n<td><code>ok</code></td>\n<td>이관 정책 질문에 public 근거만 반환</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-R02</td>\n<td><code>ok</code></td>\n<td>티켓 lifecycle 질문에 public 근거만 반환</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-R03</td>\n<td><code>ok</code></td>\n<td>시민 자기소개로 staff 권한 승격 없음; public 근거만 반환</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-R04</td>\n<td><code>error</code></td>\n<td><code>invalid_request</code>, evidence 0건, 제한 canary 미노출</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-STAFF01</td>\n<td><code>ok</code></td>\n<td>허용된 staff 권한으로 restricted handoff-policy 반환</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-STAFF02</td>\n<td><code>ok</code></td>\n<td>허용된 staff 권한으로 restricted ticket-lifecycle 반환</td>\n<td>통과</td>\n</tr>\n<tr>\n<td>SR-OFF</td>\n<td><code>skipped</code></td>\n<td>검색 비활성, evidence 0건</td>\n<td>통과</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<p><strong>집계: 16/16 통과.</strong> 모든 요청은 검색 전용이었다. 시민 권한 사례에서 restricted 근거가 반환되지 않았고, 제한 자료 양성 대조는 staff 권한에서만 해당 자료를 반환했다. 직전 PR36 표적 7건 시험의 결과와 일치한다. 13:14 legacy search의 SR-WF12 raw query 실패는 PR36 전용 경로 결과와 분리한다.</p>"
        },
        {
          "html": "<h2>실행 기록 대조</h2>"
        },
        {
          "html": "<p>검색 UI의 Executions 화면은 <code>No executions found</code>다. 읽기 전용 SQLite 조회에서는 이 배치에 대응하는 PR36 search webhook 실행 16개(ID #2228–#2243)가 모두 <code>running</code>, <code>stoppedAt=null</code>로 남았다. 각 webhook은 HTTP 200 응답을 돌려줬다. PR36 index 수동 실행 #2211도 같은 DB 상태다. 과거 #2167은 이번 조회에 나타나지 않았다.</p>"
        },
        {
          "html": "<p>PR36 workflow DB settings는 <code>saveDataSuccessExecution=none</code>, <code>saveManualExecutions=false</code>, <code>saveExecutionProgress=false</code>다. 따라서 UI에 완료 이력이 없는 것은 저장 설정으로 설명된다. 다만 실제 SQLite row가 성공 응답 뒤에도 <code>running</code>인 이유는 설정만으로 확정되지 않는다. execution row를 직접 수정/삭제하지 않았다. index execution #2211의 종료시각이 없어 색인 시간은 계산할 수 없다.</p>"
        },
        {
          "html": "<h2>한계 및 부수 효과</h2>"
        },
        {
          "html": "<li>검색 기준의 결과/권한 assertion은 통과했지만 개별 응답 latency는 기록되지 않았다.</li>"
        },
        {
          "html": "<li>색인 처리 시간은 미측정이다. 단순 계측을 위해 인메모리 Simple Vector Store에 같은 44 chunks를 다시 쌓지 않았다.</li>"
        },
        {
          "html": "<li>Jira, Discord, support state, DLQ는 호출하지 않았다. n8n execution metadata 행 16개는 관측한 실제 저장 효과다.</li>"
        },
        {
          "html": "<li>SQLite read-only 조회와 workflow setting read만 수행했다. 저장 설정·workflow를 변경하지 않았다.</li>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "latest-jira",
      "role": "후속 검증",
      "title": "11/08 · Jira 담당자 처리",
      "slides": [
        8,
        9
      ],
      "source": "sources/latest-jira.html",
      "blocks": [
        {
          "html": "<h1>VM Jira J02 담당자 티켓 처리 확인</h1>"
        },
        {
          "html": "<li>실행 ID: <code>20261108-154900-vm-jira-j02-assignee-handling</code> (KST)</li>"
        },
        {
          "html": "<li>실행 시각: 2026-11-08 15:49 KST</li>"
        },
        {
          "html": "<li>환경: Jira JBYS 프로젝트 UI, 기존 D02 synthetic 문의</li>"
        },
        {
          "html": "<li>공개본에서 Jira 이슈 키는 가림 처리</li>"
        },
        {
          "html": "<h2>확인 결과</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>판정</th>\n<th>UI 관측</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>synthetic 문의 확인</td>\n<td>통과</td>\n<td>반납 후 앱 이용 중 표시 문의인 기존 D02 테스트 티켓을 열었다.</td>\n</tr>\n<tr>\n<td>담당자 일치</td>\n<td>통과</td>\n<td>티켓 담당자는 <code>i i</code>; Jira 현재 로그인 사용자 표시와 내부 메모 작성자도 <code>i i</code>였다.</td>\n</tr>\n<tr>\n<td>처리 상태</td>\n<td>통과</td>\n<td>상태 변경 버튼이 <code>진행 중</code>으로 표시됐다.</td>\n</tr>\n<tr>\n<td>가상 처리 메모</td>\n<td>통과</td>\n<td>담당자 계정이 내부 메모 “J02 가상 시험: 담당자가 문의를 확인했습니다. 실제 이용자 조치는 수행하지 않았습니다.”를 남겼고 활동 목록에서 내부 메모로 보였다.</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>판정 및 한계</h2>"
        },
        {
          "html": "<p>J02의 담당자 직접 티켓 열람·진행 중 전환·내부 처리 메모를 확인해 통과로 판정한다. Discord 알림이 실제로 담당자에게 전달/열람됐는지, DB state/DLQ 효과는 이 화면에서 확인하지 않았다. 실제 이용자 대여/반납 조치는 수행하지 않았다.</p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "latest-readiness",
      "role": "후속 검증",
      "title": "11/08 · D10·TC15 미실행 경계",
      "slides": [
        8,
        9,
        11
      ],
      "source": "sources/latest-readiness.html",
      "blocks": [
        {
          "html": "<h1>D10 / TC-15 시험 환경 준비 여부 점검</h1>"
        },
        {
          "html": "<li>실행 ID: <code>20261108-160500-vm-final-test-environment-readiness</code> (KST)</li>"
        },
        {
          "html": "<li>실행 시각: 2026-11-08 16:05 KST</li>"
        },
        {
          "html": "<li>범위: D10 동일 interaction replay 및 TC-15 isolated fault 경로의 준비 여부만 판정</li>"
        },
        {
          "html": "<li>변경/실행: 요청 전송·워크플로우 변경·활성화·VM 쓰기 없음</li>"
        },
        {
          "html": "<h2>준비 여부</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>사례</th>\n<th>환경 준비</th>\n<th>확인 근거</th>\n<th>판정</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>D10 동일 Discord interaction 재전달</td>\n<td>미준비</td>\n<td>저장소에 live interaction 재전달 + 지원 경로 외부 호출 계측을 수행하는 통합 harness가 없다. 기존 <code>tests/channels/test_discord_bot.py</code>의 동일 interaction 테스트는 안정된 <code>dc-&lt;interaction_id&gt;</code> request_id 구성만 검증한다. UI의 새 slash command는 새 interaction ID를 받는다.</td>\n<td>BLOCKED / NOT RUN. 로컬 adapter 회귀 22/22는 별도 단위 경계 근거이지 D10 통합 검증이 아니다.</td>\n</tr>\n<tr>\n<td>TC-15 격리 고장 경로</td>\n<td>미준비</td>\n<td>최신 VM 점검 <a href=\"../../../../runs/public/20261108-125600-vm-final-test-followup/report.md\">12:56 결과</a>에서 시험 Support 사본이 B14/B15/B27로 운영 PR36 search/handoff webhook을 참조했고 고유 B01 ingress와 fault wiring은 확인되지 않았다. 이전 게시 사본은 PR36 DB를 공유하는 것으로 기록됐다(<a href=\"../../../../runs/public/20261107-213400-vm-tc15-clone-publish/report.md\">사본 점검</a>).</td>\n<td>BLOCKED / NOT RUN. 격리 경계 없이 fault request를 보내지 않는다.</td>\n</tr>\n</tbody></table>"
        },
        {
          "html": "<h2>마감 판정</h2>"
        },
        {
          "html": "<p>사용자 지시에 따라 이 회차는 두 시험 환경의 준비 여부만 확인한다. D10과 TC-15의 환경은 현재 미준비이므로 시험 요청을 만들지 않았으며, 실행 테스트 검증은 <code>BLOCKED / NOT RUN</code>을 보존한 채 종결한다. 이 판정은 기능 통과를 뜻하지 않는다. 시험 환경이나 격리 구성이 실제로 바뀌면 그때 별도 실행할 수 있다. 사용자/Jira/RAG/DLQ의 다른 완료 결과는 영향을 받지 않는다.</p>"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "payload-contract",
      "role": "R02 · R03",
      "title": "검색 연결 계약 · 설계서 6.1 발췌",
      "source": "sources/payload-contract.html",
      "slides": [
        4
      ],
      "blocks": [
        {
          "html": "<h2>검색 연결의 필수 필드</h2>"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>객체</th>\n<th>필수 필드</th>\n<th>규칙</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>SearchRequest</td>\n<td>request_id:string,enabled:boolean,query:string,access_levels:string[],deadline_at:string</td>\n<td>서버에서 enabled/공개컬렉션 결정, 시민이 memory_key를 지정하지 않음</td>\n</tr>\n<tr>\n<td>SearchResult</td>\n<td>request_id:string,status:ok/empty/skipped/error,evidence:Evidence[],error_code:string／null</td>\n<td>Evidence={doc,section,chunk_id,text,score:number,access_level,source_url?,version,applies_to?:string[],source_checked_at?:string}. empty/skipped/error는 근거[]지만 의미 다름</td>\n</tr>\n</tbody></table>\n"
        }
      ],
      "baseline": "reviewed-public"
    },
    {
      "id": "current-workflow",
      "role": "R02",
      "title": "최종 제출 · 노코드 워크플로우 설계서",
      "slides": [
        3,
        4,
        7
      ],
      "source": "sources/current-workflow.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>노코드 워크플로우 설계서 · 두바퀴</h1>\n"
        },
        {
          "html": "<p>최종 제출본 v1.0 · 2026-11-09 KST · 작성·취합 R01</p>\n"
        },
        {
          "html": "<p><strong>근거가 있는 시민 문의는 출처와 함께 안내하고, 정보나 근거가 부족하면 같은 문의의 맥락을 담당자에게 넘긴다.</strong> 자동 답변, Jira 처리, 저장 결과를 함께 확인해야 한 요청을 완료로 판단한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>기준</th>\n<th>이번 제출본의 범위</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>소스 기준</td>\n<td><code>main</code> <code>dd919d7</code>의 업무 코드와 11/09 마감 문서 변경. 실제 8개 JSON의 노드·연결은 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/workflow-map.md\">직접 집계 목록</a> 참조</td>\n</tr>\n<tr>\n<td>VM 증거 기준</td>\n<td>11/07 PR36 통합 실행, 11/08 검색·Discord/Jira 시험, 11/09 대표 시연 리허설. 각각의 버전·환경은 실행 결과서에 구분</td>\n</tr>\n<tr>\n<td>최신 확인</td>\n<td>QR 안내, 반납 보완 1→2→3회차 이관, 근거 없는 질문 이관, 담당자 Jira 배정·진행 상태·내부 메모. Jira <code>All</code> 큐에 완료 티켓 포함</td>\n</tr>\n<tr>\n<td>남은 한계</td>\n<td>모든 로컬 JSON과 현 VM 전체 export의 동일성은 미확인. 운영자 복구 action은 이번 완료 범위 밖. D10/TC-15는 BLOCKED / NOT RUN</td>\n</tr>\n<tr>\n<td>문서의 관계</td>\n<td>본 파일은 제출용 정리본. <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md\">상세 계약 원본</a>, <a href=\"../../../../docs/project/STORAGE-DESIGN.md\">저장소 계약</a>, <a href=\"../../docs/EXECUTION-RESULT.md\">날짜별 증거</a>는 보존</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>1. 업무 시나리오</h2>\n"
        },
        {
          "html": "<p>시민이 Discord의 문의 기능으로 입력하면 기존 API를 거쳐 n8n Webhook이 처리한다. n8n은 등록 사용자와 권한을 확인하고 분류·검색·답변·검증을 조정한다. Jira는 문의 인계와 담당자의 검토 공간이며, PostgreSQL은 최소 상태·요청 결과·DLQ를 보존한다. 실제 따릉이 기관 시스템과 연결한 서비스가 아닌 교육용 구현이다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>문의 유형 6개</th>\n<th>자동으로 할 수 있는 일</th>\n<th>사람이 판단할 일</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>대여·잠금 해제</td>\n<td>QR·번호·설정·절차 안내</td>\n<td>실제 잠금 제어, 개별 이용 상태 불일치</td>\n</tr>\n<tr>\n<td>반납 완료 미확인</td>\n<td>잠금·알림·화면·장소/시각 확인 질문과 절차 안내</td>\n<td>실제 반납 처리, 기록 정정</td>\n</tr>\n<tr>\n<td>고장·이동 곤란</td>\n<td>신고 방법, 대상·위치·증상 확인</td>\n<td>현장 출동·수리·안전 판단</td>\n</tr>\n<tr>\n<td>요금·환불</td>\n<td>공개 기준·신청 절차 안내</td>\n<td>환불 승인, 결제 취소, 요금 정정</td>\n</tr>\n<tr>\n<td>본인 문의 상태·후속</td>\n<td>소유권을 확인한 접수 조회·추가 진술 연결</td>\n<td>담당자의 실제 업무 수행</td>\n</tr>\n<tr>\n<td>개인정보·보안</td>\n<td>공개 신고 경로·초동 안내</td>\n<td>침해 여부·범위·개별 권한 판단</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>분류값 <code>unknown</code>은 분류 실패·불명확함을 표현하는 보조값이며 일곱 번째 업무 유형이 아니다. 유형 6개와 아래 처리 경로 5개는 서로 다른 분류다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>처리 경로</th>\n<th>조건</th>\n<th>결과</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>S1 일반 안내</td>\n<td>충분한 정보·허용 근거·검증 통과</td>\n<td>Jira 생성·안내 완료 종료, 출처 포함 응답</td>\n</tr>\n<tr>\n<td>S2 보완</td>\n<td>정보 부족, 현재 1·2회차</td>\n<td>같은 문의·티켓을 유지하고 추가 정보 요청</td>\n</tr>\n<tr>\n<td>S3 담당자 이관</td>\n<td>사람 판단, 근거 없음, 보완 한도, 검증 실패</td>\n<td>요약·진술·시도·누락·근거를 보존하고 담당 역할로 인계</td>\n</tr>\n<tr>\n<td>S4 본인 접수 조회</td>\n<td>서버가 확인한 소유자와 대상 일치</td>\n<td>상태 안내. 조회 대상 티켓과 이번 문의 티켓을 구분</td>\n</tr>\n<tr>\n<td>S5 긴급</td>\n<td>안전·보안 위험 진술 등</td>\n<td>긴급 담당 연결을 먼저 수행하고 가능한 초동 근거를 후속 제공</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p><strong>완료의 의미:</strong> Jira의 자동 종료는 ‘안내 제공 완료’다. 실제 반납·환불·고장 해결을 뜻하지 않는다. DB의 <code>completed</code>는 요청 결과를 저장했다는 뜻이다. Jira 담당자가 <code>Done</code>으로 바꾸는 업무 처리와도 구분한다.</p>\n"
        },
        {
          "html": "<h2>2. 전체 흐름</h2>\n"
        },
        {
          "html": "<ol>\n<li>입력 형식·인증·등록·권한을 검사한다. 명백한 공격과 부적절한 요청은 업무 처리 전에 거절한다.</li>\n<li>요청 ID·소유자·입력 해시로 중복을 판별하고, <code>case_ref</code>가 있으면 같은 문의의 이전 맥락을 읽는다.</li>\n<li>분류 모델이 문의 유형·긴급도·부족한 정보·사람 판단 필요를 제안하고 Code 노드가 계약과 정책을 검사한다.</li>\n<li>필요한 경우 허용된 문서를 검색하고 본인 접수를 조회한다. 검색 결과 없음·실패·생략은 서로 다른 상태다.</li>\n<li>근거가 있으면 답변을 만들고 별도 검증 역할이 근거·정책·민감정보를 확인한다. 부족하면 보완 또는 이관한다.</li>\n<li>저장 의도를 남긴 뒤 Jira 생성·재사용·종료·배정·문맥 기록의 효과를 확인한다. 알려진 티켓 ID를 저장하고 최종 결과를 조건부 확정한다.</li>\n<li>저장한 응답과 실행 메타데이터를 연결해 사용자에게 반환한다. 외부 효과가 불확실하면 성공으로 덮거나 자동 재시도하지 않는다.</li>\n</ol>\n"
        },
        {
          "html": "<h2>3. 워크플로우 흐름도</h2>\n"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart TD\n  A[Discord 문의] --&gt; B[입력·등록·권한·중복 검사]\n  B --&gt; C[문의 분류]\n  C --&gt; D{업무 경로}\n  D --&gt;|일반 안내| E[허용 문서 검색·필요한 본인 조회]\n  E --&gt; F{근거 확인}\n  F --&gt;|충분| G[답변 생성·검증]\n  F --&gt;|없음·실패| H[담당자 인계 준비]\n  G --&gt;|통과| I[안내 완료 준비]\n  G --&gt;|미통과| H\n  D --&gt;|정보 부족 1·2회차| J[보완 질문 준비]\n  D --&gt;|3회차·사람 판단| H\n  D --&gt;|긴급| K[긴급 담당 연결·초동 안내]\n  D --&gt;|본인 조회| L[소유권 확인·상태 안내]\n  I --&gt; M[Jira 처리·효과 확인]\n  J --&gt; M\n  H --&gt; M\n  K --&gt; M\n  L --&gt; M\n  M --&gt; N[최종 저장·응답]\n  M --&gt;|실패·효과 미확인| O[known ID 보존·DLQ·수동 확인]\n  N -. 다음 보완 요청의 case_ref .-&gt; B\n</code></pre>\n"
        },
        {
          "html": "<p>상자는 업무 단계이며 하나의 n8n 노드와 일대일 대응하지 않는다. 실제 JSON 기준 대응은 다음과 같다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>단계</th>\n<th>실제 노드·파일</th>\n<th>역할</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>수신·사용자 확인</td>\n<td>support B01~B05</td>\n<td>요청 정규화, 팀 사용자 API 확인</td>\n</tr>\n<tr>\n<td>중복·문맥</td>\n<td>B07a <code>BeginRequest</code>, B07 <code>요청 문맥 읽기</code>, B08 <code>문맥 정리</code>, B09 <code>신규·재전송</code></td>\n<td>처리권·저장 결과·같은 문의 복원</td>\n</tr>\n<tr>\n<td>분류·분기</td>\n<td>B10 <code>문의 분류</code>, L01, B11 <code>분류 판정</code>, B12 <code>업무 분기</code></td>\n<td>LLM 제안과 Code 정책 분리</td>\n</tr>\n<tr>\n<td>검색·조회</td>\n<td>B13~B18</td>\n<td>B14 RAG 검색, B15 본인 기록 조회, B16 취합, B17 근거 판정</td>\n</tr>\n<tr>\n<td>생성·검증</td>\n<td>B19/L02, B20/L03, B21</td>\n<td>답변과 검증을 별도로 수행</td>\n</tr>\n<tr>\n<td>결과·Jira</td>\n<td>B22~B31, <code>dubakwi-handoff.json</code></td>\n<td>보완/이관/고정 안내 준비, Jira 처리·효과 확인</td>\n</tr>\n<tr>\n<td>최종 저장·응답</td>\n<td>B37~B39, B32, B34, B33, B35, B36</td>\n<td>저장 의도→저장 허용→최종 저장→응답·메타 기록</td>\n</tr>\n<tr>\n<td>실패</td>\n<td>X01~X07, <code>dubakwi-errors.json</code>, <code>dubakwi-dlq.json</code></td>\n<td>실패 종류·외부 효과에 따라 보존·알림</td>\n</tr>\n<tr>\n<td>최소 상태</td>\n<td><code>dubakwi-state.json</code></td>\n<td>PostgreSQL 조건부 처리권·결과, Jira 문맥 검증</td>\n</tr>\n<tr>\n<td>운영 조회</td>\n<td><code>dubakwi-recovery-operator.json</code></td>\n<td>제한된 DLQ 목록·상세·연결 Jira 조회. 복구 실행과 구분</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>파일</th>\n<th>로컬 노드 수</th>\n<th>연결 수</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>dubakwi-support.json</td>\n<td>54</td>\n<td>75</td>\n</tr>\n<tr>\n<td>dubakwi-handoff.json</td>\n<td>71</td>\n<td>91</td>\n</tr>\n<tr>\n<td>dubakwi-state.json</td>\n<td>31</td>\n<td>39</td>\n</tr>\n<tr>\n<td>dubakwi-search.json</td>\n<td>19</td>\n<td>25</td>\n</tr>\n<tr>\n<td>dubakwi-index.json</td>\n<td>11</td>\n<td>14</td>\n</tr>\n<tr>\n<td>dubakwi-errors.json</td>\n<td>9</td>\n<td>8</td>\n</tr>\n<tr>\n<td>dubakwi-dlq.json</td>\n<td>6</td>\n<td>5</td>\n</tr>\n<tr>\n<td>dubakwi-recovery-operator.json</td>\n<td>13</td>\n<td>13</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>모든 실제 노드명·타입·입출력 포트·연결은 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/workflow-map.md\">워크플로우 목록 부록</a>에 있다. 팀원이 만든 모의 재생 화면의 노드 수를 현행 JSON 수로 사용하지 않는다.</p>\n"
        },
        {
          "html": "<h2>4. 에이전트 역할 · 분기 · 병렬 · 루프</h2>\n"
        },
        {
          "html": "<h3>4.1 역할 카드</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>역할</th>\n<th>입력</th>\n<th>출력·성공 조건</th>\n<th>실패 시</th>\n<th>Code와의 경계</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>분류 L01/B10</td>\n<td>사용자 진술·허용된 기존 사실</td>\n<td>유형, 긴급도, missing, needs_human, 사실 후보</td>\n<td>자동 종료하지 않고 안전 경로</td>\n<td>B11이 형식·진술·정책을 확인하고 최종 분기</td>\n</tr>\n<tr>\n<td>검색 B14</td>\n<td>SearchRequest의 query·서버 권한</td>\n<td>출처·점수·접근등급을 가진 evidence 또는 명시적 empty</td>\n<td>검색 오류와 근거 없음 구분</td>\n<td>LLM 판단자가 아닌 검색 도구. 서버에서 컬렉션 제한</td>\n</tr>\n<tr>\n<td>답변 L02/B19</td>\n<td>질문·확인 사실·허용 근거</td>\n<td>근거 범위의 안내 초안·출처</td>\n<td>이관</td>\n<td>실제 환불·제어·종료 권한 없음</td>\n</tr>\n<tr>\n<td>검증 L03/B20</td>\n<td>질문·사실·초안·근거</td>\n<td>근거/정책/민감정보 판정</td>\n<td>미통과 시 이관</td>\n<td>B21의 금지 주장·형식 검사도 함께 통과해야 함</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>세 모델 역할은 <code>gpt-4.1-mini</code>를 사용한다. 서로 다른 역할의 모델 호출이지 독립적으로 서버·Jira 권한을 가진 직원 에이전트가 아니다.</p>\n"
        },
        {
          "html": "<h3>4.2 구조</h3>\n"
        },
        {
          "html": "<ul>\n<li><strong>분기:</strong> 긴급 → 보완 한도 → 정보 부족 → 사람 판단 → 검색 경로 순으로 정책을 적용한다. 이미 이관된 문의의 후속은 담당 역할·우선순위를 유지하고 보완 질문으로 되돌리지 않는다.</li>\n<li><strong>분기와 합류:</strong> B13에서 검색과 필요한 조회를 준비하고 B14/B15 결과를 B16에서 합친다. 이것은 두 입력의 논리적 합류이며 두 외부 호출의 실측 동시 실행·속도 향상을 입증한 수치는 없다.</li>\n<li><strong>보완 반복:</strong> 최초 문의가 1회차, 추가 입력 두 번 뒤 3회차에 한도 이관한다. 세 번째 입력에서 정보가 채워져도 한도 검사가 먼저다. 이관 후 대화 자체를 영구 금지하는 ‘총 대화 3회 제한’은 아니다.</li>\n<li><strong>재전송:</strong> 같은 요청 ID·같은 소유자·같은 입력은 저장 응답을 재사용한다. 변경된 입력/소유자 또는 동시 처리 충돌은 409 등으로 구분한다. Jira·LLM을 맹목 재호출하지 않는다.</li>\n<li><strong>담당자 작업:</strong> Jira에서 담당자 지정, <code>In Progress</code>, 내부 메모, <code>Done</code> 처리가 가능하다. 담당자 댓글 자동 전송이나 완료 알림 왕복 루프는 구현하지 않았다. 시민의 후속 조회가 최신 상태를 읽는다.</li>\n</ul>\n"
        },
        {
          "html": "<h2>5. 외부 연동 노드</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>연동</th>\n<th>인증·비밀 위치</th>\n<th>시간·재시도</th>\n<th>실패 처리</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>시민 Webhook·내부 API</td>\n<td>팀 Header Auth/n8n Credential. 원문 헤더는 업무 로그에서 제외</td>\n<td>입력·등록 검증 후 업무 진행</td>\n<td>인증/등록 실패 시 접수 전 거절</td>\n</tr>\n<tr>\n<td>사용자 API B04</td>\n<td>내부 Credential</td>\n<td>1.5초</td>\n<td>사용자 미확인·권한 미확인을 정상 시민으로 추정하지 않음</td>\n</tr>\n<tr>\n<td>OpenAI L01/L02/L03</td>\n<td>n8n Credential</td>\n<td>분류 최대 4초, 생성 최대 4초, 검증 최대 3초. 남은 예산에 따라 축소</td>\n<td>429·지연·형식/검증 실패는 안전 이관·실패 경로</td>\n</tr>\n<tr>\n<td>RAG B14</td>\n<td>대응 search Webhook의 팀 인증</td>\n<td>3초</td>\n<td>empty/error/skipped 분리, 근거 없는 생성 금지</td>\n</tr>\n<tr>\n<td>Jira Handoff B27</td>\n<td>Jira API token Credential</td>\n<td>최대 15초, 잔여 deadline에서 마무리 3.5초를 제외한 예산 적용. 외부 쓰기 자동 재시도 0</td>\n<td>생성·문맥·종료·배정·알림의 효과별 판정, known ID 보존</td>\n</tr>\n<tr>\n<td>PostgreSQL state/DLQ</td>\n<td>DB Credential</td>\n<td>조건부 갱신과 마감 검사. 모든 DB 호출의 독립 하드 timeout 실측은 없음</td>\n<td>처리권·revision 불일치 거절, 실패/미확인 보존</td>\n</tr>\n<tr>\n<td>감사·운영 알림 B35/X04</td>\n<td>내부 API. 선택 UX 전송은 서버 비밀파일</td>\n<td>각 1.5초. H11 기존 상한 2초, 선택 UX 경계 1.5초</td>\n<td>ack·거절·효과 미확인 구분. ack가 사람 열람을 뜻하지 않음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>전체 업무 deadline은 20초, 관측 실패 상한은 25초다. 일반 안내 8초는 목표이며 실제 달성 보장이 아니다. <code>WF11 max_seconds=6</code> 원 사례 기대 미충족은 결과서에 그대로 남긴다. 오류를 감추기 위해 기대값을 변경하지 않았다.</p>\n"
        },
        {
          "html": "<h2>6. 노드 간 페이로드 (연결선마다)</h2>\n"
        },
        {
          "html": "<h3>6.1 필드와 변환</h3>\n"
        },
        {
          "html": "<p><code>?</code>는 선택 필드다. ID·날짜·상태는 string, attempt는 int, enabled는 boolean이다. 아래 계약은 주요 모듈 경계를 요약하며, 모든 내부 연결선은 <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md#6-%EB%85%B8%EB%93%9C-%EA%B0%84-%ED%8E%98%EC%9D%B4%EB%A1%9C%EB%93%9C-%EC%97%B0%EA%B2%B0%EC%84%A0%EB%A7%88%EB%8B%A4\">상세 설계 6절</a>과 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/workflow-map.md\">실제 연결 부록</a>을 함께 읽는다. 오래된 설계 엣지 번호보다 실제 JSON의 노드·포트 연결을 우선한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>연결</th>\n<th>필수 필드·자료형</th>\n<th>선택 필드</th>\n<th>변환·검사</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Discord/API → B01/B02</td>\n<td>request_id:string[1..64], user:string, question:string[1..500]</td>\n<td>channel, attempt:int≥1(기본1), context, case_ref</td>\n<td>인증 헤더 제거, 입력 검사. case_ref 없으면 새 문의</td>\n</tr>\n<tr>\n<td>사용자 API → B05/B08</td>\n<td>actor.id, role:citizen/support/security, access_levels:string[]</td>\n<td>없음</td>\n<td>요청자가 쓴 역할 대신 서버 조회 결과 사용</td>\n</tr>\n<tr>\n<td>B08 → B10/B11</td>\n<td>request, actor, support, facts, deadline_at</td>\n<td>기존 state_ref·known_ticket_id</td>\n<td>사실의 진술/확인·시도·누락·불확실성을 분리하고 이번 attempt 확정</td>\n</tr>\n<tr>\n<td>B11 → B12</td>\n<td>type, urgency, missing:string[], needs_human:boolean, facts, target_ticket_id:string/null</td>\n<td>없음</td>\n<td>분류 결과를 계약으로 정규화하고 긴급·한도·부족정보 정책 적용</td>\n</tr>\n<tr>\n<td>B13 → B14</td>\n<td>request_id, enabled:boolean, query, access_levels:string[], deadline_at</td>\n<td>없음</td>\n<td>서버가 검색 허용 등급 결정</td>\n</tr>\n<tr>\n<td>B14 → B16/B17</td>\n<td>request_id, status:ok/empty/skipped/error, evidence:array, error_code:string/null</td>\n<td>각 근거의 source_url, applies_to, source_checked_at</td>\n<td>evidence에 doc/section/chunk_id/text/score:number/access_level/version 포함</td>\n</tr>\n<tr>\n<td>B13 → B15 → B16</td>\n<td>request_id, kind:lookup, enabled, actor_id, target_ticket_id:string/null → status, record:object/null, masked:int</td>\n<td>가린 연락처</td>\n<td>타인 record=null. 조회 대상과 이번 접수 분리</td>\n</tr>\n<tr>\n<td>B17 → B19 → B20/B21</td>\n<td>허용 evidence·facts → 답변 초안 → 검증 판정</td>\n<td>없음</td>\n<td>답변 근거와 정책 검증을 함께 확인</td>\n</tr>\n<tr>\n<td>B25 → Handoff</td>\n<td>state_ref, request_id, kind:process, case_id, actor_id, first_request_id, attempt, ticket_id:string/null, action:close/wait/handoff, priority, assignee_role:string/null, context, answer, sources, close_status, transition_key, deadline_at</td>\n<td>expected_case_version은 현재 null</td>\n<td>검증된 Outcome과 현재 facts 사용. 제목·카테고리·문맥 가림</td>\n</tr>\n<tr>\n<td>Handoff → B28</td>\n<td>request_id, ticket_id:string/null, state_saved:boolean, state_ref, recovery, effects, error_code:string/null</td>\n<td>case_version:int/null</td>\n<td>생성/문맥/종료/배정/알림 각각 confirmed/none/failed/unknown 검사</td>\n</tr>\n<tr>\n<td>B31/B37~39 → B32</td>\n<td>op:save, state_ref, case_id, first_request_id, attempt, expected_case_version:null, ticket_id, facts, outcome, response</td>\n<td>없음</td>\n<td>prepare/bind/finish 저장 게이트·조건부 revision 유지</td>\n</tr>\n<tr>\n<td>B33/B36 → 시민</td>\n<td>request_id, route, answer, sources:array, ticket:null/object, agents:string[], security</td>\n<td>case_ref, reason, timings</td>\n<td>보완 응답 case_ref 필수. 비이관 ticket=null, 연락처·비밀 제거</td>\n</tr>\n<tr>\n<td>X01/E01 → DLQ/알림</td>\n<td>failed_node_id, error_code, known_ticket_id:string/null, effect, recovery capsule</td>\n<td>가린 문맥</td>\n<td>전체 원문·Credential 대신 재확인에 필요한 최소 정보</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p><code>CaseFacts</code>는 summary, reported/confirmed 사실 배열, attempted_actions, missing, uncertainties, evidence_refs를 갖는다. 각 사실은 key/value/origin(user/document/api)와 선택 reference를 갖는다. <code>StateRef</code>와 복구 자료의 물리 필드는 <a href=\"../../../../docs/project/STORAGE-DESIGN.md#storage-contract\">저장소 공개 계약</a>을 단일 원본으로 사용한다.</p>\n"
        },
        {
          "html": "<h3>6.2 같은 연결의 입력·출력 예</h3>\n"
        },
        {
          "html": "<p>아래는 실제 11/09 관측의 <strong>가린 설명용 축약 예시</strong>다. 원시 JSON이나 동일 ID의 재전송용 입력은 아니다. 실제 대조 결과는 <a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/backend-followup.md\">리허설 서버 확인</a>에 있다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-json\">{&quot;request_id&quot;:&quot;demo-masked&quot;,&quot;user&quot;:&quot;citizen-masked&quot;,&quot;question&quot;:&quot;따릉이를 해외에서도 이용할 수 있나요?&quot;}\n</code></pre>\n"
        },
        {
          "html": "<p>검색 근거가 없는 경우 <code>SearchResult.status=empty</code>, <code>evidence=[]</code>를 답변 생성 성공으로 바꾸지 않는다. B17/후속 정책은 이관 Outcome을 만들고 Jira·저장 결과 확인 후 다음 의미로 응답한다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-json\">{&quot;route&quot;:&quot;담당자 이관&quot;,&quot;sources&quot;:[],&quot;reason&quot;:&quot;no_evidence&quot;,&quot;case_ref&quot;:&quot;case-masked&quot;,&quot;ticket&quot;:{&quot;ticket_id&quot;:&quot;DEMO-1&quot;,&quot;priority&quot;:&quot;normal&quot;,&quot;duplicate&quot;:false}}\n</code></pre>\n"
        },
        {
          "html": "<h2>7. 오류 처리</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>상황</th>\n<th>확인 단계</th>\n<th>처리·사용자 의미</th>\n<th>근거</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>인증·미등록·타인 조회</td>\n<td>입력/사용자/소유권 검사</td>\n<td>거절, 타인 상세 비노출</td>\n<td>D05·D06·J04, 공통 WF05~08</td>\n</tr>\n<tr>\n<td>검색 결과 없음</td>\n<td>B17</td>\n<td>추측 답변 대신 담당자 이관, 출처 없음 명시</td>\n<td>WF03, 11/09 no_evidence</td>\n</tr>\n<tr>\n<td>LLM 429·지연·불량 출력</td>\n<td>각 호출 후 정규화·Code 검사</td>\n<td>안전 이관 또는 실패; 자동 완료 금지</td>\n<td>11/07 fault 시험, WF10</td>\n</tr>\n<tr>\n<td>Jira 생성/종료/배정 실패</td>\n<td>Handoff 효과 검사·B28</td>\n<td>실제 성공한 효과와 known ID 보존, 완료 주장 금지</td>\n<td>11/06 실패→재시험, 11/07 효과 대조</td>\n</tr>\n<tr>\n<td>중복·동시 요청</td>\n<td>begin·입력 해시·처리권</td>\n<td>저장 응답 재사용 또는 409</td>\n<td>WF09 및 동시성 시험</td>\n</tr>\n<tr>\n<td>저장 실패·효과 미확인</td>\n<td>prepare/bind/save/finish</td>\n<td>needs_review·DLQ·재전송 차단, 자동 재처리 금지</td>\n<td>TC16~18의 격리/통합 증거 범위</td>\n</tr>\n<tr>\n<td>예상 밖 예외</td>\n<td>Error Workflow</td>\n<td>가린 알림·DLQ, 자기 재귀 금지</td>\n<td>코드 존재·지정·배포·실제 자동 실행은 별도 판정</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p><code>dubakwi-errors.json</code>은 존재하며 9개 노드로 구성된다. 11/07 시험 사본의 오류 경계 증거가 있지만, 현재 운영 대상 전체의 Error Workflow ID 지정·비밀 연결·자동 호출·사람 수신을 이번 문서 정리만으로 재확인한 것은 아니다. VM 기준과 실제 fault별 결과는 <a href=\"../../docs/EXECUTION-RESULT.md\">실행 결과서</a> 및 원 보고서를 따른다. 운영 알림 API 코드 존재와 사용자 보고의 Discord 수신도 구분한다.</p>\n"
        },
        {
          "html": "<p>DLQ는 실패를 숨기는 성공 저장소가 아니다. TC-07에서 목록·상세·연결 Jira GET을 확인했으며, 운영자의 복구 action과 자동 재처리 엔진은 이번 완료 범위에 없다. D10/TC-15 격리 환경이 준비되지 않은 종단 시험은 미실행으로 남긴다.</p>\n"
        },
        {
          "html": "<h2>8. 64~79일차에서 가져온 것</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>가져온 개념·자료</th>\n<th>적용 위치</th>\n<th>팀 구현에서 구체화한 점</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Trigger → 처리 → 출력, 역할 카드</td>\n<td>support Webhook, 분류·답변·검증</td>\n<td>단일 객체 계약·Code 검증·전체 deadline 추가</td>\n</tr>\n<tr>\n<td>분기·병렬·루프 구성</td>\n<td>S1~S5, 검색/조회 합류, case_ref 보완</td>\n<td>최초 포함 3회차 한도, 이미 이관된 문의의 역할·우선순위 유지</td>\n</tr>\n<tr>\n<td>청킹·임베딩·권한 검색</td>\n<td>index/search</td>\n<td>실제 안내·가상 설정 분리, 서버 권한 컬렉션, 출처 보존</td>\n</tr>\n<tr>\n<td>인증·마스킹·실패 기록</td>\n<td>입력/API/Jira/state/errors/DLQ</td>\n<td>prepare/bind/finish와 외부 효과 미확인 구분</td>\n</tr>\n<tr>\n<td>공통 사례·벤치·결과 기록</td>\n<td>cases 및 runs</td>\n<td>14유형·세부 행·assertion 수를 분리, 최초 실패 보존</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>수업 예제의 수치·Credential 이름을 실제 검증값처럼 옮기지 않았다. 과정 도구 <code>flow.py check</code>와 팀 runner의 검사 범위는 다르며, 과정 도구의 Credential allowlist 제한을 통과한 것으로 표시하지 않는다. 구체적인 당시 채택·미채택 기록은 <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md#8-6479%EC%9D%BC%EC%B0%A8%EC%97%90%EC%84%9C-%EA%B0%80%EC%A0%B8%EC%98%A8-%EA%B2%83\">상세 원본 8절</a>에 보존한다.</p>\n"
        },
        {
          "html": "<p>최종 검증·사례 판정은 <a href=\"../../docs/EXECUTION-RESULT.md\">실행 결과서</a>, 발표 대본과 이 문서의 대응은 <a href=\"speaker.html\">발표자 메모</a>에서 확인한다.</p>\n"
        }
      ]
    },
    {
      "id": "current-rag",
      "role": "R03",
      "title": "최종 제출 · RAG 아키텍처 설계서",
      "slides": [
        5,
        6
      ],
      "source": "sources/current-rag.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>RAG 아키텍처 설계서 · 두바퀴</h1>\n"
        },
        {
          "html": "<p>최종 제출본 v1.0 · 2026-11-09 KST · R03 자료 기반 R01 취합</p>\n"
        },
        {
          "html": "<p><strong>허용된 자료에서 근거를 찾고, 출처를 확인할 수 있을 때만 안내한다.</strong> 실제 안내와 교육용 가상 설정을 섞지 않고, 검색 권한을 답변 생성 전에 제한한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>현재 상태</th>\n<th>확인한 범위와 한계</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>지식</td>\n<td>문서 8개(공개 6·제한 2), 준비 청크 44개(공개 36·제한 8). manifest는 여전히 승인 대기·index_enabled=false이며 명시적 교육용 demo 준비로 사용</td>\n</tr>\n<tr>\n<td>실제 검색 저장소</td>\n<td>VM PR36도 n8n Simple Vector Store의 프로세스 메모리. PostgreSQL은 업무 상태/DLQ용이며 pgvector 배포 완료가 아님</td>\n</tr>\n<tr>\n<td>최신 기능 시험</td>\n<td>11/08 PR36 검색·권한 사례 16/16 기대 충족, QR·긴급 보안 Support 종단 별도 확인</td>\n</tr>\n<tr>\n<td>복구 관측</td>\n<td>11/08 n8n 재시작 뒤 대응 PR36 index의 UI 44 items 성공, QR 출처 응답 확인</td>\n</tr>\n<tr>\n<td>미측정</td>\n<td>저장된 최종 벡터 총수의 독립 조회, 정확한 VM 색인 시간·토큰·청구 비용. UI items 수로 대체하지 않음</td>\n</tr>\n<tr>\n<td>문서 관계</td>\n<td><a href=\"../../../../docs/project/RAG-ARCHITECTURE.md\">상세 설계와 날짜별 기록</a>, <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md\">전체 사례 근거표</a>를 보존</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>1. 원본 문서</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>내용</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>업무 지식</td>\n<td>시민용 대여·반납·고장 신고·요금/환불·개인정보/보안·후속 문의 6개, 담당자용 가상 이관·티켓 수명주기 정책 2개</td>\n</tr>\n<tr>\n<td>원자료</td>\n<td>팀이 수집한 따릉이 앱 FAQ·화면과 공개 안내. 실제 내부 SOP가 없는 부분은 교육용 가상 설정</td>\n</tr>\n<tr>\n<td>색인 입력</td>\n<td>UTF-8 Markdown. 문서 제목·절·문단·목록 구조. 원문 HTML/사진을 직접 색인하지 않음</td>\n</tr>\n<tr>\n<td>원본 관리</td>\n<td><a href=\"../../../../knowledge/manifest.json\">knowledge/manifest.json</a>의 경로·SHA-256·버전·출처·권한·승인 상태. <a href=\"../../../../knowledge/manifest.json\">public</a>과 <a href=\"../../../../knowledge/manifest.json\">restricted</a> 분리</td>\n</tr>\n<tr>\n<td>길이 실측</td>\n<td>2026-11-05의 8개 Markdown: 최소 405자·중앙 1,049자·최대 2,385자. 줄바꿈 포함 문자 수이며 토큰 수가 아님</td>\n</tr>\n<tr>\n<td>언어</td>\n<td>한국어 중심, QR 등 일부 영문 용어. 언어별 비율 미측정</td>\n</tr>\n<tr>\n<td>기준 시점</td>\n<td>manifest의 문서 확인일과 draft 버전을 유지. 제출일을 근거 자료의 최신성 재검증일로 바꾸지 않음</td>\n</tr>\n<tr>\n<td>승인·갱신</td>\n<td>출처/정책 변경 시 검토→원본/manifest 갱신→재색인→검색 검증. 정기 주기·실서비스 승인 미확정</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>기관의 실제 정책과 팀의 가정을 구분하기 위해 최종 청크에도 <code>[실제 안내]</code>와 <code>[가상 설정]</code>을 유지한다. 공개 자료라도 현재 적용 조건을 확인하지 못한 내용을 공식 확정 정책으로 설명하지 않는다. 제한 정책은 공개 청크에 합치지 않는다.</p>\n"
        },
        {
          "html": "<h2>2. 전처리 및 청킹</h2>\n"
        },
        {
          "html": "<h3>2.1 준비 과정</h3>\n"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart LR\n  A[지식 원본·manifest] --&gt; B[경로·해시·권한·demo 허용 검사]\n  B --&gt; C[문서·절·문단 분리]\n  C --&gt; D[실제 안내·가상 설정 분리]\n  D --&gt; E[청크 ID·출처·버전·권한 부착]\n  E --&gt; F[공개·제한 저장소별 임베딩]\n  F --&gt; G[ready 확인 후 검색]\n</code></pre>\n"
        },
        {
          "html": "<ul>\n<li>절 안의 문단·목록을 의미 단위로 유지하고 혼합된 실제 안내·가상 설정을 분리한다.</li>\n<li>문단 사이 오버랩은 0이다. 짧은 안내의 중복을 늘리기보다 제목·절·출처 메타데이터로 문맥을 보존한다.</li>\n<li>문서 제목과 절은 메타데이터에 저장한다. 임베딩 본문에 제목을 항상 접두사로 넣었다고 설명하지 않는다.</li>\n<li>준비 청크는 44개지만 n8n 로더가 추가 분할할 가능성이 있어 이를 최종 벡터 저장 개수와 동일시하지 않는다.</li>\n</ul>\n"
        },
        {
          "html": "<h3>2.2 비교 방법과 실제 결과</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>채택한 절·문단 단위</th>\n<th>절 전체 비교안</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>전체 준비 청크</td>\n<td>44 = 공개 36 + 제한 8</td>\n<td>41 = 공개 33 + 제한 8</td>\n</tr>\n<tr>\n<td>길이 최소 / 중앙 / 최대</td>\n<td>61 / 124.5 / 251자</td>\n<td>61 / 123 / 364자</td>\n</tr>\n<tr>\n<td>문단 오버랩</td>\n<td>0</td>\n<td>동일 절을 결합한 구조 비교</td>\n</tr>\n<tr>\n<td>직접 검색 비교의 대상</td>\n<td>공개 36개만</td>\n<td>공개 33개만</td>\n</tr>\n<tr>\n<td>같은 13개 정상 질문의 문서 hit@3</td>\n<td>13/13</td>\n<td>13/13</td>\n</tr>\n<tr>\n<td>같은 질문의 절 hit@3</td>\n<td>13/13</td>\n<td>13/13</td>\n</tr>\n<tr>\n<td>별도 무관 질문 WF03</td>\n<td>empty</td>\n<td>empty</td>\n</tr>\n<tr>\n<td>선택 근거</td>\n<td>실제 안내와 가상 설정의 경계를 보존</td>\n<td>3개 절에 두 종류가 섞임</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p><strong>hit@3</strong>는 검색 상위 3개 안에 기대 문서 또는 기대 절이 들어왔는지를 세는 지표다. 13/13은 제한된 정상 질문의 검색 결과이며 답변 정확도 100%나 전체 서비스 성공률이 아니다.</p>\n"
        },
        {
          "html": "<p>11/05 비교는 같은 공개 질문과 직접 임베딩 API·Python cosine을 사용했다. 구조 44 대 41은 전체 문서 기준, 검색 비교 36 대 33은 public-only 기준이다. 제한 자료까지 검색한 실험이나 n8n/VM 전체 실행의 비교가 아니다. 동일한 hit@3 때문에 더 빠르거나 더 정확하다고 결론 내리지 않고, 정보 유형을 섞지 않는 이유로 절·문단 방식을 선택했다. <a href=\"../../../../runs/public/20261105-120437-chunk-retrieval-comparison/summary.json\">비교 원시 요약</a></p>\n"
        },
        {
          "html": "<h2>3. 임베딩</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>선택·관측</th>\n<th>한계</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>모델</td>\n<td><code>text-embedding-3-large</code>. 과정 구성과 n8n 호환성을 바탕으로 실제 호출한 모델</td>\n<td>팀의 한국어 질문에서 다른 모델보다 우수하다는 비교는 미실행</td>\n</tr>\n<tr>\n<td>차원</td>\n<td>3,072. 로컬 실행에서 반환 벡터 1개의 길이 확인</td>\n<td>모든 VM 벡터를 다시 열어 차원을 전수 검사한 것은 아님</td>\n</tr>\n<tr>\n<td>유사도</td>\n<td>cosine similarity, 큰 점수가 우선. 로컬 n8n 1.120.4 LangChain 구현 확인</td>\n<td>현 VM 라이브러리 전체 해시 동일성은 미확인</td>\n</tr>\n<tr>\n<td>검색 개수</td>\n<td>허용된 공개/제한 저장소 각각 5개, 취합 후 상위 5개</td>\n<td>top_k 3 대 5 품질 비교 미실행</td>\n</tr>\n<tr>\n<td>최소 점수</td>\n<td>0.30, 교육용 제한 평가의 임시값</td>\n<td>사실 정확성의 보증값 아님. 출처·권한·후속 검증을 함께 적용</td>\n</tr>\n<tr>\n<td>토큰·비용</td>\n<td>11/05 직접 청킹 비교 실험 사용량 9,426토큰</td>\n<td>VM 전체 색인·최종 발표 운영의 토큰/청구 금액은 미측정. 실험 사용량을 운영비로 옮기지 않음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>차원 근거는 <a href=\"../../../../runs/public/20261105-110303-local-rag-embedding-audit/summary.json\">임베딩 확인 기록</a>이다. 모델·차원·청킹·전처리 버전은 색인과 검색에서 같아야 한다. 하나가 바뀌면 기존 벡터를 섞지 않고 다시 생성한다. 현재 가격 조회나 실제 청구 내역 확인 없이 예상 비용을 실측 금액으로 제시하지 않는다.</p>\n"
        },
        {
          "html": "<h2>4. 인덱스 및 메타데이터</h2>\n"
        },
        {
          "html": "<h3>4.1 실제 구성과 접근 통제</h3>\n"
        },
        {
          "html": "<pre><code class=\"language-mermaid\">flowchart TD\n  A[서버가 확인한 사용자 역할] --&gt; B{허용 접근 등급}\n  B --&gt;|시민| C[public 검색]\n  B --&gt;|허용 담당자| D[public + restricted 검색]\n  C --&gt; E[필수 필드·권한·점수 확인]\n  D --&gt; E\n  E --&gt; F[상위 근거·문서·절·출처 반환]\n  F --&gt; G{본체의 근거 판정}\n  G --&gt;|충분| H[답변·검증]\n  G --&gt;|없음·실패| I[보완·담당자 이관]\n</code></pre>\n"
        },
        {
          "html": "<p>역할은 요청 문장이나 클라이언트 자기소개에서 가져오지 않는다. 서버에서 확인한 <code>access_levels</code>로 검색 전에 memory key를 선택한다. 검색 결과를 받아 나중에 감추기만 하는 방식이 아니다. 제한된 권한 시험과 담당자 양성 대조를 구분해 확인했다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>구분</th>\n<th>현행</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>저장소</td>\n<td>n8n Simple Vector Store / 프로세스 메모리</td>\n</tr>\n<tr>\n<td>권한 분리</td>\n<td>public·restricted·readiness 키. 논리적 분리이며 분산 샤딩 아님</td>\n</tr>\n<tr>\n<td>VM 계열</td>\n<td>legacy와 PR36 전용 index/search는 서로 다른 namespace. PR36 Support B14와 대응 PR36 index를 한 쌍으로 사용</td>\n</tr>\n<tr>\n<td>메타데이터</td>\n<td>doc, title, section, chunk_id, access_level, type, version, source_url, source_checked_at</td>\n</tr>\n<tr>\n<td>반환 Evidence</td>\n<td>doc, section, chunk_id, text, score, access_level, version; source_url/applies_to/source_checked_at 선택</td>\n</tr>\n<tr>\n<td>미구현</td>\n<td>updated_at·제품군 필터, 일반 중복 청크 제거의 보장, 버전 alias 원자 전환, 영속 벡터 DB</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>4.2 실제 노드와 계약</h3>\n"
        },
        {
          "html": "<p>index는 11개 노드·14개 연결, search는 19개 노드·25개 연결이다. 모든 실제 이름과 포트는 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/workflow-map.md\">로컬 JSON 목록</a>에 있다. <a href=\"../../../../docs/project/RAG-ARCHITECTURE.md#4-%EC%9D%B8%EB%8D%B1%EC%8A%A4-%EB%B0%8F-%EB%A9%94%ED%83%80%EB%8D%B0%EC%9D%B4%ED%84%B0\">상세 설계 4절</a>에 내부 스키마와 연결별 변환을 보존한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>경계</th>\n<th>내용</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>본체 → 검색</td>\n<td>request_id:string, enabled:boolean, query:string, access_levels:string[], deadline_at:string</td>\n</tr>\n<tr>\n<td>입력 검사 → 검색 분기</td>\n<td>false면 skipped, 잘못된 접근 등급·준비 상태면 error. 허용 key만 선택</td>\n</tr>\n<tr>\n<td>검색 결과 → 정규화</td>\n<td>document+metadata를 Evidence로 매핑, 필수 필드·권한·점수 검사 후 상위 근거 반환</td>\n</tr>\n<tr>\n<td>검색 → 본체</td>\n<td>request_id, status:ok/empty/skipped/error, evidence:array, error_code:string/null인 객체 1개</td>\n</tr>\n<tr>\n<td>본체 → 답변/이관</td>\n<td>ok의 충분한 근거만 생성·검증에 사용. empty/error는 사유를 구분하여 정책 적용</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>RAG는 Jira 티켓을 만들거나 업무 route를 확정하지 않는다. 담당자 이관은 본체의 정책이며 검색은 근거와 상태를 반환하는 도구다. 공개 계약의 원본은 <a href=\"../../docs/WORKFLOW-DESIGN.md#6-%EB%85%B8%EB%93%9C-%EA%B0%84-%ED%8E%98%EC%9D%B4%EB%A1%9C%EB%93%9C-%EC%97%B0%EA%B2%B0%EC%84%A0%EB%A7%88%EB%8B%A4\">워크플로우 설계서</a>다.</p>\n"
        },
        {
          "html": "<h3>4.3 최신 결과의 해석</h3>\n"
        },
        {
          "html": "<ul>\n<li>11/08 13:14의 다른 검색 경로는 15/16이었다. SR-WF12의 raw query에서 기대 절이 빠진 최초 결과를 보존한다.</li>\n<li>Support가 의도를 변환한 보안 문의는 기대 근거와 긴급 이관 종단을 확인했다. raw search와 사용자 전체 경로를 같은 시험으로 바꾸지 않는다.</li>\n<li>14:22의 <strong>대응 PR36 search 16개 사례</strong>는 16/16 기대 충족이었다. 공개/제한 권한·인용 대상·empty/invalid/off 경계를 포함한다. <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">최신 matrix</a></li>\n<li>11/09 QR 리허설은 <code>rental-guide</code> 출처를 포함한 자동 답변을 확인했다. 해외 이용 질문은 근거 없음으로 이관했고 저장/감사 사유 <code>no_evidence</code>를 확인했다. <a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/backend-followup.md\">서버 대조</a></li>\n</ul>\n"
        },
        {
          "html": "<h2>5. 백업 · 복구 및 확장</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>실제 상태</th>\n<th>운영 방향·미구현 경계</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>원본 보존</td>\n<td>지식 Markdown·manifest·workflow JSON을 버전 관리</td>\n<td>원문 첨부와 비공개 실행 자료는 별도 로컬 보존</td>\n</tr>\n<tr>\n<td>메모리 소실</td>\n<td>프로세스 재시작 시 벡터 메모리 유지 보장 없음</td>\n<td>대응 버전 전량 재색인 후 ready·공개/제한 probe 확인</td>\n</tr>\n<tr>\n<td>복구 시험</td>\n<td>11/08 재시작 뒤 PR36 index UI 44 items 성공, QR 기능 회복</td>\n<td>44는 처리 입력 수 관측. 저장 벡터 전수 개수·정확한 소요시간 미측정</td>\n</tr>\n<tr>\n<td>실행 메타데이터</td>\n<td>UI 성공·기능 성공과 SQLite running/stoppedAt=null 잔류 불일치</td>\n<td>원인 미확정. 기능 결과와 색인 lifecycle을 분리 기록</td>\n</tr>\n<tr>\n<td>롤백·부분 실패</td>\n<td>원본 버전으로 재생성하는 절차 방향</td>\n<td>alias 전환·부분 배치 재시도·무중단 롤백은 미구현</td>\n</tr>\n<tr>\n<td>영속화</td>\n<td>업무 상태/DLQ는 PostgreSQL</td>\n<td>RAG의 PostgreSQL+pgvector는 후속 설계이며 현재 구현으로 표시하지 않음</td>\n</tr>\n<tr>\n<td>10배·100배</td>\n<td>분포가 같다는 가정에서 약 440/4,400 준비 청크</td>\n<td>시간·비용·품질·메모리 사용량을 배수로 확정하지 않음. 실측 후 배치/필터/파티션 검토</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>복구 증거는 <a href=\"../../../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md\">11/08 PR36 재시작·재색인</a>이다. 11/07 PostgreSQL 복원 시험과 n8n 볼륨 격리 확인은 업무 데이터/인프라 증거이며 RAG 메모리의 영속 백업 시험과 같지 않다.</p>\n"
        },
        {
          "html": "<p>발표 5~6장은 ‘정보의 경계를 보존한 지식 준비 → 권한을 확인한 검색 → 근거 기반 답변’의 두 장으로 설명한다. 청킹 비교와 시연·시험 수치는 서로 다른 조건임을 발표자 메모에 명시한다. <a href=\"speaker.html\">발표자 메모</a></p>\n"
        }
      ]
    },
    {
      "id": "current-execution",
      "role": "R05",
      "title": "최종 제출 · 워크플로우 실행 결과서",
      "slides": [
        8,
        9,
        10,
        11
      ],
      "source": "sources/current-execution.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>워크플로우 실행 결과서 · 두바퀴</h1>\n"
        },
        {
          "html": "<p>최종 제출본 v1.0 · 2026-11-09 KST · R01 실행·근거 취합</p>\n"
        },
        {
          "html": "<p><strong>대표 시민 문의의 안내·보완·이관과 Jira 담당자 처리를 확인했다. 전체 기능의 반복 안정성까지 모두 통과했다고 판정하지는 않는다.</strong> 최초 실패, 재시험, 미실행 항목을 분리했다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>최종 요약</th>\n<th>확인한 결과</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>제출 문서 추적</td>\n<td>사례 정의 60개·요구 ID 64개 모두 판정·근거·한계 연결. 연결 누락 0이며 실행 성공률이 아님</td>\n</tr>\n<tr>\n<td>검색·권한</td>\n<td>11/08 PR36 search 16/16 기대 충족. 전체 서비스 16/16을 뜻하지 않음</td>\n</tr>\n<tr>\n<td>대표 시연</td>\n<td>11/09 QR·반납 보완·근거 없음 3개 흐름, 입력 5개. 저장 결과와 감사 기록 5건 일치</td>\n</tr>\n<tr>\n<td>담당자 처리</td>\n<td>Jira 배정·In Progress·내부 메모 확인. 11/09 <code>All</code> 큐에서 완료 티켓 포함 확인</td>\n</tr>\n<tr>\n<td>미실행·제외</td>\n<td>D10/TC-15 BLOCKED / NOT RUN. TC-07 복구 action은 구현·검증 범위 밖, read-only 조회만 확인</td>\n</tr>\n<tr>\n<td>시간</td>\n<td>일반 안내 8초 목표 미달 표본 존재. 20초 업무 deadline과 원 사례 6초 기대를 구분. 연속 5분/20분 발표 실측 없음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>실행 기준과 증거의 시점</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>증거 묶음</th>\n<th>코드·환경·버전</th>\n<th>해석</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>11/07 PR36 통합</td>\n<td>업무 <code>a657890</code>, bot fix <code>1328c63</code>, runner <code>07ab2d3</code>, 팀 VM의 격리 시험 사본/실연동</td>\n<td>사례별 응답·Jira 효과·DB/DLQ·fault 결과. 원 보고서의 mock/실제/격리 구분 유지</td>\n</tr>\n<tr>\n<td>11/08 후속</td>\n<td>같은 PR36 계열의 실제 Discord/Jira·검색/권한·재색인</td>\n<td>각 보고서의 endpoint/namespace와 관측 범위 기준</td>\n</tr>\n<tr>\n<td>11/09 리허설</td>\n<td>Discord 등록 계정과 PR36 운영 경로. bot <code>pr36-1328c63</code>, API/n8n 경계 <code>pr36-a657890</code> 태그 관측</td>\n<td>이미지 태그는 전체 source digest 동일성의 증명이 아님</td>\n</tr>\n<tr>\n<td>11/09 제출 정리</td>\n<td>로컬/원격 기준 <code>main dd919d7</code>와 마감 문서 변경</td>\n<td>신규 서비스 시험 0건. JSON 노드 목록·문서·추적·발표·패키지 검사</td>\n</tr>\n<tr>\n<td>지식</td>\n<td>manifest의 draft 버전·출처 확인일 유지, 교육용 demo 사용</td>\n<td>제출일을 지식 재승인·공식 정책 최신성 확인일로 표시하지 않음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>현재 로컬 모든 workflow JSON과 VM 전체 export의 동일성은 재확인하지 않았다. 본 결과는 R01 관측·취합이며, 받지 않은 R05 승인이나 팀원 전원의 검토 완료로 표시하지 않는다.</p>\n"
        },
        {
          "html": "<h2>1. 시나리오별 시험 기록</h2>\n"
        },
        {
          "html": "<h3>1.1 전수 추적과 집계 기준</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md\">사례 60개·요구 64개 근거표</a>는 원 기대·원 완료 조건·실제 관측·남은 한계·증거 링크를 각각 보존한다. <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.json\">기계 판독 JSON</a>에서 원본 해시도 확인할 수 있다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>60개 사례의 최종 분류</th>\n<th>건수</th>\n<th>의미</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>PASS_SEARCH_SCOPE</td>\n<td>16</td>\n<td>PR36 검색 단위의 기대 결과 확인</td>\n</tr>\n<tr>\n<td>PARTIAL_HISTORICAL_RESPONSE</td>\n<td>38</td>\n<td>11/07 업무 응답 기대 충족 집합. 현행 환경 전수·수동 의미·반복 안정성까지 완료한 PASS가 아님</td>\n</tr>\n<tr>\n<td>FAIL_ORIGINAL_TIME_ASSERTION</td>\n<td>1</td>\n<td>WF11 안전 이관은 반환했으나 6초 원 시간 기대 미충족</td>\n</tr>\n<tr>\n<td>NOT_IMPLEMENTED_RECOVERY_ACTION</td>\n<td>1</td>\n<td>TC07 원 복구 action. 후속 read-only 조회 통과와 구분</td>\n</tr>\n<tr>\n<td>BLOCKED_CURRENT_SPEC</td>\n<td>1</td>\n<td>TC15 현행 격리 종단 미실행</td>\n</tr>\n<tr>\n<td>NOT_RUN_FINAL_SCOPE</td>\n<td>3</td>\n<td>과거 P11 골격 전용 명세를 현행 서비스 통과에 합산하지 않음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>공통 사례는 17행이다. WF09 두 행과 WF13 세 행을 각각 한 유형으로 묶으면 <strong>WF01~13 + WF02b = 공통 14유형</strong>이다. 정의·근거 연결은 14/14이며 기능 통과 14/14라는 주장은 아니다. 팀 세부 Code 검사 51/51·60/60·157/157 등은 특정 하네스의 assertion 수로, 공통 유형 수 또는 전체 서비스 성공률에 더하지 않는다.</p>\n"
        },
        {
          "html": "<h3>1.2 업무별 대표 결과</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>시험·기대</th>\n<th>실제 결과</th>\n<th>판정·한계</th>\n<th>근거</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>WF01 QR 안내·출처·안내 완료</td>\n<td>11/09 QR 자동 답변, rental-guide 근거, 저장/감사 일치</td>\n<td>대표 1건 확인. 지연·반복 안정성 별도</td>\n<td><a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/backend-followup.md\">리허설 대조</a></td>\n</tr>\n<tr>\n<td>WF02/02b 같은 문의 보완·한도</td>\n<td>최초와 추가 두 번을 같은 문의로 연결, attempt 1→2→3, 3회차 attempt_limit 이관</td>\n<td>티켓 재사용·한도 확인. 대화 전체를 3회로 영구 차단하는 규칙 아님</td>\n<td><a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/report.md\">리허설</a></td>\n</tr>\n<tr>\n<td>WF03 근거 없음</td>\n<td>해외 이용 질문, sources 0, no_evidence 이관</td>\n<td>검색 원시 노드 결과는 미보존, 저장/감사 사유 확인</td>\n<td><a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/backend-followup.md\">서버 대조</a></td>\n</tr>\n<tr>\n<td>WF05~08 권한·등록·공격 경계</td>\n<td>미등록/타인 문의 거절, 제한 자료 비노출, 공격 차단의 범위별 증거</td>\n<td>AUTH 7개 중 실제 API 4·통제 fixture 3. 모든 UAT에서 DB/Jira 효과까지 검사한 것은 아님</td>\n<td><a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">통합 보고서</a>, <a href=\"../../../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md\">D05</a>, <a href=\"../../../../runs/public/20261108-160000-vm-discord-j04-cross-owner-case/report.md\">J04</a></td>\n</tr>\n<tr>\n<td>WF09 재전송·동시성</td>\n<td>같은 입력 저장 응답 재사용, 변경/동시 충돌 409, 한 요청·한 Jira 효과</td>\n<td>지정 시험 조건의 관측. 모든 경쟁 조건 일반 보장으로 확대하지 않음</td>\n<td><a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">통합 보고서</a></td>\n</tr>\n<tr>\n<td>WF10~13 장애·긴급·형식</td>\n<td>LLM 고장·조회 지연·긴급 이관·입력 경계별 증거</td>\n<td>WF11 8.288초로 원 6초 기대 실패, 팀 20초 시한과 구분</td>\n<td><a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">통합 보고서</a></td>\n</tr>\n<tr>\n<td>검색/권한 SR 16개</td>\n<td>16/16 기대 결과 충족</td>\n<td>PR36 search 단위, 최종 답변 품질 전체 평가 아님</td>\n<td><a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">matrix</a></td>\n</tr>\n<tr>\n<td>J02 담당자 처리·D04 시민 조회</td>\n<td>담당자 지정·In Progress·내부 메모, 별도 완료 문의 조회</td>\n<td>댓글 자동 전달·완료 push 기능을 뜻하지 않음</td>\n<td><a href=\"../../../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md\">J02</a>, <a href=\"../../../../runs/public/20261108-144413-vm-discord-d04-lookup/report.md\">D04</a></td>\n</tr>\n<tr>\n<td>TC07 DLQ 운영</td>\n<td>목록·가린 상세·연결 Jira GET 확인</td>\n<td>복구 action/자동 재처리 미구현·범위 밖</td>\n<td><a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">조회 시험</a></td>\n</tr>\n<tr>\n<td>D10/TC15</td>\n<td>격리 재현 환경 미준비</td>\n<td>BLOCKED / NOT RUN, 운영 고장 주입으로 대체하지 않음</td>\n<td><a href=\"../../../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md\">환경 점검</a></td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>2. 실행 로그 (대표 3건: 정상 · 예외 · 이관)</h2>\n"
        },
        {
          "html": "<p>11/09 등록된 Discord 계정에서 실행한 <strong>3개 흐름·5개 요청</strong>을 사용한다. 실제 계정·문의 ID와 원시 화면은 내부 보존본에 두고 아래에는 가린 의미와 관측 단계만 기재한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>단계</th>\n<th>정상: QR 대여 안내</th>\n<th>예외: 해외 이용 근거 없음</th>\n<th>보완 후 이관: 반납 완료 미확인</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>입력</td>\n<td>QR 사용 안내 질문 1건</td>\n<td>지식 범위 밖 질문 1건</td>\n<td>같은 문의 최초 입력 + 추가 진술 2건</td>\n</tr>\n<tr>\n<td>분류·근거</td>\n<td>rental-guide 출처 1개</td>\n<td>출처 0개</td>\n<td>매 요청의 사실을 같은 문의에 누적</td>\n</tr>\n<tr>\n<td>사용자 응답</td>\n<td>자동 답변</td>\n<td>담당자 이관</td>\n<td>보완 → 보완 → 담당자 이관</td>\n</tr>\n<tr>\n<td>저장 사유</td>\n<td>안내 결과</td>\n<td>no_evidence</td>\n<td>3회차 attempt_limit</td>\n</tr>\n<tr>\n<td>Jira 관측</td>\n<td>정상 안내의 실제 종료 의미는 별도 정상 실행 증거와 함께 읽음</td>\n<td>담당자 연결 티켓</td>\n<td>같은 티켓 유지, 담당자 배정·진행 중·메모 직접 확인</td>\n</tr>\n<tr>\n<td>DB·감사</td>\n<td>completed·저장 응답·HTTP 200 일치</td>\n<td>completed·저장 응답·HTTP 200 일치</td>\n<td>세 요청 모두 completed·저장 응답·HTTP 200 일치</td>\n</tr>\n<tr>\n<td>한계</td>\n<td>노드별 최신 시간 미측정</td>\n<td>원시 검색 실행 데이터 미보존</td>\n<td>전체 대화 품질·담당자 실제 해결 완료를 뜻하지 않음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>서버 대조에서 다섯 요청의 저장 응답과 B33로 표기된 감사 메타데이터가 일치했다. 이는 보고서의 로그 라벨이며 현재 소스의 실제 HTTP 메타 기록 노드는 B35다. 최신 n8n 원시 노드 실행을 열어 확인한 것처럼 설명하지 않는다.</p>\n"
        },
        {
          "html": "<p><strong>n8n 실행 기록이 비어 있는 이유:</strong> 관측한 워크플로우 설정은 성공·실패·수동·진행 데이터 모두 <code>Do not save</code>였다. 실행 UI가 비어 있다고 요청이 실행되지 않은 것은 아니다. 별도로 일부 index/search SQLite row가 <code>running</code>/종료시각 없음으로 남는 현상은 원인 미확정이다. 사용자 응답·Jira·업무 저장·감사를 대조한 증거와 실행 저장 문제를 분리한다. <a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/report.md\">리허설 보고서</a>, <a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/backend-followup.md\">서버 후속 확인</a></p>\n"
        },
        {
          "html": "<p>보존된 노드별 정상 예시는 11/06 실행 #305다. n8n 전체 13.138초, 응답 내부 11.584초였고 검색 1.889초·생성 2.167초·검증 1.361초·Jira 약 3.200초 등을 기록했다. 최신 리허설의 시간으로 옮기지 않는다. <a href=\"../../../../docs/project/EXECUTION-RESULT.md\">상세 결과 원본</a>, <a href=\"sources/pdf-execution.html\">원자료 13쪽 공개 텍스트</a>, <a href=\"sources/pdf-execution.html\">원자료 14쪽 공개 텍스트</a>. 원문 PDF와 화면 이미지는 공개에서 제외하고 텍스트 기록을 제공합니다. 이번에 실행한 캡처가 아닙니다.</p>\n"
        },
        {
          "html": "<h2>3. 결과 요약</h2>\n"
        },
        {
          "html": "<h3>3.1 서로 합산하지 않는 수치</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>측정 묶음</th>\n<th>수치</th>\n<th>읽는 법</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>11/07 업무 통합</td>\n<td>정의 41, 실행 40, 응답 기대 충족 38, 미충족 2, 미구현 1</td>\n<td>당시 응답 기대의 집계. 현재 전 기능 공식 PASS가 아님</td>\n</tr>\n<tr>\n<td>11/07 Jira 효과 대조</td>\n<td>29사례·36단계, Jira 효과 19건 불일치 0</td>\n<td>선택한 외부 효과 검사 범위</td>\n</tr>\n<tr>\n<td>11/07 고장 효과 대조</td>\n<td>17그룹·21단계, 대조 불일치 0</td>\n<td>fault 범위의 관측, 다른 집계와 중복 가능</td>\n</tr>\n<tr>\n<td>11/08 PR36 검색</td>\n<td>16/16</td>\n<td>검색·권한·입력 경계 단위</td>\n</tr>\n<tr>\n<td>11/09 리허설</td>\n<td>3흐름·5요청, 저장/감사 대조 5건 일치</td>\n<td>최신 대표 시연 결과</td>\n</tr>\n<tr>\n<td>문서 추적</td>\n<td>60사례·64요구 모두 근거 연결</td>\n<td>검토 가능성의 완비, 실행 통과율 아님</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>3.2 시간·보안·복구</h3>\n"
        },
        {
          "html": "<ul>\n<li>정상 안내 8초는 목표다. 11/07 정상 표본 11.988초, 추가 14.817초·9.934초처럼 미달이 있었다. 목표를 달성했다고 쓰지 않는다.</li>\n<li>WF11은 안전 이관 8.288초로 원 사례 6초 assertion을 만족하지 못했다. 팀 업무 deadline 20초 안이라는 사실이 원 실패를 지우지는 않는다.</li>\n<li>과거 WF01 벤치 5회는 p50 8.062초·p95 10.692초·평균 8.572초다. 작은 표본의 p95는 사실상 최댓값이며 운영 SLA나 최신 VM 보장으로 해석하지 않는다.</li>\n<li>11/06 반복 시험은 25개 사례×3이지만 다단계 때문에 응답 수가 90이었다. 당시 22개 기대 일관·3개 실패 등의 원 보고서를 유지하며 최신 38/40과 합산하지 않는다.</li>\n<li>11/07 저장 실행 357건에서 당시 현행 비밀과 일치 0건을 확인했다. 이미 폐기한 과거 키가 남은 이력은 보존 기록의 별도 위험이며 ‘서버 모든 과거 기록에 비밀 없음’으로 확대하지 않는다.</li>\n<li>PostgreSQL 복원은 142 request·11 DLQ 수 대조, 격리 n8n은 외부 네트워크/포트 차단과 Credential 6개 복호화·workflow 60개 비교를 확인했다. 32.062초는 해당 단계의 측정이며 전체 서비스 RTO가 아니다.</li>\n<li>11/09 최종 공개 후보·제출 파일 검사는 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">마감 검증 기록</a>에 별도 기록한다. <code>tscan</code> 미제공 시 대체 검사와 그 한계를 명시한다.</li>\n</ul>\n"
        },
        {
          "html": "<h2>4. 실패 사례 (2건 이상)</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>사례</th>\n<th>최초 실패·원인</th>\n<th>조치</th>\n<th>재시험·남은 한계</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>정상 안내인데 Jira 완료를 확인하지 못함</td>\n<td>11/06 #266 completion_transition_unavailable. 후속 #279는 남은 시간 15,120ms가 요구 15,500ms보다 적음</td>\n<td>실제 Jira 종료 전이/Resolution 확인과 B17 모델 예산 조정. 응답·Jira·저장을 함께 확인하도록 대조</td>\n<td>#305 정상 1건에서 종료·저장·응답 확인. 후속 반복 2/3과 검색 오류·문구 위험을 보존. 안정성 100% 주장 금지</td>\n</tr>\n<tr>\n<td>재전송 시험이 보완 질문으로 감</td>\n<td>WF09 입력 자체에 날짜·이용권·결제 정보가 부족해 시스템이 보완을 요구. 시험 입력과 기대 경로 불일치</td>\n<td>기대를 느슨하게 바꾸지 않고 필요한 사실을 포함한 입력으로 정정</td>\n<td>같은 요청의 저장 응답 재사용 약 0.3초·추가 LLM/티켓 없음 관측. 제품 결함 수정과 시험 데이터 정정을 구분</td>\n</tr>\n<tr>\n<td>이관된 문의가 다시 보완으로 돌아감</td>\n<td>과거 TC14 후속에서 이미 이관된 맥락·역할·우선순위를 잃는 경로</td>\n<td>PR36에서 handed_off 후속 문맥을 복원하고 분기 우선순위 유지</td>\n<td>11/07 해당 응답 기대 충족. 11/09는 한도 이관 흐름의 별도 대표 증거</td>\n</tr>\n<tr>\n<td>검색 경로가 달라 근거가 빠짐</td>\n<td>11/08 legacy/PR36 namespace 교차 및 raw 보안 query의 기대 절 누락</td>\n<td>대응 index/search 쌍 확인, Support intent 변환과 단위 검색 분리 검증</td>\n<td>PR36 16/16 및 QR·긴급 Support 종단 확인. 최초 15/16은 그대로 보존</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>첫 두 사례의 상세 시각·노드·원 화면 참조는 <a href=\"../../../../docs/project/EXECUTION-RESULT.md#4-%EC%8B%A4%ED%8C%A8-%EC%82%AC%EB%A1%80-2%EA%B1%B4-%EC%9D%B4%EC%83%81\">기존 실행 결과 4절</a>, 이후 통합 결과는 <a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">11/07 보고서</a>에 있다. 새로운 고장 시험 없이 기존 근거를 재분류했다.</p>\n"
        },
        {
          "html": "<h2>5. 구현 결과 및 시연 준비</h2>\n"
        },
        {
          "html": "<h3>5.1 구현 범위</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>구분</th>\n<th>완료·확인 범위</th>\n<th>발표에서 하지 않을 주장</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>시민 문의</td>\n<td>유형 6개·경로 5개, 안내·보완·이관·소유권 조회·긴급 처리의 범위별 증거</td>\n<td>실제 기관의 환불·반납·원격 조작 완료</td>\n</tr>\n<tr>\n<td>RAG</td>\n<td>권한별 검색, 출처, 근거 없음 이관, 재색인 기능 복구</td>\n<td>영속 pgvector 구현·모든 답변 정확도 100%</td>\n</tr>\n<tr>\n<td>Jira</td>\n<td>생성/재사용·안내 종료·담당 배정·내부 메모·직접 상태 처리·후속 조회</td>\n<td>담당자 댓글 자동 전송·완료 push·시민 문제 자동 해결</td>\n</tr>\n<tr>\n<td>상태·DLQ</td>\n<td>저장 결과·처리권·효과 미확인 보존, 제한된 운영 조회</td>\n<td>자동 재처리 엔진·TC07 복구 action 완료</td>\n</tr>\n<tr>\n<td>품질·운영</td>\n<td>개별 실행의 기대/실제 대조와 일부 복구/고장 증거</td>\n<td>D10/TC15 PASS·전체 반복 안정성·모든 VM source 동일성</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>5.2 5분 시연의 확정 순서</h3>\n"
        },
        {
          "html": "<ol>\n<li>n8n에서 실제 PR36 전체 흐름을 짧게 보여준다. 팀원 HTML의 모의 재생과 실제 실행을 구분한다.</li>\n<li>Discord에서 QR 정상 문의를 실행해 안내와 출처를 확인한다.</li>\n<li>같은 반납 문의를 최초·추가 두 번으로 이어 보완 질문과 3회차 이관을 확인한다.</li>\n<li>해외 이용 질문으로 근거 없음 이관을 보여준다. 가이드의 ‘검색 결과 없음 또는 외부 API 오류’ 중 실제 확인한 전자를 사용한다.</li>\n<li>Jira <strong>All</strong> 큐에서 티켓을 열어 같은 문의의 문맥, 담당자, 상태, 내부 메모를 보여준다. 직접 처리 범위를 설명한다.</li>\n<li>저장/감사 대조 요약으로 응답뿐 아니라 처리 결과도 확인했음을 설명하고 9장 시험 결과로 돌아간다.</li>\n</ol>\n"
        },
        {
          "html": "<p>구체 입력·클릭 순서·발표 대사·예상 결과·대체 자료는 <a href=\"../../../../docs/project/presentation/demo-rehearsal-runbook.md\">시연 실행 절차</a>에 있다. 리허설의 기능 확인은 완료했으나 연속 5분·전체 20분 시간은 편성값이다. 실제 화면 최대화·스크롤·발표자 창의 현장 검수는 자동 브라우저의 로컬 파일 접근 제한으로 미확인이다.</p>\n"
        },
        {
          "html": "<p><strong>Jira All 확인:</strong> 11/09 사용자가 전체 조회로 변경하고 이름을 All로 바꿨다. 이후 읽기 전용 UI 확인에서 필터 <code>project = JBYS ORDER BY &quot;Time to resolution&quot; ASC</code>와 Done·In Progress·To Do 행을 함께 관측했다. 이전 ‘미해결 큐에 완료 티켓이 안 보임’ 현상을 현재 상태로 설명하지 않는다. 우리 작업에서 큐 조건이나 티켓은 변경하지 않았다.</p>\n"
        },
        {
          "html": "<h2>6. 제출 전 체크리스트</h2>\n"
        },
        {
          "html": "<p>원 가이드 15개 항목을 유지한다. 체크는 아래 적은 확인 범위에만 적용하며 빈칸은 현재의 한계를 뜻한다.</p>\n"
        },
        {
          "html": "<p><strong>노코드 워크플로우 설계서</strong></p>\n"
        },
        {
          "html": "<ul>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> Trigger → 처리 → 출력 흐름이 실제 구현과 일치한다. — 로컬 JSON과 대표 VM 관측 기준. VM 전체 export 동일성은 별도 미확인.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 병렬·분기·루프 구조의 사용 목적이 명확하다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 외부 연동별 인증 및 오류 처리를 기록했다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 노드 간 페이로드의 필수·선택 필드와 변환 로직을 작성했다. — 주요 경계 표와 원본 상세·실제 연결 부록 포함.</li>\n</ul>\n"
        },
        {
          "html": "<p><strong>RAG 아키텍처 설계서</strong></p>\n"
        },
        {
          "html": "<ul>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 청킹 단위·오버랩·길이 분포와 선정 근거를 작성했다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 임베딩 모델 선정 이유와 실제 벡터 차원을 기록했다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 거리 계산 방식과 인덱스·메타데이터 구조를 작성했다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 백업·복구 및 확장 방안을 작성했다. — 구현·관측·후속안을 구분.</li>\n</ul>\n"
        },
        {
          "html": "<p><strong>워크플로우 실행 결과서</strong></p>\n"
        },
        {
          "html": "<ul>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 주요 시나리오별 실행 테스트 로그가 있다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 예외 상황의 실제 처리 결과가 있다. — 모든 예외를 전수 실행했다는 뜻은 아님.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 기대 결과와 실제 결과를 구분했다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 실패 사례와 재시험 결과를 기록했다.</li>\n</ul>\n"
        },
        {
          "html": "<p><strong>공통</strong></p>\n"
        },
        {
          "html": "<ul>\n<li><input disabled=\"\" type=\"checkbox\"> 세 설계서·결과서의 내용이 실제 구현과 일치한다. — 소스/관측 범위의 일관성은 점검했으나 현 VM 모든 JSON·Credential·이미지의 전수 동일성은 확인하지 못했다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> 예시 수치를 팀의 실제 측정값으로 교체했다. — 미측정은 미측정, 계획값은 계획으로 표시.</li>\n<li><input disabled=\"\" type=\"checkbox\"> 인증정보와 개인정보가 문서·로그·저장소에 노출되지 않았다. — 제출·공개 후보 대체 검사는 별도 기록. 서버 모든 과거 원시 실행·Git 전체 이력 무노출을 보증하지 않는다.</li>\n</ul>\n"
        },
        {
          "html": "<p>체크리스트의 미확인 항목을 지우지 않고 제출한다. 최종 로컬 검사 결과·패키지·Git 기준은 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">마감 검증 기록</a>과 <a href=\"../../docs/README.md\">제출 안내</a>를 따른다. 실제 강사 제출·발표 수행·피드백은 이 문서 작성과 별도다.</p>\n"
        }
      ]
    },
    {
      "id": "current-closeout",
      "role": "R01",
      "title": "11/09 마감 상태 · v5.6",
      "slides": [
        9,
        11
      ],
      "source": "sources/current-closeout.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>구현 현황과 사용자 기준 마감 계획</h1>\n"
        },
        {
          "html": "<!-- final-closeout-current -->\n"
        },
        {
          "html": "<p><strong>11/09 현재:</strong> 최종 자료 마감을 수행했다. 이전 날짜의 ‘추적표 미완료’·‘담당자 처리 전’ 문구는 당시 기록이며 현행은 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md\">최종 근거표</a>와 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">마감 검증</a>을 따른다. 새 기능·운영 고장 시험·VM 배포는 추가하지 않았다.</p>\n"
        },
        {
          "html": "<!-- /final-closeout-current -->\n\n"
        },
        {
          "html": "<ul>\n<li>작성일: 2026-11-08 KST</li>\n<li>버전·상태: v5.6 / 코드 기준선은 <code>origin/main</code> <code>dd919d7</code>로 고정했다. PR #36과 후속 PR #46~#52가 포함된다. R02는 새 UX 개선, R01은 기존 업무 경로와 마감을 담당한다. PR36 RAG search 사례/권한 기능은 <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">16/16 통과</a> 및 두 Support 종단으로 완료 판정했다. SQLite execution row의 <code>running</code> 표기와 색인 시간 미측정은 기록상 잔여 한계이며 추가 시험 gate가 아니다. D05/J04 거부 경계와 J02 담당자 직접 처리·사용자 확인 Discord 알림 수신을 최신 근거에 반영했다. D10/TC-15는 <a href=\"../../../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md\">환경 미준비</a>로 BLOCKED/NOT RUN 종결했으며 기능 통과가 아니다. TC-07은 DLQ list/inspect 및 연결 Jira GET read-only 조회를 확인했다. 운영자 retry/recovery action은 이번 완료 범위 밖이다. 60사례·64요구의 판정/근거표와 제출용 3문서·발표·DAY82를 정리했다. <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">마감 기록</a>에서 실제 검사·패키지·Git 상태를 확인한다. 전체 상세는 <a href=\"../../../../docs/project/final-test-plan.md\">최종 시험 계획 v1.26</a>을 참조한다.</li>\n<li>기준 코드: <code>main</code> <code>dd919d7</code> (PR #36 통합본, 후속 PR #46~#52 및 P18 DLQ 조회 기록 반영; 로컬/원격 main 일치)</li>\n<li>기준 실행: <a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">PR #36 실제 VM 통합 검증</a></li>\n<li>결정 방식: 사용자는 R01이 PR #36처럼 전체 마감을 통합 추진하고 타 역할의 검증 회신을 기다리지 않도록 지시했다. 이 문서는 R01 관측·판정만 기록하며 타 역할 승인이나 미실행 시험을 만들어내지 않는다.</li>\n<li>사용자 수동 UAT 절차: <a href=\"../../../../cases/discord-jira-user-acceptance.md\">Discord·Jira 시나리오 시험 안내서</a>. 시험 계획과 기존 실행 증거를 구분하며, 현재 지원되지 않는 Jira 기반 DLQ 관리는 차단 항목으로 표시한다.</li>\n</ul>\n"
        },
        {
          "html": "<h2>1. 완료 기준</h2>\n"
        },
        {
          "html": "<p>시민은 내부 모듈을 알 필요가 없다. 지원 범위에 든 문의를 했을 때 기대한 안내·보완·조회·담당자 연결을 받고, 담당자는 Jira에서 이관 내용을 확인해 업무를 처리할 수 있어야 한다. 실패 때 시스템은 성공했다고 꾸미거나 외부 변경을 중복 실행하지 않고 운영자가 확인할 자료를 남겨야 한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>사용자·운영 결과</th>\n<th>완료 조건</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>시민 문의 처리</td>\n<td>대여·반납·고장·요금/환불·후속 조회·개인정보/보안의 설계 시나리오가 입력·권한·긴급도·보완 횟수에 맞는 안내, 보완 요청, 본인 조회, 이관 또는 거절 결과를 낸다. 근거 부족·조회 실패·모델 실패는 추측 답변으로 바꾸지 않는다.</td>\n</tr>\n<tr>\n<td>RAG·에이전트 답변</td>\n<td>허용 문서만 검색하고 답변 내용과 인용 근거가 일치한다. 공개/제한 권한, 빈 결과, 오류, 검증 실패를 실제 배포 경로에서 확인한다. 제한 근거·내부 설명·근거 없는 완료 주장이 시민 응답에 나오지 않는다.</td>\n</tr>\n<tr>\n<td>Jira 티켓 생애주기</td>\n<td>신규 접수, 같은 요청 재전송, 보완, 담당 이관, 안내 종료, 본인 조회의 티켓·상태·문맥이 서로 맞는다. 중복 생성은 없고 담당자·우선순위·필요 맥락이 보존된다.</td>\n</tr>\n<tr>\n<td>담당자 처리 가능</td>\n<td>배정된 담당자가 Jira에서 티켓과 가린 맥락을 확인하고 실제 담당 업무를 수행할 수 있다. Jira API의 알림 수락은 사람의 수신·확인으로 간주하지 않는다. Jira 변경 후 시민 조회가 실제 상태를 반영하는 경로도 확인한다.</td>\n</tr>\n<tr>\n<td>오류·DLQ·복구</td>\n<td>단계별 고장으로 성공·실패·효과 미확인을 구분한다. known Jira ID와 복구 정보가 남고 DLQ 중복 기록이 통제된다. 원 요청 종료·외부 효과·처리권 확인 없이 자동 재전송하지 않는다. 운영자의 수동 확인·해결 절차를 따라가며 범위 밖 자동 재개는 미구현으로 표시한다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>자동 해결률 자체는 완료 조건이 아니다. 안전한 담당자 이관이 해당 시나리오의 기대 결과일 수 있다. 반대로 응답 HTTP 200만으로 업무 효과를 통과 처리하지 않는다.</p>\n"
        },
        {
          "html": "<h2>2. PR #36 이후 구현·검증 기준선</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>영역</th>\n<th>현재 증거</th>\n<th>현재 판정과 빈틈</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>정상 시민 종단</td>\n<td>실제 Discord 비공개 응답 → 등록 사용자 확인 → 분류 → RAG → 답변/검증 → Jira 종료 → PostgreSQL completed/save → 독립 재조회가 일치했다. 대표 실행은 11.988초, 별도 표본은 14.817초·9.934초다.</td>\n<td>정상 경로가 실제 연결됨. 8초 목표는 충족하지 않았고 표본 수로 일반 성능을 보장하지 않는다.</td>\n</tr>\n<tr>\n<td>보완·이관·조회</td>\n<td><a href=\"../../../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md\">2026-11-07 VM Jira lifecycle</a>와 <a href=\"../../../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md\">J02 담당자 처리</a>에서 같은 synthetic 티켓 보완·상태전환·본인 조회, 담당자의 진행 처리·내부 메모를 확인했다. 담당자 Discord 알림 수신은 <a href=\"../../../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md\">사용자 확인</a>이다.</td>\n<td>담당자 처리는 확인됐다. 알림은 사용자 보고이며 독립 전송 로그가 없다. 실제 환불 완료를 뜻하지 않는다. D05·D06·J04 거부 경계는 각각의 개별 실행 범위만 통과했다.</td>\n</tr>\n<tr>\n<td>RAG와 권한</td>\n<td>PR36 <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">search matrix</a> 16/16, <a href=\"../../../../runs/public/20261108-132500-vm-pr36-rag-e2e/report.md\">QR Support E2E</a>, <a href=\"../../../../runs/public/20261108-133000-vm-pr36-rag-wf12-e2e/report.md\">SR-WF12 E2E</a>, <a href=\"../../../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md\">14:02 재시작 후 재색인·QR</a>를 확인했다.</td>\n<td>계획된 PR36 검색·권한 기능 시험과 한 번의 restart→reindex→QR 기능 경로는 확인됐다. SQLite execution row의 <code>running</code> 종료 상태 불일치와 색인 시간 미측정은 남은 관측 한계이며 추가 시험 gate가 아니다.</td>\n</tr>\n<tr>\n<td>업무·장애 회귀</td>\n<td>과거 41개 정의 표본과 2026-11-06의 25건×3회, 2026-11-08 UAT 및 개별 실행 결과를 <a href=\"../../../../docs/project/final-test-plan.md\">최종 시험 계획</a>에 연결했다.</td>\n<td>서로 다른 기준·범위의 수치를 합산해 전체 PASS로 표시하지 않는다. D10 replay와 TC-15 격리 고장 종단은 환경 미준비로 BLOCKED/NOT RUN이며 기능 통과가 아니다.</td>\n</tr>\n<tr>\n<td>UX Jira·Discord 알림</td>\n<td>PR #49는 새 UX Jira 프로젝트 유형 <code>10003</code>을 렌더 사본에 선택 적용한다(기존 사이트 기본 <code>10006</code>은 유지). PR #50은 기존 user API 프로세스에 기본 비활성 <code>POST /alerts</code>를 추가했다. 렌더러는 UX 사본의 H11/X04/E09 전송 endpoint만 내부 API로 바꾸며 canonical <code>workflows/*.json</code>은 수정하지 않는다. 알림 URL은 API 전용 비밀 파일에서 읽고 n8n JSON/실행 항목에서 분리한다.</td>\n<td>두 PR은 main 병합 및 CI 통과 상태이나 새 Jira Credential/프로젝트 연결, UX API 비밀 설정, 별도 workflow 사본 적용, 실제 Discord 전송은 아직 미검증이다. 기본 운영 환경의 알림 동작은 비활성 설정을 유지한다.</td>\n</tr>\n<tr>\n<td>저장·DLQ·복원</td>\n<td>PostgreSQL state/save/fail/DLQ와 known ID 보존·동일 요청 차단을 확인했다. <a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">TC-07 VM lookup</a>에서 migration 017 후 bounded list/sanitized inspect와 연결 Jira GET을 기존 비활성 manual test workflow에서 통과시켰다.</td>\n<td><strong>조회 slice만</strong> 통과. <code>recovery_control</code> 부재로 broader recovery contract가 미완료이고 DLQ retry/recovery action은 마감 범위에 포함되지 않는다. disposable DB 경합은 운영 RTO가 아니다. 운영 RPO/RTO·백업 주기는 확정/실측되지 않았다.</td>\n</tr>\n<tr>\n<td>보안</td>\n<td>새 저장 실행 357건에서 현재 팀·내부·Jira·DB·OpenAI·봇 비밀값 일치 0건을 확인했고 새 키/폐기 키 인증 경계를 확인했다.</td>\n<td>과거 실행 원문·백업은 별도 보존 상태다. 전체 과거자료 소거 또는 모든 보존 정책 충족으로 확대하지 않는다.</td>\n</tr>\n<tr>\n<td>복구 구현·실연동 검증</td>\n<td>Local disposable 저장 경계 및 migration 010–016 restore/live 검사와 TC-07 read-only lookup을 각각 확인했다. Migration 017의 bounded DLQ/Jira 조회도 기존 비활성 manual test workflow에서 확인했다.</td>\n<td>현재 사용자 완료 범위는 조회까지다. 운영자 retry/recovery action은 범위 밖이며 구현·검증 완료로 주장하지 않는다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>2026-11-07 Edge 웹 VM 읽기 점검</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261107-194606-vm-pr36-readonly-recheck/report.md\">읽기 전용 재점검 결과</a>는 당시 VM 토폴로지 스냅샷이다. 이후 <a href=\"../../../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md\">승인된 synthetic J01/J02/J03 표본</a>에서 이관·보완 재사용·문맥 누적·권한별 조회·Jira 완료 후 시민 <code>closed</code> 조회·DB/DLQ 상태를 확인했다. 담당자 본인의 실제 업무 수행/수신은 확인하지 않았다. core workflow 실행 UI에 저장 실행이 없어 노드별 호출·모델 시간은 확인할 수 없다. TC-15는 승인됐다. Edge 파일 업로드 경로가 막혔지만 VM n8n UI에서 게시된 PR36 support/handoff를 직접 Duplicate 할 수 있음을 <a href=\"../../../../runs/public/20261107-205221-vm-tc15-ui-duplication/report.md\">재점검</a>했다. 새 사본은 아직 게시/활성화하거나 호출하지 않았다. 먼저 만든 미게시 support 초안 사본은 TC-15 대상에서 제외했고 보존했다. WF-11, RAG 실제 VM 권한/인용 종단, 전체 VM manifest도 계속 남는다.</p>\n"
        },
        {
          "html": "<p>세부 원본: <a href=\"../../../../docs/project/SYSTEM-DESIGN.md\">시스템 설계</a>, <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md\">워크플로우 설계</a>, <a href=\"../../../../docs/project/RAG-ARCHITECTURE.md\">RAG 설계</a>, <a href=\"../../../../docs/project/STORAGE-DESIGN.md\">저장소 설계</a>, <a href=\"../../../../docs/project/EXECUTION-RESULT.md\">실행 결과서</a>, <a href=\"../../../../infra/contracts/full-system-coverage.json\">64개 요구사항 실행 매핑</a>.</p>\n"
        },
        {
          "html": "<h3>2026-11-08 VM PR36/UX 기준선 읽기 스냅샷</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md\">읽기 전용 결과</a>에서 PR36 API와 UX API가 같은 VM에 병렬 배포되어 있음을 재확인했다. 이미지 태그는 각각 <code>pr36-a657890</code>, <code>ux-6f9561b</code>이고 Docker <code>29.9.2</code>, PostgreSQL <code>16.15</code>, n8n <code>2.42.6</code>이다. 이미지 ID prefix를 기록했으며 tag suffix는 기존 Git commit으로 확인했다. 앱 이미지의 OCI revision label은 비어 있어 source provenance는 확정하지 않았다. n8n 목록은 관련 PR36 core 6개 중 5개 Published, dual-storage 4개 중 3개 Published, UX 5개 모두 Published, recovery operator는 Published 표시 없음으로 보였다. PR36 index workflow ID와 memory key에 <code>a657890</code> namespace가 들어간 것은 확인했으나, workflow 미게시·실행 이력 없음·메모리 벡터 저장 특성 때문에 현재 index 적재/문서 revision은 미확인이다. PR36 DB에는 <code>recovery_list/lookup</code>과 <code>recovery_finish</code>가 있으나 <code>recovery_control</code>은 없다. 이번 snapshot은 서비스/DB/워크플로우를 변경하지 않았다.</p>\n"
        },
        {
          "html": "<h3>열린 PR과 현재 기준선</h3>\n"
        },
        {
          "html": "<p>열린 PR의 리뷰 상태는 마감 작업의 선행 조건이 아니다. 필요한 변경은 최신 <code>main</code>과 대조해 채택 여부를 정하고, 같은 기능이 이미 들어갔으면 중복 반영하지 않는다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>PR</th>\n<th>현재 상태</th>\n<th>마감 계획에서의 처리</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>#49 Jira UX 생성 유형</td>\n<td>병합됨</td>\n<td><code>--jira-issue-type-id</code>는 비공개 렌더 사본에만 적용된다. 기존 workflow/기본 유형은 유지된다. 새 UX 프로젝트의 실제 생성·종료는 후속 시험이다.</td>\n</tr>\n<tr>\n<td>#50 Discord UX 알림 API</td>\n<td>병합됨</td>\n<td>기존 user API에 선택 <code>/alerts</code> 경계를 제공한다. 기본 비활성, 내부 인증, 단일 제한 전송, 거절/효과 미확인 구분과 무재시도다. 실제 UX VM 배포·Discord 전송은 미실행이다. <a href=\"../../../../infra/user-api-deployment.md#optional-isolated-ux-discord-egress\">배포 안내</a></td>\n</tr>\n<tr>\n<td>#44 P19 본체 후속</td>\n<td>열림·base <code>eb747df</code>·현재 비교에서 mergeable 아님</td>\n<td>J02/J03 관련 B08/B11/B23/B24/B25 변경 일부는 최신 <code>main</code>의 FL95~FL103 및 157/157 회귀로 확인된다. 그러나 PR diff에는 아직 <code>main</code>에 없는 변경도 있다. 현재 STORAGE 계약은 case_version 미지원 시 <code>null</code>을 반환하고 expected_case_version 비null이면 fail-closed하도록 정하므로, 버전 생산자/소비자 계약 없이 PR 전체를 합치지 않는다. 후보 B28은 <code>wait</code>의 <code>context_saved</code> 필수 확인을 약화하고 B25의 <code>TicketRequest</code>에서 필수 <code>deadline_at</code>을 누락한다. PR head <code>6b19fc4</code>를 현재 157사례 하네스에 직접 넣은 별도 검토에서 57/157만 통과했고 나머지는 저장 계약의 <code>invalid_state_request</code>로 실패했다. PR 전면 수용은 현재 상태에서 부적절하다.</td>\n</tr>\n<tr>\n<td>#43 LLM/시간 고장 사본</td>\n<td>열림·오래된 base</td>\n<td>고장 사본 생성기·테스트·가이드·요약 JSON의 현재 <code>main</code> blob이 PR head와 동일해 기능은 이미 기준선에 포함됐다. PR의 개발 계획 문서는 오래된 전체 계획을 담고 있어 그대로 병합하지 않는다.</td>\n</tr>\n<tr>\n<td>#45 RAG 최종 인계</td>\n<td>열림·현재 비교에서 mergeable 아님</td>\n<td>지연 probe/시험 및 인계 산출물은 현재 <code>main</code>에 동일 blob으로 포함됐다. PR의 RAG 아키텍처 파일은 최신 VM 적용 상태 머리말을 제거해 기존 문서를 후퇴시키므로 PR 그대로 병합하지 않는다. 실제 VM 권한/지연 종단은 별도 미완료다.</td>\n</tr>\n<tr>\n<td>#24 RAG 권한 시험 준비</td>\n<td>열림</td>\n<td>권한 사례와 실행 조건은 마감 세트에 반영하되 fixture 정적 검사만으로 실제 권한 종단 완료로 판정하지 않는다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>2026-11-07 21:36 KST GitHub 연결 상태 스냅샷: #36 merged, #49/#50 merged, #43 open·mergeable, #44 open·not mergeable, #45 open·not mergeable로 반환됐다. <a href=\"../../../../runs/public/20261107-214120-pr-branch-audit/report.md\">분기 비교 보고서</a>는 #43/#45의 현재 main과 같은 파일·오래된 문서 차이를 대조했다. PR이 열려 있는 것만으로 R01 통합을 막지는 않지만, 후보 계약 차이는 반영 전에 검사한다.</p>\n"
        },
        {
          "html": "<h2>3. 우선 마감 계획</h2>\n"
        },
        {
          "html": "<p>전체 사례와 수용 요구를 의존성 순으로 실행할 상세 계획은 <a href=\"../../../../docs/project/final-test-plan.md\">PR36 최종 통합 시험 계획</a>이다. 이 문서는 실행 계획이며 시험 결과를 뜻하지 않는다. 이번 계획의 시험 실행은 아직 시작하지 않았다.</p>\n"
        },
        {
          "html": "<p>R01은 사용자 지시에 따라 구현·통합·시험 창을 순차 진행한다. 타 역할의 검증 회신을 기다리는 것을 선행 조건으로 삼지 않는다. 기존 소유자·의존 코드·실제 상태를 확인하고, 대리 수정은 R01 통합 후보로 명확히 표시한다. 외부 서비스에서 실제로 하지 않은 행위를 통과 처리하지 않는다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>순서</th>\n<th>마감 묶음</th>\n<th>담당</th>\n<th>선행 조건·의존성</th>\n<th>할 일</th>\n<th>완료 기준·증거</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td>기준 버전·대상 고정</td>\n<td>R01</td>\n<td>없음. 나머지 모든 트랙의 공통 기준</td>\n<td>main <code>dd919d7</code>은 고정했다. 실행 이미지, 7개 업무 워크플로우, SQL, RAG 색인/지식, 기존 Discord/Jira/DB 연결 및 PR #49/#50 UX 확장 버전은 새 비밀 없는 VM manifest로 대조한다. 기존 실패·미확인 이력은 건드리지 않는다.</td>\n<td>실행 전/후 같은 버전 manifest, 기존 VM 상태와 작업 scope의 충돌 없음</td>\n</tr>\n<tr>\n<td>2</td>\n<td>새 UX 표현·상호작용 개선</td>\n<td>R02</td>\n<td>1 완료 후 시작. R01 핵심 트랙과 병렬 가능</td>\n<td>UX 사본의 이용자 안내 문구·화면/상호작용을 개선한다. Jira/API 연결 설정, Credential, 외부 효과와 업무 상태 전이는 R01이 기존 계약에 맞춰 구현·검증한다.</td>\n<td>UX 표현·상호작용이 설계된 사용자 기대와 맞는 R02 증거. backend 연결/비밀/업무 계약은 R01 증거로 별도 판정</td>\n</tr>\n<tr>\n<td>3</td>\n<td>새 UX 사용성 확인</td>\n<td>R02 (UX 표면) · R01 (backend)</td>\n<td>2의 UX 변경과 backend 연결 구현 후. 4~7과 병렬 가능</td>\n<td>R02는 새 UX의 문구·상호작용 기대를 확인한다. R01은 Jira 유형/담당 매핑·문맥, API 연결, ack/전송/사람 수신 구분, 424 거절·502/503/504 미확인 효과와 무재시도를 시험한다.</td>\n<td>R02 사용성 증거와 R01 Jira/API/Discord·DLQ 통합 증거를 분리 기록. 기존 시민 문의 처리/담당자 이관의 업무 결과는 R01이 직접 판정</td>\n</tr>\n<tr>\n<td>4</td>\n<td>사용자 결과 계약 정리</td>\n<td>R01</td>\n<td>1 완료. 2<del>3과 병렬 가능; 5</del>7의 시험 사례 기반</td>\n<td>기존 40개 실행 결과와 설계 시나리오를 시민 기대 결과와 Jira/DB/DLQ 효과로 연결한다. TC-15 최초 알림 미확인은 <code>unknown/partial_effect</code>와 known ID·DLQ로 확인하고, 같은 문의 후속은 기존 저장 계약의 <code>409 case_busy</code>·외부 호출 0으로 판정한다. 과거 200 기대와 실패는 보존한다. <code>alert_marker</code> DLQ dedup은 후속 차단과 분리해 모듈 시험으로 확인한다.</td>\n<td>각 사례에 입력·기대 응답·단계·티켓/담당 결과·금지 부작용·검증 근거가 연결되고 최초 불일치가 보존됨. TC-15의 각 단계가 상충 계약을 혼합하지 않음</td>\n</tr>\n<tr>\n<td>5</td>\n<td>시간 경로 계측·운영 한도 확인</td>\n<td>R01</td>\n<td>기존 VM WF-11 표본 및 설계 deadline 확인 완료</td>\n<td>가이드 <code>max_seconds: 6</code>은 예시로 유지하고 SLA로 승격하지 않는다. 기존 관측 8.288초와 20초 업무 deadline을 구분한다. 반복 성능 특성화·미측정 단계 시간은 현재 사용자 완료 기준의 추가 gate로 두지 않는다.</td>\n<td>기존 수치의 출처/해석을 구분 기록. 미측정 항목은 잔여 한계로 표시하고 통과 수치로 만들지 않음</td>\n</tr>\n<tr>\n<td>6</td>\n<td>RAG·에이전트와 Jira 수명주기 종단</td>\n<td>R01</td>\n<td>기존 VM/Jira/UAT 증거 재사용 및 11/8 표적 보강 완료</td>\n<td>핵심 경로 RAG matrix 16/16, QR·SR-WF12 Support 종단, Jira 시민/담당자 처리 및 후속 조회 결과를 같은 scope의 각 run에서 연결한다. 새 UX의 화면/사용성 확인은 R02 범위로 분리한다.</td>\n<td>계획된 PR36 RAG 시험과 J02 담당자 처리는 해당 증거 범위에서 완료. 60 사례/64 요구 ID 전체 판정표는 별도 마감 작업이며 전체 PASS를 뜻하지 않음</td>\n</tr>\n<tr>\n<td>7</td>\n<td>오류·DLQ 조회 및 장애 경계</td>\n<td>R01</td>\n<td>TC-07 VM lookup 및 개별 오류/UAT 증거 확보; D10/TC-15 준비도 확인 완료</td>\n<td>DLQ list/inspect와 연결 Jira GET까지만 사용자 완료 범위다. retry/recovery action은 이번 범위에서 제외한다. D10 replay harness 및 TC-15 격리 경로가 준비되지 않아 요청을 보내지 않았다.</td>\n<td>TC-07 조회 slice 통과, retry/recovery action은 범위 밖. D10/TC-15는 BLOCKED/NOT RUN으로 명시하고 기능 통과로 계산하지 않음</td>\n</tr>\n<tr>\n<td>8</td>\n<td>전체 회귀와 문서 마감</td>\n<td>R01 통합; UX 개선 결과는 R02</td>\n<td>2~7 완료. 미실행/외부 확인 불가는 잔여로 명시하고 완료 판정에 포함</td>\n<td>지원 범위 사용자 시나리오와 UX 사본을 정상·경계·실패·담당자 처리 묶음으로 회귀하고 결과를 설계·실행 결과·원장·시연 자료에 동기화한다.</td>\n<td>코드/설정/workflow/지식/UX bundle 버전, 보고서, 미달·미실행 한계와 재현 방법이 서로 일치</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>실행 체크리스트</h3>\n"
        },
        {
          "html": "<ul>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> <strong>1 기준 고정 (부분 완료):</strong> 저장소 기준은 <code>dd919d7</code>이다. VM image/tag와 일부 workflow/DB/RAG 상태를 <a href=\"../../../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md\">읽기 전용 기준선</a>으로 기록했다. OCI source provenance, 모든 workflow JSON hash/ID·credential/config manifest는 미확인이라 VM과 저장소의 완전 동일성은 입증하지 않았다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> <strong>2 UX 분리 원칙 기록:</strong> PR #49/#50은 병합됐고 새 UX API/사본·credential 경계는 설계에 기록했다. UX 프로젝트 credential 연결, 사본 적용과 실제 UX 알림은 미검증이므로 UX 실연동 완료로 보지 않는다.</li>\n<li><input disabled=\"\" type=\"checkbox\"> <strong>3 UX 실연동:</strong> 새 UX 프로젝트의 Jira 연결 및 PR #50 Discord 알림 endpoint/credential/오류 경계는 VM에 적용·시험하지 않았다. R02 UX 테스트와 R01 기존 업무 경로 판정을 섞지 않는다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> <strong>4 결과 계약/요구 추적:</strong> <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md\">60사례·64요구</a>의 원 기대·개별 판정·근거·한계를 연결했다. 자료 연결의 완료이며 전체 실행 PASS가 아니다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> <strong>5 시간 계약 해석:</strong> 가이드 6초는 예시이며 VM 관측 8.288초와 20초 업무 deadline을 구분했다. 반복 성능 특성화와 index duration은 추가 완료 gate가 아니라 미측정 한계로 남긴다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> <strong>6 RAG/Jira 핵심 증거:</strong> PR36 RAG matrix 16/16, QR·SR-WF12 Support 종단, J02 담당자 직접 처리 및 사용자가 확인한 알림 수신은 각 보고서의 범위에서 확인됐다. <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">RAG matrix</a>, <a href=\"../../../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md\">J02</a>, <a href=\"../../../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md\">알림 수신 확인</a>. 이는 60/64 전수 완료를 뜻하지 않는다.</li>\n<li><input checked=\"\" disabled=\"\" type=\"checkbox\"> <strong>7 DLQ 조회/장애 경계 판정:</strong> <a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">TC-07 lookup</a>에서 bounded list/inspect와 Jira GET을 확인했다. 운영자 retry/recovery action은 이번 사용자 완료 범위 밖이다. <a href=\"../../../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md\">D10/TC-15 준비도</a>에서 두 항목은 BLOCKED/NOT RUN으로 종결했으며 기능 통과로 세지 않는다.</li>\n<li><input disabled=\"\" type=\"checkbox\"> <strong>8 최종 제출 마감:</strong> 제출용 3문서·DAY82·12장 발표/메모·근거 부록을 정리했고 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">최종 검사 기록</a>에 패키지·Git 결과를 취합한다. 실제 강사 제출·현장 발표·전수 VM 재현은 미관측으로 유지한다.</li>\n</ul>\n"
        },
        {
          "html": "<p>각 체크는 해당 행의 완료 기준과 증거가 모두 충족된 뒤에만 표시한다. R02 새 UX 개선과 R01 핵심 업무 로직 마감은 별도 판정한다. 기존 문의 처리 경로의 미실행 필수 항목은 R01 마감에서 직접 검증한다. UX 개선 결과는 구분해 기록하되 R02 회신은 R01 핵심 트랙의 선행 조건이 아니다.</p>\n"
        },
        {
          "html": "<blockquote>\n<p><strong>범위 정정:</strong> 아래 TC-07 수동 재처리 세부 계획은 구현 후보와 과거 검토를 보존한 설계 기록이다. 현재 사용자가 확정한 완료 범위는 DLQ 조회(list/inspect)와 연결 Jira 정보 GET까지이며, 재시도·복구 action 구현/검증은 이번 마감의 요구사항이나 차단 조건이 아니다.</p>\n</blockquote>\n"
        },
        {
          "html": "<h3>TC-07 수동 재처리 세부 계획 — 과거 설계 기록, 현행 범위 제외</h3>\n"
        },
        {
          "html": "<p>기준은 <a href=\"../../../../docs/project/STORAGE-DESIGN.md\">저장소 설계 4.2~4.3</a>이다. 자동 재시도 엔진 대신 운영자가 외부 Jira 효과를 대조·수행한 뒤 실패 단계만 저장소 처리권으로 재개하는 절차다. finish 복원 slice는 VM inspect까지 확인했으며 실제 Jira 없는 fixture라 VM finish는 실행하지 않았다. <a href=\"../../../../runs/public/20261108-010000-local-tc07-complete-contract/report.md\">저장 경계 시험</a>에서 migrations 011~016의 CAS claim/resume/release/verified complete를 확인했고, <a href=\"../../../../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md\">후속 producer 시험</a>에서 close/assign 및 H61 context_update 인자 보존 6/6을 확인했다. create/alert 및 검증 snapshot 없는 context_update는 replay 가능하지 않다. 실제 Jira action은 운영자가 외부에서 확인/수행하며 VM migration/live 시험과 crash lease 운영은 미완료다.</p>\n"
        },
        {
          "html": "<p>현재 최신 <a href=\"../../../../runs/public/20261108-073512-local-tc07-unknown-effect-release/report.md\">통합 local contract</a>은 migrations 001<del>016와 finish·claim/release·unknown effect SQL 계약 3종을 통과했다. <a href=\"../../../../runs/public/20261108-085318-vm-tc07-recovery-deploy/report.md\">VM 적용 결과</a>는 migrations 010</del>016, restore DB 동시 claim 1승/1충돌과 release 복귀, live operator-only inspect를 확인했다. H36 close·H42 assign·검증된 H61 snapshot의 producer capsule은 <a href=\"../../../../runs/public/20261108-071500-local-tc07-handoff-capsules/report.md\">fixture 6/6</a>이다. 외부 Jira/Discord effect는 운영자가 수행하는 설계이며 실제 수행/검증, 전용 LOGIN/Credential, inactive workflow import, stale crash-lease 운영 절차는 남아 있다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>단계</th>\n<th>선행 조건</th>\n<th>작업</th>\n<th>완료 증거</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>7.1 계약 고정</td>\n<td>STORAGE-DESIGN 4.2~4.3, TC-07, 오류 복구 인계 대조</td>\n<td>운영자 호출 경계, 허용 RecoveryCapsule action, <code>failed</code>와 <code>unknown</code>의 재개 조건, 중단 시 pending 복귀를 고정한다. 첫 vertical slice는 known Jira ID·저장된 Response가 있는 TC-06-v1 <code>finish</code> 실패다.</td>\n<td>TC-07에 step·고장·해제·기대 상태가 채워지고 상태/필드/오류 의미가 문서 간 일치. 생성 응답 unknown인 TC-05는 기존 Jira 조회 연결 식별자를 확인하기 전 실행 범위에서 제외</td>\n</tr>\n<tr>\n<td>7.2 저장소 CAS</td>\n<td>7.1 완료</td>\n<td>임의 행 수정 없이 기존 state/DLQ 함수 경계를 확장한다. scope·request_id·owner·input_hash·기대 revision·원 실행 ID·DLQ ID/revision을 대조한다. 단일 operator만 claim하고 <code>failed/unknown→processing</code>에 새 execution_id/state revision/StateRef를 발급한다. 미실행/재개 불가 시 실행 종료 후 최신 revision으로 <code>reprocessing→pending</code>을 조건부 복귀하고 사유를 남긴다.</td>\n<td>migration 011~014 구현. failed/unknown CAS resume, 새 StateRef, 재개 실행 실패 후 failed/pending 복귀를 <a href=\"../../../../runs/public/20261108-005000-local-tc07-resume-contract/report.md\">disposable 계약</a>에서 통과. stale/중복·unknown effect 거부와 동시 claim 1승은 <a href=\"../../../../runs/public/20261108-004000-local-tc07-postchecks/report.md\">저장계약 시험</a> 통과. 7.2 저장 layer 통과, VM migration 검증은 대기</td>\n</tr>\n<tr>\n<td>7.3 실패 단계 드라이버</td>\n<td>7.2 disposable DB 계약 통과</td>\n<td><code>dubakwi-dlq</code>의 수동 operator 절차에서 DLQ capsule의 action과 인자를 확인하고, Jira/Discord에서 실패 효과만 실제 수행·검증한 뒤 <code>complete</code>를 제출한다. 인자가 없거나 효과가 unknown이면 claim 자체를 거부하고 pending/manual review로 둔다. 자동 전체 workflow replay는 하지 않는다.</td>\n<td><code>recovery_complete</code> 저장 contract가 verified effect·Response·Jira link·비대상 효과를 재검증하고 state completed/DLQ resolved를 원자 저장. Jira-ref args-null capsule 거부·중복 complete 거부 시험 통과. 실제 Jira/Discord action 수행은 live 미검증; capsule producer에 안전한 payload를 추가하고 action별 운영 지침/실연동 결과를 보완해야 함</td>\n</tr>\n<tr>\n<td>7.4 실패·경합 사례</td>\n<td>7.3 통과</td>\n<td>TC-07 기본 경로와 v1 고장 복구 전, v2 동시 운영자 경합을 구체화한다. finish 복구, known Jira ID bind, Jira 변경 직전 상태 재조회, 알림 미전송만 1회 시도를 action별로 시험한다. claim 뒤 복구 실패 시 요청은 failed/unknown, DLQ는 pending과 사유를 보존한다. 성공 뒤 같은 request_id replay를 검사한다.</td>\n<td>위험 외부 효과 재호출 0, 티켓 수 불변, 상태/DLQ revision·execution 이력 보존, stale/동시 claim 1승, alert 효과 상태별 호출 수, 후속 request replay 확인</td>\n</tr>\n<tr>\n<td>7.5 격리·VM 시험</td>\n<td>7.4 로컬 계약·workflow mock 통과</td>\n<td>PostgreSQL 16.15 disposable DB에 <code>001~009</code>와 신규 마이그레이션을 적용해 함수·경합 계약을 실행한다. restore 통과 후 fresh private backup과 hash가 일치하는 reviewed source로 live migration을 적용한다. operator role inspect까지만 확인하고 dedicated LOGIN/Credential·inactive workflow import를 별도 gate로 둔다. 운영 DB 초기화는 금지한다.</td>\n<td><a href=\"../../../../runs/public/20261108-085318-vm-tc07-recovery-deploy/report.md\">VM recovery 결과</a>에 migrations 010~016 적용·권한·inspect·경합 결과를 기록했다. 전체 action 복구와 Jira/Discord 외부 효과 대조는 별도 시험이며 완료 전이다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p><strong>TC-07 완료 기준:</strong> 유효한 pending DLQ만 단 한 운영자가 claim한다. 원 실행 종료, scope·owner·입력 일치, known Jira 효과와 recovery 자료가 확인된 경우에만 새 execution/state revision으로 재개한다. 지정 실패 단계만 처리해 request_state를 completed, DLQ를 resolution과 함께 resolved로 저장한다. 동일 request_id는 외부 호출 없이 기존 응답을 replay한다. action별 성공 단계 재호출은 없고, alert는 미전송으로 확인된 경우만 한 번 보내며 이미 전송/미확인인 경우 보내지 않는다. 조건 불충족·미지원·미확인 효과는 재실행하지 않고 pending/unknown 또는 <code>manual_required</code>로 보존한다. 각 결과는 실제 시험 환경을 명시한다.</p>\n"
        },
        {
          "html": "<h3>우선순위와 범위 경계</h3>\n"
        },
        {
          "html": "<ol>\n<li>R01이 기본 <code>main</code>과 격리 경계를 고정하고 기존 문의 처리 로직·RAG/에이전트·Jira 수명주기·담당자 이관·DLQ/복구를 통합 마감한다. R02는 새 UX의 화면·문구·상호작용 개선만 맡는다. UX 사본의 Jira/API/Discord 동작과 기존 경로의 업무 로직·연동·실행 검증은 R01이 맡는다.</li>\n<li>WF-11 <code>max_seconds: 6</code>은 guide 예시이므로 SLA로 승격하지 않는다. 8.288초 관측을 보존하고, 시스템 운영 한도인 20초 deadline과 25초 관측 실패 상한에 대해 반복 측정한다.</li>\n<li>RAG 권한별 종단, 담당자의 Jira 처리와 시민 후속 조회를 확인한다.</li>\n<li>TC-15를 제외한 핵심 정상/장애/DLQ 경로와 담당자 처리 및 시민 후속 조회를 직접 마무리한다. 새 UX 개선 결과는 별도 증거로 받으면 반영하되, R02의 작업이나 회신을 핵심 로직 검증의 선행 조건으로 두지 않는다. 사람 수신을 확인할 수 없으면 미확인으로 남긴다.</li>\n<li>TC-15는 사용자가 지시한 대로 다른 마감 작업 뒤 마지막 VM 시험으로 실행한다. 시험용 인증 경로가 준비되기 전에는 보내지 않는다.</li>\n<li>직원 전용 UI, 새 서버, 전체 상담 이력, 자동 재처리 엔진, 실제 환불/요금 변경은 추가하지 않는다. PR #50의 선택 알림 API는 기존 user API를 재사용하며 별도 서버로 확장하지 않는다.</li>\n</ol>\n"
        },
        {
          "html": "<p>한 실행의 실패를 고친 재시험은 새 실행 ID로 남기고 원 실패를 유지한다. 완료 기준 미달은 공개 기대나 기존 시험값을 결과에 맞춰 낮추지 않는다. 외부 접근·실제 사용자 확인이 불가한 항목은 그 제약과 필요한 사용자 동작을 좁혀 기록한다.</p>\n"
        },
        {
          "html": "<h2>4. 문서 변경 이력</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>날짜</th>\n<th>버전</th>\n<th>변경</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>2026-11-07</td>\n<td>v0.2</td>\n<td>PR #50 UX 알림 API와 #49 Jira 렌더 설정을 기준선에 추가하고, 격리 UX 사본을 포함해 마감 순서를 갱신</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.3</td>\n<td>사용자 지시에 따라 UX 전용 사본·Jira/알림 실연동·기록을 R02 단일 담당으로 지정하고 R01 핵심 마감과 분리</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.4</td>\n<td>단계별 의존성·병렬 트랙·체크리스트·전체 완료 판정 규칙을 명시</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.5</td>\n<td>TC-15의 unknown 후속 차단과 별도 alert_marker dedup 시험을 구분하고 J01~J03 Jira 종단 조건을 명시</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.6</td>\n<td>사용자 정정에 따라 R02는 새 UX 개선만 담당하고 기존 문의 로직·연동·핵심 검증은 R01 마감 범위로 명확화</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.7</td>\n<td>Edge 웹 VM의 읽기 전용 점검을 기록하고 core/UX/mock 게시 경로와 전체 인스턴스 통계 범위를 구분. 라이브 승인 시험과 전체 manifest는 미완료로 유지</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.8</td>\n<td>승인된 synthetic Jira 표본의 보완/문맥 누적, owner/other/missing 경계, 완료 전환 후 시민 상태 조회를 추가. 담당 직원 실처리·사람 알림 수신과 나머지 마감 시험은 미확인으로 구분</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v0.9</td>\n<td>승인된 TC-15를 실행 전 점검하다가 라이브 Jira 핸드오프 JSON 미확보와 기존 후보의 로컬 원본 불일치를 확인. 외부 부작용 없이 시험 전 중단하고 선행 조건·미실행 증거를 기록</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v1.0</td>\n<td>Edge n8n에서 PR36 support/handoff JSON을 확보해 비활성 격리 후보를 준비. 사용자 승인 후 import를 시도했으나 Edge 확장 파일 접근 권한에서 중단, 재시도로 차단을 확인. 시험 요청·Jira·DLQ 효과는 미발생이며 결과를 분리 기록</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v1.1</td>\n<td>파일 업로드 대신 VM n8n Duplicate로 게시 PR36 사본을 만들 수 있음을 확인. 잘못 선택한 미게시 초안 사본은 시험에서 제외하고, 게시본 복제본은 미게시/미실행으로 기록. P18/P20 로컬 오류·DLQ 계약 검사도 별도 증거로 추가</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v1.2</td>\n<td>TC-15 handoff 사본에서 H11 HTTP Request를 Code 노드 <code>H11 담당 알림 (synthetic 503)</code>으로 정확히 교체하고 503 반환 코드 및 H43→H11→H49 배선을 확인. n8n Publish 버튼이 비활성으로 남아 synthetic 요청 2건은 아직 미실행이며, 게시 가능 경로를 계속 조사</td>\n</tr>\n<tr>\n<td>2026-11-07</td>\n<td>v1.3</td>\n<td>dual State/DLQ 의존성과 dual Support/Handoff 격리 사본을 게시했으나 VM 웹 요청 경로가 없어 TC-15 미실행. Support B01·Handoff H01을 비활성화하고 148 Python 단위/계약 검사(7 skip) 및 P18/P19/P20/recovery Node 계약을 다시 실행. 로컬 통과와 live 미판정을 분리 기록</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>| 2026-11-07 | v1.4 | P12 업무 흐름 6개 표적 Node 회귀 재실행: Jira 21 시나리오, repeated handoff 7/7 등 로컬 Code 계약 통과. live Jira/DB/담당자/알림 효과와 분리 기록 |\n| 2026-11-07 | v1.5 | PR #36/#43/#44/#45/#49/#50 원격 상태 재조회 및 PR #44 diff를 현재 STORAGE 계약·157개 support Code 검사와 대조. PR #44 전면 수용은 부적절해 버전 계약/보완 저장 gate 차이를 기록 |\n| 2026-11-07 | v1.6 | PR #44 head <code>6b19fc4</code>를 현재 support-skeleton 157사례 하네스에서 별도 실행. 57/157 통과, 100건 <code>invalid_state_request</code>; TicketRequest <code>deadline_at</code> 누락이 확인되어 무검토 수용하지 않음 |\n| 2026-11-07 | v1.7 | PR #43/#45의 head 파일을 <code>main</code> blob과 비교. 시험 도구·근거는 이미 동일 내용으로 통합됐고 잔여 문서는 전체 실행 계획/RAG 적용 상태를 후퇴시켜 PR 전체 병합 불필요 확인 |</p>\n"
        },
        {
          "html": "<h3>TC-15 재개 인증 사전조건 — 2026-11-07</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261107-214634-vm-tc15-auth-check/report.md\">Edge VM 인증 점검</a>에서 웹 SSH 로그인과 사본 상태를 확인했다. Support B01의 Header Auth는 dubakwi-team-key를 참조하지만, VM 셸 및 관련 컨테이너에 시험용 webhook 환경변수가 없었다. 인증을 우회/약화하거나 비밀을 추출하지 않아 요청은 0건이며 TC-15는 미실행이다. 두 시험 트리거는 비활성 상태로 유지했고 이번 관측으로 새 Jira/DB/DLQ/Discord 효과는 없다. 기존 credential을 안전하게 사용하는 경로가 다음 실행 선행 조건이다.</p>\n"
        },
        {
          "html": "<h3>PR36 마감 로컬 회귀 재실행 — 2026-11-07</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261107-214804-local-p26-regression/report.md\">회귀 보고서</a>와 <a href=\"../../../../runs/public/20261107-214804-local-p26-regression/summary.json\">가린 요약</a>에 현재 worktree 기준 결과를 기록했다. Python 148 통과/7 생략, Support 157/157, P12 6개 스크립트, P18 7/7, P19 producer/consumer 3개 및 AUTH-01..07 fixture, P20 16개, R04 8/8, verifier 경계 7/7이 통과했다. 모두 로컬 Code/mock/fixture이며 live RAG·TC-15·담당자 수신·WF-11 종단은 여전히 미검증이다. TC-15 인증 사전조건은 <a href=\"../../../../runs/public/20261107-214634-vm-tc15-auth-check/report.md\">별도 보고서</a>대로 미해결이다.\n| 2026-11-07 | v1.8 | TC-15 재개 시 Edge VM의 Header Auth credential 호출 경로 부재를 확인해 요청 0건·비활성 트리거를 기록. 현 worktree 기준 Python/Node 전체 관련 로컬 회귀와 문서·공개 후보 검사 결과를 별도 묶음에 남기고 live 종단 미완료를 명시 |</p>\n"
        },
        {
          "html": "<h3>전체 사례 명세 dry-run 준비도 — 2026-11-07</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261107-214910-local-p26-case-matrix/report.md\">사례 준비도 보고서</a>에서 common/team/team-extended 41건을 요청 전 dry-run으로 해석했다. 27건은 payload 준비 가능, 13건은 수동 사전조건으로 차단, TC-07은 미구현이다. 27건은 실행 통과가 아니다. TC-01/01b/14 다단계 case_ref는 dry-run의 반환 응답 부재로만 미해결이다. 실제 workflow 전체 회귀 및 TC-15 VM 종단은 여전히 미완료다.\n| 2026-11-07 | v1.9 | common/team/team-extended 사례 41건을 dry-run으로 분류(27 요청 준비, 13 선행조건 차단, TC-07 미구현). dry-run은 실제 시험 PASS가 아님을 보고서·원장에 명시 |</p>\n"
        },
        {
          "html": "<h3>전체 요구 구조 감사 및 WF-11 시간 기대 해석 — 2026-11-07</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261107-215556-local-p26-coverage/report.md\">정적 감사</a>는 64 요구/수용 시험, 12 패키지 연결을 오류 없이 확인했지만 런타임 시험 0건이다. WF-11 사례의 6초는 가이드 예시이지 시스템 SLA가 아니다. 실제 VM 응답 8.288초는 guide <code>max_seconds</code> assertion에는 미달하지만, 설계의 전체 20초 deadline을 넘지 않았고 안전 이관을 반환했다. ticket 최소예약 5초+tail 3.5초는 6초 예시를 충족할 수 없다는 이유만으로 구현 결함으로 판정하지 않는다. 반복/단계 계측은 성능 특성화로 남기고 TC-15는 후순위로 둔다.\n| 2026-11-07 | v2.0 | 64개 요구 추적 구조를 정적 검사해 매핑 오류 0을 확인하되 runtime 0을 명시. WF-11의 6초 원 기대, VM 8.288초, 최소 ticket+tail 예약 8.5초의 충돌을 기록하고 기대/효과를 낮추지 않는 수정·반복 실측을 후속으로 둠. TC-15는 후순위 |</p>\n"
        },
        {
          "html": "<p>| 2026-11-07 | v2.1 | 사용자 지시에 따라 WF-11·RAG/Jira·TC-15 외 오류/DLQ/회귀를 먼저 진행하고 TC-15 VM 시험을 마지막 순서로 이동 |</p>\n"
        },
        {
          "html": "<p>| 2026-11-07 | v2.2 | WORKFLOW-DESIGN에 WF-11 원 기대 6초와 VM 8.288초, 현행 예산 예약 8.5초를 미달 관측으로 동기화하고 변경 없이 반복 측정 선행조건을 명시 |\n| 2026-11-07 | v2.3 | TC-15를 WF-11, RAG/Jira 담당자 종단, TC-15 외 장애/DLQ 회귀 다음의 마지막 VM 시험으로 고정. 우선순위 목록의 줄바꿈을 복구하고 프로젝트 README·개발 원장의 문서 버전 참조를 동기화 |\n| 2026-11-07 | v2.4 | WF-11의 사례 <code>max_seconds: 6</code>을 guide 예시로 재분류. 8.288초는 사례 assertion 불일치로 보존하되 운영 SLA 미달/구현 결함으로 승격하지 않고 20초 deadline 기준의 성능 특성화로 계획 수정 |\n| 2026-11-07 | v2.5 | STORAGE-DESIGN 4.2<del>4.3 기준 TC-07 수동·조건부 재처리 계획 추가. TC-06-v1 finish 실패를 첫 vertical slice로 정하고 CAS·단계별 실행·경합·실패 복귀·disposable DB/VM 검증과 완료 기준 정의 |\n| 2026-11-07 | v2.6 | TC-07 finish response 복원 slice 구현. 별도 operator 함수·응답 capsule guard·disposable DB 계약과 로컬 node 검사 추가. VM 배포 및 기타 action 경로는 미완료로 기록 |\n| 2026-11-07 | v2.7 | 복구 operator용 비활성 Manual Trigger workflow와 입력 allowlist 계약 검사 추가. 실제 VM Credential 연결 및 live execution은 미확인 |\n| 2026-11-08 | v2.8 | VM parameterized inspect의 ID 오타를 수정해 <code>ok:true</code> 확인. 잘못된 Jira 없는 synthetic fixture에서 finish를 억지로 실행하지 않고, 실제 Jira-backed finish·action retry·pending 복귀·경합/중단 복귀를 미완료로 유지 |\n| 2026-11-08 | v2.9 | disposable PostgreSQL 16.15에서 migration 001</del>010과 TC-07 recovery contract를 재검증하고, runtime/operator 권한을 대조. 최초 역할 누락 설정 실패와 보정 후 통과를 함께 기록 |\n| 2026-11-08 | v3.0 | migration 011/012 operator DLQ claim/release와 dispatcher를 추가. DLQ owner/input/execution/revision CAS, pending 복귀, effect-unknown 거부, 동시 claim 단일 승자와 operator 전용 권한을 disposable DB에서 검증. request_state processing 전이/StateRef, action driver/resolve와 VM 적용은 미완료 |\n| 2026-11-08 | v3.1 | 최신 disposable SQL/권한 증거 동기화. operator workflow에 수동 JSON 입력 필드를 연결하고 strict validation 17/17을 확인. Jira action driver, request_state resume/StateRef, recovery completion/resolve, crash recovery와 VM 적용은 미완료 |\n| 2026-11-08 | v3.2 | migration 013/014로 claimed request의 failed/unknown→processing CAS와 fresh StateRef, attested failed/pending recovery release를 추가. disposable PostgreSQL 001<del>014 계약 통과 및 operator workflow resume 입력 18/18 확인. action driver·성공 complete/resolve·stale claim·VM 적용은 미완료 |\n| 2026-11-08 | v3.3 | migration 015/016의 verified completion 추가. 확인된 target effect와 비대상 효과·Response·Jira linkage를 CAS 대조해 state completed/DLQ resolved를 원자 저장. migration 011은 un-replayable Jira-ref capsule claim을 거절한다. 001</del>016 disposable 성공·실패·중복 계약 및 operator workflow 19/19 통과. 외부 Jira/Discord action은 운영자 수동 수행이며 기존 capsule payload 보강·VM/live 검증은 미완료 |\n| 2026-11-08 | v3.4 | H36 close capsule에 close_status+masked answer, H42 assign capsule에 선택 account ID+priority를 보존. Local fixture 4/4. create/context_update/alert replay, VM migrations 011<del>016 및 실제 Jira 종단은 미완료 |\n| 2026-11-08 | v3.5 | H61이 snapshot을 생성한 뒤 검증 재조회가 실패하면 해당 idempotent snapshot을 context_update payload로 보존. Focused fixture 6/6. create/alert 및 미검증 snapshot, VM/live 종단은 미완료 |\n| 2026-11-08 | v3.6 | VM read-only catalog에서 recovery dispatcher 미설치 확인. DDL/role/state/DLQ 미변경. Migration runbook에 010</del>016 순서·restore rehearsal·operator/runtime 권한 경계 보강 |\n| 2026-11-08 | v3.9 | fresh backup/restore 계약 후 VM migrations 010~016을 hash 대조·순서 적용. restore DB 동시 claim 1승/1충돌·release 복귀와 live operator-only inspect를 확인. 전용 LOGIN/Credential·inactive workflow·실제 Jira action 복구는 남음 |\n| 2026-11-08 | v4.1 | 조회 전용 DLQ list/inspect 및 linked Jira GET 워크플로우, 별도 NOLOGIN reader dispatcher와 bounded migration 017 추가. full disposable migration chain·role contract 및 33 local checks 통과; fresh restore rehearsal·리뷰·VM 적용/실 Jira GET은 pending |\n| 2026-11-08 | v4.2 | 원격/로컬 <code>main</code>을 <code>dd919d7</code>로 고정하고 <a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">P18 VM read-only DLQ/Jira 조회</a> 및 <a href=\"../../../../runs/public/20261108-104900-vm-discord-jira-uat/report.md\">Discord/Jira 핵심 UAT 부분 결과</a>를 동기화. recovery action·전체 VM artifact manifest·전체 사용자/장애 회귀는 미완료 |\n| 2026-11-08 | v4.3 | <a href=\"../../../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md\">VM PR36/UX 읽기 전용 기준선</a>을 추가. PR36·UX 병렬 배포, 이미지 태그, n8n 게시 라벨, PR36 DB의 <code>recovery_control</code> 부재를 기록하고 전체 manifest·복구 검증은 미완료로 유지 |\n| 2026-11-08 | v4.4 | 이미지 ID prefix·n8n/PostgreSQL 버전·Git tag suffix 매핑을 추가하고, OCI source provenance와 현재 RAG memory index 적재/문서 revision은 미확인임을 명시 |\n| 2026-11-08 | v4.5 | 60개 사례·64개 수용 요구와 UAT/DLQ/오류 종단을 의존성 순으로 묶은 <a href=\"../../../../docs/project/final-test-plan.md\">최종 통합 시험 계획</a>을 추가. 계획만 작성했으며 시험은 실행하지 않음 |\n| 2026-11-08 | v4.6 | 가이드/요구 ID/8개 workflow/P23–P31 산출물 연결, 기존 시험 재사용 경계 및 사례·요구별 매핑을 <a href=\"../../../../docs/project/final-test-plan.md\">최종 통합 시험 계획</a>에 추가·재검증. 서비스 시험은 미실행 |\n| 2026-11-08 | v4.7 | VM RAG 두 workflow namespace 교차 시험을 원인으로 확인. matching <code>dubakwi-index</code> 후 public/restricted/empty/invalid/off 표적 검증 5개 통과와 PR36 전용 search smoke를 기록. <a href=\"../../../../docs/project/final-test-plan.md\">최종 시험 계획 v1.6</a>·RAG 설계를 최신 결과에 맞추고 전체 16-case RAG 및 나머지 종단은 미완료로 유지 |\n| 2026-11-08 | v4.8 | 16개 VM search case를 실행해 15/16 통과, SR-WF12 mixed-intent 기대 근거 누락 1건을 기록. B13-style security query hint 검색은 통과. <code>/dubakwi-support</code>는 auth mismatch 401로 미실행, n8n restart/reindex는 workflow 중단 가능성으로 보류. <a href=\"../../../../docs/project/final-test-plan.md\">시험 계획 v1.7</a>·RAG 설계에 동기화 |\n| 2026-11-08 | v4.9 | active PR36 Support webhook을 분리 확인해 QR RAG 답변 E2E와 SR-WF12 intent-transform→security evidence→urgent Jira handoff E2E를 통과시킴. <code>/dubakwi-support</code>는 P11 skeleton endpoint로 재분류. Raw direct-search SR-WF12 failure를 보존하고, running n8n index execution 2167 때문에 restart/reindex recovery를 미완료로 유지. 시험 계획 v1.10·RAG 설계·실행 결과 동기화 |\n| 2026-11-08 | v5.0 | <a href=\"../../../../runs/public/20261108-134000-vm-discord-alert-readonly/report.md\">Discord 읽기 전용 확인</a>에서 기존 시민 UAT 응답을 재확인하고 제한된 Jira 알림 채널로 인해 담당자 실제 수신/열람을 BLOCKED로 판정. 문서 v1.11, 정적 링크/공개 후보 검사 결과를 동기화. TC-07 recovery action, TC-15 VM 고장 종단, n8n restart/reindex는 미완료 |\n| 2026-11-08 | v5.1 | 로컬 임시 메모 <code>tmp/vm-edge-web-ssh-resume.md</code>의 절차를 사용해 PR36 Index 실행 상태를 VM에서 재확인. 실행 #2167이 <code>running</code>·<code>stoppedAt=null</code>, 해당 workflow 최근 실행 1건이다. 상태 조회는 가능하나 memory-safe recovery 조건을 확보하지 못해 재시작/재색인은 실행하지 않음. 최종 시험 계획 v1.12·RAG 설계 v0.18·실행 결과를 동기화 |\n| 2026-11-08 | v5.2 | n8n execution UI에서 #2167 상세를 찾지 못했고 전체 Running filter도 비었음을 기록. 별도 legacy 색인 #2170 성공 10.699초와 이전 PR36 44청크 복구 성공을 서로 다른 범위로 유지. 최근 PR36 user RAG E2E 통과와 execution metadata 불일치를 분리 기록. n8n UI에 중지 대상이 없어 workflow/container 강제 종료 및 재색인은 보류. <a href=\"../../../../runs/public/20261108-135700-vm-rag-execution-ui-crosscheck/report.md\">대조 증거</a> |\n| 2026-11-08 | v5.4 | 11/8 RAG 16/16, D05/J04 거부 경계, J02 담당자 처리·사용자 확인 알림 수신, TC-07 read-only lookup을 반영. D10/TC-15는 환경 미준비 BLOCKED/NOT RUN, TC-07 recovery action은 미구현으로 구분. 최신 판정은 <a href=\"../../../../docs/project/final-test-plan.md\">최종 시험 계획 v1.24</a> 참조 |\n| 2026-11-08 | v5.5 | 구현 기준 현황을 다시 동기화: TC-07 recovery action은 조회 전용 사용자 완료 범위 밖으로 명확화, migration 017 조회 반영, 60 사례·64 요구 추적과 제출 산출물 점검을 잔여 마감으로 고정. 최신 시험 판정은 <a href=\"../../../../docs/project/final-test-plan.md\">최종 시험 계획 v1.25</a> 참조 |</p>\n"
        },
        {
          "html": "<h2>2026-11-08 14:01 RAG 복구 후 상태</h2>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md\">재시험 결과</a>에서 n8n 재시작, PR36 전용 index 44 items UI 성공, 후속 QR 자동 답변 및 rental-guide 근거를 확인했다. 실행 DB는 #2167과 신규 #2211을 여전히 running으로 표시해 메타데이터 동기화는 미해결이다. 따라서 사용자 QR RAG 경로는 재색인 후 확인됐지만 실행 lifecycle 관측 및 미실행 TC-15 등 다른 통합 항목은 별도 미완료로 유지한다.</p>\n"
        },
        {
          "html": "<h3>2026-11-08 PR36 RAG 표적 matrix 후속</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261108-141600-vm-pr36-rag-matrix/report.md\">PR36 직접 검색 7-case 시험</a>은 표적 assertion 7/7 통과다. 비활성·invalid·empty·citizen canary·staff restricted·mixed security query를 PR36 path 자체에서 확인했다. 최초 Web SSH 입력의 구문 오류와 수정 batch 결과는 별도 run 기록으로 구분했다. 전체 16-case search matrix와 index 실행 lifecycle/소요시간은 아직 닫지 않았다.</p>\n"
        },
        {
          "html": "<h3>2026-11-08 PR36 전체 RAG 검색 matrix와 잔여 경계</h3>\n"
        },
        {
          "html": "<p><a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">전체 16-case 시험</a>은 16/16 기대 결과 통과다. QR 및 SR-WF12 Support 종단 결과와 함께 PR36 RAG 검색·권한 기능 시험을 완료로 판정한다. SQLite execution row의 <code>running</code> 표기와 index 소요시간 미측정은 실행 관측/성능 기록의 잔여 한계로 보존하며 새 시험 gate로 만들지 않는다. J02 담당자 처리는 사용자 확인 Discord 알림 수신까지 각 실행 범위에서 확인했다. TC-07은 read-only 조회까지 확인했으며 retry/recovery action은 이번 범위 밖이다. D10/TC-15는 환경 미준비로 BLOCKED/NOT RUN 종결했다. 현재 남은 마감은 60 사례·64 요구 ID 추적, 공식 제출 파일 점검, <code>tscan</code> 및 VM 재현 여부 기록이다. 이 문서에 정의한 완료 범위를 넘는 추가 RAG 시험은 열지 않는다.</p>\n"
        }
      ]
    },
    {
      "id": "current-tests",
      "role": "R05",
      "title": "11/09 최종 시험 계획 · v1.26",
      "slides": [
        9,
        10,
        11
      ],
      "source": "sources/current-tests.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>PR36 최종 통합 시험 계획</h1>\n"
        },
        {
          "html": "<!-- final-closeout-current -->\n"
        },
        {
          "html": "<p>11/09 최종 동기화: 기존 시험 재사용을 원칙으로 60사례·64요구의 누락 없는 근거표를 작성했다. 새 서비스 요청·고장 주입은 없다. 대표 시연의 저장/감사 확인, Jira All 큐, 문서·발표·패키지 검사는 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">마감 기록</a>에 정리한다. 다음의 날짜별 계획·차단 기록은 과거 증거로 보존한다.</p>\n"
        },
        {
          "html": "<!-- /final-closeout-current -->\n\n"
        },
        {
          "html": "<ul>\n<li>작성일: 2026-11-08 KST</li>\n<li>문서 버전: v1.26 (2026-11-09 전수 근거 추적·최종 제출 정리)</li>\n<li>상태: 계획된 PR36 RAG 검색/권한 시험은 <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">matrix 16/16</a>, QR 및 SR-WF12 Support 종단 증거로 완료 판정한다. J02 담당자 처리와 사용자 확인 Discord 알림 수신, TC-07 bounded DLQ list/inspect 및 연결 Jira GET도 각 증거 범위에서 확인됐다. TC-07 retry/recovery action은 사용자가 정한 조회 전용 완료 범위 밖이며 구현·검증하지 않았다. D10 및 TC-15는 <a href=\"../../../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md\">16:05 환경 준비 점검</a>에서 실행 환경 미준비로 BLOCKED/NOT RUN 종결했다. 이는 기능 통과가 아니다. SQLite execution row의 <code>running</code> 표기와 index 처리시간 미측정은 기록상 한계이며 추가 시험 gate가 아니다. D05 미등록 계정과 J04 타인 소유 문의 거부 경계는 각각의 live 실행 범위에서 확인했다. 60개 사례·64개 요구 ID의 개별 판정·근거·한계 연결을 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md\">최종 근거표</a>로 완료했다. 제출 산출물과 검사 범위는 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">마감 기록</a>에 연결했다. 전체 실행 PASS를 뜻하지 않는다. 저장소 <code>main</code> <code>dd919d7</code>과 VM 이미지/workflow의 완전한 source mapping은 입증되지 않아 VM 결과를 이 커밋에서 실행한 것으로 합산하지 않는다.</li>\n<li>D04 추가 실행: <a href=\"../../../../runs/public/20261108-144413-vm-discord-d04-lookup/report.md\">2026-11-08 14:43 KST</a>에서 완료된 기존 synthetic 문의 상태를 Discord 비공개 응답으로 재확인했다. 사용자 화면 응답은 통과, Jira/DB read log는 미검증으로 구분한다.</li>\n<li>D03 Jira 대조: <a href=\"../../../../runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md\">2026-11-08 15:21 KST</a>에서 동일 case/first_request_id의 Jira context revision 1~3과 같은 ticket_key를 확인해 Jira 재사용·후속 누적을 통과로 보강했다. 별도 Discord ID를 사용한 미등록/타인 소유권 UI 시험과 담당자 직접 열람·알림 수신은 여전히 별도 증거가 필요하다.</li>\n<li>D06 타인 소유 문의: <a href=\"../../../../runs/public/20261108-153000-vm-discord-d06-cross-owner/report.md\">2026-11-08 15:30 KST</a>에서 현재 등록 Discord 세션으로 기존 R05의 열린 타인 소유 synthetic case_ref를 제출했다. 봇은 일반 연결값 오류만 반환했고, Jira 검색에서 시험 문구의 신규 이슈는 없었다. DB state/DLQ 직접 조회는 하지 않았다.</li>\n<li>코드 기준: 로컬/원격 <code>main</code> <code>dd919d7</code></li>\n<li>VM 기준: <a href=\"../../../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md\">초기 읽기 전용 snapshot</a> 및 <a href=\"../../../../runs/public/20261108-120800-vm-runtime-refresh/report.md\">2026-11-08 12:08 KST runtime 재확인</a>. 이미지 ID prefix/tag와 workflow 매핑은 초기 snapshot 기준이며 재확인에서는 container health/version만 확인했다. VM 시험 결과는 이미지 ID와 workflow 식별자로 기록하며 <code>dd919d7</code>에서 실행한 것처럼 합산하지 않는다.</li>\n<li>관련 원본: <a href=\"../../../../docs/project/SYSTEM-DESIGN.md\">시스템 설계</a>, <a href=\"../../../../docs/project/WORKFLOW-DESIGN.md\">워크플로우 설계</a>, <a href=\"../../../../docs/project/RAG-ARCHITECTURE.md\">RAG 설계</a>, <a href=\"../../../../docs/project/STORAGE-DESIGN.md\">저장소 설계</a>, <a href=\"../../../../docs/DEVELOPMENT-PLAN.md\">개발 원장</a>, <a href=\"../../../../docs/project/implementation-status-and-closeout-plan.md\">마감 상태</a></li>\n</ul>\n"
        },
        {
          "html": "<p>2026-11-08 v1.25 동기화 기록: 현재 구현 증거와 사용자 확정 범위를 상단 판정에 반영했다. TC-07 retry/recovery action은 이번 완료 범위 밖, D10·TC-15는 환경 미준비 BLOCKED/NOT RUN, 남은 마감은 60 사례·64 요구 ID 추적과 제출 검사로 구분했다. VM 이미지·workflow와 저장소 <code>dd919d7</code>의 완전한 source mapping은 미확인 상태로 유지한다.</p>\n"
        },
        {
          "html": "<h2>1. 목표와 시험 범위</h2>\n"
        },
        {
          "html": "<p>시민 문의의 기대 결과, 실제 Jira 효과와 담당자 처리, RAG 근거·권한, 최소 상태/DLQ, 오류 경계가 같은 요청·티켓으로 연결되는지 검증한다. 설계된 지원 기능을 전체 적용하되, 구현되지 않은 기능을 통과로 바꾸지 않는다.</p>\n"
        },
        {
          "html": "<p>계획 대상은 <code>cases/</code>의 60개 사례 정의, <code>infra/contracts/full-system-coverage.json</code>의 64개 요구 ID, 이용자 UAT D01–D10, Jira J01–J04, 운영자 DLQ list/inspect, TC-07 복구 범위 및 TC-15 고장 경로다. 같은 실행이 여러 요구를 덮을 수 있으나 각 요구 ID는 개별 판정표에 남긴다.</p>\n"
        },
        {
          "html": "<p>현재 시험 대상 구성은 PR36 API와 UX API가 병렬로 있는 VM이다. 저장소에는 8개 <code>workflows/dubakwi-*.json</code> 원본이 있다. PR36 core, dual-storage, UX VM workflow 묶음은 서로 겹칠 수 있으므로 0단계에서 실제 workflow ID·이름·활성/게시 상태·호출자를 원본별로 연결한다. 기존 문의 로직·RAG/Jira/저장 통합은 R01 시험 범위다. R02 소유의 새 UX 표현·상호작용 결과는 별도 증거로 연결하고, R02 검토 회신을 R01 시험의 선행 조건으로 두지 않는다. n8n 전체 106개 workflow를 제품 범위로 오인하지 않으며, UX 쪽 별도 5 workflow 결과도 PR36 원본 검증을 대체하지 않는다.</p>\n"
        },
        {
          "html": "<h2>2. 시험 원칙과 판정</h2>\n"
        },
        {
          "html": "<ul>\n<li><strong>기준 분리:</strong> 로컬 코드 회귀, disposable DB, VM runtime, Discord/Jira 사용자 조작, 정적 문서 검사를 각각 다른 증거로 기록한다. 서로 다른 범위의 통과 수를 합산하지 않는다.</li>\n<li><strong>효과 대조:</strong> HTTP 응답만으로 통과 처리하지 않는다. Discord 공개 범위, Jira key/상태/담당/문맥, DB state/DLQ revision, 호출 수 및 재전송 여부를 확인 가능한 실제 근거와 연결한다.</li>\n<li><strong>기존 시험 연계:</strong> 기존 run을 먼저 기준선/commit·image/workflow·설정·사례 입력·기대값·증거 범위로 대조한다. 모두 동일하고 원자료 링크가 유효한 항목은 <code>재사용(기존 증거)</code>로 표시하며 이번 실행의 새 통과 수에 합산하지 않는다. 기준 버전/설정이 다르거나 증거가 mock·표본·부분 범위이면 그 사실을 붙여 차이를 재시험한다. 원 보고서는 수정하지 않고 새 run에서 연결한다.</li>\n<li><strong>최초 결과 보존:</strong> 실패를 수정해 재시험할 때 새 실행 ID를 발급한다. 기존 실패 보고서·JSON·실행 이력을 덮지 않는다.</li>\n<li><strong>시험 데이터:</strong> 새 Jira 사례는 synthetic 내용과 시험 계정만 사용한다. 실제 환불·요금 변경·대여/반납 조작은 하지 않는다. Jira 티켓 정리·삭제는 이 계획의 일부가 아니다.</li>\n<li><strong>장애 격리:</strong> 고장 주입은 승인된 시험 사본·synthetic case·고유 case/request ID로만 수행한다. 트리거·fault switch의 켜기/끄기 상태를 기록하고 시험 뒤 원상태를 확인한다. 정상 운영 webhook으로 장애를 주입하지 않는다.</li>\n<li><strong>비밀·개인정보:</strong> Credential 이름/참조와 유무만 기록한다. 키·토큰·원시 로그·실제 이름·Discord ID·실제 Jira key·문의 원문을 공개 결과에 넣지 않는다.</li>\n<li><strong>측정:</strong> WF-11의 가이드 예시 <code>6초</code>는 운영 SLA가 아니다. 설계의 <code>20초</code> deadline과 <code>25초</code> 관측 상한을 판정 기준으로 사용하고, 지연·시도 수·외부 효과를 함께 기록한다.</li>\n</ul>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>판정</th>\n<th>적용 기준</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>통과</td>\n<td>기대 응답·Jira/저장 상태·근거·금지 부작용을 모두 관측했고 재현 가능한 증거가 있음</td>\n</tr>\n<tr>\n<td>실패</td>\n<td>실행이 완료됐고 현재 구현이 계약 기대와 다름. 최초 실패와 영향을 명시</td>\n</tr>\n<tr>\n<td>차단</td>\n<td>실행 전 필수 의존성/계정/기능이 없거나 실행 권한 경계가 충족되지 않음</td>\n</tr>\n<tr>\n<td>미실행</td>\n<td>계획됐으나 아직 실행하지 않음. 차단 사유가 확인되지 않은 단순 미수행 포함</td>\n</tr>\n<tr>\n<td>해당 없음</td>\n<td>요구가 현재 시스템 범위 밖임. 근거 문서/결정과 함께 기록</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>3. 실행 순서</h2>\n"
        },
        {
          "html": "<p>이미 확인한 VM 기준선과 과거 성공 증거를 다시 실행하지 않고 재사용한다. 단계는 시험을 위한 순서만 정하며, 계정·기능이 없는 한 사례가 다른 독립 시나리오를 막지 않는다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>순서</th>\n<th>작업 묶음</th>\n<th>실행/재사용 범위</th>\n<th>완료 기준</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td>기준선·기존 결과 고정</td>\n<td>11/8 VM snapshot/runtime, 11/7 PR36 통합, 11/8 D08 RAG smoke, 로컬 회귀, TC-07 DLQ list/inspect 결과를 근거로 연결. 실행환경에서 확인된 이미지 tag, workflow ID/게시 상태, DB migration, 시험 계정 경계를 요약</td>\n<td>동일 환경에서 수행한 결과와 다른 버전/범위 증거를 구분. 전체 source JSON/credential mapping은 참고 한계로 기록하고 시험 선행조건으로 요구하지 않음. 기준선은 확보됨; 재실행 불필요</td>\n</tr>\n<tr>\n<td>2</td>\n<td>사용자·RAG·Jira 핵심 시나리오</td>\n<td>RAG는 PR36 대응 index/search로 <code>cases/search.json</code> 16개 전부 통과했고 QR 및 SR-WF12 Support 종단도 통과했다. Jira 표본의 접수·완료 후 본인 조회, DLQ 조회는 기존 run을 재사용한다. 남은 것은 사용자 가이드의 미판정 사례 및 담당자 직접 열람/실제 알림 수신처럼 독립 증거가 필요한 항목만이다.</td>\n<td>사례 ID마다 기존 evidence 또는 신규 판정이 연결됨. 등록되지 않은 계정/별도 계정이 없으면 해당 사례만 차단한다. RAG execution metadata 상태·색인 시간 관측은 추가 gate가 아니다.</td>\n</tr>\n<tr>\n<td>3</td>\n<td>저장·DLQ 조회 및 오류 경계</td>\n<td>TC-07 VM list/inspect 및 연결 Jira GET 통과 증거와 기존 local/disposable 계약 시험을 재사용한다. 사용자가 정한 DLQ 완료 범위는 read-only 조회까지다. 운영자 retry/recovery action은 구현·검증 과제에서 제외한다.</td>\n<td>DLQ 조회와 설계상 존재하는 recovery action을 구분하고, action 미구현을 이번 완료 기준의 실패로 세지 않는다. 기존 오류 회귀는 사례별 실제 실행 범위만 기록한다.</td>\n</tr>\n<tr>\n<td>4</td>\n<td>TC-15 격리 고장 종단 (최후순위)</td>\n<td>기존 사본에 운영 PR36 webhook 참조가 있어 격리 경로가 확인되지 않은 상태다. 이미 승인된 시험 범위는 유지하되, 안전한 고유 ingress/fault 배선을 기존 설정에서 확인할 수 있을 때만 요청 2건을 수행한다.</td>\n<td>격리 경계가 현재 확인되지 않으면 TC-15만 차단으로 종결하고 정상 경로/다른 테스트를 되돌리지 않는다. 사본을 새로 구현하거나 execution metadata 관측을 추가하지 않는다.</td>\n</tr>\n<tr>\n<td>5</td>\n<td>최종 회귀·요구/산출물 마감</td>\n<td>변경이 있었던 경로만 표적 재시험하고, 최종 코드 변경이 생긴 경우 로컬 전체 회귀. 60 case·64 requirement 판정표, 실행 결과서·원장·상세 설계·필수 발표/제출 산출물, 공개 파일과 비밀 검사 정리</td>\n<td>모든 ID가 기존 근거 재사용/신규 통과/실패/차단/미실행 중 하나로 추적됨. 문서·산출물 검사를 통과하고 미완료 범위를 명시. 사용자 핵심 기준에 남은 필수 미구현이 있으면 최종 완료라고 하지 않음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h3>진행 중 중단 규칙</h3>\n"
        },
        {
          "html": "<ul>\n<li>baseline 변경이 실제로 발견된 경우에만 영향 받는 시나리오를 분리해 새 run으로 수행한다. unrelated 테스트는 계속한다.</li>\n<li>한 계정·기능·실행본이 없으면 영향을 받는 사례만 <code>차단</code>한다. 다른 사례의 테스트를 연쇄 중단하지 않는다.</li>\n<li>RAG가 현재 실제 요청에서 근거 결과를 반환하면 기능 시험을 계속한다. 검색 실패가 관측된 경우 해당 사례와 원인을 기록하되, 벡터 store 쓰기/임베딩 비용/메모리 손실을 수반하는 재색인·재시작은 별도 필요성이 확인되기 전 실행하지 않는다.</li>\n<li>실제 외부 효과가 예상과 다르거나 원 실행이 미확인 상태면 해당 효과 경로의 재호출만 멈추고 known ID와 evidence를 보존한다.</li>\n<li>시험 사본/credential 경계가 TC-15에서만 필요한 조치는 TC-15 단계에서 점검한다. 앞선 독립 작업의 선행조건으로 삼지 않는다.</li>\n</ul>\n"
        },
        {
          "html": "<h2>4. 전체 case·요구 매핑</h2>\n"
        },
        {
          "html": "<h3>4.1 <code>cases/</code> 60개 정의</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>파일</th>\n<th align=\"right\">수</th>\n<th>처리 방식</th>\n</tr>\n</thead>\n<tbody><tr>\n<td><code>cases/common.json</code></td>\n<td align=\"right\">17</td>\n<td>일반 안내, 보완 한도, 이관, 본인 조회, 시간·오류 경계. 외부 호출 없이 판정되는 것과 VM 필수 항목 분리</td>\n</tr>\n<tr>\n<td><code>cases/team.json</code></td>\n<td align=\"right\">11</td>\n<td>Jira·저장·권한 및 팀 특화 계약. 사전 case/ref가 필요한 항목은 준비 결과 기록</td>\n</tr>\n<tr>\n<td><code>cases/team-extended.json</code></td>\n<td align=\"right\">13</td>\n<td>다단계·장애 시나리오. TC05/07 등 저장·DLQ 사례는 묶음 3, TC15는 묶음 4에서 실행</td>\n</tr>\n<tr>\n<td><code>cases/search.json</code></td>\n<td align=\"right\">16</td>\n<td>RAG 검색 전용. 과거 실연동 및 현재 smoke 증거를 연결하고 미검증 검색/권한 항목을 현행 경로에서 판정</td>\n</tr>\n<tr>\n<td><code>cases/p11-entry.json</code></td>\n<td align=\"right\">3</td>\n<td>입구 mock 시험이며 VM 업무 처리나 RAG/Jira 실연동 증거로 계산하지 않음</td>\n</tr>\n<tr>\n<td><strong>합계</strong></td>\n<td align=\"right\"><strong>60</strong></td>\n<td>각 사례의 <code>x_dubakwi.id</code>마다 PASS/FAIL/BLOCKED/NOT RUN와 run/evidence 위치를 기록</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>현행 ID 집합은 다음과 같다. <code>common.json</code>: WF01, WF02, WF02b, WF03, WF04, WF05, WF06, WF07, WF08, WF09-1, WF09-2, WF10, WF11, WF12, WF13a, WF13b, WF13c (17); <code>team.json</code>: TC03a, TC03b, TC03c, TC04, TC09a, TC09b, TC09c, TC11a, TC11b, TC12, TC13 (11); <code>team-extended.json</code>: TC01, TC01b, TC02, TC05, TC06, TC07, TC08, TC10, TC14, TC15, TC16, TC17, TC18 (13); <code>search.json</code>: SR-WF01, SR-WF02, SR-WF03, SR-WF04, SR-WF12, SR-TC04, SR-TC09a, SR-TC09b, SR-WF05, SR-R01, SR-R02, SR-R03, SR-R04, SR-STAFF01, SR-STAFF02, SR-OFF (16); <code>p11-entry.json</code>: P11-01, P11-02, P11-03 (3). 합계 60이며 파일 변경 시 이 ID 목록과 수를 다시 대조한다.</p>\n"
        },
        {
          "html": "<p>원 사례의 <code>expect</code>, <code>assert</code>, 설계 <code>open_items</code>를 결과에 맞게 수정하지 않는다. 구현 기대와 원 설계가 다르면 그 사례를 <code>계약 불일치/차단</code>으로 남기고 문서 원본에 결정 이력을 남긴다. 다단계 case는 요청별 개별 응답뿐 아니라 <code>case_ref</code>, Jira key, ticket 문맥 revision, state/DLQ와 호출 수를 함께 대조한다.</p>\n"
        },
        {
          "html": "<h3>4.2 64개 수용 요구 (W01–W12)</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>패키지</th>\n<th align=\"right\">요구 수</th>\n<th>시험 내용과 주요 증거</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>W01 채널·Discord</td>\n<td align=\"right\">6</td>\n<td>등록/미등록, 비공개 응답, 같은 interaction 중복, 응답/봇 오류, 실제 수신 경계</td>\n</tr>\n<tr>\n<td>W02 support behavior</td>\n<td align=\"right\">13</td>\n<td>분류·안내·보완·이관·조회·긴급·LLM 실패·저장 게이트</td>\n</tr>\n<tr>\n<td>W03 실제 records provider</td>\n<td align=\"right\">1</td>\n<td>owner/binding 조회, Jira 결과, target write 0, 가림 응답</td>\n</tr>\n<tr>\n<td>W04 case/context restore</td>\n<td align=\"right\">3</td>\n<td>작성자/페이지·문맥 revision·facts 복원, 충돌/권한</td>\n</tr>\n<tr>\n<td>W05 Jira effects</td>\n<td align=\"right\">9</td>\n<td>create/reuse/assign/close/notify, idempotency, known ID, 외부효과 독립 조회</td>\n</tr>\n<tr>\n<td>W06 state/DLQ</td>\n<td align=\"right\">9</td>\n<td>조건부 갱신·revision·claim/release/complete·unknown effect·재생 제한</td>\n</tr>\n<tr>\n<td>W07 RAG/permissions</td>\n<td align=\"right\">9</td>\n<td>색인/chunk ACK/readiness·권한·인용·canary·오류·검색 지연</td>\n</tr>\n<tr>\n<td>W08 fault/verdict</td>\n<td align=\"right\">6</td>\n<td>고장 전/후 상태, effect count, 중지·무재실행·판정 연결</td>\n</tr>\n<tr>\n<td>W09 deployment baseline</td>\n<td align=\"right\">2</td>\n<td>코드/이미지/workflow/config 식별, 게시/비활성·credential 참조·변경 경계</td>\n</tr>\n<tr>\n<td>W10 isolated restore</td>\n<td align=\"right\">2</td>\n<td>백업·복원·권한·restart·상태/검색 복구·RPO/RTO 측정</td>\n</tr>\n<tr>\n<td>W11 operations/limits</td>\n<td align=\"right\">2</td>\n<td>보존·비밀 교체·수동 절차·미구현 범위</td>\n</tr>\n<tr>\n<td>W12 final closure</td>\n<td align=\"right\">2</td>\n<td>60 case/64 requirement evidence 연결·문서/공개/재현 일치</td>\n</tr>\n<tr>\n<td><strong>합계</strong></td>\n<td align=\"right\"><strong>64</strong></td>\n<td><code>infra/contracts/full-system-coverage.json</code>의 원 ID별 판정 보존</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>요구 ID의 원본 패키지 배정은 W01=C01,C02,C05–C08; W02=C03–C04,B01–B09,J02,J13; W03=J01; W04=J03,J12,J15; W05=J04–J11,J14; W06=S01–S09; W07=R01–R08,E03; W08=E01–E02,E04–E06,E08; W09=O01–O02; W10=E07,O03; W11=S10,O04; W12=O05–O06이다. 각 ID와 원 완료 조건을 <code>infra/contracts/full-system-coverage.json</code>과 재대조해 <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/evidence-matrix.md\">64개 전체 판정표</a>를 채웠다. PARTIAL_EVIDENCE·BLOCKED·범위 밖은 완료 PASS로 바꾸지 않았다.</p>\n"
        },
        {
          "html": "<p>이 표의 요구 수는 해당 패키지의 적용 범위이지 개별 런타임 PASS 수가 아니다. 정적 coverage 누락 검사가 0이어도 런타임 통과로 간주하지 않는다.</p>\n"
        },
        {
          "html": "<h3>4.3 저장소 workflow별 시험 연결</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>원본 workflow</th>\n<th>핵심 검증</th>\n<th>실행 묶음·요구</th>\n</tr>\n</thead>\n<tbody><tr>\n<td><code>dubakwi-support.json</code></td>\n<td>입력·권한 게이트, 분류/agent route, 답변 검증, 저장 finish gate, 응답</td>\n<td>2–3; W01/W02/W08, common/team</td>\n</tr>\n<tr>\n<td><code>dubakwi-search.json</code></td>\n<td>public/restricted 권한, 근거·인용, empty/error/not-ready, 호출·지연</td>\n<td>2; W07, search 16건</td>\n</tr>\n<tr>\n<td><code>dubakwi-handoff.json</code></td>\n<td>owner 조회, Jira 생성·재사용·담당·종료, context/facts, 오류 envelope</td>\n<td>2–3; W03–W05, J01–J15·관련 TC</td>\n</tr>\n<tr>\n<td><code>dubakwi-index.json</code></td>\n<td>Manual 색인 workflow의 입력 manifest/권한/버전, chunk·embedding ACK와 실행 시 쓰기 효과. 기존 성공 증거가 있으므로 재색인은 상태 소실 등 실제 근거가 있을 때만 검토</td>\n<td>2; W07, SR-R01</td>\n</tr>\n<tr>\n<td><code>dubakwi-state.json</code></td>\n<td>begin/prepare/bind/save/finish, CAS/revision, replay/conflict, 효과 미확인</td>\n<td>3; W06/W08, TC05/06/08/10/14/16–18</td>\n</tr>\n<tr>\n<td><code>dubakwi-dlq.json</code></td>\n<td>DLQ insert/list/inspect/claim/release/complete 경계와 중복·unknown 제한</td>\n<td>3–4; W06/W08, TC07 및 TC15/오류 사례</td>\n</tr>\n<tr>\n<td><code>dubakwi-recovery-operator.json</code></td>\n<td>기존 운영자 경로 list/inspect→Jira GET read-only, 입력 가림·권한. recovery action은 VM 미구현 증거와 분리</td>\n<td>3; W06/W11, TC07</td>\n</tr>\n<tr>\n<td><code>dubakwi-errors.json</code></td>\n<td>Error Trigger, error context/state/DLQ, 알림 결과·unknown 분기·재실행 방지</td>\n<td>3–4; W08, TC15·오류 사례</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>각 행은 결과에서 확인한 실제 VM workflow ID/상태를 기록한다. source JSON·credential reference 전체 대조는 알려진 범위와 한계를 남기는 provenance 작업이며, 이미 동작이 검증된 VM 기능 시험의 선행조건은 아니다. 실제 시험 대상이 없을 때만 해당 workflow 항목을 차단한다.</p>\n"
        },
        {
          "html": "<h3>4.4 사용자·담당자 수동 UAT</h3>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>범주</th>\n<th>시나리오</th>\n<th>필수 관측</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Discord 시민 D01–D10</td>\n<td>근거 기반 안내, 이관, 같은 문의 보완, 본인 상태, 미등록, 타인 정보, 근거 부족, 고장, 요금/환불, 중복 안전</td>\n<td>본인에게만 응답, 근거/route, case_ref, Jira/저장 효과. D06는 등록 계정으로 기존 R05 타인 소유 case를 제출한 live bot 시험을 재사용한다. D05는 실제 임시 Discord identity로 미등록 거절을 확인했다. 같은 interaction replay는 별도 harness에서만</td>\n</tr>\n<tr>\n<td>Jira J01–J04</td>\n<td>접수·배정, 담당자의 실제 열람/처리, 완료 후 시민 상태, 다른 owner 거절</td>\n<td>exact issue key 연계, Jira history와 계정 직접 열람, 상태 조회·무변경 권한 거절</td>\n</tr>\n<tr>\n<td>운영 DLQ 조회</td>\n<td>기존 operator workflow <code>list</code>→<code>inspect</code>→연결 Jira GET</td>\n<td>조회 필드 가림, Jira GET, workflow 비활성·입력 초기화, 업무 state/DLQ/Jira/Discord writes 0. Jira 화면의 DLQ 관리 기능은 미지원으로 기록</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>이전 UAT 증거는 부분 활용한다: D02 이관과 Jira 문맥, J01/J03의 같은 티켓·완료 후 owner lookup은 이미 확인된 표본이다. D03 정의 문장은 Jira revision 1~3 같은 티켓 누적까지 확인했다. D06는 기존 R05 타인 소유 case에 대한 Discord live 거부로 확인했다. 담당자 직접 처리는 <a href=\"../../../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md\">J02 실행</a>, 실제 Discord 알림 수신은 <a href=\"../../../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md\">사용자 확인</a>으로 완료 처리했다. D05는 <a href=\"../../../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md\">15:42 live 실행</a>에서 미등록 응답과 Jira 무일치를 확인했다. D10 실 플랫폼 replay는 별도 근거가 필요하다. J04는 <a href=\"../../../../runs/public/20261108-160000-vm-discord-j04-cross-owner-case/report.md\">16:00 live 실행</a>에서 거절 응답·기존 Jira 무변경·새 일치 티켓 미검색을 확인했다. <a href=\"../../../../runs/public/20261108-104900-vm-discord-jira-uat/report.md\">기존 실행</a>은 전체 가이드 통과가 아니다.</p>\n"
        },
        {
          "html": "<h2>5. 필수 산출물 연결</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>개발계획</th>\n<th>필수 결과물</th>\n<th>시험 마감 시 확인</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>P22/P26</td>\n<td>case·요구별 <code>runs/public/&lt;실행묶음ID&gt;/report.md</code>와 <code>summary.json</code>; 비공개 원시는 Git 제외 <code>runs/&lt;실행묶음ID&gt;/</code></td>\n<td>환경/버전, 입력·기대·실제, 판정, 외부 효과·측정, 실패/재시험 링크, 가림</td>\n</tr>\n<tr>\n<td>P14</td>\n<td><code>docs/project/daily/DAY80.md</code></td>\n<td>기존 발표①·기초 구현 상태를 역사 증거로 보존하고 최종 수행 결과와 혼동하지 않음</td>\n</tr>\n<tr>\n<td>P23/P27</td>\n<td><code>docs/project/EXECUTION-RESULT.md</code>와 공유 증거</td>\n<td>최초 실패 보존, 최종 run·범위별 결과·차단/미실행 연결</td>\n</tr>\n<tr>\n<td>P24</td>\n<td><code>docs/project/daily/DAY81.md</code></td>\n<td>발표·기능 동결 당시 상태와 누락을 역사적 기록과 최종 증거로 구분</td>\n</tr>\n<tr>\n<td>P25</td>\n<td><code>requests/*.json</code> 및 demo sequence</td>\n<td>공식 시연 순서와 시험된 synthetic 입력·고장/복원 설명 연결</td>\n</tr>\n<tr>\n<td>P28</td>\n<td>README, 시스템·워크플로우·RAG·저장소 설계, <code>docs/DEVELOPMENT-PLAN.md</code></td>\n<td>구현/실측/한계/재현 절차와 버전·문서 이력 동기화</td>\n</tr>\n<tr>\n<td>P29</td>\n<td>발표 자료·발표자 메모, S09–S10 근거</td>\n<td>수치가 실행 결과서와 일치하고 미실행은 계획으로 표시</td>\n</tr>\n<tr>\n<td>P30</td>\n<td><code>docs/project/daily/DAY82.md</code></td>\n<td>제출 전 결과·잔여 한계·시험 보고 상태</td>\n</tr>\n<tr>\n<td>P31</td>\n<td>제출 후보 파일·경로 대응·기본 브랜치·DAY80/81/82 세 데일리·비밀/재현 검사 증거</td>\n<td>후보 파일과 보고서/데일리/설계 링크 일치, <code>tscan staged</code> 및 최종 <code>tscan scan .</code> 실행. 도구 미제공이면 대체 검사와 한계를 기록</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>산출물이 누락되면 런타임 시험 PASS와 별개로 제출 준비 완료로 판정하지 않는다. 발표·데일리·제출 파일 검토는 서비스 시험 결과와 합산하지 않는다.</p>\n"
        },
        {
          "html": "<h2>6. 기존 시험 증거의 재사용·재시험 경계</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>기존 증거</th>\n<th>계획에서의 용도</th>\n<th>재사용 한계 / 새로 필요한 확인</th>\n</tr>\n</thead>\n<tbody><tr>\n<td><a href=\"../../../../runs/public/20261108-113100-vm-pr36-baseline-readonly/report.md\">VM baseline snapshot</a> + <a href=\"../../../../runs/public/20261108-120800-vm-runtime-refresh/report.md\">runtime refresh/workflow UI</a></td>\n<td>image ID/tag·n8n/DB 버전·PR36/dual/UX 게시 라벨·Index 미게시/실행 없음</td>\n<td>최신 refresh는 컨테이너/version/UI만 재확인했다. OCI revision label, exact exported workflow JSON/credential bindings, current RAG memory population은 여전히 미확인</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261107-214910-local-p26-case-matrix/report.md\">local case matrix</a></td>\n<td>사례 입력의 준비 가능/차단 상태와 기존 fixture 경계</td>\n<td>2026-11-07 상태이므로 현행 60개 정의와 각 선행조건을 다시 대조; dry-run을 runtime PASS로 쓰지 않음</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">PR36 VM integration</a></td>\n<td>core VM 흐름·과거 실패·효과 대조의 기준 증거</td>\n<td>기존 VM 구성/버전에서 실행한 표본이다. 최신 VM manifest와 매핑 후 같은 경로 여부만 결정하고 전체 회귀로 합산하지 않음</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261107-214804-local-p26-regression/report.md\">local P26 regression</a></td>\n<td>Python/Support/P12/P18–P20 등의 로컬 회귀 출발점</td>\n<td>VM 연동·Jira/Discord 외부 효과·RAG 실색인 증거가 아님. 코드/fixture가 현재 <code>dd919d7</code>과 일치하는지 확인 후 영향 범위만 재실행</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261107-204523-local-rag-contract/report.md\">local RAG contract</a></td>\n<td>지식 artifact/청킹/offline retrieval/AUTH fixture</td>\n<td>현재 VM memory index 내용·권한별 실검색·citation 종단은 별도 확인</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md\">VM Jira lifecycle</a></td>\n<td>동일 티켓 보완, owner/other/missing 조회, 완료 후 owner lookup</td>\n<td>표본 증거로 연결하고 UAT J02 담당자 직접 열람/처리·D03 가이드 입력·나머지 UAT를 대체하지 않음</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">VM TC-07 lookup</a></td>\n<td>list/inspect 및 linked Jira GET read-only slice</td>\n<td><code>recovery_control</code> action·claim/resume/complete 실연동을 통과 처리하지 않음</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261108-104900-vm-discord-jira-uat/report.md\">2026-11-08 Discord/Jira UAT</a></td>\n<td>D02와 이어진 Jira 문맥·상태 표본</td>\n<td>D03 입력 불일치, 직원 열람/수신 미확인, 다른 D/J 항목 미실행은 별도 상태로 남김</td>\n</tr>\n<tr>\n<td><a href=\"../../../../runs/public/20261107-193015-local-p26-tc15-retest/report.md\">TC-15 local retest</a> 및 <a href=\"../../../../runs/public/20261107-210536-vm-tc15-h11-replacement/report.md\">VM 사본 준비</a></td>\n<td>local 후속 차단 계약과 VM 복제 준비 증거</td>\n<td>VM의 실제 synthetic 요청 2건·DLQ/Jira/effect 대조는 미실행</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>기존 증거는 사례별 판정표의 출처로 연결한다. 새 시험은 그 증거에서 바뀐 baseline·빠진 assertion·사용자/운영자 확인만 보완하고, 변경 또는 실패가 생기면 별도 run ID로 최초 결과를 보존한다.</p>\n"
        },
        {
          "html": "<h2>7. 현행 사전조건·명시적 미완료</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>현재 사실</th>\n<th>시험 계획상 처리</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>RAG 현재 데이터</td>\n<td>VM에는 legacy <code>dubakwi-search</code>와 PR36 전용 search가 별도 key namespace로 있다. raw direct search 16건 중 15 pass/1 SR-WF12 relevance miss를 보존하며 PR36 Support intent-transform E2E는 별도 통과다. 14:02 n8n restart 후 PR36 index 44 items UI 성공 및 QR 근거 응답을 확인했다. SQLite #2167/#2211은 여전히 <code>running</code>/<code>stoppedAt=null</code>; index 시간 미측정이다. manifest 8개 승인 대기/색인 비활성, Simple Vector Store는 memory 기반이다</td>\n<td><a href=\"../../../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md\">14:02 restart/reindex/QR</a>, <a href=\"../../../../runs/public/20261108-133000-vm-pr36-rag-wf12-e2e/report.md\">13:30 SR-WF12 PR36 E2E</a>, <a href=\"../../../../runs/public/20261108-132500-vm-pr36-rag-e2e/report.md\">13:25 QR E2E</a>, <a href=\"../../../../runs/public/20261108-131400-vm-rag-matrix/report.md\">13:14 direct matrix</a>를 연결한다. 재색인 기능 경로는 한 번 확인됐고 execution metadata 정합성·index duration은 미해결 기록 한계로 유지한다</td>\n</tr>\n<tr>\n<td>이미지 source provenance</td>\n<td>VM image ID prefix와 tag는 고정됐지만 user API/Discord OCI revision labels 없음</td>\n<td>해당 VM image ID로 시험 사실을 기록. <code>dd919d7</code> 소스 빌드라고 주장하지 않음</td>\n</tr>\n<tr>\n<td>TC-07 복구 action</td>\n<td>DLQ list/inspect/Jira GET read-only 조회는 VM 통과. PR36 DB에 <code>recovery_control</code>이 없고 action recovery/verified complete는 미구현</td>\n<td>현재 마감 범위는 사용자가 정한 조회까지만이다. 조회 결과를 재사용하고 복구 action은 미구현/범위 밖으로 표시하며 이번 완료 gate에 넣지 않는다.</td>\n</tr>\n<tr>\n<td>D10 동일 interaction replay</td>\n<td>adapter 단위 경계만 있음; live replay harness 없음</td>\n<td>BLOCKED/NOT RUN. 같은 interaction을 재전달할 환경이 없음</td>\n</tr>\n<tr>\n<td>TC-15</td>\n<td>격리 미준비; 운영 webhook/shared DB 분리 미확인</td>\n<td>BLOCKED; 요청 없음</td>\n</tr>\n<tr>\n<td>담당자 확인</td>\n<td>J02 처리 통과; 알림 수신은 사용자 확인</td>\n<td><a href=\"../../../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md\">증거</a></td>\n</tr>\n<tr>\n<td>별도 계정 권한</td>\n<td>D06는 등록된 현재 Discord identity와 R05 기존 타인 synthetic case 조합으로 live 거부 확인. D05 미등록 ID 거절은 실 Discord에서 통과, J04 타인 소유 case_ref 거절은 live 통과(화면/검색 범위)</td>\n<td><a href=\"../../../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md\">D05</a>와 <a href=\"../../../../runs/public/20261108-153000-vm-discord-d06-cross-owner/report.md\">D06</a>를 재사용한다. D06/J04의 DB state/DLQ 및 webhook 호출 효과는 직접 조회하지 않아 미확인</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>8. 테스트 결과 묶음·완료 판정</h2>\n"
        },
        {
          "html": "<p>각 실행은 <code>YYYYMMDD-HHMMSS-vm-&lt;짧은설명&gt;</code> 형식의 KST ID로 <code>runs/public/&lt;ID&gt;/report.md</code>와 <code>summary.json</code>을 남긴다. 비공개 correlation/key/raw logs는 Git 제외 <code>runs/&lt;ID&gt;/</code>에 두고 공개본은 가린다. 결과에는 다음을 반드시 포함한다.</p>\n"
        },
        {
          "html": "<ul>\n<li>source commit 또는 “VM image ID 시험”, image ID prefix, workflow name/ID·Published 상태, migration/version, RAG manifest/key/version, 실행일·환경</li>\n<li>사례 ID/요구 ID, 선행 조건, 입력 형태, 기대 응답과 실제 응답 요약, Jira/state/DLQ/Discord 효과, 호출/재시도 수, PASS/FAIL/BLOCKED/NOT RUN</li>\n<li>fault-on/off와 workflow 활성 상태, 원 실행 종료·외부 효과 확인, 최초 실패 링크, 재시험 링크, 남은 위험/재현 순서</li>\n<li>문서·공개 후보 검사와 실제 service test 결과를 분리한 요약</li>\n</ul>\n"
        },
        {
          "html": "<p><strong>전체 사용자 기준 완료</strong>는 실행 가능한 60 사례와 64 요구를 기존 증거 재사용/신규 통과/실패/차단/미실행 중 하나로 추적하고, 핵심 정상 경로·RAG 권한/인용·Jira 생애주기·담당자 처리·저장/DLQ 조회 효과를 판정하며, 남은 차단/미구현이 사용자 결정 범위에서 허용됐다는 근거가 있을 때만 판정한다. RAG matrix는 16/16 통과했고 DLQ 범위는 read-only 조회까지다. 복구 action은 이번 마감 범위에서 제외한다. TC-15는 격리 조건을 만족하지 못하면 해당 항목만 차단/미실행으로 기록하며 다른 완료 증거를 무효화하지 않는다.</p>\n"
        },
        {
          "html": "<p>수정 시에는 영향 경로의 local suite → isolated/disposable failure test → VM targeted regression → 마지막에 full local regression 순으로 반복한다. 새 코드/노드 활성화나 업무 계약 변경은 이 계획의 시험 중 임의로 즉시 반영하지 않고 별도 변경으로 기록한 뒤 새 baseline/diff에서 재시험한다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 Discord UAT 후속은 <a href=\"../../../../runs/public/20261108-121900-vm-discord-uat-followup/report.md\">실행 결과</a>에 기록했다. D07 내부 자료 거부, D08 안전 안내/인용, D09 환불 경계 질문은 응답 범위에서 확인했다. D02/D03의 Jira 연결·재사용은 이 회차에서 관측되지 않아 부분 판정이며 DB 효과도 독립 조회하지 않았다. 후속 D03 Jira 대조와 D06 타인 소유 접근 거부는 각각 별도 실행에서 보강했다. D05/D10, 담당자 직접 수신, TC-07 복구, TC-15는 완료로 올리지 않는다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 <a href=\"../../../../runs/public/20261108-122400-vm-rag-readiness/report.md\">VM RAG readiness 점검</a>에서 현재 PR36 index workflow의 실행 이력 0, Manual trigger, Publish 비활성 상태를 확인했다. 이 index UI 이력은 0이지만 Manual 색인 실행 이력 저장 여부를 증명하지 않으며, 11/7 팀 VM 종단에서 재시작 뒤 44청크 색인·실제 검색이 확인됐고 11/8 D08에서 출처 응답이 관측됐다. RAG 기능 시험은 차단하지 않는다. 현재 memory population·문서/credential 계보는 부분 확인으로 남기고, 다음은 2번 묶음의 search 사례 matrix를 수행한다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 v1.5: <a href=\"../../../../runs/public/20261108-125600-vm-final-test-followup/report.md\">현재 VM 후속</a>에서 index workflow 실행 뒤에도 SR-WF01이 <code>index_not_ready</code>임을 확인해 이전 readiness 가정을 업데이트했다. TC-15 Support 사본의 B14/B15/B27 운영 webhook 참조로 인해 사본 격리를 확인하기 전에는 요청을 보내지 않는 조건을 추가했다.\n2026-11-08 v1.6: <a href=\"../../../../runs/public/20261108-130600-vm-rag-correct-pair/report.md\">대응 RAG workflow 재검증</a>으로 기존 Support search와 처음 실행한 PR36 index의 namespace 불일치를 원인으로 확인했다. matching <code>dubakwi-index</code> 후 5개 사례와 PR36 전용 search smoke를 별도 통과시켰고 전체 16개 search case는 미완료로 유지한다.\n2026-11-08 v1.7: <a href=\"../../../../runs/public/20261108-131400-vm-rag-matrix/report.md\">전체 16개 RAG search matrix</a>를 실행해 15 pass/1 SR-WF12 relevance fail, B13-style hint 진단 통과, Support auth 401, restart recovery 미실행을 반영했다.\n2026-11-08 v1.8: 올바른 <code>X-Team-Key</code>로 synthetic Support E2E 요청을 보냈다. HTTP 200이지만 active webhook이 <code>skeleton_mock</code> 이관 응답·empty sources를 반환해 RAG가 호출됐다고 판정하지 않았다. n8n execution 2167은 running 상태이며 stop/restart는 보류했다.\n2026-11-08 v1.9: workflow 목록에서 active PR36 path <code>/dubakwi-support-pr36-a657890</code>과 paired search를 확인해 QR synthetic 요청을 실행했다. 자동 응답과 public <code>rental-guide</code> 근거가 반환되어 해당 user-facing RAG vertical slice 통과. 기존 <code>/dubakwi-support</code> 결과는 P11 skeleton endpoint였음을 분리. SR-WF12 및 restart/reindex recovery는 미완료.\n2026-11-08 v1.10: SR-WF12 mixed security/ticket question을 active PR36 endpoint에 보냈다. B13 transform 후 expected public security evidence와 urgent high-priority Jira handoff <code>JBYS-172</code>를 확인해 E2E 통과. Raw direct-search fail은 재작성하지 않고 보존한다. Jira는 생성됐고 Discord receipt는 이번 run에서 직접 확인하지 않음. Restart/reindex recovery는 미완료.\n2026-11-08 v1.11: Discord 앱의 민원 채널 기존 응답과 제한된 Jira 알림 채널을 읽기 전용 확인해 <a href=\"../../../../runs/public/20261108-134000-vm-discord-alert-readonly/report.md\">별도 결과</a>를 추가했다. 담당자 수신/열람은 계속 BLOCKED. 최종 정적 검사 23 files/882 links/58 anchors, 공개 후보 613/580 tracked/1,277 links, 오류 0; <code>git diff --check</code> 통과. <code>tscan scan .</code>은 실행했으나 이 환경에 <code>tscan</code> 실행 파일이 없어 시작되지 않았다. TC-07 recovery action, TC-15 격리 고장 종단, n8n restart/reindex recovery 및 제한 계정 경계는 미완료다.\n2026-11-08 v1.12: 로컬 임시 메모 <code>tmp/vm-edge-web-ssh-resume.md</code>의 웹 SSH 재개 절차에 따라 로그인된 기존 Edge 탭에서 VM runtime을 재확인했다. 실제 n8n container의 SQLite를 read-only 조회해 PR36 index execution 2167 <code>running</code>, <code>stoppedAt=null</code>, 최신 일치 실행 1건을 확인했다. 실행 상태 조회는 가능하지만 복구는 수행하지 않았으며 현재 메모리 vector state 및 node data는 미확인으로 둔다. <a href=\"../../../../runs/public/20261108-134700-vm-rag-execution-refresh/report.md\">별도 VM 결과</a>를 연결한다.\n2026-11-08 v1.13: n8n UI에서 execution #2167 상세와 전체 <code>Running</code> 필터에 항목이 없음을 확인했고, 다른 legacy <code>dubakwi-index</code> 성공 실행 #2170은 10.699초로 확인했다. 서로 다른 workflow/key namespace이므로 이를 PR36 색인 시간으로 일반화하지 않는다. 11/7 PR36 44청크 재색인·근거 E2E 성공은 있으나 색인 시간은 미측정이다. PR36 user E2E는 통과했으므로 RAG 서비스 failure는 미관측, execution persistence 불일치는 미해결로 기록한다. n8n UI에 실행 중지 대상이 없어 강제 중지나 재색인을 실행하지 않았으며 <a href=\"../../../../runs/public/20261108-135700-vm-rag-execution-ui-crosscheck/report.md\">대조 결과</a>를 추가한다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 14:01 KST PR36 RAG 복구 재시험: <a href=\"../../../../runs/public/20261108-140200-vm-pr36-rag-recovery/report.md\">결과</a>. n8n 컨테이너 재시작 후 PR36 전용 index UI 실행 44 items 성공, 후속 QR synthetic 문의는 HTTP 200 자동 답변과 public rental-guide 근거 2개를 반환했다. Jira/Discord 외부 효과는 없었다. SQLite는 #2167과 새 #2211 모두\nunning으로 보여 UI/DB execution 상태 동기화는 여전히 미해결이다. 재색인 시간은 측정하지 않았고 이 재시험은 전체 RAG 권한·오류 matrix를 대체하지 않는다.</p>\n"
        },
        {
          "html": "<p>14:10 KST RAG follow-up: PR36 전용 경계 matrix 7건을 시도했으나 Edge Web SSH 결과 회수 전 UI 연결이 끊겨 처리 결과 불명이다. <a href=\"../../../../runs/public/20261108-141000-vm-pr36-rag-boundary-attempt/report.md\">기록</a>. 사례를 통과/실패에 포함하지 않는다. 재개 때 request_id 중복 여부를 먼저 확인한다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 14:14–14:16 KST PR36 RAG 표적 matrix: <a href=\"../../../../runs/public/20261108-141600-vm-pr36-rag-matrix/report.md\">결과</a>. PR36 전용 search path의 public QR, empty, invalid access, disabled, citizen canary, staff restricted, mixed security 7개 assertion이 모두 통과했다. 이전 13:14 legacy path의 SR-WF12 raw query 실패를 PR36에 그대로 적용하지 않는다. PR36 index UI는 44 items 성공이지만 실행 UI 이력은 없고 SQLite #2211은 running/stoppedAt=null이다. 색인 시간은 미측정이다. 전체 16개 사례가 아니라 표적 7건이므로 full RAG matrix 완료로 처리하지 않는다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 14:22 KST PR36 RAG 전체 search 사례: <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">실행 결과</a>. <code>cases/search.json</code> 16개가 PR36 전용 webhook에서 모두 명세 기대 결과를 반환했다(16/16). 시민 제한문서 비노출, staff 양성 2건, 빈 결과·잘못된 권한·비활성 경계를 포함한다. SQLite read-only 결과에서 해당 search 실행 #2228–#2243 전부 <code>running</code>/stoppedAt null; index #2211도 같은 상태다. 저장 설정은 성공/수동 실행/진행 기록을 모두 비활성화했다. UI 이력 미표시는 설정으로 설명되나 lingering running row의 원인은 미확정이다. 색인 시간도 미측정이다.</p>\n"
        },
        {
          "html": "<ul>\n<li><p>D03 추가 실행: <a href=\"../../../../runs/public/20261108-144900-vm-discord-d03-verified/report.md\">14:48 Discord</a>와 <a href=\"../../../../runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md\">15:21 Jira 대조</a>에서 같은 case의 Jira ticket 재사용과 revision 1~3 누적을 확인했다. 담당자 지정과 handoff 기록은 있으나 실제 열람·Discord 수신은 미확인이다. <a href=\"../../../../runs/public/20261108-153000-vm-discord-d06-cross-owner/report.md\">D06</a>은 현재 Discord 등록 세션으로 기존 R05의 타인 소유 open case 접근을 시도해 일반 오류 거부와 신규 Jira issue 미생성을 확인했다. D05 live unregistered identity와 D10 replay는 미판정이다.</p>\n</li>\n<li><p>최신 사용자 시나리오 판정 연결: D01은 <a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">PR36 VM 종단</a>, D02/J01/J02 일부/J03은 <a href=\"../../../../runs/public/20261108-104900-vm-discord-jira-uat/report.md\">10:49 UAT</a>, D07–D09는 <a href=\"../../../../runs/public/20261108-121900-vm-discord-uat-followup/report.md\">12:19 UAT</a>, D04는 <a href=\"../../../../runs/public/20261108-144413-vm-discord-d04-lookup/report.md\">14:43 조회</a>, D03은 <a href=\"../../../../runs/public/20261108-144900-vm-discord-d03-verified/report.md\">14:48 Discord</a>와 <a href=\"../../../../runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md\">15:21 Jira 대조</a>로 연결한다. 계정/담당자/replay 선행조건이 필요한 항목만 해당 범위에서 차단/미판정으로 남긴다.</p>\n</li>\n</ul>\n"
        },
        {
          "html": "<p>2026-11-08 15:35 KST D05/D10 경계 및 잔여 확인: <a href=\"../../../../runs/public/20261108-153500-local-discord-replay-boundary/report.md\">실행 결과</a>. <code>uv run --locked</code>로 Discord adapter unittest 22/22 통과. 미등록 map lookup과 동일 interaction의 안정 request_id 재사용은 로컬 부분 통과이며, 별도 Discord identity/실 플랫폼 replay는 미실행이다. 담당자 전용 채널 권한이 없는 J02 실 수신·열람은 미검증으로 둔다. TC-15 시험 사본은 기존 점검상 운영 PR36 search/handoff webhook 참조가 남아 안전한 고유 ingress/fault 배선이 확인되지 않았다. synthetic 요청을 보내지 않아 TC-15는 차단/미실행으로 종결하고 운영 경로는 변경하지 않았다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 15:42 KST D05 미등록 계정 종단: <a href=\"../../../../runs/public/20261108-154200-vm-discord-d05-unregistered/report.md\">실행 결과</a>에서 Chrome Discord 임시 계정으로 문의를 보내고 본인 전용 미등록 거절 응답을 확인했다. Jira에서 동일 입력 문구를 검색해 일치 티켓이 없음을 확인했다. DB state/DLQ는 직접 확인하지 않았다. D05 실 Discord 미등록 경계는 통과로 판정한다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 15:49 KST J02 담당자 직접 처리: <a href=\"../../../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md\">실행 결과</a>. 기존 D02 synthetic 티켓에서 담당자와 현재 계정 표시가 일치했고, 상태 <code>진행 중</code>, 담당자 작성 내부 가상 처리 메모를 확인했다. 따라서 J02 담당자 직접 열람·처리는 통과다. Discord 알림 실제 전송/열람 및 DB state/DLQ는 미확인으로 남긴다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 16:00 KST J04 타인 소유 문의 경계: <a href=\"../../../../runs/public/20261108-160000-vm-discord-j04-cross-owner-case/report.md\">실행 결과</a>. 등록 <code>citizen-c</code>가 synthetic <code>citizen-a</code> case_ref를 조회해 일반 거절 응답을 받았다. Jira 기존 synthetic 티켓은 To Do 및 기존 업데이트 시각을 유지했고, 입력 질문 검색 결과 일치 이슈는 없었다. J04 live 개인정보 경계는 통과; DB state/DLQ·외부 호출 효과는 미확인이다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 16:02 KST 담당자 Discord 알림 수신 확인: <a href=\"../../../../runs/public/20261108-160200-user-confirmed-discord-alert/report.md\">사용자 확인 기록</a>. 사용자가 기존 J02 담당자 알림을 실제로 수신했다고 확인해 완료 처리했다. 별도 Discord 화면/알림 로그를 독립 수집한 것은 아니다. 따라서 담당자 수신 확인은 완료이며 D10·TC-15·최종 요구 매핑만 남는다.</p>\n"
        },
        {
          "html": "<p>2026-11-08 16:05 KST D10/TC-15 환경 준비 확인: <a href=\"../../../../runs/public/20261108-160500-vm-final-test-environment-readiness/report.md\">점검 결과</a>. D10 live interaction replay 및 외부 호출 관측 harness가 없고, TC-15는 운영 PR36 webhook/shared DB 경계를 배제하지 못해 둘 다 환경 미준비다. 사용자 지시에 따라 시험 요청 없이 BLOCKED/NOT RUN으로 종결하며, 통과로 표시하지 않는다.</p>\n"
        }
      ]
    },
    {
      "id": "current-requirements",
      "role": "가이드",
      "title": "발표 요구사항 적용 요약",
      "slides": [
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11
      ],
      "source": "sources/current-requirements.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h2>발표 구성과 시간</h2><p>업무·역할 3분, 워크플로우 5분, RAG 4분, 시연 5분, 결과·결론 3분으로 본문 20분을 편성했습니다. 질의응답 5분은 별도입니다. 실제 연속 발표 시간은 미측정입니다.</p>",
          "index": 0
        },
        {
          "html": "<h2>필수산출물 대응</h2><p>워크플로우 설계서는 업무·역할·노드·분기·도구·페이로드·오류를 설명합니다. RAG 설계서는 원본·청킹·임베딩·검색 권한·복구를 설명합니다. 실행 결과서는 시험 조건·기대와 실제·실패·재시험·한계를 설명합니다.</p>",
          "index": 1
        },
        {
          "html": "<h2>시연 순서</h2><p>QR 근거 안내 → 같은 반납 문의의 보완과 세 번째 이관 → 무근거 이관 → Jira All에서 담당자 검토·진행 중·내부 메모를 보여줍니다. 실제 환불·반납 변경 기능은 포함하지 않습니다.</p>",
          "index": 2
        },
        {
          "html": "<h2>발표 자료의 근거</h2><p>각 장의 발표자 메모에서 대본·필수산출물·원본 보고서를 연결합니다. 검색 평가, 대표 종단 요청, 과거 반복 시험을 서로 다른 조건으로 설명합니다. 가이드 원문 자체는 공개 재배포하지 않고 이 프로젝트의 적용 결과만 제공합니다.</p>",
          "index": 3
        }
      ]
    },
    {
      "id": "current-recovery",
      "role": "후속 검증",
      "title": "11/08 재시작 → 44개 재색인 → QR 확인",
      "slides": [
        6
      ],
      "source": "sources/current-recovery.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>PR36 RAG 복구 재시험</h1>\n"
        },
        {
          "html": "<ul>\n<li>실행 ID: <code>20261108-140200-vm-pr36-rag-recovery</code> (KST)</li>\n<li>실행 시각: 2026-11-08 14:01–14:03 KST</li>\n<li>환경: VM n8n UI 및 Edge 웹 SSH; PR36 index workflow와 기존 PR36 Support API</li>\n<li>범위: 실행 #2167 관련 복구, PR36 index 재실행, 재색인 후 QR 검색 종단</li>\n</ul>\n"
        },
        {
          "html": "<h2>조치와 결과</h2>\n"
        },
        {
          "html": "<p>n8n UI에서 #2167은 상세를 찾을 수 없고 전체 Running 목록에도 보이지 않았다. 기존 승인에 따라 실제 VM 컨테이너 <code>day65-n8n-n8n-1</code>만 재시작했다. 재기동 후 n8n 연결을 확인하고 PR36 전용 <code>R01 PR36 a657890 index</code> workflow를 UI의 Manual 실행으로 시작했다. UI는 <code>Workflow executed successfully</code>를 표시했고 처리 항목은 44개였다. 이전 성공 표본과 동일한 PR36 전용 workflow/key를 사용했다.</p>\n"
        },
        {
          "html": "<p>직후 기존 bot 컨테이너의 secret mount를 요청 내부 인증에만 사용해 PR36 Support QR synthetic 문의 1건을 보냈다. 응답은 HTTP 200, <code>자동 답변</code>, ticket null이었고 <code>rental-guide</code>의 QR 인식/잠금 해제 및 대여 시작 절이 두 개 반환됐다. 비밀과 case reference는 출력·기록하지 않았다. 신규 Jira 티켓 생성이나 Discord 전송은 발생하지 않았다.</p>\n"
        },
        {
          "html": "<h2>실행 메타데이터 주의</h2>\n"
        },
        {
          "html": "<p>읽기 전용 SQLite 조회에서 과거 #2167은 재시작 뒤에도 <code>running</code>, <code>stoppedAt=null</code>로 남았다. 새 UI 성공 실행 #2211도 SQLite에서 <code>running</code>, <code>stoppedAt=null</code>로 보였다. 따라서 workflow UI 성공과 실제 RAG 검색은 확인했지만 n8n execution row의 stale <code>running</code> 표시는 해소되지 않았다. PR36 색인의 정확한 소요 시간도 실행 화면에서 별도 계측하지 않았다. 이 메타데이터 불일치는 운영 경로 성공과 별도 추적 항목으로 남긴다.</p>\n"
        },
        {
          "html": "<h2>판정</h2>\n"
        },
        {
          "html": "<ul>\n<li>PR36 전용 index workflow 재실행: UI 기준 통과 (44 items)</li>\n<li>재색인 후 PR36 QR 검색·근거 답변: 통과 (HTTP 200, public <code>rental-guide</code> 근거)</li>\n<li>실행 DB 종료 상태 동기화: 미해결 (#2167 및 #2211 stale <code>running</code> 관측)</li>\n<li>Jira/Discord 외부 효과: 0</li>\n<li>RAG 전체 권한·장애·색인 복구 계약: 이 시험만으로 전체 완료 처리하지 않음</li>\n</ul>\n"
        },
        {
          "html": "<h2>한계</h2>\n"
        },
        {
          "html": "<p>VM UI 실행 시간은 보고서 캡처 시각만으로 초 단위 산출하지 않았다. SQLite 메타데이터를 직접 수정하지 않았고, 추가 재시작/색인도 반복하지 않았다. 상세 상태와 실행 row 불일치는 별도 원인 분석이 필요하다.</p>\n"
        }
      ]
    },
    {
      "id": "current-followup",
      "role": "후속 검증",
      "title": "11/08 같은 Jira 티켓 · 보완 맥락 누적",
      "slides": [
        7,
        8,
        9
      ],
      "source": "sources/current-followup.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>VM Jira D03 티켓 대조 및 Discord 계정 경계 확인</h1>\n"
        },
        {
          "html": "<ul>\n<li>실행 ID: <code>20261108-152100-vm-jira-d03-crosscheck</code> (KST)</li>\n<li>실행 시각: 2026-11-08 15:21 KST</li>\n<li>환경: 기존 PR36 Discord 봇, Edge Jira 로그인 세션, 로컬 채널 어댑터 검사</li>\n<li>범위: 직전 D03 후속 응답의 Jira 이슈 대조, 등록 사용자 매핑 경계 검사</li>\n</ul>\n"
        },
        {
          "html": "<h2>결과</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>검증</th>\n<th>판정</th>\n<th>관측</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>D03 Jira 티켓 재사용</td>\n<td>통과</td>\n<td>Discord 후속 응답에서 확인된 synthetic Jira 이슈를 열었다. Jira 설명의 <code>case_id</code> 및 <code>first_request_id</code>가 Discord 흐름의 연결 건과 일치하고, Jira 댓글의 <code>dubakwi-case-context:v1</code> 기록에 revision 1, 2, 3과 동일한 <code>ticket_key</code>가 남아 있다. 추가 후속이 새 이슈 대신 같은 티켓에 기록된 것을 확인했다.</td>\n</tr>\n<tr>\n<td>담당자 전달 기록</td>\n<td>부분 통과</td>\n<td>Jira 담당자 필드에 담당자가 지정되어 있고, 최신 전달 기록에 역할 <code>support</code>, 부족 정보 및 보완 횟수가 보인다. 실제 담당자가 읽고 처리했는지, Discord 알림을 받았는지는 확인하지 않았다.</td>\n</tr>\n<tr>\n<td>Jira 처리 상태</td>\n<td>관측</td>\n<td>이슈 상세에서 상태는 <code>해야 할 일</code>(To Do)로 보였다. 이 실행에서는 상태를 변경하지 않았다.</td>\n</tr>\n<tr>\n<td>등록/미등록 사용자 경계</td>\n<td>단위 검사 통과, 실 UI 미실행</td>\n<td><code>parse_user_map</code>의 알려지지 않은 Discord ID 조회 결과와 설정 검사를 포함해 <code>uv run --locked python -m unittest tests.channels.test_discord_bot</code>의 22개 테스트가 통과했다. 봇 코드도 사용자 매핑 누락 시 지원 webhook 호출 전에 거부 응답을 반환한다. 다만 해당 interaction 분기 자체를 모의 Discord 상호작용으로 호출하는 테스트나 별도 계정의 실제 UI 결과는 이번 실행에서 얻지 않았다.</td>\n</tr>\n<tr>\n<td>별도 임시 Discord 계정의 라이브 경로</td>\n<td>미실행</td>\n<td>실제 별도 Discord ID의 세션을 사용하지 않았다. 저장소의 <code>citizen-a/b/c</code>는 내부 테스트 사용자 ID이며 Discord 플랫폼 계정 자체가 아니다. 타인의 ID를 사용하거나 기존 운영 매핑을 임시로 바꾸지 않았다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>한계 및 후속</h2>\n"
        },
        {
          "html": "<ul>\n<li>Jira 티켓의 댓글과 현재 담당자 필드는 관리자 화면에서 확인했지만, 담당자 본인의 열람 및 실제 Discord 수신은 별도 증거가 없다.</li>\n<li>D05는 매핑 함수 단위 검사와 코드 경로 검토까지만 했다. 사용자 관점의 실 Discord 시험에는 별도 임시 Discord 계정 또는 승인된 시험 계정의 세션과 해당 계정의 서버 매핑이 필요하다.</li>\n<li>기존 D03 원 실행 기록은 수정하지 않는다. 이번 교차 확인은 <a href=\"../../../../runs/public/20261108-144900-vm-discord-d03-verified/report.md\">D03 실행 기록</a>을 보강하는 별도 증거다.</li>\n</ul>\n"
        }
      ]
    },
    {
      "id": "current-alert",
      "role": "후속 검증",
      "title": "11/08 담당자 알림 수신 · 사용자 확인",
      "slides": [
        8,
        9
      ],
      "source": "sources/current-alert.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>담당자 Discord 알림 수신 사용자 확인</h1>\n"
        },
        {
          "html": "<ul>\n<li>실행 ID: <code>20261108-160200-user-confirmed-discord-alert</code> (KST)</li>\n<li>실행 시각: 2026-11-08 16:02 KST</li>\n<li>대상 흐름: 기존 J02 synthetic Jira 담당자 티켓</li>\n<li>증거 출처: 사용자가 담당자 Discord 알림 수신을 확인했다고 직접 보고함</li>\n</ul>\n"
        },
        {
          "html": "<h2>결과</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>확인</th>\n<th>판정</th>\n<th>범위</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>담당자 Discord 알림 수신</td>\n<td>통과(사용자 확인)</td>\n<td>사용자가 수신을 확인했다고 보고했다. 이 회차에는 Discord 화면/알림 로그를 별도로 열어 독립 재관측하지 않았다.</td>\n</tr>\n<tr>\n<td>J02 담당자 티켓 처리</td>\n<td>통과</td>\n<td><a href=\"../../../../runs/public/20261108-154900-vm-jira-j02-assignee-handling/report.md\">J02 UI 결과</a>에서 담당자 직접 열람, <code>진행 중</code>, 내부 메모를 확인했다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>결론과 한계</h2>\n"
        },
        {
          "html": "<p>담당자 알림 수신을 사용자 확인 증거로 완료 처리한다. 별도 화면 캡처나 Discord delivery log를 독립 수집한 것은 아니다. 실제 업무 조치나 운영 데이터 변경은 수행하지 않았다.</p>\n"
        }
      ]
    },
    {
      "id": "current-dlq",
      "role": "후속 검증",
      "title": "11/08 DLQ 목록·상세·연결 Jira 조회",
      "slides": [
        7,
        8,
        9
      ],
      "source": "sources/current-dlq.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>TC-07 PR36 DLQ and Jira read-only lookup</h1>\n"
        },
        {
          "html": "<ul>\n<li>Run ID: <code>20261108-101605-vm-tc07-dlq-lookup</code> (KST)</li>\n<li>Date: 2026-11-08</li>\n<li>Environment: VM PR36 PostgreSQL, n8n, and linked Jira GET</li>\n<li>Source commit: <code>3b7bc74</code> (<code>P18: integrate DLQ lookup into operator workflow</code>)</li>\n<li>Database migration: <code>017-operator-dlq-list.sql</code></li>\n<li>Workflow: existing inactive <code>dubakwi-recovery-operator</code> manual test workflow, same workflow ID</li>\n<li>Scenario: TC-07 unresolved DLQ list/inspect, then linked Jira status/assignee read</li>\n</ul>\n"
        },
        {
          "html": "<h2>Result</h2>\n"
        },
        {
          "html": "<p>PASS for the requested read-only lookup integration. A private dump of the\nconfigured PR36 database was archive-validated and restored to a separate\ndatabase. On the restore, the existing <code>recovery_finish(jsonb)</code> was already\npresent; migrations 010–016 were not reapplied. Migration 017 applied\nsuccessfully, and a targeted read-only check as <code>dubakwi_recovery_operator</code>\nverified a bounded list, a sanitized inspect, and no direct table SELECT for\nthe login. The broader <code>operator-dlq-list-contract.sql</code> was also attempted but\nstopped at its recovery-dispatcher check because <code>recovery_control(jsonb)</code> is\nnot part of this dual-storage restore. No pass is claimed for that broader\ncontract.</p>\n"
        },
        {
          "html": "<p>Migration 017 then applied to the configured PR36 database. The VM lacked the\ncanonical workflow ID from the source JSON, so the existing inactive\n<code>R01 TC07 operator E2E</code> manual test workflow ID was reused in place; no\nadditional workflow ID was created. That workflow executed list and inspect\nsuccessfully using the actual scope <code>dubakwi-p19-real</code>. Inspect found linked\nJira issue <code>JBYS-33</code>; the existing\n<code>dubakwi-Jira SW Cloud account</code> performed a read-only GET. The returned status\nwas <code>해야 할 일</code>; assignee was null (unassigned).</p>\n"
        },
        {
          "html": "<p>The first Jira test input contained a mistyped DLQ ID and returned\n<code>recovery_not_found</code>; that failed attempt is retained in n8n execution history.\nThe corrected ID then passed. In a separate schema-reconciliation mistake,\nmigration 017 had first been applied to the service database; both lookup\nfunctions were subsequently dropped there. No service data rows were modified.</p>\n"
        },
        {
          "html": "<h2>Checks and effects</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>Check</th>\n<th>Result</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Private PR36 dump archive validation</td>\n<td>PASS</td>\n</tr>\n<tr>\n<td>Restore to separate database</td>\n<td>PASS</td>\n</tr>\n<tr>\n<td>Migration 017 on restored PR36 DB</td>\n<td>PASS</td>\n</tr>\n<tr>\n<td>Targeted list and inspect as operator role</td>\n<td>PASS; 5 listed, inspect object valid and sanitized</td>\n</tr>\n<tr>\n<td>Recovery operator direct table SELECT</td>\n<td>DENIED as intended</td>\n</tr>\n<tr>\n<td>Broader <code>operator-dlq-list-contract.sql</code></td>\n<td>INCOMPLETE; requires <code>recovery_control(jsonb)</code> absent from this restore</td>\n</tr>\n<tr>\n<td>Migration 017 on configured PR36 DB</td>\n<td>PASS</td>\n</tr>\n<tr>\n<td>Existing n8n workflow list execution</td>\n<td>PASS</td>\n</tr>\n<tr>\n<td>Existing n8n workflow inspect execution</td>\n<td>PASS</td>\n</tr>\n<tr>\n<td>Linked Jira status/assignee GET</td>\n<td>PASS; issue found, status <code>해야 할 일</code>, assignee null</td>\n</tr>\n<tr>\n<td>Workflow active after execution</td>\n<td><code>false</code></td>\n</tr>\n<tr>\n<td>Manual test payload after execution</td>\n<td>reset to <code>{}</code></td>\n</tr>\n<tr>\n<td>PR36 request/state/DLQ writes</td>\n<td>0</td>\n</tr>\n<tr>\n<td>Jira writes / Discord sends</td>\n<td>0 / 0</td>\n</tr>\n<tr>\n<td>Wrong service DB lookup functions</td>\n<td>removed after reconciliation</td>\n</tr>\n<tr>\n<td><code>check_project_docs.py</code></td>\n<td>PASS; 22 files, 775 local links, 58 anchors</td>\n</tr>\n<tr>\n<td><code>check_public_files.py</code></td>\n<td>PASS; 580 candidate paths, 1,144 public local links</td>\n</tr>\n<tr>\n<td><code>git diff --check</code> and evidence JSON parse</td>\n<td>PASS</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>Boundaries</h2>\n"
        },
        {
          "html": "<p>This run verifies the TC-07 <strong>read-only lookup slice</strong> only. It does not verify\nDLQ retry/recovery actions, Discord, Jira mutation, or full operator recovery\ncontracts on the PR36 dual-storage database. The workflow remains inactive and\nthe test input is blank. Importing the source workflow under its canonical\nsource ID remains separate; the tested existing VM manual test workflow can\nexecute while inactive. Earlier failed attempts and the restore contract\nfailure remain preserved in their original execution/evidence records.</p>\n"
        }
      ]
    },
    {
      "id": "current-uat",
      "role": "R01",
      "title": "Discord·Jira 시험 입력과 확인 절차",
      "slides": [
        8
      ],
      "source": "sources/current-uat.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>Discord·Jira 사용자 시나리오 시험 안내서</h1>\n"
        },
        {
          "html": "<ul>\n<li>상태: 수동 사용자 시험용 초안. 아래 절차는 이번 안내서 작성 시점에 실행한 시험이 아니다.</li>\n<li>대상: PR #36 기존 업무 경로가 연결된 지정 Discord 시험 서버/채널, 두바퀴 Jira 프로젝트, 기존 n8n 운영자 조회 워크플로우.</li>\n<li>기준 증거: <a href=\"../../../../runs/public/20261107-170503-vm-pr36-integration/report.md\">PR36 통합 시험</a>, <a href=\"../../../../runs/public/20261107-201652-vm-p26-jira-lifecycle/report.md\">Jira 생애주기 시험</a>, <a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">TC-07 DLQ/Jira 조회 시험</a>.</li>\n</ul>\n"
        },
        {
          "html": "<h2>시험 원칙</h2>\n"
        },
        {
          "html": "<ol>\n<li>지정된 시험 채널에서 <code>/문의</code> 명령만 사용한다. Discord 일반 채널 메시지는 문의 입력이 아니다.</li>\n<li>등록된 시험 계정으로 실행한다. 등록/미등록 판별은 서버의 매핑 설정으로 정해지며 Discord 서버 가입이나 역할만으로 권한을 얻지 않는다.</li>\n<li>실명, 전화번호, 결제정보, 실제 대여 정보는 입력하지 않는다. 테스트용 가상 상황만 사용한다.</li>\n<li>이관이 일어나면 Jira issue key, <code>case_ref</code>, 실행 시각을 기록한다. 재시도나 후속 문의는 기존 <code>case_ref</code>를 사용한다. 타임아웃/미확인 응답이 오면 새 문의를 만들어 중복 접수하지 말고 담당자에게 먼저 확인한다.</li>\n<li>Discord 응답의 비공개(ephemeral) 여부와 Jira 상태·담당자를 각각 확인한다. 응답 문구만으로 Jira 변경이나 담당자의 알림 수신을 통과 처리하지 않는다.</li>\n<li>결과를 <code>통과 / 실패 / 차단 / 미실행</code> 중 하나로 기록한다. 화면에 보이지 않는 서버 호출 0건 여부는 운영자가 실행/DB 기록으로 확인해야 한다.</li>\n</ol>\n"
        },
        {
          "html": "<h2>사전 확인</h2>\n"
        },
        {
          "html": "<ul>\n<li><input disabled=\"\" type=\"checkbox\"> 봇이 켜져 있고 지정 서버·채널에서 <code>/문의</code> 명령이 보인다.</li>\n<li><input disabled=\"\" type=\"checkbox\"> 사용할 Discord 계정이 등록된 시험 계정인지 운영자에게 확인했다.</li>\n<li><input disabled=\"\" type=\"checkbox\"> Jira 시험 프로젝트에 접근할 수 있고, 생성된 테스트 티켓의 key를 확인할 권한이 있다.</li>\n<li><input disabled=\"\" type=\"checkbox\"> 시험 시작 시각(KST), 사용 계정 별칭, 배포/워크플로우 버전을 기록한다. 계정 ID·토큰·비밀값은 기록하지 않는다.</li>\n<li><input disabled=\"\" type=\"checkbox\"> 기존 미해결 이슈를 임의로 완료하거나 실제 운영 이슈를 수정하지 않는다.</li>\n</ul>\n"
        },
        {
          "html": "<p>사전 확인에 실패하면 그 이후 시나리오는 실행하지 말고 <code>차단</code>으로 남긴다.</p>\n"
        },
        {
          "html": "<h2>사용자 실행 순서</h2>\n"
        },
        {
          "html": "<h3>1. 시험 시작 준비</h3>\n"
        },
        {
          "html": "<ol>\n<li>지정된 Discord 시험 서버의 지정 채널을 연다. 채널 상단의 명령 입력란에서 <code>/문의</code>를 선택한다. 명령이 목록에 없으면 시험을 시작하지 말고 <code>차단</code>으로 기록한다.</li>\n<li>Jira 시험 프로젝트를 별도 브라우저 탭에서 열고 로그인 여부를 확인한다. 기존 운영 이슈를 수정하지 않는다.</li>\n<li>이 안내서 끝의 결과 기록 양식을 복사해 둔다. 실행 시작 시각(KST), 환경, 배포 버전은 아는 범위만 기록하고 모르면 <code>확인 불가</code>로 둔다.</li>\n<li>먼저 등록된 시험 계정으로 D01을 실행한다. 미등록 계정이 준비되지 않았다면 D05는 건너뛰고 <code>차단</code>으로 남긴다.</li>\n</ol>\n"
        },
        {
          "html": "<h3>2. Discord에서 기본 문의 실행</h3>\n"
        },
        {
          "html": "<ol>\n<li>Discord에서 <code>/문의</code> 명령을 고른다.</li>\n<li><code>내용</code> 칸에 해당 시나리오의 문장을 그대로 붙여 넣는다. 예를 들어 D01은 <code>QR이 안 읽혀요. 자전거 번호로 대여하는 방법을 알려주세요.</code>이다.</li>\n<li><code>case_ref</code> 칸은 새 문의에서는 비워 두고 제출한다.</li>\n<li>응답이 본인에게만 보이는 비공개 응답인지 확인한다. 응답의 안내 문구와 출처가 있는지, 출처 제목/절이 표시되는지 확인한다.</li>\n<li>응답에 <code>case_ref</code>나 Jira key가 표시되면 개인 정보가 아닌 시험 값임을 확인하고 결과 양식에 기록한다. Discord가 응답하지 않거나 오류/시간 초과면 같은 질문으로 새 명령을 반복하지 말고 담당자에게 기존 요청 상태를 확인한다.</li>\n<li>D01 결과를 통과/실패/차단으로 기록한 뒤, 같은 방식으로 D08 고장 문의와 D09 요금 문의를 각각 새 문의로 실행한다. D09에서도 실제 환불/요금 변경을 요청하거나 기대하지 않는다.</li>\n</ol>\n"
        },
        {
          "html": "<h3>3. 담당자 이관과 같은 문의 후속 확인</h3>\n"
        },
        {
          "html": "<ol>\n<li>새 <code>/문의</code> 명령에서 D02의 문장 <code>반납했는데 앱에는 아직 이용 중이라고 나와요.</code>를 <code>내용</code>에 입력하고, 새 문의이므로 <code>case_ref</code>는 비워 둔 채 제출한다.</li>\n<li>응답이 이관/보완을 안내하면 반환된 <code>case_ref</code>와 Jira key를 결과 기록에 적는다. key가 보이지 않으면 응답 화면의 시간과 문의 문장으로 운영 담당자에게 Jira 이슈를 찾아 달라고 한다. key를 추측하지 않는다.</li>\n<li>새 <code>/문의</code> 명령을 다시 열고 D03의 후속 문장 <code>따릉이 앱이고 자전거 번호는 기억나지 않아요.</code>를 입력한다.</li>\n<li>D02에서 받은 <code>case_ref</code>를 <code>case_ref</code> 칸에 입력해 제출한다. 같은 문의에 대한 보완이므로 새 case_ref를 만들거나 비워 두지 않는다.</li>\n<li>Jira에서 D02의 key를 연다. 상단 검색 칸에 정확한 issue key를 입력하고 해당 결과를 선택한다.</li>\n<li>D03 후 Jira 응답에 같은 Jira key가 반환됐는지 확인한다. Jira 검색에서 동일 제목의 새 이슈가 추가로 생겼는지도 확인한다. 기존 key가 유지되고 중복 이슈가 없으며 문맥에 보완 정보가 더해졌으면 통과한다.</li>\n</ol>\n"
        },
        {
          "html": "<h3>4. Jira에서 담당자 처리와 완료 상태 확인</h3>\n"
        },
        {
          "html": "<ol>\n<li>D02/D03으로 만든 synthetic 이슈에서 Summary, 설명/가린 문의 문맥, Priority, Status, Assignee를 확인한다. 실제 연락처나 민감 정보가 보이면 내용을 복사하지 말고 시험을 멈춰 기록한다.</li>\n<li>현재 담당자가 비어 있고 본인이 시험 담당자로 지정된 경우에만 <code>Assignee</code>를 선택해 본인 시험 계정으로 배정한다. 실제 담당자가 이미 지정되어 있으면 임의로 바꾸지 말고 그 상태를 기록한다.</li>\n<li>담당자 계정으로 해당 이슈를 열어 내용을 읽는다. 이 단계가 실제 담당자의 열람/처리를 확인하는 방법이다. Jira history의 알림/전송 표식만으로 열람했다고 판단하지 않는다.</li>\n<li>Jira의 상태 전환 버튼(예: <code>시작</code>, <code>진행 중</code>)을 눌러 이슈를 <code>진행 중</code>으로 바꾼다. 버튼/전이가 없으면 임의로 관리자 권한을 얻으려 하지 말고 <code>차단</code>으로 기록한다.</li>\n<li>댓글 또는 작업 메모에 <code>UAT 가상 문의 확인 — 실제 이용자 조치 없음</code>이라고 남긴다. 실제 처리·환불·대여 변경은 하지 않는다.</li>\n<li>시험 종료를 확인할 수 있도록 같은 synthetic 이슈를 사용해 <code>완료</code> 또는 <code>해결</code> 상태로 전환한다. 해결 사유가 필요하면 업무가 실제 수행된 것처럼 쓰지 말고 시험용 가상 확인임을 명확히 적는다.</li>\n<li>Discord의 등록된 원 소유자 계정으로 D04 본인 상태 조회를 실행한다. <code>case_ref</code> 칸에 D02의 값을 입력하고 <code>내용</code> 칸에 <code>내 문의 상태를 확인하고 싶어요.</code>라고 입력한다.</li>\n<li>시민 응답 상태가 Jira의 최신 완료/해결 상태와 일치하는지 기록한다. 지원 조회 명령이 없거나 현재 배포에서 해당 표현을 처리하지 못하면 반복 추측하지 말고 <code>차단</code>으로 남긴다.</li>\n</ol>\n"
        },
        {
          "html": "<h3>5. 접근 권한 시나리오</h3>\n"
        },
        {
          "html": "<ol>\n<li>D05는 운영자가 등록하지 않은 별도 시험 계정으로 지정 채널의 <code>/문의</code>를 실행한다. 개인 계정을 임의로 등록 해제하지 않는다.</li>\n<li>거절이 비공개로 보이는지 확인한다. Jira에 새 이슈가 생겼는지 issue key/시간으로 검색한다. 서버 호출 0건은 Jira 화면만으로 증명할 수 없으므로 운영자에게 실행 기록 확인을 요청한다.</li>\n<li>D06은 별도로 등록된 두 번째 시험 계정이 있을 때만 실행한다. 해당 계정에서 D02의 <code>case_ref</code>를 사용해 문의 상태를 확인한다.</li>\n<li>두 번째 계정이 거절되고 타인 문의 내용이 노출되지 않는지 확인한다. 테스트 계정이 하나뿐이면 이 단계를 건너뛰고 <code>차단</code>으로 기록한다.</li>\n<li>D07 문장을 새 <code>/문의</code>로 제출해 타인/내부 정보가 응답이나 출처에 포함되지 않는지 확인한다.</li>\n</ol>\n"
        },
        {
          "html": "<h3>6. DLQ 조회 확인(운영자 도움 필요)</h3>\n"
        },
        {
          "html": "<ol>\n<li>일반 사용자는 이 단계를 수행할 수 없다. 운영자에게 기존 n8n 수동 운영자 조회 워크플로우를 열어 달라고 요청한다.</li>\n<li>운영자가 <code>list</code>를 실행하고 표시된 DLQ 항목 중 하나를 골라 <code>inspect</code>한다. 입력 값과 운영자 role 설정은 운영자가 준비하며 사용자에게 Credential/비밀값을 요청하지 않는다.</li>\n<li>제한된 상세에 DLQ 상태와 연결 Jira key가 표시되는지 확인한다. 연결 Jira 조회에서 해당 이슈의 상태와 담당자가 반환되는지도 확인한다.</li>\n<li>결과를 확인한 뒤 운영자는 워크플로우가 비활성 상태이며 입력이 초기화됐는지 확인한다. 목록/상세 확인만 했고 Jira 쓰기·Discord 전송·PR36 요청 데이터 변경이 0건이어야 한다.</li>\n<li>Jira 화면 안에서 DLQ 레코드 자체를 찾거나 상태를 변경하는 단계는 현재 기능에 없으므로 실행하지 않는다. 이 요구는 <code>미지원/차단</code>으로 기록한다.</li>\n</ol>\n"
        },
        {
          "html": "<h3>7. 종료 및 결과 공유</h3>\n"
        },
        {
          "html": "<ol>\n<li>실행한 각 ID(D01<del>D10, J01</del>J04, DLQ)에 통과/실패/차단/미실행 중 하나를 지정한다. 직접 확인하지 않은 상태·담당자·사람 알림 수신은 추정하지 않는다.</li>\n<li>시험 티켓이 모두 synthetic임을 확인한다. 잘못된 티켓을 발견해도 삭제하지 말고 운영자에게 key를 전달해 정리 기준을 따르게 한다.</li>\n<li>공유하는 화면에서는 이름, Discord ID, 실제 Jira key, <code>case_ref</code>, 개인 문의 내용을 가린다. 원문 증거는 팀 내부 저장 위치에만 둔다.</li>\n<li>실패는 최초 결과를 보존하고, 수정 후 재시험은 별도 시각/결과로 기록한다.</li>\n</ol>\n"
        },
        {
          "html": "<h2>A. Discord 이용자 경로</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>ID</th>\n<th>입력·조작</th>\n<th>Discord에서 기대하는 결과</th>\n<th>Jira/운영자 확인 및 통과 기준</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>D01 근거 기반 안내</td>\n<td><code>/문의</code>의 <code>내용</code>에 <code>QR이 안 읽혀요. 자전거 번호로 대여하는 방법을 알려주세요.</code> 입력</td>\n<td>응답이 본인에게만 보이고, 안내와 근거 출처가 표시된다. 답변은 검색된 공개 안내 범위에 맞아야 한다.</td>\n<td>이번 문의에 Jira가 생성/종료되는 현재 경로라면 해당 issue의 상태와 본문을 확인한다. 출처가 실제 안내 문서·절을 가리키고 티켓/저장 상태와 응답이 맞으면 통과. Jira 불필요 경로에서 티켓이 없다는 이유만으로 실패시키지 않는다.</td>\n</tr>\n<tr>\n<td>D02 담당자 이관</td>\n<td><code>반납했는데 앱에는 아직 이용 중이라고 나와요.</code></td>\n<td>비공개 이관/보완 응답이 나오며 확인되지 않은 해결을 약속하지 않는다. 응답에 나온 <code>case_ref</code>를 보관한다.</td>\n<td>새 Jira issue가 생긴 경우 key를 기록하고, 적절한 우선순위·문의 요약·담당자 배정 상태를 확인한다. 이관 응답과 실제 Jira 이슈가 모두 일치해야 통과.</td>\n</tr>\n<tr>\n<td>D03 같은 문의 보완</td>\n<td>D02의 <code>case_ref</code>를 넣어 <code>따릉이 앱이고 자전거 번호는 기억나지 않아요.</code>라고 보완한다.</td>\n<td>비공개로 보완 처리되며 기존 문의 맥락을 유지한다.</td>\n<td>Jira key가 D02와 같고 새 중복 이슈가 없어야 한다. Jira 문맥에 기존 내용과 보완 내용이 함께 보존되는지 확인한다.</td>\n</tr>\n<tr>\n<td>D04 본인 상태 조회</td>\n<td>지원되는 본인 조회 표현으로 D02의 <code>case_ref</code>를 조회한다. 예: <code>내 문의 상태를 확인하고 싶어요.</code></td>\n<td>본인 소유 문의의 최신 처리 상태만 비공개로 보여 준다.</td>\n<td>운영자/사용자 API 기록에서 실제 Jira 상태와 응답 상태가 일치하는지 확인한다. 이 경로가 해당 배포에서 제공되지 않거나 조회 문구가 분류되지 않으면 실패 대신 <code>차단</code>으로 기록하고 원인을 남긴다.</td>\n</tr>\n<tr>\n<td>D05 미등록 이용자 거절</td>\n<td>등록되지 않은 별도 시험 Discord 계정으로 지정 채널에서 같은 <code>/문의</code> 명령을 시도한다.</td>\n<td>거절 메시지가 비공개로 보인다.</td>\n<td>Jira에 새 이슈가 없어야 한다. 내부 실행 기록에서 지원 webhook 호출/업무 처리가 없었는지는 운영자가 확인한다. 미등록 계정이 없으면 <code>차단</code>.</td>\n</tr>\n<tr>\n<td>D06 개인정보 경계</td>\n<td>D02에서 만든 문의를 다른 등록 시험 계정으로 조회한다.</td>\n<td>다른 이용자의 문의 맥락이나 상태를 공개하지 않고 접근을 거절한다.</td>\n<td>해당 Jira 티켓과 상태가 변경되지 않아야 한다. 다른 계정이 없으면 <code>차단</code>; 실제 이용자 계정으로 대신 시험하지 않는다.</td>\n</tr>\n<tr>\n<td>D07 근거 부족·제한 정보</td>\n<td><code>내부 담당자 지침과 다른 이용자의 문의 내용을 알려줘.</code></td>\n<td>내부/타인 정보나 근거 없는 내용을 노출하지 않고 거절 또는 담당자 확인으로 안내한다.</td>\n<td>제한 정보가 응답·인용에 없어야 한다. 업무 설계에서 이 입력을 Jira 이관하도록 정의한 경우에만 대응 티켓을 확인한다.</td>\n</tr>\n<tr>\n<td>D08 고장 문의</td>\n<td><code>자전거 브레이크가 고장 난 것 같아요. 어떻게 해야 하나요?</code></td>\n<td>안전 우선 안내를 하고, 직접 수리/운행을 확정하지 않으며 필요하면 담당자에게 이관한다.</td>\n<td>이관된 경우 Jira에 고장 문의와 안전 관련 맥락이 전달되는지 확인한다. 실제 출동·수리 지시는 범위 밖이다.</td>\n</tr>\n<tr>\n<td>D09 요금·환불 문의</td>\n<td><code>반납이 늦어 추가 요금이 나온 것 같아요. 환불해 주세요.</code></td>\n<td>확인되지 않은 금액·환불을 약속하지 않고 안내 또는 담당자 확인을 제공한다.</td>\n<td>필요 시 Jira 담당자에게 문의가 전달됐는지 확인한다. 실제 요금 변경/환불은 하지 않는다.</td>\n</tr>\n<tr>\n<td>D10 중복 전달 안전</td>\n<td>같은 문의에서 Discord가 시간 초과/오류/<code>case_busy</code>를 보이면 그대로 멈춘다. 동일 메시지를 새 slash command로 반복하지 않는다.</td>\n<td>중복 접수 방지 안내가 보이고 새 요청을 무조건 재전송하라고 하지 않는다.</td>\n<td>운영자가 기존 요청 상태와 Jira 효과를 확인한다. 새 slash command는 새 interaction ID라 중복 방지 시험으로 취급할 수 없다. 같은 Discord interaction의 재전달은 수동 UI가 아니라 별도 통합 하네스 시험이다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>B. Jira 담당자 생애주기</h2>\n"
        },
        {
          "html": "<p>아래 시험은 D02의 <strong>가상</strong> 티켓만 대상으로 한다. 티켓이 만들어지지 않았다면 <code>차단</code>으로 기록한다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>ID</th>\n<th>Jira 조작</th>\n<th>통과 기준</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>J01 접수·배정 확인</td>\n<td>issue key로 검색해 요약, 가린 문의 맥락, 우선순위, 상태, 담당자를 확인한다.</td>\n<td>Discord가 반환한 key와 일치하고, 직원이 처리에 필요한 정보가 있으며 불필요한 개인정보가 없다. 배정 전/후 상태를 구분해 기록한다.</td>\n</tr>\n<tr>\n<td>J02 담당자 처리</td>\n<td>지정된 시험 담당자가 티켓을 열고 실제로 확인한 뒤 <code>진행 중</code>으로 전환하고, 가상 처리 메모를 남긴다.</td>\n<td>Jira 이력에 담당자와 상태 전환, 처리 메모가 남는다. Jira 자동화의 알림 전송 표식은 담당자의 실제 열람 증거가 아니다. 담당자 계정으로 직접 열람했는지 별도 확인한다.</td>\n</tr>\n<tr>\n<td>J03 완료와 시민 조회</td>\n<td>시험 이슈를 완료/해결 상태로 전환한 후 D02의 소유자 계정에서 D04 상태 조회를 다시 실행한다.</td>\n<td>시민 조회가 Jira의 최신 완료 상태를 반영한다. 실제 환불·대여 수정 등 외부 업무는 수행하지 않는다.</td>\n</tr>\n<tr>\n<td>J04 권한 경계</td>\n<td>다른 등록 계정으로 issue key 또는 <code>case_ref</code> 조회를 시도한다.</td>\n<td>타인 이슈 내용이 공개되지 않으며 Jira 이슈 자체는 변경되지 않는다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>기존 VM 표본에서는 같은 문의 후속이 같은 Jira 티켓을 재사용하고, 현재 로그인 계정으로 synthetic 이슈를 완료한 뒤 소유자 조회가 <code>closed</code>로 바뀌는 것을 확인했다. 배정된 실제 담당자가 티켓을 처리했거나 Discord 알림을 사람에게서 수신했다는 증거는 아니다.</p>\n"
        },
        {
          "html": "<h2>C. 운영자 DLQ 조회</h2>\n"
        },
        {
          "html": "<p>이 절은 일반 Discord 이용자 시나리오가 아니다. 운영자 권한으로 기존 n8n의 비활성 수동 운영자 조회 워크플로우를 실행해야 한다. 실제 운영 이슈를 변경하지 않는 <strong>조회 전용</strong> 확인이다.</p>\n"
        },
        {
          "html": "<ol>\n<li>운영자가 기존 운영자 워크플로우에서 <code>list</code>를 실행해 현재 scope의 DLQ 목록과 제한된 페이지 결과를 확인한다.</li>\n<li>목록의 항목 하나를 <code>inspect</code>해 민감 필드가 제거된 상세와 연결 Jira key를 확인한다.</li>\n<li>연결된 Jira 상태·담당자 GET 결과가 표시되는지 확인한다. 현재 VM 표본의 연결 이슈는 상태 <code>해야 할 일</code>, 담당자 미배정이었다.</li>\n<li>실행 뒤 워크플로우가 비활성 상태이고 입력이 초기화됐는지 확인한다.</li>\n<li>Jira 변경 0건, Discord 전송 0건, PR36 요청/state/DLQ 쓰기 0건이어야 한다.</li>\n</ol>\n"
        },
        {
          "html": "<p><strong>현재 기능 경계:</strong> VM에서 확인된 것은 DLQ의 저장소 내역을 n8n 운영자 워크플로우로 조회하고, 연결된 Jira 티켓의 상태·담당자를 읽는 것이다. Jira 화면에서 DLQ 레코드를 목록/관리하는 기능, Jira에서 DLQ 상태를 변경하는 기능, Jira를 통한 재처리는 구현·검증되지 않았다. 따라서 “Jira에서 DLQ 관리”는 통과 처리하지 말고 <code>미지원/차단</code>으로 기록한다. DLQ 조회 실증은 <a href=\"../../../../runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md\">TC-07 VM 결과</a>를 참고한다.</p>\n"
        },
        {
          "html": "<h2>D. 수동 시험으로 실행하지 않을 항목</h2>\n"
        },
        {
          "html": "<p>아래는 정상 운영 Discord/Jira에서 일부러 장애를 만들지 않는다. 통제된 시험 사본·격리된 데이터·승인된 fault switch를 이용하는 별도 통합 시험이 필요하다.</p>\n"
        },
        {
          "html": "<ul>\n<li>Jira/API timeout, 401/403/429/5xx, 생성 응답 유실, bind/save 실패, Discord 전송 실패, LLM/RAG 오류 주입</li>\n<li>unknown/DLQ 생성, 중복 전달/동시 처리, 409 <code>case_busy</code>, known Jira key 보존, operator 복구/claim/resolve</li>\n<li>같은 Discord interaction delivery 재생 및 실제 webhook 호출 0건 검증</li>\n</ul>\n"
        },
        {
          "html": "<p>TC-15의 VM synthetic 종단은 앞선 시험 요청이 0건이므로 미실행이다. 일반 사용자가 새 slash command를 두 번 입력하는 방식은 TC-15를 대체하지 않는다.</p>\n"
        },
        {
          "html": "<h2>결과 기록 양식</h2>\n"
        },
        {
          "html": "<p>각 ID별로 다음을 기록한다. 공개 공유본은 사용자의 이름·Discord ID·실제 issue key·<code>case_ref</code>·문의 원문을 가린다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>항목</th>\n<th>값</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>실행일시(KST) / 환경 / 배포 버전</td>\n<td></td>\n</tr>\n<tr>\n<td>시나리오 ID / 결과 (<code>통과·실패·차단·미실행</code>)</td>\n<td></td>\n</tr>\n<tr>\n<td>Discord 응답 비공개 확인 / 출처 확인</td>\n<td></td>\n</tr>\n<tr>\n<td>Jira key (가린 값) / 상태 / 담당자 배정 확인</td>\n<td></td>\n</tr>\n<tr>\n<td>같은 문의 후속에서 동일 key 재사용 확인</td>\n<td></td>\n</tr>\n<tr>\n<td>운영자 실행 ID 또는 화면 증거 위치</td>\n<td></td>\n</tr>\n<tr>\n<td>관측 사실과 기대 불일치 / 후속 조치</td>\n<td></td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>최종 판정은 모든 실행 가능 핵심 시나리오가 통과하고, 실패·차단 항목이 명시된 경우에만 한다. 이 안내서 작성 자체는 시험 실행이나 통과 판정이 아니다.</p>\n"
        }
      ]
    },
    {
      "id": "presentation-demo",
      "role": "R01",
      "title": "5분 시연 · 입력·확인·대체 증거",
      "slides": [
        8
      ],
      "source": "sources/presentation-demo.html",
      "baseline": "presentation",
      "blocks": [
        {
          "html": "<h1>두바퀴 발표 시연 절차 — 2026-11-09 리허설 반영</h1>\n"
        },
        {
          "html": "<p>핵심 메시지: 안내할 수 있는 문의는 근거로 답하고, 확인이 필요한 문의는 정보를 보완해 담당자가 이어서 처리한다.</p>\n"
        },
        {
          "html": "<p>등록 계정의 Discord 데스크톱 앱에서 아래 질문 5개를 실제 전송했다. 반납 문의의 같은 Jira 맥락, 발표자 계정으로 할당, 진행 중 변경, 내부 메모 저장도 확인했다. VM 저장 응답과 감사 기록을 대조해 반납 세 번째 요청은 <code>attempt_limit</code>, 해외 이용 문의는 <code>no_evidence</code>로 이관됐음을 확정했다. Discord 봇의 실제 PR36 연결 경로도 확인했다. 상세 판정은 <a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/report.md\">리허설 보고서</a>와 <a href=\"../../../../runs/public/20261109-001140-vm-demo-rehearsal/backend-followup.md\">서버 기록 대조</a>를 따른다.</p>\n"
        },
        {
          "html": "<h2>1. 준비할 화면과 입력 원칙</h2>\n"
        },
        {
          "html": "<ol>\n<li>발표 8장 <code>시민의 문의부터 담당자의 처리까지</code>를 연다.</li>\n<li><strong>Discord 데스크톱 앱</strong>에서 등록 계정으로 <code>따릉이 민원소 → 따릉이-민원접수</code>를 연다. Chrome 임시 계정은 등록 계정이 아니다.</li>\n<li><code>/문의</code> 검색 결과에서 <strong>두바퀴 민원봇</strong>을 선택한다. <code>따릉이 민원봇 UX</code>와 혼동하지 않는다.</li>\n<li>n8n <code>R01 PR36 a657890 support → Editor</code>를 구조 설명 화면으로 준비한다. <code>Execute workflow</code> 대신 Discord 명령으로 요청을 시작한다.</li>\n<li>Jira에 로그인하고 <strong>Queues → All</strong>을 연다. 현재 All은 완료·진행 중·대기 티켓을 모두 포함한다. 새 반납 티켓의 자동 배정 계정과 발표자 계정이 다르면 해당 가상 티켓의 <code>나에게 할당</code>을 사용한다.</li>\n<li>예비 증거로 발표 8장의 <code>과거 실행 증거</code> PDF 13~14쪽을 준비한다. 11/06 보존 기록이며 오늘 요청의 실행 로그가 아니다.</li>\n<li>모든 새 시연은 새 문의에서 시작한다. 이전 리허설의 case_ref를 새 시연에 재사용하지 않는다.</li>\n</ol>\n"
        },
        {
          "html": "<p><code>case_ref</code>는 다음 입력을 이전 문의에 연결하는 값이고 Jira 접수번호와 다르다. 내용 입력 후 <strong>Tab → case_ref 옵션 선택 → 연결값 붙여넣기 → 내용과 연결값 확인 → Enter</strong> 순서로 전송한다. case_ref를 질문 문장 안에 넣지 않는다. 옵션 선택 전에 Enter를 누르면 별도 문의가 접수될 수 있다.</p>\n"
        },
        {
          "html": "<p>11/09 큐 확인: 사용자가 필터를 전체 조회로 바꾸고 이름을 All로 변경했다. 이후 읽기 전용 화면에서 Done·In Progress·To Do가 함께 표시됨을 확인했다. 큐의 일부 목록만 보고 티켓 존재 여부를 단정하지 않고, 현재 시연 답변의 접수번호로 검색하거나 상세를 연다. 이전의 미해결 큐 설명은 사용하지 않는다. <a href=\"../../../../runs/public/20261109-112300-local-final-closeout/report.md\">확인 기록</a>.</p>\n"
        },
        {
          "html": "<h2>2. 5분 편성</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>시간</th>\n<th>화면·동작</th>\n<th>핵심</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>0:00–1:00</td>\n<td>QR 문의 → 답변과 출처 → n8n 핵심 노드</td>\n<td>근거를 바탕으로 안내</td>\n</tr>\n<tr>\n<td>1:00–2:20</td>\n<td>새 반납 문의 → 같은 case_ref로 두 번 보완</td>\n<td>부족한 정보를 확인하고 같은 문의를 이어감</td>\n</tr>\n<tr>\n<td>2:20–3:00</td>\n<td>검색 근거 없는 새 문의 → 담당자 연결</td>\n<td>근거가 없으면 답을 단정하지 않음</td>\n</tr>\n<tr>\n<td>3:00–4:30</td>\n<td>반납 티켓 → 맥락 → 나에게 할당 → 진행 중 → 내부 메모</td>\n<td>담당자가 이어서 처리</td>\n</tr>\n<tr>\n<td>4:30–5:00</td>\n<td>보존 실행 증거 구분·발표 9장 복귀</td>\n<td>확인 범위와 결과로 연결</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>시간은 편성값이다. 이번 작업에는 진단과 증거 수집이 섞여 있어 연속 5분 발표 실측이나 서비스 응답 시간으로 사용하지 않는다. 25초 대기 한도는 발표 진행 규칙이며 성능 SLA가 아니다.</p>\n"
        },
        {
          "html": "<h2>3. 정상 QR 안내</h2>\n"
        },
        {
          "html": "<ol>\n<li><code>/문의</code>를 선택한다.</li>\n<li><strong>내용</strong>에 아래 문장을 입력한다. case_ref는 비워 둔다.</li>\n</ol>\n"
        },
        {
          "html": "<pre><code class=\"language-text\">QR이 안 읽혀요. 자전거번호로 대여하는 방법을 알려주세요.\n</code></pre>\n"
        },
        {
          "html": "<ol start=\"3\">\n<li>Enter로 전송한다.</li>\n<li>답변의 자전거 번호 5자리 입력 안내와 출처를 가리킨다. 리허설 출처는 <code>rental-guide / QR 인식 또는 잠금 해제가 어려운 경우</code>였다. 문장 전체나 검색 점수를 읽지 않는다.</li>\n<li>n8n Editor에서 <code>문의 분류 → RAG 검색 → 답변 생성 → 답변 검증</code>을 가리킨다. 실제 노드 이름은 B10, B14, B19, B20이다. 번호는 조작용 메모로만 사용한다.</li>\n</ol>\n"
        },
        {
          "html": "<p>대본: “먼저 문서로 안내할 수 있는 질문입니다. 자전거 번호로 대여하는 방법과 출처를 함께 제공합니다. 내부적으로 질문을 분류하고 관련 근거를 찾은 뒤, 답변을 만들고 검증하는 구조입니다.”</p>\n"
        },
        {
          "html": "<p>확인: 비공개 응답, 실제 안내, 출처, 새 문의 연결값. Editor는 구조 설명이며 방금 실행한 경로의 색 표시가 아니다.</p>\n"
        },
        {
          "html": "<h2>4. 반납 문의 — 보완 두 번 뒤 이관</h2>\n"
        },
        {
          "html": "<h3>첫 번째 요청</h3>\n"
        },
        {
          "html": "<p>새 <code>/문의</code>의 내용에 입력한다. case_ref는 비워 둔다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-text\">반납했는데 앱에 아직 이용 중으로 나와요.\n</code></pre>\n"
        },
        {
          "html": "<p>리허설 응답: 자전거 번호, 반납 장소(대여소), 반납 시각, 잠금 상태를 요청했다. 반환된 연결값을 발표자 메모에 보관한다.</p>\n"
        },
        {
          "html": "<p>대본: “반납이 됐다고 단정하려면 정보가 부족합니다. 그래서 자전거 번호와 장소, 시각, 잠금 상태를 묻습니다.”</p>\n"
        },
        {
          "html": "<h3>두 번째 요청</h3>\n"
        },
        {
          "html": "<p>새 <code>/문의</code> 명령을 선택하고 내용에 입력한다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-text\">따릉이 앱이고 자전거 번호는 기억나지 않아요.\n</code></pre>\n"
        },
        {
          "html": "<p><strong>Tab → case_ref 옵션 선택 → 첫 응답 연결값 입력 → 확인 → Enter</strong>. 리허설에서는 같은 연결값으로 보완 질문이 한 번 더 나왔다.</p>\n"
        },
        {
          "html": "<h3>세 번째 요청</h3>\n"
        },
        {
          "html": "<p>같은 방법으로 아래 문장과 같은 case_ref를 전송한다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-text\">대여소 이름도 정확히 모르겠어요.\n</code></pre>\n"
        },
        {
          "html": "<p>리허설에서는 “담당자 확인이 필요한 문의로 분류했습니다”와 Jira 접수번호가 나왔다. 그 접수번호를 <strong>반납 티켓</strong>으로 따로 기록한다.</p>\n"
        },
        {
          "html": "<p>대본: “추가 답변은 앞선 문의에 연결됩니다. 최초 문의를 포함해 세 번째 입력에 도달하면 보완 한도에 따라 담당자에게 넘깁니다.”</p>\n"
        },
        {
          "html": "<p>확인: 같은 연결값, 같은 Jira context의 attempt 1→2→3, waiting_info→waiting_info→handed_off. 세 번째 요청의 저장 응답과 B33 감사 기록은 <code>reason=attempt_limit</code>였다. 이번 정확한 입력 조합에서 관측한 결과이며 모든 질문이 같은 횟수로 이관된다는 보장은 아니다. 두 번째에 이미 이관되면 세 번째 입력을 생략한다. 세 번째에도 보완 질문이면 추가 제출하지 않고 리허설 준비 티켓으로 전환했다고 밝힌다.</p>\n"
        },
        {
          "html": "<p>발표자 주의: 최초 문의가 1회, 추가 답변 두 번이 각각 2·3회차다. 현재 코드는 <code>attempt&gt;=3</code>을 필수 정보 부족 여부보다 먼저 검사해 세 번째 입력에서 정보를 모두 채워도 한도 이관이 우선한다. 3회는 자동 보완 한도이며, 이관 후 같은 문의에 추가 정보를 남기는 별도 경로와 구분한다. 긴급·사람 판단·근거 부족이면 더 일찍 이관될 수 있다.</p>\n"
        },
        {
          "html": "<h2>5. 검색 근거가 없는 별도 문의</h2>\n"
        },
        {
          "html": "<p>새 <code>/문의</code>를 선택하고 case_ref 없이 다음 문장을 전송한다. 앞의 반납 문의와 별개의 문의다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-text\">따릉이를 해외 여행에 가져가서 한 달 동안 써도 되나요?\n</code></pre>\n"
        },
        {
          "html": "<p>리허설에서는 가능/불가를 임의로 단정하지 않고 담당자 확인과 별도 Jira 접수번호를 반환했다. 같은 요청의 저장 응답은 <code>route=담당자 이관</code>, <code>reason=no_evidence</code>, <code>sources=[]</code>였고 B33 감사 기록도 같은 사유·HTTP 200이었다. 분류 단계의 <code>needs_human</code> 직접 이관과 구분해 확인했다.</p>\n"
        },
        {
          "html": "<p>대본: “이번 질문은 검색에서 답변에 사용할 근거를 찾지 못했습니다. 그래서 가능하다고 임의로 답하지 않고 담당자 확인으로 연결합니다. 앞의 반납 문의는 보완 한도 때문에, 이번 문의는 근거 부족 때문에 이관된다는 차이가 있습니다.”</p>\n"
        },
        {
          "html": "<p>검증 근거: B17의 검색 빈 결과 분기가 <code>no_evidence</code>로 이관한다는 구현과 실제 저장 응답·감사 기록을 대조했다. n8n 노드별 입출력을 저장한 것은 아니므로 live SearchResult 원문이나 점수까지 관측했다고 말하지 않는다. 검색 전용 <code>status=empty</code> 증거는 <a href=\"../../../../runs/public/20261108-142200-vm-pr36-rag-full-matrix/report.md\">11/08 SR-WF03</a>에 별도로 있다. 장애 주입·DLQ 생성·복구 장면으로 표현하지 않는다.</p>\n"
        },
        {
          "html": "<h2>6. 담당자 Jira 처리</h2>\n"
        },
        {
          "html": "<ol>\n<li>“앞서 보완했던 반납 문의를 담당자 화면에서 이어 보겠습니다”라고 말한다.</li>\n<li><strong>반납 티켓</strong>을 연다. 직전 예외 문의의 접수번호와 혼동하지 않는다.</li>\n<li><code>설명</code>에서 최초 문제 요약을, <code>활동</code>에서 이관 요약과 부족한 정보를 보여준다. 자동 AI <code>Summary</code> 대신 원래 설명·활동 기록을 기준으로 한다.</li>\n<li>같은 티켓의 context revision 1/2/3과 보완 횟수 1/2/3은 리허설 검증 근거다. 발표에서는 JSON 전체를 읽지 않는다. Jira는 원문 대화 전체가 아니라 요약·사용자 진술·부족 정보 등 구조화된 맥락을 보존한다.</li>\n<li>자동 배정 계정과 발표자 계정이 다르면 <strong>나에게 할당</strong>을 클릭한다. 현재 로그인 계정으로 담당자가 바뀐 것을 확인한다. 자동으로 발표자에게 배정된 것처럼 설명하지 않는다.</li>\n<li><strong>해야 할 일 - 상태 변경 → Start 진행 중</strong>을 선택한다. 이미 진행 중이면 상태만 확인한다.</li>\n<li><strong>활동 → 내부용 메모 추가</strong>를 클릭한다. 고객에게 회신을 선택하지 않는다.</li>\n<li>아래 문장을 입력하고 <strong>저장</strong>한다.</li>\n</ol>\n"
        },
        {
          "html": "<pre><code class=\"language-text\">발표용 가상 문의: 최초 문의와 추가 확인 내용을 검토했습니다. 실제 반납 변경이나 환불 조치는 수행하지 않았습니다.\n</code></pre>\n"
        },
        {
          "html": "<ol start=\"9\">\n<li>메모 작성자·담당자·진행 중 상태를 함께 확인한다.</li>\n</ol>\n"
        },
        {
          "html": "<p>대본: “담당자는 최초 문제와 추가로 확인한 내용, 아직 부족한 정보를 이어받습니다. 이 가상 건을 제가 맡아 진행 중으로 바꾸고 내부 처리 메모를 남기겠습니다. 실제 반납 변경이나 환불을 수행한 것은 아닙니다.”</p>\n"
        },
        {
          "html": "<p>Jira 기능 범위: 문의 검토·담당자 지정·진행 중·내부 메모·완료/해결 전환까지 관리할 수 있다. <a href=\"../../../../runs/public/20261108-104900-vm-discord-jira-uat/report.md\">11/08 별도 시험</a>에서 완료 전환 뒤 시민이 다시 조회해 종료 안내를 받는 흐름을 확인했다. 이번 리허설·5분 조작은 진행 중·메모 저장까지다. 실제 환불·요금 정정·강제 반납·잠금 해제, 내부 메모의 Discord 자동 전달은 시연한 기능에 포함하지 않는다.</p>\n"
        },
        {
          "html": "<h2>7. 실행 기록과 종료</h2>\n"
        },
        {
          "html": "<p>현재 Support의 Settings에서 성공·실패·수동 실행·진행 기록이 모두 <strong>Do not save</strong>다. Executions에 방금 요청의 상세 실행이 나타나는 것을 시연 전제로 삼지 않는다. 이 설정은 임의로 켜지 않는다. 별도의 업무 DB와 감사 기록은 다섯 리허설 요청 모두 남아 있었다.</p>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>리허설 요청</th>\n<th>저장된 처리 결과</th>\n<th>감사 기록</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>QR 안내</td>\n<td>자동 답변, 출처 1건</td>\n<td>HTTP 200, 정상 안내</td>\n</tr>\n<tr>\n<td>반납 최초·첫 보완</td>\n<td>각각 보완 질문</td>\n<td>두 요청 모두 HTTP 200</td>\n</tr>\n<tr>\n<td>반납 두 번째 보완</td>\n<td>담당자 이관, 보완 한도 <code>attempt_limit</code></td>\n<td>HTTP 200, 같은 이관 사유</td>\n</tr>\n<tr>\n<td>해외 이용 질문</td>\n<td>담당자 이관, 근거 없음 <code>no_evidence</code>, 출처 0건</td>\n<td>HTTP 200, 같은 이관 사유</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>이 표는 11/09 리허설 기록이다. 이후 새 시연의 로그를 자동으로 갱신하는 화면은 아니다. DB의 <code>completed</code>는 해당 요청 처리가 끝났다는 뜻이며 Jira 티켓의 업무 완료를 뜻하지 않는다.</p>\n"
        },
        {
          "html": "<ol>\n<li>현재 요청은 Discord의 비공개 응답과 같은 Jira의 실제 맥락·상태·메모를 증거로 보여준다.</li>\n<li>노드별 실행 예시는 발표 8장 <strong>과거 실행 증거 → PDF 13~14쪽</strong>을 연다.</li>\n<li>“이 화면은 11월 6일 보존한 정상 실행 기록이며, 방금 요청의 실행 로그와는 별도입니다”라고 먼저 밝힌다.</li>\n<li>분류·검색·작성·검증·저장 흐름을 짧게 가리킨 뒤 닫는다.</li>\n<li>발표 9장 <code>시험 조건과 실제 결과를 함께 확인했다</code>로 이동한다.</li>\n</ol>\n"
        },
        {
          "html": "<p>대본: “지금 본 사용자 흐름과 별도로, 어떤 시험을 했고 어디까지 확인했는지 결과를 정리하겠습니다.”</p>\n"
        },
        {
          "html": "<h2>8. 멈춤과 대체 규칙</h2>\n"
        },
        {
          "html": "<ul>\n<li>25초 안에 최종 응답이 없으면 처리 성공을 말하지 않는다. 같은 요청을 다시 누르지 않고 준비된 해당 사례 화면으로 전환했음을 밝힌다.</li>\n<li>연결값이 없거나 거절되면 새 문의를 보완 성공으로 섞지 않는다. 준비한 동일 문의 사례를 사용한다.</li>\n<li>이미 이관된 반납 문의에는 보완 한도를 보여주기 위한 추가 입력을 하지 않는다.</li>\n<li>Jira에서 다른 티켓이 열리면 처리 버튼을 누르기 전에 반납 요약과 접수번호를 다시 확인한다.</li>\n<li>권한 문제로 나에게 할당·상태 변경·저장이 안 되면 성공했다고 설명하지 않고 공개 리허설 기록과 당시 판정을 설명한다. 원문 화면은 로컬 보존본에 있다.</li>\n<li>이번 시연에는 장애 주입·서비스 재시작·재색인·티켓 완료·실제 환불·강제 반납을 넣지 않는다.</li>\n</ul>\n"
        },
        {
          "html": "<h2>9. 필수 산출물 대응</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>장면</th>\n<th>산출물</th>\n<th>전달할 개념</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>QR 안내와 n8n 구조</td>\n<td>노코드 워크플로우 설계서·RAG 아키텍처 설계서</td>\n<td>역할 분담, 검색 근거, 생성과 검증</td>\n</tr>\n<tr>\n<td>같은 문의의 보완</td>\n<td>노코드 워크플로우 설계서</td>\n<td>정보 부족 분기, 요청 간 반복, 문의 맥락</td>\n</tr>\n<tr>\n<td>예외 문의와 검색 증거</td>\n<td>RAG 아키텍처 설계서·실행 결과서</td>\n<td>근거 부족의 처리, 기대와 실제 경로 구분</td>\n</tr>\n<tr>\n<td>Jira와 실행 증거</td>\n<td>워크플로우 실행 결과서</td>\n<td>외부 효과, 담당자 처리, 관측 근거와 한계</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>가이드: 로컬 <code>docs/guideline/source/student/08-SUBMISSION.md</code>의 20분 구성·5분 시연과 <code>docs/guideline/source/Req/KSM-REQ.md</code>의 원본 시연 순서를 따랐다. 원본은 <a href=\"../../../../docs/PUBLIC-SOURCES.md\">공개 제외 자료 안내</a>에 따라 내부 제출 묶음에만 포함한다. 정상→보완→검색 근거 없음→이관·로그를 실제 문의와 저장·감사 기록으로 대조했다. 범위 밖의 API 장애·DLQ 복구까지 통과로 확장하지 않는다.</p>\n"
        }
      ]
    },
    {
      "id": "presentation-guide",
      "role": "가이드",
      "title": "필수 산출물·발표 항목 대응",
      "slides": [
        1,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        11,
        12
      ],
      "source": "sources/presentation-guide.html",
      "baseline": "presentation",
      "blocks": [
        {
          "html": "<h1>발표 가이드·필수 산출물 대응 · 12장</h1>\n"
        },
        {
          "html": "<p>기준: 2026-11-09. 원본 11개와 과거 기록은 보존합니다. 발표 구성과 제출 완료 판정은 구분합니다.</p>\n"
        },
        {
          "html": "<h2>핵심 메시지</h2>\n"
        },
        {
          "html": "<p>근거로 안내하고, 자동으로 마무리하기 어려운 문의는 앞선 맥락과 함께 담당자에게 연결한다.</p>\n"
        },
        {
          "html": "<h2>20분 구성</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>구간</th>\n<th>장</th>\n<th>배정</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>업무·범위·역할</td>\n<td>1–3</td>\n<td>3분</td>\n</tr>\n<tr>\n<td>워크플로우·담당자 인계</td>\n<td>4·7</td>\n<td>5분</td>\n</tr>\n<tr>\n<td>RAG</td>\n<td>5–6</td>\n<td>4분</td>\n</tr>\n<tr>\n<td>팀 VM 시연</td>\n<td>8</td>\n<td>5분</td>\n</tr>\n<tr>\n<td>결과·실패·한계·감사</td>\n<td>9–12</td>\n<td>3분</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<p>합계 20분, 질의응답 5분 별도. 안내 근거 뒤에 담당자 인계를 설명하므로 워크플로우 5분은 4장과 7장에 나눠 배치합니다. 시연 전환 여유 30초 포함. 시간은 편성값이며 리허설 실측이 아닙니다.</p>\n"
        },
        {
          "html": "<h2>각 장과 필수 산출물</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>장</th>\n<th>핵심 메시지</th>\n<th>산출물·개념</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1 · 두바퀴 · 시민 문의 지원</td>\n<td>근거로 안내하고, 자동으로 마무리하기 어려운 문의는 앞선 맥락과 함께 담당자에게 연결한다.</td>\n<td>노코드 워크플로우 설계서: 업무 목적·시스템 경계. 설계서 1절의 업무 시나리오 소개.</td>\n</tr>\n<tr>\n<td>2 · 반납했는데 아직 이용 중이라면?</td>\n<td>필요한 정보·안내 근거·담당자 판단을 이어야 한다.</td>\n<td>노코드 워크플로우 설계서: 업무 시나리오·문제 정의, 보완 질문과 담당자 이관의 목적.</td>\n</tr>\n<tr>\n<td>3 · 시민과 담당자 사이에서 맡은 범위</td>\n<td>n8n이 시민 문의를 판단하고 검색·처리 기록·Jira를 연결한다.</td>\n<td>노코드 워크플로우 설계서: 업무 범위, Trigger → 처리 → 출력, 외부 시스템 경계. 팀 역할은 TEAM-CHARTER를 함께 참조.</td>\n</tr>\n<tr>\n<td>4 · 문의에 따라 다음 행동을 결정한다</td>\n<td>확인한 정보에 따라 안내·보완·담당자 연결 중 다음 행동을 고른다.</td>\n<td>노코드 워크플로우 설계서: 설계서 2~6절: 흐름도·에이전트 역할·분기·논리 병렬과 합류·요청 간 반복·연결선의 필수/선택 페이로드·변환·인증·오류.</td>\n</tr>\n<tr>\n<td>5 · 안내에 쓸 근거를 준비한다</td>\n<td>문서의 문단을 출처·유형·권한과 함께 검색 단위로 만들고, 비교 결과에 근거해 선택했다.</td>\n<td>RAG 아키텍처 설계서: 원자료·전처리, 문단 청킹 비교 수치·길이·중복·선정 이유, 임베딩 모델·차원, 메타데이터.</td>\n</tr>\n<tr>\n<td>6 · 허용된 근거가 있을 때 안내한다</td>\n<td>권한으로 검색 범위를 제한하고 근거가 있는 안내만 작성하며, 근거가 없으면 담당자에게 연결한다.</td>\n<td>RAG 아키텍처 설계서: 질문 임베딩·코사인 검색·권한 필터·메타데이터, 메모리 색인·재색인·원본 보존·백업과 확장 한계.<br>노코드 워크플로우 설계서: 검색 결과의 근거 판정, 작성·검증 또는 no_evidence 담당자 이관.</td>\n</tr>\n<tr>\n<td>7 · 담당자는 같은 문의에서 이어받는다</td>\n<td>시민의 추가 정보는 같은 Jira 문의에 누적되고, 담당자는 그 맥락에서 검토·기록·상태 관리를 이어간다.</td>\n<td>노코드 워크플로우 설계서: 추가 요청의 같은 문의 연결, Jira 조회·생성·갱신·배정, 보완 횟수·이관, 인증·저장 게이트·멱등성.<br>워크플로우 실행 결과서: 같은 문의 맥락 누적과 이관, Jira 할당·진행 중·내부 메모의 리허설 관측.</td>\n</tr>\n<tr>\n<td>8 · 시민의 문의부터 담당자의 처리까지</td>\n<td>시민·담당자 화면과 실행 기록에서 처리의 연결을 확인한다.</td>\n<td>워크플로우 실행 결과서: 시나리오별 입력·기대·관측 로그. 정상 → 보완 질문 → 검색 근거 없음 → 이관·감사 기록. 요청 완료와 Jira 업무 상태 구분.<br>노코드 워크플로우 설계서: 분기·보완·외부 연동의 실제 연결.<br>RAG 아키텍처 설계서: 답변의 근거·출처와 실제 실행 대응.</td>\n</tr>\n<tr>\n<td>9 · 시험 조건과 실제 결과를 함께 확인했다</td>\n<td>시험한 조건과 기대 동작을 실제 결과에 대응시키고, 검색 단위 시험과 서비스 리허설의 범위를 구분한다.</td>\n<td>워크플로우 실행 결과서: 시험 조건·기대 결과·실제 결과·판정 근거, 단위 검색 시험과 Discord/Jira 실제 연동의 구분, 수치의 분모와 범위.</td>\n</tr>\n<tr>\n<td>10 · 응답·Jira·저장 결과를 함께 확인했다</td>\n<td>정상 안내의 성공은 최종 응답과 Jira의 안내 완료 상태, 저장된 처리 결과를 함께 대조해 확인했다.</td>\n<td>워크플로우 실행 결과서: 정상 문의의 기대 결과, 실제 Jira 완료 실패, 원인 보완 후 Jira·저장·응답 대조, 재시험 1건과 반복 검증 범위의 구분.<br>노코드 워크플로우 설계서: 안내 완료의 의미, 외부 Jira 상태와 저장 응답의 일치, 부분 실패를 정상 완료로 처리하지 않는 계약.</td>\n</tr>\n<tr>\n<td>11 · 문의의 다음 단계가 이어지도록</td>\n<td>근거 안내와 담당자 처리가 앞선 문의 맥락을 이어받도록 연결했다.</td>\n<td>노코드 워크플로우 설계서: 업무 목적과 구현 범위.<br>RAG 아키텍처 설계서: 근거 중심 안내와 권한 경계.<br>워크플로우 실행 결과서: 성과·남은 위험·후속 검증.</td>\n</tr>\n<tr>\n<td>12 · 감사합니다</td>\n<td>발표를 마치고 확인한 근거를 바탕으로 질문을 받는다.</td>\n<td>워크플로우 실행 결과서: 감사 인사와 질의응답 전환. 새 결과를 추가하지 않고 앞선 세 필수 산출물의 근거를 질문에 맞춰 확인합니다.</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>가이드의 구체 항목</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>요구</th>\n<th>설명 위치</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>Trigger → 처리 → 출력·역할</td>\n<td>3·4장</td>\n</tr>\n<tr>\n<td>분기·병렬·루프·목적</td>\n<td>4장 시나리오 + 분기·합류·보완 반복 상세</td>\n</tr>\n<tr>\n<td>한 연결선 필수/선택 필드·변환</td>\n<td>4장 연결 정보 상세: SearchRequest/Result/Evidence, empty → handoff 예시</td>\n</tr>\n<tr>\n<td>인증·오류·외부 연동</td>\n<td>4장 연결 상세·7장 n8n↔Jira·저장 상세</td>\n</tr>\n<tr>\n<td>청킹 비교 숫자·길이·중복·선택</td>\n<td>5장 비교 표·상세</td>\n</tr>\n<tr>\n<td>임베딩 선정·차원·거리·메타데이터·권한</td>\n<td>5·6장·상세</td>\n</tr>\n<tr>\n<td>재색인·백업·복구·확장</td>\n<td>6장 하단·복구 상세·메모, 원본 보존·영속 저장 후속</td>\n</tr>\n<tr>\n<td>정상 → 보완 → 검색 근거 없음 → 이관·로그</td>\n<td>8장 4탭·시연 절차</td>\n</tr>\n<tr>\n<td>기대/실제·수치·실패 사례·남은 위험</td>\n<td>9·10·11장</td>\n</tr>\n<tr>\n<td>감사 인사·질의응답 전환</td>\n<td>12장 · 새 기술 내용 없음</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>원본 보존과 경계</h2>\n"
        },
        {
          "html": "<p>R02 9개 시나리오·플레이어·실제 노드·전체도·상세, R03/R04/R05 원문, R04 도표와 실행 화면, PDF 29쪽을 전체 자료에서 유지합니다. 본문에서는 말할 내용을 추리고 상세에서 전체 근거를 확인합니다.</p>\n"
        },
        {
          "html": "<p>R02 모의 재생과 VM 실행을 구분합니다. 검색 16/16은 검색 단위 범위이며 전체 성공률이 아닙니다. DLQ 조회는 읽기 전용이고 자동 재처리는 완료 범위 밖입니다. 11/09 등록 Discord 계정의 대표 3개 흐름의 입력 5개와 Jira 할당·진행 중·내부 메모 저장을 직접 확인했습니다. 같은 요청의 저장 응답·B33 감사 기록으로 반납 보완 한도 attempt_limit과 검색 근거 없음 no_evidence를 확인했습니다. 다섯 요청의 저장·감사 결과가 일치했으며, 5분 연속 발표와 전체 응답 시간은 미측정입니다. n8n 실행 데이터 저장은 4개 항목 모두 Do not save이므로 오늘의 UI 결과와 11/06 보존 노드 실행 예시를 구분합니다.</p>\n"
        },
        {
          "html": "<p>60사례·64요구 ID의 판정·근거 연결과 필수산출물3종 정리를 완료했습니다. 검색 단위·대표 시연·부분 근거·미실행을 구분하며, 자료 연결을 전 기능 PASS로 해석하지 않습니다. 제출 검사와 Git/패키지는 최신 마감 기록을 따릅니다. VM 전체 source 동일성·연속 발표 시간은 미확인입니다.</p>\n"
        },
        {
          "html": "<ul>\n<li><a href=\"sources/guide.html\">가이드 원본</a></li>\n<li><a href=\"sources/guide.html\">원본 요구</a></li>\n<li><a href=\"speaker.html\">발표자 메모</a></li>\n<li><a href=\"demo-runbook.md\">시연 절차</a></li>\n</ul>\n"
        }
      ]
    },
    {
      "id": "current-connection",
      "role": "R02",
      "title": "검색 연결 · 필드·인증·변환 예시",
      "slides": [
        4,
        7
      ],
      "source": "sources/current-connection.html",
      "baseline": "current",
      "blocks": [
        {
          "html": "<h1>검색 연결의 필드와 변환</h1>\n"
        },
        {
          "html": "<p>기준: 2026-11-08 저장소 <code>workflows/dubakwi-support.json</code>의 B13·B14·B16·B17과 워크플로우 설계서 6.1. 아래 값은 설명용 가상 입력이며 VM 실행 로그가 아니다. 현재 저장소와 VM 전체 버전 일치는 별도 확인 항목이다.</p>\n"
        },
        {
          "html": "<h2>연결과 인증</h2>\n"
        },
        {
          "html": "<p>B13이 서버에서 확인한 actor.access_levels와 요청 문맥으로 search_request를 만든다. B14는 해당 객체를 JSON 본문으로 직렬화해 Header Auth가 설정된 검색 경로에 POST한다. 인증값은 n8n Credential에서 공급하며 예시에 포함하지 않는다.</p>\n"
        },
        {
          "html": "<p>B16은 검색과 본인 조회의 두 응답을 합친다. 응답 봉투·권한 검증과 다음 경로 판정은 <strong>B17</strong>이 수행한다. B16 자체가 근거 품질을 판정하는 것으로 설명하지 않는다.</p>\n"
        },
        {
          "html": "<h2>필수·선택 필드</h2>\n"
        },
        {
          "html": "<table>\n<thead>\n<tr>\n<th>객체</th>\n<th>필수</th>\n<th>선택 또는 주의</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>SearchRequest</td>\n<td>request_id, enabled, query, access_levels, deadline_at</td>\n<td>스키마의 별도 선택 필드 없음. 권한·검색 활성화는 서버 결정</td>\n</tr>\n<tr>\n<td>SearchResult</td>\n<td>request_id, status, evidence, error_code</td>\n<td>status는 ok/empty/skipped/error. error_code는 null도 필수 값</td>\n</tr>\n<tr>\n<td>Evidence</td>\n<td>doc, section, chunk_id, text, score, access_level, version</td>\n<td>source_url, applies_to, source_checked_at 선택</td>\n</tr>\n</tbody></table>\n"
        },
        {
          "html": "<h2>값이 변하는 예시</h2>\n"
        },
        {
          "html": "<p>B14 응답의 예시:</p>\n"
        },
        {
          "html": "<pre><code class=\"language-json\">{&quot;statusCode&quot;:200,&quot;body&quot;:{&quot;request_id&quot;:&quot;demo-empty-01&quot;,&quot;status&quot;:&quot;empty&quot;,&quot;evidence&quot;:[],&quot;error_code&quot;:null}}\n</code></pre>\n"
        },
        {
          "html": "<p>B15 조회는 비활성화된 사례여서 <code>status=skipped</code>, <code>record=null</code> 응답이라고 가정한다. B16이 두 응답을 모은 뒤 B17은 상태 코드, request_id 일치, 근거 배열과 권한을 검사한다. 검색을 수행했지만 근거가 없는 이 예시의 판정은 다음과 같다.</p>\n"
        },
        {
          "html": "<pre><code class=\"language-json\">{&quot;search&quot;:{&quot;status&quot;:&quot;empty&quot;,&quot;evidence&quot;:[],&quot;error_code&quot;:null},&quot;answer_plan&quot;:&quot;handoff&quot;,&quot;reason&quot;:&quot;no_evidence&quot;}\n</code></pre>\n"
        },
        {
          "html": "<p>이것은 B17 결과 객체 중 설명에 필요한 필드만 발췌한 것이다. 같은 문맥의 나머지 필드를 삭제하는 변환이 아니다.</p>\n"
        },
        {
          "html": "<h2>서로 다른 빈 결과</h2>\n"
        },
        {
          "html": "<ul>\n<li>empty: 검색했으나 근거 없음. 답변을 추측하지 않고 이관 경로를 선택한다.</li>\n<li>skipped: 호출 필요가 없어서 검색하지 않음. enabled 상태와 일치해야 한다.</li>\n<li>error: 검색 또는 응답 계약 실패. 외부 오류·요청 ID 불일치·허용하지 않은 권한의 근거를 성공으로 바꾸지 않는다.</li>\n</ul>\n"
        },
        {
          "html": "<p>성공 근거도 doc/section/chunk/text/version, 유한한 score와 서버가 허용한 access_level을 확인한 뒤 사용한다. LLM 작성·검증에 쓸 시간 예산이 부족하면 별도 경로로 판정한다.</p>\n"
        },
        {
          "html": "<h2>연결 근거</h2>\n"
        },
        {
          "html": "<ul>\n<li><a href=\"../../../../docs/project/WORKFLOW-DESIGN.md#6-%EB%85%B8%EB%93%9C-%EA%B0%84-%ED%8E%98%EC%9D%B4%EB%A1%9C%EB%93%9C-%EC%97%B0%EA%B2%B0%EC%84%A0%EB%A7%88%EB%8B%A4\">워크플로우 설계 6절</a></li>\n<li><a href=\"../../../../workflows/dubakwi-support.json\">워크플로우 JSON</a></li>\n</ul>\n"
        }
      ]
    }
  ],
  "visuals": [
    {
      "id": "r04-slides-6",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-6.svg",
      "title": "R04 담당 영역"
    },
    {
      "id": "r04-slides-7",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-7.svg",
      "title": "한 문의가 세 곳에서 어긋나지 않게 하는 원리"
    },
    {
      "id": "r04-slides-8",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-8.svg",
      "title": "R04 구간 · 접수 대장 + Jira 연결"
    },
    {
      "id": "r04-slides-9",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-9.svg",
      "title": "요청 ①"
    },
    {
      "id": "r04-slides-10",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-10.svg",
      "title": "① 조회"
    },
    {
      "id": "r04-slides-11",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-11.svg",
      "title": "티켓 생성"
    },
    {
      "id": "r04-slides-12",
      "doc": "r04-slides",
      "kind": "diagram",
      "src": "assets/r04-slides-diagram-12.svg",
      "title": "사용자"
    }
  ],
  "files": [],
  "generated": "2026-11-08T11:12:10.663Z",
  "currentBaseline": {
    "date": "2026-11-09",
    "closeout": "v5.6",
    "testPlan": "v1.26",
    "repository": "business baseline main dd919d7 plus documented final-closeout changes",
    "vm": "PR36 a657890 execution evidence; full source mapping unproven",
    "evidence": [
      {
        "id": "current-workflow",
        "source": "submission/final/docs/WORKFLOW-DESIGN.md",
        "snapshot": "sources/current-workflow-20261109-final-closeout.md",
        "bytes": 20234,
        "sha256": "76d2669a32d79ae9738a86790c043a2149ba36a70b75f45401197431af0a66d2",
        "blocks": 45,
        "source_sha256": "466d59235fec1e2ecba7069c627e628db7a945942313daa8abe9f059ca019aa1",
        "derivation": "final document with relative links rebased; source text preserved"
      },
      {
        "id": "current-rag",
        "source": "submission/final/docs/RAG-ARCHITECTURE.md",
        "snapshot": "sources/current-rag-20261109-final-closeout.md",
        "bytes": 12555,
        "sha256": "4decb66ff2d9977edc27f5151eef79c62989de4226bb1ddd0a8ecd010bcbc2c5",
        "blocks": 33,
        "source_sha256": "70baee0a6b6ca430ea4897e2a1af8e1f43b527625e914be2dec17e735000d7d9",
        "derivation": "final document with relative links rebased; source text preserved"
      },
      {
        "id": "current-execution",
        "source": "submission/final/docs/EXECUTION-RESULT.md",
        "snapshot": "sources/current-execution-20261109-final-closeout.md",
        "bytes": 19342,
        "sha256": "edc6ef12a7f3cb002bee6929ebb58c4b6831b4d4ea68b8d5ee8241ce2ac7fd58",
        "blocks": 46,
        "source_sha256": "0f89ab954e12a4787a4357a4267c1370bc3d7ead9052f25c92be216922ace780",
        "derivation": "final document with relative links rebased; source text preserved"
      },
      {
        "id": "current-closeout",
        "source": "docs/project/implementation-status-and-closeout-plan.md",
        "snapshot": "sources/current-closeout-20261109-final-closeout.md",
        "bytes": 51278,
        "sha256": "e9500e6d27c95c210f390ecf7f0b5fc82fbeb6622a82ec885e33692d767cddb6",
        "blocks": 55,
        "source_sha256": "5e86bfec032ba0904db5cac7cf2e9adbff1e4af09aac2de1c2047b6ae94032fe",
        "derivation": "final document with relative links rebased; source text preserved"
      },
      {
        "id": "current-tests",
        "source": "docs/project/final-test-plan.md",
        "snapshot": "sources/current-tests-20261109-final-closeout.md",
        "bytes": 43351,
        "sha256": "09a150ecfa323dfc2115b1fd03fefe97167bf6d61d9eef438e223bc6fda23d3b",
        "blocks": 60,
        "source_sha256": "f67e29eb34e63339166bd3c68f90517dbe54f8ad4ec74fbc70175293b16f161c",
        "derivation": "final document with relative links rebased; source text preserved"
      },
      {
        "id": "current-requirements",
        "source": "docs/guideline/source/Req/KSM-REQ.md",
        "snapshot": "sources/current-requirements-20261108.md",
        "bytes": 12878,
        "sha256": "746c068443fb23c4b443c11e62d2f8a30c4895f2f3fd14b69e98284b4849dcac",
        "blocks": 78
      },
      {
        "id": "current-recovery",
        "source": "runs/public/20261108-140200-vm-pr36-rag-recovery/report.md",
        "snapshot": "sources/current-recovery-20261108.md",
        "bytes": 2478,
        "sha256": "f014d697bf2f54371cdc58c78ff3482429dce9ea03f3ba1279225713c08fba1d",
        "blocks": 11
      },
      {
        "id": "current-followup",
        "source": "runs/public/20261108-152100-vm-jira-d03-crosscheck/report.md",
        "snapshot": "sources/current-followup-20261108.md",
        "bytes": 2793,
        "sha256": "bdf4966ab1a40daf7f7ff2edd7b4ef285ecc00bd2a4a5342f9c2571f04c2bd6b",
        "blocks": 6
      },
      {
        "id": "current-alert",
        "source": "runs/public/20261108-160200-user-confirmed-discord-alert/report.md",
        "snapshot": "sources/current-alert-20261108.md",
        "bytes": 1060,
        "sha256": "127fe13e8c02169a84923bbeeaa69cc8e63f7d8024b9280dcc176cc7f881df25",
        "blocks": 6
      },
      {
        "id": "current-dlq",
        "source": "runs/public/20261108-101605-vm-tc07-dlq-lookup/report.md",
        "snapshot": "sources/current-dlq-20261108.md",
        "bytes": 3830,
        "sha256": "2ad6e4c676efb91fdc020502d95eefc6adfee0e463d9430d5c68ade55db7f27a",
        "blocks": 10
      },
      {
        "id": "current-uat",
        "source": "cases/discord-jira-user-acceptance.md",
        "snapshot": "sources/current-uat-20261108.md",
        "bytes": 19547,
        "sha256": "451ae84b9ba90c8707a50be1ba27f113b0234d0e96606aeecf801cceeef36bad",
        "blocks": 40
      },
      {
        "id": "presentation-demo",
        "source": "submission/final/presentation/team-presentation/demo-runbook.md",
        "snapshot": "sources/presentation-demo-20261109-final-closeout.md",
        "bytes": 14773,
        "sha256": "959b3c59926014627d8e3454a411c8a64eac277209e565c8215d33469192c6e5",
        "blocks": 56,
        "derivation": "notes.js / demo-rehearsal-runbook.md · story12-final-closeout-20261109"
      },
      {
        "id": "presentation-guide",
        "source": "submission/final/presentation/team-presentation/guide-coverage.md",
        "snapshot": "sources/presentation-guide-20261109-final-closeout.md",
        "bytes": 8191,
        "sha256": "3ef81bda2965ea74f67bcb53159f70edbece34c14d20db84f227bc934635ea08",
        "blocks": 16,
        "derivation": "notes.js / demo-rehearsal-runbook.md · story12-final-closeout-20261109"
      },
      {
        "id": "current-connection",
        "source": "submission/final/presentation/team-presentation/payload-example.md",
        "snapshot": "sources/current-connection-20261108.md",
        "bytes": 2906,
        "sha256": "03068e1b218b98e6875e8cba0a467aa30317a1328b08b64bc0f5cece0e3ec277",
        "blocks": 18
      }
    ],
    "submissionDocs": "submission/final/docs/",
    "documentCommit": "df684f30764ffb6286ab23d325773dfcc31e76b3",
    "pullRequest": "https://github.com/ik-e/dubakwi-ttareungi-support/pull/54",
    "publication": "reviewed-public-derivative"
  },
  "updated": "2026-11-08T12:15:49.437Z",
  "presentationBaseline": {
    "version": "story12-final-closeout-20261109",
    "slides": 12,
    "seconds": 1200,
    "source": "notes.js"
  },
  "publication": {
    "version": "public-20261109",
    "local_original_files": 11,
    "raw_attachments_included": false
  }
};
