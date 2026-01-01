import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAuthHeader = (isAdmin = false) => {
  const token = isAdmin 
    ? localStorage.getItem('adminToken') 
    : localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Plans
export const getPlans = () => axios.get(`${API}/plans`);
export const getAdminPlans = () => axios.get(`${API}/admin/plans`, { headers: getAuthHeader(true) });
export const createPlan = (data) => axios.post(`${API}/admin/plans`, data, { headers: getAuthHeader(true) });
export const updatePlan = (id, data) => axios.put(`${API}/admin/plans/${id}`, data, { headers: getAuthHeader(true) });
export const deletePlan = (id) => axios.delete(`${API}/admin/plans/${id}`, { headers: getAuthHeader(true) });
export const seedPlans = () => axios.post(`${API}/admin/seed-plans`, {}, { headers: getAuthHeader(true) });

// Orders
export const createOrder = (data) => axios.post(`${API}/orders`, data, { headers: getAuthHeader() });
export const getUserOrders = () => axios.get(`${API}/orders`, { headers: getAuthHeader() });
export const getAdminOrders = (status) => axios.get(`${API}/admin/orders${status ? `?status=${status}` : ''}`, { headers: getAuthHeader(true) });
export const approveOrder = (id) => axios.post(`${API}/admin/orders/${id}/approve`, {}, { headers: getAuthHeader(true) });
export const rejectOrder = (id) => axios.post(`${API}/admin/orders/${id}/reject`, {}, { headers: getAuthHeader(true) });

// Users (Admin)
export const getUsers = (search, page = 1) => axios.get(`${API}/admin/users?page=${page}${search ? `&search=${search}` : ''}`, { headers: getAuthHeader(true) });
export const updateUser = (id, data) => axios.put(`${API}/admin/users/${id}`, data, { headers: getAuthHeader(true) });
export const deleteUser = (id) => axios.delete(`${API}/admin/users/${id}`, { headers: getAuthHeader(true) });
export const addUserCredits = (id, credits) => axios.post(`${API}/admin/users/${id}/add-credits?credits=${credits}`, {}, { headers: getAuthHeader(true) });

// Voices
export const getMyVoices = () => axios.get(`${API}/voices/my`, { headers: getAuthHeader() });
export const getPublicVoices = () => axios.get(`${API}/voices/public`);
export const cloneVoice = (formData) => axios.post(`${API}/voices/clone`, formData, { 
  headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } 
});
export const deleteVoice = (id) => axios.delete(`${API}/voices/${id}`, { headers: getAuthHeader() });
export const generateVoice = (data) => axios.post(`${API}/voices/generate`, data, { headers: getAuthHeader() });
export const getGenerationStatus = (jobId) => axios.get(`${API}/voices/generate/status/${jobId}`, { headers: getAuthHeader() });

// Admin Voices
export const clonePublicVoice = (formData) => axios.post(`${API}/admin/voices/clone-public`, formData, { 
  headers: { ...getAuthHeader(true), 'Content-Type': 'multipart/form-data' } 
});
export const deletePublicVoice = (id) => axios.delete(`${API}/admin/voices/${id}`, { headers: getAuthHeader(true) });

// Stats
export const getAdminStats = () => axios.get(`${API}/admin/stats`, { headers: getAuthHeader(true) });

// Payment Accounts
export const getPaymentAccounts = () => axios.get(`${API}/payment-accounts`);
export const getAdminPaymentAccounts = () => axios.get(`${API}/admin/payment-accounts`, { headers: getAuthHeader(true) });
export const createPaymentAccount = (data) => axios.post(`${API}/admin/payment-accounts`, data, { headers: getAuthHeader(true) });
export const deletePaymentAccount = (id) => axios.delete(`${API}/admin/payment-accounts/${id}`, { headers: getAuthHeader(true) });
