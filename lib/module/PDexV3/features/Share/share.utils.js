import Validator from "@lib/utils/validator";
import { PDEX_TRANSACTION_TYPE } from "@lib/module/Account";

export const checkWithdrawableContribute = (item) => {
    new Validator("formatContributeReward-item", item).object().required();
    const { rewards, orderRewards, versionTx } = item;
    let allRewardValue =
        Object.values(rewards || {})
    if (versionTx !== PDEX_TRANSACTION_TYPE.ACCESS_ID) {
        allRewardValue = allRewardValue.concat(Object.values(orderRewards || {}))
    }
    const withdrawable = allRewardValue.some(
        (reward) => reward && reward > 0
    );
    return withdrawable;
};