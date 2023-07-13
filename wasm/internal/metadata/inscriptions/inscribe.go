package ink

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type InscribeRequest struct {
	Data     json.RawMessage     `json:"Data"`
	Receiver privacy.OTAReceiver `json:"Receiver"`
	metadataCommon.MetadataBase
}

func NewInscribeRequest() *InscribeRequest {
	return &InscribeRequest{}
}

func (iReq InscribeRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(iReq)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}

func (iReq *InscribeRequest) CalculateSize() uint64 {
	return metadataCommon.CalculateSize(iReq)
}
