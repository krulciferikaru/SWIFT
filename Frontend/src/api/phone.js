import api from './axios'

const phoneApi = {
  sendCode: () => api.post('/me/phone/send-code'),
  verify: (code) => api.post('/me/phone/verify', { code }),
}

export default phoneApi
