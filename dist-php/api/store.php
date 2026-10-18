<?php
// api/store.php — SQLite Persistence & State Management for Guardian Wallet

require_once __DIR__ . '/config.php';

function getDb(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    global $CONFIG;
    $dbPath = $CONFIG['db_file'];
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    // Initialize Schema
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            val TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pending (
            intent_id TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS custom_contacts (
            address TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            allowlisted INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS sim_ledger (
            id INTEGER PRIMARY KEY,
            balance TEXT NOT NULL,
            spent_today TEXT NOT NULL,
            per_tx_cap TEXT NOT NULL,
            daily_cap TEXT NOT NULL,
            paused INTEGER NOT NULL,
            last_reset INTEGER NOT NULL
        );
    ");

    return $pdo;
}

function getMeta(string $key): ?string {
    $db = getDb();
    $stmt = $db->prepare("SELECT val FROM meta WHERE key = ?");
    $stmt->execute([$key]);
    $row = $stmt->fetch();
    return $row ? $row['val'] : null;
}

function setMeta(string $key, string $val): void {
    $db = getDb();
    $stmt = $db->prepare("INSERT INTO meta(key, val) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET val = excluded.val");
    $stmt->execute([$key, $val]);
}

function readSimLedger(string $startBalance = '1000000000'): array {
    global $CONFIG;
    $db = getDb();
    $stmt = $db->query("SELECT * FROM sim_ledger WHERE id = 1");
    $row = $stmt->fetch();

    $now = (int)(microtime(true) * 1000);

    if (!$row) {
        $ledger = [
            'balance'     => $startBalance, // 1,000 USDC default
            'spentToday'  => '0',
            'perTxCap'    => $CONFIG['per_tx_cap'],
            'dailyCap'    => $CONFIG['daily_cap'],
            'paused'      => false,
            'lastReset'   => $now,
        ];
        writeSimLedger($ledger);
        return $ledger;
    }

    $lastReset = (int)$row['last_reset'];
    $spentToday = $row['spent_today'];

    // Rolling 24h reset
    if ($now - $lastReset > 86400000) {
        $spentToday = '0';
        $lastReset = $now;
        $db->prepare("UPDATE sim_ledger SET spent_today = '0', last_reset = ? WHERE id = 1")->execute([$now]);
    }

    return [
        'balance'    => $row['balance'],
        'spentToday' => $spentToday,
        'perTxCap'   => $row['per_tx_cap'],
        'dailyCap'   => $row['daily_cap'],
        'paused'     => (bool)$row['paused'],
        'lastReset'  => $lastReset,
    ];
}

function writeSimLedger(array $l): void {
    $db = getDb();
    $stmt = $db->prepare("
        INSERT INTO sim_ledger (id, balance, spent_today, per_tx_cap, daily_cap, paused, last_reset)
        VALUES (1, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            balance = excluded.balance,
            spent_today = excluded.spent_today,
            per_tx_cap = excluded.per_tx_cap,
            daily_cap = excluded.daily_cap,
            paused = excluded.paused,
            last_reset = excluded.last_reset
    ");
    $stmt->execute([
        $l['balance'],
        $l['spentToday'],
        $l['perTxCap'],
        $l['dailyCap'],
        $l['paused'] ? 1 : 0,
        $l['lastReset'] ?? (int)(microtime(true) * 1000),
    ]);
}

function getCustomContacts(): array {
    $db = getDb();
    $stmt = $db->query("SELECT name, address, allowlisted FROM custom_contacts");
    $res = [];
    while ($row = $stmt->fetch()) {
        $res[] = [
            'name'        => $row['name'],
            'address'     => strtolower($row['address']),
            'allowlisted' => (bool)$row['allowlisted'],
        ];
    }
    return $res;
}

function addCustomContact(string $name, string $address): void {
    $db = getDb();
    $stmt = $db->prepare("INSERT INTO custom_contacts (address, name, allowlisted) VALUES (?, ?, 1) ON CONFLICT(address) DO UPDATE SET name = excluded.name");
    $stmt->execute([strtolower($address), $name]);
}

function addPending(string $intentId, array $payload): void {
    $db = getDb();
    $stmt = $db->prepare("INSERT INTO pending (intent_id, payload_json, status, created_at) VALUES (?, ?, 'pending', ?)");
    $stmt->execute([
        $intentId,
        json_encode($payload, JSON_UNESCAPED_SLASHES),
        (int)(microtime(true) * 1000)
    ]);
}

function getPending(string $intentId): ?array {
    $db = getDb();
    $stmt = $db->prepare("SELECT * FROM pending WHERE intent_id = ?");
    $stmt->execute([$intentId]);
    $row = $stmt->fetch();
    if (!$row) return null;
    $res = json_decode($row['payload_json'], true);
    $res['status'] = $row['status'];
    return $res;
}

function listPending(): array {
    $db = getDb();
    $stmt = $db->query("SELECT * FROM pending WHERE status = 'pending' ORDER BY created_at DESC");
    $out = [];
    while ($row = $stmt->fetch()) {
        $p = json_decode($row['payload_json'], true);
        $p['status'] = $row['status'];
        $out[] = $p;
    }
    return $out;
}

function setPendingStatus(string $intentId, string $status): void {
    $db = getDb();
    $stmt = $db->prepare("UPDATE pending SET status = ? WHERE intent_id = ?");
    $stmt->execute([$status, $intentId]);
}

function recordTransfer(string $amount): void {
    $db = getDb();
    $stmt = $db->prepare("INSERT INTO transfers (amount, timestamp) VALUES (?, ?)");
    $stmt->execute([$amount, (int)(microtime(true) * 1000)]);
}

function recentAmounts(int $limit = 10): array {
    $db = getDb();
    $stmt = $db->prepare("SELECT amount FROM transfers ORDER BY id DESC LIMIT ?");
    $stmt->execute([$limit]);
    $res = [];
    while ($row = $stmt->fetch()) {
        $res[] = $row['amount'];
    }
    return $res;
}

function recordBlock(): void {
    $db = getDb();
    $stmt = $db->prepare("INSERT INTO blocks (timestamp) VALUES (?)");
    $stmt->execute([(int)(microtime(true) * 1000)]);
}

function blocksInWindow(int $windowMs): int {
    $db = getDb();
    $threshold = (int)(microtime(true) * 1000) - $windowMs;
    $stmt = $db->prepare("SELECT COUNT(*) as c FROM blocks WHERE timestamp >= ?");
    $stmt->execute([$threshold]);
    $row = $stmt->fetch();
    return (int)($row['c'] ?? 0);
}

function resetDemoState(): void {
    global $CONFIG;
    $db = getDb();
    $now = (int)(microtime(true) * 1000);
    $db->exec("DELETE FROM pending; DELETE FROM blocks; DELETE FROM transfers; DELETE FROM custom_contacts;");
    writeSimLedger([
        'balance'    => '1000000000',
        'spentToday' => '0',
        'perTxCap'   => $CONFIG['per_tx_cap'],
        'dailyCap'   => $CONFIG['daily_cap'],
        'paused'     => false,
        'lastReset'  => $now,
    ]);
}
