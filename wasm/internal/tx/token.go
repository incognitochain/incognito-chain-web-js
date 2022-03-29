package tx

import (
	"encoding/json"
	"fmt"
	"math/big"

	"incognito-chain/common"
	"incognito-chain/privacy"
	"incognito-chain/privacy/privacy_v2/mlsag"
)

const (
	CustomTokenInit = iota
	CustomTokenTransfer
	CustomTokenCrossShard
)

type TxTokenData struct {
	PropertyID     common.Hash
	PropertyName   string
	PropertySymbol string
	SigPubKey      []byte `json:"SigPubKey,omitempty"`
	Sig            []byte `json:"Sig,omitempty"`
	Proof          privacy.Proof

	Type     int
	Mintable bool
}

func (td TxTokenData) Hash() (*common.Hash, error) {
	// leave out signature & its public key when hashing tx
	td.Sig = []byte{}
	td.SigPubKey = []byte{}
	inBytes, err := json.Marshal(td)

	if err != nil {
		return nil, err
	}
	// after this returns, tx is restored since the receiver is not a pointer
	hash := common.HashH(inBytes)
	return &hash, nil
}

func makeTxToken(txPRV *Tx, pubkey, sig []byte, proof privacy.Proof) *Tx {
	result := &Tx{
		Version:              txPRV.Version,
		Type:                 txPRV.Type,
		LockTime:             txPRV.LockTime,
		Fee:                  0,
		pubKeyLastByteSender: common.GetShardIDFromLastByte(txPRV.pubKeyLastByteSender),
		Metadata:             nil,
	}
	var clonedInfo []byte = nil
	if txPRV.Info != nil {
		clonedInfo = make([]byte, len(txPRV.Info))
		copy(clonedInfo, txPRV.Info)
	}

	var clonedSig []byte = nil
	if sig != nil {
		clonedSig = make([]byte, len(sig))
		copy(clonedSig, sig)
	}
	var clonedPk []byte = nil
	if pubkey != nil {
		clonedPk = make([]byte, len(pubkey))
		copy(clonedPk, pubkey)
	}
	result.Info = clonedInfo
	result.Proof = proof
	result.Sig = clonedSig
	result.SigPubKey = clonedPk
	result.Info = clonedInfo

	return result
}

type TxToken struct {
	Tx             Tx          `json:"Tx"`
	TokenData      TxTokenData `json:"TxTokenPrivacyData"`
	cachedTxNormal *Tx
}

func (tx *TxToken) Hash() *common.Hash {
	firstHash := tx.Tx.Hash()
	secondHash, err := tx.TokenData.Hash()
	if err != nil {
		return nil
	}
	result := common.HashH(append(firstHash[:], secondHash[:]...))
	return &result
}

func (tx *TxToken) GetTxNormal() *Tx {
	if tx.cachedTxNormal != nil {
		return tx.cachedTxNormal
	}
	result := makeTxToken(&tx.Tx, tx.TokenData.SigPubKey, tx.TokenData.Sig, tx.TokenData.Proof)
	// tx.cachedTxNormal = result
	return result
}
func (tx *TxToken) SetTxNormal(inTx *Tx) error {
	tx.TokenData.SigPubKey = inTx.SigPubKey
	tx.TokenData.Sig = inTx.Sig
	tx.TokenData.Proof = inTx.Proof
	tx.cachedTxNormal = inTx
	return nil
}

