<template>
  <van-notice-bar color="#1989fa" background="#ecf9ff" left-icon="info-o">
    暂时只支持查看<span style="font-weight: bold"> 转账 </span>类型的交易记录
  </van-notice-bar>
  <div class="wrapper" v-if="wallet">
    <van-row class="listWapper">
      <div class="item">
        <div class="left">
          <van-image :src="tether" class="logo">
            <template #error>加载失败</template>
          </van-image>
          <div class="name">{{ 'Tether' }}</div>
        </div>
        <div class="right">
          <div class="amount">{{ wallet.balance }}</div>
          <div class="token">USDT</div>
        </div>
      </div>
    </van-row>
    <div class="divider" />
    <van-pull-refresh v-model="loading" @refresh="onRefresh" class="transations">
      <van-list :loading="loading" :finished="finished" finished-text="没有更多了" @load="onLoad">
        <div
          class="transation"
          v-for="(transaction, index) in transactions"
          :key="index"
          :transaction="transaction"
          @click="viewDetail(transaction)"
        >
          <div class="icon">
            <van-icon name="guide-o" v-if="transaction.from === wallet.address" />
            <van-icon name="down" v-else />
          </div>
          <div class="detail">
            <div class="direction">
              <div>{{ transaction.from === wallet.address ? '转出' : '收到' }}</div>
              <div class="amount">
                {{
                  utils.numFormat(
                    parseInt(transaction.value) / 10 ** transaction.token_info.decimals
                  )
                }}
              </div>
              <div class="date">
                {{ utils.dateFormat('yyyy-MM-dd', new Date(transaction.block_timestamp)) }}
              </div>
            </div>
            <div class="address_info">
              <div class="address">
                {{ transaction.from === wallet.address ? '到: ' : '从: '
                }}{{
                  transaction.from === wallet.address
                    ? truncate(transaction.to)
                    : truncate(transaction.from)
                }}
              </div>
              <div class="time">
                {{ utils.dateFormat('hh:mm:ss', new Date(transaction.block_timestamp)) }}
              </div>
            </div>
          </div>
          <div class="more"><van-icon name="arrow" color="#c0c0c0" /></div>
        </div>
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
import tether from '@/assets/icons/tether.svg'
import utils from '@/common/utils'

const router = useRouter()
const wallet = ref(null)
const transactions = ref([])
const loading = ref(false)
const refreshing = ref(false)
const finished = ref(false)

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
})

onUnmounted(() => {
  if (backButton.isMounted()) {
    backButton.offClick(backListener)
  }
})

let page = 1
let limit = 20
let fingerprint = undefined
const onRefresh = () => {
  page = 1
  refreshing.value = true
  loading.value = false
  fingerprint = undefined
  loadUSDT()
  onLoad()
}

const onLoad = async () => {
  try {
    loading.value = true
    let res = await request('/api/wallet/tron/usdt/history', 'POST', {
      address: wallet.value.address,
      fingerprint,
      page,
      limit
    })
    refreshing.value = false
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      let res_transactions = []
      for (let index = 0; index < res.data.transactions.length; index++) {
        const transaction = res.data.transactions[index]
        if (transaction.type == 'Transfer' && parseInt(transaction.value) >= 1 * 10 ** 6) {
          res_transactions.push(transaction)
        }
      }
      if (page == 1) {
        transactions.value = res_transactions
      } else {
        transactions.value = [...transactions.value, ...res_transactions]
      }
      if (res.data.transactions.length == 0 || !res.data.fingerprint) {
        finished.value = true
      }
      fingerprint = res.data.fingerprint
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
    finished.value = true
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

const viewDetail = (transaction) => {
  if (!backButton.isMounted()) return
  let url = ''
  if (process.env.NODE_ENV === 'development') {
    url = `https://nile.tronscan.org/#/transaction/${transaction.transaction_id}`
  } else {
    url = `https://tronscan.org/#/transaction/${transaction.transaction_id}`
  }
  openLink(url, {
    tryBrowser: 'chrome',
    tryInstantView: true
  })
}

const loadUSDT = async () => {
  try {
    let res = await request('/api/wallet/tron/usdt/balance', 'POST', {
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
