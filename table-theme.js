import {wallet} from './wallet.js?v=1.9.20';
import {COSMETICS,UPCOMING} from './cosmetics.js?v=1.9.20';
import {createSheet,initTabs,icon} from './lobby.js?v=1.9.20';
import {register,open as openSheet,closeTop} from './lobby-sheets.js?v=1.9.20';
import {seatRegion,mountTableWorld} from './table-world-layout.js?v=1.9.20';
import {createTileElement} from './tile.js?v=1.9.20';
import {DEFAULT_FACE_ID,DEFAULT_BACK_ID,faceById} from './tile-faces.js?v=1.9.20';
import {resolveTileAppearance,paintTileAppearance} from './tile-appearance.js?v=1.9.20';
import {backById} from './tile-backs.js?v=1.9.20';
import {tileBackAssets} from './tile-back-assets.js?v=1.9.20';
import {tableAudio} from './table-audio.js?v=1.9.20';
import {TABLE_THEMES, DEFAULT_THEME_ID, THEME_STORAGE_KEY, themeById} from './table-themes.js?v=1.9.20';
import {themeAssets} from './table-theme-assets.js?v=1.9.20';
import {TableDecoration, makeTableFrame} from './table-theme-layout.js?v=1.9.20';
import {applyTableView} from './table-view.js?v=1.9.20';
import {getGameAssets} from './game-assets.js?v=1.9.20';

const board = document.querySelector('#game-screen > .table');
const decorator = new TableDecoration(board);
const defaultTheme = themeById(DEFAULT_THEME_ID);
let activeTheme = defaultTheme;
let applicationTicket = 0;
let previewTicket = 0;
let selectedId = defaultTheme.id;
const candidates={tablecloth:defaultTheme.id,tileFace:DEFAULT_FACE_ID,tileBack:DEFAULT_BACK_ID};
let activeFace=DEFAULT_FACE_ID,facePreference=DEFAULT_FACE_ID,activeBack=DEFAULT_BACK_ID;
let faceApplicationTicket=0,previewReady=false;
let backApplicationTicket=0;
let open = false;
let openingPreview=false;
let dialogApplying = false;
let dialogUseTicket = 0;
let previewDecorator;
let previewFrame;
let noticeTimer;

const notice = document.createElement('div');
notice.id = 'table-theme-notice'; notice.hidden = true; notice.setAttribute('role','status');
document.body.append(notice);
function announce(message,retry) {
    notice.textContent = message; notice.hidden = false;clearTimeout(noticeTimer);
    if(retry){
        const button=document.createElement('button');button.type='button';button.textContent='重试';
        button.setAttribute('aria-label','重新加载已选装扮');button.addEventListener('click',retry);notice.append(button);
    }else noticeTimer = setTimeout(() => {notice.hidden = true;}, 4200);
}

async function preload(theme) {
    void tableAudio.preload(theme); // Audio failure/loading never holds up the table.
    await themeAssets.preload(theme);
}

function appearance(theme,faceId=activeFace,backId=activeBack){
    const result=resolveTileAppearance({theme,faceId,backId,backs:COSMETICS.tileBack});
    const url=tileBackAssets.url(backById(backId));
    if(result.back.surface&&url)result.back.surface={...result.back.surface,src:url};
    return result;
}
function paintAppearance(table,theme=activeTheme,faceId=activeFace,backId=activeBack){
    paintTileAppearance(table,appearance(theme,faceId,backId),{backReady:tileBackAssets.ready(backById(backId))});
}
function refreshAppearance(){
    paintAppearance(board);
    window.dispatchEvent(new CustomEvent('tileappearancechange',{detail:{faceId:activeFace,back:appearance(activeTheme).back}}));
    updateCurrent();
}
function paintTheme(table, theme,faceId=activeFace,backId=activeBack) {
    // The cutout strip is part of this theme's surrounding felt, not a native
    // black/green gutter. Controls/world stay inside the protected viewport.
    if(table.parentElement?.id==='game-screen')table.parentElement.style.setProperty('--game-surround',theme.colors.rim);
    paintAppearance(table,theme,faceId,backId);
    for (const [key,value] of Object.entries(theme.colors)) table.style.setProperty(`--table-${key}`,value);
    for(const [key,value]of Object.entries(theme.tableUiTokens))table.style.setProperty(`--table-ui-${key}`,value);
    for(const key of ['color','line','stitch'])table.style.setProperty(`--table-border-${key}`,theme.border[key]);
    table.style.setProperty('--table-border-width',`${theme.border.width}px`);
    table.style.setProperty('--table-border-radius',`${theme.border.radius}px`);
    table.style.setProperty('--table-fabric-image',theme.material.texture?`url("${theme.material.texture.src}")`:'none');
    table.style.setProperty('--table-fabric-opacity',theme.material.opacity);
    table.style.setProperty('--table-grain',theme.material.grain);
    table.dataset.fabricKind=theme.material.kind;
    table.dataset.tableTheme = theme.id;
}