func createPrivKeyMlsagCA(inputCoins []privacy.PlainCoin, outputCoins []*privacy.CoinV2, outputSharedSecrets []*privacy.Point, params *TxParams, shardID byte, commitmentsToZero []*privacy.Point) ([]*privacy.Scalar, error) {
	senderSK := params.SenderSK
	tokenID := params.TokenID
	if tokenID == nil {
		temp := common.PRVCoinID
		tokenID = &temp
	}
	rehashed := privacy.HashToPoint(tokenID[:])
	sumRand := new(privacy.Scalar).FromUint64(0)

	privKeyMlsag := make([]*privacy.Scalar, len(inputCoins)+2)
	sumInputAssetTagBlinders := new(privacy.Scalar).FromUint64(0)
	numOfInputs := new(privacy.Scalar).FromUint64(uint64(len(inputCoins)))
	numOfOutputs := new(privacy.Scalar).FromUint64(uint64(len(outputCoins)))
	mySkBytes := (*senderSK)[:]
	for i := 0; i < len(inputCoins); i += 1 {
		var err error
		privKeyMlsag[i], err = inputCoins[i].ParsePrivateKeyOfCoin(*senderSK)
		if err != nil {
			return nil, err
		}

		inputCoin_specific, ok := inputCoins[i].(*privacy.CoinV2)
		if !ok || inputCoin_specific.GetAssetTag() == nil {
			return nil, fmt.Errorf("Cannot cast a coin as v2-CA")
		}

		isUnblinded := privacy.IsPointEqual(rehashed, inputCoin_specific.GetAssetTag())
		if isUnblinded {
		}

		sharedSecret := new(privacy.Point).Identity()
		bl := new(privacy.Scalar).FromUint64(0)
		if !isUnblinded {
			sharedSecret, err = inputCoin_specific.RecomputeSharedSecret(mySkBytes)
			if err != nil {
				return nil, err
			}
			// _, _, indexForShard, err := inputCoin_specific.GetTxRandomDetail()
			// if err != nil {
			// 	return nil, err
			// }
			bl, err = privacy.ComputeAssetTagBlinder(sharedSecret)
			if err != nil {
				return nil, err
			}
		}

		v := inputCoin_specific.GetAmount()
		effectiveRCom := new(privacy.Scalar).Mul(bl, v)
		effectiveRCom.Add(effectiveRCom, inputCoin_specific.GetRandomness())

		sumInputAssetTagBlinders.Add(sumInputAssetTagBlinders, bl)
		sumRand.Add(sumRand, effectiveRCom)
	}
	sumInputAssetTagBlinders.Mul(sumInputAssetTagBlinders, numOfOutputs)

	sumOutputAssetTagBlinders := new(privacy.Scalar).FromUint64(0)
	for i, oc := range outputCoins {
		if oc.GetAssetTag() == nil {
			return nil, fmt.Errorf("Cannot cast a coin as v2-CA")
		}
		// lengths between 0 and len(outputCoins) were rejected before
		bl := new(privacy.Scalar).FromUint64(0)
		isUnblinded := privacy.IsPointEqual(rehashed, oc.GetAssetTag())
		if isUnblinded {
		} else {
			var err error
			bl, err = privacy.ComputeAssetTagBlinder(outputSharedSecrets[i])
			if err != nil {
				return nil, err
			}
		}
		v := oc.GetAmount()
		effectiveRCom := new(privacy.Scalar).Mul(bl, v)
		effectiveRCom.Add(effectiveRCom, oc.GetRandomness())
		sumOutputAssetTagBlinders.Add(sumOutputAssetTagBlinders, bl)
		sumRand.Sub(sumRand, effectiveRCom)
	}
	sumOutputAssetTagBlinders.Mul(sumOutputAssetTagBlinders, numOfInputs)

	// 2 final elements in `private keys` for MLSAG
	assetSum := new(privacy.Scalar).Sub(sumInputAssetTagBlinders, sumOutputAssetTagBlinders)
	firstCommitmentToZeroRecomputed := new(privacy.Point).ScalarMult(privacy.PedCom.G[privacy.PedersenRandomnessIndex], assetSum)
	secondCommitmentToZeroRecomputed := new(privacy.Point).ScalarMult(privacy.PedCom.G[privacy.PedersenRandomnessIndex], sumRand)
	if len(commitmentsToZero) != 2 {
		return nil, fmt.Errorf("Error : need exactly 2 points for MLSAG double-checking")
	}
	match1 := privacy.IsPointEqual(firstCommitmentToZeroRecomputed, commitmentsToZero[0])
	match2 := privacy.IsPointEqual(secondCommitmentToZeroRecomputed, commitmentsToZero[1])
	if !match1 || !match2 {
		return nil, fmt.Errorf("Error : asset tag sum or commitment sum mismatch, %v, %v", match1, match2)
	}
	privKeyMlsag[len(inputCoins)] = assetSum
	privKeyMlsag[len(inputCoins)+1] = sumRand
	return privKeyMlsag, nil
}

