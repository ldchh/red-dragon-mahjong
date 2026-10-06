/** All table-space geometry lives here. No theme, DOM measurements or game rules. */
export const WORLD = 1000;
export const WORLD_LAYOUT = Object.freeze({
    plate:200, riverGap:34, nearGap:20, rw:40, riverCols:6, riverGapX:.8, riverGapY:1.2,
    flatThickness:.45, overlapReveal:.28, handBackInset:24, meldInset:24, rim:24, farLaneCenter:400, farLaneWidth:560,
});
export const ROTATIONS = Object.freeze([0,270,180,90]);
export function layoutForView(view) {
    // The short landscape profile trades 2 world units for the raised hand's
    // 8px clearance. It still exceeds the 15px far-river readability floor.
    // The taller v3 body broadens its projected bounding box slightly. A 0.3
    // world-unit landscape adjustment keeps the v1.6 <=.70 river/hand ratio.
    const rw=view.profile==='landscape'?Math.max(30,Math.min(37.7,37.7*(view.height/view.width)/(390/844))):40;
    // Compact windows have less space between the two toolbar groups. Both
    // concealed and exposed hands use this same shorter, slightly left lane.
    const compact=view.profile==='compact';
    return {...WORLD_LAYOUT,rw,farLaneWidth:compact?520:560,
        farLaneCenter:compact?360:view.profile==='desktop'&&view.width<800?370:400};
}
export function tileSize(width,rot=0,pose='flat',L=WORLD_LAYOUT) {
    const stand=pose.endsWith('stand'),tk=width*(stand?.14:L.flatThickness),th=width*1.36;
    return {w:rot%180?th:width,h:(rot%180?width:th)+tk,tk,th};
}
export function riverSlot(rel,index,L=WORLD_LAYOUT) {
    if(!Number.isInteger(rel)||rel<0||rel>3||!Number.isInteger(index)||index<0)throw new RangeError('Invalid river slot');
    const c=WORLD/2,h=L.plate/2,w=L.rw,th=w*1.36,tk=w*L.flatThickness;
    // Six face-width columns in the first three rows; the fourth extends to ten.
    // A side tile's body never rotates: its along-row pitch must include tk.
    // At 29/30, continue the third row's outer end. A fifth row would invade
    // the far standing wall. This bounded windmill keeps all 120 tiles inside
    // the rim even for the deliberately impossible four-river stress fixture.
    let row=index<18?Math.floor(index/6):3+Math.floor((index-18)/10);
    let col=index<18?index%6:(index-18)%10;
    if(index===28||index===29){row=2;col=6+index-28;}
    const reveal=tk*L.overlapReveal;
    const depth=(rel%2?th:th+reveal)+L.riverGapY;
    const step=w+(rel%2?reveal:0)+L.riverGapX;
    const size={w:rel%2?th:w,h:(rel%2?w:th)+tk};
    let x,y;
    if(rel===0){x=c-h+col*step;y=c+h+L.nearGap+row*depth;}
    if(rel===1){x=c+h+L.riverGap+row*depth;y=c+h-size.h-col*step;}
    if(rel===2){x=c+h-size.w-col*step;y=c-h-L.riverGap-size.h-row*depth;}
    if(rel===3){x=c-h-L.riverGap-size.w-row*depth;y=c-h+col*step;}
    // At rw=40: tk=18, reveal=5.04; four rows occupy
    // 3*(54.4+5.04+1.2)+54.4+18=254.32 (v1.6:271.6), saving 17.28.
    // Full rectangles overlap only in the downward thickness band; all faces
    // remain visible. The .28 reveal EXCLUDES the explicit 1.2 row seam.
    return {x,y,...size,rot:ROTATIONS[rel],tw:w,tk,row,col,rel,pose:'flat'};
}

