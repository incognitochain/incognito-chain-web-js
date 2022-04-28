package pdexv3

import (
	"incognito-chain/common"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

type WithdrawalStakingRewardRequest struct {
	metadataCommon.MetadataBase
	StakingPoolID string `json:"StakingPoolID"`
	AccessOption
	Receivers map[common.Hash]privacy.OTAReceiver `json:"Receivers"`
}

func NewPdexv3WithdrawalStakingRewardRequest(
	metaType int,
	stakingToken string,
	accessOption AccessOption,
	receivers map[common.Hash]privacy.OTAReceiver,
) (*WithdrawalStakingRewardRequest, error) {
	metadataBase := metadataCommon.NewMetadataBase(metaType)

	return &WithdrawalStakingRewardRequest{
		MetadataBase:  *metadataBase,
		StakingPoolID: stakingToken,
		AccessOption:  accessOption,
		Receivers:     receivers,
	}, nil
}
