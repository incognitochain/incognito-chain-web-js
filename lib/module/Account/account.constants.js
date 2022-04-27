import {
  STATUS_CODE_SHIELD_DECENTRALIZED,
  STATUS_CODE_SHIELD_CENTRALIZED,
  STATUS_CODE_UNSHIELD_DECENTRALIZED,
  STATUS_CODE_UNSHIELD_CENTRALIZED,
  ADDRESS_TYPE,
  STATUS_CODE_SHIELD_PORTAL,
  STATUS_CODE_UNSHIELD_PORTAL,
  STATUS_STR_SHIELD_PORTAL,
  STATUS_STR_UNSHIELD_PORTAL,
} from "@lib/module/Account/features/History/history.constant";
import { pdexv3 } from "@lib/core/constants";

const TxNormalType = "n"; // normal tx(send and receive coin)
const TxSalaryType = "s"; // salary tx(gov pay salary for block producer)
const TxCustomTokenType = "t"; // token  tx with no supporting privacy
const TxCustomTokenPrivacyType = "tp"; // token  tx with supporting privacy

const CustomTokenInit = 0;
const CustomTokenTransfer = 1;
const TxVersion = 1;

export const TX_TYPE = {
  SEND: 0,
  TRADE: 1,
  PROVIDE: 2,
  STAKE_VNODE: 3,
  UNSTAKE_VNODE: 4,
  WITHDRAW_REWARD_TX: 5,
  INIT_TOKEN: 6,
  BURN: 7,
  RECEIVE: 8,
  CONVERT: 9,
  ADD_LIQUIDITY: 10,
  WITHDRAW_LIQUIDITY: 11,
  WITHDRAW_LIQUIDITY_FEE: 12,
  CONSOLIDATE: 13,
  SHIELD: 99,
  UNSHIELD: 100,
  SHIELDPORTAL: 101,
  UNSHIELDPORTAL: 102,
  MINT_NFT_TOKEN: 103,
  ORDER_LIMIT: 104,
  CANCEL_ORDER_LIMIT: 105,
  SWAP: 106,
  CONTRIBUTE: 107,
  WITHDRAW_CONTRIBUTE: 108,
  WITHDRAW_CONTRIBUTE_REWARD: 109,
  STAKING_INVEST: 110,
  STAKING_WITHDRAW: 111,
  STAKING_WITHDRAW_REWARD: 112,
  CLAIM_ORDER_LIMIT: 113,
  CONVERT_TO_UNIFIED_TOKEN_REQUEST: 341,
  CONVERT_TO_UNIFIED_TOKEN_RESPONSE: 342
};

export const TX_TYPE_STR = {
  [TX_TYPE.SEND]: "Send",
  [TX_TYPE.TRADE]: "Send",
  [TX_TYPE.PROVIDE]: "Send",
  [TX_TYPE.STAKE_VNODE]: "Send",
  [TX_TYPE.UNSTAKE_VNODE]: "Send",
  [TX_TYPE.WITHDRAW_REWARD_TX]: "Send",
  [TX_TYPE.INIT_TOKEN]: "Send",
  [TX_TYPE.BURN]: "Send",
  [TX_TYPE.RECEIVE]: "Receive",
  [TX_TYPE.CONVERT]: "Convert",
  [TX_TYPE.SHIELD]: "Shield",
  [TX_TYPE.UNSHIELD]: "Unshield",
  [TX_TYPE.SHIELDPORTAL]: "Shield",
  [TX_TYPE.UNSHIELDPORTAL]: "Unshield",
  [TX_TYPE.CONSOLIDATE]: "Consolidate",
  [TX_TYPE.ADD_LIQUIDITY]: "Send",
  [TX_TYPE.WITHDRAW_LIQUIDITY_FEE]: "Send",
  [TX_TYPE.WITHDRAW_LIQUIDITY]: "Send",
  [TX_TYPE.SWAP]: "Trade Request",
  [TX_TYPE.ORDER_LIMIT]: "Add Order Request",
  [TX_TYPE.CANCEL_ORDER_LIMIT]: "Withdraw Order Request",
  [TX_TYPE.MINT_NFT_TOKEN]: "Mint Nft Request",
  [TX_TYPE.CONTRIBUTE]: "Contribute",
  [TX_TYPE.WITHDRAW_CONTRIBUTE]: "Withdraw contribute",
  [TX_TYPE.WITHDRAW_CONTRIBUTE_REWARD]: "Withdraw contribute reward",
  [TX_TYPE.STAKING_INVEST]: "Staking",
  [TX_TYPE.STAKING_WITHDRAW]: "Unstaking",
  [TX_TYPE.STAKING_WITHDRAW_REWARD]: "Withdraw staking",
  [TX_TYPE.CONVERT_TO_UNIFIED_TOKEN_REQUEST]: "Convert coin request",
  [TX_TYPE.CONVERT_TO_UNIFIED_TOKEN_RESPONSE]: "Convert coin response",
};

