// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GuardianVault
/// @notice Holds ERC-20 funds. An AI agent key may spend only within owner-defined limits.
/// @dev The owner is the user's wallet. The agent is a low-privilege hot key that can only
///      move funds to allowlisted recipients within per-transaction and daily caps, and can
///      only ever make the system safer by pausing it.
contract GuardianVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------- State ----------
    address public agent;
    bool public paused;

    mapping(address => bool) public recipientOk; // allowlisted recipients
    mapping(address => bool) public tokenOk; // allowlisted tokens
    mapping(address => uint256) public perTxCap; // token => max per agent tx
    mapping(address => uint256) public dailyCap; // token => max per 24h window
    mapping(address => uint256) public spentInWindow;
    mapping(address => uint256) public windowStart;
    mapping(bytes32 => bool) public intentUsed; // replay protection

    // ---------- Events ----------
    event AgentTransfer(bytes32 indexed intentId, address indexed token, address indexed to, uint256 amount);
    event OwnerTransfer(bytes32 indexed intentId, address indexed token, address indexed to, uint256 amount);
    event RecipientSet(address indexed who, bool allowed);
    event TokenSet(address indexed token, bool allowed, uint256 perTx, uint256 daily);
    event AgentRotated(address indexed oldAgent, address indexed newAgent);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    // ---------- Errors ----------
    error NotAgent();
    error NotOwnerOrAgent();
    error IsPaused();
    error NotAllowed();
    error OverPerTxCap();
    error OverDailyCap();
    error IntentReused();
    error ZeroAddress();

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    constructor(address _owner, address _agent) Ownable(_owner) {
        if (_agent == address(0)) revert ZeroAddress();
        agent = _agent;
    }

    // ---------- Agent actions ----------
    /// @notice Spend vault funds to an allowlisted recipient within the owner's caps.
    /// @dev Reverts for any call outside the rules; the agent cannot widen them.
    function transferToken(bytes32 intentId, address token, address to, uint256 amount)
        external
        onlyAgent
        nonReentrant
    {
        if (paused) revert IsPaused();
        if (!tokenOk[token] || !recipientOk[to]) revert NotAllowed();
        if (amount > perTxCap[token]) revert OverPerTxCap();
        if (intentUsed[intentId]) revert IntentReused();

        if (block.timestamp >= windowStart[token] + 1 days) {
            windowStart[token] = block.timestamp;
            spentInWindow[token] = 0;
        }
        if (spentInWindow[token] + amount > dailyCap[token]) revert OverDailyCap();

        intentUsed[intentId] = true;
        spentInWindow[token] += amount;
        IERC20(token).safeTransfer(to, amount);
        emit AgentTransfer(intentId, token, to, amount);
    }

    /// @notice The agent (or owner) may only make the system safer.
    function emergencyPause() external {
        if (msg.sender != owner() && msg.sender != agent) revert NotOwnerOrAgent();
        paused = true;
        emit Paused(msg.sender);
    }

    // ---------- Owner actions ----------
    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function setRecipient(address who, bool allowed) external onlyOwner {
        if (who == address(0)) revert ZeroAddress();
        recipientOk[who] = allowed;
        emit RecipientSet(who, allowed);
    }

    function setToken(address token, bool allowed, uint256 perTx, uint256 daily) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        tokenOk[token] = allowed;
        perTxCap[token] = perTx;
        dailyCap[token] = daily;
        emit TokenSet(token, allowed, perTx, daily);
    }

    function rotateAgent(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert ZeroAddress();
        emit AgentRotated(agent, newAgent);
        agent = newAgent;
    }

    /// @notice Human-approved (T3) transfer. No allowlist or caps: the owner is the authority.
    function ownerTransfer(bytes32 intentId, address token, address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        if (intentUsed[intentId]) revert IntentReused();
        intentUsed[intentId] = true;
        IERC20(token).safeTransfer(to, amount);
        emit OwnerTransfer(intentId, token, to, amount);
    }

    // ---------- Views ----------
    /// @notice Remaining daily allowance for a token, accounting for the rolling window.
    function remainingDaily(address token) external view returns (uint256) {
        if (block.timestamp >= windowStart[token] + 1 days) return dailyCap[token];
        uint256 spent = spentInWindow[token];
        return spent >= dailyCap[token] ? 0 : dailyCap[token] - spent;
    }
}
