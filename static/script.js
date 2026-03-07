const socket = io();

const cnNums = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };

let myId = -1;
let gameState = null;
let currentActions = null;
let hasDealtAnimation = false;
let dealingInProgress = false;
let dealAnimStartedAt = 0;
let kongCandidates = null;
let roomCode = '';
let ownerSeat = -1;
let roundTarget = 1;
let currentRound = 0;
let animatedRound = 0;
let totalScores = { 0: 0, 1: 0, 2: 0, 3: 0 };
let humanCount = 1;
let aiCount = 3;
let seatProfiles = {};
let selectedAvatarId = 1;
let dealAnimSeq = 0;
let dealAnimTimers = [];
let latestStateSeq = -1;
let currentRoundToken = 0;
let dealReadySentToken = 0;
let lastHandRenderKey = '';
let tingExpanded = false;
let roomAiLevel = 6;
let pendingRankChange = null;
let roomRecovering = false;
let createReqPending = false;
let joinReqPending = false;
let lastTurnForPop = -1;
const bootStartAt = Date.now();
let bootHidden = false;

const RANK_STORAGE_KEY = 'hz_rank_v1';
const PLAYER_TOKEN_KEY = 'hz_player_token_v1';
const rankIcons = ['🥉', '🪙', '🔰', '🛡️', '⚔️', '👑', '💠', '🌟'];
const rankSubTexts = ['Ⅲ', 'Ⅱ', 'Ⅰ'];
const rankNames = ['试刀者', '听风客', '控场师', '天胡客', '千面手', '无双将', '镇国柱', '诛仙位'];

const avatarThemes = {
    1: { bg: 'linear-gradient(135deg,#2d3436,#636e72)', icon: '🐼' },
    2: { bg: 'linear-gradient(135deg,#0f2027,#2c5364)', icon: '🐉' },
    3: { bg: 'linear-gradient(135deg,#42275a,#734b6d)', icon: '🦄' },
    4: { bg: 'linear-gradient(135deg,#134e5e,#71b280)', icon: '🐟' },
    5: { bg: 'linear-gradient(135deg,#1f4037,#99f2c8)', icon: '🦅' }
};
const quickMessages = [
    "上碰下自摸",
    "来个红中，来个红中！",
    "快点儿，你在塞毛是吗",
    "有跟",
    "我有一万个红中",
    "这把要打十三幺了",
    "这把可以刷抖音了",
    "我听牌了",
    "狗运哥来了",
    "我要验牌",
    "给我擦皮鞋",
    "高手不赢前三把",
    "路边一条",
    "红中飞！",
    "打个来碰噻！"
];
let audioCtx = null;
let rankState = loadRankState();
const playerToken = loadPlayerToken();

function cloneRankState(s) {
    return { major: Number(s.major || 1), minor: Number(s.minor || 0), stars: Number(s.stars || 0) };
}

function normalizeRankState(s) {
    const x = cloneRankState(s || {});
    if (x.major < 1) x.major = 1;
    if (x.major > 8) x.major = 8;
    if (x.major === 8) {
        x.minor = 0;
        if (x.stars < 0) x.stars = 0;
        return x;
    }
    if (x.minor < 0) x.minor = 0;
    if (x.minor > 2) x.minor = 2;
    if (x.stars < 0) x.stars = 0;
    if (x.stars > 3) x.stars = 3;
    return x;
}

function loadRankState() {
    try {
        const raw = localStorage.getItem(RANK_STORAGE_KEY);
        if (!raw) return { major: 1, minor: 0, stars: 0 };
        const parsed = JSON.parse(raw);
        return normalizeRankState(parsed);
    } catch {
        return { major: 1, minor: 0, stars: 0 };
    }
}

function loadPlayerToken() {
    try {
        let token = localStorage.getItem(PLAYER_TOKEN_KEY);
        if (token && token.length >= 8) return token;
        token = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(PLAYER_TOKEN_KEY, token);
        return token;
    } catch {
        return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
}

function saveRankState() {
    localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(normalizeRankState(rankState)));
}

function getRankLabel(state) {
    const s = normalizeRankState(state);
    const name = rankNames[s.major - 1] || `段位${s.major}`;
    if (s.major === 8) return `${name} ${s.stars}星`;
    return `${name}${rankSubTexts[s.minor]}${s.stars}星`;
}

function getAiRankLabelByLevel(level) {
    let lv = Number(level || 1);
    if (lv < 1) lv = 1;
    if (lv > 8) lv = 8;
    const name = rankNames[lv - 1] || `段位${lv}`;
    if (lv === 8) return `${name} 1星`;
    return `${name}Ⅰ1星`;
}

function getRankIcon(state) {
    const s = normalizeRankState(state);
    return rankIcons[s.major - 1] || '🥉';
}

function renderStarMarkup(state) {
    const s = normalizeRankState(state);
    if (s.major === 8) {
        return `<span class="star-on">★</span>×${s.stars}`;
    }
    let html = '';
    for (let i = 0; i < 3; i++) {
        const cls = i < s.stars ? 'star-on' : 'star-off';
        html += `<span class="${cls}">★</span>`;
    }
    return html;
}

function renderRankPanel() {
    const iconEl = document.getElementById('rank-icon');
    const textEl = document.getElementById('rank-text');
    const starsEl = document.getElementById('rank-stars');
    if (!iconEl || !textEl || !starsEl) return;
    iconEl.innerText = getRankIcon(rankState);
    textEl.innerText = getRankLabel(rankState);
    starsEl.innerHTML = renderStarMarkup(rankState);
}

function handlePageResume() {
    if (document.visibilityState !== 'visible') return;
    ensureAudioContext();
    if (socket.disconnected) {
        socket.connect();
    }
    if (dealingInProgress && Date.now() - dealAnimStartedAt > 3000) {
        dealAnimSeq += 1;
        dealAnimTimers.forEach(tid => clearTimeout(tid));
        dealAnimTimers = [];
        dealingInProgress = false;
        dealAnimStartedAt = 0;
        hasDealtAnimation = true;
    }
    if (gameState && !dealingInProgress) {
        renderGame(gameState);
        emitDealReady(currentRoundToken);
    }
}

function shouldCountRankByCurrentMatch() {
    if (!gameState || !gameState.match_over) return false;
    return [10, 15, 20].includes(Number(roundTarget || 0));
}

function getMyPlacementByTotals(totals) {
    const arr = [0, 1, 2, 3].map(seat => ({ seat, score: Number(totals && totals[seat] ? totals[seat] : 0) }));
    arr.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.seat - b.seat;
    });
    const idx = arr.findIndex(x => x.seat === myId);
    return idx >= 0 ? idx + 1 : 4;
}

function getRankDeltaByRule(place, myScore) {
    if (place === 1) return 2;
    if (place === 2) {
        if (myScore > 0) return 1;
        return 0;
    }
    if (place === 3) {
        if (myScore < 0) return -1;
        return 0;
    }
    return -2;
}

