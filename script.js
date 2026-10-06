import {seatRegion,mountTableWorld} from './table-world-layout.js?v=1.9.20';
import {applyTableView,placeActionBar} from './table-view.js?v=1.9.20';
import {rememberDiscard,pendingDiscards,animateDiscards,cancelDiscardFlights} from './table-motion.js?v=1.9.20';
import {createTileElement,tileArtUrl} from './tile.js?v=1.9.20';
import {tableAudio} from './table-audio.js?v=1.9.20';
import {ActionSoundEvents} from './action-sound-events.js?v=1.9.20';
import {renderLobbyProfile} from './lobby.js?v=1.9.20';
import {badgeSVG} from './rank-badge.js?v=1.9.20';
import {wallet} from './wallet.js?v=1.9.20';
import {sharedRank,rankClockOffset} from './shared-rank.js?v=1.9.20';
import {getGameAssets} from './game-assets.js?v=1.9.20';
mountTableWorld(document.querySelector('#game-screen .table'));
const IS_OFFLINE = window.MAHJONG_OFFLINE === true;
const ROOM_SESSION_KEY = IS_OFFLINE ? 'hz_offline_room_code_v1' : 'hz_room_code_v1';
const socket = IS_OFFLINE ? window.createOfflineSocket() : io(window.MAHJONG_SERVER_URL || undefined, { reconnectionDelay: 500, reconnectionDelayMax: 4000, timeout: 10000 });
let actionPending = false;
const soundEvents = new ActionSoundEvents();
let roomGameStatus = 'IDLE';
let humanSeats = [];
let toastTimer;

function readStorage(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* 禁用存储时仍然可以正常对局。 */ }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = String(message || '操作未完成，请重试');
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

function sendAction(payload) {
    if (!socket.connected || !gameState || actionPending) return;
    actionPending = true;
    document.getElementById('my-hand').classList.add('pending');
    socket.emit('action', { ...payload, round_token: currentRoundToken, state_seq: latestStateSeq });
    hideActionCues();
    hideKongPicker();
}

const aiNames = ['青竹', '听雨', '归云', '望山'];

function displayName(seat, state = gameState) {
    return state?.ai_seats?.includes(seat) ? `${aiNames[seat]} · 人机`
        : (seatProfiles[seat]?.name || `玩家${seat + 1}`);
}

const cnNums = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };

let myId = -1;
let gameState = null;
let currentActions = null;
let hasDealtAnimation = false;
let dealingInProgress = false;
let dealAnimStartedAt = 0;
let kongCandidates = null;
let roomCode = readSession(ROOM_SESSION_KEY) || '';
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

