import { getExpiriesFromDOM, getMonthlyExpiries } from "@src/scripts/sensibull/app/htmlParser";
import {
  getFromTimeUTC,
  getSymbol,
  getToTimeUTC,
  type OIChangeResponse,
  type TTimeSlot,
} from "@src/scripts/sensibull/app/utils";
import axios from "axios";

type OIDataError = { error: true; symbol: string; message: string };
type OIDataResult = OIChangeResponse | OIDataError;

async function fetchOIData(
  underlying: string,
  expiries: Record<string, { is_weekly: boolean; is_enabled: boolean }>,
  time: TTimeSlot,
  show_oi: boolean = false,
): Promise<OIDataResult> {
  try {
    const { time: fromTime, update } = getFromTimeUTC(time);
    const toTime = getToTimeUTC();
    const URL =
      "https://oxide.sensibull.com/v1/compute/1/oi_graphs/oi_change_chart";
    const requestPayload = {
      underlying,
      mode: "intraday",
      expiries,
      atm_strike_selection: "twenty_five",
      input_min_strike: null,
      input_max_strike: null,
      from_time: fromTime,
      to_time: toTime,
      auto_update: update,
      from_date: null,
      to_date: null,
      show_oi,
    };
    const response = await axios.post(URL, requestPayload);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch OI data for ${underlying}:`, error);
    return {
      error: true,
      symbol: underlying,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function fetchOIChangeData(
  time: TTimeSlot,
): Promise<OIDataResult> {
  const expiries = getExpiriesFromDOM();
  const pageSymbol = getSymbol();
  return fetchOIData(pageSymbol, expiries, time);
}

type FetchStockOIChangeParams = {
  symbol: string;
  time: TTimeSlot;
  show_oi?: boolean;
  expiry?: "current" | "next";
};

export async function fetchStockOIChange({
  symbol,
  time,
  show_oi = false,
  expiry = "next",
}: FetchStockOIChangeParams): Promise<OIDataResult> {
  const monthlyExpiries = getMonthlyExpiries();
  const currentMonthly = monthlyExpiries[0];
  const nextMonthly = monthlyExpiries[1];
  const enabledExpiry = expiry === "current" ? currentMonthly : nextMonthly;
  const disabledExpiry = expiry === "current" ? nextMonthly : currentMonthly;
  const finalExpiries = {
    [disabledExpiry]: {
      is_weekly: false,
      is_enabled: false,
    },
    [enabledExpiry]: {
      is_weekly: false,
      is_enabled: true,
    },
  };
  return fetchOIData(symbol, finalExpiries, time, show_oi);
}
