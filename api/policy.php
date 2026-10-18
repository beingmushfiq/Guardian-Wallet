<?php
// api/policy.php — Deterministic Policy Engine (Zero-Trust Boundary)

function decide(array $p, array $ctx, array $risk): array {
    $out = function(string $tier, string $reason, array $extra = []) use ($risk) {
        return [
            'tier'      => $tier,
            'reasons'   => array_merge([$reason], $extra),
            'flags'     => $risk['flags'] ?? [],
            'riskScore' => $risk['score'] ?? 0.0,
        ];
    };

    $amt = (float)$p['amount'];
    if ($amt <= 0) {
        return $out('BLOCK', 'Transfer amount must be strictly greater than zero.');
    }

    $to = strtolower($p['to']);
    if ($to === '0x0000000000000000000000000000000000000000') {
        return $out('BLOCK', 'Invalid recipient: zero address is not allowed.');
    }

    if (!empty($ctx['vaultPaused'])) {
        return $out('BLOCK', 'Wallet is paused by the owner or safety system.');
    }

    if (!in_array(strtolower($p['token']), array_map('strtolower', $ctx['tokenAllowlist']))) {
        return $out('BLOCK', 'Token is not on the approved list.');
    }

    if (in_array('LOOKALIKE_ADDRESS', $risk['flags'])) {
        return $out('BLOCK', 'Address resembles a saved contact but is different. Possible address poisoning attack.');
    }

    if ($risk['score'] >= 0.7) {
        return $out('BLOCK', 'Risk score too high: ' . implode(', ', $risk['flags']) . '.');
    }

    if (in_array('SIM_FAIL', $risk['flags'])) {
        return $out('BLOCK', 'Simulation shows this transaction would fail.');
    }

    if (!empty($p['tainted']) && !empty($p['injectionHits'])) {
        return $out('T1', 'Instructions came from an untrusted document. Review manually.');
    }

    if (($ctx['safetyModeUntil'] ?? 0) > ($ctx['now'] ?? 0)) {
        return $out('T1', 'Safety mode: several blocked attempts recently.');
    }

    // Check allowlisted recipient
    $isSaved = in_array($to, array_map('strtolower', $ctx['recipientAllowlist']));
    if (!$isSaved) {
        return $out('T3', 'New recipient. Your approval is required.');
    }

    // Caps check (amounts stored in 6 decimal base units, e.g. 50,000,000 = 50 USDC)
    $perTxCap = (float)$ctx['perTxCap'];
    $dailyCap = (float)$ctx['dailyCap'];
    $spentToday = (float)$ctx['spentToday'];

    if ($amt > $perTxCap) {
        return $out('T3', 'Amount exceeds the single-payment auto-approval limit.');
    }

    if ($spentToday + $amt > $dailyCap) {
        return $out('T3', 'Daily auto-approval budget would be exceeded.');
    }

    if ($risk['score'] >= 0.4) {
        return $out('T3', 'Moderate risk: ' . implode(', ', $risk['flags']) . '. Approval required.');
    }

    if (!empty($p['tainted'])) {
        $underTenth = $amt <= ($perTxCap / 10.0);
        if (!$isSaved || !$underTenth) {
            return $out('T3', 'Document instructions require explicit owner confirmation because amount exceeds the safe micro-limit (10% of per-tx cap).');
        }
    }

    return $out('T2', 'Within your limits to a trusted recipient. Executed automatically.');
}
