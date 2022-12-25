const { Wallet, Transactor : AccountWallet, constants, utils, KeyWallet } = require('../');
const { generateCommitteeKeyFromHashPrivateKey, generateBLSPubKeyB58CheckEncodeFromSeed, base58CheckDecode: checkDecode, base58CheckEncode : checkEncode, hashSha3BytesToBytes, convertHashToStr } = utils;

async function TestCommitteeKey(){
    let candidateHashPrivateKey = "1EbKxc6Lx7LHAXofQKBVjvDsYXWus9DeVhyNrpNYourT4mNHbr";
    let candidatePaymentAddress = "12RrmgZh54apuNWUQJKuUuwjme14xtWE6s5bW6oEk1gx2etUt4TvDVPhoREveBnogdeQTeBLYifcBqBAvNcEU8yFydhX267VF5PG2K1";

    let keyWallet = KeyWallet.base58CheckDeserialize(candidatePaymentAddress);
    
    let publicKeyBytes = keyWallet.KeySet.PaymentAddress.Pk;
    console.log("publicKeyBytes: ", publicKeyBytes.join(" "));

    let candidateHashPrivateKeyBytes = checkDecode(candidateHashPrivateKey).bytesDecoded;

    console.log("generateCommitteeKeyFromHashPrivateKey")
    let committeeKey = await generateCommitteeKeyFromHashPrivateKey(candidateHashPrivateKeyBytes, publicKeyBytes);
    console.log("committeeKey: ", committeeKey);
}

async function TestBLSPubKey(){
    let seed = "1EbKxc6Lx7LHAXofQKBVjvDsYXWus9DeVhyNrpNYourT4mNHbr";
    let blsPubKey = await generateBLSPubKeyB58CheckEncodeFromSeed(seed);
    console.log("blsPubKey: ", blsPubKey);
}

// TestBLSPubKey()

module.exports = {
    TestCommitteeKey,
    TestBLSPubKey
}