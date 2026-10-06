import {TILE_FACES,DEFAULT_FACE_ID,DEFAULT_BACK_ID} from './tile-faces.js?v=1.9.20';
import {deriveBackDark} from './table-colour.js?v=1.9.20';
import {TILE_BACKS} from './tile-backs.js?v=1.9.20';

/** Whole-material precedence: selected back > face default > current cloth. */
export function resolveTileAppearance({theme,faceId=DEFAULT_FACE_ID,backId=DEFAULT_BACK_ID,
    faces=TILE_FACES,backs=TILE_BACKS}) {
    const face=faces.find(f=>f.id===faceId)||faces.find(f=>f.id===DEFAULT_FACE_ID);
    const selected=backs.find(b=>b.id===backId&&!b.default);
    // Older descriptors may still use boundBack: only its default data survive.
    const faceDefault=face.defaultBack||face.boundBack;
    const back=selected?.colors||faceDefault||{
        color:theme.tileBack||'#e29936',dark:theme.tileBackDark||deriveBackDark(theme.tileBack||'#e29936'),
    };
    return {faceId:face.id,backId:selected?.id||DEFAULT_BACK_ID,
        back:{...back,source:selected?.colors?'selection':faceDefault?'face':'theme',
            surface:selected?.surface||null,version:selected?.version||0},
        surface:face.surface||null};
}

/** Inherited variables cover live/dynamic DOM tiles, SVG backs and FLIP clones. */
export function paintTileAppearance(container,appearance,{backReady=true}={}) {
    container.dataset.tileFace=appearance.faceId;
    container.dataset.tileBackSource=appearance.back.source;
    container.dataset.tileBackId=appearance.backId;
    const texture=backReady?appearance.back.surface:null;
    container.dataset.tileBackTexture=texture?.src||'';
    container.dataset.tileBackVersion=String(appearance.back.version);
    const set=(name,value)=>{if(container.style.getPropertyValue(name)!==value)container.style.setProperty(name,value);};
    set('--tile-back-color',appearance.back.color);
    set('--tile-back-dark',appearance.back.dark);
    if(texture)set('--tile-back-image',`url("${texture.src}")`);
    else container.style.removeProperty('--tile-back-image');
    if(appearance.surface){
        set('--tile-face-background',`url("${appearance.surface.src}") center / 100% 100% no-repeat`);
        set('--tile-face-layer','""');
    }else{
        container.style.removeProperty('--tile-face-background');
        container.style.removeProperty('--tile-face-layer');
    }
}
