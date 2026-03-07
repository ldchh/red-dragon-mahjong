from collections import Counter

# Tile constants
# 11-19: Wan
# 21-29: Tong
# 31-39: Tiao
# 40: Red Dragon (Hong Zhong)

RED_DRAGON = 40
LUCKY_TILES = {11, 15, 19, 21, 25, 29, 31, 35, 39, RED_DRAGON}

def is_valid_tile(t):
    return (11 <= t <= 19) or (21 <= t <= 29) or (31 <= t <= 39) or t == RED_DRAGON

def can_hu(hand_tiles: list[int]) -> bool:
    """
    Check if the hand can Hu.
    hand_tiles: list of integers representing tiles.
    """
    # Separate wildcards
    wildcards = hand_tiles.count(RED_DRAGON)
    normal_tiles = [t for t in hand_tiles if t != RED_DRAGON]
    
    # 4 Red Dragons rule: Automatic Hu
    if wildcards == 4:
        return True

    # Standard Hu check: 3n + 2
    if len(hand_tiles) % 3 != 2:
        return False

    if can_qidui(hand_tiles):
        return True

    counts = Counter(normal_tiles)
    unique_tiles = sorted(counts.keys())
    
    # Optimization: if no normal tiles, and wildcards >= 2 (must be 3n+2, e.g. 2, 5, 8, 11, 14)
    # If wildcards only:
    # 2 wildcards -> pair (valid)
    # 5 wildcards -> pair + triplet (valid)
    # 8 -> pair + 2 triplets (valid)
    # 11 -> pair + 3 triplets (valid)
    # 14 -> pair + 4 triplets (valid)
    # So if no normal tiles, it's always true provided count is 3n+2 (which is checked above).
    if not normal_tiles:
        return True
    
    # Case 1: Two identical normal tiles as pair
    for t in unique_tiles:
        if counts[t] >= 2:
            counts[t] -= 2
            if check_melds(counts, wildcards):
                return True
            counts[t] += 2
            
    # Case 2: One normal tile + 1 wildcard as pair
    if wildcards >= 1:
        for t in unique_tiles:
            counts[t] -= 1
            if check_melds(counts, wildcards - 1):
                return True
            counts[t] += 1
            
    # Case 3: Two wildcards as pair
    if wildcards >= 2:
        if check_melds(counts, wildcards - 2):
            return True
            
    return False


def can_qidui(hand_tiles: list[int]) -> bool:
    if len(hand_tiles) != 14:
        return False
    wildcards = hand_tiles.count(RED_DRAGON)
    normal_tiles = [t for t in hand_tiles if t != RED_DRAGON]
    counts = Counter(normal_tiles)
    need_wildcards = sum(c % 2 for c in counts.values())
    if need_wildcards > wildcards:
        return False
    remain = wildcards - need_wildcards
    if remain % 2 != 0:
        return False
    pair_count = sum(c // 2 for c in counts.values()) + need_wildcards + (remain // 2)
    return pair_count >= 7

def check_melds(counts, wildcards):
    """
    Check if remaining tiles can form melds (triplets or sequences) using wildcards.
    counts: Counter of normal tiles.
    wildcards: Number of available wildcards.
    """
    # Find the first available tile
    # We convert keys to list to avoid runtime error if we modify counts (though we only modify values)
    # But finding min key is safer on current state.
    
    available_tiles = [t for t, c in counts.items() if c > 0]
    if not available_tiles:
        return True # All tiles matched
        
    first = min(available_tiles)
    
    # Try to form a Triplet (Ke)
    # 1. 3 identical tiles
    if counts[first] >= 3:
        counts[first] -= 3
        if check_melds(counts, wildcards):
            return True
        counts[first] += 3
        
    # 2. 2 identical + 1 wildcard
    if counts[first] >= 2 and wildcards >= 1:
        counts[first] -= 2
        if check_melds(counts, wildcards - 1):
            return True
        counts[first] += 2
        
    # 3. 1 tile + 2 wildcards
    if wildcards >= 2:
        counts[first] -= 1
        if check_melds(counts, wildcards - 2):
            return True
        counts[first] += 1
        
    # Try to form a Sequence (Shun)
    # Only for number tiles (Wan, Tong, Tiao)
    if first < 40: 
        t1 = first
        t2 = first + 1
        t3 = first + 2
        rank = first % 10
        
        # Check suit boundaries
        # e.g. 19 (Wan 9) cannot pair with 20/21
        if (t1 // 10 == t3 // 10):
            # Scenario A: Have t1, t2, t3
            if counts[t2] > 0 and counts[t3] > 0:
                counts[t1] -= 1
                counts[t2] -= 1
                counts[t3] -= 1
                if check_melds(counts, wildcards):
                    return True
                counts[t1] += 1
                counts[t2] += 1
                counts[t3] += 1
                
            # Scenario B: Have t1, t2, need 1 wildcard (for t3)
            if wildcards >= 1 and counts[t2] > 0:
                counts[t1] -= 1
                counts[t2] -= 1
                if check_melds(counts, wildcards - 1):
                    return True
                counts[t1] += 1
                counts[t2] += 1
                
            # Scenario C: Have t1, t3, need 1 wildcard (for t2)
            if wildcards >= 1 and counts[t3] > 0:
                counts[t1] -= 1
                counts[t3] -= 1
                if check_melds(counts, wildcards - 1):
                    return True
                counts[t1] += 1
                counts[t3] += 1
                
            # Scenario D: Have t1, need 2 wildcards (for t2, t3)
            if wildcards >= 2:
                counts[t1] -= 1
                if check_melds(counts, wildcards - 2):
                    return True
                counts[t1] += 1
        # Scenario E: Have t1, t2 at edge (e.g. 8,9), need 1 wildcard as t1-1
        if wildcards >= 1 and rank >= 2 and counts[t2] > 0:
            counts[t1] -= 1
            counts[t2] -= 1
            if check_melds(counts, wildcards - 1):
                return True
            counts[t1] += 1
            counts[t2] += 1
                
    return False

def get_ting_tiles(hand_tiles: list[int]) -> list[int]:
    """
    Return a list of tiles that, if added to the hand, would make it win.
    hand_tiles should have 3n + 1 tiles (waiting for one).
    """
    possible_tiles = []
    # Try adding every possible tile (11-19, 21-29, 31-39, 40)
    all_tiles = []
    for suit in [10, 20, 30]:
        for i in range(1, 10):
            all_tiles.append(suit + i)
    all_tiles.append(RED_DRAGON)
    
    for t in all_tiles:
        new_hand = hand_tiles + [t]
        if can_hu(new_hand):
            possible_tiles.append(t)
    if possible_tiles and RED_DRAGON not in possible_tiles:
        possible_tiles.append(RED_DRAGON)
            
    return possible_tiles
