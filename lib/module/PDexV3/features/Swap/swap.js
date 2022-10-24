import transactorPrototype from "./swap.transactor";
import historyPrototype from "./swap.history";
import swapStoragePrototype from "./swap.storage";
import swapCombinePrototype from "./swap.combine";

export default {
  ...transactorPrototype,
  ...historyPrototype,
  ...swapStoragePrototype,
  ...swapCombinePrototype
};
