<template>
  <div class="card">
    <h2><i class="fas fa-user-secret"></i> Hidden Wallet Management</h2>
    
    <div v-if="!userStore.isWalletConnected" class="not-connected">
      <i class="fas fa-wallet"></i>
      <p>Please connect your wallet first</p>
    </div>
    
    <div v-else-if="!contractStore.bananaContract" class="not-connected">
      <i class="fas fa-file-contract"></i>
      <p>Contract not detected on this network</p>
    </div>
    
    <div v-else-if="!userStore.userInfo?.isRegistered" class="not-registered">
      <i class="fas fa-exclamation-circle"></i>
      <p>You must join the network first before creating hidden wallets</p>
    </div>
    
    <div v-else>
      <!-- Hidden Wallet Stats -->
      <div class="hidden-stats">
        <div class="stat-card">
          <span class="stat-label">Left Hidden</span>
          <span class="stat-value">{{ hiddenCount.left }}/3</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Right Hidden</span>
          <span class="stat-value">{{ hiddenCount.right }}/3</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Status</span>
          <span class="stat-value" :class="activationStatus.ready ? 'text-success' : 'text-warning'">
            {{ activationStatus.ready ? 'Ready' : 'Waiting' }}
          </span>
        </div>
      </div>

      <!-- Activation Timer -->
      <div v-if="!activationStatus.ready" class="activation-timer">
        <i class="fas fa-hourglass-half"></i>
        <span>Activation in: {{ activationStatus.timeRemaining }}</span>
      </div>

      <!-- Create Hidden Wallet Form -->
      <div class="hidden-form">
        <h3><i class="fas fa-plus-circle"></i> Create New Hidden Wallet</h3>

        <div class="form-group">
          <label>Child Wallet Address:</label>
          <input 
            type="text" 
            v-model="formData.childAddress" 
            placeholder="0x..." 
            class="form-input"
            :disabled="!canCreate"
          >
          <small class="form-hint">Address of the wallet to register as hidden</small>
        </div>

        <div class="form-group">
          <label>Position:</label>
          <div class="position-selector">
            <button 
              type="button"
              class="position-btn" 
              :class="{ active: formData.isLeft }"
              @click="formData.isLeft = true"
              :disabled="!canCreate || hiddenCount.left >= 3"
            >
              <i class="fas fa-arrow-left"></i>
              Left Side ({{ hiddenCount.left }}/3)
            </button>
            <button 
              type="button"
              class="position-btn" 
              :class="{ active: !formData.isLeft }"
              @click="formData.isLeft = false"
              :disabled="!canCreate || hiddenCount.right >= 3"
            >
              <i class="fas fa-arrow-right"></i>
              Right Side ({{ hiddenCount.right }}/3)
            </button>
          </div>
        </div>

        <!-- Tier Selection -->
        <div class="form-group">
          <label>Select Tier:</label>
          <div class="tier-selector">
            <button 
              v-for="tier in 3" 
              :key="tier"
              class="tier-btn"
              :class="{ 
                active: selectedTier === tier,
                disabled: !isTierAvailable(tier)
              }"
              @click="selectTier(tier)"
              :disabled="!isTierAvailable(tier)"
            >
              <span class="tier-name">Tier {{ tier }}</span>
              <span class="tier-price">{{ getTierPrice(tier) }} USDT</span>
            </button>
          </div>
        </div>

        <!-- Fee Breakdown -->
        <div class="fee-breakdown">
          <div class="fee-item">
            <span>Monthly Reward Pool:</span>
            <span>10 USDT</span>
          </div>
          <div class="fee-item">
            <span>Admin Fee:</span>
            <span>12 USDT</span>
          </div>
          <div class="fee-item">
            <span>Remaining to Admin:</span>
            <span>{{ feeBreakdown.remaining }} USDT</span>
          </div>
          <div class="fee-item total">
            <span>Total Payment:</span>
            <span>{{ feeBreakdown.total }} USDT</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            v-if="!isApproved"
            @click="handleApprove"
            class="btn btn-warning"
            :disabled="isLoading || !canCreate"
          >
            <i class="fas fa-check-circle"></i>
            Approve USDT
          </button>
          
          <button 
            @click="handleCreate"
            class="btn btn-primary"
            :disabled="isLoading || !canCreate || !isApproved || !formData.childAddress"
          >
            <i class="fas fa-user-secret"></i>
            Create Hidden Wallet
          </button>
        </div>
      </div>

      <!-- Hidden Wallets List -->
      <div v-if="hiddenWallets.length > 0" class="hidden-list">
        <h3><i class="fas fa-list"></i> Your Hidden Wallets</h3>
        <div class="wallets-grid">
          <div v-for="wallet in hiddenWallets" :key="wallet.address" class="wallet-card">
            <div class="wallet-header">
              <i class="fas fa-user-secret"></i>
              <span class="wallet-side" :class="wallet.side.toLowerCase()">{{ wallet.side }}</span>
            </div>
            <div class="wallet-address">{{ formatAddress(wallet.address) }}</div>
            <div class="wallet-details">
              <span>Tier: {{ wallet.tier }}</span>
              <span>Created: {{ wallet.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="localError" class="alert alert-danger mt-3">
        <i class="fas fa-exclamation-circle"></i>
        {{ localError }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'
import { useNetworkStore } from '../stores/networkStore'
import { formatAddress, formatUSDT } from '../utils/constants'

// Initialize stores
const userStore = useUserStore()
const contractStore = useContractStore()
const networkStore = useNetworkStore()

// Form data
const formData = reactive({
  childAddress: '',
  isLeft: true
})

// Local state
const isLoading = ref(false)
const isApproved = ref(false)
const selectedTier = ref(1)
const localError = ref(null)
const hiddenCount = ref({ left: 0, right: 0 })
const hiddenWallets = ref([])
const activationStatus = ref({ ready: false, timeRemaining: '' })
const tierAmounts = ref({ tier1: 0, tier2: 0, tier3: 0 })

// Computed
const canCreate = computed(() => {
  return userStore.userInfo?.isRegistered && 
         activationStatus.value.ready &&
         (formData.isLeft ? hiddenCount.value.left < 3 : hiddenCount.value.right < 3)
})

const feeBreakdown = computed(() => {
  const total = getTierPrice(selectedTier.value)
  const totalNum = parseFloat(total)
  return {
    remaining: (totalNum - 22).toFixed(2), // 10 + 12 = 22
    total: total
  }
})

// Check if tier is available based on current count
const isTierAvailable = (tier) => {
  const currentCount = formData.isLeft ? hiddenCount.value.left : hiddenCount.value.right
  return currentCount === tier - 1
}

// Get tier price
const getTierPrice = (tier) => {
  switch(tier) {
    case 1: return formatUSDT(tierAmounts.value.tier1)
    case 2: return formatUSDT(tierAmounts.value.tier2)
    case 3: return formatUSDT(tierAmounts.value.tier3)
    default: return '0'
  }
}

// Set error
const setError = (message) => {
  localError.value = message
  setTimeout(() => {
    localError.value = null
  }, 5000)
}

// Select tier
const selectTier = (tier) => {
  if (isTierAvailable(tier)) {
    selectedTier.value = tier
  }
}

// Load hidden wallet data
const loadHiddenData = async () => {
  if (!contractStore.bananaContract || !userStore.userInfo?.index) return

  try {
    const userIndex = userStore.userInfo.index

    // Get hidden counts
    const leftCount = await contractStore.bananaContract.methods.hideCount(userIndex, true).call()
    const rightCount = await contractStore.bananaContract.methods.hideCount(userIndex, false).call()
    
    hiddenCount.value = { left: Number(leftCount), right: Number(rightCount) }

    // Get tier amounts
    const tier1 = await contractStore.bananaContract.methods.tier1Amount().call()
    const tier2 = await contractStore.bananaContract.methods.tier2Amount().call()
    const tier3 = await contractStore.bananaContract.methods.tier3Amount().call()
    
    tierAmounts.value = { tier1: Number(tier1), tier2: Number(tier2), tier3: Number(tier3) }

    // Check activation status
    const position = await contractStore.bananaContract.methods.position(userIndex).call()
    const activationPeriod = await contractStore.bananaContract.methods.hideActivationPeriod().call()
    
    const currentTime = Math.floor(Date.now() / 1000)
    const activationTime = Number(position.time) + Number(activationPeriod)
    const ready = currentTime >= activationTime
    
    if (!ready) {
      const remaining = activationTime - currentTime
      const hours = Math.floor(remaining / 3600)
      const minutes = Math.floor((remaining % 3600) / 60)
      activationStatus.value = {
        ready: false,
        timeRemaining: `${hours}h ${minutes}m`
      }
    } else {
      activationStatus.value = { ready: true, timeRemaining: '' }
    }

    // Load hidden wallets list
    await loadHiddenWallets()

  } catch (err) {
    console.error('Error loading hidden data:', err)
  }
}

// Load hidden wallets list
const loadHiddenWallets = async () => {
  if (!contractStore.bananaContract || !userStore.userInfo?.index) return

  try {
    const userIndex = userStore.userInfo.index
    const wallets = []

    // Get left and right children
    const leftChildren = await contractStore.bananaContract.methods.getLeftChildren(userIndex).call()
    const rightChildren = await contractStore.bananaContract.methods.getRightChildren(userIndex).call()

    // Process left children
    for (const childId of leftChildren) {
      const pos = await contractStore.bananaContract.methods.position(childId).call()
      if (pos.hide) {
        wallets.push({
          address: pos.wallet,
          side: 'Left',
          tier: 1, // You might need to calculate tier based on amount
          time: new Date(pos.time * 1000).toLocaleDateString()
        })
      }
    }

    // Process right children
    for (const childId of rightChildren) {
      const pos = await contractStore.bananaContract.methods.position(childId).call()
      if (pos.hide) {
        wallets.push({
          address: pos.wallet,
          side: 'Right',
          tier: 1,
          time: new Date(pos.time * 1000).toLocaleDateString()
        })
      }
    }

    hiddenWallets.value = wallets

  } catch (err) {
    console.error('Error loading hidden wallets:', err)
  }
}

// Check allowance
const checkAllowance = async () => {
  if (!contractStore.usdtContract || !contractStore.bananaAddress || !userStore.address) {
    isApproved.value = false
    return
  }

  try {
    const requiredAmount = tierAmounts.value[`tier${selectedTier.value}`]
    const allowance = await contractStore.usdtContract.methods.allowance(
      userStore.address,
      contractStore.bananaAddress
    ).call()
    
    isApproved.value = BigInt(allowance) >= BigInt(requiredAmount)
  } catch (err) {
    console.error('Error checking allowance:', err)
    isApproved.value = false
  }
}

// Handle approve
const handleApprove = async () => {
  if (!contractStore.usdtContract) {
    setError('USDT contract not initialized')
    return
  }

  try {
    isLoading.value = true
    const requiredAmount = tierAmounts.value[`tier${selectedTier.value}`]

    const tx = await contractStore.usdtContract.methods.approve(
      contractStore.bananaAddress,
      requiredAmount
    ).send({
      from: userStore.address,
      gas: 100000
    })

    if (tx.status) {
      isApproved.value = true
      alert(`✅ USDT approved successfully!`)
    }

  } catch (err) {
    console.error('Approve error:', err)
    if (err.code === 4001) {
      setError('Transaction rejected')
    } else {
      setError(err.message)
    }
  } finally {
    isLoading.value = false
  }
}

// Handle create
const handleCreate = async () => {
  if (!formData.childAddress || !networkStore.web3.utils.isAddress(formData.childAddress)) {
    setError('Please enter a valid wallet address')
    return
  }

  try {
    isLoading.value = true
    const requiredAmount = tierAmounts.value[`tier${selectedTier.value}`]

    const tx = await contractStore.bananaContract.methods.activeHide(
      formData.childAddress,
      formData.isLeft,
      requiredAmount
    ).send({
      from: userStore.address,
      gas: 500000
    })

    if (tx.status) {
      alert('✅ Hidden wallet created successfully!')
      formData.childAddress = ''
      isApproved.value = false
      await loadHiddenData()
    }

  } catch (err) {
    console.error('Create error:', err)
    if (err.code === 4001) {
      setError('Transaction rejected')
    } else {
      setError(err.message)
    }
  } finally {
    isLoading.value = false
  }
}

// Watch for changes
watch(() => userStore.userInfo?.index, async () => {
  if (userStore.userInfo?.index) {
    await loadHiddenData()
  }
})

watch([selectedTier, formData.isLeft], async () => {
  await checkAllowance()
})

watch(() => contractStore.bananaContract, async () => {
  if (contractStore.bananaContract && userStore.userInfo?.index) {
    await loadHiddenData()
  }
})

onMounted(async () => {
  if (contractStore.bananaContract && userStore.userInfo?.index) {
    await loadHiddenData()
  }
})
</script>

<style scoped>
.not-connected, .not-registered {
  text-align: center;
  padding: 40px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  color: #666;
}

.not-connected i, .not-registered i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #667eea;
}

.not-registered i {
  color: #ffc107;
}

.hidden-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.stat-label {
  display: block;
  color: #666;
  font-size: 12px;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.text-success {
  color: #28a745;
}

.text-warning {
  color: #ffc107;
}

.activation-timer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
  margin-bottom: 20px;
}

.activation-timer i {
  font-size: 18px;
}

.hidden-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.hidden-form h3 {
  margin-bottom: 20px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hidden-form h3 i {
  color: #667eea;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
}

.form-input:focus {
  border-color: #667eea;
  outline: none;
}

.form-hint {
  display: block;
  margin-top: 5px;
  color: #6c757d;
  font-size: 12px;
}

.position-selector {
  display: flex;
  gap: 10px;
}

.position-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.position-btn.active {
  background: #667eea;
  color: white;
  border-color: #5a67d8;
}

.position-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tier-selector {
  display: flex;
  gap: 10px;
}

.tier-btn {
  flex: 1;
  padding: 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tier-btn.active {
  border-color: #28a745;
  background: #d4edda;
}

.tier-btn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.tier-name {
  font-weight: 600;
  margin-bottom: 5px;
}

.tier-price {
  font-size: 14px;
  color: #28a745;
}

.fee-breakdown {
  background: white;
  padding: 15px;
  border-radius: 8px;
  margin: 20px 0;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed #ddd;
}

.fee-item.total {
  border-top: 2px solid #667eea;
  border-bottom: none;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: 700;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
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

.btn-warning {
  background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
  color: white;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hidden-list h3 {
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wallets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.wallet-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
}

.wallet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.wallet-header i {
  color: #6c757d;
}

.wallet-side {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.wallet-side.left {
  background: #667eea;
  color: white;
}

.wallet-side.right {
  background: #28a745;
  color: white;
}

.wallet-address {
  font-family: monospace;
  font-size: 12px;
  color: #333;
  margin-bottom: 8px;
  word-break: break-all;
}

.wallet-details {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
}

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

.mt-3 {
  margin-top: 15px;
}

@media (max-width: 768px) {
  .hidden-stats {
    grid-template-columns: 1fr;
  }
  
  .position-selector,
  .tier-selector,
  .action-buttons {
    flex-direction: column;
  }
  
  .wallets-grid {
    grid-template-columns: 1fr;
  }
}
</style>