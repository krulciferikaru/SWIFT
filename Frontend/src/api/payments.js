import api from "./axios";

const paymentsApi = {
  getBilling: (subscriberId) => api.get(`/subscribers/${subscriberId}/billing`),
  getHistory: (subscriberId) =>
    api.get(`/subscribers/${subscriberId}/payments`),
  create: (subscriberId, data) =>
    api.post(`/subscribers/${subscriberId}/payments`, data),
  getMyBilling: () => api.get("/me/billing"),
  getMyPayments: () => api.get("/me/payments"),
};

export default paymentsApi;
