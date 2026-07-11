import api from './axios'

const reportApi = {
  downloadSubscribers: (params = {}) =>
    api.get('/reports/subscribers', {
      params,
      responseType: 'blob',
    }),

  previewSubscribers: (params = {}) =>
    api.get('/reports/subscribers', {
      params,
      responseType: 'blob',
    }),
}

export default reportApi
