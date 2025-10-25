import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  response => response,
  error => {
    console.error('Erro na API:', error);
    return Promise.reject(error);
  }
);

export const chatbotService = {
  connect: () => api.post('/chatbot/connect'),
  disconnect: () => api.post('/chatbot/disconnect'),
  pause: () => api.post('/chatbot/pause'),
  resume: () => api.post('/chatbot/resume'),
  getQR: () => api.get('/chatbot/qr'),
  getStatus: () => api.get('/chatbot/status'),
  getSessions: () => api.get('/chatbot/sessions')
};

export const osService = {
  create: (data) => {
    const formData = new FormData();
    
    formData.append('cliente_nome', data.cliente_nome);
    formData.append('cliente_telefone', data.cliente_telefone);
    if (data.cliente_email) formData.append('cliente_email', data.cliente_email);
    formData.append('prazo_entrega', data.prazo_entrega);
    formData.append('forma_pagamento', data.forma_pagamento);
    formData.append('desconto_total', data.desconto_total || 0);
    formData.append('itens', JSON.stringify(data.itens));
    
    if (data.imagem_projeto) {
      formData.append('imagem_projeto', data.imagem_projeto);
    }
    
    return api.post('/os', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  list: (params) => api.get('/os', { params }),
  getById: (id) => api.get(`/os/${id}`),
  downloadPDF: (id) => api.get(`/os/${id}/pdf`, { responseType: 'blob' }),
  update: (id, data) => api.put(`/os/${id}`, data),
  delete: (id) => api.delete(`/os/${id}`)
};

export const calendarService = {
  createEvent: (data) => api.post('/calendar/event', data),
  getAvailableSlots: (date) => api.get('/calendar/available-slots', { params: { date } })
};

export default api;