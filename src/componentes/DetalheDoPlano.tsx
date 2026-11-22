import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErroApi } from '../api/cliente'
import { confirmarPlano, gerarPlano, listarFrascos, listarPlanosDoDia, listarPrescricoesDoDia, recusarPlano } from '../api/plano'
import type { Frasco, Medicamento, Otimizacao, Prescricao } from '../api/tipos'
import { useAuth } from '../auth/AuthContext'
import Dialogo from './Dialogo'
import FrascoDoPlano, { type ParteDoFrasco } from './FrascoDoPlano'
import { formatarData, formatarDataHora, formatarMg, formatarMoeda } from '../util/formatos'

interface DadosDoDia {
  prescricoes: Prescricao[]
  frascos: Frasco[]
  planos: Otimizacao[]
}

type Acao = 'gerar' | 'confirmar' | 'recusar'

interface Props {
  medicamento: Medicamento
  data: string
  /** Depois de gerar, confirmar ou recusar: o painel recarrega o resumo e os cartões. */
  onMudou(): void
}

// Uma cor por prescrição, a mesma em todos os frascos; vizinhas alternam claro e escuro.
// Tokens CSS (definidos em estilos.css) para que a paleta acompanhe o tema claro/escuro sem filtros.
export const CORES = [
  'var(--cor-dose-1)',
  'var(--cor-dose-2)',
  'var(--cor-dose-3)',
  'var(--cor-dose-4)',
  'var(--cor-dose-5)',
  'var(--cor-dose-6)',
  'var(--cor-dose-7)',
  'var(--cor-dose-8)',
]

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.')

