<template>
  <div class="item">
    <div class="left">
      <van-image :src="icon" class="logo">
        <template #error>{{ $t('common.failedToLoad') }}</template>
      </van-image>
      <div class="name">{{ name }}</div>
    </div>
    <div class="right">
      <div class="amount">{{ displayBalance }}</div>
      <div v-if="showValue && balance != null" class="value">{{ valueInUsdt }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Decimal from 'decimal.js'
import utils from '@/common/utils'

const props = defineProps({
  icon: { type: String, required: true },
  name: { type: String, required: true },
  balance: { type: [String, Number], default: null },
  decimals: { type: Number, default: 2 },
  fixedDecimals: { type: Boolean, default: true },
  showValue: { type: Boolean, default: false },
  rate: { type: [String, Number], default: null },
  smallAmount: { type: Boolean, default: false }
})

const { t } = useI18n({ useScope: 'global' })
const displayBalance = computed(() => {
  if (props.balance == null) return '—'
  if (props.fixedDecimals) return utils.fixedFormat(props.balance, props.decimals)
  if (props.smallAmount) {
    const amount = new Decimal(props.balance)
    const min = new Decimal(10).pow(-props.decimals)
    if (amount.gt(0) && amount.lt(min)) return `<${min.toFixed(props.decimals)}`
  }
  const formatted = utils.numFormat(props.balance, props.decimals)
  return formatted.includes('.') ? formatted.replace(/0+$/, '').replace(/\.$/, '') : formatted
})
const valueInUsdt = computed(() =>
  props.rate == null
    ? t('wallet.priceUnavailable')
    : `≈ ${new Decimal(props.balance).mul(props.rate).toDecimalPlaces(2).toFixed(2)} USDT`
)
</script>

<style scoped lang="scss">
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
    min-width: 0;
    .amount {
      font-size: 24px;
      overflow-wrap: anywhere;
      text-align: right;
    }
    .value {
      font-size: 12px;
      color: #969799;
    }
  }
}
</style>
