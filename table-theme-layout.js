import {seatRegion,mountTableWorld,WORLD} from './table-world-layout.js?v=1.9.20';
import {createTileElement} from './tile.js?v=1.9.20';
import {applyTableView,updateDiscardMarker,projectRect,viewForSize} from './table-view.js?v=1.9.20';
import {standingWallRects} from './standing-wall.js?v=1.9.20';
// Measure the actual transformed children, never the full-table .player wrappers.
export const UNDERLAY_SELECTOR = '.hand,.seat-plane .hand-back .tile,.seat-plane .discards .tile,.seat-plane .melds .tile';
export const INFORMATION_SELECTOR = [
    '.avatar', '.center-info', '.wind',
    '.game-tools', '#actions-panel', '#ting-status', '.ting-tooltip',
    '#kong-picker', '#quick-chat-btn', '#quick-chat-panel', '.chat-bubble',
    '#reveal-center', '#hand-hint', '#msg-area',
].join(',');
export const PROTECTED_SELECTOR = `${INFORMATION_SELECTOR},${UNDERLAY_SELECTOR}`;

export function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function overlapFraction(a,b) {
    const w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
    const h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    return w*h/(a.w*a.h||1);
}
const temporaryInfo = zone => /actions-panel|ting-tooltip|kong-picker|quick-chat-panel|reveal-center|chat-bubble|msg-area/.test(zone.label||'');

export function collectZones(board, padding, {hiddenTemplate = false, informationOnly = false} = {}) {
    const base = board.getBoundingClientRect();
    const scale = base.width / board.clientWidth || 1;
    const zones = [];
    for (const element of board.querySelectorAll(informationOnly?INFORMATION_SELECTOR:PROTECTED_SELECTOR)) {
        const style = getComputedStyle(element);
        if (style.display === 'none' || (!hiddenTemplate && style.visibility === 'hidden')) continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1) continue;
        // Conservative foreground reserve for the 18% hand lift and contact
        // shadow. FLIP itself runs in an independent screen-space overlay.
        const raised = element.classList.contains('hand') ? 32 : 0;
        const player = element.closest('.player');
        const region = element.closest('.discards,.melds,.hand-back');
        const rel = element.closest('.seat-plane')?.dataset.rel;
        const underlay=element.matches(UNDERLAY_SELECTOR);
        // Cards are opaque occluders, not controls: reserve their real body
        // and 3px contact-shadow margin. The 10/20px information margin must
        // not erase the empty printed space between two card lanes. The
        // interactive upright hand keeps the full margin and lift allowance.
        const margin=underlay&&region?3:padding;
        zones.push({
            kind: underlay ? 'underlay' : 'information',
            riverIndex: region?.classList.contains('discards') ? [...region.children].indexOf(element) : null,
            label: `${player ? [...player.classList].find(c => c !== 'player') + ' / ' : ''}${region ? 'seat '+rel+' / '+region.className : element.id || element.className}`,
            x: (rect.left - base.left) / scale - margin,
            y: (rect.top - base.top) / scale - margin - raised,
            w: rect.width / scale + 2 * margin,
            h: rect.height / scale + 2 * margin + raised,
        });
    }
    if(!informationOnly)for(const r of standingWallRects(board))zones.push({
        ...r,kind:'underlay',riverIndex:null,label:`${r.rel} / hand-back`,
        x:r.x-3,y:r.y-3,w:r.w+6,h:r.h+6,
    });
    return zones;
}

let layoutCSS;
export function sharedLayoutCSS() {
    if (!layoutCSS) layoutCSS = [...document.styleSheets].filter(sheet => /\/(style|tiles|table-theme|table-view|table-cues)\.css/.test(sheet.href || ''))
        .map(sheet => [...sheet.cssRules].map(rule => rule.cssText).join('\n')).join('\n');
    return layoutCSS;
}

export function makeTableFrame(board, width, height, {capacity=false} = {}) {
    const host = document.createElement('div');
    const shadow = host.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = sharedLayoutCSS();
    const screen = document.createElement('section');
    screen.id = 'game-screen';
    screen.style.cssText = `position:relative;inset:auto;width:${width}px;height:${height}px;min-height:0;padding:0;`;
    const table = board.cloneNode(true);
    if(capacity)table.dataset.cueCapacity='1';
    mountTableWorld(table);
    applyTableView(table,width,height);
    table.querySelectorAll('.table-decoration,.table-safety-overlay').forEach(e => e.remove());
    screen.append(table);
    shadow.append(style, screen);
    host.inert = true;
    host.setAttribute('aria-hidden', 'true');
    return {host, screen, table};
}

