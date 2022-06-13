package common

// for common
const (
	EmptyString       = ""
	ZeroByte          = byte(0x00)
	DateOutputFormat  = "2006-01-02T15:04:05.999999"
	BigIntSize        = 32 // bytes
	CheckSumLen       = 4  // bytes
	AESKeySize        = 32 // bytes
	Int32Size         = 4  // bytes
	Uint32Size        = 4  // bytes
	Uint64Size        = 8  // bytes
	HashSize          = 32 // bytes
	MaxHashStringSize = HashSize * 2
	Base58Version     = 0
)

// size data for incognito key and signature
const (
	// for key size
	PrivateKeySize      = 32  // bytes
	PublicKeySize       = 32  // bytes
	BLSPublicKeySize    = 128 // bytes
	BriPublicKeySize    = 33  // bytes
	TransmissionKeySize = 32  // bytes
	ReceivingKeySize    = 32  // bytes
	PaymentAddressSize  = 64  // bytes
	// for signature size
	// it is used for both privacy and no privacy
	SigPubKeySize    = 32
	SigNoPrivacySize = 64
	SigPrivacySize   = 96
	IncPubKeyB58Size = 51

	MaxPSMsgSize = 1 << 22 //4Mb
)

// for exit code
const (
	ExitCodeUnknow = iota
	ExitByOs
	ExitByLogging
	ExitCodeForceUpdate
)

// For all Transaction information
const (
	TxNormalType          = "n"   // normal tx(send and receive coin)
	TxRewardType          = "s"   // reward tx
	TxReturnStakingType   = "rs"  //
	TxConversionType      = "cv"  // Convert 1 - 2 normal tx
	TxTokenConversionType = "tcv" // Convert 1 - 2 token tx
	//TxCustomTokenType        = "t"  // token  tx with no supporting privacy
	TxCustomTokenPrivacyType = "tp" // token  tx with supporting privacy
)

var (
	MaxTxSize    = uint64(100)  // unit KB = 100KB
	MaxBlockSize = uint64(2000) //unit kilobytes = 2 Megabyte
)

// special token ids (aka. PropertyID in custom token)
var (
	PRVCoinID               = Hash{4} // To send PRV in custom token
	PRVCoinName             = "PRV"   // To send PRV in custom token
	ConfidentialAssetID     = Hash{5}
	ConfidentialAssetName   = "CA"
	MaxShardNumber          = 8 //programmatically config based on networkID
	AllowBase58EncodedCoins = false
)

// CONSENSUS
const (
	NodeModeRelay  = "relay"
	NodeModeShard  = "shard"
	NodeModeAuto   = "auto"
	NodeModeBeacon = "beacon"

	BeaconRole    = "beacon"
	ShardRole     = "shard"
	CommitteeRole = "committee"
	ProposerRole  = "proposer"
	ValidatorRole = "validator"
	PendingRole   = "pending"
	SyncingRole   = "syncing" //this is for shard case - when beacon tell it is committee, but its state not
	WaitingRole   = "waiting"

	BlsConsensus    = "bls"
	BridgeConsensus = "dsa"
	IncKeyType      = "inc"
)

const (
	BeaconChainKey = "beacon"
	ShardChainKey  = "shard"
)

const (
	BeaconChainDataBaseID        = -1
	BeaconChainDatabaseDirectory = "beacon"
	ShardChainDatabaseDirectory  = "shard"
)

const (
	REPLACE_IN  = 0
	REPLACE_OUT = 1
)

// Ethereum Decentralized bridge
const (
	AbiJson       = ``
	BridgeShardID = 1
	EthAddrStr    = ""
)

