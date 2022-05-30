package gomobile

import (
	// "syscall/js"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"strconv"

	"incognito-chain/common"
	"incognito-chain/key/incognitokey"
	"incognito-chain/key/wallet"
	"incognito-chain/privacy"
	"incognito-chain/privacy/blsmultisig"
	"incognito-chain/privacy/privacy_v1/hybridencryption"

	// "incognito-chain/metadata"
	"github.com/btcsuite/btcd/chaincfg"
	"github.com/btcsuite/btcd/chaincfg/chainhash"
	"github.com/btcsuite/btcd/txscript"
	"github.com/btcsuite/btcutil"
	"github.com/btcsuite/btcutil/hdkeychain"
	"github.com/pkg/errors"
	// "math/big"
)

type TxResult struct {
	B58EncodedTx string              `json:"b58EncodedTx"`
	Hash         string              `json:"hash"`
	Outputs      []CoinInter         `json:"outputs,omitempty"`
	SenderSeal   *privacy.SenderSeal `json:"senderSeal,omitempty"`
}

func CreateTransaction(args string, num int64) (string, error) {
	var theirTime int64 = num
	params := &InitParamsAsm{}
	// println("Before parse - TX parameters")
	// println(args)
	err := json.Unmarshal([]byte(args), params)
	if err != nil {
		println(err.Error())
		return "", err
	}
	// println("After parse - TX parameters")
	// thoseBytesAgain, _ := json.Marshal(params)
	// println(string(thoseBytesAgain))

	var txJson []byte
	var hash *common.Hash
	var outputs []CoinInter
	var senderSeal *privacy.SenderSeal
	if params.TokenParams == nil {
		tx := &Tx{}
		senderSeal, err = tx.InitASM(params, theirTime)

		if err != nil {
			println("Can not create tx: ", err.Error())
			return "", err
		}

		// serialize tx json
		txJson, err = json.Marshal(tx)
		if err != nil {
			println("Can not marshal tx: ", err)
			return "", err
		}
		hash = tx.Hash()
		outputCoins := tx.Proof.GetOutputCoins()
		if len(outputCoins) != 0 {
			for _, c := range outputCoins {
				cv2, ok := c.(*privacy.CoinV2)
				if !ok {
					continue
				}
				outputs = append(outputs, GetCoinInter(cv2))
			}
		}
	} else {
		tx := &TxToken{}
		senderSeal, err = tx.InitASM(params, theirTime)

		if err != nil {
			println("Can not create tx: ", err.Error())
			return "", err
		}

		// serialize tx json
		txJson, err = json.Marshal(tx)
		if err != nil {
			println("Error marshalling tx: ", err)
			return "", err
		}
		hash = tx.Hash()
		outputCoins := tx.Tx.Proof.GetOutputCoins()
		if len(outputCoins) != 0 {
			for _, c := range outputCoins {
				cv2, ok := c.(*privacy.CoinV2)
				if !ok {
					continue
				}
				outputs = append(outputs, GetCoinInter(cv2))
			}
		}
		outputCoins = tx.TokenData.Proof.GetOutputCoins()
		if len(outputCoins) != 0 {
			for _, c := range outputCoins {
				cv2, ok := c.(*privacy.CoinV2)
				if !ok {
					continue
				}
				outputs = append(outputs, GetCoinInter(cv2))
			}
		}
	}
	encodedTx := b58.Encode(txJson, common.ZeroByte)
	txResult := TxResult{B58EncodedTx: encodedTx, Hash: hash.String(), Outputs: outputs, SenderSeal: senderSeal}
	jsonResult, _ := json.Marshal(txResult)

	return string(jsonResult), nil
}

