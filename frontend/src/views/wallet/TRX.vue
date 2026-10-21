<template>
  <van-notice-bar color="#1989fa" background="#ecf9ff" left-icon="info-o">
    仅显示已确认的 TRX 转账
  </van-notice-bar>
  <div class="wrapper" v-if="wallet">
    <van-row class="listWapper">
      <div class="item">
        <div class="left">
          <van-image :src="tron" class="logo">
            <template #error>加载失败</template>
          </van-image>
          <div class="name">{{ wallet.subtype == 'trx' ? 'Tron' : 'Tether' }}</div>
        </div>
        <div class="right">
          <div class="amount">{{ wallet.balance }}</div>
          <div class="token">TRX</div>
        </div>
      </div>
    </van-row>
    <div class="divider" />
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="transations">
      <van-list
        :loading="loading"
        :finished="finished"
        loading-text="正在筛选 TRX 转账..."
        finished-text="没有更多了"
        @load="onLoad"
      >
        <div
          class="transation"
          v-for="(transaction, index) in transactions"
          :key="index"
          :transaction="transaction"
          @click="viewDetail(transaction)"
        >
          <div class="icon">
            <van-icon
              name="down"
              v-if="transaction.raw_data.contract[0].parameter.value.to_address === wallet.trxAddr"
            />
            <van-icon name="guide-o" v-else />
          </div>
          <div class="detail">
            <div class="direction">
              <div>
                {{
                  transaction.raw_data.contract[0].parameter.value.to_address === wallet.trxAddr
                    ? '收到'
                    : '转出'
                }}
              </div>
              <div class="amount">
                {{
                  utils.numFormat(
                    parseInt(transaction.raw_data.contract[0].parameter.value.amount) / 10 ** 6
                  )
                }}
              </div>
              <div class="date">
                {{ utils.dateFormat('yyyy-MM-dd', new Date(transaction.block_timestamp)) }}
              </div>
            </div>
            <div class="address_info">
              <div class="address">
                {{
                  transaction.raw_data.contract[0].parameter.value.to_address === wallet.trxAddr
                    ? '从: '
                    : '到: '
                }}

                {{
                  transaction.raw_data.contract[0].parameter.value.to_address === wallet.trxAddr
                    ? truncate(transaction.raw_data.contract[0].parameter.value.owner_address_trc)
                    : truncate(transaction.raw_data.contract[0].parameter.value.to_address_trc)
                }}
              </div>
              <div class="time">
                {{ utils.dateFormat('hh:mm:ss', new Date(transaction.block_timestamp)) }}
              </div>
            </div>
          </div>
          <div class="more"><van-icon name="arrow" color="#c0c0c0" /></div>
        </div>
        <van-empty v-if="finished && !transactions.length" description="暂无符合条件的 TRX 转账" />
      </van-list>
    </van-pull-refresh>
  </div>
</template>

<script lang="js" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { backButton, openLink } from '@telegram-apps/sdk'
import { useRouter } from 'vue-router'
import request from '@/common/request'
import { showToast } from 'vant'
import { TronWeb } from 'tronweb'
import tron from '@/assets/icons/tron.svg'
import utils from '@/common/utils'

const router = useRouter()
const wallet = ref(null)
const transactions = ref([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)
const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io'
})

const backListener = () => {
  router.back()
}

function truncate(str) {
  if (str.length > 30) {
    return str.slice(0, 10) + '...' + str.slice(-10)
  }
  return str
}

onMounted(() => {
  // 显示后退按钮
  if (backButton.isMounted()) {
    backButton.show()
    backButton.onClick(backListener)
  }
  // 读取钱包信息
  wallet.value = localStorage.getItem('wallet') ? JSON.parse(localStorage.getItem('wallet')) : null
  loadTron()
})

onUnmounted(() => {
  requestVersion++
  if (backButton.isMounted()) {
    backButton.offClick(backListener)
  }
})

