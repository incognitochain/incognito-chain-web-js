package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
)

type ShieldResponseData struct {
	ExternalTokenID []byte `json:"ExternalTokenID"`
	UniqTx          []byte `json:"UniqETHTx"`
	NetworkID       uint   `json:"NetworkID"`
}

type ShieldResponse struct {
	metadataCommon.MetadataBase
	RequestedTxID common.Hash          `json:"RequestedTxID"`
	Data          []ShieldResponseData `json:"Data"`
	SharedRandom  []byte               `json:"SharedRandom,omitempty"`
}

func NewShieldResponse(metaType int) *ShieldResponse {
	return &ShieldResponse{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metaType,
		},
	}
}

func NewShieldResponseWithValue(
	metaType int, data []ShieldResponseData, requestedTxID common.Hash, shardRandom []byte,
) *ShieldResponse {
	return &ShieldResponse{
		Data: data,
		MetadataBase: metadataCommon.MetadataBase{
			Type: metaType,
		},
		SharedRandom:  shardRandom,
		RequestedTxID: requestedTxID,
	}
}

func (response *ShieldResponse) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&response)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}

func (response *ShieldResponse) SetSharedRandom(r []byte) {
	response.SharedRandom = r
}
