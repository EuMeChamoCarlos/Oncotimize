import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErroApi } from '../api/cliente'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { usuario, entrar, aviso } = useAuth()
  const local = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (usuario) {
    const destino = (local.state as { de?: string } | null)?.de ?? '/'
    return <Navigate to={destino} replace />
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrar(email.trim(), senha)
      // Com o usuário carregado, o Navigate acima leva à tela pedida.
    } catch (falha) {
      if (falha instanceof ErroApi && falha.status === 401) setErro('E-mail ou senha incorretos.')
      else setErro(falha instanceof ErroApi ? falha.message : 'Não foi possível entrar. Tente de novo.')
      setEnviando(false)
    }
  }

  return (
    <main className="acesso">
      <title>Entrar – Oncotimize</title>
      <section className="acesso-painel" aria-labelledby="acesso-marca">
        <p className="acesso-marca" id="acesso-marca">
          Oncotimize
        </p>
        <p className="acesso-lema">Abertura de frascos e agenda da farmácia de quimioterapia da LMECC.</p>
        <FrascoDividido />
        <p className="acesso-legenda">
          Um frasco de 1.000 mg atende três doses. O Oncotimize escolhe quais frascos abrir no dia, pelo menor custo, e
          divide cada um entre os pacientes do mesmo medicamento.
        </p>
      </section>

      <section className="acesso-formulario">
        <form onSubmit={enviar}>
          <h1>Entrar</h1>
          {aviso && !erro && (
            <p className="mensagem mensagem-aviso" role="status">
              {aviso}
            </p>
          )}
          {erro && (
            <p className="mensagem mensagem-erro" role="alert">
              {erro}
            </p>
          )}
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button type="submit" className="botao-principal" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  )
}

// Ilustração: 1.000 mg = 450 + 300 + 150 + 100 de sobra. Altura útil 228 (y 64 a 292), 22,8 por 100 mg.
const DOSES = [
  { mg: 450, y: 189.4, altura: 102.6, cor: 'var(--dose-1)' },
  { mg: 300, y: 121, altura: 68.4, cor: 'var(--dose-2)' },
  { mg: 150, y: 86.8, altura: 34.2, cor: 'var(--dose-3)' },
]

function FrascoDividido() {
  return (
    <svg
      className="frasco"
      viewBox="0 0 330 310"
      role="img"
      aria-label="Frasco de 1.000 mg dividido em doses de 450, 300 e 150 mg, com 100 mg de sobra"
    >
      <defs>
        <clipPath id="frasco-interior">
          <rect x="48" y="64" width="104" height="228" rx="12" />
        </clipPath>
        <pattern id="frasco-sobra" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--ambar-claro)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--petroleo-sombra)" strokeWidth="2" />
        </pattern>
      </defs>

      {/* tampa de alumínio, lacre e gargalo */}
      <rect x="72" y="6" width="56" height="24" rx="4" fill="var(--aluminio)" />
      <rect x="66" y="28" width="68" height="10" rx="3" fill="var(--aluminio-escuro)" />
      <path d="M78 38 h44 v8 q0 6 8 8 v2 H70 v-2 q8 -2 8 -8 z" fill="none" stroke="var(--vidro-borda)" strokeWidth="2" />

      <g clipPath="url(#frasco-interior)">
        {DOSES.map((dose, i) => (
          <rect
            key={dose.mg}
            className="frasco-dose"
            style={{ animationDelay: `${120 + i * 160}ms` }}
            x="48"
            y={dose.y}
            width="104"
            height={dose.altura - 2}
            fill={dose.cor}
          />
        ))}
        <rect
          className="frasco-dose"
          style={{ animationDelay: '600ms' }}
          x="48"
          y="64"
          width="104"
          height="22.8"
          fill="url(#frasco-sobra)"
        />
      </g>

      {/* corpo de vidro e graduação a cada 100 mg (traço longo em 500 mg) */}
      <rect x="40" y="56" width="120" height="244" rx="18" fill="none" stroke="var(--vidro-borda)" strokeWidth="3" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = 292 - (i + 1) * 22.8
        return (
          <line key={i} x1={i === 4 ? 132 : 140} x2="152" y1={y} y2={y} stroke="var(--vidro-borda)" strokeWidth="1.5" />
        )
      })}

      <g className="frasco-rotulo">
        <text x="176" y="245">450 mg</text>
        <text x="176" y="160">300 mg</text>
        <text x="176" y="109">150 mg</text>
        <text x="176" y="80" className="frasco-rotulo-sobra">
          100 mg de sobra
        </text>
      </g>
    </svg>
  )
}
