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

/** Listas da API: Spring Data PagedModel. */
export interface Pagina<T> {
  content: T[]
  page: { size: number; number: number; totalElements: number; totalPages: number }
}

/** MedicamentoController */
export interface Medicamento {
  id: string
  nome: string
  codigoInterno: string | null
}

/** FrascosController (apresentação do medicamento: volume, custo, estoque). */
export interface Frasco {
  id: string
  medicamentoId: string
  volumeMg: number
  custo: number
  quantidadeEstoque: number
  descricaoTasy: string | null
}

export type StatusPrescricao = 'APTO' | 'NAO_APTO'

/** PrescricaoController: uma linha por quimioterápico. */
export interface Prescricao {
  id: string
  codigoPrescricao: string
  medicamentoId: string
  doseMg: number
  status: StatusPrescricao
  dataPrescricao: string
  aplicacaoId: string | null
}

/** INFACTIVEL e ERRO existem no enum da API, mas nada os atribui hoje. */
export type StatusOtimizacao = 'CONCLUIDA' | 'CONFIRMADA' | 'RECUSADA' | 'INFACTIVEL' | 'ERRO'

/** OtimizacaoController: plano de abertura de frascos de um medicamento num dia. */
export interface Otimizacao {
  id: string
  medicamentoId: string
  data: string
  status: StatusOtimizacao
  confirmadaEm: string | null
  recusadaEm: string | null
  recusadaPor: string | null
  motivoRecusa: string | null
  custoOtimizado: number
  custoSemCompartilhamento: number
  economia: number
  desperdicioMg: number
  /** numeroFrasco conta dentro de cada apresentação: (apresentacaoId, numeroFrasco) identifica o frasco. */
  frascosAbertos: { apresentacaoId: string; volumeMg: number; custo: number; numeroFrasco: number }[]
  /** fracao = parte do frasco que vai para a prescrição (0 a 1). */
  alocacoes: { codigoPrescricao: string; apresentacaoId: string; numeroFrasco: number; fracao: number; volumeMg: number }[]
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
