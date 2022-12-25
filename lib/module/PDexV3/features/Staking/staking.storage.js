import Validator from "@lib/utils/validator";
import {STORAGE_KEYS} from "@lib/module/PDexV3/features/Staking/staking.constants";

function getKeyStorageStakingTxs () {
    const address = this.getPaymentKey()
    new Validator("getKeyStorageStakingTxs-address", address).required().string();
    return `${STORAGE_KEYS.STAKING}-${address}`;
}

async function getStorageStakingTxs() {
    const key = this.getKeyStorageStakingTxs();
    return (await this.getStorage(key)) || [];
}

async function setStorageStakingTxs (params) {
    const key = this.getKeyStorageStakingTxs();
    if (Array.isArray(params)) {
        await this.setStorage(key, params)
        return;
    }
    const {
        isStaking,
        requestTx,
        status,
        tokenId,
        nftId,
        amount,
        requestTime
    } = params;
    new Validator('setStorageStakingTxs-isStaking', isStaking).boolean();
    new Validator('setStorageStakingTxs-requestTx', requestTx).required().string();
    new Validator('setStorageStakingTxs-status', status).required().number();
    new Validator('setStorageStakingTxs-tokenId', tokenId).required().string();
    // nftId will be deprecated
    if (nftId) new Validator('setStorageStakingTxs-nftId', nftId).required().string();
    new Validator('setStorageStakingTxs-amount', amount).required().amount();
    new Validator('setStorageStakingTxs-requestTime', requestTime).required().number();
    const txs = (await this.getStorageStakingTxs()) || [];
    txs.push(params)
    await this.setStorage(key, txs)
}

export default ({
    getKeyStorageStakingTxs,
    getStorageStakingTxs,
    setStorageStakingTxs
})
