import { fetchStockOIChange } from "@src/scripts/sensibull/app/dataFetch";
import { getMonthlyExpiries } from "@src/scripts/sensibull/app/htmlParser";
import {
  formatIndianNumber,
  getAllOMTPutStrikes,
  getPercentageChange,
  type OIChangeResponse,
  type TOTMHuntAnalysis,
} from "@src/scripts/sensibull/app/utils";
import { F_N_O_STOCKS } from "@src/scripts/sensibull/data/niftyStocks";

const T_OTM_HUNT_STORAGE = "otmMarketHuntResults";

function analyzeMarketHunt(response: OIChangeResponse): TOTMHuntAnalysis {
  const { payload } = response;
  const { strike_list, per_strike_data, atm_strike: atmStrike } = payload;

  const strikesList = getAllOMTPutStrikes(strike_list, atmStrike);
  console.log("OTM PUT strike", atmStrike, strikesList);
  const huntingData: TOTMHuntAnalysis = {
    symbol: payload.input.underlying,
    price: payload.current_ltp,
    prevClose: payload.from_ltp,
    changePct: getPercentageChange(payload.from_ltp, payload.current_ltp),
    atmStrike,
    highestPutOiChange: 0,
    highestPutOiChangeStrike: 0,
    highestCallOiChange: 0,
    highestCallOiChangeStrike: 0,
    bullGapOiChange: 0,
    bullGapOiChangePct: 0,
    bearGapOiChange: 0,
    bearGapOiChangePct: 0,
  };
  strikesList.forEach((strike) => {
    const strikeKey = Number(strike).toString();
    if (per_strike_data[strikeKey]) {
      if (
        per_strike_data[strikeKey].from_call_oi &&
        per_strike_data[strikeKey].to_call_oi
      ) {
        const callOiChange =
          per_strike_data[strikeKey].to_call_oi -
          per_strike_data[strikeKey].from_call_oi;
        if (callOiChange > huntingData.highestCallOiChange) {
          huntingData.highestCallOiChange = callOiChange;
          huntingData.highestCallOiChangeStrike = strike;
        }
      }
      if (
        per_strike_data[strikeKey].from_put_oi &&
        per_strike_data[strikeKey].to_put_oi
      ) {
        const putOiChange =
          per_strike_data[strikeKey].to_put_oi -
          per_strike_data[strikeKey].from_put_oi;
        if (putOiChange > huntingData.highestPutOiChange) {
          huntingData.highestPutOiChange = putOiChange;
          huntingData.highestPutOiChangeStrike = strike;
        }
      }
    }
  });

  const price = huntingData.price;
  huntingData.bullGapOiChange = huntingData.highestPutOiChangeStrike - price;
  huntingData.bullGapOiChangePct = (huntingData.bullGapOiChange / price) * 100;

  huntingData.bearGapOiChange = price - huntingData.highestCallOiChangeStrike;
  huntingData.bearGapOiChangePct = (huntingData.bearGapOiChange / price) * 100;

  return huntingData;
}

type RenderMarketHuntParams = {
  data: Record<string, TOTMHuntAnalysis>;
  container: HTMLElement;
  timingsContainer: HTMLElement;
  timestamps?: Record<string, number>;
  sortBy?: string;
  expiry: string;
};

