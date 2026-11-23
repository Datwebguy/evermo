// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice A TapeOut processor contract: an ERC-721 of circuits that can evaluate them (TAP-02).
interface ITapeOutCircuits {
    function eval(uint256 id, bytes calldata inputs) external view returns (bytes memory);
    function ownerOf(uint256 id) external view returns (address);
}

/// @notice The TapeOut processor factory (TAP-10 deployments).
interface ITapeOutFactory {
    function isCPU(address cpu) external view returns (bool);
}
