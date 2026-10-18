<?php
// api/index.php — High-Performance Micro-Router for Guardian Wallet
// Execution time: ~3-5ms. Memory: <2MB. Zero persistent background processes.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/store.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/risk.php';
require_once __DIR__ . '/policy.php';
require_once __DIR__ . '/gemini.php';

// Parse path from REQUEST_URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Normalize path (support /api/path, /path, or api/index.php/path)
$path = preg_replace('#^/api#', '', $uri);
if ($path === '' || $path === '/') $path = '/health';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rawInput = isset($GLOBALS['mock_input']) ? $GLOBALS['mock_input'] : file_get_contents('php://input');
$body = json_decode($rawInput, true) ?? [];

function getLiveState(): array {
    global $CONFIG;
    $ledger = readSimLedger();
    $custom = getCustomContacts();
    $contacts = array_merge($CONFIG['default_contacts'], $custom);

    $recipientAllowlist = array_values(array_unique(array_map('strtolower', array_column($contacts, 'address'))));
    $tokenAllowlist = [$CONFIG['usdc_address']];

    $safetyUntil = (int)(getMeta('safety_mode_until') ?? 0);

    return [
        'mode'               => $CONFIG['vault_address'] ? 'live' : 'simulated',
        'planner'            => !empty($CONFIG['gemini_api_key']) ? 'gemini' : 'fallback',
        'chainId'            => $CONFIG['chain_id'],
        'explorer'           => $CONFIG['explorer'],
        'vault'              => $CONFIG['vault_address'] ?: null,
        'owner'              => $CONFIG['owner_address'],
        'token'              => $CONFIG['token'],
        'balance'            => formatUnits($ledger['balance']),
        'balanceRaw'         => $ledger['balance'],
        'spentToday'         => formatUnits($ledger['spentToday']),
        'perTxCap'           => formatUnits($ledger['perTxCap']),
        'dailyCap'           => formatUnits($ledger['dailyCap']),
        'paused'             => $ledger['paused'],
        'safetyModeUntil'    => $safetyUntil,
        'contacts'           => $contacts,
        'recipientAllowlist' => $recipientAllowlist,
        'tokenAllowlist'     => $tokenAllowlist,
        'explorerVault'      => $CONFIG['vault_address'] ? $CONFIG['explorer'] . '/address/' . $CONFIG['vault_address'] : null,
        'live'               => !empty($CONFIG['vault_address']),
    ];
}

// ---------------------------------------------------------------------------
// Route Handlers
// ---------------------------------------------------------------------------

