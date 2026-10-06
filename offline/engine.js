/* 手机本地规则引擎。与 game/rules.py、game/core.py 使用同一套红中麻将规则。 */
(function (root) {
    'use strict';
    const RED = 40;
    const ALL = [10, 20, 30].flatMap(s => Array.from({length: 9}, (_, i) => s + i + 1)).concat(RED);
    const LUCKY = new Set([11, 15, 19, 21, 25, 29, 31, 35, 39, RED]);
    const seats = factory => Object.fromEntries([0, 1, 2, 3].map(i => [i, factory(i)]));
    const clone = value => JSON.parse(JSON.stringify(value));
    const count = (tiles, tile) => tiles.filter(t => t === tile).length;
    const validTile = t => Number.isInteger(t) && ALL.includes(t);
    const validHand = tiles => Array.isArray(tiles) && tiles.length <= 14 && tiles.every(validTile)
        && ALL.every(t => count(tiles, t) <= 4);
    const sortKey = t => ({1: 0, 3: 1, 2: 2, 4: 3}[Math.floor(t / 10)] * 10 + t % 10);
    const tileSort = (a, b) => sortKey(a) - sortKey(b);
    const remove = (tiles, tile, n = 1) => { while (n-- > 0) tiles.splice(tiles.indexOf(tile), 1); };
    function memo(limit) {
        const cache = new Map();
        return (key, compute) => {
            if (cache.has(key)) return cache.get(key);
            const value = compute();
            if (cache.size >= limit) cache.delete(cache.keys().next().value);
            cache.set(key, value);
            return value;
        };
    }
    const huCache = memo(32768), meldCache = memo(65536), tingCache = memo(8192);

    function melds(counts, wild) {
        return meldCache(counts.join(',') + ':' + wild, () => {
            const first = counts.findIndex(n => n > 0);
            if (first < 0) return wild % 3 === 0;
            for (let take = Math.min(3, counts[first]); take >= 1; take--) {
                const needed = 3 - take;
                if (needed > wild) continue;
                const next = counts.slice(); next[first] -= take;
                if (melds(next, wild - needed)) return true;
            }
            const suit = Math.floor(first / 9) * 9, rank = first % 9;
            for (let start = Math.max(0, rank - 2); start <= Math.min(rank, 6); start++) {
                const others = [suit + start, suit + start + 1, suit + start + 2].filter(i => i !== first);
                for (const a of counts[others[0]] ? [1, 0] : [0]) {
                    for (const b of counts[others[1]] ? [1, 0] : [0]) {
                        const needed = 2 - a - b;
                        if (needed > wild) continue;
                        const next = counts.slice(); next[first]--;
                        next[others[0]] -= a; next[others[1]] -= b;
                        if (melds(next, wild - needed)) return true;
                    }
                }
            }
            return false;
        });
    }

    function canQidui(hand) {
        if (!validHand(hand) || hand.length !== 14) return false;
        const wild = count(hand, RED);
        const needed = ALL.slice(0, -1).reduce((n, t) => n + count(hand, t) % 2, 0);
        return needed <= wild && (wild - needed) % 2 === 0;
    }

    function canHu(hand) {
        if (!validHand(hand)) return false;
        return huCache(hand.slice().sort((a, b) => a - b).join(','), () => {
            const wild = count(hand, RED);
            if (wild === 4) return true;
            if (hand.length % 3 !== 2) return false;
            if (canQidui(hand)) return true;
            const counts = ALL.slice(0, -1).map(t => count(hand, t));
            for (let i = 0; i < counts.length; i++) {
                for (const take of [2, 1]) {
                    if (counts[i] < take || wild < 2 - take) continue;
                    const next = counts.slice(); next[i] -= take;
                    if (melds(next, wild - (2 - take))) return true;
                }
            }
            return wild >= 2 && melds(counts, wild - 2);
        });
    }

    function getTing(hand, exposed = []) {
        if (!validHand(hand) || hand.length % 3 !== 1) return [];
        const key = hand.slice().sort((a, b) => a - b).join(',') + '/' + exposed.slice().sort((a, b) => a - b).join(',');
        return tingCache(key, () => ALL.filter(t => count(hand.concat(exposed), t) < 4 && canHu(hand.concat(t)))).slice();
    }

    function random() {
        if (root.crypto && root.crypto.getRandomValues) {
            return root.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
        }
        return Math.random();
    }

    class MahjongGame {
        constructor(rng = random) {
            this.rng = rng;
            this.deck = [];
            this.players = seats(() => []); this.melds = seats(() => []); this.discards = seats(() => []);
            this.scores = seats(() => 0); this.auto_hu = seats(() => false);
            this.last_draw = seats(() => null); this.hu_block_after_claim = seats(() => false);
            this.deal_sequence = seats(() => []);
            this.turn = 0; this.banker = 0; this.state = 'IDLE'; this.waiting_actions = {};
            this.last_discard = null; this.last_discard_player = -1; this.kong_events = [];
            this.first_discard_round = true; this.first_round_discards = {};
            this.bonus_draws = [];
        }
        getMeldTiles(seat) {
            return this.melds[seat].flatMap(m => Array(m.type === 'pong' ? 3 : 4).fill(m.tile));
        }
        selfActions(seat) {
            const empty = {hu: false, concealed_kong: [], add_kong: []}, hand = this.players[seat];
            if (this.state !== 'PLAYING' || this.turn !== seat || Object.keys(this.waiting_actions).length) return empty;
            if (count(hand, RED) === 4) return {...empty, hu: true};
            const hu = hand.length % 3 === 2 && !this.hu_block_after_claim[seat] && canHu(hand);
            if (hand.length % 3 !== 2 || !this.deck.length) return {...empty, hu};
            return {hu,
                concealed_kong: [...new Set(hand)].filter(t => t !== RED && count(hand, t) === 4).sort(tileSort),
                add_kong: this.melds[seat].filter(m => m.type === 'pong' && m.tile !== RED && hand.includes(m.tile))
                    .map(m => m.tile).sort(tileSort)};
        }
        start() {
            this.deck = ALL.flatMap(t => [t, t, t, t]);
            for (let i = this.deck.length - 1; i > 0; i--) {
                const j = Math.floor(this.rng() * (i + 1));
                [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
            }
            this.players = seats(() => []); this.melds = seats(() => []); this.discards = seats(() => []);
            this.last_draw = seats(() => null); this.hu_block_after_claim = seats(() => false);
            this.deal_sequence = seats(() => []); this.scores = seats(() => 0);
            this.state = 'PLAYING'; this.turn = this.banker; this.waiting_actions = {};
            this.first_discard_round = true; this.first_round_discards = {}; this.kong_events = [];
            this.last_discard = null; this.last_discard_player = -1; this.bonus_draws = [];
            const deal = i => { const t = this.deck.shift(); this.players[i].push(t); this.deal_sequence[i].push(t); };
            for (let batch = 0; batch < 3; batch++) for (let i = 0; i < 4; i++) for (let n = 0; n < 4; n++) deal(i);
            for (let i = 0; i < 4; i++) deal(i);
            deal(this.banker); this.last_draw[this.banker] = this.players[this.banker].at(-1);
            for (let i = 0; i < 4; i++) this.players[i].sort(tileSort);
        }
        draw(seat, tail = false) {
            if (!this.deck.length) { this.endDraw(); return null; }
            const tile = tail ? this.deck.pop() : this.deck.shift();
            this.players[seat].push(tile); this.players[seat].sort(tileSort);
            this.last_draw[seat] = tile; this.hu_block_after_claim[seat] = false;
            return tile;
        }
        openingBonus() {
            if (Object.keys(this.first_round_discards).length < 4) return;
            const tiles = Object.values(this.first_round_discards), plain = tiles.filter(t => t !== RED);
            if (new Set(tiles).size === 1 || (plain.length === 3 && new Set(plain).size === 1)) {
                for (let i = 0; i < 4; i++) this.scores[i] += i === this.banker ? -3 : 1;
            }
        }
        huBase(seat) {
            let base = 1;
            const draws = [], number = this.players[seat].includes(RED) ? 4 : 6;
            for (let i = 0; i < number && this.deck.length; i++) {
                const t = this.deck.shift(); draws.push(t); if (LUCKY.has(t)) base++;
            }
            this.bonus_draws.push(...draws);
            return {base, draws};
        }
        settleSelfHu(winner) {
            const result = count(this.players[winner], RED) === 4 ? {base: 10, draws: []} : this.huBase(winner);
            for (let i = 0; i < 4; i++) if (i !== winner) { this.scores[winner] += result.base; this.scores[i] -= result.base; }
            return result;
        }
        settleRobHu(winner, source) {
            const result = count(this.players[winner], RED) === 4 ? {base: 10, draws: []} : this.huBase(winner);
            this.scores[winner] += result.base * 3; this.scores[source] -= result.base * 3;
            return result;
        }
        robWinner(source, tile) {
            for (let step = 1; step < 4; step++) {
                const seat = (source + step) % 4;
                if (this.players[seat].length % 3 === 1 && !this.hu_block_after_claim[seat]
                    && getTing(this.players[seat], this.getMeldTiles(seat)).includes(tile)) return seat;
            }
            return null;
        }
        discard(seat, tile) {
            if (this.state !== 'PLAYING' || this.turn !== seat || Object.keys(this.waiting_actions).length
                || this.players[seat].length % 3 !== 2 || !validTile(tile) || !this.players[seat].includes(tile)) return false;
            remove(this.players[seat], tile); this.players[seat].sort(tileSort); this.last_draw[seat] = null;
            this.discards[seat].push(tile); this.last_discard = tile; this.last_discard_player = seat;
            if (this.first_discard_round) {
                if (!(seat in this.first_round_discards)) this.first_round_discards[seat] = tile;
                if (Object.keys(this.first_round_discards).length === 4) { this.openingBonus(); this.first_discard_round = false; }
            }
            return true;
        }
        execute(seat, type, tile) {
            if (this.state !== 'PLAYING' || !validTile(tile)) return false;
            const hand = this.players[seat], source = this.last_discard_player;
            if (type === 'pong' || type === 'kong') {
                if (source < 0 || source > 3 || source === seat || this.last_discard !== tile
                    || this.discards[source].at(-1) !== tile || count(hand, tile) < (type === 'pong' ? 2 : 3)
                    || hand.length % 3 !== 1 || (type === 'kong' && (tile === RED || !this.deck.length))) return false;
            } else if (type === 'add_kong' || type === 'concealed_kong') {
                if (!this.selfActions(seat)[type].includes(tile)) return false;
            } else return false;
            if (type === 'pong') {
                remove(hand, tile, 2); this.melds[seat].push({type: 'pong', tile}); this.discards[source].pop();
                this.turn = seat; this.last_draw[seat] = null; this.hu_block_after_claim[seat] = true;
            } else if (type === 'kong') {
                remove(hand, tile, 3); this.melds[seat].push({type: 'kong', tile, source: 'exposed'});
                this.discards[source].pop(); this.scores[seat] += 3; this.scores[source] -= 3;
                this.kong_events.push({type, player: seat, from_player: source}); this.turn = seat; this.draw(seat, true);
            } else {
                if (type === 'add_kong') {
                    remove(hand, tile); Object.assign(this.melds[seat].find(m => m.type === 'pong' && m.tile === tile), {type: 'kong', source: 'added'});
                } else {
                    remove(hand, tile, 4); this.melds[seat].push({type: 'kong', tile, source: 'concealed'});
                }
                const pay = type === 'add_kong' ? 1 : 2;
                for (let i = 0; i < 4; i++) if (i !== seat) { this.scores[seat] += pay; this.scores[i] -= pay; }
                this.kong_events.push({type, player: seat}); this.turn = seat; this.draw(seat, true);
            }
            this.last_discard = null; this.last_discard_player = -1;
            return true;
        }
        endDraw() {
            for (const event of this.kong_events.slice().reverse()) {
                if (event.type === 'kong') { this.scores[event.player] -= 3; this.scores[event.from_player] += 3; }
                else {
                    const pay = event.type === 'add_kong' ? 1 : 2;
                    for (let i = 0; i < 4; i++) if (i !== event.player) { this.scores[event.player] -= pay; this.scores[i] += pay; }
                }
            }
            this.kong_events = []; this.state = 'FINISHED';
        }
        physicalTiles() {
            return this.deck.concat(this.bonus_draws, ...Object.values(this.players), ...Object.values(this.discards),
                ...[0, 1, 2, 3].map(i => this.getMeldTiles(i)));
        }
        export() {
            const result = {...this}; delete result.rng; return clone(result);
        }
    }

    function aiProfile(level) {
        const lv = Math.max(1, Math.min(8, Number(level) || 6));
        return {think_delay: Math.max(0.55, 1.3 - lv * .1), near_best_slack: Math.max(1, 10 - lv),
            near_best_pick_prob: Math.max(.08, .85 - lv * .09), random_discard_prob: Math.max(.02, .40 - lv * .05),
            add_kong_prob: Math.min(.9, .18 + lv * .09), concealed_kong_prob: Math.min(.86, .12 + lv * .09),
            claim_kong_prob: Math.min(.92, .15 + lv * .1)};
    }
    function keepScore(tiles) {
        let score = getTing(tiles).length * 45;
        for (const t of new Set(tiles)) {
            const n = count(tiles, t);
            if (t === RED) score += n * 6;
            if (n >= 2) score += 6 + (n - 2) * 4;
            if (n >= 3) score += 5;
            const rank = t % 10;
            if (t !== RED) {
                if (rank <= 8 && tiles.includes(t + 1)) score += 3;
                if (rank <= 7 && tiles.includes(t + 2)) score += 2;
                if (rank >= 2 && tiles.includes(t - 1)) score++;
            }
        }
        return score;
    }
    function chooseDiscard(game, seat, level = 6) {
        const hand = game.players[seat], profile = aiProfile(level);
        let candidates = hand.filter(t => t !== RED || level < 2 || hand.every(v => v === RED));
        if (!candidates.length) candidates = hand;
        const scored = [...new Set(candidates)].sort(tileSort).map(tile => {
            const next = hand.slice(); remove(next, tile);
            return {tile, score: keepScore(next) - (tile === RED && count(hand, RED) <= 1 ? 10 : 0)};
        }).sort((a, b) => b.score - a.score);
        if (!scored.length) return null;
        if (game.rng() < profile.random_discard_prob) return candidates[Math.floor(game.rng() * candidates.length)];
        const near = scored.filter(v => v.score >= scored[0].score - profile.near_best_slack);
        if (near.length && game.rng() < profile.near_best_pick_prob) return near[Math.floor(game.rng() * near.length)].tile;
        return scored[0].tile;
    }

    const api = {RED, ALL, canHu, canQidui, getTing, validHand, MahjongGame, aiProfile, keepScore, chooseDiscard, tileSort, seats, clone, random};
    root.MahjongOffline = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
