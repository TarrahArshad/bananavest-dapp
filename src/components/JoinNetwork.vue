<template>
  <div class="card">
    <h2><i class="fas fa-sign-in-alt"></i> Join Network</h2>
    
    <div v-if="!userStore.isWalletConnected" class="not-connected">
      <i class="fas fa-wallet"></i>
      <p>Please connect your wallet first to join the network</p>
    </div>
    
    <div v-else-if="!contractStore.bananaContract" class="not-connected">
      <i class="fas fa-file-contract"></i>
      <p>Contract not detected on this network. Please switch to a supported network.</p>
      <button @click="switchToPolygon" class="btn btn-primary btn-sm mt-3">
        <i class="fab fa-polygon"></i> Switch to Polygon Amoy
      </button>
    </div>
    
    <div v-else-if="userStore.userInfo?.isRegistered" class="already-joined">
      <i class="fas fa-check-circle"></i>
      <h3>You are already a member!</h3>
      <p>User ID: {{ userStore.userInfo.index }}</p>
      <p>Position: {{ userStore.userInfo.position }}</p>
    </div>
    
    <div v-else class="join-form">
      <!-- Referral ID -->
      <div class="form-group">
        <label><i class="fas fa-user-plus"></i> Referral ID:</label>
        <input 
          type="number" 
          v-model.number="formData.referralId" 
          min="1"
          placeholder="Enter referral ID (1 for root)"
          class="form-input"
        >
        <small class="form-hint">Root ID is 1 if you don't have a referrer</small>
      </div>

      <!-- Position Selection -->
      <div class="form-group">
        <label><i class="fas fa-arrows-alt-h"></i> Position:</label>
        <div class="position-selector">
          <button 
            type="button"
            class="position-btn" 
            :class="{ active: formData.isLeft }"
            @click="formData.isLeft = true"
          >
            <i class="fas fa-arrow-left"></i>
            Left Side
          </button>
          <button 
            type="button"
            class="position-btn" 
            :class="{ active: !formData.isLeft }"
            @click="formData.isLeft = false"
          >
            <i class="fas fa-arrow-right"></i>
            Right Side
          </button>
        </div>
      </div>

      <!-- Entry Amount Display -->
      <div class="form-group">
        <label><i class="fas fa-coins"></i> Entry Amount:</label>
        <div class="amount-display">
          <span class="amount">{{ contractStore.entryInfo.totalAmount || '97' }} USDT</span>
          <span class="fee-badge">Includes {{ contractStore.entryInfo.adminFee || '22' }} USDT fee</span>
        </div>
      </div>

      <!-- Fee Breakdown -->
      <div class="form-group">
        <label>Fee Breakdown:</label>
        <div class="fee-breakdown">
          <div class="fee-item">
            <span>Network Liquidity:</span>
            <span class="fee-value">{{ contractStore.entryInfo.liquidityAmount || '75' }} USDT</span>
          </div>
          <div class="fee-item">
            <span>Admin Fee:</span>
            <span class="fee-value">{{ contractStore.entryInfo.adminFee || '22' }} USDT</span>
          </div>
          <div class="fee-item total">
            <span>Total:</span>
            <span class="fee-value">{{ contractStore.entryInfo.totalAmount || '97' }} USDT</span>
          </div>
        </div>
      </div>

      <!-- Approval Status -->
      <div class="approval-status" :class="{ approved: isApproved }">
        <i class="fas" :class="isApproved ? 'fa-check-circle' : 'fa-clock'"></i>
        <span>{{ isApproved ? 'USDT Approved ✓' : 'USDT Approval Required' }}</span>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <button 
          v-if="!isApproved"
          @click="handleApprove"
          class="btn btn-warning btn-large"
          :disabled="isLoading || isApproving"
        >
          <i class="fas fa-check-circle"></i>
          {{ isApproving ? 'Approving...' : 'Approve USDT' }}
        </button>
        
        <button 
          @click="handleJoin"
          class="btn btn-success btn-large"
          :disabled="isLoading || !isApproved || isJoining"
        >
          <i class="fas fa-rocket"></i>
          {{ isJoining ? 'Joining...' : `Join Network (${contractStore.entryInfo.totalAmount || '97'} USDT)` }}
        </button>
      </div>

      <!-- Error Display -->
      <div v-if="localError" class="alert alert-danger mt-3">
        <i class="fas fa-exclamation-circle"></i>
        {{ localError }}
      </div>

      <!-- Success Message -->
      <div v-if="joinSuccess" class="alert alert-success mt-3">
        <i class="fas fa-check-circle"></i>
        Successfully joined the network! 🎉
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'
import { useNetworkStore } from '../stores/networkStore'