const PLAYER_TOKEN_KEY = 'hz_player_token_v1';
const USERNAME_STORAGE_KEY = 'hz_username_v1';
const DAILY_TASK_STORAGE_KEY = IS_OFFLINE ? 'hz_offline_daily_view_v1' : 'hz_daily_task_v1';
const VERSION_SEEN_KEY = 'hz_seen_version_v1';
const APP_VERSION = '1.9.20';
const rankIcons = ['初', '竹', '玉', '玄', '御', '尊', '圣', '魂'];
const rankSubTexts = ['Ⅲ', 'Ⅱ', 'Ⅰ'];
const rankNames = ['试刀者', '听风客', '控场师', '天胡客', '千面手', '无双将', '镇国柱', '诛仙位'];
const changelogEntries = [
    {version:'1.9.20',date:'2026-10-06',lines:[
        '新增「海贼王 · 红发香克斯」独立牌背：暗红底色，保留举刀姿态与鲜红刀光。',
        '免费预览，1 张礼券永久解锁，已拥有者切换免费。',
        '装扮预览提前准备并复用，点开更快；换牌面、桌布保留所选牌背。'
    ]},
    {version:'1.9.19',date:'2026-10-06',lines:[
        '每天完成4场10／15／20局整场对局，可领取1张礼券。',
        '登峰礼新增第七大段2张、第八大段4张礼券。',
        '修复蓝紫幻纹详情在滚动临界位置反复抖动。'
    ]},
    {version:'1.9.18',date:'2026-10-06',lines:[
        '对手立牌加高，柯南等图案牌背展示更完整。',
        '修复装扮切换牌面时的预览抖动，首次点击即可稳定显示。',
        '新增 15 个一次性礼券兑换码，原有装扮、礼券和存档保留。'
    ]},
    {version:'1.9.17',date:'2026-10-06',lines:[
        '新增「间谍过家家 · 秘密家宴」：灰绿织纹，三位家人与完整作品标题同桌。',
        '配有轻木合扣与短钢琴行动音，可免费预览试听，1 张礼券永久解锁。',
        '保留牌面、独立牌背和已有装扮，临时窗口覆盖印花而不移位。'
    ]},
    {version:'1.9.16',date:'2026-10-06',lines:[
        '新增「英雄联盟 · 峡谷幻光」：亚索、金克丝与格温共聚青蓝幻境。',
        '风切与晶音行动反馈，可免费预览试听，1 张礼券永久解锁。',
        '沿用当前牌面与牌背搭配，保留已有装扮和存档。'
    ]},
    {version:'1.9.15',date:'2026-10-06',lines:[
        '新增「名侦探柯南 · 蓝金徽章」牌背，可免费预览，1 张礼券永久解锁。',
        '牌面与牌背自由搭配，蓝紫幻纹也能使用柯南牌背。',
        '换牌面、换桌布保留独立牌背，切回默认配色恢复当前默认背色。'
    ]},
    {version:'1.9.14',date:'2026-10-06',lines:[
        '新增「火影忍者 · 忍道墨卷」：四位忍者、红月乌鸦与烟青纸墨桌布。',
        '配有木扣、短笛行动音，可免费预览试听，1 张礼券永久解锁。',
        '保留当前牌面、已有装扮和存档，临时窗口覆盖桌布而不移位。'
    ]},
    {version:'1.9.13',date:'2026-10-06',lines:[
        '新增「海贼王 · 向新世界出航」：完整蓝海船景、草帽伙伴与动画标题。',
        '配有木扣、小鼓与拨弦行动音，可免费预览试听，1 张礼券永久解锁。',
        '保留当前牌面、装扮和存档，听牌等窗口覆盖桌布而不移位。'
    ]},
    {version:'1.9.12',date:'2026-10-06',lines:[
        '新增「名侦探柯南 · 真相之眼」：暮蓝书案、旧金线索与两位侦探。',
        '配有木扣与钢琴行动音，可免费预览试听，1 张礼券永久解锁。',
        '保留原牌面、装扮和存档，听牌等窗口覆盖印花而不移位。'
    ]},
    {version:'1.9.11',date:'2026-10-06',lines:[
        '「蓝紫幻纹」焕新：青蓝紫晶面、流光双框与云纹星芒，保留全部经典牌图。',
        '已拥有者直接换新；可免费预览，新玩家用 1 张礼券永久解锁。',
        '牌面选择随设备保存，切回经典恢复原牌背；素材失败可重试，礼券与已有装扮保留。',
    ]},
    {version:'1.9.9',date:'2026-10-05',lines:[
        '新增「狐妖小红娘 · 花缘雅集」：烟青绢面、藕粉花枝与三位雅客。',
        '出牌、碰、杠、胡随桌布使用玉碰与短弦音；可免费预览试听，1 张礼券永久解锁。',
        '听牌与聊天覆盖桌布，人物印花保持原位；原有装扮与存档保留。',
    ]},
    {version:'1.9.8',date:'2026-10-05',lines:[
        '设置新增兑换码；新人整场礼、第三大段礼和第五大段双礼券上线。',
        '至少两位真人完成友人场10/15/20局整场，每日可领取2星。',
        '安卓自动检查新版本，联机与离线共用内置素材，减少等待。',
    ]},
    {version:'1.9.7',date:'2026-10-05',lines:[
        '新增「赛博朋克 · 霓虹暮城」：蓝紫夜城、薄雾灯带与屋顶背影。',
        '出牌、碰、杠、胡自动使用柔和电子音；可免费预览试听，1 张礼券永久解锁。',
        '听牌和聊天覆盖桌布，夜城印花保持原位；原有装扮与存档保留。',
    ]},
    {version:'1.9.6',date:'2026-10-05',lines:[
        '碰杠胡移到手牌上方，大按钮、牌预览和提示音让选择更清楚。',
        '当前出牌用贴牌的红色细框和小三角标记，浅色桌布也容易找到。',
        '联机选择显示计时，支持键盘操作与减少动态效果。',
    ]},
    {version:'1.9.5',date:'2026-10-05',lines:[
        '入馆先准备牌面、桌布与声音，进度可见；素材失败可重试，减少白板。',
        '装扮预览及时显示所选桌布，礼券解锁可取消，失败不扣券。',
        '听牌与聊天窗口覆盖桌布，印花保持原位。',
    ]},
    {version:'1.9.4',date:'2026-10-05',lines:[
        '安卓横屏铺满屏幕，隐藏通知栏与导航栏，刘海位置保留操作避让。',
        '切换友人场、离线场及连接失败后重试，继续打开刚才选择的场次。',
        '手机牌桌减轻横向拉伸，牌河与手牌显示更舒展。',
    ]},
    {version:'1.9.3',date:'2026-10-04',lines:[
        '新增「蛋仔派对 · 弹弹乐园」：蜜桃桌布、滑道风车与三位弹跳伙伴。',
        '出牌、碰、杠、胡自动使用弹跳音效；可免费预览试听，1 张礼券永久解锁。',
        '安卓换上红中麻将新图标，离线牌馆同步收录六款桌布。',
    ]},
    {version:'1.9.2',date:'2026-10-04',lines:[
        '大厅、友人场和功能按钮的绿色再次提亮，局内昵称去掉长条底框。',
        '离线与联机共用段位，每月开启新赛季；登峰礼按当前段位领取。',
        '开桌界面更简洁，排位、任务和礼券说明统一收录在设置的规则页。',
    ]},
    {version:'1.9.1',date:'2026-10-04',lines:[
        '大厅青绿色底色稍作提亮，保留原有漆金牌匾和卷轴风格。',
        '离线新牌桌改为随当前段位自动设置 1–8 档人机难度，整场固定。',
        '离线新模式加星与联机一致，≥30 分额外 +1 星；旧存档按原难度与规则继续。',
    ]},
    {version:'1.9.0',date:'2026-10-04',lines:[
        '主界面焕新：漆金牌匾、个人段位徽章和卷轴弹层，横屏一屏入座。',
        '新增登峰礼券与装扮解锁，离线和联机共用；老玩家当前桌布保留。',
        '对手手牌改为立体立牌，侧家头像避让；玩法、手牌和段位规则保持。',
    ]},
    {version:'1.7.10',date:'2026-10-04',lines:[
        '新增库洛米 · 莓紫心愿：灰莓紫整桌织物、炭黑包边、连续爱心飘带与简化蕾丝，库洛米和紫灰长耳伙伴一起入桌。',
        '心形眨眼与活泼姿态印花共用牌桌投影，保持本人手牌、平躺副露、头像和读数清楚。',
        '桌布自动绑定木块轻敲、玩具琴双击、三击及庆祝收尾；自摸使用胡音，静音、试听取消、行动去重和失败回退保持。',
    ]},
    {version:'1.7.9',date:'2026-10-04',lines:[
        '新增「无畏契约 · 萌系特工」完整牌桌：深蓝灰战术桌垫、四周风痕与紫影，三名 Q 版特工共同入桌。',
        '搭配轻机械落点、双段确认、能量脉冲与短胜利音；选桌自动绑定，保留静音与行动去重。',
        '主页四款装扮可滚动选择；保留青玉、奶蛙、玉桂狗及原有选择，修正离线页版本显示。',
    ]},
    {version:'1.7.8',date:'2026-10-04',lines:[
        '玉桂狗桌布四周补齐云雾与星点，保留安静的中央牌区',
        '新增左下气球束、右上云星挂饰，装扮缩略图与实际桌布一致',
        '保留手牌、公共视角与主题声音，角落印花随信息区避让',
    ]},
    {version:'1.7.7',date:'2026-10-04',lines:[
        '新增玉桂狗 · 云端游园：雾蓝粉紫整桌桌布与专属行动音效',
        '主页装扮可试听，桌布与声音一起记忆；静音、取消和失败回退保持可靠',
        '成功行动统一触发声音，修复点击出牌与回执重复响声',
    ]},
    {
        version: '1.7.6', date: '2026-10-04',
        lines: ['本人手牌宽高适度放大，牌面更清楚、点击更方便',
            '同步副露避让与提示位置，保持横屏桌面布局']
    },
    {
        version: '1.7.5', date: '2026-10-04',
        lines: ['本人的碰杠牌改为桌面平躺，手牌保留原大小与正向操作',
            '风位、局数、余牌与回合提示分区显示，横屏不再相互覆盖']
    },
    {
        version: '1.7.4', date: '2026-10-04',
        lines: ['横屏牌馆：手机／平板启动尝试横屏，安卓固定横屏',
            '局内精简顶部组件，喇叭开关与对家头像贴近手牌',
            '装扮仅在主页更换，大小奶蛙统一暖金黄色，昵称限 1–8 字']
    },
    {
        version: '1.7.3', date: '2026-10-04',
        lines: ['奶蛙桌布右下方新增趴坐微笑的小奶蛙',
            '横竖屏适配，听牌与操作展开时装饰自动退让']
    },
    {
        version: '1.7.2', date: '2026-10-04',
        lines: ['万、筒、条与红中全部统一为雀魂原始牌面素材',
            '大厅、装扮预览与在线／离线对局共用完整 28 张本地贴图']
    },
    {
        version: '1.7.1', date: '2026-10-04',
        lines: ['一条、八条、六筒、八筒接入雀魂原始牌面素材',
            '在线与离线共用本地贴图，保留现有牌体与操作方式']
    },
    {
        version: '1.7.0', date: '2026-10-04',
        lines: ['原创平涂牌面：筒纹加大，竹节增粗，八条上 W 下 M',
            '青玉使用琥珀牌背、奶蛙使用深青牌背，河牌加厚叠压',
            '增加牌体倒角、侧边与整体落影，保留奶蛙原画与对局规则']
    },
    {
        version: '1.6.0',
        date: '2026-10-03',
        lines: [
            '全新原创牌面：加粗文楷刻字、同心筒圈、渐变竹节与孔雀一条',
            '立牌、平躺和牌背使用独立牌身，侧家牌面的方向更清楚',
            '正方形牌桌与风车牌河带来更明确的远近层次，后期牌区不再相挤',
            '手牌放大并贴近底边，副露同排；出牌飞向牌河中的实际位置',
            '青玉与奶蛙分别使用青玉、焦糖牌背，换肤保留当前对局与手牌'
        ]
    },
    {
        version: '1.5.0',
        date: '2026-10-03',
        lines: [
            '奶蛙升级为完整暖麦芽桌布，搭配哑光织物、咖啡桌沿和灰金收边',
            '两款牌桌共用轻度斜俯视，本人手牌和操作信息保持正向清晰',
            '印花与桌布共用投影，可自然延伸到不透明牌体下方',
            '完整桌面预览、取消与本地记忆继续可用，换肤不重建手牌'
        ]
    },
    {
        version: '1.4.0',
        date: '2026-10-03',
        lines: [
            '新增牌桌装扮：经典青玉与奶蛙 · 捧腹大笑，大厅和局内均可切换',
            '装扮预览与应用分开，选择保存在本机，不影响其他牌友',
            '桌面、横屏、竖屏各自安排插画，并避让牌河、副露与操作提示',
            '安卓离线也可使用本地装扮，换肤保留当前手牌与对局进度'
        ]
    },
    ...(IS_OFFLINE ? [{
        version: '1.3.0',
        date: '2026-10-01',
        lines: [
            '新增独立离线段位，标准与进阶 10／15／20 局整场结算可加减星',
            '进阶沿用联机加星规则，标准取消 ≥30 分额外奖励星',
            '按手机自然月重置段位，重置前的段位保存到本机历史',
            '新增离线每日任务，按手机时间每日 0 点刷新',
            '段位、任务与牌桌立即保存，关闭应用后可恢复；轻松难度仅练习'
        ]
    }, {
        version: '1.2.0',
        date: '2026-10-01',
        lines: [
            '新增 APK 离线练习，无需网络和服务器，三位本机人机陪你打',
            '提供轻松、标准和进阶三种人机难度',
            '自动保存牌桌进度，关闭应用后可继续上次对局',
            '离线练习不计段位，好友联机仍使用在线牌馆',
            '保留横竖屏牌桌、碰杠、自摸、听牌及抓马结算'
        ]
    }] : []),
    {
        version: '1.1.0',
        date: '2026-09-30',
        lines: [
            '全新青玉牌馆大厅与四人牌桌，新增分数、庄家和回合指示',
            '重绘 28 张矢量牌面，支持小屏幕和高清显示',
            '修复开局奖励计分、碰后胡牌、抢杠展示及重复操作',
            '完善断线接管、座位恢复与结算流程',
            '每日任务与段位奖励改为服务器保存，重进后不会丢失',
            '新增自动胡牌、声音开关及键盘出牌；资源全部本地加载'
        ]
    },
    {
        version: '1.0.0',
        date: '2026-03-09',
        lines: [
            '新增大厅左侧每日任务入口，支持任务进度与领奖',
            '新增每日任务星级奖励，不同任务可获得1~2颗段位星',
            '新增大厅左上角日志按钮，可查看历史版本更新',
            '新增首次进入新版本自动弹出最近一次更新内容',
            '优化段位、文案与大厅交互的一致性展示'
        ]
    }
];
const dailyTaskTemplates = [
    { id: 'finish_rank_match', name: '完成一次10/15/20局整场对局', target: 1, reward: 1 },
    { id: 'first_in_rank_match', name: '10/15/20局整场结算取得第一', target: 1, reward: 2 },
    { id: 'clean_hu_three', name: '清水胡牌3次（无红中）', target: 3, reward: 2 },
    { id: 'friend_rank_match', name: '至少两位真人完成友人场10/15/20局整场', target: 1, reward: 2 }
];


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
let rankState = loadRankState();
const playerToken = loadPlayerToken();
let preferredName = loadPreferredName();
let dailyTaskState = loadDailyTaskState();




function cloneRankState(s) {
    const finite = (value, fallback) => Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : fallback;
    return { major: finite(s?.major, 1), minor: finite(s?.minor, 0), stars: finite(s?.stars, 0) };
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
    return sharedRank?.refresh().rank_state || {major:1,minor:0,stars:0};
}

