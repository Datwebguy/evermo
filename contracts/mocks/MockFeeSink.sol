// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ITapeOutFeeSink} from "../interfaces/ITapeOutFeeSink.sol";

contract MockFeeSink is ITapeOutFeeSink {
    uint256 public lastAmount;
    bytes32 public lastAction;

    function onCreditsBurned(address, bytes32 action, uint256 amount, bytes calldata) external {
        lastAction = action;
        lastAmount = amount;
    }
}
