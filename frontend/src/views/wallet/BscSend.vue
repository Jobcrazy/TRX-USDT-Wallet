<template>
  <div class="wrapper">
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="subtypeTxt"
          is-link
          readonly
          name="picker"
          :label="$t('transfer.token')"
          :placeholder="$t('transfer.selectToken')"
          @click="showPicker = true"
          :rules="[{ required: true, message: $t('transfer.selectToken') }]"
          :disabled="loading"
        >
          <template #button>
            <span v-if="subtype">{{ $t('common.balance') }} {{ balance }}</span>
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
          :label="$t('common.amount')"
          :placeholder="$t('common.enterAmount')"
          :rules="[{ required: true, message: $t('common.enterAmount') }]"
          :disabled="loading"
        >
          <template #button>
            <span @click="amount = balanceAmount">{{ $t('common.all') }}</span>
          </template>
        </van-field>
        <van-field
          v-model="address_to"
          rows="3"
          :label="$t('transfer.address')"
          type="textarea"
          :placeholder="$t('transfer.enterAddress')"
          show-word-limit
          maxlength="42"
          :rules="[{ required: true, message: $t('transfer.enterAddress') }]"
          :disabled="loading"
        >
          <template #button>
            <van-icon name="qr" size="24" color="#1989fa" @click="scanQRCode" />
          </template>
        </van-field>
      </van-cell-group>

      <div style="margin: 16px" v-if="estimated">
        <van-notice-bar color="#1989fa" background="#ecf9ff" left-icon="info-o">
          {{ $t('transfer.bscFeeEstimate', { fee }) }}
        </van-notice-bar>
      </div>

      <div style="margin: 16px">
        <van-button
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          :disabled="loading || emptyBalance"
        >
          {{ estimated ? $t('transfer.submitTransfer') : $t('transfer.estimateFee') }}
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
    <Password @password="on2FACode" :info="$t('common.enterOtp')" @cancel="cancel2FACode" />
  </van-popup>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Decimal from 'decimal.js'

import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { backButton, qrScanner } from '@telegram-apps/sdk'
import { showToast } from 'vant'
import request from '@/common/request'
import utils from '@/common/utils'
import Password from '@/components/wallet/Password.vue'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const wallet = ref(null)
const showPicker = ref(false)
let subtype = ref(null)
const subtypeTxt = ref('')
const address_to = ref('')
const selectedType = ref([])
const amount = ref(undefined)
const loading = ref(false)
const balance = ref('0.000000')
const emptyBalance = ref(true)
let balanceAmount = 0
const estimated = ref(false)
const fee = ref(0)
const decimals = ref(18)
const showPassword = ref(false)
let code2fa = ref(null)
let password = ref(null)
const show2FACode = ref(false)

const columns = ref([
  { text: 'BNB', value: 'bnb' },
  { text: 'USDT', value: 'usdt' },
  { text: 'INTCB', value: 'intcb' },
  { text: 'NVDAB', value: 'nvdab' }
])

const backListener = () => {
  router.back()
}

const onSelectConfirm = ({ selectedOptions }) => {
  showPicker.value = false
  subtype.value = selectedOptions[0].value
  selectedType.value = [subtype.value]
  subtypeTxt.value = selectedOptions[0].text
  balance.value = '0.000000'
  emptyBalance.value = true
  balanceAmount = 0
  amount.value = undefined
  decimals.value = 18
  estimated.value = false

  // Get the balance
  if (subtype.value == 'bnb') loadBnb()
  else loadToken(subtype.value)
}

onMounted(async () => {
  try {
    // Load wallet information
    wallet.value = localStorage.getItem('wallet')
      ? JSON.parse(localStorage.getItem('wallet'))
      : null
    if (wallet.value?.blockchain !== 'bsc') return router.replace({ name: 'Home' })
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
    let res = await request(`/api/wallet/bsc/${subtype.value}/estimate`, 'POST', {
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

// Return false to stop the payment
const checkSecurity = async () => {
  try {
    const security = await getSecurity()
    const hasPassword = security.password
    const enable2fa = security.secret

    if (!hasPassword && !enable2fa) {
      // Proceed when no payment protection is enabled
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
    loading.value = true
    let res = await request(`/api/wallet/bsc/${subtype.value}/transfer`, 'POST', {
      from: wallet.value.address,
      to: address_to.value,
      amount: amount.value,
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
      showToast({ message: t('transfer.submitted'), position: 'bottom' })
      router.replace({ name: 'Wallet' })
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

const onSubmit = async () => {
  try {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address_to.value))
      return showToast(t('transfer.invalidBscAddress'))
    const value = new Decimal(amount.value || 0)
    if (!value.isFinite() || !value.gt(0) || value.decimalPlaces() > decimals.value)
      return showToast(t('common.positiveAmount'))
    if (value.gt(new Decimal(balanceAmount))) return showToast(t('common.insufficientBalance'))
    if (!estimated.value) return estimate()
    return transfer()
  } catch (error) {
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const scanQRCode = async () => {
  try {
    if (backButton.isMounted() && qrScanner.open.isSupported()) {
      qrScanner.isOpened() // false
      await qrScanner.open({
        text: t('transfer.scanBscAddress'),
        onCaptured(qr) {
          if (/^0x[a-fA-F0-9]{40}$/.test(qr)) {
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

const loadBnb = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/bsc/bnb/balance', 'POST', {
      address: wallet.value.address
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      if (subtype.value !== 'bnb') return
      balance.value = utils.fixedFormat(res.data.balance, 6)
      balanceAmount = res.data.balance
      emptyBalance.value = new Decimal(res.data.balance).isZero()
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

const loadToken = async (token) => {
  try {
    loading.value = true
    let res = await request(`/api/wallet/bsc/${token}/balance`, 'POST', {
      address: wallet.value.address
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      if (subtype.value !== token) return
      balance.value = utils.fixedFormat(res.data.balance, 6)
      balanceAmount = res.data.balance
      decimals.value = res.data.decimals ?? 18
      emptyBalance.value = new Decimal(res.data.balance).isZero()
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    showToast({ message: error.message, position: 'bottom' })
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
