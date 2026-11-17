// DTOs da API (fonte: oncoDoseAPI/src/main/java/br/edu/ufersa/pw/oncotimize/application/api).

/** AuthController: POST /api/auth/login */
export interface TokenResponse {
  token: string
}

/** UserController: GET /api/users/me. `role` vem sem o prefixo ROLE_. */
export interface UsuarioAutenticado {
  id: string
  username: string
  name: string | null
  role: 'ADMIN' | 'USER' | null
}

/** RFC 9457, como devolvido pelo GlobalExceptionHandler. `erros` só nos 400 de validação. */
export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  timestamp?: string
  erros?: Record<string, string>
}