function commitFace(id){
    ++faceApplicationTicket;activeFace=id;refreshAppearance();
}
function commitBack(id){++backApplicationTicket;activeBack=id;refreshAppearance();}
async function restoreBack(id){
    const ticket=++backApplicationTicket,back=backById(id);
    if(!back||!wallet.owned('tileBack',id))return false;
    activeBack=id;refreshAppearance();
    try{await tileBackAssets.prepare(back);}catch{
        if(ticket!==backApplicationTicket||activeBack!==id)return false;
        refreshAppearance();
        announce('牌背纹理暂未载入，先使用本款配色。已购装扮与选择仍保留。',()=>{void restoreBack(activeBack);});
        return false;
    }
    if(ticket!==backApplicationTicket||activeBack!==id)return false;
    refreshAppearance();if(notice.querySelector('button'))notice.hidden=true;return true;
}
// Startup retries can complete after a restored back has fallen back to colour.
tileBackAssets.subscribe(back=>{if(back.id===activeBack)refreshAppearance();});
async function prepareBack(id){
    try{await tileBackAssets.prepare(backById(id));return true;}
    catch(error){if(!wallet.owned('tileBack',id))throw error;return false;}
}
async function restoreFace(id){
    const ticket=++faceApplicationTicket,face=faceById(id);
    if(!face||!wallet.owned('tileFace',id))return false;
    try{await themeAssets.load(face.surface);}catch{
        if(ticket!==faceApplicationTicket)return false;
        commitFace(DEFAULT_FACE_ID);
        announce('蓝紫幻纹暂未载入，先使用经典牌面。已购装扮与选择仍保留。',()=>{void restoreFace(facePreference);});
        return false;
    }
    if(ticket!==faceApplicationTicket)return false;
    commitFace(id);if(notice.querySelector('button'))notice.hidden=true;return true;
}

function updateCurrent() {
    document.querySelectorAll('[data-table-theme-entry]').forEach(button => {
        button.title = `牌桌装扮 · 当前使用${activeTheme.name}`;
    });
    const id=category==='tablecloth'?activeTheme.id:category==='tileFace'?activeFace:activeBack;
    const item=COSMETICS[category].find(i=>i.id===id);
    current.textContent = `当前使用 · ${item?.name||activeTheme.name}`;
    updateCards(); updateUseButton();
}

async function applyTheme(id, {persist = true, restoring = false} = {}) {
    const ticket = ++applicationTicket;
    const theme = themeById(id);
    if (!theme) {
        if (restoring) {paintTheme(board, defaultTheme); activeTheme = defaultTheme; decorator.setTheme(defaultTheme); tableAudio.setTheme(defaultTheme); updateCurrent();}
        announce('这个牌桌暂不可用，已保留可用牌桌。'); return false;
    }
    try {await preload(theme);}
    catch {
        if (ticket !== applicationTicket) return false;
        if (restoring) {paintTheme(board, defaultTheme); activeTheme = defaultTheme; decorator.setTheme(defaultTheme); tableAudio.setTheme(defaultTheme); updateCurrent();}
        announce(restoring ? '装扮未能载入，先使用经典青玉。' : '装扮未能载入，保留当前牌桌，请稍后重试。');
        return false;
    }
    if (ticket !== applicationTicket) return false;
    commitTheme(theme,persist);return true;
}
function commitTheme(theme,persist=true){
    // Appearance only: do not render, replace hands, alter rules or emit game actions.
    paintTheme(board,theme);activeTheme=theme;decorator.setTheme(theme);tableAudio.setTheme(theme);updateCurrent();
    if(persist){
        // Keep the public appearance API's persisted choice compatible with the
        // wallet. Unowned QA choices remain possible without granting ownership.
        if(wallet.owned('tablecloth',theme.id)&&wallet.load().equipped.tablecloth!==theme.id)wallet.equip('tablecloth',theme.id);
        try{localStorage.setItem(THEME_STORAGE_KEY,theme.id);}catch{announce('已使用；设备未允许保存，下次打开会恢复默认牌桌。');}
    }
    window.dispatchEvent(new CustomEvent('tablethemechange',{detail:{id:theme.id,version:theme.version}}));
}


