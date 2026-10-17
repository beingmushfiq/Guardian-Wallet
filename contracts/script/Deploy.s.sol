// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {GuardianVault} from "../src/GuardianVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/// @notice Deploys MockUSDC + GuardianVault and seeds the vault with demo funds.
/// @dev Owner configuration (setToken / setRecipient) is intentionally executed from the
///      owner's own wallet, not the deployer key. Use the cast commands in docs or the UI.
contract Deploy is Script {
    function run() external {
        address owner = vm.envAddress("OWNER_ADDRESS");
        address agent = vm.envAddress("AGENT_ADDRESS");
        uint256 deposit = vm.envOr("DEMO_DEPOSIT", uint256(1_000e6));

        vm.startBroadcast(vm.envUint("DEPLOYER_PK"));
        MockUSDC usdc = new MockUSDC();
        GuardianVault vault = new GuardianVault(owner, agent);
        usdc.mint(address(vault), deposit);
        vm.stopBroadcast();

        console.log("CHAIN_ID:", block.chainid);
        console.log("USDC    :", address(usdc));
        console.log("VAULT   :", address(vault));
        console.log("OWNER   :", owner);
        console.log("AGENT   :", agent);
    }
}
