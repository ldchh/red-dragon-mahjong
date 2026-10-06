(function () {
    'use strict';
    const SAVE_KEY = 'hz_offline_state_v2';
    const LEGACY_KEY = 'hz_offline_match_v1';
    const NATIVE_STORAGE = location.origin === 'https://appassets.androidplatform.net';
    const STORAGE_MESSAGE = 'hz-offline-storage-v2';
    let hasSavedGame = false;
    const handlers = new Map();
    let connected = false;
    let worker;
    let storageBlocked = false;
    const fire = (event, data) => (handlers.get(event) || []).forEach(fn => fn(data));
    function updateResume(available) {
        hasSavedGame = available;
        document.getElementById('offline-resume-btn')?.classList.toggle('hidden', !available);
    }
    function nativeStorage(request) {
        const response = JSON.parse(window.prompt(STORAGE_MESSAGE, JSON.stringify(request)) || 'null');
        if (!response?.ok) throw new Error('本机存档暂时无法读取或保存');
        return response.value;
    }
    function readSave() {
        if (NATIVE_STORAGE) {
            const native = nativeStorage({op: 'read'});
            if (native !== null) return native;
        }
        return JSON.parse(localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_KEY) || 'null');
    }
    function save(document) {
        if (NATIVE_STORAGE) nativeStorage({op: 'write', value: document});
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(document));
            localStorage.removeItem(LEGACY_KEY);
        } catch (error) { if (!NATIVE_STORAGE) throw error; }
    }
    function storageFailure() {
        storageBlocked = true; connected = false; worker?.terminate();
        const show = () => {
            if (document.getElementById('offline-storage-error')) return;
            const panel = document.createElement('div');
            panel.id = 'offline-storage-error'; panel.className = 'offline-storage-error'; panel.setAttribute('role', 'alert');
            const title = document.createElement('h2'); title.textContent = '本机存档暂时不可用';
            const detail = document.createElement('p');
            detail.textContent = '对局已暂停。请检查手机剩余空间后重新打开，恢复最近一次保存的段位与牌桌。请保留应用数据。';
            const retry = document.createElement('button'); retry.className = 'primary-btn'; retry.textContent = '重新打开';
            retry.addEventListener('click', () => location.reload());
            panel.append(title, detail, retry); document.body.append(panel);
        };
        if (document.body) show(); else document.addEventListener('DOMContentLoaded', show, {once: true});
    }
    window.createOfflineSocket = function () {
        worker = new Worker('/static/offline/worker.js?v=1.9.20');
        const socket = {
            get connected() { return connected; },
            get disconnected() { return !connected; },
            on(event, callback) { if (!handlers.has(event)) handlers.set(event, []); handlers.get(event).push(callback); return socket; },
            emit(event, data = {}) {
                if (storageBlocked) return socket;
                try { const shared_rank=window.HZSharedRank.refresh(); worker.postMessage({event, data:{...data,shared_rank}}); }
                catch { storageFailure(); }
                return socket;
            },
            connect() { if (!storageBlocked && !connected) { connected = true; setTimeout(() => fire('connect'), 0); } return socket; },
            disconnect() { connected = false; fire('disconnect'); return socket; }
        };
        worker.onmessage = ({data}) => {
            if (storageBlocked) return;
            if (data.event === 'ready') {
                connected = true; updateResume(!!data.data.saved); fire('connect'); fire('connected', {});
            } else if (data.event === 'persist') {
                try {
                    const shared=window.HZSharedRank;
                    const results=shared.effects(data.data.profile.rank_effects);
                    const current=shared.snapshot();
                    Object.assign(data.data.profile,{month:current.month,rank_state:current.rank_state,history:current.history});
                    const match=data.data.match,result=results['match:'+match?.matchId];
                    if(result && match?.rankOutcome)Object.assign(match.rankOutcome,result);
                    save(data.data);
                } catch { storageFailure(); }
            } else if (data.event === 'init_failed') storageFailure();
            else if (data.event === 'saved_game') updateResume(!!data.data.available);
            else {
                if (data.event === 'profile') {
                    const current=window.HZSharedRank.snapshot();
                    Object.assign(data.data,{rank_state:current.rank_state,offline_season:current.month,offline_history:current.history});
                    window.MAHJONG_OFFLINE_PROFILE = data.data;
                    renderSeason(data.data);
                }
                fire(data.event, data.data);
            }
        };
        worker.onerror = () => {
            fire('error', {message: '离线引擎未能启动，请更新 Android System WebView 后重试。'});
            const title = document.getElementById('boot-loading-text');
            const detail = document.getElementById('boot-loading-sub');
            if (title) title.textContent = '离线引擎未能启动';
            if (detail) detail.textContent = '请更新 Android System WebView，再重新打开牌馆。';
        };
        try { worker.postMessage({event: 'init', document: readSave(), clock: NATIVE_STORAGE ? nativeStorage({op: 'clock'}) : null,shared_rank:window.HZSharedRank.refresh()}); }
        catch { storageFailure(); }
        return socket;
    };
    window.refreshOfflineCalendar = () => {
        if (worker && !storageBlocked) {
            try {
                const clock = NATIVE_STORAGE ? nativeStorage({op: 'clock'}) : null;
                worker.postMessage({event: 'refresh_calendar', data: {clock,shared_rank:window.HZSharedRank.refresh()}});
            } catch { storageFailure(); }
        }
    };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) window.refreshOfflineCalendar(); });
    window.addEventListener('focus', window.refreshOfflineCalendar);
    window.addEventListener('pageshow', window.refreshOfflineCalendar);
    function renderSeason(profile) {
        const caption = document.getElementById('profile-season');
        if (caption && profile.offline_season) caption.textContent = `${profile.offline_season.replace('-', ' 年 ')} 月`;
        renderOfflineSetup(profile);
    }
    function renderOfflineSetup(profile = window.MAHJONG_OFFLINE_PROFILE) {
        const levelDisplay = document.getElementById('offline-ai-level');
        if (!levelDisplay) return;
        const major = window.HZSharedRank?.snapshot().rank_state.major || Math.max(1, Math.min(8, Math.trunc(Number(profile?.rank_state?.major) || 1)));
        levelDisplay.value = `第 ${major} 档`;
        levelDisplay.dataset.level = String(major);
        const ranked = [10, 15, 20].includes(Number(document.getElementById('rounds-select').value));
        const create = document.getElementById('create-btn');
        create.firstElementChild.textContent = ranked ? '开始离线排位' : '开始离线练习';
        create.setAttribute('aria-label', ranked ? '开始离线排位' : '开始离线练习');
        document.getElementById('rank-note').hidden = true;
    }
    document.addEventListener('DOMContentLoaded', () => {
        document.body.classList.add('offline-mode');
        document.getElementById('boot-loading-text').textContent = '正在摆好本机牌桌';
        document.getElementById('boot-loading-sub').textContent = '三位人机，马上入座。';
        document.getElementById('username').placeholder = '1–8 个汉字或字符';
        if (!document.getElementById('username').value) document.getElementById('username').value = '牌友';
        document.getElementById('footer-version').textContent = 'v1.9.20 · 离线牌馆';
        document.getElementById('leave-btn').textContent = '结束本桌';
        document.getElementById('leave-btn').setAttribute('aria-label','结束本桌');
        document.getElementById('game-leave-btn').textContent = '结束本桌';
        document.querySelector('#daily-task-panel .popover-note').hidden = true;
        document.querySelectorAll('#rounds-select option').forEach(option => {
            if (Number(option.value) >= 10) option.textContent = `${option.value} 局 · 整场排位`;
        });
        const difficulty = document.createElement('div');
        difficulty.className = 'round-choice offline-difficulty';
        const label = document.createElement('label'); label.htmlFor = 'offline-ai-level'; label.textContent = '人机难度';
        const level = document.createElement('output'); level.id = 'offline-ai-level';
        level.setAttribute('aria-label', '人机难度'); level.setAttribute('aria-live', 'polite');
        const note = document.createElement('p'); note.id = 'offline-ai-note'; note.className = 'pf-note';
        note.hidden = true;
        difficulty.append(label, level, note);
        document.getElementById('create-panel').insertBefore(difficulty, document.getElementById('create-btn'));
        document.getElementById('rounds-select').addEventListener('change', () => renderOfflineSetup());
        renderOfflineSetup();
        const resume = document.getElementById('offline-resume-btn');
        resume.addEventListener('click', () => worker.postMessage({event: 'resume_room', data: {}}));
        updateResume(hasSavedGame);
        if (window.MAHJONG_OFFLINE_PROFILE) renderSeason(window.MAHJONG_OFFLINE_PROFILE);
    });
})();
