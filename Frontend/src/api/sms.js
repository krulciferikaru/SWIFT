import api from './axios'

const smsApi = {
  send: (phone, message) => api.post('/sms/send', { phone, message }),
}

export default smsApi
