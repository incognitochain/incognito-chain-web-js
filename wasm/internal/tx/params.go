package tx

import (
	"encoding/json"
	"fmt"

	"incognito-chain/common"
	"incognito-chain/metadata"
	"incognito-chain/privacy"
)

type RingData struct {
	PublicKeys  []encodedBytes `json:"PublicKeys"`
	Commitments []encodedBytes `json:"Commitments"`
	AssetTags   []encodedBytes `json:"AssetTags,omitempty"`
	Indexes     []uint64       `json:"Indexes"`
}

func MakeRingData() *RingData {
	return &RingData{
		PublicKeys:  nil,
		Commitments: nil,
		AssetTags:   nil,
		Indexes:     nil,
	}
}

type ExtendedParams struct {
	SenderSK    privacy.PrivateKey     `json:"SenderSK"`
	PaymentInfo []PaymentReader        `json:"PaymentInfo"`
	InputCoins  []CoinData             `json:"InputCoins"`
	Fee         uint64                 `json:"Fee"`
	HasPrivacy  bool                   `json:"HasPrivacy,omitempty"`
	TokenID     string                 `json:"TokenID,omitempty"`
	Metadata    json.RawMessage        `json:"Metadata,omitempty"`
	Info        []byte                 `json:"Info,omitempty"`
	Kvargs      map[string]interface{} `json:"Kvargs,omitempty"`

	Cache       RingData           `json:"CoinCache"`
	TokenParams *TokenParamsReader `json:"TokenParams,omitempty"`
}

func (params *ExtendedParams) GetInputCoins() ([]privacy.PlainCoin, []uint64, error) {
	var resultCoins []privacy.PlainCoin
	var resultIndexes []uint64
	if len(params.InputCoins) == 0 {
		return []privacy.PlainCoin{}, []uint64{}, nil
	}
	ver := params.InputCoins[0].Version
	for _, ci := range params.InputCoins {
		var c privacy.PlainCoin
		var ind uint64
		var err error
		if ver == 2 {
			c, ind, err = ci.ToCoin()
			if err != nil {
				return nil, nil, fmt.Errorf("cannot parse coin %v - %v", ci, err)
			}
		} else {
			var temp *privacy.CoinV1
			temp, ind, err = ci.ToCoinV1()
			if err != nil {
				return nil, nil, fmt.Errorf("cannot parse coin %v - %v", ci, err)
			}
			c = temp.CoinDetails
		}
		resultCoins = append(resultCoins, c)
		resultIndexes = append(resultIndexes, ind)
	}
	return resultCoins, resultIndexes, nil
}

func (params *ExtendedParams) GetGenericParams() (*TxParams, error) {
	var pInfos []*privacy.PaymentInfo
	for _, payInf := range params.PaymentInfo {
		temp, _ := payInf.To()
		pInfos = append(pInfos, temp)
	}
	tid, err := TokenIDFromString(params.TokenID)
	if err != nil {
		return nil, err
	}

	md, err := metadata.ParseMetadata(params.Metadata)
	if err != nil {
		return nil, fmt.Errorf("cannot parse metadata %s - %v", string(params.Metadata), err)
	}
	var info []byte = []byte("")
	if len(params.Info) > 0 {
		info = params.Info
	}
	ics, _, err := params.GetInputCoins()
	if err != nil {
		return nil, err
	}
	return NewTxParams(&params.SenderSK, pInfos, ics, params.Fee, params.HasPrivacy, &tid, md, info), nil
}

type TokenParamsReader struct {
	TokenID          string          `json:"TokenID"`
	TokenPaymentInfo []PaymentReader `json:"PaymentInfo"`
	TokenInput       []CoinData      `json:"InputCoins"`
	TokenCache       RingData        `json:"CoinCache"`
	Type             int             `json:"TokenTxType"`
	TokenName        string          `json:"TokenName"`
	TokenSymbol      string          `json:"TokenSymbol"`
	Mintable         bool            `json:"TokenMintable"`
}

func (params *TokenParamsReader) GetInputCoins() ([]privacy.PlainCoin, []uint64, error) {
	var resultCoins []privacy.PlainCoin
	var resultIndexes []uint64
	if len(params.TokenInput) == 0 {
		return []privacy.PlainCoin{}, []uint64{}, nil
	}
	ver := params.TokenInput[0].Version
	for _, ci := range params.TokenInput {
		var c privacy.PlainCoin
		var ind uint64
		var err error
		if ver == 2 {
			c, ind, err = ci.ToCoin()
			if err != nil {
				return nil, nil, fmt.Errorf("cannot parse coin %v - %v", ci, err)
			}
		} else {
			var temp *privacy.CoinV1
			temp, ind, err = ci.ToCoinV1()
			if err != nil {
				return nil, nil, fmt.Errorf("cannot parse coin %v - %v", ci, err)
			}
			c = temp.CoinDetails
		}
		resultCoins = append(resultCoins, c)
		resultIndexes = append(resultIndexes, ind)
	}
	return resultCoins, resultIndexes, nil
}

