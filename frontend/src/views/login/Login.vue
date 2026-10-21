<template>
  <div class="wrapper" v-if="loading">
    <van-loading type="spinner" color="#1989fa" size="50"></van-loading>
  </div>
  <van-empty v-if="loadFailed" :description="description">
    <van-button type="primary" @click="login()" v-if="!errCredential">重新加载</van-button>
  </van-empty>
  <van-popup v-model:show="showRecoveryPassword" position="bottom" :style="{ height: '80%' }">
    <Password
      info="生物识别不可用，请输入支付密码"
      @password="onRecoveryPassword"
      @cancel="cancelRecovery"
    />
  </van-popup>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { retrieveLaunchParams, biometry } from '@telegram-apps/sdk'
import request from '@/common/request'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { TronWeb } from 'tronweb'
import Password from '@/components/wallet/Password.vue'
import { setToken } from '@/common/session'

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const errCredential = ref(false)
const description = ref('加载账户信息失败')
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

const onRecoveryPassword = (password) => {
  showRecoveryPassword.value = false
  login(password)
}

const cancelRecovery = () => {
  showRecoveryPassword.value = false
  description.value = '登录需要生物识别或支付密码'
  loadFailed.value = true
}

const login = async (recoveryPassword = null) => {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    })

    // 用当前的用户信息去后台取token
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
          const { status, token } = await biometry.authenticate({ reason: '解锁钱包' })
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
        showToast('支付密码错误或尝试次数过多')
        return
      }
      loadFailed.value = true
      if (res.type == 'credential') {
        errCredential.value = true
        description.value = '登录信息无效'
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
    // 判断是否有启动参数，有则跳转到对应界面
    if (initData.startParam && initData.startParam.length) {
      let params = initData.startParam.split('_')
      if (params.length < 2 || params[0] != 'TRON' || !tronWeb.isAddress(params[1])) {
        description.value = '非法的启动参数'
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