func CreateConvertTx(args string, num int64) (string, error) {
	var theirTime int64 = num

	params := &InitParamsAsm{}
	// println("Before parse - TX parameters")
	// println(args)
	err := json.Unmarshal([]byte(args), params)
	if err != nil {
		println(err.Error())
		return "", err
	}
	// println("After parse - TX parameters")
	// thoseBytesAgain, _ := json.Marshal(params)
	// println(string(thoseBytesAgain))

	var txJson []byte
	var hash *common.Hash
	if params.TokenParams == nil {
		tx := &Tx{}
		err = InitConversionASM(tx, params, theirTime)

		if err != nil {
			println("Can not create tx: ", err.Error())
			return "", err
		}

		// serialize tx json
		txJson, err = json.Marshal(tx)
		if err != nil {
			println("Can not marshal tx: ", err)
			return "", err
		}
		hash = tx.Hash()
	} else {
		tx := &TxToken{}
		err = InitTokenConversionASM(tx, params, theirTime)

		if err != nil {
			println("Can not create tx: ", err.Error())
			return "", err
		}

		// serialize tx json
		txJson, err = json.Marshal(tx)
		if err != nil {
			println("Error marshalling tx: ", err)
			return "", err
		}
		hash = tx.Hash()
	}
	encodedTx := b58.Encode(txJson, common.ZeroByte)
	txResult := TxResult{B58EncodedTx: encodedTx, Hash: hash.String()}
	jsonResult, _ := json.Marshal(txResult)

	return string(jsonResult), nil
}

func NewKeySetFromPrivate(skStr string) (string, error) {
	var err error
	skHolder := struct {
		PrivateKey []byte `json:"PrivateKey"`
	}{}
	err = json.Unmarshal([]byte(skStr), &skHolder)
	if err != nil {
		println(err.Error())
		return "", err
	}
	ks := &incognitokey.KeySet{}
	err = ks.InitFromPrivateKeyByte(skHolder.PrivateKey)
	if err != nil {
		println(err.Error())
		return "", err
	}
	txJson, err := json.Marshal(ks)
	if err != nil {
		println("Error marshalling key set: ", err)
		return "", err
	}

	return string(txJson), nil
}

func DecryptCoin(paramStr string) (string, error) {
	var err error
	temp := &struct {
		Coin   CoinInter
		KeySet string
	}{}
	err = json.Unmarshal([]byte(paramStr), temp)
	if err != nil {
		return "", err
	}
	tempKw, err := wallet.Base58CheckDeserialize(temp.KeySet)
	if err != nil {
		return "", err
	}
	ks := tempKw.KeySet
	var res CoinInter
	if temp.Coin.Version == 2 {
		c, _, err := temp.Coin.ToCoin()
		if err != nil {
			return "", err
		}

		_, err = c.Decrypt(&ks)
		if err != nil {
			println(err.Error())
			return "", err
		}
		res = GetCoinInter(c)
	} else if temp.Coin.Version == 1 {
		c, _, err := temp.Coin.ToCoinV1()
		if err != nil {
			return "", err
		}

		pc, err := c.Decrypt(&ks)
		if err != nil {
			println(err.Error())
			return "", err
		}
		res = GetCoinInter(pc)
	}

	res.Index = temp.Coin.Index
	resJson, err := json.Marshal(res)
	if err != nil {
		println("Error marshalling key set: ", err)
		return "", err
	}
	return string(resJson), nil
}

func CreateCoin(paramStr string) (string, error) {
	var err error
	temp := &struct {
		PaymentInfo printedPaymentInfo
		TokenID     string
	}{}
	err = json.Unmarshal([]byte(paramStr), temp)
	if err != nil {
		return "", err
	}
	pInf, err := temp.PaymentInfo.To()
	if err != nil {
		return "", err
	}
	var c *privacy.CoinV2
	cpr := privacy.NewCoinParams().FromPaymentInfo(pInf)
	cpr.CoinPrivacyType = privacy.CoinPrivacyTypeMint
	if len(temp.TokenID) == 0 {
		c, _, err = privacy.NewCoinFromPaymentInfo(cpr)
		if err != nil {
			println(err.Error())
			return "", err
		}
	} else {
		var tokenID common.Hash
		tokenID, _ = getTokenIDFromString(temp.TokenID)
		c, _, _, err = privacy.NewCoinCA(cpr, &tokenID)
		if err != nil {
			println(err.Error())
			return "", err
		}
	}

	res := GetCoinInter(c)
	resJson, err := json.Marshal(res)
	if err != nil {
		println("Error marshalling ket set: ", err)
		return "", err
	}
	return string(resJson), nil
}

