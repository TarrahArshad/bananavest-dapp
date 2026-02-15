<template>
  <div class="card w-full">
    <h2><i class="fas fa-network-wired"></i> Network Tree</h2>
    
    <div v-if="!networkStore.web3" class="not-connected">
      <i class="fas fa-plug"></i>
      <p>Please connect to a network first</p>
    </div>
    
    <div v-else-if="!contractStore.bananaContract" class="not-connected">
      <i class="fas fa-file-contract"></i>
      <p>Contract not detected on this network</p>
    </div>
    
    <div v-else-if="isLoading" class="loading-tree">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading network tree...</p>
    </div>
    
    <div v-else class="tree-container">
      <!-- Root Node -->
      <div class="tree-node root">
        <i class="fas fa-crown"></i>
        <div class="node-label">Root Node</div>
        <div class="node-id">ID: 1</div>
        <div class="node-wallet">{{ formatAddress(rootWallet) }}</div>
      </div>

      <!-- Children -->
      <div class="tree-children">
        <!-- Left Branch -->
        <div class="tree-branch left">
          <div class="branch-line"></div>
          <div class="tree-node">
            <i class="fas fa-users"></i>
            <div class="node-label">Left Team</div>
            <div class="node-count">{{ leftCount }}</div>
            <div class="node-detail">{{ leftUsers.length }} direct children</div>
          </div>
          
          <!-- Left Children Preview -->
          <div v-if="leftUsers.length > 0" class="children-preview">
            <div 
              v-for="user in leftUsers.slice(0, 5)" 
              :key="user.index"
              class="preview-item"
              :title="`ID: ${user.index}\nWallet: ${user.wallet}`"
            >
              <i class="fas fa-user"></i>
              <span>{{ user.index }}</span>
            </div>
            <div v-if="leftUsers.length > 5" class="preview-more">
              +{{ leftUsers.length - 5 }} more
            </div>
          </div>
        </div>

        <!-- Right Branch -->
        <div class="tree-branch right">
          <div class="branch-line"></div>
          <div class="tree-node">
            <i class="fas fa-users"></i>
            <div class="node-label">Right Team</div>
            <div class="node-count">{{ rightCount }}</div>
            <div class="node-detail">{{ rightUsers.length }} direct children</div>
          </div>
          
          <!-- Right Children Preview -->
          <div v-if="rightUsers.length > 0" class="children-preview">
            <div 
              v-for="user in rightUsers.slice(0, 5)" 
              :key="user.index"
              class="preview-item"
              :title="`ID: ${user.index}\nWallet: ${user.wallet}`"
            >
              <i class="fas fa-user"></i>
              <span>{{ user.index }}</span>
            </div>
            <div v-if="rightUsers.length > 5" class="preview-more">
              +{{ rightUsers.length - 5 }} more
            </div>
          </div>
        </div>
      </div>

      <!-- Tree Stats -->
      <div class="tree-stats">
        <div class="stat-chip">
          <i class="fas fa-sitemap"></i>
          Total Users: {{ totalUsers }}
        </div>
        <div class="stat-chip">
          <i class="fas fa-balance-scale"></i>
          Ratio: {{ getRatio }}
        </div>
        <div class="stat-chip">
          <i class="fas fa-users"></i>
          Direct Children: {{ leftUsers.length + rightUsers.length }}
        </div>
      </div>

      <!-- User Position Highlight -->
      <div v-if="userStore.userInfo?.isRegistered" class="user-position">
        <i class="fas fa-star"></i>
        <span>Your Position: {{ userStore.userInfo.position }} (ID: {{ userStore.userInfo.index }})</span>
      </div>

      <!-- View More Button -->
      <div class="tree-actions">
        <button @click="loadMore" class="btn btn-secondary btn-sm" :disabled="loadingMore">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingMore }"></i>
          Refresh Tree
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="localError" class="alert alert-danger mt-3">
      <i class="fas fa-exclamation-circle"></i>
      {{ localError }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useNetworkStore } from '../stores/networkStore'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'
import { formatAddress } from '../utils/constants'

// Initialize stores
const networkStore = useNetworkStore()
const userStore = useUserStore()
const contractStore = useContractStore()

// Local state
const isLoading = ref(false)
const loadingMore = ref(false)
const localError = ref(null)

// Tree data
const rootWallet = ref('')
const leftCount = ref(0)
const rightCount = ref(0)
const leftUsers = ref([])
const rightUsers = ref([])
const totalUsers = ref(0)  // اضافه کردن این متغیر

// Computed
const getRatio = computed(() => {
  if (leftCount.value === 0 && rightCount.value === 0) return '0:0'
  if (leftCount.value === 0) return `0:${rightCount.value}`
  if (rightCount.value === 0) return `${leftCount.value}:0`
  
  // ساده‌سازی نسبت
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(leftCount.value, rightCount.value)
  return `${leftCount.value / divisor}:${rightCount.value / divisor}`
})

// Set error
const setError = (message) => {
  localError.value = message
  setTimeout(() => {
    localError.value = null
  }, 5000)
}

