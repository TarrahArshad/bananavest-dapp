<template>
  <div class="card w-full">
    <div class="quick-actions-header">
      <h2><i class="fas fa-bolt"></i> Quick Actions</h2>
      <button @click="handleRefresh" class="btn btn-secondary" :disabled="isAnyLoading">
        <i class="fas fa-redo" :class="{ 'fa-spin': isAnyLoading }"></i>
        Refresh Data
      </button>
    </div>

    <div class="actions-grid">
      <button @click="handleCheckBalance" class="btn btn-primary" :disabled="!isWalletReady">
        <i class="fas fa-wallet"></i> Check USDT
      </button>
      
      <button @click="handleGetMyInfo" class="btn btn-primary" :disabled="!isWalletReady">
        <i class="fas fa-user"></i> My Info
      </button>
      
      <button @click="handleWithdraw" class="btn btn-success" :disabled="!isWalletReady || !userStore.userInfo?.isRegistered">
        <i class="fas fa-money-bill-wave"></i> Withdraw
      </button>
      
      <button @click="handleGetCommissions" class="btn btn-warning" :disabled="!isWalletReady || !userStore.userInfo?.isRegistered">
        <i class="fas fa-hand-holding-usd"></i> Get Commission
      </button>
      
      <button @click="handleDebugContracts" class="btn btn-info" :disabled="!networkStore.web3">
        <i class="fas fa-bug"></i> Debug Contracts
      </button>
      
      <button @click="handleShowNetworkInfo" class="btn btn-secondary">
        <i class="fas fa-info-circle"></i> Network Info
      </button>
      
      <button @click="handleSetupGanache" class="btn btn-primary">
        <i class="fas fa-server"></i> Setup Ganache
      </button>
      
      <button @click="handleCheckGasSettings" class="btn btn-warning" :disabled="!networkStore.web3">
        <i class="fas fa-gas-pump"></i> Check Gas
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="localError" class="alert alert-danger mt-3">
      <i class="fas fa-exclamation-circle"></i>
      {{ localError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useNetworkStore } from '../stores/networkStore'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'
import { NETWORK_CONFIG, formatUSDT } from '../utils/constants'

// Initialize stores
const networkStore = useNetworkStore()
const userStore = useUserStore()
const contractStore = useContractStore()

// Local state - use local error instead of shared
const localError = ref(null)
const isLoading = ref(false)

// Computed properties
const isWalletReady = computed(() => {
  return userStore.isWalletConnected && networkStore.web3
})

const isAnyLoading = computed(() => {
  return networkStore.isLoading || contractStore.isLoading || isLoading.value
})

// Helper to set error with auto-clear
const setError = (message) => {
  localError.value = message
  setTimeout(() => {
    localError.value = null
  }, 5000)
}

// Refresh all data - renamed to avoid conflicts
const handleRefresh = async () => {
  console.log('🔄 Refreshing all data...')
  
  try {
    isLoading.value = true
    
    await networkStore.updateNetworkInfo()
    await contractStore.initContracts()
    
    if (userStore.isWalletConnected) {
      await contractStore.loadContractData()
      await userStore.updateBalance()
    }
    
    console.log('✅ Refresh completed')
  } catch (err) {
    console.error('Refresh error:', err)
    setError(err.message)
  } finally {
    isLoading.value = false
  }
}

// Check USDT balance
// Check USDT balance
const handleCheckBalance = async () => {
  if (!isWalletReady.value) {
    setError('Please connect wallet first')
    return
  }

  try {
    isLoading.value = true
    console.log('💰 Checking USDT balance...')
    console.log('📌 Wallet:', userStore.address)
    console.log('📌 Network:', networkStore.networkName, '(Chain ID:', networkStore.chainId, ')')
    console.log('📌 USDT Contract:', contractStore.usdtAddress)
    
    if (!contractStore.usdtContract) {
      setError('USDT contract not initialized for this network')
      return
    }

    // 1. Check if contract exists
    const code = await networkStore.web3.eth.getCode(contractStore.usdtAddress)
    console.log('📌 Contract code exists:', code !== '0x')
    
    if (code === '0x') {
      setError('No contract found at USDT address')
      return
    }

    // 2. Get token info
    let symbol = 'USDT'
    let decimals = 6
    try {
      symbol = await contractStore.usdtContract.methods.symbol().call()
      decimals = await contractStore.usdtContract.methods.decimals().call()
      console.log('📌 Token Symbol:', symbol)
      console.log('📌 Token Decimals:', decimals)
    } catch (e) {
      console.log('Could not get token info:', e.message)
    }

    // 3. Get balance
    const balance = await contractStore.usdtContract.methods.balanceOf(userStore.address).call()
    console.log('📌 Raw Balance:', balance.toString())
    
    // Format based on decimals
    const formattedBalance = (Number(balance) / Math.pow(10, decimals)).toFixed(decimals === 6 ? 2 : 4)
    
    // 4. Get some test addresses to compare
    console.log('📌 Testing with known addresses:')
    const testAddresses = [
      '0x0000000000000000000000000000000000000000', // zero address
      contractStore.bananaAddress // contract address
    ]
    
    for (const addr of testAddresses) {
      try {
        const testBalance = await contractStore.usdtContract.methods.balanceOf(addr).call()
        console.log(`   - ${addr.substring(0, 10)}...: ${formatUSDT(testBalance)} USDT`)
      } catch (e) {}
    }

    if (balance === '0' || balance === 0) {
      // Check if this is the right network
      const expectedNetwork = networkStore.chainId
      const usdtOnThisNetwork = NETWORK_CONFIG[expectedNetwork]?.contracts?.usdt
      
      let message = `💰 Your ${symbol} Balance: ${formattedBalance} ${symbol}\n\n`
      message += `⚠️ Balance is zero. Possible reasons:\n`
      message += `1. You don't have ${symbol} on this network\n`
      message += `2. Wrong USDT contract address\n`
      message += `3. Network mismatch\n\n`
      message += `📡 Network: ${networkStore.networkName}\n`
      message += `📍 USDT Address: ${contractStore.usdtAddress}\n`
      message += `🔍 Expected USDT: ${usdtOnThisNetwork || 'Not in config'}`
      
      alert(message)
    } else {
      alert(`💰 Your ${symbol} Balance: ${formattedBalance} ${symbol}`)
    }
    
  } catch (err) {
    console.error('Balance check error:', err)
    setError(err.message)
  } finally {
    isLoading.value = false
  }
}

// Get my info
const handleGetMyInfo = async () => {
  if (!isWalletReady.value) {
    setError('Please connect wallet first')
    return
  }

  if (!userStore.userInfo?.isRegistered) {
    alert('You are not registered yet! Please join the network first.')
    return
  }

  try {
    isLoading.value = true
    await contractStore.loadContractData()
    alert('✅ Information updated! Check the User Info section.')
  } catch (err) {
    setError(err.message)
  } finally {
    isLoading.value = false
  }
}

// Withdraw funds
const handleWithdraw = async () => {
  if (!isWalletReady.value) {
    setError('Please connect wallet first')
    return
  }

  if (!userStore.userInfo?.isRegistered) {
    alert('You are not registered yet!')
    return
  }

  const amount = prompt('Enter amount to withdraw (in USDT):')
  if (!amount) return

  const amountNum = parseFloat(amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    alert('Please enter a valid amount')
    return
  }

  // Check if user has enough balance
  const currentBalance = parseFloat(userStore.userInfo?.tetherBalance || '0')
  if (amountNum > currentBalance) {
    alert(`Insufficient balance! You have ${currentBalance} USDT`)
    return
  }

  try {
    isLoading.value = true
    
    const amountInWei = BigInt(amountNum * 1000000)
    
    const tx = await contractStore.bananaContract.methods.withdraw(amountInWei.toString())
      .send({
        from: userStore.address,
        gas: 200000
      })

    if (tx.status) {
      alert('✅ Withdrawal successful!')
      await contractStore.loadContractData()
      await userStore.updateBalance()
    }
    
  } catch (err) {
    console.error('Withdraw error:', err)
    setError(err.message)
  } finally {
    isLoading.value = false
  }
}

// Get commissions
const handleGetCommissions = async () => {
  if (!isWalletReady.value) {
    setError('Please connect wallet first')
    return
  }

  if (!userStore.userInfo?.isRegistered) {
    alert('You are not registered yet!')
    return
  }

  try {
    isLoading.value = true

    const userIndex = userStore.userInfo.index
    const currentLD = await contractStore.bananaContract.methods.LD().call()

    let tx
    try {
      // Try single commission first
      tx = await contractStore.bananaContract.methods.getCommission(userIndex, currentLD)
        .send({
          from: userStore.address,
          gas: 200000
        })
    } catch {
      // If that fails, try multi-commission
      tx = await contractStore.bananaContract.methods.getMultiCommission(userIndex, currentLD)
        .send({
          from: userStore.address,
          gas: 300000
        })
    }

    if (tx.status) {
      alert('✅ Commissions claimed successfully!')
      await contractStore.loadContractData()
    }
    
  } catch (err) {
    console.error('Commission error:', err)
    setError(err.message)
  } finally {
    isLoading.value = false
  }
}

// Debug contracts
const handleDebugContracts = async () => {
  console.log('=== DEBUG CONTRACT CONNECTION ===')
  console.log('1. Network:', {
    name: networkStore.networkName,
    chainId: networkStore.chainId,
    web3: !!networkStore.web3
  })
  
  console.log('2. Wallet:', {
    connected: userStore.isWalletConnected,
    address: userStore.address,
    balance: userStore.balance
  })
  
  console.log('3. Contracts:', {
    bananaAddress: contractStore.bananaAddress,
    usdtAddress: contractStore.usdtAddress,
    bananaContract: !!contractStore.bananaContract,
    usdtContract: !!contractStore.usdtContract
  })

  if (contractStore.bananaContract && contractStore.bananaAddress) {
    try {
      const code = await networkStore.web3.eth.getCode(contractStore.bananaAddress)
      console.log('4. BananaVEST Code:', code === '0x' ? '❌ NOT DEPLOYED' : '✅ DEPLOYED')
      
      if (code !== '0x') {
        const lastIndex = await contractStore.bananaContract.methods.lastIndex().call()
        console.log('5. lastIndex:', lastIndex)
      }
    } catch (e) {
      console.log('4. BananaVEST check failed:', e.message)
    }
  }

  alert('✅ Debug complete! Check browser console (F12)')
}

// Show network info
const handleShowNetworkInfo = () => {
  const info = `
🌐 NETWORK INFORMATION
══════════════════════

📛 Name: ${networkStore.networkName}
🔗 Chain ID: ${networkStore.chainId}
💰 Native: ${networkStore.currentNetwork?.symbol || 'ETH'}
🧪 Type: ${networkStore.isTestnet ? 'Testnet' : 'Mainnet'}

📜 BananaVEST: ${contractStore.bananaAddress ? '✅ Found' : '❌ Not found'}
💵 USDT: ${contractStore.usdtAddress ? '✅ Found' : '❌ Not found'}

👛 Wallet: ${userStore.isWalletConnected ? userStore.formattedAddress : 'Not connected'}
  `
  alert(info)
}

// Setup Ganache guide
const handleSetupGanache = () => {
  const guide = `
🔧 GANACHE SETUP GUIDE
══════════════════════

1. Install Ganache:
   npm install -g ganache

2. Run Ganache:
   ganache --chainId 1337 --gasLimit 0x6691b7

3. Deploy contracts:
   • BananaVEST: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   • USDT: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

4. Connect in MetaMask:
   • Network Name: Ganache
   • RPC URL: http://localhost:8545
   • Chain ID: 1337
  `
  alert(guide)
  console.log(guide)
}

// Check gas settings
const handleCheckGasSettings = async () => {
  if (!networkStore.web3) {
    setError('Web3 not initialized')
    return
  }

  try {
    const gasPrice = await networkStore.web3.eth.getGasPrice()
    const gasPriceGwei = networkStore.web3.utils.fromWei(gasPrice, 'gwei')
    const block = await networkStore.web3.eth.getBlock('latest')

    const info = `
⛽ GAS SETTINGS
════════════════

📡 Network: ${networkStore.networkName}
💰 Gas Price: ${parseFloat(gasPriceGwei).toFixed(2)} Gwei
📦 Block Gas Limit: ${block.gasLimit.toLocaleString()}
📊 Gas Used: ${block.gasUsed.toLocaleString()}

📋 Recommended for BananaVEST:
• Join: 400,000 - 1,500,000 gas
• Distribution: 800,000 - 2,000,000 gas
• Withdraw: 200,000 gas
    `
    alert(info)
    
  } catch (err) {
    console.error('Gas check error:', err)
    setError(err.message)
  }
}
</script>

<style scoped>
.quick-actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fa-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.alert {
  padding: 15px;
  border-radius: 8px;
  margin-top: 15px;
}

.alert-danger {
  background: #fff5f5;
  border: 1px solid #fcc;
  color: #dc3545;
}

.mt-3 {
  margin-top: 15px;
}
</style>