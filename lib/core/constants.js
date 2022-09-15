const PriKeyType = 0x0; // Serialize wallet Account key into string with only PRIVATE KEY of Account KeySet
const PaymentAddressType = 0x1; // Serialize wallet Account key into string with only PAYMENT ADDRESS of Account KeySet
const ReadonlyKeyType = 0x2; // Serialize wallet Account key into string with only READONLY KEY of Account KeySet
// const PublicKeyType = 0x3; // Serialize wallet Account key into string with only READONLY KEY of Account KeySet
const OTAKeyType = 0x3;

const PriKeySerializeSize = 71;
const PaymentAddrSerializeSize = 67;
const ReadonlyKeySerializeSize = 67;
const OTAKeySerializeSize = 67;
// const PublicKeySerializeSize = 34;

const PriKeySerializeAddCheckSumSize = 75;
const PaymentAddrSerializeAddCheckSumSize = 71;
const ReadonlyKeySerializeAddCheckSumSize = 71;
const OTAKeySerializeAddCheckSumSize = 71;

const FailedTx = 0;
const SuccessTx = 1;
const ConfirmedTx = 2;

// for staking tx
// amount in mili constant
const MetaStakingBeacon = 64;
const MetaStakingShard = 63;
const StopAutoStakingMeta = 127;
const UnStakingMeta = 210;

const ShardStakingType = 0;
const BeaconStakingType = 1;

const MaxTxSize = 100; // in kb

const ChildNumberSize = 4;
const ChainCodeSize = 32;
const PrivacyUnit = 1e9;
const NanoUnit = 1e-9;

const BurnAddress =
  "12RxahVABnAVCGP3LGwCn8jkQxgw7z1x14wztHzn455TTVpi1wBq9YGwkRMQg3J4e657AbAnCvYCJSdA9czBUNuCKwGSRQt55Xwz8WA";

  // metadata type for burning txs
const BurningRequestMeta = 240; // v1: 27;
const BurningRequestToSCMeta = 242; // v1: 96;
const BurningPRVERC20RequestMeta = 274;
const	BurningPRVBEP20RequestMeta = 275;
const BurningPDEXERC20RequestMeta = 324;
const	BurningPDEXBEP20RequestMeta = 325;
const BurningPBSCRequestMeta = 252;
const BurningPBSCForDepositToSCRequestMeta = 326;
const BurningPLGRequestMeta = 329;
const BurningPLGForDepositToSCRequestMeta = 330;
const BurningFantomRequestMeta  = 333;
const BurningFantomForDepositToSCRequestMeta = 334;
const BurningAuroraRequestMeta  = 352;
const BurningAuroraForDepositToSCRequestMeta = 356;
const BurningAvaxRequestMeta  = 355;
const BurningAvaxForDepositToSCRequestMeta = 357;

const IssuingETHRequestMeta = 80;
const InitTokenRequestMeta = 244;
const WithDrawRewardRequestMeta = 44;
const PDEContributionMeta = 90;
const PDETradeRequestMeta = 205; // v1: 91;
const PDETradeResponseMeta = 206; // v1: 02;
const PDEWithdrawalRequestMeta = 93;
const PDEWithdrawalResponseMeta = 94;

const PDEPRVRequiredContributionRequestMeta = 204;
const PDECrossPoolTradeRequestMeta = 205;
const PDECrossPoolTradeResponseMeta = 206;
const PDEFeeWithdrawalRequestMeta = 207;
const PDEFeeWithdrawalResponseMeta = 208;
const PDETradingFeesDistributionMeta = 209;

// portalv4
const PortalV4ShieldingRequestMeta = 260;
const PortalV4ShieldingResponseMeta = 261;
const PortalV4UnshieldRequestMeta = 262;
const PortalV4UnshieldingResponseMeta = 263;

