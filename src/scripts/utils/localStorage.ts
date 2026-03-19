export const STORAGE_KEY = "stockData";

export type StockData = Record<
  string,
  { listingDate: string; moonLon: string }
>;

export function getStoredData(): StockData {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

export function updateStoredData(newData: StockData): void {
  const currentStored = getStoredData();
  const merged = { ...currentStored, ...newData };
  // console.log("mergedData", merged, "newData", newData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

export function getEmptyMoonLonEntries(): StockData {
  const data: StockData = getStoredData();
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value.moonLon === "")
  );
}

export function getSymbolData(
  symbol: string
): { listingDate: string; moonLon: string } | undefined {
  const data: StockData = getStoredData();
  const stockData = data[symbol];
  // console.log("getSymbolData", symbol, stockData);
  return { ...stockData };
}
