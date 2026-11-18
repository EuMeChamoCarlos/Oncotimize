import { useId } from 'react'
import { formatarMg, formatarPercentual } from '../util/formatos'

export interface ParteDoFrasco {
  codigo: string
  volumeMg: number
  cor: string
}

interface Props {
  rotulo: string
  descricao: string | null
  volumeMg: number
  partes: ParteDoFrasco[]
  /** Só o desenho, pequeno (cartão do painel); a legenda fica no aria-label. */
  compacto?: boolean
}

// Interior útil do desenho: y de 46 a 218 (172 de altura).
const TOPO = 46
const BASE = 218
const ALTURA = BASE - TOPO

/** Frasco aberto no plano: cada prescrição é uma faixa; a sobra (descarte) fica hachurada em âmbar no topo. */
export default function FrascoDoPlano({ rotulo, descricao, volumeMg, partes, compacto = false }: Props) {
  const id = useId()
  const usado = partes.reduce((soma, parte) => soma + parte.volumeMg, 0)
  const sobra = Math.max(0, volumeMg - usado)

  let y = BASE
  const faixas = partes.map((parte) => {
    const altura = (parte.volumeMg / volumeMg) * ALTURA
    y -= altura
    return { ...parte, y, altura }
  })

  const descricaoAcessivel =
    `${rotulo}: ` +
    partes.map((p) => `${formatarMg(p.volumeMg)} para ${p.codigo}`).join(', ') +
    (sobra > 0.005 ? `; sobra de ${formatarMg(sobra)}` : '; sem sobra')

  return (
    <figure className={compacto ? 'frasco-plano frasco-plano-compacto' : 'frasco-plano'}>
      <svg viewBox="0 0 120 226" role="img" aria-label={descricaoAcessivel}>
        <defs>
          <clipPath id={`${id}-interior`}>
            <rect x="20" y={TOPO} width="80" height={ALTURA} rx="10" />
          </clipPath>
          <pattern id={`${id}-sobra`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--ambar-fundo)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ambar)" strokeWidth="2" />
          </pattern>
        </defs>

        <rect x="40" y="4" width="40" height="15" rx="3" fill="var(--aluminio)" />
        <rect x="35" y="17" width="50" height="8" rx="2" fill="var(--aluminio-escuro)" />
        <path d="M45 25 h30 v6 q0 4 6 6 v3 H39 v-3 q6 -2 6 -6 z" fill="none" stroke="var(--aco-escuro)" strokeWidth="1.5" />

        <g clipPath={`url(#${id}-interior)`}>
          {sobra > 0.005 && <rect x="20" y={TOPO} width="80" height={(sobra / volumeMg) * ALTURA} fill={`url(#${id}-sobra)`} />}
          {faixas.map((faixa) => (
            <rect
              key={faixa.codigo}
              x="20"
              y={faixa.y}
              width="80"
              height={Math.max(0, faixa.altura - 1.5)}
              fill={faixa.cor}
            />
          ))}
        </g>

        <rect x="14" y="40" width="92" height="184" rx="14" fill="none" stroke="var(--aco-escuro)" strokeWidth="2" />
        {[0.25, 0.5, 0.75].map((marca) => {
          const yMarca = BASE - marca * ALTURA
          return (
            <line key={marca} x1={marca === 0.5 ? 84 : 90} x2="98" y1={yMarca} y2={yMarca} stroke="var(--aco-escuro)" strokeWidth="1" />
          )
        })}
      </svg>

      {!compacto && (
      <figcaption>
        <p className="frasco-plano-rotulo">{rotulo}</p>
        {descricao && <p className="frasco-plano-descricao">{descricao}</p>}
        <ul className="frasco-plano-partes">
          {partes.map((parte) => (
            <li key={parte.codigo}>
              <span className="amostra" style={{ background: parte.cor }} aria-hidden="true" />
              {parte.codigo}: {formatarMg(parte.volumeMg)} ({formatarPercentual(parte.volumeMg / volumeMg)})
            </li>
          ))}
          <li className="frasco-plano-sobra">
            <span className="amostra amostra-sobra" aria-hidden="true" />
            {sobra > 0.005 ? `Sobra: ${formatarMg(sobra)}` : 'Sem sobra'}
          </li>
        </ul>
      </figcaption>
      )}
    </figure>
  )
}
