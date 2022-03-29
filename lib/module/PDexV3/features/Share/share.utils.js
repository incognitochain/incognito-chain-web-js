import Validator from "@lib/utils/validator";

export const checkWithdrawableContribute = (item) => {
    new Validator("formatContributeReward-item", item).object().required();
    const { rewards, orderRewards } = item;
    const allRewardValue =
        Object.values(rewards || {})
            .concat(Object.values(orderRewards || {}))
    const withdrawable = allRewardValue.some(
        (reward) => reward && reward > 0
    );
    return withdrawable;
};