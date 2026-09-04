import api from './axios'

const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  updateStatus: (userId, account_status) => api.patch(`/users/${userId}/status`, { account_status }),
}

export default usersApi