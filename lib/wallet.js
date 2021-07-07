import _, { isEqual, lowerCase, set, toString } from "lodash";
import CryptoJS from "crypto-js";
import Validator from "./utils/validator";
import { KeySet } from "./common/keySet";
import { PaymentAddress, ViewingKey, PaymentInfo } from "./common/key";
import { RpcClient } from "./rpcclient/rpcclient";
import {
  setRandBytesFunc,
  hashSha3BytesToBytes,
  stringToBytes,
  bytesToString,
} from "./privacy/utils";
import { hybridEncryption, hybridDecryption } from "./privacy/hybridEncryption";
import {
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  PaymentAddressType,
  ReadonlyKeyType,
  PriKeyType,
  BurningRequestMeta,
  WithDrawRewardRequestMeta,
  PDEContributionMeta,
  PDEPRVRequiredContributionRequestMeta,
  PDETradeRequestMeta,
  PDECrossPoolTradeRequestMeta,
  PDEWithdrawalRequestMeta,
  PRVIDSTR,
  KeyWallet,
  NewKey,
  TxHistoryInfo,
  toNanoPRV,
  toPRV,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
} from "./core";
import {
  CustomTokenTransfer,
  CustomTokenInit,
  MAX_INPUT_PER_TX,
} from "./tx/constants";
import { checkEncode } from "./common/base58";
import {
  getShardIDFromLastByte,
  getChildIdFromChildNumberArray,
  byteToHexString,
  hexStringToByte,
} from "./common/common";
import { Account } from "@lib/module/Account";
import {
  getEstimateFee,
  getEstimateFeeForPToken,
  getMaxWithdrawAmount,
} from "./tx/utils";
import { generateECDSAKeyPair } from "./privacy/ecdsa";
import { generateBLSKeyPair } from "./privacy/bls";
import { ENCODE_VERSION, ED25519_KEY_SIZE, setShardNumber } from "./common/constants";
import { CustomError, ErrorObject } from "./common/errorhandler";
import { generateBLSPubKeyB58CheckEncodeFromSeed } from "./common/committeekey";
import { defaultCoinChooser as coinChooser } from "./services/coinChooser";
import { newMnemonic, newSeed, validateMnemonic } from "./core/mnemonic";
import { RpcHTTPCoinServiceClient } from "./rpcclient/rpchttpcoinservice";
import { PrivacyVersion, BurningPBSCRequestMeta } from "./core/constants";
import ACCOUNT_CONSTANT from "./module/Account/account.constants";
import { wasm } from "./wasm";
import { TX_STATUS } from "./module/Account/account.constants";
import StorageServices from "./services/storage";
import { performance } from "./utils/performance";
import { isJsonString } from "./utils/json";

const constants = {
  CustomTokenTransfer,
  MAX_INPUT_PER_TX,
};

class Wallet {
  constructor() {
    this.PassPhrase = "";
    this.Mnemonic = "";
    this.MasterAccount = new Account(this);
    this.Name = "";
    this.Storage = new StorageServices();
    this.Seed = "";
    this.measureStorage = null;
  }

  configWallet(params) {
    try {
      const { passPhrase, name, mnemonic, storage } = params;
      new Validator("configWallet-passPhrase", passPhrase).required().string();
      new Validator("configWallet-storage", storage).required().object();
      new Validator("configWallet-name", name).required().string();
      new Validator("configWallet-mnemonic", mnemonic).required();
      this.PassPhrase = passPhrase;
      this.Name = name;
      this.IsBIP44 = true;
      this.Mnemonic = mnemonic;
      this.Storage = storage;
    } catch (error) {
      console.log("CONFIG WALLET ERROR", error, params);
      throw error;
    }
  }

  async init(passPhrase, storage, walletName, accountName) {
    try {
      new Validator("init-passPhrase", passPhrase).required().string();
      new Validator("init-storage", storage).required().object();
      new Validator("init-walletName", walletName).required().string();
      new Validator("init-accountName", accountName).required().string();
      new Validator("init-WASM", wasm).required().object();
      console.log("INIT WALLET");
      this.configWallet({
        passPhrase,
        name: walletName,
        storage,
        mnemonic: newMnemonic(),
      });
      await this._generateMasterAccount();
      await this._generateFirstAccount(accountName);
      console.log("INITED");
      return this;
    } catch (error) {
      console.log("INIT WALLET ERROR", error);
      throw error;
    }
  }

