package metadata

import (
	"encoding/json"
	"strconv"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

// whoever can send this type of tx
type BurningRequest struct {
	BurnerAddress privacy.PaymentAddress
	BurningAmount uint64 // must be equal to vout value
	TokenID       common.Hash
	TokenName     string
	RemoteAddress string
	MetadataBase
}

func NewBurningRequest(
	burnerAddress privacy.PaymentAddress,
	burningAmount uint64,
	tokenID common.Hash,
	tokenName string,
	remoteAddress string,
	metaType int,
) (*BurningRequest, error) {
	metadataBase := MetadataBase{
		Type: metaType,
	}
	burningReq := &BurningRequest{
		BurnerAddress: burnerAddress,
		BurningAmount: burningAmount,
		TokenID:       tokenID,
		TokenName:     tokenName,
		RemoteAddress: remoteAddress,
	}
	burningReq.MetadataBase = metadataBase
	return burningReq, nil
}

func (bReq BurningRequest) Hash() *common.Hash {
	record := bReq.MetadataBase.Hash().String()
	record += bReq.BurnerAddress.String()
	record += bReq.TokenID.String()
	record += strconv.FormatUint(bReq.BurningAmount, 10)
	record += bReq.TokenName
	record += bReq.RemoteAddress

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func (bReq BurningRequest) HashWithoutSig() *common.Hash {
	record := bReq.MetadataBase.Hash().String()
	record += bReq.BurnerAddress.String()
	record += bReq.TokenID.String()
	record += strconv.FormatUint(bReq.BurningAmount, 10)
	record += bReq.TokenName
	record += bReq.RemoteAddress

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func (br *BurningRequest) UnmarshalJSON(raw []byte) error {
	var temp struct {
		BurnerAddress privacy.PaymentAddress
		BurningAmount metadataCommon.Uint64Reader
		TokenID       common.Hash
		TokenName     string
		RemoteAddress string
		MetadataBase
	}
	err := json.Unmarshal(raw, &temp)
	*br = BurningRequest{
		BurnerAddress: temp.BurnerAddress,
		BurningAmount: uint64(temp.BurningAmount),
		TokenID:       temp.TokenID,
		TokenName:     temp.TokenName,
		RemoteAddress: temp.RemoteAddress,
		MetadataBase:  temp.MetadataBase,
	}
	return err
}