// Initialize stores
const userStore = useUserStore()
const contractStore = useContractStore()
const networkStore = useNetworkStore()

// Form data
const formData = reactive({
  referralId: 1,
  isLeft: true
})

// Local state
const isLoading = ref(false)
const isApproving = ref(false)
const isJoining = ref(false)
const joinSuccess = ref(false)
const localError = ref(null)
const isApproved = ref(false)

// Check if user is already registered
const isRegistered = computed(() => {
  return userStore.userInfo?.isRegistered || false
})

// Set error with auto-clear
const setError = (message) => {
  localError.value = message
  setTimeout(() => {
    localError.value = null
  }, 5000)
}

// Check allowance on mount and when wallet/contract changes
const checkAllowance = async () => {
  if (!userStore.isWalletConnected || !contractStore.usdtContract || !contractStore.bananaAddress) {
    isApproved.value = false
    return
  }

  try {
    const entryAmount = await contractStore.bananaContract.methods.entryAmount().call()
    const allowance = await contractStore.usdtContract.methods.allowance(
      userStore.address,
      contractStore.bananaAddress
    ).call()
    
    isApproved.value = BigInt(allowance) >= BigInt(entryAmount)
    console.log('📊 Allowance check:', {
      allowance: allowance.toString(),
      required: entryAmount.toString(),
      approved: isApproved.value
    })
  } catch (err) {
    console.error('Error checking allowance:', err)
    isApproved.value = false
  }
}

// Handle approve
const handleApprove = async () => {
  if (!userStore.isWalletConnected) {
    setError('Please connect wallet first')
    return
  }

  if (!contractStore.usdtContract) {
    setError('USDT contract not initialized')
    return
  }

  try {
    isApproving.value = true
    localError.value = null
    
    const entryAmount = await contractStore.bananaContract.methods.entryAmount().call()
    const formattedAmount = (Number(entryAmount) / 1000000).toFixed(2)
    
    console.log('🔄 Approving USDT...', {
      amount: entryAmount.toString(),
      formatted: formattedAmount,
      spender: contractStore.bananaAddress
    })
    
    const tx = await contractStore.usdtContract.methods.approve(
      contractStore.bananaAddress,
      entryAmount
    ).send({
      from: userStore.address,
      gas: 100000
    })
    
    if (tx.status) {
      isApproved.value = true
      alert(`✅ USDT approved successfully!\nAmount: ${formattedAmount} USDT`)
    }
    
  } catch (err) {
    console.error('Approve error:', err)
    if (err.code === 4001) {
      setError('Transaction rejected by user')
    } else {
      setError(err.message)
    }
  } finally {
    isApproving.value = false
  }
}

