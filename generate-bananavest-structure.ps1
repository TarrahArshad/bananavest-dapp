# Simple version - just creates structure
Write-Host "🍌 Creating BananaVEST Vue.js structure..." -ForegroundColor Green

$baseDir = "bananavest-vue"

# Remove if exists
if (Test-Path $baseDir) {
    Remove-Item -Path $baseDir -Recurse -Force
}

# Create directories
$dirs = @(
    "$baseDir\public",
    "$baseDir\src\assets",
    "$baseDir\src\components",
    "$baseDir\src\composables",
    "$baseDir\src\stores",
    "$baseDir\src\utils\abi"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# Create files
$files = @(
    "$baseDir\package.json",
    "$baseDir\vite.config.js",
    "$baseDir\index.html",
    "$baseDir\src\main.js",
    "$baseDir\src\App.vue",
    "$baseDir\src\assets\main.css",
    "$baseDir\src\components\Header.vue",
    "$baseDir\src\components\QuickActions.vue",
    "$baseDir\src\components\NetworkInfo.vue",
    "$baseDir\src\components\ContractStats.vue",
    "$baseDir\src\components\UserInfo.vue",
    "$baseDir\src\components\JoinNetwork.vue",
    "$baseDir\src\components\HiddenWallet.vue",
    "$baseDir\src\components\DistributionManagement.vue",
    "$baseDir\src\components\NetworkTree.vue",
    "$baseDir\src\composables\useWeb3.js",
    "$baseDir\src\composables\useWallet.js",
    "$baseDir\src\composables\useContract.js",
    "$baseDir\src\composables\useHiddenWallet.js",
    "$baseDir\src\stores\networkStore.js",
    "$baseDir\src\stores\userStore.js",
    "$baseDir\src\stores\contractStore.js",
    "$baseDir\src\utils\constants.js",
    "$baseDir\src\utils\helpers.js",
    "$baseDir\src\utils\abi\bananavest.json",
    "$baseDir\src\utils\abi\usdt.json",
    "$baseDir\public\favicon.ico"
)

foreach ($file in $files) {
    New-Item -ItemType File -Force -Path $file | Out-Null
}

Write-Host "✅ Structure created at: $baseDir" -ForegroundColor Green