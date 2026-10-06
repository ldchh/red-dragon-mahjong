"""红中麻将牌型判断；缓存使用不可变键，避免人机搜索重复计算。"""

from collections import Counter
from functools import lru_cache
from itertools import product

RED_DRAGON = 40
ALL_TILES = tuple(suit + rank for suit in (10, 20, 30) for rank in range(1, 10)) + (RED_DRAGON,)
LUCKY_TILES = {11, 15, 19, 21, 25, 29, 31, 35, 39, RED_DRAGON}


def is_valid_tile(tile):
    return type(tile) is int and tile in ALL_TILES


def valid_hand(tiles):
    return len(tiles) <= 14 and all(is_valid_tile(t) for t in tiles) and max(Counter(tiles).values(), default=0) <= 4


def can_hu(hand_tiles: list[int]) -> bool:
    if not valid_hand(hand_tiles):
        return False
    return _can_hu(tuple(sorted(hand_tiles)))


@lru_cache(maxsize=32768)
def _can_hu(tiles):
    wildcards = tiles.count(RED_DRAGON)
    if wildcards == 4:
        return True
    if len(tiles) % 3 != 2:
        return False
    if can_qidui(tiles):
        return True
    counts = tuple(tiles.count(t) for t in ALL_TILES[:-1])
    for i, count in enumerate(counts):
        for take in (2, 1):
            needed = 2 - take
            if count >= take and wildcards >= needed:
                remaining = list(counts)
                remaining[i] -= take
                if _check_melds(tuple(remaining), wildcards - needed):
                    return True
    return wildcards >= 2 and _check_melds(counts, wildcards - 2)


def can_qidui(hand_tiles: list[int]) -> bool:
    if len(hand_tiles) != 14 or not valid_hand(hand_tiles):
        return False
    wildcards = hand_tiles.count(RED_DRAGON)
    counts = Counter(t for t in hand_tiles if t != RED_DRAGON)
    needed = sum(count % 2 for count in counts.values())
    return needed <= wildcards and (wildcards - needed) % 2 == 0


@lru_cache(maxsize=65536)
def _check_melds(counts, wildcards):
    first = next((i for i, count in enumerate(counts) if count), None)
    if first is None:
        return wildcards % 3 == 0
    # 刻子也可能只消耗部分普通牌，其余同牌用于顺子。
    for take in range(min(3, counts[first]), 0, -1):
        needed = 3 - take
        if needed <= wildcards:
            remaining = list(counts)
            remaining[first] -= take
            if _check_melds(tuple(remaining), wildcards - needed):
                return True
    suit_start = (first // 9) * 9
    rank = first % 9
    # 最小普通牌可以位于顺子的中间或末尾，例如 红中、八、九。
    for start in range(max(0, rank - 2), min(rank, 6) + 1):
        others = [suit_start + r for r in range(start, start + 3) if suit_start + r != first]
        choices = [(1, 0) if counts[i] else (0,) for i in others]
        for used in product(*choices):
            needed = 2 - sum(used)
            if needed > wildcards:
                continue
            remaining = list(counts)
            remaining[first] -= 1
            for i, take in zip(others, used):
                remaining[i] -= take
            if _check_melds(tuple(remaining), wildcards - needed):
                return True
    return False


def check_melds(counts, wildcards):
    """兼容旧的 Counter 接口，不修改调用者的计数。"""
    if wildcards < 0 or any(not is_valid_tile(t) or t == RED_DRAGON or c < 0 for t, c in counts.items() if c):
        return False
    return _check_melds(tuple(counts.get(t, 0) for t in ALL_TILES[:-1]), wildcards)


def get_ting_tiles(hand_tiles: list[int], exposed_tiles=()) -> list[int]:
    if len(hand_tiles) % 3 != 1 or not valid_hand(hand_tiles):
        return []
    return list(_get_ting_tiles(tuple(sorted(hand_tiles)), tuple(sorted(exposed_tiles))))


@lru_cache(maxsize=16384)
def _get_ting_tiles(tiles, exposed):
    known = Counter(tiles + exposed)
    return tuple(t for t in ALL_TILES if known[t] < 4 and _can_hu(tuple(sorted(tiles + (t,)))))
