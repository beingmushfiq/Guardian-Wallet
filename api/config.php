<?php
// api/config.php — Guardian Wallet Configuration

// Load .env if present
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        $eqPos = strpos($line, '=');
        if ($eqPos !== false) {
            $key = trim(substr($line, 0, $eqPos));
            $val = trim(substr($line, $eqPos + 1));
            if (!getenv($key)) {
                putenv("$key=$val");
                $_ENV[$key] = $val;
            }
        }
    }
}

function env($key, $default = null) {
    $val = getenv($key);
    return ($val !== false && $val !== '') ? $val : $default;
}

$CONFIG = [
    'gemini_api_key' => env('GEMINI_API_KEY', ''),
    'gemini_model'   => env('GEMINI_MODEL', 'gemini-3.1-flash-lite'),
    
    // Blockchain & Venue
    'chain_id'       => (int)env('CHAIN_ID', 84532),
    'rpc_url'        => env('RPC_URL', 'https://sepolia.base.org'),
    'explorer'       => env('EXPLORER', 'https://sepolia.basescan.org'),
    
    'vault_address'  => env('VAULT_ADDRESS', ''),
    'usdc_address'   => strtolower(env('USDC_ADDRESS', '0x036CbD53842c5426634e7929541eC2318f3dCF7e')),
    'owner_address'  => strtolower(env('OWNER_ADDRESS', '0x0000000000000000000000000000000000000001')),
    'agent_pk'       => env('AGENT_PK', ''),
    
    // Limits (6 decimals: 50 USDC = 50,000,000 ; 150 USDC = 150,000,000)
    'per_tx_cap'     => env('PER_TX_CAP', '50000000'),
    'daily_cap'      => env('DAILY_CAP', '150000000'),
    
    'token' => [
        'symbol'   => 'USDC',
        'address'  => strtolower(env('USDC_ADDRESS', '0x036CbD53842c5426634e7929541eC2318f3dCF7e')),
        'decimals' => 6,
    ],
    
    'db_file'    => __DIR__ . '/../guardian.db',
    'audit_file' => __DIR__ . '/../audit.jsonl',
    
    'default_contacts' => [
        [
            'name' => 'Tuition Office',
            'address' => '0x7a0000000000000000000000000000000000c0de',
            'allowlisted' => true,
        ],
        [
            'name' => 'Landlord',
            'address' => '0x7a0000000000000000000000000000000000cafe',
            'allowlisted' => true,
        ],
        [
            'name' => 'Internet Provider',
            'address' => '0x7a0000000000000000000000000000000000beef',
            'allowlisted' => true,
        ],
    ],
];
