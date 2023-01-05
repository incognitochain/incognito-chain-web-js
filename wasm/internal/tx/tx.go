package tx

import (
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"incognito-chain/common"
	"incognito-chain/key/incognitokey"
	"incognito-chain/metadata"
	"incognito-chain/privacy"
	"incognito-chain/privacy/privacy_v2/mlsag"
)

const MaxSizeByte = (1 << 8) - 1

type Pubkey struct {
	Indexes [][]*big.Int
}

func (sigPub Pubkey) Bytes() ([]byte, error) {
	n := len(sigPub.Indexes)
	if n == 0 {
		return nil, fmt.Errorf("TxSigPublicKeyVer2.ToBytes: Indexes is empty")
	}
	if n > MaxSizeByte {
		return nil, fmt.Errorf("TxSigPublicKeyVer2.ToBytes: Indexes is too large, too many rows")
	}
	m := len(sigPub.Indexes[0])
	if m > MaxSizeByte {
		return nil, fmt.Errorf("TxSigPublicKeyVer2.ToBytes: Indexes is too large, too many columns")
	}
	for i := 1; i < n; i += 1 {
		if len(sigPub.Indexes[i]) != m {
			return nil, fmt.Errorf("TxSigPublicKeyVer2.ToBytes: Indexes is not a rectangle array")
		}
	}

	b := make([]byte, 0)
	b = append(b, byte(n))
	b = append(b, byte(m))
	for i := 0; i < n; i += 1 {
		for j := 0; j < m; j += 1 {
			currentByte := sigPub.Indexes[i][j].Bytes()
			lengthByte := len(currentByte)
			if lengthByte > MaxSizeByte {
				return nil, fmt.Errorf("TxSigPublicKeyVer2.ToBytes: IndexesByte is too large")
			}
			b = append(b, byte(lengthByte))
			b = append(b, currentByte...)
		}
	}
	return b, nil
}

func (sigPub *Pubkey) SetBytes(b []byte) error {
	if len(b) < 2 {
		return fmt.Errorf("txSigPubKeyFromBytes: cannot parse length of Indexes, length of input byte is too small")
	}
	n := int(b[0])
	m := int(b[1])
	offset := 2
	indexes := make([][]*big.Int, n)
	for i := 0; i < n; i += 1 {
		row := make([]*big.Int, m)
		for j := 0; j < m; j += 1 {
			if offset >= len(b) {
				return fmt.Errorf("txSigPubKeyFromBytes: cannot parse byte length of index[i][j], length of input byte is too small")
			}
			byteLength := int(b[offset])
			offset += 1
			if offset+byteLength > len(b) {
				return fmt.Errorf("txSigPubKeyFromBytes: cannot parse big int index[i][j], length of input byte is too small")
			}
			currentByte := b[offset : offset+byteLength]
			offset += byteLength
			row[j] = new(big.Int).SetBytes(currentByte)
		}
		indexes[i] = row
	}
	if sigPub == nil {
		sigPub = new(Pubkey)
	}
	sigPub.Indexes = indexes
	return nil
}

type Tx struct {
	// Basic data, required
	Version  int8
	Type     string
	LockTime int64
	Fee      uint64
	Info     []byte

	// Sign and Privacy proof, required
	SigPubKey            []byte
	Sig                  []byte
	Proof                privacy.Proof
	pubKeyLastByteSender byte
	Metadata             metadata.Metadata
	// private field, not use for json parser, only use as temp variable
	sigPrivKey []byte
}

func (tx Tx) MarshalJSON() ([]byte, error) {
	var temp = struct {
		// Basic data, required
		Version  int8   `json:"Version"`
		Type     string `json:"Type"` // Transaction type
		LockTime int64  `json:"LockTime"`
		Fee      uint64 `json:"Fee"` // Fee applies: always consant
		Info     []byte // 512 bytes

		// Sign and Privacy proof, required
		SigPubKey            []byte `json:"SigPubKey"`
		Sig                  []byte `json:"Sig"`
		Proof                privacy.Proof
		PubKeyLastByteSender int               `json:"PubKeyLastByteSender"`
		Metadata             metadata.Metadata `json:"Metadata"`
	}{
		Version:              tx.Version,
		Type:                 tx.Type,
		LockTime:             tx.LockTime,
		Fee:                  tx.Fee,
		Info:                 tx.Info,
		SigPubKey:            tx.SigPubKey,
		Sig:                  tx.Sig,
		Proof:                tx.Proof,
		PubKeyLastByteSender: int(tx.pubKeyLastByteSender),
		Metadata:             tx.Metadata,
	}
	return json.Marshal(temp)
}

