export const defaultCredentials = {
  email: process.env.E2E_USER_EMAIL ?? 'dev@ggai.dev',
  password: process.env.E2E_USER_PASSWORD ?? 'Dev@2025!',
};

export const routes = {
  login: '/login',
  dashboard: '/',
};

export const selectors = {
  loginButton: /entrar/i,
  dashboardSearchPlaceholder: 'Pesquisar em todos os sistemas...',
};
