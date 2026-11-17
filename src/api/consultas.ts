import { requisitar } from './cliente'
import type { Pagina, Protocolo } from './tipos'

/** Protocolos (todos ou de um medicamento), ordenados pelo código. Uma página de 200 basta para a demonstração. */
export async function listarProtocolos(medicamentoId: string): Promise<{ protocolos: Protocolo[]; total: number }> {
  const parametros = new URLSearchParams({ size: '200', sort: 'codigoProtocolo' })
  if (medicamentoId) parametros.set('medicamentoId', medicamentoId)
  const pagina = await requisitar<Pagina<Protocolo>>(`/api/protocolos?${parametros}`)
  return { protocolos: pagina.content, total: pagina.page.totalElements }
}
