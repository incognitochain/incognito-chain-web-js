await Tx(senders[0]).to(addresses[1], '111').to(addresses[3], '333').send()
// chain (setter -> feature -> send) methods to create & send tx quickly
await Tx(senders[0]).to(addresses[0], '88888').newToken('my new token', 'MNT').send()
await rpc.listTokens()
// can call show() to preview tx summary before signing & sending
b = await Tx(senders[0]).withTokenID('780b5da554a5bc52663238667dd71a792f040aab4156dccb8c51e0c3f27d5178').withFee(50).contribute(1000, 20000).show()
await b.send()
// only reuse builder to make 2nd liquidity provision; otherwise always use new builder to ensure valid inner state
await b.withFee(100).withInfo('i1').withTokenID(constants.PRVIDSTR).contribute(3000, 20000).send()
await rpc.getPdexv3Status('Contribution', b.result.txId)
await rpc.getPdexv3State()
b = await Tx(senders[0]).withPool('0000000000000000000000000000000000000000000000000000000000000004-780b5da554a5bc52663238667dd71a792f040aab4156dccb8c51e0c3f27d5178-0fa9aa8521a5cfce203ae5298be254fb15563363a5b7d0eebd00b0a07c4ebf71').withTokenID(constants.PRVIDSTR);;
await b.contributeMore(3000, 'b49b790337e936f7e4797bc00a4c488ce55440753af74fed01ed9446fbc83235').send()
await b.withTokenID('780b5da554a5bc52663238667dd71a792f040aab4156dccb8c51e0c3f27d5178').contributeMore(1000, 'b49b790337e936f7e4797bc00a4c488ce55440753af74fed01ed9446fbc83235').send()
// swap 50 nPRV. MinBuy defaults to 0
b = await Tx(senders[0]).withTokenID(constants.PRVIDSTR).withPool('0000000000000000000000000000000000000000000000000000000000000004-780b5da554a5bc52663238667dd71a792f040aab4156dccb8c51e0c3f27d5178-0fa9aa8521a5cfce203ae5298be254fb15563363a5b7d0eebd00b0a07c4ebf71').trade(50).send()
await rpc.getPdexv3Status('Trade', b.result.txId)
await Tx(senders[0]).dexStake(6666).send()
// show big pdex state object
s = await rpc.getPdexv3State(); console.dir(s, {depth:null})
// call withAccess(ota) to edit a pdex LP / order / staking entry owned by this account (can look up accessID & OTA from pdex state object)
await Tx(senders[0]).withPool('0000000000000000000000000000000000000000000000000000000000000004-780b5da554a5bc52663238667dd71a792f040aab4156dccb8c51e0c3f27d5178-0fa9aa8521a5cfce203ae5298be254fb15563363a5b7d0eebd00b0a07c4ebf71').withAccess('ISjEQtKfhABbcCOUe93RSUFW9Y8lBdMylh4Xzq8qb6o=').withdrawRewardLP('b49b790337e936f7e4797bc00a4c488ce55440753af74fed01ed9446fbc83235').send()
s = await rpc.getPdexv3State(); console.dir(s, {depth:null})
await Tx(senders[0]).withPool('0000000000000000000000000000000000000000000000000000000000000004-780b5da554a5bc52663238667dd71a792f040aab4156dccb8c51e0c3f27d5178-0fa9aa8521a5cfce203ae5298be254fb15563363a5b7d0eebd00b0a07c4ebf71').withAccess('TOw4MW2yKv4NMtgmKxp9Y1ZWjF2woCausRZACM7jRYQ=').withdrawLiquidity(2000, 'b49b790337e936f7e4797bc00a4c488ce55440753af74fed01ed9446fbc83235').send()
await Tx(senders[0]).withPool(constants.PRVIDSTR).withAccess('lJtq1fkTe79B7mFV8ipMrf/mzufODJqbgCzeVuxlLFQ=').dexUnstake('333c3ad25cb580d000152b209a55807b6a70f142b9c8b67d13b19c4838b64f13', 1000).send()