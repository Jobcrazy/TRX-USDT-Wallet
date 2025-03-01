<template>
  <van-notice-bar left-icon="info-o" color="#1989fa" background="#ecf9ff">
    <template #default>
      <div class="notify">
        <span class="notify_left" @click="showApprove = true"
          >您已授权兑换 {{ approved }} 个USDT, 点这里提升</span
        >
        <span class="notify_right" @click="refreshApprove" v-if="!loading">刷新</span>
        <span class="notify_right" v-if="loading">
          <van-loading size="24" color="#1989fa" />
        </span>
      </div>
    </template>
  </van-notice-bar>

  <div class="wrapper">
    <van-row class="listWapper">
      <div class="item">
        <div class="left">
          <van-image :src="tether" class="logo">
            <template #error>加载失败</template>
          </van-image>
          <div class="name">{{ 'Tether' }}</div>
        </div>
        <div class="right">
          <div class="amount">{{ usdtBalance }}</div>
          <div class="token">USDT</div>
        </div>
      </div>
    </van-row>
    <van-form @submit="onSwap">
      <van-field
        v-model="swapAmount"
        type="number"
        :disabled="loading"
        name="数量"
        label="数量"
        placeholder="请输入要兑换的USDT数量"
        :rules="[{ required: true, message: '请输入要兑换的USDT数量' }]"
      >
        <template #button>
          <span @click="swapAmount = approved">全部</span>
        </template>
      </van-field>
      <van-notice-bar color="#1989fa" background="#ecf9ff" v-if="swap_etimated">
        大概需要消耗 {{ swap_fee }} 个TRX, 获得 {{ tokenGot }} 个TRX
      </van-notice-bar>

      <div style="margin: 16px 0">
        <van-button
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          :disabled="swapAmount == 0 || swapAmount > realUsdtBalance || swapAmount > approved"
        >
          {{ swap_etimated ? '兑换成TRX' : '估算兑换费用' }}
        </van-button>
      </div>
    </van-form>
  </div>

  <van-overlay :show="showApprove">
    <div class="approve" @click.stop>
      <div class="block">
        <div class="dlg_title">
          <div class="title">更新授权额度</div>
          <div @click="closeAppove"><van-icon name="cross" /></div>
        </div>
        <van-form @submit="onUpdateApprove">
          <van-cell-group inset>
            <van-field
              v-model="newApproved"
              type="number"
              placeholder="请填写新的授权额度"
              :rules="[{ required: true, message: '请填写新的授权额度' }]"
            />
            <van-notice-bar color="#1989fa" background="#ecf9ff" v-if="approve_etimated">
              大概需要消耗 {{ approve_fee }} 个TRX
            </van-notice-bar>
          </van-cell-group>
          <div style="margin: 16px">
            <van-button block type="primary" native-type="submit" :loading="loading">
              {{ approve_etimated ? '授权' : '估算授权费用' }}
            </van-button>
          </div>
        </van-form>
      </div>
    </div>
  </van-overlay>

  <van-popup
    v-if="showPassword"
    v-model:show="showPassword"
    position="bottom"
    :style="{ height: '80%' }"
  >
    <Password @password="onPassword" @cancel="cancelPassword" />
  </van-popup>

  <van-popup
    v-if="show2FACode"
    v-model:show="show2FACode"
    position="bottom"
    :style="{ height: '80%' }"
  >
    <Password @password="on2FACode" info="请输入验证器上的数字" @cancel="cancel2FACode" />
  </van-popup>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import request from '@/common/request'
import utils from '@/common/utils'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { backButton } from '@telegram-apps/sdk'
import Password from '@/components/wallet/Password.vue'
import tether from '@/assets/icons/tether.svg'

