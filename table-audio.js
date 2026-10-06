import {themeById,DEFAULT_THEME_ID} from './table-themes.js?v=1.9.20';

const SOUND_KEY='hz_sound_v1';
const normalize=kind=>kind==='zi_mo'?'hu':kind;
const BASIC={discard:[[460,.08,'square',.05,390,0]],pong:[[520,.1,'triangle',.07,null,0],[620,.1,'triangle',.07,null,.085]],
    kong:[[350,.11,'sawtooth',.075,null,0],[280,.12,'sawtooth',.075,null,.095],[220,.14,'sawtooth',.075,null,.19]],
    hu:[[660,.14,'sine',.075,null,0],[880,.18,'sine',.085,null,.11]],
    chat:[[720,.07,'triangle',.05,null,0],[960,.07,'triangle',.05,null,.065]],
    prompt:[[880,.06,'sine',.05,null,0],[1175,.08,'sine',.05,null,.07]]};

export class ThemeAudio {
    constructor() {
        this.theme=themeById(DEFAULT_THEME_ID);this.ctx=null;this.cache=new Map();this.nodes=new Set();
        this.epoch=0;this.previewTicket=0;this.history=[];this.enabled=true;
        try {this.enabled=localStorage.getItem(SOUND_KEY)!=='off';}catch {}
        this.onGesture=()=>{if(this.enabled&&!document.hidden)this.unlock();};
        document.addEventListener('pointerdown',this.onGesture,{capture:true,passive:true});
        document.addEventListener('keydown',this.onGesture,true);
        document.addEventListener('visibilitychange',()=>{if(document.hidden)this.stop();});
        window.addEventListener('pagehide',()=>this.stop());
    }
    context() {
        if(!this.ctx||this.ctx.state==='closed'){try {const C=window.AudioContext||window.webkitAudioContext;if(C)this.ctx=new C();}catch {}}
        return this.ctx;
    }
    unlock() {const ctx=this.context();if(this.enabled&&ctx&&ctx.state!=='running'&&ctx.state!=='closed')ctx.resume().catch(()=>{});return ctx;}
    setEnabled(enabled) {
        this.enabled=Boolean(enabled);this.stop();
        try {localStorage.setItem(SOUND_KEY,this.enabled?'on':'off');}catch {}
        if(this.enabled)this.unlock();
        window.dispatchEvent(new CustomEvent('tablesoundchange',{detail:{enabled:this.enabled}}));
    }
    load(asset) {
        const existing=this.cache.get(asset.src);
        if(existing&&existing.status!=='failed')return existing.promise;
        const entry={status:'loading',buffer:null,promise:null};this.cache.set(asset.src,entry);
        entry.promise=(async()=>{
            const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),5000);
            try {
                const ctx=this.context();if(!ctx)throw Error('Web Audio unavailable');
                const response=await fetch(asset.src,{signal:controller.signal,cache:'force-cache'});
                if(!response.ok)throw Error('Audio unavailable');
                const bytes=await response.arrayBuffer();if(bytes.byteLength>512*1024)throw Error('Audio exceeds budget');
                // The same deadline bounds decoding as well as fetch. A decode result
                // from a late load stays in its own cache entry, never in active selection.
                const buffer=await Promise.race([ctx.decodeAudioData(bytes),new Promise((_,reject)=>{
                    if(controller.signal.aborted)reject(Error('Audio timeout'));
                    else controller.signal.addEventListener('abort',()=>reject(Error('Audio timeout')),{once:true});
                })]);
                if(buffer.duration<.04||buffer.duration>2.5)throw Error('Audio duration');
                entry.status='ready';entry.buffer=buffer;return buffer;
            }catch {entry.status='failed';return null;}finally {clearTimeout(timeout);}
        })();return entry.promise;
    }
    preload(theme) {return Promise.all([...new Set(Object.values(theme.soundPack?.events||{}))].map(a=>this.load(a)));}
    setTheme(theme) {this.stop();this.theme=theme;void this.preload(theme);}
    stop(channel=null) {
        if(!channel){++this.epoch;++this.previewTicket;}
        else if(channel==='preview')++this.previewTicket;
        for(const item of [...this.nodes])if(!channel||item.channel===channel){
            try {item.source.stop();}catch {}item.source.disconnect();item.gain.disconnect();this.nodes.delete(item);
        }
    }
    track(source,gain,channel,kind) {
        const item={source,gain,channel,kind};this.nodes.add(item);
        source.onended=()=>{source.disconnect();gain.disconnect();this.nodes.delete(item);};
        return item;
    }
    record(kind,channel,theme,source,path=null) {
        const detail={kind,channel,theme:theme.id,source,path,time:performance.now()};
        this.history.push(detail);if(this.history.length>180)this.history.shift();
        window.dispatchEvent(new CustomEvent('tableactionsound',{detail}));
    }
    basic(ctx,kind,channel) {
        const notes=BASIC[normalize(kind)];if(!notes)return false;
        const now=ctx.currentTime;
        // Schedule on the audio clock, not setTimeout: stopping/muting also stops
        // future notes, so stale sequences cannot wake after theme or tab changes.
        for(const [freq,duration,type,volume,sweep,offset]of notes){
            const source=ctx.createOscillator(),gain=ctx.createGain(),at=now+offset;
            source.type=type;source.frequency.setValueAtTime(freq,at);
            if(sweep)source.frequency.exponentialRampToValueAtTime(sweep,at+duration);
            gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.015);
            gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
            source.connect(gain);gain.connect(ctx.destination);this.track(source,gain,channel,kind);
            source.start(at);source.stop(at+duration+.01);
        }return true;
    }
    play(kind,{theme=this.theme,channel='action'}={}) {
        const ctx=this.context();
        if(!this.enabled||document.hidden||!ctx||ctx.state!=='running')return false;
        if(!BASIC[normalize(kind)])return false;
        if(channel==='preview')this.stop('preview');
        if(normalize(kind)==='hu')this.stop(channel);
        // Bound mixing without a delayed queue. Keep important sounds; discard
        // the oldest ordinary node if a very fast stream fills the budget.
        while(this.nodes.size>5){const item=[...this.nodes].find(n=>normalize(n.kind)!=='hu')||[...this.nodes][0];
            try{item.source.stop();}catch{}item.source.disconnect();item.gain.disconnect();this.nodes.delete(item);}
        const asset=theme.soundPack?.events?.[kind],buffer=asset&&this.cache.get(asset.src)?.buffer;
        if(buffer){
            const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
            gain.gain.value=asset.gain;source.connect(gain);gain.connect(ctx.destination);
            this.track(source,gain,channel,kind);source.start();
            this.record(kind,channel,theme,'theme',asset.src);return true;
        }
        const played=this.basic(ctx,kind,channel);if(played)this.record(kind,channel,theme,'basic');return played;
    }
    async preview(id,kind) {
        if(!this.enabled)return false;
        const theme=themeById(id);if(!theme)return false;
        this.stop('preview');const ticket=this.previewTicket,epoch=this.epoch;
        const ctx=this.unlock();if(ctx?.state==='suspended')await ctx.resume().catch(()=>{});
        await this.preload(theme);
        if(ticket!==this.previewTicket||epoch!==this.epoch)return false;
        return this.play(kind,{theme,channel:'preview'});
    }
    inspect() {return {theme:this.theme.id,enabled:this.enabled,state:this.ctx?.state||'uncreated',activeNodes:this.nodes.size,
        cache:[...this.cache].map(([src,e])=>({src,status:e.status,duration:e.buffer?.duration})),history:this.history.slice()};}
}
export const tableAudio=new ThemeAudio();
// Read-only diagnostics plus an explicit audition use the production playback path.
window.TableAudio=Object.freeze({inspect:()=>tableAudio.inspect(),preview:(id,kind)=>tableAudio.preview(id,kind)});