func GenerateBLSKeyPairFromSeed(args string) (string, error) {
	seed, err := b64.DecodeString(args)
	if err != nil {
		return "", err
	}
	privateKey, publicKey := blsmultisig.KeyGen(seed)
	keyPairBytes := []byte{}
	keyPairBytes = append(keyPairBytes, common.AddPaddingBigInt(privateKey, common.BigIntSize)...)
	keyPairBytes = append(keyPairBytes, blsmultisig.CmprG2(publicKey)...)
	keyPairEncode := b64.EncodeToString(keyPairBytes)
	return keyPairEncode, nil
}

func GenerateKeyFromSeed(args string) (string, error) {
	seed, err := b64.DecodeString(args)
	if err != nil {
		return "", err
	}
	key := privacy.GeneratePrivateKey(seed)
	res := b64.EncodeToString(key)
	return res, nil
}

func HybridEncrypt(args string) (string, error) {
	raw, _ := b64.DecodeString(args)
	publicKeyBytes := raw[0:privacy.Ed25519KeySize]
	publicKeyPoint, err := new(privacy.Point).FromBytesS(publicKeyBytes)
	if err != nil {
		return "", errors.Errorf("Invalid public key encryption")
	}

	msgBytes := raw[privacy.Ed25519KeySize:]
	ciphertext, err := hybridencryption.HybridEncrypt(msgBytes, publicKeyPoint)
	if err != nil {
		return "", err
	}
	return b64.EncodeToString(ciphertext.Bytes()), nil
}

func HybridDecrypt(args string) (string, error) {
	raw, _ := b64.DecodeString(args)
	privateKeyBytes := raw[0:privacy.Ed25519KeySize]
	privateKeyScalar := new(privacy.Scalar).FromBytesS(privateKeyBytes)

	ciphertextBytes := raw[privacy.Ed25519KeySize:]
	ciphertext := new(hybridencryption.HybridCipherText)
	ciphertext.SetBytes(ciphertextBytes)

	plaintextBytes, err := hybridencryption.HybridDecrypt(ciphertext, privateKeyScalar)
	if err != nil {
		return "", err
	}
	return b64.EncodeToString(plaintextBytes), nil
}

func ScalarMultBase(args string) (string, error) {
	scalar, err := b64.DecodeString(args)
	if err != nil {
		return "", err
	}

	point := new(privacy.Point).ScalarMultBase(new(privacy.Scalar).FromBytesS(scalar))
	res := b64.EncodeToString(point.ToBytesS())
	return res, nil
}

func RandomScalars(args string) (string, error) {
	num, err := strconv.ParseUint(args, 10, 64)
	if err != nil {
		return "", nil
	}

	var scalars []byte
	for i := 0; i < int(num); i++ {
		scalars = append(scalars, privacy.RandomScalar().ToBytesS()...)
	}

	res := b64.EncodeToString(scalars)
	return res, nil
}

func GetSignPublicKey(args string) (string, error) {
	raw := []byte(args)
	var holder struct {
		Data struct {
			Sk string `json:"privateKey"`
		} `json:"data"`
	}

	err := json.Unmarshal(raw, &holder)
	if err != nil {
		println("Error can not unmarshal data : %v\n", err)
		return "", err
	}
	privateKey := holder.Data.Sk
	keyWallet, err := wallet.Base58CheckDeserialize(privateKey)
	if err != nil {
		return "", errors.Errorf("Invalid private key")
	}
	senderSK := keyWallet.KeySet.PrivateKey
	sk := new(privacy.Scalar).FromBytesS(senderSK[:HashSize])
	r := new(privacy.Scalar).FromBytesS(senderSK[HashSize:])
	sigKey := new(privacy.SchnorrPrivateKey)
	sigKey.Set(sk, r)
	sigPubKey := sigKey.GetPublicKey().GetPublicKey().ToBytesS()

	return hex.EncodeToString(sigPubKey), nil
}

