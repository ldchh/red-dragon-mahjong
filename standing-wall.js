import {projectPoint,projectRect} from './table-view.js?v=1.9.20';
import {opponentSlots,layoutForView} from './table-world-layout.js?v=1.9.20';
import {backTextureMesh} from './tile-back-projector.js?v=1.9.20';
export const STANDING_WALL=Object.freeze({HEIGHT:2.18,DEPTH:.72,IVORY:.62,CAM_UP:.62});
const {HEIGHT,DEPTH,IVORY,CAM_UP}=STANDING_WALL;
// Preserve the original camera/feet. A short far edge limits the vertical lift,
// while desktop faces approach the 512:696 texture's natural proportions.
export function standingHeight(tw,view,y0){
  const den=1+view.g*y0,base=projectPoint(view,0,y0).y;
  return Math.min(tw*HEIGHT,Math.max(0,(base-2)*den/(CAM_UP*view.a)));
}
const gap=(a,b)=>Math.hypot(Math.max(0,b.x-a.x-a.w,a.x-b.x-b.w),Math.max(0,b.y-a.y-a.h,a.y-b.y-b.h));
function rightBox(v,L,s,dy){
  const d=s.tw*DEPTH,x0=1000-L.handBackInset-d,x1=1000-L.handBackInset,y0=s.y+dy,y1=s.y+s.h+dy,h=standingHeight(s.tw,v,y0);
  const P=(x,y,z)=>{const p=projectPoint(v,x,y);return [p.x,p.y-z*CAM_UP*v.a/(1+v.g*y)];};
  const pts=[0,h].flatMap(z=>[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>P(x,y,z)));
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
}
// §4.5: drawing only; original world slots and hidden DOM remain untouched.
export function rightLaneOffset(v,L,hand,melds){
  if(!hand.length||!melds.length)return 0;
  const mr=melds.flat().map(r=>projectRect(v,r)),max=(1000-L.rim-4)-Math.max(...hand.map(s=>s.y+s.h));
  for(let dy=0;dy<=max;dy+=.25)if(hand.every(s=>mr.every(o=>gap(rightBox(v,L,s,dy),o)>=6)))return dy;
  return max;
}
export function standingBoxes(rel,n,melds,view,L=layoutForView(view)){
  const P=(x,y,z=0)=>{const p=projectPoint(view,x,y);return [p.x,p.y-z*CAM_UP*view.a/(1+view.g*y)];};
  const slots=opponentSlots(rel,n,melds,view,L,false);
  const dy=rel===1?rightLaneOffset(view,L,slots.hand,slots.melds):0;
  return slots.hand.map(s=>{
    const d=s.tw*DEPTH,h=standingHeight(s.tw,view,rel===2?L.handBackInset:s.y+dy);
    const b=rel===2?{x0:s.x,x1:s.x+s.w,y0:L.handBackInset,y1:L.handBackInset+d,h}:
      rel===3?{x0:L.handBackInset,x1:L.handBackInset+d,y0:s.y,y1:s.y+s.h,h}:
      {x0:1000-L.handBackInset-d,x1:1000-L.handBackInset,y0:s.y+dy,y1:s.y+s.h+dy,h};
    const points=[0,h].flatMap(z=>[[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].map(([x,y])=>P(x,y,z)));
    const x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1]));
    return {...b,dy,rect:{x,y,w:Math.max(...points.map(p=>p[0]))-x,h:Math.max(...points.map(p=>p[1]))-y}};
  });
}
const states=new WeakMap();
export function standingBackQuad(rel,{x0,x1,y0,y1,h},view){
  const P=(x,y,z)=>{const p=projectPoint(view,x,y);return [p.x,p.y-z*CAM_UP*view.a/(1+view.g*y)];};
  if(rel===2)return [P(x0,y1,h),P(x1,y1,h),P(x1,y1,0),P(x0,y1,0)];
  const bx=rel===3?x1:x0,[start,end]=rel===3?[y1,y0]:[y0,y1];
  return [P(bx,start,h),P(bx,end,h),P(bx,end,0),P(bx,start,0)];
}
export function standingWallRects(board){return states.get(board)?.rects||[];}
let svgSequence=0;
export function renderStandingWalls(board,view,L=layoutForView(view)){
  let saved=states.get(board);
  const seats=[1,2,3].map(rel=>{
    const p=board.querySelector('.seat-plane[data-rel="'+rel+'"]'),backs=p?.querySelector('.hand-back');
    return {rel,backs,n:backs&&!backs.querySelector('.tile:not(.tile-back)')?backs.children.length:0,
      melds:[...(p?.querySelector('.melds')?.children||[])].map(g=>g.children.length),
      dealing:[...(backs?.children||[])].some(t=>t.classList.contains('dealing'))};
  });
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const texture=board.dataset.tileBackTexture||'';
  const key=JSON.stringify([view.width,view.height,view.profile,board.dataset.tableTheme,board.dataset.tileFace,board.dataset.tileBackId,texture,board.dataset.tileBackVersion,board.style.getPropertyValue('--tile-back-color'),board.style.getPropertyValue('--tile-back-dark'),seats.map(s=>[s.n,s.melds,s.dealing]),reduced]);
  if(saved?.key===key)return saved.svg;
  let svg=board.querySelector('svg.standing-walls');
  if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('standing-walls');svg.setAttribute('aria-hidden','true');board.append(svg);}
  const uid='sw-'+(++svgSequence),ref=id=>'url(#'+uid+'-'+id+')';
  svg.setAttribute('viewBox',`0 0 ${view.width} ${view.height}`);
  const P=(x,y,z=0)=>{const p=projectPoint(view,x,y);return [p.x,p.y-z*CAM_UP*view.a/(1+view.g*y)];};
  const pts=arr=>arr.map(p=>p.map(n=>n.toFixed(2)).join(',')).join(' ');
  let textureDefs=texture?`<image id="${uid}-texture" href="${texture.replaceAll('&','&amp;').replaceAll('"','&quot;')}" width="1" height="1" preserveAspectRatio="none"/>`:'';
  const defs=`
    <linearGradient id="${uid}-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tile-back-color)"/><stop offset="1" style="stop-color:var(--tile-back-dark)"/></linearGradient>
    <linearGradient id="${uid}-back-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--tile-back-dark)"/><stop offset="1" style="stop-color:var(--tile-back-dark)" stop-opacity=".9"/></linearGradient>
    <linearGradient id="${uid}-ivory-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece3cc"/><stop offset="1" stop-color="#cfc1a0"/></linearGradient>
    <filter id="${uid}-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
  `;
  const face=(poly,fill,extra='')=>`<polygon points="${pts(poly)}" fill="${fill}" stroke="#0000004d" stroke-width=".6" stroke-linejoin="round" ${extra}/>`;
  const printedFace=(q,rel,index)=>{
    const base=face(q,ref('back'));if(!texture)return base;
    const id=`${uid}-print-${rel}-${index}`,mesh=backTextureMesh(q);
    if(!mesh.length)return base;
    textureDefs+=`<clipPath id="${id}"><polygon points="${pts(q)}"/></clipPath>`;
    const fragments=mesh.map(({points,matrix},i)=>{
      // Subpixel overlap avoids antialias cracks; the exact outer quad clips it.
      const cx=points.reduce((v,p)=>v+p[0],0)/3,cy=points.reduce((v,p)=>v+p[1],0)/3;
      const clip=points.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy)||1;return [x+(x-cx)*.08/d,y+(y-cy)*.08/d];});
      textureDefs+=`<clipPath id="${id}-${i}"><polygon points="${pts(clip)}"/></clipPath>`;
      return `<g clip-path="url(#${id}-${i})"><use href="#${uid}-texture" transform="matrix(${matrix.map(v=>v.toFixed(7)).join(' ')})"/></g>`;
    }).join('');
    return base+`<g class="standing-back-print" data-back-id="${board.dataset.tileBackId}" data-quad="${JSON.stringify(q)}" clip-path="url(#${id})">${fragments}</g>`+face(q,'none');
  };
  let shadows='',tiles='';const rects=[];
  for(const {rel,n,melds,dealing}of seats){
    const boxes=standingBoxes(rel,n,melds,view,L);
    const order=boxes.map((b,i)=>i).sort((a,b)=>rel===2?
      Math.abs((boxes[b].x0+boxes[b].x1)/2-500)-Math.abs((boxes[a].x0+boxes[a].x1)/2-500):boxes[a].y0-boxes[b].y0);
    let group='';
    for(const i of order){
      const {x0,x1,y0,y1,h,rect}=boxes[i];rects.push({...rect,rel});
      shadows+=`<polygon points="${pts([P(x0+1,y0+2),P(x1+2,y0+2),P(x1+3,y1+4),P(x0+2,y1+4)])}" fill="#000" opacity=".42"/>`;
      let g = '';
      const top = h;
      if (rel === 2) {
        const yi = y0 + (y1 - y0) * IVORY;
        const cx = (x0 + x1) / 2;
        if (cx < 497) { // 左侧牌露出右侧面（朝向中心）
          g += face([P(x1, y0, 0), P(x1, yi, 0), P(x1, yi, top), P(x1, y0, top)], ref('ivory-side'), 'stroke="none"');
          g += face([P(x1, yi, 0), P(x1, y1, 0), P(x1, y1, top), P(x1, yi, top)], ref('back-side'), 'stroke="none"');
        } else if (cx > 503) {
          g += face([P(x0, y0, 0), P(x0, yi, 0), P(x0, yi, top), P(x0, y0, top)], ref('ivory-side'), 'stroke="none"');
          g += face([P(x0, yi, 0), P(x0, y1, 0), P(x0, y1, top), P(x0, yi, top)], ref('back-side'), 'stroke="none"');
        }
        g += printedFace(standingBackQuad(rel,boxes[i],view),rel,i);
        g += face([P(x0, y0, top), P(x1, y0, top), P(x1, yi, top), P(x0, yi, top)], '#f8f2e2', 'stroke="none"');
        g += face([P(x0, yi, top), P(x1, yi, top), P(x1, y1, top), P(x0, y1, top)], 'var(--tile-back-color)', 'stroke="none" style="filter:brightness(1.12)"');
        // 背面高光与内框
        const a = P(x0, y1, top), b = P(x1, y1, top);
        g += `<line x1="${a[0] + 1}" y1="${a[1] + 1}" x2="${b[0] - 1}" y2="${b[1] + 1}" stroke="#ffffff70" stroke-width=".8"/>`;
      } else {
        const left = rel === 3;
        const xi = left ? x0 + (x1 - x0) * IVORY : x1 - (x1 - x0) * IVORY;
        // 朝向中心的背面（上家 +x，下家 −x）
        const bx = left ? x1 : x0;
        g += printedFace(standingBackQuad(rel,boxes[i],view),rel,i);
        // 朝向我们的近侧面（+y），双色分层
        const [ia, ib] = left ? [x0, xi] : [xi, x1], [ca, cb] = left ? [xi, x1] : [x0, xi];
        g += face([P(ia, y1, 0), P(ib, y1, 0), P(ib, y1, top), P(ia, y1, top)], ref('ivory-side'), 'stroke="none"');
        g += face([P(ca, y1, 0), P(cb, y1, 0), P(cb, y1, top), P(ca, y1, top)], ref('back-side'), 'stroke="none"');
        // 顶面
        g += face([P(ia, y0, top), P(ib, y0, top), P(ib, y1, top), P(ia, y1, top)], '#f8f2e2', 'stroke="none"');
        g += face([P(ca, y0, top), P(cb, y0, top), P(cb, y1, top), P(ca, y1, top)], 'var(--tile-back-color)', 'stroke="none" style="filter:brightness(1.12)"');
        const a = P(bx, y0, top), b = P(bx, y1, top);
        g += `<line x1="${a[0]}" y1="${a[1] + 1}" x2="${b[0]}" y2="${b[1] + 1}" stroke="#ffffff66" stroke-width=".8"/>`;
      }
      group+=`<g class="standing-tile" data-index="${i}">${g}</g>`;
    }
    tiles+=`<g data-rel="${rel}" class="${dealing&&!reduced?'sw-deal':''}">${group}</g>`;
  }
  svg.innerHTML='<defs>'+defs+textureDefs+'</defs>'+`<g class="standing-contact-shadows" filter="${ref('blur')}">${shadows}</g>`+tiles;
  states.set(board,{key,svg,rects,view});return svg;
}
function refreshStandingAppearance(){
  for(const board of document.querySelectorAll('#game-screen .table')){
    const old=states.get(board);if(old){old.key='';renderStandingWalls(board,old.view||viewForBoard(board));}
  }
}
if(typeof window!=='undefined')for(const event of ['tablethemechange','tileappearancechange'])window.addEventListener(event,refreshStandingAppearance);
function viewForBoard(board){
  // The production applyTableView normally supplies this; events reuse its saved view.
  return states.get(board)?.view;
}
