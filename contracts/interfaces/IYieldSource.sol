// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Adapter between an Evermo vault and an interest-bearing position.
/// @dev Only the bound vault may move funds. `totalAssets` includes accrued interest.
interface IYieldSource {
    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount, address to) external;
}
