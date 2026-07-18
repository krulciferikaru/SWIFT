import api from './axios'

const reportApi = {
  getSubscribers: (params = {}) => api.get('/reports/subscribers', { params }),

  getCollections: (params = {}) => api.get('/reports/collections', { params }),

  getFinancialStatement: (params = {}) =>
    api.get('/reports/financial-statement', { params }),

  downloadSubscribers: (params = {}) =>
    api.get('/reports/subscribers', { params, responseType: 'blob' }),

  downloadCollectionsPdf: (params = {}) =>
    api.get('/reports/collections/pdf', { params, responseType: 'blob' }),

  downloadCollectionsXlsx: (params = {}) =>
    api.get('/reports/collections/xlsx', { params, responseType: 'blob' }),

  downloadFinancialStatementPdf: (params = {}) =>
    api.get('/reports/financial-statement/pdf', { params, responseType: 'blob' }),

  downloadFinancialStatementXlsx: (params = {}) =>
    api.get('/reports/financial-statement/xlsx', { params, responseType: 'blob' }),

  previewSubscribers: (params = {}) =>
    api.get('/reports/subscribers', { params, responseType: 'blob' }),
}

export default reportApi
