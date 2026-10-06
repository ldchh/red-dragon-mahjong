import {PACKAGE_ID,DOWNLOAD_PREFIX} from './app-config.js?v=1.9.20';
export function validateUpdate(raw,currentCode){
    if(!raw||raw.schema!==1||raw.packageId!==PACKAGE_ID||!Number.isSafeInteger(raw.versionCode)||raw.versionCode<1
        ||raw.versionCode>2147483647||!/^\d+\.\d+\.\d+$/.test(raw.version||'')
        ||!Array.isArray(raw.notes)||!raw.notes.length||raw.notes.length>8
        ||raw.notes.some(note=>typeof note!=='string'||!note.trim()||note.length>160)
        ||!/^[a-f0-9]{64}$/.test(raw.sha256||'')||!Number.isSafeInteger(raw.apkBytes)||raw.apkBytes<100000)throw Error('invalid_update');
    const url=new URL(raw.downloadUrl);
    if(url.protocol!=='https:'||url.username||url.password||url.port
        ||!url.href.startsWith(DOWNLOAD_PREFIX)||!url.pathname.endsWith('.apk'))throw Error('invalid_update');
    if(raw.versionCode<=currentCode)return null;
    return Object.freeze({...raw,notes:Object.freeze([...raw.notes]),downloadUrl:url.href});
}