// Handle join
const handleJoin = async () => {
  if (!userStore.isWalletConnected) {
    setError('Please connect wallet first')
    return
  }

  if (!isApproved.value) {
    setError('Please approve USDT first')
    return
  }

  if (formData.referralId < 1) {
    setError('Please enter a valid referral ID')
    return
  }

  try {
    isJoining.value = true
    joinSuccess.value = false
    localError.value = null
    
    const entryAmount = await contractStore.bananaContract.methods.entryAmount().call()
    const formattedAmount = (Number(entryAmount) / 1000000).toFixed(2)
    
    // Check balance again
    const balance = await contractStore.usdtContract.methods.balanceOf(userStore.address).call()
    if (BigInt(balance) < BigInt(entryAmount)) {
      setError(`Insufficient USDT balance. Required: ${formattedAmount} USDT`)
      return
    }
    
    console.log('🚀 Joining network...', {
      referralId: formData.referralId,
      position: formData.isLeft ? 'Left' : 'Right',
      amount: entryAmount.toString()
    })
    
    // Estimate gas
    let gasEstimate
    try {
      gasEstimate = await contractStore.bananaContract.methods.join(
        formData.referralId,
        formData.isLeft,
        entryAmount
      ).estimateGas({ from: userStore.address })
      
      // Add 30% buffer
      gasEstimate = Math.floor(Number(gasEstimate) * 1.3)
    } catch {
      // Fallback gas limits
      gasEstimate = formData.isLeft ? 400000 : 1500000
    }
    
    console.log('⛽ Gas estimate:', gasEstimate)
    
    const tx = await contractStore.bananaContract.methods.join(
      formData.referralId,
      formData.isLeft,
      entryAmount
    ).send({
      from: userStore.address,
      gas: gasEstimate
    })
    
    if (tx.status) {
      joinSuccess.value = true
      isApproved.value = false // Reset approval status
      
      // Reload contract data
      await contractStore.loadContractData()
      
      alert(`🎉 Successfully joined BananaVEST network!\n\nTransaction: ${tx.transactionHash.substring(0, 10)}...`)
    }
    
  } catch (err) {
    console.error('Join error:', err)
    
    if (err.code === 4001) {
      setError('Transaction rejected by user')
    } else if (err.message.includes('revert')) {
      // Try to extract revert reason
      if (err.message.includes('already registered')) {
        setError('This wallet is already registered')
      } else if (err.message.includes('invalid parent')) {
        setError('Invalid referral ID')
      } else if (err.message.includes('position taken')) {
        setError('This position is already taken')
      } else {
        setError('Transaction failed: ' + err.message.substring(0, 100))
      }
    } else {
      setError(err.message)
    }
  } finally {
    isJoining.value = false
  }
}

// Switch to Polygon Amoy
const switchToPolygon = async () => {
  await networkStore.switchNetwork(80002)
}

// Watch for changes
watch(() => userStore.isWalletConnected, async (connected) => {
  if (connected) {
    await checkAllowance()
  } else {
    isApproved.value = false
  }
})

watch(() => contractStore.bananaAddress, async () => {
  if (userStore.isWalletConnected) {
    await checkAllowance()
  }
})

// Initial check
watch([() => contractStore.usdtContract, () => contractStore.bananaContract], async () => {
  if (userStore.isWalletConnected) {
    await checkAllowance()
  }
}, { immediate: true })
</script>

<style scoped>
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

.already-joined {
  text-align: center;
  padding: 40px 20px;
  background: #d4edda;
  border-radius: 10px;
  color: #155724;
}

.already-joined i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #28a745;
}

.already-joined h3 {
  margin-bottom: 10px;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.form-group label i {
  margin-right: 8px;
  color: #667eea;
}

.form-input {
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
}

.form-input:focus {
  border-color: #667eea;
  outline: none;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-hint {
  color: #6c757d;
  font-size: 12px;
}

.position-selector {
  display: flex;
  gap: 10px;
}

.position-btn {
  flex: 1;
  padding: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.position-btn i {
  font-size: 16px;
}

.position-btn.active {
  background: #667eea;
  color: white;
  border-color: #5a67d8;
}

.position-btn:hover:not(.active) {
  background: #f8f9fa;
  border-color: #667eea;
}

.amount-display {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
  text-align: center;
  border: 2px solid #e0e0e0;
}

.amount {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  display: block;
}

.fee-badge {
  font-size: 14px;
  color: #6c757d;
  margin-top: 5px;
  display: block;
}

.fee-breakdown {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  border: 2px solid #e0e0e0;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  margin: 10px 0;
  padding: 8px 0;
  border-bottom: 1px dashed #ddd;
}

.fee-item.total {
  border-top: 2px solid #667eea;
  border-bottom: none;
  margin-top: 15px;
  padding-top: 15px;
  font-weight: 700;
  color: #333;
}

.fee-value {
  font-weight: 600;
}

.approval-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  color: #856404;
}

.approval-status.approved {
  background: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.approval-status i {
  font-size: 18px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 10px;
}

.btn-large {
  flex: 1;
  padding: 16px;
  font-size: 16px;
  justify-content: center;
}

.btn-warning {
  background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
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

.alert-success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.mt-3 {
  margin-top: 15px;
}
</style>