package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type AcceptedShieldRequest struct {
	Receiver privacy.PaymentAddress      `json:"Receiver"`
	TokenID  common.Hash                 `json:"TokenID"`
	TxReqID  common.Hash                 `json:"TxReqID"`
	IsReward bool                        `json:"IsReward"`
	ShardID  byte                        `json:"ShardID"`
	Data     []AcceptedShieldRequestData `json:"Data"`
}

type AcceptedShieldRequestData struct {
	IssuingAmount   uint64 `json:"IssuingAmount"`
	UniqTx          []byte `json:"UniqTx,omitempty"`
	ExternalTokenID []byte `json:"ExternalTokenID,omitempty"`
	NetworkID       uint   `json:"NetworkID"`
}

type ShieldRequestData struct {
	BlockHash string   `json:"BlockHash"`
	TxIndex   uint     `json:"TxIndex"`
	Proof     []string `json:"Proof"`
	NetworkID uint     `json:"NetworkID"`
}

type ShieldRequest struct {
	Data    []ShieldRequestData `json:"Data"`
	TokenID common.Hash         `json:"TokenID"`
	metadataCommon.MetadataBase
}

func NewShieldRequest() *ShieldRequest {
	return &ShieldRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.IssuingUnifiedTokenRequestMeta,
		},
	}
}

func NewShieldRequestWithValue(
	data []ShieldRequestData, tokenID common.Hash,
) *ShieldRequest {
	return &ShieldRequest{
		Data:    data,
		TokenID: tokenID,
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.IssuingUnifiedTokenRequestMeta,
		},
	}
}

func (request *ShieldRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&request)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}