function renderMarketHunt({
  data,
  container,
  timingsContainer,
  timestamps,
  sortBy = "symbol",
  expiry,
}: RenderMarketHuntParams) {
  const stocks = Object.keys(data);
  const bullCase: TOTMHuntAnalysis[] = [];
  const bearCase: TOTMHuntAnalysis[] = [];
  stocks.forEach((stock) => {
    const stockData = data[stock];
    const putStrike = stockData.highestPutOiChangeStrike;
    const callStrike = stockData.highestCallOiChangeStrike;
    if (putStrike > stockData.atmStrike && putStrike > stockData.price) {
      bullCase.push(stockData);
    }
    if (callStrike < stockData.atmStrike && putStrike < stockData.price) {
      bearCase.push(stockData);
    }
  });

  const sortFn = (
    a: TOTMHuntAnalysis,
    b: TOTMHuntAnalysis,
    isBull: boolean,
  ) => {
    if (sortBy === "gap") {
      const gapA = isBull ? a.bullGapOiChangePct : a.bearGapOiChangePct;
      const gapB = isBull ? b.bullGapOiChangePct : b.bearGapOiChangePct;
      return gapB - gapA;
    }
    if (sortBy === "volume") {
      const volA = isBull ? a.highestPutOiChange : a.highestCallOiChange;
      const volB = isBull ? b.highestPutOiChange : b.highestCallOiChange;
      return volB - volA;
    }
    if (sortBy === "changePct") {
      return Math.abs(b.changePct) - Math.abs(a.changePct);
    }
    return a.symbol.localeCompare(b.symbol);
  };

  // Build new content off-DOM to avoid any intermediate empty state
  const fragment = document.createDocumentFragment();

  if (timestamps) {
    timingsContainer.innerHTML = Object.entries(timestamps)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([batch, time]) => {
        const date = new Date(time);
        const formatted = `${date.getDate()} ${date.toLocaleString("en", { month: "short" })} ${date.toLocaleTimeString()}`;
        return `<span>${batch.replace("batch", "Batch ")}: ${formatted}</span>`;
      })
      .join("");
  }

  const createList = (items: TOTMHuntAnalysis[], isBull: boolean) => {
    const list = document.createElement("ul");
    list.className = `MH_EXT_hunt_list ${isBull ? "bull" : "bear"}`;

    if (items.length === 0) {
      list.innerHTML = "<li>No records found</li>";
      return list;
    }

    items.sort((a, b) => sortFn(a, b, isBull));

    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.className = "MH_EXT_hunt_item";
      const highestOi = isBull
        ? item.highestPutOiChangeStrike
        : item.highestCallOiChangeStrike;
      const highestVolume = isBull
        ? item.highestPutOiChange
        : item.highestCallOiChange;
      const gap = isBull ? item.bullGapOiChange : item.bearGapOiChange;
      const gapPct = isBull ? item.bullGapOiChangePct : item.bearGapOiChangePct;
      listItem.innerHTML = `
        <a href="/open-interest/oi-change-vs-strike?tradingsymbol=${item.symbol}" class="MH_EXT_hunt_symbol">${item.symbol}</a>
        <div class="MH_EXT_hunt_details">
          <span>LTP: ${item.price.toLocaleString("en-IN")} 
            (
              <span class="MH_EXT_change_pct ${item.changePct >= 0 ? "positive" : "negative"}">
                ${item.changePct}%
              </span>
            )
          </span>
          <span>ATM Strike: ${item.atmStrike.toLocaleString("en-IN")}</span>
          <span>OTM Strike: ${highestOi}</span>
          <span>Strike Volume: ${formatIndianNumber(highestVolume)}</span>
          <span>Price Gap: ${gap.toFixed(2)} (${gapPct.toFixed(2)}%)</span>
          <span><a href="/option-chain?view=ltp&tradingsymbol=${item.symbol}&expiry=${expiry}">${item.symbol} Option Chain </a></span>
        </div>
      `;
      list.appendChild(listItem);
    });
    return list;
  };

  fragment.appendChild(createList(bullCase, true));

  // Single swap: replace all children at once
  container.replaceChildren(fragment);
}

