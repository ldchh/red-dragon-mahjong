from aiohttp import web
import socketio
import asyncio
import random
import os
import secrets
from collections import Counter
from game.core import MahjongGame
from game.rules import get_ting_tiles, can_hu, RED_DRAGON

sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

rooms = {}
sid_room = {}
TURN_STALL_SECONDS = 60
CLAIM_TIMEOUT_SECONDS = 8
DEAL_READY_FALLBACK_SECONDS = 8
RECONNECT_GRACE_SECONDS = 90
ALLOWED_ROUNDS = [1, 5, 10, 15, 20]
MIN_AI_LEVEL = 1
MAX_AI_LEVEL = 8
QUICK_MESSAGES = {
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
}


def new_room_code():
    while True:
        code = ''.join(random.choice('0123456789') for _ in range(6))
        if code not in rooms:
            return code


def room_players_count(room):
    return len(room['players'])


def room_ai_count(room):
    return max(0, 4 - room_players_count(room))


def normalize_avatar_id(v):
    try:
        x = int(v)
    except Exception:
        x = 1
    if x < 1 or x > 5:
        x = 1
    return x


def normalize_ai_level(v):
    try:
        x = int(v)
    except Exception:
        x = 6
    if x < MIN_AI_LEVEL:
        x = MIN_AI_LEVEL
    if x > MAX_AI_LEVEL:
        x = MAX_AI_LEVEL
    return x


def normalize_rank_state(v):
    base = {'major': 1, 'minor': 0, 'stars': 0}
    if not isinstance(v, dict):
        return base
    try:
        major = int(v.get('major', 1))
    except Exception:
        major = 1
    try:
        minor = int(v.get('minor', 0))
    except Exception:
        minor = 0
    try:
        stars = int(v.get('stars', 0))
    except Exception:
        stars = 0
    if major < 1:
        major = 1
    if major > 8:
        major = 8
    if major == 8:
        minor = 0
    else:
        if minor < 0:
            minor = 0
        if minor > 2:
            minor = 2
    if stars < 0:
        stars = 0
    return {'major': major, 'minor': minor, 'stars': stars}


def normalize_player_token(v):
    token = str(v or '').strip()
    if 8 <= len(token) <= 128:
        return token
    return secrets.token_urlsafe(18)


def prune_offline_seats(room):
    offline = room.get('offline_seats', {})
    if not offline:
        return
    now = asyncio.get_running_loop().time()
    expired = [seat for seat, ts in offline.items() if ts <= now]
    for seat in expired:
        offline.pop(seat, None)


def cleanup_stale_sid_binding(sid):
    code = sid_room.get(sid)
    if not code:
        return None
    room = rooms.get(code)
    if not room:
        sid_room.pop(sid, None)
        return None
    if sid not in room['players']:
        sid_room.pop(sid, None)
        return None
    return room


def assign_seat(room, sid):
    for seat in range(4):
        used = set(room['players'].values()) | set((room.get('offline_seats') or {}).keys())
        if seat not in used:
            room['players'][sid] = seat
            return seat
    return None


def get_sid_by_index(room, idx):
    for s, i in room['players'].items():
        if i == idx:
            return s
    return None


def get_sid_by_token(room, token):
    for sid, seat in room['players'].items():
        if room['seat_tokens'].get(seat) == token:
            return sid
    return None


def get_seat_by_token(room, token):
    for seat, t in room['seat_tokens'].items():
        if t == token:
            return seat
    return None


def get_claim_player(room, discard_player, tile):
    game = room['game']
    for step in [1, 2, 3]:
        idx = (discard_player + step) % 4
        if game.players[idx].count(tile) >= 2:
            return idx
    return None


def get_claim_actions(room, player_idx, tile):
    cnt = room['game'].players[player_idx].count(tile)
    actions = []
    if cnt >= 2:
        actions.append('pong')
    if cnt >= 3 and tile != RED_DRAGON:
        actions.append('kong')
    return actions


async def emit_room(room, event, data):
    for sid in room['players'].keys():
        await sio.emit(event, data, room=sid)


async def send_room_meta(room):
    for sid, seat in room['players'].items():
        payload = {
            'room_code': room['code'],
            'seat': seat,
            'owner_seat': room['owner_seat'],
            'is_owner': sid == room['owner_sid'],
            'round_target': room['round_target'],
            'current_round': room['current_round'],
            'total_scores': room['total_scores'],
            'player_count': room_players_count(room),
            'ai_count': room_ai_count(room),
            'ai_level': room.get('ai_level', 6),
            'seat_profiles': room['seat_profiles']
        }
        await sio.emit('room_meta', payload, room=sid)


def game_progress_key(game):
    waiting = tuple(
        (p, tuple(v.get('actions', [])), v.get('tile'), v.get('from_player'))
        for p, v in sorted(game.waiting_actions.items(), key=lambda x: x[0])
    )
    return (
        game.state,
        game.turn,
        len(game.deck),
        tuple(len(game.players[i]) for i in range(4)),
        tuple(len(game.discards[i]) for i in range(4)),
        waiting
    )