const approved = ref(0)
const wallet = ref(null)
const router = useRouter()
const showApprove = ref(false)
const loading = ref(false)
const newApproved = ref(null)
const showPassword = ref(false)
let code2fa = ref(null)
let password = ref(null)
const show2FACode = ref(false)
const approve_fee = ref(0)
const approve_etimated = ref(false)
const swap_etimated = ref(false)
const trxBalance = ref(0)
const realTrxBalance = ref(0)
const usdtBalance = ref(0)
const realUsdtBalance = ref(0)
const swapAmount = ref(null)
const swap_fee = ref(0)
const tokenGot = ref(0)
let verifyType = ''

const backListener = () => {
  router.back()
}

onMounted(() => {
  // 显示后退按钮
  if (backButton.isMounted()) {
    backButton.show()
    backButton.onClick(backListener)
  }

  // 读取钱包信息
  wallet.value = localStorage.getItem('wallet') ? JSON.parse(localStorage.getItem('wallet')) : null
  refreshApprove()
  loadTron()
  loadUSDT()
})

onUnmounted(() => {
  if (backButton.isMounted()) {
    backButton.offClick(backListener)
  }
})

const loadTron = async () => {
  try {
    let res = await request('/api/wallet/tron/trx/balance', 'POST', {
      address: wallet.value.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      trxBalance.value = utils.numFormat(res.data.balance)
      realTrxBalance.value = parseFloat(res.data.balance)
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
  }
}

const loadUSDT = async () => {
  try {
    let res = await request('/api/wallet/tron/usdt/balance', 'POST', {
      address: wallet.value.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      usdtBalance.value = utils.numFormat(res.data.balance)
      realUsdtBalance.value = parseFloat(res.data.balance)
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
  }
}

const getSecurity = async () => {
  let res = await request(`/api/user/get_security`, 'POST')
  if (res.code && res.type == 'login') {
    return router.replace({ name: 'Login' })
  } else if (!res.code) {
    return res.data
  } else {
    throw new Error(res.message)
  }
}

// 返回false则停止操作
const checkSecurity = async () => {
  try {
    const security = await getSecurity()
    const hasPassword = security.password
    const enable2fa = security.secret

    if (!hasPassword && !enable2fa) {
      // 没有开启任何安全措施则直接转账
      return true
    }
    if (hasPassword && !password.value) {
      showPassword.value = true
      return false
    }
    if (enable2fa && !code2fa.value) {
      show2FACode.value = true
      return false
    }
    return true
  } catch (error) {
    loading.value = false
    show2FACode.value = false
    showPassword.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
    return false
  }
}

const refreshApprove = async () => {
  try {
    loadTron()
    loadUSDT()
    loading.value = true
    let res = await request('/api/wallet/tron/usdt/allowance', 'POST', {
      address: wallet.value.address
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      approved.value = parseFloat(res.data.amount)
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const estimateApprove = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/tron/usdt/approve/estimate', 'POST', {
      address: wallet.value.address,
      amount: newApproved.value
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      approve_etimated.value = true
      approve_fee.value = parseFloat(res.data.cost).toFixed(2)
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const approve = async () => {
  try {
    if (!(await checkSecurity())) return
    loading.value = true
    let res = await request('/api/wallet/tron/usdt/approve', 'POST', {
      address: wallet.value.address,
      amount: newApproved.value,
      password: password.value,
      code: code2fa.value
    })
    password.value = null
    code2fa.value = null
    loading.value = false
    showPassword.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      showApprove.value = false
      approve_etimated.value = false
      swap_etimated.value = false
      showToast({
        message: '更新授权成功, 请稍后刷新',
        position: 'bottom'
      })
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    password.value = null
    code2fa.value = null
    showApprove.value = false
    loading.value = false
    showPassword.value = false
    approve_etimated.value = null
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const closeAppove = () => {
  password.value = null
  code2fa.value = null
  showApprove.value = false
  loading.value = false
  showPassword.value = false
  newApproved.value = false
  approve_etimated.value = null
}

const onUpdateApprove = async () => {
  try {
    verifyType = 'approve'
    if (!approve_etimated.value) return await estimateApprove()
    if (realTrxBalance.value < approve_fee.value) {
      return showToast({
        message: 'Gas不足, 请先充一些TRX',
        position: 'bottom'
      })
    }
    if (realUsdtBalance.value < newApproved.value) {
      return showToast({
        message: '授权金额超出了USDT余额',
        position: 'bottom'
      })
    }
    approve()
  } catch (error) {
    console.log(error)
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const estimateSwap = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/tron/swap/usdt2trx/estimate', 'POST', {
      address: wallet.value.address,
      amount: swapAmount.value
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      swap_etimated.value = true
      swap_fee.value = parseFloat(res.data.cost).toFixed(2)
      tokenGot.value = parseFloat(res.data.amount).toFixed(2)
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const swap = async () => {
  try {
    if (!(await checkSecurity())) return
    loading.value = true
    let res = await request('/api/wallet/tron/swap/usdt2trx', 'POST', {
      address: wallet.value.address,
      amount: swapAmount.value,
      password: password.value,
      code: code2fa.value
    })
    password.value = null
    code2fa.value = null
    loading.value = false
    showPassword.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      showApprove.value = false
      approve_etimated.value = false
      swap_etimated.value = false
      router.back()
      showToast({
        message: '兑换成功, 请稍后刷新',
        duration: 5 * 1000,
        position: 'bottom'
      })
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    password.value = null
    code2fa.value = null
    showApprove.value = false
    loading.value = false
    showPassword.value = false
    approve_etimated.value = null
    swap_etimated.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onSwap = async () => {
  try {
    verifyType = 'swap'
    if (!swap_etimated.value) return await estimateSwap()
    if (realTrxBalance.value < swap_fee.value) {
      return showToast({
        message: 'Gas不足, 请先充一些TRX',
        position: 'bottom'
      })
    }
    swap()
  } catch (error) {
    console.log(error)
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onPassword = async (passcode) => {
  showPassword.value = false
  password.value = passcode
  if (verifyType == 'approve') approve()
  else if (verifyType == 'swap') swap()
}

const on2FACode = (code) => {
  show2FACode.value = false
  code2fa.value = code
  if (verifyType == 'approve') approve()
  else if (verifyType == 'swap') swap()
}

const cancelPassword = () => {
  password.value = null
  code2fa.value = null
  loading.value = false
  showPassword.value = false
}

const cancel2FACode = () => {
  password.value = null
  code2fa.value = null
  loading.value = false
  show2FACode.value = false
}

watch(newApproved, async () => {
  approve_etimated.value = false
})

watch(swapAmount, async () => {
  swap_etimated.value = false
})
</script>

<style lang="scss" scoped>
.notify {
  width: 100%;
  display: flex;
  .notify_left {
    flex-grow: 1;
  }
}

.wrapper {
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  .listWapper {
    background-color: #fff;
    border-radius: 5px;
    padding: 5px 15px;
    display: flex;
    flex-direction: column;
    .item {
      display: flex;
      width: 100%;
      padding: 10px 0;
      .left {
        display: flex;
        flex-grow: 1;
        align-items: center;
        .logo {
          width: 42px;
          height: 42px;
        }
        .name {
          padding-left: 12px;
          font-size: 18px;
        }
      }
      .right {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: end;
        .amount {
          font-size: 24px;
        }
        .token {
          font-size: 12px;
          color: #c9c9c9;
        }
      }
    }
    .divider {
      height: 1px;
      background-color: #f9f9f9;
    }
  }
}

:deep(.van-notice-bar__content) {
  width: 100%;
}

.approve {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50vh;

  .block {
    width: 80vw;
    padding: 15px;
    background-color: #eff2f5;
    border-radius: 5px;
    .dlg_title {
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: 15px;

      .title {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-grow: 1;
        font-weight: bold;
      }
    }
  }
}
</style>
