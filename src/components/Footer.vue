<template>
  <footer class="footer">
    <p>© 2024 BananaVEST - MLM Binary System v2.6.1</p>
    <div class="contract-info">
      <p>All transactions are secured by smart contracts on the blockchain</p>
      <div class="contract-limits">
        <span><i class="fas fa-shield-alt"></i> Daily Commission Limit: 350 USDT</span>
        <span><i class="fas fa-trophy"></i> Total Ceiling: 75,000 USDT</span>
        <span><i class="fas fa-clock"></i> Flash Time: 90 Days</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  text-align: center;
  color: white;
  padding: 25px;
  margin-top: 30px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.footer p {
  margin-bottom: 15px;
  font-size: 16px;
}

.contract-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 10px;
  margin-top: 15px;
}

.contract-limits {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.contract-limits span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
}

@media (max-width: 768px) {
  .contract-limits {
    flex-direction: column;
    gap: 10px;
  }
}
</style>