const tile = () => createTileElement(25,{pose:'flat'});

export function reserveZones(board, width, height, padding) {
    const frame = makeTableFrame(board, width, height,{capacity:true});
    frame.host.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;';
    frame.table.querySelectorAll('.chat-bubble').forEach(e => e.remove());
    for (const player of frame.table.querySelectorAll('.player')) {
        // A resumed/native page can expose the board one frame before player metadata arrives.
        // Reserve complete avatars even when their live DOM is still empty.
        player.querySelector('.avatar').innerHTML = '<div class="avatar-art"><span class="banker-badge">庄</span></div>'
            + '<div class="player-info"><div class="player-name">甲乙丙丁戊己庚辛</div>'
            + '<div class="player-rank">试刀者 Ⅲ · 1 星</div><div class="player-score">+888</div></div>';
        // 30 per seat and four quads are a synthetic capacity template, not a legal
        // simultaneous 112-tile state. The layout uses the production slot solver.
        seatRegion(player,'discards').replaceChildren(...Array.from({length: 30}, tile));
        seatRegion(player,'melds').replaceChildren(...Array.from({length: 4}, () => {
            const group = document.createElement('div'); group.className = 'meld-group';
            group.append(...Array.from({length: 4}, tile)); return group;
        }));
        const back = seatRegion(player,'hand-back');
        back?.removeAttribute('data-revealed');
        if (back) back.replaceChildren(...Array.from({length: 14}, () => {
            return createTileElement(null,{pose:'back-stand'});
        }));
    }
    const hand = frame.table.querySelector('.hand');
    // The foreground hand stands upright. A flat surrogate underestimates
    // its top edge and could put corner artwork underneath a lifted tile.
    hand.replaceChildren(...Array.from({length: 14}, () => createTileElement(25))); hand.lastChild.classList.add('tile--drawn');
    const actions = frame.table.querySelector('#actions-panel');
    actions.classList.remove('hidden'); [...actions.children].forEach(e => {
        e.classList.remove('hidden'); e.style.display = 'flex';
    });
    const ting = frame.table.querySelector('#ting-status'); ting.classList.remove('hidden'); ting.classList.add('open');
    ting.querySelector('.ting-tooltip').replaceChildren(...Array.from({length: 28}, tile));
    const chat = frame.table.querySelector('#quick-chat-panel'); chat.classList.remove('hidden');
    if (!chat.children.length) for (let i = 0; i < 6; i++) {
        const item = document.createElement('button'); item.className = 'quick-chat-item'; item.textContent = '这桌好牌，大家慢慢打'; chat.append(item);
    }
    const reveal = frame.table.querySelector('#reveal-center'); reveal.classList.remove('hidden');
    reveal.innerHTML = '<div class="reveal-center-title">自摸 · 抓马</div><div class="reveal-draw-tiles"></div>';
    reveal.lastChild.append(...Array.from({length: 6}, tile));
    let kong = frame.table.querySelector('#kong-picker');
    if (!kong) { kong = document.createElement('div'); kong.id = 'kong-picker'; frame.table.querySelector('.bottom').append(kong); }
    kong.replaceChildren(...Array.from({length: 4}, tile));
    const message = frame.table.querySelector('#msg-area'); message.textContent = '牌桌提示：请等待牌友操作，轮到你时选择手牌出牌';
    document.body.append(frame.host);
    applyTableView(frame.table,width,height);
    try {
        // The capsule may temporarily move the listening button. Reserve its
        // ordinary footprint, so an action cannot change a cloth print slot.
        ting.style.removeProperty('left');ting.style.removeProperty('right');
        const capacity=collectZones(frame.table,padding,{hiddenTemplate:true});
        // The hint follows the upright hand when 0–4 melds shorten that hand.
        // Its 0-meld width is much wider than in the four-meld template.
        // Reserve every valid foreground baseline, not whichever state was
        // on screen when the user happened to change the theme.
        const lanes=[...frame.table.querySelectorAll('.player')].map(player=>{
            const melds=seatRegion(player,'melds');
            return {rel:Number(player.id.split('-').at(-1)),melds,groups:[...melds.children],backs:seatRegion(player,'hand-back')};
        });
        const foreground=[];
        const hint=frame.table.querySelector('#hand-hint');
        hint.textContent='轮到你出牌 · 点击手牌，或按回车出牌';
        hint.classList.remove('hidden');hint.style.visibility='visible';
        for(let n=0;n<=4;n++){
            for(const lane of lanes){
                lane.melds.replaceChildren(...lane.groups.slice(0,n));
                if(lane.rel&&lane.backs)lane.backs.replaceChildren(...Array.from({length:14-3*n},()=>createTileElement(null,{pose:'back-stand'})));
            }
            hand.replaceChildren(...Array.from({length:14-3*n},()=>createTileElement(25)));
            hand.lastChild.classList.add('tile--drawn');
            applyTableView(frame.table,width,height);
            // Four quads plus fourteen concealed tiles is only a stress input:
            // the lane solver shrinks it. Also reserve each valid 0–4-meld lane
            // with 14/11/8/5/2 concealed tiles, which can have larger tile bodies.
            foreground.push(...collectZones(frame.table,padding,{hiddenTemplate:true})
                .filter(z=>z.label==='hand-hint'||z.kind==='underlay'&&z.riverIndex===null));
        }
        // A live avatar or hand hint can have a different footprint than the
        // capacity template (whose four melds change the foreground baseline).
        // Reserve both permanent information footprints, so a solved print
        // does not immediately hide when the real hand is rendered.
        const shiftedTing=Boolean(board.querySelector('#ting-status')?.style.left);
        const liveInfo=collectZones(board,padding,{informationOnly:true}).filter(z=>!temporaryInfo(z)
            &&!(shiftedTing&&z.label==='ting-status'));
        return [...capacity,...foreground,...liveInfo];
    }
    finally { frame.host.remove(); }
}