func generateMlsagRingCA(inputCoins []privacy.PlainCoin, inputIndexes []uint64, outputCoins []*privacy.CoinV2, params *TokenParamsReader, pi int, shardID byte, ringSize int) (*mlsag.Ring, [][]*big.Int, []*privacy.Point, error) {
	coinCache := params.TokenCache
	mutualLen := len(coinCache.PublicKeys)
	if len(coinCache.Commitments) != mutualLen || len(coinCache.AssetTags) != mutualLen {
		return nil, nil, nil, fmt.Errorf("Length mismatch in coin cache")
	}
	if mutualLen < len(inputCoins)*(ringSize-1) {
		return nil, nil, nil, fmt.Errorf("Not enough coins to create ring, expect %d", len(inputCoins)*(ringSize-1))
	}
	outputCoinsAsGeneric := make([]privacy.Coin, len(outputCoins))
	for i := 0; i < len(outputCoins); i++ {
		outputCoinsAsGeneric[i] = outputCoins[i]
	}
	sumOutputsWithFee := calculateSumOutputsWithFee(outputCoinsAsGeneric, 0)
	inCount := new(privacy.Scalar).FromUint64(uint64(len(inputCoins)))
	outCount := new(privacy.Scalar).FromUint64(uint64(len(outputCoins)))
	sumOutputAssetTags := new(privacy.Point).Identity()
	for _, oc := range outputCoins {
		sumOutputAssetTags.Add(sumOutputAssetTags, oc.GetAssetTag())
	}
	sumOutputAssetTags.ScalarMult(sumOutputAssetTags, inCount)

	indexes := make([][]*big.Int, ringSize)
	ring := make([][]*privacy.Point, ringSize)
	var lastTwoColumnsCommitmentToZero []*privacy.Point
	var currentRingCoinIndex int = 0
	for i := 0; i < ringSize; i += 1 {
		sumInputs := new(privacy.Point).Identity()
		sumInputs.Sub(sumInputs, sumOutputsWithFee)
		sumInputAssetTags := new(privacy.Point).Identity()

		row := make([]*privacy.Point, len(inputCoins))
		rowIndexes := make([]*big.Int, len(inputCoins))
		if i == pi {
			for j := 0; j < len(inputCoins); j += 1 {
				row[j] = inputCoins[j].GetPublicKey()

				rowIndexes[j] = big.NewInt(0).SetUint64(inputIndexes[j])
				sumInputs.Add(sumInputs, inputCoins[j].GetCommitment())
				inputCoin_specific, ok := inputCoins[j].(*privacy.CoinV2)
				if !ok {
					return nil, nil, nil, fmt.Errorf("Cannot cast a coin as v2")
				}
				sumInputAssetTags.Add(sumInputAssetTags, inputCoin_specific.GetAssetTag())
			}
		} else {
			for j := 0; j < len(inputCoins); j += 1 {
				// grab the next coin from the list of decoys to add to ring
				pkBytes := coinCache.PublicKeys[currentRingCoinIndex]
				rowIndexes[j] = big.NewInt(0).SetUint64(coinCache.Indexes[currentRingCoinIndex])
				commitmentBytes := coinCache.Commitments[currentRingCoinIndex]
				assetTagBytes := coinCache.AssetTags[currentRingCoinIndex]
				currentRingCoinIndex++

				row[j], _ = new(privacy.Point).FromBytesS(pkBytes)
				commitment, _ := new(privacy.Point).FromBytesS(commitmentBytes)
				assetTag, _ := new(privacy.Point).FromBytesS(assetTagBytes)

				sumInputs.Add(sumInputs, commitment)
				sumInputAssetTags.Add(sumInputAssetTags, assetTag)
			}
		}
		sumInputAssetTags.ScalarMult(sumInputAssetTags, outCount)

		assetSum := new(privacy.Point).Sub(sumInputAssetTags, sumOutputAssetTags)
		row = append(row, assetSum)
		row = append(row, sumInputs)
		if i == pi {
			lastTwoColumnsCommitmentToZero = []*privacy.Point{assetSum, sumInputs}
		}

		ring[i] = row
		indexes[i] = rowIndexes
	}
	return mlsag.NewRing(ring), indexes, lastTwoColumnsCommitmentToZero, nil
}

