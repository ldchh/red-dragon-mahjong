from aiohttp import web
import socketio
import asyncio
import random
import os
import secrets
import traceback
import json
import re
import unicodedata
import time
from pathlib import Path
from datetime import datetime, timedelta, timezone
from collections import Counter
from game.core import MahjongGame
from game.rules import get_ting_tiles, can_hu, RED_DRAGON
from game.rewards import configured_rewards, RewardError, owner_digest

NICKNAME_ERROR = '昵称需为 1–8 个汉字或字符'


def valid_nickname(value):
    """Count Unicode code points, matching the browser and offline Worker."""
    if not isinstance(value, str):
        return None
    name = value.strip()
    if not 1 <= len(name) <= 8 or any(unicodedata.category(c) in ('Cc', 'Cs') for c in name):
        return None
    return name

STATIC_IMAGE_MIME = {
    '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
}


async def static_image_mime(request, response):
    # FileResponse otherwise relies on OS MIME tables; some Windows Python
    # installations report WebP/WAV as application/octet-stream or audio/x-wav.
    # Prepare signals see the final FileResponse status, including missing files
    # and range requests. Middleware runs too early and can mislabel a later 404.
    if request.path.startswith('/static/') and response.status in (200, 206):
        image_type = STATIC_IMAGE_MIME.get(Path(request.path).suffix.lower())
        if image_type:
            response.content_type = image_type


sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
app.on_response_prepare.append(static_image_mime)
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
BASE_DIR = Path(__file__).resolve().parent
RANK_PROFILE_PATH = os.getenv('RANK_PROFILE_PATH', str(BASE_DIR / 'rank_profiles.json'))
DAILY_TASKS = {
    'finish_rank_match': (1, 1),
    'first_in_rank_match': (1, 2),
    'clean_hu_three': (3, 2),
    'friend_rank_match': (1, 2),
}


def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError, OverflowError):
        return default


