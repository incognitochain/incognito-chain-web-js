import unshield from "./unshield";
import convert from "./convert";

const unifiedTokenPrototype = {
  ...unshield,
  ...convert,
};

export default unifiedTokenPrototype;