def ensure_turn_watchdog(room):
    task = room.get('watch_task')
    if task and not task.done():
        return
    room['watch_key'] = None
    room['watch_ts'] = 0.0
    room['watch_task'] = asyncio.create_task(turn_watchdog(room['code']))


def ensure_ai_driver(room):
    task = room.get('driver_task')
    if task and not task.done():
        return
    room['driver_task'] = asyncio.create_task(ai_driver(room['code']))


def is_round_ready(room):
    pending = room.get('pending_ready_seats')
    if not pending:
        return True
    now = asyncio.get_running_loop().time()
    if now < room.get('round_ready_at', 0):
        return False
    room['pending_ready_seats'] = set()
    return True


def cancel_claim_timeout(room):
    task = room.get('claim_timeout_task')
    if task and not task.done():
        task.cancel()
    room['claim_timeout_task'] = None


def schedule_claim_timeout(room, claimer, from_player, tile):
    cancel_claim_timeout(room)
    token = room.get('round_token', 0)
    room['claim_timeout_task'] = asyncio.create_task(claim_timeout(room['code'], token, claimer, from_player, tile))


async def claim_timeout(room_code, round_token, claimer, from_player, tile):
    await asyncio.sleep(CLAIM_TIMEOUT_SECONDS)
    room = rooms.get(room_code)
    if not room or room.get('round_resolving'):
        return
    if room.get('round_token', 0) != round_token:
        return
    game = room['game']
    pending = game.waiting_actions.get(claimer)
    if not pending:
        return
    if pending.get('from_player') != from_player or pending.get('tile') != tile:
        return
    game.waiting_actions = {}
    room['claim_timeout_task'] = None
    await emit_room(room, 'msg', {'text': '碰杠超时，系统自动过牌'})
    if from_player is not None:
        await advance_turn_and_draw_from(room, from_player)
    else:
        await broadcast_game_state(room)


async def ai_driver(room_code):
    while True:
        await asyncio.sleep(0.25)
        room = rooms.get(room_code)
        if not room:
            return
        game = room['game']
        if room.get('round_resolving') or game.state != "PLAYING":
            continue
        if not is_round_ready(room):
            continue
        if game.waiting_actions:
            continue
        if game.turn in room['ai_players'] and not room.get('ai_busy'):
            await check_ai_turn(room)


async def turn_watchdog(room_code):
    while True:
        await asyncio.sleep(2)
        room = rooms.get(room_code)
        if not room:
            return
        game = room['game']
        if game.state != "PLAYING" or room.get('round_resolving'):
            room['watch_key'] = None
            room['watch_ts'] = 0.0
            continue
        if not is_round_ready(room):
            room['watch_key'] = None
            room['watch_ts'] = 0.0
            continue

        loop = asyncio.get_running_loop()
        now = loop.time()
        key = game_progress_key(game)
        if room.get('watch_key') != key:
            room['watch_key'] = key
            room['watch_ts'] = now
            continue
        last = room.get('watch_ts', now)
        if (now - last) < TURN_STALL_SECONDS:
            continue
        room['watch_ts'] = now

        if room.get('ai_busy'):
            room['ai_busy'] = False

        if game.waiting_actions:
            pending_player = next(iter(game.waiting_actions.keys()))
            pending = game.waiting_actions.get(pending_player, {})
            from_player = pending.get('from_player')
            game.waiting_actions = {}
            await emit_room(room, 'msg', {'text': '检测到60秒无响应，系统已自动过牌'})
            if from_player is not None:
                await advance_turn_and_draw_from(room, from_player)
            else:
                await broadcast_game_state(room)
            continue

        if game.turn in room['ai_players']:
            await emit_room(room, 'msg', {'text': '检测到AI回合停滞，系统正在自动恢复'})
            await check_ai_turn(room)


def evaluate_keep_score(tiles):
    counts = Counter(tiles)
    score = 0
    score += len(get_ting_tiles(tiles)) * 45
    for tile, c in counts.items():
        if tile == RED_DRAGON:
            score += c * 6
        if c >= 2:
            score += 6 + (c - 2) * 4
        if c >= 3:
            score += 5
    for suit in [1, 2, 3]:
        base = suit * 10
        for r in range(1, 10):
            t = base + r
            if counts[t] == 0:
                continue
            if r <= 8 and counts[t + 1] > 0:
                score += 3
            if r <= 7 and counts[t + 2] > 0:
                score += 2
            if r >= 2 and counts[t - 1] > 0:
                score += 1
    return score


def get_ai_profile(level):
    lv = normalize_ai_level(level)
    return {
        'think_delay': max(0.55, 1.3 - lv * 0.1),
        'near_best_slack': max(1, 10 - lv),
        'near_best_pick_prob': max(0.08, 0.85 - lv * 0.09),
        'random_discard_prob': max(0.02, 0.40 - lv * 0.05),
        'add_kong_prob': min(0.9, 0.18 + lv * 0.09),
        'concealed_kong_prob': min(0.86, 0.12 + lv * 0.09),
        'claim_kong_prob': min(0.92, 0.15 + lv * 0.1)
    }


