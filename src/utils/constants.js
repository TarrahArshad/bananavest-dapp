export const NETWORK_CONFIG = {
  // Ganache
  1337: {
    name: 'Ganache',
    symbol: 'ETH',
    rpcUrl: 'http://localhost:8545',
    contracts: {
      bananaVest: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      usdt: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
    },
    explorer: '',
    isTestnet: true,
    color: '#3c3c3d'
  },
  
  5777: {
    name: 'Ganache',
    symbol: 'ETH',
    rpcUrl: 'http://localhost:7545',
    contracts: {
      bananaVest: '0x2CE805ABB53C2092C839839235C2868A94ADCABd',
      usdt: '0x6Adf39F876fEfFb3cb37bF6dec504591888a8c83'
    },
    explorer: '',
    isTestnet: true,
    color: '#3c3c3d'
  },

  2025: {
    name: 'Ganache',
    symbol: 'ETH',
    rpcUrl: 'http://localhost:8545',
    contracts: {
      bananaVest: '0xd804cBe535c8F75C0b81eFaa0BE2853Ac12CEea2',
      usdt: '0x67A44909AC00cC03d095D7AC6e9222b8D85691f0'
    },
    explorer: '',
    isTestnet: true,
    color: '#3c3c3d'
  },

  // Polygon Amoy
  80002: {
    name: 'Polygon Amoy',
    symbol: 'POL',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    contracts: {
      bananaVest: '0xFCE657D19b1Ce9F3a5d53Fb4B1D8aD15BdE37f11',
      usdt: '0x25e4A3bF6C4dCC8aFc4F619192b45207c40cE70b'
    },
    explorer: 'https://amoy.polygonscan.com',
    isTestnet: true,
    color: '#8247e5'
  },

  // Polygon Mumbai
  80001: {
    name: 'Polygon Mumbai',
    symbol: 'MATIC',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    contracts: {
      bananaVest: '0x9C74996C43B19A12f5D9868cBdA264bB0A831D2A',
      usdt: '0x18D28DBc2a465cbA40187d67e59d724c1AD51B52'
    },
    explorer: 'https://mumbai.polygonscan.com',
    isTestnet: true,
    color: '#8247e5'
  },

  // Polygon Mainnet
  137: {
    name: 'Polygon Mainnet',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-rpc.com',
    contracts: {
      bananaVest: '',
      usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    },
    explorer: 'https://polygonscan.com',
    isTestnet: false,
    color: '#8247e5'
  },

  // BSC Testnet
  97: {
    name: 'BSC Testnet',
    symbol: 'tBNB',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    contracts: {
      bananaVest: '',
      usdt: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'
    },
    explorer: 'https://testnet.bscscan.com',
    isTestnet: true,
    color: '#f0b90b'
  },

  // BSC Mainnet
  56: {
    name: 'BSC Mainnet',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    contracts: {
      bananaVest: '',
      usdt: '0x55d398326f99059fF775485246999027B3197955'
    },
    explorer: 'https://bscscan.com',
    isTestnet: false,
    color: '#f0b90b'
  },

  // Ethereum Sepolia
  11155111: {
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    rpcUrl: 'https://rpc.sepolia.org',
    contracts: {
      bananaVest: '',
      usdt: ''
    },
    explorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    color: '#627eea'
  },

  // Ethereum Mainnet
  1: {
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    contracts: {
      bananaVest: '',
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    },
    explorer: 'https://etherscan.io',
    isTestnet: false,
    color: '#627eea'
  }
}

// اضافه کردن FALLBACK_USDT_ABI به exports
export const FALLBACK_USDT_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "success", "type": "bool" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "_owner", "type": "address" },
      { "name": "_spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "remaining", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "name": "", "type": "uint256" }],
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "type": "function"
  }
]

// اضافه کردن تابع helpers
export const formatUSDT = (amount) => {
  if (!amount) return '0'
  return (Number(amount) / 1000000).toFixed(2)
}

export const formatAddress = (address) => {
  if (!address) return ''
  return `${address.substring(0, 6)}...${address.substring(38)}`
}

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export const buildTxOptions = (web3, chainId, gasLimit) => {
  if (!web3) return { gas: gasLimit }
  
  const opt = { gas: gasLimit }
  
  // ساده شده برای حال حاضر
  try {
    opt.gasPrice = web3.utils.toWei('5', 'gwei')
  } catch (e) {
    // ignore
  }
  
  return opt
}