/** Shared lobby dialogs. Game DOM and game keyboard handlers remain untouched. */
const registry=new Map(),stack=[];
const controls=root=>[...root.querySelectorAll('button,input,select,a[href],[tabindex="0"]')]
    .filter(e=>!e.disabled&&!e.closest('[inert]')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
function labelControls(root){
    for(const element of root.querySelectorAll('button,input,select,a[href]')){
        if(element.hasAttribute('aria-label'))continue;
        const label=element.labels?.[0]?.textContent||element.getAttribute('title')||element.textContent;
        if(label?.trim())element.setAttribute('aria-label',label.trim().replace(/\s+/g,' '));
    }
}
let appWasInert=false;
export function register(name,root,hooks={}){
    if(registry.has(name))throw Error('Duplicate lobby sheet: '+name);
    root.classList.add('sheet-veil');root.hidden=true;
    const dialog=root.querySelector('.sheet');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
    const title=dialog.querySelector('h2');if(title){title.id||=name+'-sheet-title';dialog.setAttribute('aria-labelledby',title.id);}
    labelControls(root);
    registry.set(name,{root,hooks});
    root.addEventListener('click',e=>{if(e.target===root||e.target.closest('[data-sheet-close]'))closeTop();});
    root.addEventListener('keydown',e=>e.stopPropagation());
    return root;
}
export function open(name,{tab,trigger=document.activeElement}={}){
    const entry=registry.get(name);if(!entry)return false;
    const current=stack.at(-1);
    if(current?.name===name){entry.hooks.onOpen?.({tab});return true;}
    if(stack.some(s=>s.name===name))return false;
    if(!stack.length){const app=document.getElementById('app');appWasInert=app.inert;app.inert=true;}
    if(current){current.root.inert=true;current.root.setAttribute('aria-hidden','true');}
    stack.push({...entry,name,trigger});entry.root.inert=false;entry.root.removeAttribute('aria-hidden');entry.root.hidden=false;entry.root.classList.add('on');
    entry.hooks.onOpen?.({tab});labelControls(entry.root);
    requestAnimationFrame(()=>{if(stack.at(-1)?.root===entry.root)(controls(entry.root)[0]||entry.root.querySelector('.sheet')).focus();});
    window.dispatchEvent(new CustomEvent('lobbysheetchange',{detail:{name,open:true}}));return true;
}
export function closeTop(reason='cancel'){
    const entry=stack.pop();if(!entry)return false;
    entry.root.hidden=true;entry.root.classList.remove('on');entry.root.inert=false;entry.hooks.onClose?.({reason});
    const current=stack.at(-1);
    if(current){current.root.inert=false;current.root.removeAttribute('aria-hidden');}
    else document.getElementById('app').inert=appWasInert;
    if(entry.trigger?.isConnected&&entry.trigger.getClientRects().length&&!entry.trigger.closest('[inert]'))entry.trigger.focus();
    else if(current)(controls(current.root)[0]||current.root.querySelector('.sheet')).focus();
    window.dispatchEvent(new CustomEvent('lobbysheetchange',{detail:{name:entry.name,open:false}}));return true;
}
export function closeAll(reason='game'){while(stack.length)closeTop(reason);}
export const isOpen=()=>stack.length>0;
document.addEventListener('keydown',e=>{
    if(!stack.length)return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeTop();return;}
    if(e.key!=='Tab')return;
    const root=stack.at(-1).root,list=controls(root),at=list.indexOf(document.activeElement);
    if(!list.length){e.preventDefault();return;}
    if(at<0||e.shiftKey&&at===0||!e.shiftKey&&at===list.length-1){e.preventDefault();list[e.shiftKey?list.length-1:0].focus();}
},true);
document.addEventListener('focusin',e=>{
    const root=stack.at(-1)?.root;if(root&&!root.contains(e.target))(controls(root)[0]||root.querySelector('.sheet')).focus();
});
new MutationObserver(()=>{if(document.getElementById('lobby').classList.contains('hidden'))closeAll();})
    .observe(document.getElementById('lobby'),{attributes:true,attributeFilter:['class']});
window.LobbySheets=Object.freeze({open,closeTop,closeAll,get isOpen(){return isOpen();}});
