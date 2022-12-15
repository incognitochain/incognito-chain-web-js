import liquidity from "./liquidity";
import liquidityStorage from "./liquidity.storage";
import liquidityHistories from "./liquidity.histories";

const liquidityPrototype = {
  ...liquidityStorage,
  ...liquidityHistories,
  ...liquidity,
};

export default liquidityPrototype;
