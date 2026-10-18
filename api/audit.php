<?php
// api/audit.php — Tamper-Evident SHA-256 Hash Chained Audit Log

require_once __DIR__ . '/config.php';

function appendAudit(array $entry): array {
    global $CONFIG;
    $file = $CONFIG['audit_file'];

    $prevHash = str_repeat('0', 64);
    if (file_exists($file)) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!empty($lines)) {
            $last = json_decode(end($lines), true);
            if (!empty($last['hash'])) {
                $prevHash = $last['hash'];
            }
        }
    }

    $entry['ts'] = $entry['ts'] ?? (int)(microtime(true) * 1000);
    $entry['prevHash'] = $prevHash;

    // Deterministic payload for hashing
    $hashPayload = $prevHash . '|' . ($entry['status'] ?? '') . '|' . ($entry['detail'] ?? '') . '|' . ($entry['ts'] ?? '');
    $entry['hash'] = hash('sha256', $hashPayload);

    $line = json_encode($entry, JSON_UNESCAPED_SLASHES) . "\n";
    file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

    return $entry;
}

function readAudit(int $limit = 40): array {
    global $CONFIG;
    $file = $CONFIG['audit_file'];
    if (!file_exists($file)) return [];

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (empty($lines)) return [];

    $slice = array_slice($lines, -$limit);
    $out = [];
    foreach (array_reverse($slice) as $l) {
        $decoded = json_decode($l, true);
        if ($decoded) $out[] = $decoded;
    }
    return $out;
}

function verifyChain(): array {
    global $CONFIG;
    $file = $CONFIG['audit_file'];
    if (!file_exists($file)) {
        return ['valid' => true, 'count' => 0, 'firstHash' => null, 'lastHash' => null];
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (empty($lines)) {
        return ['valid' => true, 'count' => 0, 'firstHash' => null, 'lastHash' => null];
    }

    $expectedPrev = str_repeat('0', 64);
    $count = 0;
    $firstHash = null;
    $lastHash = null;

    foreach ($lines as $idx => $line) {
        $row = json_decode($line, true);
        if (!$row) return ['valid' => false, 'error' => "Corrupt JSON at line $idx", 'count' => $count];

        if ($firstHash === null) $firstHash = $row['hash'];
        $lastHash = $row['hash'];

        if (($row['prevHash'] ?? '') !== $expectedPrev) {
            return [
                'valid' => false,
                'error' => "Broken chain at line $idx: expected prevHash $expectedPrev",
                'count' => $count
            ];
        }

        $hashPayload = $row['prevHash'] . '|' . ($row['status'] ?? '') . '|' . ($row['detail'] ?? '') . '|' . ($row['ts'] ?? '');
        $recomputed = hash('sha256', $hashPayload);
        if ($recomputed !== $row['hash']) {
            return [
                'valid' => false,
                'error' => "Hash mismatch at line $idx: recomputed $recomputed vs stored {$row['hash']}",
                'count' => $count
            ];
        }

        $expectedPrev = $row['hash'];
        $count++;
    }

    return [
        'valid'     => true,
        'count'     => $count,
        'firstHash' => $firstHash,
        'lastHash'  => $lastHash,
    ];
}
