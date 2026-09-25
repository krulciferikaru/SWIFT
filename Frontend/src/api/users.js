import api from './axios'

const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  updateStatus: (userId, account_status) => api.patch(`/users/${userId}/status`, { account_status }),
  resetPassword: (userId, data) => api.patch(`/users/${userId}/password`, data),
}

export default usersApi