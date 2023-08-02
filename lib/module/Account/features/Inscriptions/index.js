import inscribe from "./inscribe";
import storage from "./inscription.storage";

const inscribePrototype = {
    ...inscribe,
    ...storage,
};

export default inscribePrototype;
