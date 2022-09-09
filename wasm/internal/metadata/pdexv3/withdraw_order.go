package pdexv3

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

// WithdrawOrderRequest
type WithdrawOrderRequest struct {
	PoolPairID string                              `json:"PoolPairID"`
	OrderID    string                              `json:"OrderID"`
	Amount     uint64                              `json:"Amount"`
	Receiver   map[common.Hash]privacy.OTAReceiver `json:"Receiver"`
	AccessOption
	metadataCommon.MetadataBase
}

func (req WithdrawOrderRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(req)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}

func (req *WithdrawOrderRequest) UnmarshalJSON(raw []byte) error {
	var temp struct {
		PoolPairID string                              `json:"PoolPairID"`
		OrderID    string                              `json:"OrderID"`
		Amount     metadataCommon.Uint64Reader         `json:"Amount"`
		Receiver   map[common.Hash]privacy.OTAReceiver `json:"Receiver"`
		AccessOption
		metadataCommon.MetadataBase
	}
	err := json.Unmarshal(raw, &temp)
	*req = WithdrawOrderRequest{
		PoolPairID:   temp.PoolPairID,
		OrderID:      temp.OrderID,
		Amount:       uint64(temp.Amount),
		Receiver:     temp.Receiver,
		AccessOption: temp.AccessOption,
		MetadataBase: temp.MetadataBase,
	}
	return err
}
