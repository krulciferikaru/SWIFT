import api from './axios'

const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  updateRole: (userId, role) => api.patch(`/users/${userId}/role`, { role }),
  updateStatus: (userId, account_status) => api.patch(`/users/${userId}/status`, { account_status }),
}

export default usersApi