function simulateRankChange(beforeInput, delta) {
    const before = normalizeRankState(beforeInput);
    const now = cloneRankState(before);
    const steps = [];
    const pushStep = (tip) => {
        steps.push({ state: cloneRankState(now), tip });
    };
    if (delta > 0) {
        for (let i = 0; i < delta; i++) {
            if (now.major === 8) {
                now.stars += 1;
                pushStep('加一星');
                continue;
            }
            if (now.stars < 3) {
                now.stars += 1;
                pushStep('加一星');
                continue;
            }
            now.stars = 0;
            if (now.minor < 2) {
                now.minor += 1;
                pushStep('升小段');
            } else if (now.major < 8) {
                now.major += 1;
                now.minor = 0;
                pushStep('升大段');
            }
        }
    } else if (delta < 0) {
        for (let i = 0; i < Math.abs(delta); i++) {
            if (now.major === 1 && now.minor === 0 && now.stars === 0) {
                pushStep('已到最低段位');
                continue;
            }
            if (now.major === 8) {
                if (now.stars > 0) {
                    now.stars -= 1;
                    pushStep('扣一星');
                } else {
                    now.major = 7;
                    now.minor = 2;
                    now.stars = 3;
                    pushStep('降大段');
                }
                continue;
            }
            if (now.stars > 0) {
                now.stars -= 1;
                pushStep('扣一星');
                continue;
            }
            if (now.minor > 0) {
                now.minor -= 1;
                now.stars = 3;
                pushStep('降小段');
            } else if (now.major > 1) {
                now.major -= 1;
                now.minor = 2;
                now.stars = 3;
                pushStep('降大段');
            } else {
                now.stars = 0;
                pushStep('已到最低段位');
            }
        }
    }
    return { before, after: normalizeRankState(now), steps };
}

function buildRankOutcomeIfEligible(totals) {
    if (!shouldCountRankByCurrentMatch()) {
        return { eligible: false };
    }
    const myScore = Number(totals && totals[myId] ? totals[myId] : 0);
    const place = getMyPlacementByTotals(totals);
    const baseDelta = getRankDeltaByRule(place, myScore);
    const bonusStars = myScore >= 30 ? 1 : 0;
    const delta = baseDelta + bonusStars;
    const trans = simulateRankChange(rankState, delta);
    return {
        eligible: true,
        place,
        myScore,
        baseDelta,
        bonusStars,
        delta,
        before: trans.before,
        after: trans.after,
        steps: trans.steps
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function applyRankChangeView(state, tip) {
    const summaryEl = document.getElementById('rank-change-summary');
    const badgeEl = document.getElementById('rank-badge-large');
    const starsEl = document.getElementById('rank-change-stars');
    const tipEl = document.getElementById('rank-change-tip');
    if (badgeEl) badgeEl.innerText = getRankIcon(state);
    if (summaryEl) summaryEl.innerText = getRankLabel(state);
    if (starsEl) {
        starsEl.innerHTML = renderStarMarkup(state);
        starsEl.classList.remove('rank-flash');
        void starsEl.offsetWidth;
        starsEl.classList.add('rank-flash');
    }
    if (tipEl) tipEl.innerText = tip || '';
}

async function openRankChangeScreen(outcome) {
    const screen = document.getElementById('rank-screen');
    const confirmBtn = document.getElementById('rank-confirm-btn');
    if (!screen || !confirmBtn) {
        location.reload();
        return;
    }
    confirmBtn.classList.add('hidden');
    screen.classList.remove('hidden');
    const bonusTip = outcome.bonusStars > 0 ? '（含高分奖励+1）' : '';
    applyRankChangeView(outcome.before, `本次第${cnNums[outcome.place] || outcome.place}名，段位分${outcome.delta >= 0 ? '+' : ''}${outcome.delta}${bonusTip}`);
    await sleep(600);
    if (!outcome.steps || outcome.steps.length === 0) {
        applyRankChangeView(outcome.after, '本次段位无变化');
    } else {
        for (const step of outcome.steps) {
            applyRankChangeView(step.state, step.tip);
            await sleep(680);
        }
    }
    rankState = normalizeRankState(outcome.after);
    saveRankState();
    renderRankPanel();
    confirmBtn.classList.remove('hidden');
    confirmBtn.onclick = () => {
        location.reload();
    };
}

function ensureAudioContext() {
    if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) audioCtx = new Ctx();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq, duration, type = 'sine', gain = 0.06, sweepTo = null) {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweepTo) {
        osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration);
    }
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
}

function playActionSound(kind) {
    if (kind === 'discard') {
        playTone(460, 0.08, 'square', 0.05, 390);
        return;
    }
    if (kind === 'pong') {
        playTone(520, 0.1, 'triangle', 0.07);
        setTimeout(() => playTone(620, 0.1, 'triangle', 0.07), 85);
        return;
    }
    if (kind === 'kong') {
        playTone(350, 0.11, 'sawtooth', 0.075);
        setTimeout(() => playTone(280, 0.12, 'sawtooth', 0.075), 95);
        setTimeout(() => playTone(220, 0.14, 'sawtooth', 0.075), 190);
        return;
    }
    if (kind === 'hu' || kind === 'zi_mo') {
        playTone(660, 0.14, 'sine', 0.075);
        setTimeout(() => playTone(880, 0.18, 'sine', 0.085), 110);
        return;
    }
    if (kind === 'chat') {
        playTone(720, 0.07, 'triangle', 0.05);
        setTimeout(() => playTone(960, 0.07, 'triangle', 0.05), 65);
    }
}

// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game-screen');
const bootLoading = document.getElementById('boot-loading');
const bootLoadingText = document.getElementById('boot-loading-text');
const bootLoadingSub = document.getElementById('boot-loading-sub');
const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const createEntryBtn = document.getElementById('create-entry-btn');
const joinEntryBtn = document.getElementById('join-entry-btn');
const createPanel = document.getElementById('create-panel');
const joinPanel = document.getElementById('join-panel');
const startBtn = document.getElementById('start-btn');
const leaveBtn = document.getElementById('leave-btn');
const statusMsg = document.getElementById('status-msg');
const actionsPanel = document.getElementById('actions-panel');
const roomCodeInput = document.getElementById('room-code-input');
const roundsSelect = document.getElementById('rounds-select');
const resultBtn = document.getElementById('result-btn');
const avatarOptions = document.querySelectorAll('.avatar-option');
const quickChatBtn = document.getElementById('quick-chat-btn');
const quickChatPanel = document.getElementById('quick-chat-panel');
const tingStatusEl = document.getElementById('ting-status');
const tingBtnEl = document.querySelector('#ting-status .ting-btn');
const rankHelpBtn = document.getElementById('rank-help-btn');
const rankHelpPanel = document.getElementById('rank-help-panel');
const rankHelpContent = document.getElementById('rank-help-content');
const rankHelpClose = document.getElementById('rank-help-close');

renderRankPanel();

const bootMessages = ['正在连接牌桌', '正在同步房间信息', '正在洗牌与布置牌桌', '即将进入对局'];
let bootMessageIndex = 0;
let bootDots = 0;
let bootTextTimer = null;

function hideBootLoading(force = false) {
    if (!bootLoading || bootHidden) return;
    const elapsed = Date.now() - bootStartAt;
    const waitMs = force ? 0 : Math.max(0, 700 - elapsed);
    setTimeout(() => {
        if (!bootLoading || bootHidden) return;
        bootHidden = true;
        if (bootTextTimer) {
            clearInterval(bootTextTimer);
            bootTextTimer = null;
        }
        bootLoading.classList.add('hidden');
    }, waitMs);
}

if (bootLoadingText) {
    bootTextTimer = setInterval(() => {
        if (bootHidden) return;
        bootMessageIndex = (bootMessageIndex + 1) % bootMessages.length;
        bootDots = (bootDots + 1) % 4;
        const dots = '.'.repeat(bootDots);
        bootLoadingText.innerText = `${bootMessages[bootMessageIndex]}${dots}`;
    }, 850);
}

setTimeout(() => {
    if (bootLoadingText && !bootHidden) {
        bootLoadingText.innerText = '网络波动时会自动恢复，请稍候';
    }
    if (bootLoadingSub && !bootHidden) {
        bootLoadingSub.innerText = '提示：首次加载较慢属正常';
    }
}, 2600);

setTimeout(() => {
    hideBootLoading(true);
}, 5200);

