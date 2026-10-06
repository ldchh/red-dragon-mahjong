/** Loaded images are reusable even when a browser's optional decode hint stalls. */
export function runtimeThemeImages(theme) {
    return [theme.art,theme.material.texture,...(theme.accents||[]).map(a=>a.art)].filter(Boolean);
}

export function createThemeAssetLoader({makeImage=()=>new Image(),timeoutMs=10000}={}) {
    const cache=new Map();
    function load(asset) {
        if(!asset)return Promise.resolve();
        if(cache.has(asset.src))return cache.get(asset.src).promise;
        const entry={promise:null};cache.set(asset.src,entry);
        entry.promise=new Promise((resolve,reject)=>{
            const image=makeImage();image.decoding='async';image.fetchPriority='high';
            let settled=false;
            const finish=(error)=>{
                if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;
                if(error){image.removeAttribute?.('src');reject(error);}else resolve(image);
            };
            const timer=setTimeout(()=>finish(new Error('图片载入超时')),timeoutMs);
            image.onerror=()=>finish(new Error('图片未能载入'));
            image.onload=()=>{
                if(!image.naturalWidth||!image.naturalHeight
                    ||asset.width&&image.naturalWidth!==asset.width||asset.height&&image.naturalHeight!==asset.height){finish(new Error('素材尺寸异常'));return;}
                // onload + dimensions establishes availability. decode() is only
                // a hint: an unresolved browser decode promise must not lock sales.
                finish();try{image.decode?.().catch(()=>{});}catch{}
            };
            image.src=asset.src;
        });
        entry.promise.catch(()=>{if(cache.get(asset.src)===entry)cache.delete(asset.src);});
        return entry.promise;
    }
    return Object.freeze({load,preload:theme=>Promise.all(runtimeThemeImages(theme).map(load))});
}

// The startup screen and wardrobe use the same successful loads. A failed
// request is evicted, so an explicit retry never needs to discard good images.
export const themeAssets=createThemeAssetLoader();
