<template>
  <div class="wrapper" v-if="!loading">
    <!-- Password input -->
    <van-password-input
      :value="password"
      :focused="showKeyboard"
      @focus="showKeyboard = true"
      :error-info="errorInfo"
      :info="info"
    />
    <!-- Numeric keyboard -->
    <van-number-keyboard v-model="password" :show="showKeyboard" @blur="showKeyboard = false" />
  </div>
  <div class="loading" v-if="loading">
    <van-loading size="24px" vertical>{{ $t('security.loading') }}</van-loading>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { backButton } from '@telegram-apps/sdk'
import request from '@/common/request'
import { setToken } from '@/common/session'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const user = ref(null)
const password = ref('')
const showKeyboard = ref(true)
const errorInfo = ref('')
const loading = ref(false)
const info = ref(t('common.enterPayPwd'))
const type = ref(null) // new: set a password; modify: change it; remove: disable it

let oldPassword = null
let firstPassword = null
let secondPassword = null

const backListener = () => {
  router.back()
}

onMounted(() => {
  try {
    user.value = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null
    type.value = localStorage.getItem('passwordType') ? localStorage.getItem('passwordType') : 'new'
    if (type.value == 'modify') {
      info.value = t('security.oldPayPwd')
    }
    if (backButton.isMounted()) {
      backButton.onClick(backListener)
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
  } catch (error) {
    console.log(error)
  }
})

watch(password, (newVal) => {
  if (newVal != '') errorInfo.value = ''
  if (newVal.length === 6) {
    switch (type.value) {
      case 'new':
        onNewPassword(newVal)
        break
      case 'remove':
        onRemovePassword(newVal)
        break
      case 'modify':
        onModifyPassword(newVal)
        break
    }
    password.value = ''
  }
})

const onNewPassword = async (newVal) => {
  if (!firstPassword) {
    firstPassword = newVal
    info.value = t('security.confirmPwd')
    return
  }
  secondPassword = newVal
  info.value = ''
  if (firstPassword != secondPassword) {
    firstPassword = null
    errorInfo.value = t('security.pwdMismatch')
    info.value = t('common.enterPayPwd')
    return
  }
  // Submit matching passwords to the server
  try {
    loading.value = true
    let res = await request('/api/user/password', 'POST', {
      password: secondPassword
    })
    secondPassword = null
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      showToast({
        message: t('security.passwordSet'),
        position: 'bottom'
      })
      localStorage.setItem('hasPassword', 'true')
      if (user.value) localStorage.setItem(`${user.value.id}:biometric`, false)
      setToken(res.data.token)
      return router.back()
    } else {
      oldPassword = null
      firstPassword = null
      secondPassword = null
      info.value = t('security.newPayPwd')
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    oldPassword = null
    firstPassword = null
    secondPassword = null
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onRemovePassword = async (newVal) => {
  try {
    loading.value = true
    let res = await request('/api/user/password', 'POST', {
      password: null,
      old_password: newVal
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      showToast({
        message: t('security.passwordDisabled'),
        position: 'bottom'
      })
      localStorage.setItem('hasPassword', 'false')
      localStorage.setItem(`${user.value.id}:biometric`, false)
      setToken(res.data.token)
      return router.back()
    } else {
      oldPassword = null
      firstPassword = null
      secondPassword = null
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    oldPassword = null
    firstPassword = null
    secondPassword = null
    info.value = t('security.newPayPwd')
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onModifyPassword = async (newVal) => {
  if (!oldPassword) {
    oldPassword = newVal
    info.value = t('security.newPayPwd')
    return
  }
  if (!firstPassword) {
    firstPassword = newVal
    info.value = t('security.confirmNewPwd')
    return
  }
  secondPassword = newVal
  info.value = ''
  if (firstPassword != secondPassword) {
    firstPassword = null
    errorInfo.value = t('security.pwdMismatch')
    info.value = t('security.newPayPwd')
    return
  }
  // Submit matching passwords to the server
  try {
    loading.value = true
    let res = await request('/api/user/password', 'POST', {
      password: secondPassword,
      old_password: oldPassword
    })
    secondPassword = null
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      showToast({
        message: t('security.passwordChanged'),
        position: 'bottom'
      })
      localStorage.setItem('hasPassword', 'true')
      if (user.value) localStorage.setItem(`${user.value.id}:biometric`, false)
      setToken(res.data.token)
      return router.back()
    } else {
      oldPassword = null
      firstPassword = null
      secondPassword = null
      info.value = t('security.newPayPwd')
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    oldPassword = null
    firstPassword = null
    secondPassword = null
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}
</script>

<style lang="scss" scoped>
.wrapper {
  padding: 20px 10px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}
</style>
