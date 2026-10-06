/* 离线房间与回合驱动，复用网页的事件格式；不产生网络请求。 */
(function (root) {
    'use strict';
    const E = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.MahjongOffline;
    const P = typeof module !== 'undefined' && module.exports ? require('./progression.js') : root.MahjongOfflineProgression;
    const N = typeof module !== 'undefined' && module.exports ? require('../nickname.js') : root.MahjongNickname;
    const {MahjongGame, ALL, RED, seats, clone, tileSort, getTing, chooseDiscard, aiProfile} = E;
    class OfflineTable {
        constructor(emit = () => {}, rng = E.random, progression = new P.OfflineProgression()) {
            this.emit = emit; this.rng = rng; this.game = null; this.joined = false;
            this.seq = 0; this.roundToken = 0; this.currentRound = 0; this.roundTarget = 1;
            this.actionSeq = 0; // Ephemeral delivery metadata, never gameplay/save data.
            this.totalScores = seats(() => 0); this.nextBanker = 0; this.level = 1; this.difficultyMode = 'rank';
            this.profiles = {}; this.ready = false; this.readyAt = 0;
            this.matchOver = false; this.settled = false; this.reveal = null; this.finishAt = 0;
            this.autoHu = false;
            this.progression = progression; this.matchId = ''; this.rankOutcome = null; this.profileSignature = '';
        }
        hasSave() { return !!this.game && !this.matchOver; }
        send(event, data) {
            if(event === 'action_event') {
                const sequence=++this.actionSeq;
                data={...data,room_code:'离线练习',round_token:this.roundToken,action_seq:sequence,
                    event_id:`离线练习:${this.roundToken}:${sequence}`};
            }
            this.emit(event, clone(data));
        }
        error(message) { this.send('error', {message}); }
        join() {
            this.joined = true;
            this.send('room_joined', {room_code: '离线练习', seat: 0});
            this.publish(true);
        }
        meta() {
            if (this.profiles[0]) this.profiles[0].rank_state = this.progression.profile().rank_state;
            return {room_code: '离线练习', seat: 0, owner_seat: 0, is_owner: true,
                round_target: this.roundTarget, current_round: this.currentRound,
                total_scores: this.totalScores, player_count: 1, ai_count: 3, ai_level: this.level, ai_mode: this.difficultyMode,
                seat_profiles: this.profiles, human_seats: [0], game_status: this.game?.state || 'IDLE',
                daily_tasks: this.progression.profile().daily_tasks};
        }
        state() {
            const g = this.game, hand = g.players[0].slice().sort(tileSort);
            const drawn = g.turn === 0 ? g.last_draw[0] : null;
            if (drawn !== null && hand.includes(drawn)) { hand.splice(hand.indexOf(drawn), 1); hand.push(drawn); }
            return {hand, deal_sequence_hand: g.deal_sequence[0], discards: g.discards, melds: g.melds,
                turn: g.turn, banker: g.banker, wall_count: g.deck.length, scores: g.scores,
                total_scores: this.totalScores, ting_tiles: getTing(g.players[0], g.getMeldTiles(0)),
                game_over: g.state === 'FINISHED', match_over: this.matchOver,
                round_target: this.roundTarget, current_round: this.currentRound,
                hand_counts: seats(i => g.players[i].length), ai_seats: [1, 2, 3], drawn_tile: drawn,
                self_actions: g.turn === 0 && g.state === 'PLAYING' ? g.selfActions(0) : null,
                reveal_hu: this.reveal?.hu || null, reveal_draws: this.reveal?.draws || null,
                room_code: '离线练习', owner_seat: 0, game_status: g.state, round_ready: this.ready,
                claim_pending: !!Object.keys(g.waiting_actions).length, waiting_action: g.waiting_actions[0] || null,
                auto_hu: this.autoHu, rank_outcome: this.rankOutcome, seat_profiles: this.profiles,
                daily_tasks: this.progression.profile().daily_tasks,
                state_seq: this.seq, action_seq:this.actionSeq, round_token: this.roundToken, last_discard_player: g.last_discard_player};
        }
        publish(meta = false) {
            this.progression.ensureCalendar();
            if (this.profiles[0]) this.profiles[0].rank_state = this.progression.profile().rank_state;
            this.seq++;
            // 段位、任务和本桌结算在同一份存档中，先落盘再展示。
            this.send('persist', this.document());
            this.syncProfile(false, false);
            if (this.joined && this.game) {
                if (meta) this.send('room_meta', this.meta());
                this.send('game_state', this.state());
            }
            this.send('saved_game', {available: this.hasSave()});
        }
        document() { return {version: 2, profile: this.progression.export(), match: this.snapshot()}; }
        syncProfile(force = false, persist = true) {
            const profile = this.progression.profile(), signature = JSON.stringify(profile);
            if (!force && signature === this.profileSignature) return;
            if (persist) this.send('persist', this.document());
            this.profileSignature = signature;
            if (this.profiles[0]) this.profiles[0].rank_state = profile.rank_state;
            this.send('profile', profile);
        }
        newGame(data) {
            const nickname = N.validate(data?.name);
            if (!nickname.ok) { this.error(nickname.message); return; }
            this.progression.ensureCalendar();
            this.game = new MahjongGame(this.rng);
            this.roundTarget = [1, 5, 10, 15, 20].includes(Number(data.rounds)) ? Number(data.rounds) : 1;
            // 与联机房主一致：创建牌桌时由可信的当前段位决定，整场不再调整。
            this.level = this.progression.profile().rank_state.major;
            this.difficultyMode = 'rank';
            this.currentRound = 0; this.totalScores = seats(() => 0); this.nextBanker = 0;
            this.matchOver = false; this.autoHu = false;
            this.matchId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            this.rankOutcome = null;
            const name = nickname.name;
            const avatar = Math.max(1, Math.min(5, Number(data.avatar) || 1));
            this.profiles = seats(i => ({name: i === 0 ? name : ['青竹', '听雨', '归云', '望山'][i], avatar: i === 0 ? avatar : i + 1}));
            this.joined = true;
            this.send('room_joined', {room_code: '离线练习', seat: 0});
            this.startRound();
        }
        startRound(now = Date.now()) {
            if (!this.game || !['IDLE', 'FINISHED'].includes(this.game.state) || this.currentRound >= this.roundTarget) {
                this.send('start_denied', {reason: '本局尚未结束，请先完成本局。'}); return;
            }
            this.currentRound++; this.roundToken++; this.matchOver = false; this.settled = false; this.reveal = null;
            this.game = new MahjongGame(this.rng); this.game.banker = this.nextBanker;
            this.game.auto_hu[0] = this.autoHu; this.game.start();
            this.ready = false; this.readyAt = now + 8000;
            this.publish(true);
        }
        advance(source) {
            this.game.turn = (source + 1) % 4;
            this.game.draw(this.game.turn);
            if (this.game.state === 'FINISHED') this.finishDraw();
            else this.publish();
        }
        discard(seat, tile) {
            if (!this.game.discard(seat, tile)) return false;
            this.send('action_event', {player:seat,type:'discard'});
            this.publish();
            if (!this.claim(seat, tile)) this.advance(seat);
            return true;
        }
        claim(source, tile) {
            const g = this.game;
            for (let step = 1; step < 4; step++) {
                const seat = (source + step) % 4, number = g.players[seat].filter(t => t === tile).length;
                if (number < 2) continue;
                const actions = ['pong'];
                if (number >= 3 && tile !== RED && g.deck.length) actions.push('kong');
                if (seat === 0) {
                    g.waiting_actions = {0: {actions, tile, from_player: source}};
                    this.publish();
                    this.send('action_request', {actions, tile, state_seq: this.seq, round_token: this.roundToken});
                    return true;
                }
                const action = actions.includes('kong') && this.rng() < aiProfile(this.level).claim_kong_prob ? 'kong' : 'pong';
                if (!g.execute(seat, action, tile)) return false;
                this.send('action_event', {player: seat, type: action});
                if (g.state === 'FINISHED') this.finishDraw(); else this.publish();
                return true;
            }
            return false;
        }
        kong(seat, tile, kind) {
            const g = this.game;
            if (kind === 'add_kong') {
                const winner = g.robWinner(seat, tile);
                if (winner !== null) {
                    g.players[seat].splice(g.players[seat].indexOf(tile), 1);
                    g.players[winner].push(tile); g.players[winner].sort(tileSort);
                    this.finishHu(winner, 'hu', g.settleRobHu(winner, seat)); return true;
                }
            }
            if (!g.execute(seat, kind, tile)) return false;
            this.send('action_event', {player: seat, type: 'kong'});
            if (g.state === 'FINISHED') this.finishDraw(); else this.publish();
            return true;
        }
        finishHu(winner, type, result, now = Date.now()) {
            if (this.settled || this.game.state !== 'PLAYING') return;
            this.game.state = 'FINISHING'; this.game.waiting_actions = {};
            this.reveal = {hu: {winner, hand: this.game.players[winner].slice().sort(tileSort)}, draws: result.draws};
            this.nextBanker = winner; this.finishAt = now + 5000;
            this.progression.cleanHu(this.level, winner, this.game.players[winner], this.difficultyMode);
            this.send('action_event', {player: winner, type});
            this.send('msg', {text: `胡牌 · 底分 ${result.base}，5 秒后结算`});
            this.publish();
        }
        finishDraw() {
            this.nextBanker = this.game.banker;
            this.send('msg', {text: '流局，本局结束，杠分已退回'});
            this.settle();
        }
        settle() {
            if (this.settled) return;
            for (let i = 0; i < 4; i++) this.totalScores[i] += this.game.scores[i];
            this.settled = true; this.reveal = null; this.game.state = 'FINISHED';
            this.matchOver = this.currentRound >= this.roundTarget;
            if (this.matchOver) this.rankOutcome = this.progression.settleMatch(this.matchId, this.level, this.roundTarget, this.totalScores, this.difficultyMode);
            this.publish(true);
        }
        humanAction(data) {
            const g = this.game;
            if (!g || !this.joined || g.state !== 'PLAYING') return;
            if (Number(data.round_token) !== this.roundToken || Number(data.state_seq) !== this.seq || !this.ready) {
                this.publish(); return;
            }
            const kind = data.type, tile = data.tile;
            if (kind === 'discard') {
                if (!this.discard(0, tile)) this.error('当前不能打这张牌');
                return;
            }
            if (['pong', 'kong', 'pass'].includes(kind)) {
                const pending = g.waiting_actions[0];
                if (!pending || (kind !== 'pass' && !pending.actions.includes(kind))) { this.error('碰杠机会已结束'); return; }
                if (kind === 'pass') { g.waiting_actions = {}; this.advance(pending.from_player); }
                else if (g.execute(0, kind, pending.tile)) {
                    g.waiting_actions = {}; this.send('action_event', {player: 0, type: kind});
                    if (g.state === 'FINISHED') this.finishDraw(); else this.publish();
                } else this.error('当前不能碰杠');
                return;
            }
            if (g.turn !== 0 || Object.keys(g.waiting_actions).length) { this.error('请等待轮到你'); return; }
            const allowed = g.selfActions(0);
            if (kind === 'self_kong') {
                const type = allowed.add_kong.includes(tile) ? 'add_kong' : allowed.concealed_kong.includes(tile) ? 'concealed_kong' : null;
                if (!type || !this.kong(0, tile, type)) this.error('当前不能开杠');
            } else if (kind === 'self_hu' && allowed.hu) this.finishHu(0, 'zi_mo', g.settleSelfHu(0));
            else this.error('当前不能执行该操作');
        }
        handle(event, data = {}) {
            if (!data || typeof data !== 'object') data = {};
            if (this.progression.ensureCalendar()) this.syncProfile();
            if (event === 'create_room') this.newGame(data);
            else if (event === 'get_profile') {
                this.syncProfile(true); this.send('saved_game', {available: this.hasSave()});
            } else if (event === 'claim_daily_reward') {
                const result = this.progression.claim(data.task_id, data.date);
                this.syncProfile(true);
                this.send(result.ok ? 'msg' : 'error', result.ok ? {text: result.message} : {message: result.message});
            } else if (event === 'rejoin_room' || event === 'resume_room') {
                if (this.game) this.join(); else this.send('room_error', {message: '没有可继续的离线对局'});
            } else if (event === 'start_game') this.startRound();
            else if (event === 'deal_ready' && this.game && Number(data.round_token) === this.roundToken && !this.ready) {
                this.ready = true; this.publish();
            } else if (event === 'action') this.humanAction(data);
            else if (event === 'set_auto_hu' && this.game) {
                this.autoHu = !!data.enabled; this.game.auto_hu[0] = this.autoHu; this.publish();
            } else if (event === 'leave_room') {
                this.game = null; this.joined = false; this.send('left_room', {ok: true}); this.publish();
            } else if (event === 'quick_chat') this.send('quick_msg', {seat: 0, name: this.profiles[0]?.name || '你', text: String(data.text || '').slice(0, 60)});
            else if (event === 'join_room') this.send('room_error', {message: '离线模式仅与本机人机对局，请在首页选择好友联机'});
        }
        tick(now = Date.now()) {
            if (this.progression.ensureCalendar()) this.syncProfile();
            const g = this.game;
            if (!g || !this.joined) return;
            if (g.state === 'FINISHING') { if (now >= this.finishAt) this.settle(); return; }
            if (g.state !== 'PLAYING') return;
            if (!this.ready) { if (now >= this.readyAt) { this.ready = true; this.publish(); } return; }
            if (Object.keys(g.waiting_actions).length) return;
            const seat = g.turn, actions = g.selfActions(seat);
            if (seat === 0) {
                if (this.autoHu && actions.hu) this.finishHu(0, 'zi_mo', g.settleSelfHu(0), now);
                return;
            }
            if (actions.hu) { this.finishHu(seat, 'zi_mo', g.settleSelfHu(seat), now); return; }
            const profile = aiProfile(this.level);
            const safe = actions.add_kong.filter(t => g.robWinner(seat, t) === null);
            if (safe.length && this.rng() < profile.add_kong_prob) { this.kong(seat, safe[0], 'add_kong'); return; }
            if (actions.concealed_kong.length && this.rng() < profile.concealed_kong_prob) {
                this.kong(seat, actions.concealed_kong[0], 'concealed_kong'); return;
            }
            const tile = chooseDiscard(g, seat, this.level);
            if (tile === null || !this.discard(seat, tile)) throw new Error('离线 AI 牌数异常');
        }
        nextDelay(now = Date.now()) {
            const g = this.game;
            if (!g || !this.joined || g.state === 'FINISHED') return null;
            if (g.state === 'FINISHING') return Math.max(0, this.finishAt - now);
            if (!this.ready) return Math.max(0, this.readyAt - now);
            if (Object.keys(g.waiting_actions).length) return null;
            if (g.turn !== 0) return aiProfile(this.level).think_delay * 1000;
            return this.autoHu && g.selfActions(0).hu ? 150 : null;
        }
        snapshot() {
            if (!this.game) return null;
            return clone({version: 1, game: this.game.export(), seq: this.seq, roundToken: this.roundToken,
                currentRound: this.currentRound, roundTarget: this.roundTarget, totalScores: this.totalScores,
                nextBanker: this.nextBanker, level: this.level, difficultyMode: this.difficultyMode, profiles: this.profiles,
                ready: this.ready, readyAt: this.readyAt, matchOver: this.matchOver, settled: this.settled,
                reveal: this.reveal, finishAt: this.finishAt, autoHu: this.autoHu,
                matchId: this.matchId, rankOutcome: this.rankOutcome});
        }
        restore(snapshot) {
            try {
                if (!snapshot || snapshot.version !== 1 || ![1, 5, 10, 15, 20].includes(snapshot.roundTarget)) return false;
                const mode = snapshot.difficultyMode === undefined ? 'legacy' : snapshot.difficultyMode;
                if (!['rank', 'legacy'].includes(mode) || !Number.isInteger(snapshot.level)
                    || (mode === 'rank' ? snapshot.level < 1 || snapshot.level > 8 : ![2, 6, 8].includes(snapshot.level))) return false;
                const g = new MahjongGame(this.rng);
                for (const key of Object.keys(g)) if (key !== 'rng') g[key] = clone(snapshot.game[key]);
                if (!['PLAYING', 'FINISHING', 'FINISHED'].includes(g.state)) return false;
                const tiles = g.physicalTiles();
                if (tiles.length !== 112 || !ALL.every(t => tiles.filter(v => v === t).length === 4)) return false;
                if (![0, 1, 2, 3].includes(g.turn) || ![0, 1, 2, 3].includes(g.banker)) return false;
                if (!Object.values(g.scores).every(Number.isInteger) || Object.values(g.scores).reduce((a, b) => a + b, 0) !== 0) return false;
                if (!Number.isInteger(snapshot.currentRound) || snapshot.currentRound < 1 || snapshot.currentRound > snapshot.roundTarget) return false;
                if (!Object.values(snapshot.totalScores).every(Number.isInteger)
                    || Object.values(snapshot.totalScores).reduce((a, b) => a + b, 0) !== 0) return false;
                for (const key of ['seq', 'roundToken', 'currentRound', 'roundTarget', 'totalScores', 'nextBanker', 'level',
                    'profiles', 'ready', 'readyAt', 'matchOver', 'settled', 'reveal', 'finishAt', 'autoHu']) this[key] = clone(snapshot[key]);
                this.game = g; this.joined = false; this.difficultyMode = mode;
                this.matchId = snapshot.matchId || globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
                this.rankOutcome = snapshot.rankOutcome || null;
                return true;
            } catch { return false; }
        }
    }
    root.MahjongOfflineTable = OfflineTable;
    if (typeof module !== 'undefined' && module.exports) module.exports = OfflineTable;
})(globalThis);