let category='tablecloth',confirming=false;
const dialog=createSheet('wardrobe','装扮','桌边的一点欢喜',`
    <nav class="tabs"><button class="tab" data-tab="tablecloth">${icon('cloth')}桌布 <small>${COSMETICS.tablecloth.length}</small></button>
    <button class="tab" data-tab="tileBack">${icon('back')}牌背 <small>${COSMETICS.tileBack.length}</small></button>
    <button class="tab" data-tab="tileFace">${icon('face')}牌面 <small>${COSMETICS.tileFace.length}</small></button></nav>
    <div class="pane wardrobe-pane"><div class="wardrobe"><div id="table-theme-choices" class="grid" role="radiogroup" aria-label="选择装扮"></div>
    <aside class="preview theme-preview-column"><div id="table-theme-preview" class="theme-preview" aria-hidden="true"></div>
    <div id="table-theme-face-samples" hidden aria-hidden="true"></div><div id="table-theme-back-samples" hidden aria-hidden="true"></div><h3 id="table-theme-preview-title"></h3><p id="table-theme-preview-status" role="status" aria-live="polite"></p>
    <div class="theme-audition" role="group" aria-label="试听牌桌声音"><span>试听</span>${[['discard','出牌'],['pong','碰'],['kong','杠'],['hu','胡']].map(([id,label])=>`<button type="button" data-theme-audition="${id}" aria-label="试听${label}音效">${label}</button>`).join('')}<button id="table-theme-sound-toggle" type="button" aria-label="声音开关"></button></div>
    <span id="table-theme-audio-status" role="status" aria-live="polite"></span><p id="table-theme-current"></p><p id="table-theme-context">只影响你的牌桌；关闭预览不会更换装扮。</p>
    <div id="theme-unlock-confirm" hidden><p id="theme-unlock-question"></p><div class="actions"><button class="btn-gold" id="theme-confirm-unlock" type="button" aria-label="确认用一张礼券永久解锁">确认解锁</button><button class="btn-quiet" id="theme-abort-unlock" type="button" aria-label="取消解锁">再想想</button></div></div>
    <button id="theme-get-coupons" class="btn-quiet" type="button" hidden aria-label="去活动领取礼券">去活动领取 →</button>
    <div class="actions"><button id="table-theme-cancel" class="btn-quiet" type="button" aria-label="取消装扮预览">取消</button><button id="table-theme-use" class="btn-gold" type="button" aria-label="使用装扮">使用</button></div></aside></div></div>`,{tabs:true,coupon:true});
