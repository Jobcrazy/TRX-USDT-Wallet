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
    // Convert the number to a string with fixed decimal places
    const parts = number.toString().split('.')
    const integerPart = parts[0]
    let decimalPart = parts[1] || ''

    // Truncate the fractional part without rounding
    decimalPart = decimalPart.slice(0, digits)

    // Add thousands separators
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

    // Join the integer and fractional parts
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
  }
}

export default utils
