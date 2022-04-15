const {
    setupMulAccounts,
} = require("./constants")
const { PRIVATE_ACCOUNTS } = require("./setup.constants");
const bn = require('bn.js')
const { getNodeStatus, getNodeReward } = require("./node-service");
let senders;
let authToken;

async function setup() {
    const data = await setupMulAccounts({ accounts: PRIVATE_ACCOUNTS });
    senders = data.senders;
    authToken = data.authToken;
}

async function humanAmount({ amount, pDecimal = 9 } = {}) {
    return new bn(amount).div((new bn(1)).pow(new bn(pDecimal))).toString();
}

async function GetNodeRewards() {
    try {
        const tasks = senders.map(async ({ accountSender, name }) => {
            const { BLSPublicKey, PaymentAddress } = await accountSender.getDeserializeInformation();
            const [status, reward] = await Promise.all([
                await getNodeStatus(BLSPublicKey),
                await getNodeReward(PaymentAddress)
            ])
            console.log("=====> " + name);
            console.log({
                Status: status.Status,
                Role: status.Role,
                NextEventMsg: status.NextEventMsg,
                IsOldVersion: status.IsOldVersion,
                Reward: humanAmount({ amount: reward, pDecimal: 9 })
            })
        })

        await Promise.all(tasks)
    } catch (error) {
        console.log('GetNodeRewards error: ', error);
    }
}

async function RunTest() {
    console.log("BEGIN WEB PDEX3 TEST");
    await setup();
    await GetNodeRewards();
}

RunTest()