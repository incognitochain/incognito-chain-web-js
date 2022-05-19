import _, {
  cloneDeep,
  isEqual,
  lowerCase,
  set,
  toLower,
  toString,
  uniqBy,
  includes,
} from "lodash";
import CryptoJS from "crypto-js";
import PDexV3 from "@lib/module/PDexV3";
import sjcl from "./privacy/sjcl";
import { wasm as wasmFuncs } from "@lib/wasm";
import Validator from "./utils/validator";
import { PaymentInfo } from "./common/key";
import { RpcClient } from "./rpcclient/rpcclient";
import { setRandBytesFunc, hashSha3BytesToBytes } from "./privacy/utils";
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
  PortalV4ShieldingRequestMeta,
  PortalV4UnshieldRequestMeta,
  PortalV4ShieldingResponseMeta,
  PortalV4UnshieldingResponseMeta,
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
  parsePublicKeyBytesToShard,
} from "./common/common";
import { Account } from "@lib/module/Account";
import {
  getEstimateFee,
  getEstimateFeeForPToken,
  getMaxWithdrawAmount,
} from "./tx/utils";
import { generateECDSAKeyPair } from "./privacy/ecdsa";
import { generateBLSKeyPair } from "./privacy/bls";
import {
  ENCODE_VERSION,
  ED25519_KEY_SIZE,
  setShardNumber as setShardNumberSub,
} from "./common/constants";
import { CustomError, ErrorObject } from "./common/errorhandler";
import { generateBLSPubKeyB58CheckEncodeFromSeed } from "./common/committeekey";
import { defaultCoinChooser as coinChooser } from "./services/coinChooser";
import { newMnemonic, newSeed, validateMnemonic } from "./core/mnemonic";
import { RpcHTTPCoinServiceClient } from "./rpcclient/rpchttpcoinservice";
import {
  PrivacyVersion,
  BurningPBSCRequestMeta,
  BurningPRVERC20RequestMeta,
  BurningPRVBEP20RequestMeta,
  BurningPDEXERC20RequestMeta,
  BurningPDEXBEP20RequestMeta,
  BurningPBSCForDepositToSCRequestMeta,
  BurningPLGRequestMeta,
  BurningPLGForDepositToSCRequestMeta,
  BurningFantomRequestMeta,
  BurningFantomForDepositToSCRequestMeta,
} from "./core/constants";
import ACCOUNT_CONSTANT from "./module/Account/account.constants";
import { wasm } from "./wasm";
import { TX_STATUS } from "@lib/module/Account";
import StorageServices from "./services/storage";
import { performance } from "./utils/performance";
import { isJsonString } from "./utils/json";
import { isPaymentAddress, isOldPaymentAddress } from "./utils/paymentAddress";
import VerifierTx, { VERFIER_TX_STATUS } from "./module/VerifierTx";
import * as gomobileServices from "./services/gomobile";
import { clearCache } from "@lib/utils/cache";
import { PANCAKE_CONSTANTS } from "@lib/module/Pancake";
import { UNI_CONSTANTS } from "@lib/module/Uni";
import { CURVE_CONSTANTS } from "@lib/module/Curve";
import { BSC_CONSTANT } from "@lib/module/BinanceSmartChain";
import { WEB3_CONSTANT } from "@lib/module/Web3";
import { EXCHANGE_SUPPORTED } from "@lib/module/PDexV3/PDexV3.constants";

const constants = {
  CustomTokenTransfer,
  MAX_INPUT_PER_TX,
};

const MATER_KEYS_BACKUP_BY_PREFIX_SERVER_ID =
  "MATER_KEYS_BACKUP_BY_PREFIX_SERVER_ID";

function loadBackupKey(network) {
  return `${MATER_KEYS_BACKUP_BY_PREFIX_SERVER_ID}-${network}-v4.2.17.65`;
}

