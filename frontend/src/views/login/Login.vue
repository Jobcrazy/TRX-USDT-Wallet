<template>
  <div class="wrapper" v-if="loading">
    <van-loading type="spinner" color="#1989fa" size="50"></van-loading>
  </div>
  <van-empty v-if="loadFailed" :description="description">
    <van-button type="primary" @click="login()" v-if="!errCredential">重新加载</van-button>
  </van-empty>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { retrieveLaunchParams, backButton, biometry } from '@telegram-apps/sdk'
import request from '@/common/request'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { TronWeb } from 'tronweb'

const router = useRouter()
const loading = ref(false)
const loadFailed = ref(false)
const errCredential = ref(false)
const description = ref('加载账户信息失败')

onMounted(async () => {
  try {
    if (backButton.isMounted() && isMobileOS()) {
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

const login = async () => {
  try {
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    })

    // 用当前的用户信息去后台取token
    loading.value = true
    const { initData, initDataRaw } = retrieveLaunchParams()
    let res = await request('/api/user/login', 'POST', {
      initData: initDataRaw
    })
    if (res.code) {
      loading.value = false
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
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('hasPassword', res.data.hasPassword)
    localStorage.setItem('enable2fa', res.data.enable2fa)
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
      const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
      const enableBio = localStorage.getItem(`${user.id}:biometric`)
        ? localStorage.getItem(`${user.id}:biometric`) == 'true'
        : false
      if (!enableBio || !biometry.isSupported()) {
        loading.value = false
        return router.replace({ name: 'Home' })
      }
      if (!(await biometry.requestAccess())) {
        biometry.openSettings()
        loadFailed.value = true
        loading.value = false
        return
      }
      // 取回全部用户的token
      const { status, token } = await biometry.authenticate({
        reason: '开启指纹/面容支付'
      })
      if (status !== 'authorized') {
        // 取回失败
        loadFailed.value = true
        loading.value = false
        return
      }
      let userTokens = {}
      if (token && token.length) {
        userTokens = JSON.parse(token)
        if (userTokens[user.id].token != res.data.token) {
          loadFailed.value = true
        } else {
          loading.value = false
          return router.replace({ name: 'Home' })
        }
      } else {
        localStorage.removeItem(`${user.id}:biometric`)
        loading.value = false
        return router.replace({ name: 'Home' })
      }
      loading.value = false
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