// todo: 0xkraken
// NumUTXO must be 255
// because tx zise is exceed 100kb with NumUTXO = 255
export const MaxInputNumberForDefragment = 30;
const MAX_DEFRAGMENT_TXS = 30;
export const MAX_INPUT_PER_TX = 30;
const DEFAULT_INPUT_PER_TX = 20;
const MaxInfoSize = 512;
export const NUMB_OF_OTHER_PKS = 7;

export const ShardStakingType = 0;
export const BeaconStakingType = 1;
export const StakingAmount = 1750e9;

export const MAX_FEE_PER_TX = 100;

export const LIMIT = 100;

export const TX_STATUS = {
  PROCESSING: -1,
  TXSTATUS_CANCELED: 0,
  TXSTATUS_FAILED: 1,
  TXSTATUS_PENDING: 2,
  TXSTATUS_SUCCESS: 3,
};

export const TX_STATUS_STR = {
  [TX_STATUS.PROCESSING]: "Proccessing",
  [TX_STATUS.TXSTATUS_CANCELED]: "Canceled",
  [TX_STATUS.TXSTATUS_FAILED]: "Failed",
  [TX_STATUS.TXSTATUS_PENDING]: "Pending",
  [TX_STATUS.TXSTATUS_SUCCESS]: "Success",
};

export const AIRDROP_STATUS = {
  FAIL: 0,
  PENDING: 1,
  SUCCESS: 2,
};

export const TIME_COUNT_BALANCE = 20;
export const MAX_COUNT_BALANCE = 8;

export const META_TYPE = {
  63: "Staking",
  127: "Stop Staking",
  210: "Unstaking",
  41: "Return Staking",
  44: "Withdraw Reward Request",
  45: "Withdraw Reward Response",
  244: "Init Token Request",
  245: "Init Token Response",
  91: "Trade Request",
  92: "Trade Response",
  205: "Trade Request",
  206: "Trade Response",
  207: "Withdraw Fee Request",
  208: "Withdraw Fee Response",
  209: "Trading Fee Distribution",
  260: "Portal Shield Request",
  261: "Portal Shield Response",
  262: "Portal Unshield Request",
  263: "Portal Unshield Response",
  [pdexv3.AddLiquidityRequestMeta]: "Contribute Request",
  [pdexv3.AddLiquidityResponseMeta]: "Contribute Response",
  [pdexv3.WithdrawLiquidityRequestMeta]: "Remove Contribute",
  [pdexv3.WithdrawLiquidityResponseMeta]: "Remove Contribute Response",
  [pdexv3.WithdrawLPFeeRequestMeta]: "Withdraw Reward",
  [pdexv3.WithdrawLPFeeResponseMeta]: "Withdraw Reward Response",
  [pdexv3.StakingRequestMeta]: "Staking Request",
  [pdexv3.StakingResponseMeta]: "Staking Response",
  [pdexv3.UnstakingRequestMeta]: "Remove Staking",
  [pdexv3.UnstakingResponseMeta]: "Remove Staking Response",
  [pdexv3.WithdrawStakingRewardRequestMeta]: "Withdraw Reward",
  [pdexv3.WithdrawStakingRewardResponseMeta]: "Withdraw Reward Response",
  [pdexv3.TradeRequestMeta]: "Trade Request",
  [pdexv3.TradeResponseMeta]: "Trade Response",
  [pdexv3.AddOrderRequestMeta]: "Add Order Request",
  [pdexv3.AddOrderResponseMeta]: "Add Order Response",
  [pdexv3.WithdrawOrderRequestMeta]: "Withdraw Order Request",
  [pdexv3.WithdrawOrderResponseMeta]: "Withdraw Order Response",
  [pdexv3.UserMintNftRequestMeta]: "Mint Nft Request",
  [pdexv3.UserMintNftResponseMeta]: "Mint Nft Response",
};

export const CONTRIBUTE_STATUS_STR = {
  PENDING: "Pending",
  SUCCESSFUL: "Successfully",
  REFUNDED: "Refunded",
  PART_REFUNFED: "part-refunded",
  FAILED: "Fail",
  WAITING: "Waiting",
};

