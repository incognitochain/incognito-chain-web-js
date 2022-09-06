

package metadata

import (
	"encoding/json"

	metadataBridge "incognito-chain/metadata/bridge"
	metadataCommon "incognito-chain/metadata/common"
	metadataPdexv3 "incognito-chain/metadata/pdexv3"

	"github.com/pkg/errors"
)

func ParseMetadata(raw json.RawMessage) (Metadata, error) {
	var err error
	if raw == nil || string(raw) == "null" {
		return nil, nil
	}

	mtTemp := map[string]interface{}{}
	err = json.Unmarshal(raw, &mtTemp)
	if err != nil {
		return nil, err
	}
	var md Metadata
	typeFloat, ok := mtTemp["Type"].(float64)
	if !ok {
		return nil, errors.Errorf("Could not parse metadata with type: %v", mtTemp["Type"])
	}
	theType := int(typeFloat)
	switch theType {
	case InitTokenRequestMeta:
		md = &InitTokenRequest{}
	case IssuingRequestMeta:
		md = &IssuingRequest{}
	case IssuingETHRequestMeta:
		md = &IssuingEVMRequest{}
	case IssuingResponseMeta:
		md = &IssuingResponse{}
	case ContractingRequestMeta:
		md = &ContractingRequest{}
	case BeaconSalaryResponseMeta:
		md = &BeaconBlockSalaryRes{}
	case BurningRequestMeta, BurningRequestMetaV2,
		BurningForDepositToSCRequestMeta, BurningForDepositToSCRequestMetaV2,
		BurningPBSCRequestMeta, BurningPRVERC20RequestMeta, BurningPRVBEP20RequestMeta,
		BurningPDEXERC20RequestMeta, BurningPDEXBEP20RequestMeta,
		BurningPBSCForDepositToSCRequestMeta,
		BurningPLGRequestMeta, BurningPLGForDepositToSCRequestMeta,
		BurningFantomRequestMeta, BurningFantomForDepositToSCRequestMeta:
		md = &BurningRequest{}
	case ShardStakingMeta:
		md = &StakingMetadata{}
	case BeaconStakingMeta:
		md = &StakingMetadata{}
	case ReturnStakingMeta:
		md = &ReturnStakingMetadata{}
	case WithDrawRewardRequestMeta:
		md = &WithDrawRewardRequest{}
	case WithDrawRewardResponseMeta:
		md = &WithDrawRewardResponse{}
	case StopAutoStakingMeta:
		md = &StopAutoStakingMetadata{}
	case PDEContributionMeta:
		md = &PDEContribution{}
	case PDEPRVRequiredContributionRequestMeta:
		md = &PDEContribution{}
	case PDETradeRequestMeta:
		md = &PDETradeRequest{}
	case PDETradeResponseMeta:
		md = &PDETradeResponse{}
	case PDECrossPoolTradeRequestMeta:
		md = &PDECrossPoolTradeRequest{}
	case PDECrossPoolTradeResponseMeta:
		md = &PDECrossPoolTradeResponse{}
	case PDEWithdrawalRequestMeta:
		md = &PDEWithdrawalRequest{}
	case PDEWithdrawalResponseMeta:
		md = &PDEWithdrawalResponse{}
	case PDEFeeWithdrawalRequestMeta:
		md = &PDEFeeWithdrawalRequest{}
	case PDEFeeWithdrawalResponseMeta:
		md = &PDEFeeWithdrawalResponse{}
	case PDEContributionResponseMeta:
		md = &PDEContributionResponse{}
	case RelayingBNBHeaderMeta:
		md = &RelayingHeader{}
	case RelayingBTCHeaderMeta:
		md = &RelayingHeader{}
	case UnStakingMeta:
		md = &UnStakingMetadata{}
	case IssuingBSCRequestMeta:
		md = &IssuingEVMRequest{}
	case IssuingBSCResponseMeta:
		md = &IssuingEVMResponse{}
	case PortalV4UnshieldRequestMeta:
		md = &PortalUnshieldRequest{}
	case metadataCommon.Pdexv3ModifyParamsMeta:
		md = &metadataPdexv3.ParamsModifyingRequest{}
	case metadataCommon.Pdexv3AddLiquidityRequestMeta:
		md = &metadataPdexv3.AddLiquidityRequest{}
	case metadataCommon.Pdexv3AddLiquidityResponseMeta:
		md = &metadataPdexv3.AddLiquidityResponse{}
	case metadataCommon.Pdexv3WithdrawLiquidityRequestMeta:
		md = &metadataPdexv3.WithdrawLiquidityRequest{}
	case metadataCommon.Pdexv3WithdrawLiquidityResponseMeta:
		md = &metadataPdexv3.WithdrawLiquidityResponse{}
	case metadataCommon.Pdexv3TradeRequestMeta:
		md = &metadataPdexv3.TradeRequest{}
	case metadataCommon.Pdexv3TradeResponseMeta:
		md = &metadataPdexv3.TradeResponse{}
	case metadataCommon.Pdexv3AddOrderRequestMeta:
		md = &metadataPdexv3.AddOrderRequest{}
	case metadataCommon.Pdexv3AddOrderResponseMeta:
		md = &metadataPdexv3.AddOrderResponse{}
	case metadataCommon.Pdexv3WithdrawOrderRequestMeta:
		md = &metadataPdexv3.WithdrawOrderRequest{}
	case metadataCommon.Pdexv3WithdrawOrderResponseMeta:
		md = &metadataPdexv3.WithdrawOrderResponse{}
	case metadataCommon.Pdexv3UserMintNftRequestMeta:
		md = &metadataPdexv3.UserMintNftRequest{}
	case metadataCommon.Pdexv3StakingRequestMeta:
		md = &metadataPdexv3.StakingRequest{}
	case metadataCommon.Pdexv3UnstakingRequestMeta:
		md = &metadataPdexv3.UnstakingRequest{}
	case metadataCommon.Pdexv3WithdrawLPFeeRequestMeta:
		md = &metadataPdexv3.WithdrawalLPFeeRequest{}
	case metadataCommon.Pdexv3WithdrawProtocolFeeRequestMeta:
		md = &metadataPdexv3.WithdrawalProtocolFeeRequest{}
	case metadataCommon.Pdexv3WithdrawStakingRewardRequestMeta:
		md = &metadataPdexv3.WithdrawalStakingRewardRequest{}
	case metadataCommon.BridgeAggModifyParamMeta:
		md = &metadataBridge.ModifyBridgeAggParamReq{}
	case metadataCommon.BridgeAggConvertTokenToUnifiedTokenRequestMeta:
		md = &metadataBridge.ConvertTokenToUnifiedTokenRequest{}
	case metadataCommon.BridgeAggConvertTokenToUnifiedTokenResponseMeta:
		md = &metadataBridge.ConvertTokenToUnifiedTokenResponse{}
	case metadataCommon.IssuingUnifiedTokenRequestMeta:
		md = &metadataBridge.ShieldRequest{}
	case metadataCommon.IssuingUnifiedTokenResponseMeta:
		md = &metadataBridge.ShieldResponse{}
	case metadataCommon.BurningUnifiedTokenRequestMeta:
		md = &metadataBridge.UnshieldRequest{}
	case metadataCommon.BurningUnifiedTokenResponseMeta:
		md = &metadataBridge.UnshieldResponse{}
	case metadataCommon.BurnForCallRequestMeta:
		md = &metadataBridge.BurnForCallRequest{}
	default:
		return nil, errors.Errorf("Could not parse metadata with type: %d", theType)
	}

	err = json.Unmarshal(raw, &md)
	if err != nil {
		return nil, err
	}
	return md, nil
}