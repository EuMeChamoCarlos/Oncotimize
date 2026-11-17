import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  aceitarSugestao,
  gerarSugestoes,
  listarAplicacoesDoDia,
  listarPrescricoesDoDiaTodas,
  listarSugestoes,
  recusarSugestao,
  registrarNaoApto,
} from '../api/agenda'
import { ErroApi } from '../api/cliente'
import { listarMedicamentos } from '../api/plano'
import type { AplicacaoDoDia, Medicamento, Prescricao, SugestaoRemarcacao } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'
import CampoData from '../componentes/CampoData'
import Dialogo from '../componentes/Dialogo'
import { formatarData, formatarMg, formatarMoeda, hojeIso } from '../util/formatos'

/** Uma linha da agenda: a aplicação do dia (com a prescrição dela, se já existe) ou um paciente que saiu do dia. */
interface Paciente {
  codigo: string
  aplicacaoId: string | null
  apto: boolean
  /** Aplicação no dia sem prescrição ainda (ex.: chegou por remarcação; o médico prescreve no retorno). */
  semPrescricao: boolean
  /** Não apto cuja aplicação já foi remarcada para outro dia: fica na lista do dia da avaliação, sem ação. */
  saiuDoDia: boolean
  itens: { medicamentoId: string; doseMg: number }[]
  nota?: string
}

interface Mensagem {
  tipo: 'erro' | 'sucesso' | 'aviso'
  texto: string
}

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.')

// Datas ISO tratadas em UTC: o fuso não troca o dia.
const paraData = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}
const paraIso = (data: Date) => data.toISOString().slice(0, 10)
const somarDias = (iso: string, dias: number) => {
  const data = paraData(iso)
  data.setUTCDate(data.getUTCDate() + dias)
  return paraIso(data)
}
const DIA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const DIA_SEMANA_LONGO = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })
const DIA_LONGO = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
const diaCurto = (iso: string) => `${DIA_SEMANA.format(paraData(iso)).replace('.', '')} ${formatarData(iso).slice(0, 5)}`

/** Domingo a sábado da semana do dia. */
function semanaDe(iso: string): string[] {
  const domingo = somarDias(iso, -paraData(iso).getUTCDay())
  return Array.from({ length: 7 }, (_, i) => somarDias(domingo, i))
}

const itensDe = (prescricoes: Prescricao[]) => prescricoes.map((p) => ({ medicamentoId: p.medicamentoId, doseMg: p.doseMg }))

/**
 * A agenda são as aplicações agendadas no dia; o status (apto/não apto) vem da prescrição de cada uma. Prescrições do
 * dia cuja aplicação foi remarcada para outro dia (não apto que já tem volta) e as do legado sem aplicação entram no fim.
 */
function montarLinhas(
  dia: string,
  aplicacoes: AplicacaoDoDia[],
  prescricoes: Prescricao[],
  aceitas: SugestaoRemarcacao[],
): Paciente[] {
  const porAplicacao = new Map<string, Prescricao[]>()
  const porCodigoAvulso = new Map<string, Prescricao[]>()
  for (const p of prescricoes) {
    const mapa = p.aplicacaoId ? porAplicacao : porCodigoAvulso
    const chave = p.aplicacaoId ?? p.codigoPrescricao
    mapa.set(chave, [...(mapa.get(chave) ?? []), p])
  }

  const linhas: Paciente[] = aplicacoes.map((a) => {
    const ps = porAplicacao.get(a.id) ?? []
    porAplicacao.delete(a.id)
    const remarcada =
      a.dataPrevista !== a.dataAgendada
        ? `Remarcada; estava prevista para ${formatarData(a.dataPrevista).slice(0, 5)}${a.motivoAlteracao ? ` (${a.motivoAlteracao.toLowerCase()})` : ''}`
        : undefined
    return ps.length > 0
      ? {
          codigo: ps[0].codigoPrescricao,
          aplicacaoId: a.id,
          apto: ps.every((p) => p.status === 'APTO'),
          semPrescricao: false,
          saiuDoDia: false,
          itens: itensDe(ps),
          nota: remarcada,
        }
      : {
          codigo: `${a.codigoProtocolo} nº ${a.numero}`,
          aplicacaoId: a.id,
          apto: true,
          semPrescricao: true,
          saiuDoDia: false,
          itens: a.medicamentos.map((m) => ({ medicamentoId: m.medicamentoId, doseMg: m.doseMg })),
          nota: remarcada,
        }
  })

  for (const [aplicacaoId, ps] of porAplicacao) {
    const volta = aceitas.find((s) => s.aplicacaoId === aplicacaoId && s.origem === dia)
    linhas.push({
      codigo: ps[0].codigoPrescricao,
      aplicacaoId,
      apto: ps.every((p) => p.status === 'APTO'),
      semPrescricao: false,
      saiuDoDia: true,
      itens: itensDe(ps),
      nota: volta ? `Remarcada para ${formatarData(volta.destino).slice(0, 5)}` : 'Remarcada para outro dia',
    })
  }
  for (const ps of porCodigoAvulso.values()) {
    linhas.push({
      codigo: ps[0].codigoPrescricao,
      aplicacaoId: null,
      apto: ps.every((p) => p.status === 'APTO'),
      semPrescricao: false,
      saiuDoDia: false,
      itens: itensDe(ps),
    })
  }
  return linhas
}

