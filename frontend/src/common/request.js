import axios from 'axios'
import { getToken } from './session'

export default (url, method, data) => {
  const token = getToken()
  return new Promise((resolve, reject) => {
    axios({
      method: method,
      headers: {
        /*"content-type": "application/json",*/
        token
      },
      url,
      data: method !== 'GET' && data ? data : null,
      params: method === 'GET' && data ? data : null
    })
      .then((result) => {
        resolve(result.data)
      })
      .catch((error) => {
        console.log(error)
        reject(error)
      })
  })
}
