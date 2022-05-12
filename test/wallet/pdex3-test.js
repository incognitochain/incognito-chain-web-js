const {
    PRV_ID,
    ACCESS_ID,
    PRIVACY_VERSION,
    setupWallet
} = require("./constants")
const {isEmpty, groupBy} = require("lodash");

let wallet;
let accountSender;
let pDexV3Instance;

async function setup() {
    const data = await setupWallet();
    wallet = data.wallet;
    accountSender = data.accountSender;
    pDexV3Instance = data.pDexV3Instance;
}

async function TestGetBalance() {
    try {
        const keyInfo = await accountSender.getKeyInfo({
            version: PRIVACY_VERSION,
        });
        const tokenIDs = [
            PRV_ID,
        ];
        // console.log("KEY INFO", { keyInfo, tokenIDs });
        let task = tokenIDs.map((tokenID) =>
            accountSender.getBalance({
                tokenID,
                version: PRIVACY_VERSION,
            })
        );
        console.log("BALANCE", await Promise.all(task));
    } catch (e) {
        console.log("TestGetBalance error: ", e);
    }
}

async function TestGetBalanceAccessOTA() {
    try {
        const keyInfo = await accountSender.getKeyInfo({
            version: PRIVACY_VERSION,
        });
        console.log("KEY INFO", keyInfo, ACCESS_ID);
        const balance = await accountSender.getBalance({
            tokenID: ACCESS_ID,
            version: PRIVACY_VERSION,
            isNFT: true,
        })
        console.log("BALANCE ACCESS_OTA", balance);
    } catch (e) {
        console.log("TestGetBalance error: ", e);
    }
}

