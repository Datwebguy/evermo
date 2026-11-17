// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ITapeOutFeeSink} from "../interfaces/ITapeOutFeeSink.sol";

/// @title EvermoCredit
/// @notice Transferable credits minted by Evermo vaults after a TapeOut circuit approves a claim.
///         Credits are burned to pay TapeOut protocol fees.
contract EvermoCredit is ERC20, ERC20Burnable, Ownable2Step {
    /// @notice Vaults allowed to mint.
    mapping(address => bool) public isMinter;
    /// @notice Settles real TapeOut fees after a burn. May be unset until the integration is live.
    ITapeOutFeeSink public feeSink;

    event MinterSet(address indexed minter, bool allowed);
    event FeeSinkSet(address indexed feeSink);
    event FeeBurned(address indexed payer, bytes32 indexed action, uint256 amount);

    error NotMinter();
    error FeeSinkNotSet();

    constructor(address owner_) ERC20("Evermo Credit", "EVC") Ownable(owner_) {}

    function setMinter(address minter, bool allowed) external onlyOwner {
        isMinter[minter] = allowed;
        emit MinterSet(minter, allowed);
    }

    function setFeeSink(ITapeOutFeeSink sink) external onlyOwner {
        feeSink = sink;
        emit FeeSinkSet(address(sink));
    }

    function mint(address to, uint256 amount) external {
        if (!isMinter[msg.sender]) revert NotMinter();
        _mint(to, amount);
    }

    /// @notice Burn credits to pay a TapeOut protocol fee.
    /// @param action Identifier of the fee being paid, e.g. keccak256("PROCESSOR_CREATE").
    /// @param data Opaque payload forwarded to the fee sink.
    function burnForFee(uint256 amount, bytes32 action, bytes calldata data) external {
        ITapeOutFeeSink sink = feeSink;
        if (address(sink) == address(0)) revert FeeSinkNotSet();
        _burn(msg.sender, amount);
        emit FeeBurned(msg.sender, action, amount);
        sink.onCreditsBurned(msg.sender, action, amount, data);
    }
}
