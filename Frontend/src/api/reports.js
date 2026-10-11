import api from './axios'

const reportApi = {
  getSubscribers: (params = {}) => api.get('/reports/subscribers', { params }),

  getCollections: (params = {}, config = {}) =>
    api.get('/reports/collections', { params, ...config }),


  downloadSubscribers: (params = {}) =>
    api.get('/reports/subscribers', { params, responseType: 'blob' }),

  downloadSubscribersXlsx: (params = {}) =>
    api.get('/reports/subscribers/xlsx', { params, responseType: 'blob' }),

  downloadCollectionsPdf: (params = {}) =>
    api.get('/reports/collections/pdf', { params, responseType: 'blob' }),

  downloadCollectionsXlsx: (params = {}) =>
    api.get('/reports/collections/xlsx', { params, responseType: 'blob' }),



  previewSubscribers: (params = {}) =>
    api.get('/reports/subscribers', { params, responseType: 'blob' }),
}

export default reportApi
