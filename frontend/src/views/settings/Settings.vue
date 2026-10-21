<template>
  <div class="wrapper">
    <van-cell-group title="安全设置">
      <van-cell title="指纹/面容登录" label="登录时验证本机指纹或面容" v-if="showBiometric">
        <template #right-icon>
          <van-switch v-model="enableBio" :loading="loading" @change="onBiometric" />
        </template>
      </van-cell>
      <van-cell title="支付密码" label="付款时验证支付密码" is-link @click="onSetPassword" />
      <van-cell title="双因素验证支付" label="付款时验证Google或微软验证器生成的动态密码">
        <template #right-icon>
          <van-switch v-model="enable2fa" :loading="loading2fa" @change="on2FA" />
        </template>
      </van-cell>
      <!-- <van-cell
        title="导出助记词"
        label="用于恢复或迁移钱包, 丢失将导致资产损失"
        is-link
        @click="onMnemonic"
      /> -->
    </van-cell-group>

    <van-cell-group title="钱包">
      <van-cell
        title="重置钱包"
        label="用新的助记词重置钱包, 重置前请备份老助记词"
        is-link
        @click="showResetDlg"
      />
    </van-cell-group>

    <van-cell-group title="关于妙蛙钱包">
      <van-cell>
        <template #title>
          <span class="custom-title">
            <span style="font-weight: bold">妙蛙钱包</span>
            是一款Telegram小程序。它由知名Web3团队打造，帮助您更加安全、方便地管理加密资产。
          </span>
        </template>
      </van-cell>
    </van-cell-group>
  </div>

  <van-action-sheet
    v-model:show="show"
    :actions="actions"
    cancel-text="取消"
    close-on-click-action
    @select="onPwAction"
  />

  <van-action-sheet
    v-model:show="showReset"
    :actions="resetActions"
    cancel-text="取消"
    close-on-click-action
    @select="onResetAction"
  />

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
    <Password
      @password="onUnBind"
      info="请输入验证器上的数字"
      @cancel="cancel2FACode"
      :loading="loading2fa"
    />
  </van-popup>
</template>

<script setup>
import { showToast } from 'vant'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { biometry, backButton } from '@telegram-apps/sdk'
import Password from '@/components/wallet/Password.vue'
import request from '@/common/request'
import { getToken, setToken } from '@/common/session'
import { setPending2FA } from '@/common/pending-2fa'

const router = useRouter()
const user = ref(null)
const showBiometric = ref(false)
const enableBio = ref(false)
const show = ref(false)
const hasPassword = ref(false)
const loading = ref(false)
const showPassword = ref(false)
const enable2fa = ref(false)
const loading2fa = ref(false)
const show2FACode = ref(false)
const actions = [
  { name: '更改密码', val: 'modify' },
  { name: '禁用密码', val: 'remove', color: '#ee0a24' }
]
const showReset = ref(false)
const resetActions = [{ name: '用"新的助记词"重建钱包', val: 'reset', color: '#ee0a24' }]
let passwordAction = null

const backListener = () => {
  router.back()
}

const cancelPassword = () => {
  showPassword.value = false
  if (loading.value) {
    loading.value = false
    enableBio.value = !enableBio.value
  }
}

const cancel2FACode = () => {
  loading2fa.value = show2FACode.value = false
  enable2fa.value = !enable2fa.value
}

function isMobileOS() {
  const userAgent = navigator.userAgent
  // 判断是否为 Android 系统
  if (/Android/i.test(userAgent)) {
    return true
  }
  // 判断是否为 iOS 系统
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return true
  }
  return false
}

onMounted(async () => {
  try {
    enable2fa.value = localStorage.getItem('enable2fa')
      ? localStorage.getItem('enable2fa') == 'true'
      : false
    hasPassword.value = localStorage.getItem('hasPassword')
      ? localStorage.getItem('hasPassword') == 'true'
      : false
    user.value = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
    if (user.value && user.value.id) {
      enableBio.value = localStorage.getItem(`${user.value.id}:biometric`)
        ? localStorage.getItem(`${user.value.id}:biometric`) == 'true'
        : false
    }
    showBiometric.value = isMobileOS()
    if (backButton.isMounted()) {
      backButton.onClick(backListener)
      backButton.show()
    }
    if (biometry.isSupported()) {
      await biometry.mount()
    }
  } catch (error) {
    console.log(error)
  }
})

onUnmounted(async () => {
  try {
    if (backButton.isMounted()) {
      backButton.offClick(backListener)
    }
    if (biometry.isMounted()) biometry.unmount()
  } catch (error) {
    console.log(error)
  }
})

const onSetPassword = () => {
  if (loading.value) return
  if (!hasPassword.value) {
    localStorage.setItem('passwordType', 'new')
    router.push({ name: 'Password' })
  } else {
    show.value = true
  }
}

const onPwAction = (action) => {
  localStorage.setItem('passwordType', action.val)
  router.push({ name: 'Password' })
}

const showResetDlg = () => {
  if (!hasPassword.value) {
    return showToast({
      message: '请先设置支付密码',
      position: 'bottom'
    })
  }
  showReset.value = true
}

const onResetAction = (action) => {
  if (action.val == 'reset') {
    passwordAction = 'reset'
    showPassword.value = true
  }
}