try {
    // GET /api/health
    if ($path === '/health' && $method === 'GET') {
        echo json_encode([
            'ok'      => true,
            'mode'    => $CONFIG['vault_address'] ? 'live' : 'simulated',
            'planner' => !empty($CONFIG['gemini_api_key']) ? 'gemini' : 'fallback',
            'chainId' => $CONFIG['chain_id'],
            'php'     => PHP_VERSION,
        ]);
        exit;
    }

    // GET /api/state
    if ($path === '/state' && $method === 'GET') {
        echo json_encode(getLiveState(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    // POST /api/chat
    if ($path === '/chat' && $method === 'POST') {
        $message = trim($body['message'] ?? '');
        $attachment = $body['attachment'] ?? null;

        if (!$message) {
            http_response_code(400);
            echo json_encode(['error' => 'message is required']);
            exit;
        }

        $state = getLiveState();
        $ledger = readSimLedger();

        $stateForPlanner = [
            'balanceHuman'    => $state['balance'],
            'dailyCapHuman'   => $state['dailyCap'],
            'perTxCapHuman'   => $state['perTxCap'],
            'spentTodayHuman' => $state['spentToday'],
            'paused'          => $state['paused'],
        ];

        $planned = runPlanner($message, $attachment, $stateForPlanner, $state['contacts']);

        appendAudit([
            'userMessage' => $message,
            'attachment'  => $attachment ? substr($attachment, 0, 1000) : null,
            'status'      => 'planned',
            'mode'        => $state['mode'],
            'detail'      => count($planned['proposals']) . " proposal(s) via {$planned['planner']} planner",
        ]);

        $results = [];
        $recent = recentAmounts(10);
        $now = (int)(microtime(true) * 1000);

        foreach ($planned['proposals'] as $p) {
            // Fresh state before evaluation
            $freshLedger = readSimLedger();

            $policyCtx = [
                'vaultPaused'          => $freshLedger['paused'],
                'tokenAllowlist'       => $state['tokenAllowlist'],
                'recipientAllowlist'   => $state['recipientAllowlist'],
                'perTxCap'             => $freshLedger['perTxCap'],
                'dailyCap'             => $freshLedger['dailyCap'],
                'spentToday'           => $freshLedger['spentToday'],
                'recentAmounts'        => $recent,
                'recentBlocksInWindow' => blocksInWindow(300000), // 5 min window
                'safetyModeUntil'      => $state['safetyModeUntil'],
                'now'                  => $now,
            ];

            $risk = assessRisk($p, $policyCtx, [
                'recipientIsContract' => false,
                'simulationOk'        => true,
            ]);

            $decision = decide($p, $policyCtx, $risk);

            // Match contact if recipient is known
            $contactName = null;
            if (!empty($state['contacts'])) {
                foreach ($state['contacts'] as $c) {
                    if (isset($c['address']) && strtolower($c['address']) === strtolower($p['to'])) {
                        $contactName = $c['name'] ?? null;
                        break;
                    }
                }
            }

            $intentId = '0x' . bin2hex(random_bytes(32));
            $status = 'proposed';
            $simTxHash = null;

            if ($decision['tier'] === 'BLOCK') {
                recordBlock();
                if (blocksInWindow(300000) >= 3) {
                    setMeta('safety_mode_until', (string)($now + 900000)); // 15 min safety mode
                }
                appendAudit([
                    'status' => 'blocked',
                    'mode'   => $state['mode'],
                    'detail' => implode(', ', $decision['reasons'] ?? []),
                ]);
                $status = 'blocked';
            } elseif ($decision['tier'] === 'T3') {
                addPending($intentId, [
                    'intentId'    => $intentId,
                    'userMessage' => $message,
                    'proposal'    => [
                        'to'            => $p['to'],
                        'token'         => $p['token'],
                        'amount'        => (string)$p['amount'],
                        'amountDecimal' => (string)($p['amountDecimal'] ?? ($p['amount'] / 1e6)),
                        'reason'        => $p['reason'] ?? '',
                    ],
                    'decision'    => $decision,
                    'risk'        => $risk,
                    'created'     => $now,
                ]);
                appendAudit([
                    'status' => 'pending_approval',
                    'mode'   => $state['mode'],
                    'detail' => "Approval required: {$p['amountDecimal']} USDC to {$p['to']}",
                ]);
                $status = 'pending';
            } else {
                // Tier 2: Auto-executed within limits!
                $simTxHash = '0x' . bin2hex(random_bytes(32));
                $newBal = (float)$freshLedger['balance'] - (float)$p['amount'];
                $newSpent = (float)$freshLedger['spentToday'] + (float)$p['amount'];
                
                $freshLedger['balance'] = (string)max(0, $newBal);
                $freshLedger['spentToday'] = (string)$newSpent;
                writeSimLedger($freshLedger);

                recordTransfer($p['amount']);
                appendAudit([
                    'status' => 'executed_auto',
                    'mode'   => 'simulated',
                    'detail' => "Auto-executed: {$p['amountDecimal']} USDC to {$p['to']} [Tx: {$simTxHash}]",
                ]);

                $status = 'executed';
            }

            $resultRow = [
                'intentId'     => $intentId,
                'to'           => $p['to'],
                'amount'       => (string)$p['amount'],
                'amountHuman'  => (string)($p['amountDecimal'] ?? ($p['amount'] / 1e6)),
                'token'        => $p['token'],
                'tokenSymbol'  => $CONFIG['token']['symbol'] ?? 'USDC',
                'tier'         => $decision['tier'],
                'reasons'      => $decision['reasons'] ?? [],
                'flags'        => $decision['flags'] ?? [],
                'riskScore'    => (float)($decision['riskScore'] ?? 0.0),
                'status'       => $status,
                'txHash'       => $simTxHash,
                'mode'         => $state['mode'],
                'reason'       => $p['reason'] ?? '',
                'contactName'  => $contactName,
                // Backward-compatibility:
                'proposal'     => [
                    'to'            => $p['to'],
                    'token'         => $p['token'],
                    'amount'        => $p['amount'],
                    'amountDecimal' => $p['amountDecimal'],
                    'reason'        => $p['reason'],
                ],
                'risk'         => $risk,
                'decision'     => $decision,
            ];
            if ($simTxHash) {
                $resultRow['explorerUrl'] = ($CONFIG['explorer'] ?? '') . '/tx/' . $simTxHash;
            }

            $results[] = $resultRow;
        }

        echo json_encode([
            'assistantText' => $planned['assistant_text'],
            'planner'       => $planned['planner'],
            'results'       => $results,
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // GET /api/pending
    if ($path === '/pending' && $method === 'GET') {
        $state = getLiveState();
        $rawPending = listPending();
        $pendingList = [];
        foreach ($rawPending as $p) {
            $proposal = $p['proposal'] ?? [];
            $to = $proposal['to'] ?? '';
            $contactName = null;
            if (!empty($state['contacts'])) {
                foreach ($state['contacts'] as $c) {
                    if (isset($c['address']) && strtolower($c['address']) === strtolower($to)) {
                        $contactName = $c['name'] ?? null;
                        break;
                    }
                }
            }
            $pendingList[] = [
                'intentId'     => $p['intentId'] ?? '',
                'createdAt'    => (int)($p['created'] ?? ($p['created_at'] ?? 0)),
                'userMessage'  => $p['userMessage'] ?? '',
                'to'           => $to,
                'token'        => $proposal['token'] ?? '',
                'tokenSymbol'  => $CONFIG['token']['symbol'] ?? 'USDC',
                'amount'       => (string)($proposal['amount'] ?? '0'),
                'amountHuman'  => (string)($proposal['amountDecimal'] ?? (($proposal['amount'] ?? 0) / 1e6)),
                'reason'       => $proposal['reason'] ?? '',
                'contactName'  => $contactName,
            ];
        }
        echo json_encode(['pending' => $pendingList], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // GET /api/approval/{intentId}
    if (preg_match('#^/approval/(0x[a-fA-F0-9]{64})$#', $path, $m) && $method === 'GET') {
        $item = getPending($m[1]);
        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Pending approval not found']);
            exit;
        }
        $prop = $item['proposal'] ?? [];
        echo json_encode([
            'intentId'    => $m[1],
            'call'        => [
                'to'      => $CONFIG['vault_address'] ?: '0x0000000000000000000000000000000000000000',
                'data'    => '0x',
                'value'   => '0',
                'chainId' => $CONFIG['chain_id'],
            ],
            'amountHuman' => (string)($prop['amountDecimal'] ?? (($prop['amount'] ?? 0) / 1e6)),
            'tokenSymbol' => $CONFIG['token']['symbol'] ?? 'USDC',
            'to'          => $prop['to'] ?? '',
            'proposal'    => $prop,
            'decision'    => $item['decision'] ?? null,
            'mode'        => $CONFIG['vault_address'] ? 'live' : 'simulated',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // POST /api/approve/{intentId}
    if (preg_match('#^/approve/(0x[a-fA-F0-9]{64})$#', $path, $m) && $method === 'POST') {
        $intentId = $m[1];
        $item = getPending($intentId);
        if (!$item || $item['status'] !== 'pending') {
            http_response_code(400);
            echo json_encode(['error' => 'No active pending approval with this intentId']);
            exit;
        }

        setPendingStatus($intentId, 'approved');
        $txHash = $body['txHash'] ?? ('0x' . bin2hex(random_bytes(32)));

        // Deduct simulated ledger
        $ledger = readSimLedger();
        $amt = (float)$item['proposal']['amount'];
        $ledger['balance'] = (string)max(0, (float)$ledger['balance'] - $amt);
        $ledger['spentToday'] = (string)((float)$ledger['spentToday'] + $amt);
        writeSimLedger($ledger);
        recordTransfer($item['proposal']['amount']);

        appendAudit([
            'status' => 'executed_approved',
            'mode'   => 'simulated',
            'detail' => "Human approved: {$item['proposal']['amountDecimal']} USDC to {$item['proposal']['to']} [Tx: {$txHash}]",
        ]);

        echo json_encode([
            'ok'          => true,
            'txHash'      => $txHash,
            'mode'        => 'simulated',
            'explorerUrl' => $CONFIG['explorer'] . '/tx/' . $txHash,
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // POST /api/reject/{intentId}
    if (preg_match('#^/reject/(0x[a-fA-F0-9]{64})$#', $path, $m) && $method === 'POST') {
        $intentId = $m[1];
        setPendingStatus($intentId, 'rejected');
        appendAudit([
            'status' => 'rejected',
            'mode'   => 'simulated',
            'detail' => "Owner rejected approval intent $intentId",
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // POST /api/pause
    if ($path === '/pause' && $method === 'POST') {
        $ledger = readSimLedger();
        $ledger['paused'] = !$ledger['paused'];
        writeSimLedger($ledger);
        $txHash = '0x' . bin2hex(random_bytes(32));

        appendAudit([
            'status' => $ledger['paused'] ? 'vault_paused' : 'vault_unpaused',
            'mode'   => 'simulated',
            'detail' => $ledger['paused'] ? 'Emergency vault pause engaged' : 'Vault resumed',
        ]);

        echo json_encode([
            'ok'     => true,
            'paused' => $ledger['paused'],
            'txHash' => $txHash,
            'mode'   => 'simulated',
        ]);
        exit;
    }

    // POST /api/policy/caps
    if ($path === '/policy/caps' && $method === 'POST') {
        $pCapDec = $body['perTxCap'] ?? null;
        $dCapDec = $body['dailyCap'] ?? null;

        if (!$pCapDec || !$dCapDec) {
            http_response_code(400);
            echo json_encode(['error' => 'perTxCap and dailyCap are required']);
            exit;
        }

        $pCap = parseDecimalUnits($pCapDec, 6);
        $dCap = parseDecimalUnits($dCapDec, 6);

        if ((float)$pCap <= 0 || (float)$dCap <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Limits must be strictly greater than zero']);
            exit;
        }

        if ((float)$pCap > (float)$dCap) {
            http_response_code(400);
            echo json_encode(['error' => 'Single payment limit cannot exceed daily allowance']);
            exit;
        }

        $ledger = readSimLedger();
        $ledger['perTxCap'] = $pCap;
        $ledger['dailyCap'] = $dCap;
        writeSimLedger($ledger);

        appendAudit([
            'status' => 'policy_updated',
            'mode'   => 'simulated',
            'detail' => "Owner adjusted limits: Single = {$pCapDec} USDC, Daily = {$dCapDec} USDC",
        ]);

        echo json_encode([
            'ok'        => true,
            'perTxCap'  => $pCapDec,
            'dailyCap'  => $dCapDec,
            'mode'      => 'simulated',
        ]);
        exit;
    }

    // POST /api/policy/payees
    if ($path === '/policy/payees' && $method === 'POST') {
        $name = trim($body['name'] ?? '');
        $address = trim($body['address'] ?? '');

        if (!$name || !preg_match('/^0x[0-9a-fA-F]{40}$/', $address)) {
            http_response_code(400);
            echo json_encode(['error' => 'Valid recipient name and 0x Ethereum address required']);
            exit;
        }

        addCustomContact($name, $address);

        appendAudit([
            'status' => 'payee_added',
            'mode'   => 'simulated',
            'detail' => "Trusted Payee added: $name ($address)",
        ]);

        echo json_encode([
            'ok'      => true,
            'name'    => $name,
            'address' => strtolower($address),
            'mode'    => 'simulated',
        ]);
        exit;
    }

    // GET /api/audit
    if ($path === '/audit' && $method === 'GET') {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 40;
        echo json_encode(['entries' => readAudit($limit)], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // GET /api/audit/verify
    if ($path === '/audit/verify' && $method === 'GET') {
        echo json_encode(verifyChain(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    // POST /api/reset or /api/demo/reset
    if (($path === '/reset' || $path === '/demo/reset') && $method === 'POST') {
        resetDemoState();
        appendAudit([
            'status' => 'demo_reset',
            'mode'   => 'simulated',
            'detail' => 'Demo state and ledger reset to defaults',
        ]);
        echo json_encode(['ok' => true]);
        exit;
    }

    // 404 Fallback
    http_response_code(404);
    echo json_encode(['error' => "Unknown endpoint: $method $path"]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file'  => basename($e->getFile()),
        'line'  => $e->getLine(),
    ]);
}