// pdex v3
const pdexv3 = {
  ModifyParamsMeta: 280,
  AddLiquidityRequestMeta: 281,
  AddLiquidityResponseMeta: 282,
  WithdrawLiquidityRequestMeta: 283,
  WithdrawLiquidityResponseMeta: 284,
  TradeRequestMeta: 285,
  TradeResponseMeta: 286,
  AddOrderRequestMeta: 287,
  AddOrderResponseMeta: 288,
  WithdrawOrderRequestMeta: 289,
  WithdrawOrderResponseMeta: 290,
  UserMintNftRequestMeta: 291,
  UserMintNftResponseMeta: 292,
  MintNftRequestMeta: 293,
  MintNftResponseMeta: 294,
  StakingRequestMeta: 295,
  StakingResponseMeta: 296,
  UnstakingRequestMeta: 297,
  UnstakingResponseMeta: 298,
  WithdrawLPFeeRequestMeta: 299,
  WithdrawLPFeeResponseMeta: 300,
  WithdrawProtocolFeeRequestMeta: 301,
  WithdrawProtocolFeeResponseMeta: 302,
  MintPDEXGenesisMeta: 303,
  MintBlockRewardMeta: 304,
  DistributeStakingRewardMeta: 305,
  WithdrawStakingRewardRequestMeta: 306,
  WithdrawStakingRewardResponseMeta: 307,
  MintNftAmount: 100,
};

const bridgeaggMeta = {
  BridgeAggModifyParamMeta                        : 340,
	BridgeAggConvertTokenToUnifiedTokenRequestMeta  : 341,
	BridgeAggConvertTokenToUnifiedTokenResponseMeta : 342,
	IssuingUnifiedTokenRequestMeta                  : 343,
	IssuingUnifiedTokenResponseMeta                 : 344,
	BurningUnifiedTokenRequestMeta                  : 345,
	BurningUnifiedTokenResponseMeta                 : 346,
	BridgeAggAddTokenMeta                           : 347,
};

const PRVID = [4];
const PRVIDSTR =
  "0000000000000000000000000000000000000000000000000000000000000004";
const PDEPOOLKEY = "pdepool";

const NoStakeStatus = -1;
const CandidatorStatus = 0;
const ValidatorStatus = 1;

const MenmonicWordLen = 12;
const PercentFeeToReplaceTx = 10;
const MaxSizeInfoCoin = 255;

const PrivacyVersion = {
  both: -1,
  ver1: 1,
  ver2: 2,
};

const PRV = {
  id: PRVIDSTR,
  name: "Privacy",
  displayName: "Privacy",
  symbol: "PRV",
  pDecimals: 9,
  hasIcon: true,
  originalSymbol: "PRV",
  isVerified: true,
};

const USDT_TOKEN_ID = global?.isMainnet
  ? "716fd1009e2a1669caacc36891e707bfdf02590f96ebd897548e8963c95ebac0"
  : "4946b16a08a9d4afbdf416edf52ef15073db0fc4a63e78eb9de80f94f6c0852a";

const BIG_COINS = {
  PRV: PRVIDSTR,
  USDT: USDT_TOKEN_ID,
  BTC: "b832e5d3b1f01a4f0623f7fe91d6673461e1f5d37d91fe78c5c2e6183ff39696",
  ETH: "ffd8d42dc40a8d166ea4848baf8b5f6e912ad79875f4373070b59392b1756c8f",
  BUSD: "9e1142557e63fd20dee7f3c9524ffe0aa41198c494aa8d36447d12e85f0ddce7",
  USDC: "1ff2da446abfebea3ba30385e2ca99b0f0bbeda5c6371f4c23c939672b429a42",
  BNB: "b2655152784e8639fa19521a7035f331eea1f1e911b2f3200a507ebb4554387b",
  DAI: "3f89c75324b46f13c7b036871060e641d996a24c09b3065835cb1d38b799d6c1",
  SAI: "d240c61c6066fed0535df9302f1be9f5c9728ef6d01ce88d525c4f6ff9d65a56",
  TUSD: "8c3a61e77061265aaefa1e7160abfe343c2189278dd224bb7da6e7edc6a1d4db",
  TOMO: "a0a22d131bbfdc892938542f0dbe1a7f2f48e16bc46bf1c5404319335dc1f0df",
  LINK: "e0926da2436adc42e65ca174e590c7b17040cd0b7bdf35982f0dd7fc067f6bcf",
  BAT: "1fe75e9afa01b85126370a1583c7af9f1a5731625ef076ece396fcc6584c2b44",
  BAND: "2dda855fb4660225882d11136a64ad80effbddfa18a168f78924629b8664a6b3",
  ZRX: "de395b1914718702687b477703bdd36e52119033a9037bb28f6b33a3d0c2f867",
  FTM: "d09ad0af0a34ea3e13b772ef9918b71793a18c79b2b75aec42c53b69537029fe",
  ZIL: "880ea0787f6c1555e59e3958a595086b7802fc7a38276bcd80d4525606557fbc",
  MCO: "caaf286e889a8e0cee122f434d3770385a0fd92d27fcee737405b73c45b4f05f",
  GUSD: "465b0f709844be95d97e1f5c484e79c6c1ac51d28de2a68020e7313d34f644fe",
  PAX: "4a790f603aa2e7afe8b354e63758bb187a4724293d6057a46859c81b7bd0e9fb",
  KCS: "513467653e06af73cd2b2874dd4af948f11f1c6f2689e994c055fd6934349e05",
  OMG: "249ca174b4dce58ea6e1f8eda6e6f74ab6a3de4e4913c4f50c15101001bb467b",
  XMR: "c01e7dc1d1aba995c19b257412340b057f8ad1482ccb6a9bb0adce61afbf05d4",
  ETH_TESTNET:
    "ffd8d42dc40a8d166ea4848baf8b5f6e9fe0e9c30d60062eb7d44a8df9e00854",
};

