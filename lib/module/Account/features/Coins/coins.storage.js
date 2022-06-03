import Validator from "@lib/utils/validator";
import {PrivacyVersion} from "@lib/core/constants";

function getKeyStorageByTokenId(params) {
  try {
    const { tokenID, version } = params;
    new Validator("getKeyStorageByTokenId-tokenID", tokenID)
      .required()
      .string();
    new Validator("getKeyStorageByTokenId-version", version)
      .required()
      .number();
    const otaKey = this.getOTAKey();
    let prefix = this.getPrefixKeyStorage({ version });
    let fullNode = "";
    if (version === PrivacyVersion.ver3) {
      fullNode = this.rpc.rpcHttpService.url;
      prefix = `${prefix}-${fullNode}`
    }
    return `${tokenID}-${prefix}-${otaKey}-${this.name}`;
  } catch (error) {
    throw error;
  }
}

function getPrefixKeyStorage({ version }) {
  new Validator("getPrefixKeyStorage-version", version).required().number();
  return `PRIVACY-${version}`;
}

export default {
  getPrefixKeyStorage,
  getKeyStorageByTokenId,
};
