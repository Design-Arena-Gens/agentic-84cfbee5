export type Candle = { time: number; open: number; high: number; low: number; close: number; };

export type TradeDirection = 'buy' | 'sell';

export type TradeSetup = {
  symbol: string;
  direction: TradeDirection;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number; // 0..1
  rationale?: string;
};
