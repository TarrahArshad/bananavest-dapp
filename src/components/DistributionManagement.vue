<template>
  <div class="card">
    <h2><i class="fas fa-sync-alt"></i> Distribution Management</h2>
    
    <!-- Network not connected state -->
    <div v-if="!networkStore.web3" class="not-connected">
      <i class="fas fa-plug"></i>
      <p>Please connect to a network first</p>
    </div>
    
    <!-- Contract not detected state -->
    <div v-else-if="!contractStore.bananaContract" class="not-connected">
      <i class="fas fa-file-contract"></i>
      <p>Contract not detected on this network</p>
    </div>
    
    <!-- Main content when everything is ready -->
    <div v-else>
      <!-- Component-specific loading state - only shows inside this card -->
      <div v-if="isLoading" class="component-loading">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Loading distribution data...</span>
        </div>
      </div>
      
      <!-- Main content - only shown when not loading -->
      <template v-else>
        <!-- Distribution information panel -->
        <div class="distribution-info">
          <div class="info-row">
            <span class="info-label">
              <i class="fas fa-calendar-alt"></i> Current LD:
            </span>
            <span class="info-value">{{ formatDate(currentLD) }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">
              <i class="fas fa-clock"></i> Next Distribution:
            </span>
            <span class="info-value">{{ formatDate(nextDistribution) }}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">
              <i class="fas fa-hourglass-half"></i> Time Remaining:
            </span>
            <span class="info-value" :class="timeRemainingClass">
              {{ timeRemaining }}
            </span>
          </div>
          
          <div class="info-row">
            <span class="info-label">
              <i class="fas fa-users-cog"></i> Pending Updates:
            </span>
            <span class="info-value">{{ pendingUpdates }}</span>
          </div>

          <div class="info-row">
            <span class="info-label">
              <i class="fas fa-chart-line"></i> Per Balance:
            </span>
            <span class="info-value">{{ perBalance }} USDT</span>
          </div>

          <div class="info-row">
            <span class="info-label">
              <i class="fas fa-water"></i> Liquidity Pool:
            </span>
            <span class="info-value">{{ liquidityPool }} USDT</span>
          </div>
        </div>

        <!-- System status indicator with color coding -->
        <div class="distribution-status" :class="statusClass">
          <i class="fas" :class="statusIcon"></i>
          <div>
            <strong>{{ statusText }}</strong>
            <span>{{ statusDetail }}</span>
          </div>
        </div>

        <!-- Action buttons for distribution management -->
        <div class="distribution-actions">
          <button 
            @click="executeDistribution"
            class="btn btn-success"
            :disabled="isExecuting || !canExecute"
          >
            <i class="fas fa-play-circle" :class="{ 'fa-spin': isExecuting }"></i>
            {{ isExecuting ? 'Executing...' : 'Execute Distribution' }}
          </button>
          
          <button 
            @click="helpUpdate"
            class="btn btn-warning"
            :disabled="isHelping || pendingUpdates === 0"
          >
            <i class="fas fa-hands-helping" :class="{ 'fa-spin': isHelping }"></i>
            {{ isHelping ? 'Processing...' : 'Help Update Tree' }}
          </button>
          
          <button 
            @click="forceCatchUp"
            class="btn btn-info"
            :disabled="isCatchingUp || !canCatchUp"
          >
            <i class="fas fa-forward" :class="{ 'fa-spin': isCatchingUp }"></i>
            {{ isCatchingUp ? 'Catching up...' : 'Force Catch Up' }}
          </button>
          
          <button 
            @click="checkStatus"
            class="btn btn-secondary"
            :disabled="isChecking"
          >
            <i class="fas fa-sync-alt" :class="{ 'fa-spin': isChecking }"></i>
            {{ isChecking ? 'Checking...' : 'Check Status' }}
          </button>
        </div>

        <!-- Informational note about distribution cycle -->
        <div class="distribution-note">
          <i class="fas fa-info-circle"></i>
          <span>
            Distribution runs every {{ balancePeriodMinutes }} minutes. 
            {{ pendingUpdates > 0 ? `${pendingUpdates} users need updates.` : 'All users are up to date.' }}
          </span>
        </div>
      </template>

      <!-- Error message display (auto-hides after 5 seconds) -->
      <div v-if="localError" class="alert alert-danger mt-3">
        <i class="fas fa-exclamation-circle"></i>
        {{ localError }}
      </div>

      <!-- Success message display (auto-hides after 5 seconds) -->
      <div v-if="successMessage" class="alert alert-success mt-3">
        <i class="fas fa-check-circle"></i>
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNetworkStore } from '../stores/networkStore'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'
import { formatUSDT } from '../utils/constants'