function renderRankHelpText() {
    if (!rankHelpContent) return;
    const names = rankNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n');
    rankHelpContent.innerText =
`计分条件：
无人数限制（任意真人/人机组合），局数为10/15/20局且整场结束后才计入段位分。

加减星规则：
第1名 +2星
第2名且分数为正 +1星
第2名且分数为负 0星
第3名且分数为正 0星
第3名且分数为负 -1星
第4名 -2星
若整场分数≥30，额外 +1星

段位名称（低到高）：
${names}`;
}

renderRankHelpText();

document.addEventListener('visibilitychange', handlePageResume);
window.addEventListener('focus', handlePageResume);

if (rankHelpBtn && rankHelpPanel) {
    rankHelpBtn.addEventListener('click', () => {
        rankHelpPanel.classList.toggle('hidden');
    });
}
if (rankHelpClose && rankHelpPanel) {
    rankHelpClose.addEventListener('click', () => {
        rankHelpPanel.classList.add('hidden');
    });
}

if (tingBtnEl && tingStatusEl) {
    tingBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tingStatusEl.classList.contains('hidden')) return;
        tingExpanded = !tingExpanded;
        tingStatusEl.classList.toggle('open', tingExpanded);
    });
    document.addEventListener('pointerdown', (e) => {
        if (tingStatusEl.classList.contains('hidden')) return;
        if (!tingStatusEl.contains(e.target)) {
            tingExpanded = false;
            tingStatusEl.classList.remove('open');
        }
    });
}

window.addEventListener('pointerdown', () => {
    ensureAudioContext();
}, { once: true });

function setLobbyMode(mode) {
    createPanel.classList.toggle('hidden', mode !== 'create');
    joinPanel.classList.toggle('hidden', mode !== 'join');
}

createEntryBtn.addEventListener('click', () => setLobbyMode('create'));
joinEntryBtn.addEventListener('click', () => setLobbyMode('join'));

createBtn.addEventListener('click', () => {
    if (createReqPending) return;
    createReqPending = true;
    const rounds = Number(roundsSelect.value || '1');
    const name = (document.getElementById('username').value || '').trim();
    socket.emit('create_room', { rounds, name, avatar: selectedAvatarId, rank_level: Number(rankState.major || 1), rank_state: normalizeRankState(rankState), player_token: playerToken });
    setTimeout(() => { createReqPending = false; }, 2000);
});

joinBtn.addEventListener('click', () => {
    if (joinReqPending) return;
    const code = (roomCodeInput.value || '').trim();
    if (!code) return;
    joinReqPending = true;
    const name = (document.getElementById('username').value || '').trim();
    socket.emit('join_room', { room_code: code, name, avatar: selectedAvatarId, rank_state: normalizeRankState(rankState), player_token: playerToken });
    setTimeout(() => { joinReqPending = false; }, 2000);
});

avatarOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        avatarOptions.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedAvatarId = Number(btn.dataset.avatar || '1');
    });
});

if (quickChatBtn && quickChatPanel) {
    quickMessages.forEach(text => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'quick-chat-item';
        item.innerText = text;
        item.addEventListener('click', () => {
            socket.emit('quick_chat', { text });
            quickChatPanel.classList.add('hidden');
        });
        quickChatPanel.appendChild(item);
    });
    quickChatBtn.addEventListener('click', () => {
        quickChatPanel.classList.toggle('hidden');
    });
}

if (startBtn) {
    startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        socket.emit('start_game');
    });
}

if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
        socket.emit('leave_room');
    });
}

function refreshLobbyMeta() {
    if (!statusMsg) return;
    if (!roomCode) {
        statusMsg.innerText = '未加入房间';
    } else {
        statusMsg.innerText = `房间 ${roomCode} | 当前人数 ${humanCount} | 人机 ${aiCount} | 难度 ${roomAiLevel}档 | 第 ${currentRound}/${roundTarget} 局`;
    }
    if (startBtn) {
        if (myId === ownerSeat) startBtn.classList.remove('hidden');
        else startBtn.classList.add('hidden');
        startBtn.disabled = false;
    }
    if (leaveBtn) {
        leaveBtn.classList.toggle('hidden', !roomCode);
    }
}

socket.on('room_joined', (data) => {
    myId = data.seat;
    roomCode = data.room_code;
    roomRecovering = false;
    createReqPending = false;
    joinReqPending = false;
    hideBootLoading();
    refreshLobbyMeta();
});

socket.on('room_meta', (data) => {
    roomCode = data.room_code;
    ownerSeat = data.owner_seat;
    roundTarget = data.round_target;
    currentRound = data.current_round;
    totalScores = data.total_scores || totalScores;
    humanCount = data.player_count || humanCount;
    aiCount = data.ai_count ?? aiCount;
    roomAiLevel = Number(data.ai_level || roomAiLevel);
    seatProfiles = data.seat_profiles || seatProfiles;
    refreshLobbyMeta();
});

socket.on('connect', () => {
    hideBootLoading();
    if (roomCode && playerToken) {
        const name = (document.getElementById('username').value || '').trim();
        socket.emit('rejoin_room', { room_code: roomCode, name, avatar: selectedAvatarId, rank_state: normalizeRankState(rankState), player_token: playerToken });
    }
    handlePageResume();
});

socket.on('connected', () => {
    hideBootLoading();
});

socket.on('disconnect', () => {
    if (statusMsg && roomCode) {
        statusMsg.innerText = `房间 ${roomCode} | 网络中断，正在尝试恢复...`;
    }
});

socket.on('connect_error', () => {
    if (bootLoadingText && !bootHidden) {
        bootLoadingText.innerText = '连接有点慢，正在重试';
    }
    if (bootLoadingSub && !bootHidden) {
        bootLoadingSub.innerText = '网络不稳时将自动重连';
    }
});

socket.on('room_error', (data) => {
    const msg = (data && data.message) ? data.message : '房间操作失败';
    const recoverable = !!(data && data.recoverable);
    createReqPending = false;
    joinReqPending = false;
    if (recoverable && msg.includes('你已在房间中')) {
        if (statusMsg) statusMsg.innerText = '检测到仍在旧房间，正在自动恢复...';
        if (!roomRecovering) {
            roomRecovering = true;
            socket.emit('resume_room', { player_token: playerToken });
            setTimeout(() => {
                roomRecovering = false;
            }, 2000);
        }
        return;
    }
    alert(msg);
});

socket.on('left_room', (data) => {
    if (!data || !data.ok) {
        return;
    }
    myId = -1;
    roomCode = '';
    ownerSeat = -1;
    currentRound = 0;
    roundTarget = Number(roundsSelect ? roundsSelect.value || 1 : 1);
    totalScores = { 0: 0, 1: 0, 2: 0, 3: 0 };
    seatProfiles = {};
    roomRecovering = false;
    createReqPending = false;
    joinReqPending = false;
    hasDealtAnimation = false;
    dealingInProgress = false;
    dealAnimStartedAt = 0;
    dealAnimSeq += 1;
    dealAnimTimers.forEach(tid => clearTimeout(tid));
    dealAnimTimers = [];
    currentActions = null;
    gameState = null;
    latestStateSeq = -1;
    currentRoundToken = 0;
    dealReadySentToken = 0;
    pendingRankChange = null;
    resetTableForNewRound();
    const modal = document.getElementById('results-modal');
    if (modal) modal.classList.add('hidden');
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    refreshLobbyMeta();
});

socket.on('start_denied', (data) => {
    const reason = (data && data.reason) ? data.reason : '无法开始';
    statusMsg.innerText = reason;
    if (startBtn) startBtn.disabled = false;
});

