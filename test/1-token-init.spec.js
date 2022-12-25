const inc = require('..');
const { setup, expect, bn } = require('./setup');

describe('Test create (custom) & transfer token', async function() {
    before(setup());
    describe('init token', async function() {
        const testAmounts = [400000, 200000, 100];
        it('should create new token & see balance update', async function() {
            global.testingTokens = [];
            amount = new bn(testAmounts[0]).toString();
            let b = await inc.Tx(senders[0]).to(addresses[0], amount).newToken("My New Token", "MNT").send();
            let id = b.getNewTokenID(b.result);
            console.log(`after creation, wait balance change for token ${id}, address ${addresses[0]}`);

            let change = await senders[0].waitBalanceChange(id); // assume getBalance() resolves instantly
            change = new bn(change.balance).sub(new bn(change.oldBalance));
            this.newTokenID = id;
            global.testingTokens[0] = id;
            await expect(change, "Created Token balance mismatch").to.bignumber.equal(amount);

            b = await inc.Tx(senders[0]).to(addresses[1], amount).newToken("My New Token 2", "MN2").send();
            id = b.getNewTokenID(b.result);
            console.log(`after creation, wait balance change for token ${id}, address ${addresses[1]}`);
            change = await senders[1].waitBalanceChange(id);
            change = new bn(change.balance).sub(new bn(change.oldBalance));
            global.testingTokens[1] = id;
            await expect(change, "Created Token balance mismatch").to.bignumber.equal(amount);
        });

        it('should send some new token to the same shard', async function() {
            amount = new bn(testAmounts[1]).toString();
            await inc.Tx(senders[0]).withTokenID(this.newTokenID).to(addresses[1], amount).withInfo("TOKEN TRANSFER").send();
            console.log(`after same-shard transfer, wait balance change for token ${this.newTokenID}, address ${addresses[1]}`);
            let change = await senders[1].waitBalanceChange(this.newTokenID);
            change = new bn(change.balance).sub(new bn(change.oldBalance));
            await expect(change, "Transferred Token balance mismatch").to.bignumber.equal(amount);
        });

        it('should send some new token to another shard', async function() {
            amount = new bn(testAmounts[2]).toString();
            await inc.Tx(senders[0]).withTokenID(this.newTokenID).to(addresses[2], amount).withFee(40).withInfo("CROSS-SHARD TOKEN TRANSFER").send();
            console.log(`after cross-shard transfer, wait balance change for token ${this.newTokenID}, address ${addresses[2]}`);
            let change = await senders[2].waitBalanceChange(this.newTokenID);
            change = new bn(change.balance).sub(new bn(change.oldBalance));
            await expect(change, "Transferred Token balance mismatch").to.bignumber.equal(amount);
        });
    });
})