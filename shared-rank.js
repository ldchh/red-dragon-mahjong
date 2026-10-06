import './offline/progression.js?v=1.9.20';
import './shared-rank-core.js?v=1.9.20';
export const RANK_KEY='hz_shared_rank_v1';
export function monthAtDeviceClock(date,clock=null){
    if(clock?.time_zone){try{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:clock.time_zone,year:'numeric',month:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));return parts.year+'-'+parts.month;}catch{/* Android 的 GMT 偏移标识也可按数值偏移读取。 */}}
    if(Number.isFinite(clock?.utc_offset_minutes)){const shifted=new Date(date.getTime()+clock.utc_offset_minutes*60000);return shifted.getUTCFullYear()+'-'+String(shifted.getUTCMonth()+1).padStart(2,'0');}
    return MahjongOfflineProgression.localDate(date).slice(0,7);
}
export function browserRankStorage(host=globalThis){
    const native=/\bHzRank\/1\b/.test(host.navigator?.userAgent||'');
    const bridge=request=>{const r=JSON.parse(host.prompt('hz-rank-v1',JSON.stringify(request))||'null');if(!r?.ok)throw Error('段位存储未能完成');return r;};
    const parse=s=>s==null?null:typeof s==='string'?JSON.parse(s):s;
    return {read:()=>native?bridge({op:'read'}).document:host.localStorage.getItem(RANK_KEY),
        write:document=>native?bridge({op:'write',document}):host.localStorage.setItem(RANK_KEY,JSON.stringify(document)),
        legacy:()=>({online:parse(host.localStorage.getItem('hz_rank_v1')),token:host.MAHJONG_OFFLINE?null:host.localStorage.getItem('hz_player_token_v1'),
            offline:native?bridge({op:'legacy'}).profile:parse(host.localStorage.getItem('hz_offline_state_v2'))?.profile}),
        clock:()=>native?bridge({op:'clock'}).clock:null};
}
export function createSharedRank(storage,options={}){return new globalThis.MahjongSharedRank.SharedRank({storage,legacy:()=>storage.legacy(),...options});}
let sharedRank=null,deviceClock=null;
export const rankClockOffset=()=>deviceClock?.utc_offset_minutes??-new Date().getTimezoneOffset();
if(typeof window!=='undefined'){
    try{
        const storage=browserRankStorage(window);
        const updateClock=()=>{deviceClock=storage.clock();};
        updateClock();
        sharedRank=createSharedRank(storage,{monthKey:d=>monthAtDeviceClock(d,deviceClock)});
        sharedRank.subscribe(state=>window.dispatchEvent(new CustomEvent('unifiedrankchange',{detail:state})));
        const refresh=()=>{try{updateClock();sharedRank.refresh();window.dispatchEvent(new CustomEvent('unifiedrankchange',{detail:sharedRank.snapshot()}));}catch(e){window.dispatchEvent(new CustomEvent('rankstorageerror',{detail:e.message}));}};
        window.addEventListener('storage',e=>{if(e.key===RANK_KEY)refresh();});window.addEventListener('focus',refresh);
        document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(refresh,60000);
    }catch(e){window.HZ_RANK_ERROR=e.message;}
    window.HZSharedRank=sharedRank;
}
export {sharedRank};
