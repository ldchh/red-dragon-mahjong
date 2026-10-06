/** Native background HTTPS never delays the offline Worker or startup assets. */
const jobs=new Map();
if(typeof window!=='undefined')window.addEventListener('hzserviceresult',event=>{
    const data=event.detail,job=jobs.get(data?.id);if(!job)return;
    jobs.delete(data.id);clearTimeout(job.timer);data.ok?job.resolve(data.data):job.reject(Error(data.reason||'network_failed'));
});
export function nativeServiceInfo(host=globalThis){
    if(!/\bHzService\/1\b/.test(host.navigator?.userAgent||''))return null;
    try{const result=JSON.parse(host.prompt('hz-service-v1',JSON.stringify({op:'info'}))||'null');return result?.ok?result:null;}catch{return null;}
}
export function nativeRequest(op,data={}){
    const id=crypto.randomUUID();
    return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{jobs.delete(id);reject(Error('network_failed'));},20000);
        jobs.set(id,{resolve,reject,timer});
        try{const result=JSON.parse(window.prompt('hz-service-v1',JSON.stringify({op,id,...data}))||'null');
            if(!result?.ok)throw Error('service_unavailable');
        }catch(error){jobs.delete(id);clearTimeout(timer);reject(error);}
    });
}
export async function redeemRequest(code,device){
    if(nativeServiceInfo())return nativeRequest('redeem',{code,device});
    const response=await fetch('/api/rewards/redeem',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({code,device}),cache:'no-store',signal:AbortSignal.timeout(20000)});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.reason||'service_unavailable');
    return result;
}
