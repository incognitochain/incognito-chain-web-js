// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

declare module "incognito-chain-web-js/types/account" {
  import { AccountMethod } from "incognito-chain-web-js/types/account";

  // Combine All Method to Class
  interface AccountBase extends AccountMethod {}

  // Define Account's methods

  abstract class AccountBase extends Object {
    ID?: number;
    AccountName?: string;
    PrivateKey?: string;
    PaymentAddress?: string;
    ReadonlyKey?: string;
    PublicKey?: string;
    PublicKeyCheckEncode?: string;
    ValidatorKey?: string;
    BLSPublicKey?: string;
    PublicKeyBytes?: string;
    OTAKey?: string;
    PaymentAddressV1?: string;
    accountName?: string;
    name?: string;
    PublicKeyBase64?: string;
    Index?: number;
  }
  export class Account extends AccountBase {}
}

declare module "incognito-chain-web-js/lib/account" {
  export * from "incognito-chain-web-js/types/account";
}