// Load tree data
const loadTreeData = async () => {
  if (!contractStore.bananaContract) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  console.log('🌳 Loading network tree...')

  try {
    // Get total users from contract
    const lastIndex = await contractStore.bananaContract.methods.lastIndex().call()
    totalUsers.value = Number(lastIndex)
    console.log('📊 Total users from contract:', totalUsers.value)

    // Get root node info
    const rootPosition = await contractStore.bananaContract.methods.position(1).call()
    rootWallet.value = rootPosition.wallet

    // Get children counts (this is total team count, not direct children)
    leftCount.value = await contractStore.bananaContract.methods.left(1).call()
    rightCount.value = await contractStore.bananaContract.methods.right(1).call()
    
    console.log('📊 Team counts:', {
      left: leftCount.value,
      right: rightCount.value
    })

    // Get direct left children
    const leftChildrenIds = await contractStore.bananaContract.methods.getLeftChildren(1).call()
    leftUsers.value = await Promise.all(
      leftChildrenIds.map(async (id) => {
        const pos = await contractStore.bananaContract.methods.position(id).call()
        return {
          index: id,
          wallet: pos.wallet,
          isLeft: pos.isLeft
        }
      })
    )

    // Get direct right children
    const rightChildrenIds = await contractStore.bananaContract.methods.getRightChildren(1).call()
    rightUsers.value = await Promise.all(
      rightChildrenIds.map(async (id) => {
        const pos = await contractStore.bananaContract.methods.position(id).call()
        return {
          index: id,
          wallet: pos.wallet,
          isLeft: pos.isLeft
        }
      })
    )

    console.log('✅ Tree loaded:', {
      totalUsers: totalUsers.value,
      leftTeam: leftCount.value,
      rightTeam: rightCount.value,
      leftDirect: leftUsers.value.length,
      rightDirect: rightUsers.value.length
    })

  } catch (err) {
    console.error('❌ Error loading tree:', err)
    setError(err.message)
  } finally {
    isLoading.value = false
  }
}

// Load more (refresh)
const loadMore = async () => {
  loadingMore.value = true
  await loadTreeData()
  loadingMore.value = false
}

// Watch for changes
watch(() => contractStore.bananaContract, async () => {
  if (contractStore.bananaContract) {
    await loadTreeData()
  }
})

watch(() => networkStore.chainId, () => {
  // Reset when network changes
  leftUsers.value = []
  rightUsers.value = []
  leftCount.value = 0
  rightCount.value = 0
  totalUsers.value = 0
})

onMounted(async () => {
  if (contractStore.bananaContract) {
    await loadTreeData()
  }
})
</script>

<style scoped>
.not-connected, .loading-tree {
  text-align: center;
  padding: 60px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  color: #666;
}

.not-connected i, .loading-tree i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #667eea;
}

.loading-tree i {
  color: #667eea;
}

.tree-container {
  overflow-x: auto;
  padding: 20px 10px;
  background: #f8f9fa;
  border-radius: 15px;
}

.tree-node {
  background: white;
  padding: 20px 15px;
  border-radius: 15px;
  border: 2px solid #e0e0e0;
  text-align: center;
  min-width: 180px;
  margin: 0 auto;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
  transition: transform 0.3s ease;
  position: relative;
  z-index: 2;
}

.tree-node:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
}

.tree-node i {
  font-size: 30px;
  margin-bottom: 10px;
  color: #667eea;
}

.tree-node.root {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: white;
  border: none;
  box-shadow: 0 5px 20px rgba(255, 165, 0, 0.3);
  margin-bottom: 40px;
}

.tree-node.root i {
  color: white;
}

.node-label {
  font-weight: 600;
  margin-bottom: 5px;
}

.node-id {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
}

.node-count {
  font-size: 24px;
  font-weight: 800;
  color: #333;
  margin: 5px 0;
}

.node-detail {
  font-size: 12px;
  color: #666;
}

.node-wallet {
  font-size: 11px;
  font-family: monospace;
  background: rgba(255,255,255,0.2);
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.tree-children {
  display: flex;
  justify-content: center;
  gap: 60px;
  margin-top: 20px;
  position: relative;
}

.tree-children::before {
  content: '';
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 30px;
  background: #667eea;
}

.tree-branch {
  position: relative;
  flex: 1;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.branch-line {
  position: absolute;
  top: -30px;
  width: 100%;
  height: 2px;
  background: #667eea;
}

.tree-branch.left .branch-line {
  left: 50%;
  width: 50%;
}

.tree-branch.right .branch-line {
  right: 50%;
  width: 50%;
}

.children-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 15px;
  padding: 10px;
  background: white;
  border-radius: 10px;
  border: 1px dashed #667eea;
  max-width: 250px;
}

.preview-item {
  background: #e9ecef;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: help;
}

.preview-item i {
  font-size: 10px;
  color: #667eea;
}

.preview-more {
  font-size: 11px;
  color: #666;
  padding: 5px;
}

.tree-stats {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  padding: 15px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  background: #f8f9fa;
  border-radius: 30px;
  font-size: 14px;
  color: #333;
}

.stat-chip i {
  color: #667eea;
}

.user-position {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  padding: 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 10px;
  color: #856404;
}

.user-position i {
  color: #ffc107;
}

.tree-actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 14px;
}

.btn-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
  color: white;
  border: none;
}

.fa-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

/* Responsive */
@media (max-width: 768px) {
  .tree-children {
    flex-direction: column;
    gap: 30px;
  }
  
  .tree-children::before {
    display: none;
  }
  
  .branch-line {
    display: none;
  }
  
  .tree-branch {
    max-width: 100%;
  }
  
  .tree-stats {
    flex-direction: column;
    align-items: center;
  }
}
</style>