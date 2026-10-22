<template>
  <div class="outter">
    <van-notice-bar color="#fff" background="#1989fa" left-icon="passed">
      {{ $t('receive.miniAppHint') }}
    </van-notice-bar>

    <div class="wrapper">
      <van-image :src="tron" class="logo">
        <template #error>{{ $t('common.failedToLoad') }}</template>
      </van-image>
      <div class="title">{{ $t('receive.trc20Address') }}</div>
      <div class="desc">{{ $t('receive.poweredBy') }}</div>

      <div class="qrcode-wrapper">
        <canvas class="qrcode" ref="canvas" />
      </div>

      <div class="address_wrapper" v-if="sharedAddress" @click="copyAddress">
        <div class="address">{{ sharedAddress }}</div>
        <div class="copy">
          <van-icon name="notes-o" size="1.5rem" color="#c0c0c0" />
        </div>
      </div>

      <van-button class="send" block type="primary" @click="createWallet">
        {{ $t('receive.createWallet') }}
      </van-button>

      <van-button class="send" block @click="shareAddress">
        {{ $t('receive.forwardContact') }}
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { onMounted, ref } from 'vue'
import { backButton, shareURL, openTelegramLink } from '@telegram-apps/sdk'
import copy from 'copy-to-clipboard'
import { showToast } from 'vant'
import QRCode from 'qrcode'
import tron from '@/assets/icons/tron.svg'

const { t } = useI18n({ useScope: 'global' })

const canvas = ref('null')
const sharedAddress = ref(null)

onMounted(() => {
  // Load wallet information
  sharedAddress.value = localStorage.getItem('shared') ? localStorage.getItem('shared') : null
  QRCode.toCanvas(
    canvas.value,
    sharedAddress.value,
    {
      margin: 0,
      width: 130,
      color: {
        dark: '#000',
        light: '#eff2f5'
      }
    },
    function (error) {
      if (error) {
        console.error(error)
        showToast(error.message)
      }
      console.log('success!')
    }
  )
})

const copyAddress = async () => {
  try {
    copy(sharedAddress.value)
    showToast({
      message: t('common.addressCopied'),
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

const shareAddress = () => {
  if (backButton.isMounted()) {
    shareURL(
      `https://t.me/TUWalletBot/miniapp?startapp=TRON_${sharedAddress.value}`,
      t('receive.shareText')
    )
  }
}

const createWallet = () => {
  openTelegramLink('https://t.me/TUWalletbot')
}
</script>

<style lang="scss" scoped>
.outter {
  height: 100vh;
  width: 100vw;
  overflow-y: scroll;
  overflow-x: hidden;
}
.wrapper {
  display: flex;
  flex-direction: column;
  padding: 10px 10px 10px 10px;
  justify-content: center;
  align-items: center;

  .logo {
    width: 60px;
    padding: 20px;
  }

  .title {
    font-size: 28px;
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
</style>