  async measureImport(mnemonic, passPhrase, name, storage) {
    try {
      new Validator("import-mnemonic", mnemonic).required();
      new Validator("import-passPhrase", passPhrase).required().string();
      new Validator("import-name", name).required().string();
      new Validator("import-storage", storage).required().object();
      if (!validateMnemonic(mnemonic)) {
        throw new CustomError(
          ErrorObject.MnemonicInvalidErr,
          ErrorObject.MnemonicInvalidErr.description
        );
      }
      this.configWallet({
        passPhrase,
        name,
        storage,
        mnemonic,
      });
      await this.measureAsyncFn(
        () => this._generateMasterAccount(),
        "importWallet.generateMasterAccount"
      );
      await this.measureAsyncFn(
        () => this._generateFirstAccount(),
        "importWallet.generateFirstAccount"
      );
    } catch (error) {
      console.log("IMPORT WALLET ERROR", error);
      throw error;
    }
  }

  /**
   *
   * @param {string} mnemonic // Ex: "ability able about above absent absorb abstract absurd abuse access accident Account"
   * @param {string} passPhrase
   * @param {string} name
   * @param {*} storage
   */
  async import(mnemonic, passPhrase, name, storage) {
    try {
      await this.measureAsyncFn(
        () => this.measureImport(mnemonic, passPhrase, name, storage),
        "importWallet.totalTime"
      );
      await this.setKeyMeasureStorage();
    } catch (error) {
      throw error;
    }
  }

  async _generateMasterAccount() {
    this.Seed = newSeed(this.Mnemonic);
    const masterAccountKey = await NewKey(this.Seed, 0, -1);
    this.MasterAccount = new Account(Wallet);
    this.MasterAccount.key = masterAccountKey;
    this.MasterAccount.child = [];
    this.MasterAccount.name = "master";
  }

  async _generateFirstAccount(accountName = "Anon") {
    const account = await this.createAccountWithId(1, accountName);
    this.MasterAccount.child.push(account);
  }

  getAccountByName(accountName) {
    return this.MasterAccount.child.find((item) => item.name === accountName);
  }

  getAccountIndexByName(accountName) {
    return this.MasterAccount.child.findIndex(
      (item) => item.name.toLowerCase() === accountName.toLowerCase()
    );
  }

  async getCreatedAccounts({ deserialize = true } = {}) {
    new Validator("deserialize", deserialize).boolean();
    let createdAccounts = [];
    for (const account of this.MasterAccount.child) {
      const id = getChildIdFromChildNumberArray(account.key.ChildNumber);
      const newAccount = await this.createAccountWithId(id);
      const newPrivateKey = newAccount.key.base58CheckSerialize(PriKeyType);
      const oldPrivateKey = account.key.base58CheckSerialize(PriKeyType);
      if (newPrivateKey === oldPrivateKey) {
        createdAccounts.push(account);
      }
    }
    if (deserialize) {
      const deserializeCreatedAccounts = [];
      for (const account of createdAccounts) {
        const info = await account.getDeserializeInformation();
        deserializeCreatedAccounts.push(info);
      }
      createdAccounts = deserializeCreatedAccounts;
    }
    return createdAccounts;
  }

  async hasCreatedAccount(privateKey) {
    const accountName = "Temp";
    const newAccount = await this.createAccountWithPrivateKey(
      privateKey,
      accountName
    );
    const childId = await getChildIdFromChildNumberArray(
      newAccount.key.ChildNumber
    );
    const newAccountWithId = await this.createAccountWithId(
      childId,
      accountName
    );
    const privateKeyOfNewAccountWithID = newAccountWithId.getPrivateKey();
    const privateKeyOfNewAccount = newAccount.getPrivateKey();
    return isEqual(privateKeyOfNewAccountWithID, privateKeyOfNewAccount);
  }