func (tx Tx) Hash() *common.Hash {
	// leave out signature & its public key when hashing tx
	tx.Sig = []byte{}
	tx.SigPubKey = []byte{}
	inBytes, err := json.Marshal(tx)
	if err != nil {
		return nil
	}
	hash := common.HashH(inBytes)
	return &hash
}

func (tx Tx) HashWithoutMetadataSig() *common.Hash {
	md := tx.Metadata
	mdHash := md.HashWithoutSig()
	tx.Metadata = nil
	txHash := tx.Hash()
	if mdHash == nil || txHash == nil {
		return nil
	}
	// tx.SetMetadata(md)
	inBytes := append(mdHash[:], txHash[:]...)
	hash := common.HashH(inBytes)
	return &hash
}

func generateMlsagRing(inputCoins []privacy.PlainCoin, inputIndexes []uint64, outputCoins []*privacy.CoinV2, params *ExtendedParams, pi int, shardID byte, ringSize int) (*mlsag.Ring, [][]*big.Int, *privacy.Point, error) {
	coinCache := params.Cache
	mutualLen := len(coinCache.PublicKeys)
	if len(coinCache.Commitments) != mutualLen || len(coinCache.Indexes) != mutualLen {
		return nil, nil, nil, fmt.Errorf("Length mismatch in coin cache")
	}
	if mutualLen < len(inputCoins)*(ringSize-1) {
		return nil, nil, nil, fmt.Errorf("Not enough coins to create ring, expect %d", len(inputCoins)*(ringSize-1))
	}
	outputCoinsAsGeneric := make([]privacy.Coin, len(outputCoins))
	for i := 0; i < len(outputCoins); i++ {
		outputCoinsAsGeneric[i] = outputCoins[i]
	}
	sumOutputsWithFee := calculateSumOutputsWithFee(outputCoinsAsGeneric, params.Fee)

	indexes := make([][]*big.Int, ringSize)
	ring := make([][]*privacy.Point, ringSize)
	var commitmentToZero *privacy.Point
	var currentRingCoinIndex int = 0
	for i := 0; i < ringSize; i += 1 {
		sumInputs := new(privacy.Point).Identity()
		sumInputs.Sub(sumInputs, sumOutputsWithFee)

		row := make([]*privacy.Point, len(inputCoins))
		rowIndexes := make([]*big.Int, len(inputCoins))
		if i == pi {
			for j := 0; j < len(inputCoins); j += 1 {
				row[j] = inputCoins[j].GetPublicKey()

				rowIndexes[j] = big.NewInt(0).SetUint64(inputIndexes[j])
				sumInputs.Add(sumInputs, inputCoins[j].GetCommitment())
			}
		} else {
			for j := 0; j < len(inputCoins); j += 1 {
				// grab the next coin from the list of decoys to add to ring
				pkBytes := coinCache.PublicKeys[currentRingCoinIndex]
				commitmentBytes := coinCache.Commitments[currentRingCoinIndex]
				rowIndexes[j] = big.NewInt(0).SetUint64(coinCache.Indexes[currentRingCoinIndex])
				currentRingCoinIndex++

				row[j], _ = new(privacy.Point).FromBytesS(pkBytes)
				commitment, _ := new(privacy.Point).FromBytesS(commitmentBytes)
				sumInputs.Add(sumInputs, commitment)
			}
		}
		row = append(row, sumInputs)
		if i == pi {
			commitmentToZero = sumInputs
		}
		ring[i] = row
		indexes[i] = rowIndexes
	}
	return mlsag.NewRing(ring), indexes, commitmentToZero, nil
}