func (tx *Tx) proveCA(params_compat *TxParams, params_token *TokenParamsReader) (bool, *privacy.SenderSeal, error) {
	var err error
	var outputCoins []*privacy.CoinV2
	var sharedSecrets []*privacy.Point
	var numOfCoinsBurned uint = 0
	var isBurning bool = false
	var tid common.Hash = *params_compat.TokenID
	var senderSealToExport *privacy.SenderSeal = nil
	for _, inf := range params_compat.PaymentInfo {
		c, sharedSecret, seal, err := privacy.NewCoinCA(inf, &tid)
		if err != nil {
			return false, nil, err
		}
		if senderSealToExport == nil {
			senderSealToExport = seal
		}
		if sharedSecret == nil {
			isBurning = true
			numOfCoinsBurned += 1
		}
		sharedSecrets = append(sharedSecrets, sharedSecret)
		outputCoins = append(outputCoins, c)
	}
	inputCoins, inputIndexes, err := params_token.GetInputCoins()
	if err != nil {
		return false, nil, err
	}
	tx.Proof, err = privacy.ProveV2(inputCoins, outputCoins, sharedSecrets, true, params_compat.PaymentInfo)
	if err != nil {
		return false, nil, err
	}
	if numOfCoinsBurned > 1 {
		return false, nil, fmt.Errorf("output must not have more than 1 burned coin")
	}

	err = tx.signCA(inputCoins, inputIndexes, outputCoins, sharedSecrets, params_compat, params_token, tx.Hash()[:])
	return isBurning, senderSealToExport, err
}

func (tx *Tx) signCA(inp []privacy.PlainCoin, inputIndexes []uint64, out []*privacy.CoinV2, outputSharedSecrets []*privacy.Point, params_compat *TxParams, params_token *TokenParamsReader, hashedMessage []byte) error {
	if tx.Sig != nil {
		return fmt.Errorf("input transaction must be an unsigned one")
	}
	ringSize := privacy.RingSize
	if len(params_token.TokenCache.PublicKeys) == 0 {
		// when no decoys are provided, sign with ring size 1
		ringSize = 1
	}

	// Generate Ring
	piBig, piErr := RandBigIntMaxRange(big.NewInt(int64(ringSize)))
	if piErr != nil {
		return piErr
	}
	var pi int = int(piBig.Int64())
	shardID := common.GetShardIDFromLastByte(tx.pubKeyLastByteSender)
	ring, indexes, commitmentsToZero, err := generateMlsagRingCA(inp, inputIndexes, out, params_token, pi, shardID, ringSize)
	if err != nil {
		return err
	}

	// Set SigPubKey
	txSigPubKey := new(Pubkey)
	txSigPubKey.Indexes = indexes
	tx.SigPubKey, err = txSigPubKey.Bytes()
	if err != nil {
		return err
	}

	// Set sigPrivKey
	privKeysMlsag, err := createPrivKeyMlsagCA(inp, out, outputSharedSecrets, params_compat, shardID, commitmentsToZero)
	if err != nil {
		return err
	}
	sag := mlsag.NewMlsag(privKeysMlsag, ring, pi)
	sk, err := privacy.ArrayScalarToBytes(&privKeysMlsag)
	if err != nil {
		return err
	}
	tx.sigPrivKey = sk

	// Set Signature
	mlsagSignature, err := sag.SignConfidentialAsset(hashedMessage)
	if err != nil {
		return err
	}
	// inputCoins already hold keyImage so set to nil to reduce size
	mlsagSignature.SetKeyImages(nil)
	tx.Sig, err = mlsagSignature.ToBytes()

	return err
}

func (tx *Tx) proveToken(params *ExtendedParams) (bool, *privacy.SenderSeal, error) {
	temp, err := params.GetTxTokenParams()
	if err != nil {
		return false, nil, fmt.Errorf("error parsing parameters %v", err)
	}
	tid, err := TokenIDFromString(params.TokenParams.TokenID)
	if err != nil {
		return false, nil, err
	}
	// paying fee using pToken is not supported
	feeToken := uint64(0)
	params_compat := NewTxParams(temp.SenderKey, temp.TokenParams.Receiver, temp.TokenParams.TokenInput, feeToken, temp.HasPrivacyToken, &tid, nil, temp.Info)

	// Init tx and params (tx and params will be changed)
	if err := tx.initializeTxAndParams(params_compat, &params.TokenParams.TokenPaymentInfo); err != nil {
		return false, nil, err
	}
	tx.Type = common.TxCustomTokenPrivacyType

	return tx.proveCA(params_compat, params.TokenParams)
}

