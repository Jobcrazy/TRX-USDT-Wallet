let utils = {
  getDomain() {
    return ''
    /*
        if (process.env.NODE_ENV === "development") {
            return "";
        }
        return "https://4800api.azurewebsites.net/";
        */
  },
  dateFormat: function (fmt, date) {
    let o = {
      'M+': date.getMonth() + 1, //Month
      'd+': date.getDate(), //Day
      'h+': date.getHours(), //Hour
      'm+': date.getMinutes(), //Minute
      's+': date.getSeconds(), //Second
      'q+': Math.floor((date.getMonth() + 3) / 3), //Quarter
      S: date.getMilliseconds() //Milliseconds
    }
    if (/(y+)/.test(fmt))
      fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
    for (let k in o)
      if (new RegExp('(' + k + ')').test(fmt))
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
        )
    return fmt
  },
  numFormat: (number, digits = 2) => {
    // 将数字转换为字符串，使用固定的小数位数
    const parts = number.toString().split('.')
    const integerPart = parts[0]
    let decimalPart = parts[1] || ''

    // 截取小数部分到指定位数，不四舍五入
    decimalPart = decimalPart.slice(0, digits)

    // 添加千位分隔符
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    // 拼接整数部分和小数部分
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
  }
}

export default utils