def load_rank_profiles():
    base = {'by_token': {}, 'by_name': {}, 'daily_tasks': {}, 'shared_ranks': {}, 'completed_matches': {}, 'completed_match_events': {}}
    try:
        with open(RANK_PROFILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return base
        by_token = data.get('by_token', {})
        by_name = data.get('by_name', {})
        if not isinstance(by_token, dict):
            by_token = {}
        if not isinstance(by_name, dict):
            by_name = {}
        daily_tasks = data.get('daily_tasks', {})
        shared = data.get('shared_ranks', {})
        return {'by_token': by_token, 'by_name': by_name, 'daily_tasks': daily_tasks if isinstance(daily_tasks, dict) else {},
                'completed_matches': data.get('completed_matches', {}) if isinstance(data.get('completed_matches'), dict) else {},
                'completed_match_events': data.get('completed_match_events', {}) if isinstance(data.get('completed_match_events'), dict) else {},
                'shared_ranks': shared if isinstance(shared, dict) else {}}
    except Exception:
        return base


def save_rank_profiles():
    Path(RANK_PROFILE_PATH).parent.mkdir(parents=True, exist_ok=True)
    tmp_path = f"{RANK_PROFILE_PATH}.tmp"
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(rank_profiles, f, ensure_ascii=False, separators=(',', ':'))
    os.replace(tmp_path, RANK_PROFILE_PATH)


def normalize_name_key(name):
    return str(name or '').strip().lower()


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
    if major < 8:
        stars = min(stars, 3)
    return {'major': major, 'minor': minor, 'stars': stars}


def normalize_player_token(v):
    token = str(v or '').strip()
    if 8 <= len(token) <= 128:
        return token
    return secrets.token_urlsafe(18)


rank_profiles = load_rank_profiles()


def get_persisted_rank_state(player_token, name):
    by_token = rank_profiles.get('by_token', {})
    by_name = rank_profiles.get('by_name', {})
    token_rank = by_token.get(player_token)
    if isinstance(token_rank, dict):
        return normalize_rank_state(token_rank)
    name_key = normalize_name_key(name)
    if name_key:
        name_rank = by_name.get(name_key)
        if isinstance(name_rank, dict):
            return normalize_rank_state(name_rank)
    return None


def persist_rank_state(player_token, name, rank_state):
    rs = normalize_rank_state(rank_state)
    rank_profiles.setdefault('by_token', {})[player_token] = rs
    name_key = normalize_name_key(name)
    if name_key:
        rank_profiles.setdefault('by_name', {})[name_key] = rs
    save_rank_profiles()


def resolve_rank_state(player_token, name, incoming_rank_state):
    shared = rank_profiles.get('shared_ranks', {}).get(player_token)
    if shared:
        return normalize_rank_state(shared['rank_state'])
    by_token = rank_profiles.get('by_token', {})
    token_rank = by_token.get(player_token)
    if isinstance(token_rank, dict):
        rs = normalize_rank_state(token_rank)
        persist_rank_state(player_token, name, rs)
        return rs
    base = {'major': 1, 'minor': 0, 'stars': 0}
    persist_rank_state(player_token, name, base)
    return base


def get_daily_tasks(token):
    record = rank_profiles.get('shared_ranks', {}).get(token)
    if record and 'clock_skew_ms' in record:
        today = (datetime.now(timezone.utc) + timedelta(milliseconds=record['clock_skew_ms'],
                 minutes=record['utc_offset_minutes'])).strftime('%Y-%m-%d')
    else:
        today = datetime.now(timezone(timedelta(hours=8))).strftime('%Y-%m-%d')
    snapshots = rank_profiles.setdefault('daily_tasks', {})
    snapshot = snapshots.get(token)
    if not isinstance(snapshot, dict) or snapshot.get('date') != today:
        snapshot = {'date': today, 'tasks': [
            {'id': task, 'progress': 0, 'done': False, 'claimed': False} for task in DAILY_TASKS
        ]}
        snapshots[token] = snapshot
    for task in DAILY_TASKS:
        if not any(t.get('id') == task for t in snapshot['tasks']):
            snapshot['tasks'].append({'id': task, 'progress': 0, 'done': False, 'claimed': False})
    return snapshot


def record_daily_task(token, task_id):
    if not token:
        return
    target, _ = DAILY_TASKS[task_id]
    for task in get_daily_tasks(token)['tasks']:
        if task['id'] == task_id:
            task['progress'] = min(target, task['progress'] + 1)
            task['done'] = task['progress'] >= target
            return


def completed_match_events(token):
    """Today's immutable whole-match proofs, replayed on state/profile/reconnect."""
    date = get_daily_tasks(token)['date']
    events = rank_profiles.get('completed_match_events', {}).get(token, [])
    return [event for event in events if isinstance(event, dict) and event.get('date') == date
            and event.get('completed') is True and event.get('rounds') in (10, 15, 20)]


def record_completed_match(token, receipt):
    events = rank_profiles.setdefault('completed_match_events', {}).setdefault(token, [])
    if any(event.get('id') == receipt['id'] for event in events):
        return
    events.append({**receipt, 'date': get_daily_tasks(token)['date']})
    rank_profiles['completed_match_events'][token] = events[-128:]


def get_my_placement(total_scores, seat):
    arr = [{'seat': i, 'score': int(total_scores.get(i, 0))} for i in range(4)]
    arr.sort(key=lambda x: (-x['score'], x['seat']))
    for idx, item in enumerate(arr):
        if item['seat'] == seat:
            return idx + 1
    return 4


def get_rank_delta(place, my_score):
    if place == 1:
        return 2
    if place == 2:
        return 1 if my_score > 0 else 0
    if place == 3:
        return -1 if my_score < 0 else 0
    return -2


def apply_rank_delta(before_state, delta):
    now = normalize_rank_state(before_state)
    if delta > 0:
        for _ in range(delta):
            if now['major'] == 8:
                now['stars'] += 1
                continue
            if now['stars'] < 3:
                now['stars'] += 1
                continue
            now['stars'] = 0
            if now['minor'] < 2:
                now['minor'] += 1
            elif now['major'] < 8:
                now['major'] += 1
                now['minor'] = 0
    elif delta < 0:
        for _ in range(abs(delta)):
            if now['major'] == 1 and now['minor'] == 0 and now['stars'] == 0:
                continue
            if now['major'] == 8:
                if now['stars'] > 0:
                    now['stars'] -= 1
                else:
                    now['major'] = 7
                    now['minor'] = 2
                    now['stars'] = 3
                continue
            if now['stars'] > 0:
                now['stars'] -= 1
                continue
            if now['minor'] > 0:
                now['minor'] -= 1
                now['stars'] = 3
            elif now['major'] > 1:
                now['major'] -= 1
                now['minor'] = 2
                now['stars'] = 3
    return normalize_rank_state(now)


def rank_month(value):
    return isinstance(value, str) and re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', value) is not None


def reset_shared_month(record, month):
    if record['month'] == month:
        return
    old = {'month': record['month'], 'rank_state': record['rank_state'].copy(),
           'recorded_at': datetime.now(timezone.utc).isoformat()}
    record['history'] = [old] + [h for h in record['history'] if h['month'] != old['month']]
    record['month'] = month
    record['rank_state'] = normalize_rank_state(None)
    record['revision'] += 1
    record['month_revision'] = record['revision']


def ensure_shared_calendar(record):
    if 'clock_skew_ms' in record:
        device_now = datetime.now(timezone.utc) + timedelta(milliseconds=record['clock_skew_ms'], minutes=record['utc_offset_minutes'])
        reset_shared_month(record, device_now.strftime('%Y-%m'))


def shared_rank_payload(token, device):
    record = rank_profiles.get('shared_ranks', {}).get(token)
    if not record or not device:
        return None
    return {'version': 1, 'device': device, 'month': record['month'], 'rank_state': record['rank_state'],
            'revision': record['revision'], 'ack': record['devices'].get(device, 0), 'history': record['history']}


def sync_shared_rank(token, name, packet):
    """Once-only migration, then ordered, idempotent offline delta submission."""
    if packet is None:
        return None
    if not isinstance(packet, dict) or packet.get('version') != 1:
        raise ValueError('段位同步请求格式无效')
    device = packet.get('device')
    month = packet.get('month')
    events = packet.get('events')
    revision = packet.get('revision')
    if not isinstance(device, str) or not 8 <= len(device) <= 128 or not rank_month(month) \
            or not isinstance(events, list) or len(events) > 256 or type(revision) is not int:
        raise ValueError('段位同步请求格式无效')
    clock_ms = packet.get('clock_ms')
    offset = packet.get('utc_offset_minutes', 0)
    if clock_ms is not None and (type(clock_ms) is not int or not 0 <= clock_ms <= 4102444800000 or type(offset) is not int or not -840 <= offset <= 840):
        raise ValueError('段位设备日期格式无效')
    previous = 0
    for e in events:
        if not isinstance(e, dict) or type(e.get('seq')) is not int or not previous < e['seq'] <= 2**53-1 \
                or not rank_month(e.get('month')) or type(e.get('delta')) is not int \
                or not -3 <= e['delta'] <= 3 or e.get('kind') not in ('match', 'daily') \
                or (e['kind'] == 'daily' and e['delta'] not in (1, 2)):
            raise ValueError('段位结算记录格式无效')
        previous = e['seq']
    records = rank_profiles.setdefault('shared_ranks', {})
    record = records.get(token)
    if not record:
        seed = packet.get('seed', {})
        legacy = normalize_rank_state(rank_profiles.get('by_token', {}).get(token)) if isinstance(seed, dict) and seed.get('month') == month else normalize_rank_state(None)
        incoming = normalize_rank_state(seed.get('rank_state')) if isinstance(seed, dict) and seed.get('month') == month else normalize_rank_state(None)
        rank = max((legacy, incoming), key=lambda r: (r['major'], r['minor'], r['stars']))
        record = {'month': month, 'rank_state': rank, 'revision': 0, 'month_revision': 0,
                  'devices': {}, 'history': []}
        if isinstance(seed, dict) and rank_month(seed.get('month')) and seed['month'] != month:
            old_legacy = normalize_rank_state(rank_profiles.get('by_token', {}).get(token))
            old_seed = normalize_rank_state(seed.get('rank_state'))
            old_rank = max((old_legacy, old_seed), key=lambda r: (r['major'], r['minor'], r['stars']))
            record['history'].append({'month': seed['month'], 'rank_state': old_rank,
                                      'recorded_at': datetime.now(timezone.utc).isoformat()})
        records[token] = record
    # An old in-flight reply/request must not roll a newly reset month back.
    if record['month'] != month and revision >= record.get('month_revision', 0):
        reset_shared_month(record, month)
    if clock_ms is not None and month == record['month'] and revision >= record.get('month_revision', 0)-1:
        record['clock_skew_ms'] = clock_ms - int(datetime.now(timezone.utc).timestamp()*1000)
        record['utc_offset_minutes'] = offset
    ack = record['devices'].get(device, 0)
    for e in events:
        if e['seq'] <= ack:
            continue
        if e['seq'] != ack + 1:
            break  # Ask for the still-missing predecessor, never silently skip it.
        if e['month'] == record['month']:
            record['rank_state'] = apply_rank_delta(record['rank_state'], e['delta'])
        else:
            history = next((h for h in record['history'] if h['month'] == e['month']), None)
            if history:
                history['rank_state'] = apply_rank_delta(history['rank_state'], e['delta'])
        ack = e['seq']
        record['revision'] += 1
    record['devices'][device] = ack
    persist_rank_state(token, name, record['rank_state'])
    return shared_rank_payload(token, device)


def apply_shared_delta(token, name, before, delta):
    record = rank_profiles.get('shared_ranks', {}).get(token)
    if record:
        ensure_shared_calendar(record)
        before = normalize_rank_state(record['rank_state'])
    after = apply_rank_delta(before, delta)
    if record:
        record['rank_state'] = after
        record['revision'] += 1
    persist_rank_state(token, name, after)
    return before, after


def settle_match_ranks(room):
    if room.get('round_target') not in [10, 15, 20]:
        return
    if room.get('rank_settled'):
        return
    room['rank_settled'] = True
    completed = room.get('match_over') is True and room.get('current_round', 0) >= room['round_target']
    original_humans = set(room.get('friend_match_tokens', []))
    eligible_humans = original_humans & set(room.get('seat_tokens', {}).values())
    totals = room.get('total_scores', {})
    room['rank_outcomes'] = {}
    for seat, token in room.get('seat_tokens', {}).items():
        if not token:
            continue
        profile = room['seat_profiles'].get(seat, {})
        before = normalize_rank_state(profile.get('rank_state'))
        my_score = int(totals.get(seat, 0))
        place = get_my_placement(totals, seat)
        delta = get_rank_delta(place, my_score) + (1 if my_score >= 30 else 0)
        before, after = apply_shared_delta(token, profile.get('name', ''), before, delta)
        room['rank_outcomes'][seat] = {'before': before, 'after': after, 'delta': delta, 'place': place}
        record_daily_task(token, 'finish_rank_match')
        if completed:
            receipt = {'id': 'online:' + str(room['code']) + ':' + room.get('match_id', str(room.get('round_token', 0))),
                       'rounds': room['round_target'], 'completed': True}
            if token in original_humans:
                rank_profiles.setdefault('completed_matches', {}).setdefault(token, receipt)
                record_completed_match(token, receipt)
            if len(eligible_humans) >= 2 and token in eligible_humans:
                record_daily_task(token, 'friend_rank_match')
        if place == 1:
            record_daily_task(token, 'first_in_rank_match')
        profile['rank_state'] = after
        room['seat_profiles'][seat] = profile
        persist_rank_state(token, profile.get('name', ''), after)


def prune_offline_seats(room):
    offline = room.get('offline_seats', {})
    if not offline:
        return
    now = asyncio.get_running_loop().time()
    expired = [seat for seat, ts in offline.items() if ts <= now]
    for seat in expired:
        offline.pop(seat, None)
        room['seat_tokens'].pop(seat, None)


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
    if cnt >= 3 and tile != RED_DRAGON and room['game'].deck:
        actions.append('kong')
    return actions


async def emit_room(room, event, data):
    if event == 'action_event':
        room['action_seq'] = room.get('action_seq', 0) + 1
        action_seq = room['action_seq']
        token = room.get('round_token', 0)
        data = {**data, 'room_code': room['code'], 'round_token': token,
                'action_seq': action_seq, 'event_id': f"{room['code']}:{token}:{action_seq}"}
    for sid in tuple(room['players']):
        await sio.emit(event, data, room=sid)


async def send_room_meta(room):
    for sid, seat in tuple(room['players'].items()):
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
            'seat_profiles': room['seat_profiles'],
            'human_seats': list(room['players'].values()),
            'game_status': room['game'].state,
            'daily_tasks': get_daily_tasks(room['seat_tokens'].get(seat, '')),
            'completed_match': rank_profiles.get('completed_matches', {}).get(room['seat_tokens'].get(seat, '')),
            'completed_matches': completed_match_events(room['seat_tokens'].get(seat, '')),
            'shared_rank': shared_rank_payload(room['seat_tokens'].get(seat, ''), room['seat_profiles'].get(seat, {}).get('rank_device')),
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
        if room.get('pending_ready_seats'):
            room['pending_ready_seats'].clear()
            await broadcast_game_state(room)
        if game.waiting_actions:
            continue
        if game.turn not in room['ai_players'] and game.auto_hu.get(game.turn) and game.get_self_actions(game.turn)['hu']:
            base, draws = game.settle_self_hu(game.turn)
            await finish_round_with_reveal(room, game.turn, 'zi_mo', base, draws)
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
    if room['match_over']:
        settle_match_ranks(room)
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
        if not game.execute_action(claimer, chosen, tile):
            return False
        game.waiting_actions = {}
        await emit_room(room, 'action_event', {'player': claimer, 'type': chosen})
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
    round_token = room.get('round_token', 0)
    cancel_claim_timeout(room)
    game.state = "FINISHING"
    if RED_DRAGON not in game.players[winner]:
        record_daily_task(room['seat_tokens'].get(winner), 'clean_hu_three')
        save_rank_profiles()
    reveal_hu = {
        'winner': winner,
        'hand': game.sort_hand(game.players[winner])
    }
    room['reveal_hu'] = reveal_hu
    room['reveal_draws'] = reveal_draws
    await emit_room(room, 'action_event', {'player': winner, 'type': action_type})
    await emit_room(room, 'msg', {'text': f'胡牌 · 底分 {base}，5 秒后结算'})
    await broadcast_game_state(room, reveal_hu=reveal_hu, reveal_draws=reveal_draws)
    await asyncio.sleep(5)
    if rooms.get(room['code']) is not room or room['game'] is not game or room.get('round_token', 0) != round_token:
        return
    room['reveal_hu'] = None
    room['reveal_draws'] = None

    for i in range(4):
        room['total_scores'][i] += game.scores[i]
    room['next_banker'] = winner
    game.state = "FINISHED"
    room['match_over'] = room['current_round'] >= room['round_target']
    if room['match_over']:
        settle_match_ranks(room)
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
        if (room.get('round_resolving') or game.state != "PLAYING" or game.turn != current_player
                or current_player not in room['ai_players'] or game.waiting_actions):
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

        await emit_room(room, 'action_event', {'player': current_player, 'type': 'discard'})
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
        traceback.print_exc()
        if game.state == "PLAYING" and not room.get('round_resolving'):
            # 不能在异常后凭空给下一家摸牌；保留状态交由驱动重试。
            await broadcast_game_state(room)
    finally:
        room['ai_busy'] = False


async def index(request):
    return web.FileResponse(BASE_DIR / 'static' / 'index.html')


def build_offline_html():
    """One offline entry for the web route, QA server and Android asset sync."""
    html = (BASE_DIR / 'static' / 'index.html').read_text(encoding='utf-8')
    version = re.search(r'/static/script\.js\?v=([\w.-]+)', html).group(1)
    html = html.replace('</head>', f'<link rel="stylesheet" href="/static/offline/offline.css?v={version}">\n</head>')
    return html.replace('<script src="/static/vendor/socket.io.min.js"></script>',
                        '<script>window.MAHJONG_OFFLINE = true;</script>\n'
                        f'<script src="/static/offline/client.js?v={version}"></script>')


async def offline_index(request):
    return web.Response(text=build_offline_html(), content_type='text/html')


def build_online_html(server_url):
    """Android uses one bundled UI; only multiplayer traffic leaves the APK."""
    html = (BASE_DIR / 'static/index.html').read_text(encoding='utf-8')
    config = json.dumps(server_url).replace('<', '\\u003c')
    return html.replace('<script src="/static/vendor/socket.io.min.js"></script>',
                        f'<script>window.MAHJONG_SERVER_URL = {config};</script>\n'
                        '<script src="/static/vendor/socket.io.min.js"></script>')


reward_service = None
redeem_attempts = {}


async def redeem_code(request):
    global reward_service
    try:
        data = await request.json()
        if not isinstance(data, dict):
            raise RewardError('invalid_code')
        ip = request.remote or 'unknown'
        now = time.monotonic()
        attempt_key = ip + ':' + owner_digest(data.get('device'))
        previous = [t for t in redeem_attempts.get(attempt_key, []) if now-t < 60]
        if len(previous) >= 10:
            raise RewardError('too_many_attempts', 429)
        redeem_attempts[attempt_key] = previous + [now]
        if len(redeem_attempts) > 4096:
            for key in list(redeem_attempts):
                if not redeem_attempts[key] or now-redeem_attempts[key][-1] >= 60:
                    redeem_attempts.pop(key, None)
        if reward_service is None:
            reward_service = configured_rewards(BASE_DIR)
        if reward_service is None:
            raise RewardError('service_unavailable', 503)
        result = await asyncio.to_thread(reward_service.redeem, data.get('code'), data.get('device'))
        return web.json_response(result, headers={'Cache-Control': 'no-store'})
    except RewardError as error:
        return web.json_response({'ok': False, 'reason': error.reason}, status=error.status,
                                 headers={'Cache-Control': 'no-store'})
    except (ValueError, OSError):
        return web.json_response({'ok': False, 'reason': 'service_unavailable'}, status=503,
                                 headers={'Cache-Control': 'no-store'})


app.router.add_get('/', index)
app.router.add_get('/offline.html', offline_index)
app.router.add_post('/api/rewards/redeem', redeem_code)
app.router.add_static('/static/', path=BASE_DIR / 'static', name='static')


@sio.event
async def connect(sid, environ):
    await sio.emit('connected', {'ok': True}, room=sid)


@sio.event
async def get_profile(sid, data):
    if not isinstance(data, dict):
        return
    token = normalize_player_token(data.get('player_token'))
    name = valid_nickname(data.get('name')) or ''
    try:
        shared = sync_shared_rank(token, name, data.get('rank_sync'))
    except ValueError:
        await sio.emit('error', {'message': '段位同步未完成，请重试。'}, room=sid)
        return
    rank = resolve_rank_state(token, name, None)
    if shared:
        room = cleanup_stale_sid_binding(sid)
        if room and room['seat_tokens'].get(room['players'][sid]) == token:
            seat = room['players'][sid]
            room['seat_profiles'][seat]['rank_state'] = rank
            room['seat_profiles'][seat]['rank_device'] = shared['device']
    await sio.emit('profile', {'rank_state': rank, 'daily_tasks': get_daily_tasks(token), 'shared_rank': shared,
                             'completed_match': rank_profiles.get('completed_matches', {}).get(token),
                             'completed_matches': completed_match_events(token)}, room=sid)


@sio.event
async def claim_daily_reward(sid, data):
    if not isinstance(data, dict):
        return
    token = str(data.get('player_token', ''))
    task_id = data.get('task_id')
    if token not in rank_profiles['by_token'] or not isinstance(task_id, str) or task_id not in DAILY_TASKS:
        return
    snapshot = get_daily_tasks(token)
    task = next((t for t in snapshot['tasks'] if t['id'] == task_id), None)
    if not task or not task['done'] or task['claimed']:
        return
    room = cleanup_stale_sid_binding(sid)
    if room:
        seat = room['players'][sid]
        if room['seat_tokens'].get(seat) != token:
            return
    task['claimed'] = True
    _, rank = apply_shared_delta(token, valid_nickname(data.get('name')) or '', rank_profiles['by_token'][token], DAILY_TASKS[task_id][1])
    if room:
        room['seat_profiles'][seat]['rank_state'] = rank
    persist_rank_state(token, valid_nickname(data.get('name')) or '', rank)
    device = (data.get('rank_sync') or {}).get('device')
    await sio.emit('profile', {'rank_state': rank, 'daily_tasks': snapshot, 'shared_rank': shared_rank_payload(token, device)}, room=sid)


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
        if room['game'].state == 'PLAYING':
            room['ai_players'].add(seat)
        if keep_offline:
            room['offline_seats'][seat] = asyncio.get_running_loop().time() + RECONNECT_GRACE_SECONDS
        else:
            room['auto_hu'][seat] = False
            room['game'].auto_hu[seat] = False
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
    if not isinstance(data, dict):
        await sio.emit('room_error', {'message': '房间参数无效'}, room=sid)
        return
    name = valid_nickname(data.get('name'))
    if name is None:
        await sio.emit('room_error', {'message': NICKNAME_ERROR}, room=sid)
        return
    existing_room = cleanup_stale_sid_binding(sid)
    if existing_room:
        await sio.emit('room_error', {'message': '你已在房间中', 'recoverable': True}, room=sid)
        return
    rounds = safe_int(data.get('rounds'), 1)
    if rounds not in ALLOWED_ROUNDS:
        rounds = 1
    player_token = normalize_player_token((data or {}).get('player_token'))
    try:
        sync_shared_rank(player_token, name, data.get('rank_sync'))
    except ValueError:
        await sio.emit('room_error', {'message': '段位同步未完成，请重试。'}, room=sid)
        return
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
        'ai_level': 1,
        'rank_outcomes': {},
        'match_id': secrets.token_hex(12),
        'friend_match_tokens': [],
        'action_lock': asyncio.Lock(),
        'game': MahjongGame()
    }
    rooms[code] = room
    seat = assign_seat(room, sid)
    avatar = normalize_avatar_id((data or {}).get('avatar'))
    rank_state = resolve_rank_state(player_token, name, (data or {}).get('rank_state'))
    room['ai_level'] = rank_state['major']
    room['seat_tokens'][seat] = player_token
    room['offline_seats'].pop(seat, None)
    room['seat_profiles'][seat] = {'name': name, 'avatar': avatar, 'rank_state': rank_state,
                                   'rank_device': (data.get('rank_sync') or {}).get('device')}
    persist_rank_state(player_token, name, rank_state)
    sid_room[sid] = code
    await sio.emit('room_joined', {'room_code': code, 'seat': seat}, room=sid)
    await send_room_meta(room)


