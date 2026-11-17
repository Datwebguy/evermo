// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

import {IEvermoVault} from "./interfaces/IEvermoVault.sol";
import {ITapeOutProcessor} from "./interfaces/ITapeOutProcessor.sol";
import {IYieldSource} from "./interfaces/IYieldSource.sol";
import {ReceiptToken} from "./tokens/ReceiptToken.sol";
import {EvermoCredit} from "./tokens/EvermoCredit.sol";
import {CircuitCodec} from "./libraries/CircuitCodec.sol";

/// @title EvermoVault
/// @notice Single-asset vault. Deposits mint a liquid 1:1 receipt token and are placed in a yield
///         source. Yield accrues per receipt token; claiming converts it into Evermo credits at a
///         rate decided by a taped-out TapeOut circuit, evaluated on-chain before every mint.
/// @dev Deploy one vault per asset (USDT0, USDC, WOKB). Credits are shared across vaults.
contract EvermoVault is IEvermoVault, Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_FEE_BPS = 2_000;
    uint256 private constant PRECISION = 1e27;
    uint256 private constant MAX_BUCKET = 7;

    // --- immutable configuration -------------------------------------------------------------
    IERC20 public immutable asset;
    IYieldSource public immutable yieldSource;
    ReceiptToken public immutable receipt;
    EvermoCredit public immutable credit;
    ITapeOutProcessor public immutable processor;
    uint256 public immutable circuitId;
    /// @notice Seconds per duration bucket fed to the circuit (bucket = elapsed / this, capped at 7).
    uint256 public immutable bucketSeconds;
    /// @dev Position size thresholds in 18-decimal normalized asset units: size 1/2/3.
    uint256 public immutable sizeTier1;
    uint256 public immutable sizeTier2;
    uint256 public immutable sizeTier3;
    uint256 private immutable _scale; // 10 ** (18 - assetDecimals)

    // --- mutable configuration ---------------------------------------------------------------
    address public treasury;
    uint16 public performanceFeeBps;
    uint16 public claimFeeBps;
    mapping(address => bool) public blocked;

    // --- accounting --------------------------------------------------------------------------
    uint256 public yieldLiability; // net yield credited to holders and not yet paid out
    uint256 public accYieldPerShare;
    mapping(address => uint256) public accrued;
    mapping(address => uint256) private _paidIndex;
    mapping(address => uint256) public holdingSince;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 principal, uint256 yieldPaid);
    event Harvested(uint256 netYield, uint256 fee);
    event Claimed(address indexed account, uint256 yieldUsed, uint256 rateBps, uint256 credits, uint256 claimFee);
    event TreasurySet(address indexed treasury);
    event FeesSet(uint16 performanceFeeBps, uint16 claimFeeBps);
    event BlockedSet(address indexed account, bool blocked);

    error ZeroAmount();
    error ZeroAddress();
    error FeeTooHigh();
    error NotReceipt();
    error NothingToClaim();
    error ClaimNotAllowed();

    struct Config {
        IERC20 asset;
        IYieldSource yieldSource;
        EvermoCredit credit;
        ITapeOutProcessor processor;
        uint256 circuitId;
        uint256 bucketSeconds;
        uint256[3] sizeTiers;
        address treasury;
        uint16 performanceFeeBps;
        uint16 claimFeeBps;
    }

    constructor(Config memory c, address owner_) Ownable(owner_) {
        if (c.treasury == address(0)) revert ZeroAddress();
        if (c.performanceFeeBps > MAX_FEE_BPS || c.claimFeeBps > MAX_FEE_BPS) revert FeeTooHigh();
        require(c.yieldSource.asset() == address(c.asset), "asset mismatch");

        asset = c.asset;
        yieldSource = c.yieldSource;
        credit = c.credit;
        processor = c.processor;
        circuitId = c.circuitId;
        bucketSeconds = c.bucketSeconds;
        sizeTier1 = c.sizeTiers[0];
        sizeTier2 = c.sizeTiers[1];
        sizeTier3 = c.sizeTiers[2];
        treasury = c.treasury;
        performanceFeeBps = c.performanceFeeBps;
        claimFeeBps = c.claimFeeBps;

        uint8 dec = IERC20Metadata(address(c.asset)).decimals();
        require(dec <= 18, "decimals");
        _scale = 10 ** (18 - dec);

        string memory sym = IERC20Metadata(address(c.asset)).symbol();
        receipt = new ReceiptToken(
            string.concat("Evermo ", sym, " Receipt"), string.concat("ev", sym), dec, IEvermoVault(address(this))
        );
    }

    // --- user actions ------------------------------------------------------------------------

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _harvest();
        _settle(msg.sender);

        uint256 balance = receipt.balanceOf(msg.sender);
        // Weighted-average entry time so adding to a position does not reset its age entirely.
        holdingSince[msg.sender] =
            balance == 0 ? block.timestamp : (holdingSince[msg.sender] * balance + block.timestamp * amount) / (balance + amount);

        asset.safeTransferFrom(msg.sender, address(yieldSource), amount);
        yieldSource.deposit(amount);
        receipt.mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Burn `amount` receipts for principal plus all yield accrued to the caller.
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        _harvest();
        _settle(msg.sender);

        uint256 yieldPaid = accrued[msg.sender];
        accrued[msg.sender] = 0;
        yieldLiability -= yieldPaid;

        receipt.burn(msg.sender, amount);
        yieldSource.withdraw(amount + yieldPaid, msg.sender);
        emit Withdrawn(msg.sender, amount, yieldPaid);
    }

    /// @notice Convert the caller's accrued yield into credits, as decided by the circuit.
    function claim() external nonReentrant returns (uint256 credits) {
        _harvest();
        _settle(msg.sender);

        uint256 yieldUsed = accrued[msg.sender];
        if (yieldUsed == 0) revert NothingToClaim();

        (bool allowed, uint256 rateBps) = _evaluate(msg.sender);
        if (!allowed) revert ClaimNotAllowed();

        credits = (yieldUsed * _scale * rateBps) / BPS;
        if (credits == 0) revert NothingToClaim();

        accrued[msg.sender] = 0;
        yieldLiability -= yieldUsed;
        // The claimed yield backs the credits: it moves to the treasury, which funds fee payments.
        yieldSource.withdraw(yieldUsed, treasury);

        uint256 fee = (credits * claimFeeBps) / BPS;
        credit.mint(msg.sender, credits - fee);
        if (fee != 0) credit.mint(treasury, fee);
        emit Claimed(msg.sender, yieldUsed, rateBps, credits - fee, fee);
    }

    /// @notice Realize pending yield for all holders. Callable by anyone.
    function harvest() external nonReentrant {
        _harvest();
    }

    // --- views -------------------------------------------------------------------------------

    function totalPrincipal() public view returns (uint256) {
        return receipt.totalSupply();
    }

    /// @notice Yield currently attributable to `account`, including not-yet-harvested interest.
    function pendingYield(address account) public view returns (uint256) {
        uint256 supply = receipt.totalSupply();
        uint256 acc = accYieldPerShare;
        if (supply != 0) {
            (uint256 net,) = _unharvested(supply);
            acc += (net * PRECISION) / supply;
        }
        return accrued[account] + (receipt.balanceOf(account) * (acc - _paidIndex[account])) / PRECISION;
    }

    /// @notice Circuit inputs for `account` as the vault would send them right now.
    function circuitInputs(address account)
        public
        view
        returns (uint256 durationBucket, bool eligible, uint256 sizeCategory)
    {
        uint256 balance = receipt.balanceOf(account);
        if (balance != 0 && bucketSeconds != 0) {
            durationBucket = (block.timestamp - holdingSince[account]) / bucketSeconds;
            if (durationBucket > MAX_BUCKET) durationBucket = MAX_BUCKET;
        }
        eligible = !blocked[account];

        uint256 normalized = balance * _scale;
        sizeCategory = normalized >= sizeTier3 ? 3 : normalized >= sizeTier2 ? 2 : normalized >= sizeTier1 ? 1 : 0;
    }

    /// @notice Dry-run a claim: what the circuit would allow right now.
    function previewClaim(address account)
        external
        view
        returns (uint256 yieldUsed, bool allowed, uint256 rateBps, uint256 creditsAfterFee)
    {
        yieldUsed = pendingYield(account);
        (allowed, rateBps) = _evaluate(account);
        uint256 credits = (yieldUsed * _scale * rateBps) / BPS;
        creditsAfterFee = credits - (credits * claimFeeBps) / BPS;
    }

    // --- receipt hook ------------------------------------------------------------------------

    function onReceiptUpdate(address from, address to, uint256 amount) external override {
        if (msg.sender != address(receipt)) revert NotReceipt();
        _harvest();
        _settle(from);
        _settle(to);
        // Received tokens count as freshly held: age is not transferable.
        uint256 toBalance = receipt.balanceOf(to);
        holdingSince[to] = toBalance == 0
            ? block.timestamp
            : (holdingSince[to] * toBalance + block.timestamp * amount) / (toBalance + amount);
    }

    // --- admin -------------------------------------------------------------------------------

    function setTreasury(address treasury_) external onlyOwner {
        if (treasury_ == address(0)) revert ZeroAddress();
        treasury = treasury_;
        emit TreasurySet(treasury_);
    }

    function setFees(uint16 performanceFeeBps_, uint16 claimFeeBps_) external onlyOwner {
        if (performanceFeeBps_ > MAX_FEE_BPS || claimFeeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        performanceFeeBps = performanceFeeBps_;
        claimFeeBps = claimFeeBps_;
        emit FeesSet(performanceFeeBps_, claimFeeBps_);
    }

    /// @notice Flip the circuit's eligibility wire for an address (e.g. sanctioned or exploiting).
    function setBlocked(address account, bool isBlocked) external onlyOwner {
        blocked[account] = isBlocked;
        emit BlockedSet(account, isBlocked);
    }

    // --- internals ---------------------------------------------------------------------------

    function _evaluate(address account) internal view returns (bool allowed, uint256 rateBps) {
        (uint256 bucket, bool eligible, uint256 size) = circuitInputs(account);
        uint256[] memory out = processor.eval(circuitId, CircuitCodec.encode(bucket, eligible, size));
        return CircuitCodec.decode(out);
    }

    function _unharvested(uint256 supply) internal view returns (uint256 net, uint256 fee) {
        uint256 gross = yieldSource.totalAssets();
        uint256 owed = supply + yieldLiability;
        if (gross <= owed) return (0, 0);
        uint256 fresh = gross - owed;
        fee = (fresh * performanceFeeBps) / BPS;
        net = fresh - fee;
    }

    function _harvest() internal {
        uint256 supply = receipt.totalSupply();
        if (supply == 0) return;
        (uint256 net, uint256 fee) = _unharvested(supply);
        if (net == 0 && fee == 0) return;

        uint256 perShare = (net * PRECISION) / supply;
        uint256 distributed = (perShare * supply) / PRECISION; // exclude rounding dust
        if (distributed == 0 && fee == 0) return;
        if (fee != 0) yieldSource.withdraw(fee, treasury);
        accYieldPerShare += perShare;
        yieldLiability += distributed;
        emit Harvested(distributed, fee);
    }

    function _settle(address account) internal {
        uint256 acc = accYieldPerShare;
        uint256 balance = receipt.balanceOf(account);
        if (balance != 0) {
            accrued[account] += (balance * (acc - _paidIndex[account])) / PRECISION;
        }
        _paidIndex[account] = acc;
    }
}
