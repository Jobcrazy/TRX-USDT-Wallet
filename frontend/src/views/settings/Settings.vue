<template>
  <div class="wrapper">
    <van-cell-group :title="$t('security.securitySettings')">
      <van-cell
        :title="$t('security.bioLogin')"
        :label="$t('security.bioHint')"
        v-if="showBiometric"
      >
        <template #right-icon>
          <van-switch v-model="enableBio" :loading="loading" @change="onBiometric" />
        </template>
      </van-cell>
      <van-cell
        :title="$t('security.payPwd')"
        :label="$t('security.payPwdHint')"
        is-link
        @click="onSetPassword"
      />
      <van-cell :title="$t('security.otpPayment')" :label="$t('security.otpHint')">
        <template #right-icon>
          <van-switch v-model="enable2fa" :loading="loading2fa" @change="on2FA" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group :title="$t('security.wallet')">
      <van-cell
        :title="$t('security.resetWallet')"
        :label="$t('security.resetHint')"
        is-link
        @click="showResetDlg"
      />
    </van-cell-group>

    <van-cell-group :title="$t('security.about')">
      <van-cell>
        <template #title>
          <span class="custom-title">
            <span style="font-weight: bold">{{ $t('common.miaowaWallet') }}</span>
            {{ $t('security.aboutText') }}
          </span>
        </template>
      </van-cell>
    </van-cell-group>
  </div>

  <van-action-sheet
    v-model:show="show"
    :actions="actions"
    :cancel-text="$t('common.cancel')"
    close-on-click-action
    @select="onPwAction"
  />

  <van-action-sheet
    v-model:show="showReset"
    :actions="resetActions"
    :cancel-text="$t('common.cancel')"
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
      :info="$t('common.enterOtp')"
      @cancel="cancel2FACode"
      :loading="loading2fa"
    />
  </van-popup>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { showToast } from 'vant'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { biometry, backButton } from '@telegram-apps/sdk'
import Password from '@/components/wallet/Password.vue'
import request from '@/common/request'
import { getToken, setToken } from '@/common/session'
import { setPending2FA } from '@/common/pending-2fa'

const { t } = useI18n({ useScope: 'global' })

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
  { name: t('security.changePassword'), val: 'modify' },
  { name: t('security.disablePassword'), val: 'remove', color: '#ee0a24' }
]
const showReset = ref(false)
const resetActions = [{ name: t('security.newPhraseReset'), val: 'reset', color: '#ee0a24' }]
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
  if (/Android/i.test(userAgent)) return true
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true
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
    if (showBiometric.value && biometry.isSupported()) {
      try {
        await biometry.mount()
      } catch (error) {
        console.log(error)
      }
    }
    try {
      const security = await request('/api/user/get_security', 'POST')
      if (!security.code) {
        hasPassword.value = security.data.password
        enable2fa.value = security.data.secret
        enableBio.value = security.data.biometricEnabled
      }
    } catch (error) {
      console.log(error)
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
      message: t('security.setPayPwdFirst'),
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

const on2FA = async () => {
  try {
    loading2fa.value = true
    if (enable2fa.value == true) {
      // Enable 2FA
      let res = await request('/api/user/get_2fa', 'POST', {})
      loading2fa.value = false
      if (res.code && res.type == 'login') {
        return router.replace({ name: 'Login' })
      } else if (!res.code) {
        // Open the setup page
        setPending2FA(res.data.otpauthUrl)
        router.push({ name: 'Enable2FA' })
        return
      } else {
        if (res.type == '2fa_bind') {
          // Already enabled
          return
        }
        showToast({
          message: res.message,
          position: 'bottom'
        })
        enable2fa.value = !enable2fa.value
      }
    } else {
      // Disable 2FA
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
        message: t('security.otpDisabled'),
        position: 'bottom'
      })
      localStorage.setItem('enable2fa', false)
      enable2fa.value = false
    } else {
      enable2fa.value = !enable2fa.value
      if (res.type == '2fa_secret') {
        showToast({
          message: t('security.badOtp'),
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
        message: t('security.invalidSession'),
        position: 'bottom'
      })
    }
    if (!hasPassword.value) {
      loading.value = false
      enableBio.value = false
      return showToast({
        message: t('security.setPayPwdFirst'),
        position: 'bottom'
      })
    }
    if (enableBio.value && !biometry.isSupported()) {
      loading.value = false
      enableBio.value = false
      showToast({ message: t('security.bioUnsupported'), position: 'bottom' })
      return
    }
    if (enableBio.value) {
      if (!(await biometry.requestAccess())) {
        loading.value = false
        enableBio.value = false
        showToast({ message: t('security.allowBio'), position: 'bottom' })
        biometry.openSettings()
        return
      }
      passwordAction = 'bio'
      showPassword.value = true
    } else {
      // Disable biometric login
      passwordAction = 'bio'
      showPassword.value = true
    }
  } catch (error) {
    console.log(error)
    enableBio.value = false
    loading.value = false
    showToast({
      message: t('security.bioEnableFailed'),
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
          const { status, token } = await biometry.authenticate({ reason: t('security.manageBio') })
          if (enableBio.value && status !== 'authorized')
            throw new Error(t('security.bioIncomplete'))
          if (status === 'authorized' && token) {
            try {
              const parsed = JSON.parse(token)
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed
            } catch (_) {
              // Older versions stored a plain session token here.
            }
          }
        } catch (error) {
          if (enableBio.value) throw error
        }
      }
      // Earlier versions stored API tokens; keep only device credentials in the new format.
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
            reason: enableBio.value ? t('security.enableBiometricLogin') : t('security.disableBio'),
            token: Object.keys(saved).length ? JSON.stringify(saved) : ''
          })
          if (
            updateStatus !==
            (enableBio.value ? 'updated' : Object.keys(saved).length ? 'updated' : 'removed')
          )
            throw new Error(t('security.bioSaveFailed'))
        } catch (error) {
          if (enableBio.value) {
            const rollback = await request('/api/user/biometric/disable', 'POST', { password })
            if (!rollback.code) setToken(rollback.data.token)
            throw error
          }
          showToast(t('security.bioCleanupFailed'))
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