dialog.id='table-theme-dialog';dialog.querySelector('h2').id='table-theme-title';
const choices=dialog.querySelector('#table-theme-choices'),current=dialog.querySelector('#table-theme-current'),preview=dialog.querySelector('#table-theme-preview');
const choiceCache=new Map();
// Keep one settled preview connected offscreen between visits. Its Shadow DOM,
// decoded images and geometry stay ready without touching the actual game.
const previewParking=document.createElement('div');
previewParking.inert=true;previewParking.setAttribute('aria-hidden','true');
previewParking.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;contain:layout style;';
document.body.append(previewParking);
const previewTitle=dialog.querySelector('#table-theme-preview-title'),previewStatus=dialog.querySelector('#table-theme-preview-status'),useButton=dialog.querySelector('#table-theme-use');
const soundToggle=dialog.querySelector('#table-theme-sound-toggle'),audioStatus=dialog.querySelector('#table-theme-audio-status');
dialog.querySelector('[data-sheet-close]').id='table-theme-close';
function updateSoundToggle(){soundToggle.textContent=tableAudio.enabled?'静音':'开启声音';soundToggle.setAttribute('aria-pressed',String(tableAudio.enabled));soundToggle.setAttribute('aria-label',tableAudio.enabled?'关闭声音':'开启声音');}
updateSoundToggle();window.addEventListener('tablesoundchange',updateSoundToggle);
soundToggle.addEventListener('click',()=>{tableAudio.unlock();tableAudio.setEnabled(!tableAudio.enabled);audioStatus.textContent=tableAudio.enabled?'声音已开启':'声音已关闭';});
dialog.querySelectorAll('[data-theme-audition]').forEach(button=>button.addEventListener('click',async()=>{
    if(!tableAudio.enabled){audioStatus.textContent='先开启声音，再试听。';return;}
    if(category!=='tablecloth')return;
    const id=selectedId,ticket=previewTicket,played=await tableAudio.preview(id,button.dataset.themeAudition);
    if(!open||ticket!==previewTicket)return;
    audioStatus.textContent=played?(tableAudio.inspect().history.at(-1)?.source==='theme'?`已试听${button.textContent}`:'已试听基础音 · 专属声音暂不可用'):'声音尚未就绪，请再次点击试听。';
}));
function updateCards(){
    for(const choice of choices.querySelectorAll('[data-item-id]')){
        const id=choice.dataset.itemId,owned=wallet.owned(category,id),using=isUsing(category,id);
        choice.classList.toggle('locked',!owned);const label=choice.querySelector('.theme-choice-state');
        label.className='theme-choice-state tag '+(using?'tag--use':owned?'tag--own':'tag--lock');
        label.textContent=using?'使用中':owned?'已拥有':'1 礼券';choice.querySelector('.lock-badge').hidden=owned;
        choice.setAttribute('aria-label',choice.querySelector('strong').textContent+'，'+label.textContent);
    }
}
function isUsing(kind,id){
    return kind==='tablecloth'?id===activeTheme.id:kind==='tileFace'?id===activeFace&&id===facePreference:
        id===activeBack;
}
function updateUseButton(){
    const id=selectedId,owned=wallet.owned(category,id),using=isUsing(category,id);
    const enough=wallet.load().coupons>=1;
    useButton.textContent=using?'使用中':wallet.readOnly?(wallet.readOnlyReason==='storage_failed'?'存储暂不可用':'当前版本不可保存'):owned?'使用':enough?'1 礼券解锁':'礼券不足';
    const waitingResource=(category==='tileFace'||category==='tileBack')&&!previewReady;
    useButton.setAttribute('aria-label',useButton.textContent);useButton.disabled=using||!owned&&!enough||wallet.readOnly||dialogApplying||waitingResource;
    const confirm=dialog.querySelector('#theme-confirm-unlock');confirm.disabled=dialogApplying||waitingResource;
    confirm.textContent=dialogApplying?'正在准备…':'确认解锁';
    dialog.querySelector('#theme-get-coupons').hidden=owned||enough;
    dialog.querySelector('#theme-unlock-confirm').hidden=!confirming;
    useButton.hidden=confirming;dialog.querySelector('#table-theme-cancel').hidden=confirming;
}
function makeChoices(){
    const cached=choiceCache.get(category);
    if(cached){
        choices.replaceChildren(...cached);
        if(category==='tileFace')for(const thumb of choices.querySelectorAll('.theme-face-thumb'))paintAppearance(thumb,activeTheme,thumb.closest('[data-item-id]').dataset.itemId);
        updateCards();return;
    }
    choices.replaceChildren();
    for(const item of COSMETICS[category]){
        const button=document.createElement('button');button.type='button';button.className='item theme-choice';button.dataset.itemId=item.id;
        if(category==='tablecloth')button.dataset.themeId=item.id;
        if(category==='tileFace')button.dataset.faceId=item.id;
        if(category==='tileBack')button.dataset.backId=item.id;
        button.setAttribute('role','radio');button.setAttribute('aria-checked',String(item.id===selectedId));
        button.innerHTML=`<span class="thumb theme-choice-thumb"></span><span class="lock-badge" aria-hidden="true">${icon('lock')}</span><span class="meta"><strong></strong><span class="theme-choice-state"></span></span>`;
        const thumb=button.querySelector('.thumb');if(category==='tileBack')thumb.classList.add('theme-back-thumb');
        if(item.thumb){const image=document.createElement('img');image.src=item.thumb;image.alt='';image.addEventListener('error',()=>image.hidden=true);thumb.append(image);}
        else if(category==='tileFace'){
            thumb.classList.add('theme-face-thumb');paintAppearance(thumb,activeTheme,item.id);
            thumb.append(createTileElement(40));
        }else thumb.innerHTML=icon('back');
        button.querySelector('strong').textContent=item.name;
        button.addEventListener('click',()=>{void selectItem(category,item.id);});choices.append(button);
    }
    for(let i=0;i<UPCOMING[category];i++){const item=document.createElement('div');item.className='item soon';item.innerHTML='<span class="thumb">敬请期待</span><span class="meta"><strong>'+(category==='tablecloth'?'新桌布筹备中':category==='tileBack'?'新牌背':'新牌面')+'</strong></span>';choices.append(item);}
    choiceCache.set(category,[...choices.children]);updateCards();
}
function resetConfirm(){++dialogUseTicket;dialogApplying=false;confirming=false;updateUseButton();}
const selectTab=initTabs(dialog,'tablecloth');
dialog.addEventListener('sheettabchange',e=>{
    category=e.detail.tab;selectedId=candidates[category];makeChoices();updateCurrent();
    if(open){resetConfirm();void selectItem(category,selectedId);}
});
wallet.subscribe(state=>{
    const changed=facePreference!==state.equipped.tileFace;
    const backChanged=activeBack!==state.equipped.tileBack;
    facePreference=state.equipped.tileFace;
    if(backChanged)void restoreBack(state.equipped.tileBack);
    if(changed)void restoreFace(facePreference);
    else refreshAppearance();
    updateCurrent();
});

