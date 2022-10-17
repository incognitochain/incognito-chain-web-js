package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
)

type ShieldRequest struct {
	Data           []ShieldRequestData `json:"Data"`
	UnifiedTokenID common.Hash         `json:"UnifiedTokenID"`
	metadataCommon.MetadataBase
}

type ShieldRequestData struct {
	Proof      []byte      `json:"Proof"`
	NetworkID  uint8       `json:"NetworkID"`
	IncTokenID common.Hash `json:"IncTokenID"`
}

func NewShieldRequest() *ShieldRequest {
	return &ShieldRequest{
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
