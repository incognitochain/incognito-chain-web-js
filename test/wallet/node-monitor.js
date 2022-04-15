const {
    setupMulAccounts,
    PRIVACY_VERSION,
    FeePerTx,
    PRV_ID,
} = require("./constants")
const { PRIVATE_ACCOUNTS } = require("./setup.constants");
const { getNodeStatus, getNodeReward } = require("./node-service");
const bn = require("bn.js");
let senders;
let authToken;

async function setup() {
    const data = await setupMulAccounts({ accounts: PRIVATE_ACCOUNTS });
    senders = data.senders;
    authToken = data.authToken;
}

async function GetNodeRewards() {
    let rewards = [];
    try {
        const tasks = senders.map(async ({ accountSender, name }) => {
            const { BLSPublicKey, PaymentAddress } = await accountSender.getDeserializeInformation();
            const [status, reward] = await Promise.all([
                await getNodeStatus(BLSPublicKey),
                await getNodeReward(PaymentAddress)
            ])
            console.log("=====> " + name);
            console.log(status)
            console.log({
                Status: status.Status,
                Role: status.Role,
                NextEventMsg: status.NextEventMsg,
                IsOldVersion: status.IsOldVersion,
                Reward: reward / 1e9,
                AutoStake: status.AutoStake,
                IsSlashed: status.IsSlashed
            })
            return {
                accountSender,
                name,
                reward,
                autoStake: status.AutoStake,
                isSlashed: status.IsSlashed
            }
        })
        rewards = await Promise.all(tasks)
    } catch (error) {
        console.log('GetNodeRewards error: ', error);
    }
    return rewards
}

async function WithdrawNodeRewards(accounts) {
    const logs = []
    try {
        for (let i = 0; i <= accounts.length - 1; i++) {
            const account = accounts[i];
            const { accountSender, reward, name } = account;
            console.log({ reward, name })
            if (reward > 0) {
                 const tx = await accountSender.createAndSendWithdrawRewardTx({
                    transfer: { fee: FeePerTx, tokenID: PRV_ID },
                    extra: { version: PRIVACY_VERSION },
                });
                logs.push({
                    reward,
                    name,
                    tx
                })
            }
        }
        console.log(logs);
    } catch (error) {
        console.log('WithdrawNodeRewards error: ', error)
    }
}

async function CreateAndSendStakeNodes(accounts) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    })
    for (let i = 0; i <= accounts.length - 1; i++) {
        const account = accounts[i];
        const { autoStake, name } = account;
        if (!autoStake) {
            console.log('Unstaked name ===> ', name)
        }
    }
    const logs = []
    let _input = '';
    readline.question(
        `Enter your node name to restake: \n`,
        async input => {
            console.log()
            _input = input;
            console.log('_input: ', _input)
            if (!_input || !_input.trim()) return readline.close();
            _input = _input.trim();
            for (let i = 0; i <= accounts.length - 1; i++) {
                const account = accounts[i];
                const { accountSender, name } = account;

                // Check stake exact account name
                if (_input.toLowerCase().includes(name.toLowerCase())) {
                    const prvBalance = await accountSender.getBalance({ tokenID: PRV_ID, version: PRIVACY_VERSION });
                    const minBalance = 1750000000100;
                    if (new bn(prvBalance).gt(new bn(minBalance))) {
                        console.log(prvBalance)
                        const tx = await accountSender.createAndSendStakingTx({
                            transfer: { fee: FeePerTx},
                            extra: { version: PRIVACY_VERSION },
                        });
                        logs.push({
                            name,
                            tx
                        })
                    }
                }
            }
            console.log(logs);
            readline.close()
        })
}

async function ActionsWithNode(accounts) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    })
    let fn;
    let params;
    console.log('\n========================\n')
    console.log('What do you want to do?');
    console.log('1: Withdraw all rewards');
    console.log('2: Stake your node');
    console.log('3: Cancel')
    console.log('\n========================\n')
    readline.question(
        ``,
        action => {
            switch (action) {
                case '1':
                    fn = WithdrawNodeRewards;
                    params = accounts;
                    break;
                case '2':
                    readline.close()
                    fn = CreateAndSendStakeNodes;
                    params = accounts;
                    break;
                default:
                    break;
            }
            if (typeof fn === 'function') {
                fn(params)
            }
            readline.close()
    })
}

async function RunNodeScript() {
    const nodeAccounts = await GetNodeRewards();
    await ActionsWithNode(nodeAccounts);
}

async function RunTest() {
    console.log("BEGIN WEB PDEX3 TEST");
    await setup();
    await RunNodeScript();
}

RunTest()