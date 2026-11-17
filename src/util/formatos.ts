// ponytail: moeda única do sistema. Os custos do seed são fictícios; se o autor decidir por US$ (como em Gê),
// troca só aqui (MEMORIA.md, "Perguntas em aberto").
const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MG = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const PERCENTUAL = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export const formatarMoeda = (valor: number) => MOEDA.format(valor)
export const formatarMg = (valor: number) => `${MG.format(valor)} mg`
export const formatarPercentual = (fracao: number) => PERCENTUAL.format(fracao)

/** "2027-03-01" → "01/03/2027", sem passar por Date (evita trocar o dia pelo fuso). */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** LocalDateTime da API (sem fuso) lido como horário local. */
export const formatarDataHora = (iso: string) => DATA_HORA.format(new Date(iso))

export function hojeIso(): string {
  const hoje = new Date()
  const doisDigitos = (n: number) => String(n).padStart(2, '0')
  return `${hoje.getFullYear()}-${doisDigitos(hoje.getMonth() + 1)}-${doisDigitos(hoje.getDate())}`
}
