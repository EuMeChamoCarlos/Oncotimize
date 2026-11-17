import { Navigate, Route, Routes } from 'react-router-dom'
import RotaProtegida from './auth/RotaProtegida'
import Layout from './componentes/Layout'
import Agenda from './paginas/Agenda'
import EmBreve from './paginas/EmBreve'
import Login from './paginas/Login'
import PlanoDoDia from './paginas/PlanoDoDia'
import Protocolos from './paginas/Protocolos'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/plano-do-dia" replace />} />
          {/* Cada tela substitui o EmBreve na sua fase (MEMORIA.md, seção 4). */}
          <Route path="/plano-do-dia" element={<PlanoDoDia />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/protocolos" element={<Protocolos />} />
          <Route path="/prescricoes" element={<EmBreve titulo="Prescrições" fase={5} />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
