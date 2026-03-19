import { marketHunt } from "@src/scripts/sensibull/app/features/market-hunt";
import { visualizeOiChange } from "@src/scripts/sensibull/app/features/oi-visualizer";

export function renderSensibullApp() {
  marketHunt();
  visualizeOiChange();

  let lastUrl = location.href;
  const checkUrlChange = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(visualizeOiChange, 1000);
    }
  };

  new MutationObserver(checkUrlChange).observe(document, {
    childList: true,
    subtree: true,
  });
}
