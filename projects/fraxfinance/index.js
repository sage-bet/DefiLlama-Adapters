const sdk = require("@defillama/sdk");
const { staking, } = require("../helper/staking");
const { sumTokens2, nullAddress, } = require("../helper/unwrapLPs");

const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const FXS = "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0";
const FRAX_3CRV = '0xd632f22692fac7611d2aa1c0d552930d43caed3b'
const T_3CRV = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'

const veFXS_StakingContract = "0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0";
const INVESTOR_AMO = '0xb1748c79709f4ba2dd82834b8c82d4a505003f27'

const POOL_STAKING_CONTRACTS = [
  "0xD875628B942f8970De3CcEaf6417005F68540d4f",
  "0xa29367a3f057F3191b62bd4055845a33411892b6",
  "0xda2c338350a0E59Ce71CDCED9679A3A590Dd9BEC",
  "0xDc65f3514725206Dd83A8843AAE2aC3D99771C88",
];
const LP_ADDRESSES = [
  //Uniswap FRAX/WETH LP
  "0xFD0A40Bc83C5faE4203DEc7e5929B446b07d1C76",
  //Uniswap FRAX/USDC LP
  "0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D",
  //Uniswap FRAX/FXS LP
  "0xE1573B9D29e2183B1AF0e743Dc2754979A40D237",
  //Uniswap FXS/WETH LP
  "0xecBa967D84fCF0405F6b32Bc45F4d36BfDBB2E81",
];

async function get3CRVRatio(api) {
  const [
    frax3crvSupply,
    bal_3crv,
  ] = await Promise.all([
    api.call({ abi: 'erc20:totalSupply', target: FRAX_3CRV, }),
    api.call({ abi: 'erc20:balanceOf', target: T_3CRV, params: FRAX_3CRV, }),
  ])
  return bal_3crv / frax3crvSupply
}

async function addFrax3CRV(api, balances) {
  const vault = '0x49ee75278820f409ecd67063D8D717B38d66bd71'
  const [
    frax3crvBal,
    ratio3CRV,
  ] = await Promise.all([
    api.call({ abi: 'uint256:FRAX3CRVInVault', target: vault }),
    get3CRVRatio(api),
  ])
  sdk.util.sumSingleBalance(balances, T_3CRV, ratio3CRV * frax3crvBal, api.chain)
}

async function addyFrax3CRV(api, balances) {
  const vault = '0x72170Cdc48C33a6AE6B3E83CD387ca3Fb9105da2'
  const yFRAX3CRV = '0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139'
  const [
    yfrax3crvBal,
    pricePerShare,
    ratio3CRV,
  ] = await Promise.all([
    api.call({ abi: 'uint256:yvCurveFRAXBalance', target: vault }),
    api.call({ abi: 'uint256:pricePerShare', target: yFRAX3CRV }),
    get3CRVRatio(api),
  ])
  sdk.util.sumSingleBalance(balances, T_3CRV, yfrax3crvBal * ratio3CRV * (pricePerShare / 1e18), api.chain)
  return sumTokens2({ balances, api, owner: vault, tokens: [USDC] })
}


async function addCvxFRAX_BP(api, balances) {
  const convexFRAXBP = '0x7e880867363A7e321f5d260Cade2B0Bb2F717B02'
  const crvFRAX = '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC'
  const crvFRAXPool = '0xdcef968d416a41cdac0ed8702fac8128a64241a2'
  const [
    cvxFraxBal,
    usdcBal,
    poolSupply,
  ] = await Promise.all([
    
    api.call({ abi: 'erc20:balanceOf', target: convexFRAXBP, params: INVESTOR_AMO }),
    api.call({ abi: 'erc20:balanceOf', target: USDC, params: crvFRAXPool }),
    api.call({ abi: 'erc20:totalSupply', target: crvFRAX }),
  ])
  sdk.util.sumSingleBalance(balances, USDC, usdcBal * cvxFraxBal / poolSupply, api.chain)
}

async function addCvxFXSFRAX_BP(api, balances) {
  const userAccount = '0x2AA609715488B09EFA93883759e8B089FBa11296'
  const vault = '0x963f487796d54d2f27ba6f3fbe91154ca103b199'
  const crvFRAX = '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC'
  const crvFRAXPool = '0xdcef968d416a41cdac0ed8702fac8128a64241a2'
  const [
    cvxFraxBal,
    usdcBal,
    poolSupply,
  ] = await Promise.all([
    api.call({ abi: 'function lockedLiquidityOf(address) view returns (uint256)', target: vault, params: userAccount }),
    api.call({ abi: 'erc20:balanceOf', target: USDC, params: crvFRAXPool }),
    api.call({ abi: 'erc20:totalSupply', target: crvFRAX }),
  ])
  sdk.util.sumSingleBalance(balances, USDC, usdcBal * cvxFraxBal / poolSupply, api.chain)
}


