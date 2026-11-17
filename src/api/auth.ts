import { requisitar } from './cliente'
import type { TokenResponse, UsuarioAutenticado } from './tipos'

export function entrar(email: string, senha: string): Promise<TokenResponse> {
  return requisitar<TokenResponse>('/api/auth/login', {
    metodo: 'POST',
    corpo: { username: email, password: senha },
    semSessao: true,
  })
}

export function buscarUsuarioAtual(): Promise<UsuarioAutenticado> {
  return requisitar<UsuarioAutenticado>('/api/users/me')
}
