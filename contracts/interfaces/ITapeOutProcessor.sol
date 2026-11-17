// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal view of a TapeOut processor as used by Evermo.
/// @dev Matches `eval(circuitId, inputs) -> outputs` from the TapeOut docs. Circuit I/O are
///      boolean wires, encoded here as 0/1 words. Confirm the deployed processor's exact ABI
///      before tape-out and adjust this interface if it differs.
interface ITapeOutProcessor {
    function eval(uint256 circuitId, uint256[] calldata inputs) external view returns (uint256[] memory outputs);
}
