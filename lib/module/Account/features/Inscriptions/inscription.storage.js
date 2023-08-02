import { INSCRIPTIONS_STORAGE_KEY } from "@lib/module/Account/features/Inscriptions/inscription.constants";
import Validator from "@lib/utils/validator";

function getStorageHistoryKey() {
    try {
        const fullNode = this.rpc.rpcHttpService.url;
        new Validator("getStorageHistoryKey-fullNode", fullNode)
            .required()
            .string();
        const otaKey = this.getOTAKey();
        return `${otaKey}${fullNode}${INSCRIPTIONS_STORAGE_KEY.INSCRIPTIONS_HISTORY}`
    } catch (error) {
        throw error;
    }
}

async function setInscriptionsHistory(historyData) {
    const key = this.getStorageHistoryKey();
    const historyList = await this.getAccountStorage(key) || [];
    const newHistoryList = [historyData, ...historyList]
    await this.setAccountStorage(key, newHistoryList)
}

async function getInscriptionsHistory() {
    const key = this.getStorageHistoryKey();
    const historyList = await this.getAccountStorage(key) || [];
    return historyList
}


export default {
    getStorageHistoryKey,
    setInscriptionsHistory,
    getInscriptionsHistory
}