<template>
  <header class="header">
    <div class="logo">
      <i class="fas fa-banana"></i>
      <div>
        <h1>BananaVEST</h1>
        <p>MLM Binary Investment Platform</p>
      </div>
    </div>

    <div class="wallet-section">
      <div v-if="isWalletConnected" class="wallet-info">
        <span class="connected-dot"></span>
        <span>{{ formattedAddress }}</span>
        <button @click="switchAccount" class="btn btn-secondary btn-small">
          <i class="fas fa-sync-alt"></i>
        </button>
        <button @click="disconnect" class="btn btn-danger btn-small">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
      <button v-else @click="connect" class="btn btn-primary" :disabled="isConnecting">
        <i class="fas fa-wallet"></i>
        {{ isConnecting ? 'Connecting...' : 'Connect Wallet' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { useWallet } from '../composables/useWallet'

const { 
  formattedAddress, 
  isWalletConnected, 
  isConnecting, 
  connect, 
  disconnect, 
  switchAccount 
} = useWallet()
</script>