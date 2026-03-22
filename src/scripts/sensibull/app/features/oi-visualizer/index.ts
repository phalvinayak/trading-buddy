function parseOIValue(text: string): number {
  const num = parseFloat(text.replace(/,/g, ""));
  if (text.includes("Cr")) return num * 10000000;
  if (text.includes("L")) return num * 100000;
  return num;
}

function updateColor(el: Element) {
  const dataPoints = el.querySelectorAll(".data-point");
  const cols = el.querySelectorAll(".col");

  let callText = "",
    putText = "";

  if (dataPoints.length) {
    callText = dataPoints[0]?.querySelector("p:last-child")?.textContent || "";
    putText = dataPoints[1]?.querySelector("p:last-child")?.textContent || "";
  } else if (cols.length === 2) {
    const dataEls = cols[1].querySelectorAll(".data");
    callText = dataEls[0]?.textContent || "";
    putText = dataEls[1]?.textContent || "";
  }

  const callOI = parseOIValue(callText);
  const putOI = parseOIValue(putText);
  const diff = putOI - callOI;

  const style = (el as HTMLElement).style;
  style.backgroundColor = diff > 0 ? "#106a26" : diff < 0 ? "#924148" : "";
  style.padding = "3px 10px";
  el.querySelectorAll("div p").forEach((p) => {
    (p as HTMLElement).style.color = diff !== 0 ? "#fff" : "";
  });
}

export function visualizeOiChange() {
  const elements = document.querySelectorAll(
    ".data-point-grp, .data-points-grp",
  );
  elements.forEach((el) => {
    updateColor(el);
    const observer = new MutationObserver(() => updateColor(el));
    observer.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
}