const PRIORITY_LIST = [
  BIG_COINS.PRV,
  BIG_COINS.USDC,
  BIG_COINS.USDT,
  BIG_COINS.DAI,
  BIG_COINS.BTC,
  BIG_COINS.ETH_TESTNET,
  BIG_COINS.ETH,
  BIG_COINS.XMR,
  BIG_COINS.BUSD,
  BIG_COINS.TUSD,
  BIG_COINS.GUSD,
  BIG_COINS.SAI,
  BIG_COINS.PAX,
  BIG_COINS.BNB,
  BIG_COINS.MCO,
  BIG_COINS.LINK,
  BIG_COINS.KCS,
  BIG_COINS.OMG,
  BIG_COINS.TOMO,
  BIG_COINS.BAND,
  BIG_COINS.ZRX,
  BIG_COINS.FTM,
  BIG_COINS.ZIL,
];

const ErrorMessage = {
  NOT_ENOUGH_COIN:
    "Not enough coin to spend, please get some PRV at Faucet tab in home screen.",
};

export {
  PriKeyType,
  PaymentAddressType,
  ReadonlyKeyType,
  // PublicKeyType,
  OTAKeyType,
  PriKeySerializeSize,
  PaymentAddrSerializeSize,
  ReadonlyKeySerializeSize,
  // PublicKeySerializeSize,
  OTAKeySerializeSize,
  FailedTx,
  SuccessTx,
  ConfirmedTx,
  MetaStakingBeacon,
  MetaStakingShard,
  ShardStakingType,
  BeaconStakingType,
  MaxTxSize,
  ChildNumberSize,
  ChainCodeSize,
  PercentFeeToReplaceTx,
  PrivacyUnit,
  NanoUnit,
  BurnAddress,
  BurningRequestMeta,
  BurningRequestToSCMeta,
  IssuingETHRequestMeta,
  InitTokenRequestMeta,
  WithDrawRewardRequestMeta,
  PRVID,
  NoStakeStatus,
  CandidatorStatus,
  ValidatorStatus,
  PDEContributionMeta,
  PDETradeRequestMeta,
  PDETradeResponseMeta,
  PDEWithdrawalRequestMeta,
  PDEWithdrawalResponseMeta,
  PRVIDSTR,
  PDEPOOLKEY,
  PriKeySerializeAddCheckSumSize,
  PaymentAddrSerializeAddCheckSumSize,
  ReadonlyKeySerializeAddCheckSumSize,
  MenmonicWordLen,
  MaxSizeInfoCoin,
  StopAutoStakingMeta,
  UnStakingMeta,
  PDEPRVRequiredContributionRequestMeta,
  PDECrossPoolTradeRequestMeta,
  PDECrossPoolTradeResponseMeta,
  PDEFeeWithdrawalRequestMeta,
  PDEFeeWithdrawalResponseMeta,
  PDETradingFeesDistributionMeta,
  PrivacyVersion,
  PRV,
  PRIORITY_LIST,
  BurningPBSCRequestMeta,
  PortalV4ShieldingRequestMeta,
  PortalV4ShieldingResponseMeta,
  PortalV4UnshieldRequestMeta,
  PortalV4UnshieldingResponseMeta,
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
  ErrorMessage,
  pdexv3,
  bridgeaggMeta,
};