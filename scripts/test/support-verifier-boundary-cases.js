// Deliberately let the mock verifier approve unsafe text; Code must still reject.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const workflow = JSON.parse(fs.readFileSync(path.join(root,'workflows/dubakwi-support.json'),'utf8'));
const code = workflow.nodes.find(n=>n.name.startsWith('B21 ')).parameters.jsCode;
const check = (answer, text, expected) => {
  const context = {security:{masked:0},agents:['triage'],search:{evidence:[
    {chunk_id:'one',doc:'rental-guide',section:'QR',score:0.9,text},
  ]}};
  const writer = {text:JSON.stringify({answer,cited_source_ids:['one']})};
  const result = new Function('$json','$',code)(
    {text:JSON.stringify({grounded:true,policy_ok:true,issues:[]})},
    name=>({first:()=>({json:name.startsWith('B17 ')?context:writer})}),
  ).json;
  assert.equal(result.outcome.mode, expected, answer);
};
check('QR 코드를 스캔해 대여합니다.','앱에서 QR 코드를 스캔하여 대여합니다.','guidance');
check('오류가 계속되면 고객센터에 문의하세요.','오류가 계속되면 1599-0120 또는 상담원에게 문의한다.','guidance');
check('접수 처리가 완료되면 담당자에게 확인하세요.','접수 처리 완료 후 담당자 확인 절차를 진행한다.','guidance');
check('앱을 삭제하고 다시 설치하면 해결됩니다.','앱을 재실행한 후 QR을 스캔한다.','handoff');
check('자전거 번호는 7자리입니다.','자전거 번호 5자리를 입력한다.','handoff');
check('환불을 처리 완료했습니다.','환불 가능 여부는 담당자가 검토한다.','handoff');
check('환불 완료','환불을 원하면 담당자에게 문의한다.','handoff');
console.log('Verifier boundary: 7/7 mocked Code cases passed; actual LLM not run');