function loadPlayerToken() {
    try {
        let token = localStorage.getItem(PLAYER_TOKEN_KEY);
        if (token && token.length >= 8) return IS_OFFLINE ? token : sharedRank?.bindToken(token)||token;
        token = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        writeStorage(PLAYER_TOKEN_KEY, token);
        return IS_OFFLINE ? token : sharedRank?.bindToken(token)||token;
    } catch {
        return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
}

function loadPreferredName() {
    try {
        return (localStorage.getItem(USERNAME_STORAGE_KEY) || '').trim();
    } catch {
        return '';
    }
}

function savePreferredName(name) {
    const checked = MahjongNickname.validate(name);
    if (!checked.ok) return;
    const val = checked.name;
    preferredName = val;
    writeStorage(USERNAME_STORAGE_KEY, val);
    renderRankPanel();
}

function getEnteredName() {
    const checked = MahjongNickname.validate(usernameInput?.value);
    usernameInput?.setCustomValidity(checked.message);
    usernameInput?.setAttribute('aria-invalid', String(!checked.ok));
    if (!checked.ok) { showToast(checked.message); usernameInput?.focus(); return null; }
    savePreferredName(checked.name);
    return checked.name;
}

function getProfileName() {
    const typed = MahjongNickname.validate(usernameInput?.value);
    const saved = MahjongNickname.validate(preferredName);
    return typed.ok ? typed.name : saved.ok ? saved.name : '';
}

function saveRankState() {
    rankState = loadRankState();
}

function rankSyncPacket(){return sharedRank?.packet(rankClockOffset());}
let rankSyncTimer, receivingRank=false, unsupportedRank=false;
function syncRankProfile(){
    if(IS_OFFLINE||!socket.connected||!sharedRank)return;
    socket.emit('get_profile',{player_token:playerToken,name:getProfileName(),rank_sync:rankSyncPacket()});
}
function acceptSharedRank(payload){
    if(!IS_OFFLINE&&payload?.shared_rank){
        try{receivingRank=true;sharedRank.receive(payload.shared_rank);}catch(e){showToast(e.message);}finally{receivingRank=false;}
    }
    rankState=loadRankState();renderRankPanel();renderRankHelpText();
    const current=sharedRank?.snapshot();
    if(!IS_OFFLINE&&current&&(current.pending.length||current.remote.month!==current.month)){clearTimeout(rankSyncTimer);rankSyncTimer=setTimeout(syncRankProfile,50);}
}
window.addEventListener('unifiedrankchange',e=>{
    rankState=e.detail.rank_state;renderRankPanel();renderRankHelpText();
    if(IS_OFFLINE){window.refreshOfflineCalendar?.();}
    else if(!receivingRank&&(e.detail.pending.length||e.detail.remote.month!==e.detail.month)){
        clearTimeout(rankSyncTimer);rankSyncTimer=setTimeout(syncRankProfile,50);
    }
});
window.addEventListener('rankstorageerror',e=>showToast(e.detail));

function getTodayKey() {
    if (IS_OFFLINE && window.MAHJONG_OFFLINE_PROFILE?.daily_tasks?.date) return window.MAHJONG_OFFLINE_PROFILE.daily_tasks.date;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function createDailyTaskSnapshot() {
    return {
        date: getTodayKey(),
        tasks: dailyTaskTemplates.map(t => ({ id: t.id, progress: 0, done: false, claimed: false }))
    };
}

function normalizeDailyTaskState(raw) {
    const base = createDailyTaskSnapshot();
    if (!raw || typeof raw !== 'object') return base;
    if (raw.date !== base.date) return base;
    if (!Array.isArray(raw.tasks)) return base;
    const map = new Map();
    raw.tasks.forEach(t => {
        if (!t || typeof t !== 'object') return;
        map.set(String(t.id), {
            id: String(t.id),
            progress: Math.max(0, Number(t.progress || 0)),
            done: !!t.done,
            claimed: !!t.claimed
        });
    });
    base.tasks = dailyTaskTemplates.map(meta => {
        const hit = map.get(meta.id);
        if (!hit) return { id: meta.id, progress: 0, done: false, claimed: false };
        const progress = Math.min(meta.target, Math.max(0, hit.progress));
        const done = hit.done || progress >= meta.target;
        return { id: meta.id, progress, done, claimed: done ? !!hit.claimed : false };
    });
    return base;
}

function loadDailyTaskState() {
    try {
        const raw = localStorage.getItem(DAILY_TASK_STORAGE_KEY);
        if (!raw) return createDailyTaskSnapshot();
        return normalizeDailyTaskState(JSON.parse(raw));
    } catch {
        return createDailyTaskSnapshot();
    }
}

function saveDailyTaskState() {
    dailyTaskState = normalizeDailyTaskState(dailyTaskState);
    writeStorage(DAILY_TASK_STORAGE_KEY, JSON.stringify(dailyTaskState));
}

function getTaskRuntime(id) {
    const meta = dailyTaskTemplates.find(t => t.id === id);
    if (!meta) return null;
    const state = dailyTaskState.tasks.find(t => t.id === id) || { id, progress: 0, done: false, claimed: false };
    return { meta, state };
}



function claimTaskReward(id) {
    if(id==='finish_four_matches'){
        const result=wallet.claimDaily(wallet.dailyStatus().date);
        showToast(result.ok?'获得礼券 ×1':result.reason==='storage_failed'?'礼券未能保存，请重试':result.reason==='new_day'?'已到新的一天，每日任务已刷新':'任务尚未完成或奖励已领取');
        renderDailyTaskPanel();return;
    }
    if(!sharedRank){showToast(window.HZ_RANK_ERROR||'段位存档暂时不可用，请保留应用数据');return;}
    const runtime = getTaskRuntime(id);
    if (!runtime?.state.done || runtime.state.claimed) return;
    if (!socket.connected) { showToast('连接恢复后即可领奖'); return; }
    socket.emit('claim_daily_reward', { player_token: playerToken, task_id: id, name: getProfileName(),
        ...(IS_OFFLINE ? {date: dailyTaskState.date} : {rank_sync:rankSyncPacket()}) });
}



function getRankLabel(state) {
    const normalized = normalizeRankState(state);
    const name = rankNames[normalized.major - 1] || rankNames[0];
    return normalized.major === 8 ? name : `${name} ${rankSubTexts[normalized.minor]}`;
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
    wallet.observeRank(IS_OFFLINE?'offline':'online',normalizeRankState(rankState).major);
    renderLobbyProfile({name:preferredName||'牌友',avatar:selectedAvatarId,rank:normalizeRankState(rankState),offline:IS_OFFLINE});
    if(!sharedRank){document.getElementById('rank-text').textContent='段位暂不可用';document.getElementById('rank-stars').textContent='—';}
}

function handlePageResume() {
    if (document.visibilityState !== 'visible') return;
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
    if (IS_OFFLINE) return !!gameState?.match_over && !!gameState?.rank_outcome?.eligible;
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
    const authoritative = gameState?.rank_outcome;
    const place = authoritative?.place ?? getMyPlacementByTotals(totals);
    const baseDelta = authoritative?.base_delta ?? getRankDeltaByRule(place, myScore);
    const bonusStars = authoritative?.bonus_stars ?? (myScore >= 30 ? 1 : 0);
    const delta = authoritative?.delta ?? (baseDelta + bonusStars);
    const trans = simulateRankChange(authoritative?.before || rankState, delta);
    if (authoritative?.after) trans.after = normalizeRankState(authoritative.after);
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
    if (badgeEl) {const previous=Number(badgeEl.dataset.major||state.major);badgeEl.innerHTML=badgeSVG(state.major);badgeEl.classList.toggle('rank-promote',state.major>previous);badgeEl.dataset.major=state.major;}
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
        socket.emit('leave_room');
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
    socket.emit('get_profile',{player_token:playerToken,name:getProfileName(),rank_sync:IS_OFFLINE?undefined:rankSyncPacket()});
    confirmBtn.classList.remove('hidden');
    confirmBtn.onclick = () => {
        socket.emit('leave_room');
    };
}

function ensureAudioContext() { return tableAudio.unlock(); }
function playActionSound(kind) { return tableAudio.play(kind); }

// DOM Elements
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game-screen');
const bootLoading = document.getElementById('boot-loading');
const bootLoadingText = document.getElementById('boot-loading-text');
const bootLoadingSub = document.getElementById('boot-loading-sub');
const bootProgress = document.getElementById('boot-progress');
const bootPercent = document.getElementById('boot-percent');
const bootRetry = document.getElementById('boot-retry');
const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const usernameInput = document.getElementById('username');
const createEntryBtn = document.getElementById('create-entry-btn');
const joinEntryBtn = document.getElementById('join-entry-btn');
const createPanel = document.getElementById('create-panel');
const joinPanel = document.getElementById('join-panel');
const startBtn = document.getElementById('start-btn');
const leaveBtn = document.getElementById('leave-btn');
const statusMsg = document.getElementById('status-msg');
const actionsPanel = document.getElementById('actions-panel');
const cueMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const cuePromptKeys = new Set();
let cueOpen = false, cueKey = null, cueTimerKey = null, cueTimerStarted = 0, cueTimerInterval;
let cueFocusIndex = 0, lastHandFocusIndex = 0, cueFocusTicket = 0, cueReconnectRequest = false;
document.addEventListener('focusin', event => {
    const tile = event.target.closest?.('#my-hand > .tile');
    if (tile) lastHandFocusIndex = [...tile.parentElement.children].indexOf(tile);
});
function stopCueTimer() {clearInterval(cueTimerInterval);cueTimerInterval = null;}
function paintCueTimer() {
    stopCueTimer();
    const timer = actionsPanel.querySelector('.cue-timer');
    if (IS_OFFLINE || !cueOpen) {timer.hidden = true;return;}
    timer.hidden = false;
    const line = document.createElement('i');timer.replaceChildren(line);
    const elapsed = Math.max(0,performance.now()-cueTimerStarted);
    if (cueMotion.matches) {
        line.style.animationName = 'none';
        const draw = () => {line.style.transform = `scaleX(${Math.max(0,1-Math.floor((performance.now()-cueTimerStarted)/1000)/8)})`;};
        draw();cueTimerInterval = setInterval(draw,1000);
    } else line.style.animationDelay = `${-elapsed}ms`;
}
cueMotion.addEventListener('change',() => {if(cueOpen&&!IS_OFFLINE)paintCueTimer();});
function hideActionCues() {
    const wasOpen = cueOpen, active = document.activeElement;
    const returnFocus = wasOpen && (active === document.body || actionsPanel.contains(active) || active?.closest?.('#kong-picker'));
    if(!actionsPanel.classList.contains('hidden'))actionsPanel.classList.add('hidden');cueOpen = false;stopCueTimer();
    const board = gameScreen.querySelector('.table');if(board.classList.contains('cue-claim-open'))board.classList.remove('cue-claim-open');
    const ting = board.querySelector('#ting-status');ting?.style.removeProperty('left');ting?.style.removeProperty('right');
    if (returnFocus) {
        const ticket = ++cueFocusTicket, index = cueFocusIndex;
        requestAnimationFrame(() => {
            if (ticket !== cueFocusTicket || cueOpen || gameScreen.classList.contains('hidden')) return;
            const now=document.activeElement;
            // A popup opened after dismissal owns its new focus. Do not let
            // the delayed hand restore steal it on the following frame.
            if(now!==document.body&&!actionsPanel.contains(now)&&!now?.closest?.('#kong-picker'))return;
            const hand = document.getElementById('my-hand'),tile = hand?.children[Math.min(index,hand.children.length-1)];
            if (tile) {if(tile.tabIndex<0)tile.tabIndex=-1;tile.focus({preventScroll:true});}
        });
    }
}
function showActionCues({tile=null,self=false,meta=gameState,layout=true}={}) {
    if (actionsPanel.classList.contains('hidden')) {hideActionCues();return;}
    const buttons = [...actionsPanel.querySelectorAll('.action-btn')];
    const primary = ['btn-hu','btn-gang','btn-peng'].map(id=>document.getElementById(id)).find(b=>b.style.display!=='none');
    if (!primary) {hideActionCues();return;}
    for(const button of buttons)button.classList.toggle('cue-primary',button===primary);
    const preview = actionsPanel.querySelector('.cue-claim-tile');preview.hidden = self || tile == null;
    if (!preview.hidden) {
        const label = { 'btn-hu':'可胡','btn-gang':'可杠','btn-peng':'可碰' }[primary.id];
        if(preview.querySelector('.tile')?.dataset.tile!==String(tile))preview.replaceChildren(createTileElement(tile),document.createElement('small'));
        preview.querySelector('small').textContent = label;
    }
    document.getElementById('btn-peng').setAttribute('aria-label',tile==null?'碰':`碰 ${tileLabel(tile)}`);
    document.getElementById('btn-gang').setAttribute('aria-label',self?`杠 ${(kongCandidates||[]).map(c=>tileLabel(c.tile)).join('、')}`:`杠 ${tileLabel(tile)}`);
    document.getElementById('btn-hu').setAttribute('aria-label',self?'胡 自摸':tile==null?'胡':`胡 ${tileLabel(tile)}`);
    document.getElementById('btn-pass').setAttribute('aria-label','过 跳过这次选择');
    const key = `${meta?.round_token??currentRoundToken}|${meta?.state_seq??latestStateSeq}|${self?(meta?.drawn_tile??'-'):tile}`;
    const changed = key !== cueKey, opening = !cueOpen;
    const focusedTile=document.activeElement.closest?.('#my-hand > .tile');
    if ((opening||changed)&&focusedTile)cueFocusIndex=[...document.getElementById('my-hand').children].indexOf(focusedTile);
    else if(opening)cueFocusIndex=lastHandFocusIndex;
    cueOpen = true;cueKey = key;const cueBoard=gameScreen.querySelector('.table');if(!cueBoard.classList.contains('cue-claim-open'))cueBoard.classList.add('cue-claim-open');
    if (IS_OFFLINE) {actionsPanel.querySelector('.cue-timer').hidden=true;stopCueTimer();}
    else if (cueTimerKey!==key || opening) {
        if(cueTimerKey!==key){cueTimerKey=key;cueTimerStarted=performance.now();}
        const timer=actionsPanel.querySelector('.cue-timer');timer.dataset.key=key;timer.dataset.startedAt=String(cueTimerStarted);paintCueTimer();
    }
    if (!cuePromptKeys.has(key)) {
        cuePromptKeys.add(key);if(cuePromptKeys.size>64)cuePromptKeys.delete(cuePromptKeys.values().next().value);
        tableAudio.play('prompt',{channel:'ui'});
    }
    const active = document.activeElement,board = gameScreen.querySelector('.table');
    const popup = active.closest?.('#quick-chat-panel,.ting-tooltip,#ting-status.open,#kong-picker');
    if ((changed||opening)&&!popup&&(active===document.body||board.contains(active))) {
        ++cueFocusTicket;primary.focus({preventScroll:true});
    }
    if(layout)placeActionBar(board);
}
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
const dailyTaskEntryBtn = document.getElementById('daily-task-entry-btn');
const dailyTaskPanel = document.getElementById('daily-task-panel');
const dailyTaskList = document.getElementById('daily-task-list');
const dailyTaskClose = document.getElementById('daily-task-close');
const logHistoryBtn = document.getElementById('log-history-btn');
const changelogPanel = document.getElementById('changelog-panel');
const changelogContent = document.getElementById('changelog-content');
const changelogClose = document.getElementById('changelog-close');
const versionModal = document.getElementById('version-modal');
const versionModalTitle = document.getElementById('version-modal-title');
const versionModalContent = document.getElementById('version-modal-content');
const versionLogBtn = document.getElementById('version-log-btn');
const versionConfirmBtn = document.getElementById('version-confirm-btn');

renderRankPanel();
if (usernameInput) {
    usernameInput.value = preferredName||'牌友';
}
if (usernameInput) {
    // maxlength counts UTF-16 units; validate actual Unicode characters without
    // truncating an IME composition or silently cutting pasted names.
    usernameInput.addEventListener('input', () => {
        usernameInput.setCustomValidity(''); usernameInput.removeAttribute('aria-invalid');
    });
}
window.addEventListener('lobbyprofilesave',event=>{
    selectedAvatarId=event.detail.avatar;writeStorage('hz_avatar_v1',String(selectedAvatarId));
    savePreferredName(event.detail.name);
});

const gameAssets = getGameAssets(tableAudio);
let assetsReady = false, bootHideRequested = false, bootForceRequested = false;
document.body.dataset.assetsLoading='true';
document.getElementById('app').inert=true;

function hideBootLoading(force = false) {
    bootHideRequested=true;bootForceRequested ||= force;
    // Connection success and the old network timeout may never skip mandatory
    // tile preparation. A restored hand also remains covered until ready.
    if(!assetsReady)return;
    if (!bootLoading || bootHidden) return;
    const elapsed = Date.now() - bootStartAt;
    const waitMs = force ? 0 : Math.max(0, 700 - elapsed);
    setTimeout(() => {
        if (!bootLoading || bootHidden) return;
        bootHidden = true;
        bootLoading.classList.add('hidden');
        document.body.dataset.assetsLoading='false';
        document.getElementById('app').inert=document.body.classList.contains('landscape-blocked');
        window.dispatchEvent(new Event('mahjongready'));
    }, waitMs);
}

gameAssets.subscribe(info=>{
    if(bootHidden)return;
    if(bootProgress){bootProgress.max=info.total||1;bootProgress.value=info.completed;}
    const percent=info.total?Math.floor(info.completed/info.total*100):0;
    if(bootPercent)bootPercent.textContent=percent+'%';
    if(bootLoadingText)bootLoadingText.textContent=info.blocked&&info.status==='blocked'?'牌面未能载入':'正在准备牌馆';
    if(bootLoadingSub)bootLoadingSub.textContent=info.status==='blocked'?'请检查连接后重试，当前进度已保留。':
        `${info.completed} / ${info.total} · 牌面、桌布、头像与声音`;
    if(bootRetry)bootRetry.hidden=info.status!=='blocked';
    assetsReady=info.status==='ready';
    if(assetsReady){
        for(const image of document.querySelectorAll('.hero-tile img')){
            const value=Number(image.getAttribute('src').match(/\/(\d+)\.(?:png|svg)/)?.[1]);
            if(value)image.src=tileArtUrl(value);
        }
        const optional=info.failures.length;
        if(optional)showToast('部分装扮未能载入，可在装扮中重新选择并重试。');
        if(bootHideRequested)hideBootLoading(bootForceRequested);
    }
});
void gameAssets.prepare();
bootRetry?.addEventListener('click',()=>{void gameAssets.prepare();});
for(const type of ['click','pointerdown','keydown','keyup'])document.addEventListener(type,event=>{
    if(bootHidden||bootLoading?.contains(event.target)||event.target.closest?.('#landscape-gate'))return;
    event.preventDefault();event.stopImmediatePropagation();
},true);
document.addEventListener('keydown',event=>{
    if(bootHidden||document.body.classList.contains('landscape-blocked'))return;
    if(event.key==='Tab'){event.preventDefault();(bootRetry&&!bootRetry.hidden?bootRetry:bootLoading)?.focus({preventScroll:true});}
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();}
},true);

setTimeout(() => {
    hideBootLoading(true);
}, 5200);

function getLatestChangelogEntry() {
    return changelogEntries.length ? changelogEntries[0] : null;
}

function formatChangelogList(lines) {
    return (lines || []).map((line, idx) => `${idx + 1}. ${line}`).join('\n');
}

function renderChangelogPanel() {
    if (!changelogContent) return;
    if (!changelogEntries.length) {
        changelogContent.innerText = '暂无更新记录';
        return;
    }
    const blocks = changelogEntries.map(entry => {
        const body = formatChangelogList(entry.lines);
        return `v${entry.version}（${entry.date}）\n${body}`;
    });
    changelogContent.innerText = blocks.join('\n\n');
}

function renderDailyTaskPanel() {
    if (!dailyTaskList) return;
    dailyTaskState = normalizeDailyTaskState(dailyTaskState);
    dailyTaskList.innerHTML = '';
    const couponTask={id:'finish_four_matches',name:'完成4场10／15／20局整场对局',target:4,reward:1,coupon:true};
    [...dailyTaskTemplates,couponTask].forEach(meta => {
        const state = meta.coupon?wallet.dailyStatus():dailyTaskState.tasks.find(t => t.id === meta.id) || { progress: 0, done: false, claimed: false };
        const row = document.createElement('div');
        row.className = 'daily-task-row';
        row.dataset.taskId=meta.id;
        const left = document.createElement('div');
        left.className = 'daily-task-meta';
        const nameEl = document.createElement('div');
        nameEl.className = 'daily-task-name';
        nameEl.innerText = meta.name;
        const progressEl = document.createElement('div');
        progressEl.className = 'daily-task-progress';
        progressEl.innerText = `进度 ${Math.min(meta.target, state.progress)}/${meta.target}`;
        const rewardEl = document.createElement('div');
        rewardEl.className = 'daily-task-reward';
        rewardEl.innerText = meta.coupon?'奖励 1 张礼券':`奖励 ${meta.reward} 星`;
        left.appendChild(nameEl);
        left.appendChild(progressEl);
        left.appendChild(rewardEl);
        const claimBtn = document.createElement('button');
        claimBtn.type = 'button';
        claimBtn.className = 'daily-task-claim';
        claimBtn.setAttribute('aria-label',meta.name+'，领取'+(meta.coupon?'1张礼券':meta.reward+'星'));
        if (state.claimed) {
            claimBtn.innerText = '已领取';
            claimBtn.disabled = true;
        } else if (state.done) {
            claimBtn.innerText = '领取';
            claimBtn.disabled = meta.coupon?wallet.readOnly:false;
            claimBtn.addEventListener('click', () => {
                claimTaskReward(meta.id);
            });
        } else {
            claimBtn.innerText = '未完成';
            claimBtn.disabled = true;
        }
        row.appendChild(left);
        row.appendChild(claimBtn);
        dailyTaskList.appendChild(row);
    });
}

let completedRewardKey=null;
function recordMatchRewards(payload){
    const proofs=[payload.completed_match,...(Array.isArray(payload.completed_matches)?payload.completed_matches:[])].filter(Boolean);
    if(!proofs.length)return;
    const key=wallet.dailyStatus().date+'|'+JSON.stringify(proofs);
    if(key===completedRewardKey)return;
    if(wallet.recordCompleteMatches(proofs).ok)completedRewardKey=key;
}
wallet.subscribe(renderDailyTaskPanel);
window.addEventListener('storage',e=>{if(e.key==='hz_wallet_v1'){wallet.refresh();renderDailyTaskPanel();}});
let couponDay=wallet.dailyStatus().date;
function refreshDailyCoupon(){
    const date=wallet.dailyStatus().date;
    if(date!==couponDay){couponDay=date;renderDailyTaskPanel();window.dispatchEvent(new Event('walletdaychange'));}
}
setInterval(refreshDailyCoupon,1000);
window.addEventListener('focus',()=>{wallet.refresh();renderDailyTaskPanel();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){wallet.refresh();renderDailyTaskPanel();}});

