declare module "incognito-chain-web-js" {
   let Wallet: any;
   let Account: any;
   let DefaultStorage: any;
   let TxHistoryInfo: any;
   let RpcClient: any;
   let PaymentInfo: any;
   let KeyWallet: any;
   let PaymentAddressType: any;
   let CustomTokenTransfer: any;
   let CustomTokenInit: any;
   let PRVIDSTR: any;
   let ENCODE_VERSION: any;
   let FailedTx: any;
   let SuccessTx: any;
   let ConfirmedTx: any;
   let MetaStakingBeacon: any;
   let MetaStakingShard: any;
   let checkEncode: any;
   let toNanoPRV: any;
   let toPRV: any;
   let getShardIDFromLastByte: any;
   let generateECDSAKeyPair: any;
   let generateBLSKeyPair: any;
   let BurningPBSCRequestMeta: any;
   let BurningRequestMeta: any;
   let BurningPRVERC20RequestMeta: any;
   let BurningPRVBEP20RequestMeta: any;
   let BurningPDEXERC20RequestMeta: any;
   let BurningPDEXBEP20RequestMeta: any;
   let BurningPBSCForDepositToSCRequestMeta: any;
   let BurningPLGRequestMeta: any;
   let BurningPLGForDepositToSCRequestMeta: any;
   let BurningFantomRequestMeta: any;
   let BurningFantomForDepositToSCRequestMeta: any;
   let BurningAuroraRequestMeta: any;
   let BurningAuroraForDepositToSCRequestMeta: any;
   let BurningAvaxRequestMeta: any;
   let BurningAvaxForDepositToSCRequestMeta: any;
   let BurningNearRequestMeta: any;
   let BurningPRVRequestMeta: any;
   let WithDrawRewardRequestMeta: any;
   let PDEContributionMeta: any;
   let PDEPRVRequiredContributionRequestMeta: any;
   let PDETradeRequestMeta: any;
   let PDECrossPoolTradeRequestMeta: any;
   let PDEWithdrawalRequestMeta: any;
   let PortalV4ShieldingRequestMeta: any;
   let PortalV4ShieldingResponseMeta: any;
   let PortalV4UnshieldRequestMeta: any;
   let PortalV4UnshieldingResponseMeta: any;
   let hybridEncryption: any;
   let hybridDecryption: any;
   let encryptMessageOutCoin: any;
   let decryptMessageOutCoin: any;
   let constants: any;
   let coinChooser: any;
   let newMnemonic: any;
   let newSeed: any;
   let validateMnemonic: any;
   let PrivacyVersion: any;
   let Validator: any;
   let ACCOUNT_CONSTANT: any;
   let byteToHexString: any;
   let hexStringToByte: any;
   let TX_STATUS: any;
   let ErrorObject: any;
   let setShardNumber: any;
   let isPaymentAddress: any;
   let isOldPaymentAddress: any;
   let VerifierTx: any;
   let VERFIER_TX_STATUS: any;
   let gomobileServices: any;
   let RpcHTTPCoinServiceClient: any;
   let PDexV3: any;
   let EXCHANGE_SUPPORTED: any;
   let PANCAKE_CONSTANTS: any;
   let UNI_CONSTANTS: any;
   let CURVE_CONSTANTS: any;
   let WEB3_CONSTANT: any;
   let BSC_CONSTANT: any;
   let loadBackupKey: any;
   let parseStorageBackup: any;
   let wasm: any;
   let PTOKEN_ID: any;
   let createNewCoins: any;
   let getBurningAddress: any;
   let init: function;

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
      toNanoPRV,
      toPRV,
      getShardIDFromLastByte,
      generateECDSAKeyPair,
      generateBLSKeyPair,
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
      BurningAuroraRequestMeta,
      BurningAuroraForDepositToSCRequestMeta,
      BurningAvaxRequestMeta,
      BurningAvaxForDepositToSCRequestMeta,
      BurningNearRequestMeta,
      BurningPRVRequestMeta,
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
      PANCAKE_CONSTANTS,
      UNI_CONSTANTS,
      CURVE_CONSTANTS,
      WEB3_CONSTANT,
      BSC_CONSTANT,
      loadBackupKey,
      parseStorageBackup,
      wasm,
      PTOKEN_ID,
      createNewCoins,
      getBurningAddress,
      init,
   };
}