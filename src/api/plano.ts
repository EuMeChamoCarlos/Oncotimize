import { requisitar } from './cliente'
import type { Frasco, Medicamento, Otimizacao, Pagina, Prescricao } from './tipos'

// Listas pequenas (um dia de um medicamento): uma página só basta.
const parametros = (valores: Record<string, string>) => new URLSearchParams(valores).toString()

export async function listarMedicamentos(): Promise<Medicamento[]> {
  const pagina = await requisitar<Pagina<Medicamento>>(`/api/medicamentos?${parametros({ size: '200', sort: 'nome' })}`)
  return pagina.content
}

export async function listarFrascos(medicamentoId: string): Promise<Frasco[]> {
  const pagina = await requisitar<Pagina<Frasco>>(
    `/api/medicamentos/${medicamentoId}/frascos?${parametros({ size: '100', sort: 'volumeMg,desc' })}`,
  )
  return pagina.content
}

export async function listarPrescricoesDoDia(medicamentoId: string, data: string): Promise<Prescricao[]> {
  const pagina = await requisitar<Pagina<Prescricao>>(
    `/api/prescricoes?${parametros({ medicamentoId, data, size: '200', sort: 'codigoPrescricao' })}`,
  )
  return pagina.content
}

/** Planos já gerados para o medicamento no dia, o mais recente primeiro. */
export async function listarPlanosDoDia(medicamentoId: string, data: string): Promise<Otimizacao[]> {
  const pagina = await requisitar<Pagina<Otimizacao>>(`/api/otimizacoes?${parametros({ medicamentoId, data, size: '20' })}`)
  return pagina.content
}

export function gerarPlano(medicamentoId: string, data: string): Promise<Otimizacao> {
  return requisitar<Otimizacao>('/api/otimizacoes', { metodo: 'POST', corpo: { medicamentoId, data } })
}

export function confirmarPlano(id: string): Promise<Otimizacao> {
  return requisitar<Otimizacao>(`/api/otimizacoes/${id}/confirmacao`, { metodo: 'PUT' })
}

export function recusarPlano(id: string, motivo: string): Promise<Otimizacao> {
  return requisitar<Otimizacao>(`/api/otimizacoes/${id}/recusa`, {
    metodo: 'PUT',
    corpo: motivo ? { motivo } : undefined,
  })
}