export function marketHunt() {
  const wrapper = document.createElement("div");
  wrapper.className = "MH_EXT_market_wrapper";

  const batchSelect = document.createElement("select");
  batchSelect.className = "MH_EXT_time_select";
  batchSelect.innerHTML = `
    <option value="1" selected>Batch 1</option>
    <option value="2">Batch 2</option>
    <option value="3">Batch 3</option>
    <option value="4">Batch 4</option>
    <option value="5">Batch 5</option>
  `;

  const huntButton = document.createElement("button");
  huntButton.textContent = "Scan FnO Stocks";
  huntButton.className = "MH_EXT_button";

  const renderResultButton = document.createElement("button");
  renderResultButton.textContent = "Show Saved Results";
  renderResultButton.className = "MH_EXT_button";

  const clearButton = document.createElement("button");
  clearButton.textContent = "Clear Data";
  clearButton.className = "MH_EXT_button";
  clearButton.onclick = () => {
    localStorage.removeItem(T_OTM_HUNT_STORAGE);
    container.innerHTML = "";
    timingsContainer.innerHTML = "";
  };

  const settings = JSON.parse(
    localStorage.getItem("marketHuntSettings") ||
      '{"analysis":"oiChange","sort":"symbol","showSavedResults":false}',
  );

  let showSavedResults = settings.showSavedResults ?? false;
  renderResultButton.textContent = showSavedResults
    ? "Hide Saved Results"
    : "Show Saved Results";

  const sortSelect = document.createElement("select");
  sortSelect.className = "MH_EXT_time_select";
  sortSelect.innerHTML = `
    <option value="symbol">Sort by Symbol</option>
    <option value="changePct">Sort by Change %</option>
    <option value="gap">Sort by Price Gap</option>
    <option value="volume">Sort by Strike Volume</option>
  `;
  sortSelect.value = settings.sort;

  const timingsContainer = document.createElement("div");
  timingsContainer.className = "MH_EXT_batch_timings";

  const container = document.createElement("div");
  container.className = "MH_EXT_market_hunt";

  const reRender = () => {
    const stored = JSON.parse(localStorage.getItem(T_OTM_HUNT_STORAGE) || "{}");
    const existingData: Record<string, TOTMHuntAnalysis> = stored.data || {};
    if (Object.keys(existingData).length > 0) {
      renderMarketHunt({
        data: existingData,
        container,
        timingsContainer,
        timestamps: stored.timestamps,
        sortBy: sortSelect.value,
        expiry: stored.expiry,
      });
    } else {
      container.innerHTML = "<p>No results found in storage</p>";
    }
  };

  const onSettingsChange = () => {
    saveSettings();
    reRender();
  };

  sortSelect.onchange = onSettingsChange;

  const saveSettings = () => {
    localStorage.setItem(
      "marketHuntSettings",
      JSON.stringify({
        sort: sortSelect.value,
        showSavedResults,
      }),
    );
  };

  if (showSavedResults) reRender();

  renderResultButton.onclick = () => {
    showSavedResults = !showSavedResults;
    renderResultButton.textContent = showSavedResults
      ? "Hide Saved Results"
      : "Show Saved Results";
    if (showSavedResults) {
      reRender();
    } else {
      container.innerHTML = "";
      timingsContainer.innerHTML = "";
    }
    saveSettings();
  };

  huntButton.onclick = async () => {
    const batchNumber = Number(batchSelect.value);
    huntButton.disabled = true;

    // Overlay on wrapper so replaceChildren inside container doesn't remove it
    wrapper.style.position = "relative";
    const overlay = document.createElement("div");
    overlay.className = "MH_EXT_loading_overlay";
    overlay.textContent = "Scanning...";
    wrapper.appendChild(overlay);

    const batchSize = Math.ceil(F_N_O_STOCKS.length / 5);
    const startIndex = (batchNumber - 1) * batchSize;
    const endIndex = startIndex + batchSize;
    const batchStocks = F_N_O_STOCKS.slice(startIndex, endIndex);
    const monthlyExpiries = getMonthlyExpiries();
    const nextMonthlyExpiry = monthlyExpiries[1];
    // console.log("batchStocks", batchStocks);

    for (let i = 0; i < batchStocks.length; i += 5) {
      const batch = batchStocks.slice(i, i + 5);
      const progress = `${Math.min(i + 5, batchStocks.length)}/${batchStocks.length}`;
      huntButton.textContent = `Fetching... ${progress}`;

      const data = await Promise.all(
        batch.map((stock) => fetchStockOIChange(stock, 300, true)),
      );

      const stored = JSON.parse(
        localStorage.getItem(T_OTM_HUNT_STORAGE) || "{}",
      );
      const existingData: Record<string, TOTMHuntAnalysis> = stored.data || {};

      data.forEach((res) => {
        if ("error" in res) {
          console.warn(`Skipping ${res.symbol} due to error: ${res.message}`);
          return;
        }
        const analysis = analyzeMarketHunt(res);
        const { symbol } = analysis;
        existingData[symbol] = analysis;
      });

      const timestamps = stored.timestamps || {};
      timestamps[`batch${batchNumber}`] = Date.now();
      renderMarketHunt({
        data: existingData,
        container,
        timingsContainer,
        timestamps,
        sortBy: sortSelect.value,
        expiry: nextMonthlyExpiry,
      });

      localStorage.setItem(
        T_OTM_HUNT_STORAGE,
        JSON.stringify({ data: existingData, timestamps, expiry: nextMonthlyExpiry }),
      );

      if (i + 5 < batchStocks.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    overlay.remove();
    huntButton.textContent = "Scan FnO Stocks";
    huntButton.disabled = false;
  };

  wrapper.append(
    batchSelect,
    huntButton,
    renderResultButton,
    clearButton,
    sortSelect,
    timingsContainer,
    container,
  );
  document
    .querySelector(".app-container")
    ?.insertAdjacentElement("afterend", wrapper);
}
