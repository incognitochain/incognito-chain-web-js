export * from "./history.constant";

import history from "./history";
import transactor from "./history.transactor";
import receiver from "./history.receiver";
import pToken from "./history.pToken";
import historyCombinePrototype from "./history.combine";
import historyStorage from "./history.storage";
import historyUnShield from "./history.unshield";

const historyPrototype = {
  ...history,
  ...transactor,
  ...receiver,
  ...pToken,
  ...historyCombinePrototype,
  ...historyStorage,
  ...historyUnShield
};

export default historyPrototype;