func (txToken *TxToken) initToken(txNormal *Tx, params *ExtendedParams) (*privacy.SenderSeal, error) {
	if params.TokenParams.Type == CustomTokenInit && len(params.TokenParams.TokenName) > 0 && len(params.TokenParams.TokenSymbol) > 0 {
		txToken.TokenData.Type = CustomTokenInit
		txToken.TokenData.PropertyName = params.TokenParams.TokenName
		txToken.TokenData.PropertySymbol = params.TokenParams.TokenSymbol
		txToken.TokenData.Mintable = params.TokenParams.Mintable
	} else {
		txToken.TokenData.Type = CustomTokenTransfer
		txToken.TokenData.PropertyName = ""
		txToken.TokenData.PropertySymbol = ""
		txToken.TokenData.Mintable = false
	}

	switch txToken.TokenData.Type {
	case CustomTokenInit:
		return nil, fmt.Errorf("Error: TX type deprecated")
	case CustomTokenTransfer:
		propertyID, _ := common.TokenStringToHash(params.TokenParams.TokenID)
		dbFacingTokenID := common.ConfidentialAssetID

		isBurning, seal, err := txNormal.proveToken(params)
		if err != nil {
			return nil, fmt.Errorf("error proving token - %v", err)
		}

		// tokenID is already hidden in asset tags in coin, here we use the umbrella ID
		if isBurning {
			// show plain tokenID if this is a burning TX
			txToken.TokenData.PropertyID = *propertyID
		} else {
			txToken.TokenData.PropertyID = dbFacingTokenID
		}
		txToken.SetTxNormal(txNormal)
		return seal, nil
	default:
		return nil, fmt.Errorf("can't handle this TokenTxType")
	}
}

func (tx *Tx) provePRV(params *ExtendedParams) ([]privacy.PlainCoin, []uint64, []*privacy.CoinV2, error) {
	var outputCoins []*privacy.CoinV2
	var pInfos []*privacy.PaymentInfo
	for _, payInf := range params.PaymentInfo {
		temp, _ := payInf.To()
		c, _, err := privacy.NewCoinFromPaymentInfo(temp)
		if err != nil {
			return nil, nil, nil, err
		}
		outputCoins = append(outputCoins, c)
		pInfos = append(pInfos, temp)
	}

	inputCoins, inputIndexes, err := params.GetInputCoins()
	if err != nil {
		return nil, nil, nil, err
	}
	tx.Proof, err = privacy.ProveV2(inputCoins, outputCoins, nil, false, pInfos)
	if err != nil {
		return nil, nil, nil, err
	}
	if tx.Metadata != nil {
		if err := tx.Metadata.Sign(&params.SenderSK, tx); err != nil {
			return nil, nil, nil, err
		}
	}
	return inputCoins, inputIndexes, outputCoins, nil
}

func (txToken *TxToken) initPRV(feeTx *Tx, params *ExtendedParams) ([]privacy.PlainCoin, []uint64, []*privacy.CoinV2, error) {
	feeTx.Type = common.TxCustomTokenPrivacyType
	inps, inputIndexes, outs, err := feeTx.provePRV(params)
	if err != nil {
		return nil, nil, nil, err
	}

	return inps, inputIndexes, outs, nil
}

func (txToken *TxToken) Create(params *ExtendedParams, theirTime int64) (*privacy.SenderSeal, error) {
	params_compat, err := params.GetTxTokenParams()
	if err != nil {
		return nil, fmt.Errorf("error parsing parameters - %v", err)
	}
	txPrivacyParams := NewTxParams(params_compat.SenderKey, params_compat.PaymentInfo, params_compat.InputCoin, params_compat.FeeNativeCoin, false, nil, params_compat.Metadata, params_compat.Info)
	// Init tx and params (tx and params will be changed)
	tx := new(Tx)
	if err := tx.initializeTxAndParams(txPrivacyParams, &params.PaymentInfo); err != nil {
		return nil, err
	}
	if theirTime > 0 {
		tx.LockTime = theirTime
	}
	inps, inputIndexes, outs, err := txToken.initPRV(tx, params)
	if err != nil {
		return nil, err
	}
	txn := makeTxToken(tx, nil, nil, nil)
	// Init, prove and sign(CA) Token
	seal, err := txToken.initToken(txn, params)
	if err != nil {
		return nil, err
	}
	tdh, err := txToken.TokenData.Hash()
	if err != nil {
		return nil, err
	}
	message := common.HashH(append(tx.Hash()[:], tdh[:]...))
	err = tx.sign(inps, inputIndexes, outs, params, message[:])
	if err != nil {
		return nil, err
	}
	txToken.Tx = *tx
	return seal, err
}
