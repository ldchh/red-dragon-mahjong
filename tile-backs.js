/** Back materials are independent of the face ground, table and hidden value. */
export const DEFAULT_BACK_ID='theme';
export function validateTileBack(back){
    if(!back||!/^[-a-z0-9]+$/.test(back.id)||!back.name)throw new TypeError('Invalid tile back');
    if(back.default)return true;
    if(!/^#[0-9a-f]{6}$/i.test(back.colors?.color)||!/^#[0-9a-f]{6}$/i.test(back.colors?.dark))throw new TypeError('Invalid back material');
    for(const asset of [back.surface,back.thumbnail]){
        if(!asset||!/^\/static\/assets\/tile-backs\/[-a-z0-9]+\/[-a-z0-9]+\.(png|webp)\?v=\d+\.\d+\.\d+$/.test(asset.src)
            ||!Number.isInteger(asset.width)||!Number.isInteger(asset.height)||asset.width<1||asset.height<1)throw new TypeError('Invalid local back texture');
    }
    return true;
}
export const TILE_BACKS=Object.freeze([
    Object.freeze({id:DEFAULT_BACK_ID,name:'默认配色',subtitle:'优先使用牌面默认背色，否则随桌布',default:true}),
    Object.freeze({id:'detective-conan-back',name:'名侦探柯南 · 蓝金徽章',subtitle:'蓝金星环与侦探徽章',
        description:'独立牌背，牌面与桌布自由搭配',version:1,
        colors:Object.freeze({color:'#1675b4',dark:'#164d78'}),
        surface:Object.freeze({src:'/static/assets/tile-backs/detective-conan/blue-gold-v1.webp?v=1.9.20',width:512,height:696}),
        thumbnail:Object.freeze({src:'/static/assets/tile-backs/detective-conan/thumbnail-v1.webp?v=1.9.20',width:160,height:218}),
        thumb:'/static/assets/tile-backs/detective-conan/thumbnail-v1.webp?v=1.9.20'}),
    Object.freeze({id:'one-piece-shanks-back',name:'海贼王 · 红发香克斯',subtitle:'红发举刀与赤色气流',
        description:'独立牌背，牌面与桌布自由搭配',version:2,
        colors:Object.freeze({color:'#984450',dark:'#572b37'}),
        surface:Object.freeze({src:'/static/assets/tile-backs/one-piece-shanks/red-haired-v2.webp?v=1.9.20',width:512,height:696}),
        thumbnail:Object.freeze({src:'/static/assets/tile-backs/one-piece-shanks/thumbnail-v2.webp?v=1.9.20',width:160,height:218}),
        thumb:'/static/assets/tile-backs/one-piece-shanks/thumbnail-v2.webp?v=1.9.20'}),
]);
TILE_BACKS.forEach(validateTileBack);
export const backById=id=>TILE_BACKS.find(back=>back.id===id);
export const backImageAssets=()=>[...new Map(TILE_BACKS.flatMap(b=>[b.surface,b.thumbnail].filter(Boolean)).map(a=>[a.src,a])).values()];