// ============================================
// STORE INITIALIZATION
// ============================================
const networkStore = useNetworkStore()
const userStore = useUserStore()
const contractStore = useContractStore()

// ============================================
// LOCAL STATE MANAGEMENT
// ============================================
const isLoading = ref(false)           // Controls component-specific loading state
const isExecuting = ref(false)          // Prevents multiple distribution executions
const isHelping = ref(false)            // Prevents multiple help updates
const isCatchingUp = ref(false)         // Prevents multiple catch-up operations
const isChecking = ref(false)           // Prevents multiple status checks
const localError = ref(null)            // Local error messages
const successMessage = ref(null)        // Success feedback messages
const isComponentMounted = ref(true)    // Prevents updates after component unmount

// ============================================
// DISTRIBUTION DATA
// ============================================
const currentLD = ref(0)                 // Last distribution timestamp
const nextDistribution = ref(0)          // Next scheduled distribution timestamp
const pendingUpdates = ref(0)             // Number of users pending updates
const perBalance = ref('0')               // Current per-balance rate
const liquidityPool = ref('0')            // Current liquidity pool amount
const balancePeriod = ref(0)              // Distribution interval in seconds
const runningUsers = ref([])              // List of users needing updates

// ============================================
// AUTO-REFRESH INTERVAL
// ============================================
let refreshInterval = null

// ============================================
// COMPUTED PROPERTIES
// ============================================

// Convert balance period from seconds to minutes for display
const balancePeriodMinutes = computed(() => {
  return Math.floor(Number(balancePeriod.value) / 60)
})

// Calculate human-readable time remaining until next distribution
const timeRemaining = computed(() => {
  const now = Math.floor(Date.now() / 1000)
  const diff = nextDistribution.value - now
  
  if (diff <= 0) return 'Ready Now!'
  
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60
  
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
})

// Dynamic styling for time remaining based on urgency
const timeRemainingClass = computed(() => {
  const diff = nextDistribution.value - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'text-success'      // Green when ready
  if (diff < 300) return 'text-warning'     // Yellow when less than 5 minutes
  return ''
})

// Check if distribution can be executed
const canExecute = computed(() => {
  const now = Math.floor(Date.now() / 1000)
  return now >= nextDistribution.value || pendingUpdates.value > 0
})

// Check if system is behind schedule and needs catch-up
const canCatchUp = computed(() => {
  const now = Math.floor(Date.now() / 1000)
  const periodsBehind = Math.floor((now - currentLD.value) / balancePeriod.value)
  return periodsBehind > 1
})

// Status styling based on system state
const statusClass = computed(() => {
  if (pendingUpdates.value > 0) return 'status-warning'     // Yellow for pending updates
  if (canExecute.value) return 'status-success'             // Green for ready
  return 'status-info'                                       // Blue for normal
})

// Status icon based on system state
const statusIcon = computed(() => {
  if (pendingUpdates.value > 0) return 'fa-exclamation-triangle'
  if (canExecute.value) return 'fa-check-circle'
  return 'fa-info-circle'
})

// Status text based on system state
const statusText = computed(() => {
  if (pendingUpdates.value > 0) return 'Pending Updates'
  if (canExecute.value) return 'Ready for Distribution'
  return 'System Normal'
})

// Detailed status message
const statusDetail = computed(() => {
  if (pendingUpdates.value > 0) return `${pendingUpdates.value} users need updates`
  if (canExecute.value) return 'Distribution can be executed'
  return `Next distribution in ${timeRemaining.value}`
})

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format Unix timestamp to local date string
const formatDate = (timestamp) => {
  if (!timestamp || timestamp === 0) return 'N/A'
  return new Date(timestamp * 1000).toLocaleString()
}

// Set error message with auto-clear after 5 seconds
const setError = (message) => {
  localError.value = message
  setTimeout(() => {
    if (isComponentMounted.value) localError.value = null
  }, 5000)
}

// Set success message with auto-clear after 5 seconds
const setSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    if (isComponentMounted.value) successMessage.value = null
  }, 5000)
}

// ============================================
// MAIN DATA LOADING FUNCTION
// ============================================

/**
 * Loads distribution data from the smart contract
 * Shows loading spinner only on first load, auto-refreshes silently
 */