export const LIQUIDITY_STATUS = {
  REFUND: ["refund", "xPoolTradeRefundFee", "xPoolTradeRefundSellingToken"],
  REJECTED: ["rejected", "withPRVFeeRejected"],
  ACCEPTED: ["accepted", "xPoolTradeAccepted", TX_STATUS.TXSTATUS_SUCCESS],
  FAIL: [TX_STATUS.TXSTATUS_FAILED, TX_STATUS.TXSTATUS_CANCELED],
};

export const LIQUIDITY_STATUS_STR = {
  PENDING: "Pending",
  SUCCESSFUL: "Successfully",
  REFUNDED: "Refunded",
  PART_REFUNFED: "part-refunded",
  FAILED: "Fail",
  WAITING: "Waiting",
};

export const CONTRIBUTE_STATUS = {
  WAITING: "waiting",
  MATCHED: "matched",
  MATCHED_N_RETURNED: "matchedNReturned",
  REFUND: "refund",
  FAIL: "fail",
};

export const CONTRIBUTE_STATUS_TYPE = {
  WAITING: "waiting",
  PENDING: "pending",
  REFUND: "refunded",
  COMPLETED: "completed",
  FAIL: "fail",
};

export const MAP_CONTRIBUTE_STATUS_TYPE = {
  [TX_STATUS.PROCESSING]: CONTRIBUTE_STATUS_TYPE.WAITING,
  [TX_STATUS.PENDING]: CONTRIBUTE_STATUS_TYPE.PENDING,
  [TX_STATUS.FAIL]: CONTRIBUTE_STATUS_TYPE.FAIL,
  [TX_STATUS.REFUND]: CONTRIBUTE_STATUS_TYPE.REFUND,
  [TX_STATUS.COMPLETED]: CONTRIBUTE_STATUS_TYPE.COMPLETED,

  [CONTRIBUTE_STATUS_TYPE.WAITING]: CONTRIBUTE_STATUS_TYPE.WAITING,
  [CONTRIBUTE_STATUS_TYPE.PENDING]: CONTRIBUTE_STATUS_TYPE.PENDING,
  [CONTRIBUTE_STATUS_TYPE.WAITING]: CONTRIBUTE_STATUS_TYPE.WAITING,
  [CONTRIBUTE_STATUS_TYPE.REFUND]: CONTRIBUTE_STATUS_TYPE.REFUND,
  [CONTRIBUTE_STATUS_TYPE.COMPLETED]: CONTRIBUTE_STATUS_TYPE.COMPLETED,
};

export const CONTRIBUTE_HISTORIES_TX_STR = {
  [CONTRIBUTE_STATUS_TYPE.WAITING]: "Waiting",
  [CONTRIBUTE_STATUS_TYPE.PENDING]: "Pending",
  [CONTRIBUTE_STATUS_TYPE.REFUND]: "Complete",
  [CONTRIBUTE_STATUS_TYPE.COMPLETED]: "Complete",
  [CONTRIBUTE_STATUS_TYPE.FAIL]: "Failed",
};

export const REMOVE_LP_HISTORIES_TYPE = {
  PENDING: "pending",
  SUCCESS: "success",
  FAIL: "fail",
};

export const MAP_REMOVE_LP_HISTORIES_SERVICE = {
  0: REMOVE_LP_HISTORIES_TYPE.PENDING,
  1: REMOVE_LP_HISTORIES_TYPE.SUCCESS,
  2: REMOVE_LP_HISTORIES_TYPE.FAIL,
};

export const MAP_STORAGE_REMOVE_LP_HISTORIES = {
  [TX_STATUS.PROCESSING]: REMOVE_LP_HISTORIES_TYPE.PENDING,
  [TX_STATUS.TXSTATUS_PENDING]: REMOVE_LP_HISTORIES_TYPE.PENDING,
  [TX_STATUS.TXSTATUS_SUCCESS]: REMOVE_LP_HISTORIES_TYPE.PENDING, // tx success, waiting reward coming
  [TX_STATUS.TXSTATUS_CANCELED]: REMOVE_LP_HISTORIES_TYPE.FAIL,
  [TX_STATUS.TXSTATUS_FAILED]: REMOVE_LP_HISTORIES_TYPE.FAIL,
};