/*
const onMnemonic = () => {
  if (!hasPassword.value) {
    return showToast({
      message: '请先设置支付密码',
      position: 'bottom'
    })
  }
  router.push({ name: 'Mnemonic' })
}
*/

const on2FA = async () => {
  try {
    loading2fa.value = true
    if (enable2fa.value == true) {
      // 开启2FA
      let res = await request('/api/user/get_2fa', 'POST', {})
      loading2fa.value = false
      if (res.code && res.type == 'login') {
        return router.replace({ name: 'Login' })
      } else if (!res.code) {
        // 跳转到绑定页面
        setPending2FA(res.data.otpauthUrl)
        router.push({ name: 'Enable2FA' })
        return
      } else {
        if (res.type == '2fa_bind') {
          // 已经开启过了
          return
        }
        showToast({
          message: res.message,
          position: 'bottom'
        })
        enable2fa.value = !enable2fa.value
      }
    } else {
      // 关闭2FA
      show2FACode.value = true
    }
  } catch (error) {
    console.log(error)
    enable2fa.value = !enable2fa.value
    loading2fa.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onUnBind = async (code) => {
  try {
    show2FACode.value = false
    let res = await request('/api/user/disable_2fa', 'POST', {
      code
    })
    loading2fa.value = false
    if (res.code && res.type == 'login') {
      loading.value = false
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      loading.value = false
      showToast({
        message: '成功关闭双因素验证',
        position: 'bottom'
      })
      localStorage.setItem('enable2fa', false)
      enable2fa.value = false
    } else {
      enable2fa.value = !enable2fa.value
      if (res.type == '2fa_secret') {
        showToast({
          message: '验证码错误输入错误',
          position: 'bottom'
        })
        return
      }
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
    loading.value = false
  } catch (error) {
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onBiometric = async () => {
  try {
    loading.value = true
    if (!getToken() || !user.value) {
      loading.value = false
      return showToast({
        message: '登录信息异常',
        position: 'bottom'
      })
    }
    if (!hasPassword.value) {
      loading.value = false
      enableBio.value = false
      return showToast({
        message: '请先设置支付密码',
        position: 'bottom'
      })
    }
    if (enableBio.value && !biometry.isSupported()) {
      loading.value = false
      showToast({
        message: '当前设备没有生物识别功能',
        position: 'bottom'
      })
      enableBio.value = false
      return
    }
    if (enableBio.value) {
      // 开启生物识别
      if (!(await biometry.requestAccess())) {
        // 没有权限
        loading.value = false
        enableBio.value = false
        biometry.openSettings()
        return
      }
      passwordAction = 'bio'
      showPassword.value = true
    } else {
      // 关闭生物识别
      passwordAction = 'bio'
      showPassword.value = true
    }
  } catch (error) {
    console.log(error)
    enableBio.value = false
    loading.value = false
    showToast({
      message: '当前设备不支持生物识别功能',
      position: 'bottom'
    })
  }
}

const onPassword = async (password) => {
  try {
    showPassword.value = false
    if (passwordAction == 'bio') {
      let saved = {}
      if (biometry.isSupported()) {
        try {
          const { status, token } = await biometry.authenticate({ reason: '管理生物识别凭据' })
          if (enableBio.value && status !== 'authorized') throw new Error('生物识别验证未完成')
          if (status === 'authorized' && token) saved = JSON.parse(token)
        } catch (error) {
          if (enableBio.value) throw error
        }
      }
      // 旧版本保存过 API token，只保留新格式的设备凭据。
      saved = Object.fromEntries(Object.entries(saved).filter(([, entry]) => entry?.secret))
      const action = enableBio.value ? 'enable' : 'disable'
      const res = await request(`/api/user/biometric/${action}`, 'POST', { password })
      if (res.code) throw new Error(res.message)
      setToken(res.data.token)
      if (enableBio.value) saved[user.value.id] = { secret: res.data.secret }
      else delete saved[user.value.id]
      if (biometry.isSupported()) {
        try {
          const updateStatus = await biometry.updateToken({
            reason: enableBio.value ? '开启指纹/面容登录' : '关闭指纹/面容登录',
            token: Object.keys(saved).length ? JSON.stringify(saved) : ''
          })
          if (
            updateStatus !==
            (enableBio.value ? 'updated' : Object.keys(saved).length ? 'updated' : 'removed')
          )
            throw new Error('生物识别凭据未保存')
        } catch (error) {
          if (enableBio.value) {
            const rollback = await request('/api/user/biometric/disable', 'POST', { password })
            if (!rollback.code) setToken(rollback.data.token)
            throw error
          }
          showToast('登录验证已关闭，但本机凭据清理失败')
        }
      }
      localStorage.setItem(`${user.value.id}:biometric`, enableBio.value)
      loading.value = false
    } else if (passwordAction == 'reset') {
      let res = await request('/api/wallet/reset', 'POST', {
        password: password
      })
      if (res.code && res.type == 'login') {
        loading.value = false
        return router.replace({ name: 'Login' })
      } else if (!res.code) {
        loading.value = false
        return router.replace({ name: 'Login' })
      } else {
        showToast({
          message: res.message,
          position: 'bottom'
        })
      }
      loading.value = false
    }
  } catch (error) {
    loading.value = false
    if (passwordAction == 'bio') enableBio.value = !enableBio.value
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}
</script>

<style scoped lang="scss">
.wrapper {
  padding: 20px 0;
}
</style>