@sio.event
async def join_room(sid, data):
    if not isinstance(data, dict):
        return
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
        room['ai_players'].discard(seat_by_token)
        room['offline_seats'].pop(seat_by_token, None)
        name = valid_nickname(data.get('name'))
        if name is not None:
            room['seat_profiles'][seat_by_token]['name'] = name
        avatar = (data or {}).get('avatar')
        if avatar is not None:
            room['seat_profiles'][seat_by_token]['avatar'] = normalize_avatar_id(avatar)
        persisted_rank = resolve_rank_state(player_token, room['seat_profiles'][seat_by_token].get('name', ''), (data or {}).get('rank_state'))
        room['seat_profiles'][seat_by_token]['rank_state'] = persisted_rank
        persist_rank_state(player_token, room['seat_profiles'][seat_by_token].get('name', ''), persisted_rank)
        sid_room[sid] = code
        if room.get('owner_sid') is None and room.get('owner_seat') == seat_by_token:
            room['owner_sid'] = sid
        await sio.emit('room_joined', {'room_code': code, 'seat': seat_by_token}, room=sid)
        await send_room_meta(room)
        if room['game'].state in ["PLAYING", "FINISHING", "FINISHED"]:
            await broadcast_game_state(room, game_over=room['game'].state == 'FINISHED')
        if room['game'].state == "PLAYING":
            ensure_turn_watchdog(room)
            ensure_ai_driver(room)
            await check_ai_turn(room)
        return
    if room['game'].state != 'IDLE':
        await sio.emit('room_error', {'message': '对局已开始，仅原座位玩家可重连'}, room=sid)
        return
    if len(set(room['players'].values()) | set(room['offline_seats'])) >= 4:
        await sio.emit('room_error', {'message': '房间已满'}, room=sid)
        return
    name = valid_nickname(data.get('name'))
    if name is None:
        await sio.emit('room_error', {'message': NICKNAME_ERROR}, room=sid)
        return
    seat = assign_seat(room, sid)
    avatar = normalize_avatar_id((data or {}).get('avatar'))
    try:
        sync_shared_rank(player_token, name, data.get('rank_sync'))
    except ValueError:
        await sio.emit('room_error', {'message': '段位同步未完成，请重试。'}, room=sid)
        return
    rank_state = resolve_rank_state(player_token, name, (data or {}).get('rank_state'))
    room['seat_tokens'][seat] = player_token
    room['offline_seats'].pop(seat, None)
    room['seat_profiles'][seat] = {'name': name, 'avatar': avatar, 'rank_state': rank_state,
                                   'rank_device': (data.get('rank_sync') or {}).get('device')}
    persist_rank_state(player_token, name, rank_state)
    sid_room[sid] = code
    if room.get('owner_sid') is None and room.get('owner_seat') == seat:
        room['owner_sid'] = sid
    await sio.emit('room_joined', {'room_code': code, 'seat': seat}, room=sid)
    await send_room_meta(room)


