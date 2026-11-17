import type { ProblemDetail } from './tipos'

export const URL_API: string = import.meta.env.VITE_API_URL || 'http://localhost:8080'

/** Avisado quando a API recusa um token (401): o AuthContext volta ao login. */
export const EVENTO_SESSAO_EXPIRADA = 'oncotimize:sessao-expirada'

export const CHAVE_TOKEN = 'oncotimize.token'

// Cada aba fixa o token em memória na primeira leitura: o que outra aba gravar só chega por `recarregar()`
// (evento `storage` no AuthContext), para o usuário exibido e o token enviado nunca divergirem.
// Se o localStorage lançar (navegação privada, armazenamento bloqueado), o token vive só em memória.
let tokenEmMemoria: string | null | undefined

export const tokenSalvo = {
  ler(): string | null {
    if (tokenEmMemoria === undefined) {
      try {
        tokenEmMemoria = localStorage.getItem(CHAVE_TOKEN)
      } catch {
        tokenEmMemoria = null
      }
    }
    return tokenEmMemoria
  },
  /** Esquece o token da aba; a próxima leitura volta ao localStorage. */
  recarregar() {
    tokenEmMemoria = undefined
  },
  salvar(token: string) {
    tokenEmMemoria = token
    try {
      localStorage.setItem(CHAVE_TOKEN, token)
    } catch {
      /* fica só em memória */
    }
  },
  apagar() {
    tokenEmMemoria = null
    try {
      localStorage.removeItem(CHAVE_TOKEN)
    } catch {
      /* nada a apagar */
    }
  },
}

export class ErroApi extends Error {
  readonly status: number
  readonly titulo: string
  readonly erros?: Record<string, string>

  constructor(status: number, titulo: string, detalhe: string, erros?: Record<string, string>) {
    super(detalhe)
    this.name = 'ErroApi'
    this.status = status
    this.titulo = titulo
    this.erros = erros
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface Opcoes {
  metodo?: Metodo
  corpo?: unknown
  /** Login: não envia o token salvo, e o 401 dele é credencial errada, não sessão expirada. */
  semSessao?: boolean
}

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = opcoes.semSessao ? null : tokenSalvo.ler()
  const cabecalhos: Record<string, string> = { Accept: 'application/json' }
  if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json'
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  let resposta: Response
  try {
    resposta = await fetch(URL_API + caminho, {
      method: opcoes.metodo ?? 'GET',
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    })
  } catch {
    throw new ErroApi(0, 'Sem conexão', `Não foi possível falar com a API em ${URL_API}. Confira se ela está rodando.`)
  }

  if (!resposta.ok) {
    // Só encerra a sessão se o token recusado ainda for o atual (um login novo pode ter chegado no meio).
    if (resposta.status === 401 && token && token === tokenSalvo.ler()) {
      tokenSalvo.apagar()
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA))
    }
    const problema = await lerProblema(resposta)
    throw new ErroApi(
      resposta.status,
      problema.title ?? `Erro ${resposta.status}`,
      problema.detail ?? 'A API recusou a operação sem explicar o motivo.',
      problema.erros,
    )
  }

  const texto = await resposta.text()
  return (texto ? JSON.parse(texto) : undefined) as T
}

async function lerProblema(resposta: Response): Promise<ProblemDetail> {
  try {
    return (await resposta.json()) as ProblemDetail
  } catch {
    return {}
  }
}
