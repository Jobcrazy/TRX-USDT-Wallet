<template>
  <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="wallets">
    <van-list :loading="loading" :finished="finished" finished-text="" @load="onLoad">
      <Card
        v-for="(wallet, index) in wallets"
        :key="index"
        :wallet="wallet"
        :copyable="true"
        :clickable="true"
      />
    </van-list>
    <van-empty v-if="!loading && !wallets.length" :description="$t('wallet.empty')"></van-empty>
    <van-button type="primary" size="large" block @click="showCreate = true" :loading="loading">{{
      $t('wallet.newSubaccount')
    }}</van-button>
    <van-row class="tip">{{ $t('wallet.restoreHint') }}</van-row>
  </van-pull-refresh>

  <van-overlay :show="showCreate">
    <div class="wrapper" @click.stop>
      <div class="block">
        <div class="dlg_title">
          <div class="title">{{ $t('wallet.createSubaccount') }}</div>
          <div @click="showCreate = false"><van-icon name="cross" /></div>
        </div>
        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-field
              v-model="alias"
              maxlength="10"
              :placeholder="$t('wallet.uniqueAlias')"
              :rules="[{ required: true, message: $t('wallet.enterAlias') }]"
            />
          </van-cell-group>
          <div style="margin: 16px">
            <van-button block type="primary" native-type="submit" :loading="loading">
              {{ $t('wallet.create') }}
            </van-button>
          </div>
        </van-form>
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/common/request'
import Card from '@/components/wallet/Card.vue'

const router = useRouter()
const wallets = ref([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const showCreate = ref(false)
const alias = ref('')

onMounted(() => {
  onRefresh()
})

let page = 1
let limit = 20
const onRefresh = () => {
  page = 1
  finished.value = false
  refreshing.value = true
  loading.value = false
  onLoad()
}

const onLoad = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/tron/list', 'POST', {
      page,
      limit
    })
    refreshing.value = false
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      if (page == 1) {
        wallets.value = res.data.walles
      } else {
        wallets.value = [...wallets.value, ...res.data.walles]
      }
      if (res.data.walles.length == 0) {
        finished.value = true
      }
      page++
    } else {
      refreshing.value = false
      loading.value = false
      finished.value = false
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    refreshing.value = false
    loading.value = false
    finished.value = false
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const onSubmit = async () => {
  try {
    loading.value = true
    showCreate.value = false
    let res = await request('/api/wallet/tron/create', 'POST', {
      alias: alias.value
    })
    alias.value = ''
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      onRefresh()
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
.empty {
  color: #969799;
}

.wallets {
  height: 100%;
  padding: 0 10px;
  overflow: auto;
}

.test {
  font-size: 15px;
}

.tip {
  padding: 10px 0;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #969799;
}

.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 50vh;
}

.dlg_title {
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 15px;

  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    font-weight: bold;
  }
}

.block {
  width: 80vw;
  padding: 15px;
  background-color: #eff2f5;
  border-radius: 5px;
}
</style>