def choose_ai_discard(game, player_idx, ai_level):
    hand = list(game.players[player_idx])
    if not hand:
        return None
    profile = get_ai_profile(ai_level)
    lv = normalize_ai_level(ai_level)
    avoid_red_discard = lv >= 2 and any(t != RED_DRAGON for t in hand)
    candidate_tiles = [t for t in hand if (t != RED_DRAGON or not avoid_red_discard)]
    if not candidate_tiles:
        candidate_tiles = hand
    scored = []
    for t in sorted(set(candidate_tiles), key=game.tile_sort_key):
        temp = hand.copy()
        temp.remove(t)
        score = evaluate_keep_score(temp)
        if t == RED_DRAGON and hand.count(RED_DRAGON) <= 1:
            score -= 10
        scored.append((score, t))

    scored.sort(key=lambda x: x[0], reverse=True)
    if not scored:
        return None
    if random.random() < profile['random_discard_prob']:
        return random.choice(candidate_tiles)
    best_score = scored[0][0]
    near_best = [t for s, t in scored if s >= best_score - profile['near_best_slack']]
    if near_best and random.random() < profile['near_best_pick_prob']:
        return random.choice(near_best)
    return scored[0][1]


async def advance_turn_and_draw_from(room, discard_player):
    game = room['game']
    game.turn = (discard_player + 1) % 4
    game.draw_tile(game.turn)
    if await finalize_round_if_finished(room):
        return
    await broadcast_game_state(room)
    await check_ai_turn(room)


async def finalize_round_if_finished(room):
    if room.get('round_resolving'):
        return True
    game = room['game']
    if game.state != "FINISHED":
        return False
    cancel_claim_timeout(room)
    room['round_resolving'] = True
    await emit_room(room, 'msg', {'text': '流局，本局结束'})
    for i in range(4):
        room['total_scores'][i] += game.scores[i]
    room['next_banker'] = game.banker
    room['match_over'] = room['current_round'] >= room['round_target']
    await broadcast_game_state(room, game_over=True, reveal_hu=None, reveal_draws=None)
    await send_room_meta(room)
    return True


async def handle_discard_claims(room, discard_player, tile):
    game = room['game']
    claimer = get_claim_player(room, discard_player, tile)
    if claimer is None:
        return False
    actions = get_claim_actions(room, claimer, tile)
    if not actions:
        return False

    if claimer in room['ai_players']:
        profile = get_ai_profile(room.get('ai_level', 6))
        hand = game.players[claimer]
        can_ai_kong = ('kong' in actions and len(hand) >= 4)
        can_ai_pong = ('pong' in actions and len(hand) >= 3)
        if not can_ai_kong and not can_ai_pong:
            return False
        chosen = 'pong'
        if can_ai_kong and can_ai_pong:
            chosen = 'kong' if random.random() < profile['claim_kong_prob'] else 'pong'
        elif can_ai_kong:
            chosen = 'kong'
        await emit_room(room, 'action_event', {'player': claimer, 'type': chosen})
        game.execute_action(claimer, chosen, tile)
        game.waiting_actions = {}
        if await finalize_round_if_finished(room):
            return True
        await broadcast_game_state(room)
        return True

    sid = get_sid_by_index(room, claimer)
    if not sid:
        await advance_turn_and_draw_from(room, discard_player)
        return True

    game.waiting_actions = {
        claimer: {
            'actions': actions,
            'tile': tile,
            'from_player': discard_player
        }
    }
    schedule_claim_timeout(room, claimer, discard_player, tile)
    await broadcast_game_state(room)
    await sio.emit('action_request', {
        'actions': actions,
        'tile': tile,
        'state_seq': room.get('state_seq', 0),
        'round_token': room.get('round_token', 0)
    }, room=sid)
    return True


async def finish_round_with_reveal(room, winner, action_type, base, reveal_draws):
    if room.get('round_resolving'):
        return
    room['round_resolving'] = True
    game = room['game']
    game.state = "FINISHING"
    reveal_hu = {
        'winner': winner,
        'hand': game.sort_hand(game.players[winner])
    }
    await emit_room(room, 'action_event', {'player': winner, 'type': action_type})
    await emit_room(room, 'msg', {'text': f'胡牌展示中（10秒），底分 {base}'})
    await broadcast_game_state(room, game_over=False, reveal_hu=reveal_hu, reveal_draws=None)
    await asyncio.sleep(10)
    if reveal_draws:
        await emit_room(room, 'msg', {'text': '加分摸牌展示中（5秒）'})
        await broadcast_game_state(room, game_over=False, reveal_hu=None, reveal_draws=reveal_draws)
        await asyncio.sleep(5)
    else:
        await emit_room(room, 'msg', {'text': '本次无加分摸牌，5秒后结算'})
        await broadcast_game_state(room, game_over=False, reveal_hu=None, reveal_draws=[])
        await asyncio.sleep(5)

    for i in range(4):
        room['total_scores'][i] += game.scores[i]
    room['next_banker'] = winner
    game.state = "FINISHED"
    room['match_over'] = room['current_round'] >= room['round_target']
    await broadcast_game_state(room, game_over=True, reveal_hu=None, reveal_draws=None)
    await send_room_meta(room)