export function opponentSlots(rel,handCount,meldCounts=[],view,L=layoutForView(view),revealed=false) {
    if(rel===0)return {hand:[],melds:[]};
    const side=rel%2===1,groupGap=20,tileGap=1.5,available=side?620:L.farLaneWidth;
    const allCount=handCount+meldCounts.reduce((a,b)=>a+b,0);
    // Unreachable 14 backs + four quads also fits the strip. In legal states a
    // meld replaces three concealed tiles, so most scenes keep the full width.
    const alongFactor=side?1+L.flatThickness:1;
    const unit=Math.min(L.rw,(available-(allCount-1)*tileGap-meldCounts.length*groupGap)/(Math.max(allCount,1)*alongFactor));
    const handAlong=unit*(side?(revealed?alongFactor:1):1);
    const meldAlong=unit*(side?alongFactor:1);
    const handLength=handCount?handCount*handAlong+(handCount-1)*tileGap:0;
    const meldLength=meldCounts.reduce((a,n)=>a+n*meldAlong+(n-1)*tileGap,0)+Math.max(0,meldCounts.length-1)*groupGap;
    const total=handLength+meldLength+(handCount&&meldCounts.length?groupGap:0);
    // Leave the upper-right screen-space toolbar clear when all fourteen far
    // tiles are exposed. Move the complete lane, including its melds, together.
    let cursor=(WORLD-total)/2+(rel===2?WORLD/2-L.farLaneCenter:0);
    const place=(along,cross,pose,tw,wall=false)=>{
        let x,y;
        if(rel===2){x=WORLD-cursor-along;y=L.handBackInset;}
        if(rel===1){x=WORLD-L.handBackInset-cross;y=WORLD-cursor-along;}
        if(rel===3){x=L.handBackInset;y=cursor;}
        cursor+=along+tileGap;
        return {x,y,w:side?cross:along,h:side?along:cross,tw,tk:tw*(pose.endsWith('stand')?.14:L.flatThickness),rot:ROTATIONS[rel],pose,wall};
    };
    const hand=[];
    const scaleY=(view.d-view.e*view.g)/(1+view.g*L.handBackInset)**2;
    // Cap at 64 world units to leave a guaranteed gap above the fourth river.
    // Height compensation is bounded by the physical lane, never by a theme.
    let standingCap=64;
    if(view.profile==='compact'||view.profile==='desktop'&&view.width<800){
        const riverY=riverSlot(2,18,L).y;
        const screenBottom=(view.d*riverY+view.e)/(1+view.g*riverY)-4.5;
        // Inverse projected y: reserve the gap in SCREEN pixels even when the
        // compact/narrow toolbar forces the wall above the far river packet.
        standingCap=Math.max(12,Math.min(64,(screenBottom-view.e)/(view.d-screenBottom*view.g)-L.handBackInset));
    }
    const standingH=Math.min(standingCap,Math.max(unit*1.50,28/scaleY));
    for(let i=0;i<handCount;i++){
        const cross=side?(revealed?unit*1.36:unit*.32):(revealed?unit*(1.36+L.flatThickness):standingH);
        hand.push(place(handAlong,cross,revealed?'flat':'back-stand',unit,side&&!revealed));
    }
    if(handCount&&meldCounts.length)cursor+=groupGap-tileGap;
    const melds=meldCounts.map(n=>{
        const slots=[];
        for(let i=0;i<n;i++)slots.push(place(meldAlong,unit*(side?1.36:1.36+L.flatThickness),'flat',unit));
        cursor+=groupGap-tileGap;
        return slots;
    });
    return {hand,melds};
}

export function foregroundHandSize(view,count,drawn=false) {
    const tw=Math.max(31,Math.min(88,view.width*.055,view.height*.108));
    const height=Math.max(view.height*.135,Math.min(tw*1.5,view.height*.152));
    return {tw,height,width:count?count*tw+(count-1)*2+(drawn?tw*.38:0):0};
}

