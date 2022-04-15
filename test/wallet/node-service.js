const { instance: rpcNodeMonitor } = require("./rpcNodeMonito");
const { RpcClient } = require('../..')
const { SERVICE } = require("./constants");

async function getNodeStatus(validatorPublicKey) {
    let body = {
        "mpk": validatorPublicKey
    }
    let response = await rpcNodeMonitor.post('pubkeystat/stat', body)
    if (response) {
        return response[0]
    }
}
async function getNodeReward(paymentAddress) {
    let reward = 0
    try {
        const rpc = new RpcClient(SERVICE.fullNode);
        const result = await rpc.getRewardAmount(paymentAddress);
        if (result && result?.rewards && result?.rewards?.PRV) {
            reward = result?.rewards?.PRV
        }
    } catch (error) {
        console.log('getNodeReward error: ', error)
    }
    return reward;
}

module.exports = {
    getNodeStatus,
    getNodeReward,
}