let fingerprint = undefined
let requestVersion = 0
let isLoadingPage = false
let nextRequestAt = 0
const onRefresh = async () => {
  requestVersion++
  isLoadingPage = false
  transactions.value = []
  finished.value = false
  fingerprint = undefined
  refreshing.value = true
  loading.value = true
  await Promise.all([loadTron(), onLoad()])
  refreshing.value = false
}

const onLoad = async () => {
  if (isLoadingPage || finished.value || !wallet.value) return
  isLoadingPage = true
  const version = requestVersion
  try {
    loading.value = true
    const wait = Math.max(0, nextRequestAt - Date.now())
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    if (version !== requestVersion) return
    nextRequestAt = Date.now() + 1000
    const res = await request('/api/wallet/tron/trx/history', 'POST', {
      address: wallet.value.address,
      fingerprint
    })
    if (version !== requestVersion) return
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      const nextTransactions = res.data.transactions.map((transaction) => {
        const value = transaction.raw_data.contract[0].parameter.value
        value.owner_address_trc = tronWeb.address.fromHex(value.owner_address)
        value.to_address_trc = tronWeb.address.fromHex(value.to_address)
        return transaction
      })
      transactions.value = [...transactions.value, ...nextTransactions]
      const nextFingerprint = res.data.fingerprint
      if (!nextFingerprint || nextFingerprint === fingerprint) finished.value = true
      fingerprint = nextFingerprint
    } else {
      finished.value = true
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    console.log(error)
    if (version === requestVersion) {
      finished.value = true
      showToast({ message: error.message, position: 'bottom' })
    }
  } finally {
    nextRequestAt = Math.max(nextRequestAt, Date.now() + 1000)
    if (version === requestVersion) {
      isLoadingPage = false
      loading.value = false
    }
  }
}

const viewDetail = (transaction) => {
  if (!backButton.isMounted()) return
  let url = ''
  if (process.env.NODE_ENV === 'development') {
    url = `https://nile.tronscan.org/#/transaction/${transaction.txID}`
  } else {
    url = `https://tronscan.org/#/transaction/${transaction.txID}`
  }
  openLink(url, {
    tryBrowser: 'chrome',
    tryInstantView: true
  })
}

const loadTron = async () => {
  if (!wallet.value) return
  try {
    let res = await request('/api/wallet/tron/trx/balance', 'POST', {
      address: wallet.value.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      wallet.value.balance = utils.numFormat(res.data.balance)
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
</script>

<style lang="scss" scoped>
.wrapper {
  padding: 10px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);

  .listWapper {
    background-color: #fff;
    border-radius: 5px;
    padding: 5px 15px;
    display: flex;
    flex-direction: column;
    .item {
      display: flex;
      width: 100%;
      padding: 10px 0;
      .left {
        display: flex;
        flex-grow: 1;
        align-items: center;
        .logo {
          width: 42px;
          height: 42px;
        }
        .name {
          padding-left: 12px;
          font-size: 18px;
        }
      }
      .right {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: end;
        .amount {
          font-size: 24px;
        }
        .token {
          font-size: 12px;
          color: #c9c9c9;
        }
      }
    }
    .divider {
      height: 1px;
      background-color: #f9f9f9;
    }
  }

  .divider {
    height: 10px;
    background-color: #eff2f5;
  }

  .transations {
    flex-grow: 1;
    background-color: #fff;
    padding: 0px 15px;
    border-radius: 5px;
    overflow: scroll;

    .transation {
      display: flex;
      padding: 10px 0;
      .icon {
        width: 40px;
        height: 40px;
        background-color: #e4e4e47f;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .detail {
        flex-grow: 1;
        padding-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        // align-items: center;
        .direction {
          display: flex;
          font-size: 14px;
          .amount {
            padding-left: 5px;
            font-weight: bolder;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .date {
            display: flex;
            flex-direction: column;
            justify-content: center;
            color: #c0c0c0;
          }
        }
        .address_info {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #c9c9c9;
          .address {
            flex-grow: 1;
          }
        }
      }

      .more {
        display: flex;
        align-items: center;
        justify-content: center;
        padding-left: 5px;
      }
    }
  }
}
</style>