async def check_ai_turn(room):
    round_token = room.get('round_token', 0)
    game = room['game']
    if not is_round_ready(room):
        return
    if room.get('round_resolving'):
        return
    if game.state != "PLAYING":
        await finalize_round_if_finished(room)
        return
    current_player = game.turn
    if current_player not in room['ai_players']:
        return
    if room.get('ai_busy'):
        return
    room['ai_busy'] = True
    try:
        profile = get_ai_profile(room.get('ai_level', 6))
        await asyncio.sleep(profile['think_delay'])
        if room.get('round_token', 0) != round_token:
            return
        if room.get('round_resolving') or game.state != "PLAYING" or game.turn != current_player:
            return
        self_actions = game.get_self_actions(current_player)
        if self_actions.get('hu'):
            base, draws = game.settle_self_hu(current_player)
            await finish_round_with_reveal(room, current_player, 'zi_mo', base, draws)
            return

        add_kong = list(self_actions.get('add_kong') or [])
        concealed_kong = list(self_actions.get('concealed_kong') or [])

        safe_add_kong = []
        for t in add_kong:
            if game.find_rob_kong_winner(current_player, t) is None:
                safe_add_kong.append(t)
        if safe_add_kong:
            if random.random() < profile['add_kong_prob']:
                tile = sorted(safe_add_kong, key=game.tile_sort_key)[0]
                await emit_room(room, 'action_event', {'player': current_player, 'type': 'kong'})
                game.execute_action(current_player, 'add_kong', tile)
                if room.get('round_token', 0) != round_token:
                    return
                if await finalize_round_if_finished(room):
                    return
                await broadcast_game_state(room)
                room['ai_busy'] = False
                await check_ai_turn(room)
                return

        if concealed_kong:
            if random.random() < profile['concealed_kong_prob']:
                tile = sorted(concealed_kong, key=game.tile_sort_key)[0]
                await emit_room(room, 'action_event', {'player': current_player, 'type': 'kong'})
                game.execute_action(current_player, 'concealed_kong', tile)
                if room.get('round_token', 0) != round_token:
                    return
                if await finalize_round_if_finished(room):
                    return
                await broadcast_game_state(room)
                room['ai_busy'] = False
                await check_ai_turn(room)
                return

        tile_to_discard = choose_ai_discard(game, current_player, room.get('ai_level', 6))
        if tile_to_discard is None:
            await advance_turn_and_draw_from(room, current_player)
            return
        used_tile = tile_to_discard
        if not game.discard_tile(current_player, tile_to_discard):
            hand = game.players[current_player]
            if not hand:
                return
            fallback = sorted(hand, key=game.tile_sort_key)[0]
            if not game.discard_tile(current_player, fallback):
                return
            used_tile = fallback

        await broadcast_game_state(room)
        if room.get('round_token', 0) != round_token:
            return
        claimed = await handle_discard_claims(room, current_player, used_tile)
        if not claimed:
            if room.get('round_token', 0) != round_token:
                return
            await advance_turn_and_draw_from(room, current_player)
        elif game.state == "PLAYING" and game.turn in room['ai_players'] and not game.waiting_actions:
            room['ai_busy'] = False
            await check_ai_turn(room)
            return
    except Exception:
        if game.state == "PLAYING" and not room.get('round_resolving'):
            await advance_turn_and_draw_from(room, current_player)
    finally:
        room['ai_busy'] = False


async def index(request):
    return web.FileResponse('./static/index.html')


app.router.add_get('/', index)
app.router.add_static('/static/', path='./static', name='static')


@sio.event
async def connect(sid, environ):
    await sio.emit('connected', {'ok': True}, room=sid)


async def remove_sid_from_room(sid, keep_offline):
    code = sid_room.get(sid)
    if not code:
        return None
    room = rooms.get(code)
    if not room:
        sid_room.pop(sid, None)
        return None
    was_owner = room['owner_sid'] == sid
    seat = room['players'].pop(sid, None)
    sid_room.pop(sid, None)
    if seat is not None:
        room['auto_hu'][seat] = False
        if keep_offline:
            room['offline_seats'][seat] = asyncio.get_running_loop().time() + RECONNECT_GRACE_SECONDS
        else:
            room['offline_seats'].pop(seat, None)
            room['seat_tokens'].pop(seat, None)
        pending = room.get('pending_ready_seats')
        if pending and seat in pending:
            pending.discard(seat)
    prune_offline_seats(room)
    if not room['players']:
        task = room.get('watch_task')
        if task and not task.done():
            task.cancel()
        task = room.get('driver_task')
        if task and not task.done():
            task.cancel()
        room['watch_task'] = None
        room['driver_task'] = None
        cancel_claim_timeout(room)
        if not room.get('offline_seats'):
            rooms.pop(code, None)
            return {'code': code, 'seat': seat, 'removed': True}
    if was_owner and room['players']:
        new_owner_sid = next(iter(room['players'].keys()))
        room['owner_sid'] = new_owner_sid
        room['owner_seat'] = room['players'][new_owner_sid]
    elif was_owner and seat is not None:
        room['owner_sid'] = None
        room['owner_seat'] = seat
    await send_room_meta(room)
    return {'code': code, 'seat': seat, 'removed': False}