async function TestGetListShare() {
    try {
        const share = await pDexV3Instance.getListShare();
        // const data = [
        //     {
        //         poolId: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-8f6c11f2f2184ee9efcde9dfacc2dab0b438a2d24671ae9c2f8ff9db1d0d28c9',
        //         tokenId1: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 6961,
        //         token2Amount: 5178,
        //         rewards: {},
        //         orderRewards: {
        //             "5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed": 248,
        //             "cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1": 440,
        //         },
        //         share: 0,
        //         amp: 80000,
        //         totalShare: 6003,
        //         currentAccessOta: 'ZIanKy6WHscgo1vT2gTKq9h8gqjWstRGhJ52EchxNA0=',
        //         isMintingNewAccessOta: false,
        //         nftid: '007c99884e4add0533a53c656a06732235ef919f0f941ea61a97986af37147cd111',
        //         nftId: '007c99884e4add0533a53c656a06732235ef919f0f941ea61a97986af37147cd111',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-8f6c11f2f2184ee9efcde9dfacc2dab0b438a2d24671ae9c2f8ff9db1d0d28c9',
        //         tokenId1: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 6961,
        //         token2Amount: 5178,
        //         rewards: {},
        //         orderRewards: {
        //             "5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed": 880,
        //             "cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1": 300,
        //         },
        //         share: 0,
        //         amp: 80000,
        //         totalShare: 6003,
        //         currentAccessOta: 'ZIanKy6WHscgo1vT2gTKq9h8gqjWstRGhJ52EchxNA0=',
        //         isMintingNewAccessOta: false,
        //         nftid: '007c99884e4add0533a53c656a06732235ef919f0f941ea61a97986af37147cd222',
        //         nftId: '007c99884e4add0533a53c656a06732235ef919f0f941ea61a97986af37147cd222',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-db98698df925cefe323c717c2cdc7658ad078854baeb9ab9735a08f20b550349',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 5414,
        //         token2Amount: 8829,
        //         rewards: {},
        //         orderRewards: {
        //             "0000000000000000000000000000000000000000000000000000000000000004": 1000,
        //             "cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1": 300,
        //         },
        //         share: 0,
        //         amp: 80000,
        //         totalShare: 6913,
        //         currentAccessOta: 'n1WZ04BZdUONd/9m7pMvpIILkxlFP8CPVrjXfpufR4M=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'b2ef81e8f576188607d6ab49ed63ae718627bd37da337b966303e25234b782c4111',
        //         nftId: 'b2ef81e8f576188607d6ab49ed63ae718627bd37da337b966303e25234b782c4111',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-db98698df925cefe323c717c2cdc7658ad078854baeb9ab9735a08f20b550349',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 5414,
        //         token2Amount: 8829,
        //         rewards: {},
        //         orderRewards: {
        //             "0000000000000000000000000000000000000000000000000000000000000004": 2000,
        //             "cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1": 300,
        //         },
        //         share: 0,
        //         amp: 80000,
        //         totalShare: 6913,
        //         currentAccessOta: 'n1WZ04BZdUONd/9m7pMvpIILkxlFP8CPVrjXfpufR4M=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'b2ef81e8f576188607d6ab49ed63ae718627bd37da337b966303e25234b782c4222',
        //         nftId: 'b2ef81e8f576188607d6ab49ed63ae718627bd37da337b966303e25234b782c4222',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-8f6c11f2f2184ee9efcde9dfacc2dab0b438a2d24671ae9c2f8ff9db1d0d28c9',
        //         tokenId1: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 6961,
        //         token2Amount: 5178,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 321,
        //         amp: 80000,
        //         totalShare: 6003,
        //         currentAccessOta: 'ZIanKy6WHscgo1vT2gTKq9h8gqjWstRGhJ52EchxNA0=',
        //         isMintingNewAccessOta: false,
        //         nftid: '007c99884e4add0533a53c656a06732235ef919f0f941ea61a97986af37147cd',
        //         nftId: '007c99884e4add0533a53c656a06732235ef919f0f941ea61a97986af37147cd',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-973f87498d343768b6f61169831581f2ae4e5eee13554a67ec767ac7fff70c0f',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         token1Amount: 6670,
        //         token2Amount: 11521,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 1406,
        //         amp: 20000,
        //         totalShare: 8762,
        //         currentAccessOta: 'lMDefBnRh3oAlHz+Hm20D1uq3ctKezXTdaxc714olDc=',
        //         isMintingNewAccessOta: false,
        //         nftid: '02bf707b4295a1cd0d47db348d41932d53a06474fdceb6e5063fdbda076d5ddf',
        //         nftId: '02bf707b4295a1cd0d47db348d41932d53a06474fdceb6e5063fdbda076d5ddf',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-13f2c23ca646c4aacf16d8d5963fced2368d2ba586c9119179939eebb8bf7278',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 8282,
        //         token2Amount: 2804,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 4818,
        //         amp: 90000,
        //         totalShare: 4818,
        //         currentAccessOta: 'jfa1xaFxMrrksSn1dWTWb+D1QGQSInpH8cVEGdPwKlc=',
        //         isMintingNewAccessOta: false,
        //         nftid: '062211be93a5267c553731320bc35f21829801da3a1b38b726cd39a53bf81ce4',
        //         nftId: '062211be93a5267c553731320bc35f21829801da3a1b38b726cd39a53bf81ce4',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-95af55066b426c6bb01010fef3ef5ffad06faee11a101ad1be2fa958413de829',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         token1Amount: 4423,
        //         token2Amount: 13914,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 5247,
        //         amp: 20000,
        //         totalShare: 7840,
        //         currentAccessOta: 'Ofj1xDyqE6H9C/pDzEZuXypD0PLHpWJ2VD9EhDg97bU=',
        //         isMintingNewAccessOta: false,
        //         nftid: '0bde06e2be39344f2c9170ca4ee101bdb27c0e8f8ba56b2ee62e5440baf08c0c',
        //         nftId: '0bde06e2be39344f2c9170ca4ee101bdb27c0e8f8ba56b2ee62e5440baf08c0c',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-5b56cad8fc8b5c38b050dd5f632a935c847f767e3e3789f0ab3a12febb51b0c2',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 11315,
        //         token2Amount: 3832,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 1608,
        //         amp: 40000,
        //         totalShare: 6584,
        //         currentAccessOta: 'mf9qMNpFMHybUxTUWXR2zlRw5XEi2kYDR70k1DAq5+c=',
        //         isMintingNewAccessOta: false,
        //         nftid: '1239e62202b7f2441b5ddee021ed54714b9c15bfddf8c5bfac97e4d40486b378',
        //         nftId: '1239e62202b7f2441b5ddee021ed54714b9c15bfddf8c5bfac97e4d40486b378',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-f6c8ae39b9250ea396d0da2702207c52a43f33c345346b3bb2b8159d6edb10aa',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 8681,
        //         token2Amount: 2991,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 5095,
        //         amp: 90000,
        //         totalShare: 5095,
        //         currentAccessOta: '2dceGkwLiUgSYNXlFyLOk4vYK7FGmmOxIw1c6qIR6Vc=',
        //         isMintingNewAccessOta: false,
        //         nftid: '1c969f75fb7dc26e6e3726ff114eb03e09b8295eb373bbe55b9eff662f3972f1',
        //         nftId: '1c969f75fb7dc26e6e3726ff114eb03e09b8295eb373bbe55b9eff662f3972f1',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-9e78a826f17da8fea6acb7da84ba25abf98f5fabf78e22378b1983601ee0f72b',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 4189,
        //         token2Amount: 5915,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 4977,
        //         amp: 60000,
        //         totalShare: 4977,
        //         currentAccessOta: 'ckeXK2jm0ZucWdtKefa9fVbwxXDdF0iN0/FAaFOywwM=',
        //         isMintingNewAccessOta: false,
        //         nftid: '43c554ac83c2bfa29392167bcf37d4eeb0c69e9d6a8c4fe46a7ec64bd27ea5e0',
        //         nftId: '43c554ac83c2bfa29392167bcf37d4eeb0c69e9d6a8c4fe46a7ec64bd27ea5e0',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-82a65d517cf4dec4e64068c3b3c617b047c34db766b9e8c73c067838c2defe39',
        //         tokenId1: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 16050,
        //         token2Amount: 689,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 1778,
        //         amp: 60000,
        //         totalShare: 3321,
        //         currentAccessOta: 'oQM4zcAt74IohzAVdJNYGB3RrvYGRwsDIm9YeIdyDMM=',
        //         isMintingNewAccessOta: false,
        //         nftid: '4f5e8752225b1e8b2bc04364b6811817ea861d2340a2192b3498054eaa2da1f6',
        //         nftId: '4f5e8752225b1e8b2bc04364b6811817ea861d2340a2192b3498054eaa2da1f6',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-28d77b574e11e89a5f0f25b64dea92bffcc7e064b418f616677d3300e860046b',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 6630,
        //         token2Amount: 12658,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 4418,
        //         amp: 10000,
        //         totalShare: 9158,
        //         currentAccessOta: '39tjO49uM2RPrk00kKbu1tCYWT7xLZFLFdAsd2rlJDE=',
        //         isMintingNewAccessOta: false,
        //         nftid: '5863ac589cdb01b7781ad5fcdb27670a93a49ca94c5eb39d5f6e65055ae73198',
        //         nftId: '5863ac589cdb01b7781ad5fcdb27670a93a49ca94c5eb39d5f6e65055ae73198',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-ddba970e1812c956fc861b76b8f7938460bdf180beff8906fcfbbb12207cfcfc',
        //         tokenId1: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 8693,
        //         token2Amount: 3661,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 4762,
        //         amp: 60000,
        //         totalShare: 5766,
        //         currentAccessOta: 'anQtYDMoBzFjDLy8gQzLizY8cn/qvnGJjK4fp2sWHN0=',
        //         isMintingNewAccessOta: false,
        //         nftid: '80e67e80184187616ed81991f2b37799a1df32398fe28cd13d26cb71747c7485',
        //         nftId: '80e67e80184187616ed81991f2b37799a1df32398fe28cd13d26cb71747c7485',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-e909363731cb0c8daef108063d903aa5b8f3bfb1820bfdad2f0477ae168f0e0e',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 8136,
        //         token2Amount: 8694,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 8130,
        //         amp: 80000,
        //         totalShare: 8409,
        //         currentAccessOta: 'ZqdvU30oVqizyca3fJ8onmzO+EX9jpLvyZpxwLJLZeE=',
        //         isMintingNewAccessOta: false,
        //         nftid: '84e6ae3cf52d38a2ffce6af780b701b2f8682546f8b6589c11a04b7778155024',
        //         nftId: '84e6ae3cf52d38a2ffce6af780b701b2f8682546f8b6589c11a04b7778155024',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-99392c58896581934c2be493bb6c9e1dac4645fe1c0b678721f0c47402bdbec2',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 7426,
        //         token2Amount: 16241,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 4382,
        //         amp: 80000,
        //         totalShare: 10980,
        //         currentAccessOta: 'AZhI1jAuyXwRc/XFX11jXVwz0Pz6gXJa8/8r1TGc3Rk=',
        //         isMintingNewAccessOta: false,
        //         nftid: '97b7bbea1ea3e10c85a7b5b3980ac08cea88082ed8c4e7bd22c2cbe523dce022',
        //         nftId: '97b7bbea1ea3e10c85a7b5b3980ac08cea88082ed8c4e7bd22c2cbe523dce022',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-db98698df925cefe323c717c2cdc7658ad078854baeb9ab9735a08f20b550349',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 5414,
        //         token2Amount: 8829,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 6913,
        //         amp: 80000,
        //         totalShare: 6913,
        //         currentAccessOta: 'n1WZ04BZdUONd/9m7pMvpIILkxlFP8CPVrjXfpufR4M=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'b2ef81e8f576188607d6ab49ed63ae718627bd37da337b966303e25234b782c4',
        //         nftId: 'b2ef81e8f576188607d6ab49ed63ae718627bd37da337b966303e25234b782c4',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-9eb6acded5ecd0ab16a5853dfa309e79ab3581d6cbab03a9c83003fb79bcf8cf-9991b87b56874fc316d341abd0012678a1310d650d3396886ff57f316dc89a2a',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: '9eb6acded5ecd0ab16a5853dfa309e79ab3581d6cbab03a9c83003fb79bcf8cf',
        //         token1Amount: 1951,
        //         token2Amount: 14386,
        //         rewards: {
        //             '0000000000000000000000000000000000000000000000000000000000000004': 305,
        //             '9Eb6Acded5Ecd0Ab16A5853Dfa309E79Ab3581D6Cbab03A9C83003Fb79Bcf8Cf': 2493
        //         },
        //         orderRewards: {},
        //         share: 1324,
        //         amp: 90000,
        //         totalShare: 5370,
        //         currentAccessOta: 'E0DHPHzrCaa2oEpHe0Vr6XE4BEHuuFa4Bc2b77s2L5E=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'c172586f3629292f1c9c30d46ecfbee7df863f1dac1f585463b46ac00df7eccd',
        //         nftId: 'c172586f3629292f1c9c30d46ecfbee7df863f1dac1f585463b46ac00df7eccd',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: true,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-9eb6acded5ecd0ab16a5853dfa309e79ab3581d6cbab03a9c83003fb79bcf8cf-c08ad095b698c7ae45d6a727fbfd63dbc417cbbefb45bfecff77225ceaa1acf1',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: '9eb6acded5ecd0ab16a5853dfa309e79ab3581d6cbab03a9c83003fb79bcf8cf',
        //         token1Amount: 11319,
        //         token2Amount: 12675,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 2756,
        //         amp: 60000,
        //         totalShare: 11975,
        //         currentAccessOta: 'hWdKssVGC11WTxr6upKfRZpDiVELz3VBiwG7ZQlDpNs=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'd6ede2ebe9f4ac341058945baaaf37e2884f4e61d87a192da2974e5b761b1235',
        //         nftId: 'd6ede2ebe9f4ac341058945baaaf37e2884f4e61d87a192da2974e5b761b1235',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed-2d8d58da5d583df06e964da930ddb2f16d40792260b3e30291f76922701ade23',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: '5577f308e60df159a3bf71c62ddb7128aed76a82f6f9b91bd7fce546b62051ed',
        //         token1Amount: 10014,
        //         token2Amount: 6673,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 357,
        //         amp: 20000,
        //         totalShare: 8171,
        //         currentAccessOta: 'EXxxtRPTF1IVocPy4exqgTg4zytq6HZ1lkpBKziPhQc=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'dcc397416eb1981514da965e1d963506b2f92549c87d046a5d9dd60d856eb033',
        //         nftId: 'dcc397416eb1981514da965e1d963506b2f92549c87d046a5d9dd60d856eb033',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     },
        //     {
        //         poolId: '0000000000000000000000000000000000000000000000000000000000000004-cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1-60b7d7cea8db9f54d43dca9c499d1ac8f2c624ecc56a25c49dd47f968d02e78e',
        //         tokenId1: '0000000000000000000000000000000000000000000000000000000000000004',
        //         tokenId2: 'cca46ad06975453f9bceaa243d3faa83b26fb5f32c009e2a5af763ec927b0db1',
        //         token1Amount: 9668,
        //         token2Amount: 4618,
        //         rewards: {},
        //         orderRewards: {},
        //         share: 6681,
        //         amp: 60000,
        //         totalShare: 6681,
        //         currentAccessOta: 'RLOR5eU8I7NkbOx73IVqYkUe0Db/kZOcYIGj7nFYtYc=',
        //         isMintingNewAccessOta: false,
        //         nftid: 'f4bbc5166e1a6ef33ee28ce754498dabaf64e92ddb8358c6bd98cc6a6b9ab563',
        //         nftId: 'f4bbc5166e1a6ef33ee28ce754498dabaf64e92ddb8358c6bd98cc6a6b9ab563',
        //         versionTx: 'ACCESS_ID',
        //         withdrawable: false,
        //         isBurningTx: false
        //     }
        // ]
        // let { orderRewardGroup, accessOTALPGroup } = data.reduce((prev, curr) => {
        //     const { share, orderRewards } = curr;
        //     const { orderRewardGroup, accessOTALPGroup } = prev;
        //     const isOrderReward = !share && !isEmpty(orderRewards);
        //     if (isOrderReward) {
        //         orderRewardGroup.push(curr);
        //     } else {
        //         accessOTALPGroup.push(curr);
        //     }
        //     return { orderRewardGroup, accessOTALPGroup };
        // }, { orderRewardGroup: [], accessOTALPGroup: [] });
        // const orderRewardFiltered = [];
        // orderRewardGroup.forEach(shareItem => {
        //     const { poolId } = shareItem;
        //     const index = orderRewardFiltered.findIndex(item => item.poolId === poolId);
        //     if (index === -1) {
        //         orderRewardFiltered.push(shareItem);
        //     } else {
        //         let currShare = orderRewardFiltered[index];
        //         Object.keys(shareItem.orderRewards || {})
        //             .forEach(currShareKey => {
        //                 const newShareOrderRewardValue = shareItem.orderRewards[currShareKey] || 0;
        //                 const currentOrderRewardValue = currShare.orderRewards[currShareKey] || 0;
        //                 currShare.orderRewards = {
        //                     ...currShare.orderRewards,
        //                     [currShareKey]: newShareOrderRewardValue + currentOrderRewardValue,
        //                 }
        //             }
        //         );
        //     }
        // })
        // return [...orderRewardFiltered, accessOTALPGroup];
    } catch (error) {
        console.log('TestGetListShare error: ', error)
    }
}

