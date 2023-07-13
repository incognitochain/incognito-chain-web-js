package metadata

import (
	metadataCommon "incognito-chain/metadata/common"
)

// export interfaces
type Metadata = metadataCommon.Metadata
type MetadataBase = metadataCommon.MetadataBase
type MetadataBaseWithSignature = metadataCommon.MetadataBaseWithSignature
type Transaction = metadataCommon.Transaction
type MempoolRetriever = metadataCommon.MempoolRetriever
type TxDesc = metadataCommon.TxDesc

// export structs
type OTADeclaration = metadataCommon.OTADeclaration
type MintData = metadataCommon.MintData
type AccumulatedValues = metadataCommon.AccumulatedValues

var AcceptedWithdrawRewardRequestVersion = metadataCommon.AcceptedWithdrawRewardRequestVersion

// export functions
var GenTokenIDFromRequest = metadataCommon.GenTokenIDFromRequest
var NewMetadataBase = metadataCommon.NewMetadataBase
var NewMetadataBaseWithSignature = metadataCommon.NewMetadataBaseWithSignature
var IsAvailableMetaInTxType = metadataCommon.IsAvailableMetaInTxType
var NoInputNoOutput = metadataCommon.NoInputNoOutput
var NoInputHasOutput = metadataCommon.NoInputHasOutput
var GetMetaAction = metadataCommon.GetMetaAction
var GetLimitOfMeta = metadataCommon.GetLimitOfMeta
var HasBridgeInstructions = metadataCommon.HasBridgeInstructions
var HasPortalInstructions = metadataCommon.HasPortalInstructions

var calculateSize = metadataCommon.CalculateSize

