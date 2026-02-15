<template>
  <div class="card">
    <h2><i class="fas fa-chart-line"></i> Contract Statistics</h2>
    
    <div v-if="contractStore.isLoading" class="loading-stats">
      <i class="fas fa-spinner fa-spin"></i> Loading statistics...
    </div>
    
    <div v-else class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Total Users</span>
        <span class="stat-value">{{ contractStore.contractStats.totalUsers }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">Total Liquidity</span>
        <span class="stat-value">{{ contractStore.contractStats.totalLiquidity }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">Pending Updates</span>
        <span class="stat-value">{{ contractStore.contractStats.pendingUpdates }}</span>
      </div>
      
      <div class="stat-item">
        <span class="stat-label">Status</span>
        <span class="stat-value" :class="getStatusClass">
          {{ contractStore.contractStats.status }}
        </span>
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
import { computed, onMounted } from 'vue'
import { useContractStore } from '../stores/contractStore'
import { useNetworkStore } from '../stores/networkStore'
import { useUserStore } from '../stores/userStore'

// Initialize stores
const contractStore = useContractStore()
const networkStore = useNetworkStore()
const userStore = useUserStore()

// Computed property for status class
const getStatusClass = computed(() => {
  const status = contractStore.contractStats.status
  if (status.includes('✅')) return 'status-active'
  if (status.includes('⏸️')) return 'status-paused'
  return ''
})

// Load data on mount if wallet is connected
onMounted(async () => {
  if (userStore.isWalletConnected && networkStore.web3) {
    await contractStore.loadContractData()
  }
})
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.stat-item {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 15px;
  text-align: center;
  border: 1px solid #e0e0e0;
  transition: transform 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.stat-label {
  display: block;
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: #333;
}

.status-active {
  color: #28a745 !important;
}

.status-paused {
  color: #dc3545 !important;
}

.loading-stats {
  text-align: center;
  padding: 30px;
  color: #666;
  background: #f8f9fa;
  border-radius: 10px;
}

.loading-stats i {
  margin-right: 8px;
  color: #667eea;
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