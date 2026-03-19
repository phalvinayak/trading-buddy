(async () => {
  const src = chrome.runtime.getURL("/scripts/sensibull/sensibull.js");
  await import(src);
})();
