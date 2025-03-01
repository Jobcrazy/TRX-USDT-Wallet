<template>
  <div class="wrapper">
    <div class="logos">
      <van-image :src="google" class="logo">
        <template #error>加载失败</template>
      </van-image>
      <van-image :src="microsoft" class="logo">
        <template #error>加载失败</template>
      </van-image>
    </div>
    <div class="title">用Google或微软验证器扫描</div>
    <div class="qrcode-wrapper">
      <canvas class="qrcode" ref="canvas" />
    </div>
    <div class="desc">您也可以复制下方地址并添加到验证器</div>
    <div class="address_wrapper" v-if="wallet" @click="copyAddress">
      <div class="address">{{ wallet.address }}</div>
      <div class="copy">
        <van-icon name="notes-o" size="1.5rem" color="#c0c0c0" />
      </div>
    </div>

    <van-button class="send" block type="primary" @click="showPassword = true">
      验证并开启
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
      info="请输入验证器上的数字"
      @cancel="showPassword = false"
      :loading="loading"
    />
  </van-popup>
</template>

<script setup>
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

const router = useRouter()
const canvas = ref('null')
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
  // 读取钱包信息
  otpauthUrl.value = localStorage.getItem('otpauthUrl') ? localStorage.getItem('otpauthUrl') : null
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
    copy(otpauthUrl.value.address)
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
        message: '成功开启双因素验证',
        position: 'bottom'
      })
      localStorage.setItem('enable2fa', true)
      return router.back()
    } else {
      if (res.type == '2fa_secret') {
        showToast({
          message: '验证码错误输入错误',
          position: 'bottom'
        })
        return router.back()
      } else if (res.type == '2fa_bind') {
        // 已经开启过了
        showToast({
          message: '成功开启双因素验证',
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

:deep(.van-password-input__security) {
  width: 80vw !important;
}
</style>
