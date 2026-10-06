import {wallet} from './wallet.js?v=1.9.20';
import {ACTIVITIES} from './cosmetics.js?v=1.9.20';
import {badgeSVG,RANK_BADGES} from './rank-badge.js?v=1.9.20';
import {register,open,closeTop} from './lobby-sheets.js?v=1.9.20';
import {tableAudio} from './table-audio.js?v=1.9.20';
import {sharedRank} from './shared-rank.js?v=1.9.20';
import {roomEntryURL,pendingRoomEntry,consumeRoomEntry} from './lobby-entry.js?v=1.9.20';
import {installRedeemUI} from './reward-ui.js?v=1.9.20';
import {installUpdateUI} from './app-update.js?v=1.9.20';
import {APP_VERSION} from './app-config.js?v=1.9.20';

export const icon=name=>`<svg aria-hidden="true" focusable="false"><use href="#lobby-icon-${name}"/></svg>`;
let profile={name:'牌友',avatar:1,rank:sharedRank?.snapshot().rank_state||{major:1,minor:0,stars:0},offline:window.MAHJONG_OFFLINE===true};
export function renderLobbyProfile(detail){
    profile={...profile,...detail};
    const button=document.getElementById('lobby-profile-btn');if(!button)return;
    const rank=profile.rank,major=rank.major||1,label=RANK_BADGES[major-1].name+(major===8?'':' '+['Ⅲ','Ⅱ','Ⅰ'][rank.minor||0]);
    button.querySelector('.profile-name').textContent=profile.name||'牌友';
    button.querySelector('.profile-avatar img').src='/static/assets/avatar-'+profile.avatar+'.svg';
    const compact=Math.min(innerWidth/1280,innerHeight/720)*40<36;
    document.getElementById('rank-icon').innerHTML=badgeSVG(major,{mini:compact});
    document.getElementById('rank-text').textContent=label;
    document.getElementById('rank-stars').innerHTML=major===8?'★ × '+rank.stars:
        Array.from({length:3},(_,i)=>'<span class="'+(i<rank.stars?'star-on':'star-off')+'">★</span>').join('');
    button.setAttribute('aria-label','个人信息：'+(profile.name||'牌友')+'，'+label+'，'+rank.stars+'星');
    const month=sharedRank?.snapshot().month||new Date().toISOString().slice(0,7),season=month.replace('-',' 年 ')+' 月';
    button.querySelector('.rank-season').textContent=season;
    const caption=document.getElementById('profile-season');if(caption)caption.textContent=season;
    const ranks=document.getElementById('profile-ranks');if(ranks)ranks.textContent=label+' · '+rank.stars+' 星';
    document.getElementById('offline-plaque-badge').outerHTML=badgeSVG(major).replace('<svg','<svg id="offline-plaque-badge" class="plaque-emblem"');
}
function renderBalances(state){for(const node of document.querySelectorAll('[data-wallet-balance]')){
    const before=Number(node.dataset.value??node.textContent),animate=before!==state.coupons&&state.ledger.at(-1)?.kind==='claim'&&!matchMedia('(prefers-reduced-motion:reduce)').matches;
    node.dataset.value=state.coupons;node.textContent=state.coupons;node.setAttribute('aria-label',state.coupons+' 张礼券');
    if(animate){const old=document.createElement('span'),next=document.createElement('span');old.textContent=before;next.textContent=state.coupons;
        old.className='coupon-old';next.className='coupon-new';node.replaceChildren(old,next);
        old.animate([{transform:'translateY(0)'},{transform:'translateY(-110%)'}],{duration:400,fill:'forwards'});
        next.animate([{transform:'translateY(110%)'},{transform:'translateY(0)'}],{duration:400,fill:'forwards'}).finished.then(()=>{if(node.contains(next))node.textContent=state.coupons;}).catch(()=>{});
    }
}}
wallet.subscribe(renderBalances);renderBalances(wallet.load());
window.addEventListener('resize',()=>renderLobbyProfile({}));
window.addEventListener('lobbyprofile',event=>renderLobbyProfile(event.detail));
window.addEventListener('walletnotice',event=>{
    const status=document.getElementById('status-msg');if(status)status.textContent=event.detail.message;
});
renderLobbyProfile({});

