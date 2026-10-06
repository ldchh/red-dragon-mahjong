/* 单一设备段位账本。离线只提交带序号的增减星，服务端回执可重复重放。 */
(function(root){
    'use strict';
    const P=typeof module!=='undefined'&&module.exports?require('./offline/progression.js'):root.MahjongOfflineProgression;
    const clone=v=>JSON.parse(JSON.stringify(v)),initial=P.initialRank,normalize=P.normalizeRank,apply=P.applyRankDelta;
    const validMonth=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(s);
    const higher=(a,b)=>{a=normalize(a||{});b=normalize(b||{});return [a.major-b.major,a.minor-b.minor,a.stars-b.stars].find(n=>n!==0)>0?a:b;};
    class SharedRank {
        constructor({storage,clock=()=>new Date(),monthKey=date=>P.localDate(date).slice(0,7),legacy=()=>({}),id=()=>crypto.randomUUID()}){
            Object.assign(this,{storage,clock,monthKey});this.listeners=new Set();
            const raw=storage.read();let saved=typeof raw==='string'?JSON.parse(raw):raw;
            if(saved&&saved.version!==1)throw Error('段位存档版本无法读取，请保留应用数据。');
            if(saved){this.validate(saved);this.data=clone(saved);}
            else{
                const old=legacy(),month=monthKey(clock()),offline=old.offline?.month===month?old.offline.rank_state:initial();
                const rank=higher(old.online,offline);
                this.commit({version:1,device:id(),month,rank_state:rank,seed:{month,rank_state:rank},
                    history:clone(old.offline?.history||[]),sequence:0,pending:[],seen:(old.offline?.rank_effects||[]).map(e=>e.id),
                    remote:{revision:-1},token:old.token||null});
            }
            this.calendar();
        }
        validate(d){if(!validMonth(d.month)||!d.rank_state||!d.device||!Array.isArray(d.pending)||!Array.isArray(d.seen)||!Array.isArray(d.history)||!Number.isSafeInteger(d.sequence))throw Error('段位存档无法读取，请保留应用数据。');}
        commit(next){this.storage.write(clone(next));this.data=clone(next);for(const fn of this.listeners)fn(this.snapshot());}
        refresh(){const raw=this.storage.read();if(raw!=null){const next=typeof raw==='string'?JSON.parse(raw):raw;if(next.version!==1)throw Error('段位存档版本无法读取');this.validate(next);this.data=clone(next);}this.calendar();return this.snapshot();}
        calendar(){const month=this.monthKey(this.clock());if(month===this.data.month)return false;
            const next=clone(this.data),old={month:next.month,rank_state:clone(next.rank_state),recorded_at:this.clock().toISOString()};
            next.history=[old,...next.history.filter(e=>e.month!==old.month)];next.month=month;next.rank_state=initial();this.commit(next);return true;}
        snapshot(){return clone(this.data);}
        bindToken(candidate){this.refresh();if(this.data.token)return this.data.token;if(typeof candidate!=='string'||candidate.length<8)throw Error('段位身份无法读取');const next=this.snapshot();next.token=candidate;this.commit(next);return candidate;}
        effects(effects=[]){this.refresh();const next=this.snapshot(),results={},seen=new Set(next.seen);let changed=false;
            for(const e of effects){if(!e||typeof e.id!=='string'||!validMonth(e.month)||!Number.isInteger(e.delta)||e.delta<-3||e.delta>3||!['match','daily'].includes(e.kind))throw Error('段位结算无法读取');
                if(seen.has(e.id))continue;if(next.pending.length>=4096)throw Error('段位待同步记录已满，请联网后重试');
                const archived=next.history.find(h=>h.month===e.month),current=e.month===next.month;
                const before=clone(current?next.rank_state:archived?.rank_state||initial()),after=apply(before,e.delta);
                if(current)next.rank_state=after;
                else if(archived)archived.rank_state=after;
                else next.history.push({month:e.month,rank_state:after,recorded_at:this.clock().toISOString()});
                next.sequence++;next.pending.push({seq:next.sequence,month:e.month,delta:e.delta,kind:e.kind});
                next.seen.push(e.id);seen.add(e.id);next.seen=next.seen.slice(-4096);results[e.id]={before,after};changed=true;
            }
            if(changed)this.commit(next);return results;
        }
        packet(offsetMinutes=0){this.refresh();const d=this.data;return {version:1,device:d.device,month:d.month,seed:d.seed,
            revision:d.remote.revision,utc_offset_minutes:offsetMinutes,clock_ms:this.clock().getTime(),events:clone(d.pending.slice(0,256))};}
        receive(reply){this.refresh();if(!reply||reply.version!==1||reply.device!==this.data.device||!validMonth(reply.month)||!Number.isSafeInteger(reply.revision)||!Number.isSafeInteger(reply.ack))throw Error('段位同步回执无法读取');
            if(reply.revision<this.data.remote.revision)return false;
            const next=this.snapshot();next.pending=next.pending.filter(e=>e.seq>reply.ack);
            if(reply.month===next.month){next.rank_state=normalize(reply.rank_state);for(const e of next.pending)if(e.month===next.month)next.rank_state=apply(next.rank_state,e.delta);}
            // 跨月旧回执仅确认已提交记录，不能把上月段位恢复到新赛季。
            next.remote={revision:reply.revision,month:reply.month};
            const history=clone(reply.history||[]);
            if(reply.month!==next.month)history.push({month:reply.month,rank_state:normalize(reply.rank_state),recorded_at:this.clock().toISOString()});
            for(const e of history)if(validMonth(e.month)&&e.month!==next.month){
                e.rank_state=normalize(e.rank_state);for(const pending of next.pending)if(pending.month===e.month)e.rank_state=apply(e.rank_state,pending.delta);
                next.history=[clone(e),...next.history.filter(h=>h.month!==e.month)];
            }
            next.history.sort((a,b)=>b.month.localeCompare(a.month));
            this.commit(next);return true;
        }
        subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
    }
    root.MahjongSharedRank={SharedRank,higher};if(typeof module!=='undefined'&&module.exports)module.exports=root.MahjongSharedRank;
})(globalThis);
