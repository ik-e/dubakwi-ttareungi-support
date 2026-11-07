"""Embed the reviewed case-context library and HTTP gates in workflow exports.

Run with --check for CI parity. This never contacts n8n, Jira or PostgreSQL.
Environment author IDs remain placeholders, rendered only into private copies.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
START = "// BEGIN shared case-context library\n"
END = "\n// END shared case-context library\n"


def library() -> str:
    source = (ROOT / "services/user_api/case_context.js").read_text("utf-8")
    source = source[: source.index("if (typeof module")]
    return START + source + "\nconst CC = caseContextLibrary();" + END


COMMON = r"""
const authors = (() => { try { return JSON.parse('__JIRA_CONTEXT_AUTHORS_JSON__'); } catch { return []; } })();
const remaining = deadline => Date.parse(deadline) - Date.now();
const bindingFor = (r, key) => ({scope:r.state_ref.scope, owner_id:r.state_ref.owner_id,
  case_id:r.case_id, first_request_id:r.first_request_id, ticket_key:key});
const pages = () => CC.readPages($input.all().map(x => {
  if (x.json.statusCode !== 200) throw new Error('context_read_failed');
  return x.json.body;
}));
const select = (comments,b,requestId=null) => CC.selectSnapshot(comments,b,authors,requestId);
const mask = v => typeof v === 'string' ? v.replace(/\b0\d{1,2}[-. ]?\d{3,4}[-. ]?\d{4}\b/g,'***-****-****').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'***@***')
  : Array.isArray(v) ? v.map(mask) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k,x])=>[k,mask(x)])) : v;
const commentPath = key => '/rest/api/2/issue/'+encodeURIComponent(key)+'/comment';
"""


def node(workflow, prefix):
    return next(n for n in workflow["nodes"] if n["name"].startswith(prefix + " "))


def add_code(w, prefix, title, code):
    name = prefix + " " + title
    obj = {
        "name": name,
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "parameters": {"jsCode": library() + COMMON + code},
        "position": [1200, 800],
    }
    old = next((n for n in w["nodes"] if n["name"] == name), None)
    if old:
        old["parameters"] = obj["parameters"]
    else:
        w["nodes"].append(obj)
    return name


def link(w, source, *targets):
    w["connections"][source] = {
        "main": [[{"node": t, "type": "main", "index": 0}] for t in targets]
    }


def http(w, prefix, title, template, method="GET", paginate=False):
    name = prefix + " " + title
    n = copy.deepcopy(template)
    n["name"] = name
    n.pop("id", None)
    n["parameters"]["method"] = method
    n["parameters"]["url"] = "={{ '__JIRA_BASE_URL__' + $json.req.path }}"
    n["parameters"]["options"]["timeout"] = (
        "={{ Math.max(1, Math.min("
        + ("3500" if method == "POST" else "2000")
        + ", Date.parse($json.deadline_at) - Date.now() - 500)) }}"
    )
    if method == "POST":
        n["parameters"].update(
            {"sendBody": True, "specifyBody": "json", "jsonBody": "={{ $json.req.body }}"}
        )
    if paginate:
        n["parameters"]["options"]["pagination"] = {
            "pagination": {
                "paginationMode": "updateAParameterInEachRequest",
                "parameters": {
                    "parameters": [
                        {
                            "type": "qs",
                            "name": "startAt",
                            "value": "={{ $pageCount === 0 ? 0 : $response.body.startAt + $response.body.comments.length }}",
                        }
                    ]
                },
                "paginationCompleteWhen": "other",
                "completeExpression": "={{ Date.now() + 500 >= Date.parse($json.deadline_at) || !$response.body || !Array.isArray($response.body.comments) || $response.body.startAt + $response.body.comments.length >= $response.body.total || $response.body.comments.length === 0 }}",
                "limitPagesFetched": True,
                "maxRequests": 10,
                "requestInterval": 0,
            }
        }
    old = next((x for x in w["nodes"] if x["name"] == name), None)
    if old:
        old["parameters"] = n["parameters"]
    else:
        w["nodes"].append(n)
    return name


def branch(w, prefix, title, expression):
    name = prefix + " " + title
    n = copy.deepcopy(next(x for x in w["nodes"] if x["type"] == "n8n-nodes-base.if"))
    n["name"] = name
    n.pop("id", None)
    n["parameters"]["conditions"]["conditions"] = [
        {
            "id": prefix.lower(),
            "leftValue": "={{ " + expression + " }}",
            "rightValue": "",
            "operator": {"type": "boolean", "operation": "true", "singleValue": True},
        }
    ]
    old = next((x for x in w["nodes"] if x["name"] == name), None)
    if old:
        old["parameters"] = n["parameters"]
    else:
        w["nodes"].append(n)
    return name


HAND_FAILURE = r"""
const fail = reason => {ctx.error_code='partial_effect'; ctx.effects.context_saved={status:'unknown',id:ctx.ticket.key,error_code:reason};
ctx.recovery={version:1,mode:'jira_ref',action:'context_update',args:null,reference:{jira_issue_id:ctx.ticket.id,case_id:ctx.request.case_id,owner_id:ctx.state_ref.owner_id},reason};
return [{json:{route:'done',ctx}}];};
"""


def handoff(w):
    template = node(w, "H32")
    prepare = add_code(
        w,
        "H52",
        "검증 문맥 조회 준비",
        r"""