const activity=createSheet('activity','活动','',`
    <nav class="tabs">${ACTIVITIES.map(a=>`<button class="tab" data-tab="${a.id}">${icon('flag')}${a.tab}<i class="tab-reward-dot" hidden aria-label="有可领取奖励"></i></button>`).join('')}
    <button class="tab" data-tab="newcomer">${icon('coupon')}新人有礼<i class="tab-reward-dot" hidden aria-label="有可领取奖励"></i></button>
    <button class="tab" data-tab="daily">${icon('scroll')}每日任务<i class="tab-reward-dot" hidden aria-label="有可领取奖励"></i></button></nav>
    <div class="pane">${ACTIVITIES.map(a=>`<section data-pane="${a.id}"><div class="event-banner"><h3>${a.title}</h3><p>${a.description}</p><span class="period">常驻活动 · 每档仅可领取一次</span><div class="badge-big">${badgeSVG(5)}</div></div>
    <div class="milestones">${a.milestones.map(m=>`<article class="mile"><div class="badge">${badgeSVG(m.major)}</div><div><h4>${m.title}</h4><p>大段达到第${['','一','二','三','四','五','六','七','八'][m.major]}段 · 礼券 ×${m.coupons}</p><div class="prog" role="progressbar" aria-label="${m.title}登峰进度" aria-valuemin="0" aria-valuemax="${m.major}" data-milestone-progress="${m.id}"><i></i></div></div><button class="btn-claim" type="button" data-claim-milestone="${m.id}"></button></article>`).join('')}</div></section>`).join('')}
    <section data-pane="newcomer"><div class="event-banner"><h3>新人有礼</h3><p>初次同桌，一份心意</p><span class="period">常驻活动 · 仅可领取一次</span><div class="badge-big gift-emblem">${icon('coupon')}</div></div>
    <article class="mile newcomer-mile"><div class="newcomer-gift">${icon('coupon')}</div><div><h4>初聚 · 牌馆见面礼</h4><p>完成一次10/15/20局整场对局 · 礼券 ×1</p><div class="prog" role="progressbar" aria-label="新人有礼进度" aria-valuemin="0" aria-valuemax="1" data-milestone-progress="newcomer"><i></i></div></div><button class="btn-claim" type="button" data-claim-milestone="newcomer"></button></article></section>
    <section data-pane="daily" id="activity-daily-body"></section></div>`,{tabs:true,coupon:true});
const selectActivity=initTabs(activity,ACTIVITIES[0].id);
const dailyPanel=document.getElementById('daily-task-panel');dailyPanel.className='';dailyPanel.removeAttribute('role');dailyPanel.removeAttribute('aria-labelledby');
dailyPanel.querySelector('.popover-heading').hidden=true;document.getElementById('activity-daily-body').append(dailyPanel);
function renderActivity(state){
    const peak=wallet.currentMajor;let available=false;
    for(const a of ACTIVITIES){let tabAvailable=false;
        for(const m of a.milestones){const reward=wallet.rewardStatus(m.id),claimed=reward.remaining===0,ready=reward.ready;
            const button=activity.querySelector('[data-claim-milestone="'+m.id+'"]');button.textContent=claimed?'已领取':ready?(reward.paid?'补领 ×'+reward.remaining:'领取'):'未达成';button.className='btn-claim '+(ready?'ready':'wait');button.disabled=!ready;button.setAttribute('aria-label',m.title+'，'+button.textContent+'，礼券'+reward.remaining+'张');
            const progress=activity.querySelector('[data-milestone-progress="'+m.id+'"]');progress.setAttribute('aria-valuenow',String(Math.min(peak,m.major)));progress.querySelector('i').style.width=Math.min(1,peak/m.major)*100+'%';tabAvailable||=ready;
        }
        activity.querySelector('[data-tab="'+a.id+'"] .tab-reward-dot').hidden=!tabAvailable;available||=tabAvailable;
    }
    const newbie=wallet.rewardStatus('newcomer'),newButton=activity.querySelector('[data-claim-milestone="newcomer"]');
    newButton.textContent=newbie.remaining===0?'已领取':newbie.ready?'领取':'未达成';newButton.disabled=!newbie.ready;
    newButton.className='btn-claim '+(newbie.ready?'ready':'wait');newButton.setAttribute('aria-label','新人有礼，'+newButton.textContent+'，礼券1张');
    const newbieProgress=activity.querySelector('[data-milestone-progress="newcomer"]');newbieProgress.setAttribute('aria-valuenow',String(state.newcomer.completed?1:0));newbieProgress.querySelector('i').style.width=state.newcomer.completed?'100%':'0%';
    activity.querySelector('[data-tab="newcomer"] .tab-reward-dot').hidden=!newbie.ready;available||=newbie.ready;
    const dailyReady=wallet.dailyStatus().ready;activity.querySelector('[data-tab="daily"] .tab-reward-dot').hidden=!dailyReady;available||=dailyReady;
    document.getElementById('summit-dot').hidden=!available;document.getElementById('lobby-activity-btn').setAttribute('aria-label',available?'活动，有可领取奖励':'活动');
}
for(const button of activity.querySelectorAll('[data-claim-milestone]'))button.addEventListener('click',()=>{
    const result=wallet.claim(button.dataset.claimMilestone);if(result.ok)window.dispatchEvent(new CustomEvent('walletnotice',{detail:{message:'获得礼券 ×'+result.amount}}));
});
wallet.subscribe(renderActivity);renderActivity(wallet.load());
window.addEventListener('walletdaychange',()=>renderActivity(wallet.load()));
register('activity',activity,{onOpen:({tab})=>selectActivity(tab||ACTIVITIES[0].id)});
document.getElementById('lobby-activity-btn').addEventListener('click',e=>open('activity',{trigger:e.currentTarget}));