  async measureCreateNewAccount(accountName, shardID, excludedIds) {
    try {
      new Validator("createNewAccount-accountName", accountName)
        .required()
        .string();
      new Validator("createNewAccount-shardID", shardID).number();
      new Validator("createNewAccount-excludedIds", excludedIds).array();
      const newAccount = await this.measureAsyncFn(
        () => this.createAccount(accountName, shardID, excludedIds),
        "createNewAccount.createAcccount"
      );
      this.MasterAccount.child.push(newAccount);
      await this.measureAsyncFn(
        () => this.save(this.PassPhrase),
        "createNewAccount.saveWallet"
      );
      return newAccount;
    } catch (error) {
      console.log("createNewAccount ERROR", error);
      throw error;
    }
  }

  /**
   * Create and add Account to wallet
   * @param accountName
   * @param shardID
   * @returns {*}
   */
  async createNewAccount(accountName, shardID = 0, excludedIds) {
    try {
      const account = await this.measureAsyncFn(
        () => this.measureCreateNewAccount(accountName, shardID, excludedIds),
        "createNewAccount.totalTime"
      );
      return account;
    } catch (error) {
      throw error;
    }
  }

  async measureCreateAccount(accountName, shardID, excludedIds) {
    try {
      new Validator("createAccount-accountName", accountName)
        .required()
        .string();
      new Validator("createAccount-shardID", shardID).required().number();
      new Validator("createAccount-excludedIds", excludedIds).array();
      let childKey;
      const createdAccounts = await this.measureAsyncFn(
        () => this.getCreatedAccounts(true),
        "createAccount.getCreatedAccounts"
      );
      const createdIds = createdAccounts.map((item) => item.ID);
      const possibleIds = createdIds.filter(
        (id) => !createdIds.includes(id + 1)
      );
      let newId = possibleIds.length > 0 ? Math.min(...possibleIds) + 1 : 1;
      const createdPrivateKeys = createdAccounts.map((item) => item.PrivateKey);
      while (true) {
        childKey = await this.measureAsyncFn(
          () => NewKey(this.Seed, newId, 0),
          `createAccount.newKey-${newId}-${accountName}`
        );
        const newPrivateKey = childKey.base58CheckSerialize(PriKeyType);
        const lastByte =
          childKey.KeySet.PaymentAddress.Pk[
            childKey.KeySet.PaymentAddress.Pk.length - 1
          ];
        const isExisted = createdPrivateKeys.includes(newPrivateKey);
        if (
          isExisted ||
          (_.isNumber(shardID) && lastByte !== shardID) ||
          excludedIds.includes(newId)
        ) {
          newId++;
          continue;
        }
        const accountWallet = new Account(Wallet);
        accountWallet.key = childKey;
        accountWallet.child = [];
        accountWallet.name = accountName || newId;
        return accountWallet;
      }
    } catch (error) {
      throw error;
    }
  }

  async createAccount(accountName, shardID, excludedIds = []) {
    try {
      const account = await this.measureAsyncFn(
        () => this.measureCreateAccount(accountName, shardID, excludedIds),
        "createAccount.totalTime"
      );
      return account;
    } catch (error) {
      throw error;
    }
  }

  async createAccountWithPrivateKey(privakeyStr, accountName) {
    new Validator("privakeyStr", privakeyStr).string().required();
    new Validator("accountName", accountName).string().required();
    let keyWallet;
    try {
      keyWallet = KeyWallet.base58CheckDeserialize(privakeyStr);
    } catch (e) {
      throw new CustomError(
        ErrorObject.B58CheckDeserializedErr,
        "Can not base58 check deserialized private key of importing Account"
      );
    }
    if (keyWallet.KeySet.PrivateKey.length !== ED25519_KEY_SIZE) {
      throw new CustomError(
        ErrorObject.PrivateKeyInvalidErr,
        "Private key is empty"
      );
    }
    await keyWallet.KeySet.importFromPrivateKey(keyWallet.KeySet.PrivateKey);
    let account = new Account(Wallet);
    account.key = keyWallet;
    account.child = [];
    account.isImport = true;
    account.name = accountName;
    return account;
  }

  async createAccountWithId(accountId, accountName) {
    const childKey = await NewKey(this.Seed, accountId, 0);
    const accountWallet = new Account(Wallet);
    accountWallet.key = childKey;
    accountWallet.child = [];
    accountWallet.name = accountName;
    return accountWallet;
  }