const ctx=$json.ctx, r=ctx.request;
const deadline=r.deadline_at ?? ctx.deadline_at ?? new Date(Date.now()+15000).toISOString();
if (ctx.error_code || remaining(deadline)<1000) { ctx.error_code=ctx.error_code??'partial_effect'; return [{json:{route:'done',ctx}}]; }
return [{json:{ctx,deadline_at:deadline,req:{path:'/rest/api/2/issue/'+encodeURIComponent(ctx.ticket.key)+'?fields=status,labels,description,assignee'}}}];
""",
    )
    can_read = branch(w, "H63", "문맥 읽기 허용", "!!$json.req")
    issue = http(w, "H53", "Jira 문맥 연결 조회", template)
    comments_req = add_code(
        w,
        "H54",
        "문맥 댓글 조회 준비",
        r"""
const previous=$('H52 검증 문맥 조회 준비').first().json;
return [{json:{...previous,issue:$json,req:{path:commentPath(previous.ctx.ticket.key)+'?maxResults=100'}}}];
""",
    )
    comments = http(w, "H55", "Jira 전체 문맥 댓글 조회", template, paginate=True)
    plan = add_code(
        w,
        "H56",
        "문맥 검증과 조건부 기록 계획",
        r"""
const prev=$('H54 문맥 댓글 조회 준비').first().json, ctx=prev.ctx, r=ctx.request;
"""
        + HAND_FAILURE
        + r"""
try {
 if(remaining(prev.deadline_at)<500 || prev.issue.statusCode!==200) return fail('context_read_failed');
 const b=bindingFor(r,ctx.ticket.key); CC.validateIssue(prev.issue.body,b);
 const comments=pages();
 let old=null;
 if(comments.some(c=>CC.jiraText(c.body??'').startsWith(CC.MARKER+'\n'))) old=select(comments,b);
 else if(ctx.ticket.reused) return fail('context_missing');
 if(old?.support.status==='handed_off' && (r.action!=='handoff'||r.assignee_role!==old.support.assignee_role||r.priority!==old.support.priority||r.attempt!==old.support.attempt)) return fail('context_handoff_conflict');
 const support={case_id:r.case_id,owner_id:b.owner_id,ticket_id:b.ticket_key,first_request_id:r.first_request_id,
 attempt:r.attempt,version:null,status:r.action==='wait'?'waiting_info':r.action==='handoff'?'handed_off':r.close_status,
 assignee_role:r.action==='handoff'?r.assignee_role:null,priority:r.priority};
 const phase=r.ticket_id?'followup':r.action;
 let snapshot=CC.buildSnapshot(b,r.request_id,phase,(old?.revision??0)+1,support,mask(r.context));
 const matching=comments.map(c=>({c,t:CC.jiraText(c.body??'')})).filter(x=>x.t.startsWith(CC.MARKER+'\n')).map(x=>JSON.parse(x.t.slice(CC.MARKER.length+1))).find(x=>x.event_id===snapshot.event_id);
 if(matching){ snapshot.revision=matching.revision; if(CC.canonical(snapshot)!==CC.canonical(matching)) return fail('context_conflict');
 ctx.snapshot=matching;ctx.previous_snapshot=old;ctx.effects.context_saved={status:'confirmed',id:b.ticket_key};return [{json:{route:r.action,ctx}}]; }
 if(remaining(prev.deadline_at)<4000) return fail('deadline_exceeded');
 ctx.previous_snapshot=old;
 return [{json:{route:'write',ctx,snapshot,deadline_at:prev.deadline_at,req:{path:commentPath(b.ticket_key),body:{body:CC.MARKER+'\n'+JSON.stringify(snapshot)}}}}];
} catch(e) {return fail(e.message);}
""",
    )
    write_if = branch(w, "H57", "새 문맥 기록 필요", "$json.route === 'write'")
    write = http(w, "H58", "Jira 가린 문맥 저장", template, "POST")
    read_req = add_code(
        w,
        "H59",
        "저장 문맥 재조회 준비",
        r"""
