import { checkDecode } from "@lib/common/base58";
import { PUBLIC_KEY_SIZE } from "@lib/common/constants";
import {
  BurnAddress,
  PaymentAddrSerializeAddCheckSumSize,
  OTAReceiverSerializeAddCheckSumSize,
} from "@lib/core/constants";

export const isPaymentAddress = (paymentAddr) => {
  if (paymentAddr === BurnAddress) {
    return true;
  }
  if (typeof paymentAddr !== "string") {
    return false;
  }
  let result = false;
  try {
    const decodeBase58 = checkDecode(paymentAddr);
    result = [
      PaymentAddrSerializeAddCheckSumSize + PUBLIC_KEY_SIZE + 1,
      OTAReceiverSerializeAddCheckSumSize,
    ].includes(decodeBase58.bytesDecoded.length);
  } catch (error) {
    console.log("isPaymentAddress error", error);
  }
  return result;
};

export const isOldPaymentAddress = (paymentAddr) => {
  if (paymentAddr === BurnAddress) {
    return true;
  }
  if (typeof paymentAddr !== "string") {
    return false;
  }
  let result = false;
  try {
    const decodeBase58 = checkDecode(paymentAddr);
    result = [PaymentAddrSerializeAddCheckSumSize].includes(
      decodeBase58.bytesDecoded.length
    );
  } catch (error) {
    console.log("isOldPaymentAddress error", error);
  }
  return result;
};