export function createSheet(name,title,eyebrow,body,{tabs=false,coupon=false}={}){
    const root=document.createElement('div');root.id=name+'-sheet';root.className='sheet-veil';root.hidden=true;
    root.innerHTML=`<section class="sheet"><header class="sheet-head"><div><div class="eyebrow"></div><h2></h2></div>
        ${coupon?'<div class="coupon">'+icon('coupon')+'<span>礼券</span><b data-wallet-balance>0</b></div>':''}
        <button class="sheet-close" type="button" data-sheet-close aria-label="关闭${title}">×</button></header>
        <div class="${tabs?'sheet-body':'pane'}">${body}</div></section>`;
    root.querySelector('h2').textContent=title;root.querySelector('.eyebrow').textContent=eyebrow;
    if(!coupon)root.querySelector('.sheet-close').style.marginLeft='auto';document.body.append(root);renderBalances(wallet.load());return root;
}
export function initTabs(root,initial){
    const buttons=[...root.querySelectorAll('[data-tab]')];
    const select=id=>{
        if(!buttons.some(b=>b.dataset.tab===id))id=initial||buttons[0]?.dataset.tab;
        for(const button of buttons)button.setAttribute('aria-selected',String(button.dataset.tab===id));
        for(const pane of root.querySelectorAll('[data-pane]'))pane.hidden=pane.dataset.pane!==id;
        root.dispatchEvent(new CustomEvent('sheettabchange',{detail:{tab:id}}));
    };
    root.querySelector('.tabs')?.setAttribute('role','tablist');
    for(const button of buttons){button.setAttribute('role','tab');button.setAttribute('aria-label',button.textContent.trim());
        button.addEventListener('click',()=>select(button.dataset.tab));
        button.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();
            const at=buttons.indexOf(button),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
            buttons[next].focus();select(buttons[next].dataset.tab);});
    }
    select(initial);return select;
}

const profileSheet=createSheet('profile','个人信息','',
    '<div id="profile-fields"></div><p class="pf-note" id="profile-season"></p><p class="pf-note" id="profile-ranks"></p>'+ 
    '<div class="actions profile-actions"><button class="btn-quiet" type="button" data-sheet-close aria-label="取消个人信息修改">取消</button>'+ 
    '<button class="btn-gold" type="button" id="profile-save-btn" aria-label="保存个人信息">保存</button></div>');
const username=document.getElementById('username'),avatars=document.getElementById('avatar-options');
const fields=profileSheet.querySelector('#profile-fields');fields.append(username.closest('.form-group'),avatars.closest('.form-group'));
username.classList.add('pf-input');username.setAttribute('aria-label','昵称，1至8个汉字或字符');
avatars.classList.add('pf-avatars');for(const button of avatars.children)button.setAttribute('aria-label','选择'+button.textContent.trim()+'头像');
let savedProfile=false;
register('profile',profileSheet,{onOpen:()=>{savedProfile=false;username.value=profile.name||'牌友';username.setCustomValidity('');renderLobbyProfile({});},
    onClose:()=>{if(!savedProfile){username.value=profile.name||'牌友';for(const b of avatars.children){const on=Number(b.dataset.avatar)===profile.avatar;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}}}});
