import {themeAssets} from './table-theme-assets.js?v=1.9.20';
/** The same runtime-image result drives startup, previews and live SVG backs. */
export function createBackAssetManager(loader){
    const entries=new Map(),listeners=new Set();
    const key=back=>back?.surface?.src;
    const report=back=>listeners.forEach(fn=>fn(back));
    function prepare(back){
        const src=key(back);if(!src)return Promise.resolve();
        const previous=entries.get(src);if(previous?.status==='ready'||previous?.status==='loading')return previous.promise;
        // A successfully downloaded but wrong-size image can remain in the
        // browser's decoded cache even after our Promise cache is evicted.
        // Retry uses a new local URL, and rendering uses that exact ready URL.
        const attempt=(previous?.attempt||0)+(previous?1:0),readySrc=src+(attempt?'&back_retry='+attempt:'');
        const entry={status:'loading',attempt,readySrc};entries.set(src,entry);
        entry.promise=Promise.resolve().then(()=>loader.load({...back.surface,src:readySrc})).then(()=>{entry.status='ready';report(back);},error=>{entry.status='failed';report(back);throw error;});
        return entry.promise;
    }
    return Object.freeze({prepare,ready:back=>!key(back)||entries.get(key(back))?.status==='ready',
        url:back=>entries.get(key(back))?.status==='ready'?entries.get(key(back)).readySrc:null,
        status:back=>!key(back)?'ready':entries.get(key(back))?.status||'idle',
        subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
}
export const tileBackAssets=createBackAssetManager(themeAssets);