const p=$('H56 문맥 검증과 조건부 기록 계획').first().json;
return [{json:{...p,write_status:$json.statusCode??0,req:{path:commentPath(p.ctx.ticket.key)+'?maxResults=100'}}}];
""",
    )
    read = http(w, "H60", "Jira 저장 문맥 재조회", template, paginate=True)
    verify = add_code(
        w,
        "H61",
        "문맥 저장 재조회 판정",
        r"""
const p=$('H59 저장 문맥 재조회 준비').first().json,ctx=p.ctx;
"""
        + HAND_FAILURE
        + r"""
try {if(remaining(p.deadline_at)<500)return fail('deadline_exceeded');
const actual=select(pages(),bindingFor(ctx.request,ctx.ticket.key),ctx.request.request_id);
if(CC.canonical(actual)!==CC.canonical(p.snapshot))return fail('context_not_saved');
ctx.snapshot=actual;ctx.effects.context_saved={status:'confirmed',id:ctx.ticket.key};return [{json:{route:ctx.request.action,ctx}}];
}catch(e){return fail(e.message);}
""",
    )
    for index, (prefix, _effect) in enumerate(
        [
            ("H05", "created_or_reused"),
            ("H08", "closed"),
            ("H09", "assigned"),
            ("H11", "alert"),
            ("H46", "context_saved"),
            ("H50", "alert"),
        ]
    ):
        target = node(w, prefix)
        name = target["name"]
        guard = add_code(
            w,
            f"H{70 + index * 2}",
            "외부 쓰기 마감 검사 " + prefix,
            "const ctx=$json.ctx;const deadline=ctx.request.deadline_at??ctx.deadline_at;"
            "if(deadline && remaining(deadline)<4000){ctx.error_code=ctx.ticket?'partial_effect':'tickets_down';if(!ctx.ticket)ctx.effects.created_or_reused={status:'failed',error_code:'deadline_exceeded'};"
            "ctx.recovery={version:1,mode:'manual_required',action:'inspect_only',args:null,reference:null,reason:'deadline_exceeded'};"
            "return [{json:{route:'done',ctx}}];}return [{json:{...$json,route:'allowed'}}];",
        )
        allow = branch(
            w, f"H{71 + index * 2}", "외부 쓰기 허용 " + prefix, "$json.route === 'allowed'"
        )
        for source, connections in w["connections"].items():
            if source == allow:
                continue
            for edges in connections.get("main", []):
                for edge in edges:
                    if edge["node"] == name:
                        edge["node"] = guard
        link(w, guard, allow)
        link(w, allow, name, node(w, "H12")["name"])
    link(w, node(w, "H18")["name"], prepare)
    link(w, prepare, can_read)
    link(w, can_read, issue, node(w, "H12")["name"])
    link(w, issue, comments_req)
    link(w, comments_req, comments)
    link(w, comments, plan)
    link(w, plan, write_if)
    link(w, write_if, write, node(w, "H07")["name"])
    link(w, write, read_req)
    link(w, read_req, read)
    link(w, read, verify)
    link(w, verify, node(w, "H07")["name"])


SAVE_FAILURE = r"""
const fail = reason => [{json:{request_id:input.state_ref.request_id,ok:false,state_ref:input.state_ref,error_code:'state_error',
recovery:{version:1,mode:'jira_ref',action:'finish',args:null,reference:{jira_issue_key:input.ticket_id,case_id:input.case_id,owner_id:input.state_ref.owner_id},reason}}}];
const finish = () => [{json:{route:'finish',finish_payload:{op:'finish',state_ref:input.state_ref,args:{response:input.response,current_step:'respond'}}}}];
"""


def state(w):
    template = node(w, "S09")
    pre = add_code(
        w,
        "S21",
        "보완 문맥 댓글 조회 준비",
        r"""
const input=$('S01 상태 명령 수신').first().json,prev=$('S14 보완 대상 판정').first().json;
return [{json:{issue:$json,deadline_at:input.deadline_at??new Date(Date.now()+5000).toISOString(),req:{path:commentPath(prev.jira_issue_key)+'?maxResults=100'}}}];
""",
    )
    read = http(w, "S22", "Jira 보완 전체 댓글 조회", template, paginate=True)
    n = node(w, "S17")
    n["parameters"]["jsCode"] = (
        library()
        + COMMON
        + r"""
