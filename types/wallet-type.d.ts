// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

declare module "incognito-chain-web-js/types/wallet-type" {
  abstract class Object {}

  interface Method {}

  type MasterAccountType = any;
  type SeedType = any;
  type StorageType = any;

  interface WalletMethod extends Method {
    configWallet(passPhrase: string, storage: any, name: string, mnemonic: string, network: string): void | Error;
    init(passPhrase: string, storage: any, walletName: string, accountName: string): Promise<void | Error>;
    import(mnemonic: string, passPhrase: string, name: string, storage: any): Promise<void | Error>;
    loadWallet(passPhrase: { password: string; aesKey: string }): Promise<void | Error>;
    save(aesKey: string, legacyEncryption?: boolean);
  }

  interface WalletBase extends WalletMethod {}

  abstract class WalletBase extends Object {
    PassPhrase?: string;
    Mnemonic?: string;
    MasterAccount?: MasterAccountType;
    Name?: string;
    Seed?: SeedType;
    Storage?: StorageType;
    Network?: string;
    measureStorage?: any;
    IsMasterless?: boolean;
    RootName?: string;
    RpcClient?: string;
    RpcCoinService?: string;
    PrivacyVersion?: number;
    UseLegacyEncoding?: boolean;
    RpcApiService?: string;
    PortalService?: string;
    PubsubService?: string;
    RpcRequestService?: string;
    IsBIP44?: boolean;
    deletedAccountIds?: any[];
  }

  export class Wallet extends WalletBase {}
}

declare module "incognito-chain-web-js/lib/wallet-type" {
  export * from "incognito-chain-web-js/types/wallet-type";
}
