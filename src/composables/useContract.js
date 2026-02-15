import { ref } from 'vue'
import { useWeb3 } from './useWeb3'
import { useWallet } from './useWallet'
import { FALLBACK_USDT_ABI } from '../utils/constants'
import { buildTxOptions, formatUSDT, sleep } from '../utils/helpers'
import bananaABI from '../utils/abi/bananavest.json'
import usdtABI from '../utils/abi/usdt.json'

export function useContract() {
  const { web3, currentNetwork, chainId } = useWeb3()
  const { address } = useWallet()

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

  const userInfo = ref({
    isRegistered: false,
    index: 0,
    position: '',
    name: '',
    treeBalance: 0,
    tetherBalance: '0',
    totalReceived: '0',
    leftTeam: 0,
    rightTeam: 0
  })

  const entryInfo = ref({
    amount: 0,
    adminFee: 0,
    liquidityAmount: 0,
    totalAmount: 0
  })

  const initContracts = async () => {
    isLoading.value = true
    error.value = null

    try {
      await loadABIs()
      await autoDetectContracts()
      
      if (bananaAddress.value && usdtAddress.value) {
        bananaContract.value = new web3.value.eth.Contract(bananaABI, bananaAddress.value)
        usdtContract.value = new web3.value.eth.Contract(usdtABI || FALLBACK_USDT_ABI, usdtAddress.value)
      }
      
      isLoading.value = false
      return true
    } catch (err) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  const loadABIs = async () => {
    // ABIs are imported directly, no need to fetch
    console.log('ABIs loaded')
  }

  const autoDetectContracts = async () => {
    if (!currentNetwork.value) return

    bananaAddress.value = currentNetwork.value.contracts.bananaVest || ''
    usdtAddress.value = currentNetwork.value.contracts.usdt || ''

    if (!bananaAddress.value) {
      await scanForBananaVEST()
    }
  }

  const scanForBananaVEST = async () => {
    const testAddresses = [
      '0x9C74996C43B19A12f5D9868cBdA264bB0A831D2A',
      '0x2CE805ABB53C2092C839839235C2868A94ADCABd',
      '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    ]

    for (const addr of testAddresses) {
      try {
        const code = await web3.value.eth.getCode(addr)
        if (code !== '0x') {
          bananaAddress.value = addr
          break
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  const loadContractData = async () => {
    if (!bananaContract.value || !address.value) return

    isLoading.value = true

    try {
      const [totalUsers, isPaused, userIndex] = await Promise.all([
        bananaContract.value.methods.lastIndex().call(),
        bananaContract.value.methods.isPaused().call(),
        bananaContract.value.methods.index(address.value).call()
      ])

      let pendingUpdates = 0
      try {
        const runningUsers = await bananaContract.value.methods.getRunningUsers().call()
        pendingUpdates = runningUsers.length
      } catch (e) {
        console.log('Could not get running users')
      }

      let totalLiquidity = '0 USDT'
      try {
        const liquidity = await bananaContract.value.methods.liquidity(0).call()
        totalLiquidity = formatUSDT(liquidity) + ' USDT'
      } catch (e) {
        console.log('Could not fetch liquidity')
      }

      contractStats.value = {
        totalUsers,
        totalLiquidity,
        pendingUpdates,
        status: isPaused ? '⏸️ Paused' : '✅ Active'
      }

      if (userIndex > 0) {
        await loadUserInfo(userIndex)
        userInfo.value.isRegistered = true
        userInfo.value.index = userIndex
      } else {
        userInfo.value.isRegistered = false
      }

      await loadEntryInfo()

    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const loadUserInfo = async (userIndex) => {
    try {
      const [positionInfo, tetherBalance, treeBalance, totalReceived, leftCount, rightCount] = await Promise.all([
        bananaContract.value.methods.position(userIndex).call(),
        bananaContract.value.methods._tetherBalances(userIndex).call(),
        bananaContract.value.methods.balance(userIndex).call(),
        bananaContract.value.methods.totalRecived(userIndex).call(),
        bananaContract.value.methods.left(userIndex).call(),
        bananaContract.value.methods.right(userIndex).call()
      ])

      userInfo.value = {
        ...userInfo.value,
        position: positionInfo.isLeft ? 'Left 👈' : 'Right 👉',
        name: positionInfo.name || 'Unset',
        treeBalance,
        tetherBalance: formatUSDT(tetherBalance),
        totalReceived: formatUSDT(totalReceived),
        leftTeam: leftCount,
        rightTeam: rightCount
      }
    } catch (err) {
      console.error('Error loading user info:', err)
    }
  }

  const loadEntryInfo = async () => {
    try {
      const entryAmount = await bananaContract.value.methods.entryAmount().call()
      const adminFee = await bananaContract.value.methods.adminFeeAmount().call()
      
      const entryAmountFormatted = Number(entryAmount) / 1000000
      const adminFeeFormatted = Number(adminFee) / 1000000
      const liquidityAmount = entryAmountFormatted - adminFeeFormatted

      entryInfo.value = {
        amount: entryAmount,
        adminFee: adminFee,
        liquidityAmount: liquidityAmount.toFixed(2),
        totalAmount: entryAmountFormatted.toFixed(2)
      }
    } catch (err) {
      console.error('Error loading entry info:', err)
    }
  }

  const approveUSDT = async () => {
    if (!usdtContract.value || !bananaAddress.value || !address.value) {
      error.value = 'Please connect wallet first'
      return false
    }

    isLoading.value = true

    try {
      const entryAmount = await bananaContract.value.methods.entryAmount().call()
      
      const tx = await usdtContract.value.methods.approve(
        bananaAddress.value,
        entryAmount
      ).send({
        from: address.value,
        ...buildTxOptions(web3.value, chainId.value, 100000)
      })

      isLoading.value = false
      return tx.status
    } catch (err) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  const joinNetwork = async (referralId, isLeft) => {
    if (!bananaContract.value || !address.value) {
      error.value = 'Please connect wallet first'
      return false
    }

    isLoading.value = true

    try {
      const entryAmount = await bananaContract.value.methods.entryAmount().call()
      
      const allowance = await usdtContract.value.methods.allowance(
        address.value,
        bananaAddress.value
      ).call()

      if (BigInt(allowance) < BigInt(entryAmount)) {
        error.value = 'Please approve USDT first'
        isLoading.value = false
        return false
      }

      const balance = await usdtContract.value.methods.balanceOf(address.value).call()
      if (BigInt(balance) < BigInt(entryAmount)) {
        error.value = 'Insufficient USDT balance'
        isLoading.value = false
        return false
      }

      let gasEstimate
      try {
        gasEstimate = await bananaContract.value.methods.join(
          referralId,
          isLeft,
          entryAmount
        ).estimateGas({ from: address.value })

        gasEstimate = isLeft 
          ? Math.floor(Number(gasEstimate) * 1.3)
          : Math.floor(Number(gasEstimate) * 1.5)
      } catch {
        gasEstimate = isLeft ? 400000 : 1500000
      }

      const tx = await bananaContract.value.methods.join(
        referralId,
        isLeft,
        entryAmount
      ).send({
        from: address.value,
        gas: gasEstimate,
        ...buildTxOptions(web3.value, chainId.value, gasEstimate)
      })

      await sleep(2000)
      await loadContractData()
      
      isLoading.value = false
      return tx.status
    } catch (err) {
      error.value = err.message
      isLoading.value = false
      return false
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
    userInfo,
    entryInfo,
    initContracts,
    loadContractData,
    approveUSDT,
    joinNetwork
  }
}