const input=$('S01 상태 명령 수신').first().json,prev=$('S14 보완 대상 판정').first().json,p=$('S21 보완 문맥 댓글 조회 준비').first().json;
const result=(mode,http,code,response=null)=>[{json:{request_id:input.request.request_id,mode,state_ref:null,support:null,facts:null,response,http_status:http,error_code:code}}];
try {
 if(remaining(p.deadline_at)<500||p.issue.statusCode!==200)return result('error',503,'state_error');
 const b={scope:input.scope,case_id:input.request.case_ref,owner_id:input.actor.id,first_request_id:prev.first_request_id,ticket_key:prev.jira_issue_key};
 CC.validateIssue(p.issue.body,b);
 const category=p.issue.body.fields.status?.statusCategory?.key;
 if(category==='done')return result('conflict',409,'case_closed',{error:'종료된 문의입니다. 새 문의로 접수해 주세요.',codes:['case_closed']});
 if(!['new','indeterminate'].includes(category))return result('error',503,'state_error');
 if(!prev.latest_completed_request_id)return result('error',503,'case_verification_required');
 const verified=select(pages(),b,prev.latest_completed_request_id);
 if(!['waiting_info','handed_off'].includes(verified.support.status))return result('error',503,'case_verification_required');
 return [{json:{route:'begin',case_begin_payload:{op:input.op,scope:input.scope,execution_id:input.execution_id,input_hash:input.input_hash,actor:input.actor,request:input.request,jira_open:true,jira_attempt:verified.support.attempt,verified_case:verified}}}];
}catch{return result('error',503,'case_verification_required');}
"""
    )
    link(w, node(w, "S16")["name"], pre)
    link(w, pre, read)
    link(w, read, n["name"])
    s14 = node(w, "S14")["parameters"]
    if "latest_completed_request_id:raw.latest_completed_request_id" not in s14["jsCode"]:
        s14["jsCode"] = s14["jsCode"].replace(
            "route:'jira', jira_issue_key:",
            "route:'jira', latest_completed_request_id:raw.latest_completed_request_id, jira_issue_key:",
        )
    s08 = node(w, "S08")["parameters"]
    s08["jsCode"] = (
        "const input = $('S01 상태 명령 수신').first().json;\nif(Date.parse(input.deadline_at)-Date.now()<1000)return [{json:{request_id:input.state_ref.request_id,ok:false,state_ref:input.state_ref,error_code:'state_error',recovery:{version:1,mode:'manual_required',action:'finish',args:null,reference:null,reason:'deadline_exceeded'}}}];\nreturn [{json:{deadline_at:input.deadline_at,req:{path:'/rest/api/2/issue/'+encodeURIComponent(input.ticket_id)+'?fields=labels,status,description,assignee'}}}];"
    )
    save_read_if = branch(w, "S31", "최종 문맥 읽기 허용", "!!$json.req")
    link(w, node(w, "S08")["name"], save_read_if)
    link(w, save_read_if, node(w, "S09")["name"], node(w, "S06")["name"])
    pre = add_code(
        w,
        "S23",
        "최종 문맥 댓글 조회 준비",
        r"""
const input=$('S01 상태 명령 수신').first().json;
return [{json:{issue:$json,deadline_at:input.deadline_at,req:{path:commentPath(input.ticket_id)+'?maxResults=100'}}}];
""",
    )
    read = http(w, "S24", "Jira 최종 전체 댓글 조회", template, paginate=True)
    n = node(w, "S10")
    n["parameters"]["jsCode"] = (
        library()
        + COMMON
        + r"""
const input=$('S01 상태 명령 수신').first().json,p=$('S23 최종 문맥 댓글 조회 준비').first().json;
"""
        + SAVE_FAILURE
        + r"""
