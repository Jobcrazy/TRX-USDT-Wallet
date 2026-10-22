import axios from 'axios'
import { getToken } from './session'
import { localizeApiResponse, t } from '@/i18n'

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
        resolve(localizeApiResponse(result.data))
      })
      .catch((error) => {
        console.log(error)
        if (error.response?.data && typeof error.response.data.code === 'number') {
          resolve(localizeApiResponse(error.response.data))
          return
        }
        reject(new Error(t('api.network'), { cause: error }))
      })
  })
}
