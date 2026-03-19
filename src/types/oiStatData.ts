export interface StrikeData {
  maxtimestamp: string;
  Calls_Price: number;
  Puts_Price: number;
  Calls_Price_Chg: number;
  Puts_Price_Chg: number;
  Calls_Qty: number;
  Puts_Qty: number;
  CallOIChange_Qty: number;
  PutOIChange_Qty: number;
  callMaxOI_Qty: number;
  putMaxOI_Qty: number;
  MaxoiChangeCall_Qty: number;
  MaxoiChangePut_Qty: number;
  Calls_Value: number;
  Puts_Value: number;
  CallOIChange_Value: number;
  PutOIChange_Value: number;
  callMaxOI_Value: number;
  putMaxOI_Value: number;
  MaxoiChangeCall_Value: number;
  MaxoiChangePut_Value: number;
  Calls: number;
  Puts: number;
  CallOIChange: number;
  PutOIChange: number;
  callMaxOI: number;
  putMaxOI: number;
  MaxoiChangeCall: number;
  MaxoiChangePut: number;
}

export type OIStatData = [
  string[], // Array of strike prices
  Record<string, StrikeData> // Object with strike prices as keys and StrikeData as values
];