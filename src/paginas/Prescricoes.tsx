import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarPrescricoesDoDiaTodas } from '../api/agenda'
import { listarMedicamentos, listarPrescricoesDoDia } from '../api/plano'
import type { Medicamento, Prescricao } from '../api/tipos'
import CampoData from '../componentes/CampoData'
import { formatarData, formatarMg, hojeIso } from '../util/formatos'

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.')
const ehData = (valor: string) => /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))

/** Consulta só de leitura: prescrições do dia (todas ou de um medicamento), agrupadas pelo código. */
export default function Prescricoes() {
  const [busca, setBusca] = useSearchParams()
  const [hoje] = useState(hojeIso)
  const pedido = busca.get('data') ?? ''
  const data = ehData(pedido) ? pedido : hoje
  const medicamentoId = busca.get('medicamento') ?? ''
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [prescricoes, setPrescricoes] = useState<Prescricao[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarMedicamentos()
      .then(setMedicamentos)
      .catch((e) => setErro(mensagemDe(e)))
  }, [])

  useEffect(() => {
    let ativo = true
    setPrescricoes(null)
    setErro(null)
    const carga = medicamentoId ? listarPrescricoesDoDia(medicamentoId, data) : listarPrescricoesDoDiaTodas(data)
    carga
      .then((lista) => ativo && setPrescricoes(lista))
      .catch((e) => {
        if (!ativo) return
        setPrescricoes([])
        setErro(mensagemDe(e))
      })
    return () => {
      ativo = false
    }
  }, [data, medicamentoId])

  function filtrar(chave: 'data' | 'medicamento', valor: string) {
    if (chave === 'data' && !valor) return
    setBusca(
      (anterior) => {
        const nova = new URLSearchParams(anterior)
        if (valor) nova.set(chave, valor)
        else nova.delete(chave)
        return nova
      },
      { replace: true },
    )
  }

  const nomeDe = (id: string) => medicamentos.find((m) => m.id === id)?.nome ?? 'Medicamento'
  // Uma prescrição pode ter uma linha por quimioterápico (como no AC): agrupa pelo código.
  const grupos = new Map<string, Prescricao[]>()
  for (const p of prescricoes ?? []) grupos.set(p.codigoPrescricao, [...(grupos.get(p.codigoPrescricao) ?? []), p])

  return (
    <section className="pagina">
      <title>Prescrições – Oncotimize</title>
      <h1>Prescrições</h1>

      <form className="filtros" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="prescricoes-data">Dia</label>
          <CampoData id="prescricoes-data" valor={data} onMudar={(v) => filtrar('data', v)} />
        </div>
        <div className="campo">
          <label htmlFor="prescricoes-medicamento">Medicamento</label>
          <select id="prescricoes-medicamento" value={medicamentoId} onChange={(e) => filtrar('medicamento', e.target.value)}>
            <option value="">Todos</option>
            {medicamentos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
      </form>

      {erro && (
        <p className="mensagem mensagem-erro" role="alert">
          {erro}
        </p>
      )}
      {!prescricoes && (
        <p className="vazio" role="status">
          Carregando prescrições…
        </p>
      )}
      {prescricoes && prescricoes.length === 0 && !erro && (
        <p className="vazio">Nenhuma prescrição em {formatarData(data)}.</p>
      )}
      {prescricoes && prescricoes.length > 0 && (
        <>
          <p className="nota">
            {grupos.size} {grupos.size === 1 ? 'prescrição' : 'prescrições'} em {formatarData(data)}.{' '}
            <Link to={`/agenda?dia=${data}`}>Ver a agenda do dia</Link>
          </p>
          <ul className="pacientes">
            {[...grupos].map(([codigo, linhas]) => {
              const apto = linhas.every((l) => l.status === 'APTO')
              const emissao = linhas[0].dataPrescricao
              return (
                <li key={codigo}>
                  <div className="paciente-dados">
                    <strong>{codigo}</strong>
                    <span>{linhas.map((l) => `${nomeDe(l.medicamentoId)} ${formatarMg(l.doseMg)}`).join(' + ')}</span>
                    {emissao !== data && <span>Emitida em {formatarData(emissao)}</span>}
                    {!linhas[0].aplicacaoId && <span>Sem aplicação na agenda</span>}
                  </div>
                  <span className={`etiqueta ${apto ? 'etiqueta-ok' : 'etiqueta-nao-apto'}`}>{apto ? 'Apto' : 'Não apto'}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
