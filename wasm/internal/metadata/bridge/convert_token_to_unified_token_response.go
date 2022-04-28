package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
)

type ConvertTokenToUnifiedTokenResponse struct {
	metadataCommon.MetadataBase
	Status  string      `json:"Status"`
	TxReqID common.Hash `json:"TxReqID"`
}

func NewConvertTokenToUnifiedTokenResponse() *ConvertTokenToUnifiedTokenResponse {
	return &ConvertTokenToUnifiedTokenResponse{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.BridgeAggConvertTokenToUnifiedTokenResponseMeta,
		},
	}
}

func NewBridgeAggConvertTokenToUnifiedTokenResponseWithValue(
	status string, txReqID common.Hash,
) *ConvertTokenToUnifiedTokenResponse {
	return &ConvertTokenToUnifiedTokenResponse{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.BridgeAggConvertTokenToUnifiedTokenResponseMeta,
		},
		Status:  status,
		TxReqID: txReqID,
	}
}

func (response *ConvertTokenToUnifiedTokenResponse) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&response)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}
