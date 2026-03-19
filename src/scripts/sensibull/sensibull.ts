import { renderSensibullApp } from "@src/scripts/sensibull/app/ui";
import documentReady from "@src/scripts/utils/documentReady";

function main() {
  console.log("Sensibull Helper Loaded!!");
  renderSensibullApp();
}

documentReady(() => {
  setTimeout(main, 1000);
});
