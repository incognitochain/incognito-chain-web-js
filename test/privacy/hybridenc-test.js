const { Wallet, Transactor : AccountWallet, types, constants, utils, KeyWallet } = require('../../');
const { PaymentAddressType, PRVIDSTR, ENCODE_VERSION } = constants;
const { base58CheckEncode: checkEncode, base58CheckDecode: checkDecode, hybridEncryption, hybridDecryption, base64Decode, bytesToString, stringToBytes } = utils;

// const rpcClient = new RpcClient("https://mainnet.incognito.org/fullnode");
// const rpcClient = new RpcClient("https://test-node.incognito.org");
// const rpcClient = new RpcClient("http://54.39.158.106:20032");
// const rpcClient = new RpcClient("http://172.105.115.134:20004");

async function TestHybridEncryption() {
  // sender key (private key)
  let senderPrivateKeyStr = "112t8rnXDS4cAjFVgCDEw4sWGdaqQSbKLRH1Hu4nUPBFPJdn29YgUei2KXNEtC8mhi1sEZb1V3gnXdAXjmCuxPa49rbHcH9uNaf85cnF3tMw";
  let accountSender = await NewTransactor(senderPrivateKeyStr);
  let publicKeyBytes = accountSender.key.KeySet.PaymentAddress.Tk;
  let msg = [1, 2, 3, 4, 5, 6];
  let ciphertext = await hybridEncryption(publicKeyBytes, msg);
  console.log("ciphertext: ", ciphertext);

  let privateKeyBytes = accountSender.key.KeySet.ReadonlyKey.Rk;
  let plaintext = await hybridDecryption(privateKeyBytes, base64Decode(ciphertext));
  console.log("plaintext: ", plaintext);

  // test case 2:
  let ciphertextEncoded = 'YPAdOA3bgZxO3w4ekluRoMFba4jzIn8XExJMmUBeeuCiXfa/O24iansQ4NXPlyEr9342R2wpYk2j7tyEZoUBnKukMWucGW95MWHchGfuDkbFKvs5P+mz';
  let ciphertextBytes = base64Decode(ciphertextEncoded);
  // let ciphertextEncoded = "1NU3oSLn9hZi5mnpj7odQGpCYZt74y6zKQ36Ee5chEGddGg4fDPCsZZT3NR95ifevbB8Uzqw6pdmhuzZtXWk4kXZUMm1WSWV4TMjS5RBohNEGhHCtHpqrVyh";
  // let ciphertextBytes = checkDecode(ciphertextEncoded).bytesDecoded;
  console.log("ciphertextBytes 2: ", ciphertextBytes);
  console.log("ciphertextBytes 2 len: ", ciphertextBytes.length);
  let plaintext2 = await hybridDecryption(privateKeyBytes, ciphertextBytes);
  console.log("plaintext2: ", bytesToString(plaintext2));
}

// TestHybridEncryption()
module.exports = {
    TestHybridEncryption
}