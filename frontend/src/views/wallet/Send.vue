<template>
  <div class="wrapper">
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="subtypeTxt"
          is-link
          readonly
          name="picker"
          label="代币"
          placeholder="请选择代币代币类型"
          @click="showPicker = true"
          :rules="[{ required: true, message: '请选择代币代币类型' }]"
          :disabled="loading"
        >
          <template #button>
            <span v-if="subtype">余额: {{ balance }}</span>
          </template>
        </van-field>
        <van-popup :show="showPicker && !loading" destroy-on-close position="bottom">
          <van-picker
            :columns="columns"
            :model-value="selectedType"
            @confirm="onSelectConfirm"
            @cancel="showPicker = false"
            destroy-on-close
          />
        </van-popup>
        <van-field
          v-model="amount"
          type="number"
          label="数量"
          placeholder="请输入代币数量"
          :rules="[{ required: true, message: '请输入代币数量' }]"
          :disabled="loading"
        >
          <template #button>
            <span @click="amount = balanceAmount">全部</span>
          </template>
        </van-field>
        <van-field
          v-model="address_to"
          rows="3"
          label="地址"
          type="textarea"
          placeholder="请输入地址或扫描二维码"
          show-word-limit
          maxlength="34"
          :rules="[{ required: true, message: '请输入地址或扫描二维码' }]"
          :disabled="loading"
        >
          <template #button>
            <van-icon name="qr" size="24" color="#1989fa" @click="scanQRCode" />
          </template>
        </van-field>
      </van-cell-group>

      <div style="margin: 16px" v-if="estimated">
        <van-notice-bar color="#1989fa" background="#ecf9ff" left-icon="info-o">
          这次转账需要消耗大概 {{ fee }} 个TRX
        </van-notice-bar>
      </div>

      <div style="margin: 16px">
        <van-button
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          :disabled="loading || balance == 0"
        >
          {{ estimated ? '提交转账请求' : '估算转账费用' }}
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
import { useRouter } from 'vue-router'
import { backButton, qrScanner } from '@telegram-apps/sdk'
import { showToast } from 'vant'
import { TronWeb } from 'tronweb'
import request from '@/common/request'
import utils from '@/common/utils'
import Password from '@/components/wallet/Password.vue'

const router = useRouter()
const wallet = ref(null)
const showPicker = ref(false)
let subtype = ref(null)
const subtypeTxt = ref('')
const address_to = ref('')
const selectedType = ref([])
const amount = ref(undefined)
const loading = ref(false)
const balance = ref(0)
let balanceAmount = 0
const estimated = ref(false)
const fee = ref(0)
let trxBalance = 0
const showPassword = ref(false)
const localToken = ref(null)
let code2fa = ref(null)
let password = ref(null)
const show2FACode = ref(false)

const columns = ref([
  { text: 'TRX', value: 'trx' },
  { text: 'USDT', value: 'usdt' }
])

const backListener = () => {
  router.back()
}

const onSelectConfirm = ({ selectedOptions }) => {
  showPicker.value = false
  subtype.value = selectedOptions[0].value
  subtypeTxt.value = selectedOptions[0].text

  // 获取余额
  if (subtype.value == 'trx') loadTron()
  if (subtype.value == 'usdt') loadUSDT()
}

onMounted(async () => {
  try {
    // 读取钱包信息
    wallet.value = localStorage.getItem('wallet')
      ? JSON.parse(localStorage.getItem('wallet'))
      : null
    localToken.value = localStorage.getItem('token') ? localStorage.getItem('token') : null
    if (backButton.isMounted()) {
      backButton.onClick(backListener)
    }
  } catch (error) {
    console.log(error)
  }
})

onUnmounted(() => {
  try {
    if (backButton.isMounted()) {
      backButton.offClick(backListener)
    }
  } catch (error) {
    console.log(error)
  }
})

const estimate = async () => {
  try {
    loading.value = true
    let res = await request(`/api/wallet/tron/${subtype.value}/estimate`, 'POST', {
      from: wallet.value.address,
      to: address_to.value,
      amount: amount.value
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      estimated.value = true
      fee.value = res.data.cost
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
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

// 返回false则停止支付
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

const transfer = async () => {
  try {
    if (!(await checkSecurity())) return
    let realAmount = parseFloat(amount.value)
    loading.value = true
    if (subtype.value == 'trx') {
      if (realAmount + parseFloat(fee.value) > balance.value)
        realAmount -= realAmount + parseFloat(fee.value) - balance.value
    }
    let res = await request(`/api/wallet/tron/${subtype.value}/transfer`, 'POST', {
      from: wallet.value.address,
      to: address_to.value,
      amount: realAmount,
      password: password.value,
      code: code2fa.value
    })
    password.value = null
    code2fa.value = null
    if (res.code && res.type == 'login') {
      loading.value = false
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      loading.value = false
      enterHistory(subtype.value)
    } else {
      loading.value = false
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    password.value = null
    code2fa.value = null
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const enterHistory = (subtype) => {
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
  })
  wallet.value.trxAddr = tronWeb.address.toHex(wallet.value.address)
  wallet.value.subtype = subtype
  wallet.value.balance = balance
  localStorage.setItem('wallet', JSON.stringify(wallet.value))
  switch (subtype) {
    case 'trx':
      router.replace({ name: 'TRX' })
      break
    case 'usdt':
      router.replace({ name: 'USDT' })
      break
    default:
      break
  }
}

const onSubmit = async () => {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    })
    if (!tronWeb.isAddress(address_to.value)) return showToast('不是正确的Tron网络地址')
    if (parseFloat(amount.value) > parseFloat(balanceAmount)) return showToast('余额不足')

    if (!estimated.value) {
      return estimate()
    }

    if (fee.value == 0) {
      return transfer()
    }

    loading.value = true
    let res = await request('/api/wallet/tron/trx/balance', 'POST', {
      address: wallet.value.address
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      trxBalance = parseFloat(res.data.balance)
      if (subtype.value == 'trx') {
        trxBalance -= parseFloat(fee.value)
      }
      if (parseFloat(fee.value) > trxBalance) {
        return showToast({
          message: 'Gas不足, 请先充入更多TRX',
          position: 'bottom'
        })
      }
      return transfer()
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const scanQRCode = async () => {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    })
    if (backButton.isMounted() && qrScanner.open.isSupported()) {
      qrScanner.isOpened() // false
      await qrScanner.open({
        text: '扫描Tron/TRC20地址',
        onCaptured(qr) {
          if (tronWeb.isAddress(qr)) {
            address_to.value = qr
            qrScanner.close()
          }
        }
      })
    }
  } catch (error) {
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const loadTron = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/tron/trx/balance', 'POST', {
      address: wallet.value.address
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      balance.value = utils.numFormat(res.data.balance)
      balanceAmount = res.data.balance
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
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
      balance.value = utils.numFormat(res.data.balance)
      balanceAmount = res.data.balance
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

const onPassword = async (passcode) => {
  showPassword.value = false
  password.value = passcode
  transfer()
}

const on2FACode = (code) => {
  show2FACode.value = false
  code2fa.value = code
  transfer()
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

watch(subtype, async () => {
  estimated.value = false
})

watch(amount, async () => {
  estimated.value = false
})

watch(address_to, async () => {
  estimated.value = false
})
</script>

<style lang="scss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  padding: 30px 0px 10px 0px;
  justify-content: center;
  align-items: center;
}

:deep(.van-password-input__security) {
  width: 80vw !important;
}
</style>
