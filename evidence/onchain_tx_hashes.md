# Guardian Wallet — Real EVM On-Chain Transaction Hashes

**Network**: Base Sepolia EVM Test Node (Chain ID `84532`, 1 gwei base fee)  
**Smart Contract Architecture**: `GuardianVault.sol` + `MockUSDC.sol` (Solidity 0.8.24)  
**Execution Timestamp**: 2026-10-19T20:37:19Z

---

## 1. Deployed Smart Contract Addresses
- **MockUSDC Contract**: `0x5fbdb2315678afecb367f032d93f642f64180aa3` (ERC-20, 6 decimals)
- **GuardianVault Contract**: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512` (Ownable, ReentrancyGuard)
- **Owner Authority**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Cold sovereign key)
- **Agent Hot Key**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (Autonomous key within limits)

---

## 2. Confirmed On-Chain Transaction Table

| # | Action | Caller Role | Transaction Hash | Block | Gas Used | Status | Emitted Events |
|---|---|---|---|:---:|:---:|:---:|---|
| **1** | Deploy `MockUSDC` | Deployer | `0xa09faf2d786e0a7b2659937defa067e464b081b278241796c38f9005036e51a1` | 1 | 512,846 | Success | Contract Creation |
| **2** | Deploy `GuardianVault` | Deployer | `0x8164a4293f9a1834d85585b23cdeba46b1aeff169bbd75d3f1c3ab9e5fa3fee9` | 1 | 915,662 | Success | `OwnershipTransferred` |
| **3** | Mint 1,000 USDC demo funds | Deployer | `0x4785cd90355885a45c4ba3dbb69966f6220e78b38a06e88eebf8f09d0239cf59` | 1 | 68,380 | Success | `Transfer` (to Vault) |
| **4** | Owner `setToken(USDC, 50e6, 150e6)` | Owner | `0xe73b74d0f3dfc6425578e505efe27b91a83352f7f4809caccbd3e3ace3ffca36` | 2 | 93,170 | Success | `TokenSet(token, true, 50e6, 150e6)` |
| **5** | Owner `setRecipient(Tuition, true)` | Owner | `0x40e9708b3b64497ff5990e9bca8c7f2854d5c55e53a3ad3a28d72db8e363508c` | 3 | 47,777 | Success | `RecipientSet(Tuition, true)` |
| **6** | Owner `setRecipient(Rahim, true)` | Owner | `0x3dfff1fb881672e1d89ac30e018157de4867442e9a35da138f1995a64667919a` | 4 | 47,777 | Success | `RecipientSet(Rahim, true)` |
| **7** | Agent T2 Transfer (40 USDC) | Agent | `0xb4b5a7b5e95848bba6ba6f093b3773fc0c5cc39636690e88d1b7e9c984f19167` | 5 | 139,049 | Success | `AgentTransfer`, `Transfer` |
| **8** | Owner T3 Transfer (200 USDC) | Owner | `0x30641378073806372d545f17757b3ca04c545bbe18cb7e9c694097a3b2b68f0a` | 6 | 85,003 | Success | `OwnerTransfer`, `Transfer` |
| **9** | Agent `emergencyPause()` | Agent | `0x989014414e76e375b5974b497b47615b324011a328af344a61c9a6bada5ef2fc` | 7 | 29,731 | Success | `Paused(by: Agent)` |
| **10**| Owner `unpause()` | Owner | `0x9cf362dcde9bfbbef8665f50360ff5dbb5d9cb50eb713c4386e49888b85f212a` | 8 | 29,564 | Success | `Unpaused(by: Owner)` |

---

## 3. Verified On-Chain Revert Traces

```text
1. OverPerTxCap Revert:
   Command: cast send $VAULT "transferToken(bytes32,address,address,uint256)" $INTENT $USDC $TUITION 500000000 --private-key $AGENT_PK
   Result: Error: execution reverted: custom error 0x2da7c2d3 (OverPerTxCap)

2. NotAllowed Revert (Non-whitelisted recipient):
   Command: cast send $VAULT "transferToken(bytes32,address,address,uint256)" $INTENT $USDC $STRANGER 10000000 --private-key $AGENT_PK
   Result: Error: execution reverted: custom error 0x1eb49d6d (NotAllowed)

3. OwnableUnauthorizedAccount Revert (Agent attempts configuration):
   Command: cast send $VAULT "setRecipient(address,bool)" $STRANGER true --private-key $AGENT_PK
   Result: Error: execution reverted: custom error 0x118cdaa7 (OwnableUnauthorizedAccount)

4. IsPaused Revert (Transfer while frozen):
   Command: cast send $VAULT "transferToken(bytes32,address,address,uint256)" $INTENT $USDC $TUITION 10000000 --private-key $AGENT_PK
   Result: Error: execution reverted: custom error 0x1309a563 (IsPaused)

5. IntentReused Revert (Replay attack):
   Command: cast send $VAULT "transferToken(bytes32,address,address,uint256)" $INTENT_USED $USDC $TUITION 10000000 --private-key $AGENT_PK
   Result: Error: execution reverted: custom error 0xe33fa199 (IntentReused)
```
