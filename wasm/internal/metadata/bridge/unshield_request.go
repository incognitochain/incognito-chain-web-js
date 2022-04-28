package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type RejectedUnshieldRequest struct {
	TokenID  common.Hash         `json:"TokenID"`
	Amount   uint64              `json:"Amount"`
	Receiver privacy.OTAReceiver `json:"Receiver"`
}

type AcceptedUnshieldRequest struct {
	TokenID common.Hash                   `json:"TokenID"`
	TxReqID common.Hash                   `json:"TxReqID"`
	Data    []AcceptedUnshieldRequestData `json:"data"`
}

type AcceptedUnshieldRequestData struct {
	Amount        uint64 `json:"BurningAmount"`
	NetworkID     uint   `json:"NetworkID,omitempty"`
	Fee           uint64 `json:"Fee"`
	IsDepositToSC bool   `json:"IsDepositToSC"`
}

type UnshieldRequestData struct {
	BurningAmount  uint64 `json:"BurningAmount"`
	RemoteAddress  string `json:"RemoteAddress"`
	IsDepositToSC  bool   `json:"IsDepositToSC"`
	NetworkID      uint   `json:"NetworkID"`
	ExpectedAmount uint64 `json:"ExpectedAmount"`
}

type UnshieldRequest struct {
	TokenID  common.Hash           `json:"TokenID"`
	Data     []UnshieldRequestData `json:"Data"`
	Receiver privacy.OTAReceiver   `json:"Receiver"`
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
		TokenID:  tokenID,
		Data:     data,
		Receiver: receiver,
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.BurningUnifiedTokenRequestMeta,
		},
	}
}

func (request *UnshieldRequestData) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		BurningAmount  uint64 `json:"BurningAmount"`
		RemoteAddress  string `json:"RemoteAddress"`
		IsDepositToSC  bool   `json:"IsDepositToSC"`
		NetworkID      uint   `json:"NetworkID"`
		ExpectedAmount uint64 `json:"ExpectedAmount"`
	}{

		BurningAmount:  request.BurningAmount,
		RemoteAddress:  request.RemoteAddress,
		IsDepositToSC:  request.IsDepositToSC,
		NetworkID:      request.NetworkID,
		ExpectedAmount: request.ExpectedAmount,
	})

	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *UnshieldRequestData) UnmarshalJSON(data []byte) error {
	temp := struct {
		BurningAmount  metadataCommon.Uint64Reader `json:"BurningAmount"`
		RemoteAddress  string                      `json:"RemoteAddress"`
		IsDepositToSC  bool                        `json:"IsDepositToSC"`
		NetworkID      uint                        `json:"NetworkID"`
		ExpectedAmount metadataCommon.Uint64Reader `json:"ExpectedAmount"`
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.BurningAmount = uint64(temp.BurningAmount)
	request.RemoteAddress = temp.RemoteAddress
	request.IsDepositToSC = temp.IsDepositToSC
	request.NetworkID = temp.NetworkID
	request.ExpectedAmount = uint64(temp.ExpectedAmount)
	return nil
}

func (request *UnshieldRequest) Hash() *common.Hash {
	rawBytes, _ := json.Marshal(&request)
	hash := common.HashH([]byte(rawBytes))
	return &hash
}