socket.on('game_state', (state) => {
    hideBootLoading();
    console.log("Game State Update:", state);
    const incomingSeq = Number((state && state.state_seq) ?? -1);
    if (incomingSeq >= 0) {
        if (incomingSeq < latestStateSeq) {
            return;
        }
        latestStateSeq = incomingSeq;
    }
    const incomingRound = Number(state.current_round || 0);
    const incomingToken = Number(state.round_token || 0);
    if (!state.game_over && (incomingRound > currentRound || incomingToken !== currentRoundToken)) {
        resetTableForNewRound();
        dealReadySentToken = 0;
    }
    currentRoundToken = incomingToken || currentRoundToken;
    roundTarget = state.round_target || roundTarget;
    currentRound = Math.max(currentRound, incomingRound);
    if (!state.game_over && currentRound !== animatedRound) {
        hasDealtAnimation = false;
    }
    totalScores = state.total_scores || totalScores;
    if (gameState && gameState.discards && state.discards) {
        const oldCnt = Object.values(gameState.discards).reduce((a, arr) => a + arr.length, 0);
        const newCnt = Object.values(state.discards).reduce((a, arr) => a + arr.length, 0);
        if (newCnt > oldCnt) {
            playActionSound('discard');
        }
    }
    seatProfiles = state.seat_profiles || seatProfiles;
    gameState = state;
    currentActions = null;
    if (!state.game_over) {
        const modal = document.getElementById('results-modal');
        modal.classList.add('hidden');
        if (resultBtn) {
            resultBtn.disabled = false;
        }
    }
    if (!hasDealtAnimation) {
        if (typeof state.banker === 'number' && state.hand_counts) {
            animatedRound = currentRound;
            startDealAnimation(state);
            return;
        }
    }
    renderGame(state);
    emitDealReady(currentRoundToken);
    
    if (!lobbyScreen.classList.contains('hidden')) {
        lobbyScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    }
});

socket.on('action_request', (data) => {
    console.log("Action Request:", data);
    const reqSeq = Number((data && data.state_seq) ?? -1);
    const reqToken = Number((data && data.round_token) ?? 0);
    if (reqSeq >= 0 && reqSeq < latestStateSeq) return;
    if (reqToken !== currentRoundToken) return;
    currentActions = data.actions;
    showActions(data.actions, data.tile);
});

socket.on('action_event', (data) => {
    // data: { player: 1, type: 'pong' }
    // Show visual effect
    let text = "";
    if (data.type === 'pong') text = "碰";
    if (data.type === 'kong') text = "杠";
    if (data.type === 'hu') text = "胡";
    if (data.type === 'zi_mo') text = "自摸";
    
    if (text) {
        playActionSound(data.type);
        // Cut-in effect
        const container = document.getElementById('cut-in-container');
        const el = document.createElement('div');
        el.className = 'cut-in-text cut-in-active';
        el.innerText = text;
        container.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }
});

socket.on('error', (data) => {
    alert(data.message);
});

socket.on('msg', (data) => {
    const msgArea = document.getElementById('msg-area');
    if (!msgArea) return;
    msgArea.dataset.msg = data.text || '';
    msgArea.innerText = msgArea.dataset.msg;
});

socket.on('quick_msg', (data) => {
    const seat = Number((data && data.seat) ?? -1);
    if (seat < 0 || myId < 0) return;
    const relIdx = (seat - myId + 4) % 4;
    const playerEl = document.getElementById(`player-${relIdx}`);
    if (!playerEl) return;
    const text = (data && data.text) ? data.text : '';
    if (!text) return;
    const old = playerEl.querySelector('.chat-bubble');
    if (old) old.remove();
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerText = text;
    playActionSound('chat');
    playerEl.appendChild(bubble);
    setTimeout(() => {
        bubble.remove();
    }, 3600);
});

// Rendering
function renderGame(state) {
    if (dealingInProgress) {
        return;
    }
    if (state.scores && Object.values(state.scores).some(s => s !== 0) && state.wall_count === 0 && !document.getElementById('results-modal').classList.contains('hidden')) {
        // already showing results
    }
    
    // Check Game Over
    // Note: state.state is "FINISHED" in core.py, but we need to check if we received that
    // The server emits 'game_state' even on finish.
    
    // Update center info
    document.getElementById('wall-count').innerText = state.wall_count;
    document.getElementById('current-turn').innerText = `Player ${state.turn}`;
    const roundInfo = document.getElementById('round-info');
    if (roundInfo) roundInfo.innerText = `第${state.current_round || currentRound}/${state.round_target || roundTarget}局`;
    renderRevealDraws(state);
    renderAvatars(state);
    
    // Highlight Active Player
    for(let i=0; i<4; i++) {
        let relIdx = (i - myId + 4) % 4;
        const playerEl = document.getElementById(`player-${relIdx}`);
        if (!playerEl) continue;
        if(state.turn === i) playerEl.classList.add('active');
        else playerEl.classList.remove('active');
    }
    if (state.turn !== lastTurnForPop && myId >= 0) {
        const activeRel = (state.turn - myId + 4) % 4;
        const activeEl = document.getElementById(`player-${activeRel}`);
        if (activeEl) {
            activeEl.classList.remove('turn-pop');
            void activeEl.offsetWidth;
            activeEl.classList.add('turn-pop');
            setTimeout(() => activeEl.classList.remove('turn-pop'), 450);
        }
        lastTurnForPop = state.turn;
    }

    // Render My Hand
    renderMyHand(state);
    
    // Ting Status
    const tingStatus = document.getElementById('ting-status');
    const tingTooltip = document.querySelector('.ting-tooltip');
    
    if (state.ting_tiles && state.ting_tiles.length > 0) {
        tingStatus.classList.remove('hidden');
        tingTooltip.innerHTML = '';
        state.ting_tiles.forEach(tile => {
            tingTooltip.appendChild(createTileElement(tile, true));
        });
        tingStatus.classList.toggle('open', tingExpanded);
    } else {
        tingStatus.classList.add('hidden');
        tingStatus.classList.remove('open');
        tingExpanded = false;
    }
    
    // Render Opponents (simplified - just backs or counts)
    // Relative positions: 
    // myId = 0 -> Right=1, Top=2, Left=3
    // myId = 1 -> Right=2, Top=3, Left=0
    // etc.
    
    const positions = ['bottom', 'right', 'top', 'left'];
    
    // Render Discards for all
    for (let i = 0; i < 4; i++) {
        // Calculate relative index
        let relIdx = (i - myId + 4) % 4;
        const posName = positions[relIdx]; // bottom, right, top, left
        
        // Find the player element container
        // ID is player-{relIdx} in HTML? No, HTML IDs are fixed: player-0 (bottom), player-1 (right)...
        // Actually, let's map relIdx to HTML ID.
        // HTML structure: player-0 is bottom (me), player-1 is right, etc.
        const playerElId = `player-${relIdx}`;
        const playerEl = document.getElementById(playerElId);
        
        if (playerEl) {
            // Render Discards
            const discardsEl = playerEl.querySelector('.discards');
            discardsEl.innerHTML = '';
            const pile = state.discards[i] || [];
            pile.forEach((tile, idx) => {
                const tileEl = createTileElement(tile, true);
                if (i === state.last_discard_player && idx === pile.length - 1) {
                    tileEl.classList.add('tile--current-discard');
                }
                discardsEl.appendChild(tileEl);
            });

            const meldsEl = playerEl.querySelector('.melds');
            if (meldsEl) {
                meldsEl.innerHTML = '';
                const meldList = (state.melds && state.melds[i]) ? state.melds[i] : [];
                meldList.forEach(meld => {
                    const group = document.createElement('div');
                    group.className = 'meld-group';
                    const count = meld.type && meld.type.includes('kong') ? 4 : 3;
                    if (meld.type === 'kong' && meld.source === 'concealed') {
                        group.appendChild(createTileElement(meld.tile, true));
                        for (let m = 0; m < 3; m++) {
                            const b = document.createElement('div');
                            b.className = 'tile-back tile-back--small';
                            group.appendChild(b);
                        }
                    } else {
                        for (let m = 0; m < count; m++) {
                            group.appendChild(createTileElement(meld.tile, true));
                        }
                    }
                    meldsEl.appendChild(group);
                });
            }
            
            // If opponent, render hand back
            if (i !== myId) {
                const backEl = playerEl.querySelector('.hand-back');
                if (backEl && state.hand_counts) {
                    backEl.innerHTML = '';
                    const reveal = state.reveal_hu;
                    if (reveal && reveal.winner === i && Array.isArray(reveal.hand)) {
                        reveal.hand.forEach(tile => {
                            backEl.appendChild(createTileElement(tile, true));
                        });
                    } else {
                        const count = state.hand_counts[i] || 0;
                        for (let k = 0; k < count; k++) {
                            const b = document.createElement('div');
                            b.className = 'tile-back';
                            backEl.appendChild(b);
                        }
                    }
                }
            }
        }
    }
    
    if (state.turn !== myId) {
        actionsPanel.classList.add('hidden');
        hideKongPicker();
    } else if (!currentActions) {
        if (state.self_actions) {
            showSelfActions(state.self_actions);
        } else {
            actionsPanel.classList.add('hidden');
        }
    }
    // Check for Game Over signal in state (we need to add this to backend state)
    if (state.game_over) {
        showResults(state.scores, state.total_scores || totalScores, state.match_over, state.current_round, state.round_target);
    }
}

