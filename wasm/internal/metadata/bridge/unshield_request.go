package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type UnshieldRequest struct {
	UnifiedTokenID common.Hash           `json:"UnifiedTokenID"`
	Data           []UnshieldRequestData `json:"Data"`
	Receiver       privacy.OTAReceiver   `json:"Receiver"`
	IsDepositToSC  bool                  `json:"IsDepositToSC"`
	metadataCommon.MetadataBase
}

type UnshieldRequestData struct {
	IncTokenID        common.Hash                 `json:"IncTokenID"`
	BurningAmount     metadataCommon.Uint64Reader `json:"BurningAmount"`
	MinExpectedAmount metadataCommon.Uint64Reader `json:"MinExpectedAmount"`
	RemoteAddress     string                      `json:"RemoteAddress"`
}

func NewUnshieldRequest() *UnshieldRequest {
	return &UnshieldRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.BurningUnifiedTokenRequestMeta,
		},
	}
}

func (request *UnshieldRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&request)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}