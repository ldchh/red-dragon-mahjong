/** Shared face grounds only. The 28 transparent tile-art files remain original. */
export const DEFAULT_FACE_ID = 'majsoul';
export const DEFAULT_BACK_ID = 'theme';
export const TILE_FACES = Object.freeze([
    Object.freeze({id:'majsoul',name:'雀魂经典',subtitle:'经典原画',default:true}),
    Object.freeze({id:'cyberpunk-face',name:'赛博朋克 · 蓝紫幻纹',
        subtitle:'青蓝紫晶面与流光云纹',
        description:'默认蓝色牌背，可自由搭配独立牌背',
        surface:Object.freeze({src:'/static/assets/tile-faces/cyberpunk/blue-violet-v4.webp?v=1.9.20',width:512,height:696}),
        defaultBack:Object.freeze({color:'#627baa',dark:'#435174'})}),
]);
export const faceById = id => TILE_FACES.find(face=>face.id===id);
export const faceImageAssets = () => TILE_FACES.map(face=>face.surface).filter(Boolean);