func (params *TokenParamsReader) GetTokenParams() (*TokenParams, error) {
	var tpInfos []*privacy.PaymentInfo
	for _, payInf := range params.TokenPaymentInfo {
		temp, _ := payInf.To()
		tpInfos = append(tpInfos, temp)
	}

	tis, _, err := params.GetInputCoins()
	if err != nil {
		return nil, err
	}
	return &TokenParams{PropertyID: params.TokenID, PropertyName: "", PropertySymbol: "",
			Amount: 0, TokenTxType: params.Type, Receiver: tpInfos,
			TokenInput: tis, Mintable: false, Fee: 0},
		nil
}

func (params *ExtendedParams) GetTxTokenParams() (*TxTokenParams, error) {
	if params.TokenParams == nil {
		return nil, nil
	}
	var pInfos []*privacy.PaymentInfo
	for _, payInf := range params.PaymentInfo {
		temp, _ := payInf.To()
		pInfos = append(pInfos, temp)
	}
	tp, err := params.TokenParams.GetTokenParams()
	if err != nil {
		return nil, err
	}
	ics, _, err := params.GetInputCoins()
	if err != nil {
		return nil, err
	}
	var info []byte = []byte("")
	if len(params.Info) > 0 {
		info = params.Info
	}
	md, err := metadata.ParseMetadata(params.Metadata)
	if err != nil {
		return nil, fmt.Errorf("error parsing metadata: %s - %v", string(params.Metadata), err)
	}
	shardID := byte(0)
	if len(ics) > 0 {
		otaPub := ics[0].GetPublicKey().ToBytesS()
		shardID = common.GetShardIDFromLastByte(otaPub[len(otaPub)-1])
	}

	return &TxTokenParams{SenderKey: &params.SenderSK, PaymentInfo: pInfos,
			InputCoin: ics, FeeNativeCoin: params.Fee,
			HasPrivacyCoin: params.HasPrivacy, HasPrivacyToken: params.HasPrivacy,
			shardID: shardID, Metadata: md, Info: info, TokenParams: tp},
		nil
}

func (params *ExtendedParams) UseHwSigner(i int) (bool, []byte, int, error) {
	if params.Kvargs == nil {
		return false, nil, -1, nil
	}
	raw, err := json.Marshal(params.Kvargs)
	var holder struct {
		Cseed [][]byte `json:"cseed"`
		Pi []uint `json:"pi"`
	}
	err = json.Unmarshal(raw, &holder)
	if err != nil {
		return false, nil, -1, nil
	}
	if len(holder.Cseed) != len(holder.Pi) || i >= len(holder.Cseed) {
		return false, nil, -1, fmt.Errorf("invalid params for using hardware device")
	}

	return true, holder.Cseed[i], int(holder.Pi[i]), nil
}

// ----- structs from chain code -----
type TxParams struct {
	SenderSK    *privacy.PrivateKey
	PaymentInfo []*privacy.PaymentInfo
	InputCoins  []privacy.PlainCoin
	Fee         uint64
	HasPrivacy  bool
	TokenID     *common.Hash
	Metadata    metadata.Metadata
	Info        []byte
	Kvargs      map[string]interface{}
}

func NewTxParams(sk *privacy.PrivateKey, pInfos []*privacy.PaymentInfo, inputs []privacy.PlainCoin, fee uint64, isPriv bool, tokenID *common.Hash, md metadata.Metadata, info []byte) *TxParams {
	if info == nil {
		info = []byte("")
	}
	return &TxParams{
		SenderSK:    sk,
		PaymentInfo: pInfos,
		InputCoins:  inputs,
		Fee:         fee,
		HasPrivacy:  isPriv,
		TokenID:     tokenID,
		Metadata:    md,
		Info:        info,
	}
}

type TxTokenParams struct {
	SenderKey       *privacy.PrivateKey
	PaymentInfo     []*privacy.PaymentInfo
	InputCoin       []privacy.PlainCoin
	FeeNativeCoin   uint64
	TokenParams     *TokenParams
	HasPrivacyCoin  bool
	HasPrivacyToken bool
	shardID         byte
	Metadata        metadata.Metadata
	Info            []byte
}

type TokenParams struct {
	PropertyID     string                 `json:"TokenID"`
	PropertyName   string                 `json:"TokenName"`
	PropertySymbol string                 `json:"TokenSymbol"`
	Amount         uint64                 `json:"TokenAmount"`
	TokenTxType    int                    `json:"TokenTxType"`
	Receiver       []*privacy.PaymentInfo `json:"TokenReceiver"`
	TokenInput     []privacy.PlainCoin    `json:"TokenInput"`
	Mintable       bool                   `json:"TokenMintable"`
	Fee            uint64                 `json:"TokenFee"`
}
