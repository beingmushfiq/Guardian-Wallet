<?php
// api/risk.php — Risk Assessment Engine

function isLookalike(string $candidate, array $savedAddresses): ?string {
    $c = strtolower(substr($candidate, 2));
    foreach ($savedAddresses as $s) {
        $sv = strtolower(substr($s, 2));
        if ($c === $sv) continue;
        // If first 4 chars and last 4 chars match, it's a lookalike poisoning attack!
        if (substr($c, 0, 4) === substr($sv, 0, 4) && substr($c, -4) === substr($sv, -4)) {
            return $s;
        }
    }
    return null;
}

function medianBig(array $xs): string {
    if (empty($xs)) return '0';
    $nums = array_map('floatval', $xs);
    sort($nums);
    $count = count($nums);
    $mid = (int)floor($count / 2);
    return (string)$nums[$mid];
}

function assessRisk(array $p, array $ctx, array $opts = []): array {
    $score = 0.0;
    $flags = [];
    $notes = [];

    $add = function(float $w, string $flag, string $note) use (&$score, &$flags, &$notes) {
        $score += $w;
        $flags[] = $flag;
        $notes[] = $note;
    };

    // 1. Token Allowlist check
    if (!in_array(strtolower($p['token']), array_map('strtolower', $ctx['tokenAllowlist']))) {
        $add(1.0, 'UNKNOWN_TOKEN', 'Token is not on the approved list');
    }

    // 2. Lookalike address poisoning check
    $look = isLookalike($p['to'], $ctx['recipientAllowlist']);
    if ($look) {
        $add(1.0, 'LOOKALIKE_ADDRESS', "Resembles saved contact $look");
    }

    // 3. New Recipient check
    if (!in_array(strtolower($p['to']), array_map('strtolower', $ctx['recipientAllowlist']))) {
        $add(0.2, 'NEW_RECIPIENT', 'Recipient is not saved');
    }

    // 4. Contract recipient check
    if (!empty($opts['recipientIsContract'])) {
        $add(0.35, 'RECIPIENT_IS_CONTRACT', 'Recipient is a smart contract');
    }

    // 5. Amount anomaly (5x median)
    $med = (float)medianBig($ctx['recentAmounts'] ?? []);
    $amt = (float)$p['amount'];
    if ($med > 0 && $amt > $med * 5.0) {
        $add(0.3, 'AMOUNT_ANOMALY', 'Amount is more than 5x your typical transfer');
    }

    // 6. Injection suspected
    if (!empty($p['injectionHits'])) {
        $hits = implode(', ', $p['injectionHits']);
        $add(0.5, 'INJECTION_SUSPECTED', "Untrusted text matched prompt injection pattern: $hits");
    }

    // 7. Simulation fail
    if (isset($opts['simulationOk']) && !$opts['simulationOk']) {
        $add(1.0, 'SIM_FAIL', 'Simulation indicates the transaction would fail');
    }

    return [
        'score' => min(1.0, $score),
        'flags' => $flags,
        'notes' => $notes,
    ];
}
