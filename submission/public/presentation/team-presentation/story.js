'use strict';
const explainers={
 scope:{title:'업무 유형·설계 시나리오·원본 재생의 관계',source:'sources/system.html',blocks:[
 '<h2>같은 수를 세는 세 가지 분류가 아닙니다</h2><p><b>업무 유형 6개</b>는 문의 주제입니다. 대여, 반납, 고장, 요금·환불, 후속 조회, 개인정보·보안입니다.</p><p><b>시스템 시나리오 S1–S8</b>은 같은 문의가 처한 처리 상황입니다. <b>팀원 HTML의 9개 항목</b>은 정상·실패·재전송 경로를 따라가는 모의 재생입니다.</p>',
 '<h2>시스템 설계와 원본 재생의 대응</h2><table><thead><tr><th>시스템 설계</th><th>원본 재생 항목</th></tr></thead><tbody><tr><td>S1 일반 안내</td><td>S1 정상 안내</td></tr><tr><td>S2 정보 보완</td><td>S2 정보 보완</td></tr><tr><td>S3 사람 판단·이관</td><td>S3 담당자 이관</td></tr><tr><td>S4 본인 상태 조회</td><td>S4 본인 상태 조회</td></tr><tr><td>S5 긴급 복합 문의</td><td>S5 긴급 대응</td></tr><tr><td>S6 근거·검증 부족</td><td>F1 근거 부족 / F2 검증 미통과</td></tr><tr><td>S7 거절·재전송</td><td>R1 같은 요청 재전송은 일부 경로</td></tr><tr><td>S8 부분 실패·복구</td><td>F3 티켓 효과 미확인은 일부 경로</td></tr></tbody></table>',
 '<h2>그림과 구현·시험의 범위는 구분합니다</h2><p>9개 재생 항목이 있다는 사실은 모든 상황의 실연동 통과를 의미하지 않습니다. 실제 근거는 검색 16건, 같은 Jira 문의의 맥락 누적, 담당자 열람·상태·메모, DLQ 조회 등 각각의 실행 기록에서 확인합니다.</p><p>직원 전용 UI 전체, 실제 환불·강제 반납·잠금 해제·출동 승인은 완료 기능으로 설명하지 않습니다.</p>']},
 connection:{title:'검색 연결선 · 요청 → 결과 → 다음 행동',source:'sources/current-connection.html',blocks:[
 '<h2>무슨 정보를 주고받는가</h2><p><b>문의 처리 → 검색</b><br>질문 · 서버가 확인한 권한 · 요청 번호 · 검색 활성 여부 · 마감 시간</p><p><b>검색 → 문의 처리</b><br>검색 상태 · 근거 목록 · 같은 요청 번호 · 오류 여부</p><p>내부 HTTP 호출은 Header Auth를 사용합니다. 인증값은 환경의 Credential에서 공급하며 화면에 표시하지 않습니다.</p>',
 '<h2>필수 필드와 선택 필드</h2><p><b>SearchRequest 필수</b><br><code>request_id, enabled, query, access_levels, deadline_at</code><br>별도 선택 필드는 없습니다.</p><p><b>SearchResult 필수</b><br><code>request_id, status, evidence, error_code</code><br>status: ok / empty / skipped / error<br>error_code는 null이어도 필수 필드입니다.</p>',
 '<h2>근거 한 건의 데이터</h2><p><b>Evidence 필수</b><br><code>doc, section, chunk_id, text, score, access_level, version</code></p><p><b>Evidence 선택</b><br><code>source_url, applies_to, source_checked_at</code></p><p>검색 저장 메타데이터의 doc_id·source_version은 반환 계약의 doc·version과 구분합니다. 같은 근거를 식별하고 출처·적용 범위를 검증하기 위한 정보입니다.</p>',
 `<h2>검색 결과 없음 → 담당자 연결</h2><p>설명용 가상 예시입니다. VM 실행 로그가 아닙니다.</p><pre>{"statusCode":200,"body":{
 "request_id":"demo-empty-01",
 "status":"empty","evidence":[],"error_code":null
}}</pre><p>본인 조회는 skipped라고 가정합니다. <b>결과 모으기(B16)</b>가 두 봉투를 모으고 <b>근거 판정(B17)</b>이 HTTP 상태·요청 번호·필드·권한을 검사합니다.</p><pre>{"answer_plan":"handoff","reason":"no_evidence"}</pre><p>판정에 필요한 필드만 발췌했습니다. 나머지 문의 맥락을 삭제하는 변환이 아닙니다.</p>`,
 '<h2>비어 있는 결과도 서로 다릅니다</h2><p><b>empty</b> · 검색했으나 근거 없음 → 추측 안내 대신 이관</p><p><b>skipped</b> · 필요가 없어 검색 생략 → 활성 여부와 일치 확인</p><p><b>error</b> · 실행 또는 계약 실패 → 성공 근거로 사용하지 않음</p><p>성공 근거도 요청·소유권·권한·본문·점수·출처를 검사한 뒤 작성·검증에 전달합니다.</p>']},
 logic:{title:'분기·합류·보완 반복의 목적',source:'sources/current-workflow.html',blocks:[
 '<h2>분기 · 지금 필요한 행동을 고릅니다</h2><p>입력·권한 확인 → 분류 → <b>근거 안내 / 정보 보완 / 담당자 연결 / 긴급 우선 연결</b></p><p>LLM 분류 결과를 코드가 확인한 뒤 분기합니다. 누락 정보를 임의로 채우거나 실제 환불 같은 범위 밖 조치를 실행하지 않습니다.</p>',
 '<h2>독립 검색·조회 → 모으기 → 판정</h2><p>지식 검색과 본인 기록 조회를 독립적으로 준비합니다. 필요 없는 갈래도 skipped 상태를 반환합니다.</p><p><b>검색 결과 + 본인 조회 결과 → 봉투 2개 합류 → 요청·권한·근거 판정</b></p><p>논리 병렬 구조의 설명입니다. 실제 동시 실행에 따른 속도 향상 실측은 아닙니다.</p>',
 '<h2>보완 반복 · 다음 요청에서 이어받습니다</h2><p>부족한 정보 질문 → 현재 요청 저장·응답 → 시민의 추가 입력 → <b>같은 case_ref의 새 요청</b> → 기존 사실과 합쳐 다시 판단</p><p>최초 문의가 1회, 첫 추가 답변이 2회, 두 번째 추가 답변이 3회입니다. <b>3회차에 담당자에게 연결</b>하며 서버가 횟수를 누적합니다.</p>',
 '<h2>자동 보완 한도와 이관 후 추가 정보</h2><p>현재 규칙은 <b>3회 이상인지 먼저 확인</b>합니다. 세 번째 입력에서 정보를 모두 채워도 한도 이관이 우선합니다. 긴급·사람 판단·근거 부족이면 더 일찍 이관될 수 있습니다.</p><p>이관 후 같은 문의에 추가 정보를 전달하는 경로는 별도입니다. 담당자 처리 상태를 유지하며 보완 질문으로 돌아가지 않도록 설계했습니다. 이번 리허설은 세 번째 입력의 이관까지 확인했습니다.</p>']},
 handoff:{title:'인증·중복 방지·외부 결과 확인',source:'sources/current-followup.html',blocks:[
 '<h2>진행 기록과 문의 맥락을 나눠 연결합니다</h2><p><b>처리 기록</b>: 요청 소유권, 실행 지점, 확인한 티켓 번호, 결과</p><p><b>Jira</b>: 문의 요약, 확인한 사실, 보완 내용, 담당자·상태·내부 메모</p><p>원본 처리도의 1~6은 전체 문의 처리 순서입니다. Jira 자체의 기능 흐름만을 뜻하지 않습니다.</p>',
 '<h2>인증과 저장 게이트</h2><p>내부 API는 Header Auth, Jira는 환경별 Credential로 인증합니다. 실제 토큰은 보존 예시에 넣지 않습니다.</p><p><b>prepare</b> 변경 의도 기록 → <b>bind</b> 확인한 티켓 연결 → 외부 결과 확인 → <b>finish</b> 완료 기록</p><p>저장이 실패했거나 효과를 확인하지 못했다면 성공으로 표시하지 않습니다. 확인한 ID와 진행 지점을 유지합니다.</p>',
 '<h2>재전송과 추가 정보는 다르게 처리합니다</h2><p><b>같은 요청 재전송</b> → 완료 결과 재사용, 티켓·알림 중복 방지</p><p><b>같은 문의의 새 정보</b> → 같은 티켓에 맥락 누적, 담당자가 이어받아 처리</p><p><b>외부 효과 미확인</b> → 무조건 재생성하지 않고 실패 기록과 알려진 ID를 대조</p>',
 '<h2>Jira에서 담당자가 할 수 있는 처리</h2><p><b>문의 검토 → 담당자 지정 → 진행 중 → 내부 메모 → 완료·해결</b></p><p>11/09에는 현재 발표자에게 할당하고 진행 중·내부 메모 저장을 확인했습니다. 11/08 별도 시험에서는 완료 전환 뒤 시민이 다시 조회해 종료 안내를 받는 흐름을 확인했습니다.</p><p>이번 실시간 시연은 진행 중·메모까지 보여줍니다. 티켓 종료는 별도 검증 근거로 설명합니다.</p>',
 '<h2>문의 관리의 범위</h2><p>Jira에는 요약·추가 진술·부족 정보 등 구조화된 맥락이 남습니다. 담당자는 검토 내용과 처리 상태를 기록합니다.</p><p>실제 환불·요금 정정·강제 반납·원격 잠금 해제는 구현 범위 밖입니다. 내부 메모를 Discord 시민에게 자동 전달하는 기능도 확인한 범위에 포함하지 않습니다.</p><p><b>요청 처리 완료</b>는 응답 저장 완료입니다. Jira 티켓은 보완 대기나 담당자 처리 중일 수 있습니다.</p>',
 '<h2>실패 내역 조회의 현재 범위</h2><p>DLQ 목록·상세·연결 Jira 조회를 확인했습니다. 읽기 전용 확인이며 재처리 실행·자동 복구 엔진의 완료가 아닙니다.</p><p>담당자 Jira 열람·진행 중·메모와 DLQ 운영자 조회는 다른 경로입니다. Jira 안에 DLQ 관리 UI가 있는 것처럼 설명하지 않습니다.</p>']},
 chunk:{title:'청킹 비교 수량·길이·평가 범위',source:'sources/current-rag.html',blocks:[
 '<h2>준비 수량과 평가 수량</h2><table><thead><tr><th>범위</th><th>절 전체</th><th>문단 단위</th></tr></thead><tbody><tr><th>전체 준비</th><td>41청크</td><td>44청크</td></tr><tr><th>공개 문서 · 비교 대상</th><td>33청크</td><td>36청크</td></tr><tr><th>제한 문서 · 비교 제외</th><td>8청크</td><td>8청크</td></tr></tbody></table><p>문서 원본은 공개 6개와 교육용 가상 담당자 자료 2개입니다. 비교 표의 수량 차이는 범위가 다른 데서 나옵니다.</p>',
 '<h2>같은 검색 지표, 다른 근거 구성</h2><p>11/05 직접 임베딩 비교의 정상 질문 13개에서 두 방식 모두 <b>상위 3개에 기대 문서·절 포함: 13/13</b>. 추가 근거 부족 WF-03도 별도 확인했습니다.</p><p>이 수치는 검색 근거 포함 비율이며 답변 정확도가 아닙니다. 문단 방식은 실제 안내와 교육용 가상 설정을 구분할 수 있어 선택했습니다.</p>',
 '<h2>선택한 문단 청크의 길이</h2><p>최소 <b>61자</b> · 중간값 <b>124.5자</b> · 최대 <b>251자</b></p><p>인접 청크 중복 <b>0자</b>. Markdown 문단 경계를 유지합니다.</p><p>모든 한국어 문서에 최적인 길이라는 주장이 아닙니다. 팀 문서와 비교 범위에서의 선택입니다.</p>']},
 recovery:{title:'재색인·원본 보존·백업과 확장',source:'sources/current-recovery.html',blocks:[
 '<h2>재시작 뒤에는 검색 준비부터 확인합니다</h2><p>현재 n8n Simple Vector Store는 프로세스 메모리에 있습니다. 서비스 재시작 후 같은 index/search 경로에 원본 문서로 색인을 다시 만들고, 검색 probe를 확인합니다. 준비되지 않은 검색을 성공으로 취급하지 않습니다.</p><p><b>11/08 확인: 재시작 → 해당 경로 44개 재색인 → QR 근거 답변.</b> 한 번의 기능 복구 확인이며 처리시간은 측정하지 않았습니다.</p>',
 '<h2>보존한 원본에서 다시 만듭니다</h2><p>지식 Markdown, manifest의 버전·권한·해시, 워크플로우와 설정을 보존합니다. 이는 검색 데이터를 재생성할 수 있는 원본이며, 실행 중인 벡터 메모리의 영속 백업과 같지는 않습니다.</p>',
 '<h2>후속 과제: 영속 저장·백업과 복원</h2><p>RAG 벡터 영속 저장, DB 백업·복원, 버전별 색인 전환과 롤백은 후속 검토 대상입니다. R04의 업무 상태·DLQ PostgreSQL과 RAG 벡터 저장소를 같은 구현으로 설명하지 않습니다.</p>',
 '<h2>문서가 늘어날 때 확인할 것</h2><p>문서 변경 시 출처·승인·버전·권한을 검토한 뒤 재색인합니다. 부분 재색인, 중복 방지, 동시 색인 잠금, 다중 프로세스 공유는 별도 검증이 필요합니다. 문서 증가에 따른 처리시간·비용을 미측정 값으로 채우지 않습니다.</p>']},
 retrieval:{title:'임베딩·권한·메타데이터',source:'sources/current-rag.html',blocks:[
 '<h2>같은 모델에서 의미를 비교합니다</h2><p>문서와 질문을 text-embedding-3-large로 변환합니다. 실제 벡터 길이는 3,072입니다.</p><p>과정 기본 구성을 바탕으로 선택하고 n8n 호출을 확인했습니다. 한국어 성능·비용의 모델 간 우위를 실측한 것은 아닙니다.</p><p>코사인 유사도로 비교해 최대 5개를 반환합니다. 점수 0.30은 현재 임시 기준이며 보편적 품질 임계치로 설명하지 않습니다.</p>',
 '<h2>권한은 서버가 결정합니다</h2><p>공개·제한 자료를 분리하고 서버가 확인한 access_levels로 검색 범위를 제한합니다. 폴더를 나누는 것만으로 권한을 보장한다고 보지 않습니다.</p><p>시민 요청은 공개 자료만, 허용된 담당자 요청은 제한 자료도 검색합니다. 검색 양성 시험이 직원 UI 전체 검증을 대신하지는 않습니다.</p>',
 '<h2>출처를 따라갈 수 있는 검색 결과</h2><p>검색 저장 메타데이터: doc_id, section, chunk_id, source_version, access_level 등.</p><p>반환 Evidence 필수: doc, section, chunk_id, text, score, access_level, version.</p><p>선택: source_url, applies_to, source_checked_at. 본문·출처·적용 범위를 답변 작성·검증에 함께 전달합니다.</p>']}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-explain]');if(!b)return;const d=explainers[b.dataset.explain];if(d)openView({kind:'reader',title:d.title,blocks:d.blocks,source:d.source,page:0})});
