// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IEvermoVault} from "../interfaces/IEvermoVault.sol";

/// @title ReceiptToken
/// @notice Liquid 1:1 receipt for a vault deposit. Mint/burn is restricted to the vault, which is
///         notified before every balance change so yield and holding time stay accurate.
contract ReceiptToken is ERC20 {
    uint8 private immutable _decimals;
    IEvermoVault public immutable vault;

    error NotVault();

    constructor(string memory name_, string memory symbol_, uint8 decimals_, IEvermoVault vault_)
        ERC20(name_, symbol_)
    {
        _decimals = decimals_;
        vault = vault_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != address(vault)) revert NotVault();
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != address(vault)) revert NotVault();
        _burn(from, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        // Mint/burn paths are driven by the vault, which settles accounts itself.
        if (from != address(0) && to != address(0)) {
            vault.onReceiptUpdate(from, to, value);
        }
        super._update(from, to, value);
    }
}