export default function Agenda() {
  const { ehAdmin } = useAuth()
  const [busca, setBusca] = useSearchParams()
  const [hoje] = useState(hojeIso)
  const pedido = busca.get('dia') ?? ''
  // ?dia= vem da URL: só vale se for uma data real (2027-02-30 e lixo voltam para hoje).
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(pedido) && paraIso(paraData(pedido)) === pedido ? pedido : hoje
  const semana = semanaDe(dia)

  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [pacientes, setPacientes] = useState<Paciente[] | null>(null)
  const [falhouCarga, setFalhouCarga] = useState(false)
  const diaCarregado = useRef('')
  const [contagem, setContagem] = useState<Record<string, number>>({})
  const [pendentes, setPendentes] = useState<SugestaoRemarcacao[]>([])
  const [versao, setVersao] = useState(0)
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Diálogo "não apto" e nova tentativa depois de um 422 sem dia de retorno
  const [naoApto, setNaoApto] = useState<Paciente | null>(null)
  const [dataMinima, setDataMinima] = useState('')
  const [motivo, setMotivo] = useState('')
  const [motivoVazio, setMotivoVazio] = useState(false)
  const [retornoPendente, setRetornoPendente] = useState<Paciente | null>(null)

  // Diálogo "procurar remarcações da semana"
  const [procurando, setProcurando] = useState(false)
  const [medProcura, setMedProcura] = useState('')

  useEffect(() => {
    listarMedicamentos()
      .then(setMedicamentos)
      .catch((e) => setMensagem({ tipo: 'erro', texto: mensagemDe(e) }))
  }, [])

  // Pacientes do dia e sugestões pendentes
  useEffect(() => {
    let ativo = true
    // Recarga do mesmo dia (depois de uma ação) mantém a lista na tela: o foco do teclado não se perde.
    if (diaCarregado.current !== dia) setPacientes(null)
    Promise.all([
      listarAplicacoesDoDia(dia),
      listarPrescricoesDoDiaTodas(dia),
      listarSugestoes('SUGERIDA'),
      listarSugestoes('ACEITA'),
    ])
      .then(([aplicacoes, prescricoes, sugestoes, aceitas]) => {
        if (!ativo) return
        diaCarregado.current = dia
        setFalhouCarga(false)
        setPacientes(montarLinhas(dia, aplicacoes, prescricoes, aceitas))
        setPendentes(sugestoes)
      })
      .catch((e) => {
        if (!ativo) return
        setFalhouCarga(true)
        setPacientes([])
        setMensagem({ tipo: 'erro', texto: mensagemDe(e) })
      })
    return () => {
      ativo = false
    }
  }, [dia, versao])

  // Pacientes por dia na faixa da semana
  const inicioSemana = semana[0]
  useEffect(() => {
    let ativo = true
    const dias = semanaDe(inicioSemana)
    Promise.all(dias.map((d) => listarAplicacoesDoDia(d).then((lista) => [d, lista.length] as const)))
      .then((pares) => ativo && setContagem(Object.fromEntries(pares)))
      .catch(() => ativo && setContagem({}))
    return () => {
      ativo = false
    }
  }, [inicioSemana, versao])

  function irPara(novoDia: string) {
    setMensagem(null)
    setRetornoPendente(null)
    setBusca({ dia: novoDia }, { replace: true })
  }

  const nomeDe = (id: string) => medicamentos.find((m) => m.id === id)?.nome ?? 'Medicamento'
  const sugestoesDoDia = pendentes.filter((s) => s.origem === dia)
  const sugestaoDe = (aplicacaoId: string | null) => pendentes.find((s) => s.aplicacaoId === aplicacaoId)

  // Na faixa, só o código que aparece na lista (sem o PTC…, que confundia).
  const codigoDe = (s: SugestaoRemarcacao) =>
    pacientes?.find((p) => p.aplicacaoId === s.aplicacaoId)?.codigo ?? `${s.codigoProtocolo} nº ${s.numero}`

  async function decidir(s: SugestaoRemarcacao, acao: 'aceitar' | 'recusar') {
    setOcupado(true)
    setMensagem(null)
    setRetornoPendente(null)
    try {
      if (acao === 'aceitar') {
        await aceitarSugestao(s.id, '')
        setMensagem({ tipo: 'sucesso', texto: `${codigoDe(s)} remarcada para ${diaCurto(s.destino)}.` })
      } else if (s.tipo === 'NAO_APTO') {
        await recusarSugestao(s.id, '')
        setMensagem({ tipo: 'aviso', texto: `Retorno recusado. ${codigoDe(s)} continua não apto, ainda sem data de volta.` })
        const paciente = pacientes?.find((p) => p.aplicacaoId === s.aplicacaoId)
        if (paciente) setRetornoPendente({ ...paciente, apto: false })
      } else {
        await recusarSugestao(s.id, '')
        setMensagem({ tipo: 'sucesso', texto: `Sugestão recusada. ${codigoDe(s)} continua em ${diaCurto(s.origem)}.` })
      }
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: mensagemDe(e) })
    } finally {
      setOcupado(false)
      setVersao((v) => v + 1)
    }
  }

  function abrirNaoApto(paciente: Paciente, manterMotivo = false) {
    setNaoApto(paciente)
    setDataMinima('')
    setMotivoVazio(false)
    if (!manterMotivo) setMotivo('')
  }

  async function registrar(evento: FormEvent) {
    evento.preventDefault()
    const paciente = naoApto
    if (!paciente?.aplicacaoId) return
    const texto = motivo.trim()
    if (!texto) {
      setMotivoVazio(true) // "required" aceita só espaços; o diálogo continua aberto
      return
    }
    setNaoApto(null)
    setRetornoPendente(null)
    setOcupado(true)
    setMensagem(null)
    try {
      const s = await registrarNaoApto(paciente.aplicacaoId, dataMinima, texto)
      // A faixa da sugestão já mostra o retorno: a mensagem só confirma o registro.
      setMensagem({ tipo: 'sucesso', texto: `${paciente.codigo} registrada como não apta (volta sugerida em ${diaCurto(s.destino)}).` })
      setMotivo('')
    } catch (e) {
      // 422 sem dia de retorno: o não apto foi gravado mesmo assim (decisão médica não depende da agenda).
      const semDia = e instanceof ErroApi && e.status === 422 && e.message.includes('registrado como não apto')
      setMensagem({ tipo: semDia ? 'aviso' : 'erro', texto: mensagemDe(e) })
      if (semDia) setRetornoPendente({ ...paciente, apto: false })
    } finally {
      setOcupado(false)
      setVersao((v) => v + 1)
    }
  }

  async function procurar(evento: FormEvent) {
    evento.preventDefault()
    setProcurando(false)
    setMensagem(null)
    setRetornoPendente(null)
    if (semana[6] < hoje) {
      setMensagem({ tipo: 'aviso', texto: 'Esta semana já passou. Escolha um dia de hoje em diante.' })
      return
    }
    setOcupado(true)
    // Não sugere mover nada para trás de hoje: a busca começa no maior entre o domingo da semana e hoje.
    const inicio = semana[0] < hoje ? hoje : semana[0]
    try {
      const novas = await gerarSugestoes(medProcura, inicio, semana[6])
      const total = novas.reduce((soma, s) => soma + s.economiaEstimada, 0)
      setMensagem(
        novas.length === 0
          ? { tipo: 'aviso', texto: `Nenhuma remarcação de ${nomeDe(medProcura)} reduz o custo nesta semana.` }
          : {
              tipo: 'sucesso',
              texto: `${novas.length} ${novas.length === 1 ? 'sugestão' : 'sugestões'} de ${nomeDe(medProcura)}, economia estimada de ${formatarMoeda(total)}. Elas aparecem no dia de origem de cada aplicação.`,
            },
      )
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: mensagemDe(e) })
    } finally {
      setOcupado(false)
      setVersao((v) => v + 1)
    }
  }

  return (
    <section className="pagina agenda">
      <title>Agenda – Oncotimize</title>
      <div className="agenda-topo">
        <h1>Agenda</h1>
        <div className="agenda-dia">
          <button type="button" className="botao-icone" aria-label="Dia anterior" onClick={() => irPara(somarDias(dia, -1))}>
            ‹
          </button>
          {/* Campo de data nativo: um clique abre o calendário do navegador para escolher qualquer dia. */}
          <CampoData className="agenda-dia-campo" rotulo="Escolher o dia" valor={dia} onMudar={irPara} />
          <span className="agenda-dia-nome" aria-live="polite">
            {DIA_SEMANA_LONGO.format(paraData(dia))}
          </span>
          <button type="button" className="botao-icone" aria-label="Próximo dia" onClick={() => irPara(somarDias(dia, 1))}>
            ›
          </button>
        </div>
      </div>

      <nav className="semana" aria-label="Dias da semana">
        {semana.map((d) => (
          <button
            key={d}
            type="button"
            aria-current={d === dia ? 'date' : undefined}
            aria-label={`${DIA_LONGO.format(paraData(d))}: ${contagem[d] ?? 'carregando'} ${contagem[d] === 1 ? 'paciente' : 'pacientes'}`}
            onClick={() => irPara(d)}
          >
            <span>{diaCurto(d)}</span>
            <strong>{contagem[d] ?? '–'}</strong>
            <span className="semana-legenda">{contagem[d] === 1 ? 'paciente' : 'pacientes'}</span>
          </button>
        ))}
      </nav>

      {/* Região viva sempre montada: o leitor de tela anuncia a mensagem quando ela aparece. */}
      <div aria-live="polite">
      {mensagem && (
        <p className={`mensagem mensagem-${mensagem.tipo}`} role={mensagem.tipo === 'erro' ? 'alert' : undefined}>
          {mensagem.texto}
          {retornoPendente && ehAdmin && (
            <>
              {' '}
              <button type="button" className="botao-link" onClick={() => abrirNaoApto(retornoPendente, true)}>
                Tentar outra data mínima
              </button>
            </>
          )}
        </p>
      )}
      </div>

      {sugestoesDoDia.map((s) => (
        <div className="sugestao" key={s.id}>
          <p>
            {s.tipo === 'NAO_APTO' ? (
              <>
                <strong>{codigoDe(s)}</strong> não está apto{s.motivoRemarcacao ? ` (${s.motivoRemarcacao.toLowerCase()})` : ''}.
                Volta sugerida: <strong>{DIA_LONGO.format(paraData(s.destino)).replace(/\/\d{4}$/, '')}</strong>.
              </>
            ) : (
              <>
                Mover <strong>{codigoDe(s)}</strong> para <strong>{DIA_LONGO.format(paraData(s.destino)).replace(/\/\d{4}$/, '')}</strong>,
                junto com pacientes do mesmo medicamento.
              </>
            )}{' '}
            {s.economiaEstimada > 0.005
              ? `Nesse dia ele divide frascos com outros pacientes: economia de ${formatarMoeda(s.economiaEstimada)}.`
              : 'É o primeiro dia possível; não há outros pacientes do mesmo medicamento para dividir frasco.'}
          </p>
          {ehAdmin && (
            <div className="acoes-linha">
              <button type="button" className="botao-principal botao-pequeno" disabled={ocupado} onClick={() => decidir(s, 'aceitar')}>
                {s.tipo === 'NAO_APTO' ? `Aceitar volta em ${formatarData(s.destino).slice(0, 5)}` : 'Aceitar'}
              </button>
              <button type="button" className="botao-secundario botao-pequeno" disabled={ocupado} onClick={() => decidir(s, 'recusar')}>
                Recusar
              </button>
            </div>
          )}
        </div>
      ))}

      {!pacientes && (
        <p className="vazio" role="status">
          Carregando o dia…
        </p>
      )}
      {pacientes && pacientes.length === 0 && !falhouCarga && <p className="vazio">Nenhum paciente agendado neste dia.</p>}
      {pacientes && pacientes.length > 0 && (
        <ul className="pacientes">
          {pacientes.map((p) => {
            const sugestao = sugestaoDe(p.aplicacaoId)
            return (
              <li key={p.codigo}>
                <div className="paciente-dados">
                  <strong>{p.codigo}</strong>
                  <span>{p.itens.map((i) => `${nomeDe(i.medicamentoId)} ${formatarMg(i.doseMg)}`).join(' + ')}</span>
                  {p.nota && <span className="paciente-nota">{p.nota}</span>}
                </div>
                {p.semPrescricao ? (
                  <span className="etiqueta etiqueta-neutra">Aguardando prescrição</span>
                ) : (
                <span className={`etiqueta ${p.apto ? (sugestao ? 'etiqueta-aviso' : 'etiqueta-ok') : 'etiqueta-nao-apto'}`}>
                  {!p.apto
                    ? sugestao?.tipo === 'NAO_APTO'
                      ? `Não apto, retorno sugerido ${formatarData(sugestao.destino).slice(0, 5)}`
                      : 'Não apto'
                    : sugestao
                      ? 'Sugestão de remarcar'
                      : 'Apto'}
                </span>
                )}
                {ehAdmin && p.apto && p.aplicacaoId && !p.saiuDoDia && (
                  <button type="button" className="botao-secundario botao-pequeno" disabled={ocupado} onClick={() => abrirNaoApto(p)}>
                    Não apto
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {ehAdmin && (
        <button type="button" className="botao-link agenda-procurar" disabled={ocupado} onClick={() => setProcurando(true)}>
          Procurar remarcações nesta semana
        </button>
      )}

      <Dialogo aberto={naoApto !== null} titulo={naoApto?.apto ? 'Paciente não apto' : 'Tentar outro retorno'} onFechar={() => setNaoApto(null)}>
        {naoApto && (
          <form onSubmit={registrar}>
            <p>
              {naoApto.codigo}, {diaCurto(dia)}. O paciente sai da otimização do dia, com todos os medicamentos, e o sistema sugere
              o retorno no dia que divide mais frascos.
            </p>
            <label htmlFor="data-minima">Pode voltar a partir de</label>
            <input
              id="data-minima"
              type="date"
              required
              min={somarDias(dia, 1)}
              value={dataMinima}
              onChange={(e) => setDataMinima(e.target.value)}
            />
            <label htmlFor="motivo-nao-apto">Motivo</label>
            <textarea
              id="motivo-nao-apto"
              required
              maxLength={255}
              rows={2}
              placeholder="Imunidade baixa"
              value={motivo}
              aria-invalid={motivoVazio}
              aria-describedby={motivoVazio ? 'motivo-nao-apto-erro' : undefined}
              onChange={(e) => {
                setMotivo(e.target.value)
                setMotivoVazio(false)
              }}
            />
            {motivoVazio && (
              <p id="motivo-nao-apto-erro" className="mensagem mensagem-erro" role="alert">
                Informe o motivo.
              </p>
            )}
            <div className="acoes">
              <button type="submit" className="botao-principal">
                Registrar e sugerir retorno
              </button>
              <button type="button" className="botao-secundario" onClick={() => setNaoApto(null)}>
                Voltar
              </button>
            </div>
          </form>
        )}
      </Dialogo>

      <Dialogo aberto={procurando} titulo="Procurar remarcações" onFechar={() => setProcurando(false)}>
        <form onSubmit={procurar}>
          <p>
            Semana de {formatarData(semana[0]).slice(0, 5)} a {formatarData(semana[6])}. O sistema testa mover cada aplicação
            dentro da janela autorizada e sugere as que juntam pacientes do mesmo medicamento.
          </p>
          <label htmlFor="procura-medicamento">Medicamento</label>
          <select id="procura-medicamento" required value={medProcura} onChange={(e) => setMedProcura(e.target.value)}>
            <option value="">Escolha um medicamento</option>
            {medicamentos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
          <div className="acoes">
            <button type="submit" className="botao-principal">
              Procurar
            </button>
            <button type="button" className="botao-secundario" onClick={() => setProcurando(false)}>
              Voltar
            </button>
          </div>
        </form>
      </Dialogo>
    </section>
  )
}
