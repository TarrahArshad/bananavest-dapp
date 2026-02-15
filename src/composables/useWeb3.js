import { ref, computed } from 'vue'
import Web3 from 'web3'
import { NETWORK_CONFIG } from '../utils/constants'

export function useWeb3() {
  const web3 = ref(null)
  const currentNetwork = ref(null)
  const chainId = ref(null)
  const isConnected = ref(false)
  const isLoading = ref(false)
  const error = ref(null)

  const networkName = computed(() => currentNetwork.value?.name || 'Unknown Network')
  const networkColor = computed(() => currentNetwork.value?.color || '#666666')
  const isTestnet = computed(() => currentNetwork.value?.isTestnet || false)

  const initWeb3 = async () => {
    isLoading.value = true
    error.value = null

    try {
      if (window.ethereum) {
        web3.value = new Web3(window.ethereum)
        await setupEventListeners()
      } else {
        await connectToGanache()
      }

      await updateNetworkInfo()
      isLoading.value = false
      return true
    } catch (err) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  const connectToGanache = async () => {
    const ganacheUrls = [
      'http://localhost:8545',
      'http://127.0.0.1:8545',
      'http://localhost:7545',
      'http://127.0.0.1:7545'
    ]

    for (const url of ganacheUrls) {
      try {
        const tempWeb3 = new Web3(url)
        const listening = await tempWeb3.eth.net.isListening()
        if (listening) {
          web3.value = tempWeb3
          return
        }
      } catch (e) {
        // Ignore
      }
    }
    throw new Error('No Web3 provider found')
  }

  const setupEventListeners = () => {
    window.ethereum.on('chainChanged', () => window.location.reload())
    window.ethereum.on('accountsChanged', handleAccountsChanged)
  }

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      // Will be handled by wallet composable
    } else {
      isConnected.value = false
    }
  }

  const updateNetworkInfo = async () => {
    if (!web3.value) return

    const id = await web3.value.eth.getChainId()
    chainId.value = id
    currentNetwork.value = NETWORK_CONFIG[id] || {
      name: `Custom Network ${id}`,
      symbol: 'ETH',
      rpcUrl: 'Unknown',
      contracts: { bananaVest: '', usdt: '' },
      explorer: '',
      isTestnet: true,
      color: '#666666'
    }
  }

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) {
      error.value = 'MetaMask required for network switching'
      return false
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      })
      return true
    } catch (switchError) {
      if (switchError.code === 4902) {
        return await addNetwork(targetChainId)
      }
      error.value = switchError.message
      return false
    }
  }

  const addNetwork = async (targetChainId) => {
    const network = NETWORK_CONFIG[targetChainId]
    if (!network) {
      error.value = 'Network configuration not found'
      return false
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${targetChainId.toString(16)}`,
          chainName: network.name,
          nativeCurrency: {
            name: network.symbol,
            symbol: network.symbol,
            decimals: 18
          },
          rpcUrls: [network.rpcUrl]
        }]
      })
      return true
    } catch (addError) {
      error.value = addError.message
      return false
    }
  }

  return {
    web3,
    currentNetwork,
    chainId,
    isConnected,
    isLoading,
    error,
    networkName,
    networkColor,
    isTestnet,
    initWeb3,
    switchNetwork,
    updateNetworkInfo
  }
}