import {register,open,isOpen} from './lobby-sheets.js?v=1.9.20';
import {nativeServiceInfo,nativeRequest} from './service-client.js?v=1.9.20';
import {validateUpdate} from './update-core.js?v=1.9.20';
export function installUpdateUI(createSheet){
    const root=createSheet('app-update','发现新版本','红中麻将',
        '<section class="update-copy"><p id="app-update-version" class="pf-h"></p><ul id="app-update-notes"></ul>'+ 
        '<p id="app-update-size" class="pf-note"></p><div class="actions"><button class="btn-quiet" type="button" data-sheet-close aria-label="稍后更新">稍后</button>'+ 
        '<a class="btn-gold" id="app-update-download" aria-label="下载安装新版本">立即更新</a></div></section>');
    let pending=null,shown=false,request=null,manual=false,ready=document.getElementById('boot-loading').classList.contains('hidden');
    const status=document.getElementById('settings-update-status'),button=document.getElementById('settings-update-btn');
    register('app-update',root,{onClose:()=>{try{sessionStorage.setItem('hz_update_deferred',String(pending?.versionCode));}catch{}}});
    function show(){
        if(!pending||shown||!ready||document.getElementById('lobby').classList.contains('hidden')
            ||!document.getElementById('version-modal').classList.contains('hidden')||isOpen()&&!manual)return;
        if(!manual){try{if(sessionStorage.getItem('hz_update_deferred')===String(pending.versionCode))return;}catch{}}
        shown=true;root.querySelector('#app-update-version').textContent='v'+pending.version+' 已准备好';
        root.querySelector('#app-update-notes').replaceChildren(...pending.notes.map(note=>{const li=document.createElement('li');li.textContent=note;return li;}));
        root.querySelector('#app-update-size').textContent='安装包 '+(pending.apkBytes/1048576).toFixed(1)+' MB · 覆盖安装保留本机资料';
        root.querySelector('#app-update-download').href=pending.downloadUrl;
        open('app-update',{trigger:manual?button:document.getElementById('lobby-settings-btn')});
    }
    async function check(force=false){
        if(request)return request;const info=nativeServiceInfo();
        if(!info){if(force)status.textContent=/HongzhongMahjong\//.test(navigator.userAgent)?'请安装新版应用后使用自动检查更新。':'当前为网页版，刷新即可使用已上线的版本。';return;}
        button.disabled=true;if(force)status.textContent='正在检查更新…';manual=force;
        request=(async()=>{
            try{const raw=await nativeRequest('updates');pending=validateUpdate(raw,info.versionCode);shown=false;
                status.textContent=pending?'发现新版本 v'+pending.version:'已是最新版本';show();
            }catch{if(force)status.textContent='暂时无法检查更新，请稍后重试。';}
            finally{request=null;button.disabled=false;}
        })();return request;
    }
    button.addEventListener('click',()=>void check(true));
    window.addEventListener('mahjongready',()=>{ready=true;show();});
    window.addEventListener('lobbysheetchange',show);
    const observer=new MutationObserver(show);
    for(const node of [document.getElementById('lobby'),document.getElementById('version-modal')])observer.observe(node,{attributes:true,attributeFilter:['class']});
    void check();
    return {check};
}
