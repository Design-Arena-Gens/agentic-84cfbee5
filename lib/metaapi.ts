import type { TradeSetup } from './types';

export type MetaApiContext = {
  metaapi: any;
  account: any;
  connection: any;
};

export async function connectMetaApi(): Promise<MetaApiContext | null> {
  const token = process.env.METAAPI_TOKEN;
  const accountId = process.env.METAAPI_ACCOUNT_ID;
  if (!token || !accountId) return null;

  const { default: MetaApi } = await import('metaapi.cloud-sdk');
  const metaapi = new MetaApi(token);
  const account = await metaapi.metatraderAccountApi.getAccount(accountId);
  if (account.state !== 'DEPLOYED') {
    await account.deploy();
  }
  await account.waitConnected();
  const connection = account.getRPCConnection();
  await connection.connect();
  await connection.waitSynchronized();
  return { metaapi, account, connection };
}

export async function fetchEquity(connection: any): Promise<number | null> {
  try {
    const info = await connection.getAccountInformation();
    return info?.equity ?? null;
  } catch {
    return null;
  }
}

export async function fetchPrice(connection: any, symbol: string): Promise<{ bid: number; ask: number } | null> {
  try {
    const price = await connection.getSymbolPrice(symbol);
    return price ? { bid: price.bid, ask: price.ask } : null;
  } catch {
    return null;
  }
}

export async function placeOrder(connection: any, setup: TradeSetup, lots: number): Promise<any> {
  const args = {
    sl: setup.stopLoss,
    tp: setup.takeProfit,
    comment: 'agentic-forex-bot'
  } as const;
  if (setup.direction === 'buy') {
    return await connection.createMarketBuyOrder(setup.symbol, lots, args);
  } else {
    return await connection.createMarketSellOrder(setup.symbol, lots, args);
  }
}