@sio.event
async def disconnect(sid):
    await remove_sid_from_room(sid, keep_offline=True)


@sio.event
async def leave_room(sid):
    ret = await remove_sid_from_room(sid, keep_offline=False)
    if not ret:
        await sio.emit('left_room', {'ok': False}, room=sid)
        return
    await sio.emit('left_room', {'ok': True}, room=sid)


@sio.event
async def create_room(sid, data):
    existing_room = cleanup_stale_sid_binding(sid)
    if existing_room:
        await sio.emit('room_error', {'message': '你已在房间中', 'recoverable': True}, room=sid)
        return
    rounds = int((data or {}).get('rounds', 1))
    if rounds not in ALLOWED_ROUNDS:
        rounds = 1
    ai_level = normalize_ai_level((data or {}).get('rank_level'))
    player_token = normalize_player_token((data or {}).get('player_token'))
    code = new_room_code()
    room = {
        'code': code,
        'owner_sid': sid,
        'owner_seat': 0,
        'next_banker': 0,
        'round_target': rounds,
        'current_round': 0,
        'match_over': False,
        'players': {},
        'offline_seats': {},
        'seat_tokens': {},
        'ai_players': set(),
        'round_resolving': False,
        'ai_busy': False,
        'round_token': 0,
        'state_seq': 0,
        'watch_task': None,
        'driver_task': None,
        'round_ready_at': 0.0,
        'pending_ready_seats': set(),
        'watch_key': None,
        'watch_ts': 0.0,
        'claim_timeout_task': None,
        'seat_profiles': {
            0: {'name': '玩家1', 'avatar': 1, 'rank_state': {'major': 1, 'minor': 0, 'stars': 0}},
            1: {'name': '玩家2', 'avatar': 2, 'rank_state': {'major': 1, 'minor': 0, 'stars': 0}},
            2: {'name': '玩家3', 'avatar': 3, 'rank_state': {'major': 1, 'minor': 0, 'stars': 0}},
            3: {'name': '玩家4', 'avatar': 4, 'rank_state': {'major': 1, 'minor': 0, 'stars': 0}}
        },
        'auto_hu': {0: False, 1: False, 2: False, 3: False},
        'total_scores': {0: 0, 1: 0, 2: 0, 3: 0},
        'ai_level': ai_level,
        'game': MahjongGame()
    }
    rooms[code] = room
    seat = assign_seat(room, sid)
    name = str((data or {}).get('name', '')).strip() or f'玩家{seat + 1}'
    avatar = normalize_avatar_id((data or {}).get('avatar'))
    rank_state = normalize_rank_state((data or {}).get('rank_state'))
    room['seat_tokens'][seat] = player_token
    room['offline_seats'].pop(seat, None)
    room['seat_profiles'][seat] = {'name': name[:16], 'avatar': avatar, 'rank_state': rank_state}
    sid_room[sid] = code
    await sio.emit('room_joined', {'room_code': code, 'seat': seat}, room=sid)
    await send_room_meta(room)


