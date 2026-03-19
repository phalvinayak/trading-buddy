import { fetchStockOIChange } from "@src/scripts/sensibull/app/dataFetch";
import type { TAnalysis, TTimeSlot } from "@src/scripts/sensibull/app/utils";
import {
  formatIndianNumber,
  parseResponse,
} from "@src/scripts/sensibull/app/utils";
import { NIFTY_50_STOCKS } from "@src/scripts/sensibull/data/niftyStocks";

function renderStockCard(stockData: TAnalysis, container: HTMLElement) {
  const card = document.createElement("div");
  card.className = `MH_EXT_stock_card ${stockData.result.toLowerCase()}`;
  card.innerHTML = `
    <div class="MH_EXT_card_header">
      <h3>${stockData.symbol} <span class="MH_EXT_weight_pill">${stockData.weight?.toFixed(2)}%</span></h3>
      <span class="MH_EXT_badge ${stockData.result.toLowerCase()}">${stockData.result}</span>
    </div>
    <div class="MH_EXT_card_body">
      <div class="MH_EXT_stat">
        <span class="MH_EXT_label">Call OI</span>
        <span class="MH_EXT_value">${formatIndianNumber(stockData.call)}</span>
      </div>
      <div class="MH_EXT_stat">
        <span class="MH_EXT_label">Put OI</span>
        <span class="MH_EXT_value">${formatIndianNumber(stockData.put)}</span>
      </div>
      <div class="MH_EXT_stat">
        <span class="MH_EXT_label">P-C Diff</span>
        <span class="MH_EXT_value">${formatIndianNumber(stockData.pcDiff)}</span>
      </div>
    </div>
  `;
  container.appendChild(card);
}

export function broaderMarketView() {
  const wrapper = document.createElement("div");
  wrapper.className = "MH_EXT_market_wrapper";

  const timeSelect = document.createElement("select");
  timeSelect.className = "MH_EXT_time_select";
  timeSelect.innerHTML = `
    <option value="5">5 Min</option>
    <option value="10" selected>10 Min</option>
    <option value="15">15 Min</option>
    <option value="30">30 Min</option>
    <option value="60">1 Hr</option>
    <option value="120">2 Hrs</option>
    <option value="180">3 Hrs</option>
    <option value="300">Full Day</option>
  `;

  const marketDataBtn = document.createElement("button");
  marketDataBtn.textContent = "Fetch Market Data";
  marketDataBtn.className = "MH_EXT_button";

  const scoreDisplay = document.createElement("span");
  scoreDisplay.className = "MH_EXT_sentiment_score";

  const container = document.createElement("div");
  container.className = "MH_EXT_market_view";

  marketDataBtn.onclick = async () => {
    const timeframe = Number(timeSelect.value) as TTimeSlot;
    const stocksToAnalyze = NIFTY_50_STOCKS.filter(
      (stock) => stock.weight >= 1.5,
    );
    marketDataBtn.disabled = true;
    container.innerHTML = "";
    let sentimentScore = 0;

    for (let i = 0; i < stocksToAnalyze.length; i += 5) {
      const batch = stocksToAnalyze.slice(i, i + 5);
      const progress = `${Math.min(i + 5, stocksToAnalyze.length)}/${stocksToAnalyze.length}`;
      marketDataBtn.textContent = `Fetching... ${progress}`;

      const data = await Promise.all(
        batch.map((stock) => fetchStockOIChange(stock.symbol, timeframe)),
      );

      data.forEach((d, idx) => {
        if ('error' in d) {
          console.warn(`Skipping ${d.symbol} due to error: ${d.message}`);
          return;
        }
        const stockData = { ...parseResponse(d), ...batch[idx] };
        if (stockData.result === "Bullish") {
          sentimentScore += stockData.weight || 0;
        } else if (stockData.result === "Bearish") {
          sentimentScore -= stockData.weight || 0;
        }
        renderStockCard(stockData, container);
      });

      const timeLabel = timeSelect.options[timeSelect.selectedIndex].text;
      scoreDisplay.textContent = `Sentiment Score on ${timeLabel} timeframe: ${sentimentScore.toFixed(2)}`;
      scoreDisplay.className = `MH_EXT_sentiment_score ${
        sentimentScore > 0
          ? "positive"
          : sentimentScore < 0
            ? "negative"
            : "neutral"
      }`;

      if (i + 5 < stocksToAnalyze.length) {
        marketDataBtn.textContent = `Waiting... ${progress}`;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    marketDataBtn.textContent = "Fetch Market Data";
    marketDataBtn.disabled = false;
  };

  wrapper.append(timeSelect, marketDataBtn, scoreDisplay, container);
  document
    .querySelector(".app-container")
    ?.insertAdjacentElement("afterend", wrapper);
}
