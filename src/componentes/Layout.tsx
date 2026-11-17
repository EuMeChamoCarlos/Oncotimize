import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

// Agrupadas por quem usa cada tela no fluxo da LMECC.
const GRUPOS = [
  { setor: 'Farmácia', telas: [{ caminho: '/plano-do-dia', rotulo: 'Plano do dia' }] },
  { setor: 'Enfermagem', telas: [{ caminho: '/agenda', rotulo: 'Agenda' }] },
  {
    setor: 'Consultas',
    telas: [
      { caminho: '/protocolos', rotulo: 'Protocolos' },
      { caminho: '/prescricoes', rotulo: 'Prescrições' },
    ],
  },
]

export default function Layout() {
  const { usuario, ehAdmin, sair } = useAuth()

  return (
    <div className="casca">
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <aside className="lateral">
        <p className="marca">
          <MarcaFrasco />
          Oncotimize
        </p>
        <nav aria-label="Telas">
          {GRUPOS.map((grupo) => (
            <div className="grupo" key={grupo.setor}>
              <p className="grupo-setor" id={`setor-${grupo.setor}`}>
                {grupo.setor}
              </p>
              <ul aria-labelledby={`setor-${grupo.setor}`}>
                {grupo.telas.map((tela) => (
                  <li key={tela.caminho}>
                    <NavLink to={tela.caminho}>{tela.rotulo}</NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="sessao">
          <p className="sessao-nome">{usuario?.name || usuario?.username}</p>
          {usuario?.name && <p className="sessao-detalhe">{usuario.username}</p>}
          <p className="sessao-detalhe">{ehAdmin ? 'Administrador: decide planos e remarcações' : 'Consulta: só leitura'}</p>
          <button type="button" className="botao-sair" onClick={sair}>
            Sair
          </button>
        </div>
      </aside>
      <main className="conteudo" id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}

function MarcaFrasco() {
  return (
    <svg className="marca-frasco" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="11" y="2" width="10" height="5" rx="1" fill="currentColor" />
      <rect x="8" y="8" width="16" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="18" width="12" height="10" rx="1.5" fill="currentColor" />
      <rect x="10" y="14" width="12" height="4" fill="var(--ambar-claro)" />
    </svg>
  )
}