function closeLobbyPanels() {
    window.LobbySheets.closeAll();
}

function openLatestVersionModal() {
    const latest = getLatestChangelogEntry();
    if (!latest || !versionModal || !versionModalTitle || !versionModalContent) return;
    versionModalTitle.innerText = `v${latest.version}（${latest.date}）`;
    versionModalContent.innerText = formatChangelogList(latest.lines);
    versionModal.classList.remove('hidden');
}

function markVersionSeen() {
    writeStorage(VERSION_SEEN_KEY, APP_VERSION);
    delete document.getElementById('lobby-settings-btn').dataset.new;
}
window.addEventListener('lobbylogseen',markVersionSeen);

function checkVersionPopup() {
    if (readStorage(VERSION_SEEN_KEY) !== APP_VERSION) document.getElementById('lobby-settings-btn').dataset.new = 'true';
}

function renderRankHelpText() {
    if (!rankHelpContent) return;
    const current=sharedRank?.snapshot(),history=current?.history||[];
    rankHelpContent.innerText = `段位与排位
离线场和友人场共用一个段位。10／15／20 局整场结束后计入段位，1／5 局为练习。新桌人机难度按房主当前大段匹配 1–8 档，整场固定；离线场以自己的段位为准。

加减星
第 1 名 +2 星；第 2 名且分数 >0 时 +1 星，否则 0 星；第 3 名且分数 <0 时 -1 星，否则 0 星；第 4 名 -2 星。整场分数 ≥30 额外 +1 星。同分按座位次序排名。
更新前的离线旧存档继续原规则：轻松不计段位或任务，标准没有高分奖励，进阶有高分奖励；新开桌使用现行规则。

赛季与保存
按设备所在时区的自然月，每月 1 日 0 点重置为试刀者 Ⅲ · 0 星，并保留历史。跨月牌桌继续，按整场结算时的月份计分。离线结算本地保存，联网后同步。首次合并取两个当前段位中较高的，不叠加星数。

每日任务
每日任务按设备本地时间每天 0 点刷新。星数任务的两种模式进度分别记录，奖励增加同一个段位的星数。现行离线模式的练习可推进清水胡任务；整场排位结算推进完成整场和获得第一名的任务。至少两位真人（含本人）从开桌起参与并完成友人场10／15／20局整场，可在友人场领取每日奖励2星；中途加入不算完成整场。
礼券任务：当天累计完成4场10／15／20局整场对局，离线与联机共用进度，每天可领取1张礼券。1／5局、提前结束、中途加入及重复结算不计入；昨日的完成记录不能计入今天。领取保存成功后才能使用。

登峰礼券与装扮
登峰礼检查当前段位，第2／3大段各奖励1张礼券，第5／7大段各奖励2张，第8大段奖励4张。每档本设备仅领取一次；掉段或赛季重置后，未领取的礼券需重新达到对应段位，已领取的礼券与装扮保留。旧版已领第5大段1张礼券的玩家，可补领差额1张，不要求再次达到第5大段。1张礼券解锁1款非默认装扮，青玉免费。

新人有礼与兑换码
完成一次离线或友人场10／15／20局整场，可领取新人礼券1张，本设备仅领一次；1／5局练习不计入。已保存的旧版离线排位整场记录也可达成。设置中输入兑换码并联网兑换，每个码全体玩家合计只可使用一次。相同设备重试同一码，可恢复未保存的礼券，不会重复到账。

安卓更新
启动素材加载完成后，在主界面提示可用的新版本及主要改动。也可在设置中主动检查更新。下载后使用相同签名的安装包覆盖安装，保留本机资料；检查失败或断网不影响离线游玩。

入座与声音
离线场与三位人机同桌；友人场使用六位房间号，空位由人机补齐。声音在设置或局内喇叭按钮开启／关闭，更换桌布自动绑定主题声音，保留静音选择。

赛季历史
${history.length ? history.map(item => `${item.month} · ${getRankLabel(item.rank_state)} · ${item.rank_state.stars} 星`).join('\n') : '暂无历史赛季'}`;
}

