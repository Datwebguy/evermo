// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Integration point for paying TapeOut protocol fees with burned credits.
/// @dev Evermo burns the credits first, then notifies the sink so it can settle the real fee
///      (processor creation, transistor minting, DeWEB upload) from the protocol reserve.
interface ITapeOutFeeSink {
    function onCreditsBurned(address payer, bytes32 action, uint256 amount, bytes calldata data) external;
}
