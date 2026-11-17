import { useEffect, useState } from 'react'

interface Props {
  valor: string
  onMudar(valor: string): void
  id?: string
  className?: string
  rotulo?: string
}

/** Ano entre 2000 e 2100: enquanto o ano é digitado ("0002", "0027"…), a data ainda não vale. */
const dataPlausivel = (valor: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const ano = Number(valor.slice(0, 4))
  return ano >= 2000 && ano <= 2100
}

/**
 * Campo de data nativo (o clique abre o calendário) que só avisa a tela quando a data está completa. Sem isso, cada
 * tecla do ano virava um filtro ("01/03/0027") e a tela buscava um dia que não existe na agenda.
 */
export default function CampoData({ valor, onMudar, id, className, rotulo }: Props) {
  const [texto, setTexto] = useState(valor)

  // Mudança de fora (setas da agenda, link com ?dia=): o campo acompanha.
  useEffect(() => setTexto(valor), [valor])

  return (
    <input
      id={id}
      type="date"
      className={className}
      aria-label={rotulo}
      required
      min="2000-01-01"
      max="2100-12-31"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        if (dataPlausivel(e.target.value)) onMudar(e.target.value)
      }}
    />
  )
}
