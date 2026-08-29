import { performance } from 'node:perf_hooks';

const baseUrl=(process.env.BASE_URL??'http://localhost:3000').replace(/\/$/,'');
const users=Number(process.env.EXAM_LOAD_USERS??100);
const slug=process.env.EXAM_SLUG??'a1-foundations-exam';
const password=process.env.EXAM_LOAD_PASSWORD??'ExamLoad123!';
const timeout=Number(process.env.EXAM_REQUEST_TIMEOUT_MS??30000);

if(!Number.isInteger(users)||users<1||users>1000)throw new Error('EXAM_LOAD_USERS must be an integer between 1 and 1000.');

async function request(path,{token,...init}={}){
  const response=await fetch(`${baseUrl}${path}`,{...init,signal:AbortSignal.timeout(timeout),headers:{...init.headers,...(token?{authorization:`Bearer ${token}`}:{})}});
  if(!response.ok){const body=await response.text();throw new Error(`${response.status} ${path}: ${body.slice(0,240)}`);}
  return response.status===204?null:response.json();
}

const percentile=(values,ratio)=>values.slice().sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*ratio)-1)]??0;
const stages={login:[],list:[],start:[],save:[],submit:[]};

async function timed(stage,operation){const start=performance.now();try{return await operation();}finally{stages[stage].push(performance.now()-start);}}

async function learner(number){
  const email=`exam-load-${String(number).padStart(3,'0')}@enacademy.loadtest`;
  const login=await timed('login',()=>request('/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})}));
  const token=login.accessToken;
  const catalog=await timed('list',()=>request('/api/v1/exams',{token}));
  if(!catalog.some(exam=>exam.slug===slug))throw new Error(`${email}: exam ${slug} is not visible.`);
  let attempt=await timed('start',()=>request(`/api/v1/exams/${slug}/attempts`,{token,method:'POST'}));
  if(attempt.status==='IN_PROGRESS'){
    const answers=attempt.questions.map(question=>({questionId:question.id,selectedOption:question.options[0].id}));
    await timed('save',()=>request(`/api/v1/exams/attempts/${attempt.attemptId}/answers`,{token,method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({answers})}));
    attempt=await timed('submit',()=>request(`/api/v1/exams/attempts/${attempt.attemptId}/submit`,{token,method:'POST'}));
  }else{
    stages.save.push(0);stages.submit.push(0);
  }
  if(attempt.status==='IN_PROGRESS'||attempt.percentage===null)throw new Error(`${email}: attempt was not finalized.`);
  return {email,attemptId:attempt.attemptId,status:attempt.status,percentage:attempt.percentage};
}

console.log(`ENAcademy exam load test: ${users} simultaneous learners against ${baseUrl}`);
const started=performance.now();
const results=await Promise.allSettled(Array.from({length:users},(_,index)=>learner(index+1)));
const failures=results.filter(result=>result.status==='rejected');
const elapsed=performance.now()-started;

console.table(Object.entries(stages).map(([stage,values])=>({stage,requests:values.length,p50_ms:Math.round(percentile(values,.50)),p95_ms:Math.round(percentile(values,.95)),max_ms:Math.round(Math.max(...values,0))})));
console.log(JSON.stringify({users,completed:results.length-failures.length,failed:failures.length,errorRatePercent:Number((failures.length/users*100).toFixed(2)),wallTimeMs:Math.round(elapsed)},null,2));
if(failures.length){for(const failure of failures.slice(0,10))console.error(failure.reason?.message??failure.reason);process.exitCode=1;}
