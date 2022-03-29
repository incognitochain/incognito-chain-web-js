package pdexv3

import (
	"encoding/json"
	"errors"
	"fmt"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type ReceiverInfo struct {
	Address privacy.OTAReceiver `json:"Address"`
	Amount  uint64              `json:"Amount"`
}

// Check if the given OTA address is a valid address and has the expected shard ID
func isValidOTAReceiver(receiverAddress privacy.OTAReceiver, expectedShardID byte) (privacy.OTAReceiver, error) {
	if !receiverAddress.IsValid() {
		return receiverAddress, errors.New("ReceiverAddress is invalid")
	}

	pkb := receiverAddress.PublicKey.ToBytesS()
	currentShardID := common.GetShardIDFromLastByte(pkb[len(pkb)-1])
	if currentShardID != expectedShardID {
		return receiverAddress, errors.New("ReceiverAddress shard ID is wrong")
	}

	return receiverAddress, nil
}

func (inf *ReceiverInfo) UnmarshalJSON(raw []byte) error {
	var temp struct {
		Address privacy.OTAReceiver         `json:"Address"`
		Amount  metadataCommon.Uint64Reader `json:"Amount"`
	}
	err := json.Unmarshal(raw, &temp)
	*inf = ReceiverInfo{
		Address: temp.Address,
		Amount:  uint64(temp.Amount),
	}
	return err
}

type AccessOTA privacy.Point

func (ota AccessOTA) MarshalJSON() ([]byte, error) {
	return json.Marshal(ota.ToBytesS())
}

func (ota *AccessOTA) UnmarshalJSON(data []byte) error {
	var b []byte
	err := json.Unmarshal(data, &b)
	if err != nil {
		return err
	}
	return ota.FromBytesS(b)
}

func (ota AccessOTA) ToBytes() [32]byte {
	return privacy.Point(ota).ToBytes()
}

func (ota *AccessOTA) FromBytes(data [32]byte) error {
	_, err := (*privacy.Point)(ota).FromBytes(data)
	return err
}

func (ota AccessOTA) ToBytesS() []byte {
	temp := ota.ToBytes()
	return temp[:]
}

func (ota *AccessOTA) FromBytesS(data []byte) error {
	if len(data) != 32 {
		return fmt.Errorf("Invalid AccessOTA byte length %d", len(data))
	}
	var temp [32]byte
	copy(temp[:], data)
	*ota = AccessOTA{}
	err := ota.FromBytes(temp)
	return err
}

type AccessOption struct {
	NftID    *common.Hash `json:"NftID,omitempty"`
	BurntOTA *AccessOTA   `json:"BurntOTA,omitempty"`
	AccessID *common.Hash `json:"AccessID,omitempty"`
}
