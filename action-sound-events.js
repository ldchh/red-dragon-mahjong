// Confirmed action metadata is shared by Socket.IO and the offline Worker.
// Snapshots establish a silent baseline; clicks and render diffs never imply success.
export class ActionSoundEvents {
    constructor() {this.reset();}
    reset() {this.ready=false;this.room='';this.round=0;this.sequence=-1;}
    snapshot(state) {
        const seq=state?.action_seq,round=state?.round_token,room=state?.room_code;
        if(!Number.isSafeInteger(seq)||seq<0||!Number.isSafeInteger(round)||typeof room!=='string') {
            this.reset();return;
        }
        if(!this.ready||this.room!==room||this.round!==round)this.sequence=seq;
        else this.sequence=Math.max(this.sequence,seq);
        this.room=room;this.round=round;this.ready=true;
    }
    accept(event) {
        if(!this.ready||!event||event.room_code!==this.room||event.round_token!==this.round
            ||!Number.isSafeInteger(event.action_seq)||event.action_seq<=this.sequence
            ||event.event_id!==`${this.room}:${this.round}:${event.action_seq}`
            ||![0,1,2,3].includes(event.player)
            ||!['discard','pong','kong','hu','zi_mo'].includes(event.type))return false;
        this.sequence=event.action_seq;return true;
    }
}
