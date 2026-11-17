// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ITapeOutProcessor} from "../interfaces/ITapeOutProcessor.sol";

/// @dev Test-only stand-in for a TapeOut processor. Stores a NAND netlist and evaluates it, so
///      tests run the exact netlist produced by `circuit/build.ts`.
///      Wire numbering: inputs first, then one wire per gate in order.
contract MockProcessor is ITapeOutProcessor {
    struct Netlist {
        uint16 numInputs;
        uint16[2][] gates;
        uint16[] outputs;
    }

    mapping(uint256 => Netlist) private _nets;

    function setNetlist(uint256 id, uint16 numInputs, uint16[2][] calldata gates, uint16[] calldata outputs) external {
        Netlist storage n = _nets[id];
        n.numInputs = numInputs;
        delete n.gates;
        delete n.outputs;
        for (uint256 i; i < gates.length; ++i) n.gates.push(gates[i]);
        for (uint256 i; i < outputs.length; ++i) n.outputs.push(outputs[i]);
    }

    function eval(uint256 id, uint256[] calldata inputs) external view returns (uint256[] memory out) {
        Netlist storage n = _nets[id];
        require(inputs.length == n.numInputs, "bad inputs");
        uint256 total = n.numInputs + n.gates.length;
        uint256[] memory w = new uint256[](total);
        for (uint256 i; i < inputs.length; ++i) w[i] = inputs[i] & 1;
        for (uint256 g; g < n.gates.length; ++g) {
            w[n.numInputs + g] = 1 ^ (w[n.gates[g][0]] & w[n.gates[g][1]]);
        }
        out = new uint256[](n.outputs.length);
        for (uint256 i; i < out.length; ++i) out[i] = w[n.outputs[i]];
    }
}
