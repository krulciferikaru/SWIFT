import api from './axios'

const barangaysApi = {
  // The addresses on offer ("Malete, Palayan City"), in order. Needs no sign-in: registration uses it.
  getActive: () => api.get('/barangays'),
  // Admin only: every barangay, with how many subscribers have it as their address.
  getAll: () => api.get('/barangays/manage'),
  create: (name) => api.post('/barangays', { name }),
  update: (id, data) => api.put(`/barangays/${id}`, data),
  remove: (id) => api.delete(`/barangays/${id}`),
}

export default barangaysApi
