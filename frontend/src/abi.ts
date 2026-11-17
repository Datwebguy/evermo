export const VAULT_ABI = [
  "function asset() view returns (address)",
  "function receipt() view returns (address)",
  "function deposit(uint256 amount)",
  "function withdraw(uint256 amount)",
  "function claim() returns (uint256)",
  "function pendingYield(address) view returns (uint256)",
  "function previewClaim(address) view returns (uint256 yieldUsed, bool allowed, uint256 rateBps, uint256 creditsAfterFee)",
];

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const CREDIT_ABI = [
  ...ERC20_ABI,
  "function burnForFee(uint256 amount, bytes32 action, bytes data)",
];
