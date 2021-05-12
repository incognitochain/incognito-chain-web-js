const TxNormalType = "n"; // normal tx(send and receive coin)
const TxSalaryType = "s"; // salary tx(gov pay salary for block producer)
const TxCustomTokenType = "t"; // token  tx with no supporting privacy
const TxCustomTokenPrivacyType = "tp"; // token  tx with supporting privacy

const CustomTokenInit = 0;
const CustomTokenTransfer = 1;
const TxVersion = 1;

const TX_TYPE = {
  SEND: 0,
  TRADE: 1,
  PROVIDE: 2,
  STACK: 3,
};
// todo: 0xkraken
// NumUTXO must be 255
// because tx zise is exceed 100kb with NumUTXO = 255
const MaxInputNumberForDefragment = 30;
const MAX_DEFRAGMENT_TXS = 30;
const MAX_INPUT_PER_TX = 30;
const DEFAULT_INPUT_PER_TX = 20;
const MaxInfoSize = 512;

export default {
  TxNormalType,
  TxSalaryType,
  TxCustomTokenType,
  TxCustomTokenPrivacyType,
  CustomTokenInit,
  CustomTokenTransfer,
  TxVersion,
  MaxInputNumberForDefragment,
  MaxInfoSize,
  MAX_INPUT_PER_TX,
  MAX_DEFRAGMENT_TXS,
  DEFAULT_INPUT_PER_TX,
  TX_TYPE,
};