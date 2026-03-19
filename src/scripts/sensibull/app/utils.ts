export type ExpiryInfo = {
  is_weekly: boolean;
  is_enabled: boolean;
};

export type PerStrikeData = {
  call_oi_change: number;
  put_oi_change: number;
  from_call_oi: number;
  to_call_oi: number;
  from_put_oi: number;
  to_put_oi: number;
};

export type OIChangeInput = {
  underlying: string;
  mode: string;
  expiries: Record<string, ExpiryInfo>;
  atm_strike_selection: string;
  input_min_strike: number | null;
  input_max_strike: number | null;
  from_time: string;
  to_time: string;
  auto_update: string;
  from_date: string | null;
  to_date: string | null;
  show_oi: boolean;
};

export type OIChangePayload = {
  input: OIChangeInput;
  data_from_date: string | null;
  data_to_date: string | null;
  intraday_unavailable: string | null;
  available_timestamps: string[];
  available_dates: string[] | null;
  from_ltp: number;
  to_ltp: number;
  current_ltp: number;
  atm_strike: number;
  min_strike: number;
  max_strike: number;
  strike_list: number[];
  total_call_oi_change: number;
  total_put_oi_change: number;
  per_strike_data: Record<string, PerStrikeData>;
};

export type OIChangeResponse = {
  success: boolean;
  payload: OIChangePayload;
};

const timeMap = {
  5: "last_five_min",
  10: "last_ten_min",
  15: "last_fifteen_min",
  30: "last_thirty_min",
  60: "last_one_hour",
  120: "last_two_hour",
  180: "last_three_hour",
  300: "full_day",
};

export type TTimeSlot = keyof typeof timeMap;

export function getFromTimeUTC(minutesBack: TTimeSlot): {
  time: string;
  update: string;
} {
  const now = new Date();

  const maxTime = new Date(now);
  maxTime.setUTCHours(10, 0, 0, 0); // 15:30 IST = 10:00 UTC

  const effectiveTime = now > maxTime ? maxTime : now;
  effectiveTime.setUTCMinutes(effectiveTime.getUTCMinutes() - minutesBack);
  effectiveTime.setUTCSeconds(0, 0);

  const time = effectiveTime.toISOString();
  return { time, update: timeMap[minutesBack] };
}

export function getToTimeUTC(): string {
  const now = new Date();

  const maxTime = new Date(now);
  maxTime.setUTCHours(14, 0, 0, 0); // 19:30 IST = 14:00 UTC

  const effectiveTime = now > maxTime ? maxTime : now;
  effectiveTime.setUTCSeconds(0, 0);

  return effectiveTime.toISOString();
}

export function getClosest50(num: number): number {
  return Math.round(num / 50) * 50;
}

export function getSurroundingStrikes(
  strikeList: number[],
  targetStrike: number,
): number[] {
  const index = strikeList.indexOf(targetStrike);
  if (index === -1) return [];
  const start = Math.max(0, index - 10);
  const end = Math.min(strikeList.length, index + 11);
  return strikeList.slice(start, end);
}

export function formatIndianNumber(num: number): string {
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 10000000) return sign + (abs / 10000000).toFixed(2) + "Cr";
  if (abs >= 100000) return sign + (abs / 100000).toFixed(2) + "L";
  return num.toLocaleString("en-IN");
}

export type TAnalysis = {
  symbol: string;
  call: number;
  put: number;
  result: string;
  pcDiff: number;
  weight?: number;
};

export type THuntAnalysis = {
  symbol: string;
  price: number;
  atmStrike: number;
  highestCallOi: number;
  highestCallOiStrike: number;
  highestPutOi: number;
  highestPutOiStrike: number;
  highestCallOiChange: number;
  highestCallOiChangeStrike: number;
  highestPutOiChange: number;
  highestPutOiChangeStrike: number;
  bullGapOi: number;
  bullGapOiPct: number;
  bullGapOiChange: number;
  bullGapOiChangePct: number;
  bearGapOi: number;
  bearGapOiPct: number;
  bearGapOiChange: number;
  bearGapOiChangePct: number;
};

export function parseResponse(response: OIChangeResponse): TAnalysis {
  const { payload } = response;
  const { strike_list, per_strike_data, atm_strike: atmStrike } = payload;

  // const atmStrike = getClosest50(to_ltp);
  const strikesList = getSurroundingStrikes(strike_list, atmStrike);
  const oiChange = {
    symbol: payload.input.underlying,
    call: 0,
    put: 0,
    result: "",
    pcDiff: 0,
  };
  // console.log("Strikelist selected", strikesList, atmStrike);
  strikesList.forEach((strike) => {
    const strikeKey = Number(strike).toString();
    if (per_strike_data[strikeKey].put_oi_change) {
      oiChange.put += per_strike_data[strikeKey].put_oi_change;
    }
    if (per_strike_data[strikeKey].call_oi_change) {
      oiChange.call += per_strike_data[strikeKey].call_oi_change;
    }

    // if (per_strike_data[strikeKey]) {
    //   if (strike === atmStrike) {
    //     oiChange.put += per_strike_data[strikeKey].put_oi_change;
    //     oiChange.call += per_strike_data[strikeKey].call_oi_change;
    //   } else if (strike > atmStrike) {
    //     oiChange.put += per_strike_data[strikeKey].put_oi_change;
    //   } else {
    //     oiChange.call += per_strike_data[strikeKey].call_oi_change;
    //   }
    // }
  });
  oiChange.result = oiChange.call > oiChange.put ? "Bearish" : "Bullish";
  oiChange.pcDiff = oiChange.put - oiChange.call;
  return oiChange;
}

export function getSymbol() {
  return (
    document.querySelector("span.instrument-symbol")?.textContent || "NIFTY"
  );
}
