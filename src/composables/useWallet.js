import { ref, computed } from 'vue'
import { useWeb3 } from './useWeb3'
import { formatAddress } from '../utils/helpers'

export function useWallet() {
  const { web3, isConnected: web3Connected, updateNetworkInfo } = useWeb3()
  
  const address = ref(null)
  const balance = ref('0')
  const isConnecting = ref(false)
  const error = ref(null)

  const formattedAddress = computed(() => formatAddress(address.value))
  const isWalletConnected = computed(() => !!address.value && web3Connected.value)

  const connect = async () => {
    if (!window.ethereum) {
      error.value = 'Please install MetaMask'
      return false
    }

    isConnecting.value = true
    error.value = null

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      address.value = accounts[0]
      await updateBalance()
      await updateNetworkInfo()
      
      isConnecting.value = false
      return true
    } catch (err) {
      error.value = err.message
      isConnecting.value = false
      return false
    }
  }

  const disconnect = () => {
    address.value = null
    balance.value = '0'
  }

  const updateBalance = async () => {
    if (!web3.value || !address.value) return
    const bal = await web3.value.eth.getBalance(address.value)
    balance.value = web3.value.utils.fromWei(bal, 'ether')
  }

  const switchAccount = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      })
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        address.value = accounts[0]
        await updateBalance()
      }
    } catch (err) {
      error.value = err.message
    }
  }

  return {
    address,
    balance,
    isConnecting,
    error,
    formattedAddress,
    isWalletConnected,
    connect,
    disconnect,
    switchAccount,
    updateBalance
  }
}