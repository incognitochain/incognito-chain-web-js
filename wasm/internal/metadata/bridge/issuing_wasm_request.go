package bridge

import (
	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
)

type WasmShieldRequestData struct {
	TxHash uint `json:"TxHash"`
}

type IssuingWasmRequest struct {
	TxHash     string
	IncTokenID common.Hash
	NetworkID  uint `json:"NetworkID,omitempty"`
	metadataCommon.MetadataBase
}

func NewIssuingWasmRequest(
	txHash string,
	incTokenID common.Hash,
	networkID uint,
	metaType int,
) (*IssuingWasmRequest, error) {
	metadataBase := metadataCommon.MetadataBase{
		Type: metaType,
	}
	issuingWasmReq := &IssuingWasmRequest{
		TxHash:     txHash,
		IncTokenID: incTokenID,
		NetworkID:  networkID,
	}
	issuingWasmReq.MetadataBase = metadataBase
	return issuingWasmReq, nil
}

func (iReq IssuingWasmRequest) Hash() *common.Hash {
	record := iReq.TxHash
	record += iReq.MetadataBase.Hash().String()
	record += iReq.IncTokenID.String()

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func (iReq *IssuingWasmRequest) CalculateSize() uint64 {
	return metadataCommon.CalculateSize(iReq)
}
