import { ErrorMessage } from "@lib/core/constants";

function parseStackTrace(detailError) {
  let stackTrace = "";
  let stackTraceCode = "";
  if (detailError && typeof detailError === "object") {
    if (detailError.Code && detailError.Code.toString().match(/-[0-9]+/)) {
      stackTraceCode = detailError.Code;
    }

    if (detailError.StackTrace) {
      stackTrace = detailError.StackTrace;
      if (detailError.StackTrace.match(/-[0-9]+: -[0-9]+/)) {
        stackTraceCode =
          stackTraceCode || detailError.StackTrace.match(/-[0-9]+: -[0-9]+/)[0];
      } else if (detailError.StackTrace.match(/-[0-9]+/)) {
        stackTraceCode =
          stackTraceCode || detailError.StackTrace.match(/-[0-9]+/)[0];
      } else {
        stackTraceCode = stackTraceCode || detailError.Code;
      }
    } else if (detailError.response) {
      stackTrace = detailError.message;
      stackTraceCode = stackTraceCode || detailError.response.status;
    }
  }

  return { stackTrace, stackTraceCode };
}

class CustomError extends Error {
  constructor(errorObj, message, detailError) {
    super(message);
    this.name = "WEB_JS_ERROR";
    this.code = errorObj.code;
    this.description = errorObj.description;
    this.date = new Date();
    this.detail =
      typeof detailError === "string"
        ? detailError
        : JSON.stringify(detailError);
    const { stackTrace, stackTraceCode } = parseStackTrace(detailError);
    this.stackTrace = stackTrace;
    this.stackTraceCode = stackTraceCode;
  }
}

class RPCError extends Error {
  constructor(method, detailError) {
    super(method);
    this.name = method;
    this.code = `${this.name}(${detailError.Code})`;
    this.description = detailError.Message;

    const { stackTrace, stackTraceCode } = parseStackTrace(detailError);

    this.stackTrace = stackTrace;
    this.stackTraceCode = stackTraceCode;
  }
}

