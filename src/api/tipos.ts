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

/** ProtocoloController: protocolo do paciente com os quimioterápicos e todas as aplicações. */
export interface Protocolo {
  id: string
  codigoProtocolo: string
  medicacaoSubtipo: string
  grupo: string | null
  dataInicio: string
  ciclos: number
  diasIntervalo: number
  intervaloMinimoDias: number
  totalAplicacoes: number
  medicamentos: { medicamentoId: string; doseMg: number; via: string; diasAplicacao: string }[]
  aplicacoes: {
    id: string
    numero: number
    cicloNumero: number
    diaCiclo: number
    dataPrevista: string
    dataAgendada: string
    dataReal: string | null
    status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA'
    motivoAlteracao: string | null
  }[]
}

/** AplicacaoController: GET /api/aplicacoes?data= (agenda do dia, pela data agendada). */
export interface AplicacaoDoDia {
  id: string
  protocoloId: string
  codigoProtocolo: string
  numero: number
  dataPrevista: string
  dataAgendada: string
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA'
  motivoAlteracao: string | null
  medicamentos: { medicamentoId: string; doseMg: number; via: string }[]
}

export type StatusSugestao ='SUGERIDA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA'

/** AgendaController / AplicacaoController: remarcação sugerida para uma aplicação (agenda ou paciente não apto). */
export interface SugestaoRemarcacao {
  id: string
  aplicacaoId: string
  codigoProtocolo: string
  numero: number
  tipo: 'AGENDA' | 'NAO_APTO'
  origem: string
  destino: string
  economiaEstimada: number
  motivoRemarcacao: string | null
  status: StatusSugestao
  geradaEm: string
  decididaEm: string | null
  decididaPor: string | null
  motivoDecisao: string | null
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
