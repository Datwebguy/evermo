// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ITapeOutFactory} from "./interfaces/ITapeOut.sol";

/// @title AgentRegistry
/// @notice Registers AI agents that are TapeOut circuits, stores the owner's operator permission and limits, and keeps
///         each agent's on-chain track record. Ownership is always read from the circuit NFT, so permissions set by a
///         previous owner stop working as soon as the agent changes hands.
contract AgentRegistry {
    struct Agent {
        address circuits;
        uint256 tokenId;
        address builder;
        uint64 registeredAt;
        string manifest;
    }

    struct Permission {
        address grantedBy;
        address operator;
        uint64 expiresAt;
    }

    struct Limits {
        uint128 perPayment;
        uint128 daily;
    }

    struct Record {
        uint64 work;
        uint64 payments;
        uint64 blocked;
        uint64 sales;
        uint256 lastSalePrice;
        address lastSaleToken;
    }

    enum Kind { Work, Payment, Blocked, Sale }

    ITapeOutFactory public immutable factory;
    address private immutable deployer;
    address public budget;
    address public market;

    mapping(bytes32 => Agent) private agents;
    mapping(bytes32 => Permission) private permissions;
    mapping(bytes32 => mapping(address => mapping(address => Limits))) private limits; // agent => grantedBy => token
    mapping(bytes32 => mapping(address => mapping(address => bool))) private payees; // agent => grantedBy => payee
    mapping(bytes32 => Record) private records;
    bytes32[] private allAgents;

    event AgentRegistered(bytes32 indexed agentId, address indexed circuits, uint256 indexed tokenId, address builder, string manifest);
    event ManifestUpdated(bytes32 indexed agentId, string manifest);
    event PermissionSet(bytes32 indexed agentId, address indexed grantedBy, address indexed operator, uint64 expiresAt);
    event LimitsSet(bytes32 indexed agentId, address indexed grantedBy, address indexed token, uint128 perPayment, uint128 daily);
    event PayeeSet(bytes32 indexed agentId, address indexed grantedBy, address indexed payee, bool allowed);
    event Recorded(bytes32 indexed agentId, Kind indexed kind, bytes32 ref, uint256 amount, address token);

    error NotHolder();
    error NotTapeOutCircuit();
    error AlreadyRegistered();
    error UnknownAgent();
    error NotOperator();
    error NotAuthorized();
    error AlreadyBound();

    constructor(ITapeOutFactory factory_) {
        factory = factory_;
        deployer = msg.sender;
    }

    /// @notice One-time link to the budget and market contracts, which write payments and sales to the track record.
    function bind(address budget_, address market_) external {
        if (msg.sender != deployer) revert NotAuthorized();
        if (budget != address(0)) revert AlreadyBound();
        budget = budget_;
        market = market_;
    }

    function agentIdOf(address circuits, uint256 tokenId) public pure returns (bytes32) {
        return keccak256(abi.encode(circuits, tokenId));
    }

    function register(address circuits, uint256 tokenId, string calldata manifest) external returns (bytes32 agentId) {
        if (!factory.isCPU(circuits)) revert NotTapeOutCircuit();
        if (IERC721(circuits).ownerOf(tokenId) != msg.sender) revert NotHolder();
        agentId = agentIdOf(circuits, tokenId);
        if (agents[agentId].circuits != address(0)) revert AlreadyRegistered();
        agents[agentId] = Agent(circuits, tokenId, msg.sender, uint64(block.timestamp), manifest);
        allAgents.push(agentId);
        emit AgentRegistered(agentId, circuits, tokenId, msg.sender, manifest);
    }

    function updateManifest(bytes32 agentId, string calldata manifest) external {
        _requireHolder(agentId);
        agents[agentId].manifest = manifest;
        emit ManifestUpdated(agentId, manifest);
    }

    function setPermission(bytes32 agentId, address operator, uint64 expiresAt) external {
        _requireHolder(agentId);
        permissions[agentId] = Permission(msg.sender, operator, expiresAt);
        emit PermissionSet(agentId, msg.sender, operator, expiresAt);
    }

    function setLimits(bytes32 agentId, address token, uint128 perPayment, uint128 daily) external {
        _requireHolder(agentId);
        limits[agentId][msg.sender][token] = Limits(perPayment, daily);
        emit LimitsSet(agentId, msg.sender, token, perPayment, daily);
    }

    function setPayee(bytes32 agentId, address payee, bool allowed) external {
        _requireHolder(agentId);
        payees[agentId][msg.sender][payee] = allowed;
        emit PayeeSet(agentId, msg.sender, payee, allowed);
    }

    /// @notice The operator records a piece of work; `ref` is the hash of the signed answer and receipt.
    function recordWork(bytes32 agentId, bytes32 ref) external {
        if (!permissionValid(agentId, msg.sender)) revert NotOperator();
        records[agentId].work++;
        emit Recorded(agentId, Kind.Work, ref, 0, address(0));
    }

    function recordPayment(bytes32 agentId, bool allowed, bytes32 ref, uint256 amount, address token) external {
        if (msg.sender != budget) revert NotAuthorized();
        if (allowed) records[agentId].payments++;
        else records[agentId].blocked++;
        emit Recorded(agentId, allowed ? Kind.Payment : Kind.Blocked, ref, amount, token);
    }

    function recordSale(bytes32 agentId, uint256 price, address token) external {
        if (msg.sender != market) revert NotAuthorized();
        Record storage r = records[agentId];
        r.sales++;
        r.lastSalePrice = price;
        r.lastSaleToken = token;
        emit Recorded(agentId, Kind.Sale, bytes32(0), price, token);
    }

    // ----- views -----

    function holderOf(bytes32 agentId) public view returns (address) {
        Agent storage a = agents[agentId];
        if (a.circuits == address(0)) revert UnknownAgent();
        return IERC721(a.circuits).ownerOf(a.tokenId);
    }

    /// @notice True only if the permission was granted by the agent's current holder and has not ended.
    function permissionValid(bytes32 agentId, address operator) public view returns (bool) {
        Permission storage p = permissions[agentId];
        return p.operator == operator && operator != address(0) && block.timestamp < p.expiresAt
            && p.grantedBy == holderOf(agentId);
    }

    function limitsOf(bytes32 agentId, address token) external view returns (Limits memory) {
        return limits[agentId][holderOf(agentId)][token];
    }

    function payeeAllowed(bytes32 agentId, address payee) external view returns (bool) {
        return payees[agentId][holderOf(agentId)][payee];
    }

    function agentOf(bytes32 agentId) external view returns (Agent memory) {
        if (agents[agentId].circuits == address(0)) revert UnknownAgent();
        return agents[agentId];
    }

    function permissionOf(bytes32 agentId) external view returns (Permission memory) {
        return permissions[agentId];
    }

    function recordOf(bytes32 agentId) external view returns (Record memory) {
        return records[agentId];
    }

    function agentCount() external view returns (uint256) {
        return allAgents.length;
    }

    function agentAt(uint256 index) external view returns (bytes32) {
        return allAgents[index];
    }

    function _requireHolder(bytes32 agentId) private view {
        if (holderOf(agentId) != msg.sender) revert NotHolder();
    }
}
