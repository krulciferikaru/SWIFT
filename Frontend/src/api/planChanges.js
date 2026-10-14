import api from './axios'

const planChangeApi = {
  request: (subscriberId, data) => api.post(`/subscribers/${subscriberId}/plan-change`, data),
  complete: (id, early = false) => api.post(`/plan-changes/${id}/complete`, { early }),
  cancel: (id) => api.post(`/plan-changes/${id}/cancel`),
}

export default planChangeApi