const ErrorObject = {
  // -1 -> -1000: util error
  UnexpectedErr: { code: -1, description: "Unexpected error" },
  B58CheckDeserializedErr: {
    code: -2,
    description: "Base58 check deserialized error",
  },
  B58CheckSerializedErr: {
    code: -3,
    description: "Base58 check serialized error",
  },
  ChooseBestCoinErr: {
    code: -4,
    description: "Choose best coin to spend error",
  },
  NotEnoughCoinError: { code: -5, description: "Not enough coin to spend" },
  NotEnoughTokenError: { code: -6, description: "Not enough token to spend" },
  InvalidBurnAddress: { code: -7, description: "Burning address is invalid" },

  // -2000 -> -2999: wallet error
  WrongPassPhraseErr: { code: -2000, description: "Passphrase is not correct" },
  ExistedAccountErr: { code: -2001, description: "Account was existed" },
  LoadWalletErr: { code: -2002, description: "Can not load wallet" },
  NewEntropyErr: { code: -2003, description: "New entropy error" },
  DeleteWalletErr: { code: -2004, description: "New entropy error" },
  PrivateKeyInvalidErr: {
    code: -2005,
    description: "Private key is invalid when importing Account",
  },
  MnemonicInvalidErr: { code: -2006, description: "Mnemonic words is invalid" },
  InvalidAccountName: { code: -2001, description: "Account name is invalid" },

  // -3000 -> -3999: transaction error
  PrepareInputNormalTxErr: {
    code: -3000,
    description: "Prepare input coins for normal transaction error",
  },
  InitNormalTxErr: {
    code: -3001,
    description: "Can not init normal transaction",
  },
  SendTxErr: { code: -3002, description: "Can not send transaction" },
  InitWithrawRewardTxErr: {
    code: -3003,
    description: "Can not init withdraw reward transaction",
  },
  GetTxByHashErr: {
    code: -3004,
    description: "Can not get transaction by hash",
  },
  InvalidNumberUTXOToDefragment: {
    code: -3005,
    description: "The number of UTXO need to be defragmented is so small",
  },
  TxSizeExceedErr: { code: -3006, description: "Tx size is too large" },
  InitCustomTokenTxErr: {
    code: -3007,
    description: "Can not init custom token transaction",
  },
  InitPrivacyTokenTxErr: {
    code: -3008,
    description: "Can not init privacy token transaction",
  },
  EncryptMsgOutCoinErr: {
    code: -3009,
    description: "Can not encrypt message of output coins",
  },
  InvalidTypeTXToReplaceErr: {
    code: -3010,
    description: "Invalid tx type for replacing",
  },
  NoAvailableUTXO: { code: -3011, description: "No available UTXO" },
  EmptyUTXO: { code: -3012, description: "The UTXO is empty" },
  FailPushRawTxToPubsub: {
    code: -3013,
    description: "Push raw tx to pubsub failed!",
  },
  GetFailRandomCommitments: {
    code: -3014,
    description: "Get random commitments failed!",
  },

  // -4000 -> -4999: RPC error
  GetRewardAmountErr: { code: -4001, description: "Can not get reward amount" },
  GetOutputCoinsErr: {
    code: -4002,
    description: "Can not get list of output coins",
  },
  GetMaxShardNumberErr: {
    code: -4003,
    description: "Can not get max shard number",
  },
  GetListCustomTokenErr: {
    code: -4004,
    description: "Can not get list of custom tokens",
  },
  GetListPrivacyTokenErr: {
    code: -4005,
    description: "Can not get list of privacy tokens",
  },
  GetUnspentCustomTokenErr: {
    code: -4006,
    description: "Can not get list of unspent custom tokens",
  },
  GetUnspentPrivacyTokenErr: {
    code: -4007,
    description: "Can not get list of unspent privacy tokens",
  },
  GetUnspentCoinErr: {
    code: -4008,
    description: "Can not get list of unspent coins",
  },
  GetUnitFeeErr: { code: -4009, description: "Can not get unit fee" },
  GetStakingAmountErr: {
    code: -4010,
    description: "Can not get staking amount",
  },
  GetActiveShardErr: { code: -4011, description: "Can not get active shard" },
  HashToIdenticonErr: {
    code: -4012,
    description: "Can not generate identicon from hash",
  },

  // -5000 -> -5999: PUBSUB error
  GetStatusTransactionErr: {
    code: -5000,
    description: "Can not get status transaction",
  },

  // -6000 -> -6999: Coin services error
  GetTxsByPubKeysFail: { code: -6000, description: "Get txs by pubkeys fail" },
  GetTxsByKeyImagesFail: {
    code: -6001,
    description: "Get txs by key images fail",
  },
  GetTxsTransactorFail: { code: -6002, description: "Get txs transactor fail" },
  GetTxsReceiverFail: { code: -6003, description: "Get txs receiver fail" },
  GetTxsTransactorFromStorage: {
    code: -6004,
    description: "Get txs transactor from storage fail",
  },

  // -7000 -> -7999: Convert error
  RequestAirdropErr: { code: -7000, description: "Can't request airdrop" },
  GetKeyInfoErr: { code: -7001, description: "Can't get key info" },
  PrepareInputForFeeErr: {
    code: -7002,
    description: "Not enough PRV ver2 prepare input for fee",
  },
  NotEnoughCoinPRVError: {
    code: -7003,
    description: "Not enough coin to spend, please faucet to get some PRVs",
  },

  // -8000 -> -8999: Consolidate error
  PrepareInputConsolidateError: {
    code: -8000,
    description: "Prepare consolidate input error",
  },

  // -9000 -> -9999: PDexV3 error
  NFTTokenPending: {
    code: -9000,
    description: "Pending NFT token",
  },

  // -10000 -> -11000: WASM error
  WasmOTAReceiverError: {
    code: -10000,
    description: `OTA Receiver can't be loaded`,
  },

  // -20000 -> -20999: Portal error
  SupportPortalTokenIDErr: {
    code: -20000,
    description: "TokenID is not supported",
  },

  // -30000 -> -30999: PApps error
  CreateOTAFeeError: {
    code: -30000,
    description: "Create OTA fee address error",
  },
  CreateRawDataError: {
    code: -30001,
    description: "Create Raw data error",
  },
};

export { CustomError, ErrorObject, RPCError };
