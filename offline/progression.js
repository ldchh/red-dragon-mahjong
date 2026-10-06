/* 本机段位与每日任务。日期始终使用设备所在时区的自然日、自然月。 */
(function (root) {
    'use strict';
    const clone = value => JSON.parse(JSON.stringify(value));
    const TASKS = [
        {id: 'finish_rank_match', target: 1, reward: 1},
        {id: 'first_in_rank_match', target: 1, reward: 2},
        {id: 'clean_hu_three', target: 3, reward: 2},
        {id: 'friend_rank_match', target: 1, reward: 2}
    ];
    const initialRank = () => ({major: 1, minor: 0, stars: 0});
    function localDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    function normalizeRank(input = {}) {
        const integer = (value, fallback) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
        const major = Math.max(1, Math.min(8, integer(input.major, 1)));
        return {major, minor: major === 8 ? 0 : Math.max(0, Math.min(2, integer(input.minor, 0))),
            stars: Math.max(0, Math.min(major === 8 ? Number.MAX_SAFE_INTEGER : 3, integer(input.stars, 0)))};
    }
    function applyRankDelta(before, delta) {
        const now = normalizeRank(before);
        for (let i = 0; i < Math.abs(delta); i++) {
            if (delta > 0) {
                if (now.major === 8 || now.stars < 3) now.stars++;
                else {
                    now.stars = 0;
                    if (now.minor < 2) now.minor++;
                    else { now.major++; now.minor = 0; }
                }
            } else if (now.stars > 0) now.stars--;
            else if (now.major === 8) { now.major = 7; now.minor = 2; now.stars = 3; }
            else if (now.minor > 0) { now.minor--; now.stars = 3; }
            else if (now.major > 1) { now.major--; now.minor = 2; now.stars = 3; }
        }
        return now;
    }
    function placement(totals, seat = 0) {
        return [0, 1, 2, 3].sort((a, b) => Number(totals[b] || 0) - Number(totals[a] || 0) || a - b).indexOf(seat) + 1;
    }
    function baseDelta(place, score) {
        return place === 1 ? 2 : place === 2 ? (score > 0 ? 1 : 0) : place === 3 ? (score < 0 ? -1 : 0) : -2;
    }
    // 没有 mode 的旧调用和旧存档继续按原三档规则结算。
    const supportsProgression = (level, mode = 'legacy') => mode === 'rank'
        ? Number.isInteger(level) && level >= 1 && level <= 8
        : mode === 'legacy' && [6, 8].includes(level);
    const eligible = (level, rounds, mode = 'legacy') => supportsProgression(level, mode) && [10, 15, 20].includes(rounds);
    const freshDaily = date => ({date, tasks: TASKS.map(task => ({id: task.id, progress: 0, done: false, claimed: false}))});
    class OfflineProgression {
        constructor(saved = null, clock = () => new Date(), deviceClock = null, shared = null) {
            this.clock = clock;
            this.setDeviceClock(deviceClock);
            if (saved && (saved.version !== 1 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(saved.month)
                || !saved.rank_state || !Array.isArray(saved.history) || !Array.isArray(saved.receipts))) {
                throw new Error('本机段位存档无法读取，请保留应用数据后重试。');
            }
            const today = this.todayKey();
            this.data = saved ? clone(saved) : {version: 1, month: today.slice(0, 7), rank_state: initialRank(),
                daily_tasks: freshDaily(today), history: [], receipts: []};
            this.data.rank_state = normalizeRank(this.data.rank_state);
            this.data.rank_effects ||= [];
            const legacyReceipt=this.data.receipts.slice().reverse().find(r=>r.outcome?.eligible);
            this.data.completed_match ||= legacyReceipt
                ? {id:legacyReceipt.id,rounds:null,completed:true,legacy_ranked:true}:null;
            this.data.completed_match_events = (Array.isArray(this.data.completed_match_events)?this.data.completed_match_events:[])
                .filter(m=>m&&typeof m.id==='string'&&[10,15,20].includes(m.rounds)&&m.completed===true&&/^\d{4}-\d{2}-\d{2}$/.test(m.date)).slice(-128);
            this.shared = !!shared;
            if (shared) this.adoptRank(shared);
            this.ensureCalendar();
        }
        adoptRank(shared) {
            this.shared = true;
            this.data.month = shared.month;
            this.data.rank_state = normalizeRank(shared.rank_state);
            this.data.history = clone(shared.history);
        }
        effect(id, delta, kind) {
            this.data.rank_effects.push({id, delta, kind, month:this.data.month});
            this.data.rank_effects = this.data.rank_effects.slice(-256);
        }
        ensureCalendar() {
            const now = this.clock(), today = this.todayKey(now), month = today.slice(0, 7);
            let changed = false;
            // Worker 定时结算也可能恰好跨月；先按本机时钟换季，再记录结算月份。
            // 主线程账本落盘时重新采用同一月份，合并历史而不会重复发星。
            if (this.data.month !== month) {
                const previous = {month: this.data.month, rank_state: clone(this.data.rank_state), recorded_at: now.toISOString()};
                this.data.history = [previous, ...this.data.history.filter(item => item.month !== previous.month)];
                this.data.month = month;
                this.data.rank_state = initialRank();
                changed = true;
            }
            if (this.data.daily_tasks?.date !== today) {
                this.data.daily_tasks = freshDaily(today); changed = true;
            }
            // Updating on the same date adds a task without discarding today's
            // progress/claims. Friend matches can only be completed online.
            for(const meta of TASKS)if(!this.data.daily_tasks.tasks.some(t=>t.id===meta.id)){
                this.data.daily_tasks.tasks.push({id:meta.id,progress:0,done:false,claimed:false});changed=true;
            }
            return changed;
        }
        setDeviceClock(deviceClock) {
            this.dateFormatter = null; this.deviceOffset = null;
            if (!deviceClock) return;
            try {
                this.dateFormatter = new Intl.DateTimeFormat('en-GB', {timeZone: deviceClock.time_zone,
                    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    second: '2-digit', hourCycle: 'h23'});
            } catch {
                if (Number.isFinite(deviceClock.utc_offset_minutes)) this.deviceOffset = deviceClock.utc_offset_minutes;
            }
        }
        calendarParts(now = this.clock()) {
            if (this.dateFormatter) return Object.fromEntries(this.dateFormatter.formatToParts(now).map(part => [part.type, part.value]));
            if (this.deviceOffset !== null) {
                const local = new Date(now.getTime() + this.deviceOffset * 60000);
                return {year: local.getUTCFullYear(), month: String(local.getUTCMonth() + 1).padStart(2, '0'),
                    day: String(local.getUTCDate()).padStart(2, '0'), hour: local.getUTCHours(), minute: local.getUTCMinutes(), second: local.getUTCSeconds()};
            }
            return null;
        }
        todayKey(now = this.clock()) {
            const parts = this.calendarParts(now);
            return parts ? `${parts.year}-${parts.month}-${parts.day}` : localDate(now);
        }
        profile() {
            return clone({rank_state: this.data.rank_state, daily_tasks: this.data.daily_tasks,
                offline_season: this.data.month, offline_history: this.data.history,completed_match:this.data.completed_match,
                completed_matches:this.data.completed_match_events.filter(m=>m.date===this.todayKey())});
        }
        export() { return clone(this.data); }
        recordTask(id) {
            this.ensureCalendar();
            const meta = TASKS.find(task => task.id === id), task = this.data.daily_tasks.tasks.find(task => task.id === id);
            if (!meta || !task) return;
            task.progress = Math.min(meta.target, task.progress + 1);
            task.done = task.progress >= meta.target;
        }
        cleanHu(level, winner, hand, mode = 'legacy') {
            if (supportsProgression(level, mode) && winner === 0 && !hand.includes(40)) this.recordTask('clean_hu_three');
        }
        settleMatch(id, level, rounds, totals, mode = 'legacy') {
            this.ensureCalendar();
            if([10,15,20].includes(rounds)){
                const previous=this.data.completed_match_events.find(m=>m.id===id);
                // Historic ranked receipts can unlock newcomer, never today's four-match reward.
                if(!previous&&!this.data.receipts.some(r=>r.id===id)&&this.data.completed_match?.id!==id){
                    const proof={id,rounds,completed:true,date:this.todayKey()};
                    this.data.completed_match_events.push(proof);this.data.completed_match_events=this.data.completed_match_events.slice(-128);
                    this.data.completed_match=proof;
                }
            }
            if (!eligible(level, rounds, mode)) return {eligible: false};
            const existing = this.data.receipts.find(receipt => receipt.id === id);
            if (existing) return clone(existing.outcome);
            const place = placement(totals), score = Number(totals[0] || 0);
            const base = baseDelta(place, score), bonus = (mode === 'rank' || level === 8) && score >= 30 ? 1 : 0;
            const before = clone(this.data.rank_state), after = applyRankDelta(before, base + bonus);
            const outcome = {eligible: true, before, after, delta: base + bonus, base_delta: base,
                bonus_stars: bonus, place, my_score: score, season: this.data.month};
            this.data.rank_state = after;
            this.effect('match:'+id, base+bonus, 'match');
            this.recordTask('finish_rank_match');
            if (place === 1) this.recordTask('first_in_rank_match');
            this.data.receipts.push({id, outcome});
            this.data.receipts = this.data.receipts.slice(-128);
            return clone(outcome);
        }
        claim(id, date) {
            this.ensureCalendar();
            if(id==='friend_rank_match')return {ok:false,message:'请到友人场领取这项奖励。'};
            if (date !== this.data.daily_tasks.date) return {ok: false, message: '已到新的一天，每日任务已刷新。'};
            const meta = TASKS.find(task => task.id === id), task = this.data.daily_tasks.tasks.find(task => task.id === id);
            if (!meta || !task?.done || task.claimed) return {ok: false, message: '任务尚未完成或奖励已领取。'};
            task.claimed = true;
            this.data.rank_state = applyRankDelta(this.data.rank_state, meta.reward);
            this.effect('daily:'+date+':'+id, meta.reward, 'daily');
            return {ok: true, message: `每日任务奖励 +${meta.reward} 星`};
        }
        nextCalendarDelay() {
            const now = this.clock();
            const parts = this.calendarParts(now);
            if (parts) return Math.max(20, Math.min(60000,
                (86400 - Number(parts.hour) * 3600 - Number(parts.minute) * 60 - Number(parts.second)) * 1000 - now.getMilliseconds()));
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            // 一分钟上限也检查手动调时；按下一次本地午夜计算，兼容夏令时。
            return Math.max(20, Math.min(60000, midnight - now));
        }
    }
    const api = {OfflineProgression, TASKS, localDate, initialRank, normalizeRank, applyRankDelta, placement, baseDelta, eligible};
    root.MahjongOfflineProgression = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
