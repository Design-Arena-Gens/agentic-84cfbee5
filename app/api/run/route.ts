import { NextResponse } from 'next/server';
import { analyzeMarketsWithGemini } from '../../../lib/gemini';
import { positionSizeLots } from '../../../lib/risk';
import { connectMetaApi, fetchEquity, fetchPrice, placeOrder } from '../../../lib/metaapi';
import type { Candle, TradeSetup } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY'];

export async function GET() {
  try {
    const hasAI = !!process.env.GOOGLE_API_KEY;
    const hasMT = !!process.env.METAAPI_TOKEN && !!process.env.METAAPI_ACCOUNT_ID;

    // Connect to MetaApi when possible
    const ctx = hasMT ? await connectMetaApi() : null;
    const connection = ctx?.connection;

    // Prepare candles (empty placeholder: Gemini can still reason, or you can wire real candles via MetaApi later)
    const candlesBySymbol: Record<string, Candle[]> = Object.fromEntries(
      SYMBOLS.map(s => [s, []])
    );

    // Optional: enrich with last price when available
    const prices: Record<string, { bid: number; ask: number } | null> = {};
    if (connection) {
      await Promise.all(SYMBOLS.map(async s => {
        prices[s] = await fetchPrice(connection, s);
      }));
    }

    // Run AI analysis
    let setups: TradeSetup[] = [];
    if (hasAI) {
      setups = await analyzeMarketsWithGemini({ symbols: SYMBOLS, candlesBySymbol });
    }

    // Filter for high-confidence setups
    const selected = setups.filter(s => s.confidence >= 0.6);

    // Risk and execution
    const equity = connection ? (await fetchEquity(connection)) ?? 0 : 0;
    const results: any[] = [];

    for (const setup of selected) {
      const price = prices[setup.symbol];
      const entry = setup.entry || (setup.direction === 'buy' ? price?.ask : price?.bid);
      if (!entry || !Number.isFinite(entry)) continue;

      const lots = equity > 0
        ? positionSizeLots({ equity, riskFraction: 0.01, entry, stopLoss: setup.stopLoss, symbol: setup.symbol })
        : 0;

      if (connection && lots > 0.0) {
        try {
          const res = await placeOrder(connection, { ...setup, entry }, lots);
          results.push({ symbol: setup.symbol, lots, status: 'placed', ticket: res?.id ?? null });
        } catch (e: any) {
          results.push({ symbol: setup.symbol, lots, status: 'error', error: String(e?.message ?? e) });
        }
      } else {
        results.push({ symbol: setup.symbol, lots, status: 'skipped', reason: connection ? 'zero-lots' : 'no-connection' });
      }
    }

    return NextResponse.json({
      ok: true,
      env: { ai: hasAI, metaapi: hasMT },
      symbols: SYMBOLS,
      setups: selected,
      results
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