document.getElementById('profile-save-btn').addEventListener('click',()=>{
    const checked=window.MahjongNickname.validate(username.value);username.setCustomValidity(checked.message);
    username.setAttribute('aria-invalid',String(!checked.ok));
    if(!checked.ok){username.reportValidity();return;}
    savedProfile=true;window.dispatchEvent(new CustomEvent('lobbyprofilesave',{detail:{name:checked.name,avatar:Number(avatars.querySelector('.selected')?.dataset.avatar||1)}}));closeTop('save');
});
document.getElementById('lobby-profile-btn').addEventListener('click',e=>open('profile',{trigger:e.currentTarget}));

const offline=window.MAHJONG_OFFLINE===true;
const roomSheet=createSheet(offline?'offline':'friend',offline?'离线场':'友人场','','<div id="room-sheet-fields"></div>');
const roomFields=roomSheet.querySelector('#room-sheet-fields'),roomSetup=document.getElementById('room-setup');
const createPanel=document.getElementById('create-panel'),joinPanel=document.getElementById('join-panel');
const rounds=document.getElementById('rounds-select'),createButton=document.getElementById('create-btn'),joinButton=document.getElementById('join-btn'),codeInput=document.getElementById('room-code-input');
document.getElementById('lobby-staging').append(document.getElementById('lobby-main-actions'));
const rankNote=document.getElementById('rank-note');
const segment=document.createElement('div');segment.className='seg';segment.setAttribute('role','group');segment.setAttribute('aria-label','对局局数');
rounds.hidden=true;
for(const value of [1,5,10,15,20]){const button=document.createElement('button');button.type='button';button.textContent=value;button.setAttribute('aria-label',value+'局');button.dataset.rounds=value;
    button.addEventListener('click',()=>{rounds.value=String(value);rounds.dispatchEvent(new Event('change',{bubbles:true}));});segment.append(button);}
const updateRounds=()=>{for(const b of segment.children){const on=b.dataset.rounds===rounds.value;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));}};
rounds.addEventListener('change',updateRounds);updateRounds();
createPanel.replaceChildren();createPanel.className='pane room-create';createPanel.innerHTML='<h3 class="pf-h">'+(offline?'开始离线':'创建房间')+'</h3><label class="pf-l">对局局数</label>';
createPanel.append(rounds,segment);rankNote.className='pf-note';rankNote.hidden=true;createPanel.append(rankNote,createButton);createButton.className='btn-gold';createButton.setAttribute('aria-label',offline?'开始离线牌桌':'创建牌桌');
// Keep the original button's span: the offline adapter updates its label.
createButton.innerHTML='<span>'+(offline?'开始离线练习':'创建牌桌')+'</span>';
joinPanel.replaceChildren();joinPanel.className='pane room-join';joinPanel.innerHTML='<h3 class="pf-h">加入房间</h3><label class="pf-l" for="room-code-input">六位房间号</label>';
const code=document.createElement('div');code.className='code';code.innerHTML='<span></span>'.repeat(6);codeInput.setAttribute('aria-label','六位数字房间号');codeInput.setAttribute('inputmode','numeric');codeInput.autocomplete='off';code.append(codeInput);
codeInput.addEventListener('input',()=>{const text=codeInput.value.replace(/\D/g,'').slice(0,6);[...code.querySelectorAll('span')].forEach((s,i)=>s.textContent=text[i]||'');});
joinPanel.append(code,joinButton);joinButton.className='btn-quiet';joinButton.textContent='加入牌桌';joinButton.setAttribute('aria-label','加入牌桌');
roomSetup.replaceChildren(createPanel,joinPanel);roomSetup.className='room-columns';if(offline)joinPanel.hidden=true;
roomFields.append(roomSetup,document.getElementById('room-summary'),document.getElementById('start-btn'),document.getElementById('leave-btn'));
register(offline?'offline':'friend',roomSheet);
const native=/HongzhongMahjong\//.test(navigator.userAgent);
document.getElementById('offline-plaque').addEventListener('click',e=>{if(offline)open('offline',{trigger:e.currentTarget});else location.href=roomEntryURL('offline',native);});
document.getElementById('friend-plaque').addEventListener('click',e=>{if(!offline)open('friend',{trigger:e.currentTarget});else location.href=roomEntryURL('friend',native);});
const initialEntry=pendingRoomEntry(location.href,offline);
function openInitialEntry(){
    if(!initialEntry||window.HZ_ROOM_ENTRY_HANDLED||!document.getElementById('boot-loading').classList.contains('hidden'))return;
    window.HZ_ROOM_ENTRY_HANDLED=true;
    history.replaceState(history.state,'',consumeRoomEntry(location.href));
    if(!document.getElementById('game-screen').classList.contains('hidden'))return;
    if(!window.LobbySheets.isOpen)open(initialEntry,{trigger:document.getElementById(initialEntry==='offline'?'offline-plaque':'friend-plaque')});
}
window.addEventListener('mahjongready',openInitialEntry);
openInitialEntry();

