package tx

import (
    "encoding/json"

    "errors"
    "incognito-chain/common"
    "incognito-chain/privacy"
)

// DeserializeTransactionJSON parses a transaction from raw JSON into a TxChoice object.
// It covers all transaction types.
func ExtractTxProof(data json.RawMessage) (*privacy.ProofV2, error) {
    var holder struct {
        Proof       *privacy.ProofV2 `json:"Proof,omitempty"`
        TxTokenData string           `json:"PrivacyCustomTokenData,omitempty"`
    }
    err := json.Unmarshal(data, &holder)
    if err != nil {
        return nil, err
    }
    if len(holder.TxTokenData) > 10 {
        // tx token ver 2
        innerHolder := struct {
            TxNormal struct {
                Proof *privacy.ProofV2 `json:"Proof,omitempty"`
            }
        }{}
        err := json.Unmarshal([]byte(holder.TxTokenData), &innerHolder)
        return innerHolder.TxNormal.Proof, err
    } else if holder.Proof != nil {
        // tx ver 2
        return holder.Proof, err
    }
    return nil, errors.New("Cannot extract proof : unrecognized transaction format")
}

func GetSentCoinIndex(proof privacy.ProofV2, seal privacy.SenderSeal, paymentAddress privacy.PaymentAddress) (int64, error) {
    publicOTA := paymentAddress.GetOTAPublicKey()
    publicSpend := paymentAddress.GetPublicSpend()
    rK := (&privacy.Point{}).ScalarMult(publicOTA, seal.GetR())
    hash := privacy.HashToScalar(append(rK.ToBytesS(), common.Uint32ToBytes(seal.GetIndex())...))
    HrKG := (&privacy.Point{}).ScalarMultBase(hash)
    recomputedPublicKey := (&privacy.Point{}).Add(HrKG, publicSpend)
    for currentCoinIndex, c := range proof.GetOutputCoins() {
        theCoin, ok := c.(*privacy.CoinV2)
        if !ok {
            continue
        }
        if privacy.IsPointEqual(theCoin.GetPublicKey(), recomputedPublicKey) {
            return int64(currentCoinIndex), nil
        }
    }
    return -1, nil
}

func GetReceivedCoinIndex(proof privacy.ProofV2, otaKey privacy.OTAKey) (int64, error) {
    otaSecret := otaKey.GetOTASecretKey()
    publicSpend := otaKey.GetPublicSpend()
    if otaSecret == nil || publicSpend == nil {
        return -1, errors.New("Error: invalid OTA Key")
    }
    for currentCoinIndex, c := range proof.GetOutputCoins() {
        theCoin, ok := c.(*privacy.CoinV2)
        if !ok {
            continue
        }
        index := uint32(0)
        _, Rpoint, index, err := theCoin.GetTxRandomDetail()
        if err != nil {
            return -1, errors.New("Error: invalid TxRandom in coin")
        }
        rK := (&privacy.Point{}).ScalarMult(Rpoint, otaSecret)
        hash := privacy.HashToScalar(append(rK.ToBytesS(), common.Uint32ToBytes(index)...))
        HrKG := (&privacy.Point{}).ScalarMultBase(hash)
        recomputedPublicKey := (&privacy.Point{}).Add(HrKG, publicSpend)
        if privacy.IsPointEqual(theCoin.GetPublicKey(), recomputedPublicKey) {
            return int64(currentCoinIndex), nil
        }
    }
    return -1, nil
}
