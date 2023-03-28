// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7
/// <reference types="node" />
/// <reference path="global.d.ts" />

/// <reference path="wallet.d.ts" />
/// <reference path="account.d.ts" />
/// ...

// This is not single module. There are many module included by reference directives.

declare module "incognito-chain-web-js" {
  export * from "incognito-chain-web-js/types/global";
  export * from "incognito-chain-web-js/types/wallet";
  export * from "incognito-chain-web-js/types/account";
}
