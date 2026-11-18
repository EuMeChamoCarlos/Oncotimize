import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarMedicamentos, listarPlanosDoDia, previaDoDia } from '../api/plano'
import type { Medicamento, Otimizacao, PlanoCalculado, PlanoPrevio } from '../api/tipos'
import CampoCalendario from '../componentes/CampoCalendario'
import DetalheDoPlano, { CORES, resumoFrascos } from '../componentes/DetalheDoPlano'
import FrascoDoPlano from '../componentes/FrascoDoPlano'
import { formatarData, formatarMg, formatarMoeda, formatarPercentual, hojeIso } from '../util/formatos'

type Situacao = 'previa' | 'aguardando' | 'confirmado' | 'recusado'

/** Um medicamento no dia: o plano gravado em vigor ou, sem ele (ou recusado), a prévia calculada agora. */
interface Cartao {
  medicamento: Medicamento
  plano: PlanoCalculado | null
  problema: string | null
  situacao: Situacao
}

const ROTULO: Record<Situacao, { texto: string; classe: string }> = {
  previa: { texto: 'Prévia', classe: 'etiqueta' },
  aguardando: { texto: 'Aguardando confirmação', classe: 'etiqueta etiqueta-aviso' },
  confirmado: { texto: 'Confirmado', classe: 'etiqueta etiqueta-ok' },
  recusado: { texto: 'Recusado · nova prévia', classe: 'etiqueta etiqueta-nao-apto' },
}

const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado. Tente de novo.')

// Datas ISO tratadas em UTC: o fuso não troca o dia.
const somarDias = (iso: string, dias: number) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}
const ehDataValida = (iso: string) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && somarDias(iso, 0) === iso
const DIA_SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const diaComSemana = (iso: string) => `${DIA_SEMANA.format(new Date(`${iso}T00:00:00Z`)).replace('.', '')} ${formatarData(iso)}`

/** Junta a prévia com os planos gravados: o gravado vale, a menos que tenha sido recusado. */
function montarCartoes(medicamentos: Medicamento[], previa: PlanoPrevio[], planos: Otimizacao[]): Cartao[] {
  const ids = [...new Set([...previa.map((p) => p.medicamentoId), ...planos.map((p) => p.medicamentoId)])]
  return ids.flatMap((id): Cartao[] => {
    const medicamento = medicamentos.find((m) => m.id === id)
    if (!medicamento) return []
    const gravados = planos.filter((p) => p.medicamentoId === id) // a API manda o mais recente primeiro
    const vigente = gravados.find((p) => p.status === 'CONFIRMADA') ?? gravados[0]
    const daPrevia = previa.find((p) => p.medicamentoId === id)
    if (vigente && vigente.status !== 'RECUSADA') {
      return [{ medicamento, plano: vigente, problema: null, situacao: vigente.status === 'CONFIRMADA' ? 'confirmado' : 'aguardando' }]
    }
    return [{
      medicamento,
      plano: daPrevia?.plano ?? null,
      problema: daPrevia?.problema ?? null,
      situacao: vigente ? 'recusado' : 'previa',
    }]
  })
}