async function TestGetNFTData() {
    try {
        const start = new Date().getTime()
        const data = await pDexV3Instance.getNFTTokenData({ version: PRIVACY_VERSION });
        const end = new Date().getTime()
        console.log('NFT DATA: ', data);
        console.log('NFT LOAD TIME: ', end - start);
    } catch (error) {
        console.log('TestGetNFTData error: ', error);
    }
}

async function TestGetLPHistory() {
    try {
        const data = await pDexV3Instance.getWithdrawFeeLPHistories({ version: PRIVACY_VERSION });
        console.log('TestGetLPHistory: ', data);
    } catch (error) {
        console.log('TestGetLPHistory error: ', error);
    }
}

async function TestGetOrderHistory() {
    try {
        const listNFTToken = await pDexV3Instance.getNFTTokenIDs();
        const poolID =
            '0000000000000000000000000000000000000000000000000000000000000004-292f55f94a828084236d61125f49d6b4cdd93ba74bbf161a40564a0d1a3f142f-0eafc9bb42b577d2fbd8401571c31eeae6833e4665e5312e4948725e9ad6dc78'
        const data = await pDexV3Instance.getOrderLimitHistoryFromApi({
            poolid: poolID,
            listNFTToken,
            version: PRIVACY_VERSION,
        });
        console.log('TestGetOrderHistory: ', data);
    } catch (error) {
        console.log('TestGetOrderHistory error: ', error);
    }
}

