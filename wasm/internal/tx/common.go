package tx

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"strconv"

	"incognito-chain/common"
	"incognito-chain/common/base58"
	"incognito-chain/key/incognitokey"
	"incognito-chain/key/wallet"
	metadataCommon "incognito-chain/metadata/common"
	"incognito-chain/privacy"
)

const (
	TxNormalType                 = "n"   // normal tx(send and receive coin)
	TxRewardType                 = "s"   // reward tx
	TxReturnStakingType          = "rs"  //
	TxConversionType             = "cv"  // Convert 1 - 2 normal tx
	TxTokenConversionType        = "tcv" // Convert 1 - 2 token tx
	TxCustomTokenPrivacyType     = "tp"  // token  tx with supporting privacy
	MAX_TRIES_OTA            int = 50000
)

func RandBigIntMaxRange(max *big.Int) (*big.Int, error) {
	return rand.Int(rand.Reader, max)
}

type EstimateTxSizeParam struct {
	NumInputCoins            int                     `json:"NumInputs"`
	NumPayments              int                     `json:"NumPayments"`
	Metadata                 metadataCommon.Metadata `json:"Metadata"`
	PrivacyCustomTokenParams *TokenParamsReader      `json:"TokenParams"`
}

func toB64Len(numOfBytes uint64) uint64 {
	l := (numOfBytes*4 + 2) / 3
	l = ((l + 3) / 4) * 4
	return l
}

func EstimateProofSize(numIn, numOut uint64) uint64 {
	coinSizeBound := uint64(257) + (privacy.Ed25519KeySize+1)*7 + privacy.TxRandomGroupSize + 1
	ipProofLRLen := uint64(math.Log2(float64(numOut))) + 1
	aggProofSizeBound := uint64(4) + 1 + privacy.Ed25519KeySize*uint64(7+numOut) + 1 + uint64(2*ipProofLRLen+3)*privacy.Ed25519KeySize
	// add 10 for rounding
	result := uint64(1) + (coinSizeBound+1)*uint64(numIn+numOut) + 2 + aggProofSizeBound + 10
	return toB64Len(result)
}

func EstimateTxSizeAsBytes(estimateTxSizeParam *EstimateTxSizeParam) uint64 {
	jsonKeysSizeBound := uint64(20*10 + 2)
	sizeVersion := uint64(1)      // int8
	sizeType := uint64(5)         // string, max : 5
	sizeLockTime := uint64(8) * 3 // int64
	sizeFee := uint64(8) * 3      // uint64
	sizeInfo := toB64Len(uint64(512))

	numIn := uint64(estimateTxSizeParam.NumInputCoins)
	numOut := uint64(estimateTxSizeParam.NumPayments)

	sizeSigPubKey := uint64(numIn)*privacy.RingSize*9 + 2
	sizeSigPubKey = toB64Len(sizeSigPubKey)
	sizeSig := uint64(1) + numIn + (numIn+2)*privacy.RingSize
	sizeSig = sizeSig*33 + 3

	sizeProof := EstimateProofSize(numIn, numOut)

	sizePubKeyLastByte := uint64(1) * 3
	sizeMetadata := uint64(0)
	if estimateTxSizeParam.Metadata != nil {
		sizeMetadata += metadataCommon.CalculateSize(estimateTxSizeParam.Metadata)
	}

	sizeTx := jsonKeysSizeBound + sizeVersion + sizeType + sizeLockTime + sizeFee + sizeInfo + sizeSigPubKey + sizeSig + sizeProof + sizePubKeyLastByte + sizeMetadata
	if estimateTxSizeParam.PrivacyCustomTokenParams != nil {
		tokenKeysSizeBound := uint64(20*8 + 2)
		tokenSize := toB64Len(uint64(len(estimateTxSizeParam.PrivacyCustomTokenParams.TokenID)))
		tokenSize += uint64(len(estimateTxSizeParam.PrivacyCustomTokenParams.TokenSymbol))
		tokenSize += uint64(len(estimateTxSizeParam.PrivacyCustomTokenParams.TokenName))
		tokenSize += 2
		numIn = uint64(len(estimateTxSizeParam.PrivacyCustomTokenParams.TokenInput))
		numOut = uint64(len(estimateTxSizeParam.PrivacyCustomTokenParams.TokenPaymentInfo))

		// shadow variable names
		sizeSigPubKey := uint64(numIn)*privacy.RingSize*9 + 2
		sizeSigPubKey = toB64Len(sizeSigPubKey)
		sizeSig := uint64(1) + numIn + (numIn+2)*privacy.RingSize
		sizeSig = sizeSig*33 + 3

		sizeProof := EstimateProofSize(numIn, numOut)
		tokenSize += tokenKeysSizeBound + sizeSigPubKey + sizeSig + sizeProof
		sizeTx += tokenSize
	}
	return sizeTx
}

