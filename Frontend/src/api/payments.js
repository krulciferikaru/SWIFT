import api from "./axios";

const paymentsApi = {
  getBilling: (subscriberId) => api.get(`/subscribers/${subscriberId}/billing`),
  getHistory: (subscriberId) =>
    api.get(`/subscribers/${subscriberId}/payments`),
  create: (subscriberId, data) =>
    api.post(`/subscribers/${subscriberId}/payments`, data),
  void: (paymentId, reason) => api.post(`/payments/${paymentId}/void`, { reason }),
  nextOrNumber: () => api.get("/payments/next-or-number"),
  getStatusHistory: (subscriberId) => api.get(`/subscribers/${subscriberId}/status-history`),
  getMyStatusHistory: () => api.get("/me/status-history"),
  getMyBilling: () => api.get("/me/billing"),
  getMyPayments: () => api.get("/me/payments"),
  getFinancialSummary: () => api.get('/reports/financial-summary'),
};

export default paymentsApi;