export function findSlot(zones, width, height, layout, padding, view=viewForSize(width,height)) {
    if (!layout) return null;
    const landscape = height <= 560;
    const max = landscape ? layout.landscapeHeight : layout.desktopHeight;
    const target = {x:105,y:105};
    // Compensate the local anisotropy of a square-world camera before printing.
    // The artwork still receives the ONE cloth matrix; its recognisable body
    // isn't flattened to half height on wide, short screens.
    const mid=440,den=1+view.g*mid;
    const sx=view.a/den,sy=(view.d-view.e*view.g)/(den*den);
    const aspect=layout.aspect*Math.max(.45,Math.min(1.45,sy/sx));
    const f=layout.face||{x:0,y:0,w:1,h:1};
    const permanent=zones.filter(z=>z.kind!=='underlay'&&!temporaryInfo(z));
    const faceCards=zones.filter(z=>z.kind==='underlay'&&(/hand-back|melds/.test(z.label||'')
        ||(z.riverIndex!==null&&z.riverIndex<24)));
    for(const preferClearFace of [true,false])for(let h=max;h>=220;h-=16){
        const w=h*aspect,candidates=[];
        for(let x=32;x+w<=WORLD-32;x+=20)for(let y=40;y+h<=WORLD-28;y+=20)
            candidates.push({x,y,score:Math.abs(x-target.x)+Math.abs(y-target.y)*1.2});
        candidates.sort((a,b)=>a.score-b.score);
        for(const{x,y}of candidates){
            if(preferClearFace&&x>200)continue;
            const face={x:x+f.x*w,y:y+f.y*h,w:f.w*w,h:f.h*h},projectedFace=projectRect(view,face);
            if(projectedFace.x<padding||projectedFace.y<padding||projectedFace.x+projectedFace.w>width-padding||projectedFace.y+projectedFace.h>height-padding)continue;
            if(!permanent.some(z=>overlaps(projectedFace,z))&&(!preferClearFace||!faceCards.some(z=>overlaps(projectedFace,z))))
                return {x,y,w,h,face,projectedFace};
        }
    }
    return null;
}