func SignPoolWithdraw(args string) (string, error) {
	raw := []byte(args)
	var holder struct {
		Data struct {
			Sk             string `json:"privateKey"`
			Amount         string `json:"amount"`
			PaymentAddress string `json:"paymentAddress"`
		} `json:"data"`
	}

	err := json.Unmarshal(raw, &holder)
	if err != nil {
		println("Error can not unmarshal data : %v\n", err)
		return "", err
	}
	privateKey := holder.Data.Sk
	keyWallet, err := wallet.Base58CheckDeserialize(privateKey)
	if err != nil {
		return "", errors.Errorf("Invalid private key")
	}
	senderSK := keyWallet.KeySet.PrivateKey
	sk := new(privacy.Scalar).FromBytesS(senderSK[:HashSize])
	r := new(privacy.Scalar).FromBytesS(senderSK[HashSize:])
	sigKey := new(privacy.SchnorrPrivateKey)
	sigKey.Set(sk, r)

	message := holder.Data.PaymentAddress + holder.Data.Amount
	hashed := common.HashH([]byte(message))
	signature, err := sigKey.Sign(hashed[:])
	if err != nil {
		println(err.Error())
		return "", errors.Errorf("Sign error")
	}

	return hex.EncodeToString(signature.Bytes()), nil
}

// signEncode string, signPublicKeyEncode string, amount string, paymentAddress string
func VerifySign(args string) (bool, error) {
	raw := []byte(args)
	var holder struct {
		Data struct {
			Pk             string `json:"publicKey"`
			Signature      string `json:"signature"`
			Amount         string `json:"amount"`
			PaymentAddress string `json:"paymentAddress"`
		} `json:"data"`
	}
	err := json.Unmarshal(raw, &holder)
	if err != nil {
		println("Error can not unmarshal data : %v\n", err)
		return false, err
	}
	temp, err := hex.DecodeString(holder.Data.Pk)
	if err != nil {
		return false, errors.Errorf("Can not decode sign public key")
	}
	sigPublicKey, err := new(privacy.Point).FromBytesS(temp)
	if err != nil {
		return false, errors.Errorf("Get sigPublicKey error")
	}
	verifyKey := new(privacy.SchnorrPublicKey)
	verifyKey.Set(sigPublicKey)

	temp, err = hex.DecodeString(holder.Data.Signature)
	signature := new(privacy.SchnSignature)
	err = signature.SetBytes(temp)
	if err != nil {
		return false, errors.Errorf("Sig set bytes error")
	}
	message := holder.Data.PaymentAddress + holder.Data.Amount
	hashed := common.HashH([]byte(message))
	res := verifyKey.Verify(signature, hashed[:])

	return res, nil
}

func EstimateTxSize(paramStr string) (int64, error) {
	var err error
	temp := &EstimateTxSizeParam{}
	err = json.Unmarshal([]byte(paramStr), temp)
	if err != nil {
		return -1, err
	}

	size := estimateTxSizeAsBytes(temp)
	result := int64(math.Ceil(float64(size) / 1024))
	return result, nil
}

// VerifySentTx returns the index of the input coin that matches the r in parameters, or -1 if none
func VerifySentTx(paramsJson string) (int64, error) {
	raw := []byte(paramsJson)
	var holder struct {
		Tx             json.RawMessage
		SenderSeal     privacy.SenderSeal
		PaymentAddress privacy.PaymentAddress
	}
	err := json.Unmarshal(raw, &holder)
	if err != nil {
		println(fmt.Sprintf("Error : cannot unmarshal data : %v", err))
		return -1, err
	}
	proof, err := extractTxProof(holder.Tx)
	if err != nil || proof == nil {
		println(err)
		println("proof == nil : ", proof == nil)
		return -1, err
	}
	sentTxIndex, err := getSentCoinIndex(*proof, holder.SenderSeal, holder.PaymentAddress)
	return sentTxIndex, err
}

