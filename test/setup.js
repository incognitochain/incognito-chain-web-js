const chai = require('chai');
const expect = chai.expect;
const bn = require('bn.js');
chai.use(require('chai-bn')(bn));
const inc = require('..');

let setup = () => async function() {
    await require('../inc.config');
    let resp = {};
    try {
        resp = await inc.rpc.listTokens();
    } catch(e) {
        console.error(e);
        console.warn('Could not get token list. Maybe check your node endpoints')
    }
    this.incTokens = resp.listPrivacyToken;

    let bal = await senders[0].getBalance({tokenID: inc.constants.PRVIDSTR, version: 2});
    expect(bal).bignumber.that.is.at.least('1000000000');
    // fund other accounts if needed
    bal = await senders[1].getBalance({tokenID: inc.constants.PRVIDSTR, version: 2});
    bal = new bn(bal);
    if (bal.ltn(3000000)) {
        console.log(`Funding address ${addresses[1]}`);
        const b = await inc.Tx(senders[0]).to(addresses[1], '300000000').to(addresses[2], '300000000').send();
        await senders[1].waitTx(b.result.txId, 2);
    }
}

module.exports = {
    setup,
    expect,
    bn,
}