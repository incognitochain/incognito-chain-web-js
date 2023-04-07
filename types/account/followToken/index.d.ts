// Type definitions for resolve
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.7

declare module "incognito-chain-web-js/types/account/followToken" {
  import { BalanceObject, TokenID } from "incognito-chain-web-js/types/common";
  import { Method } from "incognito-chain-web-js/types/global";

  //Specific Action
  interface FollowToken extends Method {
    getKeyFollowTokens(): void | Error;
    getKeyFollowedDefaultTokens(): void | Error;

    getListFollowingTokens(): Promise<TokenID[]>;
    isFollowedDefaultTokens(): Promise<boolean> | Error;
    followingDefaultTokens(params: { tokenIDs: TokenID[] }): Promise<void>;
    setListFollowingTokens(params: { list: TokenID[] }): Promise<boolean>;
    addListFollowingToken(params: { tokenIDs: TokenID[] }): Promise<void>;
    removeFollowingToken(params: { tokenID: TokenID[] }): Promise<void>;

    getFollowTokensBalance(params: { defaultTokens: TokenID[]; version: number }): Promise<{
      followTokens: TokenID[];
      balance: BalanceObject[];
    }>;
  }
  export type { FollowToken };
}

declare module "incognito-chain-web-js/types/account/followToken" {
  export * from "incognito-chain-web-js/types/account/followToken";
}
