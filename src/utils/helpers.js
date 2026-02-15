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
  const net = NETWORK_CONFIG[chainId]
  if (!net || !net.fee) return { gas: gasLimit }

  const opt = { gas: gasLimit }

  if (net.fee.type === 'legacy') {
    opt.gasPrice = web3.utils.toWei(String(net.fee.gasPrice), 'gwei')
  }

  if (net.fee.type === 'eip1559') {
    opt.maxPriorityFeePerGas = web3.utils.toWei(String(net.fee.priority), 'gwei')
    opt.maxFeePerGas = web3.utils.toWei(String(net.fee.max), 'gwei')
  }

  return opt
}