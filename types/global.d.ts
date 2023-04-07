/*
React projects that don't include the Node library need these interfaces to compile. The JavaScript runtime
is ES6/ES2015 only. These definitions allow such projects to compile with only `--lib ES6`.

Warning: all of these interfaces are empty. If you want type definitions for various properties
*/

declare module "incognito-chain-web-js/types/global" {
  // Don't override it, it will be used to extend in the future!
  interface Action {}
  interface Event {}
  interface Method {}

  interface WalletEvent extends Event {}
  interface AccountEvent extends Event {}

  interface WalletAction extends Action {}
  interface AccountAction extends Action {}

  interface WalletMethod extends Method {}
  interface AccountMethod extends Method {}

  export { Action, Event, Method, WalletEvent, AccountEvent, WalletAction, AccountAction, WalletMethod, AccountMethod };
}

declare module "incognito-chain-web-js/lib/global" {
  export * from "incognito-chain-web-js/types/global";
}
