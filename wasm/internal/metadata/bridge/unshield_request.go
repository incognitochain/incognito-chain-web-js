package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type UnshieldRequestData struct {
	IncTokenID        common.Hash `json:"IncTokenID"`
	BurningAmount     uint64      `json:"BurningAmount"`
	MinExpectedAmount uint64      `json:"MinExpectedAmount"`
	RemoteAddress     string      `json:"RemoteAddress"`
}

type UnshieldRequest struct {
	UnifiedTokenID common.Hash           `json:"UnifiedTokenID"`
	Data           []UnshieldRequestData `json:"Data"`
	Receiver       privacy.OTAReceiver   `json:"Receiver"`
	IsDepositToSC  bool                  `json:"IsDepositToSC"`
	metadataCommon.MetadataBase
}

func NewUnshieldRequest() *UnshieldRequest {
	return &UnshieldRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.BurningUnifiedTokenRequestMeta,
		},
	}
}

func NewUnshieldRequestWithValue(
	tokenID common.Hash, data []UnshieldRequestData, receiver privacy.OTAReceiver,
) *UnshieldRequest {
	return &UnshieldRequest{
		UnifiedTokenID: tokenID,
		Data:           data,
		Receiver:       receiver,
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.BurningUnifiedTokenRequestMeta,
		},
	}
}

func (request *UnshieldRequestData) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		IncTokenID        common.Hash `json:"IncTokenID"`
		BurningAmount     uint64      `json:"BurningAmount"`
		MinExpectedAmount uint64      `json:"MinExpectedAmount"`
		RemoteAddress     string      `json:"RemoteAddress"`
	}{
		IncTokenID:        request.IncTokenID,
		BurningAmount:     request.BurningAmount,
		MinExpectedAmount: request.MinExpectedAmount,
		RemoteAddress:     request.RemoteAddress,
	})

	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *UnshieldRequestData) UnmarshalJSON(data []byte) error {
	temp := struct {
		IncTokenID        common.Hash                 `json:"IncTokenID"`
		BurningAmount     metadataCommon.Uint64Reader `json:"BurningAmount"`
		MinExpectedAmount metadataCommon.Uint64Reader `json:"MinExpectedAmount"`
		RemoteAddress     string                      `json:"RemoteAddress"`
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.IncTokenID = temp.IncTokenID
	request.BurningAmount = uint64(temp.BurningAmount)
	request.MinExpectedAmount = uint64(temp.MinExpectedAmount)
	request.RemoteAddress = temp.RemoteAddress
	return nil
}

func (request *UnshieldRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&request)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}