function resizePreview() {
    if (!previewFrame||previewFrame.host.parentElement!==preview) return;
    const maxHeight = parseFloat(getComputedStyle(preview).getPropertyValue('--preview-height')) || 260;
    const width = previewFrame.screen.offsetWidth, height = previewFrame.screen.offsetHeight;
    if(!width||!height||!preview.clientWidth)return;
    const scale = Math.min(preview.clientWidth / width, maxHeight / height);
    const transform=`scale(${Number(scale.toFixed(6))})`,left=`${Number(((preview.clientWidth-width*scale)/2).toFixed(3))}px`;
    const nextHeight=`${Math.ceil(height * scale)}px`;
    // Observe the panel, not the height written here. Stable scrollbar space
    // and idempotent writes break the width/height/overflow feedback loop.
    if(previewFrame.host.style.transform!==transform)previewFrame.host.style.transform=transform;
    if(previewFrame.host.style.left!==left)previewFrame.host.style.left=left;
    if(preview.style.height!==nextHeight)preview.style.height=nextHeight;
}
new ResizeObserver(resizePreview).observe(preview.parentElement);

const previewTile = value => createTileElement(value,{pose:'flat'});

function showPreview(theme,faceId=activeFace,backId=activeBack) {
    const width = board.clientWidth || innerWidth, height = board.clientHeight || innerHeight;
    if(previewFrame&&previewFrame.width===width&&previewFrame.height===height){
        if(open&&previewFrame.host.parentElement!==preview)preview.append(previewFrame.host);
        const changedTheme=previewFrame.table.dataset.tableTheme!==theme.id;
        const material=()=>[previewFrame.table.dataset.tileBackId,previewFrame.table.dataset.tileBackTexture,
            previewFrame.table.dataset.tileBackVersion,previewFrame.table.style.getPropertyValue('--tile-back-color'),previewFrame.table.style.getPropertyValue('--tile-back-dark')].join('|');
        const target=appearance(theme,faceId,backId),ready=tileBackAssets.ready(backById(backId));
        const unchanged=!changedTheme&&previewFrame.table.dataset.tileFace===target.faceId
            &&previewFrame.table.dataset.tileBackId===target.backId
            &&previewFrame.table.dataset.tileBackTexture===(ready?target.back.surface?.src||'':'');
        if(unchanged){resizePreview();preview.removeAttribute('aria-busy');return;}
        const before=material();
        paintTheme(previewFrame.table,theme,faceId,backId);
        // Faces/backs change material only: keep the production tile DOM,
        // settled avatar sizes and camera instead of showing an unlaid clone.
        if(changedTheme||before!==material())applyTableView(previewFrame.table,width,height);
        if(changedTheme)previewDecorator.setTheme(theme);
        resizePreview();preview.removeAttribute('aria-busy');return;
    }
    previewDecorator?.destroy(); preview.replaceChildren();
    previewFrame = makeTableFrame(board, width, height); previewFrame.host.className = 'theme-preview-frame';
    previewFrame.width=width;previewFrame.height=height;
    const frame=previewFrame;frame.host.style.visibility='hidden';
    // Demonstration tiles and players only live inside the isolated preview shadow tree.
    for (const [i,player] of [...previewFrame.table.querySelectorAll('.player')].entries()) {
        const avatar = player.querySelector('.avatar'); avatar.replaceChildren();
        const art = document.createElement('div'); art.className = 'avatar-art';
        const img = document.createElement('img'); img.src = `/static/assets/avatar-${i+1}.svg`; img.alt = ''; art.append(img);
        const info = document.createElement('div'); info.className = 'player-info';
        const name = document.createElement('div'); name.className = 'player-name'; name.textContent = ['听雨','归云','望山','你'][i];
        const rank = document.createElement('div'); rank.className = 'player-rank'; rank.textContent = '试刀者 Ⅲ · 1 星';
        const score = document.createElement('div'); score.className = 'player-score'; score.textContent = i === 3 ? '+6' : '0'; info.append(name,rank,score); avatar.append(art,info);
        seatRegion(player,'discards').replaceChildren(...[11,13,25,32,36,19,22,40,17,25,34,39].map(previewTile));
        seatRegion(player,'melds').replaceChildren();
        const back = seatRegion(player,'hand-back'); if (back) back.replaceChildren(...Array.from({length:13},()=>createTileElement(null,{pose:'back-stand'})));
    }
    previewFrame.table.querySelector('.hand').replaceChildren(...[11,12,13,17,17,17,22,23,24,34,35,36,40,40].map(value=>createTileElement(value)));
    previewFrame.table.querySelector('#round-info').textContent = '第 1 / 5 局';
    previewFrame.table.querySelector('#wall-count').textContent = '32';
    previewFrame.table.querySelector('#current-turn').textContent = '轮到你出牌';
    previewFrame.table.querySelector('#hand-hint').textContent = '示意手牌 · 装扮只改变你的桌面';
    previewFrame.table.querySelectorAll('#actions-panel,#ting-status,#quick-chat-panel,#reveal-center').forEach(e => e.classList.add('hidden'));
    previewFrame.table.querySelectorAll('#kong-picker,.chat-bubble').forEach(e => e.remove());
    paintTheme(previewFrame.table, theme,faceId,backId); (open?preview:previewParking).append(previewFrame.host);
    resizePreview();applyTableView(frame.table,width,height);
    previewDecorator = new TableDecoration(frame.table); previewDecorator.setTheme(theme);
    if(!open){
        previewDecorator.measure();frame.host.style.removeProperty('visibility');return;
    }
    // The connected Shadow DOM now has actual CSS/geometry. Never expose the
    // clone's initial default slots while its first decoration pass is pending.
    requestAnimationFrame(()=>{
        if(previewFrame!==frame||!open)return;
        previewDecorator.measure();frame.host.style.removeProperty('visibility');
        preview.removeAttribute('aria-busy');
    });
}

