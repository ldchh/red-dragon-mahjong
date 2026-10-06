import {WORLD,applyWorldLayout,tileSide} from './table-world-layout.js?v=1.9.20';
import {renderStandingWalls,standingWallRects} from './standing-wall.js?v=1.9.20';
export {WORLD};
// Normalized screen targets of a SQUARE source plane, shared by every theme.
export const TABLE_CAMERA=Object.freeze({
    desktop:Object.freeze({farY:.055,nearY:.98,farW:.60,ratio:.64}),
    landscape:Object.freeze({farY:.045,nearY:.95,farW:.60,ratio:.66,maxPlaneAspect:2.2}),
    compact:Object.freeze({farY:.04,nearY:.93,farW:.64,ratio:.72,maxPlaneAspect:2.2}),
    near:Object.freeze({farY:.04,nearY:.96,farW:.92,ratio:1}),
});
export function viewForSize(width,height,mode='tilted') {
    const profile=mode==='near'?'near':height<=560?(width<780||height<340?'compact':'landscape'):'desktop';
    // Very wide phones use a bounded table span: extra width belongs to the
    // surrounding felt/UI instead of stretching a square world into a ribbon.
    const p=TABLE_CAMERA[profile],planeWidth=Math.min(width,height*(p.maxPlaneAspect||Infinity));
    const yt=p.farY*height,yb=p.nearY*height,wt=p.farW*planeWidth,wb=wt/p.ratio,cx=width/2;
    const g=(p.ratio-1)/WORLD,c=cx-wt/2;
    return {profile,width,height,planeWidth,S:WORLD,...p,a:wt/WORLD,b:(p.ratio*(cx-wb/2)-c)/WORLD,c,d:(yb*p.ratio-yt)/WORLD,e:yt,g};
}
export function projectPoint(v,x,y){const w=1+v.g*y;return {x:(v.a*x+v.b*y+v.c)/w,y:(v.d*y+v.e)/w};}
export function unprojectPoint(v,x,y){const py=(y-v.e)/(v.d-y*v.g);return {x:(x*(1+v.g*py)-v.b*py-v.c)/v.a,y:py};}
export function projectRect(v,r){
    const p=[[r.x,r.y],[r.x+r.w,r.y],[r.x,r.y+r.h],[r.x+r.w,r.y+r.h]].map(([x,y])=>projectPoint(v,x,y));
    const xs=p.map(p=>p.x),ys=p.map(p=>p.y);
    return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
}
export function projectionMatrix(v){return 'matrix3d('+[v.a,0,0,0,v.b,v.d,0,v.g,0,0,1,0,v.c,v.e,0,1].join(',')+')';}
const set=(board,k,val)=>{
    if(/^-?[\d.]+px$/.test(val))val=Number(parseFloat(val).toFixed(3))+'px';
    if(board.style.getPropertyValue(k)!==val)board.style.setProperty(k,val);
};
export function applyTableView(board,width,height,mode='tilted'){
    const view=viewForSize(width,height,mode);
    set(board,'--table-projection',projectionMatrix(view));
    if(board.dataset.tableView!==view.profile)board.dataset.tableView=view.profile;
    const L=applyWorldLayout(board,view),center=projectPoint(view,500,500);
    const plate=projectRect(view,{x:500-L.plate/2,y:500-L.plate/2,w:L.plate,h:L.plate});
    set(board,'--table-center-y',(plate.y+plate.h/2)+'px');set(board,'--table-center-x',center.x+'px');
    // An upright rectangle must fit the plate's narrower far edge. Scale text
    // by height as well as width, especially on short landscape screens.
    const farWidth=view.a*L.plate/(1+view.g*(500-L.plate/2));
    set(board,'--center-w',(farWidth-8)+'px');set(board,'--center-h',(plate.h-2)+'px');
    set(board,'--center-scale',String(Math.min(1,plate.h/142,farWidth/170)));
    renderStandingWalls(board,view,L);
    placeOppositeAvatar(board,view,L);
    placeSideAvatars(board,view);
    updateDiscardMarker(board,view);
    placeActionBar(board);
    return view;
}