export const REMOVE_LP_HISTORIES_TX_STR = {
  [REMOVE_LP_HISTORIES_TYPE.PENDING]: "Pending",
  [REMOVE_LP_HISTORIES_TYPE.SUCCESS]: "Complete",
  [REMOVE_LP_HISTORIES_TYPE.FAIL]: "Failed",
};

export const TX_STAKING_TYPE = {
  STAKING: 0,
  WITHDRAW_STAKING: 1,
  WITHDRAW_REWARD: 2,
};

export const TX_STAKING_TYPE_STR = {
  [TX_STAKING_TYPE.STAKING]: "Staking",
  [TX_STAKING_TYPE.WITHDRAW_STAKING]: "Un-stake",
  [TX_STAKING_TYPE.WITHDRAW_REWARD]: "Withdraw",
};

export const TX_STAKING_STATUS = {
  TXSTATUS_PENDING: 0,
  TXSTATUS_SUCCESS: 1,
  TXSTATUS_FAILED: 2,
};

export const TX_STAKING_STATUS_STR = {
  [TX_STAKING_STATUS.TXSTATUS_PENDING]: "Pending",
  [TX_STAKING_STATUS.TXSTATUS_SUCCESS]: "Completed",
  [TX_STAKING_STATUS.TXSTATUS_FAILED]: "Failed",
};

export const MAP_STORAGE_STAKING_TX_STATUS = {
  [TX_STATUS.PROCESSING]: TX_STAKING_STATUS.TXSTATUS_PENDING,
  [TX_STATUS.TXSTATUS_PENDING]: TX_STAKING_STATUS.TXSTATUS_PENDING,
  [TX_STATUS.TXSTATUS_SUCCESS]: TX_STAKING_STATUS.TXSTATUS_SUCCESS,
  [TX_STATUS.TXSTATUS_CANCELED]: TX_STAKING_STATUS.TXSTATUS_FAILED,
  [TX_STATUS.TXSTATUS_FAILED]: TX_STAKING_STATUS.TXSTATUS_FAILED,
};

export const PDEX_TX_STATUS_CODE = {
  TXSTATUS_PENDING: 0,
  TXSTATUS_SUCCESS: 1,
  TXSTATUS_FAILED: 2,
  TXSTATUS_WITHDRAWING: 2,
};

export const PDEX_TRANSACTION_TYPE = {
  NFT: "NFT",
  ACCESS_ID: "ACCESS_ID",
};


export default {
  TxNormalType,
  TxSalaryType,
  TxCustomTokenType,
  TxCustomTokenPrivacyType,
  CustomTokenInit,
  CustomTokenTransfer,
  TxVersion,
  MaxInputNumberForDefragment,
  MaxInfoSize,
  MAX_INPUT_PER_TX,
  MAX_DEFRAGMENT_TXS,
  DEFAULT_INPUT_PER_TX,
  ShardStakingType,
  BeaconStakingType,
  StakingAmount,
  TX_TYPE,
  TX_TYPE_STR,
  TX_STATUS_STR,
  TX_STATUS,
  AIRDROP_STATUS,
  TIME_COUNT_BALANCE,
  MAX_COUNT_BALANCE,
  STATUS_CODE_SHIELD_DECENTRALIZED,
  STATUS_CODE_SHIELD_CENTRALIZED,
  STATUS_CODE_UNSHIELD_DECENTRALIZED,
  STATUS_CODE_UNSHIELD_CENTRALIZED,
  ADDRESS_TYPE,
  STATUS_CODE_SHIELD_PORTAL,
  STATUS_CODE_UNSHIELD_PORTAL,
  STATUS_STR_SHIELD_PORTAL,
  STATUS_STR_UNSHIELD_PORTAL,
  MAX_FEE_PER_TX,
  CONTRIBUTE_STATUS,
  CONTRIBUTE_STATUS_STR,
  CONTRIBUTE_STATUS_TYPE,
  LIQUIDITY_STATUS,
  LIQUIDITY_STATUS_STR,
  MAP_CONTRIBUTE_STATUS_TYPE,
  CONTRIBUTE_HISTORIES_TX_STR,
  MAP_REMOVE_LP_HISTORIES_SERVICE,
  REMOVE_LP_HISTORIES_TX_STR,
  MAP_STORAGE_REMOVE_LP_HISTORIES,
  TX_STAKING_TYPE,
  TX_STAKING_TYPE_STR,
  TX_STAKING_STATUS,
  TX_STAKING_STATUS_STR,
  MAP_STORAGE_STAKING_TX_STATUS,
  PDEX_TX_STATUS_CODE,
  PDEX_TRANSACTION_TYPE,
};
