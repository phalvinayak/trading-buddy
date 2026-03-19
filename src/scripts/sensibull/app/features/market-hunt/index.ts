import { fetchStockOIChange } from "@src/scripts/sensibull/app/dataFetch";
import {
  getSurroundingStrikes,
  type OIChangeResponse,
  type THuntAnalysis,
} from "@src/scripts/sensibull/app/utils";
import { F_N_O_STOCKS } from "@src/scripts/sensibull/data/niftyStocks";

function analyzeMarketHunt(response: OIChangeResponse): THuntAnalysis {
  const { payload } = response;
  const { strike_list, per_strike_data, atm_strike: atmStrike } = payload;

  const strikesList = getSurroundingStrikes(strike_list, atmStrike);
  const huntingData: THuntAnalysis = {
    symbol: payload.input.underlying,
    price: payload.current_ltp,
    atmStrike,
    highestCallOi: 0,
    highestCallOiStrike: 0,
    highestCallOiChange: 0,
    highestCallOiChangeStrike: 0,
    highestPutOi: 0,
    highestPutOiStrike: 0,
    highestPutOiChange: 0,
    highestPutOiChangeStrike: 0,
    bullGapOi: 0,
    bullGapOiChange: 0,
    bullGapOiPct: 0,
    bullGapOiChangePct: 0,
    bearGapOi: 0,
    bearGapOiChange: 0,
    bearGapOiPct: 0,
    bearGapOiChangePct: 0,
  };
  strikesList.forEach((strike) => {
    const strikeKey = Number(strike).toString();
    if (per_strike_data[strikeKey].from_call_oi && per_strike_data[strikeKey].to_call_oi) {
      if (per_strike_data[strikeKey].to_call_oi > huntingData.highestCallOi) {
        huntingData.highestCallOi = per_strike_data[strikeKey].to_call_oi;
        huntingData.highestCallOiStrike = strike;
      }
      const callOiChange = per_strike_data[strikeKey].to_call_oi - per_strike_data[strikeKey].from_call_oi;
      if (callOiChange > huntingData.highestCallOiChange) {
        huntingData.highestCallOiChange = callOiChange;
        huntingData.highestCallOiChangeStrike = strike;
      }
    }
    if (per_strike_data[strikeKey].from_put_oi && per_strike_data[strikeKey].to_put_oi) {
      if (per_strike_data[strikeKey].to_put_oi > huntingData.highestPutOi) {
        huntingData.highestPutOi = per_strike_data[strikeKey].to_put_oi;
        huntingData.highestPutOiStrike = strike;
      }
      const putOiChange = per_strike_data[strikeKey].to_put_oi - per_strike_data[strikeKey].from_put_oi;
      if (putOiChange > huntingData.highestPutOiChange) {
        huntingData.highestPutOiChange = putOiChange;
        huntingData.highestPutOiChangeStrike = strike;
      }
    }
  });

  const price = huntingData.price;
  huntingData.bullGapOi = huntingData.highestPutOiStrike - price;
  huntingData.bullGapOiPct = (huntingData.bullGapOi / price) * 100;
  huntingData.bullGapOiChange = huntingData.highestPutOiChangeStrike - price;
  huntingData.bullGapOiChangePct = (huntingData.bullGapOiChange / price) * 100;

  huntingData.bearGapOi = price - huntingData.highestCallOiStrike;
  huntingData.bearGapOiPct = (huntingData.bearGapOi / price) * 100;
  huntingData.bearGapOiChange = price - huntingData.highestCallOiChangeStrike;
  huntingData.bearGapOiChangePct = (huntingData.bearGapOiChange / price) * 100;

  return huntingData;
}

