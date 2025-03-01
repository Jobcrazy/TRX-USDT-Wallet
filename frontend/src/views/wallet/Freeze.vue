<template>
  <van-notice-bar left-icon="info-o" color="#1989fa" background="#ecf9ff">
    质押可赚带宽/能量抵交易费, 解押需3天到账
  </van-notice-bar>

  <div class="wrapper">
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field
          v-model="stakeTypeText"
          is-link
          readonly
          name="picker"
          label="操作"
          placeholder="请选择操作"
          @click="showStakePicker = true"
          :rules="[{ required: true, message: '请选择操作' }]"
          :disabled="loading"
        >
          <template #button>
            <span v-if="stakeType.length && purposeType.length && !loading">
              余额: {{ balance }}
            </span>
          </template>
        </van-field>
        <van-field
          v-model="purposeTypeText"
          is-link
          readonly
          name="picker"
          label="类型"
          placeholder="请选择类型"
          @click="showPurposePicker = true"
          :rules="[{ required: true, message: '请选择操作' }]"
          :disabled="loading"
        />
        <van-field
          v-model="amount"
          type="number"
          label="数量"
          placeholder="请输入代币数量"
          :rules="[{ required: true, message: '请输入代币数量' }]"
          :disabled="loading"
        >
          <template #button>
            <span @click="amount = balanceAmount / 10 ** 6" v-if="balance">全部</span>
          </template>
        </van-field>
      </van-cell-group>

      <div style="margin: 16px" v-if="estimated">
        <van-notice-bar color="#1989fa" background="#ecf9ff">
          预计消耗 {{ fee }} 个TRX,
          {{ stakeType[0].value == 'freeze' ? '获得' : '失去' }}
          {{ benifit }} 个 {{ purposeType[0].value == 'ENERGY' ? '能量' : '带宽' }}
          (可抵扣
          {{ deduct }} 个TRX的{{ purposeType[0].value == 'ENERGY' ? '智能合约' : '普通' }}交易费用)
        </van-notice-bar>
      </div>

      <div style="margin: 16px">
        <van-button
          block
          type="primary"
          native-type="submit"
          :loading="loading"
          :disabled="
            loading || balance == 0 || amount == 0 || parseFloat(amount) > balanceAmount / 10 ** 6
          "
        >
          {{ estimated ? '提交请求' : '估算费用' }}
        </van-button>
      </div>
    </van-form>
  </div>

  <van-popup :show="showStakePicker && !loading" destroy-on-close position="bottom">
    <van-picker
      :columns="stakeColumns"
      @confirm="onStakeConfirm"
      @cancel="showStakePicker = false"
      destroy-on-close
    />
  </van-popup>

  <van-popup :show="showPurposePicker && !loading" destroy-on-close position="bottom">
    <van-picker
      :columns="purposeColumns"
      :model-value="purposeType"
      @confirm="onPurposeConfirm"
      @cancel="showPurposePicker = false"
      destroy-on-close
    />
  </van-popup>

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
import { backButton } from '@telegram-apps/sdk'
import { showToast } from 'vant'
import request from '@/common/request'
import utils from '@/common/utils'
import Password from '@/components/wallet/Password.vue'

const router = useRouter()
const wallet = ref(null)
const showStakePicker = ref(false)
const showPurposePicker = ref(false)
const stakeType = ref([])
const stakeTypeText = ref('')
const purposeType = ref([])
const purposeTypeText = ref('')
const amount = ref(undefined)
const loading = ref(false)
const balance = ref(0)
let balanceAmount = 0
const estimated = ref(false)
const fee = ref(0)
let trxBalance = 0
const showPassword = ref(false)
let code2fa = ref(null)
let password = ref(null)
const show2FACode = ref(false)
const benifit = ref(0)
const deduct = ref(0)

const stakeColumns = ref([
  { text: '质押', value: 'freeze' },
  { text: '解押', value: 'unfreeze' }
])
const purposeColumns = ref([
  { text: '带宽', value: 'BANDWIDTH' },
  { text: '能量', value: 'ENERGY' }
])

const backListener = () => {
  router.back()
}

const onStakeConfirm = ({ selectedOptions }) => {
  showStakePicker.value = false
  stakeType.value = selectedOptions
  stakeTypeText.value = selectedOptions[0].text
}

const onPurposeConfirm = ({ selectedOptions }) => {
  showPurposePicker.value = false
  purposeType.value = selectedOptions
  purposeTypeText.value = selectedOptions[0].text
}

onMounted(async () => {
  try {
    // 读取钱包信息
    wallet.value = localStorage.getItem('wallet')
      ? JSON.parse(localStorage.getItem('wallet'))
      : null
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
    let res = await request(`/api/wallet/tron/stake/estimate`, 'POST', {
      type: stakeType.value[0].value,
      purpose: purposeType.value[0].value,
      address: wallet.value.address,
      amount: amount.value
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      estimated.value = true
      fee.value = res.data.cost
      benifit.value = res.data.benifit
      deduct.value = res.data.deduct
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

const stake = async () => {
  try {
    if (!(await checkSecurity())) return
    let realAmount = parseFloat(amount.value)
    loading.value = true
    if (realAmount + parseFloat(fee.value) > balance.value)
      realAmount -= realAmount + parseFloat(fee.value) - balance.value
    let res = await request(`/api/wallet/tron/stake/stake`, 'POST', {
      type: stakeType.value[0].value,
      purpose: purposeType.value[0].value,
      address: wallet.value.address,
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
      router.back()
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
    if (!estimated.value) {
      return estimate()
    }

    if (fee.value == 0) {
      return stake()
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
      if (parseFloat(fee.value) > trxBalance) {
        return showToast({
          message: 'Gas不足, 请先充入更多TRX',
          position: 'bottom'
        })
      }
      return stake()
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
      balanceAmount = res.data.balance * 10 ** 6
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

const onPassword = async (passcode) => {
  showPassword.value = false
  password.value = passcode
  stake()
}

const on2FACode = (code) => {
  show2FACode.value = false
  code2fa.value = code
  stake()
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

const refreshBalance = async () => {
  if (!stakeType.value.length || !purposeType.value.length) return
  if (stakeType.value[0].value == 'freeze') loadTron()
  else loadStaked(purposeType.value[0].value)
}

const loadStaked = async (type) => {
  try {
    let res = await request('/api/wallet/tron/account', 'POST', {
      address: wallet.value.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      if (!res.data.frozenV2) return
      for (let index = 0; index < res.data.frozenV2.length; index++) {
        const staked = res.data.frozenV2[index]
        if ((!staked.type || staked.type == '') && type == 'BANDWIDTH') {
          balance.value = utils.numFormat(staked.amount / 10 ** 6)
          balanceAmount = staked.amount
          return
        } else if (staked.type == 'ENERGY' && type == 'ENERGY') {
          balance.value = utils.numFormat(staked.amount / 10 ** 6)
          balanceAmount = staked.amount
          return
        }
      }
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

watch(stakeType, async () => {
  estimated.value = false
  refreshBalance()
})

watch(purposeType, async () => {
  estimated.value = false
  refreshBalance()
})

watch(amount, async () => {
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
