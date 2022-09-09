package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type ConvertTokenToUnifiedTokenRequest struct {
	TokenID        common.Hash         `json:"TokenID"`
	UnifiedTokenID common.Hash         `json:"UnifiedTokenID"`
	Amount         uint64              `json:"Amount"`
	Receiver       privacy.OTAReceiver `json:"Receiver"`
	metadataCommon.MetadataBase
}

func NewConvertTokenToUnifiedTokenRequest() *ConvertTokenToUnifiedTokenRequest {
	return &ConvertTokenToUnifiedTokenRequest{}
}

func NewConvertTokenToUnifiedTokenRequestWithValue(
	tokenID, unifiedTokenID common.Hash, amount uint64, receiver privacy.OTAReceiver,
) *ConvertTokenToUnifiedTokenRequest {
	metadataBase := metadataCommon.MetadataBase{
		Type: metadataCommon.BridgeAggConvertTokenToUnifiedTokenRequestMeta,
	}
	return &ConvertTokenToUnifiedTokenRequest{
		UnifiedTokenID: unifiedTokenID,
		TokenID:        tokenID,
		Amount:         amount,
		Receiver:       receiver,
		MetadataBase:   metadataBase,
	}
}

func (request *ConvertTokenToUnifiedTokenRequest) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		TokenID        common.Hash         `json:"TokenID"`
		UnifiedTokenID common.Hash         `json:"UnifiedTokenID"`
		Amount         uint64              `json:"Amount"`
		Receiver       privacy.OTAReceiver `json:"Receiver"`
		metadataCommon.MetadataBase
	}{
		TokenID:        request.TokenID,
		UnifiedTokenID: request.UnifiedTokenID,
		Amount:         request.Amount,
		Receiver:       request.Receiver,
		MetadataBase:   request.MetadataBase,
	})

	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *ConvertTokenToUnifiedTokenRequest) UnmarshalJSON(data []byte) error {
	temp := struct {
		TokenID        common.Hash                 `json:"TokenID"`
		UnifiedTokenID common.Hash                 `json:"UnifiedTokenID"`
		Amount         metadataCommon.Uint64Reader `json:"Amount"`
		Receiver       privacy.OTAReceiver         `json:"Receiver"`
		metadataCommon.MetadataBase
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.TokenID = temp.TokenID
	request.UnifiedTokenID = temp.UnifiedTokenID
	request.Amount = uint64(temp.Amount)
	request.Receiver = temp.Receiver
	request.MetadataBase = temp.MetadataBase
	return nil
}

func (request *ConvertTokenToUnifiedTokenRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&request)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}