window.STORY_DETAILS=explainers;
// ARIA tabs retain the existing original demo click behaviour.
const demoButtons=Array.from(document.querySelectorAll('[data-demo]'));
demoButtons.forEach((b,i)=>{b.setAttribute('role','tab');b.id='demo-'+b.dataset.demo;b.setAttribute('aria-controls','demo-panel');b.setAttribute('aria-selected',String(i===0));b.tabIndex=i===0?0:-1;b.addEventListener('click',()=>{demoButtons.forEach(t=>t.tabIndex=t===b?0:-1);document.querySelector('#demo-panel').setAttribute('aria-labelledby',b.id)});b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?demoButtons.length-1:(i+(e.key==='ArrowRight'?1:-1)+demoButtons.length)%demoButtons.length;demoButtons[n].click();demoButtons[n].focus()})});
document.querySelector('#demo-panel').setAttribute('role','tabpanel');document.querySelector('#demo-panel').setAttribute('aria-labelledby','demo-normal');

// A local explanatory replay. It never calls n8n, Jira or Discord.
const handoffFrames=[
 {input:'“반납했는데 앱에 아직 이용 중으로 나와요.”',decision:'부족한 정보 확인',response:'자전거·대여소·반납 시각·잠금 상태 질문',outbound:'문의 티켓 생성·보완 내용 저장',inbound:'티켓 연결값·저장 결과',connection:'요청과 결과를 확인해 같은 문의로 연결',facts:'최초 문의를 접수함',missing:'자전거 · 대여소 · 시각 · 잠금 상태',owner:'자동 보완 대기',staff:'담당자는 이 기록을 이어받습니다.',observation:'최초 문의 1회 · 이후 답변도 같은 문의로 연결합니다.'},
 {input:'“따릉이 앱이고 자전거 번호는 기억나지 않아요.”',decision:'기존 내용에 새 정보 추가',response:'남은 정보를 다시 확인',outbound:'같은 티켓 조회·맥락 갱신',inbound:'갱신된 정보·처리 결과',connection:'새 문의를 만들지 않고 같은 티켓 갱신',facts:'따릉이 앱 · 자전거 번호 기억 안 남',missing:'대여소 · 반납 시각 · 잠금 상태',owner:'첫 추가 답변 · 자동 보완 대기',staff:'앞선 내용과 추가 정보를 함께 확인합니다.',observation:'최초 문의 + 첫 추가 답변 · 두 번째 입력까지 맥락을 누적합니다.'},
 {input:'“대여소 이름도 정확히 모르겠어요.”',decision:'3회차 한도로 담당자 연결',response:'자동 보완을 마치고 이관 안내',outbound:'누적 정보·담당자 배정 반영',inbound:'이관·티켓 갱신 결과',connection:'담당자가 검토할 맥락을 보존',facts:'앱 확인 · 자전거 번호·대여소 기억 안 남',missing:'대여소 · 반납 시각 · 잠금 상태 확인 필요',owner:'담당자 연결 · 검토 대기',staff:'요약·추가 정보·미확인 사항을 함께 인계합니다.',observation:'최초 문의 + 추가 답변 2회 · 현재 규칙은 세 번째 입력에서 한도 이관을 우선합니다.'},
 {input:'시민의 추가 요청은 아직 없습니다.',decision:'현재 요청의 처리는 끝남',response:'후속 조회가 들어오면 Jira 상태 확인',outbound:'자동 동기화 루프 없음',inbound:'후속 조회 때 현재 상태 반환',connection:'지금은 담당자가 Jira에서 직접 작업',facts:'앱 확인 · 자전거 번호·대여소 기억 안 남',missing:'현장 상황 등 남은 정보는 담당자가 검토',owner:'발표자에게 할당 · 진행 중',staff:'담당자 검토 → 내부 메모 저장',observation:'11/09 확인: 할당·진행 중·내부 메모 · 실제 반납·환불 수행과는 다른 문의 관리입니다.',staffOnly:true}
];
const handoffTabs=Array.from(document.querySelectorAll('[data-handoff-step]'));
let handoffStep=0;
function showHandoffStep(index){
 if(!Number.isInteger(index)||index<0||index>=handoffFrames.length)return;
 handoffStep=index;const frame=handoffFrames[index];
 for(const [key,id]of Object.entries({input:'input',decision:'decision',response:'response',outbound:'outbound',inbound:'inbound',connection:'connection-note',facts:'facts',missing:'missing',owner:'owner',staff:'staff',observation:'observation'}))document.getElementById('handoff-'+id).textContent=frame[key];
 const stage=document.querySelector('#handoff-stage');stage.dataset.step=String(index);stage.classList.toggle('staff-only',!!frame.staffOnly);stage.setAttribute('aria-labelledby','handoff-tab-'+index);
 document.querySelector('#handoff-input-label').textContent=frame.staffOnly?'후속 조회 시점':'시민의 입력';
 handoffTabs.forEach((button,i)=>{button.id='handoff-tab-'+i;button.setAttribute('aria-selected',String(i===index));button.setAttribute('aria-controls','handoff-stage');button.tabIndex=i===index?0:-1});
 document.querySelector('#handoff-next').disabled=index===handoffFrames.length-1;
}
handoffTabs.forEach((button,i)=>{button.addEventListener('click',()=>showHandoffStep(i));button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const index=e.key==='Home'?0:e.key==='End'?handoffFrames.length-1:(i+(e.key==='ArrowRight'?1:-1)+handoffFrames.length)%handoffFrames.length;showHandoffStep(index);handoffTabs[index].focus()})});
document.querySelector('#handoff-reset').addEventListener('click',()=>showHandoffStep(0));
document.querySelector('#handoff-next').addEventListener('click',()=>showHandoffStep(handoffStep+1));
window.HANDOFF_STORY={show:showHandoffStep,get step(){return handoffStep},frames:handoffFrames};
showHandoffStep(0);
explainers.chunk.blocks.splice(2,0,'<h2>실제 안내와 교육용 가정은 어떤 단계에서 구분하나</h2><p>원본부터 실제 안내·가상 설정을 표시합니다. 한 문서나 절에 두 성격이 함께 있는 부분도 있으며 현재 준비 과정은 이를 문단 청크로 구분합니다.</p><p><b>절 전체 비교 후보</b>는 같은 절의 준비 청크를 합친 것으로, 3개 절에서 실제·가상 정보가 함께 묶였습니다. 원본 자료를 처음으로 구분했다거나 문단 방식의 검색 성능이 더 높았다고 설명하지 않습니다.</p><p>실제/가상은 정보의 성격이고 공개/제한은 접근 권한입니다. 두 구분을 같은 것으로 보지 않습니다.</p>');
