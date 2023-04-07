// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

declare module "incognito-chain-web-js/types/account/CoinsV3" {
  import { Account } from "incognito-chain-web-js/types/account";
  import { CoinsScanResult, TokenID } from "incognito-chain-web-js/types/common";
  import { Method } from "incognito-chain-web-js/types/global";

  /*
  / ------------------------------------------------------------
  /                     CoinsV3ScanCoins
  / ------------------------------------------------------------
  */

  interface CoinsV3ScanCoins extends Method {
    scanCoins(parasm: { accountWallet: Account; tokenList: TokenID[] }): Promise<CoinsScanResult | Error>;
    loopStorageCoins(parasm: CoinsScanResult): Promise<void | Error>;
  }

  /*
  / ------------------------------------------------------------
  /                     CoinsV3Storage
  / ------------------------------------------------------------
  */

  interface CoinsV3Storage extends Method {
    getStorageCoinsScan(): Promise<CoinsScanResult>;
    getStorageCoinsScanKey(): string; //KEY = `${otaKey}${fullNode}VERSION_3:(COINS_SCAN)`
    getStorageHardwareAccountIndexKey(): string; //KEY = `${otaKey}${fullNode}VERSION_3:(HARDWARE_ACCOUNT_INDEX)`
    getStorageHardwareAccountIndex(): Promise<void> | Error;

    setStorageCoinsScan(parasm: CoinsScanResult): Promise<void> | Error;
    setStorageHardwareAccountIndex(index: number): Promise<void> | Error;
    setNewAccountCoinsScan(): Promise<void> | Error;
    clearStorageCoinsScan(): Promise<void> | Error;
  }

  /*
  / ------------------------------------------------------------
  /                     CoinsV3UnspentCoins
  / ------------------------------------------------------------
  */

  interface CoinsV3UnspentCoins extends Method {
    loopGetUnspentCoinsV3(): Promise<CoinsScanResult> | Error;
    getUnspentCoinsV3(params: { tokenID: string; version: number; isNFT: boolean }): Promise<UnspentCoins> | Error;
  }

  interface CoinsV3 extends CoinsV3Storage, CoinsV3ScanCoins, CoinsV3UnspentCoins {}
}

declare module "incognito-chain-web-js/types/account/CoinsV3" {
  export * from "incognito-chain-web-js/types/account/CoinsV3";
}
