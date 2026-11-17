import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  aberto: boolean
  titulo: string
  onFechar(): void
  children: ReactNode
}

/** <dialog> nativo: foco preso, Esc fecha e o fundo fica inerte sem biblioteca. */
export default function Dialogo({ aberto, titulo, onFechar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto])

  return (
    <dialog ref={ref} className="dialogo" aria-labelledby={idTitulo} onClose={onFechar}>
      <h2 id={idTitulo}>{titulo}</h2>
      {children}
    </dialog>
  )
}