function renderMarketHunt(
  data: Record<string, THuntAnalysis>,
  container: HTMLElement,
  timingsContainer: HTMLElement,
  timestamps?: Record<string, number>,
  analysisType: string = "oiChange",
  sortBy: string = "symbol",
) {
  const byOiChange = analysisType === "oiChange";
  const stocks = Object.keys(data);
  const bullCase: THuntAnalysis[] = [];
  const bearCase: THuntAnalysis[] = [];
  stocks.forEach((stock) => {
    const stockData = data[stock];
    const putStrike = byOiChange ? stockData.highestPutOiChangeStrike : stockData.highestPutOiStrike;
    const callStrike = byOiChange ? stockData.highestCallOiChangeStrike : stockData.highestCallOiStrike;
    if (putStrike > stockData.atmStrike && putStrike > stockData.price) {
      bullCase.push(stockData);
    } else if (callStrike < stockData.atmStrike && putStrike < stockData.price) {
      bearCase.push(stockData);
    }
  });

  if (bullCase.length === 0 && bearCase.length === 0) {
    return;
  }

  const sortFn = (a: THuntAnalysis, b: THuntAnalysis, isBull: boolean) => {
    if (sortBy === "gap") {
      const gapA = isBull ? (byOiChange ? a.bullGapOiChangePct : a.bullGapOiPct) : (byOiChange ? a.bearGapOiChangePct : a.bearGapOiPct);
      const gapB = isBull ? (byOiChange ? b.bullGapOiChangePct : b.bullGapOiPct) : (byOiChange ? b.bearGapOiChangePct : b.bearGapOiPct);
      return gapB - gapA;
    }
    return a.symbol.localeCompare(b.symbol);
  };

  container.innerHTML = "";
  timingsContainer.innerHTML = "";

  if (timestamps) {
    timingsContainer.innerHTML = Object.entries(timestamps)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([batch, time]) => {
        const date = new Date(time);
        const formatted = `${date.getDate()} ${date.toLocaleString('en', { month: 'short' })} ${date.toLocaleTimeString()}`;
        return `<span>${batch.replace('batch', 'Batch ')}: ${formatted}</span>`;
      })
      .join("");
  }

  const createList = (items: THuntAnalysis[], isBull: boolean) => {
    const list = document.createElement("ul");
    list.className = "MH_EXT_hunt_list";

    if (items.length === 0) {
      list.innerHTML = "<li>No records found</li>";
      return list;
    }

    items.sort((a, b) => sortFn(a, b, isBull));

    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.className = "MH_EXT_hunt_item";
      const highestOi = isBull
        ? (byOiChange ? item.highestPutOiChangeStrike : item.highestPutOiStrike)
        : (byOiChange ? item.highestCallOiChangeStrike : item.highestCallOiStrike);
      const gap = isBull ? (byOiChange ? item.bullGapOiChange : item.bullGapOi) : (byOiChange ? item.bearGapOiChange : item.bearGapOi);
      const gapPct = isBull ? (byOiChange ? item.bullGapOiChangePct : item.bullGapOiPct) : (byOiChange ? item.bearGapOiChangePct : item.bearGapOiPct);
      listItem.innerHTML = `
        <a href="/open-interest/oi-change-vs-strike?tradingsymbol=${item.symbol}" class="MH_EXT_hunt_symbol">${item.symbol}</a>
        <div class="MH_EXT_hunt_details">
          <span>Current price: ${item.price}</span>
          <span>ATM Strike: ${item.atmStrike}</span>
          <span>${byOiChange ? 'Max OI Chg Strike' : 'Max OI Strike'}: ${highestOi}</span>
          <span>Price Gap: ${gap.toFixed(2)} (${gapPct.toFixed(2)}%)</span>
        </div>
      `;
      const link = listItem.querySelector("a");
      link?.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = `/open-interest/oi-change-vs-strike?tradingsymbol=${item.symbol}`;
      });
      list.appendChild(listItem);
    });
    return list;
  };

  container.appendChild(createList(bullCase, true));
  container.appendChild(createList(bearCase, false));
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
    localStorage.removeItem("marketHuntResults");
    container.innerHTML = "";
    timingsContainer.innerHTML = "";
  };

  const settings = JSON.parse(localStorage.getItem("marketHuntSettings") || '{"analysis":"oiChange","sort":"symbol"}');

  const analysisSelect = document.createElement("select");
  analysisSelect.className = "MH_EXT_time_select";
  analysisSelect.innerHTML = `
    <option value="oiChange">Analysis by OI Change</option>
    <option value="oi">Analysis by OI</option>
  `;
  analysisSelect.value = settings.analysis;

  const sortSelect = document.createElement("select");
  sortSelect.className = "MH_EXT_time_select";
  sortSelect.innerHTML = `
    <option value="symbol">Sort by Symbol</option>
    <option value="gap">Sort by Price Gap</option>
  `;
  sortSelect.value = settings.sort;

  const timingsContainer = document.createElement("div");
  timingsContainer.className = "MH_EXT_batch_timings";

  const container = document.createElement("div");
  container.className = "MH_EXT_market_hunt";

  const reRender = () => {
    const stored = JSON.parse(localStorage.getItem("marketHuntResults") || "{}");
    const existingData: Record<string, THuntAnalysis> = stored.data || {};
    if (Object.keys(existingData).length > 0) {
      renderMarketHunt(existingData, container, timingsContainer, stored.timestamps, analysisSelect.value, sortSelect.value);
    } else {
      container.innerHTML = "<p>No results found in storage</p>";
    }
  };

  const onSettingsChange = () => {
    localStorage.setItem("marketHuntSettings", JSON.stringify({ analysis: analysisSelect.value, sort: sortSelect.value }));
    reRender();
  };
  analysisSelect.onchange = onSettingsChange;
  sortSelect.onchange = onSettingsChange;

  renderResultButton.onclick = () => {
    container.innerHTML = "";
    reRender();
  };

  huntButton.onclick = async () => {
    const batchNumber = Number(batchSelect.value);
    huntButton.disabled = true;
    container.innerHTML = "";

    const batchSize = Math.ceil(F_N_O_STOCKS.length / 5);
    const startIndex = (batchNumber - 1) * batchSize;
    const endIndex = startIndex + batchSize;
    const batchStocks = F_N_O_STOCKS.slice(startIndex, endIndex);
    // console.log("batchStocks", batchStocks);

    for (let i = 0; i < batchStocks.length; i += 5) {
      const batch = batchStocks.slice(i, i + 5);
      const progress = `${Math.min(i + 5, batchStocks.length)}/${batchStocks.length}`;
      huntButton.textContent = `Fetching... ${progress}`;

      const data = await Promise.all(
        batch.map((stock) => fetchStockOIChange(stock, 300, true)),
      );

      const stored = JSON.parse(
        localStorage.getItem("marketHuntResults") || "{}",
      );
      const existingData: Record<string, THuntAnalysis> = stored.data || {};

      data.forEach((res) => {
        if ('error' in res) {
          console.warn(`Skipping ${res.symbol} due to error: ${res.message}`);
          return;
        }
        const analysis = analyzeMarketHunt(res);
        const { symbol } = analysis;
        existingData[symbol] = analysis;
      });

      const timestamps = stored.timestamps || {};
      timestamps[`batch${batchNumber}`] = Date.now();
      renderMarketHunt(existingData, container, timingsContainer, timestamps, analysisSelect.value, sortSelect.value);

      localStorage.setItem(
        "marketHuntResults",
        JSON.stringify({ data: existingData, timestamps }),
      );

      if (i + 5 < batchStocks.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    huntButton.textContent = "Start Hunt";
    huntButton.disabled = false;
  };

  wrapper.append(batchSelect, huntButton, renderResultButton, clearButton, analysisSelect, sortSelect, timingsContainer, container);
  document
    .querySelector(".app-container")
    ?.insertAdjacentElement("afterend", wrapper);
}