renderRankHelpText();
renderDailyTaskPanel();
renderChangelogPanel();
checkVersionPopup();

document.addEventListener('visibilitychange', handlePageResume);
window.addEventListener('focus', handlePageResume);

if (rankHelpBtn && rankHelpPanel) {
    rankHelpBtn.addEventListener('click', () => {
        window.LobbySheets.open('settings',{tab:'rank'});
    });
}
if (rankHelpClose && rankHelpPanel) {
    rankHelpClose.addEventListener('click', () => {
        window.LobbySheets.closeTop();
    });
}
if (dailyTaskEntryBtn && dailyTaskPanel) {
    dailyTaskEntryBtn.addEventListener('click', () => {
        window.LobbySheets.open('activity',{tab:'daily'});
    });
}
if (dailyTaskClose && dailyTaskPanel) {
    dailyTaskClose.addEventListener('click', () => {
        window.LobbySheets.closeTop();
    });
}
if (logHistoryBtn && changelogPanel) {
    logHistoryBtn.addEventListener('click', () => {
        window.LobbySheets.open('settings',{tab:'changelog'});
    });
}
if (changelogClose && changelogPanel) {
    changelogClose.addEventListener('click', () => {
        window.LobbySheets.closeTop();
    });
}
if (versionConfirmBtn && versionModal) {
    versionConfirmBtn.addEventListener('click', () => {
        markVersionSeen();
        versionModal.classList.add('hidden');
    });
}
if (versionLogBtn && versionModal && changelogPanel) {
    versionLogBtn.addEventListener('click', () => {
        markVersionSeen();
        versionModal.classList.add('hidden');
        closeLobbyPanels();
        window.LobbySheets.open('settings',{tab:'changelog'});
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
    createPanel.classList.remove('hidden');
    joinPanel.classList.remove('hidden');
    createEntryBtn.classList.toggle('selected', mode === 'create');
    joinEntryBtn.classList.toggle('selected', mode === 'join');
    createEntryBtn.setAttribute('aria-selected', String(mode === 'create'));
    joinEntryBtn.setAttribute('aria-selected', String(mode === 'join'));
    if (mode === 'join') roomCodeInput.focus();
}

createEntryBtn.addEventListener('click', () => setLobbyMode('create'));
joinEntryBtn.addEventListener('click', () => setLobbyMode('join'));

createBtn.addEventListener('click', () => {
    if(!sharedRank){showToast(window.HZ_RANK_ERROR||'段位存档暂时不可用，请保留应用数据');return;}
    if (createReqPending || roomCode) return;
    if (!socket.connected) { showToast('正在连接牌馆，请稍候'); return; }
    const rounds = Number(roundsSelect.value || '1');
    const name = getEnteredName();
    if (name === null) return;
    createReqPending = true;
    socket.emit('create_room', { rounds, name, avatar: selectedAvatarId, rank_level: Number(rankState.major || 1), rank_state: normalizeRankState(rankState), rank_sync:IS_OFFLINE?undefined:rankSyncPacket(), player_token: playerToken });
    setTimeout(() => { createReqPending = false; }, 2000);
});

joinBtn.addEventListener('click', () => {
    if(!sharedRank){showToast(window.HZ_RANK_ERROR||'段位存档暂时不可用，请保留应用数据');return;}
    if (joinReqPending || roomCode) return;
    if (!socket.connected) { showToast('正在连接牌馆，请稍候'); return; }
    const code = (roomCodeInput.value || '').trim();
    if (!/^\d{6}$/.test(code)) { showToast('请输入 6 位数字房间号'); roomCodeInput.focus(); return; }
    const name = getEnteredName();
    if (name === null) return;
    joinReqPending = true;
    socket.emit('join_room', { room_code: code, name, avatar: selectedAvatarId, rank_state: normalizeRankState(rankState), rank_sync:IS_OFFLINE?undefined:rankSyncPacket(), player_token: playerToken });
    setTimeout(() => { joinReqPending = false; }, 2000);
});

avatarOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        avatarOptions.forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-pressed', 'false'); });
        btn.classList.add('selected');
        btn.setAttribute('aria-pressed', 'true');
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
        if (IS_OFFLINE && !window.confirm('结束这次离线练习？本桌进度将被清除。想稍后继续，请使用手机返回键。')) return;
        socket.emit('leave_room');
    });
}

