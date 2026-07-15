import api from './axios'

const paymentsApi = {
  getBilling: (subscriberId) => api.get(`/subscribers/${subscriberId}/billing`),
  getHistory: (subscriberId) => api.get(`/subscribers/${subscriberId}/payments`),
  create: (subscriberId, data) => api.post(`/subscribers/${subscriberId}/payments`, data),
}

export default paymentsApi