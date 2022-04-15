const {
    setupMulAccounts,
    PRIVACY_VERSION,
    FeePerTx,
    PRV_ID,
} = require("./constants")
const { PRIVATE_ACCOUNTS } = require("./setup.constants");
const { getNodeStatus, getNodeReward } = require("./node-service");
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
            console.log({
                Status: status.Status,
                Role: status.Role,
                NextEventMsg: status.NextEventMsg,
                IsOldVersion: status.IsOldVersion,
                Reward: reward / 1e9
            })
            return {
                accountSender,
                name,
                reward
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
    const logs = []
    let _input = ''
    readline.question(
        `Enter your node name to restake: \n`,
        input => {
            _input = input;
        })
    if (!_input || !_input.trim()) return;
    _input = _input.trim();
    try {
        for (let i = 0; i <= accounts.length - 1; i++) {
            const account = accounts[i];
            const { accountSender, reward, name } = account;

            // Check stake exact account name
            if (_input.toLowerCase().includes(name.toLowerCase())) {
                const prvBalance = await accountSender.getBalance({ tokenID: PRV_ID, version: PRIVACY_VERSION });
                console.log(prvBalance)
            }
            // console.log({ reward, name })
            // if (reward > 0) {
            //     const tx = await accountSender.createAndSendWithdrawRewardTx({
            //         transfer: { fee: FeePerTx, tokenID: PRV_ID },
            //         extra: { version: PRIVACY_VERSION },
            //     });
            //     logs.push({
            //         reward,
            //         name,
            //         tx
            //     })
            // }
        }
        console.log(logs);
    } catch (error) {
        console.log('WithdrawNodeRewards error: ', error)
    }
}

async function ActionsWithNode(accounts) {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    })
    let fn;
    let params;
    console.log('\n======================== \n')
    readline.question(
        `What do you want to do? \n1: Withdraw all rewards \n2: Stake your node\n3: Cancel\n\n========================\n`,
        action => {
            switch (action) {
                case '1':
                    fn = WithdrawNodeRewards;
                    params = accounts;
                    break;
                case '2':
                    fn = CreateAndSendStakeNodes;
                    params = accounts;
                    console.log('SANG TEST::: 2')
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