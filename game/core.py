import secrets
from .rules import RED_DRAGON, LUCKY_TILES, can_hu, get_ting_tiles, is_valid_tile

class MahjongGame:
    def __init__(self):
        self.deck = []
        self.players = {0: [], 1: [], 2: [], 3: []} # Hand tiles
        self.melds = {0: [], 1: [], 2: [], 3: []}   # Exposed melds (Pong, Kong)
        self.discards = {0: [], 1: [], 2: [], 3: []}
        self.scores = {0: 0, 1: 0, 2: 0, 3: 0}
        self.auto_hu = {0: False, 1: False, 2: False, 3: False}
        self.last_draw = {0: None, 1: None, 2: None, 3: None}
        self.hu_block_after_claim = {0: False, 1: False, 2: False, 3: False}
        self.deal_sequence = {0: [], 1: [], 2: [], 3: []}
        
        self.turn = 0
        self.banker = 0
        self.state = "IDLE" # IDLE, PLAYING, FINISHED
        self.waiting_actions = {} # Map of player_id -> allowed actions (e.g. {1: ['pong', 'hu']})
        
        self.last_discard = None
        self.last_discard_player = -1
        self.gang_source = None # Who provided the Gang (for scoring)
        self.kong_events = []
        
        # Specific rules state
        self.first_discard_round = True
        self.banker_first_discard = None
        self.first_round_discards = {}

    def tile_sort_key(self, tile):
        suit = tile // 10
        rank = tile % 10
        suit_order = {1: 0, 3: 1, 2: 2, 4: 3}
        return (suit_order.get(suit, 9), rank, tile)

    def sort_hand(self, tiles):
        return sorted(tiles, key=self.tile_sort_key)

    def get_meld_tiles(self, player_index):
        tiles = []
        for meld in self.melds[player_index]:
            if meld.get('type') == 'pong':
                tiles.extend([meld['tile']] * 3)
            elif meld.get('type') == 'kong':
                tiles.extend([meld['tile']] * 4)
        return tiles

    def get_total_tiles(self, player_index):
        return self.players[player_index] + self.get_meld_tiles(player_index)

    def get_self_actions(self, player_index):
        hand = self.players[player_index]
        empty = {'hu': False, 'concealed_kong': [], 'add_kong': []}
        if self.state != 'PLAYING' or self.turn != player_index or self.waiting_actions:
            return empty
        if hand.count(RED_DRAGON) >= 4:
            return {
                'hu': True,
                'concealed_kong': [],
                'add_kong': []
            }
        can_self_hu = False
        if len(hand) % 3 == 2 and (not self.hu_block_after_claim.get(player_index, False)):
            can_self_hu = can_hu(hand)

        if len(hand) % 3 != 2 or not self.deck:
            return {'hu': can_self_hu, 'concealed_kong': [], 'add_kong': []}

        concealed = []
        for t in set(hand):
            if t == RED_DRAGON:
                continue
            if hand.count(t) == 4:
                concealed.append(t)

        concealed.sort(key=self.tile_sort_key)

        add_kong = []
        for meld in self.melds[player_index]:
            if meld.get('type') == 'pong':
                t = meld.get('tile')
                if t == RED_DRAGON:
                    continue
                if t is not None and hand.count(t) >= 1:
                    add_kong.append(t)
        add_kong = sorted(set(add_kong), key=self.tile_sort_key)

        return {
            'hu': can_self_hu,
            'concealed_kong': concealed,
            'add_kong': add_kong
        }
        
    def start_game(self):
        self.deck = self.create_deck()
        self.shuffle_deck_truly_random(self.deck)
        
        # Reset hands
        for i in range(4):
            self.players[i] = []
            self.melds[i] = []
            self.discards[i] = []
            self.last_draw[i] = None
            self.hu_block_after_claim[i] = False
            self.deal_sequence[i] = []
            
        self.state = "PLAYING"
        self.turn = self.banker
        self.first_discard_round = True
        self.banker_first_discard = None
        self.first_round_discards = {}
        self.kong_events = []
        self.scores = {i: 0 for i in range(4)}
        self.waiting_actions = {}
        self.last_discard = None
        self.last_discard_player = -1
        
        # Deal tiles
        # 13 tiles each, Banker gets 14th
        for _ in range(3): # 3 rounds of 4 tiles
            for i in range(4):
                for _ in range(4):
                    t = self.deck.pop(0)
                    self.players[i].append(t)
                    self.deal_sequence[i].append(t)
                    
        for i in range(4): # 1 round of 1 tile
            t = self.deck.pop(0)
            self.players[i].append(t)
            self.deal_sequence[i].append(t)

        banker_tile = self.deck.pop(0)
        self.players[self.banker].append(banker_tile)
        self.deal_sequence[self.banker].append(banker_tile)
        self.last_draw[self.banker] = banker_tile

        for i in range(4):
            self.players[i].sort(key=self.tile_sort_key)
        
    def create_deck(self):
        tiles = []
        for suit in [10, 20, 30]:
            for i in range(1, 10):
                tile = suit + i
                tiles.extend([tile] * 4)
        tiles.extend([RED_DRAGON] * 4)
        return tiles

    def shuffle_deck_truly_random(self, tiles):
        for i in range(len(tiles) - 1, 0, -1):
            j = secrets.randbelow(i + 1)
            tiles[i], tiles[j] = tiles[j], tiles[i]
        
    def draw_tile(self, player_index, from_tail=False):
        if not self.deck:
            self.end_game_draw()
            return None
            
        if from_tail:
            tile = self.deck.pop() # Remove from end
        else:
            tile = self.deck.pop(0) # Remove from front
            
        self.players[player_index].append(tile)
        self.players[player_index].sort(key=self.tile_sort_key)
        self.last_draw[player_index] = tile
        self.hu_block_after_claim[player_index] = False
        return tile

    def apply_opening_bonus(self):
        if len(self.first_round_discards) < 4:
            return
        first4 = [self.first_round_discards[i] for i in [0, 1, 2, 3]]
        non_red = [t for t in first4 if t != RED_DRAGON]
        same = len(set(first4)) == 1
        all_red = len(non_red) == 0
        one_red_three_same = (len(non_red) == 3 and len(set(non_red)) == 1)
        if same or all_red or one_red_three_same:
            for p in range(4):
                if p == self.banker:
                    self.scores[p] -= 3
                else:
                    self.scores[p] += 1

    def calc_hu_base(self, player_index):
        base = 1
        hand = self.players[player_index]
        draw_count = 4 if (RED_DRAGON in hand) else 6
        draws = []
        for _ in range(draw_count):
            if not self.deck:
                break
            t = self.deck.pop(0)
            draws.append(t)
            if t in LUCKY_TILES:
                base += 1
        return base, draws

    def settle_self_hu(self, winner):
        hand = self.players[winner]
        if hand.count(RED_DRAGON) >= 4:
            for i in range(4):
                if i != winner:
                    self.scores[winner] += 10
                    self.scores[i] -= 10
            return 10, []

        base, draws = self.calc_hu_base(winner)
        for i in range(4):
            if i != winner:
                self.scores[winner] += base
                self.scores[i] -= base
        return base, draws

    def settle_rob_kong_hu(self, winner, kong_player):
        hand = self.players[winner]
        if hand.count(RED_DRAGON) >= 4:
            pay = 30
            self.scores[winner] += pay
            self.scores[kong_player] -= pay
            return 10, []

        base, draws = self.calc_hu_base(winner)
        pay = base * 3
        self.scores[winner] += pay
        self.scores[kong_player] -= pay
        return base, draws

    def find_rob_kong_winner(self, kong_player, tile):
        for step in [1, 2, 3]:
            idx = (kong_player + step) % 4
            hand = self.players[idx]
            if len(hand) % 3 != 1 or self.hu_block_after_claim.get(idx, False):
                continue
            ting = get_ting_tiles(hand, self.get_meld_tiles(idx))
            if tile in ting:
                return idx
        return None
        
    def discard_tile(self, player_index, tile):
        if (self.state != 'PLAYING' or self.turn != player_index or self.waiting_actions
                or len(self.players[player_index]) % 3 != 2 or not is_valid_tile(tile)):
            return False
        if tile in self.players[player_index]:
            self.players[player_index].remove(tile)
            self.players[player_index].sort(key=self.tile_sort_key)
            self.last_draw[player_index] = None
            self.discards[player_index].append(tile)
            self.last_discard = tile
            self.last_discard_player = player_index
            
            # Check Gen Zhuang (Follow the Banker)
            if self.first_discard_round:
                if player_index not in self.first_round_discards:
                    self.first_round_discards[player_index] = tile
                if len(self.first_round_discards) == 4:
                    self.apply_opening_bonus()
                    self.first_discard_round = False
            
            return True
        return False
        
    def check_actions(self, tile, from_player, is_add_kong=False):
        return {}

    def execute_action(self, player_index, action_type, tile=None):
        """
        Execute an action (Pong, Kong)
        """
        if self.state != 'PLAYING' or not is_valid_tile(tile):
            return False
        hand = self.players[player_index]
        if action_type in ('pong', 'kong'):
            needed = 2 if action_type == 'pong' else 3
            source = self.last_discard_player
            if (source not in range(4) or source == player_index or self.last_discard != tile
                    or not self.discards[source] or self.discards[source][-1] != tile
                    or hand.count(tile) < needed or len(hand) % 3 != 1):
                return False
            if action_type == 'kong' and (tile == RED_DRAGON or not self.deck):
                return False
        elif action_type in ('add_kong', 'concealed_kong'):
            allowed = self.get_self_actions(player_index)
            if tile not in allowed[action_type]:
                return False
        else:
            return False

        if action_type == 'pong':
            # Remove 2 tiles from hand
            self.players[player_index].remove(tile)
            self.players[player_index].remove(tile)
            
            # Add meld
            self.melds[player_index].append({'type': 'pong', 'tile': tile})
            
            # Remove tile from last discard (which is in self.discards[self.last_discard_player])
            self.discards[self.last_discard_player].pop()
            
            # Set turn
            self.turn = player_index
            self.last_draw[player_index] = None
            self.hu_block_after_claim[player_index] = True
            
            # Player needs to discard now
            # (No draw after Pong)
            
        elif action_type == 'kong':
            # Ming Gang (Exposed Kong)
            # Remove 3 tiles from hand
            for _ in range(3):
                self.players[player_index].remove(tile)
                
            self.melds[player_index].append({'type': 'kong', 'tile': tile, 'source': 'exposed'})
            self.discards[self.last_discard_player].pop()
            
            # Score update: +3 from discarder, -3 to discarder
            self.scores[player_index] += 3
            self.scores[self.last_discard_player] -= 3
            self.kong_events.append({'type': 'kong', 'player': player_index, 'from_player': self.last_discard_player})
            
            self.turn = player_index
            # Draw from tail
            self.draw_tile(player_index, from_tail=True)
            
        elif action_type == 'add_kong':
            # Bu Gang (Add to existing Pong)
            self.players[player_index].remove(tile)
            # Update meld
            for meld in self.melds[player_index]:
                if meld['type'] == 'pong' and meld['tile'] == tile:
                    meld['type'] = 'kong'
                    meld['source'] = 'added'
                    break
            
            # Check Robbing Kong (This should be done BEFORE executing, or interrupt?)
            # Usually we check first. If no one robs, we execute.
            # Here we assume checks are done.
            
            # Score update: +3 (1 from each)
            for i in range(4):
                if i != player_index:
                    self.scores[player_index] += 1
                    self.scores[i] -= 1
            self.kong_events.append({'type': 'add_kong', 'player': player_index})
                    
            self.turn = player_index
            self.draw_tile(player_index, from_tail=True)

        elif action_type == 'concealed_kong':
            # An Gang
            for _ in range(4):
                self.players[player_index].remove(tile)
            self.melds[player_index].append({'type': 'kong', 'tile': tile, 'source': 'concealed'})
            
            # Score: +6 (2 from each)
            for i in range(4):
                if i != player_index:
                    self.scores[player_index] += 2
                    self.scores[i] -= 2
            self.kong_events.append({'type': 'concealed_kong', 'player': player_index})
                    
            self.turn = player_index
            self.draw_tile(player_index, from_tail=True)

        self.last_discard = None
        self.last_discard_player = -1
        return True

    def rollback_kong_scores(self):
        if not self.kong_events:
            return
        for evt in reversed(self.kong_events):
            evt_type = evt.get('type')
            player = evt.get('player')
            if evt_type == 'kong':
                from_player = evt.get('from_player')
                if player is None or from_player is None:
                    continue
                self.scores[player] -= 3
                self.scores[from_player] += 3
            elif evt_type == 'add_kong':
                if player is None:
                    continue
                for i in range(4):
                    if i != player:
                        self.scores[player] -= 1
                        self.scores[i] += 1
            elif evt_type == 'concealed_kong':
                if player is None:
                    continue
                for i in range(4):
                    if i != player:
                        self.scores[player] -= 2
                        self.scores[i] += 2
        self.kong_events = []

    def end_game_draw(self):
        self.rollback_kong_scores()
        self.state = "FINISHED"
        # Calculate nothing or penalties? Usually draw = no score change or Banker stays?
        # Prompt doesn't specify draw penalty.
        pass