export function ownMeldSlots(meldCounts,view,L=layoutForView(view),handCount=14,drawn=false) {
    const hand=foregroundHandSize(view,handCount,drawn),gap=20,tileGap=1.5;
    if(!meldCounts.length)return {melds:[],handCenterX:view.width/2,hintMaxWidth:view.width-32};
    // Keep the full-size flat strip below all thirty river slots. Its right
    // edge belongs to the cloth; only the upright hand moves sideways. With
    // four melds, the hint yields horizontally instead of shrinking the tiles.
    // These coordinates are independent of the theme and use no DOM bounds.
    const bottom=WORLD-L.rim;
    const tw=L.rw;
    const count=meldCounts.reduce((a,b)=>a+b,0);
    const length=count*tw+(count-meldCounts.length)*tileGap+(meldCounts.length-1)*gap;
    const y=bottom-tw*(1.36+L.flatThickness);
    let x=bottom-length;
    const firstX=x,firstY=x<500?bottom:y;
    const screenLeft=(view.a*firstX+view.b*firstY+view.c)/(1+view.g*firstY);
    const handCenterX=Math.max(hand.width/2+6,Math.min(view.width/2,screenLeft-12-hand.width/2));
    const melds=meldCounts.map(n=>{
        const slots=[];
        for(let i=0;i<n;i++){
            slots.push({x,y,...tileSize(tw,0,'flat',L),tw,rot:0,pose:'flat'});
            x+=tw+tileGap;
        }
        x+=gap-tileGap;
        return slots;
    });
    return {melds,handCenterX,hintMaxWidth:Math.max(24,2*(screenLeft-8-handCenterX))};
}

