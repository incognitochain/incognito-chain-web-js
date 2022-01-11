package pdexv3

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
)

type Pdexv3Params struct {
	DefaultFeeRateBPS               uint            `json:"DefaultFeeRateBPS"`
	FeeRateBPS                      map[string]uint `json:"FeeRateBPS"`
	PRVDiscountPercent              uint            `json:"PRVDiscountPercent"`
	LimitProtocolFeePercent         uint            `json:"LimitProtocolFeePercent"`
	LimitStakingPoolRewardPercent   uint            `json:"LimitStakingPoolRewardPercent"`
	TradingProtocolFeePercent       uint            `json:"TradingProtocolFeePercent"`
	TradingStakingPoolRewardPercent uint            `json:"TradingStakingPoolRewardPercent"`
	DefaultStakingPoolsShare        uint            `json:"DefaultStakingPoolsShare"`
	StakingPoolsShare               map[string]uint `json:"StakingPoolsShare"`
}

type ParamsModifyingRequest struct {
	metadataCommon.MetadataBaseWithSignature
	Pdexv3Params `json:"Pdexv3Params"`
}

type ParamsModifyingContent struct {
	Content Pdexv3Params `json:"Content"`
	TxReqID common.Hash  `json:"TxReqID"`
	ShardID byte         `json:"ShardID"`
}

type ParamsModifyingRequestStatus struct {
	Status       int `json:"Status"`
	Pdexv3Params `json:"Pdexv3Params"`
}

func NewPdexv3ParamsModifyingRequestStatus(
	status int,
	feeRateBPS map[string]uint,
	prvDiscountPercent uint,
	limitProtocolFeePercent uint,
	limitStakingPoolRewardPercent uint,
	tradingProtocolFeePercent uint,
	tradingStakingPoolRewardPercent uint,
	stakingPoolsShare map[string]uint,
) *ParamsModifyingRequestStatus {
	return &ParamsModifyingRequestStatus{
		Pdexv3Params: Pdexv3Params{
			FeeRateBPS:                      feeRateBPS,
			PRVDiscountPercent:              prvDiscountPercent,
			LimitProtocolFeePercent:         limitProtocolFeePercent,
			LimitStakingPoolRewardPercent:   limitStakingPoolRewardPercent,
			TradingProtocolFeePercent:       tradingProtocolFeePercent,
			TradingStakingPoolRewardPercent: tradingStakingPoolRewardPercent,
			StakingPoolsShare:               stakingPoolsShare,
		},
		Status: status,
	}
}

func NewPdexv3ParamsModifyingRequest(
	metaType int,
	params Pdexv3Params,
) (*ParamsModifyingRequest, error) {
	metadataBase := metadataCommon.NewMetadataBaseWithSignature(metaType)
	paramsModifying := &ParamsModifyingRequest{}
	paramsModifying.MetadataBaseWithSignature = *metadataBase
	paramsModifying.Pdexv3Params = params

	return paramsModifying, nil
}

func (paramsModifying ParamsModifyingRequest) Hash() *common.Hash {
	record := paramsModifying.MetadataBaseWithSignature.Hash().String()
	if paramsModifying.Sig != nil && len(paramsModifying.Sig) != 0 {
		record += string(paramsModifying.Sig)
	}
	contentBytes, _ := json.Marshal(paramsModifying.Pdexv3Params)
	hashParams := common.HashH(contentBytes)
	record += hashParams.String()

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func (paramsModifying ParamsModifyingRequest) HashWithoutSig() *common.Hash {
	record := paramsModifying.MetadataBaseWithSignature.Hash().String()
	contentBytes, _ := json.Marshal(paramsModifying.Pdexv3Params)
	hashParams := common.HashH(contentBytes)
	record += hashParams.String()

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}
