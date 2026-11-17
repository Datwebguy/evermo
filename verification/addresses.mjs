// X Layer (chain 196) TapeOut deployments, from TAP-10 "Deployments" and checked on chain.
export const RPC = process.env.XLAYER_RPC_URL ?? "https://rpc.xlayer.tech";
export const ADDR = {
  factory: "0x1f09DAeFA827f02CBb40967cc91b259763760761",
  circuitBeacon: "0xf70d1ed4f62CF3780157B0b421b7E2F45bD0991C",
  containerOpener: "0x536adD8F30f03b69f6fbF29d425A816A0dC50106",
  erc6551Registry: "0x000000006551c19487814612e58FE06813775758",
  siteRegistry: "0xd6EFb7adCc9c83dC4924Ad56f6a8E4e969b9ADB6",
  dewebHub: "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee",
};
export const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
export const ABI = {
  factory: ["function cpuAt(uint256) view returns (address)", "function cpuCount() view returns (uint256)",
    "function isSealed() view returns (bool)", "function owner() view returns (address)"],
  beacon: ["function owner() view returns (address)", "function implementation() view returns (address)"],
  cpu: ["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "function name() view returns (string)", "function transistors() view returns (address)",
    "function TAPEOUT_FEE() view returns (uint256)", "function nextId() view returns (uint256)",
    "function circuitInfo(uint256) view returns (uint32 nIn, uint32 nOut, uint32 nState, uint32 gates)",
    "function eval(uint256 id, bytes inputs) view returns (bytes)",
    "function tapeout(bytes netlist, uint32 nIn, uint32 nOut) payable returns (uint256)",
    "function ownerOf(uint256) view returns (address)", "function transferFrom(address,address,uint256)"],
  transistors: ["function mintPrice() view returns (uint256)", "function minted() view returns (uint256)",
    "function supplyCap() view returns (uint256)", "function mint(uint256 id, uint256 amount) payable"],
  opener: ["function FEE() view returns (uint256)", "function open(address circuits, uint256 tokenId) payable",
    "function isOpened(address,uint256) view returns (bool)", "function accountOf(address,uint256) view returns (address)"],
  sites: ["function putFile(address container, string path, string contentType, bytes32 sha256Hash, bytes data)",
    "function fileInfo(address, string) view returns (uint32 size, string contentType, bytes32 sha256Hash, uint40 updatedAt, uint256 chunkCount)",
    "function isOwner(address container, address who) view returns (bool)",
    "function canEdit(address container, address who) view returns (bool)",
    "function setOperator(address container, address op, uint256 ttl)"],
  hub: ["function isSealed() view returns (bool)", "function owner() view returns (address)",
    "function publishKey(address circuits, uint256 tokenId, uint8 suite, uint16 keyIndex, bytes32 key, uint64 chains)",
    "function send(address circuits, uint256 tokenId, bytes32 to, bytes32 ref, bytes payload) returns (uint256)",
    "function inboxCount(bytes32) view returns (uint256)",
    "function keyOf(address) view returns (bytes32,address,uint40,uint8,uint16,uint32,uint64)"],
};
// Minimal well-formed netlist (TAP-02): one NAND of input 0 with itself, i.e. NOT input 0.
export const NOT_GATE = "0x00000002000002";
