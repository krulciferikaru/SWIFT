import api from './axios'

const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  updateStatus: (userId, account_status) => api.patch(`/users/${userId}/status`, { account_status }),
  getPermissionCatalog: () => api.get('/permissions'),
  // The admin's own current authenticator code is sent along (the server asks for it when the admin has two-step on).
  resetMfa: (userId, code) => api.post(`/users/${userId}/mfa/reset`, { code }),
  updatePermissions: (userId, permissions, code) => api.patch(`/users/${userId}/permissions`, { permissions, code }),
}

export default usersApi