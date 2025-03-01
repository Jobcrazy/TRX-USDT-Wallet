<template>
  <div class="wallet" @click.stop="onClick">
    <div class="top">
      <div class="name">
        {{ orgAlias }}
      </div>
      <div class="rename" v-if="props.editable">
        <van-icon name="records-o" size="1.5rem" @click.stop="showRename = true" />
      </div>
    </div>
    <div class="middle">
      <div class="address">{{ props.wallet.address }}</div>
      <div class="copy" v-if="props.copyable">
        <van-icon name="notes-o" size="1.5rem" @click.stop="copyAddress" />
      </div>
    </div>
    <div class="info" v-if="props.info" @click="router.push({ name: 'Freeze' })">
      <div class="item">
        <div class="name">
          <div class="left">能量</div>
          <div class="right">{{ enLeft }} / {{ energy }}</div>
        </div>
        <div>
          <van-progress
            :percentage="enPercent"
            stroke-width="2"
            :show-pivot="false"
            color="#f2826a"
          />
        </div>
        <div class="staked-left" v-if="props.showStake">已质押 {{ stakedEnergy }} 个TRX</div>
      </div>
      <div class="divider"></div>
      <div class="item">
        <div class="name">
          <div class="left">带宽</div>
          <div class="right">{{ bwLeft }} / {{ bandwidth }}</div>
        </div>
        <div>
          <van-progress
            :percentage="bwPercent"
            stroke-width="2"
            :show-pivot="false"
            color="#52c41a"
          />
        </div>
        <div class="staked-right" v-if="props.showStake">已质押 {{ stakedBandwidth }} 个TRX</div>
      </div>
    </div>
  </div>

  <van-overlay :show="showRename" z-index="9999">
    <div class="wrapper" @click.stop>
      <div class="block">
        <div class="dlg_title">
          <div class="title">重命名子账户</div>
          <div @click="showRename = false"><van-icon name="cross" /></div>
        </div>
        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-field
              v-model="alias"
              maxlength="10"
              placeholder="子账户别名不能重复"
              :rules="[{ required: true, message: '请填写账户别名' }]"
              :disabled="loading"
            />
          </van-cell-group>
          <div style="margin: 16px">
            <van-button block type="primary" native-type="submit" :loading="loading">
              重命名
            </van-button>
          </div>
        </van-form>
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import request from '@/common/request'
import utils from '@/common/utils'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import copy from 'copy-to-clipboard'

const props = defineProps({
  wallet: {
    type: Object,
    default: null
  },
  editable: {
    type: Boolean,
    default: false
  },
  copyable: {
    type: Boolean,
    default: false
  },
  info: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  },
  showStake: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Number,
    default: 0
  }
})

const router = useRouter()
const bandwidth = ref(0)
const bwLeft = ref(0)
const energy = ref(0)
const enLeft = ref(0)
const bwPercent = ref(0)
const enPercent = ref(0)
const alias = ref('')
const showRename = ref(false)
const loading = ref(false)
const orgAlias = ref('')
const stakedEnergy = ref(0)
const stakedBandwidth = ref(0)

onMounted(() => {
  if (props.info) loadData()
  if (props.showStake) refreshStaked()
  alias.value = props.wallet.alias
  orgAlias.value = props.wallet.alias
})

const loadData = async () => {
  try {
    let res = await request('/api/wallet/tron/resources', 'POST', { address: props.wallet.address })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      bandwidth.value = res.data.freeNetLimit ?? 0
      let bwUsed = res.data.freeNetUsed ?? 0
      energy.value = res.data.EnergyLimit ?? 0
      let enUsed = res.data.EnergyUsed ?? 0
      bwLeft.value = bandwidth.value - bwUsed
      enLeft.value = energy.value - enUsed
      if (bandwidth.value) {
        bwPercent.value =
          bandwidth.value != 0 ? (parseFloat(bwLeft.value) / parseFloat(bandwidth.value)) * 100 : 0
      }
      if (energy.value) {
        enPercent.value =
          energy.value != 0 ? (parseFloat(enLeft.value) / parseFloat(energy.value)) * 100 : 0
      }
      if (bandwidth.value > 1000) bandwidth.value = parseInt(bandwidth.value / 1000) + 'K'
      if (bwLeft.value > 1000) bwLeft.value = parseInt(bwLeft.value / 1000) + 'K'
      if (enLeft.value > 1000) enLeft.value = parseInt(enLeft.value / 1000) + 'K'
      if (energy.value > 1000) energy.value = parseInt(energy.value / 1000) + 'K'
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (err) {
    console.log(err)
  }
}

const copyAddress = async () => {
  try {
    copy(props.wallet.address)
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

const onClick = () => {
  if (props.clickable) {
    localStorage.setItem('wallet', JSON.stringify(props.wallet))
    router.push({ name: 'Wallet' })
  }
}

const onSubmit = async () => {
  try {
    if (alias.value == orgAlias.value) {
      showRename.value = false
      return
    }
    loading.value = true
    let res = await request('/api/wallet/tron/rename', 'POST', {
      id: props.wallet.id,
      alias: alias.value,
      userId: props.wallet.userId
    })
    loading.value = false
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      showRename.value = false
      orgAlias.value = alias.value
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

const refreshStaked = async () => {
  try {
    let res = await request('/api/wallet/tron/account', 'POST', {
      address: props.wallet.address
    })
    if (res.code && res.type == 'login') {
      return router.replace({ name: 'Login' })
    } else if (!res.code) {
      if (!res.data.frozenV2) return
      for (let index = 0; index < res.data.frozenV2.length; index++) {
        const staked = res.data.frozenV2[index]
        if (!staked.type || staked.type == '' || staked.type == 'BANDWIDTH') {
          stakedBandwidth.value = utils.numFormat((staked.amount ?? 0) / 10 ** 6)
        } else if (staked.type == 'ENERGY') {
          stakedEnergy.value = utils.numFormat((staked.amount ?? 0) / 10 ** 6)
        }
      }
    } else {
      showToast({
        message: res.message,
        position: 'bottom'
      })
    }
  } catch (error) {
    showToast({
      message: error.message,
      position: 'bottom'
    })
  }
}

watch(
  () => props.timestamp,
  () => {
    if (props.info) loadData()
    if (props.showStake) refreshStaked()
  }
)
</script>

<style scoped lang="scss">
.wallet {
  background-color: #e96062;
  border-radius: 5px;
  margin: 10px 0;
  padding: 10px 0 0 0;
  color: white;
}

.top {
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  padding: 0 10px;

  .name {
    font-size: 28px;
  }
}

.middle {
  display: flex;
  align-items: center;
  padding: 0 10px 10px 10px;

  .address {
    font-size: 14px;
    flex-grow: 1;
  }
}

.info {
  background-color: #3c3d42;
  display: flex;
  padding-bottom: 10px;
  padding: 5px 10px 10px 5px;
  border-radius: 0 0 5px 5px;

  .item {
    width: 50%;
    padding: 5px 5px;
    .name {
      padding: 0 0 5px 0;
      font-size: 12px;
      flex-grow: 1;
      display: flex;
      justify-content: center;
      .left {
        display: flex;
        flex-grow: 1;
      }
      .right {
        display: flex;
        align-items: end;
      }
    }
    .staked-left {
      display: flex;
      align-items: center;
      justify-content: start;
      font-size: 12px;
      padding: 5px 0 0 0;
    }
    .staked-right {
      display: flex;
      align-items: center;
      justify-content: end;
      font-size: 12px;
      padding: 5px 0 0 0;
    }
  }
  .divider {
    width: 10px;
  }
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
