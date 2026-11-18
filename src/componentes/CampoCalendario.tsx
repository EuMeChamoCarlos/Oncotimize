import { useRef } from 'react'

interface Props {
  /** Texto do botão (ex.: "20/06 a 26/06/2027" ou "seg 01/03/2027"). */
  texto: string
  /** Dia escolhido, AAAA-MM-DD. */
  valor: string
  onMudar(valor: string): void
}

/**
 * Botão com a data que abre o calendário nativo do navegador (input escondido + showPicker). Escolher no
 * calendário dá sempre uma data completa, então não há o problema do ano digitado tecla a tecla do CampoData.
 */
export default function CampoCalendario({ texto, valor, onMudar }: Props) {
  const campo = useRef<HTMLInputElement>(null)

  function abrir() {
    if (!campo.current) return
    // showPicker exige um clique de verdade; navegador sem ele recebe o foco no campo.
    try {
      campo.current.showPicker()
    } catch {
      campo.current.focus()
    }
  }

  return (
    <span className="calendario">
      <button type="button" className="calendario-botao" onClick={abrir}>
        <span>{texto}</span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>
      <input
        ref={campo}
        type="date"
        className="calendario-input"
        tabIndex={-1}
        aria-hidden="true"
        min="2000-01-01"
        max="2100-12-31"
        value={valor}
        onChange={(e) => e.target.value && onMudar(e.target.value)}
      />
    </span>
  )
}