function refreshLobbyMeta() {
    if (!statusMsg) return;
    lobbyScreen.classList.toggle('in-room', !!roomCode);
    document.getElementById('room-summary').classList.toggle('hidden', !roomCode);
    document.getElementById('room-setup').hidden=!!roomCode;
    if(roomCode&&!gameState&&!window.LobbySheets.isOpen)window.LobbySheets.open(IS_OFFLINE?'offline':'friend');
    statusMsg.textContent = roomCode
        ? `${humanCount} 位牌友 · ${aiCount} 位人机 · ${roundTarget} 局`
        : (IS_OFFLINE ? '已就绪' : (socket.connected ? '已连接' : '正在重连…'));
    document.getElementById('lobby-room-code').textContent = roomCode;
    const seats = document.getElementById('room-seats');
    seats.replaceChildren();
    if (roomCode) {
        for (let i = 0; i < 4; i++) {
            const human = humanSeats.includes(i);
            const profile = seatProfiles[i] || {};
            const seat = document.createElement('div');
            seat.className = 'room-seat' + (human ? '' : ' empty');
            const image = document.createElement('img');
            image.src = `/static/assets/avatar-${profile.avatar || i + 1}.svg`;
            image.alt = '';
            const label = document.createElement('span');
            label.textContent = human ? (profile.name || '牌友') : '人机补位';
            seat.append(image, label);
            seats.appendChild(seat);
        }
    }
    startBtn.classList.toggle('hidden', !roomCode || myId < 0 || myId !== ownerSeat);
    startBtn.disabled = !socket.connected || !['IDLE', 'FINISHED'].includes(roomGameStatus);
    leaveBtn.classList.toggle('hidden', !roomCode);
    document.getElementById('room-waiting-tip').textContent = myId === ownerSeat
        ? (IS_OFFLINE ? '三位人机已就绪，随时开局。' : '好友可凭房间号加入，空位由人机补齐。')
        : '已入座，等待房主开始对局。';
}

socket.on('room_joined', (data) => {
    soundEvents.reset(); tableAudio.stop();
    myId = data.seat;
    roomCode = data.room_code;
    writeSession(ROOM_SESSION_KEY, roomCode);
    roomRecovering = false;
    createReqPending = false;
    joinReqPending = false;
    hideBootLoading();
    refreshLobbyMeta();
});

socket.on('room_meta', (data) => {
    if (myId < 0 || (roomCode && data.room_code !== roomCode)) return;
    recordMatchRewards(data);
    roomCode = data.room_code;
    ownerSeat = data.owner_seat;
    roundTarget = data.round_target;
    currentRound = data.current_round;
    totalScores = data.total_scores || totalScores;
    humanCount = data.player_count || humanCount;
    aiCount = data.ai_count ?? aiCount;
    roomAiLevel = Number(data.ai_level || roomAiLevel);
    seatProfiles = data.seat_profiles || seatProfiles;
    humanSeats = data.human_seats || [myId];
    roomGameStatus = data.game_status || roomGameStatus;
    const ownRank = seatProfiles[myId]?.rank_state;
    if (ownRank) acceptSharedRank(data);
    if (data.daily_tasks) { dailyTaskState = normalizeDailyTaskState(data.daily_tasks); saveDailyTaskState(); renderDailyTaskPanel(); }
    refreshLobbyMeta();
});

socket.on('profile', (profile) => {
    recordMatchRewards(profile);
    if (profile.rank_state) acceptSharedRank(profile);
    if(!IS_OFFLINE&&!profile.shared_rank&&!unsupportedRank){unsupportedRank=true;showToast('联机服务需更新后才能同步段位');}
    if (profile.daily_tasks) { dailyTaskState = normalizeDailyTaskState(profile.daily_tasks); saveDailyTaskState(); renderDailyTaskPanel(); }
    if (IS_OFFLINE) {
        renderRankHelpText();
        if (seatProfiles[myId]) seatProfiles[myId].rank_state = profile.rank_state;
        if (gameState && !dealingInProgress) renderAvatars(gameState);
    }
});

socket.on('connect', () => {
    hideBootLoading();
    actionPending = false;
    if(sharedRank)socket.emit('get_profile', { player_token: playerToken, name: getProfileName(),rank_sync:IS_OFFLINE?undefined:rankSyncPacket() });
    refreshLobbyMeta();
    if (roomCode && playerToken && sharedRank) {
        const name = getProfileName();
        socket.emit('rejoin_room', { room_code: roomCode, name, avatar: selectedAvatarId, rank_state: normalizeRankState(rankState), rank_sync:IS_OFFLINE?undefined:rankSyncPacket(), player_token: playerToken });
    }
    handlePageResume();
});

socket.on('connected', () => {
    hideBootLoading();
});

socket.on('disconnect', () => {
    cueTimerKey=null;cueReconnectRequest=true;hideActionCues();
    soundEvents.reset(); tableAudio.stop();
    actionPending = false;
    if (gameState) renderGame(gameState);
    refreshLobbyMeta();
    if (statusMsg && roomCode) {
        statusMsg.innerText = `房间 ${roomCode} | 网络中断，正在尝试恢复...`;
    }
});