@sio.event
async def rejoin_room(sid, data):
    if not isinstance(data, dict):
        return
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
    room['ai_players'].discard(seat)
    room['offline_seats'].pop(seat, None)
    name = valid_nickname(data.get('name'))
    if name is not None:
        room['seat_profiles'][seat]['name'] = name
    avatar = (data or {}).get('avatar')
    if avatar is not None:
        room['seat_profiles'][seat]['avatar'] = normalize_avatar_id(avatar)
    token = room['seat_tokens'].get(seat) or normalize_player_token((data or {}).get('player_token'))
    room['seat_tokens'][seat] = token
    try:
        sync_shared_rank(token, room['seat_profiles'][seat].get('name', ''), data.get('rank_sync'))
    except ValueError:
        await sio.emit('room_error', {'message': '段位同步未完成，请重试。'}, room=sid)
        return
    if data.get('rank_sync'):
        room['seat_profiles'][seat]['rank_device'] = data['rank_sync']['device']
    persisted_rank = resolve_rank_state(token, room['seat_profiles'][seat].get('name', ''), (data or {}).get('rank_state'))
    room['seat_profiles'][seat]['rank_state'] = persisted_rank
    persist_rank_state(token, room['seat_profiles'][seat].get('name', ''), persisted_rank)
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
    if not isinstance(data, dict):
        return
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
            r['ai_players'].discard(seat)
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
    if room['game'].state not in ('IDLE', 'FINISHED'):
        await sio.emit('start_denied', {'reason': '本局仍在进行或结算中'}, room=sid)
        return

    room['current_round'] += 1
    current_humans = {room['seat_tokens'].get(seat) for seat in room['players'].values()} - {None, ''}
    room['friend_match_tokens'] = list(current_humans if room['current_round'] == 1
                                     else set(room.get('friend_match_tokens', [])) & current_humans)
    room['match_over'] = False
    room['reveal_hu'] = None
    room['reveal_draws'] = None
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
    if not isinstance(data, dict):
        return
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
    token = safe_int(data.get('round_token'))
    if token != room.get('round_token', 0):
        return
    pending = room.get('pending_ready_seats')
    if not pending:
        return
    if player_idx in pending:
        pending.discard(player_idx)
    if not pending:
        await broadcast_game_state(room)
        await check_ai_turn(room)


