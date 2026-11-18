import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarProtocolos } from '../api/consultas'
import { listarMedicamentos } from '../api/plano'
import type { Medicamento, Protocolo } from '../api/tipos'
import { formatarData, formatarMg, hojeIso } from '../util/formatos'

const SITUACAO = {
  AGENDADA: { rotulo: 'Agendada', classe: 'etiqueta-neutra' },
  REALIZADA: { rotulo: 'Realizada', classe: 'etiqueta-ok' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'etiqueta-nao-apto' },
} as const

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.')

/** Consulta só de leitura: protocolos e as aplicações de cada um (as datas levam à agenda do dia). */
export default function Protocolos() {
  const [busca, setBusca] = useSearchParams()
  const medicamentoId = busca.get('medicamento') ?? ''
  const [hoje] = useState(hojeIso)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [dados, setDados] = useState<{ protocolos: Protocolo[]; total: number } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [codigo, setCodigo] = useState('')

  useEffect(() => {
    listarMedicamentos()
      .then(setMedicamentos)
      .catch((e) => setErro(mensagemDe(e)))
  }, [])

  useEffect(() => {
    let ativo = true
    setDados(null)
    setErro(null)
    listarProtocolos(medicamentoId)
      .then((r) => ativo && setDados(r))
      .catch((e) => ativo && setErro(mensagemDe(e)))
    return () => {
      ativo = false
    }
  }, [medicamentoId])

  const nomeDe = (id: string) => medicamentos.find((m) => m.id === id)?.nome ?? 'Medicamento'
  const termo = codigo.trim().toUpperCase()
  const visiveis = dados?.protocolos.filter((p) => !termo || p.codigoProtocolo.includes(termo)) ?? []

  return (
    <section className="pagina">
      <title>Protocolos – Oncotimize</title>
      <h1>Protocolos</h1>

      <form className="filtros" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="protocolos-medicamento">Medicamento</label>
          <select
            id="protocolos-medicamento"
            value={medicamentoId}
            onChange={(e) => setBusca(e.target.value ? { medicamento: e.target.value } : {}, { replace: true })}
          >
            <option value="">Todos</option>
            {medicamentos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="protocolos-codigo">Código</label>
          <input
            id="protocolos-codigo"
            type="search"
            placeholder="ex.: PTC2027-000101"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>
      </form>

      {erro && (
        <p className="mensagem mensagem-erro" role="alert">
          {erro}
        </p>
      )}
      {!dados && !erro && (
        <p className="vazio" role="status">
          Carregando protocolos…
        </p>
      )}
      {dados && visiveis.length === 0 && <p className="vazio">Nenhum protocolo encontrado.</p>}
      {dados && dados.total > dados.protocolos.length && (
        <p className="nota">
          Mostrando os primeiros {dados.protocolos.length} de {dados.total}. Escolha um medicamento para ver menos.
        </p>
      )}

      <ul className="protocolos">
        {visiveis.map((p) => {
          const realizadas = p.aplicacoes.filter((a) => a.status === 'REALIZADA').length
          const proxima = p.aplicacoes
            .filter((a) => a.status === 'AGENDADA' && a.dataAgendada >= hoje)
            .sort((a, b) => a.dataAgendada.localeCompare(b.dataAgendada))[0]
          return (
            <li key={p.id}>
              <details>
                <summary>
                  <span className="protocolo-dados">
                    <strong>{p.codigoProtocolo}</strong>
                    <span>
                      {p.medicamentos.map((m) => `${nomeDe(m.medicamentoId)} ${formatarMg(m.doseMg)}`).join(' + ')}
                    </span>
                  </span>
                  <span className="protocolo-progresso">
                    {realizadas} de {p.totalAplicacoes} realizadas
                    <span>{proxima ? `Próxima: ${formatarData(proxima.dataAgendada)}` : 'Sem aplicação futura'}</span>
                  </span>
                </summary>
                <p className="nota">
                  {p.medicacaoSubtipo}, {p.ciclos} {p.ciclos === 1 ? 'ciclo' : 'ciclos'} a cada {p.diasIntervalo} dias (mínimo de{' '}
                  {p.intervaloMinimoDias} entre aplicações), início em {formatarData(p.dataInicio)}.
                </p>
                <ol className="aplicacoes">
                  {p.aplicacoes.map((a) => (
                    <li key={a.id}>
                      <span>
                        Aplicação {a.numero}{' '}
                        <span className="detalhe-linha">
                          ciclo {a.cicloNumero}, dia {a.diaCiclo}
                        </span>
                      </span>
                      <span>
                        <Link to={`/agenda?dia=${a.dataAgendada}`}>{formatarData(a.dataAgendada)}</Link>
                        {a.dataAgendada !== a.dataPrevista && (
                          <span className="detalhe-linha">
                            remarcada; prevista para {formatarData(a.dataPrevista)}
                            {a.motivoAlteracao ? ` (${a.motivoAlteracao.toLowerCase()})` : ''}
                          </span>
                        )}
                      </span>
                      <span className={`etiqueta ${SITUACAO[a.status].classe}`}>
                        {SITUACAO[a.status].rotulo}
                        {a.dataReal && a.status === 'REALIZADA' ? ` em ${formatarData(a.dataReal).slice(0, 5)}` : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