const loadDistributionData = async () => {
  // Guard clause: exit if contract not ready or component unmounted
  if (!contractStore.bananaContract || !isComponentMounted.value) {
    isLoading.value = false
    return
  }

  // For auto-refresh cycles, don't show loading spinner
  const wasLoading = isLoading.value
  
  if (!wasLoading) {
    // Silent refresh without loading UI
    try {
      const ld = await contractStore.bananaContract.methods.LD().call()
      const period = await contractStore.bananaContract.methods.balancePeriod().call()
      const running = await contractStore.bananaContract.methods.getRunningUsers().call()
      
      if (!isComponentMounted.value) return
      
      // Update all reactive values
      currentLD.value = Number(ld)
      balancePeriod.value = Number(period)
      nextDistribution.value = currentLD.value + balancePeriod.value
      pendingUpdates.value = running.length
      runningUsers.value = running

      // Try to get perBalance and liquidity, fail gracefully
      try {
        const perBal = await contractStore.bananaContract.methods.perBalance(currentLD.value).call()
        if (isComponentMounted.value) perBalance.value = formatUSDT(perBal)
      } catch (e) {
        console.log('Could not get perBalance, using default')
      }

      try {
        const liq = await contractStore.bananaContract.methods.liquidity(currentLD.value).call()
        if (isComponentMounted.value) liquidityPool.value = formatUSDT(liq)
      } catch (e) {
        console.log('Could not get liquidity, using default')
      }
      
      return
    } catch (err) {
      console.error('Error in auto-refresh:', err)
      return
    }
  }

  // First load: show loading spinner
  isLoading.value = true
  console.log('📊 Loading distribution data...')

  try {
    const ld = await contractStore.bananaContract.methods.LD().call()
    const period = await contractStore.bananaContract.methods.balancePeriod().call()
    const running = await contractStore.bananaContract.methods.getRunningUsers().call()
    
    if (!isComponentMounted.value) return
    
    currentLD.value = Number(ld)
    balancePeriod.value = Number(period)
    nextDistribution.value = currentLD.value + balancePeriod.value
    pendingUpdates.value = running.length
    runningUsers.value = running

    try {
      const perBal = await contractStore.bananaContract.methods.perBalance(currentLD.value).call()
      if (isComponentMounted.value) perBalance.value = formatUSDT(perBal)
    } catch (e) {
      console.log('Could not get perBalance, using default')
    }

    try {
      const liq = await contractStore.bananaContract.methods.liquidity(currentLD.value).call()
      if (isComponentMounted.value) liquidityPool.value = formatUSDT(liq)
    } catch (e) {
      console.log('Could not get liquidity, using default')
    }

    console.log('📊 Distribution data loaded:', {
      currentLD: currentLD.value,
      nextDistribution: nextDistribution.value,
      pendingUpdates: pendingUpdates.value
    })

  } catch (err) {
    console.error('Error loading distribution data:', err)
    if (isComponentMounted.value) setError(err.message)
  } finally {
    if (isComponentMounted.value) isLoading.value = false
  }
}

// ============================================
// TRANSACTION FUNCTIONS
// ============================================

/**
 * Executes the distribution function on the smart contract
 * Distributes rewards to all eligible users
 */
const executeDistribution = async () => {
  if (!userStore.isWalletConnected) {
    setError('Please connect wallet first')
    return
  }

  try {
    isExecuting.value = true
    
    // Estimate gas for the transaction
    let gasEstimate
    try {
      gasEstimate = await contractStore.bananaContract.methods.distribution().estimateGas({
        from: userStore.address
      })
      gasEstimate = Math.floor(Number(gasEstimate) * 1.3) // Add 30% buffer
    } catch {
      // Fallback gas estimates based on pending updates count
      gasEstimate = pendingUpdates.value > 20 ? 2000000 : 1000000
    }

    const tx = await contractStore.bananaContract.methods.distribution().send({
      from: userStore.address,
      gas: gasEstimate
    })

    if (tx.status) {
      setSuccess('✅ Distribution executed successfully!')
      await loadDistributionData()
      await contractStore.loadContractData()
    }

  } catch (err) {
    console.error('Distribution error:', err)
    if (err.code === 4001) {
      setError('Transaction rejected')
    } else if (err.message.includes('Distribution not due')) {
      setError('Distribution is not due yet')
    } else {
      setError(err.message)
    }
  } finally {
    isExecuting.value = false
  }
}

/**
 * Helps update the tree structure
 * Processes pending updates for users
 */
const helpUpdate = async () => {
  if (!userStore.isWalletConnected) {
    setError('Please connect wallet first')
    return
  }

  if (pendingUpdates.value === 0) {
    setError('No pending updates to process')
    return
  }

  try {
    isHelping.value = true
    
    const tx = await contractStore.bananaContract.methods.helpUpdate().send({
      from: userStore.address,
      gas: 500000
    })

    if (tx.status) {
      setSuccess(`✅ Processed ${pendingUpdates.value} updates!`)
      await loadDistributionData()
      await contractStore.loadContractData()
    }

  } catch (err) {
    console.error('Help update error:', err)
    if (err.code === 4001) {
      setError('Transaction rejected')
    } else {
      setError(err.message)
    }
  } finally {
    isHelping.value = false
  }
}

/**
 * Force catches up multiple distribution periods
 * Useful when system is behind schedule
 */