@sio.event
async def set_auto_hu(sid, data):
    if not isinstance(data, dict):
        return
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
    if not isinstance(data, dict):
        return
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
    room = cleanup_stale_sid_binding(sid)
    if not room or not isinstance(data, dict):
        return
    # 一个操作完成前不接受下一次操作，避免 Socket.IO 并发事件重复碰杠。
    async with room['action_lock']:
        if room.get('round_resolving') or room['game'].state != 'PLAYING':
            return
        token = safe_int(data.get('round_token'))
        if token and token != room.get('round_token', 0):
            return
        seq = data.get('state_seq')
        if seq is not None and safe_int(seq, -1) != room.get('state_seq', 0):
            await broadcast_game_state(room)
            return
        await perform_action(room, sid, data)


async def perform_action(room, sid, data):
    game = room['game']
    player_idx = room['players'].get(sid)
    if player_idx is None:
        return
    if not is_round_ready(room):
        await broadcast_game_state(room)
        return
    action_type = data.get('type')
    tile = data.get('tile')

    if action_type == 'discard':
        if game.discard_tile(player_idx, tile):
            await emit_room(room, 'action_event', {'player': player_idx, 'type': 'discard'})
            await broadcast_game_state(room)
            claimed = await handle_discard_claims(room, player_idx, tile)
            if not claimed:
                await advance_turn_and_draw_from(room, player_idx)
            elif game.state == 'PLAYING' and game.turn in room['ai_players'] and not game.waiting_actions:
                await check_ai_turn(room)
        return

    if action_type in ('pong', 'kong', 'pass'):
        pending = game.waiting_actions.get(player_idx)
        if not pending or (action_type != 'pass' and action_type not in pending.get('actions', [])):
            return
        from_player = pending.get('from_player')
        if action_type != 'pass' and not game.execute_action(player_idx, action_type, pending.get('tile')):
            return
        cancel_claim_timeout(room)
        game.waiting_actions = {}
        if action_type == 'pass':
            if from_player is not None:
                await advance_turn_and_draw_from(room, from_player)
        else:
            await emit_room(room, 'action_event', {'player': player_idx, 'type': action_type})
            if not await finalize_round_if_finished(room):
                await broadcast_game_state(room)
                await check_ai_turn(room)
        return

    if game.turn != player_idx or game.waiting_actions:
        return
    allowed = game.get_self_actions(player_idx)
    if action_type == 'self_kong':
        if tile in allowed['add_kong']:
            winner = game.find_rob_kong_winner(player_idx, tile)
            if winner is not None:
                # 补杠取消，抢到的那张牌移入赢家手中，保持 112 张牌守恒。
                game.players[player_idx].remove(tile)
                game.players[winner].append(tile)
                game.players[winner] = game.sort_hand(game.players[winner])
                base, draws = game.settle_rob_kong_hu(winner, player_idx)
                await finish_round_with_reveal(room, winner, 'hu', base, draws)
                return
            kind = 'add_kong'
        elif tile in allowed['concealed_kong']:
            kind = 'concealed_kong'
        else:
            await sio.emit('error', {'message': '当前不能杠这张牌'}, room=sid)
            return
        if game.execute_action(player_idx, kind, tile):
            await emit_room(room, 'action_event', {'player': player_idx, 'type': 'kong'})
            if not await finalize_round_if_finished(room):
                await broadcast_game_state(room)
                await check_ai_turn(room)
    elif action_type == 'self_hu':
        if not allowed['hu']:
            await sio.emit('error', {'message': '当前不能胡牌；碰后须等待下一次摸牌'}, room=sid)
            return
        base, draws = game.settle_self_hu(player_idx)
        await finish_round_with_reveal(room, player_idx, 'zi_mo', base, draws)


