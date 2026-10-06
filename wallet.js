import {COSMETICS,ACTIVITIES} from './cosmetics.js?v=1.9.20';
import {sharedRank} from './shared-rank.js?v=1.9.20';

export const WALLET_KEY='hz_wallet_v1';
const clone=v=>JSON.parse(JSON.stringify(v));
const integer=(n,min,max)=>Number.isSafeInteger(n)?Math.min(max,Math.max(min,n)):min;
export function defaultWallet() {
    return {version:2,coupons:0,unlocked:{tablecloth:['jade'],tileBack:['theme'],tileFace:['majsoul']},
        equipped:{tablecloth:'jade',tileBack:'theme',tileFace:'majsoul'},peak:{offline:1,online:1},
        claimed:{summit_2:false,summit_3:false,summit_5:false,summit_7:false,summit_8:false,newcomer:false},
        claimAmounts:{summit_2:0,summit_3:0,summit_5:0,summit_7:0,summit_8:0,newcomer:0},
        newcomer:{completed:false,match:null},dailyCoupon:{date:null,matches:[],claims:{}},redemptions:[],ledger:[]};
}
export function normalizeWallet(input,catalogue=COSMETICS) {
    const d=defaultWallet(),v=input&&typeof input==='object'?input:{};
    d.coupons=integer(v.coupons,0,Number.MAX_SAFE_INTEGER);
    for(const [category,items]of Object.entries(catalogue)){
        const ids=Array.isArray(v.unlocked?.[category])?v.unlocked[category]:[];
        d.unlocked[category]=items.filter(i=>i.default||ids.includes(i.id)).map(i=>i.id);
        d.equipped[category]=d.unlocked[category].includes(v.equipped?.[category])
            ? v.equipped[category] : items.find(i=>i.default)?.id;
    }
    for(const mode of ['offline','online'])d.peak[mode]=integer(v.peak?.[mode],1,8);
    for(const id of Object.keys(d.claimed))d.claimed[id]=v.claimed?.[id]===true;
    for(const id of Object.keys(d.claimAmounts)){
        const cap=rewardTotal(id);
        d.claimAmounts[id]=integer(v.claimAmounts?.[id],0,cap);
        // Old fifth-rank claims paid one coupon. Preserve that claim and allow
        // only its remaining coupon, even after the player's season resets.
        if(d.claimed[id])d.claimAmounts[id]=Math.max(id==='summit_5'?1:cap,d.claimAmounts[id]);
    }
    if(v.newcomer?.completed===true&&validMatch(v.newcomer.match)){d.newcomer.completed=true;d.newcomer.match=clone(v.newcomer.match);}
    if(validDate(v.dailyCoupon?.date)){
        d.dailyCoupon.date=v.dailyCoupon.date;
        d.dailyCoupon.matches=[...new Set((Array.isArray(v.dailyCoupon.matches)?v.dailyCoupon.matches:[]).filter(validReceiptID))].slice(0,4);
    }
    for(const [month,bits] of Object.entries(v.dailyCoupon?.claims||{})){
        if(/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&Number.isInteger(bits)&&bits>=0&&bits<=0x7fffffff)d.dailyCoupon.claims[month]=bits;
    }
    d.redemptions=[...new Set((Array.isArray(v.redemptions)?v.redemptions:[]).filter(validReceiptID))];
    d.ledger=(Array.isArray(v.ledger)?v.ledger:[]).filter(e=>e&&typeof e.at==='string'&&e.at.length<=40&&
        ['claim','unlock','redeem'].includes(e.kind)&&typeof e.ref==='string'&&e.ref.length<=120&&[-1,1,2,4].includes(e.delta)).slice(-64).map(clone);
    return d;
}
const validReceiptID=id=>typeof id==='string'&&/^[a-zA-Z0-9:_-]{8,120}$/.test(id);
const validMatch=m=>m&&validReceiptID(m.id)&&([10,15,20].includes(m.rounds)||m.legacy_ranked===true&&m.rounds==null)&&m.completed===true;
const rewardTotal=id=>id==='newcomer'?1:ACTIVITIES.flatMap(a=>a.milestones).find(m=>m.id===id)?.coupons||0;
const validDate=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const localDate=value=>{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const dayBit=date=>2**(Number(date.slice(-2))-1);
export function browserWalletStorage(host=globalThis) {
    const native=/\bHzWallet\/1\b/.test(host.navigator?.userAgent||'');
    const bridge=data=>{
        const answer=JSON.parse(host.prompt('hz-wallet-v1',JSON.stringify(data))||'null');
        if(!answer?.ok)throw Error('钱包存储未能完成');
        if(Number.isInteger(answer.offlineRank))host.HZ_WALLET_OFFLINE_RANK=answer.offlineRank;
        return answer;
    };
    return {
        maxVersion:native&&!/\bHzService\/1\b/.test(host.navigator?.userAgent||'')?1:2,
        read:()=>native?bridge({op:'read'}).document:host.localStorage.getItem(WALLET_KEY),
        write:document=>{
            const value=JSON.stringify(document);
            if(native)bridge({op:'write',document});else host.localStorage.setItem(WALLET_KEY,value);
        },
        legacy:()=>host.localStorage.getItem('hz_table_theme_v1')??(host.MAHJONG_OFFLINE===true?host.localStorage.getItem('hz_offline_table_theme_v1'):null),
    };
}
export function createWallet({storage,catalogue=COSMETICS,notify=()=>{},now=()=>new Date().toISOString(),rankProvider=null}={}) {
    let state=defaultWallet(),loaded=false,readOnly=false,readOnlyReason='future_version';
    let observed=1;
    const currentMajor=()=>integer(rankProvider?rankProvider():observed,1,8);
    const listeners=new Set();
    const fail=reason=>({ok:false,reason});
    const publish=()=>{for(const fn of listeners)fn(clone(state));};
    function persist(next){
        if(readOnly)return fail(readOnlyReason);
        try{storage.write(clone(next));}catch{notify('礼券未能保存，请检查设备存储后重试。');return fail('storage_failed');}
        state=next;publish();return {ok:true,state:clone(state)};
    }
    function load(){
        if(loaded)return clone(state);
        let raw;
        try{raw=storage.read();}catch{readOnly=true;readOnlyReason='storage_failed';notify('礼券未能读取，请检查设备存储后重试。');loaded=true;return clone(state);}
        let parsed;
        try{parsed=typeof raw==='string'?JSON.parse(raw):raw;}catch{parsed=null;}
        readOnly=Number(parsed?.version)>2||(storage.maxVersion??2)<2;
        const next=normalizeWallet(parsed,catalogue);
        if(raw==null){
            let legacy;
            try{legacy=storage.legacy?.();}catch{/* Legacy localStorage may be unavailable. */}
            if(catalogue.tablecloth.some(i=>i.id===legacy&&!i.default)){
                next.unlocked.tablecloth.push(legacy);next.equipped.tablecloth=legacy;
            }
        }
        loaded=true;
        if(readOnly)state=next;
        else if(!persist(next).ok){
            // A migration write failure must not hide the balance/equipment we
            // already read. Keep that normalized snapshot, safely read-only.
            state=next;readOnly=true;readOnlyReason='storage_failed';publish();
        }
        return clone(state);
    }
    const owned=(category,id)=>{
        load();return catalogue[category]?.some(i=>i.id===id&&(i.default||state.unlocked[category]?.includes(id)))||false;
    };
    function unlock(category,id){
        const latest=refresh();if(!latest.ok)return latest;
        if(!catalogue[category]?.some(i=>i.id===id))return fail('unknown_item');
        if(owned(category,id))return fail('already_owned');
        if(state.coupons<1)return fail('insufficient_coupons');
        const next=clone(state);next.coupons--;next.unlocked[category].push(id);
        next.ledger.push({at:now(),kind:'unlock',ref:id,delta:-1});next.ledger=next.ledger.slice(-64);
        return persist(next);
    }
    function equip(category,id){
        const latest=refresh();if(!latest.ok)return latest;
        if(!owned(category,id))return fail('not_owned');
        const next=clone(state);next.equipped[category]=id;return persist(next);
    }
    // One durable write commits payment, ownership and equipment together.
    // Callers prepare required presentation assets before entering this method.
    function unlockAndEquip(category,id){
        const latest=refresh();if(!latest.ok)return latest;
        if(!catalogue[category]?.some(i=>i.id===id))return fail('unknown_item');
        const has=owned(category,id);
        if(!has&&state.coupons<1)return fail('insufficient_coupons');
        if(has&&state.equipped[category]===id)return {ok:true,state:clone(state)};
        const next=clone(state);
        if(!has){
            next.coupons--;next.unlocked[category].push(id);
            next.ledger.push({at:now(),kind:'unlock',ref:id,delta:-1});next.ledger=next.ledger.slice(-64);
        }
        next.equipped[category]=id;return persist(next);
    }
    function observeRank(mode,major){
        const latest=refresh();if(!latest.ok)return latest;
        if(!['offline','online'].includes(mode))return fail('unknown_mode');
        const peak=integer(major,1,8);
        observed=peak;
        if(peak<=state.peak[mode]){publish();return {ok:true,state:clone(state)};}
        const next=clone(state);next.peak[mode]=peak;return persist(next);
    }
    function rewardStatus(id){
        load();const milestone=ACTIVITIES.flatMap(a=>a.milestones).find(m=>m.id===id);
        const total=id==='newcomer'?1:milestone?.coupons||0,paid=state.claimAmounts[id]||0;
        const eligible=id==='newcomer'?state.newcomer.completed:!!milestone&&(currentMajor()>=milestone.major||id==='summit_5'&&paid===1);
        return {remaining:Math.max(0,total-paid),paid,eligible,ready:eligible&&total>paid&&!readOnly};
    }
    function claim(id){
        const latest=refresh();if(!latest.ok)return latest;
        const milestone=ACTIVITIES.flatMap(a=>a.milestones).find(m=>m.id===id);
        if(!milestone&&id!=='newcomer')return fail('unknown_milestone');
        const status=rewardStatus(id);
        if(!status.remaining)return fail('already_claimed');
        if(!status.eligible)return fail('not_reached');
        const next=clone(state);next.claimed[id]=true;next.claimAmounts[id]+=status.remaining;next.coupons+=status.remaining;
        next.ledger.push({at:now(),kind:'claim',ref:id,delta:status.remaining});next.ledger=next.ledger.slice(-64);
        const result=persist(next);return {...result,...(result.ok?{amount:status.remaining}:{})};
    }
    function recordCompleteMatch(match){
        if(!validMatch(match))return fail('invalid_match');
        return recordCompleteMatches([match]);
    }
    // One shared device journal; dated completion proofs never get re-dated on replay.
    function refresh(){
        load();if(readOnly)return fail(readOnlyReason);
        try{
            const raw=storage.read(),parsed=typeof raw==='string'?JSON.parse(raw):raw;
            if(Number(parsed?.version)>2){readOnly=true;return fail('future_version');}
            if(parsed){const next=normalizeWallet(parsed,catalogue),changed=JSON.stringify(next)!==JSON.stringify(state);state=next;if(changed)publish();}
        }catch{return fail('storage_failed');}
        return {ok:true,state:clone(state)};
    }
    function recordCompleteMatches(matches){
        const latest=refresh();if(!latest.ok)return latest;
        const date=localDate(now()),next=clone(state);let changed=false;
        for(const match of Array.isArray(matches)?matches:[]){
            if(!validMatch(match))continue;
            if(!next.newcomer.completed){next.newcomer={completed:true,match:clone(match)};changed=true;}
            if(match.date!==date||![10,15,20].includes(match.rounds))continue;
            if(next.dailyCoupon.date!==date){next.dailyCoupon.date=date;next.dailyCoupon.matches=[];changed=true;}
            if(next.dailyCoupon.matches.length<4&&!next.dailyCoupon.matches.includes(match.id)){
                next.dailyCoupon.matches.push(match.id);changed=true;
            }
        }
        return changed?persist(next):{ok:true,state:clone(state)};
    }
    function dailyStatus(){
        load();const date=localDate(now()),progress=state.dailyCoupon.date===date?state.dailyCoupon.matches.length:0;
        const claimed=!!((state.dailyCoupon.claims[date.slice(0,7)]||0)&dayBit(date));
        return {date,progress,target:4,done:progress>=4,claimed,ready:progress>=4&&!claimed&&!readOnly};
    }
    function claimDaily(date){
        const latest=refresh();if(!latest.ok)return latest;
        const status=dailyStatus();if(date!==status.date)return fail('new_day');
        if(status.claimed)return fail('already_claimed');if(!status.done)return fail('not_reached');
        const next=clone(state),month=date.slice(0,7);
        next.dailyCoupon.claims[month]=(next.dailyCoupon.claims[month]||0)|dayBit(date);next.coupons++;
        next.ledger.push({at:now(),kind:'claim',ref:'daily_four:'+date,delta:1});next.ledger=next.ledger.slice(-64);
        const result=persist(next);return {...result,...(result.ok?{amount:1}:{})};
    }
    function redeem(receipt){
        load();
        try{const raw=storage.read(),parsed=typeof raw==='string'?JSON.parse(raw):raw;
            if(Number(parsed?.version)>2)return fail('future_version');
            if(parsed)state=normalizeWallet(parsed,catalogue);
        }catch{return fail('storage_failed');}
        if(!validReceiptID(receipt?.id)||receipt?.coupons!==1)return fail('invalid_receipt');
        if(state.redemptions.includes(receipt.id))return fail('already_redeemed');
        const next=clone(state);next.coupons++;next.redemptions.push(receipt.id);
        next.ledger.push({at:now(),kind:'redeem',ref:receipt.id,delta:1});next.ledger=next.ledger.slice(-64);
        return persist(next);
    }
    return {load,unlock,equip,unlockAndEquip,observeRank,claim,owned,rewardStatus,recordCompleteMatch,recordCompleteMatches,refresh,dailyStatus,claimDaily,redeem,
        get currentMajor(){return currentMajor();},
        get readOnly(){load();return readOnly;},
        get readOnlyReason(){load();return readOnly?readOnlyReason:null;},
        subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    };
}
export const wallet=typeof window==='undefined'?null:createWallet({
    storage:browserWalletStorage(window),
    rankProvider:()=>sharedRank?.refresh().rank_state.major||1,
    notify:message=>window.dispatchEvent(new CustomEvent('walletnotice',{detail:{message}})),
});
