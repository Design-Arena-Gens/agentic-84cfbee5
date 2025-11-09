import type { Candle, TradeSetup } from './types';

export async function analyzeMarketsWithGemini(params: {
  symbols: string[];
  candlesBySymbol: Record<string, Candle[]>;
}): Promise<TradeSetup[]> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return [];

  const compact = (cs: Candle[]) => cs.slice(-120).map(c => ({
    t: c.time,
    o: Number(c.open.toFixed(6)),
    h: Number(c.high.toFixed(6)),
    l: Number(c.low.toFixed(6)),
    c: Number(c.close.toFixed(6))
  }));

  const input = {
    instruction: 'Analyze FX candles and propose high-probability setups with SL/TP and confidence.',
    risk: { maxRiskPerTrade: 0.01, preferRR: 1.8 },
    data: params.symbols.map(s => ({ symbol: s, candles: compact(params.candlesBySymbol[s] || []) }))
  };

  const schema = {
    type: 'object',
    properties: {
      setups: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            direction: { type: 'string', enum: ['buy', 'sell'] },
            entry: { type: 'number' },
            stopLoss: { type: 'number' },
            takeProfit: { type: 'number' },
            confidence: { type: 'number' },
            rationale: { type: 'string' }
          },
          required: ['symbol', 'direction', 'entry', 'stopLoss', 'takeProfit', 'confidence']
        }
      }
    },
    required: ['setups']
  } as const;

  const contents = [
    { role: 'user', parts: [{ text: `Return JSON strictly following this JSON Schema: ${JSON.stringify(schema)}` }] },
    { role: 'user', parts: [{ text: JSON.stringify(input) }] }
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { response_mime_type: 'application/json' } })
  });
  if (!res.ok) return [];
  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    const setups = (parsed.setups || []) as any[];
    return setups
      .filter(s => params.symbols.includes(s.symbol))
      .map(s => ({
        symbol: s.symbol,
        direction: s.direction,
        entry: Number(s.entry),
        stopLoss: Number(s.stopLoss),
        takeProfit: Number(s.takeProfit),
        confidence: Math.max(0, Math.min(1, Number(s.confidence))),
        rationale: s.rationale
      }))
      .filter(s => Number.isFinite(s.entry) && Number.isFinite(s.stopLoss) && Number.isFinite(s.takeProfit));
  } catch {
    return [];
  }
}
