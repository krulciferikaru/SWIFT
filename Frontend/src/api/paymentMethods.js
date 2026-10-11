import api from './axios'

const paymentMethodsApi = {
  // Active methods, in order: for the payment form and the report filters.
  getActive: () => api.get('/payment-methods'),
  // Admin only: every method, with how many payments use it.
  getAll: () => api.get('/payment-methods', { params: { all: 1 } }),
  create: (name) => api.post('/payment-methods', { name }),
  update: (id, data) => api.put(`/payment-methods/${id}`, data),
  remove: (id) => api.delete(`/payment-methods/${id}`),
}

export default paymentMethodsApi
