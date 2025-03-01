<template>
  <div class="wrapper">
    <van-image :src="tron" class="logo">
      <template #error>加载失败</template>
    </van-image>
    <div class="title">接收TRC20网络代币</div>
    <div class="desc">同一个地址就能接收TRX和USDT</div>
    <div class="qrcode-wrapper">
      <canvas class="qrcode" ref="canvas" />
    </div>

    <div class="address_wrapper" v-if="wallet" @click="copyAddress">
      <div class="address">{{ wallet.address }}</div>
      <div class="copy">
        <van-icon name="notes-o" size="1.5rem" color="#c0c0c0" />
      </div>
    </div>

    <van-button class="send" block type="primary" @click="shareAddress">
      发送给Telegram联系人
    </van-button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backButton, shareURL } from '@telegram-apps/sdk'
import copy from 'copy-to-clipboard'
import { showToast } from 'vant'
import QRCode from 'qrcode'
import tron from '@/assets/icons/tron.svg'

const router = useRouter()
const canvas = ref('null')
const wallet = ref(null)

const backListener = () => {
  router.back()
}

onMounted(() => {
  if (backButton.isMounted()) {
    backButton.onClick(backListener)
  }
  // 读取钱包信息
  wallet.value = localStorage.getItem('wallet') ? JSON.parse(localStorage.getItem('wallet')) : null
  QRCode.toCanvas(
    canvas.value,
    wallet.value.address,
    {
      margin: 0,
      width: 200,
      color: {
        dark: '#000',
        light: '#eff2f5'
      }
    },
    function (error) {
      if (error) console.error(error)
      console.log('success!')
    }
  )
})

onUnmounted(() => {
  if (backButton.isMounted()) {
    backButton.offClick(backListener)
  }
})

const copyAddress = async () => {
  try {
    copy(wallet.value.address)
    showToast({
      message: '地址已复制到剪贴板',
      position: 'bottom'
    })
  } catch (error) {
    console.log(error)
    showToast({
      message: '地址复制失败',
      position: 'bottom'
    })
  }
}

const shareAddress = () => {
  if (backButton.isMounted()) {
    shareURL(
      `https://t.me/TUWalletBot/miniapp?startapp=TRON_${wallet.value.address}`,
      '麻烦点击这个链接进Telegram小程序, 复制地址之后, 就可以给我发USDT或TRX了👇'
    )
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
    border: 1px solid #c0c0c0; /* 外边框 */
    display: flex;
    align-items: center;
    justify-content: center;
    .address {
      flex-grow: 1;
      width: 80%;
      color: #bbbbbb;
      font-size: 14px;
      word-wrap: break-word; /* 适用于旧浏览器 */
      overflow-wrap: break-word; /* 现代浏览器推荐 */
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