@sio.event
async def join_room(sid, data):
    existing_room = cleanup_stale_sid_binding(sid)
    if existing_room:
        await sio.emit('room_error', {'message': '你已在房间中', 'recoverable': True}, room=sid)
        return
    code = str((data or {}).get('room_code', '')).strip()
    room = rooms.get(code)
    if not room:
        await sio.emit('room_error', {'message': '房间号不存在'}, room=sid)
        return
    prune_offline_seats(room)
    player_token = normalize_player_token((data or {}).get('player_token'))
    seat_by_token = get_seat_by_token(room, player_token)
    if seat_by_token is not None:
        seat_owner_sid = get_sid_by_token(room, player_token)
        if seat_owner_sid and seat_owner_sid != sid:
            await sio.emit('room_error', {'message': '该身份已在线'}, room=sid)
            return
        if seat_by_token in room['players'].values():
            await sio.emit('room_error', {'message': '该身份已在线'}, room=sid)
            return
        room['players'][sid] = seat_by_token
        room['offline_seats'].pop(seat_by_token, None)
        name = str((data or {}).get('name', '')).strip()
        if name:
            room['seat_profiles'][seat_by_token]['name'] = name[:16]
        avatar = (data or {}).get('avatar')
        if avatar is not None:
            room['seat_profiles'][seat_by_token]['avatar'] = normalize_avatar_id(avatar)
        rank_state = (data or {}).get('rank_state')
        if rank_state is not None:
            room['seat_profiles'][seat_by_token]['rank_state'] = normalize_rank_state(rank_state)
        sid_room[sid] = code
        if room.get('owner_sid') is None and room.get('owner_seat') == seat_by_token:
            room['owner_sid'] = sid
        await sio.emit('room_joined', {'room_code': code, 'seat': seat_by_token}, room=sid)
        await send_room_meta(room)
        if room['game'].state in ["PLAYING", "FINISHING", "FINISHED"]:
            await broadcast_game_state(room)
        if room['game'].state == "PLAYING":
            ensure_turn_watchdog(room)
            ensure_ai_driver(room)
            await check_ai_turn(room)
        return
    if room_players_count(room) >= 4:
        await sio.emit('room_error', {'message': '房间已满'}, room=sid)
        return
    seat = assign_seat(room, sid)
    name = str((data or {}).get('name', '')).strip() or f'玩家{seat + 1}'
    avatar = normalize_avatar_id((data or {}).get('avatar'))
    rank_state = normalize_rank_state((data or {}).get('rank_state'))
    room['seat_tokens'][seat] = player_token
    room['offline_seats'].pop(seat, None)
    room['seat_profiles'][seat] = {'name': name[:16], 'avatar': avatar, 'rank_state': rank_state}
    sid_room[sid] = code
    if room.get('owner_sid') is None and room.get('owner_seat') == seat:
        room['owner_sid'] = sid
    await sio.emit('room_joined', {'room_code': code, 'seat': seat}, room=sid)
    await send_room_meta(room)


@sio.event
async def rejoin_room(sid, data):
    existing_room = cleanup_stale_sid_binding(sid)
    if existing_room:
        return
    code = str((data or {}).get('room_code', '')).strip()
    room = rooms.get(code)
    if not room:
        await sio.emit('room_error', {'message': '房间不存在或已失效'}, room=sid)
        return
    prune_offline_seats(room)
    token = str((data or {}).get('player_token', '')).strip()
    if not token:
        await sio.emit('room_error', {'message': '缺少重连身份'}, room=sid)
        return
    seat = get_seat_by_token(room, token)
    if seat is None:
        await sio.emit('room_error', {'message': '未找到可恢复座位'}, room=sid)
        return
    current_sid = get_sid_by_index(room, seat)
    if current_sid and current_sid != sid:
        await sio.emit('room_error', {'message': '该座位已在线'}, room=sid)
        return
    room['players'][sid] = seat
    room['offline_seats'].pop(seat, None)
    name = str((data or {}).get('name', '')).strip()
    if name:
        room['seat_profiles'][seat]['name'] = name[:16]
    avatar = (data or {}).get('avatar')
    if avatar is not None:
        room['seat_profiles'][seat]['avatar'] = normalize_avatar_id(avatar)
    rank_state = (data or {}).get('rank_state')
    if rank_state is not None:
        room['seat_profiles'][seat]['rank_state'] = normalize_rank_state(rank_state)
    sid_room[sid] = code
    if room.get('owner_sid') is None and room.get('owner_seat') == seat:
        room['owner_sid'] = sid
    await sio.emit('room_joined', {'room_code': code, 'seat': seat}, room=sid)
    await send_room_meta(room)
    if room['game'].state in ["PLAYING", "FINISHING", "FINISHED"]:
        await broadcast_game_state(room, game_over=(room['game'].state == "FINISHED"))
    if room['game'].state == "PLAYING":
        ensure_turn_watchdog(room)
        ensure_ai_driver(room)
        await check_ai_turn(room)


@sio.event
async def resume_room(sid, data):
    room = cleanup_stale_sid_binding(sid)
    token = str((data or {}).get('player_token', '')).strip()
    if not room and token:
        for r in rooms.values():
            prune_offline_seats(r)
            seat = get_seat_by_token(r, token)
            if seat is None:
                continue
            if seat in r['players'].values():
                continue
            r['players'][sid] = seat
            r['offline_seats'].pop(seat, None)
            sid_room[sid] = r['code']
            if r.get('owner_sid') is None and r.get('owner_seat') == seat:
                r['owner_sid'] = sid
            room = r
            break
    if not room:
        await sio.emit('room_error', {'message': '未找到可恢复的房间'}, room=sid)
        return
    seat = room['players'].get(sid)
    if seat is None:
        await sio.emit('room_error', {'message': '房间恢复失败'}, room=sid)
        return
    await sio.emit('room_joined', {'room_code': room['code'], 'seat': seat}, room=sid)
    await send_room_meta(room)
    if room['game'].state in ["PLAYING", "FINISHING", "FINISHED"]:
        await broadcast_game_state(room, game_over=(room['game'].state == "FINISHED"))
    if room['game'].state == "PLAYING":
        ensure_turn_watchdog(room)
        ensure_ai_driver(room)
        await check_ai_turn(room)


