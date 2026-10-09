import { apiRequest, setAuthToken } from './client';

export async function login(studentId, password) {
  if (!studentId || studentId.trim().length !== 8 || !/^\d{8}$/.test(studentId)) {
    return {
      success: false,
      message: 'Student ID must be 8 digits',
    };
  }
  if (!password || password.trim().length === 0) {
    return {
      success: false,
      message: 'Password is required',
    };
  }

  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: {
      studentId: studentId.trim(),
      password,
    },
  });

  if (!res.success) {
    return {
      success: false,
      message: res.message || 'Invalid student ID or password',
    };
  }

  const token = res.data?.token;
  const user = res.data?.user;

  if (token) {
    setAuthToken(token);
  }

  return {
    success: true,
    message: res.message || 'Login successful',
    token,
    user,
  };
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
  return { success: true };
}

export async function getCurrentUser() {
  const res = await apiRequest('/auth/me', { method: 'GET' });
  if (res.success && res.data?.user) {
    return { success: true, user: res.data.user };
  }
  return { success: false, message: res.message };
}

export const authService = {
  login,
  logout,
  getCurrentUser,
};

export default authService;
