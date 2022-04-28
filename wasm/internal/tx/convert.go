package tx

import (
	"time"

	"incognito-chain/common"
	"incognito-chain/privacy"
	"incognito-chain/privacy/privacy_v1/schnorr"
	"incognito-chain/privacy/privacy_v1/zeroknowledge/serialnumbernoprivacy"
	"incognito-chain/privacy/privacy_v2"
)

func SignNoPrivacy(privKey *privacy.PrivateKey, hashedMessage []byte) (signatureBytes []byte, sigPubKey []byte, err error) {
	sk := new(privacy.Scalar).FromBytesS(*privKey)
	r := new(privacy.Scalar).FromUint64(0)
	sigKey := new(schnorr.SchnorrPrivateKey)
	sigKey.Set(sk, r)
	signature, err := sigKey.Sign(hashedMessage)
	if err != nil {
		return nil, nil, err
	}
	signatureBytes = signature.Bytes()
	sigPubKey = sigKey.GetPublicKey().GetPublicKey().ToBytesS()
	return signatureBytes, sigPubKey, nil
}

func initializeTxConversion(tx *Tx, params *TxParams, paymentsPtr *[]PaymentReader) error {
	var err error
	// Get Keyset from param
	skBytes := *params.SenderSK
	senderPaymentAddress := privacy.GeneratePaymentAddress(skBytes)
	// Tx: initialize some values
	tx.Fee = params.Fee
	tx.Version = 2
	tx.Type = common.TxConversionType
	tx.pubKeyLastByteSender = common.GetShardIDFromLastByte(senderPaymentAddress.Pk[len(senderPaymentAddress.Pk)-1])
	// non-zero means it was set before
	if tx.LockTime == 0 {
		tx.LockTime = time.Now().Unix()
	}
	tx.Info = params.Info
	// Params: update balance if overbalance
	if err = updateParamsWhenOverBalance(paymentsPtr, params, senderPaymentAddress); err != nil {
		return err
	}
	return nil
}

func getOutputcoinsFromPaymentInfo(paymentInfos []*privacy.PaymentInfo, tokenID *common.Hash) ([]*privacy.CoinV2, error) {
	var err error
	isPRV := (tokenID == nil) || (*tokenID == common.PRVCoinID)
	c := make([]*privacy.CoinV2, len(paymentInfos))
	for i := 0; i < len(paymentInfos); i += 1 {
		if isPRV {
			c[i], _, err = privacy.NewCoinFromPaymentInfo(paymentInfos[i])
			if err != nil {
				return nil, err
			}
		} else {
			createdCACoin, _, _, err := privacy.NewCoinCA(paymentInfos[i], tokenID)
			if err != nil {
				return nil, err
			}
			createdCACoin.SetPlainTokenID(tokenID)
			c[i] = createdCACoin
		}
	}
	return c, nil
}

func proveConversion(tx *Tx, params *TxParams) error {
	lenInputs := len(params.InputCoins)
	inputCoins := params.InputCoins
	var err error
	outputCoins, err := getOutputcoinsFromPaymentInfo(params.PaymentInfo, params.TokenID)
	if err != nil {
		return err
	}
	serialnumberWitness := make([]*serialnumbernoprivacy.SNNoPrivacyWitness, lenInputs)
	for i := 0; i < len(inputCoins); i++ {
		/***** Build witness for proving that serial number is derived from the committed derivator *****/
		serialnumberWitness[i] = new(serialnumbernoprivacy.SNNoPrivacyWitness)
		serialnumberWitness[i].Set(inputCoins[i].GetKeyImage(), inputCoins[i].GetPublicKey(),
			inputCoins[i].GetSNDerivator(), new(privacy.Scalar).FromBytesS(*params.SenderSK))
	}
	tx.Proof, err = privacy_v2.ProveConversion(inputCoins, outputCoins, serialnumberWitness)
	if err != nil {
		return err
	}
	if tx.Sig, tx.SigPubKey, err = SignNoPrivacy(params.SenderSK, tx.Hash()[:]); err != nil {
		return err
	}
	return nil
}

func Convert(tx *Tx, params *ExtendedParams, theirTime int64) error {
	gParams, err := params.GetGenericParams()
	if err != nil {
		return err
	}
	if err := initializeTxConversion(tx, gParams, &params.PaymentInfo); err != nil {
		return err
	}
	if theirTime > 0 {
		tx.LockTime = theirTime
	}
	if err := proveConversion(tx, gParams); err != nil {
		return err
	}
	return nil
}

func (txToken *TxToken) initTokenConversion(txNormal *Tx, params *ExtendedParams) error {
	txToken.TokenData.Type = CustomTokenTransfer
	txToken.TokenData.PropertyName = ""
	txToken.TokenData.PropertySymbol = ""
	txToken.TokenData.Mintable = false
	propertyID, _ := common.TokenStringToHash(params.TokenParams.TokenID)
	txToken.TokenData.PropertyID = *propertyID
	temp, err := params.TokenParams.GetTokenParams()
	if err != nil {
		return err
	}
	txConvertParams := NewTxParams(
		&params.SenderSK,
		temp.Receiver,
		temp.TokenInput,
		0,
		false,
		propertyID,
		nil,
		params.Info,
	)

	if err := initializeTxConversion(txNormal, txConvertParams, &params.TokenParams.TokenPaymentInfo); err != nil {
		return err
	}
	txNormal.Type = TxTokenConversionType
	if err := proveConversion(txNormal, txConvertParams); err != nil {
		return err
	}
	return txToken.SetTxNormal(txNormal)
}

func (txToken *TxToken) initPRVFeeConversion(feeTx *Tx, params *ExtendedParams) ([]privacy.PlainCoin, []uint64, []*privacy.CoinV2, error) {
	feeTx.Version = 2
	feeTx.Type = common.TxTokenConversionType
	inps, inputIndexes, outs, err := feeTx.provePRV(params)
	if err != nil {
		return nil, nil, nil, err
	}
	txToken.Tx = *feeTx
	return inps, inputIndexes, outs, nil
}

func ConvertToken(txToken *TxToken, params *ExtendedParams, theirTime int64) error {
	params.HasPrivacy = false
	txPrivacyParams, err := params.GetGenericParams()
	if err != nil {
		return err
	}
	// Init tx and params (tx and params will be changed)
	tx := &Tx{}
	if err := tx.initializeTxAndParams(txPrivacyParams, &params.PaymentInfo); err != nil {
		return err
	}
	if theirTime > 0 {
		tx.LockTime = theirTime
	}
	// Init PRV Fee
	inps, inputIndexes, outs, err := txToken.initPRVFeeConversion(tx, params)
	if err != nil {
		return err
	}
	txn := makeTxToken(&txToken.Tx, nil, nil, nil)
	// Init Token
	if err := txToken.initTokenConversion(txn, params); err != nil {
		return err
	}
	tdh, err := txToken.TokenData.Hash()
	if err != nil {
		return err
	}

	message := common.HashH(append(txToken.Tx.Hash()[:], tdh[:]...))
	err = txToken.Tx.sign(inps, inputIndexes, outs, params, message[:])
	if err != nil {
		return err
	}
	return nil
}
