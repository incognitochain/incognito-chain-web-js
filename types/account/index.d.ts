// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

declare module "incognito-chain-web-js/types/account" {
  /*
  / ------------------------------------------------------------
  /                     Import Account Sub-Module
  / ------------------------------------------------------------
  */

  import { CoinsV3 } from "incognito-chain-web-js/types/account/CoinsV3";
  import { FollowToken } from "incognito-chain-web-js/types/account/followToken";
  // import ....
  // import ....
  // import ....

  // Union all Modules
  interface AccountMethod extends FollowToken, CoinsV3 {}

  export type { AccountMethod };
}

declare module "incognito-chain-web-js/types/account" {
  export * from "incognito-chain-web-js/types/account";
}
