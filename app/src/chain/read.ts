// Reads from X Layer, straight from the browser.
import { Contract, JsonRpcProvider } from "ethers";
import { dep } from "./deployment";

let provider: JsonRpcProvider | null = null;
export const rpc = () => (provider ??= new JsonRpcProvider(dep().rpc, dep().chainId, { staticNetwork: true }));

export const registryAbi = [
  "function agentOf(bytes32) view returns (tuple(address circuits, uint256 tokenId, address builder, uint64 registeredAt, string manifest))",
  "function holderOf(bytes32) view returns (address)",
  "function permissionOf(bytes32) view returns (tuple(address grantedBy, address operator, uint64 expiresAt))",
  "function permissionValid(bytes32,address) view returns (bool)",
  "function limitsOf(bytes32,address) view returns (tuple(uint128 perPayment, uint128 daily))",
  "function payeeAllowed(bytes32,address) view returns (bool)",
  "function agentIdOf(address,uint256) pure returns (bytes32)",
  "function register(address circuits, uint256 tokenId, string manifest) returns (bytes32)",
  "function setPermission(bytes32 agentId, address operator, uint64 expiresAt)",
  "function setLimits(bytes32 agentId, address token, uint128 perPayment, uint128 daily)",
  "function setPayee(bytes32 agentId, address payee, bool allowed)",
];
export const budgetAbi = [
  "function balanceOf(bytes32,address) view returns (uint256)",
  "function spent(bytes32,address,address,uint256) view returns (uint256)",
  "function check(bytes32,address,address,address,uint256) view returns (bytes1 inputs, bool allowed)",
  "function deposit(bytes32 agentId, address token, uint256 amount)",
  "function withdraw(bytes32 agentId, address token, uint256 amount, address to)",
];
export const marketAbi = [
  "function check(uint256) view returns (bytes1 inputs, bytes1 outputs)",
  "function list(bytes32 agentId, address token, uint256 price, uint64 expiresAt) returns (uint256)",
  "function cancel(uint256 listingId)",
  "function buy(uint256 listingId)",
  "function soldBefore(bytes32) view returns (bool)",
  "function FEE_BPS() view returns (uint256)",
  "function ROYALTY_BPS() view returns (uint256)",
  "event Sold(uint256 indexed listingId, bytes32 indexed agentId, address indexed buyer, address seller, address token, uint256 price, uint256 toSeller, uint256 royalty, uint256 fee, uint256 burned, bytes1 inputs, bytes1 outputs)",
];
export const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)"];
export const nftAbi = ["function ownerOf(uint256) view returns (address)", "function getApproved(uint256) view returns (address)",
  "function isApprovedForAll(address,address) view returns (bool)", "function setApprovalForAll(address,bool)", "function approve(address,uint256)"];
export const processorAbi = ["function netlist(uint256) view returns (bytes)", "function circuitInfo(uint256) view returns (uint32 nIn, uint32 nOut, uint32 nState, uint32 gates)",
  "function eval(uint256 id, bytes inputs) view returns (bytes)"];

export const registry = () => new Contract(dep().registry, registryAbi, rpc());
export const budget = () => new Contract(dep().budget, budgetAbi, rpc());
export const market = () => new Contract(dep().market, marketAbi, rpc());
export const erc20 = (a: string) => new Contract(a, erc20Abi, rpc());
export const nft = (a: string) => new Contract(a, nftAbi, rpc());
export const processor = () => new Contract(dep().processor, processorAbi, rpc());
export const opener = () => new Contract(dep().opener, ["function accountOf(address,uint256) view returns (address)", "function isOpened(address,uint256) view returns (bool)",
  "function open(address,uint256) payable", "function FEE() view returns (uint256)"], rpc());
export const hub = () => new Contract(dep().hub, ["function keyFor(address circuits, uint256 tokenId) view returns (tuple(address container, bytes32 endpoint, bool opened, address current, uint8 suite, uint16 keyIndex, bytes32 key, bool usable, uint32 version, uint64 chains))"], rpc());
export const cpu = () => new Contract(dep().processor, ["function transistors() view returns (address)", "function TAPEOUT_FEE() view returns (uint256)",
  "function tapeout(bytes netlist, uint32 nIn, uint32 nOut) payable returns (uint256)", "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"], rpc());
export const transistors = (a: string) => new Contract(a, ["function mint(uint256,uint256) payable", "function mintPrice() view returns (uint256)"], rpc());
