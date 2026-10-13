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

  /**
   * Sends a balance-reminder SMS to every currently Unpaid subscriber, or, when a list of ids is
   * given, only to those people (anyone who owes nothing is skipped by the server).
   * Longer timeout: matches the backend's set_time_limit(120) since sends
   * run sequentially and can take a while with many people.
   */
  sendReminders: (subscriberIds) =>
    api.post('/subscribers/send-reminders', subscriberIds ? { subscriber_ids: subscriberIds } : null, { timeout: 130000 }),
}

export default subscriberApi