type PaymentReader struct {
	PaymentAddress json.RawMessage `json:"PaymentAddress"`
	Amount         string          `json:"Amount"`
	Message        []byte          `json:"Message"`
}

func (pp PaymentReader) To() (*privacy.PaymentInfo, error) {
	result := &privacy.PaymentInfo{}
	var tempString string
	err := json.Unmarshal(pp.PaymentAddress, &tempString)
	if err != nil {
		return nil, err
	}

	kw, err := wallet.Base58CheckDeserialize(tempString)
	if err == nil {
		result.PaymentAddress = &kw.KeySet.PaymentAddress
	} else {
		// parse as one-time receiver instead
		var r privacy.OTAReceiver
		err := r.FromString(tempString)
		if err == nil {
			result.OTAReceiver = &r
		} else {
			return nil, err
		}
	}
	
	num, err := strconv.ParseUint(pp.Amount, 10, 64)
	if err != nil {
		return nil, err
	}
	result.Amount = num
	result.Message = pp.Message
	return result, nil
}
func (pp *PaymentReader) From(pInf *privacy.PaymentInfo) {
	kw := &wallet.KeyWallet{}
	kw.KeySet = incognitokey.KeySet{}
	kw.KeySet.PaymentAddress = *pInf.PaymentAddress
	paStr := kw.Base58CheckSerialize(wallet.PaymentAddressType)
	result := PaymentReader{}
	result.PaymentAddress, _ = json.Marshal(paStr)
	result.Amount = strconv.FormatUint(pInf.Amount, 10)
	result.Message = pInf.Message
	*pp = result
}

type printedUintStr uint64

func (u printedUintStr) MarshalJSON() ([]byte, error) {
	return json.Marshal(strconv.FormatUint(uint64(u), 10))
}
func (u *printedUintStr) UnmarshalJSON(raw []byte) error {
	var tempString string
	json.Unmarshal(raw, &tempString)
	temp, err := strconv.ParseUint(tempString, 10, 64)
	*u = printedUintStr(temp)
	return err
}

type CoinData struct {
	Version    printedUintStr `json:"Version"`
	Info       encodedBytes   `json:"Info"`
	Index      encodedBytes   `json:"Index"`
	PublicKey  encodedBytes   `json:"PublicKey"`
	Commitment encodedBytes   `json:"Commitment"`
	KeyImage   encodedBytes   `json:"KeyImage"`

	SharedRandom        encodedBytes   `json:"SharedRandom"`
	SharedConcealRandom encodedBytes   `json:"SharedConcealRandom"`
	TxRandom            encodedBytes   `json:"TxRandom"`
	Mask                encodedBytes   `json:"Randomness"`
	Value               printedUintStr `json:"Value"`
	Amount              encodedBytes   `json:"CoinDetailsEncrypted"`

	// for v1
	SNDerivator encodedBytes `json:"SNDerivator"`
	AssetTag    encodedBytes `json:"AssetTag"`
	TokenID     *common.Hash `json:"TokenID,omitempty"`
}

