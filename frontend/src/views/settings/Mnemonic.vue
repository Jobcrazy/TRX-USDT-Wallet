<template>
  <div class="wrapper">
    <div v-if="!verified && !loading">
      <!-- 密码输入框 -->
      <van-password-input
        :value="password"
        :focused="showKeyboard"
        @focus="showKeyboard = true"
        :error-info="errorInfo"
        :info="info"
      />
      <!-- 数字键盘 -->
      <van-number-keyboard v-model="password" :show="showKeyboard" @blur="showKeyboard = false" />
    </div>
    <van-cell-group
      title="请用纸笔记录下列提示词，并确保不会泄露或丢失"
      v-if="verified && !loading"
    >
      <van-grid direction="horizontal" :column-num="mnemonic.length == 12 ? 2 : 3">
        <van-grid-item v-for="(word, index) in mnemonic" :key="index" :text="word">
          <template #icon> {{ index + 1 }}.&nbsp; </template>
          <template #text> {{ word }} </template>
        </van-grid-item>
      </van-grid>
    </van-cell-group>
  </div>
  <div class="loading" v-if="loading">
    <van-loading size="24px" vertical>加载中...</van-loading>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/common/request'
import { backButton } from '@telegram-apps/sdk'
import { showToast } from 'vant'

const verified = ref(false)
const showKeyboard = ref(true)
const password = ref('')
const errorInfo = ref('')
const loading = ref(false)
const info = ref('')
const router = useRouter()
const mnemonic = ref([])

const backListener = () => {
  router.back()
}

onMounted(() => {
  if (backButton.isMounted()) {
    backButton.onClick(backListener)
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
    // 获取并展示提示词
    showMnemonic(newVal)
    password.value = ''
  }
})

const showMnemonic = async (newVal) => {
  try {
    loading.value = true
    let res = await request('/api/user/mnemonic', 'POST', {
      password: newVal
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      verified.value = true
      mnemonic.value = res.data.mnemonic.split(' ')
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    loading.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}
</script>

<style scoped lang="scss">
.wrapper {
  padding: 20px 10px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

:deep(.van-grid-item__content--center) {
  justify-content: unset !important;
  padding-left: 20px;
}
</style>