function showLoadingPreview(theme) {
    preview.dataset.previewTheme=theme.id;
    preview.setAttribute('aria-busy','true');
    if(previewFrame)return;
    previewDecorator?.destroy();previewDecorator=null;previewFrame=null;preview.replaceChildren();
    preview.style.height='';
    const image=document.createElement('img');image.className='theme-loading-preview';image.alt=theme.name+'整桌预览';
    if(theme.thumbnail)image.src=theme.thumbnail.src;
    image.addEventListener('error',()=>{image.hidden=true;});
    preview.style.backgroundColor=theme.colors.center;preview.append(image);
}



async function selectItem(kind,id){
    const item=COSMETICS[kind]?.find(i=>i.id===id);if(!item||kind!==category)return;
    const afterOpen=openingPreview;openingPreview=false;
    tableAudio.stop('preview');audioStatus.textContent='';selectedId=id;candidates[kind]=id;confirming=false;previewReady=false;
    ++dialogUseTicket;dialogApplying=false;const ticket=++previewTicket;
    const theme=kind==='tablecloth'?themeById(id):activeTheme;
    const faceId=kind==='tileFace'?id:activeFace,backId=kind==='tileBack'?id:activeBack;
    for(const choice of choices.querySelectorAll('[data-item-id]')){const selected=choice.dataset.itemId===id;choice.setAttribute('aria-checked',String(selected));choice.tabIndex=selected?0:-1;}
    dialog.querySelector('.theme-audition').hidden=kind!=='tablecloth';audioStatus.hidden=kind!=='tablecloth';
    const samples=dialog.querySelector('#table-theme-face-samples');samples.hidden=kind!=='tileFace';samples.replaceChildren();
    const backSamples=dialog.querySelector('#table-theme-back-samples');backSamples.hidden=true;backSamples.replaceChildren();
    if(kind==='tileFace'){
        paintAppearance(samples,theme,faceId,backId);
        samples.append(...[15,28,38,40].map(value=>createTileElement(value)));
    }
    previewTitle.textContent=item.name;previewStatus.textContent='正在准备本地素材…';showLoadingPreview(theme);updateUseButton();
    let textureReady=true;
    try{const results=await Promise.all([preload(theme),themeAssets.load(faceById(faceId).surface),prepareBack(backId)]);textureReady=results[2];}catch{
        if(ticket===previewTicket&&open){preview.removeAttribute('aria-busy');previewStatus.textContent='素材暂不可用，礼券未扣除。请重新选择并重试。';updateUseButton();}return;
    }
    // Let the sheet's buttons and catalogue paint before the browser restyles
    // the large cached SVG preview. Selection/transaction tickets still gate
    // every continuation, including cancellation during these two frames.
    if(afterOpen)await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(ticket!==previewTicket||!open||kind!==category)return;
    showPreview(theme,faceId,backId);previewReady=true;
    if(kind==='tileBack'){
        paintAppearance(backSamples,theme,faceId,backId);backSamples.hidden=false;
        backSamples.append(createTileElement(null,{pose:'back-stand'}),...[0,90,180,270].map(rot=>createTileElement(null,{pose:'back-flat',rot})));
    }
    previewStatus.textContent=textureReady?item.subtitle+(item.description?' · '+item.description:''):'纹理暂不可用，使用本款稳定配色；已购选择保留。';
    updateUseButton();
}
function cleanupDialog(){
    tableAudio.stop('preview');open=false;++previewTicket;++dialogUseTicket;
    if(dialogApplying){++applicationTicket;dialogApplying=false;}
    if(previewFrame)previewParking.append(previewFrame.host);
    preview.replaceChildren();confirming=false;previewReady=false;
}
register('wardrobe',dialog,{onOpen:()=>{
    open=true;openingPreview=true;candidates.tablecloth=activeTheme.id;candidates.tileFace=facePreference;candidates.tileBack=activeBack;
    selectTab('tablecloth');updateCurrent();
},onClose:cleanupDialog});
function openDialog(){
    if(open||!document.getElementById('game-screen').classList.contains('hidden')||document.body.classList.contains('landscape-blocked'))return;
    openSheet('wardrobe');
}
function closeDialog(){if(open)closeTop();}
document.querySelectorAll('[data-table-theme-entry]').forEach(button=>button.addEventListener('click',openDialog));
dialog.querySelector('#table-theme-cancel').addEventListener('click',closeDialog);
dialog.querySelector('#theme-abort-unlock').addEventListener('click',()=>{resetConfirm();useButton.focus();});
dialog.querySelector('#theme-get-coupons').addEventListener('click',()=>{tableAudio.stop('preview');openSheet('activity',{tab:'summit'});});
async function useSelected(unlock=false){
    const kind=category,id=selectedId,ticket=++dialogUseTicket;dialogApplying=true;updateUseButton();
    const theme=kind==='tablecloth'?themeById(id):activeTheme,faceId=kind==='tileFace'?id:activeFace,backId=kind==='tileBack'?id:activeBack;
    try{await Promise.all([preload(theme),themeAssets.load(faceById(faceId).surface),prepareBack(backId)]);}catch{
        if(!open||ticket!==dialogUseTicket||id!==selectedId||kind!==category)return;
        dialogApplying=false;previewStatus.textContent='应用失败，礼券未扣除。请检查连接后重试。';updateUseButton();return;
    }
    if(!open||ticket!==dialogUseTicket||id!==selectedId||kind!==category)return;
    const equipped=unlock?wallet.unlockAndEquip(kind,id):wallet.equip(kind,id);
    if(!equipped.ok){dialogApplying=false;announce('装扮未能保存，礼券未扣除。请重试。');updateUseButton();return;}
    if(kind==='tablecloth')commitTheme(theme);
    else if(kind==='tileFace')commitFace(id);
    else commitBack(id);
    dialogApplying=false;closeDialog();
}
useButton.addEventListener('click',()=>{
    if(dialogApplying||useButton.disabled)return;
    if(wallet.owned(category,selectedId)){void useSelected();return;}
    if(wallet.load().coupons<1)return;
    confirming=true;dialog.querySelector('#theme-unlock-question').textContent='用 1 张礼券永久解锁「'+COSMETICS[category].find(i=>i.id===selectedId).name+'」？';updateUseButton();dialog.querySelector('#theme-confirm-unlock').focus();
});
dialog.querySelector('#theme-confirm-unlock').addEventListener('click',()=>{if(confirming&&!dialogApplying&&!dialog.querySelector('#theme-confirm-unlock').disabled)void useSelected(true);});
choices.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();
    const items=[...choices.querySelectorAll('[data-item-id]')],at=items.indexOf(document.activeElement);
    const next=e.key==='Home'?0:e.key==='End'?items.length-1:(at+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+items.length)%items.length;
    items[next]?.click();items[next]?.focus();
});
window.TableTheme=Object.freeze({get id(){return activeTheme.id;},get isOpen(){return open;},open:openDialog,close:closeDialog,apply:applyTheme,
    setDebug:enabled=>decorator.setDebug(enabled),inspect:()=>decorator.inspect(),setView:mode=>decorator.setView(mode),setArtworkVisible:enabled=>decorator.setArtworkVisible(enabled)});