function resetTableForNewRound() {
    currentActions = null;
    hideKongPicker();
    actionsPanel.classList.add('hidden');
    const myHandEl = document.getElementById('my-hand');
    if (myHandEl) myHandEl.innerHTML = '';
    lastHandRenderKey = '';
    lastTurnForPop = -1;
    const msgArea = document.getElementById('msg-area');
    if (msgArea) msgArea.innerHTML = '';
    const tingStatus = document.getElementById('ting-status');
    if (tingStatus) tingStatus.classList.add('hidden');
    tingExpanded = false;
    const tingTooltip = document.querySelector('.ting-tooltip');
    if (tingTooltip) tingTooltip.innerHTML = '';
    const revealCenter = document.getElementById('reveal-center');
    if (revealCenter) {
        revealCenter.classList.add('hidden');
        revealCenter.innerHTML = '';
    }
    for (let relIdx = 0; relIdx < 4; relIdx++) {
        const playerEl = document.getElementById(`player-${relIdx}`);
        if (!playerEl) continue;
        playerEl.classList.remove('active');
        const back = playerEl.querySelector('.hand-back');
        const discards = playerEl.querySelector('.discards');
        const melds = playerEl.querySelector('.melds');
        if (back) back.innerHTML = '';
        if (discards) discards.innerHTML = '';
        if (melds) melds.innerHTML = '';
        const bubble = playerEl.querySelector('.chat-bubble');
        if (bubble) bubble.remove();
    }
}

function showSelfActions(selfActions) {
    actionsPanel.classList.remove('hidden');
    const btnPeng = document.getElementById('btn-peng');
    const btnGang = document.getElementById('btn-gang');
    const btnHu = document.getElementById('btn-hu');
    const btnPass = document.getElementById('btn-pass');

    btnPeng.style.display = 'none';
    btnPass.style.display = 'none';

    btnHu.style.display = selfActions.hu ? 'block' : 'none';
    btnGang.style.display = ((selfActions.concealed_kong && selfActions.concealed_kong.length) || (selfActions.add_kong && selfActions.add_kong.length)) ? 'block' : 'none';
    btnHu.disabled = false;

    btnHu.onclick = () => {
        btnHu.disabled = true;
        socket.emit('action', { type: 'self_hu' });
        actionsPanel.classList.add('hidden');
    };

    kongCandidates = [];
    if (selfActions.add_kong) kongCandidates = kongCandidates.concat(selfActions.add_kong.map(t => ({ tile: t, kind: 'add' })));
    if (selfActions.concealed_kong) kongCandidates = kongCandidates.concat(selfActions.concealed_kong.map(t => ({ tile: t, kind: 'concealed' })));

    btnGang.onclick = () => {
        if (!kongCandidates || kongCandidates.length === 0) return;
        if (kongCandidates.length === 1) {
            socket.emit('action', { type: 'self_kong', tile: kongCandidates[0].tile });
            actionsPanel.classList.add('hidden');
            return;
        }
        showKongPicker(kongCandidates.map(c => c.tile));
    };
}

function showKongPicker(tiles) {
    hideKongPicker();
    const host = document.getElementById('player-0');
    if (!host) return;

    const wrap = document.createElement('div');
    wrap.id = 'kong-picker';

    tiles.forEach(t => {
        const tileEl = createTileElement(t, true);
        tileEl.addEventListener('click', () => {
            socket.emit('action', { type: 'self_kong', tile: t });
            hideKongPicker();
            actionsPanel.classList.add('hidden');
        });
        wrap.appendChild(tileEl);
    });

    host.appendChild(wrap);
}

function hideKongPicker() {
    const el = document.getElementById('kong-picker');
    if (el) el.remove();
}

function startDealAnimation(state) {
    dealAnimSeq += 1;
    const seq = dealAnimSeq;
    dealAnimTimers.forEach(tid => clearTimeout(tid));
    dealAnimTimers = [];
    dealingInProgress = true;
    dealAnimStartedAt = Date.now();

    if (!lobbyScreen.classList.contains('hidden')) {
        lobbyScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    }
    const tingStatus = document.getElementById('ting-status');
    if (tingStatus) tingStatus.classList.add('hidden');
    const tingTooltip = document.querySelector('.ting-tooltip');
    if (tingTooltip) tingTooltip.innerHTML = '';

    document.getElementById('wall-count').innerText = state.wall_count;
    document.getElementById('current-turn').innerText = `Player ${state.turn}`;

    const myHandEl = document.getElementById('my-hand');
    myHandEl.innerHTML = '';

    const playerBackEls = [];
    for (let relIdx = 0; relIdx < 4; relIdx++) {
        const el = document.getElementById(`player-${relIdx}`);
        playerBackEls.push(el ? el.querySelector('.hand-back') : null);
    }

    const finalCounts = state.hand_counts;
    const myFinalTiles = (state.deal_sequence_hand && state.deal_sequence_hand.length) ? state.deal_sequence_hand.slice() : state.hand.slice();
    let myTileIndex = 0;

    const absoluteForRel = (relIdx) => (myId + relIdx) % 4;

    const schedule = [];
    for (let round = 0; round < 3; round++) {
        for (let relIdx = 0; relIdx < 4; relIdx++) {
            schedule.push({ relIdx, count: 4, pauseAfter: relIdx === 3 ? 180 : 60 });
        }
        schedule.push({ relIdx: -1, count: 0, pauseAfter: 180 });
    }
    for (let relIdx = 0; relIdx < 4; relIdx++) {
        schedule.push({ relIdx, count: 1, pauseAfter: relIdx === 3 ? 200 : 80 });
    }
    if (state.banker === myId) {
        schedule.push({ relIdx: 0, count: 1, pauseAfter: 200 });
    } else {
        const bankerRel = (state.banker - myId + 4) % 4;
        schedule.push({ relIdx: bankerRel, count: 1, pauseAfter: 200 });
    }

    let t = 0;
    const dealtCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (const step of schedule) {
        t += step.pauseAfter;
        if (step.relIdx === -1) continue;

        const tid = setTimeout(() => {
            if (seq !== dealAnimSeq) return;
            const absIdx = absoluteForRel(step.relIdx);
            for (let c = 0; c < step.count; c++) {
                if (dealtCounts[absIdx] >= (finalCounts[absIdx] || 0)) break;
                dealtCounts[absIdx] += 1;

                if (absIdx === myId) {
                    const tileVal = myFinalTiles[myTileIndex++];
                    const tileEl = createTileElement(tileVal);
                    tileEl.classList.add('dealing');
                    myHandEl.appendChild(tileEl);
                } else {
                    const backEl = playerBackEls[step.relIdx];
                    if (backEl) {
                        const b = document.createElement('div');
                        b.className = 'tile-back';
                        backEl.appendChild(b);
                    }
                }
            }
        }, t);
        dealAnimTimers.push(tid);
    }

    const endTid = setTimeout(() => {
        if (seq !== dealAnimSeq) return;
        dealingInProgress = false;
        dealAnimStartedAt = 0;
        hasDealtAnimation = true;
        renderGame(gameState || state);
        emitDealReady(Number(state.round_token || currentRoundToken));
    }, t + 300);
    dealAnimTimers.push(endTid);
}

