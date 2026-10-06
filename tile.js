/** Shared tile presentation; no game state, theme selection or event handlers. */
import {WORLD_LAYOUT} from './table-world-layout.js?v=1.9.20';
export const TILE_POSES = Object.freeze(['stand','flat','back-stand','back-flat']);
// User-requested originals from the local Mahjong Soul client. Keep them outside
// the generated SVG directory so regenerating original artwork cannot replace them.
export const TILE_VALUES = Object.freeze([11,12,13,14,15,16,17,18,19,
    21,22,23,24,25,26,27,28,29,31,32,33,34,35,36,37,38,39,40]);
const SOUL_TILES = new Set(TILE_VALUES),preparedFaces = new Map();
export const originalArtUrl = value => '/static/assets/tiles/' + value + '.svg?v=1.9.20';
export const primaryArtUrl = value => SOUL_TILES.has(Number(value))
    ? '/static/assets/tiles/mahjong-soul/' + value + '.png?v=1.9.20'
    : originalArtUrl(value);
export const tileArtUrl = value => preparedFaces.get(Number(value)) || primaryArtUrl(value);
export function rememberTileArt(value,src) {
    if(!SOUL_TILES.has(Number(value))||![primaryArtUrl(value),originalArtUrl(value)].includes(src))throw new TypeError('Invalid prepared face');
    preparedFaces.set(Number(value),src);
}
export function createTileElement(value, options = {}) {
    // Keep third-party/older renderers using (value, true) compatible.
    if (typeof options === 'boolean') options = {pose: options ? 'flat' : 'stand'};
    const {pose = 'stand', rot = 0} = options || {};
    if (!TILE_POSES.includes(pose) || ![0,90,180,270].includes(rot)) throw new TypeError('Invalid tile pose');
    const back = pose.startsWith('back-');
    const el = document.createElement('div');
    el.className = 'tile tile--' + pose + (pose.endsWith('flat') ? ' tile--small' : '') + (back ? ' tile-back' : '');
    el.dataset.rot = String(rot);
    el.style.setProperty('--tk','calc(var(--tw) * '+(pose.endsWith('stand')?.14:WORLD_LAYOUT.flatThickness)+')');
    if (value != null) el.dataset.tile = String(value);
    el.setAttribute('role','img');
    el.setAttribute('aria-label',back ? '牌背' : value === 40 ? '红中'
        : '一二三四五六七八九'[value%10-1] + ({1:'万',2:'筒',3:'条'}[Math.floor(value/10)] || ''));
    const body = document.createElement('div'); body.className = 'tile-body';
    const face = document.createElement('div'); face.className = 'tile-face';
    if(back){
        const print=document.createElement('div');print.className='tile-back-art';face.append(print);
    }
    if (!back) {
        const art = document.createElement('img'); art.className = 'tile-art';
        art.decoding = 'sync'; art.loading = 'eager';
        if (SOUL_TILES.has(Number(value)) && tileArtUrl(value)!==originalArtUrl(value)) {
            // A missing local slice must not leave an unreadable tile or loop.
            art.addEventListener('error', () => { art.src = originalArtUrl(value); }, {once:true});
        }
        art.src = tileArtUrl(value);
        art.alt = ''; art.draggable = false; face.append(art);
    }
    el.append(body,face);
    return el;
}