makeChoices();paintTheme(board,defaultTheme);decorator.setTheme(defaultTheme);updateCurrent();
let legacy;try{legacy=localStorage.getItem(THEME_STORAGE_KEY);}catch{}
const state=wallet.load();let preference=state.equipped.tablecloth;
facePreference=state.equipped.tileFace;activeBack=state.equipped.tileBack;
if(facePreference!==DEFAULT_FACE_ID)void restoreFace(facePreference);
else paintAppearance(board);
if(activeBack!==DEFAULT_BACK_ID)void restoreBack(activeBack);
if(legacy&&themeById(legacy)&&!wallet.owned('tablecloth',legacy)){
    preference=DEFAULT_THEME_ID;if(!wallet.readOnly)wallet.equip('tablecloth',DEFAULT_THEME_ID);
    try{localStorage.setItem(THEME_STORAGE_KEY,DEFAULT_THEME_ID);}catch{}
    announce('这款桌布尚未解锁，已换回经典青玉');
}
if(preference!==DEFAULT_THEME_ID)void applyTheme(preference,{persist:false,restoring:true});
if(new URLSearchParams(location.search).get('table-safe')==='1')decorator.setDebug(true);
window.addEventListener('walletnotice',e=>announce(e.detail.message));
window.TileAppearance=Object.freeze({get id(){return activeFace;},get preference(){return facePreference;},
    get backId(){return activeBack;},inspect:()=>appearance(activeTheme),
    retry:()=>Promise.all([restoreFace(facePreference),restoreBack(activeBack)])});

// All runtime images are already covered by the startup queue. Build and settle
// the heavier preview while that queue still owns the loading screen, so the
// first wardrobe click does not pay for a table clone or capacity layout.
let previewWarmed=false;
getGameAssets(tableAudio).subscribe(info=>{
    if(previewWarmed||info.status!=='ready')return;
    previewWarmed=true;
    if(!open&&document.getElementById('game-screen').classList.contains('hidden')
        &&!document.body.classList.contains('landscape-blocked'))showPreview(activeTheme,activeFace,activeBack);
});