  exportAccountPrivateKey(childIndex) {
    return this.MasterAccount.child[childIndex].key.base58CheckSerialize(
      PriKeyType
    );
  }

  exportAccountReadonlyKey(childIndex) {
    return this.MasterAccount.child[childIndex].key.base58CheckSerialize(
      ReadonlyKeyType
    );
  }

  validateAccountName(name) {
    if (!name) {
      throw new CustomError(
        ErrorObject.InvalidAccountName,
        "Account name is invalid"
      );
    }
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      let account = this.MasterAccount.child[i];
      if (account.name === name) {
        throw new CustomError(
          ErrorObject.ExistedAccountErr,
          "Name of importing Account was existed"
        );
      }
    }
  }

  validatePrivateKey(privateKey) {
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      let account = this.MasterAccount.child[i];

      if (account.key.base58CheckSerialize(PriKeyType) == privateKey) {
        throw new CustomError(
          ErrorObject.ExistedAccountErr,
          "Private key of importing Account was existed"
        );
      }
    }
  }

  async removeAccount(accPrivateKeyStr, passPhrase) {
    new Validator("removeAccount-accPrivateKeyStr", accPrivateKeyStr)
      .string()
      .required();
    new Validator("removeAccount-passPhrase", passPhrase).string();
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      let account = this.MasterAccount.child[i];
      if (account.key.base58CheckSerialize(PriKeyType) === accPrivateKeyStr) {
        this.MasterAccount.child.splice(i, 1);
        await this.save(passPhrase);
        return;
      }
    }
    throw new CustomError(
      ErrorObject.UnexpectedErr,
      "Account need to be removed is not existed"
    );
  }

  async importAccount(privakeyStr, accountName, passPhrase = this.passPhrase) {
    try {
      new Validator("importAccount-privakeyStr", privakeyStr)
        .string()
        .required();
      new Validator("importAccount-accountName", accountName)
        .string()
        .required();
      new Validator("importAccount-passPhrase", passPhrase).string();
      let account = await this.createAccountWithPrivateKey(
        privakeyStr,
        accountName
      );
      const privateKey = account.getPrivateKey();
      const listAccount = [...this.MasterAccount.child];
      listAccount.forEach((oldAccount) => {
        const privateKeyOfOldAccount = oldAccount.getPrivateKey();
        const nameOfOldAccount = oldAccount.getAccountName();
        if (isEqual(privateKey, privateKeyOfOldAccount)) {
          throw new CustomError(
            ErrorObject.ExistedAccountErr,
            "Private key of importing account was existed"
          );
        }
        if (isEqual(lowerCase(nameOfOldAccount), lowerCase(accountName))) {
          throw new CustomError(
            ErrorObject.ExistedAccountErr,
            "Name of importing account was existed"
          );
        }
      });
      this.MasterAccount.child.push(account);
      await this.save(this.PassPhrase || passPhrase);
      return account;
    } catch (error) {
      throw error;
    }
  }

  async measureImportAccountWithId(accountId, accountName, index) {
    try {
      new Validator("importAccountWithId-accountId", accountId).required();
      new Validator("importAccountWithId-accountName", accountName)
        .string()
        .required();
      try {
        this.validateAccountName(accountName);
      } catch {
        this.measureImportAccountWithId(
          accountId,
          accountName + index,
          index + 1
        );
      }
      const account = await this.createAccountWithId(accountId, accountName);
      this.validatePrivateKey(account.key.base58CheckSerialize(PriKeyType));
      this.MasterAccount.child.push(account);
      await this.save(this.PassPhrase);
      return account;
    } catch (error) {
      throw error;
    }
  }

  async importAccountWithId(accountId, accountName, index = 0) {
    try {
      const account = await this.measureAsyncFn(
        () => this.measureImportAccountWithId(accountId, accountName, index),
        `importAccountWithID.totalTime-${accountName}-${accountId}`
      );
      return account;
    } catch (error) {
      throw error;
    }
  }

  ellipsisCenter({ str = "", limit = 10, dots = "..." } = {}) {
    try {
      const size = str.length;
      if (size < limit * 2 + dots.length) {
        return str;
      }
      const leftStr = str.substring(0, limit);
      const rightStr = str.substring(size - limit, size);
      return leftStr + dots + rightStr;
    } catch {
      return str;
    }
  }

  async save(password = "", legacyEncryption = false) {
    try {
      if (password === "") {
        password = this.PassPhrase;
      }
      // parse to byte[]
      for (let i = 0; i < this.MasterAccount.child.length; i++) {
        this.MasterAccount.child[i].key.ChainCode = Array.from(
          this.MasterAccount.child[i].key.ChainCode
        );
        this.MasterAccount.child[i].key.ChildNumber = Array.from(
          this.MasterAccount.child[i].key.ChildNumber
        );
        this.MasterAccount.child[i].key.KeySet.PrivateKey = Array.from(
          this.MasterAccount.child[i].key.KeySet.PrivateKey
        );
        this.MasterAccount.child[i].key.KeySet.PaymentAddress.Pk = Array.from(
          this.MasterAccount.child[i].key.KeySet.PaymentAddress.Pk
        );
        this.MasterAccount.child[i].key.KeySet.PaymentAddress.Tk = Array.from(
          this.MasterAccount.child[i].key.KeySet.PaymentAddress.Tk
        );
        this.MasterAccount.child[i].key.KeySet.ReadonlyKey.Pk = Array.from(
          this.MasterAccount.child[i].key.KeySet.ReadonlyKey.Pk
        );
        this.MasterAccount.child[i].key.KeySet.ReadonlyKey.Rk = Array.from(
          this.MasterAccount.child[i].key.KeySet.ReadonlyKey.Rk
        );
      }
      this.MasterAccount.key.ChainCode = Array.from(
        this.MasterAccount.key.ChainCode
      );
      this.MasterAccount.key.ChildNumber = Array.from(
        this.MasterAccount.key.ChildNumber
      );
      this.MasterAccount.key.KeySet.PrivateKey = Array.from(
        this.MasterAccount.key.KeySet.PrivateKey
      );
      this.MasterAccount.key.KeySet.PaymentAddress.Pk = Array.from(
        this.MasterAccount.key.KeySet.PaymentAddress.Pk
      );
      this.MasterAccount.key.KeySet.PaymentAddress.Tk = Array.from(
        this.MasterAccount.key.KeySet.PaymentAddress.Tk
      );
      this.MasterAccount.key.KeySet.ReadonlyKey.Pk = Array.from(
        this.MasterAccount.key.KeySet.ReadonlyKey.Pk
      );
      this.MasterAccount.key.KeySet.ReadonlyKey.Rk = Array.from(
        this.MasterAccount.key.KeySet.ReadonlyKey.Rk
      );
      let data = JSON.stringify(this);
      let cipherText;
      if (legacyEncryption) {
        cipherText = CryptoJS.AES.encrypt(data, password);
      } else {
        data = byteToHexString(stringToBytes(data));
        cipherText = await this.measureAsyncFn(
          () => wasm.aesEncrypt(password + data),
          "saveWallet.timeAesEncrypt"
        );
      }
      // storage
      await Promise.all([
        this.setWalletStorage({ key: this.Name, value: toString(cipherText) }),
        this.setWalletStorage({
          key: this.getKeyMeasureStorage(),
          value: this.measureStorage,
        }),
      ]);
      return this;
    } catch (error) {
      throw error;
    }
  }

  async getHistoryByAccount(accName) {
    let account = this.getAccountByName(accName);
    return account.getNormalTxHistory();
  }

  // not pure function
  async reImportPrototype(account) {
    Object.setPrototypeOf(account, Account.prototype);
    Object.setPrototypeOf(account.key, KeyWallet.prototype);
    // chaincode
    Object.setPrototypeOf(account.key.ChainCode, Array.prototype);
    account.key.ChainCode = new Uint8Array(account.key.ChainCode);
    // child num
    Object.setPrototypeOf(account.key.ChildNumber, Array.prototype);
    account.key.ChildNumber = new Uint8Array(account.key.ChildNumber);
    Object.setPrototypeOf(account.key.KeySet, KeySet.prototype);
    // payment address
    Object.setPrototypeOf(
      account.key.KeySet.PaymentAddress,
      PaymentAddress.prototype
    );
    Object.setPrototypeOf(
      account.key.KeySet.PaymentAddress.Pk,
      Array.prototype
    );
    account.key.KeySet.PaymentAddress.Pk = new Uint8Array(
      account.key.KeySet.PaymentAddress.Pk
    );
    Object.setPrototypeOf(
      account.key.KeySet.PaymentAddress.Tk,
      Array.prototype
    );
    account.key.KeySet.PaymentAddress.Tk = new Uint8Array(
      account.key.KeySet.PaymentAddress.Tk
    );
    // read only key
    Object.setPrototypeOf(account.key.KeySet.ReadonlyKey, ViewingKey.prototype);
    Object.setPrototypeOf(account.key.KeySet.ReadonlyKey.Pk, Array.prototype);
    account.key.KeySet.ReadonlyKey.Pk = new Uint8Array(
      account.key.KeySet.ReadonlyKey.Pk
    );
    Object.setPrototypeOf(account.key.KeySet.ReadonlyKey.Rk, Array.prototype);
    account.key.KeySet.ReadonlyKey.Rk = new Uint8Array(
      account.key.KeySet.ReadonlyKey.Rk
    );
    // private key
    Object.setPrototypeOf(account.key.KeySet.PrivateKey, Array.prototype);
    account.key.KeySet.PrivateKey = new Uint8Array(
      account.key.KeySet.PrivateKey
    );
    await account.key.KeySet.importFromPrivateKey(
      account.key.KeySet.PrivateKey
    );
  }

  async measureLoadWallet(passphrase) {
    try {
      const { password, aesKey } = passphrase;
      const selfStorage = this.Storage;
      new Validator("loadWallet-password", password).string();
      new Validator("loadWallet-aesKey", aesKey).string();
      let shouldReSaveWallet = false;
      if (this.Storage) {
        let cipherText = await this.measureAsyncFn(
          () => this.Storage.getItem(this.Name),
          "loadWallet.timeGetCipherText"
        );
        if (!cipherText) return false;
        let data, jsonStr;
        let aesDecrypted = false;
        try {
          data = await this.measureAsyncFn(
            () => wasm.aesDecrypt(aesKey + cipherText),
            "loadWallet.timeAesDecrypt"
          );
          if (!!data) {
            aesDecrypted = true;
          }
          jsonStr = bytesToString(hexStringToByte(data));
        } catch (error) {
          console.log("CAN NOT DECRYPT BY wasm.aesDecrypt", error);
        }
        if (!aesDecrypted) {
          try {
            data = CryptoJS.AES.decrypt(cipherText, password);
            if (!!data) {
              shouldReSaveWallet = true;
            }
            jsonStr = data.toString(CryptoJS.enc.Utf8);
          } catch (error) {
            console.log("CAN NOT DECRYPT BY CryptoJS.AES.decrypt");
            throw new CustomError(
              ErrorObject.LoadWalletErr,
              "Error when load wallet by CryptoJS",
              error
            );
          }
        }
        try {
          let obj = JSON.parse(jsonStr);
          Object.setPrototypeOf(obj, Wallet.prototype);
          Object.setPrototypeOf(obj.MasterAccount, Account.prototype);
          Object.setPrototypeOf(obj.MasterAccount.key, KeyWallet.prototype);
          Object.setPrototypeOf(obj.MasterAccount.key.KeySet, KeySet.prototype);
          obj.Seed = Buffer.from(obj.Seed);
          let task = [
            ...obj.MasterAccount.child.map((account) =>
              this.reImportPrototype(account)
            ),
            this.reImportPrototype(obj.MasterAccount),
          ];
          await Promise.all(task);
          Object.assign(this, obj);
          this.configWallet({
            passPhrase: aesKey,
            name: this.Name,
            mnemonic: this.Mnemonic,
            storage: selfStorage,
          });
          if (shouldReSaveWallet) {
            await this.measureAsyncFn(
              () => this.save(aesKey, false),
              "loadWallet.timeSaveWallet"
            );
          }
          return this;
        } catch (e) {
          throw new CustomError(
            ErrorObject.LoadWalletErr,
            "Error when load wallet",
            error
          );
        }
      }
    } catch (error) {
      throw error;
    }
  }

  // password
  async loadWallet(passphrase) {
    try {
      const wallet = await this.measureAsyncFn(
        () => this.measureLoadWallet(passphrase),
        "loadWallet.totalTime"
      );
      await this.setKeyMeasureStorage();
      return wallet;
    } catch (error) {
      throw error;
    }
  }

  async loadAccountsCached(accName = null) {
    if (accName) {
      let account = this.getAccountByName(accName);
      return await account.loadAccountCached(this.Storage);
    }

    await this.MasterAccount.loadAccountCached(this.Storage);
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      await this.MasterAccount.child[i].loadAccountCached(this.Storage);
    }
  }

  async listAccount() {
    const accounts = [];
    for (let index = 0; index < this.MasterAccount.child.length; index++) {
      const account = this.MasterAccount.child[index];
      const info = await account.getDeserializeInformation();
      accounts.push({
        ...info,
        Index: index,
      });
    }
    return accounts;
  }

  async listAccountWithBLSPubKey() {
    let accounts = [];
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      let child = this.MasterAccount.child[i];
      let miningSeedKey = hashSha3BytesToBytes(
        hashSha3BytesToBytes(child.key.KeySet.PrivateKey)
      );
      let blsPublicKey = await generateBLSPubKeyB58CheckEncodeFromSeed(
        miningSeedKey
      );
      accounts[i] = {
        AccountName: child.name,
        BLSPublicKey: blsPublicKey,
        Index: i,
      };
    }
    return accounts;
  }

  async updateStatusHistory() {
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      await this.MasterAccount.child[i].updateAllTransactionsStatus();
    }
  }

  async updateTxStatus(txId) {
    let tx;
    let account;
    for (account of this.MasterAccount.child) {
      const nativeTx = account.txHistory.NormalTx.find(
        (item) => item.txID === txId
      );
      const coinTx = account.txHistory.PrivacyTokenTx.find(
        (item) => item.txID === txId
      );

      tx = nativeTx || coinTx;

      if (tx) {
        break;
      }
    }

    if (!tx || !account) {
      return;
    }

    let response;
    try {
      response = await Wallet.RpcClient.getTransactionByHash(txId);
    } catch (e) {
      throw new CustomError(ErrorObject.GetTxByHashErr, e.message);
    }

    if (response.isInBlock) {
      tx.status = ConfirmedTx;
    } else if (
      !response.isInBlock &&
      !response.isInMempool &&
      response.err !== null
    ) {
      tx.status = FailedTx;
    }
  }

  deleteWallet() {
    try {
      if (typeof this.Storage.removeItem === "function") {
        this.Storage.removeItem("Wallet");
      }
    } catch (e) {
      throw new CustomError(
        ErrorObject.DeleteWalletErr,
        e.message || "Can not remove item in storage"
      );
    }
  }

  initMeasureStorage() {
    if (!this.measureStorage) {
      console.log("WALLET_NAME", this.Name);
      this.measureStorage = {
        walletName: this.Name,
        walletMnemonic: this.Mnemonic,
        loadWallet: {
          timeGetCipherText: -1,
          timeAesDecrypt: -1,
          timeCryptoDecrypt: -1,
          timeSaveWallet: -1,
          totalTime: -1,
        },
        createWallet: {},
        importWallet: {
          generateMasterAccount: -1,
          generateFirstAccount: -1,
          totalTime: -1,
        },
        saveWallet: {
          timeAesEncrypt: -1,
        },
        createNewAccount: {
          totalTime: -1,
          createAcccount: -1,
          saveWallet: -1,
        },
        createAccount: {
          totalTime: -1,
          getCreatedAccounts: -1,
        },
        importAccountWithID: {
          totalTime: -1,
        },
      };
    }
  }

  getKeyMeasureStorage() {
    return this.getKeyStorageWallet("MEASURE");
  }

  async setKeyMeasureStorage() {
    try {
      const key = this.getKeyMeasureStorage();
      const oldMeasureStorage = await this.getMeasureStorageValue();
      let value = [];
      value =
        oldMeasureStorage.length > 0
          ? [this.measureStorage, ...oldMeasureStorage]
          : [this.measureStorage];
      await this.setWalletStorage({
        key,
        value,
      });
    } catch (error) {
      throw error;
    }
  }

  async getMeasureStorageValue() {
    try {
      const key = this.getKeyMeasureStorage();
      const value = await this.getWalletStorage({
        key,
      });
      return value || [];
    } catch (error) {
      throw error;
    }
  }

  async measureAsyncFn(fn, key) {
    try {
      this.initMeasureStorage();
      const t = performance.now();
      let result;
      if (typeof fn === "function") {
        result = await fn();
      }
      const e = performance.now() - t;
      const time = `${(e / 1000).toFixed(2)}s`;
      set(this.measureStorage, key, time);
      return result;
    } catch (error) {
      console.log("measureAsyncFn FAILED", error);
    }
  }

  async setWalletStorage(params) {
    const { key, value } = params;
    try {
      new Validator("getWalletStorage-key", key).required().string();
      if (typeof this.Storage.setItem === "function" && value && key) {
        await this.Storage.setItem(
          key,
          typeof value !== "string" ? JSON.stringify(value) : value
        );
      }
    } catch (error) {
      console.log("setWalletStorage error", error);
      throw error;
    }
  }

  async getWalletStorage(params) {
    try {
      const { key } = params;
      new Validator("getWalletStorage-key", key).required().string();
      if (typeof this.Storage.getItem === "function") {
        let value = await this.Storage.getItem(key);
        if (isJsonString(value)) {
          value = JSON.parse(value);
        }
        return value;
      }
    } catch (error) {
      throw error;
    }
  }

  async clearWalletStorage(params) {
    try {
      const { key } = params;
      new Validator("key", key).required().string();
      if (typeof this.Storage.removeItem === "function") {
        await this.Storage.removeItem(key);
      }
    } catch (error) {
      throw error;
    }
  }

  getKeyStorageWallet(key) {
    new Validator("getKeyStorageWallet-key", key).required().string();
    return `KEY-${key}-STORAGE-${this.Name}`;
  }

  static RandomBytesFunc = null;
  static setPrivacyUtilRandomBytesFunc(randomBytesFunc) {
    setRandBytesFunc(randomBytesFunc);
  }
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  static RpcClient;
  static Debug = "";
  static RpcCoinService;
  static PrivacyVersion = PrivacyVersion.ver2;
  static UseLegacyEncoding = true;
  static PubsubService = "";
  static RpcRequestService = "";
  static AuthToken = "";
  static RpcApiService = "";
}