function emitDealReady(roundToken) {
    const token = Number(roundToken || 0);
    if (!token) return;
    if (dealingInProgress) return;
    if (dealReadySentToken === token) return;
    socket.emit('deal_ready', { round_token: token, state_seq: latestStateSeq });
    dealReadySentToken = token;
}

function renderMyHand(state) {
    const myHandEl = document.getElementById('my-hand');
    if (!myHandEl) return;
    const canDiscard = state.turn === myId && !currentActions;
    const key = `${state.hand.join(',')}|${canDiscard ? 1 : 0}|${state.turn}|${state.drawn_tile ?? -1}`;
    if (key === lastHandRenderKey) return;
    lastHandRenderKey = key;
    myHandEl.innerHTML = '';
    state.hand.forEach((tile, index) => {
        const tileEl = createTileElement(tile);
        if (state.turn === myId && state.drawn_tile != null && index === state.hand.length - 1) {
            tileEl.classList.add('tile--drawn');
        }
        if (canDiscard) {
            tileEl.addEventListener('click', () => {
                tileEl.classList.add('discarding');
                setTimeout(() => {
                    socket.emit('action', { type: 'discard', tile: tile });
                }, 200);
            });
        }
        myHandEl.appendChild(tileEl);
    });
}

function showResults(scores, totals, matchOver, roundNo, roundMax) {
    const modal = document.getElementById('results-modal');
    const list = document.getElementById('score-list');
    list.innerHTML = '';
    
    // Sort scores? Or just list by player
    for (let i = 0; i < 4; i++) {
        const row = document.createElement('div');
        row.className = 'score-row';
        
        let pName = `Player ${i}`;
        if (i === myId) pName += " (You)";
        
        const score = scores[i];
        const total = totals ? totals[i] : score;
        const scoreClass = score >= 0 ? 'positive' : 'negative';
        row.innerHTML = `<span>${pName}</span><span class="score-val ${scoreClass}">本局 ${score > 0 ? '+' : ''}${score} / 累计 ${total > 0 ? '+' : ''}${total}</span>`;
        list.appendChild(row);
    }
    const titleEl = modal.querySelector('h2');
    if (titleEl) titleEl.innerText = matchOver ? `对局结束（${roundNo}/${roundMax}）` : `本局结束（${roundNo}/${roundMax}）`;
    if (resultBtn) {
        if (matchOver) {
            resultBtn.innerText = '返回大厅';
        } else if (myId === ownerSeat) {
            resultBtn.innerText = '开始下一局';
        } else {
            resultBtn.innerText = '等待房主开始';
        }
    }
    if (matchOver) {
        pendingRankChange = buildRankOutcomeIfEligible(totals || totalScores);
        const tip = document.createElement('div');
        tip.className = 'score-row';
        if (pendingRankChange && pendingRankChange.eligible) {
            tip.innerHTML = `<span>段位结算</span><span class="score-val ${pendingRankChange.delta >= 0 ? 'positive' : 'negative'}">${pendingRankChange.delta >= 0 ? '+' : ''}${pendingRankChange.delta} 星</span>`;
        } else {
            tip.innerHTML = `<span>段位结算</span><span class="score-val">本场不计入段位</span>`;
        }
        list.appendChild(tip);
    } else {
        pendingRankChange = null;
    }
    modal.classList.remove('hidden');
}

if (resultBtn) {
    resultBtn.addEventListener('click', async () => {
        const modal = document.getElementById('results-modal');
        if (gameState && gameState.match_over) {
            modal.classList.add('hidden');
            if (pendingRankChange && pendingRankChange.eligible) {
                await openRankChangeScreen(pendingRankChange);
                return;
            }
            location.reload();
            return;
        }
        if (gameState && !gameState.match_over && myId === ownerSeat) {
            resultBtn.disabled = true;
            resultBtn.innerText = '开始中...';
            socket.emit('start_game');
            return;
        }
        modal.classList.add('hidden');
    });
}

function triggerCutIn(text) {
    const container = document.getElementById('cut-in-container');
    const el = document.createElement('div');
    el.className = 'cut-in-text cut-in-active';
    el.innerText = text;
    container.appendChild(el);
    
    // Cleanup
    setTimeout(() => {
        el.remove();
    }, 2000);
}

function createTileElement(tileVal, small = false) {
    const el = document.createElement('div');
    el.className = 'tile';
    if (small) {
        el.classList.add('tile--small');
    }
    
    const face = document.createElement('div');
    face.className = 'tile-face';
    
    const canvas = document.createElement('canvas');
    canvas.className = 'tile-canvas';
    face.appendChild(canvas);
    el.appendChild(face);

    requestAnimationFrame(() => {
        renderTileCanvas(canvas, tileVal);
    });

    return el;
}

function renderTileCanvas(canvas, tileVal) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        requestAnimationFrame(() => renderTileCanvas(canvas, tileVal));
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    const w = rect.width;
    const h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = Math.max(6, Math.round(Math.min(w, h) * 0.10));
    drawTileFaceBase(ctx, w, h);

    if (tileVal === 40) {
        drawHongzhong(ctx, w, h, pad);
        return;
    }

    const suit = Math.floor(tileVal / 10);
    const rank = tileVal % 10;

    if (suit === 1) drawWan(ctx, w, h, pad, rank);
    else if (suit === 2) drawTong(ctx, w, h, pad, rank);
    else if (suit === 3) drawTiao(ctx, w, h, pad, rank);
}

function drawTileFaceBase(ctx, w, h) {
    ctx.save();
    const bottom = ctx.createLinearGradient(0, h * 0.82, 0, h);
    bottom.addColorStop(0, 'rgba(46,204,113,0)');
    bottom.addColorStop(1, 'rgba(46,204,113,0.14)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * 0.82, w, h * 0.18);

    const left = ctx.createLinearGradient(0, 0, w * 0.12, 0);
    left.addColorStop(0, 'rgba(46,204,113,0.10)');
    left.addColorStop(1, 'rgba(46,204,113,0)');
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, w * 0.12, h);
    ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

function drawText(ctx, text, x, y, size, color, align = 'center', strokeColor = null) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `800 ${size}px KaiTi, SimKai, serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (strokeColor) {
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.strokeStyle = strokeColor;
        ctx.strokeText(text, x, y);
    }
    ctx.fillText(text, x, y);
    ctx.restore();
}

function drawHongzhong(ctx, w, h, pad) {
    const red = '#c0392b';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    drawText(ctx, '中', w * 0.52, h * 0.55, Math.round(h * 0.62), red, 'center', 'rgba(0,0,0,0.22)');
    ctx.restore();
}

function drawWan(ctx, w, h, pad, rank) {
    const black = '#111111';
    const red = '#c0392b';
    const num = getWanRankText(rank);

    ctx.save();
    ctx.fillStyle = black;
    ctx.font = `700 ${Math.round(h * 0.46)}px SimSun, "Songti SC", "STSong", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, w * 0.52, h * 0.44);

    ctx.fillStyle = red;
    ctx.font = `700 ${Math.round(h * 0.30)}px SimSun, "Songti SC", "STSong", serif`;
    ctx.fillText('萬', w * 0.52, h * 0.78);
    ctx.restore();
}

