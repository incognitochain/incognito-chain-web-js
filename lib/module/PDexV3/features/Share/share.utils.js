import Validator from "@lib/utils/validator";
import isEmpty from "lodash/isEmpty";

export const checkWithdrawableContribute = (item) => {
    new Validator("formatContributeReward-item", item).object().required();
    const { rewards, orderRewards, versionTx } = item;
    let allRewardValue =
        Object.values(rewards || {})
    // if (versionTx !== PDEX_TRANSACTION_TYPE.ACCESS_ID) {
    //     allRewardValue = allRewardValue.concat(Object.values(orderRewards || {}))
    // }
    allRewardValue = allRewardValue.concat(Object.values(orderRewards || {}))
    const withdrawable = allRewardValue.some(
        (reward) => reward && reward > 0
    );
    return withdrawable;
};

//  Group accessOTA order rewards auto withdraw to one value
//  All Liquidity added by accessOTA no need group
export const groupAccessOTAShare = (accessOTAShare = []) => {
    const orderRewardFiltered = [];

    // filter data to 2 groups array
    let { orderRewardGroup, accessOTALPGroup } = accessOTAShare.reduce((prev, curr) => {
        const { share, orderRewards } = curr;
        const { orderRewardGroup, accessOTALPGroup } = prev;
        const isOrderReward = !share && !isEmpty(orderRewards);
        if (isOrderReward) {
            orderRewardGroup.push(curr);
        } else {
            accessOTALPGroup.push(curr);
        }
        return { orderRewardGroup, accessOTALPGroup };
    }, { orderRewardGroup: [], accessOTALPGroup: [] });

    // mapping order rewards value
    orderRewardGroup.forEach(shareItem => {
        const { poolId } = shareItem;
        const index = orderRewardFiltered.findIndex(item => item.poolId === poolId);
        if (index === -1) {
            orderRewardFiltered.push(shareItem);
        } else {
            let currShare = orderRewardFiltered[index];
            Object.keys(shareItem.orderRewards || {})
                .forEach(currShareKey => {
                        const newShareOrderRewardValue = shareItem.orderRewards[currShareKey] || 0;
                        const currentOrderRewardValue = currShare.orderRewards[currShareKey] || 0;
                        currShare.orderRewards = {
                            ...currShare.orderRewards,
                            [currShareKey]: newShareOrderRewardValue + currentOrderRewardValue,
                        }
                    }
                );
        }
    })
    return [...orderRewardFiltered, accessOTALPGroup];
}