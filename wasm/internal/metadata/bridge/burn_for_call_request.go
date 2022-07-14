package bridge

import (
    "encoding/json"

    "incognito-chain/common"
    metadataCommon "incognito-chain/metadata/common"
    "incognito-chain/privacy"
)

type BurnForCallRequest struct {
    BurnTokenID common.Hash              `json:"BurnTokenID"`
    Data        []BurnForCallRequestData `json:"Data"`
    metadataCommon.MetadataBase
}

type BurnForCallRequestData struct {
    BurningAmount       metadataCommon.Uint64Reader `json:"BurningAmount"`
    ExternalNetworkID   uint8                       `json:"ExternalNetworkID"`
    IncTokenID          common.Hash                 `json:"IncTokenID"`
    ExternalCalldata    string                      `json:"ExternalCalldata"`
    ExternalCallAddress string                      `json:"ExternalCallAddress"`
    ReceiveToken        string                      `json:"ReceiveToken"`
    RedepositReceiver   privacy.OTAReceiver         `json:"RedepositReceiver"`
    WithdrawAddress     string                      `json:"WithdrawAddress"`
}

func (bReq BurnForCallRequest) Hash() *common.Hash {
    rawBytes, _ := json.Marshal(bReq)
    hash := common.HashH([]byte(rawBytes))
    return &hash
}
