package common

import (
	"encoding/json"
	"strconv"

	"incognito-chain/common"
)

func CalculateSize(meta Metadata) uint64 {
	metaBytes, err := json.Marshal(meta)
	if err != nil {
		return 0
	}
	return uint64(len(metaBytes))
}

//genTokenID generates a (deterministically) random tokenID for the request transaction.
//From now on, users cannot generate their own tokenID.
//The generated tokenID is calculated as the hash of the following components:
//	- The Tx hash
//	- The shardID at which the request is sent
func GenTokenIDFromRequest(txHash string, shardID byte) *common.Hash {
	record := txHash + strconv.FormatUint(uint64(shardID), 10)

	tokenID := common.HashH([]byte(record))
	return &tokenID
}

type OTADeclaration struct {
	PublicKey [32]byte
	TokenID   common.Hash
}

type Uint64Reader uint64

func (u Uint64Reader) MarshalJSON() ([]byte, error) {
	return json.Marshal(u)
}
func (u *Uint64Reader) UnmarshalJSON(raw []byte) error {
	var theNum uint64
	err := json.Unmarshal(raw, &theNum)
	if err != nil {
		var theStr string
		json.Unmarshal(raw, &theStr)
		temp, err := strconv.ParseUint(theStr, 10, 64)
		*u = Uint64Reader(temp)
		return err
	}
	*u = Uint64Reader(theNum)
	return err
}
