<template>
  <div class="wrapper">
    <div class="logos">
      <van-image :src="google" class="logo">
        <template #error>{{ $t('common.failedToLoad') }}</template>
      </van-image>
      <van-image :src="microsoft" class="logo">
        <template #error>{{ $t('common.failedToLoad') }}</template>
      </van-image>
    </div>
    <div class="title">{{ $t('security.scanOtp') }}</div>
    <div class="qrcode-wrapper">
      <canvas class="qrcode" ref="canvas" />
    </div>
    <div class="desc">{{ $t('security.copyOtpLink') }}</div>
    <div class="address_wrapper" v-if="otpauthUrl" @click="copyAddress">
      <div class="address">{{ otpauthUrl }}</div>
      <div class="copy">
        <van-icon name="notes-o" size="1.5rem" color="#c0c0c0" />
      </div>
    </div>

    <van-button class="send" block type="primary" @click="showPassword = true">
      {{ $t('security.verifyAndEnable') }}
    </van-button>
  </div>

  <van-popup
    v-if="showPassword"
    v-model:show="showPassword"
    position="bottom"
    :style="{ height: '80%' }"
  >
    <Password
      @password="onBind"
      :info="$t('common.enterOtp')"
      @cancel="showPassword = false"
      :loading="loading"
    />
  </van-popup>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backButton } from '@telegram-apps/sdk'
import copy from 'copy-to-clipboard'
import { showToast } from 'vant'
import QRCode from 'qrcode'
import google from '@/assets/icons/google.svg'
import microsoft from '@/assets/icons/microsoft.svg'
import Password from '@/components/wallet/Password.vue'
import request from '@/common/request'
import { getPending2FA, setPending2FA } from '@/common/pending-2fa'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const canvas = ref(null)
const otpauthUrl = ref(null)
const showPassword = ref(false)
const loading = ref(false)

const backListener = () => {
  router.back()
}

onMounted(() => {
  if (backButton.isMounted()) {
    backButton.onClick(backListener)
  }
  // Load wallet information
  otpauthUrl.value = getPending2FA()
  if (!otpauthUrl.value) {
    router.replace({ name: 'Settings' })
    return
  }
  if (!otpauthUrl.value) return
  QRCode.toCanvas(
    canvas.value,
    otpauthUrl.value,
    {
      margin: 0,
      width: 150,
      color: {
        dark: '#000',
        light: '#eff2f5'
      }
    },
    function (error) {
      if (error) console.error(error)
    }
  )
})

onUnmounted(() => {
  setPending2FA(null)
  if (backButton.isMounted()) {
    backButton.offClick(backListener)
  }
})

const copyAddress = async () => {
  try {
    if (!copy(otpauthUrl.value)) throw new Error(t('security.copyFailed'))
    showToast({
      message: t('security.otpLinkCopied'),
      position: 'bottom'
    })
  } catch (error) {
    console.log(error)
    showToast({
      message: t('common.copyAddressFailed'),
      position: 'bottom'
    })
  }
}

const onBind = async (code) => {
  try {
    showPassword.value = false
    let res = await request('/api/user/enable_2fa', 'POST', {
      code
    })
    if (res.code && res.type == 'login') {
      loading.value = false
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      loading.value = false
      showToast({
        message: t('security.otpEnabled'),
        position: 'bottom'
      })
      localStorage.setItem('enable2fa', true)
      setPending2FA(null)
      return router.back()
    } else {
      if (res.type == '2fa_secret') {
        showToast({
          message: t('security.badOtp'),
          position: 'bottom'
        })
        return router.back()
      } else if (res.type == '2fa_bind') {
        // Already enabled
        showToast({
          message: t('security.otpEnabled'),
          position: 'bottom'
        })
        return router.back()
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
</script>

<style lang="scss" scoped>
.wrapper {
  display: flex;
  flex-direction: column;
  padding: 30px 10px 10px 10px;
  justify-content: center;
  align-items: center;

  .logos {
    display: flex;
    .logo {
      width: 60px;
      padding: 20px;
    }
  }

  .title {
    font-size: 20px;
    font-weight: bolder;
  }

  .desc {
    color: #bbbbbb;
    font-size: 16px;
    padding: 5px;
  }

  .qrcode-wrapper {
    padding: 20px;
  }

  .address_wrapper {
    width: 80%;
    padding: 10px;
    border-radius: 5px;
    border: 1px solid #c0c0c0; /* Outer border */
    display: flex;
    align-items: center;
    justify-content: center;
    .address {
      flex-grow: 1;
      width: 80%;
      color: #bbbbbb;
      font-size: 14px;
      word-wrap: break-word; /* Fallback for older browsers */
      overflow-wrap: break-word; /* Preferred for modern browsers */
    }
    .copy {
      padding: 0 0 0 10px;
    }
  }

  .send {
    width: 86%;
    margin-top: 15px;
  }
}

:deep(.van-password-input__security) {
  width: 80vw !important;
}
</style>
