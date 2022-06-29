import BaseModule from "@lib/module/BaseModule";
import sharePrototype from "./features/Share";
import followPoolsPrototype from "./features/FollowPools";
import swapPrototype from "./features/Swap";
import orderLimitPrototype from "./features/OrderLimit";
import nftTokenPrototype from "./features/NFTToken";
import stakingPrototype from "./features/Staking";
import liquidityPrototype from "./features/Liquidity";
import pancakePrototype from "./features/Pancake";
import uniPrototype from "./features/Uni";
import curvePrototype from "./features/Curve";
class PDexV3 extends BaseModule {
  constructor() {
    super();
  }
}

Object.assign(
  PDexV3.prototype,
  sharePrototype,
  followPoolsPrototype,
  swapPrototype,
  orderLimitPrototype,
  nftTokenPrototype,
  liquidityPrototype,
  stakingPrototype,
  pancakePrototype,
  uniPrototype,
  curvePrototype
);

export default PDexV3;
