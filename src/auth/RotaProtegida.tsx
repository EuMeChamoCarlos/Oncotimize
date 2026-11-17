import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/** Sem sessão, manda ao login guardando a tela pedida para voltar a ela depois de entrar. */
export default function RotaProtegida() {
  const { usuario, carregando } = useAuth()
  const local = useLocation()

  if (carregando) {
    return (
      <p className="abrindo" role="status">
        Abrindo sua sessão…
      </p>
    )
  }
  if (!usuario) {
    return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />
  }
  return <Outlet />
}
