// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

declare module "incognito-chain-web-js/types/common" {
  export const PRVIDSTR = "0000000000000000000000000000000000000000000000000000000000000004";
  export const PTOKEN_ID = "0000000000000000000000000000000000000000000000000000000000000005";

  export type TokenID = string;
  export type UnspentCoins = Coins[];

  export type BalanceObject = {
    amount: string; //Balance, Nano
    id: TokenID; //TokenID
    swipable: boolean; //Can Delete on UI
  };

  export type CoinsScanResult = {
    [PRVIDSTR]: {
      missingBatchIDs: any;
      latestBatchID: number;
      latestIndex: number;
      unspentCoins: Coins[];
    };
    [PTOKEN_ID]: {
      missingBatchIDs: any;
      latestBatchID: number;
      latestIndex: number;
      unspentCoins: Coins[];
    };
    tokenList: TokenID[];
    finishScan: boolean;
  };

  export type Coins = {
    Version?: string;
    Info?: string;
    Index?: string;
    PublicKey?: string;
    Commitment?: string;
    KeyImage?: string;
    SharedRandom?: string;
    SharedConcealRandom?: string;
    TxRandom?: string;
    Randomness?: string;
    Value?: string;
    CoinDetailsEncrypted?: string;
    SNDerivator?: string;
    AssetTag?: string;
    TokenID?: string;
  };

  export type AsyncFunction<Args = void, Output = void> = (...args: Args[]) => Promise<Output>;
}

declare module "incognito-chain-web-js/lib/common" {
  export * from "incognito-chain-web-js/types/common";
}