function parseStorageBackup({ passphrase, backupStr }) {
  let list = [];
  try {
    const { aesKeyDefault, aesKeyPassCode } = passphrase;
    new Validator("parseStorageBackup-aesKey", aesKeyDefault).string().required();
    let cipherText = backupStr || "";
    let json;
    if (!!aesKeyPassCode) {
      try {
        json = sjcl.decrypt(sjcl.codec.hex.toBits(aesKeyPassCode), cipherText);
      } catch (e) {
        console.log('parseStorageBackup aesKeyPassCode error: ', e)
      }
    }
    if (!isJsonString(json)) {
      try {
        json = sjcl.decrypt(sjcl.codec.hex.toBits(aesKeyDefault), cipherText);
      } catch (e) {
        console.log('parseStorageBackup aesKeyDefault error: ', e)
      }
    }
    if (isJsonString(json)) {
      list = JSON.parse(json);
    }
  } catch (error) {
    console.log("getListStorageBackup-error", error);
  }
  return list || [];
}

class Wallet {
  constructor() {
    this.PassPhrase = "";
    this.Mnemonic = "";
    this.MasterAccount = new Account(this);
    this.Name = "";
    this.Seed = "";
    this.Storage = new StorageServices();
    this.Network = "";
    this.measureStorage = {};
    this.IsMasterless = false;
    this.RootName = "";
  }

  configWallet(params) {
    try {
      const { passPhrase, name, mnemonic, storage, network } = params;
      new Validator("configWallet-passPhrase", passPhrase).required().string();
      new Validator("configWallet-storage", storage).required().object();
      new Validator("configWallet-name", name).required().string();
      new Validator("configWallet-mnemonic", mnemonic).required();
      new Validator("configWallet-network", network).required().string();
      this.PassPhrase = passPhrase;
      this.Name = name;
      this.IsBIP44 = true;
      this.Mnemonic = mnemonic;
      this.Storage = storage;
      this.Network = network;
    } catch (error) {
      console.log("CONFIG WALLET ERROR", error, params);
      throw error;
    }
  }

  getKeyStorageError() {
    return '$STORAGE_ERROR_LOAD_WALLET';
  };

  async getStorageLoadWalletError() {
    const key = this.getKeyStorageError();
    return (await this.getWalletStorage({ key })) || [];
  };

  async setStorageLoadWalletError(value) {
    const key = this.getKeyStorageError();
    await this.setWalletStorage({ key, value });
  };

  async updateStorageLoadWalletError({ error }) {
    const errors = await this.getStorageLoadWalletError();
    errors.push({
      ...error,
      time: new Date().getTime(),
    });
    await this.setStorageLoadWalletError(errors);
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
        network: this.Network,
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
        network: this.Network,
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
    try {
      new Validator("getAccountIndexByName-accountName", accountName)
        .required()
        .string();
      const index = this.MasterAccount.child.findIndex((item) =>
        isEqual(toLower(item.name), toLower(accountName))
      );
      return index;
    } catch (error) {
      throw error;
    }
  }

