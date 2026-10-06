"""One-use gift codes. Only confirmed, durable commits produce a receipt.

Local development uses transactional SQLite. Spaces require either an explicit
persistent SQLite path or a private Hub dataset with parent-commit compare-and-
swap; ephemeral container storage is deliberately not a production fallback.
"""
import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import urllib.error
import urllib.request
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


class RewardError(Exception):
    def __init__(self, reason, status=400):
        super().__init__(reason)
        self.reason, self.status = reason, status


def code_digest(code):
    if not isinstance(code, str) or len(code) > 48:
        raise RewardError('invalid_code')
    normalized = re.sub(r'[\s-]', '', code).upper()
    if not re.fullmatch(r'HZ[A-HJ-NP-Z2-9]{16}', normalized):
        raise RewardError('invalid_code')
    return hashlib.sha256(normalized.encode('ascii')).hexdigest()


def owner_digest(device):
    if not isinstance(device, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{8,100}', device):
        raise RewardError('invalid_device')
    return hashlib.sha256(device.encode('ascii')).hexdigest()


def new_receipt():
    return {'id': 'gift:' + secrets.token_hex(16), 'coupons': 1,
            'at': datetime.now(timezone.utc).isoformat()}


def owned_receipt(entry, owner):
    if entry['owner'] != owner:
        raise RewardError('code_used', 409)
    return {'ok': True, 'receipt': entry['receipt'], 'replayed': True}


class SQLiteRewards:
    def __init__(self, path, catalogue):
        self.path, self.catalogue = Path(path), catalogue

    def redeem(self, code, device):
        digest, owner = code_digest(code), owner_digest(device)
        if digest not in self.catalogue:
            raise RewardError('invalid_code')
        try:
            return self._commit(digest, owner)
        except sqlite3.Error:
            raise RewardError('service_unavailable', 503) from None

    def _commit(self, digest, owner):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path, timeout=8, isolation_level=None)) as db:
            db.execute('PRAGMA synchronous=FULL')
            db.execute('CREATE TABLE IF NOT EXISTS gifts (code TEXT PRIMARY KEY, owner TEXT NOT NULL, receipt TEXT NOT NULL)')
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT owner, receipt FROM gifts WHERE code=?', (digest,)).fetchone()
            if row:
                result = owned_receipt({'owner': row[0], 'receipt': json.loads(row[1])}, owner)
            else:
                receipt = new_receipt()
                db.execute('INSERT INTO gifts VALUES (?,?,?)', (digest, owner, json.dumps(receipt)))
                result = {'ok': True, 'receipt': receipt, 'replayed': False}
            db.execute('COMMIT')
            return result


class HubRewards:
    """Small private ledger; optimistic concurrency protects separate workers."""
    def __init__(self, repo, token, catalogue, request=None):
        if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo):
            raise ValueError('Invalid rewards dataset')
        self.repo, self.token, self.catalogue = repo, token, catalogue
        self.request = request or self._request

    def _request(self, method, url, body=None):
        headers = {'Authorization': 'Bearer ' + self.token, 'Cache-Control': 'no-cache'}
        if body is not None:
            headers['Content-Type'] = 'application/x-ndjson'
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                data = response.read(262145)
                if len(data) > 262144:
                    raise RewardError('service_unavailable', 503)
                return response.status, json.loads(data)
        except urllib.error.HTTPError as error:
            return error.code, None
        except (OSError, ValueError):
            raise RewardError('service_unavailable', 503) from None

    def redeem(self, code, device):
        digest, owner = code_digest(code), owner_digest(device)
        if digest not in self.catalogue:
            raise RewardError('invalid_code')
        receipt = new_receipt()
        for _ in range(4):
            status, info = self.request('GET', f'https://huggingface.co/api/datasets/{self.repo}/revision/main')
            if status != 200 or not isinstance(info, dict) or not re.fullmatch(r'[a-f0-9]{40,64}', str(info.get('sha', ''))):
                raise RewardError('service_unavailable', 503)
            head = info['sha']
            status, saved = self.request('GET', f'https://huggingface.co/datasets/{self.repo}/resolve/{head}/redemptions.json')
            if status == 404:
                saved = {'version': 1, 'redeemed': {}}
            elif status != 200 or not isinstance(saved, dict) or saved.get('version') != 1 or not isinstance(saved.get('redeemed'), dict):
                raise RewardError('service_unavailable', 503)
            redeemed = saved['redeemed']
            if digest in redeemed:
                return owned_receipt(redeemed[digest], owner)
            redeemed[digest] = {'owner': owner, 'receipt': receipt}
            content = base64.b64encode(json.dumps(saved, separators=(',', ':')).encode()).decode('ascii')
            lines = [
                {'key': 'header', 'value': {'summary': 'Redeem a Mahjong gift', 'parentCommit': head}},
                {'key': 'file', 'value': {'path': 'redemptions.json', 'encoding': 'base64', 'content': content}},
            ]
            body = ('\n'.join(json.dumps(line) for line in lines) + '\n').encode()
            status, result = self.request('POST', f'https://huggingface.co/api/datasets/{self.repo}/commit/main', body)
            if status in (200, 201) and isinstance(result, dict) and result.get('commitOid'):
                return {'ok': True, 'receipt': receipt, 'replayed': False}
            if status not in (409, 412):
                raise RewardError('service_unavailable', 503)
        raise RewardError('service_busy', 503)


def configured_rewards(root):
    catalogue_path = Path(root) / 'releases' / 'redeem-codes.json'
    catalogue = json.loads(catalogue_path.read_text(encoding='utf-8'))['codes'] if catalogue_path.exists() else {}
    repo, token = os.getenv('HF_REWARDS_REPO'), os.getenv('HF_REWARDS_TOKEN')
    if repo and token:
        return HubRewards(repo, token, catalogue)
    path = os.getenv('REDEEM_DB_PATH')
    if path:
        return SQLiteRewards(path, catalogue)
    if not os.getenv('SPACE_ID'):
        return SQLiteRewards(Path(root) / 'data' / 'redemptions.sqlite', catalogue)
    return None
