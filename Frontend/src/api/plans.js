import api from './axios'

const planApi = {
  getAll: () => api.get('/plans'),
}

export default planApi
