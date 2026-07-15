import api from './axios'

const subscriberApi = {
  /**
   * Get paginated subscriber list
   * @param {Object} params - { search, status, plan_id, page, per_page }
   */
  getAll: (params = {}) =>
    api.get('/subscribers', { params }),

  /**
   * Get a single subscriber with payment history
   */
  getOne: (id) =>
    api.get(`/subscribers/${id}`),

  /**
   * Get dashboard summary counts
   */
  getSummary: () =>
    api.get('/subscribers/summary'),

  /**
   * Create a new subscriber
   */
  create: (data) =>
    api.post('/subscribers', data),

  /**
   * Update subscriber details
   */
  update: (id, data) =>
    api.put(`/subscribers/${id}`, data),

  /**
   * Quick status update
   */
  updateStatus: (id, status) =>
    api.patch(`/subscribers/${id}/status`, { status }),

  /**
   * Delete a subscriber
   */
  delete: (id) =>
    api.delete(`/subscribers/${id}`),

  checkDuplicate: (name) => api.get('/subscribers/check-duplicate', { params: { name } }),
}

export default subscriberApi
