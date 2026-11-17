import { requisitar } from './cliente'
import type { AplicacaoDoDia, Pagina, Prescricao, StatusSugestao, SugestaoRemarcacao } from './tipos'

const parametros = (valores: Record<string, string>) => new URLSearchParams(valores).toString()

/** Agenda do dia: aplicações pela data agendada (inclui as que chegaram por remarcação). */
export async function listarAplicacoesDoDia(data: string): Promise<AplicacaoDoDia[]> {
  const pagina = await requisitar<Pagina<AplicacaoDoDia>>(`/api/aplicacoes?${parametros({ data, size: '500' })}`)
  return pagina.content
}

/** Todas as prescrições do dia (todos os medicamentos): uma linha por quimioterápico; o código agrupa o paciente. */
export async function listarPrescricoesDoDiaTodas(data: string): Promise<Prescricao[]> {
  const pagina = await requisitar<Pagina<Prescricao>>(
    `/api/prescricoes?${parametros({ data, size: '500', sort: 'codigoPrescricao' })}`,
  )
  return pagina.content
}

/** Mais recentes primeiro; uma página de 100 basta para a demonstração. */
export async function listarSugestoes(status: StatusSugestao): Promise<SugestaoRemarcacao[]> {
  const pagina = await requisitar<Pagina<SugestaoRemarcacao>>(
    `/api/agenda/sugestoes?${parametros({ status, size: '100', sort: 'geradaEm,desc' })}`,
  )
  return pagina.content
}

/** Roda o planejador no período e grava as sugestões; as pendentes antigas das mesmas aplicações expiram. */
export function gerarSugestoes(medicamentoId: string, inicio: string, fim: string): Promise<SugestaoRemarcacao[]> {
  return requisitar<SugestaoRemarcacao[]>('/api/agenda/sugestoes', { metodo: 'POST', corpo: { medicamentoId, inicio, fim } })
}

export function aceitarSugestao(id: string, motivo: string): Promise<SugestaoRemarcacao> {
  return requisitar<SugestaoRemarcacao>(`/api/agenda/sugestoes/${id}/aceite`, {
    metodo: 'PUT',
    corpo: motivo ? { motivo } : undefined,
  })
}

export function recusarSugestao(id: string, motivo: string): Promise<SugestaoRemarcacao> {
  return requisitar<SugestaoRemarcacao>(`/api/agenda/sugestoes/${id}/recusa`, {
    metodo: 'PUT',
    corpo: motivo ? { motivo } : undefined,
  })
}

/**
 * Paciente não apto: as prescrições aptas da aplicação viram não aptas e a API sugere o dia de retorno a partir da
 * data mínima. Sem dia possível, a API responde 422, mas o não apto fica registrado.
 */
export function registrarNaoApto(aplicacaoId: string, dataMinima: string, motivo: string): Promise<SugestaoRemarcacao> {
  return requisitar<SugestaoRemarcacao>(`/api/aplicacoes/${aplicacaoId}/remarcacao`, {
    metodo: 'POST',
    corpo: { dataMinima, motivo },
  })
}
