<template>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="logo">
        <i class="fas fa-banana"></i>
        <div>
          <h1>BananaVEST</h1>
          <p>MLM Binary Investment Platform</p>
        </div>
      </div>

      <div class="wallet-section">
        <div v-if="userStore.isWalletConnected" class="wallet-info">
          <span class="connected-dot"></span>
          <span>{{ userStore.formattedAddress }}</span>
          <button @click="userStore.switchAccount" class="btn btn-secondary btn-small">
            <i class="fas fa-sync-alt"></i>
          </button>
          <button @click="userStore.disconnect" class="btn btn-danger btn-small">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
        <button v-else @click="connectWallet" class="btn btn-primary" :disabled="userStore.isConnecting">
          <i class="fas fa-wallet"></i>
          {{ userStore.isConnecting ? 'Connecting...' : 'Connect Wallet' }}
        </button>
      </div>
    </header>

    <!-- Main Dashboard -->
    <main class="dashboard">
      <!-- Quick Debug Panel (optional - می‌تونی حذفش کنی) -->
      <div class="card" style="background: #fff3cd; border-left: 4px solid #ffc107;">
        <h2><i class="fas fa-bug"></i> Quick Debug</h2>
        <div style="display: grid; gap: 10px;">
          <div><strong>MetaMask Installed:</strong> {{ hasMetaMask ? '✅' : '❌' }}</div>
          <div><strong>Web3 Initialized:</strong> {{ networkStore.web3 ? '✅' : '❌' }}</div>
          <div><strong>Network:</strong> {{ networkStore.networkName }} ({{ networkStore.chainId }})</div>
          <div><strong>Wallet Connected:</strong> {{ userStore.isWalletConnected ? '✅' : '❌' }}</div>
          <div><strong>Contract Address:</strong> {{ contractStore.bananaAddress || 'Not found' }}</div>
          <div v-if="contractStore.error" style="color: #dc3545;"><strong>Error:</strong> {{ contractStore.error }}</div>
          <div v-if="networkStore.error" style="color: #dc3545;"><strong>Network Error:</strong> {{ networkStore.error }}</div>
          
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button @click="forceInit" class="btn btn-warning btn-sm">
              <i class="fas fa-sync"></i> Force Reconnect
            </button>
            <button @click="checkContracts" class="btn btn-info btn-sm">
              <i class="fas fa-search"></i> Check Contracts
            </button>
          </div>
        </div>
      </div>

      <!-- Network Information -->
      <NetworkInfo />
      
      <!-- Quick Actions -->
      <QuickActions />
      
      <!-- Two Column Layout -->
      <div class="grid-2">
        <ContractStats />
        <UserInfo />
      </div>
      
      <!-- Join Network -->
      <JoinNetwork />
      
      <!-- Hidden Wallet Management -->
      <HiddenWallet />
      
      <!-- Distribution Management -->
      <DistributionManagement />
      
      <!-- Network Tree -->
      <NetworkTree />
    </main>

    <!-- Footer -->
    <Footer />

    <!-- Loading Overlay -->
    <div v-if="isAnyLoading" class="loading active">
      <div class="spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

// Import stores
import { useNetworkStore } from './stores/networkStore'
import { useUserStore } from './stores/userStore'
import { useContractStore } from './stores/contractStore'

// Import all components
import NetworkInfo from './components/NetworkInfo.vue'
import QuickActions from './components/QuickActions.vue'
import ContractStats from './components/ContractStats.vue'
import UserInfo from './components/UserInfo.vue'
import JoinNetwork from './components/JoinNetwork.vue'
import HiddenWallet from './components/HiddenWallet.vue'
import DistributionManagement from './components/DistributionManagement.vue'
import NetworkTree from './components/NetworkTree.vue'
import Footer from './components/Footer.vue'

// Initialize stores
const networkStore = useNetworkStore()
const userStore = useUserStore()
const contractStore = useContractStore()

// Computed properties
const hasMetaMask = computed(() => typeof window.ethereum !== 'undefined')
const isAnyLoading = computed(() => networkStore.isLoading || userStore.isConnecting || contractStore.isLoading)
const loadingText = computed(() => {
  if (networkStore.isLoading) return 'Connecting to network...'
  if (userStore.isConnecting) return 'Connecting wallet...'
  if (contractStore.isLoading) return 'Loading contract data...'
  return 'Loading...'
})

// Connect wallet function
async function connectWallet() {
  console.log('🚀 Connecting wallet...')
  const connected = await userStore.connect()
  
  if (connected) {
    console.log('✅ Wallet connected:', userStore.address)
    await networkStore.updateNetworkInfo()
    await contractStore.initContracts()
    await contractStore.loadContractData()
  } else {
    console.error('❌ Wallet connection failed:', userStore.error)
  }
}

// Force reinitialize
async function forceInit() {
  console.log('🔄 Force reinitializing...')
  networkStore.isLoading = true
  
  try {
    await networkStore.initWeb3()
    if (userStore.isWalletConnected) {
      await contractStore.initContracts()
      await contractStore.loadContractData()
    }
    alert('✅ Reconnected successfully!')
  } catch (error) {
    alert('❌ Failed: ' + error.message)
  } finally {
    networkStore.isLoading = false
  }
}

// Check contracts
async function checkContracts() {
  console.log('🔍 Checking contracts...')
  await networkStore.updateNetworkInfo()
  await contractStore.initContracts()
  alert(`BananaVEST: ${contractStore.bananaAddress || '❌ Not found'}\nUSDT: ${contractStore.usdtAddress || '❌ Not found'}`)
}

// Watch for wallet connection to reload data
watch(() => userStore.isWalletConnected, async (connected) => {
  if (connected && networkStore.web3) {
    console.log('👛 Wallet connected, loading contract data...')
    await contractStore.loadContractData()
  }
})

// Watch for successful join
watch(() => contractStore.userInfo?.isRegistered, async (registered) => {
  if (registered) {
    console.log('✅ User registered, refreshing all data...')
    await contractStore.loadContractData()
  }
})

// Watch for loading states
watch(() => contractStore.isLoading, (loading) => {
  console.log('🔄 contractStore.isLoading changed:', loading)
})

watch(() => networkStore.isLoading, (loading) => {
  console.log('🔄 networkStore.isLoading changed:', loading)
})

// Initialize on mount
onMounted(async () => {
  console.log('📱 App mounted, initializing...')
  await networkStore.initWeb3()
  
  // Try to auto-connect if MetaMask is already connected
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length > 0) {
        console.log('🔄 Auto-connecting...')
        await connectWallet()
      }
    } catch (error) {
      console.log('Auto-connect failed:', error)
    }
  }
})
</script>

<style>
@import './assets/main.css';

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

@media (max-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>