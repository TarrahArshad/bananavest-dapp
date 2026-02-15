<template>
  <div class="card w-full">
    <h2><i class="fas fa-network-wired"></i> Network Information</h2>
    
    <div class="network-info-content">
      <!-- Network Status -->
      <div class="network-status">
        <span 
          class="network-indicator" 
          :class="{ online: networkStore.web3 }"
          :style="{ backgroundColor: networkStore.web3 ? networkStore.networkColor : '#dc3545' }"
        ></span>
        <span class="network-name">{{ networkStore.networkName }}</span>
        <span class="network-badge">Chain ID: {{ networkStore.chainId }}</span>
      </div>

      <!-- Network Details -->
      <div class="network-info-details">
        <div>
          <strong>Name:</strong> 
          <span>{{ networkStore.currentNetwork?.name || 'Detecting...' }}</span>
        </div>
        <div>
          <strong>Chain ID:</strong> 
          <span>{{ networkStore.chainId || '...' }}</span>
          <span class="chain-hex" v-if="networkStore.chainId">
            (0x{{ networkStore.chainId.toString(16) }})
          </span>
        </div>
        <div>
          <strong>Native Token:</strong> 
          <span>{{ networkStore.currentNetwork?.symbol || 'ETH' }}</span>
        </div>
        <div>
          <strong>Type:</strong> 
          <span :class="getNetworkTypeClass">
            {{ getNetworkTypeText }}
          </span>
        </div>
        <div v-if="networkStore.currentNetwork?.explorer">
          <strong>Explorer:</strong> 
          <a :href="networkStore.currentNetwork.explorer" target="_blank" 
             :style="{ color: networkStore.networkColor }">
            {{ formatExplorerUrl(networkStore.currentNetwork.explorer) }}
            <i class="fas fa-external-link-alt" style="font-size: 12px; margin-left: 5px;"></i>
          </a>
        </div>
      </div>

      <!-- Contract Addresses -->
      <div class="contract-addresses">
        <div class="address-item">
          <strong>
            <i class="fas fa-file-contract"></i> BananaVEST Contract:
          </strong>
          <div class="contract-address" 
               :class="{ 'address-found': contractStore.bananaAddress, 'address-missing': !contractStore.bananaAddress }">
            <template v-if="contractStore.bananaAddress">
              <span class="address-full">{{ contractStore.bananaAddress }}</span>
              <span class="address-short">{{ formatAddress(contractStore.bananaAddress) }}</span>
              <span class="status-badge success">✅ Active</span>
            </template>
            <template v-else>
              <span class="address-missing-text">Not detected on this network</span>
              <span class="status-badge error">❌ Not found</span>
            </template>
          </div>
        </div>

        <div class="address-item">
          <strong>
            <i class="fas fa-coins"></i> USDT Token:
          </strong>
          <div class="contract-address"
               :class="{ 'address-found': contractStore.usdtAddress, 'address-missing': !contractStore.usdtAddress }">
            <template v-if="contractStore.usdtAddress">
              <span class="address-full">{{ contractStore.usdtAddress }}</span>
              <span class="address-short">{{ formatAddress(contractStore.usdtAddress) }}</span>
              <span class="status-badge success">✅ Active</span>
            </template>
            <template v-else>
              <span class="address-missing-text">Not detected on this network</span>
              <span class="status-badge error">❌ Not found</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Network Actions -->
      <div class="network-actions">
        <h3><i class="fas fa-exchange-alt"></i> Switch Network</h3>
        <div class="network-buttons">
          <button 
            @click="switchToNetwork(80002)" 
            class="btn btn-sm" 
            :class="getNetworkButtonClass(80002)"
            :disabled="networkStore.chainId === 80002"
          >
            <i class="fab fa-polygon"></i>
            Polygon Amoy
            <span v-if="networkStore.chainId === 80002" class="active-indicator">✓</span>
          </button>

          <button 
            @click="switchToNetwork(80001)" 
            class="btn btn-sm" 
            :class="getNetworkButtonClass(80001)"
            :disabled="networkStore.chainId === 80001"
          >
            <i class="fab fa-polygon"></i>
            Polygon Mumbai
            <span v-if="networkStore.chainId === 80001" class="active-indicator">✓</span>
          </button>

          <button 
            @click="switchToNetwork(1337)" 
            class="btn btn-sm" 
            :class="getNetworkButtonClass(1337)"
            :disabled="networkStore.chainId === 1337 || networkStore.chainId === 5777 || networkStore.chainId === 2025"
          >
            <i class="fas fa-server"></i>
            Ganache
            <span v-if="[1337, 5777, 2025].includes(networkStore.chainId)" class="active-indicator">✓</span>
          </button>

          <button 
            @click="switchToNetwork(97)" 
            class="btn btn-sm" 
            :class="getNetworkButtonClass(97)"
            :disabled="networkStore.chainId === 97"
          >
            <i class="fab fa-btc"></i>
            BSC Testnet
            <span v-if="networkStore.chainId === 97" class="active-indicator">✓</span>
          </button>

          <button 
            @click="switchToNetwork(137)" 
            class="btn btn-sm" 
            :class="getNetworkButtonClass(137)"
            :disabled="networkStore.chainId === 137"
          >
            <i class="fab fa-polygon"></i>
            Polygon Mainnet
            <span v-if="networkStore.chainId === 137" class="active-indicator">✓</span>
          </button>
        </div>
      </div>

      <!-- Refresh Button -->
      <div class="refresh-section">
        <button @click="refreshNetworkInfo" class="btn btn-secondary btn-sm" :disabled="networkStore.isLoading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': networkStore.isLoading }"></i>
          Refresh Network Info
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="networkStore.error" class="alert alert-danger mt-3">
        <i class="fas fa-exclamation-triangle"></i>
        {{ networkStore.error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useNetworkStore } from '../stores/networkStore'
import { useContractStore } from '../stores/contractStore'
import { formatAddress } from '../utils/helpers'

const networkStore = useNetworkStore()
const contractStore = useContractStore()

// Computed properties for network type
const getNetworkTypeClass = computed(() => {
  return networkStore.isTestnet ? 'testnet-badge' : 'mainnet-badge'
})

const getNetworkTypeText = computed(() => {
  return networkStore.isTestnet ? 'Testnet 🧪' : 'Mainnet ⚡'
})

// Helper to format explorer URL
const formatExplorerUrl = (url) => {
  return url.replace('https://', '').replace('http://', '')
}

// Helper to get button class based on network
const getNetworkButtonClass = (chainId) => {
  if (networkStore.chainId === chainId) {
    return 'btn-success active-network'
  }
  
  // For Ganache multiple IDs
  if ((chainId === 1337) && [1337, 5777, 2025].includes(networkStore.chainId)) {
    return 'btn-success active-network'
  }
  
  return 'btn-primary'
}

// Switch network function
const switchToNetwork = async (chainId) => {
  try {
    const success = await networkStore.switchNetwork(chainId)
    if (success) {
      // بعد از تغییر شبکه، قراردادها رو دوباره مقداردهی کن
      setTimeout(async () => {
        await contractStore.initContracts()
        if (contractStore.bananaContract && contractStore.usdtContract) {
          await contractStore.loadContractData()
        }
      }, 2000)
    }
  } catch (error) {
    console.error('Failed to switch network:', error)
  }
}

// Refresh network info
const refreshNetworkInfo = async () => {
  await networkStore.updateNetworkInfo()
  await contractStore.initContracts()
  if (contractStore.bananaContract && contractStore.usdtContract) {
    await contractStore.loadContractData()
  }
}

// Watch for network changes
onMounted(() => {
  // Log current state for debugging
  console.log('🌐 NetworkInfo mounted - Network:', {
    name: networkStore.networkName,
    chainId: networkStore.chainId,
    web3: !!networkStore.web3,
    isTestnet: networkStore.isTestnet
  })
  
  console.log('📝 NetworkInfo mounted - Contracts:', {
    banana: contractStore.bananaAddress || 'Not found',
    usdt: contractStore.usdtAddress || 'Not found'
  })
})
</script>

<style scoped>
.network-info-content {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
}

.network-status {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.network-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
  transition: all 0.3s ease;
}

.network-indicator.online {
  animation: pulse 2s infinite;
}

.network-name {
  font-weight: 600;
  color: #333;
}

.network-badge {
  background: #e9ecef;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-left: auto;
}

.network-info-details {
  background: white;
  border-radius: 10px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

.network-info-details div {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed #e0e0e0;
}

.network-info-details div:last-child {
  border-bottom: none;
}

.network-info-details strong {
  width: 120px;
  color: #495057;
  font-size: 14px;
}

.chain-hex {
  margin-left: 10px;
  font-size: 12px;
  color: #6c757d;
  font-family: monospace;
}

.testnet-badge {
  background: #17a2b8;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.mainnet-badge {
  background: #28a745;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.contract-addresses {
  margin-bottom: 20px;
}

.address-item {
  margin-bottom: 15px;
}

.address-item strong {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.address-item strong i {
  margin-right: 8px;
  color: #667eea;
}

.contract-address {
  background: white;
  padding: 12px 15px;
  border-radius: 10px;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.address-found {
  border-color: #28a745;
  background: #f0fff4;
}

.address-missing {
  border-color: #dc3545;
  background: #fff5f5;
}

.address-full {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #333;
  word-break: break-all;
  flex: 1;
}

.address-short {
  display: none;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #333;
}

.address-missing-text {
  color: #dc3545;
  font-size: 14px;
  flex: 1;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.success {
  background: #28a745;
  color: white;
}

.status-badge.error {
  background: #dc3545;
  color: white;
}

.network-actions {
  background: white;
  border-radius: 10px;
  padding: 15px;
  border: 1px solid #e0e0e0;
  margin-bottom: 15px;
}

.network-actions h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.network-actions h3 i {
  color: #667eea;
}

.network-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.network-buttons .btn {
  flex: 1;
  min-width: 140px;
  justify-content: center;
  position: relative;
  padding: 10px;
  font-size: 13px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-success {
  background: #28a745 !important;
  color: white !important;
  border: 2px solid #1e7e34 !important;
}

.btn-success:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(40, 167, 69, 0.4);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.active-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  background: white;
  color: #28a745;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  border: 2px solid #28a745;
}

.refresh-section {
  display: flex;
  justify-content: flex-end;
}

.btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
  border: none;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.fa-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
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

/* Responsive */
@media (max-width: 768px) {
  .network-info-details div {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .network-info-details strong {
    width: 100%;
  }
  
  .address-full {
    display: none;
  }
  
  .address-short {
    display: inline;
  }
  
  .network-buttons {
    flex-direction: column;
  }
  
  .network-buttons .btn {
    width: 100%;
  }
  
  .network-status {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .network-badge {
    margin-left: 0;
  }
}
</style>