// Bridge, PDE & Portal statuses for RPCs
const (
	BridgeRequestNotFoundStatus   = 0
	BridgeRequestProcessingStatus = 1
	BridgeRequestAcceptedStatus   = 2
	BridgeRequestRejectedStatus   = 3

	PDENotFoundStatus = 0

	PDEContributionWaitingStatus          = 1
	PDEContributionAcceptedStatus         = 2
	PDEContributionRefundStatus           = 3
	PDEContributionMatchedNReturnedStatus = 4

	PDETradeAcceptedStatus = 1
	PDETradeRefundStatus   = 2

	PDECrossPoolTradeAcceptedStatus = 1
	PDECrossPoolTradeRefundStatus   = 2

	PDEWithdrawalAcceptedStatus = 1
	PDEWithdrawalRejectedStatus = 2

	PDEFeeWithdrawalAcceptedStatus = 1
	PDEFeeWithdrawalRejectedStatus = 2

	MinTxFeesOnTokenRequirement                             = 10000000000000 // 10000 prv, this requirement is applied from beacon height 87301 mainnet
	BeaconBlockHeighMilestoneForMinTxFeesOnTokenRequirement = 87301          // milestone of beacon height, when apply min fee on token requirement

	//portal
	PortalCustodianDepositAcceptedStatus = 1
	PortalCustodianDepositRefundStatus   = 2

	PortalReqPTokenAcceptedStatus = 1
	PortalReqPTokenRejectedStatus = 2

	PortalPortingTxRequestAcceptedStatus = 1
	PortalPortingTxRequestRejectedStatus = 3

	PortalPortingReqSuccessStatus    = 1
	PortalPortingReqWaitingStatus    = 2
	PortalPortingReqExpiredStatus    = 3
	PortalPortingReqLiquidatedStatus = 4

	PortalRedeemReqSuccessStatus                = 1
	PortalRedeemReqWaitingStatus                = 2
	PortalRedeemReqMatchedStatus                = 3
	PortalRedeemReqLiquidatedStatus             = 4
	PortalRedeemReqCancelledByLiquidationStatus = 5

	PortalRedeemRequestTxAcceptedStatus = 1
	PortalRedeemRequestTxRejectedStatus = 2

	PortalCustodianWithdrawReqAcceptedStatus = 1
	PortalCustodianWithdrawReqRejectStatus   = 2

	PortalReqUnlockCollateralAcceptedStatus = 1
	PortalReqUnlockCollateralRejectedStatus = 2

	PortalLiquidateCustodianSuccessStatus = 1
	PortalLiquidateCustodianFailedStatus  = 2

	PortalLiquidationTPExchangeRatesSuccessStatus = 1
	PortalLiquidationTPExchangeRatesFailedStatus  = 2

	PortalReqWithdrawRewardAcceptedStatus = 1
	PortalReqWithdrawRewardRejectedStatus = 2

	PortalRedeemLiquidateExchangeRatesSuccessStatus  = 1
	PortalRedeemLiquidateExchangeRatesRejectedStatus = 2

	PortalLiquidationCustodianDepositSuccessStatus  = 1
	PortalLiquidationCustodianDepositRejectedStatus = 2

	PortalExpiredPortingReqSuccessStatus = 1
	PortalExpiredPortingReqFailedStatus  = 2

	PortalExchangeRatesAcceptedStatus = 1
	PortalExchangeRatesRejectedStatus = 2

	PortalReqMatchingRedeemAcceptedStatus = 1
	PortalReqMatchingRedeemRejectedStatus = 2

	PortalTopUpWaitingPortingSuccessStatus  = 1
	PortalTopUpWaitingPortingRejectedStatus = 2
)

// PDE statuses for chain
const (
	PDEContributionWaitingChainStatus          = "waiting"
	PDEContributionMatchedChainStatus          = "matched"
	PDEContributionRefundChainStatus           = "refund"
	PDEContributionMatchedNReturnedChainStatus = "matchedNReturned"

	PDETradeAcceptedChainStatus = "accepted"
	PDETradeRefundChainStatus   = "refund"

	PDEWithdrawalAcceptedChainStatus = "accepted"
	PDEWithdrawalRejectedChainStatus = "rejected"

	PDEFeeWithdrawalAcceptedChainStatus = "accepted"
	PDEFeeWithdrawalRejectedChainStatus = "rejected"

	PDEWithdrawalOnFeeAcceptedChainStatus      = "onFeeAccepted"
	PDEWithdrawalOnPoolPairAcceptedChainStatus = "onPoolPairAccepted"
	PDEWithdrawalWithPRVFeeRejectedChainStatus = "withPRVFeeRejected"

	PDECrossPoolTradeFeeRefundChainStatus          = "xPoolTradeRefundFee"
	PDECrossPoolTradeSellingTokenRefundChainStatus = "xPoolTradeRefundSellingToken"
	PDECrossPoolTradeAcceptedChainStatus           = "xPoolTradeAccepted"
)