@sio.event
async def start_game(sid):
    code = sid_room.get(sid)
    if not code:
        return
    room = rooms.get(code)
    if not room:
        return
    if sid != room['owner_sid']:
        await sio.emit('start_denied', {'reason': '仅房主可开始'}, room=sid)
        return
    if room['current_round'] >= room['round_target']:
        await sio.emit('start_denied', {'reason': '本次对局局数已完成'}, room=sid)
        return
    if room['game'].state == "PLAYING":
        await sio.emit('start_denied', {'reason': '本局进行中'}, room=sid)
        return

    room['current_round'] += 1
    room['match_over'] = False
    room['ai_players'] = set()
    room['round_resolving'] = False
    room['ai_busy'] = False
    room['round_token'] = room.get('round_token', 0) + 1
    task = room.get('watch_task')
    if task and not task.done():
        task.cancel()
    task = room.get('driver_task')
    if task and not task.done():
        task.cancel()
    room['watch_task'] = None
    room['driver_task'] = None
    room['round_ready_at'] = 0.0
    room['pending_ready_seats'] = set()
    room['watch_key'] = None
    room['watch_ts'] = 0.0
    cancel_claim_timeout(room)
    room['game'] = MahjongGame()
    if room['current_round'] == 1:
        room['next_banker'] = room['owner_seat']
    room['game'].banker = room['next_banker']
    for i in range(4):
        room['game'].auto_hu[i] = room['auto_hu'][i]
    used_seats = set(room['players'].values())
    for i in range(4):
        if i not in used_seats:
            room['ai_players'].add(i)
    room['game'].start_game()
    room['pending_ready_seats'] = set(room['players'].values())
    room['round_ready_at'] = asyncio.get_running_loop().time() + DEAL_READY_FALLBACK_SECONDS
    ensure_turn_watchdog(room)
    ensure_ai_driver(room)
    await send_room_meta(room)
    await broadcast_game_state(room)
    await check_ai_turn(room)


@sio.event
async def deal_ready(sid, data):
    code = sid_room.get(sid)
    if not code:
        return
    room = rooms.get(code)
    if not room:
        return
    player_idx = room['players'].get(sid)
    if player_idx is None:
        return
    if room['game'].state != "PLAYING":
        return
    token = int((data or {}).get('round_token', 0))
    if token != room.get('round_token', 0):
        return
    pending = room.get('pending_ready_seats')
    if not pending:
        return
    if player_idx in pending:
        pending.discard(player_idx)


@sio.event
async def set_auto_hu(sid, data):
    code = sid_room.get(sid)
    if not code:
        return
    room = rooms.get(code)
    if not room:
        return
    p_idx = room['players'].get(sid)
    if p_idx is None:
        return
    enabled = bool((data or {}).get('enabled', False))
    room['auto_hu'][p_idx] = enabled
    room['game'].auto_hu[p_idx] = enabled


@sio.event
async def quick_chat(sid, data):
    code = sid_room.get(sid)
    if not code:
        return
    room = rooms.get(code)
    if not room:
        return
    seat = room['players'].get(sid)
    if seat is None:
        return
    text = str((data or {}).get('text', '')).strip()
    if text not in QUICK_MESSAGES:
        return
    name = room['seat_profiles'].get(seat, {}).get('name', f'玩家{seat + 1}')
    await emit_room(room, 'quick_msg', {'seat': seat, 'name': name, 'text': text})


