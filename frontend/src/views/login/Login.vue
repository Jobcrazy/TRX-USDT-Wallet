<template>
  <div class="wrapper" v-if="loading">
    <van-loading type="spinner" color="#1989fa" size="50"></van-loading>
  </div>
  <van-empty v-if="loadFailed" :description="description">
    <van-button type="primary" @click="login()" v-if="!errCredential">{{
      $t('auth.reload')
    }}</van-button>
  </van-empty>
  <van-popup v-model:show="showRecoveryPassword" position="bottom" :style="{ height: '80%' }">
    <Password
      :info="$t('auth.bioFallback')"
      @password="onRecoveryPassword"
      @cancel="cancelRecovery"
    />
  </van-popup>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { ref, onMounted, onUnmounted } from 'vue'
import { retrieveLaunchParams, biometry } from '@telegram-apps/sdk'
import request from '@/common/request'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { TronWeb } from 'tronweb'
import Password from '@/components/wallet/Password.vue'
import { setToken } from '@/common/session'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const errCredential = ref(false)
const description = ref(t('auth.loadFailed'))
const showRecoveryPassword = ref(false)

onMounted(async () => {
  try {
    if (isMobileOS() && biometry.isSupported()) {
      await biometry.mount()
    }
    login()
  } catch (error) {
    login()
  }
})

onUnmounted(() => {
  try {
    biometry.unmount()
  } catch (error) {
    console.log(error)
  }
})

function isMobileOS() {
  const userAgent = navigator.userAgent
  // Check for Android
  if (/Android/i.test(userAgent)) {
    return true
  }
  // Check for iOS
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return true
  }
  return false
}

const onRecoveryPassword = (password) => {
  showRecoveryPassword.value = false
  login(password)
}

const cancelRecovery = () => {
  showRecoveryPassword.value = false
  description.value = t('auth.authRequired')
  loadFailed.value = true
}

const login = async (recoveryPassword = null) => {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    })

    // Request a session token using the current Telegram user
    loading.value = true
    loadFailed.value = false
    setToken(null)
    localStorage.removeItem('token')
    const { initData, initDataRaw } = retrieveLaunchParams()
    let res = await request('/api/user/login', 'POST', {
      initData: initDataRaw,
      recoveryPassword
    })
    if (res.type === 'biometric_required' && !recoveryPassword) {
      try {
        if (biometry.isSupported() && (await biometry.requestAccess())) {
          const { status, token } = await biometry.authenticate({ reason: t('auth.unlockWallet') })
          if (status === 'authorized' && token) {
            const saved = JSON.parse(token)
            const secret = saved[initData.user.id]?.secret
            if (secret) {
              res = await request('/api/user/login', 'POST', {
                initData: initDataRaw,
                biometricSecret: secret
              })
            }
          }
        }
      } catch (error) {
        console.log(error)
      }
      if (res.type === 'biometric_required') {
        loading.value = false
        showRecoveryPassword.value = true
        return
      }
    }
    if (res.code) {
      loading.value = false
      if (recoveryPassword && res.type === 'pay_password') {
        showRecoveryPassword.value = true
        showToast(t('auth.badPayPwd'))
        return
      }
      loadFailed.value = true
      if (res.type == 'credential') {
        errCredential.value = true
        description.value = t('auth.invalidLogin')
        return
      } else {
        showToast(res.message)
        return
      }
    }
    localStorage.setItem('user', JSON.stringify(initData.user))
    setToken(res.data.token)
    localStorage.setItem('hasPassword', res.data.hasPassword)
    localStorage.setItem('enable2fa', res.data.enable2fa)
    if (!res.data.biometricEnabled) localStorage.removeItem(`${initData.user.id}:biometric`)
    // Route according to the launch parameter
    if (initData.startParam && initData.startParam.length) {
      let params = initData.startParam.split('_')
      if (params.length < 2 || params[0] != 'TRON' || !tronWeb.isAddress(params[1])) {
        description.value = t('auth.invalidLaunch')
        loading.value = false
        return
      }
      localStorage.setItem('shared', params[1])
      loading.value = false
      return router.replace({ name: 'Shared' })
    }
    if (res.data.inited) {
      loading.value = false
      return router.replace({ name: 'Home' })
    } else {
      loading.value = false
      router.replace({ name: 'Create' })
    }
  } catch (err) {
    showToast(err.message)
    console.log(err)
    loadFailed.value = true
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