// Portal status for chain
const (
	PortalCustodianDepositAcceptedChainStatus = "accepted"
	PortalCustodianDepositRefundChainStatus   = "refund"

	PortalReqPTokensAcceptedChainStatus = "accepted"
	PortalReqPTokensRejectedChainStatus = "rejected"

	PortalPortingRequestAcceptedChainStatus = "accepted"
	PortalPortingRequestRejectedChainStatus = "rejected"

	PortalExchangeRatesAcceptedChainStatus = "accepted"
	PortalExchangeRatesRejectedChainStatus = "rejected"

	PortalRedeemRequestAcceptedChainStatus           = "accepted"
	PortalRedeemRequestRejectedChainStatus           = "rejected"
	PortalRedeemReqCancelledByLiquidationChainStatus = "cancelled"

	PortalCustodianWithdrawRequestAcceptedStatus = "accepted"
	PortalCustodianWithdrawRequestRejectedStatus = "rejected"

	PortalReqUnlockCollateralAcceptedChainStatus = "accepted"
	PortalReqUnlockCollateralRejectedChainStatus = "rejected"

	PortalLiquidateCustodianSuccessChainStatus = "success"
	PortalLiquidateCustodianFailedChainStatus  = "failed"

	PortalLiquidateTPExchangeRatesSuccessChainStatus = "success"
	PortalLiquidateTPExchangeRatesFailedChainStatus  = "rejected"

	PortalReqWithdrawRewardAcceptedChainStatus = "accepted"
	PortalReqWithdrawRewardRejectedChainStatus = "rejected"

	PortalRedeemLiquidateExchangeRatesSuccessChainStatus  = "success"
	PortalRedeemLiquidateExchangeRatesRejectedChainStatus = "rejected"

	PortalLiquidationCustodianDepositSuccessChainStatus  = "success"
	PortalLiquidationCustodianDepositRejectedChainStatus = "rejected"

	PortalExpiredWaitingPortingReqSuccessChainStatus = "success"
	PortalExpiredWaitingPortingReqFailedChainStatus  = "failed"

	PortalReqMatchingRedeemAcceptedChainStatus = "accepted"
	PortalReqMatchingRedeemRejectedChainStatus = "rejected"

	PortalPickMoreCustodianRedeemSuccessChainStatus = "success"
	PortalPickMoreCustodianRedeemFailedChainStatus  = "failed"

	PortalTopUpWaitingPortingSuccessChainStatus  = "success"
	PortalTopUpWaitingPortingRejectedChainStatus = "rejected"
)

// Relaying header
const (
	RelayingHeaderRejectedChainStatus    = "rejected"
	RelayingHeaderConsideringChainStatus = "considering"
)

const PortalBTCIDStr = "ef5947f70ead81a76a53c7c8b7317dd5245510c665d3a13921dc9a581188728b"
const PortalBNBIDStr = "6abd698ea7ddd1f98b1ecaaddab5db0453b8363ff092f0d8d7d4c6b1155fb693"
const PRVIDStr = "0000000000000000000000000000000000000000000000000000000000000004"

var PortalSupportedIncTokenIDs = []string{
	PortalBTCIDStr, // pBTC
	PortalBNBIDStr, // pBNB
}

// set MinAmountPortalPToken to avoid attacking with amount is less than smallest unit of cryptocurrency
// such as satoshi in BTC
var MinAmountPortalPToken = map[string]uint64{
	PortalBTCIDStr: 10,
	PortalBNBIDStr: 10,
}

const (
	HexEmptyRoot = "56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
)

// burning addresses
const (
	BurningAddress  = "15pABFiJVeh9D5uiQEhQX4SVibGGbdAVipQxBdxkmDqAJaoG1EdFKHBrNfs"
	BurningAddress2 = "12RxahVABnAVCGP3LGwCn8jkQxgw7z1x14wztHzn455TTVpi1wBq9YGwkRMQg3J4e657AbAnCvYCJSdA9czBUNuCKwGSRQt55Xwz8WA"
)

var (
	EmptyRoot = HexToHash(HexEmptyRoot)
)
