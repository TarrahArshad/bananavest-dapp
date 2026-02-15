import { ref } from 'vue'
import { useWeb3 } from './useWeb3'
import { useWallet } from './useWallet'
import { useContract } from './useContract'
import { formatUSDT, buildTxOptions } from '../utils/helpers'

export function useHiddenWallet() {
  const { web3, chainId } = useWeb3()
  const { address } = useWallet()
  const { bananaContract, usdtContract, bananaAddress, loadContractData } = useContract()

  const selectedTier = ref(1)
  const hiddenCount = ref({ left: 0, right: 0 })
  const hiddenWallets = ref([])
  const activationStatus = ref({ ready: false, timeRemaining: '' })
  const isLoading = ref(false)
  const error = ref(null)

  const tierAmounts = ref({
    tier1: 0,
    tier2: 0,
    tier3: 0
  })

  const feeBreakdown = ref({
    monthlyReward: '10',
    adminFee: '12',
    remaining: '0',
    total: '0'
  })

  const loadHiddenWalletData = async (userIndex) => {
    if (!bananaContract.value) return

    isLoading.value = true

    try {
      const [leftHidden, rightHidden, tier1, tier2, tier3] = await Promise.all([
        bananaContract.value.methods.hideCount(userIndex, true).call(),
        bananaContract.value.methods.hideCount(userIndex, false).call(),
        bananaContract.value.methods.tier1Amount().call(),
        bananaContract.value.methods.tier2Amount().call(),
        bananaContract.value.methods.tier3Amount().call()
      ])

      hiddenCount.value = { left: leftHidden, right: rightHidden }
      tierAmounts.value = { tier1, tier2, tier3 }

      await checkActivationStatus(userIndex)
      await loadHiddenWalletsList(userIndex)
      updateFeeBreakdown()

    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  const checkActivationStatus = async (userIndex) => {
    try {
      const [positionInfo, hideActivationPeriod] = await Promise.all([
        bananaContract.value.methods.position(userIndex).call(),
        bananaContract.value.methods.hideActivationPeriod().call()
      ])

      const currentTime = Math.floor(Date.now() / 1000)
      const activationEndTime = Number(positionInfo.time) + Number(hideActivationPeriod)
      const ready = currentTime >= activationEndTime

      let timeRemaining = ''
      if (!ready) {
        const remaining = activationEndTime - currentTime
        const hours = Math.floor(remaining / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)
        timeRemaining = `${hours}h ${minutes}m`
      }

      activationStatus.value = { ready, timeRemaining }
    } catch (err) {
      console.error('Error checking activation:', err)
    }
  }

  const loadHiddenWalletsList = async (userIndex) => {
    try {
      const [leftChildren, rightChildren] = await Promise.all([
        bananaContract.value.methods.getLeftChildren(userIndex).call(),
        bananaContract.value.methods.getRightChildren(userIndex).call()
      ])

      const allChildren = [...leftChildren, ...rightChildren]
      const wallets = []

      for (const childIndex of allChildren) {
        try {
          const childInfo = await bananaContract.value.methods.position(childIndex).call()
          if (childInfo.hide) {
            wallets.push({
              index: childIndex,
              address: childInfo.wallet,
              side: leftChildren.includes(childIndex.toString()) ? 'Left' : 'Right',
              time: new Date(childInfo.time * 1000).toLocaleDateString()
            })
          }
        } catch (e) {
          console.warn('Error loading child info:', e)
        }
      }

      hiddenWallets.value = wallets
    } catch (err) {
      console.error('Error loading hidden wallets:', err)
    }
  }

  const updateFeeBreakdown = () => {
    let tierAmount
    switch (selectedTier.value) {
      case 1: tierAmount = tierAmounts.value.tier1; break
      case 2: tierAmount = tierAmounts.value.tier2; break
      case 3: tierAmount = tierAmounts.value.tier3; break
      default: tierAmount = tierAmounts.value.tier1
    }

    const tierAmountNum = Number(tierAmount)
    const adminFeeNum = 12 * 1000000 // 12 USDT in wei
    const remainingAmount = tierAmountNum - adminFeeNum - (10 * 1000000) // 10 USDT monthly reward

    feeBreakdown.value = {
      monthlyReward: '10',
      adminFee: '12',
      remaining: formatUSDT(remainingAmount),
      total: formatUSDT(tierAmount)
    }
  }

  const selectTier = (tier) => {
    selectedTier.value = tier
    updateFeeBreakdown()
  }

  const approveHiddenUSDT = async () => {
    if (!usdtContract.value || !bananaAddress.value || !address.value) {
      error.value = 'Please connect wallet first'
      return false
    }

    isLoading.value = true

    try {
      const userIndex = await bananaContract.value.methods.index(address.value).call()
      const currentCount = hiddenCount.value.left + hiddenCount.value.right

      let requiredAmount
      if (currentCount == 0) requiredAmount = tierAmounts.value.tier1
      else if (currentCount == 1) requiredAmount = tierAmounts.value.tier2
      else if (currentCount == 2) requiredAmount = tierAmounts.value.tier3
      else {
        error.value = 'Maximum hidden wallets reached'
        isLoading.value = false
        return false
      }

      const currentAllowance = await usdtContract.value.methods.allowance(
        address.value,
        bananaAddress.value
      ).call()

      if (BigInt(currentAllowance) >= BigInt(requiredAmount)) {
        isLoading.value = false
        return true
      }

      const tx = await usdtContract.value.methods.approve(
        bananaAddress.value,
        requiredAmount
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

  const createHiddenWallet = async (childAddress, isLeft) => {
    if (!bananaContract.value || !address.value) {
      error.value = 'Please connect wallet first'
      return false
    }

    if (!web3.value.utils.isAddress(childAddress)) {
      error.value = 'Invalid wallet address'
      return false
    }

    isLoading.value = true

    try {
      const userIndex = await bananaContract.value.methods.index(address.value).call()
      
      if (!activationStatus.value.ready) {
        error.value = `Activation period not reached. Please wait ${activationStatus.value.timeRemaining}`
        isLoading.value = false
        return false
      }

      const sideCount = isLeft ? hiddenCount.value.left : hiddenCount.value.right
      if (sideCount >= 3) {
        error.value = 'Maximum hidden wallets reached for this side'
        isLoading.value = false
        return false
      }

      let requiredAmount
      if (sideCount == 0) requiredAmount = tierAmounts.value.tier1
      else if (sideCount == 1) requiredAmount = tierAmounts.value.tier2
      else if (sideCount == 2) requiredAmount = tierAmounts.value.tier3

      const [allowance, balance] = await Promise.all([
        usdtContract.value.methods.allowance(address.value, bananaAddress.value).call(),
        usdtContract.value.methods.balanceOf(address.value).call()
      ])

      if (BigInt(allowance) < BigInt(requiredAmount)) {
        error.value = 'Insufficient allowance. Please approve first.'
        isLoading.value = false
        return false
      }

      if (BigInt(balance) < BigInt(requiredAmount)) {
        error.value = `Insufficient balance. Required: ${formatUSDT(requiredAmount)} USDT`
        isLoading.value = false
        return false
      }

      const childExists = await bananaContract.value.methods.addressExists(childAddress).call()
      if (childExists) {
        error.value = 'Child address already exists'
        isLoading.value = false
        return false
      }

      const tx = await bananaContract.value.methods.activeHide(
        childAddress,
        isLeft,
        requiredAmount
      ).send({
        from: address.value,
        ...buildTxOptions(web3.value, chainId.value, 500000)
      })

      await loadContractData()
      await loadHiddenWalletData(userIndex)

      isLoading.value = false
      return tx.status
    } catch (err) {
      error.value = err.message
      isLoading.value = false
      return false
    }
  }

  return {
    selectedTier,
    hiddenCount,
    hiddenWallets,
    activationStatus,
    tierAmounts,
    feeBreakdown,
    isLoading,
    error,
    selectTier,
    loadHiddenWalletData,
    approveHiddenUSDT,
    createHiddenWallet
  }
}