@sio.event
async def action(sid, data):
    code = sid_room.get(sid)
    if not code:
        return
    room = rooms.get(code)
    if not room:
        return
    if room.get('round_resolving'):
        return
    game = room['game']
    player_idx = room['players'].get(sid)
    if player_idx is None:
        return
    action_type = (data or {}).get('type')

    if action_type == 'discard':
        if game.state != "PLAYING" or game.turn != player_idx:
            return
        if game.waiting_actions:
            return
        tile = (data or {}).get('tile')
        if game.discard_tile(player_idx, tile):
            await broadcast_game_state(room)
            claimed = await handle_discard_claims(room, player_idx, tile)
            if not claimed:
                await advance_turn_and_draw_from(room, player_idx)
            elif game.state == "PLAYING" and game.turn in room['ai_players'] and not game.waiting_actions:
                await check_ai_turn(room)
        return

    if action_type == 'pong':
        pending = game.waiting_actions.get(player_idx)
        if not pending or 'pong' not in pending.get('actions', []):
            return
        cancel_claim_timeout(room)
        tile = pending.get('tile')
        await emit_room(room, 'action_event', {'player': player_idx, 'type': 'pong'})
        game.execute_action(player_idx, 'pong', tile)
        game.waiting_actions = {}
        await broadcast_game_state(room)
        await check_ai_turn(room)
        return

    if action_type == 'kong':
        pending = game.waiting_actions.get(player_idx)
        if not pending or 'kong' not in pending.get('actions', []):
            return
        cancel_claim_timeout(room)
        tile = pending.get('tile')
        await emit_room(room, 'action_event', {'player': player_idx, 'type': 'kong'})
        game.execute_action(player_idx, 'kong', tile)
        game.waiting_actions = {}
        await broadcast_game_state(room)
        await check_ai_turn(room)
        return

    if action_type == 'pass':
        pending = game.waiting_actions.get(player_idx)
        if not pending:
            return
        cancel_claim_timeout(room)
        from_player = pending.get('from_player')
        game.waiting_actions = {}
        if from_player is not None:
            await advance_turn_and_draw_from(room, from_player)
        return

    if action_type == 'self_kong':
        if game.turn != player_idx or game.state != "PLAYING":
            return
        tile = (data or {}).get('tile')
        if tile == RED_DRAGON:
            await sio.emit('error', {'message': '红中四张按规则直接胡牌，不能杠'}, room=sid)
            return
        self_actions = game.get_self_actions(player_idx)
        if tile in (self_actions.get('add_kong') or []):
            rob_winner = game.find_rob_kong_winner(player_idx, tile)
            if rob_winner is not None:
                base, draws = game.settle_rob_kong_hu(rob_winner, player_idx)
                await finish_round_with_reveal(room, rob_winner, 'hu', base, draws)
                return
            await emit_room(room, 'action_event', {'player': player_idx, 'type': 'kong'})
            game.execute_action(player_idx, 'add_kong', tile)
            await broadcast_game_state(room)
            await check_ai_turn(room)
            return
        hand = game.players[player_idx]
        if hand.count(tile) == 4:
            await emit_room(room, 'action_event', {'player': player_idx, 'type': 'kong'})
            game.execute_action(player_idx, 'concealed_kong', tile)
            await broadcast_game_state(room)
            await check_ai_turn(room)
        return

    if action_type == 'self_hu':
        if game.turn == player_idx and game.state == "PLAYING":
            hand = game.players[player_idx]
            hu_ok = can_hu(hand)
            if not hu_ok:
                last = game.last_draw.get(player_idx)
                if last is not None:
                    base_hand = list(hand)
                    try:
                        base_hand.remove(last)
                    except ValueError:
                        base_hand = None
                    if base_hand is not None and len(base_hand) % 3 == 1:
                        ting = get_ting_tiles(base_hand)
                        hu_ok = (last in ting) or (last == RED_DRAGON and len(ting) > 0)
            if not hu_ok:
                await sio.emit('error', {'message': '胡牌不合法'}, room=sid)
                return
            base, draws = game.settle_self_hu(player_idx)
            await finish_round_with_reveal(room, player_idx, 'zi_mo', base, draws)
        return


async def broadcast_game_state(room, game_over=False, reveal_hu=None, reveal_draws=None):
    game = room['game']
    room['state_seq'] = room.get('state_seq', 0) + 1
    seq = room['state_seq']
    hand_counts = {i: len(game.players[i]) for i in range(4)}
    ai_seats = list(room['ai_players'])
    for sid, p_idx in room['players'].items():
        ting_info = []
        hand = game.players[p_idx]
        if len(hand) % 3 == 1:
            ting_info = get_ting_tiles(hand)

        hand_view = game.sort_hand(game.players[p_idx])
        drawn_tile = None
        if game.turn == p_idx:
            drawn_tile = game.last_draw.get(p_idx)
            if drawn_tile is not None:
                try:
                    hand_view.remove(drawn_tile)
                    hand_view.append(drawn_tile)
                except ValueError:
                    pass

        self_actions = None
        if game.turn == p_idx and game.state == "PLAYING":
            self_actions = game.get_self_actions(p_idx)

        state = {
            'hand': hand_view,
            'deal_sequence_hand': list(game.deal_sequence.get(p_idx, [])),
            'discards': game.discards,
            'melds': game.melds,
            'turn': game.turn,
            'banker': game.banker,
            'wall_count': len(game.deck),
            'scores': game.scores,
            'total_scores': room['total_scores'],
            'ting_tiles': ting_info,
            'game_over': game_over,
            'match_over': room['match_over'],
            'round_target': room['round_target'],
            'current_round': room['current_round'],
            'hand_counts': hand_counts,
            'ai_seats': ai_seats,
            'drawn_tile': drawn_tile,
            'self_actions': self_actions,
            'reveal_hu': reveal_hu,
            'reveal_draws': reveal_draws,
            'room_code': room['code'],
            'owner_seat': room['owner_seat']
        }
        state['seat_profiles'] = room['seat_profiles']
        state['state_seq'] = seq
        state['round_token'] = room.get('round_token', 0)
        state['last_discard_player'] = game.last_discard_player
        await sio.emit('game_state', state, room=sid)


if __name__ == '__main__':
    port = int(os.getenv('PORT', '8000'))
    web.run_app(app, host='0.0.0.0', port=port)
