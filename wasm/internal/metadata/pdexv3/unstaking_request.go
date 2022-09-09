package pdexv3

import (
	"encoding/json"

	metadataCommon "incognito-chain/metadata/common"
)

type UnstakingRequest struct {
	metadataCommon.MetadataBase
	stakingPoolID string
	otaReceivers  map[string]string
	AccessOption
	unstakingAmount uint64
}

func NewUnstakingRequest() *UnstakingRequest {
	return &UnstakingRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.Pdexv3UnstakingRequestMeta,
		},
	}
}

func NewUnstakingRequestWithValue(
	stakingPoolID string, accessOption AccessOption,
	otaReceivers map[string]string,
	unstakingAmount uint64,
) *UnstakingRequest {
	return &UnstakingRequest{
		MetadataBase: metadataCommon.MetadataBase{
			Type: metadataCommon.Pdexv3UnstakingRequestMeta,
		},
		stakingPoolID:   stakingPoolID,
		AccessOption:    accessOption,
		otaReceivers:    otaReceivers,
		unstakingAmount: unstakingAmount,
	}
}

func (request *UnstakingRequest) MarshalJSON() ([]byte, error) {
	data, err := json.Marshal(struct {
		StakingPoolID string `json:"StakingPoolID"`
		AccessOption
		OtaReceivers    map[string]string `json:"OtaReceivers"`
		UnstakingAmount uint64            `json:"UnstakingAmount"`
		metadataCommon.MetadataBase
	}{
		StakingPoolID:   request.stakingPoolID,
		AccessOption:    request.AccessOption,
		OtaReceivers:    request.otaReceivers,
		UnstakingAmount: request.unstakingAmount,
		MetadataBase:    request.MetadataBase,
	})
	if err != nil {
		return []byte{}, err
	}
	return data, nil
}

func (request *UnstakingRequest) UnmarshalJSON(data []byte) error {
	temp := struct {
		StakingPoolID string `json:"StakingPoolID"`
		AccessOption
		OtaReceivers    map[string]string           `json:"OtaReceivers"`
		UnstakingAmount metadataCommon.Uint64Reader `json:"UnstakingAmount"`
		metadataCommon.MetadataBase
	}{}
	err := json.Unmarshal(data, &temp)
	if err != nil {
		return err
	}
	request.stakingPoolID = temp.StakingPoolID
	request.AccessOption = temp.AccessOption
	request.otaReceivers = temp.OtaReceivers
	request.unstakingAmount = uint64(temp.UnstakingAmount)
	request.MetadataBase = temp.MetadataBase
	return nil
}

func (request *UnstakingRequest) StakingPoolID() string {
	return request.stakingPoolID
}

func (request *UnstakingRequest) OtaReceivers() map[string]string {
	return request.otaReceivers
}

func (request *UnstakingRequest) UnstakingAmount() uint64 {
	return request.unstakingAmount
}