func (tx *Tx) prove(params *ExtendedParams) (*privacy.SenderSeal, error) {
	var outputCoins []*privacy.CoinV2
	var pInfos []*privacy.PaymentInfo
	var senderKeySet incognitokey.KeySet
	var b byte
	var err error
	if len(params.SenderSK[:]) == 32 {
		// read raw private key
		senderKeySet.InitFromPrivateKey(&params.SenderSK)
	} else {
		// read raw payment address instead
		err = senderKeySet.PaymentAddress.SetBytes(params.SenderSK[:])
		if err != nil {
			return nil, err
		}
	}
	b = senderKeySet.PaymentAddress.Pk[len(senderKeySet.PaymentAddress.Pk)-1]
	// currently support returning the 1st SenderSeal only
	var senderSealToExport *privacy.SenderSeal = nil
	for _, payInf := range params.PaymentInfo {
		temp, _ := payInf.To()
		c, seal, err := privacy.NewCoinFromPaymentInfo(privacy.NewCoinParams().From(temp, int(b), privacy.CoinPrivacyTypeTransfer))
		if senderSealToExport == nil {
			senderSealToExport = seal
		}
		if err != nil {
			return nil, err
		}
		outputCoins = append(outputCoins, c)
		pInfos = append(pInfos, temp)
	}
	inputCoins, inputIndexes, err := params.GetInputCoins()
	if err != nil {
		return nil, err
	}
	tx.Proof, err = privacy.ProveV2(inputCoins, outputCoins, nil, false, pInfos)
	if err != nil {
		return nil, err
	}

	if tx.Metadata != nil {
		if err := tx.Metadata.Sign(&params.SenderSK, tx); err != nil {
			return nil, err
		}
	}

	err = tx.sign(inputCoins, inputIndexes, outputCoins, params, tx.Hash()[:])
	return senderSealToExport, err
}

func (tx *Tx) sign(inp []privacy.PlainCoin, inputIndexes []uint64, out []*privacy.CoinV2, params *ExtendedParams, hashedMessage []byte) error {
	if tx.Sig != nil {
		return fmt.Errorf("Re-signing TX is not allowed")
	}
	ringSize := privacy.RingSize
	if len(params.Cache.PublicKeys) == 0 {
		// when no decoys are provided, sign with ring size 1
		ringSize = 1
	}

	var pi int
	useHw, firstC, pi, err := params.UseHwSigner(0)
	if err != nil {
		return err
	}
	if !useHw {
		piBig, piErr := RandBigIntMaxRange(big.NewInt(int64(ringSize)))
		if piErr != nil {
			return piErr
		}
		pi = int(piBig.Int64())
	}
	shardID := common.GetShardIDFromLastByte(tx.pubKeyLastByteSender)
	ring, indexes, commitmentToZero, err := generateMlsagRing(inp, inputIndexes, out, params, pi, shardID, ringSize)
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

	if useHw {
		sumRand := new(privacy.Scalar).FromUint64(0)
		for _, in := range inp {
			sumRand.Add(sumRand, in.GetRandomness())
		}
		for _, out := range out {
			sumRand.Sub(sumRand, out.GetRandomness())
		}
		sag := mlsag.NewMlsagFromInputCoins(inp, ring, pi)

		sig, err := sag.PartialSign(hashedMessage, firstC, sumRand)
		if err != nil {
			return err
		}
		tx.Sig, err = sig.ToBytes()
	} else { 
		privKeysMlsag, err := createPrivKeyMlsag(inp, out, &params.SenderSK, commitmentToZero)
		if err != nil {
			return err
		}
		sag := mlsag.NewMlsag(privKeysMlsag, ring, pi)

		// Set Signature
		mlsagSignature, err := sag.Sign(hashedMessage)
		if err != nil {
			return err
		}
		// inputCoins already hold keyImage so set to nil to reduce size
		mlsagSignature.SetKeyImages(nil)
		tx.Sig, err = mlsagSignature.ToBytes()
	}

	return err
}

func (tx *Tx) Create(params *ExtendedParams, theirTime int64) (*privacy.SenderSeal, error) {
	gParams, err := params.GetGenericParams()
	if err != nil {
		return nil, fmt.Errorf("cannot parse params %v - %v", gParams, err)
	}
	// Init tx and params (tx and params will be changed)
	if err := tx.initializeTxAndParams(gParams, &params.PaymentInfo); err != nil {
		return nil, err
	}
	if theirTime > 0 {
		tx.LockTime = theirTime
	}

	return tx.prove(params)
}