// export package constants
const (
	InvalidMeta                  = metadataCommon.InvalidMeta
	IssuingRequestMeta           = metadataCommon.IssuingRequestMeta
	IssuingResponseMeta          = metadataCommon.IssuingResponseMeta
	ContractingRequestMeta       = metadataCommon.ContractingRequestMeta
	IssuingETHRequestMeta        = metadataCommon.IssuingETHRequestMeta
	IssuingETHResponseMeta       = metadataCommon.IssuingETHResponseMeta
	ShardBlockReward             = metadataCommon.ShardBlockReward
	AcceptedBlockRewardInfoMeta  = metadataCommon.AcceptedBlockRewardInfoMeta
	ShardBlockSalaryResponseMeta = metadataCommon.ShardBlockSalaryResponseMeta
	BeaconRewardRequestMeta      = metadataCommon.BeaconRewardRequestMeta
	BeaconSalaryResponseMeta     = metadataCommon.BeaconSalaryResponseMeta
	ReturnStakingMeta            = metadataCommon.ReturnStakingMeta
	IncDAORewardRequestMeta      = metadataCommon.IncDAORewardRequestMeta
	ShardBlockRewardRequestMeta  = metadataCommon.ShardBlockRewardRequestMeta
	WithDrawRewardRequestMeta    = metadataCommon.WithDrawRewardRequestMeta
	WithDrawRewardResponseMeta   = metadataCommon.WithDrawRewardResponseMeta
	//staking
	ShardStakingMeta    = metadataCommon.ShardStakingMeta
	StopAutoStakingMeta = metadataCommon.StopAutoStakingMeta
	BeaconStakingMeta   = metadataCommon.BeaconStakingMeta
	UnStakingMeta       = metadataCommon.UnStakingMeta
	// Incognito -> Ethereum bridge
	BeaconSwapConfirmMeta = metadataCommon.BeaconSwapConfirmMeta
	BridgeSwapConfirmMeta = metadataCommon.BridgeSwapConfirmMeta
	BurningRequestMeta    = metadataCommon.BurningRequestMeta
	BurningRequestMetaV2  = metadataCommon.BurningRequestMetaV2
	BurningConfirmMeta    = metadataCommon.BurningConfirmMeta
	BurningConfirmMetaV2  = metadataCommon.BurningConfirmMetaV2
	// pde
	PDEContributionMeta                   = metadataCommon.PDEContributionMeta
	PDETradeRequestMeta                   = metadataCommon.PDETradeRequestMeta
	PDETradeResponseMeta                  = metadataCommon.PDETradeResponseMeta
	PDEWithdrawalRequestMeta              = metadataCommon.PDEWithdrawalRequestMeta
	PDEWithdrawalResponseMeta             = metadataCommon.PDEWithdrawalResponseMeta
	PDEContributionResponseMeta           = metadataCommon.PDEContributionResponseMeta
	PDEPRVRequiredContributionRequestMeta = metadataCommon.PDEPRVRequiredContributionRequestMeta
	PDECrossPoolTradeRequestMeta          = metadataCommon.PDECrossPoolTradeRequestMeta
	PDECrossPoolTradeResponseMeta         = metadataCommon.PDECrossPoolTradeResponseMeta
	PDEFeeWithdrawalRequestMeta           = metadataCommon.PDEFeeWithdrawalRequestMeta
	PDEFeeWithdrawalResponseMeta          = metadataCommon.PDEFeeWithdrawalResponseMeta
	PDETradingFeesDistributionMeta        = metadataCommon.PDETradingFeesDistributionMeta
	// portal
	PortalCustodianDepositMeta                  = metadataCommon.PortalCustodianDepositMeta
	PortalRequestPortingMeta                    = metadataCommon.PortalRequestPortingMeta
	PortalUserRequestPTokenMeta                 = metadataCommon.PortalUserRequestPTokenMeta
	PortalCustodianDepositResponseMeta          = metadataCommon.PortalCustodianDepositResponseMeta
	PortalUserRequestPTokenResponseMeta         = metadataCommon.PortalUserRequestPTokenResponseMeta
	PortalExchangeRatesMeta                     = metadataCommon.PortalExchangeRatesMeta
	PortalRedeemRequestMeta                     = metadataCommon.PortalRedeemRequestMeta
	PortalRedeemRequestResponseMeta             = metadataCommon.PortalRedeemRequestResponseMeta
	PortalRequestUnlockCollateralMeta           = metadataCommon.PortalRequestUnlockCollateralMeta
	PortalCustodianWithdrawRequestMeta          = metadataCommon.PortalCustodianWithdrawRequestMeta
	PortalCustodianWithdrawResponseMeta         = metadataCommon.PortalCustodianWithdrawResponseMeta
	PortalLiquidateCustodianMeta                = metadataCommon.PortalLiquidateCustodianMeta
	PortalLiquidateCustodianResponseMeta        = metadataCommon.PortalLiquidateCustodianResponseMeta
	PortalLiquidateTPExchangeRatesMeta          = metadataCommon.PortalLiquidateTPExchangeRatesMeta
	PortalExpiredWaitingPortingReqMeta          = metadataCommon.PortalExpiredWaitingPortingReqMeta
	PortalRewardMeta                            = metadataCommon.PortalRewardMeta
	PortalRequestWithdrawRewardMeta             = metadataCommon.PortalRequestWithdrawRewardMeta
	PortalRequestWithdrawRewardResponseMeta     = metadataCommon.PortalRequestWithdrawRewardResponseMeta
	PortalRedeemFromLiquidationPoolMeta         = metadataCommon.PortalRedeemFromLiquidationPoolMeta
	PortalRedeemFromLiquidationPoolResponseMeta = metadataCommon.PortalRedeemFromLiquidationPoolResponseMeta
	PortalCustodianTopupMeta                    = metadataCommon.PortalCustodianTopupMeta
	PortalCustodianTopupResponseMeta            = metadataCommon.PortalCustodianTopupResponseMeta
	PortalTotalRewardCustodianMeta              = metadataCommon.PortalTotalRewardCustodianMeta
	PortalPortingResponseMeta                   = metadataCommon.PortalPortingResponseMeta
	PortalReqMatchingRedeemMeta                 = metadataCommon.PortalReqMatchingRedeemMeta
	PortalPickMoreCustodianForRedeemMeta        = metadataCommon.PortalPickMoreCustodianForRedeemMeta
	PortalCustodianTopupMetaV2                  = metadataCommon.PortalCustodianTopupMetaV2
	PortalCustodianTopupResponseMetaV2          = metadataCommon.PortalCustodianTopupResponseMetaV2
	// Portal v3
	PortalCustodianDepositMetaV3                  = metadataCommon.PortalCustodianDepositMetaV3
	PortalCustodianWithdrawRequestMetaV3          = metadataCommon.PortalCustodianWithdrawRequestMetaV3
	PortalRewardMetaV3                            = metadataCommon.PortalRewardMetaV3
	PortalRequestUnlockCollateralMetaV3           = metadataCommon.PortalRequestUnlockCollateralMetaV3
	PortalLiquidateCustodianMetaV3                = metadataCommon.PortalLiquidateCustodianMetaV3
	PortalLiquidateByRatesMetaV3                  = metadataCommon.PortalLiquidateByRatesMetaV3
	PortalRedeemFromLiquidationPoolMetaV3         = metadataCommon.PortalRedeemFromLiquidationPoolMetaV3
	PortalRedeemFromLiquidationPoolResponseMetaV3 = metadataCommon.PortalRedeemFromLiquidationPoolResponseMetaV3
	PortalCustodianTopupMetaV3                    = metadataCommon.PortalCustodianTopupMetaV3
	PortalTopUpWaitingPortingRequestMetaV3        = metadataCommon.PortalTopUpWaitingPortingRequestMetaV3
	PortalRequestPortingMetaV3                    = metadataCommon.PortalRequestPortingMetaV3
	PortalRedeemRequestMetaV3                     = metadataCommon.PortalRedeemRequestMetaV3
	PortalUnlockOverRateCollateralsMeta           = metadataCommon.PortalUnlockOverRateCollateralsMeta
	// Incognito => Ethereum's SC for portal
	PortalCustodianWithdrawConfirmMetaV3         = metadataCommon.PortalCustodianWithdrawConfirmMetaV3
	PortalRedeemFromLiquidationPoolConfirmMetaV3 = metadataCommon.PortalRedeemFromLiquidationPoolConfirmMetaV3
	PortalLiquidateRunAwayCustodianConfirmMetaV3 = metadataCommon.PortalLiquidateRunAwayCustodianConfirmMetaV3
	//Note: don't use this metadata type for others
	PortalResetPortalDBMeta = metadataCommon.PortalResetPortalDBMeta
	// relaying
	RelayingBNBHeaderMeta                 = metadataCommon.RelayingBNBHeaderMeta
	RelayingBTCHeaderMeta                 = metadataCommon.RelayingBTCHeaderMeta
	PortalTopUpWaitingPortingRequestMeta  = metadataCommon.PortalTopUpWaitingPortingRequestMeta
	PortalTopUpWaitingPortingResponseMeta = metadataCommon.PortalTopUpWaitingPortingResponseMeta
	// incognito mode for smart contract
	BurningForDepositToSCRequestMeta   = metadataCommon.BurningForDepositToSCRequestMeta
	BurningForDepositToSCRequestMetaV2 = metadataCommon.BurningForDepositToSCRequestMetaV2
	BurningConfirmForDepositToSCMeta   = metadataCommon.BurningConfirmForDepositToSCMeta
	BurningConfirmForDepositToSCMetaV2 = metadataCommon.BurningConfirmForDepositToSCMetaV2
	InitTokenRequestMeta               = metadataCommon.InitTokenRequestMeta
	InitTokenResponseMeta              = metadataCommon.InitTokenResponseMeta
	// incognito mode for bsc
	IssuingBSCRequestMeta    = metadataCommon.IssuingBSCRequestMeta
	IssuingBSCResponseMeta   = metadataCommon.IssuingBSCResponseMeta
	BurningPBSCRequestMeta   = metadataCommon.BurningPBSCRequestMeta
	BurningBSCConfirmMeta    = metadataCommon.BurningBSCConfirmMeta
	AllShards                = metadataCommon.AllShards
	BeaconOnly               = metadataCommon.BeaconOnly
	StopAutoStakingAmount    = metadataCommon.StopAutoStakingAmount
	EVMConfirmationBlocks    = metadataCommon.EVMConfirmationBlocks
	NoAction                 = metadataCommon.NoAction
	MetaRequestBeaconMintTxs = metadataCommon.MetaRequestBeaconMintTxs
	MetaRequestShardMintTxs  = metadataCommon.MetaRequestShardMintTxs
	// portal v4
	PortalV4UnshieldRequestMeta = metadataCommon.PortalV4UnshieldRequestMeta
	// erc20/bep20 for prv token
	IssuingPRVERC20RequestMeta  = metadataCommon.IssuingPRVERC20RequestMeta
	IssuingPRVERC20ResponseMeta = metadataCommon.IssuingPRVERC20ResponseMeta
	IssuingPRVBEP20RequestMeta  = metadataCommon.IssuingPRVBEP20RequestMeta
	IssuingPRVBEP20ResponseMeta = metadataCommon.IssuingPRVBEP20ResponseMeta
	BurningPRVERC20RequestMeta  = metadataCommon.BurningPRVERC20RequestMeta
	BurningPRVERC20ConfirmMeta  = metadataCommon.BurningPRVERC20ConfirmMeta
	BurningPRVBEP20RequestMeta  = metadataCommon.BurningPRVBEP20RequestMeta
	BurningPRVBEP20ConfirmMeta  = metadataCommon.BurningPRVBEP20ConfirmMeta

	// erc20/bep20 for prv token
	IssuingPDEXERC20RequestMeta  = metadataCommon.IssuingPDEXERC20RequestMeta
	IssuingPDEXERC20ResponseMeta = metadataCommon.IssuingPDEXERC20ResponseMeta
	IssuingPDEXBEP20RequestMeta  = metadataCommon.IssuingPDEXBEP20RequestMeta
	IssuingPDEXBEP20ResponseMeta = metadataCommon.IssuingPDEXBEP20ResponseMeta
	BurningPDEXERC20RequestMeta  = metadataCommon.BurningPDEXERC20RequestMeta
	BurningPDEXERC20ConfirmMeta  = metadataCommon.BurningPDEXERC20ConfirmMeta
	BurningPDEXBEP20RequestMeta  = metadataCommon.BurningPDEXBEP20RequestMeta
	BurningPDEXBEP20ConfirmMeta  = metadataCommon.BurningPDEXBEP20ConfirmMeta

	// pancake integration
	BurningPBSCForDepositToSCRequestMeta = metadataCommon.BurningPBSCForDepositToSCRequestMeta

	// Polygon bridge
	IssuingPLGRequestMeta  = metadataCommon.IssuingPLGRequestMeta
	IssuingPLGResponseMeta = metadataCommon.IssuingPLGResponseMeta
	BurningPLGRequestMeta  = metadataCommon.BurningPLGRequestMeta
	BurningPLGConfirmMeta  = metadataCommon.BurningPLGConfirmMeta

	BurningPLGForDepositToSCRequestMeta = metadataCommon.BurningPLGForDepositToSCRequestMeta
	BurningPLGConfirmForDepositToSCMeta = metadataCommon.BurningPLGConfirmForDepositToSCMeta

	// Fantom bridge
	IssuingFantomRequestMeta  = metadataCommon.IssuingFantomRequestMeta
	IssuingFantomResponseMeta = metadataCommon.IssuingFantomResponseMeta
	BurningFantomRequestMeta  = metadataCommon.BurningFantomRequestMeta
	BurningFantomConfirmMeta  = metadataCommon.BurningFantomConfirmMeta

	BurningFantomForDepositToSCRequestMeta = metadataCommon.BurningFantomForDepositToSCRequestMeta
	BurningFantomConfirmForDepositToSCMeta = metadataCommon.BurningFantomConfirmForDepositToSCMeta

	BurningPRVRequestMeta = metadataCommon.BurningPRVRequestMeta

	// Bridge aggregator
	BridgeAggModifyParamMeta                        = metadataCommon.BridgeAggModifyParamMeta
	BridgeAggConvertTokenToUnifiedTokenRequestMeta  = metadataCommon.BridgeAggConvertTokenToUnifiedTokenRequestMeta
	BridgeAggConvertTokenToUnifiedTokenResponseMeta = metadataCommon.BridgeAggConvertTokenToUnifiedTokenResponseMeta
	IssuingUnifiedTokenRequestMeta                  = metadataCommon.IssuingUnifiedTokenRequestMeta
	IssuingUnifiedTokenResponseMeta                 = metadataCommon.IssuingUnifiedTokenResponseMeta
	BurningUnifiedTokenRequestMeta                  = metadataCommon.BurningUnifiedTokenRequestMeta
	BurningUnifiedTokenResponseMeta                 = metadataCommon.BurningUnifiedTokenResponseMeta
	BridgeAggAddTokenMeta                           = metadataCommon.BridgeAggAddTokenMeta

	// privacy inscriprions
	InscribeRequestMeta = metadataCommon.InscribeRequestMeta
)
