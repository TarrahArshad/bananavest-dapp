// Debug helper - run in browser console
window.debugBananaVEST = {
  checkMetaMask: () => {
    console.log('MetaMask installed:', !!window.ethereum)
    console.log('MetaMask details:', window.ethereum)
    return !!window.ethereum
  },
  
  checkWeb3: () => {
    const store = useNetworkStore()
    console.log('Web3 initialized:', !!store.web3)
    console.log('Current network:', store.networkName)
    console.log('Chain ID:', store.chainId)
    return store.web3
  },
  
  checkWallet: () => {
    const store = useUserStore()
    console.log('Wallet connected:', store.isWalletConnected)
    console.log('Address:', store.address)
    console.log('Formatted:', store.formattedAddress)
    return store.address
  },
  
  checkContracts: async () => {
    const store = useContractStore()
    console.log('BananaVEST address:', store.bananaAddress)
    console.log('USDT address:', store.usdtAddress)
    console.log('Contract initialized:', !!store.bananaContract)
    
    if (store.bananaContract && store.bananaAddress) {
      try {
        const code = await store.bananaContract.methods.lastIndex().call()
        console.log('Contract test - lastIndex:', code)
      } catch (e) {
        console.error('Contract test failed:', e)
      }
    }
  },
  
  fixAll: async () => {
    console.log('🔧 Running fixes...')
    
    // Reset stores
    const networkStore = useNetworkStore()
    const userStore = useUserStore()
    const contractStore = useContractStore()
    
    // Reinit Web3
    await networkStore.initWeb3()
    
    // Try to connect wallet
    if (!userStore.isWalletConnected) {
      await userStore.connect()
    }
    
    // Reinit contracts
    if (userStore.isWalletConnected) {
      await contractStore.initContracts()
      await contractStore.loadContractData()
    }
    
    console.log('✅ Fixes applied')
  }
}

console.log('🐛 Debug helpers loaded! Run window.debugBananaVEST.fixAll() to fix connection issues')