function getWanRankText(rank) {
    const map = {
        1: '一',
        2: '二',
        3: '三',
        4: '四',
        5: '伍',
        6: '六',
        7: '七',
        8: '八',
        9: '九'
    };
    return map[rank] || String(rank);
}

function renderRevealDraws(state) {
    const revealCenter = document.getElementById('reveal-center');
    const msgArea = document.getElementById('msg-area');
    if (!msgArea || !revealCenter) return;
    const draws = state.reveal_draws;
    if (!Array.isArray(draws) || draws.length === 0) {
        msgArea.innerText = msgArea.dataset.msg || '';
        revealCenter.classList.add('hidden');
        revealCenter.innerHTML = '';
        return;
    }
    msgArea.innerText = msgArea.dataset.msg || '';
    revealCenter.classList.remove('hidden');
    revealCenter.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'reveal-center-title';
    title.innerText = '胡牌摸牌（抓马）：';
    revealCenter.appendChild(title);
    const wrap = document.createElement('div');
    wrap.className = 'reveal-draw-tiles';
    draws.forEach(t => wrap.appendChild(createTileElement(t, true)));
    revealCenter.appendChild(wrap);
}

function renderAvatars(state) {
    if (myId < 0) return;
    const aiSeatSet = new Set((state && state.ai_seats) || []);
    for (let relIdx = 0; relIdx < 4; relIdx++) {
        const absIdx = (myId + relIdx) % 4;
        const playerEl = document.getElementById(`player-${relIdx}`);
        if (!playerEl) continue;
        const avatarEl = playerEl.querySelector('.avatar');
        if (!avatarEl) continue;
        const profile = seatProfiles[absIdx] || {};
        const avatarId = Number(profile.avatar || ((absIdx % 5) + 1));
        const theme = avatarThemes[avatarId] || avatarThemes[1];
        const name = (profile.name || `玩家${absIdx + 1}`).slice(0, 8);
        const isAi = aiSeatSet.has(absIdx);
        let rankText = '';
        if (isAi) rankText = getAiRankLabelByLevel(roomAiLevel);
        else if (absIdx === myId) rankText = getRankLabel(rankState);
        else if (profile.rank_state) rankText = getRankLabel(profile.rank_state);
        avatarEl.style.background = theme.bg;
        avatarEl.innerText = theme.icon;
        avatarEl.title = name;
        avatarEl.setAttribute('data-name', name);
        avatarEl.setAttribute('data-rank', rankText);
    }
}

function drawRingDot(ctx, x, y, r, ringColor, holeColor = '#fcfcfc', centerDotColor = null) {
    ctx.save();
    const outer = r;
    const hole = r * 0.56;

    ctx.beginPath();
    ctx.arc(x, y, outer, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, hole, 0, Math.PI * 2);
    ctx.fillStyle = holeColor;
    ctx.fill();

    if (centerDotColor) {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = centerDotColor;
        ctx.fill();
    }
    ctx.restore();
}

function drawTong1(ctx, w, h) {
    const cx = w * 0.55;
    const cy = h * 0.58;
    const r = Math.min(w, h) * 0.25;
    drawRingDot(ctx, cx, cy, r, '#1e8a4a', '#ffffff', '#c0392b');
}

function drawTong(ctx, w, h, pad, rank) {
    if (rank === 1) {
        drawTong1(ctx, w, h);
        return;
    }
    const dots = getTongDots(rank);
    const colors = { red: '#c0392b', green: '#1e8a4a', white: '#ffffff', black: '#111111' };
    const r = Math.min(w, h) * getTongRadiusScale(rank);
    for (const d of dots) {
        const ring = colors[d.ring] || colors.green;
        const hole = '#ffffff';
        const center = d.center === 'red' ? '#c0392b' : null;
        drawRingDot(ctx, w * d.x, h * d.y, r, ring, hole, center);
    }
}

function getTongRadiusScale(rank) {
    const map = {
        2: 0.098,
        3: 0.094,
        4: 0.094,
        5: 0.090,
        6: 0.088,
        7: 0.086,
        8: 0.086,
        9: 0.084
    };
    return map[rank] || 0.082;
}

function drawBambooStick(ctx, x, y, len, color) {
    const w = Math.max(2.8, len * 0.072);
    const r = Math.max(1.8, w * 0.65);
    const x0 = x - w / 2;
    const y0 = y - len / 2;
    ctx.save();
    const hi = ctx.createLinearGradient(x0, y0, x0 + w, y0);
    hi.addColorStop(0, 'rgba(255,255,255,0.34)');
    hi.addColorStop(0.30, 'rgba(255,255,255,0)');
    hi.addColorStop(0.65, 'rgba(255,255,255,0.18)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');

    roundRectPath(ctx, x0, y0, w, len, r * 0.95);
    ctx.fillStyle = color;
    ctx.fill();

    roundRectPath(ctx, x0, y0, w, len, r * 0.95);
    ctx.fillStyle = hi;
    ctx.fill();

    const shade = ctx.createLinearGradient(0, y0, 0, y0 + len);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.globalCompositeOperation = 'multiply';
    roundRectPath(ctx, x0, y0, w, len, r * 0.95);
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.lineWidth = Math.max(1, w * 0.10);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.stroke();

    ctx.restore();
}

function tiaoSticks(rank, w, h) {
    const green = '#2ecc71';
    const red = '#e74c3c';
    const half = h * 0.34;
    const third = h * 0.24;
    const mapColor = (c) => c === 'red' ? red : green;
    const templates = {
        2: [
            { x: 0.52, y: 0.35, l: half, c: 'green' },
            { x: 0.52, y: 0.79, l: half, c: 'green' }
        ],
        3: [
            { x: 0.52, y: 0.34, l: half, c: 'green' },
            { x: 0.36, y: 0.79, l: half, c: 'green' },
            { x: 0.68, y: 0.79, l: half, c: 'green' }
        ],
        4: [
            { x: 0.36, y: 0.34, l: half, c: 'green' },
            { x: 0.68, y: 0.34, l: half, c: 'green' },
            { x: 0.36, y: 0.79, l: half, c: 'green' },
            { x: 0.68, y: 0.79, l: half, c: 'green' }
        ],
        5: [
            { x: 0.36, y: 0.34, l: half, c: 'green' },
            { x: 0.68, y: 0.34, l: half, c: 'green' },
            { x: 0.52, y: 0.57, l: half, c: 'red' },
            { x: 0.36, y: 0.79, l: half, c: 'green' },
            { x: 0.68, y: 0.79, l: half, c: 'green' }
        ],
        6: [
            { x: 0.30, y: 0.34, l: half, c: 'green' },
            { x: 0.52, y: 0.34, l: half, c: 'green' },
            { x: 0.74, y: 0.34, l: half, c: 'green' },
            { x: 0.30, y: 0.79, l: half, c: 'green' },
            { x: 0.52, y: 0.79, l: half, c: 'green' },
            { x: 0.74, y: 0.79, l: half, c: 'green' }
        ],
        7: [
            { x: 0.52, y: 0.25, l: third, c: 'red' },
            { x: 0.30, y: 0.50, l: third, c: 'green' },
            { x: 0.52, y: 0.50, l: third, c: 'green' },
            { x: 0.74, y: 0.50, l: third, c: 'green' },
            { x: 0.30, y: 0.76, l: third, c: 'green' },
            { x: 0.52, y: 0.76, l: third, c: 'green' },
            { x: 0.74, y: 0.76, l: third, c: 'green' }
        ],
        8: [
            { x: 0.30, y: 0.27, l: third, c: 'green' },
            { x: 0.44, y: 0.37, l: third, c: 'green' },
            { x: 0.60, y: 0.37, l: third, c: 'green' },
            { x: 0.74, y: 0.27, l: third, c: 'green' },
            { x: 0.30, y: 0.73, l: third, c: 'green' },
            { x: 0.44, y: 0.63, l: third, c: 'green' },
            { x: 0.60, y: 0.63, l: third, c: 'green' },
            { x: 0.74, y: 0.73, l: third, c: 'green' }
        ],
        9: [
            { x: 0.28, y: 0.34, l: third, c: 'green' },
            { x: 0.28, y: 0.57, l: third, c: 'green' },
            { x: 0.28, y: 0.80, l: third, c: 'green' },
            { x: 0.52, y: 0.34, l: third, c: 'red' },
            { x: 0.52, y: 0.57, l: third, c: 'red' },
            { x: 0.52, y: 0.80, l: third, c: 'red' },
            { x: 0.76, y: 0.34, l: third, c: 'green' },
            { x: 0.76, y: 0.57, l: third, c: 'green' },
            { x: 0.76, y: 0.80, l: third, c: 'green' }
        ]
    };
    const rows = templates[rank] || [];
    return rows.map(s => ({ x: w * s.x, y: h * s.y, len: s.l, color: mapColor(s.c) }));
}

