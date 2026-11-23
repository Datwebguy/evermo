// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITapeOutCircuits} from "./interfaces/ITapeOut.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title AgentBudget
/// @notice Holds each agent's budget. Every payment the agent's operator makes is decided on chain by Evermo's taped-out
///         budget circuit. Blocked attempts are recorded too, so the owner sees every decision.
contract AgentBudget is ReentrancyGuard {
    using SafeERC20 for IERC20;

    AgentRegistry public immutable registry;
    ITapeOutCircuits public immutable processor;
    uint256 public immutable budgetCircuitId;

    mapping(bytes32 => mapping(address => uint256)) public balanceOf; // agent => token => amount
    mapping(bytes32 => mapping(address => mapping(address => mapping(uint256 => uint256)))) public spent; // agent => holder => token => day

    event Deposited(bytes32 indexed agentId, address indexed token, address indexed from, uint256 amount);
    event Withdrawn(bytes32 indexed agentId, address indexed token, address indexed to, uint256 amount);
    event PaymentDecided(bytes32 indexed agentId, address indexed token, address indexed payee, uint256 amount, bytes1 inputs, bool allowed, bytes32 ref);

    error NotHolder();
    error InsufficientBudget();
    error ZeroAmount();

    constructor(AgentRegistry registry_, ITapeOutCircuits processor_, uint256 budgetCircuitId_) {
        registry = registry_;
        processor = processor_;
        budgetCircuitId = budgetCircuitId_;
    }

    function deposit(bytes32 agentId, address token, uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        registry.holderOf(agentId); // reverts for unknown agents
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balanceOf[agentId][token] += amount;
        emit Deposited(agentId, token, msg.sender, amount);
    }

    function withdraw(bytes32 agentId, address token, uint256 amount, address to) external nonReentrant {
        if (registry.holderOf(agentId) != msg.sender) revert NotHolder();
        if (balanceOf[agentId][token] < amount) revert InsufficientBudget();
        balanceOf[agentId][token] -= amount;
        IERC20(token).safeTransfer(to, amount);
        emit Withdrawn(agentId, token, to, amount);
    }

    /// @notice The circuit inputs a payment would be evaluated with right now (bit 0..3, see docs/CIRCUIT.md).
    function inputsFor(bytes32 agentId, address operator, address token, address payee, uint256 amount)
        public
        view
        returns (bytes1)
    {
        address holder = registry.holderOf(agentId);
        AgentRegistry.Limits memory l = registry.limitsOf(agentId, token);
        uint256 today = spent[agentId][holder][token][block.timestamp / 1 days];
        uint8 bits;
        if (registry.permissionValid(agentId, operator)) bits |= 1;
        if (registry.payeeAllowed(agentId, payee)) bits |= 2;
        if (amount > l.perPayment) bits |= 4;
        if (today + amount > l.daily) bits |= 8;
        return bytes1(bits);
    }

    /// @notice What the budget circuit decides for a payment right now. Free to call.
    function check(bytes32 agentId, address operator, address token, address payee, uint256 amount)
        public
        view
        returns (bytes1 inputs, bool allowed)
    {
        inputs = inputsFor(agentId, operator, token, payee, amount);
        bytes memory out = processor.eval(budgetCircuitId, abi.encodePacked(inputs));
        allowed = out.length > 0 && (uint8(out[0]) & 1) == 1;
    }

    /// @notice Pays from the agent's budget if the budget circuit allows it. Returns false and records the attempt if not.
    function pay(bytes32 agentId, address token, address payee, uint256 amount, bytes32 ref)
        external
        nonReentrant
        returns (bool)
    {
        if (amount == 0) revert ZeroAmount();
        (bytes1 inputs, bool allowed) = check(agentId, msg.sender, token, payee, amount);
        if (allowed && balanceOf[agentId][token] < amount) revert InsufficientBudget();
        emit PaymentDecided(agentId, token, payee, amount, inputs, allowed, ref);
        registry.recordPayment(agentId, allowed, ref, amount, token);
        if (!allowed) return false;
        address holder = registry.holderOf(agentId);
        spent[agentId][holder][token][block.timestamp / 1 days] += amount;
        balanceOf[agentId][token] -= amount;
        IERC20(token).safeTransfer(payee, amount);
        return true;
    }
}
