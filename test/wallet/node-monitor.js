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

const LCERROR = '\x1b[31m%s\x1b[0m'; //red
const LCWARN = '\x1b[33m%s\x1b[0m'; //yellow
const LCINFO = '\x1b[36m%s\x1b[0m'; //cyan
const LCSUCCESS = '\x1b[32m%s\x1b[0m'; //green

const logger = class {
    static error(message, ...optionalParams) { console.error(LCERROR, message, ...optionalParams) }
    static warn(message, ...optionalParams) { console.warn(LCWARN, message, ...optionalParams) }
    static info(message, ...optionalParams) { console.info(LCINFO, message, ...optionalParams) }
    static success(message, ...optionalParams) { console.info(LCSUCCESS, message, ...optionalParams) }
}

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
            logger.info(`=====> ${name}`);
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

        for (let i = 0; i <= rewards.length - 1; i++) {
            const account = rewards[i];
            const { autoStake, name, isSlashed } = account;
            if (!autoStake || isSlashed) {
                if (i === 0) {
                    console.log('\n========================')
                }
                logger.warn(`Unstaked name ===> ${name}`);
            }
        }
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
    let counter = 0;
    for (let i = 0; i <= accounts.length - 1; i++) {
        const account = accounts[i];
        const { autoStake, name } = account;
        if (!autoStake) {
            logger.error(`Unstaked =====> ${name}`);
            ++counter;
        }
    }

    console.log('\n========================\n')

    if (counter === 0) {
        logger.warn('hmmm, look like all nodes have been staked');
        return;
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
    logger.info('What do you want to do?');
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
    console.log("BEGIN START NODE MONITOR");
    await setup();
    await RunNodeScript();
}

RunTest()