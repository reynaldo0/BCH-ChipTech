export const demoSeed = {
  period: "30 hari terakhir",
  channels: ["Shopee", "TikTok Shop", "Lazada"] as const,
  comparison: null,
}

export type DemoSeed = typeof demoSeed