try {
 if(input.expected_case_version!==null||remaining(input.deadline_at)<500||p.issue.statusCode!==200)return fail('context_read_failed');
 const b=bindingFor(input,input.ticket_id);CC.validateIssue(p.issue.body,b);
 const comments=pages(),latest=select(comments,b),actual=select(comments,b,input.state_ref.request_id);
 const status=input.outcome.support_status;
 const support={...actual.support,attempt:input.attempt,status,version:null};
 const category=p.issue.body.fields.status?.statusCategory?.key;
 if((status.startsWith('closed_')&&category!=='done')||(!status.startsWith('closed_')&&!['new','indeterminate'].includes(category)))return fail('context_status_conflict');
 if(status==='handed_off'){
   const labels=p.issue.body.fields.labels??[];
   let mapping={};try{mapping=JSON.parse('__ASSIGNEE_MAP_JSON__');}catch{}
   const expected=mapping[actual.support.assignee_role];
   if(!expected||!labels.includes('dubakwi-alert-sent-'+actual.support.assignee_role)||p.issue.body.fields.assignee?.accountId!==expected)return fail('context_effect_unverified');
 }
 if(CC.canonical(actual.support)===CC.canonical(support)&&CC.canonical(actual.facts)===CC.canonical(mask(input.facts)))return finish();
 if(remaining(input.deadline_at)<4000)return fail('deadline_exceeded');
 const snapshot=CC.buildSnapshot(b,input.state_ref.request_id,'save',latest.revision+1,support,mask(input.facts));
 const existing=comments.map(c=>CC.jiraText(c.body??'')).filter(t=>t.startsWith(CC.MARKER+'\n')).map(t=>JSON.parse(t.slice(CC.MARKER.length+1))).find(s=>s.event_id===snapshot.event_id);
 if(existing)return fail('context_conflict');
 return [{json:{route:'amend',snapshot,deadline_at:input.deadline_at,req:{path:commentPath(input.ticket_id),body:{body:CC.MARKER+'\n'+JSON.stringify(snapshot)}}}}];
}catch(e){return fail(e.message);}
"""
    )
    amend_if = branch(w, "S25", "최종 문맥 수정 필요", "$json.route === 'amend'")
    write = http(w, "S26", "Jira 최종 문맥 저장", template, "POST")
    req = add_code(
        w,
        "S27",
        "최종 저장 재조회 준비",
        r"""
const p=$('S10 문맥 확인 판정').first().json,input=$('S01 상태 명령 수신').first().json;
return [{json:{...p,req:{path:commentPath(input.ticket_id)+'?maxResults=100'}}}];
""",
    )
    verify_read = http(w, "S28", "Jira 최종 저장 재조회", template, paginate=True)
    verify = add_code(
        w,
        "S29",
        "최종 저장 일치 판정",
        r"""
const input=$('S01 상태 명령 수신').first().json,p=$('S27 최종 저장 재조회 준비').first().json;
"""
        + SAVE_FAILURE
        + r"""
try{if(remaining(input.deadline_at)<500)return fail('deadline_exceeded');
const actual=select(pages(),bindingFor(input,input.ticket_id),input.state_ref.request_id);
if(CC.canonical(actual)!==CC.canonical(p.snapshot))return fail('context_not_saved');return finish();
}catch(e){return fail(e.message);}
""",
    )
    verified_if = branch(w, "S30", "최종 저장 확인 통과", "$json.route === 'finish'")
    link(w, node(w, "S09")["name"], pre)
    link(w, pre, read)
    link(w, read, n["name"])
    link(w, node(w, "S11")["name"], node(w, "S04")["name"], amend_if)
    link(w, amend_if, write, node(w, "S06")["name"])
    link(w, write, req)
    link(w, req, verify_read)
    link(w, verify_read, verify)
    link(w, verify, verified_if)
    link(w, verified_if, node(w, "S04")["name"], node(w, "S06")["name"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for kind, update in [("handoff", handoff), ("state", state)]:
        path = ROOT / f"workflows/dubakwi-{kind}.json"
        previous = path.read_text("utf-8")
        workflow = json.loads(previous)
        update(workflow)

        def is_new(n, minimum=(52 if kind == "handoff" else 21)):
            prefix = n["name"].split(" ")[0][1:]
            return prefix.isdigit() and int(prefix) >= minimum

        additions = sorted((n for n in workflow["nodes"] if is_new(n)), key=lambda n: n["name"])
        floor = max(n.get("position", [0, 0])[1] for n in workflow["nodes"] if not is_new(n)) + 300
        for index, n in enumerate(additions):
            n["position"] = [200 + (index % 8) * 280, floor + (index // 8) * 220]
        rendered = json.dumps(workflow, ensure_ascii=False, indent=2) + "\n"
        if args.check and json.loads(previous) != workflow:
            raise SystemExit(f"outdated context nodes: {kind}")
        if not args.check:
            path.write_text(rendered, encoding="utf-8")
        print(f"case context {kind}: {'checked' if args.check else 'generated'}")


if __name__ == "__main__":
    main()
