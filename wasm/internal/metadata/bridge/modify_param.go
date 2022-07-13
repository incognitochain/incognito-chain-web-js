package bridge

import (
	"encoding/json"

	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
)

type ModifyBridgeAggParamReq struct {
	metadataCommon.MetadataBaseWithSignature
	PercentFeeWithDec uint64 `json:"PercentFeeWithDec"`
}

func NewModifyBridgeAggParamReq() *ModifyBridgeAggParamReq {
	return &ModifyBridgeAggParamReq{}
}

func NewModifyBridgeAggParamReqWithValue(percentFeeWithDec uint64) *ModifyBridgeAggParamReq {
	metadataBase := metadataCommon.NewMetadataBaseWithSignature(metadataCommon.BridgeAggModifyParamMeta)
	request := &ModifyBridgeAggParamReq{}
	request.MetadataBaseWithSignature = *metadataBase
	request.PercentFeeWithDec = percentFeeWithDec
	return request
}

func (request *ModifyBridgeAggParamReq) Hash() *common.Hash {
	record := request.MetadataBaseWithSignature.Hash().String()
	if request.Sig != nil && len(request.Sig) != 0 {
		record += string(request.Sig)
	}
	contentBytes, _ := json.Marshal(request)
	hashParams := common.HashH(contentBytes)
	record += hashParams.String()

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func (request *ModifyBridgeAggParamReq) HashWithoutSig() *common.Hash {
	record := request.MetadataBaseWithSignature.Hash().String()
	contentBytes, _ := json.Marshal(request.PercentFeeWithDec)
	hashParams := common.HashH(contentBytes)
	record += hashParams.String()

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func (request *ModifyBridgeAggParamReq) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		metadataCommon.MetadataBaseWithSignature
		PercentFeeWithDec uint64 `json:"PercentFeeWithDec"`
	}{
		MetadataBaseWithSignature: request.MetadataBaseWithSignature,
		PercentFeeWithDec:         request.PercentFeeWithDec,
	})

	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *ModifyBridgeAggParamReq) UnmarshalJSON(data []byte) error {
	temp := struct {
		metadataCommon.MetadataBaseWithSignature
		PercentFeeWithDec metadataCommon.Uint64Reader `json:"PercentFeeWithDec"`
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.PercentFeeWithDec = uint64(temp.PercentFeeWithDec)
	request.MetadataBaseWithSignature = temp.MetadataBaseWithSignature
	return nil
}
