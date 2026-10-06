/** A mode switch preserves the room chooser that the player actually tapped. */
export function roomEntryURL(mode,native=false) {
    if(!['offline','friend'].includes(mode))throw new RangeError('Invalid room entry');
    const path=mode==='offline'?'/offline.html':native?'/online':'/';
    return (native?'https://appassets.androidplatform.net':'')+path+'?lobby='+mode;
}
export function pendingRoomEntry(href,offline) {
    const value=new URL(href).searchParams.get('lobby');
    return value===(offline?'offline':'friend')?value:null;
}
export function consumeRoomEntry(href) {
    const url=new URL(href);url.searchParams.delete('lobby');return url.href;
}
