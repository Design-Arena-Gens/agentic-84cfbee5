import type { Candle, TradeSetup, TradeDirection } from './types';

export function computeATR(candles: Candle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trs.push(tr);
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) atr = (atr * (period - 1) + trs[i]) / period;
  return atr;
}

export function proposeSLTP(entry: number, direction: TradeDirection, atr: number, slMult = 1.5, tpRR = 2): { sl: number; tp: number } {
  if (direction === 'buy') {
    const sl = entry - slMult * atr;
    const tp = entry + tpRR * (entry - sl);
    return { sl, tp };
  }
  const sl = entry + slMult * atr;
  const tp = entry - tpRR * (sl - entry);
  return { sl, tp };
}

export function positionSizeLots(params: {
  equity: number; // account equity in account currency
  riskFraction: number; // e.g. 0.01 for 1%
  entry: number;
  stopLoss: number;
  symbol: string;
  contractSize?: number; // default 100000 for FX
  pipSize?: number; // default 0.0001
  pipValuePerStandardLot?: number; // approx $10 per pip per lot on majors
}): number {
  const {
    equity,
    riskFraction,
    entry,
    stopLoss,
    contractSize = 100000,
    pipSize = inferPipSize(params.symbol),
    pipValuePerStandardLot = 10
  } = params;

  const riskAmount = equity * riskFraction;
  const stopPips = Math.max(1, Math.abs(entry - stopLoss) / pipSize);
  const valuePerLotPerPip = pipValuePerStandardLot; // approximation for USD-quoted majors
  const lots = riskAmount / (stopPips * valuePerLotPerPip);
  return roundStep(lots, 0.01);
}

function roundStep(value: number, step: number): number {
  return Math.max(0, Math.floor((value + 1e-9) / step) * step);
}

function inferPipSize(symbol: string): number {
  // Simple heuristic for common FX pairs
  if (symbol.endsWith('JPY')) return 0.01;
  return 0.0001;
}