/** Detalhe de um medicamento no dia (aberto dentro do cartão do painel): prescrições, frascos e as ações. */
export default function DetalheDoPlano({ medicamento, data, onMudou }: Props) {
  const { ehAdmin } = useAuth()
  const medicamentoId = medicamento.id
  // Resposta de uma ação só vale se o cartão ainda está no mesmo medicamento e dia.
  const filtroAtual = useRef('')
  useEffect(() => {
    filtroAtual.current = `${medicamentoId}|${data}`
  }, [medicamentoId, data])

  const [dia, setDia] = useState<DadosDoDia | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<Acao | null>(null)
  const [dialogo, setDialogo] = useState<'confirmar' | 'recusar' | null>(null)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    setDia(null)
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
      onMudou()
      return true
    } catch (e) {
      if (filtroAtual.current === alvo) {
        setErro(mensagemDe(e))
        // 409/422: o plano do dia mudou (outro usuário, estoque); recarrega para mostrar o estado real.
        if (e instanceof ErroApi && (e.status === 409 || e.status === 422)) {
          setVersao((v) => v + 1)
          onMudou()
        }
      }
      return false
    } finally {
      setOcupado(null)
    }
  }

  const plano = dia ? (dia.planos.find((p) => p.status === 'CONFIRMADA') ?? dia.planos[0] ?? null) : null
  const aptas = dia?.prescricoes.filter((p) => p.status === 'APTO') ?? []
  // A lista e o solver usam o mesmo dia de preparo (API, lacuna (c) resolvida). Um código só no plano é de um plano
  // gerado antes de a aplicação sair deste dia (remarcação): entra na tabela como linha extra, com aviso.
  const codigosNaTabela = new Set(dia?.prescricoes.map((p) => p.codigoPrescricao) ?? [])
  const soNoPlano = [...new Set(plano?.alocacoes.map((a) => a.codigoPrescricao) ?? [])].filter(
    (codigo) => !codigosNaTabela.has(codigo),
  )
  const codigosNoPlano = new Set(plano?.alocacoes.map((a) => a.codigoPrescricao) ?? [])
  const naoAptosNoPlano = (dia?.prescricoes ?? [])
    .filter((p) => p.status === 'NAO_APTO' && codigosNoPlano.has(p.codigoPrescricao))
    .map((p) => p.codigoPrescricao)
  const foraDoPlano = (dia?.prescricoes ?? [])
    .filter((p) => p.status === 'NAO_APTO' && !codigosNoPlano.has(p.codigoPrescricao))
    .map((p) => p.codigoPrescricao)
  const codigosComCor = [...aptas.map((p) => p.codigoPrescricao), ...naoAptosNoPlano, ...soNoPlano]
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
    <div className="plano-detalhe">
      {erro && (
        <p className="mensagem mensagem-erro" role="alert">
          {erro}
        </p>
      )}
      {/* Região viva sempre montada: o leitor de tela anuncia o sucesso quando ele aparece. */}
      <div aria-live="polite">{sucesso && <p className="mensagem mensagem-sucesso">{sucesso}</p>}</div>

      {carregando && (
        <p className="vazio" role="status">
          Carregando…
        </p>
      )}

      {dia && (
        <>
          {plano && <SituacaoDoPlano plano={plano} />}

          {plano?.status === 'CONCLUIDA' && naoAptosNoPlano.length > 0 && (
            <p className="mensagem mensagem-aviso" role="status">
              Este plano inclui {naoAptosNoPlano.join(', ')}, que não {naoAptosNoPlano.length === 1 ? 'está' : 'estão'} mais
              apto{naoAptosNoPlano.length === 1 ? '' : 's'}.{' '}
              {aptas.length > 0 ? 'Gere de novo antes de confirmar o preparo.' : 'Não há outro paciente apto no dia: recuse o plano.'}
            </p>
          )}

          {!plano &&
            (aptas.length === 0 ? (
              <p className="vazio">Nenhum paciente apto para {medicamento.nome} neste dia.</p>
            ) : (
              <>
                <p className="nota">Prévia calculada agora; nada foi gravado. Gere o plano para confirmar o preparo.</p>
                <ul className="lista-simples">
                  {aptas.map((p) => (
                    <li key={p.id}>
                      {p.codigoPrescricao} <span>{formatarMg(p.doseMg)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ))}

          {plano && (
            <div className="plano-resumo">
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
              <div className="plano-numeros">
                <p className="plano-destaque">Abrir {resumoFrascos(plano)}</p>
                <p className="nota">
                  para {codigosNoPlano.size} {codigosNoPlano.size === 1 ? 'paciente' : 'pacientes'}, com{' '}
                  {formatarMg(plano.desperdicioMg)} de sobra
                </p>
                <div className="economia-caixa">
                  {plano.economia >= 0 ? (
                    <>
                      <p>Economia no dia</p>
                      <strong>{formatarMoeda(plano.economia)}</strong>
                    </>
                  ) : (
                    // A linha de base da API resolve cada paciente com o estoque cheio; com estoque curto ela sai mais barata.
                    <>
                      <p>Custo a mais que a linha de base</p>
                      <strong>{formatarMoeda(-plano.economia)}</strong>
                    </>
                  )}
                  <p>
                    {formatarMoeda(plano.custoOtimizado)} em vez de {formatarMoeda(plano.custoSemCompartilhamento)}, um frasco
                    por paciente
                  </p>
                </div>
              </div>
            </div>
          )}

          {plano && (foraDoPlano.length > 0 || soNoPlano.length > 0) && (
            <p className="nota">
              {foraDoPlano.length > 0 && `Fora do plano por não estarem aptos: ${foraDoPlano.join(', ')}. `}
              {soNoPlano.length > 0 && `Saíram deste dia depois do plano: ${soNoPlano.join(', ')}; gere de novo.`}
            </p>
          )}

          {ehAdmin ? (
            <div className="acoes">
              {(!plano || plano.status === 'RECUSADA') && aptas.length > 0 && (
                <button type="button" className="botao-principal" onClick={gerar} disabled={!!ocupado}>
                  {ocupado === 'gerar' ? 'Gerando…' : plano ? 'Gerar de novo' : 'Gerar plano'}
                </button>
              )}
              {plano?.status === 'CONCLUIDA' && (
                <>
                  <button type="button" className="botao-principal" onClick={() => setDialogo('confirmar')} disabled={!!ocupado}>
                    {ocupado === 'confirmar' ? 'Confirmando…' : 'Confirmar preparo'}
                  </button>
                  <button type="button" className="botao-secundario" onClick={() => setDialogo('recusar')} disabled={!!ocupado}>
                    {ocupado === 'recusar' ? 'Recusando…' : 'Recusar'}
                  </button>
                  {aptas.length > 0 && (
                    <button type="button" className="botao-link" onClick={gerar} disabled={!!ocupado}>
                      {ocupado === 'gerar' ? 'Gerando…' : 'Gerar de novo'}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="nota">Só administradores geram, confirmam ou recusam planos.</p>
          )}
        </>
      )}

      <Dialogo aberto={dialogo === 'confirmar'} titulo="Confirmar o preparo?" onFechar={() => setDialogo(null)}>
        <form onSubmit={confirmar}>
          <p>
            O estoque de {plano?.frascosAbertos.length ?? 0} {plano?.frascosAbertos.length === 1 ? 'frasco' : 'frascos'} de{' '}
            {medicamento.nome} será baixado e o plano de {formatarData(data)} ficará fechado. Confirme só depois de preparar
            as doses.
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
          <label htmlFor={`motivo-recusa-${medicamentoId}`}>Motivo (opcional)</label>
          <textarea
            id={`motivo-recusa-${medicamentoId}`}
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
    </div>
  )
}

function SituacaoDoPlano({ plano }: { plano: Otimizacao }) {
  if (plano.status === 'CONFIRMADA') {
    return (
      <p className="nota">Preparo confirmado{plano.confirmadaEm ? ` em ${formatarDataHora(plano.confirmadaEm)}` : ''}.</p>
    )
  }
  if (plano.status === 'RECUSADA') {
    return (
      <p className="nota">
        Recusado{plano.recusadaPor ? ` por ${plano.recusadaPor}` : ''}
        {plano.recusadaEm ? ` em ${formatarDataHora(plano.recusadaEm)}` : ''}
        {plano.motivoRecusa ? `: ${plano.motivoRecusa}` : ''}.
      </p>
    )
  }
  if (plano.status === 'CONCLUIDA') return null
  return <p className="mensagem mensagem-erro">O solver não encontrou um plano ({plano.status}).</p>
}

/** "2 frascos de 50 mg e 1 de 10 mg" (ordem da API: maior volume primeiro). */
export function resumoFrascos(plano: Pick<Otimizacao, 'frascosAbertos'>): string {
  const porVolume = new Map<number, number>()
  for (const f of plano.frascosAbertos) porVolume.set(f.volumeMg, (porVolume.get(f.volumeMg) ?? 0) + 1)
  const partes = [...porVolume].map(([volume, n], i) =>
    i === 0 ? `${n} ${n === 1 ? 'frasco' : 'frascos'} de ${formatarMg(volume)}` : `${n} de ${formatarMg(volume)}`,
  )
  return partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`
}
