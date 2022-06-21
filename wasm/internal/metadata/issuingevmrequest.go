package metadata

import (
	"encoding/hex"
	"incognito-chain/common"
	"errors"
)

type IssuingEVMRequest struct {
	BlockHash  common.Hash
	TxIndex    uint
	ProofStrs  []string
	IncTokenID common.Hash
	MetadataBase
}

func NewIssuingEVMRequest(
	blockHash common.Hash,
	txIndex uint,
	proofStrs []string,
	incTokenID common.Hash,
	metaType int,
) (*IssuingEVMRequest, error) {
	metadataBase := MetadataBase{
		Type: metaType,
	}
	issuingEVMReq := &IssuingEVMRequest{
		BlockHash:  blockHash,
		TxIndex:    txIndex,
		ProofStrs:  proofStrs,
		IncTokenID: incTokenID,
	}
	issuingEVMReq.MetadataBase = metadataBase
	return issuingEVMReq, nil
}

func NewIssuingEVMRequestFromMap(
	data map[string]interface{},
	metatype int,
) (*IssuingEVMRequest, error) {
	blockHash := HexToHash(data["BlockHash"].(string))
	txIdx := uint(data["TxIndex"].(float64))
	proofsRaw := data["ProofStrs"].([]interface{})
	proofStrs := []string{}
	for _, item := range proofsRaw {
		proofStrs = append(proofStrs, item.(string))
	}

	incTokenID, err := common.Hash{}.NewHashFromStr(data["IncTokenID"].(string))
	if err != nil {
		return nil, errors.New("TokenID incorrect")
	}

	req, _ := NewIssuingEVMRequest(
		blockHash,
		txIdx,
		proofStrs,
		*incTokenID,
		metatype,
	)
	return req, nil
}

func (iReq IssuingEVMRequest) Hash() *common.Hash {
	record := iReq.BlockHash.String()
	// TODO: @hung change to record += fmt.Sprint(iReq.TxIndex)
	record += string(iReq.TxIndex)
	proofStrs := iReq.ProofStrs
	for _, proofStr := range proofStrs {
		record += proofStr
	}
	record += iReq.MetadataBase.Hash().String()
	record += iReq.IncTokenID.String()

	// final hash
	hash := common.HashH([]byte(record))
	return &hash
}

func FromHex(s string) []byte {
	if has0xPrefix(s) {
		s = s[2:]
	}
	if len(s)%2 == 1 {
		s = "0" + s
	}
	return Hex2Bytes(s)
}

func has0xPrefix(str string) bool {
	return len(str) >= 2 && str[0] == '0' && (str[1] == 'x' || str[1] == 'X')
}

func HexToHash(s string) common.Hash { return BytesToHash(FromHex(s)) }

func BytesToHash(b []byte) common.Hash {
	var h common.Hash
	h.SetBytes(b)
	return h
}

func Hex2Bytes(str string) []byte {
	h, _ := hex.DecodeString(str)
	return h
}