// Secondary prints stay in a stable corner pocket. Solve only at theme,
// camera or size changes against the projected maximum-capacity template.
export function findAccentSlot(zones,width,height,accent,padding,view=viewForSize(width,height)) {
    const layout=accent.layout,left=layout.anchor.endsWith('left'),top=layout.anchor.startsWith('top');
    const mid=top?230:820,den=1+view.g*mid;
    const sx=view.a/den,sy=(view.d-view.e*view.g)/(den*den);
    const aspect=accent.art.width/accent.art.height*Math.max(.45,Math.min(1.6,sy/sx));
    const targetWidth=layout.widths[view.profile]||layout.widths.desktop;
    const permanent=zones.filter(z=>!temporaryInfo(z));
    const information=permanent.filter(z=>z.kind!=='underlay');
    // Capacity is still 30 tiles per river. A theme can reserve its important
    // detail through 24–30 tiles, while allowing the last exceptional row to
    // overlap the print. Never discard a whole character because its body is
    // under cards; the full information footprint remains protected.
    const detailLimit=layout.faceRiverLimit??30;
    const cards=permanent.filter(z=>z.kind==='underlay'
        &&(!Number.isInteger(z.riverIndex)||z.riverIndex<detailLimit));
    const offsets=[];
    for(let dx=0;dx<=112;dx+=16)for(let dy=0;dy<=120;dy+=24)offsets.push({dx,dy});
    offsets.sort((a,b)=>(a.dx*2+a.dy)-(b.dx*2+b.dy));
    for(const clearBody of [true,false])for(const scale of [1,.85,.7])for(const {dx,dy} of offsets){
        const w=targetWidth*scale,h=w/aspect,x=left?layout.left+dx:WORLD-layout.right-dx-w;
        const y=top?layout.top+dy:WORLD-layout.bottom-dy-h;
        if((left?x+w>WORLD*.36:x<WORLD*.64)||(top?y+h>WORLD*.50:y<WORLD*.60))continue;
        const projected=projectRect(view,{x,y,w,h});
        const f=layout.face,face={x:x+f.x*w,y:y+f.y*h,w:f.w*w,h:f.h*h};
        const projectedFace=projectRect(view,face);
        if(projected.x<padding||projected.y<padding||projected.x+projected.w>width-padding
            ||projected.y+projected.h>height-padding||information.some(z=>overlaps(projected,z))
            ||(layout.underlay!=='allow'&&cards.some(z=>overlaps(clearBody?projected:projectedFace,z))))continue;
        // Body underlays are intentional. Character details stay clear up to
        // their declared late-river limit; non-character ornaments may allow
        // all card underlays. Neither option relaxes information protection.
        return {x,y,w,h,face,projected,projectedFace};
    }
    return null;
}

// A supplied complete square painting keeps its composition. It shares the
// cloth world matrix; only independent accents use the protected slot solver.
// Region bounds are inspection metadata, never a reason to move or erase it.
export function fullClothSlot(layout,view) {
    const rect={x:0,y:0,w:WORLD,h:WORLD};
    const toWorld=f=>({x:f.x*WORLD,y:f.y*WORLD,w:f.w*WORLD,h:f.h*WORLD});
    const face=toWorld(layout.face);
    return {...rect,face,projectedFace:projectRect(view,face),regions:(layout.regions||[]).map(r=>({id:r.id,world:toWorld(r),projected:projectRect(view,toWorld(r))}))};
}

// Authored ensembles anchor an important region instead of forcing a tall
// silhouette into a small corner. Only viewport/camera changes affect these
// placements. Local aspect compensation precedes the ONE world projection.
export function anchoredPrintSlot(layout,art,view) {
    const p=layout?.placements?.[view.profile]||layout?.placements?.desktop;
    if(!p||!art||!view||!layout.face)return null;
    const mid=p.cy*WORLD,den=1+view.g*mid;
    const sx=view.a/den,sy=(view.d-view.e*view.g)/(den*den);
    const w=p.width*WORLD,h=w/(art.width/art.height*Math.max(.45,Math.min(1.6,sy/sx)));
    const f=layout.face,x=p.cx*WORLD-(f.x+f.w/2)*w,y=p.cy*WORLD-(f.y+f.h/2)*h;
    const region=r=>({x:x+r.x*w,y:y+r.y*h,w:r.w*w,h:r.h*h});
    const face=region(f);
    return {x,y,w,h,face,projected:projectRect(view,{x,y,w,h}),projectedFace:projectRect(view,face),
        regions:(layout.regions||[]).map(r=>({id:r.id,world:region(r),projected:projectRect(view,region(r))}))};
}

