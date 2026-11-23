// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ITapeOutCircuits} from "./interfaces/ITapeOut.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title EvermoMarket
/// @notice Escrowed sales of agents. Every purchase is checked on chain by Evermo's taped-out resale circuit, and the
///         payment is split in the same transaction between the seller, the builder's royalty and Evermo's fee.
contract EvermoMarket is ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS = 500; // 5%
    uint256 public constant ROYALTY_BPS = 500; // 5% to the builder on resales
    address public constant BURN = 0x000000000000000000000000000000000000dEaD;

    struct Listing {
        bytes32 agentId;
        address seller;
        address token;
        uint256 price;
        uint64 expiresAt;
        bool active;
    }

    AgentRegistry public immutable registry;
    ITapeOutCircuits public immutable processor;
    uint256 public immutable resaleCircuitId;
    address public immutable feeRecipient;
    address public immutable bem;
    mapping(address => bool) public acceptedToken;

    Listing[] private listings;
    mapping(bytes32 => bool) public soldBefore;
    mapping(bytes32 => uint256) public activeListingOf; // agentId => listingId + 1

    event Listed(uint256 indexed listingId, bytes32 indexed agentId, address indexed seller, address token, uint256 price, uint64 expiresAt);
    event Cancelled(uint256 indexed listingId);
    event Sold(uint256 indexed listingId, bytes32 indexed agentId, address indexed buyer, address seller, address token, uint256 price,
        uint256 toSeller, uint256 royalty, uint256 fee, uint256 burned, bytes1 inputs, bytes1 outputs);

    error TokenNotAccepted();
    error NotHolder();
    error NotSeller();
    error NotActive();
    error SaleNotAllowed();
    error AlreadyListed();

    constructor(AgentRegistry registry_, ITapeOutCircuits processor_, uint256 resaleCircuitId_, address feeRecipient_, address bem_, address[] memory tokens) {
        registry = registry_;
        processor = processor_;
        resaleCircuitId = resaleCircuitId_;
        feeRecipient = feeRecipient_;
        bem = bem_;
        for (uint256 i; i < tokens.length; i++) acceptedToken[tokens[i]] = true;
    }

    /// @notice Lists an agent. The agent moves into escrow until it is sold or the listing is cancelled.
    function list(bytes32 agentId, address token, uint256 price, uint64 expiresAt) external nonReentrant returns (uint256 listingId) {
        if (!acceptedToken[token]) revert TokenNotAccepted();
        if (registry.holderOf(agentId) != msg.sender) revert NotHolder();
        if (activeListingOf[agentId] != 0) revert AlreadyListed();
        AgentRegistry.Agent memory a = registry.agentOf(agentId);
        IERC721(a.circuits).safeTransferFrom(msg.sender, address(this), a.tokenId);
        listingId = listings.length;
        listings.push(Listing(agentId, msg.sender, token, price, expiresAt, true));
        activeListingOf[agentId] = listingId + 1;
        emit Listed(listingId, agentId, msg.sender, token, price, expiresAt);
    }

    function cancel(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        if (l.seller != msg.sender) revert NotSeller();
        if (!l.active) revert NotActive();
        l.active = false;
        activeListingOf[l.agentId] = 0;
        AgentRegistry.Agent memory a = registry.agentOf(l.agentId);
        IERC721(a.circuits).safeTransferFrom(address(this), msg.sender, a.tokenId);
        emit Cancelled(listingId);
    }

    /// @notice The resale circuit's inputs and outputs for a listing right now. Free to call.
    function check(uint256 listingId) public view returns (bytes1 inputs, bytes1 outputs) {
        Listing storage l = listings[listingId];
        uint8 bits;
        if (l.active && block.timestamp < l.expiresAt) bits |= 1;
        if (registry.holderOf(l.agentId) == address(this)) bits |= 2;
        bits |= 4; // price_paid: set here for previews; buy() only reaches the circuit after the full price has been taken
        if (!soldBefore[l.agentId]) bits |= 8;
        inputs = bytes1(bits);
        bytes memory out = processor.eval(resaleCircuitId, abi.encodePacked(inputs));
        outputs = out.length > 0 ? out[0] : bytes1(0);
    }

    function buy(uint256 listingId) external nonReentrant {
        Listing storage l = listings[listingId];
        // Take the full price first; the circuit's price_paid input reflects that it was received.
        IERC20(l.token).safeTransferFrom(msg.sender, address(this), l.price);
        (bytes1 inputs, bytes1 outputs) = check(listingId);
        if ((uint8(outputs) & 1) == 0) revert SaleNotAllowed();
        bool royaltyOn = (uint8(outputs) & 2) == 2;

        AgentRegistry.Agent memory a = registry.agentOf(l.agentId);
        uint256 fee = (l.price * FEE_BPS) / 10_000;
        uint256 royalty = royaltyOn ? (l.price * ROYALTY_BPS) / 10_000 : 0;
        uint256 toSeller = l.price - fee - royalty;
        uint256 burned = l.token == bem ? fee / 2 : 0;

        l.active = false;
        activeListingOf[l.agentId] = 0;
        soldBefore[l.agentId] = true;

        IERC20 t = IERC20(l.token);
        t.safeTransfer(l.seller, toSeller);
        if (royalty > 0) t.safeTransfer(a.builder, royalty);
        if (burned > 0) t.safeTransfer(BURN, burned);
        t.safeTransfer(feeRecipient, fee - burned);
        IERC721(a.circuits).safeTransferFrom(address(this), msg.sender, a.tokenId);
        registry.recordSale(l.agentId, l.price, l.token);
        emit Sold(listingId, l.agentId, msg.sender, l.seller, l.token, l.price, toSeller, royalty, fee, burned, inputs, outputs);
    }

    function listingOf(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function listingCount() external view returns (uint256) {
        return listings.length;
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
