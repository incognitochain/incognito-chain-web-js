import { PDEX_ACCESS_ID, pdexv3, PrivacyVersion } from "@lib/core/constants";
import Validator from "@lib/utils/validator";
import bn from "bn.js";
import { MAX_FEE_PER_TX, TX_TYPE } from "@lib/module/Account";
import { getBurningAddress } from "@lib/core";
import uniq from "lodash/uniq";
import { CustomError, ErrorObject } from "@lib/common/errorhandler";

function getKeyStorageMintedNTFToken({ version }) {
  new Validator("getKeyStorageMintedNTFToken-version", version)
    .required()
    .number();
  return `${this.account?.getOTAKey()}-MINTED-NFT-TOKEN-ver-${version}`;
}

async function createAndMintNftTx({
  transfer: { fee = MAX_FEE_PER_TX, info = "" } = {},
  extra: { version },
}) {
  new Validator("createAndMintNftTx-fee", fee).amount();
  new Validator("createAndMintNftTx-info", info).string();
  new Validator("createAndSendTradeRequestTx-version", version)
    .required()
    .number();
  await this.account?.updateProgressTx(10, "Generating Metadata");
  const burningAddress = await getBurningAddress(this.rpc);
  let burningPayments = [
    {
      PaymentAddress: burningAddress,
      Amount: new bn(pdexv3.MintNftAmount).toString(),
      Message: info,
    },
  ];
  const otaReceive = await this.getOTAReceive();
  new Validator("createAndMintNftTx-otaReceive", otaReceive)
    .string()
    .required();
  const metadata = {
    Amount: pdexv3.MintNftAmount,
    OtaReceiver: otaReceive,
    Type: pdexv3.UserMintNftRequestMeta,
  };
  try {
    const tx = await this.account?.transact({
      transfer: { prvPayments: burningPayments, fee, info },
      extra: { metadata, txType: TX_TYPE.MINT_NFT_TOKEN, version },
    });
    await this.account?.updateProgressTx(100, "Completed");
    return tx;
  } catch (e) {
    throw e;
  } finally {
    const key = this.getKeyStorageMintedNTFToken({ version });
    await this.setStorage(key, true);
  }
}

async function getNFTTokenDataNoCache(params) {
  try {
    const { version } = params;
    const key = this.getKeyStorageMintedNTFToken({ version });
    let payload = {
      nftToken: "",
      nftTokenAvailable: "",
      initNFTToken: !!(await this.getStorage(key)),
      list: [],
      pending: false,
      listNFTToken: [],
    };
    const keyInfo = await this.account?.getKeyInfo({ version });
    if (!keyInfo?.nftindex) return payload;
    let nftIDS = Object.keys(keyInfo?.nftindex).map((key) => key);
    nftIDS = nftIDS.filter(nftID => nftID !== PDEX_ACCESS_ID);
    if (nftIDS.length === 0) {
      return payload;
    }
    payload.initNFTToken = true;
    let task1 = nftIDS.map((nft) =>
      this.account?.getUnspentCoinsV2({
        version,
        tokenID: nft,
        isNFT: true,
      })
    );
    let task2 = nftIDS.map((nft) =>
      this.account?.getUnspentCoinsExcludeSpendingCoins({
        version,
        tokenID: nft,
        isNFT: true,
      })
    );
    const implTask1 = await Promise.all(task1);
    const implTask2 = await Promise.all(task2);
    let list = nftIDS.map((nftToken, index) => {
      const amount =
        implTask1[index]?.reduce(
          (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
          new bn(0)
        ) || new bn(0);
      const realAmount =
        implTask2[index]?.reduce(
          (totalAmount, coin) => totalAmount.add(new bn(coin.Value)),
          new bn(0)
        ) || new bn(0);
      return {
        amount: amount.toString(),
        realAmount: realAmount.toString(),
        nftToken,
      };
    });
    payload.list = list;
    const { nftToken } = list.find(({ amount }) => new bn(amount).eqn(1)) || {};
    const { nftToken: nftTokenAvailable } =
      list.find(({ realAmount }) => new bn(realAmount).eqn(1)) || {};
    payload.nftToken = nftToken || "";
    payload.nftTokenAvailable = nftTokenAvailable || "";
    if (payload.nftToken && !payload.nftTokenAvailable) {
      payload.pending = true;
    }
    payload.listNFTToken = list.map(({ nftToken }) => nftToken);
    return payload;
  } catch (error) {
    throw error;
  }
}

async function getNFTTokenData(params) {
  let payload = {
    nftToken: "",
    nftTokenAvailable: "",
    initNFTToken: false,
    list: [],
    pending: false,
    listNFTToken: [],
  };
  try {
    const { version } = params;
    new Validator(`getNFTTokens-version`, version).required().number();
    payload = await this.getNFTTokenDataNoCache(params);
  } catch (error) {
    throw error;
  }
  return payload;
}

async function getNFTTokenIDs() {
  let nftIDs = [];
  try {
    const keyInfo = await this.account?.getKeyInfo({ version: PrivacyVersion.ver2 });
    if (!keyInfo?.nftindex) return nftIDs;
    nftIDs = Object.keys(keyInfo?.nftindex || {}).map((key) => key);
    nftIDs = nftIDs.filter(nftID => nftID !== PDEX_ACCESS_ID);
  } catch (error) {
    console.log('getNFTTokenIDs error: ', error)
  }
  return nftIDs;
}

async function getAvailableNFTToken({ version }) {
  let nftID = "";
  try {
    const { nftTokenAvailable, pending } = await this.getNFTTokenData({
      version,
    });
    if (pending) {
      throw new CustomError(
        ErrorObject.NFTTokenPending,
        ErrorObject.NFTTokenPending.description
      );
    }
    nftID = nftTokenAvailable;
  } catch (error) {
    throw error;
  }
  return nftID;
}

export default {
  getNFTTokenData,
  getNFTTokenDataNoCache,
  createAndMintNftTx,
  getKeyStorageMintedNTFToken,
  getNFTTokenIDs,
  getAvailableNFTToken,
};