export default function PlanoDoDia() {
  const [busca, setBusca] = useSearchParams()
  // Data padrão fixada na montagem: um render depois da meia-noite não troca o dia sozinho.
  const [hoje] = useState(hojeIso)
  const pedido = busca.get('data') ?? ''
  const data = ehDataValida(pedido) ? pedido : hoje
  // ?medicamento= (links antigos) vira filtro e abre o cartão.
  const antigo = busca.get('medicamento')
  const filtro = (busca.get('medicamentos') ?? antigo ?? '').split(',').filter(Boolean)
  const aberto = busca.get('aberto') ?? antigo ?? ''

  const [medicamentos, setMedicamentos] = useState<Medicamento[] | null>(null)
  const [cartoes, setCartoes] = useState<Cartao[] | null>(null)
  const [versao, setVersao] = useState(0)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    listarMedicamentos()
      .then(setMedicamentos)
      .catch((e) => setErro(mensagemDe(e)))
  }, [])

  useEffect(() => {
    if (!medicamentos) return
    let ativo = true
    Promise.all([previaDoDia(data), listarPlanosDoDia(null, data)])
      .then(([previa, planos]) => {
        if (!ativo) return
        setCartoes(montarCartoes(medicamentos, previa, planos))
        setErro(null)
      })
      .catch((e) => ativo && setErro(mensagemDe(e)))
    return () => {
      ativo = false
    }
  }, [medicamentos, data, versao])

  function mudar(valores: Record<string, string>) {
    setBusca(
      (anterior) => {
        const nova = new URLSearchParams(anterior)
        nova.delete('medicamento')
        for (const [chave, valor] of Object.entries(valores)) {
          if (valor) nova.set(chave, valor)
          else nova.delete(chave)
        }
        return nova
      },
      { replace: true },
    )
  }

  function irPara(novoDia: string) {
    setCartoes(null)
    mudar({ data: novoDia, aberto: '' })
  }

  function alternarFiltro(id: string | null) {
    const novo = id === null ? [] : filtro.includes(id) ? filtro.filter((f) => f !== id) : [...filtro, id]
    mudar({ medicamentos: novo.join(','), aberto: novo.length === 0 || novo.includes(aberto) ? aberto : '' })
  }

  const visiveis = (cartoes ?? []).filter((c) => filtro.length === 0 || filtro.includes(c.medicamento.id))
  const comPlano = visiveis.flatMap((c) => (c.plano ? [c.plano] : []))
  const soma = (campo: (p: PlanoCalculado) => number) => comPlano.reduce((total, p) => total + campo(p), 0)
  const custo = soma((p) => p.custoOtimizado)
  const semCompartilhar = soma((p) => p.custoSemCompartilhamento)
  const economia = soma((p) => p.economia)
  const frascos = soma((p) => p.frascosAbertos.length)
  const sobra = soma((p) => p.desperdicioMg)
  const pacientes = soma((p) => new Set(p.alocacoes.map((a) => a.codigoPrescricao)).size)

  return (
    <section className="pagina plano">
      <title>Plano do dia – Oncotimize</title>
      <div className="agenda-topo">
        <h1>Plano do dia</h1>
        <div className="agenda-dia">
          <button type="button" className="botao-icone" aria-label="Dia anterior" onClick={() => irPara(somarDias(data, -1))}>
            ‹
          </button>
          <CampoCalendario texto={diaComSemana(data)} valor={data} onMudar={irPara} />
          <button type="button" className="botao-icone" aria-label="Próximo dia" onClick={() => irPara(somarDias(data, 1))}>
            ›
          </button>
          <span className="so-leitor" aria-live="polite">
            Plano de {diaComSemana(data)}
          </span>
        </div>
      </div>

      {erro && (
        <p className="mensagem mensagem-erro" role="alert">
          {erro}
        </p>
      )}

      {!cartoes && !erro && (
        <p className="vazio" role="status">
          Carregando o dia…
        </p>
      )}

      {cartoes && cartoes.length === 0 && <p className="vazio">Nenhum paciente apto neste dia.</p>}

      {cartoes && cartoes.length > 0 && (
        <>
          <dl className="painel-resumo" aria-label="Resumo do dia">
            <div>
              <dt>Custo do dia</dt>
              <dd>{formatarMoeda(custo)}</dd>
            </div>
            <div>
              <dt>Sem compartilhar</dt>
              <dd>{formatarMoeda(semCompartilhar)}</dd>
            </div>
            <div className="painel-resumo-destaque">
              <dt>Economia</dt>
              <dd>
                {formatarMoeda(economia)}
                {semCompartilhar > 0 && <span> ({formatarPercentual(economia / semCompartilhar)})</span>}
              </dd>
            </div>
            <div>
              <dt>Frascos abertos</dt>
              <dd>
                {frascos} <span>para {pacientes} {pacientes === 1 ? 'paciente' : 'pacientes'}</span>
              </dd>
            </div>
            <div>
              <dt>Sobra</dt>
              <dd>{formatarMg(sobra)}</dd>
            </div>
          </dl>

          <div className="filtro-chips" role="group" aria-label="Filtrar por medicamento">
            <button type="button" className="chip" aria-pressed={filtro.length === 0} onClick={() => alternarFiltro(null)}>
              Todos
            </button>
            {cartoes.map((c) => (
              <button
                key={c.medicamento.id}
                type="button"
                className="chip"
                aria-pressed={filtro.includes(c.medicamento.id)}
                onClick={() => alternarFiltro(c.medicamento.id)}
              >
                {c.medicamento.nome}
              </button>
            ))}
          </div>

          <div className="cartoes">
            {visiveis.map((c) => (
              <CartaoDoPlano
                key={c.medicamento.id}
                cartao={c}
                data={data}
                aberto={aberto === c.medicamento.id}
                onAlternar={() => mudar({ aberto: aberto === c.medicamento.id ? '' : c.medicamento.id })}
                onMudou={() => setVersao((v) => v + 1)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

interface PropsCartao {
  cartao: Cartao
  data: string
  aberto: boolean
  onAlternar(): void
  onMudou(): void
}

function CartaoDoPlano({ cartao, data, aberto, onAlternar, onMudou }: PropsCartao) {
  const { medicamento, plano, problema, situacao } = cartao
  const rotulo = ROTULO[situacao]
  const codigos = [...new Set(plano?.alocacoes.map((a) => a.codigoPrescricao) ?? [])]
  const cores = new Map(codigos.map((codigo, i) => [codigo, CORES[i % CORES.length]]))
  const idDetalhe = `detalhe-${medicamento.id}`

  return (
    <article className={aberto ? 'cartao-plano cartao-plano-aberto' : 'cartao-plano'} aria-labelledby={`nome-${medicamento.id}`}>
      <header className="cartao-plano-topo">
        <h2 id={`nome-${medicamento.id}`}>{medicamento.nome}</h2>
        <span className={rotulo.classe}>{rotulo.texto}</span>
      </header>

      {problema && <p className="mensagem mensagem-aviso">{problema}</p>}
      {!problema && !plano && <p className="vazio">Nenhum paciente apto agora.</p>}
      {plano && (
        <>
          <p className="nota">
            {codigos.length} {codigos.length === 1 ? 'paciente' : 'pacientes'} · {resumoFrascos(plano)}
          </p>
          <div className="frascos-mini">
            {plano.frascosAbertos.map((f) => (
              <FrascoDoPlano
                key={`${f.apresentacaoId}-${f.numeroFrasco}`}
                compacto
                rotulo={`Frasco ${f.numeroFrasco} de ${formatarMg(f.volumeMg)}`}
                descricao={null}
                volumeMg={f.volumeMg}
                partes={plano.alocacoes
                  .filter((a) => a.apresentacaoId === f.apresentacaoId && a.numeroFrasco === f.numeroFrasco)
                  .map((a) => ({ codigo: a.codigoPrescricao, volumeMg: a.volumeMg, cor: cores.get(a.codigoPrescricao) ?? 'var(--aco-escuro)' }))}
              />
            ))}
          </div>
          <p className="cartao-plano-numeros">
            <strong>{formatarMoeda(plano.custoOtimizado)}</strong>
            <span>
              {plano.economia >= 0
                ? `economia de ${formatarMoeda(plano.economia)}`
                : `${formatarMoeda(-plano.economia)} a mais que sem compartilhar`}
            </span>
          </p>
        </>
      )}

      <button type="button" className="botao-link" aria-expanded={aberto} aria-controls={idDetalhe} onClick={onAlternar}>
        {aberto ? 'Fechar detalhes' : 'Ver detalhes'}
      </button>
      {aberto && (
        <div id={idDetalhe}>
          <DetalheDoPlano medicamento={medicamento} data={data} onMudou={onMudou} />
        </div>
      )}
    </article>
  )
}