export class TableDecoration {
    constructor(board) {
        this.board = board; this.theme = null; this.slot = null; this.reserved = []; this.visibleZones = [];
        this.layer = document.createElement('div'); this.layer.className = 'table-decoration';
        this.layer.setAttribute('aria-hidden', 'true'); this.layer.hidden = true;
        this.image = document.createElement('img'); this.image.alt = ''; this.image.draggable = false;
        this.layer.append(this.image); board.querySelector('.table-surface').append(this.layer);
        this.accents = [];
        this.artworkEnabled = true;
        this.resize = new ResizeObserver(() => this.schedule(true)); this.resize.observe(board);
        this.mutations = new MutationObserver(records => {
            const internal = node => node.nodeType === 1 && node.matches('.table-decoration,.table-safety-overlay,.discard-spot,.discard-pin');
            if (records.some(record => !record.target.closest?.('.table-decoration,.table-safety-overlay,.discard-spot,.discard-pin')
                && !(record.type==='attributes'&&record.attributeName==='style'
                    && record.target.matches('.table-world,.river-shadow,.center-plate,.seat-plane .tile'))
                && !(record.type === 'childList' && [...record.addedNodes,...record.removedNodes].every(internal)))) this.schedule(false);
        });
        this.mutations.observe(board, {subtree:true, childList:true, attributes:true, characterData:true,
            attributeFilter:['class','style','hidden','aria-expanded']});
        if (board.getRootNode() === document) {
            this.covers = ['results-modal','rank-screen','version-modal'].map(id => document.getElementById(id)).filter(Boolean);
            this.coverObserver = new MutationObserver(() => this.schedule(false));
            for (const cover of this.covers) this.coverObserver.observe(cover,{attributes:true,attributeFilter:['class']});
        }
        this.onViewport = () => this.schedule(true);
        window.visualViewport?.addEventListener('resize', this.onViewport);
    }
    setTheme(theme) {
        this.theme = theme; this.layer.hidden = true;
        this.layer.classList.toggle('table-decoration--full-cloth',theme.layout?.mode==='full-cloth');
        this.board.classList.toggle('table-anchored-ensemble',theme.layout?.mode==='anchored-ensemble');
        if (theme.art) this.image.src = theme.art.src;
        else this.image.removeAttribute('src');
        for(const accent of this.accents)accent.layer.remove();
        this.accents=(theme.accents||[]).map(config=>{
            const layer=document.createElement('div');layer.className='table-decoration table-decoration--accent';
            layer.dataset.accent=config.id;layer.setAttribute('aria-hidden','true');layer.hidden=true;
            const image=document.createElement('img');image.alt='';image.draggable=false;image.decoding='async';image.src=config.art.src;
            layer.append(image);this.board.querySelector('.table-surface').append(layer);
            return {config,layer,slot:null};
        });
        this.schedule(true);
    }
    schedule(resize) {
        this.dirtySize ||= resize;
        if(resize || !this.slot) this.layer.hidden = true;
        if(resize)for(const accent of this.accents)accent.layer.hidden=true;
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {this.frame = 0; this.measure();});
    }
    positionPrint(layer,slot) {
        // Slots are in world coordinates. Absolute children start inside the
        // surface's 1-world-unit border; remove that offset before projection.
        const surface=layer.parentElement;
        Object.assign(layer.style,{left:`${slot.x-surface.clientLeft}px`,top:`${slot.y-surface.clientTop}px`,
            width:`${slot.w}px`,height:`${slot.h}px`});
    }
    measure() {
        const width = this.board.clientWidth, height = this.board.clientHeight;
        if (!width || !height) return;
        // Game/deal renderers already position changed cards. Avoid a second
        // full layout pass for each discard and its FLIP placeholder. Camera,
        // theme and viewport changes still perform the complete layout here.
        if(!this.view||this.dirtySize||width!==this.width||height!==this.height||this.viewMode==='near')
            this.view = applyTableView(this.board,width,height,this.viewMode);
        else updateDiscardMarker(this.board,this.view);
        this.padding = width > 900 && height > 560 ? 20 : 10;
        if (this.dirtySize || width !== this.width || height !== this.height) {
            this.width = width; this.height = height; this.dirtySize = false;
            if (this.board.style.getPropertyValue('--table-play-height') !== `${height}px`) {
                this.board.style.setProperty('--table-play-height', `${height}px`);
            }
            this.reserved = reserveZones(this.board, width, height, this.padding);
            const mode=this.theme?.layout?.mode;
            this.slot = mode==='full-cloth'?fullClothSlot(this.theme.layout,this.view)
                :mode==='anchored-ensemble'?anchoredPrintSlot(this.theme.layout,this.theme.art,this.view)
                :findSlot(this.reserved, width, height, this.theme?.layout, this.padding,this.view);
            for(const accent of this.accents)accent.slot=mode==='anchored-ensemble'
                ?anchoredPrintSlot(accent.config.layout,accent.config.art,this.view)
                :findAccentSlot(this.reserved,width,height,accent.config,this.padding,this.view);
        }
        // Measure for inspection and debug only; transient UI has no authority
        // over the visibility of the underlying cloth.
        this.visibleZones = collectZones(this.board, this.padding,{informationOnly:!this.debug});
        if (this.slot) this.positionPrint(this.layer,this.slot);
        // A print is part of the cloth. Transient panels cover it in screen
        // space; they must never erase or move the already reserved artwork.
        this.layer.hidden = !this.slot || !this.theme?.art || !this.artworkEnabled;
        for(const accent of this.accents){
            const {slot,layer}=accent;
            if(slot)this.positionPrint(layer,slot);
            layer.hidden=!slot||!this.artworkEnabled;
        }
        if (this.debug) this.drawDebug();
    }
    setDebug(enabled) {
        this.debug = Boolean(enabled);
        this.board.querySelector('.table-safety-overlay')?.remove();
        if (this.debug) this.schedule(true);
    }
    setView(mode) {
        this.viewMode=mode==='near'?'near':'tilted';this.schedule(true);
    }
    setArtworkVisible(enabled) {this.artworkEnabled=Boolean(enabled);this.schedule(false);}
    drawDebug() {
        this.board.querySelector('.table-safety-overlay')?.remove();
        const overlay = document.createElement('div'); overlay.className = 'table-safety-overlay'; overlay.setAttribute('aria-hidden','true');
        const artZones=[...(this.slot?[projectRect(this.view,this.slot)]:[]),...this.accents.flatMap(a=>a.slot?[a.slot.projected]:[])];
        const faceZones=[...(this.slot?.regions?.map(r=>({...r.projected,label:r.id}))||
            (this.slot?[this.slot.projectedFace]:[])),...this.accents.flatMap(a=>a.slot?[a.slot.projectedFace]:[])];
        for (const [kind,zones] of [['reserved',this.reserved],['visible',this.visibleZones],['art',artZones],['face',faceZones]]) {
            for (const rect of zones) {
                const e = document.createElement('div'); e.className = `safety-zone safety-zone--${kind} safety-zone--${rect.kind||kind}`;
                Object.assign(e.style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.w}px`,height:`${rect.h}px`});
                e.textContent = kind === 'face' ? '主视觉留白 / 五官' : kind==='art'?'印花边界 / 允许牌下延伸':rect.label;
                overlay.append(e);
            }
        }
        this.board.append(overlay);
    }
    inspect() {return {theme:this.theme?.id,width:this.width,height:this.height,padding:this.padding,slot:this.slot,view:this.view,
        visible:!this.layer.hidden,accents:this.accents.map(a=>({id:a.config.id,visible:!a.layer.hidden,slot:a.slot})),
        reserved:this.reserved,actual:collectZones(this.board,this.padding)};}
    destroy() {
        this.resize.disconnect(); this.mutations.disconnect(); this.coverObserver?.disconnect(); cancelAnimationFrame(this.frame);
        window.visualViewport?.removeEventListener('resize', this.onViewport); this.layer.remove();
        for(const accent of this.accents)accent.layer.remove();
    }
}
