// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IEvermoVault {
    /// @notice Called by the receipt token before any balance change so yield is settled first.
    function onReceiptUpdate(address from, address to, uint256 amount) external;
}