async function addUSDCPools(api, balances) {
  return sumTokens2({
    balances, api, owners: [
      '0x3C2982CA260e870eee70c423818010DfeF212659',
      '0x1864Ca3d47AaB98Ee78D11fc9DCC5E7bADdA1c0d',
      '0x2fE065e6FFEf9ac95ab39E5042744d695F560729',
    ], tokens: [USDC]
  })
}

async function addAMOMinter(api, balances) {
  const amoMinter = '0xcf37B62109b537fa0Cb9A90Af4CA72f6fb85E241'
  let allAMOAddresses = await api.call({ target: amoMinter, abi: 'address[]:allAMOAddresses' })
  const amos = allAMOAddresses.filter(i => i !== nullAddress)
  const blacklist = new Set([
    '0x66635DC1EdEfF19e839f152a67278151Aa6e1B61', // aave AMO
    INVESTOR_AMO,
  ].map(i => i.toLowerCase()))
  const dollBallAbi = 'function dollarBalances() view returns (uint256 frax_val_e18, uint256 collat_val_e18)'
  const res = await api.multiCall({ abi: dollBallAbi, calls: amos.filter(i => blacklist.has(i.toLowerCase())) })
  const table = []
  res.forEach((v, i) => {
    table.push([amos[i], Number(v.collat_val_e18 / 1e24).toFixed(3)])
    sdk.util.sumSingleBalance(balances, USDC, v.collat_val_e18 / 1e12, api.chain)
  })
  table.sort((a, b) => +b[1] - +a[1])
  console.log(amos.length)
  console.table(table)

}

async function addInvestorAMO(api, balances) {
  return sumTokens2({
    balances,
    api, owner: INVESTOR_AMO,
    tokens: Object.values({
      Synapse: '0x0f2d719407fdbeff09d87557abb7232601fd9f29',
      'Wrapped BTC': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      'USD Coin': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      ZigZag: '0xc91a71a1ffa3d8b22ba615ba1b9c01b2bbbf55ad',
      'Governance OHM': '0x0ab87046fbb341d058f17cbc4c1133f25a20a52f',
      'Aave interest bearing USDC': '0xbcca60bb61934080951369a648fb03df4f96263c',
      Perpetual: '0xbc396689893d065f41bc2c6ecbee5e0085233447',
      Hop: '0xc5102fe9359fd9a28f877a67e36b0f050d81a3cc',
      'Ethereum Name Service': '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
      'Curve.fi DAI/USDC/USDT': '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490',
      'Saddle DAO': '0xf1dc500fde233a4055e25e5bbf516372bc4f6871',
      Ether: nullAddress,
      TrueUSD: '0x0000000000085d4780b73119b644ae5ecd22b376',
      'Gelato Network Token': '0x15b7c0c907e4c6b9adaaaabc300c08991d6cea05',
      'Staked Aave': '0x4da27a545c0c5b758a6ba100e3a049001de870f5',
      'Convex Token': '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
      'Curve DAO Token': '0xd533a949740bb3306d119cc777fa900ba034cd52',
      'Bend Token': '0x0d02755a5700414b26ff040e1de35d337df56218',
      'Binance USD': '0x4fabb145d64652a948d72533023f6e7a623c7c53',
      'Alchemix USD': '0xbc6da0fe9ad5f3b0d58160288917aa56653660e9',
      'Staked CvxCrv': '0xaa0c3f5f7dfd688c6e646f66cd2a6b66acdbe434',
    }),
  })
}

const ethereumTvl = async (timestamp, block, _, { api }) => {
  let balances = {};

  await Promise.all([
    addFrax3CRV(api, balances),
    addyFrax3CRV(api, balances),
    addUSDCPools(api, balances),
    addInvestorAMO(api, balances),
    addCvxFXSFRAX_BP(api, balances),
  ])
  return balances
};

module.exports = {
  doublecounted: true,
  ethereum: {
    staking: staking(veFXS_StakingContract, FXS),
    pool2: staking(POOL_STAKING_CONTRACTS, LP_ADDRESSES),
    tvl: ethereumTvl,
  },
  hallmarks: [
    [1651881600, "UST depeg"],
  ],
  methodology:
    "Counts liquidty as the Collateral USDC on all AMOs, USDC POOLs, FRAX3CRV and FEI3CRVs through their Contracts",
};