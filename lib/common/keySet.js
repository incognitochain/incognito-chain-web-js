import { PaymentAddress, ViewingKey, GeneratePrivateKey, OTAKey } from "./key";
import { base64Decode, base64Encode } from "../privacy/utils";

import { wasm } from "@lib/wasm";
import Validator from "@lib/utils/validator";

class KeySet {
  constructor() {
    this.PrivateKey = [];
    this.PaymentAddress = new PaymentAddress();
    this.ReadonlyKey = new ViewingKey();
    this.OTAKey = new OTAKey();
  }

  async importFromPrivateKey(privateKey) {
    try {
      new Validator("importFromPrivateKey-privateKey", privateKey).required();
      let params = {
        PrivateKey: base64Encode(privateKey),
      };
      let resp = await wasm.newKeySetFromPrivate(JSON.stringify(params));
      let obj = JSON.parse(resp);
      this.PrivateKey = base64Decode(obj.PrivateKey);
      // let publicKey = GeneratePublicKey(this.PrivateKey);
      // let receivingKey = GenerateReceivingKey(this.PrivateKey);
      // let transmissionKey = GenerateTransmissionKey(receivingKey);
      this.PaymentAddress = {
        Pk: base64Decode(obj.PaymentAddress.Pk),
        Tk: base64Decode(obj.PaymentAddress.Tk),
        OTAPublic: base64Decode(obj.PaymentAddress.OTAPublic),
      };
      // this.PaymentAddress.Pk = publicKey;
      // this.PaymentAddress.Tk = transmissionKey;
      // this.ReadonlyKey = new ViewingKey();
      this.ReadonlyKey = {
        Pk: base64Decode(obj.ReadonlyKey.Pk),
        Rk: base64Decode(obj.ReadonlyKey.Rk),
      };
      // this.ReadonlyKey.Rk = receivingKey;
      this.OTAKey = {
        Pk: base64Decode(obj.OTAKey.Pk),
        OTASecret: base64Decode(obj.OTAKey.OTASecret),
      };
      return this;
    } catch (error) {
      console.log("importFromPrivateKey error", error, privateKey);
      throw error;
    }
  }

  async importWithoutPrivateKey(paymentAddress, vkey, otakey) {
    try {
      // new Validator("importWithoutPrivateKey-vkey", vkey).required();
      const hasViewKey = (vkey?.length > 0);
      new Validator("importWithoutPrivateKey-otakey", otakey).required();
      new Validator("importWithoutPrivateKey-paymentAddress", paymentAddress).required().string();
      let params = {
        ViewKey: base64Encode(hasViewKey ? vkey : []),
        OTAKey: base64Encode(otakey),
        PaymentAddress: paymentAddress,
      };
      let resp = await wasm.newKeySetFromPrivate(JSON.stringify(params));
      let obj = JSON.parse(resp);
      this.PrivateKey = [];
      this.PaymentAddress = {
        Pk: base64Decode(obj.PaymentAddress.Pk),
        Tk: base64Decode(obj.PaymentAddress.Tk),
        OTAPublic: base64Decode(obj.PaymentAddress.OTAPublic),
      };
      this.ReadonlyKey = {
        Pk: hasViewKey ? base64Decode(obj.ReadonlyKey.Pk) : [],
        Rk: hasViewKey ? base64Decode(obj.ReadonlyKey.Rk) : [],
      };
      this.OTAKey = {
        Pk: base64Decode(obj.OTAKey.Pk),
        OTASecret: base64Decode(obj.OTAKey.OTASecret),
      };
      return this;
    } catch (error) {
      console.error("importWithoutPrivateKey error", error);
      throw error;
    }
  }

  async generateKey(seed) {
    let privateKey = await GeneratePrivateKey(seed);
    await this.importFromPrivateKey(privateKey);
  }
}

let addressAsObject = (pa) => {
  return {
    OTAPublic: base64Encode(pa.OTAPublic),
    Pk: base64Encode(pa.Pk),
    Tk: base64Encode(pa.Tk),
  };
};

let otaKeyAsObject = (key) => {
  return {
    Pk: base64Encode(key.Pk),
    OTASecret: base64Encode(key.OTASecret),
  };
};

const getBurnerAddress = async () => {
  let burnerAddress = {};
  try {
    let emptyKeySet = new KeySet();
    await emptyKeySet.importFromPrivateKey(new Uint8Array(32));
    burnerAddress = addressAsObject(emptyKeySet.PaymentAddress);
  } catch (e) {
    throw e;
  }
  return burnerAddress;
};


export { KeySet, addressAsObject, otaKeyAsObject, getBurnerAddress };