const settings=createSheet('settings','设置','',`<nav class="tabs"><button class="tab" data-tab="general">${icon('gear')}通用</button><button class="tab" data-tab="redeem">${icon('coupon')}兑换码</button><button class="tab" data-tab="rank">${icon('back')}段位图鉴</button><button class="tab" data-tab="rules">${icon('scroll')}规则</button><button class="tab" data-tab="changelog">${icon('flag')}更新日志</button></nav>
    <div class="pane"><section data-pane="general"><h3 class="pf-h">牌馆设置</h3><div class="setting-row"><span>声音</span><button class="btn-quiet" id="settings-sound-btn" type="button" aria-label="声音开关"></button></div>
    <div class="setting-row"><span>版本更新</span><button class="btn-quiet" id="settings-update-btn" type="button" aria-label="检查版本更新">检查更新</button></div>
    <p id="settings-update-status" class="pf-note" role="status" aria-live="polite"></p><p class="pf-note">当前版本：v${APP_VERSION}</p><p class="pf-note">制作者：锂电池</p></section>
    <section data-pane="redeem"><h3 class="pf-h">兑换码</h3><form id="redeem-form"><label class="pf-l" for="redeem-code-input">输入兑换码</label><div class="redeem-fields"><input id="redeem-code-input" class="pf-input" type="text" maxlength="48" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="请输入兑换码" aria-label="兑换码"><button class="btn-gold" id="redeem-submit" type="submit" aria-label="兑换物品">兑换</button></div><p id="redeem-status" class="pf-note" role="status" aria-live="polite" aria-atomic="true"></p></form></section>
    <section data-pane="rank"><div class="badge-wall">${RANK_BADGES.map((r,i)=>`<div class="badge-card"><div class="badge">${badgeSVG(i+1)}</div><b>${r.name}</b><span>第 ${i+1} 段 · ${r.sub}</span></div>`).join('')}</div><div id="settings-rank-body"></div></section>
    <section data-pane="rules" id="settings-rules-body"></section><section data-pane="changelog" id="settings-changelog-body"></section></div>`,{tabs:true});
const selectSettings=initTabs(settings,'general');
for(const [id,target]of [['rules-content','settings-rules-body'],['changelog-content','settings-changelog-body']]){
    const content=document.getElementById(id);if(content)document.getElementById(target).append(content);
}
// The existing rules use a definition list rather than a named body node.
if(!document.getElementById('rules-content')){const panel=document.getElementById('rules-panel');for(const child of [...panel.children])if(!child.classList.contains('popover-heading'))document.getElementById('settings-rules-body').append(child);}
const rankRules=document.getElementById('rank-help-content');if(rankRules)document.getElementById('settings-rules-body').append(rankRules);
document.getElementById('settings-rules-body').setAttribute('tabindex','0');
document.getElementById('settings-rules-body').setAttribute('role','region');
document.getElementById('settings-rules-body').setAttribute('aria-label','规则内容');
document.querySelector('#daily-task-panel .popover-note').hidden=true;
const soundButton=document.getElementById('settings-sound-btn'),updateSound=()=>{soundButton.textContent=tableAudio.enabled?'声音开启':'声音关闭';soundButton.setAttribute('aria-pressed',String(tableAudio.enabled));soundButton.setAttribute('aria-label',tableAudio.enabled?'声音开启，点击关闭':'声音关闭，点击开启');};
soundButton.addEventListener('click',()=>{tableAudio.unlock();tableAudio.setEnabled(!tableAudio.enabled);});window.addEventListener('tablesoundchange',updateSound);updateSound();
settings.addEventListener('sheettabchange',e=>{if(e.detail.tab==='changelog')window.dispatchEvent(new Event('lobbylogseen'));});
register('settings',settings,{onOpen:({tab})=>selectSettings(tab||'general')});
document.getElementById('lobby-settings-btn').addEventListener('click',e=>open('settings',{trigger:e.currentTarget}));
installRedeemUI(wallet);
installUpdateUI(createSheet);
renderLobbyProfile({});