function drawTiao1Bird(ctx, w, h) {
    drawBambooStick(ctx, w * 0.56, h * 0.63, h * 0.62, '#2ecc71');

    ctx.save();
    ctx.translate(w * 0.56, h * 0.45);

    ctx.beginPath();
    ctx.ellipse(-w * 0.05, h * 0.03, w * 0.10, h * 0.065, -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#2ecc71';
    ctx.fill();
    ctx.lineWidth = Math.max(1, w * 0.01);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-w * 0.12, -h * 0.02, w * 0.048, 0, Math.PI * 2);
    ctx.fillStyle = '#2980b9';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-w * 0.17, -h * 0.02);
    ctx.lineTo(-w * 0.24, -h * 0.00);
    ctx.lineTo(-w * 0.18, h * 0.02);
    ctx.closePath();
    ctx.fillStyle = '#e67e22';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-w * 0.13, -h * 0.03, w * 0.007, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.00, h * 0.05);
    ctx.quadraticCurveTo(w * 0.18, h * 0.07, w * 0.20, h * 0.17);
    ctx.quadraticCurveTo(w * 0.06, h * 0.14, -w * 0.02, h * 0.08);
    ctx.closePath();
    ctx.fillStyle = '#1abc9c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.02, h * 0.06);
    ctx.quadraticCurveTo(w * 0.20, h * 0.10, w * 0.18, h * 0.22);
    ctx.quadraticCurveTo(w * 0.06, h * 0.18, 0, h * 0.10);
    ctx.closePath();
    ctx.fillStyle = 'rgba(52, 152, 219, 0.70)';
    ctx.fill();

    ctx.restore();
}

function drawTiao(ctx, w, h, pad, rank) {
    if (rank === 1) {
        drawTiao1Bird(ctx, w, h);
        return;
    }
    const sticks = tiaoSticks(rank, w, h);
    for (const s of sticks) {
        drawBambooStick(ctx, s.x, s.y, s.len, s.color);
    }
}

function getTongDots(rank) {
    const t = {
        2: [{ x: 0.52, y: 0.35, ring: 'green' }, { x: 0.52, y: 0.74, ring: 'green' }],
        3: [{ x: 0.36, y: 0.32, ring: 'green' }, { x: 0.52, y: 0.53, ring: 'red' }, { x: 0.68, y: 0.74, ring: 'green' }],
        4: [{ x: 0.38, y: 0.35, ring: 'green' }, { x: 0.66, y: 0.35, ring: 'green' }, { x: 0.38, y: 0.74, ring: 'green' }, { x: 0.66, y: 0.74, ring: 'green' }],
        5: [{ x: 0.38, y: 0.34, ring: 'green' }, { x: 0.66, y: 0.34, ring: 'green' }, { x: 0.52, y: 0.53, ring: 'red' }, { x: 0.38, y: 0.72, ring: 'green' }, { x: 0.66, y: 0.72, ring: 'green' }],
        6: [{ x: 0.42, y: 0.24, ring: 'red' }, { x: 0.62, y: 0.24, ring: 'red' }, { x: 0.38, y: 0.54, ring: 'green' }, { x: 0.66, y: 0.54, ring: 'green' }, { x: 0.38, y: 0.74, ring: 'green' }, { x: 0.66, y: 0.74, ring: 'green' }],
        7: [{ x: 0.36, y: 0.26, ring: 'red' }, { x: 0.52, y: 0.34, ring: 'red' }, { x: 0.68, y: 0.42, ring: 'red' }, { x: 0.44, y: 0.64, ring: 'green' }, { x: 0.60, y: 0.64, ring: 'green' }, { x: 0.44, y: 0.78, ring: 'green' }, { x: 0.60, y: 0.78, ring: 'green' }],
        8: [{ x: 0.42, y: 0.26, ring: 'black' }, { x: 0.62, y: 0.26, ring: 'black' }, { x: 0.42, y: 0.42, ring: 'black' }, { x: 0.62, y: 0.42, ring: 'black' }, { x: 0.42, y: 0.58, ring: 'black' }, { x: 0.62, y: 0.58, ring: 'black' }, { x: 0.42, y: 0.74, ring: 'black' }, { x: 0.62, y: 0.74, ring: 'black' }],
        9: [{ x: 0.38, y: 0.30, ring: 'green' }, { x: 0.52, y: 0.30, ring: 'green' }, { x: 0.66, y: 0.30, ring: 'green' }, { x: 0.38, y: 0.53, ring: 'red' }, { x: 0.52, y: 0.53, ring: 'red' }, { x: 0.66, y: 0.53, ring: 'red' }, { x: 0.38, y: 0.76, ring: 'green' }, { x: 0.52, y: 0.76, ring: 'green' }, { x: 0.66, y: 0.76, ring: 'green' }]
    };
    return t[rank] || [];
}

function showActions(actions, tile) {
    actionsPanel.classList.remove('hidden');
    // Toggle buttons based on actions
    document.getElementById('btn-peng').style.display = actions.includes('pong') ? 'block' : 'none';
    document.getElementById('btn-gang').style.display = actions.includes('kong') ? 'block' : 'none';
    document.getElementById('btn-hu').style.display = actions.includes('hu') ? 'block' : 'none';
    document.getElementById('btn-pass').style.display = 'block';
    hideKongPicker();
    
    // Pass button always shown when actions available
    document.getElementById('btn-pass').onclick = () => {
        socket.emit('action', { type: 'pass' });
        actionsPanel.classList.add('hidden');
        currentActions = null;
    };
    
    // Attach handlers
    if (actions.includes('pong')) {
        document.getElementById('btn-peng').onclick = () => {
            socket.emit('action', { type: 'pong', tile: tile });
            actionsPanel.classList.add('hidden');
            currentActions = null;
        };
    }
    if (actions.includes('kong')) {
        document.getElementById('btn-gang').onclick = () => {
            socket.emit('action', { type: 'kong', tile: tile });
            actionsPanel.classList.add('hidden');
            currentActions = null;
        };
    }
    if (actions.includes('hu')) {
        document.getElementById('btn-hu').onclick = () => {
            socket.emit('action', { type: 'hu', tile: tile });
            actionsPanel.classList.add('hidden');
            currentActions = null;
        };
    }
}
