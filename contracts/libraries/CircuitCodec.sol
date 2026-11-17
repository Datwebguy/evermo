// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CircuitCodec
/// @notice Wire layout of the Evermo rule circuit (see docs/CIRCUIT_SPEC.md).
///
///  Inputs  (6 wires, index 0 = least significant bit of each field):
///    [0..2] duration bucket (0-7)    [3] eligible    [4..5] size category (0-3)
///  Outputs (5 wires):
///    [0..3] rate tier (0-15)         [4] claim allowed
library CircuitCodec {
    uint256 internal constant INPUT_WIRES = 6;
    uint256 internal constant OUTPUT_WIRES = 5;
    uint256 internal constant MAX_TIER = 15;
    uint256 internal constant BPS = 10_000;

    error BadOutputLength();

    function encode(uint256 durationBucket, bool eligible, uint256 sizeCategory)
        internal
        pure
        returns (uint256[] memory w)
    {
        w = new uint256[](INPUT_WIRES);
        for (uint256 i; i < 3; ++i) w[i] = (durationBucket >> i) & 1;
        w[3] = eligible ? 1 : 0;
        for (uint256 i; i < 2; ++i) w[4 + i] = (sizeCategory >> i) & 1;
    }

    /// @return allowed Whether the circuit permits the claim.
    /// @return rateBps Credit rate in basis points of the claimed yield (tier / 15 of 100%).
    function decode(uint256[] memory out) internal pure returns (bool allowed, uint256 rateBps) {
        if (out.length != OUTPUT_WIRES) revert BadOutputLength();
        uint256 tier;
        for (uint256 i; i < 4; ++i) tier |= (out[i] & 1) << i;
        allowed = out[4] & 1 == 1;
        rateBps = (tier * BPS) / MAX_TIER;
    }
}
