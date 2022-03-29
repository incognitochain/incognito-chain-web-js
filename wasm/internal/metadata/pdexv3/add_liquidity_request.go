package pdexv3

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type AddLiquidityRequest struct {
	poolPairID   string // only "" for the first contribution of pool
	pairHash     string
	otaReceiver  string                              // refund pToken
	otaReceivers map[common.Hash]privacy.OTAReceiver // receive tokens
	tokenID      string
	AccessOption
	tokenAmount uint64
	amplifier   uint // only set for the first contribution
	metadataCommon.MetadataBase
}

func NewAddLiquidity() *AddLiquidityRequest {
	return &AddLiquidityRequest{}
}

func (request *AddLiquidityRequest) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		PoolPairID   string                              `json:"PoolPairID"` // only "" for the first contribution of pool
		PairHash     string                              `json:"PairHash"`
		OtaReceiver  string                              `json:"OtaReceiver,omitempty"` // receive pToken
		OtaReceivers map[common.Hash]privacy.OTAReceiver `json:"OtaReceivers,omitempty"`
		TokenID      string                              `json:"TokenID"`
		AccessOption
		TokenAmount uint64 `json:"TokenAmount"`
		Amplifier   uint   `json:"Amplifier"` // only set for the first contribution
		metadataCommon.MetadataBase
	}{
		PoolPairID:   request.poolPairID,
		PairHash:     request.pairHash,
		OtaReceiver:  request.otaReceiver,
		TokenID:      request.tokenID,
		TokenAmount:  request.tokenAmount,
		Amplifier:    request.amplifier,
		AccessOption: request.AccessOption,
		MetadataBase: request.MetadataBase,
		OtaReceivers: request.otaReceivers,
	})

	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *AddLiquidityRequest) UnmarshalJSON(data []byte) error {
	temp := struct {
		PoolPairID   string                              `json:"PoolPairID"` // only "" for the first contribution of pool
		PairHash     string                              `json:"PairHash"`
		OtaReceiver  string                              `json:"OtaReceiver,omitempty"` // receive pToken
		OtaReceivers map[common.Hash]privacy.OTAReceiver `json:"OtaReceivers,omitempty"`
		TokenID      string                              `json:"TokenID"`
		AccessOption
		TokenAmount metadataCommon.Uint64Reader `json:"TokenAmount"`
		Amplifier   uint   `json:"Amplifier"` // only set for the first contribution
		metadataCommon.MetadataBase
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.poolPairID = temp.PoolPairID
	request.pairHash = temp.PairHash
	request.otaReceiver = temp.OtaReceiver
	request.tokenID = temp.TokenID
	request.AccessOption = temp.AccessOption
	request.tokenAmount = uint64(temp.TokenAmount)
	request.amplifier = temp.Amplifier
	request.MetadataBase = temp.MetadataBase
	request.AccessOption = temp.AccessOption
	request.otaReceivers = temp.OtaReceivers
	return nil
}

func (request *AddLiquidityRequest) PoolPairID() string {
	return request.poolPairID
}

func (request *AddLiquidityRequest) PairHash() string {
	return request.pairHash
}

func (request *AddLiquidityRequest) OtaReceiver() string {
	return request.otaReceiver
}

func (request *AddLiquidityRequest) TokenID() string {
	return request.tokenID
}

func (request *AddLiquidityRequest) TokenAmount() uint64 {
	return request.tokenAmount
}

func (request *AddLiquidityRequest) Amplifier() uint {
	return request.amplifier
}
