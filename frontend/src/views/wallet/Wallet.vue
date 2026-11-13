<template>
  <div class="wrapper" v-if="wallet">
    <Card
      :wallet="wallet"
      :editable="true"
      :copyable="true"
      :clickable="false"
      :info="!isBsc"
      :show-stake="!isBsc"
      :timestamp="timestamp"
    />
    <div class="actions">
      <van-grid direction="vertical" :column-num="isBsc ? 3 : 4">
        <van-grid-item
          icon="guide-o"
          :text="$t('wallet.send')"
          @click="router.push({ name: isBsc ? 'BscSend' : 'Send' })"
        />
        <van-grid-item
          icon="down"
          :text="$t('wallet.receive')"
          @click="router.push({ name: 'Receive' })"
        />
        <van-grid-item
          v-if="!isBsc"
          icon="exchange"
          :text="$t('wallet.swap')"
          @click="showSwap = true"
        />
        <van-grid-item icon="replay" :text="$t('common.refresh')" @click="onRefresh" />
      </van-grid>
    </div>
    <van-row class="listWapper">
      <AssetRow
        :icon="isBsc ? bnb : tron"
        :name="isBsc ? 'BNB' : 'TRX'"
        :balance="nativeBalance"
        :decimals="isBsc ? 6 : 2"
        :fixed-decimals="!isBsc"
        :small-amount="isBsc"
        :show-value="true"
        :rate="rate"
        @click="enterHistory(isBsc ? 'bnb' : 'trx')"
      />
      <div class="divider" />
      <AssetRow
        :icon="tether"
        name="USDT"
        :balance="usdt"
        :decimals="2"
        @click="enterHistory('usdt')"
      />
      <template v-if="isBsc">
        <template v-for="asset in extraAssets" :key="asset.symbol">
          <div class="divider" />
          <AssetRow
            :icon="asset.icon"
            :name="asset.symbol"
            :balance="extraBalances[asset.symbol]"
            :decimals="2"
            :show-value="true"
            :rate="extraRates[asset.symbol]"
          />
        </template>
      </template>
    </van-row>
  </div>

  <van-action-sheet
    v-model:show="showSwap"
    :actions="swapActions"
    :cancel-text="$t('common.cancel')"
    close-on-click-action
    @select="onSwapAction"
  />
</template>

<script setup>
import { useI18n } from 'vue-i18n'

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { TronWeb } from 'tronweb'
import { backButton } from '@telegram-apps/sdk'
import { useRouter } from 'vue-router'
import request from '@/common/request'
import Card from '@/components/wallet/Card.vue'
import AssetRow from '@/components/wallet/AssetRow.vue'
import { closeToast, showLoadingToast, showToast } from 'vant'
import tron from '@/assets/icons/tron.svg'
import bnb from '@/assets/icons/bnb.svg'
import tether from '@/assets/icons/tether.svg'
import intcb from '@/assets/icons/intcb.png'
import nvdab from '@/assets/icons/nvdab.png'

const { t } = useI18n({ useScope: 'global' })

const router = useRouter()
const wallet = ref(null)
const nativeBalance = ref('0')
const usdt = ref('0')
const rate = ref(null)
const extraAssets = [
  { symbol: 'INTCB', icon: intcb },
  { symbol: 'NVDAB', icon: nvdab }
]
const extraBalances = ref({ INTCB: null, NVDAB: null })
const extraRates = ref({ INTCB: null, NVDAB: null })
const isBsc = computed(() => wallet.value?.blockchain === 'bsc')
const loading = ref(false)
const timestamp = ref(0)

const backListener = () => {
  router.replace({ name: 'Home' })
}

onMounted(() => {
  // Show the back button
  if (backButton.isMounted()) {
    backButton.show()
    backButton.onClick(backListener)
  }
  // Load wallet information
  wallet.value = localStorage.getItem('wallet') ? JSON.parse(localStorage.getItem('wallet')) : null

  // Load balances for each wallet
  if (!wallet.value) return router.replace({ name: 'Home' })
  loadNative()
  loadUSDT()
  if (isBsc.value) loadExtras()
  loadPrice()
})

const onRefresh = async () => {
  showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: t('wallet.refreshing')
  })
  try {
    loading.value = true
    timestamp.value = new Date().getTime()
    await loadNative()
    await loadUSDT()
    if (isBsc.value) await loadExtras()
    await loadPrice()
    loading.value = false
    closeToast()
  } catch (error) {
    loading.value = false
    closeToast()
  }
}

const enterHistory = (subtype) => {
  if (isBsc.value) return
  const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
  })
  wallet.value.trxAddr = tronWeb.address.toHex(wallet.value.address)
  wallet.value.subtype = subtype
  wallet.value.balance = subtype == 'trx' ? nativeBalance.value : usdt.value
  localStorage.setItem('wallet', JSON.stringify(wallet.value))
  switch (subtype) {
    case 'trx':
      router.push({ name: 'TRX' })
      break
    case 'usdt':
      router.push({ name: 'USDT' })
      break
    default:
      break
  }
}

onUnmounted(() => {
  if (backButton.isMounted()) {
    backButton.offClick(backListener)
  }
})

const loadNative = async () => {
  try {
    let res = await request(`/api/wallet/${isBsc.value ? 'bsc/bnb' : 'tron/trx'}/balance`, 'POST', {
      address: wallet.value.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      nativeBalance.value = res.data.balance
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
  }
}

const loadUSDT = async () => {
  try {
    let res = await request(`/api/wallet/${isBsc.value ? 'bsc' : 'tron'}/usdt/balance`, 'POST', {
      address: wallet.value.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      usdt.value = res.data.balance
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
  }
}

const loadExtras = async () => {
  await Promise.all(
    extraAssets.map(async ({ symbol }) => {
      try {
        const res = await request(`/api/wallet/bsc/${symbol.toLowerCase()}/balance`, 'POST', {
          address: wallet.value.address
        })
        if (res.code && res.type === 'login') return router.replace({ name: 'Login' })
        extraBalances.value[symbol] = res.code ? null : res.data.balance
      } catch {
        extraBalances.value[symbol] = null
      }
    })
  )
}

const loadPrice = async () => {
  try {
    const res = await request('/api/wallet/prices', 'POST')
    rate.value = res.code ? null : res.data[isBsc.value ? 'bnb' : 'trx']
    extraRates.value = {
      INTCB: res.code ? null : (res.data.intcb ?? null),
      NVDAB: res.code ? null : (res.data.nvdab ?? null)
    }
  } catch {
    rate.value = null
    extraRates.value = { INTCB: null, NVDAB: null }
  }
}

const showSwap = ref(false)
const swapActions = [
  { name: t('wallet.trxToUsdt'), val: 'trx2usdt' },
  { name: t('wallet.usdtToTrx'), val: 'usdt2trx' }
]
const onSwapAction = (action) => {
  if (action.val == 'usdt2trx') {
    return router.push({ name: 'USDT2TRX' })
  } else if (action.val == 'trx2usdt') {
    return router.push({ name: 'TRX2USDT' })
  }
}
</script>

<style lang="scss" scoped>
.wrapper {
  padding: 10px 10px;
  .actions {
    padding-bottom: 10px;
    :deep(.van-grid-item__content) {
      border-radius: 5px;
    }
  }
}

.listWapper {
  background-color: #fff;
  border-radius: 5px;
  padding: 5px 15px;
  display: flex;
  flex-direction: column;
  .divider {
    height: 1px;
    background-color: #f9f9f9;
  }
}
</style>
