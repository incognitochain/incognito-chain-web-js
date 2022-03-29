package pdexv3

import (
	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type WithdrawalLPFeeRequest struct {
	metadataCommon.MetadataBase
	PoolPairID string `json:"PoolPairID"`
	AccessOption
	Receivers map[common.Hash]privacy.OTAReceiver `json:"Receivers"`
}

func NewPdexv3WithdrawalLPFeeRequest(
	metaType int,
	pairID string,
	accessOption AccessOption,
	receivers map[common.Hash]privacy.OTAReceiver,
) (*WithdrawalLPFeeRequest, error) {
	metadataBase := metadataCommon.NewMetadataBase(metaType)

	return &WithdrawalLPFeeRequest{
		MetadataBase: *metadataBase,
		PoolPairID:   pairID,
		AccessOption: accessOption,
		Receivers:    receivers,
	}, nil
}
