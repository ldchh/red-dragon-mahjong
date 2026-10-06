export const RANK_BADGES = [
  {name:'试刀者', glyph:'初', shape:'coin',    metal:['#f3c99a','#b87a45','#6b3d1d'], enamel:['#5a3a24','#2e1b0e'], ink:'#f6dcb5', gem:null,       sub:'青铜古钱'},
  {name:'听风客', glyph:'竹', shape:'leaf',    metal:['#d9f0dc','#6fa88c','#2d5a4a'], enamel:['#1f5146','#0d2a24'], ink:'#e3f5e4', gem:null,       sub:'苍铜竹叶'},
  {name:'控场师', glyph:'玉', shape:'hex',     metal:['#ffffff','#cfdccf','#7f9a88'], enamel:['#e9f1e7','#a8c4b2'], ink:'#2f6b55', gem:'#4fae86',  sub:'白玉六角'},
  {name:'天胡客', glyph:'玄', shape:'hex2',    metal:['#f2f5fa','#9aa5b8','#4a5262'], enamel:['#3a4150','#141821'], ink:'#e6ecf5', gem:'#7fb6ff',  sub:'玄铁银边'},
  {name:'千面手', glyph:'御', shape:'shield',  metal:['#fff1c0','#e2b65a','#8a5a1c'], enamel:['#b8332f','#5e1213'], ink:'#fff0c8', gem:'#ffcf5a',  sub:'赤金双翼'},
  {name:'无双将', glyph:'尊', shape:'shield2', metal:['#fff1c0','#e2b65a','#8a5a1c'], enamel:['#6c3b9a','#2c1245'], ink:'#fff0c8', gem:'#e6a8ff',  sub:'紫金双刃'},
  {name:'镇国柱', glyph:'圣', shape:'crown',   metal:['#fff7d6','#f0c75e','#9a6418'], enamel:['#145e4f','#062a23'], ink:'#fff4cf', gem:'#5fe0b8',  sub:'鎏金云冠'},
  {name:'诛仙位', glyph:'魂', shape:'soul',    metal:['#fff2c4','#f2b84c','#9a4a10'], enamel:['#2a0608','#000000'], ink:'#ffe7b0', gem:'#ff5a3c',  sub:'魂焰金冠'},
];
let badgeSequence=0;
export function badgeSVG(major, {mini=false}={}) {
  const uid='hz-rank-'+(++badgeSequence);
  const r = RANK_BADGES[Math.max(0,Math.min(7,Number(major)-1))] || RANK_BADGES[0], [m1, m2, m3] = r.metal, [e1, e2] = r.enamel, id = s => `${s}-${uid}`;
  const defs = `<defs>
    <linearGradient id="${id('m')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m1}"/><stop offset=".45" stop-color="${m2}"/><stop offset=".7" stop-color="${m3}"/><stop offset="1" stop-color="${m2}"/></linearGradient>
    <linearGradient id="${id('mr')}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${m3}"/><stop offset=".5" stop-color="${m1}"/><stop offset="1" stop-color="${m3}"/></linearGradient>
    <radialGradient id="${id('e')}" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="${e1}"/><stop offset="1" stop-color="${e2}"/></radialGradient>
    <radialGradient id="${id('g')}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${r.gem || '#fff'}"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient>
    <radialGradient id="${id('aura')}" cx=".5" cy=".55" r=".55"><stop offset=".5" stop-color="#ff6a2a" stop-opacity=".8"/><stop offset="1" stop-color="#ff2a00" stop-opacity="0"/></radialGradient>
  </defs>`;
  const M = `url(#${id('m')})`, MR = `url(#${id('mr')})`, E = `url(#${id('e')})`, G = `url(#${id('g')})`;
  const line = `stroke="${m3}" stroke-width=".8"`;
  let back = '', frame = '', inner = '', top = '';
  const disc = (rr) => `<circle cx="50" cy="52" r="${rr + 4}" fill="${M}" ${line}/><circle cx="50" cy="52" r="${rr + 1.2}" fill="none" stroke="${m1}" stroke-opacity=".7" stroke-width=".8"/><circle cx="50" cy="52" r="${rr}" fill="${E}"/>`;
  const hexPts = (rr, cy = 52) => Array.from({length: 6}, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return `${(50 + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`; }).join(' ');
  const shield = (s = 1) => `M50 ${14 - 2 * s} L${82 + 2 * s} 24 L${80 + s} 58 Q76 80 50 ${92 + s} Q24 80 ${20 - s} 58 L${18 - 2 * s} 24 Z`;
  const wing = (dir) => { const k = dir; return `<path d="M${50 + k * 30} 40 q${k * 16} -6 ${k * 26} -18 q${-k * 2} 12 ${-k * 8} 18 q${k * 10} -2 ${k * 16} -8 q${-k * 3} 12 ${-k * 12} 16 q${k * 8} 0 ${k * 12} -4 q${-k * 6} 12 ${-k * 22} 12 Z" fill="${M}" ${line}/>`; };
  switch (r.shape) {
    case 'coin':
      frame = disc(30);
      inner = `<rect x="44" y="46" width="12" height="12" fill="none" stroke="${m2}" stroke-opacity=".35" stroke-width="1.2"/>`;
      break;
    case 'leaf':
      back = [0, 90, 180, 270].map(a => `<path transform="rotate(${a + 45} 50 52)" d="M50 10 Q58 22 50 30 Q42 22 50 10 Z" fill="${M}" ${line}/>`).join('');
      frame = disc(29);
      break;
    case 'hex':
      frame = `<polygon points="${hexPts(40)}" fill="${M}" ${line}/><polygon points="${hexPts(35)}" fill="${E}" stroke="${m1}" stroke-width=".8"/>`;
      break;
    case 'hex2':
      back = `<polygon points="${hexPts(46)}" fill="${MR}" ${line} transform="rotate(30 50 52)"/>`;
      frame = `<polygon points="${hexPts(40)}" fill="${M}" ${line}/><polygon points="${hexPts(35)}" fill="${E}" stroke="${m1}" stroke-width=".8"/>`;
      top = `<circle cx="50" cy="14" r="4" fill="${G}" stroke="${m3}" stroke-width=".8"/>`;
      break;
    case 'shield':
      back = wing(1) + wing(-1);
      frame = `<path d="${shield(1)}" fill="${M}" ${line}/><path d="${shield(0)}" transform="translate(50 54) scale(.84) translate(-50 -54)" fill="${E}" stroke="${m1}" stroke-width=".9"/>`;
      top = `<circle cx="50" cy="16" r="4.5" fill="${G}" stroke="${m3}" stroke-width=".8"/>`;
      break;
    case 'shield2':
      back = wing(1) + wing(-1) + `<path d="M22 88 L78 20 M78 88 L22 20" stroke="${MR}" stroke-width="5" stroke-linecap="round"/><path d="M22 88 L78 20 M78 88 L22 20" stroke="${m3}" stroke-width=".8"/>`;
      frame = `<path d="${shield(1)}" fill="${M}" ${line}/><path d="${shield(0)}" transform="translate(50 54) scale(.84) translate(-50 -54)" fill="${E}" stroke="${m1}" stroke-width=".9"/>`;
      top = `<circle cx="50" cy="16" r="5" fill="${G}" stroke="${m3}" stroke-width=".8"/>`;
      break;
    case 'crown':
    case 'soul': {
      const soul = r.shape === 'soul';
      if (soul) back = `<circle cx="50" cy="56" class="badge-aura" r="48" fill="url(#${id('aura')})"></circle>` +
        [-1, 1].map(k => `<path d="M${50 + k * 26} 86 Q${50 + k * 46} 60 ${50 + k * 34} 30 Q${50 + k * 30} 50 ${50 + k * 22} 56 Q${50 + k * 28} 40 ${50 + k * 18} 26 Q${50 + k * 12} 46 ${50 + k * 16} 60 Z" fill="#ff7a2a" opacity=".85"/>`).join('');
      else back = [-1, 1].map(k => `<path d="M${50 + k * 30} 70 q${k * 14} -2 ${k * 18} -14 q${-k * 8} 2 ${-k * 10} -2 q${k * 10} -4 ${k * 10} -14 q${-k * 8} 4 ${-k * 14} 2" fill="none" stroke="${M}" stroke-width="5" stroke-linecap="round"/>`).join('');
      frame = `<polygon points="${Array.from({length: 8}, (_, i) => { const a = Math.PI / 8 + i * Math.PI / 4; return `${(50 + 38 * Math.cos(a)).toFixed(2)},${(56 + 38 * Math.sin(a)).toFixed(2)}`; }).join(' ')}" fill="${M}" ${line}/>` +
        `<circle cx="50" cy="56" r="30" fill="${E}" stroke="${m1}" stroke-width=".9"/>`;
      top = `<path d="M30 26 L36 8 L43 20 L50 2 L57 20 L64 8 L70 26 Z" fill="${M}" ${line}/>` +
        `<rect x="29" y="24" width="42" height="6" rx="2" fill="${MR}" ${line}/>` +
        `<circle cx="50" cy="12" r="3.6" fill="${G}"/><circle cx="36" cy="14" r="2.2" fill="${G}"/><circle cx="64" cy="14" r="2.2" fill="${G}"/>`;
      break;
    }
  }
  if(mini){back='';top=(top.match(/<circle[^>]*\/>/g)||[]).join('');}
  else if(back)back='<g data-badge-detail="'+r.shape+'">'+back+'</g>';
  const cy = ['crown', 'soul'].includes(r.shape) ? 57 : 53, fs = ['shield', 'shield2'].includes(r.shape) ? 30 : 32;
  const glyph = `<text x="50" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="HZDisplay, KaiTi, serif" font-size="${fs}" fill="${r.ink}" stroke="#0006" stroke-width=".6" paint-order="stroke" style="filter:drop-shadow(0 1px 0 #0008)">${r.glyph}</text>`;
  const shine = `<ellipse cx="40" cy="34" rx="16" ry="6" fill="#fff" opacity=".18" transform="rotate(-24 40 34)"/>`;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${r.name}">${defs}${back}${frame}${inner}${glyph}${shine}${top}</svg>`;
}

