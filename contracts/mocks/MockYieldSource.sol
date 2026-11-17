// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IYieldSource} from "../interfaces/IYieldSource.sol";
import {MockERC20} from "./MockERC20.sol";

/// @dev Test-only: holds the asset itself and lets tests simulate interest by minting into it.
contract MockYieldSource is IYieldSource {
    MockERC20 public immutable token;
    address public vault;

    constructor(MockERC20 token_) {
        token = token_;
    }

    function bindVault(address vault_) external {
        require(vault == address(0), "bound");
        vault = vault_;
    }

    function asset() external view returns (address) {
        return address(token);
    }

    function totalAssets() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function deposit(uint256) external {}

    function withdraw(uint256 amount, address to) external {
        require(msg.sender == vault, "not vault");
        token.transfer(to, amount);
    }

    function accrue(uint256 amount) external {
        token.mint(address(this), amount);
    }
}
