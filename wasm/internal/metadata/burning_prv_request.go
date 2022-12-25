package metadata

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type BurningPRVRequest struct {
	BurnerAddress     privacy.PaymentAddress // unused
	BurningAmount     uint64                 // must be equal to vout value
	TokenID           common.Hash
	TokenName         string // unused
	RemoteAddress     string
	RedepositReceiver *privacy.OTAReceiver `json:"RedepositReceiver,omitempty"`
	metadataCommon.MetadataBase
}

func NewBurningPRVRequest(
	burnerAddress privacy.PaymentAddress,
	burningAmount uint64,
	tokenID common.Hash,
	tokenName string,
	remoteAddress string,
	redepositReceiver privacy.OTAReceiver,
	metaType int,
) (*BurningPRVRequest, error) {
	metadataBase := metadataCommon.MetadataBase{
		Type: metaType,
	}
	burningReq := &BurningPRVRequest{
		BurnerAddress:     burnerAddress,
		BurningAmount:     burningAmount,
		TokenID:           tokenID,
		TokenName:         tokenName,
		RemoteAddress:     remoteAddress,
		RedepositReceiver: &redepositReceiver,
	}
	burningReq.MetadataBase = metadataBase
	return burningReq, nil
}

func (bReq BurningPRVRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(bReq)
	hash := common.HashH(rawBytes)
	return &hash
}