// Horizontal intervals for the final, unanimated capsule. Own rivers are not
// obstacles: their temporary coverage is an explicitly accepted design tradeoff.
export function solveActionBarPosition({viewportWidth,width,height,top,anchor,melds=[],obstacles=[]}){
    const margin=8.5,bottom=top+height;
    let right=viewportWidth-width-margin;
    if(melds.length){
        const upper=Math.min(...melds.map(r=>r.y)),lower=Math.max(...melds.map(r=>r.y+r.h));
        // Confirmed amendment: only clamp beside melds when vertical clearance
        // is below 8px. Forcing every capsule left of four melds cannot fit.
        if(Math.max(0,upper-bottom,top-lower)<8.5)right=Math.min(right,Math.min(...melds.map(r=>r.x))-margin-width);
    }
    let ranges=right>=margin?[[margin,right]]:[];
    for(const r of obstacles){
        const gap=r.gap??4.5;
        if(Math.max(0,r.y-bottom,top-r.y-r.h)>=gap)continue;
        const left=r.x-width-gap,end=r.x+r.w+gap,next=[];
        for(const[a,b]of ranges){
            if(end<=a||left>=b){next.push([a,b]);continue;}
            if(left>a)next.push([a,Math.min(left,b)]);
            if(end<b)next.push([Math.max(end,a),b]);
        }
        ranges=next;
    }
    const options=ranges.map(([a,b])=>Math.max(a,Math.min(b,anchor))).sort((a,b)=>Math.abs(a-anchor)-Math.abs(b-anchor));
    return options.length?{left:options[0],ranges}:null;
}
export function placeActionBar(board){
    // The hidden capacity template only reserves permanent information. Its
    // hypothetical four-button capsule must not run a shrink/layout search.
    if(board.dataset.cueCapacity==='1')return;
    const panel=board.querySelector('#actions-panel'),ting=board.querySelector('#ting-status');
    if(!panel)return;
    ting?.style.removeProperty('left');ting?.style.removeProperty('right');
    if(panel.classList.contains('hidden')){if(board.classList.contains('cue-claim-open'))board.classList.remove('cue-claim-open');panel.style.removeProperty('left');return;}
    const base=board.getBoundingClientRect(),scale=base.width/board.clientWidth||1;
    const rect=e=>{
        if(!e||!e.getClientRects().length||getComputedStyle(e).display==='none')return null;
        const r=e.getBoundingClientRect();return{x:(r.x-base.x)/scale,y:(r.y-base.y)/scale,w:r.width/scale,h:r.height/scale};
    };
    const melds=[...board.querySelectorAll('#my-melds .tile')].map(rect).filter(Boolean);
    const obstacles=[...board.querySelectorAll('.bottom .avatar,#quick-chat-btn,.game-tools')].flatMap(e=>{
        const r=rect(e);return r?[{...r,gap:e.matches('.avatar')?6.5:4.5}]:[];
    });
    for(const e of board.querySelectorAll('.seat-plane:not([data-rel="0"]) .discards .tile')){
        const r=rect(e);if(r)obstacles.push({...r,gap:3}); // Also leave room for the 2px spotlight pad.
    }
    // Reserve the final red face outline, independently of its fade-in.
    const current=board.querySelector('.tile--current-discard');
    if(current&&current.closest('.seat-plane')?.dataset.rel!=='0'&&current.style.visibility!=='hidden'){
        const read=e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top),w:parseFloat(e.style.width),h:parseFloat(e.style.height),
            tw:parseFloat(e.style.getPropertyValue('--tw')),tk:parseFloat(e.style.getPropertyValue('--tk')),pose:'flat',z:Number(e.style.zIndex)});
        const v=viewForSize(board.clientWidth,board.clientHeight,board.dataset.tableView==='near'?'near':'tilted');
        const points=discardOutline(v,read(current),{faceOnly:true,outset:0,occluders:[...current.parentElement.children].filter(e=>e!==current).map(read)});
        const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
        obstacles.push({x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys),gap:6});
    }
    panel.style.removeProperty('--act-h');panel.style.removeProperty('left');
    const first=panel.querySelector('.action-btn'),natural=parseFloat(getComputedStyle(first).height)||52;
    const pass=panel.querySelector('#btn-pass'),minHeight=pass&&getComputedStyle(pass).display!=='none'?44/.82:44;
    let solution=null,geometry=null;
    for(let h=Math.max(natural,minHeight);h>=minHeight-.01;h=Math.max(minHeight,h-1)){
        set(panel,'--act-h',h+'px');
        const width=panel.offsetWidth,height=panel.offsetHeight,top=panel.offsetTop;
        const anchor=(parseFloat(board.style.getPropertyValue('--own-hand-x'))||board.clientWidth/2)-width/2;
        solution=solveActionBarPosition({viewportWidth:board.clientWidth,width,height,top,anchor,melds,obstacles});
        geometry={width,height,top};if(solution||h===minHeight)break;
    }
    const {width,height,top}=geometry;
    const left=solution?.left??Math.max(8.5,Math.min(board.clientWidth-width-8.5,panel.offsetLeft-width/2));
    set(panel,'left',(left+width/2)+'px');
    panel.dataset.cueLayout=solution?'fit':'unresolved';
    if(ting&&!ting.classList.contains('hidden')){
        const r=rect(ting.querySelector('.ting-btn'));
        if(r&&r.x<left+width+8&&r.x+r.w>left-8&&r.y<top+height+8&&r.y+r.h>top-8){
            set(ting,'left',(left+width+10)+'px');set(ting,'right','auto');
        }
    }
    const picker=board.querySelector('#kong-picker');
    if(picker){
        set(picker,'bottom',(board.clientHeight-top+10)+'px');
        const half=picker.offsetWidth/2;
        set(picker,'left',Math.max(half+8,Math.min(board.clientWidth-half-8,left+width/2))+'px');
    }
}

