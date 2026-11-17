// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IYieldSource} from "../interfaces/IYieldSource.sol";

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @title AaveV3YieldSource
/// @notice Supplies a single asset to an Aave V3 pool on behalf of one vault.
contract AaveV3YieldSource is IYieldSource {
    using SafeERC20 for IERC20;

    address public immutable override asset;
    IAaveV3Pool public immutable pool;
    IERC20 public immutable aToken;
    address public immutable deployer;
    address public vault;

    error NotVault();
    error NotDeployer();
    error AlreadyBound();

    constructor(address asset_, IAaveV3Pool pool_, IERC20 aToken_) {
        asset = asset_;
        pool = pool_;
        aToken = aToken_;
        deployer = msg.sender;
        IERC20(asset_).forceApprove(address(pool_), type(uint256).max);
    }

    /// @notice One-time binding of the vault, done by the deployer right after the vault exists.
    function bindVault(address vault_) external {
        if (msg.sender != deployer) revert NotDeployer();
        if (vault != address(0)) revert AlreadyBound();
        vault = vault_;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    function totalAssets() external view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    /// @dev Vault transfers `amount` to this contract first, then calls deposit.
    function deposit(uint256 amount) external override onlyVault {
        pool.supply(asset, amount, address(this), 0);
    }

    function withdraw(uint256 amount, address to) external override onlyVault {
        pool.withdraw(asset, amount, to);
    }
}
