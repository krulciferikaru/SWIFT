import api from './axios'

const planChangeApi = {
  request: (subscriberId, data) => api.post(`/subscribers/${subscriberId}/plan-change`, data),
  complete: (id) => api.post(`/plan-changes/${id}/complete`),
  cancel: (id) => api.post(`/plan-changes/${id}/cancel`),
}

export default planChangeApi
