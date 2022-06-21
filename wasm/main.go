//+build linux,386 wasm

package main

import (
	"gobridge"
	internal "incognito-chain"
)

func main() {
	c := make(chan struct{}, 0)

	gobridge.RegisterCallback("createTransaction", internal.CreateTransaction)
	// gobridge.RegisterCallback("createConvertTx", internal.CreateConvertTx)

	gobridge.RegisterCallback("newKeySetFromPrivate", internal.NewKeySetFromPrivate)
	gobridge.RegisterCallback("decryptCoin", internal.DecryptCoin)
	gobridge.RegisterCallback("decryptCoinList", internal.DecryptCoinList)
	gobridge.RegisterCallback("createCoin", internal.CreateCoin)
	gobridge.RegisterCallback("generateBLSKeyPairFromSeed", internal.GenerateBLSKeyPairFromSeed)
	gobridge.RegisterCallback("hybridEncrypt", internal.HybridEncrypt)
	gobridge.RegisterCallback("hybridDecrypt", internal.HybridDecrypt)

	// compat
	// gobridge.RegisterCallback("initPrivacyTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("staking", internal.CreateTransaction)
	// gobridge.RegisterCallback("stopAutoStaking", internal.CreateTransaction)
	// gobridge.RegisterCallback("initPrivacyTokenTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("initBurningRequestTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("initWithdrawRewardTx", internal.CreateTransaction)

	gobridge.RegisterCallback("generateKeyFromSeed", internal.GenerateKeyFromSeed)
	// gobridge.RegisterCallback("scalarMultBase", internal.ScalarMultBase)
	// gobridge.RegisterCallback("randomScalars", internal.RandomScalars)
	// gobridge.RegisterCallback("getSignPublicKey", internal.GetSignPublicKey)
	// gobridge.RegisterCallback("signPoolWithdraw", internal.SignPoolWithdraw)
	// gobridge.RegisterCallback("verifySign", internal.VerifySign)
	// // gobridge.RegisterCallback("generateBLSKeyPairFromSeed", internal.GenerateBLSKeyPairFromSeed)
	// gobridge.RegisterCallback("initPRVContributionTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("initPTokenContributionTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("initPRVTradeTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("initPTokenTradeTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("withdrawDexTx", internal.CreateTransaction)
	// gobridge.RegisterCallback("hybridEncryptionASM", internal.HybridEncrypt)
	// gobridge.RegisterCallback("hybridDecryptionASM", internal.HybridDecrypt)
	// gobridge.RegisterCallback("estimateTxSize", internal.EstimateTxSize)

	// gobridge.RegisterCallback("verifySentTx", internal.VerifySentTx)
	// gobridge.RegisterCallback("verifyReceivedTx", internal.VerifyReceivedTx)
	gobridge.RegisterCallback("setShardCount", internal.SetShardCount)
	gobridge.RegisterCallback("setCfg", internal.SetConfigs)
	gobridge.RegisterCallback("createOTAReceiver", internal.CreateOTAReceiver)
	// not applicable
	// gobridge.RegisterCallback("deriveSerialNumber", internal.DeriveSerialNumber)

	// portal
	// gobridge.RegisterCallback("generateBTCMultisigAddress", internal.GenerateBTCMultisigAddress)

	println("WASM loading finished")
	<-c
}
