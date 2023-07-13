const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const bn = require('bn.js');
chai.use(require('chai-bn')(bn));
const { setup } = require('./setup');
const { PRVIDSTR } = require('incognito-chain-web-js');

let generateBTCShieldingAddress = (incAddress, chainName) => async function () {
    console.log("Generate BTC Shielding Address For Inc Payment Address:", incAddress)
    let portal = this.inc.NewPortal(chainName)
    let btcAddress = await portal.generateBTCMultisigAddress(incAddress)
    console.log("BTC Address:", btcAddress)
}

let sendUnshieldingRequest = (tokenID, unshieldAmount, remoteAddress) => async function () {
    let fee = 100
    try {
        result = await this.transactors[0].unshieldPortal({
            transfer: { fee, tokenID },
            extra: { unshieldAmount, remoteAddress },
        })
        console.log("TxHash:", result.Hash)
    } catch (e) {
        console.log("Error when sending unshielding request:", e)
        throw e
    }
}

describe.skip('Portal V4 Tests', async function () {
    before(setup())
    let incAddress = '12svfkP6w5UDJDSCwqH978PvqiqBxKmUnA9em9yAYWYJVRv7wuXY1qhhYpPAm4BDz2mLbFrRmdK3yRhnTqJCZXKHUmoi7NV83HCH2YFpctHNaDdkSiQshsjw2UFUuwdEvcidgaKmF3VJpY5f8RdN'
    let chainName = 'testnet'
    it('generate bitcoin shielding address ICO testnet', generateBTCShieldingAddress(incAddress, chainName))
    let unshieldAmount = 100000
    let remoteAddress = 'mxQAt2EJGrGJHtozUXmWMMFsFnBtfZD4ia'
    let unshieldingTokenID = 'ef5947f70ead81a76a53c7c8b7317dd5245510c665d3a13921dc9a581188728b'
    it('generate unshielding request', sendUnshieldingRequest(unshieldingTokenID, unshieldAmount, remoteAddress))
})

let createInscribeRequest = (tokenID, data) => async function () {
    let fee = 100
    try {
        result = await this.transactors[0].createAndSendInscribeRequestTx({
            transfer: {},
            extra: { data },
        })
        console.log("TxHash:", result.Hash)
    } catch (e) {
        console.log("Error when sending inscribe request:", e)
        throw e
    }
}

describe('Portal V4 Tests', async function () {
    before(setup())
    let incAddress = '12svfkP6w5UDJDSCwqH978PvqiqBxKmUnA9em9yAYWYJVRv7wuXY1qhhYpPAm4BDz2mLbFrRmdK3yRhnTqJCZXKHUmoi7NV83HCH2YFpctHNaDdkSiQshsjw2UFUuwdEvcidgaKmF3VJpY5f8RdN'
    let chainName = 'testnet';

    let dataobj = { a: 1, b: 2, c: 3 };
    it('generate unshielding request', createInscribeRequest(PRVIDSTR, JSON.stringify(dataobj)));
})