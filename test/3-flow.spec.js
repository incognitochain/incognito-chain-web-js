const inc = require('..');
const { setup, expect, bn } = require('./setup');

let loadLegacyTests = (...filenames) => async function() {
    // require = require("esm")(module);
    this.legacyTests = {};
    filenames.forEach(f => {
        const m = require(f);
        Object.assign(this.legacyTests, m);
    })
}

describe('Basic Tests for Web-js module', async function() {
    before(setup());
    before(loadLegacyTests('./wallet/basic-test', './wallet/wallet-test', './wallet/hdwallet-test', './committeekey-test', './identicon-test', './rpc/rpc-test', './privacy/hybridenc-test', './privacy/utils-test'));
    describe('Legacy tests', async function() {
        it.skip('main flow', async function() {
            await this.legacyTests.AccountWalletTestSetup(senders[0]);
            await this.legacyTests.MainRoutine();
        });
        it.skip('Defrag flow', async function() {
            await this.legacyTests.DefragmentRoutine();
        })
        it('Wallet creation/import tests', async function() {
            await this.legacyTests.TestInitWallet();
            await this.legacyTests.TestImportWallet();
            await this.legacyTests.TestImportAccount();
            await this.legacyTests.TestKeyWallet();
            await this.legacyTests.TestGetKeySetFromPrivateKeyStr();
        })
        it('Committee key tests', async function() {
            await this.legacyTests.TestCommitteeKey();
            await this.legacyTests.TestBLSPubKey();
        })
        it('RPC tests (to Incognito node)', async function() {
            await this.legacyTests.TestIdenticon(inc.rpc);
            await this.legacyTests.TestGetBurningAddress(inc.rpc);
            await this.legacyTests.TestGetListPrivacyToken(inc.rpc);
            await this.legacyTests.TestGetExchangeRatePToken(inc.rpc);
        })
        it('Privacy function tests', async function() {
            await this.legacyTests.TestHybridEncryption();
            await this.legacyTests.TestConvertStringAndBytesArray();
        })
    })
})
