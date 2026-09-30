// ========== MOCK AUTH SERVICE ==========
// FUTURE REPLACEMENT:
// This file can be replaced with src/services/api/authService.js
// which will call:
//   POST /api/auth/login  -> { user, token }
//   POST /api/auth/logout
//   GET  /api/auth/me     -> current user
// The UI in LoginScreen + AuthContext will not change.

import { delay } from './_utils';
import { demoUser } from '../../data/mockUsers';

// Produce a fake JWT-shaped string for the prototype.
// Real Laravel will issue a real JWT token signed with an app key.
function mockJwtToken(studentId) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: studentId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
    }),
  );
  const sig = 'mock_sig_' + Math.random().toString(36).slice(2, 18);
  return `${header}.${payload}.${sig}`;
}

async function login(studentId, password) {
  await delay(700);

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

  const user = {
    ...demoUser,
    studentId: studentId.trim(),
  };
  return {
    success: true,
    message: 'Login successful',
    token: mockJwtToken(studentId.trim()),
    user,
  };
}

async function logout() {
  await delay(300);
  return { success: true };
}

async function getCurrentUser() {
  await delay(200);
  return { success: true, user: demoUser };
}

export const authService = {
  login,
  logout,
  getCurrentUser,
};

export default authService;
