import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import Web3 from 'web3'
import { NETWORK_CONFIG } from '../utils/constants'

export const useNetworkStore = defineStore('network', () => {
  const web3 = ref(null)
  const currentNetwork = ref(null)
  const chainId = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const networkName = computed(() => currentNetwork.value?.name || 'Unknown Network')
  const networkColor = computed(() => currentNetwork.value?.color || '#666666')
  
  // اصلاح اینجا - بررسی درست Testnet بودن
  const isTestnet = computed(() => {
    if (!currentNetwork.value) return true
    
    // اگه توی کانفیگ مشخص شده بود
    if (currentNetwork.value.isTestnet !== undefined) {
      return currentNetwork.value.isTestnet
    }
    
    // بررسی بر اساس Chain ID
    const testnetChains = [80001, 80002, 97, 11155111, 5, 1337, 5777, 2025]
    return testnetChains.includes(chainId.value)
  })

  async function initWeb3() {
    isLoading.value = true
    error.value = null
    console.log('🔧 Initializing Web3...')

    try {
      if (window.ethereum) {
        console.log('✅ MetaMask detected')
        web3.value = new Web3(window.ethereum)
        
        // Get network info
        await updateNetworkInfo()
        
        // Setup listeners
        window.ethereum.on('chainChanged', () => window.location.reload())
        
        isLoading.value = false
        return true
      } else {
        // Try Ganache
        return await connectToGanache()
      }
    } catch (err) {
      console.error('❌ Web3 init failed:', err)
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  async function connectToGanache() {
    const ganacheUrls = [
      'http://localhost:8545',
      'http://127.0.0.1:8545',
      'http://localhost:7545',
      'http://127.0.0.1:7545'
    ]

    for (const url of ganacheUrls) {
      try {
        console.log(`🔄 Trying Ganache at ${url}...`)
        const tempWeb3 = new Web3(url)
        await tempWeb3.eth.net.isListening()
        
        web3.value = tempWeb3
        await updateNetworkInfo()
        console.log(`✅ Connected to Ganache at ${url}`)
        return true
      } catch (e) {
        console.log(`❌ Failed: ${url}`)
      }
    }
    
    error.value = 'No Web3 provider found'
    return false
  }

  async function updateNetworkInfo() {
    if (!web3.value) return
    
    const id = await web3.value.eth.getChainId()
    chainId.value = id
    console.log('📡 Chain ID:', id)
    
    currentNetwork.value = NETWORK_CONFIG[id] || {
      name: `Network ${id}`,
      symbol: 'ETH',
      contracts: { bananaVest: '', usdt: '' },
      color: '#666666',
      isTestnet: id !== 1 && id !== 56 && id !== 137 // Mainnet نیست
    }
    
    console.log('🌐 Network:', currentNetwork.value.name)
    console.log('🧪 Is Testnet:', isTestnet.value)
  }

  async function switchNetwork(targetChainId) {
    if (!window.ethereum) {
      error.value = 'MetaMask required'
      return false
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      })
      return true
    } catch (err) {
      error.value = err.message
      return false
    }
  }

  return {
    web3,
    currentNetwork,
    chainId,
    isLoading,
    error,
    networkName,
    networkColor,
    isTestnet,
    initWeb3,
    updateNetworkInfo,
    switchNetwork
  }
})