func (tx *Tx) initializeTxAndParams(params_compat *TxParams, paymentsPtr *[]PaymentReader) error {
	var err error
	var senderPaymentAddress privacy.PaymentAddress
	// Get Keyset from param
	skb := (*params_compat.SenderSK)[:]
	if len(skb) == 32 { 
		senderPaymentAddress = privacy.GeneratePaymentAddress(skb)
	} else {
		err = senderPaymentAddress.SetBytes(skb)
		if err != nil {
			return err
		}
	}
	tx.pubKeyLastByteSender = common.GetShardIDFromLastByte(senderPaymentAddress.Pk[len(senderPaymentAddress.Pk)-1])
	// tx.sigPrivKey = skBytes
	// Tx: initialize some values
	// non-zero means it was set before
	if tx.LockTime == 0 {
		tx.LockTime = time.Now().Unix()
	}
	tx.Fee = params_compat.Fee
	// normal type indicator
	tx.Type = TxNormalType
	tx.Metadata = params_compat.Metadata
	
	// we don't support version 1
	tx.Version = 2
	tx.Info = params_compat.Info
	// Params: update balance if overbalance
	if err = updateParamsWhenOverBalance(paymentsPtr, params_compat, senderPaymentAddress); err != nil {
		return err
	}

	return nil
}

func calculateSumOutputsWithFee(outputCoins []privacy.Coin, fee uint64) *privacy.Point {
	sumOutputsWithFee := new(privacy.Point).Identity()
	for i := 0; i < len(outputCoins); i += 1 {
		sumOutputsWithFee.Add(sumOutputsWithFee, outputCoins[i].GetCommitment())
	}
	feeCommitment := new(privacy.Point).ScalarMult(
		privacy.PedCom.G[privacy.PedersenValueIndex],
		new(privacy.Scalar).FromUint64(fee),
	)
	sumOutputsWithFee.Add(sumOutputsWithFee, feeCommitment)
	return sumOutputsWithFee
}

func createPrivKeyMlsag(inputCoins []privacy.PlainCoin, outputCoins []*privacy.CoinV2, senderSK *privacy.PrivateKey, commitmentToZero *privacy.Point) ([]*privacy.Scalar, error) {
	sumRand := new(privacy.Scalar).FromUint64(0)
	for _, in := range inputCoins {
		sumRand.Add(sumRand, in.GetRandomness())
	}
	for _, out := range outputCoins {
		sumRand.Sub(sumRand, out.GetRandomness())
	}

	privKeyMlsag := make([]*privacy.Scalar, len(inputCoins)+1)
	for i := 0; i < len(inputCoins); i += 1 {
		var err error
		privKeyMlsag[i], err = inputCoins[i].ParsePrivateKeyOfCoin(*senderSK)
		if err != nil {
			return nil, err
		}
	}
	commitmentToZeroRecomputed := new(privacy.Point).ScalarMult(privacy.PedCom.G[privacy.PedersenRandomnessIndex], sumRand)
	match := privacy.IsPointEqual(commitmentToZeroRecomputed, commitmentToZero)
	if !match {
		return nil, fmt.Errorf("asset-tag/commitment sum mismatch")
	}
	privKeyMlsag[len(inputCoins)] = sumRand
	return privKeyMlsag, nil
}

func updateParamsWhenOverBalance(pInfos *[]PaymentReader, gParams *TxParams, senderPaymentAddree privacy.PaymentAddress) error {
	// Calculate sum of all output coins' value
	sumOutputValue := uint64(0)
	for _, p := range *pInfos {
		pInf, _ := p.To()
		sumOutputValue += pInf.Amount
	}

	// Calculate sum of all input coins' value
	sumInputValue := uint64(0)
	for _, coin := range gParams.InputCoins {
		sumInputValue += coin.GetValue()
	}

	overBalance := int64(sumInputValue - sumOutputValue - gParams.Fee)
	// Check if sum of input coins' value is at least sum of output coins' value and tx fee
	if overBalance < 0 {
		return fmt.Errorf("Output + Fee > Input")
	}
	// Create a new payment to sender's pk where amount is overBalance if > 0
	if overBalance > 0 {
		temp := new(privacy.PaymentInfo)
		temp.Amount = uint64(overBalance)
		temp.PaymentAddress = senderPaymentAddree
		changePaymentInfo := &PaymentReader{}

		changePaymentInfo.From(temp)
		gParams.PaymentInfo = append(gParams.PaymentInfo, temp)
		*pInfos = append(*pInfos, *changePaymentInfo)
	}

	return nil
}