  async hasCreatedAccount(privateKey) {
    const accountName = "Temp";
    const newAccount = await this.createAccountWithPrivateKey(
      privateKey,
      accountName
    );
    const childId = getChildIdFromChildNumberArray(
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
      const existed = this.validatePrivateKey(newAccount.getPrivateKey());
      if (!existed) {
        this.MasterAccount.child.push(newAccount);
      } else {
        throw new Error("Account was existed!");
      }
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
      const createdAccounts = await this.listAccount();
      const createdIds = createdAccounts.map((item) => item.ID);
      const possibleIds = createdIds.filter(
        (id) => !createdIds.includes(id + 1)
      );
      let newId = possibleIds.length > 0 ? Math.min(...possibleIds) + 1 : 1;
      const createdPrivateKeys = createdAccounts.map((item) => item.PrivateKey);
      while (true) {
        childKey = await NewKey(this.Seed, newId, 0);
        const newPrivateKey = childKey.base58CheckSerialize(PriKeyType);
        const lastByte =
          childKey.KeySet.PaymentAddress.Pk[
            childKey.KeySet.PaymentAddress.Pk.length - 1
          ];
        const isExisted =
          createdPrivateKeys.includes(newPrivateKey) ||
          createdIds.includes(newId);
        if (
          isExisted ||
          (_.isNumber(shardID) &&
            getShardIDFromLastByte(lastByte) !== shardID) ||
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
      const createdAccounts = await this.listAccount();
      // Create new account same ShardID Anon
      const firstAccount = createdAccounts.find(account => account.ID === 1 || account.Index === 0);
      if (!!firstAccount) {
        shardID = parsePublicKeyBytesToShard(firstAccount.PublicKeyBytes);
        if (isNaN(shardID)) {
          shardID = 0;
        }
      }
      const account = await this.measureAsyncFn(
        () => this.measureCreateAccount(accountName, shardID, excludedIds),
        "createAccount.totalTime"
      );
      return account;
    } catch (error) {
      console.log("createAccount error", error);
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
      const isNameExisted = isEqual(toLower(account.name), toLower(name));
      if (isNameExisted) {
        throw new CustomError(
          ErrorObject.ExistedAccountErr,
          "Name of importing Account was existed"
        );
      }
    }
  }

  validatePrivateKey(privateKey) {
    new Validator("validatePrivateKey-privateKey", privateKey)
      .required()
      .string();
    let existed = false;
    for (let i = 0; i < this.MasterAccount.child.length; i++) {
      let account = this.MasterAccount.child[i];
      if (isEqual(account.getPrivateKey(), privateKey)) {
        existed = true;
      }
    }
    return existed;
  }

  async removeAccount(accPrivateKeyStr) {
    let removed = false;
    try {
      new Validator("removeAccount-accPrivateKeyStr", accPrivateKeyStr)
        .string()
        .required();
      const temp = await this.createAccountWithPrivateKey(
        accPrivateKeyStr,
        "temp"
      );
      this.MasterAccount.child = this.MasterAccount.child.filter((account) => {
        const result = account.getPrivateKey() !== temp.getPrivateKey();
        return result;
      });
      removed = true;
    } catch (error) {
      console.log("removeAccount error", error);
      throw error;
    }
    return removed;
  }

  async importAccount(privakeyStr, accountName) {
    try {
      new Validator("importAccount-privakeyStr", privakeyStr)
        .string()
        .required();
      new Validator("importAccount-accountName", accountName)
        .string()
        .required();
      let account = await this.createAccountWithPrivateKey(
        privakeyStr,
        accountName
      );
      const privateKey = account.getPrivateKey();
      const listAccount = this.MasterAccount.child;
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
      const existed = this.validatePrivateKey(privateKey);
      if (!existed) {
        this.MasterAccount.child.push(account);
      } else {
        throw new Error("Account was existed!");
      }
      return account;
    } catch (error) {
      console.log("importAccount error", error);
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
          `${accountName}-${index}`,
          index + 1
        );
      }
      const account = await this.createAccountWithId(accountId, accountName);
      const privateKey = account.getPrivateKey();
      const existed = this.validatePrivateKey(privateKey);
      if (!existed) {
        this.MasterAccount.child.push(account);
      } else {
        throw new Error("Account was existed!");
      }
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

  getAccountWillBeStoraged(account) {
    try {
      let newAccount = Object.assign(
        {},
        {
          name: account.name,
          child: Array.from(account.child),
          key: {
            Depth: account.key.Depth,
            ChainCode: Array.from(account.key.ChainCode),
            ChildNumber: Array.from(account.key.ChildNumber),
            KeySet: {
              PrivateKey: Array.from(account.key.KeySet.PrivateKey),
            },
          },
          isImport: account.isImport,
        }
      );
      return newAccount;
    } catch (error) {
      console.log("getAccountWillBeStoraged ERROR", error);
      return account;
    }
  }

  async save(password = "", legacyEncryption = false) {
    try {
      console.time("TIME_SAVE_WALLET");
      if (password === "") {
        password = this.PassPhrase;
      }
      let wallet = {};
      Object.assign(wallet, this);
      wallet.MasterAccount = this.getAccountWillBeStoraged(
        wallet.MasterAccount
      );
      wallet.MasterAccount.child = wallet.MasterAccount.child.map((account) =>
        this.getAccountWillBeStoraged(account)
      );
      delete wallet.PassPhrase;
      delete wallet.Storage;
      delete wallet.measureStorage;
      delete wallet.RpcClient;
      delete wallet.Debug;
      delete wallet.RpcCoinService;
      delete wallet.PrivacyVersion;
      delete wallet.UseLegacyEncoding;
      delete wallet.PubsubService;
      delete wallet.RpcRequestService;
      delete wallet.AuthToken;
      delete wallet.RpcApiService;
      delete wallet.Network;
      let data = JSON.stringify(wallet);
      let cipherText;
      console.time("TIME_ENCRYPT_WALLET_BEFORE_SAVE");
      if (legacyEncryption) {
        cipherText = CryptoJS.AES.encrypt(data, password);
      } else {
        cipherText = sjcl.encrypt(sjcl.codec.hex.toBits(password), data);
      }
      console.timeEnd("TIME_ENCRYPT_WALLET_BEFORE_SAVE");
      cipherText = toString(cipherText);
      const size = cipherText.length / 2 / 1024;
      set(this.measureStorage, "saveWallet.size", `${size}kb`);
      await this.setWalletStorage({
        key: this.Name,
        value: cipherText,
      });
      console.timeEnd("TIME_SAVE_WALLET");
      return this;
    } catch (error) {
      throw error;
    }
  }

  async getHistoryByAccount(accName) {
    let account = this.getAccountByName(accName);
    return account.getNormalTxHistory();
  }

  async reImportPrototype(account) {
    try {
      let newAccount = new Account(this);
      newAccount.name = account.name;
      newAccount.isImport = account.isImport;
      newAccount.child = [...account.child];
      newAccount.key.Depth = account.key.Depth;
      newAccount.key.ChainCode = new Uint8Array(account.key.ChainCode);
      newAccount.key.ChildNumber = new Uint8Array(account.key.ChildNumber);
      newAccount.key.KeySet.PrivateKey = new Uint8Array(
        account.key.KeySet.PrivateKey
      );
      await newAccount.key.KeySet.importFromPrivateKey(
        newAccount.key.KeySet.PrivateKey
      );
      return newAccount;
    } catch (error) {
      console.log("reImportPrototype error", error);
      throw error;
    }
  }

  // Turn off passcode encrypt wallet by default
  async measureLoadWallet(passphrase, migratePassCodeToDefault = false) {
    try {
      const { password, aesKeyDefault, aesKeyPassCode } = passphrase;
      const selfRootname = toLower(this?.RootName);
      const selfStorage = this.Storage;
      const selfNetwork = this.Network;
      new Validator("loadWallet-password", password).string();
      new Validator("loadWallet-aesKeyDefault", aesKeyDefault).string();
      let shouldReSaveWallet = false;
      let newMethodDecrypted = false;
      let aesKey = aesKeyDefault; // Can parse by passcode update aesKey to aesKeyPassCode
      if (this.Storage) {
        let cipherText = await this.Storage.getItem(this.Name);
        if (!cipherText) {
          await this.setStorageLoadWalletError({ error: {
              name: selfRootname,
              function: 'measureLoadWallet',
              desc: 'FAIL STEP 1'
          }});
          return false;
        }
        // Decrypt cipherText by aesKey (default | passcode)
        let jsonStr;
        try {
          jsonStr = sjcl.decrypt(sjcl.codec.hex.toBits(aesKeyDefault), cipherText);
          if (isJsonString(jsonStr)) {
            console.log('LOAD WALLET BY: aesKeyDefault ', aesKeyDefault)
            newMethodDecrypted = true;
            if (!!aesKeyPassCode) {
              aesKey = aesKeyPassCode;
              shouldReSaveWallet = true;
            }
          }
        } catch (error) {
          console.log("CAN NOT DECRYPT BY sjcl.decrypt aesKeyDefault", error);
        }
        try {
          if (!isJsonString(jsonStr)) {
            jsonStr = sjcl.decrypt(sjcl.codec.hex.toBits(aesKeyPassCode), cipherText);
            console.log('LOAD WALLET BY: aesKeyPassCode ', aesKeyPassCode)
            if (isJsonString(jsonStr)) {
              aesKey = aesKeyPassCode;
              newMethodDecrypted = true;
            }
          }
        } catch (error) {
          console.log("CAN NOT DECRYPT BY sjcl.decrypt aesKeyPassCode", error);
        }

        if (!newMethodDecrypted) {
          try {
            const data = CryptoJS.AES.decrypt(cipherText, password);
            if (!!data) {
              shouldReSaveWallet = true;
              jsonStr = data.toString(CryptoJS.enc.Utf8);
            }
          } catch (error) {
            await this.setStorageLoadWalletError({ error: {
                name: selfRootname,
                function: 'measureLoadWallet',
                desc: 'FAIL STEP 2',
                error: JSON.stringify(error),
            }});
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
          obj.Seed = Buffer.from(obj.Seed);
          const masterAccount = await this.reImportPrototype(obj.MasterAccount);
          obj.MasterAccount = cloneDeep(masterAccount);
          let task = [
            ...obj.MasterAccount.child.map((account) =>
              this.reImportPrototype(account)
            ),
          ];
          const implTask = await Promise.all(task);
          implTask.forEach((account, index) => {
            obj.MasterAccount.child[index] = cloneDeep(account);
          });
          obj.MasterAccount.child = cloneDeep(
            uniqBy(obj.MasterAccount.child, (acc) =>
              [acc.name, acc.getPrivateKey()].join()
            )
          );
          Object.assign(this, obj);
          this.Mnemonic = obj?.Mnemonic || this.Mnemonic;
          this.configWallet({
            passPhrase: aesKey,
            name: this.Name,
            mnemonic: this.Mnemonic,
            storage: selfStorage,
            network: selfNetwork,
          });
          try {
            this.RootName = selfRootname;
            await this.setStorageBackupMasterKey(this, passphrase, migratePassCodeToDefault);
          } catch (error) {
            await this.setStorageLoadWalletError({ error: {
                name: selfRootname,
                function: 'measureLoadWallet',
                desc: 'FAIL STEP 3',
                error: JSON.stringify(error)
            }});
            console.log("error-setStorageBackupMasterKey", error);
          }
          if (shouldReSaveWallet || migratePassCodeToDefault) {
            try {
              if (migratePassCodeToDefault) aesKey = aesKeyDefault;
              await this.save(aesKey, false);
            } catch (error) {
              console.log("setStorageBackupMasterKey-error", error);
            }
          }
          return this;
        } catch (error) {
          await this.setStorageLoadWalletError({ error: {
              name: selfRootname,
              function: 'measureLoadWallet',
              desc: 'FAIL STEP 4',
              error: JSON.stringify(error)
          }});
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

  async loadWallet(passphrase, migratePassCodeToDefault) {
    try {
      const wallet = await this.measureAsyncFn(
        () => this.measureLoadWallet(passphrase, migratePassCodeToDefault),
        "loadWallet.totalTime"
      );
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
    try {
      let task = this.MasterAccount.child.map((account) =>
        account.getDeserializeInformation()
      );
      let result = await Promise.all(task);
      result = result.map((info, index) => ({ ...info, Index: index }));
      return result;
    } catch (error) {
      console.log("listAccount error", error);
      throw error;
    }
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
      if (!this.measureStorage.walletName) {
        set(this.measureStorage, "walletName", this.Name);
      }
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
      console.log("measureAsyncFn error", error);
      throw error;
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

  getKeyStorageBackupMasterKey() {
    return loadBackupKey(this.Network || '')
  }

  async getListStorageBackup(passphrase) {
    let list = [];
    try {
      const { aesKeyDefault, aesKeyPassCode } = passphrase;
      const key = this.getKeyStorageBackupMasterKey();
      let cipherText = (await this.getWalletStorage({ key })) || "";
      cipherText = JSON.stringify(cipherText);
      let json;
      if (!!aesKeyPassCode) {
        try {
          json = sjcl.decrypt(sjcl.codec.hex.toBits(aesKeyPassCode), cipherText);
          console.log('getListStorageBackup aesKeyPassCode success')
        } catch (e) {
          console.log('getListStorageBackup aesKeyPassCode error: ', e)
        }
      }
      if (!isJsonString(json)) {
        try {
          json = sjcl.decrypt(sjcl.codec.hex.toBits(aesKeyDefault), cipherText);
          console.log('getListStorageBackup aesKeyDefault success')
        } catch (e) {
          console.log('getListStorageBackup aesKeyDefault error: ', e)
        }
      }
      if (isJsonString(json)) {
        list = JSON.parse(json);
      }
    } catch (error) {
      console.log("getListStorageBackup-error", error);
    }
    return list || [];
  }

  async setStorageBackupMasterKey(wallet, passphrase, migratePassCodeToDefault = false) {
    try {
      const { aesKeyDefault, aesKeyPassCode } = passphrase;
      new Validator("setStorageBackupMasterKey-aesKey", aesKeyDefault)
        .string()
        .required();
      new Validator("setStorageBackupMasterKey-Wallet", wallet)
        .object()
        .required();
      const key = this.getKeyStorageBackupMasterKey();
      let rootName = toLower(wallet?.RootName);
      wallet.IsMasterless =
        includes(rootName, "masterless") || includes(rootName, "unlinked");
      const oldList = await this.getListStorageBackup(passphrase);
      let listAccount = (await wallet?.listAccount()) || [];
      listAccount =
        listAccount?.map(({ PrivateKey, AccountName, ID }) => ({
          id: ID,
          accountName: AccountName,
          privateKey: PrivateKey,
        })) || [];
      const isMasterless = !!wallet?.IsMasterless;
      let _wallet = {
        name: wallet?.RootName,
        mnemonic: wallet?.Mnemonic,
        isMasterless,
      };
      const foundIndex = oldList.findIndex((w) =>
        isEqual(_wallet?.mnemonic, w?.mnemonic)
      );
      const isExisted = foundIndex > -1;
      if (isExisted && !isMasterless) {
        return;
      }
      await clearCache(key);
      let newList = [...oldList];
      if (!isExisted && !isMasterless) {
        newList.push(_wallet);
      } else if (!isExisted && isMasterless) {
        _wallet.accounts = [...listAccount];
        newList.push(_wallet);
      } else if (isExisted && isMasterless) {
        let oldListAccounts = newList[foundIndex].accounts;
        let newListAccounts = listAccount;
        const combineAccounts = _.uniqBy(
          [...oldListAccounts, ...newListAccounts],
          "privateKey"
        );
        newList[foundIndex].accounts = combineAccounts;
      }

      let cipherText = '';

      // Encrypt aesKey passcode
      try {
        if (!migratePassCodeToDefault && aesKeyPassCode) {
          cipherText = sjcl.encrypt(
              sjcl.codec.hex.toBits(aesKeyPassCode),
              JSON.stringify(newList)
          );
        }
      } catch (e) {
        console.log('encode backup keys aesKeyPassCode error: ', cipherText)
      }

      // Encrypt aesKey default
      try {
        if (!cipherText) {
          cipherText = sjcl.encrypt(
              sjcl.codec.hex.toBits(aesKeyDefault),
              JSON.stringify(newList)
          );
        }
      } catch (e) {
        console.log('encode backup keys aesKeyDefault error: ', cipherText)
      }
      if (!!cipherText) {
        await this.setWalletStorage({ key, value: cipherText });
      }
    } catch (error) {
      console.log("setStorageBackupMasterKey-error", error);
    }
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
  static Network = "";
  static IsMasterless = false;
  static RootName = "";
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

let setShardNumber = (shardNum) => {
  setShardNumberSub(shardNum);
  // return a Promise
  return wasmFuncs.setShardCount("", shardNum);
};

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
  BurningPRVERC20RequestMeta,
  BurningPRVBEP20RequestMeta,
  BurningPDEXERC20RequestMeta,
  BurningPDEXBEP20RequestMeta,
  BurningPBSCForDepositToSCRequestMeta,
  BurningPLGRequestMeta,
  BurningPLGForDepositToSCRequestMeta,
  BurningFantomRequestMeta,
  BurningFantomForDepositToSCRequestMeta,
  WithDrawRewardRequestMeta,
  PDEContributionMeta,
  PDEPRVRequiredContributionRequestMeta,
  PDETradeRequestMeta,
  PDECrossPoolTradeRequestMeta,
  PDEWithdrawalRequestMeta,
  PortalV4ShieldingRequestMeta,
  PortalV4ShieldingResponseMeta,
  PortalV4UnshieldRequestMeta,
  PortalV4UnshieldingResponseMeta,
  hybridEncryption,
  hybridDecryption,
  encryptMessageOutCoin,
  decryptMessageOutCoin,
  constants,
  coinChooser,
  newMnemonic,
  newSeed,
  validateMnemonic,
  PrivacyVersion,
  Validator,
  ACCOUNT_CONSTANT,
  byteToHexString,
  hexStringToByte,
  TX_STATUS,
  ErrorObject,
  setShardNumber,
  isPaymentAddress,
  isOldPaymentAddress,
  VerifierTx,
  VERFIER_TX_STATUS,
  gomobileServices,
  RpcHTTPCoinServiceClient,
  PDexV3,
  EXCHANGE_SUPPORTED,
  //
  PANCAKE_CONSTANTS,
  UNI_CONSTANTS,
  CURVE_CONSTANTS,
  WEB3_CONSTANT,
  BSC_CONSTANT,
  loadBackupKey,
  parseStorageBackup,
};