const setStyle=(el,key,value)=>{
    // CSSOM serializes 40.000px as 40px. Comparing unnormalized strings
    // repeatedly writes identical styles and wakes the decoration observer.
    if(/^-?[\d.]+px$/.test(value))value=Number(parseFloat(value).toFixed(3))+'px';
    if(el.style.getPropertyValue(key)!==value)el.style.setProperty(key,value);
};
export function seatPlane(player) {
    return player.seatPlane || player.closest('.table')?.querySelector('.seat-plane[data-rel="'+player.id.split('-').at(-1)+'"]');
}
export function seatRegion(player,kind) {
    return seatPlane(player)?.querySelector('.'+kind);
}
export function mountTableWorld(board) {
    let world=board.querySelector('.table-world');
    if(!world){world=document.createElement('div');world.className='table-world';board.prepend(world);}
    const surface=board.querySelector('.table-surface');
    if(surface.parentElement!==world)world.prepend(surface);
    for(const player of board.querySelectorAll('.player')){
        const rel=Number(player.id.split('-').at(-1));
        let plane=player.querySelector('.table-plane,.seat-plane') || world.querySelector('.seat-plane[data-rel="'+rel+'"]');
        if(!plane)continue;
        if(plane.className!=='seat-plane')plane.className='seat-plane';
        if(plane.dataset.rel!==String(rel))plane.dataset.rel=String(rel);
        player.seatPlane=plane;
        if(rel===0){
            const ownMeld=player.querySelector('#my-melds');
            if(ownMeld&&ownMeld.parentElement!==plane)plane.append(ownMeld);
            let front=player.querySelector('.hand-foreground');
            if(!front){front=document.createElement('div');front.className='hand-foreground';player.append(front);}
            const hand=player.querySelector('#my-hand');
            if(hand.parentElement!==front)front.append(hand);
        }
        if(plane.parentElement!==world)world.append(plane);
    }
    let plate=world.querySelector('.center-plate');
    if(!plate){plate=document.createElement('div');plate.className='center-plate';world.append(plate);}
    // Directions and status share one screen-space grid. Migrating an existing
    // world/preview must preserve these nodes, just like the concealed hand.
    const info=board.querySelector('.center-info');
    for(const wind of plate.querySelectorAll('.wind'))info.append(wind);
    return world;
}
// Preserve the existing side geometry and CSS serialization exactly. Cues and
// the actual body use the same side instead of independently approximating it.
export function tileSide(slot) {
    const cx=slot.x+slot.w/2;
    const tk=slot.tk??slot.tw*(slot.pose.endsWith('stand')?.14:WORLD_LAYOUT.flatThickness);
    const s=Math.max(-1,Math.min(1,(cx-500)/420));
    return {side:s<-.04?'right':s>.04?'left':'none',sideW:Number((Math.abs(s)*.32*tk).toFixed(2))};
}
export function placeTile(el,slot) {
    for(const [key,n]of Object.entries({left:slot.x,top:slot.y,width:slot.w,height:slot.h,'--tw':slot.tw}))setStyle(el,key,n.toFixed(3)+'px');
    const cx=slot.x+slot.w/2;
    setStyle(el,'z-index',String(Math.round(slot.y)*8+Math.round((500-Math.abs(cx-500))/70)));
    const tk=slot.tk??slot.tw*(slot.pose.endsWith('stand')?.14:WORLD_LAYOUT.flatThickness);
    setStyle(el,'--tk',tk.toFixed(3)+'px');
    setStyle(el,'--th',((slot.rot%180?slot.w:slot.h-tk)).toFixed(3)+'px');
    if(slot.pose.endsWith('flat')){
        const {side,sideW}=tileSide(slot);
        setStyle(el,'--side-w',sideW.toFixed(2)+'px');
        if(el.dataset.side!==side)el.dataset.side=side;
    }
    if(el.dataset.rot!==String(slot.rot))el.dataset.rot=String(slot.rot);
    if(el.classList.contains('tile-wall')!==!!slot.wall)el.classList.toggle('tile-wall',!!slot.wall);
}
export function applyWorldLayout(board,view) {
    mountTableWorld(board);
    const L=layoutForView(view);
    const plate=board.querySelector('.center-plate');
    setStyle(plate,'left',(500-L.plate/2)+'px');setStyle(plate,'top',(500-L.plate/2)+'px');
    setStyle(plate,'width',L.plate+'px');setStyle(plate,'height',L.plate+'px');
    const cloth=board.querySelector('.table-cloth');
    // Cloth is inset inside a 1px bordered surface. Subtract its world origin;
    // never use projected screen bounds for these four unprojected shadows.
    const originX=(parseFloat(board.style.getPropertyValue('--table-border-width'))||14)*1.7+1,originY=originX;
    for(const plane of board.querySelectorAll('.seat-plane')){
        const rel=Number(plane.dataset.rel);
        const river=[...plane.querySelector('.discards').children],riverSlots=river.map((_,i)=>riverSlot(rel,i,L));
        river.forEach((tile,i)=>placeTile(tile,riverSlots[i]));
        let shadow=cloth.querySelector('.river-shadow[data-rel="'+rel+'"]');
        if(!shadow){shadow=document.createElement('div');shadow.className='river-shadow';shadow.dataset.rel=rel;
            shadow.setAttribute('aria-hidden','true');cloth.append(shadow);}
        if(shadow.hidden!==!river.length)shadow.hidden=!river.length;
        if(river.length){
            const x=Math.min(...riverSlots.map(t=>t.x))-6,y=Math.min(...riverSlots.map(t=>t.y))-6;
            const right=Math.max(...riverSlots.map(t=>t.x+t.w))+6,bottom=Math.max(...riverSlots.map(t=>t.y+t.h))+6;
            for(const [k,v]of Object.entries({left:x-originX,top:y-originY,width:right-x,height:bottom-y}))setStyle(shadow,k,v.toFixed(3)+'px');
        }
        const backs=plane.querySelector('.hand-back'),groups=[...(plane.querySelector('.melds')?.children||[])];
        const revealed=Boolean(backs?.querySelector('.tile:not(.tile-back)'));
        const ownHand=rel===0?board.querySelector('#my-hand'):null;
        const slots=rel===0?ownMeldSlots(groups.map(g=>g.children.length),view,L,ownHand.children.length,
            !!ownHand.querySelector('.tile--drawn')):opponentSlots(rel,backs?.children.length||0,groups.map(g=>g.children.length),view,L,revealed);
        if(rel===0){
            setStyle(board,'--own-hand-x',slots.handCenterX.toFixed(3)+'px');
            setStyle(board,'--own-hint-w',slots.hintMaxWidth.toFixed(3)+'px');
        }
        if(backs)for(const[i,tile]of [...backs.children].entries())placeTile(tile,slots.hand[i]);
        for(const[g,group]of groups.entries())for(const[i,tile]of [...group.children].entries())placeTile(tile,slots.melds[g][i]);
        const dx=rel===1?18:rel===3?-18:0,dy=rel===2?-18:rel===0?18:0;
        setStyle(plane,'--deal-x',dx+'px');setStyle(plane,'--deal-y',dy+'px');
    }
    return L;
}
