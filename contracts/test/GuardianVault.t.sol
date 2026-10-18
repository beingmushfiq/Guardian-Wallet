// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {GuardianVault} from "../src/GuardianVault.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

contract GuardianVaultTest is Test {
    GuardianVault vault;
    MockUSDC usdc;
    address owner = address(0xA11CE);
    address agent = address(0xA9E47);
    address tuition = address(0x7011);
    address rahim = address(0x2B00);
    address stranger = address(0xBAD);

    uint256 constant PER_TX = 50e6;
    uint256 constant DAILY = 150e6;

    bytes32 constant I1 = keccak256("1");
    bytes32 constant I2 = keccak256("2");
    bytes32 constant I3 = keccak256("3");

    function setUp() public {
        usdc = new MockUSDC();
        vault = new GuardianVault(owner, agent);
        usdc.mint(address(vault), 1_000e6);
        vm.startPrank(owner);
        vault.setToken(address(usdc), true, PER_TX, DAILY);
        vault.setRecipient(tuition, true);
        vault.setRecipient(rahim, true);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------
    // Happy paths
    // ------------------------------------------------------------------
    function test_agentCanTransferWithinLimits() public {
        vm.prank(agent);
        vault.transferToken(I1, address(usdc), tuition, 40e6);
        assertEq(usdc.balanceOf(tuition), 40e6);
        assertEq(vault.spentInWindow(address(usdc)), 40e6);
        assertTrue(vault.intentUsed(I1));
    }

    function test_emitsAgentTransfer() public {
        vm.expectEmit(true, true, true, true, address(vault));
        emit GuardianVault.AgentTransfer(I1, address(usdc), tuition, 40e6);
        vm.prank(agent);
        vault.transferToken(I1, address(usdc), tuition, 40e6);
    }

    function test_ownerTransferToNewRecipient() public {
        vm.prank(owner);
        vault.ownerTransfer(keccak256("o"), address(usdc), stranger, 200e6);
        assertEq(usdc.balanceOf(stranger), 200e6);
    }

    // ------------------------------------------------------------------
    // Limits
    // ------------------------------------------------------------------
    function test_revert_nonAllowlistedRecipient() public {
        vm.prank(agent);
        vm.expectRevert(GuardianVault.NotAllowed.selector);
        vault.transferToken(I2, address(usdc), stranger, 10e6);
    }

    function test_revert_nonAllowlistedToken() public {
        MockUSDC other = new MockUSDC();
        vm.prank(agent);
        vm.expectRevert(GuardianVault.NotAllowed.selector);
        vault.transferToken(I2, address(other), tuition, 10e6);
    }

    function test_revert_overPerTxCap() public {
        vm.prank(agent);
        vm.expectRevert(GuardianVault.OverPerTxCap.selector);
        vault.transferToken(I3, address(usdc), tuition, 51e6);
    }

    function test_revert_overDailyCap() public {
        vm.startPrank(agent);
        vault.transferToken(keccak256("a"), address(usdc), tuition, 50e6);
        vault.transferToken(keccak256("b"), address(usdc), tuition, 50e6);
        vault.transferToken(keccak256("c"), address(usdc), tuition, 50e6);
        vm.expectRevert(GuardianVault.OverDailyCap.selector);
        vault.transferToken(keccak256("d"), address(usdc), tuition, 1e6);
        vm.stopPrank();
    }

    function test_dailyWindowRollsOver() public {
        vm.startPrank(agent);
        vault.transferToken(keccak256("a"), address(usdc), tuition, 50e6);
        vault.transferToken(keccak256("b"), address(usdc), tuition, 50e6);
        vault.transferToken(keccak256("c"), address(usdc), tuition, 50e6);
        vm.warp(block.timestamp + 1 days + 1);
        vault.transferToken(keccak256("d"), address(usdc), tuition, 50e6);
        vm.stopPrank();
        assertEq(vault.spentInWindow(address(usdc)), 50e6);
    }

    function test_remainingDaily() public {
        assertEq(vault.remainingDaily(address(usdc)), DAILY);
        vm.prank(agent);
        vault.transferToken(I1, address(usdc), tuition, 40e6);
        assertEq(vault.remainingDaily(address(usdc)), DAILY - 40e6);
        vm.warp(block.timestamp + 1 days + 1);
        assertEq(vault.remainingDaily(address(usdc)), DAILY);
    }

    function test_revert_replayedIntent() public {
        vm.startPrank(agent);
        vault.transferToken(keccak256("x"), address(usdc), tuition, 10e6);
        vm.expectRevert(GuardianVault.IntentReused.selector);
        vault.transferToken(keccak256("x"), address(usdc), tuition, 10e6);
        vm.stopPrank();
    }

    function test_revert_replayAcrossOwnerAndAgent() public {
        vm.prank(agent);
        vault.transferToken(keccak256("shared"), address(usdc), tuition, 10e6);
        vm.prank(owner);
        vm.expectRevert(GuardianVault.IntentReused.selector);
        vault.ownerTransfer(keccak256("shared"), address(usdc), stranger, 1e6);
    }

    function test_revert_insufficientBalance() public {
        MockUSDC empty = new MockUSDC();
        vm.prank(owner);
        vault.setToken(address(empty), true, PER_TX, DAILY);
        vm.prank(agent);
        vm.expectRevert();
        vault.transferToken(keccak256("e"), address(empty), tuition, 10e6);
    }

    // ------------------------------------------------------------------
    // Pause / kill switch
    // ------------------------------------------------------------------
    function test_revert_whenPaused() public {
        vm.prank(agent);
        vault.emergencyPause();
        vm.prank(agent);
        vm.expectRevert(GuardianVault.IsPaused.selector);
        vault.transferToken(keccak256("p"), address(usdc), tuition, 1e6);
    }

    function test_ownerCanPauseAndUnpause() public {
        vm.prank(owner);
        vault.emergencyPause();
        assertTrue(vault.paused());
        vm.prank(owner);
        vault.unpause();
        assertFalse(vault.paused());
    }

    function test_agentCannotUnpause() public {
        vm.prank(agent);
        vault.emergencyPause();
        vm.prank(agent);
        vm.expectRevert();
        vault.unpause();
    }

    function test_strangerCannotPause() public {
        vm.prank(stranger);
        vm.expectRevert(GuardianVault.NotOwnerOrAgent.selector);
        vault.emergencyPause();
    }

    // ------------------------------------------------------------------
    // Privilege boundaries
    // ------------------------------------------------------------------
    function test_agentCannotChangeConfig() public {
        vm.startPrank(agent);
        vm.expectRevert();
        vault.setRecipient(stranger, true);
        vm.expectRevert();
        vault.setToken(address(usdc), true, type(uint256).max, type(uint256).max);
        vm.expectRevert();
        vault.rotateAgent(stranger);
        vm.expectRevert();
        vault.unpause();
        vm.stopPrank();
    }

    function test_nonAgentCannotTransfer() public {
        vm.prank(stranger);
        vm.expectRevert(GuardianVault.NotAgent.selector);
        vault.transferToken(keccak256("z"), address(usdc), tuition, 1e6);
    }

    function test_nonOwnerCannotOwnerTransfer() public {
        vm.prank(agent);
        vm.expectRevert();
        vault.ownerTransfer(keccak256("z"), address(usdc), stranger, 1e6);
    }

    function test_rotateAgentRevokesOldAgent() public {
        vm.prank(owner);
        vault.rotateAgent(address(0xBEEF));
        vm.prank(agent);
        vm.expectRevert(GuardianVault.NotAgent.selector);
        vault.transferToken(keccak256("r"), address(usdc), tuition, 1e6);
    }

    function test_setRecipientCanRevoke() public {
        vm.prank(owner);
        vault.setRecipient(tuition, false);
        vm.prank(agent);
        vm.expectRevert(GuardianVault.NotAllowed.selector);
        vault.transferToken(keccak256("rev"), address(usdc), tuition, 1e6);
    }

    // ------------------------------------------------------------------
    // Constructor / fuzz
    // ------------------------------------------------------------------
    function test_revert_zeroAgent() public {
        vm.expectRevert(GuardianVault.ZeroAddress.selector);
        new GuardianVault(owner, address(0));
    }

    function testFuzz_neverExceedsPerTxCap(uint256 amt) public {
        amt = bound(amt, PER_TX + 1, 1_000e6);
        vm.prank(agent);
        vm.expectRevert(GuardianVault.OverPerTxCap.selector);
        vault.transferToken(keccak256(abi.encode(amt)), address(usdc), tuition, amt);
    }

    function testFuzz_transferWithinCapSucceeds(uint256 amt) public {
        amt = bound(amt, 1, PER_TX);
        vm.prank(agent);
        vault.transferToken(keccak256(abi.encode(amt)), address(usdc), tuition, amt);
        assertEq(usdc.balanceOf(tuition), amt);
    }

    function test_revert_zeroAmount() public {
        vm.prank(agent);
        vm.expectRevert(GuardianVault.ZeroAmount.selector);
        vault.transferToken(keccak256("zero"), address(usdc), tuition, 0);
    }

    function test_revert_invalidRecipient_zeroAddress() public {
        vm.prank(agent);
        vm.expectRevert(GuardianVault.InvalidRecipient.selector);
        vault.transferToken(keccak256("zeroTo"), address(usdc), address(0), 10e6);
    }

    function test_revert_invalidRecipient_self() public {
        vm.prank(agent);
        vm.expectRevert(GuardianVault.InvalidRecipient.selector);
        vault.transferToken(keccak256("selfTo"), address(usdc), address(vault), 10e6);
    }

    function test_revert_invalidCap_perTxOverDaily() public {
        vm.prank(owner);
        vm.expectRevert(GuardianVault.InvalidCap.selector);
        vault.setToken(address(usdc), true, 200e6, 100e6); // perTx 200 > daily 100
    }

    function test_revert_ownerTransfer_zeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(GuardianVault.ZeroAmount.selector);
        vault.ownerTransfer(keccak256("ownerZero"), address(usdc), stranger, 0);
    }

    function test_revert_ownerTransfer_self() public {
        vm.prank(owner);
        vm.expectRevert(GuardianVault.InvalidRecipient.selector);
        vault.ownerTransfer(keccak256("ownerSelf"), address(usdc), address(vault), 50e6);
    }

    function testFuzz_dailyCapNeverExceeded(uint256 a, uint256 b) public {
        a = bound(a, 1, PER_TX);
        b = bound(b, 1, PER_TX);
        vm.startPrank(agent);
        vault.transferToken(keccak256(abi.encode("a", a)), address(usdc), tuition, a);
        if (a + b > DAILY) {
            vm.expectRevert(GuardianVault.OverDailyCap.selector);
            vault.transferToken(keccak256(abi.encode("b", b)), address(usdc), tuition, b);
        } else {
            vault.transferToken(keccak256(abi.encode("b", b)), address(usdc), tuition, b);
        }
        vm.stopPrank();
        assertLe(vault.spentInWindow(address(usdc)), DAILY);
    }
}