function placeOppositeAvatar(board,view,L) {
    // The avatar stays upright in screen space, just beyond the complete far
    // hand/meld lane. Its anchor therefore also works when opponents reveal.
    const avatar=board.querySelector('.top .avatar');
    if(!avatar)return;
    const far=projectRect(view,{x:L.farLaneCenter-L.farLaneWidth/2,y:L.handBackInset,w:L.farLaneWidth,h:64});
    const width=avatar.offsetWidth,height=avatar.offsetHeight;
    const left=Math.max(view.width*.5,Math.min(far.x+far.w+10,view.width-width-12));
    const walls=standingWallRects(board).filter(r=>r.rel===2);
    let top=walls.length?Math.min(...walls.map(r=>r.y)):far.y;
    const tools=board.querySelector('.game-tools');
    if(tools){
        const br=board.getBoundingClientRect(),tr=tools.getBoundingClientRect();
        // Preview boards can be scaled; convert their DOM rectangles back to
        // the same screen coordinates used by this camera.
        const scale=br.width/view.width||1;
        const r={x:(tr.left-br.left)/scale,y:(tr.top-br.top)/scale,w:tr.width/scale,h:tr.height/scale};
        if(left<r.x+r.w+8&&left+width>r.x-8&&top<r.y+r.h+8&&top+height>r.y-8)top=r.y+r.h+8;
    }
    set(board,'--opponent-avatar-x',left+'px');
    set(board,'--opponent-avatar-y',top+'px');
}
const sideSizes=new WeakMap();
export function placeSideAvatars(board,view){
    for(const rel of [1,3]){
        const player=board.querySelector(rel===1?'.player.right':'.player.left');
        const avatar=player?.querySelector('.avatar');if(!avatar)continue;
        let size=sideSizes.get(player);
        const key=view.width+'x'+view.height;
        if(size?.key!==key){
            player.classList.remove('compact-avatar');
            size={key,width:avatar.offsetWidth||parseFloat(getComputedStyle(avatar).width)};
            sideSizes.set(player,size);
        }
        const walls=standingWallRects(board).filter(r=>r.rel===rel);
        if(!walls.length){player.classList.remove('compact-avatar');set(player,'--side-avatar-x',(rel===3?view.width*.01:view.width*.99-size.width)+'px');continue;}
        const top=parseFloat(getComputedStyle(avatar).top),height=avatar.offsetHeight;
        const nearby=walls.filter(r=>r.y<top+height+6&&r.y+r.h>top-6);
        const candidates=nearby.length?nearby:walls;
        const edge=rel===3?Math.min(...candidates.map(r=>r.x)):Math.max(...candidates.map(r=>r.x+r.w));
        const clearance=6.1; // Reserve subpixel CSS/SVG serialization rounding.
        const fits=rel===3?edge-clearance-size.width>=4:edge+clearance+size.width<=view.width-4;
        player.classList.toggle('compact-avatar',!fits);
        const width=fits?size.width:52;
        const x=rel===3?Math.min(view.width*.01,edge-clearance-width):Math.max(view.width*.99-width,edge+clearance);
        set(player,'--side-avatar-x',x+'px');
    }
}
const discardCues=new WeakMap(),spotAnimations=new Set();
// Offset every edge, then intersect adjacent lines. A bounding rectangle would
// leave triangular gaps beside perspective edges and include hidden thickness.
function offsetQuad(points,distance){
    const center={x:points.reduce((n,p)=>n+p.x,0)/4,y:points.reduce((n,p)=>n+p.y,0)/4};
    const lines=points.map((a,i)=>{
        const b=points[(i+1)%4],length=Math.hypot(b.x-a.x,b.y-a.y);
        let nx=(b.y-a.y)/length,ny=(a.x-b.x)/length;
        if((a.x-center.x)*nx+(a.y-center.y)*ny<0){nx=-nx;ny=-ny;}
        return {x:a.x+nx*distance,y:a.y+ny*distance,dx:b.x-a.x,dy:b.y-a.y};
    });
    return lines.map((a,i)=>{
        const b=lines[(i+3)%4],den=a.dx*b.dy-a.dy*b.dx;
        const t=((b.x-a.x)*b.dy-(b.y-a.y)*b.dx)/den;
        return{x:a.x+t*a.dx,y:a.y+t*a.dy};
    });
}
export function discardOutline(view,slot,{side,sideW,occluders=[],faceOnly=false,outset=2.75}={}){
    if(side===undefined||sideW===undefined){const body=tileSide(slot);side??=body.side;sideW??=body.sideW;}
    const z=slot.z??Math.round(slot.y)*8+Math.round((500-Math.abs(slot.x+slot.w/2-500))/70);
    // The compact marker follows the face, just like the original inset frame.
    // The body-outline mode remains available for geometry/debugging callers.
    let bottom=slot.y+slot.h-(faceOnly?(slot.tk||0):0);
    for(const other of occluders){
        const oz=other.z??Math.round(other.y)*8+Math.round((500-Math.abs(other.x+other.w/2-500))/70);
        if(oz>z&&other.x<slot.x+slot.w&&other.x+other.w>slot.x&&other.y<bottom&&other.y+other.h>slot.y)bottom=Math.min(bottom,other.y);
    }
    const x0=slot.x-(!faceOnly&&side==='left'?sideW:0),x1=slot.x+slot.w+(!faceOnly&&side==='right'?sideW:0);
    const points=[[x0,slot.y],[x1,slot.y],[x1,bottom],[x0,bottom]].map(([x,y])=>projectPoint(view,x,y));
    return offsetQuad(points,outset);
}
const reducedCues=typeof window!=='undefined'?window.matchMedia('(prefers-reduced-motion: reduce)'):null;
reducedCues?.addEventListener('change',event=>{if(event.matches)for(const animation of spotAnimations)animation.cancel();});
export function updateDiscardMarker(board,view){
    let cue=discardCues.get(board);
    if(!cue||!cue.spot.isConnected&&board.isConnected||cue.spot.parentElement!==board||cue.pin.parentElement!==board){
        board.querySelector('.discard-marker')?.remove();
        let spot=board.querySelector('svg.discard-spot');
        if(!spot){
            board.querySelector('.discard-spot')?.remove();
            spot=document.createElementNS('http://www.w3.org/2000/svg','svg');
            spot.setAttribute('class','discard-spot');
            spot.innerHTML='<g><path class="glow"/><path class="rim"/><path class="gold"/></g>';
        }
        spot.setAttribute('aria-hidden','true');spot.setAttribute('focusable','false');
        let pin=board.querySelector('svg.discard-pin');
        if(!pin){
            pin=document.createElementNS('http://www.w3.org/2000/svg','svg');
            pin.setAttribute('class','discard-pin');pin.setAttribute('viewBox','0 0 10 8');
            pin.setAttribute('aria-hidden','true');pin.setAttribute('focusable','false');
            pin.innerHTML='<path d="M.5 .5H9.5L5 7.5Z"/>';
        }
        if(spot.parentElement!==board)board.append(spot);
        if(pin.parentElement!==board)board.append(pin);
        cue={spot,pin,key:null,visible:false,settle:null};discardCues.set(board,cue);
    }
    const current=board.querySelector('.tile--current-discard'),{spot,pin}=cue;
    const hidden=!current||current.style.visibility==='hidden';
    for(const element of[spot,pin]){
        if(element.hasAttribute('hidden')!==hidden)element.toggleAttribute('hidden',hidden);
        element.hidden=hidden;
    }
    if(hidden){cue.visible=false;cue.settle?.cancel();return;}
    const read=element=>({x:parseFloat(element.style.left),y:parseFloat(element.style.top),w:parseFloat(element.style.width),h:parseFloat(element.style.height),
        tw:parseFloat(element.style.getPropertyValue('--tw')),tk:parseFloat(element.style.getPropertyValue('--tk')),pose:'flat',z:Number(element.style.zIndex)});
    const rect=read(current),body=tileSide(rect),occluders=[...current.parentElement.children].filter(e=>e!==current).map(read);
    const outline=discardOutline(view,rect,{...body,occluders,faceOnly:true,outset:0});
    const box=`0 0 ${view.width} ${view.height}`;
    if(spot.getAttribute('viewBox')!==box)spot.setAttribute('viewBox',box);
    const d='M'+outline.map(p=>p.x.toFixed(3)+' '+p.y.toFixed(3)).join('L')+'Z';
    for(const path of spot.querySelectorAll('path'))if(path.getAttribute('d')!==d)path.setAttribute('d',d);
    // Original placement: centre of the face top, tip 3px above it. Only the
    // triangle grows slightly (8×7 -> 10×8), independently of tile/screen size.
    set(pin,'left',((outline[0].x+outline[1].x)/2)+'px');set(pin,'top',((outline[0].y+outline[1].y)/2-3)+'px');
    const key=current.closest('.seat-plane')?.dataset.rel+'|'+[...current.parentElement.children].indexOf(current)+'|'+(current.dataset.tile||current.dataset.flightValue);
    if((!cue.visible||cue.key!==key)&&!reducedCues?.matches){
        cue.settle?.cancel();
        // Only the new discard settles. Repeated snapshots/resize never restart it.
        // Keep the reference's compact size throughout landing. SVG group
        // scaling also relayouts its stroke geometry on every animation frame.
        const animation=spot.querySelector('g').animate([{opacity:.65},{opacity:1}],{duration:500,easing:'ease-out'});
        cue.settle=animation;spotAnimations.add(animation);
        animation.finished.catch(()=>{}).finally(()=>spotAnimations.delete(animation));
    }
    cue.key=key;cue.visible=true;
}
