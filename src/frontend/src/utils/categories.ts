import { SymbolCategory } from "@/types/market";

/**
 * Categorize a symbol based on keywords
 */
export function categorizeSymbol(symbol: string): SymbolCategory {
  const normalized = symbol.toUpperCase().replace("USDT", "");

  // L1 blockchains
  const l1Keywords = ["BTC", "ETH", "SOL", "ADA", "AVAX", "DOT", "NEAR", "ATOM", "TIA", "SUI"];
  if (l1Keywords.some((kw) => normalized.includes(kw))) {
    return "L1";
  }

  // L2 solutions
  const l2Keywords = ["MATIC", "ARB", "OP", "IMX", "LRC", "METIS", "STRK"];
  if (l2Keywords.some((kw) => normalized.includes(kw))) {
    return "L2";
  }

  // AI tokens
  const aiKeywords = ["FET", "AGIX", "OCEAN", "NMR", "GRT", "RNDR", "TAO", "WLD", "AI"];
  if (aiKeywords.some((kw) => normalized.includes(kw))) {
    return "AI";
  }

  // DeFi protocols
  const defiKeywords = ["UNI", "AAVE", "CRV", "SNX", "COMP", "MKR", "LDO", "SUSHI", "BAL", "1INCH"];
  if (defiKeywords.some((kw) => normalized.includes(kw))) {
    return "DeFi";
  }

  // Meme coins
  const memeKeywords = ["DOGE", "SHIB", "PEPE", "FLOKI", "BONK", "WIF", "MEME"];
  if (memeKeywords.some((kw) => normalized.includes(kw))) {
    return "Meme";
  }

  // Gaming
  const gamingKeywords = ["AXS", "SAND", "MANA", "ENJ", "GALA", "IMX", "BEAM", "PRIME"];
  if (gamingKeywords.some((kw) => normalized.includes(kw))) {
    return "Gaming";
  }

  // Default to Infrastructure
  return "Infrastructure";
}

/**
 * Get initial symbols to populate backend
 */
export function getInitialSymbols(): Array<{ symbol: string; category: SymbolCategory }> {
  return [
    { symbol: "BTCUSDT", category: "L1" },
    { symbol: "ETHUSDT", category: "L1" },
    { symbol: "SOLUSDT", category: "L1" },
    { symbol: "BNBUSDT", category: "Infrastructure" },
    { symbol: "ADAUSDT", category: "L1" },
    { symbol: "AVAXUSDT", category: "L1" },
    { symbol: "DOGEUSDT", category: "Meme" },
    { symbol: "MATICUSDT", category: "L2" },
    { symbol: "ARBUSDT", category: "L2" },
    { symbol: "OPUSDT", category: "L2" },
    { symbol: "UNIUSDT", category: "DeFi" },
    { symbol: "AAVEUSDT", category: "DeFi" },
    { symbol: "FETUSDT", category: "AI" },
    { symbol: "GRTUSD", category: "AI" },
    { symbol: "RNDRUSDT", category: "AI" },
    { symbol: "AXSUSDT", category: "Gaming" },
    { symbol: "SANDUSDT", category: "Gaming" },
    { symbol: "MANAUSDT", category: "Gaming" },
    { symbol: "SHIBUSDT", category: "Meme" },
    { symbol: "PEPEUSDT", category: "Meme" },
  ];
}

/**
 * Get category display name
 */
export function getCategoryName(category: SymbolCategory): string {
  const names: Record<SymbolCategory, string> = {
    "L1": "Layer 1",
    "L2": "Layer 2",
    "AI": "AI & ML",
    "DeFi": "DeFi",
    "Meme": "Meme Coins",
    "Gaming": "Gaming",
    "Infrastructure": "Infrastructure",
  };
  return names[category];
}

/**
 * Get all categories as array
 */
export function getAllCategories(): SymbolCategory[] {
  return [
    "L1",
    "L2",
    "AI",
    "DeFi",
    "Meme",
    "Gaming",
    "Infrastructure",
  ];
}
