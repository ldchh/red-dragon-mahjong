import {seatRegion} from './table-world-layout.js?v=1.9.20';
// Only visual transactions. Server/Worker state is applied immediately.
let localOrigin=null;
const flights=new Set();
const rect=el=>{const r=el?.getBoundingClientRect();return r&&r.width?{x:r.x,y:r.y,w:r.width,h:r.height}:null;};
export function rememberDiscard(value,element){localOrigin={value,rect:rect(element),time:performance.now()};}
export function pendingDiscards(previous,next,myId,board){
    if(!previous||previous.current_round!==next.current_round||previous.round_token!==next.round_token
        ||matchMedia('(prefers-reduced-motion: reduce)').matches)return [];
    const changes=[];
    for(let seat=0;seat<4;seat++){
        const before=previous.discards?.[seat]||[],after=next.discards?.[seat]||[];
        if(after.length!==before.length+1)continue;
        const rel=(seat-myId+4)%4,value=after.at(-1);
        let from=null;
        if(rel===0&&localOrigin?.value===value&&performance.now()-localOrigin.time<3000)from=localOrigin.rect;
        if(!from&&rel===0)from=rect(board.querySelector('#my-hand .tile[data-tile="'+value+'"]'));
        if(!from&&rel!==0){
            const backs=seatRegion(board.querySelector('#player-'+rel),'hand-back');
            from=rect(backs?.children[Math.floor(backs.children.length/2)]);
        }
        if(from)changes.push({rel,value,index:before.length,from});
    }
    if(changes.some(c=>c.rel===0))localOrigin=null;
    return changes;
}
export function animateDiscards(changes,board){
    for(const change of changes){
        const river=seatRegion(board.querySelector('#player-'+change.rel),'discards');
        const target=river?.children[change.index],to=rect(target);
        if(!to||target.dataset.tile!==String(change.value))continue;
        const face=rect(target.querySelector('.tile-face'));
        const placeholder=document.createElement('div');
        placeholder.className=target.className;placeholder.style.cssText=target.style.cssText;
        placeholder.style.visibility='hidden';placeholder.dataset.rot=target.dataset.rot;
        placeholder.dataset.flightValue=String(change.value);
        placeholder.setAttribute('aria-hidden','true');
        // Keep an empty slot for subsequent layout updates. The actual tile
        // enters the river at landing, without delaying rules or network events.
        target.replaceWith(placeholder);
        const fly=target.cloneNode(true);fly.classList.remove('tile--current-discard');
        fly.classList.add('discard-flight');fly.setAttribute('aria-hidden','true');
        const tk=Math.max(0,to.y+to.h-face.y-face.h),side=Number(target.dataset.rot)%180;
        const tw=side?to.h-tk:to.w,th=side?to.w:to.h-tk;
        const sideW=parseFloat(target.style.getPropertyValue('--side-w'))||0;
        const scale=to.w/(parseFloat(target.style.width)||to.w);
        fly.style.cssText='position:fixed;left:'+to.x+'px;top:'+to.y+'px;width:'+to.w+'px;height:'+to.h+'px;--tw:'+tw+'px;--th:'+th+'px;--tk:'+tk+'px;--side-w:'+(sideW*scale)+'px;z-index:70;pointer-events:none;transform-origin:0 0;';
        board.append(fly);
        const anim=fly.animate([
            {transform:'translate('+(change.from.x-to.x)+'px,'+(change.from.y-to.y)+'px) scale('+(change.from.w/to.w)+','+(change.from.h/to.h)+')'},
            {transform:'translate(0,0) scale(1,1)'},
        ],{duration:change.rel===0?180:160,easing:'cubic-bezier(.16,.65,.3,1)',fill:'both'});
        const job={anim,finish:null};
        job.finish=()=>{
            if(!flights.delete(job))return;
            fly.remove();
            if(placeholder.isConnected){
                target.classList.toggle('tile--current-discard',placeholder.classList.contains('tile--current-discard'));
                // The placeholder has already followed every viewport/state
                // layout update. Reuse that geometry without remeasuring 120
                // cards at landing; the normal observer refreshes the marker.
                target.style.cssText=placeholder.style.cssText;target.style.removeProperty('visibility');
                target.dataset.rot=placeholder.dataset.rot;
                if(placeholder.dataset.side)target.dataset.side=placeholder.dataset.side;
                placeholder.replaceWith(target);
            }
        };
        flights.add(job);anim.finished.then(job.finish,job.finish);
    }
}
export function cancelDiscardFlights(){localOrigin=null;for(const job of [...flights]){job.anim.cancel();job.finish();}}
window.addEventListener('resize',cancelDiscardFlights);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDiscardFlights();});