// VerifyReceivedTx returns the index of the input coin that matches the OTA secret in parameters, or -1 if none
func VerifyReceivedTx(paramsJson string) (int64, error) {
	raw := []byte(paramsJson)
	var holder struct {
		Tx     json.RawMessage
		OTAKey privacy.OTAKey
	}
	err := json.Unmarshal(raw, &holder)
	if err != nil {
		println(fmt.Sprintf("Error : cannot unmarshal data : %v", err))
		return -1, err
	}
	proof, err := extractTxProof(holder.Tx)
	if err != nil || proof == nil {
		println(err)
		println("proof == nil : ", proof == nil)
		return -1, err
	}
	recvTxIndex, err := getReceivedCoinIndex(*proof, holder.OTAKey)
	return recvTxIndex, err
}

func SetShardCount(_ string, num int64) (string, error) {
	common.MaxShardNumber = int(num)
	return "", nil
}

func GenerateBTCMultisigAddress(args string) (string, error) {
	var params struct {
		MasterPubKeys   [][]byte
		NumSigsRequired int
		ChainName       string
		ChainCodeSeed   string
	}
	err := json.Unmarshal([]byte(args), &params)

	masterPubKeys := params.MasterPubKeys
	numSigsRequired := params.NumSigsRequired
	chainParams := &chaincfg.TestNet3Params
	if params.ChainName == "mainnet" {
		chainParams = &chaincfg.MainNetParams
	}
	chainCodeSeed := params.ChainCodeSeed

	if len(masterPubKeys) < numSigsRequired || numSigsRequired < 0 {
		return "", fmt.Errorf("Invalid signature requirement")
	}

	pubKeys := [][]byte{}
	// this Incognito address is marked for the address that received change UTXOs
	if chainCodeSeed == "" {
		pubKeys = masterPubKeys[:]
	} else {
		chainCode := chainhash.HashB([]byte(chainCodeSeed))
		for idx, masterPubKey := range masterPubKeys {
			// generate BTC child public key for this Incognito address
			extendedBTCPublicKey := hdkeychain.NewExtendedKey(chainParams.HDPublicKeyID[:], masterPubKey, chainCode, []byte{}, 0, 0, false)
			extendedBTCChildPubKey, _ := extendedBTCPublicKey.Child(0)
			childPubKey, err := extendedBTCChildPubKey.ECPubKey()
			if err != nil {
				return "", fmt.Errorf("Master BTC Public Key (#%v) %v is invalid - Error %v", idx, masterPubKey, err)
			}
			pubKeys = append(pubKeys, childPubKey.SerializeCompressed())
		}
	}

	// create redeem script for m of n multi-sig
	builder := txscript.NewScriptBuilder()
	// add the minimum number of needed signatures
	builder.AddOp(byte(txscript.OP_1 - 1 + numSigsRequired))
	// add the public key to redeem script
	for _, pubKey := range pubKeys {
		builder.AddData(pubKey)
	}
	// add the total number of public keys in the multi-sig script
	builder.AddOp(byte(txscript.OP_1 - 1 + len(pubKeys)))
	// add the check-multi-sig op-code
	builder.AddOp(txscript.OP_CHECKMULTISIG)

	redeemScript, err := builder.Script()
	if err != nil {
		return "", fmt.Errorf("Could not build script - Error %v", err)
	}

	// generate P2WSH address
	scriptHash := sha256.Sum256(redeemScript)
	addr, err := btcutil.NewAddressWitnessScriptHash(scriptHash[:], chainParams)
	if err != nil {
		return "", fmt.Errorf("Could not generate address from script - Error %v", err)
	}
	addrStr := addr.EncodeAddress()

	return addrStr, nil
}

func CreateOTAReceiver(paramStr string) (string, error) {
	kw, err := wallet.Base58CheckDeserialize(paramStr)
	if err != nil {
		return "", err
	}

	var recv privacy.OTAReceiver
	err = recv.FromAddress(kw.KeySet.PaymentAddress)
	if err != nil {
		return "", err
	}
	return recv.String()
}