func (c CoinData) ToCoin() (*privacy.CoinV2, uint64, error) {
	var err error
	var p *privacy.Point
	result := &privacy.CoinV2{}
	result.SetVersion(uint8(c.Version))
	result.SetInfo(c.Info)
	if c.PublicKey.IsBlank() {
		result.SetPublicKey(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.PublicKey)
		if err != nil {
			return nil, 0, err
		}
		result.SetPublicKey(p)
	}

	if c.Commitment.IsBlank() {
		result.SetCommitment(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.Commitment)
		if err != nil {
			return nil, 0, err
		}
		result.SetCommitment(p)
	}

	if c.KeyImage.IsBlank() {
		result.SetKeyImage(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.KeyImage)
		if err != nil {
			return nil, 0, err
		}
		result.SetKeyImage(p)
	}
	if c.SharedRandom.IsBlank() {
		result.SetSharedRandom(nil)
	} else {
		result.SetSharedRandom((&privacy.Scalar{}).FromBytesS(c.SharedRandom))
	}
	if c.SharedConcealRandom.IsBlank() {
		result.SetSharedConcealRandom(nil)
	} else {
		result.SetSharedConcealRandom((&privacy.Scalar{}).FromBytesS(c.SharedConcealRandom))
	}

	if c.Amount.IsBlank() {
		temp := (&privacy.Scalar{}).FromUint64(uint64(c.Value))
		result.SetAmount(temp)
	} else {
		result.SetAmount((&privacy.Scalar{}).FromBytesS(c.Amount))
	}

	if c.TxRandom.IsBlank() {
		result.SetTxRandom(nil)
	} else {
		txr := (&privacy.TxRandom{})
		err = txr.SetBytes(c.TxRandom)
		if err != nil {
			return nil, 0, err
		}
		result.SetTxRandom(txr)
	}

	if c.Mask.IsBlank() {
		result.SetRandomness(nil)
	} else {
		result.SetRandomness((&privacy.Scalar{}).FromBytesS(c.Mask))
	}

	if c.AssetTag.IsBlank() {
		result.SetAssetTag(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.AssetTag)
		if err != nil {
			return nil, 0, err
		}
		result.SetAssetTag(p)
	}
	ind := big.NewInt(0).SetBytes(c.Index)
	return result, ind.Uint64(), nil
}
func GetCoinData(coin privacy.PlainCoin) CoinData {
	var amount []byte = ScalarToBytes(nil)
	var txr []byte = ScalarToBytes(nil)
	cv2, ok := coin.(*privacy.CoinV2)
	if ok {
		amount = ScalarToBytes(cv2.GetAmount())
		txr = coin.GetTxRandom().Bytes()
	}

	return CoinData{
		Version:             printedUintStr(coin.GetVersion()),
		Info:                coin.GetInfo(),
		PublicKey:           PointToBytes(coin.GetPublicKey()),
		Commitment:          PointToBytes(coin.GetCommitment()),
		KeyImage:            PointToBytes(coin.GetKeyImage()),
		SharedRandom:        ScalarToBytes(coin.GetSharedRandom()),
		SharedConcealRandom: ScalarToBytes(coin.GetSharedConcealRandom()),
		TxRandom:            txr,
		Mask:                ScalarToBytes(coin.GetRandomness()),
		Value:               printedUintStr(coin.GetValue()),
		Amount:              amount,
		AssetTag:            PointToBytes(coin.GetAssetTag()),

		SNDerivator: ScalarToBytes(coin.GetSNDerivator()),
	}
}