async function TestGetOpenOrderHistory() {
    try {
        const listNFTToken = await pDexV3Instance.getNFTTokenIDs();
        const data = await pDexV3Instance.getOpenOrderLimitHistoryFromApi({
            listNFTToken,
        });
        console.log('TestGetOpenOrderHistory: ', data);
        console.log('TestGetOpenOrderHistory length: ', data.length);

    } catch (error) {
        console.log('TestGetOpenOrderHistory error: ', error);
    }
}

async function TestCreateContributeAccessOTA() {
    try {
        const tokenIDs = [
            PRV_ID,
            '81fda0081019672cd418c3fc0cbd81ef5937a164ac090c8dc41956f5940d863f',
        ]
        const PoolID = '0000000000000000000000000000000000000000000000000000000000000004-81fda0081019672cd418c3fc0cbd81ef5937a164ac090c8dc41956f5940d863f-0625bff2b7003e63162b57a056b44e63675e9dc7f8dcb49efb9953366ca29a15';
        const result = await pDexV3Instance.createContributeTxsWithAccessToken({
            fee: 100,
            tokenId1: tokenIDs[0],
            tokenId2: tokenIDs[1],
            amount1: 2,
            amount2: 1,
            poolPairID: PoolID,
            amp: 12000
        });
        console.log('TestCreateContributeAccessOTA:::: ', result)
    } catch (e) {
        console.log('TestCreateContributeAccessOTA error: ', e);
    }
}

async function RunTest() {
    console.log("BEGIN WEB PDEX3 TEST");
    await setup();
    // await TestGetBalance();
    // await TestGetBalanceAccessOTA();
    await TestGetListShare();
    // await TestGetTxsHistory()
    // await TestGetNFTData();
    // await TestGetLPHistory();
    // await TestGetOrderHistory();
    // await TestGetOpenOrderHistory();
    // await TestCreateContributeAccessOTA();
}

RunTest()