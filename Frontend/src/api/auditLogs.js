import api from './axios'

const auditLogsApi = {
  getAll: (params = {}) => api.get('/audit-logs', { params }),
}

export default auditLogsApi
