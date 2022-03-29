package pdexv3

import (
	"encoding/json"

	metadataCommon "incognito-chain/metadata/common"
)

type WithdrawLiquidityRequest struct {
	metadataCommon.MetadataBase
	poolPairID string
	AccessOption
	otaReceivers map[string]string
	shareAmount  uint64
}

func NewWithdrawLiquidityRequest() *WithdrawLiquidityRequest {
	return &WithdrawLiquidityRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.Pdexv3WithdrawLiquidityRequestMeta,
		},
	}
}

func NewWithdrawLiquidityRequestWithValue(
	poolPairID string, accessOption AccessOption, otaReceivers map[string]string,
	shareAmount uint64,
) *WithdrawLiquidityRequest {
	return &WithdrawLiquidityRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.Pdexv3WithdrawLiquidityRequestMeta,
		},
		poolPairID:   poolPairID,
		AccessOption: accessOption,
		otaReceivers: otaReceivers,
		shareAmount:  shareAmount,
	}
}

func (request *WithdrawLiquidityRequest) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		PoolPairID string `json:"PoolPairID"`
		AccessOption
		OtaReceivers map[string]string `json:"OtaReceivers"`
		ShareAmount  uint64            `json:"ShareAmount"`
		metadataCommon.MetadataBase
	}{
		PoolPairID:   request.poolPairID,
		AccessOption: request.AccessOption,
		OtaReceivers: request.otaReceivers,
		ShareAmount:  request.shareAmount,
		MetadataBase: request.MetadataBase,
	})
	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *WithdrawLiquidityRequest) UnmarshalJSON(data []byte) error {
	temp := struct {
		PoolPairID string `json:"PoolPairID"`
		AccessOption
		OtaReceivers map[string]string           `json:"OtaReceivers"`
		ShareAmount  metadataCommon.Uint64Reader `json:"ShareAmount"`
		metadataCommon.MetadataBase
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.poolPairID = temp.PoolPairID
	request.AccessOption = temp.AccessOption
	request.otaReceivers = temp.OtaReceivers
	request.shareAmount = uint64(temp.ShareAmount)
	request.MetadataBase = temp.MetadataBase
	return nil
}

func (request *WithdrawLiquidityRequest) PoolPairID() string {
	return request.poolPairID
}

func (request *WithdrawLiquidityRequest) OtaReceivers() map[string]string {
	return request.otaReceivers
}

func (request *WithdrawLiquidityRequest) ShareAmount() uint64 {
	return request.shareAmount
}
