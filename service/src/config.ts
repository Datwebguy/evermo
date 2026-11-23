// Settings come from the environment. Nothing here is a secret except OPERATOR_KEY, which is never logged.
function need(k: string): string { const v = process.env[k]; if (!v) throw new Error(`Missing setting ${k}`); return v; }
const opt = (k: string, d: string) => process.env[k] || d;

export const chain = {
  id: 196,
  rpc: opt("XLAYER_RPC_URL", "https://rpc.xlayer.tech"),
  hub: "0xe61A9C7213a6Aa616C246a2B569e555B417b25ee",
  aavePool: "0xE3F3Caefdd7180F884c01E57f65Df979Af84f116",
};
export const ai = {
  baseUrl: opt("AI_BASE_URL", "https://cloud-api.near.ai/v1"),
  apiKey: opt("AI_API_KEY", "proxy-injected"),
  model: opt("AI_MODEL", "openai/gpt-5-nano"),
};
export function deployment() {
  return {
    registry: need("REGISTRY_ADDRESS"),
    budget: need("BUDGET_ADDRESS"),
    operatorKey: need("OPERATOR_KEY"),
    publicUrl: need("PUBLIC_URL").replace(/\/$/, ""),
    agentsFile: need("AGENTS_FILE"),
    dataDir: opt("DATA_DIR", "./data"),
    payee: need("FEE_PAYEE"),
    usdt0: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736",
    aiMarginBps: BigInt(opt("AI_MARGIN_BPS", "1000")),
    watchEveryMinutes: Number(opt("WATCH_EVERY_MINUTES", "10")),
    port: Number(opt("PORT", "8787")),
  };
}
