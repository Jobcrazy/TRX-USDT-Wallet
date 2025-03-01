<template>
  <van-tabs>
    <van-tab title="创建新钱包">
      <van-cell-group title="请用纸笔记录下列提示词，并确保不会泄露或丢失">
        <van-grid direction="horizontal" :column-num="mnemonic.length == 12 ? 2 : 3">
          <van-grid-item v-for="(word, index) in mnemonic" :key="index" :text="word">
            <template #icon> {{ index + 1 }}.&nbsp; </template>
            <template #text> {{ word }} </template>
          </van-grid-item>
        </van-grid>
      </van-cell-group>
      <van-divider />
      <div class="wrapper">
        <van-button type="primary" block :loading="loading" @click="onCreate(true)"
          >立刻创建</van-button
        >
      </div>
    </van-tab>
    <van-tab title="恢复老钱包">
      <van-divider />
      <van-cell-group inset>
        <van-field
          v-model="oldMnemonic"
          rows="10"
          autosize
          type="textarea"
          placeholder="请输入老钱包的提示词，以空格区分"
        />
      </van-cell-group>
      <van-divider />
      <div class="wrapper">
        <van-button type="primary" block :loading="loading" @click="onCreate(false)"
          >立刻恢复</van-button
        >
      </div>
    </van-tab>
  </van-tabs>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '@/common/request'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { backButton } from '@telegram-apps/sdk'
import { generateMnemonic } from 'ethereum-cryptography/bip39'
import { wordlist } from 'ethereum-cryptography/bip39/wordlists/english'

const router = useRouter()
const mnemonic = ref([])
const oldMnemonic = ref('')
const loading = ref(false)

onMounted(() => {
  if (backButton.isMounted()) {
    backButton.hide()
  }
  mnemonic.value = generateMnemonic(wordlist, 256).split(' ')
})

const onCreate = async (bCreate) => {
  try {
    let curMnemonic = null
    if (bCreate) {
      curMnemonic = mnemonic.value.join(' ')
    } else {
      curMnemonic = oldMnemonic.value
        .replace(/[\r\n]+/g, ' ') // 将换行符替换为空格
        .replace(/\s+/g, ' ') // 将多个空格替换为一个空格
        .trim()
    }
    loading.value = true
    let res = await request('/api/wallet/create', 'POST', {
      mnemonic: curMnemonic
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      router.replace({ name: 'Home' })
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

<style scoped>
.wrapper {
  margin: 0 10px;
}

.title {
  font-size: 1.2rem;
  font-weight: bolder;
  justify-content: center;
  padding: 20px 0 0 0;
}

* >>> .van-grid-item__content--center {
  justify-content: unset !important;
  padding-left: 20px;
}
</style>
