export function getExpiriesFromDOM() {
  const expiries: Record<string, { is_weekly: boolean; is_enabled: boolean }> =
    {};
  const container = document.querySelector(".expiries");
  const checkboxes = container?.querySelectorAll('button[role="checkbox"]');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  checkboxes?.forEach((checkbox) => {
    const row = checkbox.closest("div")?.parentElement;
    const label = row?.querySelector("label p")?.textContent || "";
    const isWeekly = row?.querySelector(".w-text") !== null;
    const isEnabled = checkbox.getAttribute("aria-checked") === "true";

    const match = label.match(/(\d{2})\s+(\w{3})/);
    if (match) {
      const day = match[1];
      const month = match[2];
      const monthMap: Record<string, string> = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
      };
      const monthNum = parseInt(monthMap[month]) - 1;
      const year = monthNum < currentMonth ? currentYear + 1 : currentYear;
      const date = `${year}-${monthMap[month]}-${day}`;

      expiries[date] = { is_weekly: isWeekly, is_enabled: isEnabled };
    }
  });

  return expiries;
}

export function getMonthlyExpiries() {
  const expiries = getExpiriesFromDOM();
  return Object.keys(expiries)
    .filter((date) => !expiries[date].is_weekly)
    .sort();
}
