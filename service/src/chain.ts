// Reads and writes on X Layer.
import { Contract, JsonRpcProvider, Wallet, getBytes, hexlify } from "ethers";
import { chain } from "./config.ts";

export const provider = new JsonRpcProvider(chain.rpc, chain.id, { staticNetwork: true, cacheTimeout: -1 });

export const OPENER = "0x536adD8F30f03b69f6fbF29d425A816A0dC50106";
const opener = new Contract(OPENER, ["function accountOf(address,uint256) view returns (address)", "function isOpened(address,uint256) view returns (bool)"], provider);
const hub = new Contract(chain.hub, [
  "function keyFor(address circuits, uint256 tokenId) view returns (tuple(address container, bytes32 endpoint, bool opened, address current, uint8 suite, uint16 keyIndex, bytes32 key, bool usable, uint32 version, uint64 chains))",
  "function send(address circuits, uint256 tokenId, bytes32 to, bytes32 ref, bytes payload) returns (uint256)",
], provider);
const nft = (circuits: string) => new Contract(circuits, ["function ownerOf(uint256) view returns (address)"], provider);

export const registryAbi = [
  "function agentIdOf(address,uint256) pure returns (bytes32)",
  "function holderOf(bytes32) view returns (address)",
  "function permissionValid(bytes32,address) view returns (bool)",
  "function recordWork(bytes32 agentId, bytes32 ref)",
];
export const budgetAbi = [
  "function check(bytes32,address,address,address,uint256) view returns (bytes1 inputs, bool allowed)",
  "function pay(bytes32 agentId, address token, address payee, uint256 amount, bytes32 ref) returns (bool)",
  "function balanceOf(bytes32,address) view returns (uint256)",
];

export async function containerOf(circuits: string, tokenId: bigint): Promise<{ container: string; opened: boolean }> {
  const [container, opened] = await Promise.all([opener.accountOf(circuits, tokenId), opener.isOpened(circuits, tokenId)]);
  return { container, opened };
}
export const holderOf = (circuits: string, tokenId: bigint): Promise<string> => nft(circuits).ownerOf(tokenId);

/** TAP-10 §14.4: the recipient's key, only when usable for X Layer. */
export async function inboxKey(circuits: string, tokenId: bigint) {
  const k = await hub.keyFor(circuits, tokenId);
  if (!k.usable || k.suite !== 1n && Number(k.suite) !== 1) return null;
  if ((BigInt(k.chains) & (1n << 2n)) === 0n) return null;
  return { key: getBytes(k.key), endpoint: getBytes(k.endpoint), version: Number(k.version) };
}

export function writer(operatorKey: string) {
  const w = new Wallet(operatorKey, provider);
  return {
    address: w.address,
    registry: (a: string) => new Contract(a, registryAbi, w),
    budget: (a: string) => new Contract(a, budgetAbi, w),
    send: (circuits: string, tokenId: bigint, to: Uint8Array, ref: Uint8Array, payload: Uint8Array) =>
      (hub.connect(w) as Contract).send(circuits, tokenId, hexlify(to), hexlify(ref), hexlify(payload)),
  };
}
