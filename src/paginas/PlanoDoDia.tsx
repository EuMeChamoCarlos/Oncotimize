import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErroApi } from '../api/cliente'
import {
  confirmarPlano,
  gerarPlano,
  listarFrascos,
  listarMedicamentos,
  listarPlanosDoDia,
  listarPrescricoesDoDia,
  recusarPlano,
} from '../api/plano'
import type { Frasco, Medicamento, Otimizacao, Prescricao } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'
import Dialogo from '../componentes/Dialogo'
import FrascoDoPlano, { type ParteDoFrasco } from '../componentes/FrascoDoPlano'
import {
  formatarData,
  formatarDataHora,
  formatarMg,
  formatarMoeda,
  formatarPercentual,
  hojeIso,
} from '../util/formatos'

interface DadosDoDia {
  prescricoes: Prescricao[]
  frascos: Frasco[]
  planos: Otimizacao[]
}

type Acao = 'gerar' | 'confirmar' | 'recusar'

// Uma cor por prescrição, a mesma em todos os frascos; vizinhas alternam claro e escuro.
const CORES = ['#2e6670', '#9cc3c9', '#3d5a80', '#a9bedb', '#5b4b8a', '#c3b8e0', '#2f6b4f', '#a6d1b8']

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.')

export default function PlanoDoDia() {
  const { ehAdmin } = useAuth()
  const [busca, setBusca] = useSearchParams()
  // Data padrão fixada na montagem: um render depois da meia-noite não troca o dia sozinho.
  const [hoje] = useState(hojeIso)
  const medicamentoId = busca.get('medicamento') ?? ''
  const data = busca.get('data') || hoje
  // Resposta de uma ação só vale se o usuário ainda está no mesmo medicamento e dia.
  const filtroAtual = useRef('')
  useEffect(() => {
    filtroAtual.current = `${medicamentoId}|${data}`
  }, [medicamentoId, data])

  const [medicamentos, setMedicamentos] = useState<Medicamento[] | null>(null)
  const [dia, setDia] = useState<DadosDoDia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<Acao | null>(null)
  const [dialogo, setDialogo] = useState<'confirmar' | 'recusar' | null>(null)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    listarMedicamentos()
      .then(setMedicamentos)
      .catch((e) => setErro(mensagemDe(e)))
  }, [])

  useEffect(() => {
    setDia(null)
    if (!medicamentoId) {
      setCarregando(false)
      return
    }
    let ativo = true
    setCarregando(true)
    // O erro não é limpo aqui: uma recarga depois de 409/422 precisa manter o detail da API na tela.
    Promise.all([
      listarPrescricoesDoDia(medicamentoId, data),
      listarFrascos(medicamentoId),
      listarPlanosDoDia(medicamentoId, data),
    ])
      .then(([prescricoes, frascos, planos]) => ativo && setDia({ prescricoes, frascos, planos }))
      .catch((e) => ativo && setErro(mensagemDe(e)))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [medicamentoId, data, versao])

  function mudarFiltro(chave: 'medicamento' | 'data', valor: string) {
    if (chave === 'data' && !valor) return // apagar um pedaço da data no campo não volta para hoje
    setSucesso(null)
    setErro(null)
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

  /** Devolve true se a ação deu certo. */
  async function executar(acao: Acao, chamada: () => Promise<Otimizacao>, mensagem: string): Promise<boolean> {
    const alvo = `${medicamentoId}|${data}`
    setOcupado(acao)
    setErro(null)
    setSucesso(null)
    try {
      const atualizado = await chamada()
      if (filtroAtual.current === alvo) {
        setDia((atual) => atual && { ...atual, planos: [atualizado, ...atual.planos.filter((p) => p.id !== atualizado.id)] })
        setSucesso(mensagem)
      }
      return true
    } catch (e) {
      if (filtroAtual.current === alvo) {
        setErro(mensagemDe(e))
        // 409/422: o plano do dia mudou (outro usuário, estoque); recarrega para mostrar o estado real.
        if (e instanceof ErroApi && (e.status === 409 || e.status === 422)) setVersao((v) => v + 1)
      }
      return false
    } finally {
      setOcupado(null)
    }
  }

  const medicamento = medicamentos?.find((m) => m.id === medicamentoId) ?? null
  const plano = dia ? (dia.planos.find((p) => p.status === 'CONFIRMADA') ?? dia.planos[0] ?? null) : null
  const aptas = dia?.prescricoes.filter((p) => p.status === 'APTO') ?? []
  // A lista e o solver usam o mesmo dia de preparo (API, lacuna (c) resolvida). Um código só no plano é de um plano
  // gerado antes de a aplicação sair deste dia (remarcação): entra na tabela como linha extra, com aviso.
  const codigosNaTabela = new Set(dia?.prescricoes.map((p) => p.codigoPrescricao) ?? [])
  const soNoPlano = [...new Set(plano?.alocacoes.map((a) => a.codigoPrescricao) ?? [])].filter(
    (codigo) => !codigosNaTabela.has(codigo),
  )
  const codigosComCor = [...aptas.map((p) => p.codigoPrescricao), ...soNoPlano]
  const cores = new Map(codigosComCor.map((codigo, i) => [codigo, CORES[i % CORES.length]]))

  function confirmar(evento: FormEvent) {
    evento.preventDefault()
    if (!plano) return
    setDialogo(null)
    void executar('confirmar', () => confirmarPlano(plano.id), 'Preparo confirmado. O estoque dos frascos abertos foi baixado.')
  }

  function recusar(evento: FormEvent) {
    evento.preventDefault()
    if (!plano) return
    setDialogo(null)
    void executar('recusar', () => recusarPlano(plano.id, motivo.trim()), 'Plano recusado. Nenhum frasco foi baixado.').then(
      (deuCerto) => deuCerto && setMotivo(''),
    )
  }

  function gerar() {
    void executar('gerar', () => gerarPlano(medicamentoId, data), 'Plano gerado. Confira os frascos antes de confirmar o preparo.')
  }

  return (
    <section className="pagina plano">
      <title>Plano do dia – Oncotimize</title>
      <h1>Plano do dia</h1>
      <p className="nota">
        Escolha o medicamento e a data para ver as prescrições aptas e quais frascos abrir, divididos entre os pacientes.
      </p>

      <form className="filtros" onSubmit={(e) => e.preventDefault()}>
        <div className="campo">
          <label htmlFor="filtro-medicamento">Medicamento</label>
          <select
            id="filtro-medicamento"
            value={medicamentoId}
            onChange={(e) => mudarFiltro('medicamento', e.target.value)}
            disabled={!medicamentos}
          >
            <option value="">{medicamentos ? 'Escolha um medicamento' : 'Carregando…'}</option>
            {medicamentos?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="filtro-data">Data</label>
          <input id="filtro-data" type="date" value={data} required onChange={(e) => mudarFiltro('data', e.target.value)} />
        </div>
      </form>

      {erro && (
        <p className="mensagem mensagem-erro" role="alert">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="mensagem mensagem-sucesso" role="status">
          {sucesso}
        </p>
      )}

      {!medicamentoId && <p className="vazio">Escolha um medicamento para começar.</p>}
      {carregando && (
        <p className="vazio" role="status">
          Carregando o dia…
        </p>
      )}

      {dia && medicamento && (
        <>
          <section className="bloco" aria-labelledby="titulo-prescricoes">
            <h2 id="titulo-prescricoes">
              Prescrições de {medicamento.nome} em {formatarData(data)}
            </h2>
            {dia.prescricoes.length === 0 && soNoPlano.length === 0 ? (
              <p className="vazio">Nenhuma prescrição deste medicamento nesta data.</p>
            ) : (
              <TabelaPrescricoes
                prescricoes={dia.prescricoes}
                soNoPlano={soNoPlano}
                plano={plano}
                frascos={dia.frascos}
                cores={cores}
              />
            )}
          </section>

          <section className="bloco" aria-labelledby="titulo-plano">
            <div className="plano-cabecalho">
              <h2 id="titulo-plano">Plano de abertura</h2>
              {plano && <SituacaoDoPlano plano={plano} />}
            </div>

            {dia.planos.length > 1 && plano && (
              <p className="nota">
                {dia.planos.length} planos foram gerados para este dia; aqui aparece{' '}
                {plano.status === 'CONFIRMADA' ? 'o confirmado' : 'o mais recente'}.
              </p>
            )}

            {!plano && (
              <p className="vazio">
                {aptas.length === 0
                  ? 'Não há prescrição apta neste dia, então não há o que otimizar.'
                  : `Ainda não há plano para este dia. Gere o plano para ver quais frascos abrir para ${aptas.length === 1 ? 'a prescrição apta' : `as ${aptas.length} prescrições aptas`}.`}
              </p>
            )}

            {plano && (
              <>
                <Economia plano={plano} />
                <h3 className="subtitulo">
                  Abrir {plano.frascosAbertos.length} {plano.frascosAbertos.length === 1 ? 'frasco' : 'frascos'}
                </h3>
                <div className="frascos">
                  {plano.frascosAbertos.map((aberto) => {
                    const apresentacao = dia.frascos.find((f) => f.id === aberto.apresentacaoId)
                    const partes: ParteDoFrasco[] = plano.alocacoes
                      .filter((a) => a.apresentacaoId === aberto.apresentacaoId && a.numeroFrasco === aberto.numeroFrasco)
                      .map((a) => ({
                        codigo: a.codigoPrescricao,
                        volumeMg: a.volumeMg,
                        cor: cores.get(a.codigoPrescricao) ?? 'var(--aco-escuro)',
                      }))
                    return (
                      <FrascoDoPlano
                        key={`${aberto.apresentacaoId}-${aberto.numeroFrasco}`}
                        rotulo={`Frasco ${aberto.numeroFrasco} de ${formatarMg(aberto.volumeMg)}`}
                        descricao={apresentacao?.descricaoTasy ?? null}
                        volumeMg={aberto.volumeMg}
                        partes={partes}
                      />
                    )
                  })}
                </div>
              </>
            )}

            {ehAdmin ? (
              <div className="acoes">
                {(!plano || plano.status === 'RECUSADA') && (
                  <button type="button" className="botao-principal" onClick={gerar} disabled={!!ocupado || aptas.length === 0}>
                    {ocupado === 'gerar' ? 'Gerando…' : plano ? 'Gerar de novo' : 'Gerar plano'}
                  </button>
                )}
                {plano?.status === 'CONCLUIDA' && (
                  <>
                    <button type="button" className="botao-principal" onClick={() => setDialogo('confirmar')} disabled={!!ocupado}>
                      {ocupado === 'confirmar' ? 'Confirmando…' : 'Confirmar preparo'}
                    </button>
                    <button type="button" className="botao-secundario" onClick={() => setDialogo('recusar')} disabled={!!ocupado}>
                      {ocupado === 'recusar' ? 'Recusando…' : 'Recusar plano'}
                    </button>
                    <button type="button" className="botao-secundario" onClick={gerar} disabled={!!ocupado}>
                      {ocupado === 'gerar' ? 'Gerando…' : 'Gerar de novo'}
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="nota">Só administradores geram, confirmam ou recusam planos. Seu perfil é de consulta.</p>
            )}
          </section>
        </>
      )}

      <Dialogo aberto={dialogo === 'confirmar'} titulo="Confirmar o preparo?" onFechar={() => setDialogo(null)}>
        <form onSubmit={confirmar}>
          <p>
            O estoque de {plano?.frascosAbertos.length ?? 0}{' '}
            {plano?.frascosAbertos.length === 1 ? 'frasco' : 'frascos'} de {medicamento?.nome} será baixado e o plano de{' '}
            {formatarData(data)} ficará fechado. Confirme só depois de preparar as doses.
          </p>
          <div className="acoes">
            <button type="submit" className="botao-principal">
              Confirmar preparo
            </button>
            <button type="button" className="botao-secundario" onClick={() => setDialogo(null)}>
              Voltar
            </button>
          </div>
        </form>
      </Dialogo>

      <Dialogo aberto={dialogo === 'recusar'} titulo="Recusar o plano?" onFechar={() => setDialogo(null)}>
        <form onSubmit={recusar}>
          <p>Nenhum frasco será baixado. Depois é possível gerar um plano novo.</p>
          <label htmlFor="motivo-recusa">Motivo (opcional)</label>
          <textarea
            id="motivo-recusa"
            maxLength={500}
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="acoes">
            <button type="submit" className="botao-principal">
              Recusar plano
            </button>
            <button type="button" className="botao-secundario" onClick={() => setDialogo(null)}>
              Voltar
            </button>
          </div>
        </form>
      </Dialogo>
    </section>
  )
}

function SituacaoDoPlano({ plano }: { plano: Otimizacao }) {
  if (plano.status === 'CONFIRMADA') {
    return (
      <p className="situacao situacao-confirmada">
        Preparo confirmado{plano.confirmadaEm ? ` em ${formatarDataHora(plano.confirmadaEm)}` : ''}
      </p>
    )
  }
  if (plano.status === 'RECUSADA') {
    return (
      <p className="situacao situacao-recusada">
        Recusado{plano.recusadaPor ? ` por ${plano.recusadaPor}` : ''}
        {plano.recusadaEm ? ` em ${formatarDataHora(plano.recusadaEm)}` : ''}
        {plano.motivoRecusa ? `: ${plano.motivoRecusa}` : ''}
      </p>
    )
  }
  if (plano.status === 'CONCLUIDA') return <p className="situacao">Aguardando confirmação do preparo</p>
  return <p className="situacao situacao-recusada">O solver não encontrou um plano ({plano.status})</p>
}

function Economia({ plano }: { plano: Otimizacao }) {
  const maior = Math.max(plano.custoSemCompartilhamento, plano.custoOtimizado, 0.01)
  const proporcao = plano.custoSemCompartilhamento > 0 ? plano.economia / plano.custoSemCompartilhamento : 0
  return (
    <div className="economia">
      <dl className="economia-barras">
        <div>
          <dt>Cada paciente com os próprios frascos</dt>
          <dd>
            <span className="trilho">
              <span className="barra barra-sem" style={{ width: `${(plano.custoSemCompartilhamento / maior) * 100}%` }} />
            </span>
            {formatarMoeda(plano.custoSemCompartilhamento)}
          </dd>
        </div>
        <div>
          <dt>Com os frascos divididos pelo plano</dt>
          <dd>
            <span className="trilho">
              <span className="barra barra-com" style={{ width: `${(plano.custoOtimizado / maior) * 100}%` }} />
            </span>
            {formatarMoeda(plano.custoOtimizado)}
          </dd>
        </div>
      </dl>
      <p className="economia-resultado">
        {plano.economia >= 0 ? (
          <>
            Economia de <strong>{formatarMoeda(plano.economia)}</strong> ({formatarPercentual(proporcao)}) no dia.
          </>
        ) : (
          // A linha de base da API resolve cada paciente com o estoque cheio; com estoque curto ela pode sair mais barata.
          <>
            O plano custa <strong>{formatarMoeda(-plano.economia)}</strong> a mais que a linha de base, que não considera o
            estoque dividido entre os pacientes.
          </>
        )}{' '}
        A sobra descartada é de {formatarMg(plano.desperdicioMg)}.
      </p>
    </div>
  )
}

function TabelaPrescricoes({
  prescricoes,
  soNoPlano,
  plano,
  frascos,
  cores,
}: {
  prescricoes: Prescricao[]
  soNoPlano: string[]
  plano: Otimizacao | null
  frascos: Frasco[]
  cores: Map<string, string>
}) {
  const volumeDe = (apresentacaoId: string) => frascos.find((f) => f.id === apresentacaoId)?.volumeMg
  const origem = (partes: Otimizacao['alocacoes']) =>
    partes
      .map((a) => {
        const volume = volumeDe(a.apresentacaoId)
        return `${formatarMg(a.volumeMg)} do frasco ${a.numeroFrasco}${volume ? ` de ${formatarMg(volume)}` : ''} (${formatarPercentual(a.fracao)})`
      })
      .join('; ')

  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <thead>
          <tr>
            <th scope="col">Prescrição</th>
            <th scope="col" className="numero">
              Dose
            </th>
            <th scope="col">Situação</th>
            <th scope="col">De onde sai a dose</th>
          </tr>
        </thead>
        <tbody>
          {prescricoes.map((p) => {
            const partes = plano?.alocacoes.filter((a) => a.codigoPrescricao === p.codigoPrescricao) ?? []
            return (
              <tr key={p.id}>
                <th scope="row">
                  {p.status === 'APTO' && (
                    <span className="amostra" style={{ background: cores.get(p.codigoPrescricao) }} aria-hidden="true" />
                  )}
                  {p.codigoPrescricao}
                </th>
                <td className="numero">{formatarMg(p.doseMg)}</td>
                <td>{p.status === 'APTO' ? 'Apto' : <span className="nao-apto">Não apto</span>}</td>
                <td>
                  {p.status === 'NAO_APTO'
                    ? 'Fica fora do plano'
                    : !plano
                      ? 'Sem plano ainda'
                      : partes.length === 0
                        ? 'Não está neste plano; gere de novo'
                        : origem(partes)}
                </td>
              </tr>
            )
          })}
          {soNoPlano.map((codigo) => {
            const partes = plano?.alocacoes.filter((a) => a.codigoPrescricao === codigo) ?? []
            return (
              <tr key={codigo}>
                <th scope="row">
                  <span className="amostra" style={{ background: cores.get(codigo) }} aria-hidden="true" />
                  {codigo}
                </th>
                <td className="numero">{formatarMg(partes.reduce((soma, a) => soma + a.volumeMg, 0))}</td>
                <td>Saiu deste dia depois do plano; gere de novo</td>
                <td>{origem(partes)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