class DefaultStorage {
  constructor() {
    this.Data = {};
  }

  async setItem(key, value) {
    this.Data[key] = value;
    return Promise.resolve();
  }

  async getItem(key) {
    return this.Data[key];
  }
}

export {
  Wallet,
  Account,
  DefaultStorage,
  TxHistoryInfo,
  RpcClient,
  PaymentInfo,
  KeyWallet,
  PaymentAddressType,
  CustomTokenTransfer,
  CustomTokenInit,
  PRVIDSTR,
  ENCODE_VERSION,
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  checkEncode,
  getEstimateFee,
  getEstimateFeeForPToken,
  getMaxWithdrawAmount,
  toNanoPRV,
  toPRV,
  getShardIDFromLastByte,
  generateECDSAKeyPair,
  generateBLSKeyPair,
  //
  BurningPBSCRequestMeta,
  BurningRequestMeta,
  WithDrawRewardRequestMeta,
  PDEContributionMeta,
  PDEPRVRequiredContributionRequestMeta,
  PDETradeRequestMeta,
  PDECrossPoolTradeRequestMeta,
  PDEWithdrawalRequestMeta,
  hybridEncryption,
  hybridDecryption,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
  constants,
  coinChooser,
  newMnemonic,
  newSeed,
  validateMnemonic,
  RpcHTTPCoinServiceClient,
  PrivacyVersion,
  Validator,
  ACCOUNT_CONSTANT,
  byteToHexString,
  hexStringToByte,
  TX_STATUS,
  ErrorObject,
  setShardNumber,
};
