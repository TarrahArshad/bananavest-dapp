import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNetworkStore } from './networkStore'
import { useUserStore } from './userStore'
import { FALLBACK_USDT_ABI, formatUSDT, sleep } from '../utils/constants'
import bananaABI from '../utils/abi/bananavest.json'
import usdtABI from '../utils/abi/usdt.json'

// این خط مهم است - باید export بشه
export const useContractStore = defineStore('contract', () => {
  const networkStore = useNetworkStore()
  const userStore = useUserStore()

  const bananaContract = ref(null)
  const usdtContract = ref(null)
  const bananaAddress = ref('')
  const usdtAddress = ref('')
  const isLoading = ref(false)
  const error = ref(null)

  const contractStats = ref({
    totalUsers: 0,
    totalLiquidity: '0 USDT',
    pendingUpdates: 0,
    status: 'Loading...'
  })

  const entryInfo = ref({
    amount: 0,
    adminFee: 0,
    liquidityAmount: 0,
    totalAmount: 0
  })

  async function initContracts() {
    if (!networkStore.web3) {
      error.value = 'Web3 not initialized'
      return false
    }

    isLoading.value = true
    error.value = null
    console.log('🔍 Initializing contracts...')

    try {
      if (networkStore.currentNetwork) {
        bananaAddress.value = networkStore.currentNetwork.contracts?.bananaVest || ''
        usdtAddress.value = networkStore.currentNetwork.contracts?.usdt || ''
        
        console.log('📝 BananaVEST address:', bananaAddress.value)
        console.log('📝 USDT address:', usdtAddress.value)
      }

      if (bananaAddress.value) {
        try {
          bananaContract.value = new networkStore.web3.eth.Contract(bananaABI, bananaAddress.value)
          
          const lastIndex = await bananaContract.value.methods.lastIndex().call()
          console.log('✅ BananaVEST contract OK, lastIndex:', lastIndex)
        } catch (err) {
          console.error('❌ BananaVEST contract error:', err)
          bananaContract.value = null
        }
      }

      if (usdtAddress.value) {
        try {
          const abiToUse = usdtABI && usdtABI.length > 0 ? usdtABI : FALLBACK_USDT_ABI
          usdtContract.value = new networkStore.web3.eth.Contract(abiToUse, usdtAddress.value)
          
          const symbol = await usdtContract.value.methods.symbol().call()
          console.log('✅ USDT contract OK, symbol:', symbol)
        } catch (err) {
          console.error('❌ USDT contract error:', err)
          usdtContract.value = null
        }
      }

      isLoading.value = false
      return true
      
    } catch (err) {
      console.error('❌ Contract init failed:', err)
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  async function loadContractData0() {
    if (!bananaContract.value || !userStore.address) {
      console.log('⚠️ Cannot load data: contract or wallet not ready')
      return
    }

    isLoading.value = true
    console.log('📊 Loading contract data...')

    try {
      const totalUsers = await bananaContract.value.methods.lastIndex().call()
      console.log('📊 totalUsers:', totalUsers)
      
      const isPaused = await bananaContract.value.methods.isPaused().call()
      console.log('📊 isPaused:', isPaused)
      
      const userIndex = await bananaContract.value.methods.index(userStore.address).call()
      console.log('📊 userIndex:', userIndex)
      
      let pendingUpdates = 0
      try {
        const runningUsers = await bananaContract.value.methods.getRunningUsers().call()
        pendingUpdates = runningUsers.length
        console.log('📊 runningUsers:', runningUsers)
      } catch (e) {
        console.log('Could not get running users')
      }

      let totalLiquidity = '0 USDT'
      try {
        const liquidity = await bananaContract.value.methods.liquidity(0).call()
        totalLiquidity = formatUSDT(liquidity) + ' USDT'
        console.log('📊 liquidity:', liquidity)
      } catch (e) {
        console.log('Could not fetch liquidity')
      }

      contractStats.value = {
        totalUsers: totalUsers.toString(),
        totalLiquidity,
        pendingUpdates,
        status: isPaused ? '⏸️ Paused' : '✅ Active'
      }
      
      console.log('✅ Contract stats updated:', contractStats.value)

      if (userIndex > 0) {
        await loadUserInfo(userIndex)
        userStore.setUserInfo({
          isRegistered: true,
          index: userIndex
        })
      } else {
        userStore.setUserInfo({
          isRegistered: false,
          index: 0
        })
      }

      await loadEntryInfo()
      
      console.log('✅ Contract data loaded')
      
    } catch (err) {
      console.error('❌ Error loading contract data:', err)
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }
async function loadContractData() {
  if (!bananaContract.value || !userStore.address) {
    console.log('⚠️ Cannot load data: contract or wallet not ready')
    return
  }

  isLoading.value = true
  console.log('📊 Loading contract data...')

  try {
    // Get basic stats
    const totalUsers = await bananaContract.value.methods.lastIndex().call()
    console.log('📊 totalUsers:', totalUsers)
    
    const isPaused = await bananaContract.value.methods.isPaused().call()
    console.log('📊 isPaused:', isPaused)
    
    // Get user info
    const userIndex = await bananaContract.value.methods.index(userStore.address).call()
    console.log('📊 userIndex:', userIndex)
    
    // Get pending updates
    let pendingUpdates = 0
    try {
      const runningUsers = await bananaContract.value.methods.getRunningUsers().call()
      pendingUpdates = runningUsers.length
      console.log('📊 runningUsers:', runningUsers)
    } catch (e) {
      console.log('Could not get running users')
    }

    // Get liquidity
    let totalLiquidity = '0 USDT'
    try {
      const liquidity = await bananaContract.value.methods.liquidity(0).call()
      totalLiquidity = formatUSDT(liquidity) + ' USDT'
      console.log('📊 liquidity:', liquidity)
    } catch (e) {
      console.log('Could not fetch liquidity')
    }

    // Update contractStats
    contractStats.value = {
      totalUsers: totalUsers.toString(),
      totalLiquidity,
      pendingUpdates,
      status: isPaused ? '⏸️ Paused' : '✅ Active'
    }
    
    console.log('✅ Contract stats updated:', contractStats.value)

    // Load user info if registered
    if (userIndex > 0) {
      await loadUserInfo(userIndex)
      userStore.setUserInfo({
        isRegistered: true,
        index: userIndex
      })
    } else {
      userStore.setUserInfo({
        isRegistered: false,
        index: 0
      })
    }

    // Load entry info
    await loadEntryInfo()
    
    console.log('✅ Contract data loaded')
    
  } catch (err) {
    console.error('❌ Error loading contract data:', err)
    error.value = err.message
  } finally {
    // این خط مهمه - حتماً باید isLoading رو false کنه
    isLoading.value = false
    console.log('📊 isLoading set to false')
  }
}
  async function loadUserInfo(userIndex) {
    try {
      const positionInfo = await bananaContract.value.methods.position(userIndex).call()
      
      const tetherBalance = await bananaContract.value.methods._tetherBalances(userIndex).call()
      const treeBalance = await bananaContract.value.methods.balance(userIndex).call()
      const totalReceived = await bananaContract.value.methods.totalRecived(userIndex).call()
      const leftCount = await bananaContract.value.methods.left(userIndex).call()
      const rightCount = await bananaContract.value.methods.right(userIndex).call()

      userStore.setUserInfo({
        position: positionInfo.isLeft ? 'Left 👈' : 'Right 👉',
        name: positionInfo.name || 'Unset',
        treeBalance,
        tetherBalance: formatUSDT(tetherBalance),
        totalReceived: formatUSDT(totalReceived),
        leftTeam: leftCount,
        rightTeam: rightCount
      })
      
    } catch (err) {
      console.error('Error loading user info:', err)
    }
  }

  async function loadEntryInfo() {
    try {
      const entryAmount = await bananaContract.value.methods.entryAmount().call()
      const adminFee = await bananaContract.value.methods.adminFeeAmount().call()
      
      const entryAmountFormatted = Number(entryAmount) / 1000000
      const adminFeeFormatted = Number(adminFee) / 1000000
      const liquidityAmount = entryAmountFormatted - adminFeeFormatted

      entryInfo.value = {
        amount: entryAmount,
        adminFee,
        liquidityAmount: liquidityAmount.toFixed(2),
        totalAmount: entryAmountFormatted.toFixed(2)
      }
    } catch (err) {
      console.error('Error loading entry info:', err)
    }
  }

  return {
    bananaContract,
    usdtContract,
    bananaAddress,
    usdtAddress,
    isLoading,
    error,
    contractStats,
    entryInfo,
    initContracts,
    loadContractData
  }
})