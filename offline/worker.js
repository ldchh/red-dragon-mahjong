importScripts('../nickname.js?v=1.9.20', 'engine.js?v=1.9.20', 'progression.js?v=1.9.20', 'table.js?v=1.9.20');
let table;
let timer;
let calendarTimer;
function send(event, data) { postMessage({event, data}); }
function schedule() {
    clearTimeout(timer);
    const delay = table.nextDelay();
    if (delay !== null) timer = setTimeout(() => {
        try { table.tick(); schedule(); }
        catch (error) { console.error(error); send('error', {message: '离线对局暂时遇到问题，请退出后继续存档。'}); }
    }, Math.max(20, delay));
}
function scheduleCalendar() {
    clearTimeout(calendarTimer);
    calendarTimer = setTimeout(() => {
        table.handle('refresh_calendar');
        scheduleCalendar();
    }, table.progression.nextCalendarDelay());
}
onmessage = ({data}) => {
    try {
        if (data.event === 'init') {
            const document = data.document;
            if (document && document.version !== 1 && document.version !== 2) throw new Error('Unsupported offline save');
            if (document?.version === 2 && !document.profile) throw new Error('Missing offline profile');
            const progression = new MahjongOfflineProgression.OfflineProgression(document?.version === 2 ? document.profile : null,
                () => new Date(), data.clock, data.shared_rank);
            table = new MahjongOfflineTable(send, MahjongOffline.random, progression);
            const snapshot = document?.version === 2 ? document.match : document;
            const restored = snapshot ? table.restore(snapshot) : false;
            table.syncProfile(true);
            send('ready', {saved: restored && table.hasSave()});
            if (snapshot && !restored) send('error', {message: '本桌牌的存档无法恢复，段位和每日任务已保留。'});
            scheduleCalendar();
        } else if (table) {
            if (data.data?.shared_rank) table.progression.adoptRank(data.data.shared_rank);
            if (data.event === 'refresh_calendar' && data.data?.clock) table.progression.setDeviceClock(data.data.clock);
            table.handle(data.event, data.data);
            if (data.event === 'refresh_calendar') table.syncProfile(true);
            schedule();
            scheduleCalendar();
        }
    } catch (error) {
        console.error(error);
        send(data.event === 'init' ? 'init_failed' : 'error', {message: '离线操作未完成，请重试。'});
    }
};
