/** Startup preparation is independent of rooms, saves and the equipped theme. */
import {TABLE_THEMES,themeImageAssets} from './table-themes.js?v=1.9.20';
import {TILE_VALUES,primaryArtUrl,originalArtUrl,rememberTileArt} from './tile.js?v=1.9.20';
import {themeAssets} from './table-theme-assets.js?v=1.9.20';
import {faceImageAssets} from './tile-faces.js?v=1.9.20';
import {TILE_BACKS,backImageAssets} from './tile-backs.js?v=1.9.20';
import {tileBackAssets} from './tile-back-assets.js?v=1.9.20';

export function createAssetPreparation(entries,{concurrency=6}={}) {
    const states=new Map(),listeners=new Set();let promise=null,status='idle';
    if(!Number.isInteger(concurrency)||concurrency<1)throw new TypeError('Invalid concurrency');
    if(new Set(entries.map(e=>e.id)).size!==entries.length)throw new TypeError('Duplicate startup asset');
    function snapshot() {
        const done=[...states.values()].filter(s=>s.state!=='loading');
        const failures=entries.filter(e=>states.get(e.id)?.state==='failed').map(e=>({id:e.id,label:e.label,required:!!e.required}));
        return {status,total:entries.length,completed:done.length,ready:done.filter(s=>s.state==='ready').length,
            fallback:done.filter(s=>s.state==='fallback').length,failures,blocked:failures.some(e=>e.required)};
    }
    const report=()=>{const info=snapshot();listeners.forEach(fn=>fn(info));};
    async function run() {
        status='loading';report();const queue=entries.filter(e=>!['ready','fallback'].includes(states.get(e.id)?.state));let at=0;
        await Promise.all(Array.from({length:Math.min(concurrency,queue.length)},async()=>{
            while(at<queue.length){
                const entry=queue[at++];states.set(entry.id,{state:'loading'});report();
                try{const result=await entry.run();states.set(entry.id,{state:result==='fallback'?'fallback':'ready'});}
                catch{states.set(entry.id,{state:'failed'});}report();
            }
        }));
        status=snapshot().blocked?'blocked':'ready';report();return snapshot();
    }
    return Object.freeze({snapshot,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn);},
        prepare(){if(promise)return promise;promise=run().finally(()=>{promise=null;});return promise;}});
}

export function imagePreparationEntries(themes=TABLE_THEMES) {
    const entries=TILE_VALUES.map(value=>({id:'tile:'+value,label:'牌面',required:true,async run(){
        const primary=primaryArtUrl(value);
        try{await themeAssets.load({src:primary,width:52,height:72});rememberTileArt(value,primary);}
        catch{const fallback=originalArtUrl(value);await themeAssets.load({src:fallback});rememberTileArt(value,fallback);return 'fallback';}
    }}));
    const images=new Map();
    for(const asset of faceImageAssets())images.set(asset.src,asset);
    for(const asset of backImageAssets())images.set(asset.src,asset);
    // Runtime prints precede optional catalogue thumbnails in the queue.
    for(const theme of themes)for(const asset of themeImageAssets(theme))if(asset!==theme.thumbnail)images.set(asset.src,asset);
    for(const theme of themes)if(theme.thumbnail)images.set(theme.thumbnail.src,theme.thumbnail);
    for(let i=1;i<=5;i++)images.set('/static/assets/avatar-'+i+'.svg',{src:'/static/assets/avatar-'+i+'.svg'});
    images.set('/static/assets/favicon.svg',{src:'/static/assets/favicon.svg'});
    for(const asset of images.values()){
        const back=TILE_BACKS.find(b=>b.surface?.src===asset.src);
        entries.push({id:asset.src,label:back?'牌背':'装扮与头像',run:()=>back?tileBackAssets.prepare(back):themeAssets.load(asset)});
    }
    return entries;
}
let preparation;
export function getGameAssets(audio) {
    if(preparation)return preparation;
    const entries=imagePreparationEntries();
    const sounds=new Map();
    for(const theme of TABLE_THEMES)for(const asset of Object.values(theme.soundPack?.events||{}))sounds.set(asset.src,asset);
    for(const asset of sounds.values()) {
        entries.push({id:asset.src,label:'声音',async run(){return await audio.load(asset)?undefined:'fallback';}});
    }
    if(typeof document!=='undefined'&&document.fonts)entries.push({id:'display-font',label:'字体',async run(){
        let timer;try{return await Promise.race([document.fonts.load('500 24px HZDisplay').then(fonts=>fonts.length?undefined:'fallback'),
            new Promise(resolve=>{timer=setTimeout(()=>resolve('fallback'),5000);})]);}catch{return 'fallback';}finally{clearTimeout(timer);}
    }});
    preparation=createAssetPreparation(entries);return preparation;
}
