<template>
  <van-tabs>
    <van-tab :title="$t('wallet.createWallet')">
      <van-cell-group :title="$t('common.backupPhrase')">
        <van-grid direction="horizontal" :column-num="mnemonic.length == 12 ? 2 : 3">
          <van-grid-item v-for="(word, index) in mnemonic" :key="index" :text="word">
            <template #icon> {{ index + 1 }}.&nbsp; </template>
            <template #text> {{ word }} </template>
          </van-grid-item>
        </van-grid>
      </van-cell-group>
      <van-divider />
      <div class="wrapper">
        <van-button type="primary" block :loading="loading" @click="onCreate(true)">{{
          $t('wallet.createNow')
        }}</van-button>
      </div>
    </van-tab>
    <van-tab :title="$t('wallet.restoreWallet')">
      <van-divider />
      <van-cell-group inset>
        <van-field
          v-model="oldMnemonic"
          rows="10"
          autosize
          type="textarea"
          :placeholder="$t('wallet.enterPhrase')"
        />
      </van-cell-group>
      <van-divider />
      <div class="wrapper">
        <van-button type="primary" block :loading="loading" @click="onCreate(false)">{{
          $t('wallet.restoreNow')
        }}</van-button>
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
        .replace(/[\r\n]+/g, ' ') // Replace line breaks with spaces
        .replace(/\s+/g, ' ') // Collapse repeated spaces
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
