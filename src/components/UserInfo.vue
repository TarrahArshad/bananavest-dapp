<template>
  <div class="card">
    <h2><i class="fas fa-user"></i> My Information</h2>
    
    <div v-if="!userStore.isWalletConnected" class="not-connected">
      <i class="fas fa-wallet"></i>
      <p>Please connect your wallet first</p>
    </div>
    
    <div v-else-if="contractStore.isLoading" class="loading-info">
      <i class="fas fa-spinner fa-spin"></i> Loading your information...
    </div>
    
    <div v-else>
      <div class="user-info">
        <div class="info-row">
          <span class="info-label">Wallet Address:</span>
          <span class="info-value">{{ userStore.formattedAddress || 'Not connected' }}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Registered:</span>
          <span class="info-value" :class="userStore.userInfo?.isRegistered ? 'text-success' : 'text-danger'">
            {{ userStore.userInfo?.isRegistered ? 'Yes ✅' : 'No ❌' }}
          </span>
        </div>
        
        <template v-if="userStore.userInfo?.isRegistered">
          <div class="info-row">
            <span class="info-label">User ID:</span>
            <span class="info-value">{{ userStore.userInfo.index }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Position:</span>
            <span class="info-value">{{ userStore.userInfo.position || 'Not set' }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">{{ userStore.userInfo.name || 'Not set' }}</span>
          </div>
        </template>
      </div>

      <div v-if="userStore.userInfo?.isRegistered" class="balances">
        <h3><i class="fas fa-coins"></i> My Balances</h3>
        
        <div class="balance-item">
          <span>Tree Balance:</span>
          <strong>{{ userStore.userInfo.treeBalance || 0 }}</strong>
        </div>
        
        <div class="balance-item">
          <span>Left Team:</span>
          <strong>{{ userStore.userInfo.leftTeam || 0 }}</strong>
        </div>
        
        <div class="balance-item">
          <span>Right Team:</span>
          <strong>{{ userStore.userInfo.rightTeam || 0 }}</strong>
        </div>
        
        <div class="balance-item">
          <span>Tether Balance:</span>
          <strong>{{ userStore.userInfo.tetherBalance || '0' }} USDT</strong>
        </div>
        
        <div class="balance-item">
          <span>Total Received:</span>
          <strong>{{ userStore.userInfo.totalReceived || '0' }} USDT</strong>
        </div>
      </div>
      
      <div v-else-if="userStore.isWalletConnected" class="not-registered">
        <i class="fas fa-exclamation-circle"></i>
        <p>You are not registered yet. Please join the network using the form below.</p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="contractStore.error" class="alert alert-danger mt-3">
      <i class="fas fa-exclamation-circle"></i>
      {{ contractStore.error }}
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'
import { useNetworkStore } from '../stores/networkStore'

// Initialize stores
const userStore = useUserStore()
const contractStore = useContractStore()
const networkStore = useNetworkStore()

// Load user data when wallet connects
watch(() => userStore.isWalletConnected, async (connected) => {
  if (connected && networkStore.web3 && contractStore.bananaContract) {
    console.log('👤 Loading user info for:', userStore.address)
    await contractStore.loadContractData()
  }
})

// Reload when network changes
watch(() => networkStore.chainId, async () => {
  if (userStore.isWalletConnected && contractStore.bananaContract) {
    await contractStore.loadContractData()
  }
})

onMounted(async () => {
  if (userStore.isWalletConnected && contractStore.bananaContract) {
    await contractStore.loadContractData()
  }
})
</script>

<style scoped>
.user-info {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 15px;
  border: 1px solid #e0e0e0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #666;
  font-weight: 500;
}

.info-value {
  font-weight: 600;
  color: #333;
}

.text-success {
  color: #28a745 !important;
}

.text-danger {
  color: #dc3545 !important;
}

.balances {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
}

.balances h3 {
  margin-bottom: 15px;
  color: #555;
  display: flex;
  align-items: center;
  gap: 8px;
}

.balances h3 i {
  color: #ffc107;
}

.balance-item {
  display: flex;
  justify-content: space-between;
  background: white;
  padding: 15px;
  margin: 8px 0;
  border-radius: 10px;
  border-left: 4px solid #667eea;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.balance-item strong {
  color: #28a745;
  font-size: 16px;
}

.not-connected, .not-registered, .loading-info {
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  color: #666;
}

.not-connected i, .not-registered i, .loading-info i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #667eea;
}

.not-registered i {
  color: #ffc107;
}

.loading-info i {
  color: #667eea;
}

.not-connected p, .not-registered p, .loading-info p {
  font-size: 14px;
  margin-top: 10px;
}

.alert {
  padding: 12px;
  border-radius: 8px;
  margin-top: 15px;
  font-size: 14px;
}

.alert-danger {
  background: #fff5f5;
  border: 1px solid #fcc;
  color: #dc3545;
}

.mt-3 {
  margin-top: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fa-spin {
  animation: spin 1s linear infinite;
}
</style>