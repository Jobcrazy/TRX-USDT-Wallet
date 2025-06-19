<template>
  <div class="wrapper">
    <van-row class="listWapper">
      <div class="item">
        <div class="left">
          <van-image :src="tron" class="logo">
            <template #error>加载失败</template>
          </van-image>
          <div class="name">{{ 'Tron' }}</div>
        </div>
        <div class="right">
          <div class="amount">{{ trxBalance }}</div>
          <div class="token">TRX</div>
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
        placeholder="请输入要兑换的TRX数量"
        :rules="[{ required: true, message: '请输入要兑换的USDT数量' }]"
      >
        <template #button>
          <span @click="swapAmount = realTrxBalance">全部</span>
        </template>
      </van-field>
      <van-notice-bar color="#1989fa" background="#ecf9ff" v-if="swap_etimated">
        大概需要消耗 {{ swap_fee }} 个TRX, 获得 {{ tokenGot }} 个USDT
      </van-notice-bar>

      <div style="margin: 16px 0">
        <van-button
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          :disabled="swapAmount == 0 || swapAmount > realTrxBalance"
        >
          {{ swap_etimated ? '兑换成USDT' : '估算兑换费用' }}
        </van-button>
      </div>
    </van-form>
  </div>

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
import tron from '@/assets/icons/tron.svg'

const wallet = ref(null)
const router = useRouter()
const loading = ref(false)
const showPassword = ref(false)
let code2fa = ref(null)
let password = ref(null)
const show2FACode = ref(false)
const swap_etimated = ref(false)
const trxBalance = ref(0)
const realTrxBalance = ref(0)
const swapAmount = ref(null)
const swap_fee = ref(0)
const tokenGot = ref(0)

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
  loadTron()
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

const estimateSwap = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/tron/swap/trx2usdt/estimate', 'POST', {
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
    let realAmount = parseFloat(swapAmount.value)
    if (realAmount + parseFloat(swap_fee.value) > realTrxBalance.value)
      realAmount -= realAmount + parseFloat(swap_fee.value) - realTrxBalance.value
    let res = await request('/api/wallet/tron/swap/trx2usdt', 'POST', {
      address: wallet.value.address,
      amount: realAmount,
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
    loading.value = false
    showPassword.value = false
    swap_etimated.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onSwap = async () => {
  try {
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
  swap()
}

const on2FACode = (code) => {
  show2FACode.value = false
  code2fa.value = code
  swap()
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
</style>