async def broadcast_game_state(room, game_over=False, reveal_hu=None, reveal_draws=None):
    game = room['game']
    game_over = game_over or game.state == 'FINISHED'
    if game.state == 'FINISHING':
        reveal_hu = room.get('reveal_hu')
        reveal_draws = room.get('reveal_draws')
    room['state_seq'] = room.get('state_seq', 0) + 1
    seq = room['state_seq']
    hand_counts = {i: len(game.players[i]) for i in range(4)}
    ai_seats = list(room['ai_players'])
    for sid, p_idx in tuple(room['players'].items()):
        ting_info = []
        hand = game.players[p_idx]
        if len(hand) % 3 == 1:
            ting_info = get_ting_tiles(hand, game.get_meld_tiles(p_idx))

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
        state['game_status'] = game.state
        state['round_ready'] = is_round_ready(room)
        state['claim_pending'] = bool(game.waiting_actions)
        state['waiting_action'] = game.waiting_actions.get(p_idx)
        state['auto_hu'] = game.auto_hu.get(p_idx, False)
        state['rank_outcome'] = room.get('rank_outcomes', {}).get(p_idx)
        state['shared_rank'] = shared_rank_payload(room['seat_tokens'].get(p_idx, ''), room['seat_profiles'].get(p_idx, {}).get('rank_device'))
        state['daily_tasks'] = get_daily_tasks(room['seat_tokens'].get(p_idx, ''))
        state['completed_match'] = rank_profiles.get('completed_matches', {}).get(room['seat_tokens'].get(p_idx, ''))
        state['completed_matches'] = completed_match_events(room['seat_tokens'].get(p_idx, ''))
        state['seat_profiles'] = room['seat_profiles']
        state['state_seq'] = seq
        state['action_seq'] = room.get('action_seq', 0)
        state['round_token'] = room.get('round_token', 0)
        state['last_discard_player'] = game.last_discard_player
        await sio.emit('game_state', state, room=sid)


async def room_maintenance(application):
    async def reap_rooms():
        while True:
            await asyncio.sleep(15)
            for code, room in tuple(rooms.items()):
                prune_offline_seats(room)
                if room['players'] or room['offline_seats']:
                    continue
                for key in ('watch_task', 'driver_task', 'claim_timeout_task'):
                    task = room.get(key)
                    if task and not task.done():
                        task.cancel()
                rooms.pop(code, None)
    reaper = asyncio.create_task(reap_rooms())
    yield
    tasks = [reaper]
    for room in rooms.values():
        tasks.extend(room[key] for key in ('watch_task', 'driver_task', 'claim_timeout_task') if room.get(key))
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


app.cleanup_ctx.append(room_maintenance)


if __name__ == '__main__':
    raw_port = os.getenv('PORT', '7860')
    try:
        port = int(raw_port)
    except Exception:
        print(f"[startup] invalid PORT={raw_port}, fallback to 7860", flush=True)
        port = 7860
    print(f"[startup] host=0.0.0.0 port={port}", flush=True)
    try:
        web.run_app(app, host='0.0.0.0', port=port)
    except Exception:
        print("[startup] run_app failed:", flush=True)
        print(traceback.format_exc(), flush=True)
        raise
