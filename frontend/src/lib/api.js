import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`
});

// Request interceptor: attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: if 401 → clear token, redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if we are not already on login/register to avoid loops
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);

// Groups
export const getGroups = () => api.get('/groups');
export const getGroup = (id) => api.get(`/groups/${id}`);
export const getGroupDetail = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post('/groups', data);
export const updateGroup = (id, data) => api.put(`/groups/${id}`, data);
export const leaveGroup = (id) => api.delete(`/groups/${id}/leave`);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

// Expenses
export const getExpenses = (params) => api.get('/expenses', { params });
export const getExpense = (id) => api.get(`/expenses/${id}`);
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);
export const settleSplit = (id) => api.post(`/expenses/${id}/settle-split`);
export const getBalances = (groupId) => api.get('/expenses/balances/summary', { params: { groupId } });
export const getStatsBreakdown = (params) => api.get('/expenses/stats/breakdown', { params });

// Budget
export const setBudget = (groupId, data) => api.post(`/groups/${groupId}/budget`, data);
export const deleteBudget = (groupId) => api.delete(`/groups/${groupId}/budget`);
export const getBudgetProgress = (groupId) => api.get(`/groups/${groupId}/budget/progress`);

// Settlements
export const recordSettlement = (groupId, data) => api.post(`/groups/${groupId}/settle`, data);
export const settleAll = (groupId) => api.post(`/groups/${groupId}/settle-all`);

// Invitations

export const getMyInvitations = () => api.get('/invitations');
export const respondToInvitation = (id, data) => api.post(`/invitations/${id}/respond`, data);
export const sendInvitation = (groupId, email) => api.post(`/groups/${groupId}/invite`, { email });
// Admin cancels a specific member's pending invite
export const cancelMemberInvitation = (groupId, memberId) => api.delete(`/groups/${groupId}/invitations/${memberId}`);
export const resendInvitation = (id) => api.post(`/invitations/${id}/resend`);
export const getGroupInvitations = (groupId) => api.get(`/groups/${groupId}/invitations`);
export const verifyInviteToken = (token) => api.get(`/invite/verify/${token}`);

export default api;
