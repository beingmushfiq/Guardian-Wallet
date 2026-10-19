# Guardian Wallet — Evidence Directory Index

This directory contains verified machine-checkable evidence artifacts for the 2026 Shenzhen International FinTechathon submission (Topic F: AI Agent Wallet).

### Files in this Directory
1. `onchain_tx_hashes.md`: Confirmed on-chain EVM transactions (Blocks 1–8), gas metrics, contract addresses, and custom error reverts.
2. `broadcast_run_latest.json`: Raw Foundry broadcast receipts from deploying `MockUSDC` and `GuardianVault` to Chain ID 84532.
3. `foundry_test_results.txt`: Terminal execution log of all 31 smart contract tests (28 unit + 3 fuzzing tests).
4. `attacks_results.md`: Complete results table of the 14-case adversarial attack verification suite (14/14 passed).
5. `agent_vitest_results.txt`: Terminal output of the 41-case agent policy, risk, and orchestrator Vitest suite (41/41 passed).
6. `audit_chain_export.jsonl`: Chronological export of the SHA-256 hash-chained operational audit ledger.
7. `audit_verify_output.json`: Output of the dynamic chain verification check proving cryptographic integrity.
