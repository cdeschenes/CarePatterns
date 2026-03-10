/**
 * Axios instance shared across all API modules.
 *
 * Base URL is empty string — in development, Vite's proxy forwards /api/*
 * to the backend at localhost:8000. In production (Docker), nginx proxies
 * /api/* to http://backend:8000, so the same empty baseURL works.
 *
 * Auth: every request carries Authorization: Bearer <VITE_API_TOKEN>.
 * The token is baked into the bundle at build time. See .env.example.
 *
 * Errors are logged to console in the response interceptor. Callers still
 * receive the rejected promise — nothing is swallowed silently.
 */

import axios, { type AxiosError } from 'axios'

const client = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_API_TOKEN as string | undefined
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url ?? '(unknown)'
    console.error(`[API] ${status ?? 'Network error'} on ${url}`, error.message)
    return Promise.reject(error)
  },
)

export default client
