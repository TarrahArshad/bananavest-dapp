<template>
  <div class="flash-timer-section">
    <h3><i class="fas fa-hourglass-half"></i> Flash Timer</h3>
    
    <div v-if="!userStore.userInfo?.isRegistered" class="not-registered">
      <i class="fas fa-user-clock"></i>
      <p>Join the network to see your flash timer</p>
    </div>
    
    <div v-else class="timers-container">
      <!-- Personal Flash Timer -->
      <div class="timer-card personal">
        <div class="timer-header">
          <i class="fas fa-user"></i>
          <span>Your Personal Flash</span>
        </div>
        
        <div class="timer-main">
          <div class="timer-digits">
            <span class="days">{{ personalFlash.days }}</span>
            <span class="label">Days</span>
          </div>
          <div class="timer-sub">
            <span>{{ personalFlash.hours }}h</span>
            <span>{{ personalFlash.minutes }}m</span>
            <span>{{ personalFlash.seconds }}s</span>
          </div>
        </div>
        
        <div class="timer-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: personalFlash.progress + '%' }"
              :class="personalFlash.progressClass"
            ></div>
          </div>
          <div class="progress-info">
            <span>Day {{ personalFlash.passedDays }} / {{ personalFlash.totalDays }}</span>
            <span class="end-date">Ends: {{ formatDate(personalFlash.endTime) }}</span>
          </div>
        </div>
        
        <div class="timer-status" :class="personalFlash.statusClass">
          <i :class="personalFlash.statusIcon"></i>
          <span>{{ personalFlash.statusText }}</span>
        </div>
      </div>
      
      <!-- Monthly Flash Timer -->
      <div class="timer-card monthly">
        <div class="timer-header">
          <i class="fas fa-calendar"></i>
          <span>Monthly Flash</span>
        </div>
        
        <div class="timer-main">
          <div class="timer-digits">
            <span class="days">{{ monthlyFlash.days }}</span>
            <span class="label">Days Left</span>
          </div>
          <div class="timer-sub">
            <span>{{ monthlyFlash.hours }}h</span>
            <span>{{ monthlyFlash.minutes }}m</span>
            <span>{{ monthlyFlash.seconds }}s</span>
          </div>
        </div>
        
        <div class="timer-period">
          <div class="period-row">
            <i class="fas fa-play"></i>
            <span>Started: {{ formatDate(monthlyFlash.startTime) }}</span>
          </div>
          <div class="period-row">
            <i class="fas fa-stop"></i>
            <span>Ends: {{ formatDate(monthlyFlash.endTime) }}</span>
          </div>
        </div>
        
        <div class="timer-status" :class="monthlyFlash.statusClass">
          <i :class="monthlyFlash.statusIcon"></i>
          <span>{{ monthlyFlash.statusText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useContractStore } from '../stores/contractStore'

const userStore = useUserStore()
const contractStore = useContractStore()

// ============================================
// STATE
// ============================================
const currentTime = ref(Math.floor(Date.now() / 1000))
const flashTotalDays = ref(90) // مقدار پیش‌فرض
let timerInterval = null

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp * 1000)
  return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}, ${date.getFullYear()}`
}

const getStartOfMonth = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime() / 1000
}

const getEndOfMonth = (timestamp) => {
  const date = new Date(timestamp * 1000)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000
}

// ============================================
// PERSONAL FLASH - با محاسبات درست
// ============================================
const personalFlash = computed(() => {
  // اگر کاربر ثبت‌نام نکرده
  if (!userStore.userInfo?.joinTime) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      progress: 0,
      passedDays: 0,
      totalDays: flashTotalDays.value,
      endTime: 0,
      statusClass: 'status-inactive',
      statusIcon: 'fa-circle',
      statusText: 'Not Available',
      progressClass: 'progress-inactive'
    }
  }
  
  // محاسبات اصلی
  const joinTime = userStore.userInfo.joinTime
  const totalSeconds = flashTotalDays.value * 24 * 60 * 60
  const endTime = joinTime + totalSeconds
  
  // ثانیه‌های باقی‌مانده
  let remainingSeconds = endTime - currentTime.value
  if (remainingSeconds < 0) remainingSeconds = 0
  
  // تبدیل به روز، ساعت، دقیقه، ثانیه
  const days = Math.floor(remainingSeconds / (24 * 60 * 60))
  const hours = Math.floor((remainingSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60)
  const seconds = remainingSeconds % 60
  
  // روزهای گذشته
  const passedSeconds = currentTime.value - joinTime
  const passedDays = Math.floor(passedSeconds / (24 * 60 * 60))
  if (passedDays < 0) passedDays = 0
  
  // درصد پیشرفت
  let progress = (passedSeconds / totalSeconds) * 100
  if (progress > 100) progress = 100
  if (progress < 0) progress = 0
  
  // وضعیت
  let statusClass, statusIcon, statusText, progressClass
  
  if (remainingSeconds <= 0) {
    statusClass = 'status-expired'
    statusIcon = 'fa-hourglass-end'
    statusText = 'Expired'
    progressClass = 'progress-expired'
  } else if (progress >= 75) {
    statusClass = 'status-warning'
    statusIcon = 'fa-exclamation-triangle'
    statusText = 'Ending Soon'
    progressClass = 'progress-warning'
  } else {
    statusClass = 'status-active'
    statusIcon = 'fa-hourglass-half'
    statusText = 'Active'
    progressClass = 'progress-active'
  }
  
  return {
    days,
    hours,
    minutes,
    seconds,
    progress,
    passedDays,
    totalDays: flashTotalDays.value,
    endTime,
    statusClass,
    statusIcon,
    statusText,
    progressClass
  }
})

// ============================================
// MONTHLY FLASH
// ============================================
const monthlyFlash = computed(() => {
  const now = currentTime.value
  
  // اول و آخر ماه
  const startOfMonth = getStartOfMonth(now)
  const endOfMonth = getEndOfMonth(now)
  
  // ثانیه‌های باقی‌مانده تا آخر ماه
  let remainingSeconds = endOfMonth - now
  if (remainingSeconds < 0) remainingSeconds = 0
  
  // تبدیل
  const days = Math.floor(remainingSeconds / (24 * 60 * 60))
  const hours = Math.floor((remainingSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60)
  const seconds = remainingSeconds % 60
  
  // وضعیت
  let statusClass, statusIcon, statusText
  
  if (remainingSeconds <= 0) {
    statusClass = 'status-expired'
    statusIcon = 'fa-hourglass-end'
    statusText = 'Month Ended'
  } else if (days <= 7) {
    statusClass = 'status-warning'
    statusIcon = 'fa-exclamation-triangle'
    statusText = 'Final Week'
  } else {
    statusClass = 'status-active'
    statusIcon = 'fa-calendar-check'
    statusText = 'Active'
  }
  
  return {
    days,
    hours,
    minutes,
    seconds,
    startTime: startOfMonth,
    endTime: endOfMonth,
    statusClass,
    statusIcon,
    statusText
  }
})

// ============================================
// LOAD FROM CONTRACT
// ============================================
const loadFlashSettings = async () => {
  if (!contractStore.bananaContract) return
  
  try {
    // گرفتن مقدار از قرارداد
    const flashDays = await contractStore.bananaContract.methods.flashTimeInDays().call()
    flashTotalDays.value = Number(flashDays)
    console.log('📊 Flash days from contract:', flashTotalDays.value)
    
    // دیباگ - بررسی زمان ثبت‌نام کاربر
    if (userStore.userInfo?.joinTime) {
      const joinDate = new Date(userStore.userInfo.joinTime * 1000)
      console.log('📅 Join time:', joinDate.toLocaleString())
    }
  } catch (error) {
    console.error('Error loading flash settings:', error)
    // اگه خطا داشت، از مقدار پیش‌فرض استفاده کن
    flashTotalDays.value = 90
  }
}

// ============================================
// TIMER
// ============================================
const updateTimer = () => {
  currentTime.value = Math.floor(Date.now() / 1000)
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(async () => {
  await loadFlashSettings()
  updateTimer()
  timerInterval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.flash-timer-section {
  background: white;
  border-radius: 15px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  margin-top: 20px;
}

.flash-timer-section h3 {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #333;
}

.flash-timer-section h3 i {
  color: #667eea;
}

.timers-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.timer-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #e0e0e0;
  transition: transform 0.3s ease;
}

.timer-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.timer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  font-weight: 600;
  color: #495057;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.timer-header i {
  color: #667eea;
  font-size: 18px;
}

.timer-main {
  text-align: center;
  margin-bottom: 15px;
}

.timer-digits {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 5px;
  margin-bottom: 5px;
}

.timer-digits .days {
  font-size: 48px;
  font-weight: 800;
  color: #333;
  line-height: 1;
}

.timer-digits .label {
  font-size: 16px;
  color: #6c757d;
  margin-left: 5px;
}

.timer-sub {
  display: flex;
  justify-content: center;
  gap: 15px;
  font-size: 18px;
  font-weight: 600;
  color: #495057;
}

.timer-sub span {
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 6px;
  min-width: 50px;
}

.timer-progress {
  margin-bottom: 15px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-active {
  background: linear-gradient(90deg, #28a745, #20c997);
}

.progress-warning {
  background: linear-gradient(90deg, #ffc107, #fd7e14);
}

.progress-expired {
  background: linear-gradient(90deg, #dc3545, #c82333);
}

.progress-inactive {
  background: #6c757d;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.end-date {
  font-family: monospace;
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 4px;
}

.timer-period {
  margin-bottom: 15px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.period-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
}

.period-row i {
  width: 20px;
  color: #667eea;
  font-size: 12px;
}

.timer-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-warning {
  background: #fff3cd;
  color: #856404;
}

.status-expired {
  background: #f8d7da;
  color: #721c24;
}

.status-inactive {
  background: #e9ecef;
  color: #495057;
}

.not-registered {
  text-align: center;
  padding: 40px;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 10px;
}

.not-registered i {
  font-size: 48px;
  margin-bottom: 15px;
  color: #667eea;
}

/* Responsive */
@media (max-width: 768px) {
  .timers-container {
    grid-template-columns: 1fr;
  }
  
  .timer-sub {
    flex-wrap: wrap;
  }
  
  .timer-digits .days {
    font-size: 36px;
  }
}
</style>