func (c CoinData) ToCoinV1() (*privacy.CoinV1, uint64, error) {
	var err error
	var p *privacy.Point
	result := &privacy.CoinV1{}
	result.Init()
	result.CoinDetails.SetInfo(c.Info)
	if c.PublicKey.IsBlank() {
		result.CoinDetails.SetPublicKey(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.PublicKey)
		if err != nil {
			return nil, 0, err
		}
		result.CoinDetails.SetPublicKey(p)
	}

	if c.Commitment.IsBlank() {
		result.CoinDetails.SetCommitment(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.Commitment)
		if err != nil {
			return nil, 0, err
		}
		result.CoinDetails.SetCommitment(p)
	}

	if c.KeyImage.IsBlank() {
		result.CoinDetails.SetKeyImage(nil)
	} else {
		p, err = (&privacy.Point{}).FromBytesS(c.KeyImage)
		if err != nil {
			return nil, 0, err
		}
		result.CoinDetails.SetKeyImage(p)
	}

	result.CoinDetails.SetValue(uint64(c.Value))
	if c.Mask.IsBlank() {
		result.CoinDetails.SetRandomness(nil)
	} else {
		result.CoinDetails.SetRandomness((&privacy.Scalar{}).FromBytesS(c.Mask))
	}

	if c.SNDerivator.IsBlank() {
		result.CoinDetails.SetSNDerivator(nil)
	} else {
		result.CoinDetails.SetSNDerivator((&privacy.Scalar{}).FromBytesS(c.SNDerivator))
	}
	result.CoinDetailsEncrypted.SetBytes([]byte(c.Amount))

	ind := big.NewInt(0).SetBytes(c.Index)
	return result, ind.Uint64(), nil
}

func GetTokenID(c *privacy.CoinV2, keySet *incognitokey.KeySet, rawAssetTags map[string]*common.Hash) *common.Hash {
	t := c.GetAssetTag()
	prv := common.PRVCoinID
	ca := common.ConfidentialAssetID
	if t == nil {
		return &prv
	}
	if asset, exists := rawAssetTags[t.String()]; exists {
		return asset
	}

	// must take valid coin & keySet
	_, txOTARandomPoint, _, _ :=  c.GetTxRandomDetail()
	sharedSecret := new(privacy.Point).ScalarMult(txOTARandomPoint, keySet.OTAKey.GetOTASecretKey())
	blinder := privacy.HashToScalar(append(sharedSecret.ToBytesS(), []byte("assettag")...))
	rawAssetTag := new(privacy.Point).Sub(t, new(privacy.Point).ScalarMult(privacy.PedCom.G[privacy.PedersenRandomnessIndex], blinder))

	if asset, exists := rawAssetTags[rawAssetTag.String()]; exists {
		return asset
	}
	return &ca
}

func ScalarToBytes(sc *privacy.Scalar) []byte {
	if sc == nil {
		return []byte{}
	}
	return sc.ToBytesS()
}
func PointToBytes(sc *privacy.Point) []byte {
	if sc == nil {
		return []byte{}
	}
	return sc.ToBytesS()
}

var Base58Encoding = base58.Base58Check{}
var Base64Encoding = base64.StdEncoding

type encodedBytes []byte

func (b encodedBytes) MarshalJSON() ([]byte, error) {
	var res string
	// empty slice -> empty string
	if len([]byte(b)) == 0 {
		res = ""
	} else {
		// always encode to base64
		res = Base64Encoding.EncodeToString(b)
	}
	return json.Marshal(res)
}
func (b *encodedBytes) UnmarshalJSON(src []byte) error {
	var tempString string
	json.Unmarshal(src, &tempString)
	if len(tempString) == 0 {
		*b = encodedBytes([]byte{})
		return nil
	}
	if common.AllowBase58EncodedCoins {
		// AllowBase58EncodedCoins: accept base58 OR base64
		res, _, err := Base58Encoding.Decode(tempString)
		if err == nil {
			*b = res
			return nil
		}
	}

	res, err := Base64Encoding.DecodeString(tempString)
	*b = res
	return err
}

func (b encodedBytes) IsBlank() bool {
	return len([]byte(b)) == 0
}

func TokenIDFromString(s string) (common.Hash, error) {
	if len(s) == 0 {
		return common.PRVCoinID, nil
	} else {
		res, err := common.Hash{}.NewHashFromStr(s)
		if err != nil {
			return common.Hash{}, fmt.Errorf("invalid string %s for tokenID - %v", s, err)
		}
		return *res, nil
	}
}