const forceCatchUp = async () => {
  if (!userStore.isWalletConnected) {
    setError('Please connect wallet first')
    return
  }

  // Calculate how many periods behind
  const now = Math.floor(Date.now() / 1000)
  const periodsBehind = Math.floor((now - currentLD.value) / balancePeriod.value)
  
  if (periodsBehind <= 1) {
    setError('System is up to date')
    return
  }

  // Limit to 5 executions to avoid gas issues
  const maxExecutions = Math.min(periodsBehind, 5)
  const confirmed = confirm(`System is ${periodsBehind} periods behind.\nExecute ${maxExecutions} distributions?`)

  if (!confirmed) return

  try {
    isCatchingUp.value = true
    let executed = 0

    for (let i = 0; i < maxExecutions; i++) {
      try {
        const tx = await contractStore.bananaContract.methods.distribution().send({
          from: userStore.address,
          gas: 1000000
        })
        
        if (tx.status) {
          executed++
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait between transactions
        }
      } catch (e) {
        console.log(`Distribution ${i + 1} failed:`, e)
        break
      }
    }

    if (executed > 0) {
      setSuccess(`✅ Executed ${executed} distributions!`)
      await loadDistributionData()
      await contractStore.loadContractData()
    }

  } catch (err) {
    console.error('Catch up error:', err)
    setError(err.message)
  } finally {
    isCatchingUp.value = false
  }
}

/**
 * Manually checks and refreshes distribution status
 */
const checkStatus = async () => {
  isChecking.value = true
  await loadDistributionData()
  isChecking.value = false
}

// ============================================
// AUTO-REFRESH MANAGEMENT
// ============================================

/**
 * Starts auto-refresh interval
 * Refreshes data every 10 seconds without showing loading spinner
 */
const startAutoRefresh = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  
  refreshInterval = setInterval(() => {
    if (contractStore.bananaContract && isComponentMounted.value) {
      loadDistributionData() // Silent refresh
    }
  }, 10000) // 10 seconds
}

// ============================================
// LIFECYCLE HOOKS
// ============================================

// Cleanup on component unmount
onUnmounted(() => {
  isComponentMounted.value = false
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Watch for contract changes
watch(() => contractStore.bananaContract, async (newContract) => {
  if (newContract && isComponentMounted.value) {
    await loadDistributionData() // Initial load with spinner
    startAutoRefresh()
  } else {
    isLoading.value = false
  }
}, { immediate: true })

// Initial load
onMounted(async () => {
  isComponentMounted.value = true
  if (contractStore.bananaContract) {
    await loadDistributionData()
    startAutoRefresh()
  }
})
</script>

<style scoped>
/* ============================================
   COMPONENT STYLES
   ============================================ */

/* Not connected / error states */
.not-connected {
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  color: #666;
}

.not-connected i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #667eea;
}

/* Component-specific loading state */
.component-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: #f8f9fa;
  border-radius: 10px;
  margin: 10px 0;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #667eea;
}

.loading-spinner i {
  font-size: 30px;
}

.loading-spinner span {
  font-size: 14px;
  color: #666;
}

/* Distribution info panel */
.distribution-info {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label i {
  color: #667eea;
  width: 20px;
}

.info-value {
  font-weight: 600;
  color: #333;
}

/* Text color utilities */
.text-success {
  color: #28a745 !important;
  font-weight: 700;
}

.text-warning {
  color: #ffc107 !important;
  font-weight: 700;
}

/* Status indicator */
.distribution-status {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.distribution-status i {
  font-size: 24px;
}

.distribution-status div {
  display: flex;
  flex-direction: column;
}

.distribution-status strong {
  font-size: 16px;
  margin-bottom: 4px;
}

.distribution-status span {
  font-size: 13px;
  opacity: 0.9;
}

/* Status color variants */
.status-success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.status-warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.status-info {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

/* Action buttons grid */
.distribution-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

/* Button styles */
.btn {
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.btn-warning {
  background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
  color: white;
}

.btn-info {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinning animation */
.fa-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Informational note */
.distribution-note {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #e7f3ff;
  border: 1px solid #b8daff;
  border-radius: 8px;
  color: #004085;
  font-size: 13px;
}

.distribution-note i {
  color: #17a2b8;
}

/* Alert messages */
.alert {
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.alert-danger {
  background: #fff5f5;
  border: 1px solid #fcc;
  color: #dc3545;
}

.alert-success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.mt-3 {
  margin-top: 15px;
}

/* Responsive design */
@media (max-width: 768px) {
  .distribution-actions {
    grid-template-columns: 1fr;
  }
  
  .info-row {
    flex-direction: column;
    gap: 5px;
  }
  
  .distribution-status {
    flex-direction: column;
    text-align: center;
  }
}
</style>