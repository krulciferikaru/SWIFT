import api from './axios'

const archiveApi = {
  getSubscribers: (params = {}) => api.get('/archive/subscribers', { params }),
  restoreSubscriber: (id) => api.patch(`/archive/subscribers/${id}/restore`),
  deleteSubscriber: (id) => api.delete(`/archive/subscribers/${id}`),

  getPlans: () => api.get('/archive/plans'),
  restorePlan: (id) => api.patch(`/archive/plans/${id}/restore`),
  deletePlan: (id) => api.delete(`/archive/plans/${id}`),
}

export default archiveApi