socket.on('connect_error', () => {
    if (assetsReady && bootLoadingText && !bootHidden) {
        bootLoadingText.innerText = '连接有点慢，正在重试';
    }
    if (assetsReady && bootLoadingSub && !bootHidden) {
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
    if (roomCode && /不存在|失效|未找到可恢复座位/.test(msg)) resetRoomView();
    showToast(msg);
});

function resetRoomView() {
    soundEvents.reset(); tableAudio.stop();
    myId = -1;
    roomCode = '';
    writeSession(ROOM_SESSION_KEY, '');
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
    actionPending = false;
    roomGameStatus = 'IDLE';
    humanSeats = [];
    animatedRound = 0;
    gameState = null;
    document.getElementById('rank-screen').classList.add('hidden');
    latestStateSeq = -1;
    currentRoundToken = 0;
    dealReadySentToken = 0;
    pendingRankChange = null;



    resetTableForNewRound();
    const modal = document.getElementById('results-modal');
    if (modal) modal.classList.add('hidden');
    if (versionModal) versionModal.classList.add('hidden');
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    renderDailyTaskPanel();
    refreshLobbyMeta();
}

socket.on('left_room', data => { if (data?.ok) resetRoomView(); });

socket.on('start_denied', (data) => {
    const reason = (data && data.reason) ? data.reason : '无法开始';
    statusMsg.innerText = reason;
    if (startBtn) startBtn.disabled = false;
});

socket.on('game_state', (state) => {
    if(state.shared_rank)acceptSharedRank(state);
    if (myId < 0 || !roomCode) return;
    hideBootLoading();
    const incomingSeq = Number((state && state.state_seq) ?? -1);
    if (incomingSeq >= 0) {
        if (incomingSeq < latestStateSeq) {
            return;
        }
        latestStateSeq = incomingSeq;
    }
    actionPending = false;
    document.getElementById('my-hand').classList.remove('pending');
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
    soundEvents.snapshot(state);
    const discardFlights = pendingDiscards(gameState,state,myId,gameScreen.querySelector('.table'));
    seatProfiles = state.seat_profiles || seatProfiles;
    gameState = state;
    recordMatchRewards(state);
    roomGameStatus = state.game_status || (state.game_over ? 'FINISHED' : 'PLAYING');
    if (state.daily_tasks) { dailyTaskState = normalizeDailyTaskState(state.daily_tasks); saveDailyTaskState(); }
    currentActions = state.waiting_action?.actions || null;
    document.getElementById('auto-hu-toggle').checked = !!state.auto_hu;
    if (!state.game_over) {
        const modal = document.getElementById('results-modal');
        modal.classList.add('hidden');
        if (resultBtn) {
            resultBtn.disabled = false;
        }
    }
    if (!hasDealtAnimation) {
        const opening = state.game_status === 'PLAYING' && state.wall_count === 59
            && Object.values(state.discards || {}).every(pile => pile.length === 0);
        if (opening && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            animatedRound = currentRound;
            startDealAnimation(state);
            return;
        }
        hasDealtAnimation = true;
        animatedRound = currentRound;
    }
    renderGame(state);
    animateDiscards(discardFlights,gameScreen.querySelector('.table'));
    emitDealReady(currentRoundToken);
    
    if (!lobbyScreen.classList.contains('hidden')) {
        if (versionModal) versionModal.classList.add('hidden');
        closeLobbyPanels();
        lobbyScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    }
});

socket.on('action_request', (data) => {
    if (!socket.connected) return;
    const reqSeq = Number((data && data.state_seq) ?? -1);
    const reqToken = Number((data && data.round_token) ?? 0);
    if (reqSeq >= 0 && reqSeq < latestStateSeq) return;
    if (reqToken !== currentRoundToken) return;
    currentActions = data.actions;
    if(cueReconnectRequest){cueTimerKey=null;cueReconnectRequest=false;}
    showActions(data.actions, data.tile, data);
});

socket.on('action_event', (data) => {
    if(!soundEvents.accept(data))return;
    playActionSound(data.type);
    let text = "";
    if (data.type === 'pong') text = "碰";
    if (data.type === 'kong') text = "杠";
    if (data.type === 'hu') text = "胡";
    if (data.type === 'zi_mo') text = "自摸";
    
    if (text) {
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
    actionPending = false;
    lastHandRenderKey = '';
    document.getElementById('my-hand').classList.remove('pending');
    if (gameState) renderGame(gameState);
    showToast(data?.message);
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

    
    // Check Game Over
    // Note: state.state is "FINISHED" in core.py, but we need to check if we received that
    // The server emits 'game_state' even on finish.
    
    // Update center info
    document.getElementById('wall-count').innerText = state.wall_count;
    document.getElementById('current-turn').textContent = state.game_over ? '本局结束'
        : state.game_status === 'FINISHING' ? '胡牌结算中'
        : state.round_ready === false ? '等待牌友入局'
        : state.turn === myId ? '轮到你出牌' : `${displayName(state.turn, state).replace(' · 人机', '')} 出牌`;
    document.getElementById('current-turn').title = document.getElementById('current-turn').textContent;
    const roundInfo = document.getElementById('round-info');
    if (roundInfo) roundInfo.innerText = `第${state.current_round || currentRound}/${state.round_target || roundTarget}局`;
    renderRevealDraws(state);
    renderAvatars(state);
    const live = state.game_status === 'PLAYING' && !state.game_over;
    document.getElementById('hand-hint').textContent = !socket.connected ? '连接恢复中，请稍候'
        : !live ? (state.game_over ? '本局结束，查看结算' : '胡牌展示 · 即将结算')
        : state.round_ready === false ? '等待其他牌友入局'
        : state.claim_pending ? '等待碰杠选择'
        : state.turn === myId ? '轮到你出牌 · 点击手牌，或按回车出牌' : '等待其他牌友出牌';
    document.getElementById('hand-hint').title = document.getElementById('hand-hint').textContent;
    document.querySelectorAll('.wind').forEach(wind => {
        const seat = (myId + Number(wind.dataset.relative)) % 4;
        wind.textContent = ['东', '南', '西', '北'][(seat - state.banker + 4) % 4];
        wind.classList.toggle('active', live && seat === state.turn);
    });
    
    // Highlight Active Player
    for(let i=0; i<4; i++) {
        let relIdx = (i - myId + 4) % 4;
        const playerEl = document.getElementById(`player-${relIdx}`);
        if (!playerEl) continue;
        if(live && state.turn === i) playerEl.classList.add('active');
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
            tingTooltip.appendChild(createTileElement(tile, {pose:'flat'}));
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
    

    
    // Render Discards for all
    for (let i = 0; i < 4; i++) {
        // Calculate relative index
        let relIdx = (i - myId + 4) % 4;

        
        // Find the player element container
        // ID is player-{relIdx} in HTML? No, HTML IDs are fixed: player-0 (bottom), player-1 (right)...
        // Actually, let's map relIdx to HTML ID.
        // HTML structure: player-0 is bottom (me), player-1 is right, etc.
        const playerElId = `player-${relIdx}`;
        const playerEl = document.getElementById(playerElId);
        
        if (playerEl) {
            // Render Discards
            const discardsEl = seatRegion(playerEl,'discards');
            const pile = state.discards[i] || [];
            // Keep an unchanged prefix, including a pending FLIP placeholder.
            // A claim/removal detaches its placeholder, so an old flight cannot
            // restore a tile already claimed by the latest authoritative state.
            while(discardsEl.children.length>pile.length)discardsEl.lastElementChild.remove();
            pile.forEach((tile, idx) => {
                let tileEl=discardsEl.children[idx];
                if(!tileEl||String(tile)!==(tileEl.dataset.tile||tileEl.dataset.flightValue)){
                    const fresh=createTileElement(tile,{pose:'flat',rot:[0,270,180,90][relIdx]});
                    if(tileEl)tileEl.replaceWith(fresh);else discardsEl.append(fresh);
                    tileEl=fresh;
                }
                tileEl.classList.toggle('tile--current-discard',i===state.last_discard_player&&idx===pile.length-1);
            });

            const meldsEl = seatRegion(playerEl,'melds');
            if (meldsEl) {
                const meldList = (state.melds && state.melds[i]) ? state.melds[i] : [];
                const meldKey=JSON.stringify(meldList);
                if(meldsEl.dataset.renderKey!==meldKey||meldsEl.children.length!==meldList.length){
                meldsEl.dataset.renderKey=meldKey;
                meldsEl.innerHTML = '';
                meldList.forEach(meld => {
                    const group = document.createElement('div');
                    group.className = 'meld-group';
                    const count = meld.type && meld.type.includes('kong') ? 4 : 3;
                    if (meld.type === 'kong' && meld.source === 'concealed') {
                        group.appendChild(createTileElement(meld.tile, {pose:'flat',rot:[0,270,180,90][relIdx]}));
                        for (let m = 0; m < 3; m++) {
                            const b = createTileElement(null,{pose:'back-flat',rot:[0,270,180,90][relIdx]});
                            group.appendChild(b);
                        }
                    } else {
                        for (let m = 0; m < count; m++) {
                            group.appendChild(createTileElement(meld.tile, {pose:'flat',rot:[0,270,180,90][relIdx]}));
                        }
                    }
                    meldsEl.appendChild(group);
                });
                }
            }
            
            // If opponent, render hand back
            if (i !== myId) {
                const backEl = seatRegion(playerEl,'hand-back');
                if (backEl && state.hand_counts) {
                    const reveal = state.reveal_hu;
                    const exposed=reveal&&reveal.winner===i&&Array.isArray(reveal.hand);
                    const count=exposed?reveal.hand.length:state.hand_counts[i]||0;
                    const backKey=exposed?'face:'+reveal.hand.join(','):'back:'+count;
                    if(backEl.dataset.renderKey!==backKey||backEl.children.length!==count){
                    backEl.dataset.renderKey=backKey;
                    backEl.innerHTML = '';
                    if (reveal && reveal.winner === i && Array.isArray(reveal.hand)) {
                        reveal.hand.forEach(tile => {
                            backEl.appendChild(createTileElement(tile, {pose:'flat',rot:[0,270,180,90][relIdx]}));
                        });
                    } else {
                        const count = state.hand_counts[i] || 0;
                        for (let k = 0; k < count; k++) {
                            const b = createTileElement(null,{pose:'back-stand'});
                            backEl.appendChild(b);
                        }
                    }
                    }
                }
            }
        }
    }
    
    if (!live || !socket.connected || state.round_ready === false) {
        hideActionCues();
        hideKongPicker();
    } else if (state.waiting_action) {
        showActions(state.waiting_action.actions, state.waiting_action.tile, state, false);
    } else if (state.turn === myId && !state.claim_pending && !currentActions && !actionPending) {
        showSelfActions(state.self_actions || {}, state, false);
    } else {
        hideActionCues();
        hideKongPicker();
    }
    const table = gameScreen.querySelector('.table');
    applyTableView(table,table.clientWidth,table.clientHeight);
    // Check for Game Over signal in state (we need to add this to backend state)
    if (state.game_over) {
        showResults(state.scores, state.total_scores || totalScores, state.match_over, state.current_round, state.round_target);
    }
}

function resetTableForNewRound() {
    cancelDiscardFlights();
    currentActions = null;
    hideKongPicker();
    hideActionCues();
    const myHandEl = document.getElementById('my-hand');
    if (myHandEl) myHandEl.innerHTML = '';
    lastHandRenderKey = '';
    lastTurnForPop = -1;
    const msgArea = document.getElementById('msg-area');
    if (msgArea) msgArea.innerHTML = '';
    if (msgArea) delete msgArea.dataset.msg;
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
        const back = seatRegion(playerEl,'hand-back');
        const discards = seatRegion(playerEl,'discards');
        const melds = seatRegion(playerEl,'melds');
        if (back) back.innerHTML = '';
        if (discards) { discards.innerHTML = ''; delete discards.dataset.renderKey; }
        if (melds) melds.innerHTML = '';
        const bubble = playerEl.querySelector('.chat-bubble');
        if (bubble) bubble.remove();
    }
}

function showSelfActions(selfActions, meta=gameState, layout=true) {
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
        sendAction({ type: 'self_hu' });
        hideActionCues();
    };

    kongCandidates = [];
    if (selfActions.add_kong) kongCandidates = kongCandidates.concat(selfActions.add_kong.map(t => ({ tile: t, kind: 'add' })));
    if (selfActions.concealed_kong) kongCandidates = kongCandidates.concat(selfActions.concealed_kong.map(t => ({ tile: t, kind: 'concealed' })));

    if (!selfActions.hu && !kongCandidates.length) hideActionCues();
    btnGang.onclick = () => {
        if (!kongCandidates || kongCandidates.length === 0) return;
        if (kongCandidates.length === 1) {
            sendAction({ type: 'self_kong', tile: kongCandidates[0].tile });
            hideActionCues();
            return;
        }
        showKongPicker(kongCandidates.map(c => c.tile));
    };
    showActionCues({self:true,meta,layout});
}

function showKongPicker(tiles) {
    hideKongPicker();
    const host = document.getElementById('player-0');
    if (!host) return;

    const wrap = document.createElement('div');
    wrap.id = 'kong-picker';

    tiles.forEach(t => {
        const tileEl = createTileElement(t, {pose:'flat'});
        tileEl.setAttribute('role','button');tileEl.tabIndex=0;tileEl.setAttribute('aria-label',`杠 ${tileLabel(t)}`);
        tileEl.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();tileEl.click();}});
        tileEl.addEventListener('click', () => {
            sendAction({ type: 'self_kong', tile: t });
            hideKongPicker();
            hideActionCues();
        });
        wrap.appendChild(tileEl);
    });

    host.appendChild(wrap);
    placeActionBar(gameScreen.querySelector('.table'));
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
        closeLobbyPanels();
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
        playerBackEls.push(el ? seatRegion(el,'hand-back') : null);
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
                        const b = createTileElement(null,{pose:'back-stand'});
                        b.classList.add('dealing');
                        backEl.appendChild(b);
                    }
                }
            }
            const table = gameScreen.querySelector('.table');
            applyTableView(table,table.clientWidth,table.clientHeight);
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
    const host = document.getElementById('my-hand');
    const canDiscard = socket.connected && state.game_status === 'PLAYING' && !state.game_over
        && state.round_ready !== false
        && state.turn === myId && !state.claim_pending && !currentActions && !actionPending
        && state.hand.length % 3 === 2;
    const key = `${state.hand.join(',')}|${canDiscard}|${state.drawn_tile ?? -1}`;
    if (key === lastHandRenderKey) return;
    lastHandRenderKey = key;
    host.replaceChildren();
    host.classList.toggle('pending', actionPending);
    state.hand.forEach((tile, index) => {
        const el = createTileElement(tile);
        if (state.turn === myId && state.drawn_tile != null && index === state.hand.length - 1) el.classList.add('tile--drawn');
        if (canDiscard) {
            el.classList.add('interactive');
            el.setAttribute('role', 'button');
            el.tabIndex = 0;
            el.setAttribute('aria-label', `打出${tileLabel(tile)}`);
            const discard = () => {
                if (actionPending) return;
                rememberDiscard(tile,el);
                sendAction({ type: 'discard', tile });
            };
            el.addEventListener('click', discard);
            el.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); discard(); }
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    event.preventDefault();
                    const step = event.key === 'ArrowRight' ? 1 : -1;
                    host.children[(index + step + state.hand.length) % state.hand.length]?.focus();
                }
            });
        }
        host.appendChild(el);
    });
}

