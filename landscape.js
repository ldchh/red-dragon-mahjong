// Native Android locks its Activity. Browsers may require fullscreen + a gesture.
const app = document.getElementById('app');
const game = document.getElementById('game-screen');
const gate = document.getElementById('landscape-gate');
const button = document.getElementById('landscape-enter');
const hint = document.getElementById('landscape-hint');
const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
    || matchMedia('(any-pointer: coarse)').matches;
const native=/HongzhongMahjong\//.test(navigator.userAgent);
let blocked = false, previousInert = false, previousFocus = null, locking = null;

function update() {
    // Physical orientation also protects against the portrait keyboard making
    // the viewport wider than it is tall. A narrow iframe still needs rotating.
    const portrait = innerHeight > innerWidth || (mobile && screen.orientation?.type?.startsWith('portrait'));
    const required = portrait && (mobile || !game.classList.contains('hidden'));
    if (required === blocked) return;
    if (required) {
        window.TableTheme?.close();
        previousInert = app.inert && document.body.dataset.assetsLoading!=='true'; previousFocus = document.activeElement;
        app.inert = true; blocked = true; gate.hidden = false;
        document.body.classList.add('landscape-blocked');
        document.getElementById('landscape-title').textContent = mobile ? '横过来，入座好牌' : '请将窗口调整为横向';
        hint.textContent = mobile ? '牌馆仅支持横屏。横放手机或平板，即可继续。' : '拉宽窗口后继续，当前牌桌与进度会保留。';
        button.hidden = !mobile || (!document.documentElement.requestFullscreen && !screen.orientation?.lock);
        (button.hidden ? gate : button).focus({preventScroll:true});
    } else {
        blocked = false; gate.hidden = true; app.inert = previousInert || document.body.dataset.assetsLoading==='true';
        document.body.classList.remove('landscape-blocked');
        if (previousFocus?.isConnected && previousFocus.getClientRects().length && !app.inert) previousFocus.focus({preventScroll:true});
    }
}

async function requestLandscape(fullscreen = false) {
    // The Android Activity owns immersion and orientation. WebView HTML
    // fullscreen has a separate custom-view lifecycle and must not compete.
    if (!mobile || native || locking) return locking;
    locking = (async () => {
        try {
            if (fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen({navigationUI:'hide'});
            }
            if (screen.orientation?.lock) await screen.orientation.lock('landscape');
            else throw new Error('Orientation lock unavailable');
        } catch {
            if (blocked) hint.textContent = '浏览器未允许自动横屏，请把手机或平板横过来。牌桌与进度会保留。';
        } finally { update(); }
    })();
    try { await locking; } finally { locking = null; }
}

button.addEventListener('click', () => requestLandscape(true));
window.addEventListener('resize', update);
screen.orientation?.addEventListener('change', update);
document.addEventListener('fullscreenchange', () => {update(); if (document.fullscreenElement) requestLandscape();});
document.addEventListener('visibilitychange', () => {if (!document.hidden) {update(); requestLandscape();}});
new MutationObserver(() => {update(); if (!game.classList.contains('hidden')) requestLandscape();})
    .observe(game, {attributes:true,attributeFilter:['class']});

// Stop all game shortcuts and pointer actions while the landscape gate is up.
for (const type of ['click','pointerdown','keydown','keyup']) document.addEventListener(type, event => {
    if (!blocked || gate.contains(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
}, true);
document.addEventListener('keydown', event => {
    if (!blocked) return;
    event.stopImmediatePropagation();
    if (event.key === 'Tab') {event.preventDefault(); (button.hidden ? gate : button).focus();}
    if (event.key === 'Escape') event.preventDefault();
}, true);
document.addEventListener('focusin', event => {
    if (blocked && !gate.contains(event.target)) (button.hidden ? gate : button).focus({preventScroll:true});
}, true);
document.addEventListener('click', event => {
    if (mobile && !blocked && event.target.closest('#start-btn,#offline-resume-btn,#create-btn,#join-btn')) requestLandscape(true);
}, true);
update();
requestLandscape();
