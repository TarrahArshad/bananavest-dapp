import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useNetworkStore } from './networkStore'
import { formatAddress } from '../utils/constants'

export const useUserStore = defineStore('user', () => {
  const networkStore = useNetworkStore()
  
  const address = ref(null)
  const balance = ref('0')
  const isConnecting = ref(false)
  const error = ref(null)
  
  // اضافه کردن userInfo به userStore
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

  const formattedAddress = computed(() => formatAddress(address.value))
  const isWalletConnected = computed(() => !!address.value)

  async function connect() {
    if (!window.ethereum) {
      error.value = 'Please install MetaMask'
      return false
    }

    isConnecting.value = true
    error.value = null
    console.log('🔌 Requesting wallet connection...')

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      console.log('✅ Accounts received:', accounts)
      
      if (accounts.length > 0) {
        address.value = accounts[0]
        console.log('👛 Connected address:', address.value)
        
        await updateBalance()
        await networkStore.updateNetworkInfo()
        
        isConnecting.value = false
        return true
      } else {
        throw new Error('No accounts returned')
      }
      
    } catch (err) {
      console.error('❌ Connection error:', err)
      
      if (err.code === 4001) {
        error.value = 'Connection rejected by user'
      } else {
        error.value = err.message
      }
      
      isConnecting.value = false
      return false
    }
  }

  function disconnect() {
    console.log('👋 Disconnecting wallet...')
    address.value = null
    balance.value = '0'
    // Reset userInfo when disconnecting
    userInfo.value = {
      isRegistered: false,
      index: 0,
      position: '',
      name: '',
      treeBalance: 0,
      tetherBalance: '0',
      totalReceived: '0',
      leftTeam: 0,
      rightTeam: 0
    }
  }

  async function updateBalance() {
    if (!networkStore.web3 || !address.value) return
    
    try {
      const bal = await networkStore.web3.eth.getBalance(address.value)
      balance.value = networkStore.web3.utils.fromWei(bal, 'ether')
      console.log('💰 Balance:', balance.value, 'ETH')
    } catch (err) {
      console.error('Error updating balance:', err)
    }
  }

  async function switchAccount() {
    try {
      console.log('🔄 Switching account...')
      
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      })
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        address.value = accounts[0]
        console.log('✅ Switched to:', address.value)
        await updateBalance()
      }
    } catch (err) {
      console.error('Error switching account:', err)
      error.value = err.message
    }
  }

  // متد برای بروزرسانی userInfo از contractStore
  function setUserInfo(info) {
    userInfo.value = { ...userInfo.value, ...info }
  }

  return {
    address,
    balance,
    isConnecting,
    error,
    userInfo,  // اضافه کردن userInfo به خروجی
    formattedAddress,
    isWalletConnected,
    connect,
    disconnect,
    switchAccount,
    updateBalance,
    setUserInfo  // متد جدید برای بروزرسانی
  }
})