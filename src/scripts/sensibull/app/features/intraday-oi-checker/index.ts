import { fetchOIChangeData } from "@src/scripts/sensibull/app/dataFetch";
import type {
  OIChangeResponse,
  TAnalysis,
} from "@src/scripts/sensibull/app/utils";
import {
  formatIndianNumber,
  getSymbol,
  parseResponse,
} from "@src/scripts/sensibull/app/utils";

function renderTable(data: TAnalysis[], outputDiv: HTMLElement) {
  const symbol = getSymbol();
  outputDiv.innerHTML = `
    <table class="MH_EXT_table">
      <thead>
        <tr>
          <th colspan="5" style="text-align: center;">${symbol}</th>
        </tr>
        <tr>
          <th>Time</th>
          <th>Call OI</th>
          <th>Put OI</th>
          <th>P-C Diff</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (item, i) => `
          <tr>
            <td>${[5, 10, 15, 30, 60][i]}m</td>
            <td>${formatIndianNumber(item.call)}</td>
            <td>${formatIndianNumber(item.put)}</td>
            <td>${formatIndianNumber(item.pcDiff)}</td>
            <td class="${item.result.toLowerCase()}">${item.result}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function intraDayOIChecker() {
  const button = document.createElement("button");
  button.textContent = "Analyze";
  button.className = "MH_EXT_analyze_button";

  const overlay = document.createElement("div");
  overlay.className = "MH_EXT_overlay";

  const popup = document.createElement("div");
  popup.className = "MH_EXT_popup";
  popup.innerHTML = `
    <div>
      <h2 class="MH_EXT_popup_title">ITM OI Change Analysis</h2>
      <div>
        <div>
          <button class="MH_EXT_button MH_EXT_fetch_button">Fetch Data</button>
        </div>
        <div class="MH_EXT_output"></div>
      </div>
      <button class="MH_EXT_button MH_EXT_close_button">Close</button>
    </div>`;

  const showPopup = () => {
    overlay.style.display = "block";
    popup.style.display = "block";
  };

  const hidePopup = () => {
    overlay.style.display = "none";
    popup.style.display = "none";
  };

  button.onclick = showPopup;
  popup
    .querySelector(".MH_EXT_close_button")!
    .addEventListener("click", hidePopup);
  popup.querySelector(".MH_EXT_fetch_button")!.addEventListener("click", () => {
    const outputDiv = popup.querySelector(".MH_EXT_output") as HTMLElement;
    Promise.all([
      fetchOIChangeData(5),
      fetchOIChangeData(10),
      fetchOIChangeData(15),
      fetchOIChangeData(30),
      fetchOIChangeData(60),
    ]).then((data) => {
      const result = data
        .filter((d): d is OIChangeResponse => !("error" in d))
        .map((d) => parseResponse(d));
      renderTable(result, outputDiv);
    });
  });

  document.body.append(button, overlay, popup);
}