function showResults(scores, totals, matchOver, roundNo, roundMax) {
    const modal = document.getElementById('results-modal');
    const list = document.getElementById('score-list');
    list.innerHTML = '';
    renderDailyTaskPanel();
    
    // Sort scores? Or just list by player
    for (let i = 0; i < 4; i++) {
        const row = document.createElement('div');
        row.className = 'score-row';
        
        const profile = seatProfiles[i] || {};
        const name = displayName(i) + (i === myId ? ' · 你' : '');
        const score = scores[i] ?? 0;
        const total = totals ? totals[i] : score;
        const label = document.createElement('span');
        label.className = 'score-name';
        const avatar = document.createElement('img');
        avatar.src = `/static/assets/avatar-${profile.avatar || i + 1}.svg`;
        avatar.alt = '';
        const nameEl = document.createElement('span');
        nameEl.textContent = name;
        label.append(avatar, nameEl);
        const value = document.createElement('span');
        value.className = 'score-val ' + (score >= 0 ? 'positive' : 'negative');
        value.textContent = `${score > 0 ? '+' : ''}${score} / ${total > 0 ? '+' : ''}${total}`;
        row.append(label, value);
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
            socket.emit('leave_room');
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

function tileLabel(tile) {
    if (tile === 40) return '红中';
    return (cnNums[tile % 10] || '') + ({ 1: '万', 2: '筒', 3: '条' }[Math.floor(tile / 10)] || '');
}



function renderRevealDraws(state) {
    const host = document.getElementById('reveal-center');
    const draws = state.reveal_draws;
    if (!Array.isArray(draws) || !draws.length) {
        host.classList.add('hidden');
        host.replaceChildren();
        return;
    }
    host.classList.remove('hidden');
    host.replaceChildren();
    const title = document.createElement('div');
    title.className = 'reveal-center-title';
    title.textContent = '抓马 · 金框牌计入底分';
    const tiles = document.createElement('div');
    tiles.className = 'reveal-draw-tiles';
    const lucky = new Set([11, 15, 19, 21, 25, 29, 31, 35, 39, 40]);
    draws.forEach(value => {
        const tile = createTileElement(value, {pose:'flat'});
        if (lucky.has(value)) tile.classList.add('ting-card-glow');
        tiles.appendChild(tile);
    });
    host.append(title, tiles);
}

function renderAvatars(state) {
    if (myId < 0) return;
    const aiSeats = new Set(state.ai_seats || []);
    for (let relative = 0; relative < 4; relative++) {
        const seat = (myId + relative) % 4;
        const host = document.querySelector(`#player-${relative} .avatar`);
        if (!host) continue;
        const profile = seatProfiles[seat] || {};
        const isAi = aiSeats.has(seat);
        const name = displayName(seat, state);
        const rank = isAi ? `人机 · ${roomAiLevel} 档` : getRankLabel(profile.rank_state || rankState);
        const score = Number(state.total_scores?.[seat] || 0) + (state.game_over ? 0 : Number(state.scores?.[seat] || 0));
        const key = `${name}|${rank}|${score}|${profile.avatar}|${state.banker === seat}`;
        if (host.dataset.renderKey === key) continue;
        host.dataset.renderKey = key;
        host.replaceChildren();
        const portrait = document.createElement('div');
        portrait.className = 'avatar-art';
        const art = document.createElement('img');
        art.src = `/static/assets/avatar-${profile.avatar || seat + 1}.svg`;
        art.alt = '';
        portrait.appendChild(art);
        if (state.banker === seat) {
            const badge = document.createElement('span');
            badge.className = 'banker-badge';
            badge.textContent = '庄';
            portrait.appendChild(badge);
        }
        const info = document.createElement('div');
        info.className = 'player-info';
        for (const [className, text] of [['player-name', name], ['player-rank', rank], ['player-score', (score > 0 ? '+' : '') + score]]) {
            const line = document.createElement('span');
            line.className = className;
            line.textContent = text;
            info.appendChild(line);
        }
        host.append(portrait, info);
    }
}

function showActions(actions, tile, meta=gameState, layout=true) {
    actionsPanel.classList.remove('hidden');
    // Toggle buttons based on actions
    document.getElementById('btn-peng').style.display = actions.includes('pong') ? 'block' : 'none';
    document.getElementById('btn-gang').style.display = actions.includes('kong') ? 'block' : 'none';
    document.getElementById('btn-hu').style.display = actions.includes('hu') ? 'block' : 'none';
    document.getElementById('btn-pass').style.display = 'block';
    hideKongPicker();
    
    // Pass button always shown when actions available
    document.getElementById('btn-pass').onclick = () => {
        sendAction({ type: 'pass' });
        hideActionCues();
        currentActions = null;
    };
    
    // Attach handlers
    if (actions.includes('pong')) {
        document.getElementById('btn-peng').onclick = () => {
            sendAction({ type: 'pong', tile: tile });
            hideActionCues();
            currentActions = null;
        };
    }
    if (actions.includes('kong')) {
        document.getElementById('btn-gang').onclick = () => {
            sendAction({ type: 'kong', tile: tile });
            hideActionCues();
            currentActions = null;
        };
    }
    if (actions.includes('hu')) {
        document.getElementById('btn-hu').onclick = () => {
            sendAction({ type: 'hu', tile: tile });
            hideActionCues();
            currentActions = null;
        };
    }
    showActionCues({tile,meta,layout});
}

function readSession(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
}

function writeSession(key, value) {
    try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch {}
}

const savedAvatar = Number(readStorage('hz_avatar_v1'));
if (savedAvatar >= 1 && savedAvatar <= 5) {
    selectedAvatarId = savedAvatar;
    avatarOptions.forEach(button => {
        const selected = Number(button.dataset.avatar) === savedAvatar;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
}
renderRankPanel();

const soundButton = document.getElementById('sound-btn');
function renderSoundButton() {
    soundButton.setAttribute('aria-pressed', String(tableAudio.enabled));
    soundButton.setAttribute('aria-label', tableAudio.enabled ? '声音已开启，点击静音' : '声音已关闭，点击开启');
    soundButton.title = tableAudio.enabled ? '关闭声音' : '开启声音';
}
renderSoundButton();
soundButton.addEventListener('click', () => {
    tableAudio.setEnabled(!tableAudio.enabled);
});
window.addEventListener('tablesoundchange',renderSoundButton);

document.getElementById('auto-hu-toggle').addEventListener('change', event => {
    if (!socket.connected || !roomCode) { event.target.checked = false; return; }
    socket.emit('set_auto_hu', { enabled: event.target.checked });
});
document.getElementById('game-leave-btn').addEventListener('click', () => {
    if (!socket.connected) { showToast('连接恢复后即可离开牌桌'); return; }
    if (IS_OFFLINE && !window.confirm('结束这次离线练习？本桌进度将被清除。想稍后继续，请使用手机返回键。')) return;
    socket.emit('leave_room');
});
document.getElementById('copy-room-btn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(roomCode); showToast('房间号已复制，发给好友一起入座'); }
    catch { showToast(`房间号：${roomCode}`); }
});
roomCodeInput.addEventListener('keydown', event => { if (event.key === 'Enter') joinBtn.click(); });
roomCodeInput.addEventListener('input', () => { roomCodeInput.value = roomCodeInput.value.replace(/\D/g, '').slice(0, 6); });

const rulesPanel = document.getElementById('rules-panel');
document.getElementById('rules-entry-btn').addEventListener('click', () => {
    window.LobbySheets.open('settings',{tab:'rules'});
});
document.getElementById('rules-close').addEventListener('click', () => window.LobbySheets.closeTop());
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeLobbyPanels();
    rankHelpPanel.classList.add('hidden');
    quickChatPanel.classList.add('hidden');
    quickChatBtn.setAttribute('aria-expanded', 'false');
    tingStatusEl.classList.remove('open');
    tingBtnEl.setAttribute('aria-expanded', 'false');
    tingExpanded = false;
    hideKongPicker();
});
document.addEventListener('pointerdown', event => {
    if (!quickChatPanel.contains(event.target) && !quickChatBtn.contains(event.target)) {
        quickChatPanel.classList.add('hidden');
        quickChatBtn.setAttribute('aria-expanded', 'false');
    }
});
quickChatBtn.addEventListener('click', () => quickChatBtn.setAttribute('aria-expanded', String(!quickChatPanel.classList.contains('hidden'))));
tingBtnEl.addEventListener('click', () => tingBtnEl.setAttribute('aria-expanded', String(tingExpanded)));
logHistoryBtn.addEventListener('click', () => { markVersionSeen(); delete logHistoryBtn.dataset.new; });

let previousFocus = null;
document.querySelectorAll('.modal').forEach(modal => {
    new MutationObserver(() => {
        if (!modal.classList.contains('hidden')) {
            previousFocus = document.activeElement;
            modal.querySelector('button:not(.hidden):not(:disabled)')?.focus();
        } else if (previousFocus?.isConnected) previousFocus.focus();
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    modal.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(modal.querySelectorAll('button, input, select, [tabindex="0"]')).filter(el => !el.disabled && el.getClientRects().length);
        if (!controls.length) { event.preventDefault(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
});
