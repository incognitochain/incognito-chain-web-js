async function TestIdenticon(rpc) {
    let resp = await rpc.hashToIdenticon(["ba62745dea932f8121064d72347ef25a326067643f21c520942dcc642fec6632"])
    console.log(resp)
}

// TestIdenticon()
module.exports = {
    TestIdenticon
}