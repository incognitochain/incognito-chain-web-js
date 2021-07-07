import Validator from "@lib/utils/validator";

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
    const prefix = this.getPrefixKeyStorage({ version });
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
