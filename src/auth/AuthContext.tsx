import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buscarUsuarioAtual, entrar as entrarNaApi } from '../api/auth'
import { CHAVE_TOKEN, ErroApi, EVENTO_SESSAO_EXPIRADA, tokenSalvo } from '../api/cliente'
import type { UsuarioAutenticado } from '../api/tipos'

interface ValorAuth {
  usuario: UsuarioAutenticado | null
  /** Verdadeiro enquanto confere um token salvo de uma visita anterior. */
  carregando: boolean
  /** Só ADMIN decide (otimizar, confirmar, recusar, aceitar, registrar não apto). */
  ehAdmin: boolean
  /** Mensagem para a tela de login (sessão expirada, API fora do ar). */
  aviso: string | null
  entrar(email: string, senha: string): Promise<void>
  sair(): void
}

const AuthContexto = createContext<ValorAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioAutenticado | null>(null)
  const [carregando, setCarregando] = useState(() => tokenSalvo.ler() !== null)
  const [aviso, setAviso] = useState<string | null>(null)
  // Cada entrar/sair/troca em outra aba abre uma "geração"; resposta de uma geração antiga é ignorada
  // (ex.: a conferência do token salvo chegando depois de um login novo).
  const geracao = useRef(0)

  // Visita anterior deixou um token: confere se ainda vale.
  useEffect(() => {
    if (!tokenSalvo.ler()) return
    let ativo = true
    const minha = geracao.current
    const vale = () => ativo && geracao.current === minha
    buscarUsuarioAtual()
      .then((u) => vale() && setUsuario(u))
      .catch((erro: unknown) => {
        // O 401 já virou aviso pelo evento abaixo; outro erro (API fora do ar) mantém o token para tentar de novo.
        if (vale() && !(erro instanceof ErroApi && erro.status === 401)) {
          setAviso(erro instanceof Error ? erro.message : 'Não foi possível conferir a sessão.')
        }
      })
      .finally(() => vale() && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  // Sair ou entrar em outra aba muda o token salvo: esta aba acompanha.
  useEffect(() => {
    const aoMudarEmOutraAba = (evento: StorageEvent) => {
      if (evento.key !== CHAVE_TOKEN && evento.key !== null) return
      tokenSalvo.recarregar()
      const minha = ++geracao.current
      setCarregando(false)
      if (!tokenSalvo.ler()) {
        setUsuario(null)
        setAviso('A sessão foi encerrada em outra aba.')
        return
      }
      buscarUsuarioAtual()
        .then((u) => geracao.current === minha && setUsuario(u))
        .catch(() => {
          if (geracao.current === minha) setUsuario(null)
        })
    }
    window.addEventListener('storage', aoMudarEmOutraAba)
    return () => window.removeEventListener('storage', aoMudarEmOutraAba)
  }, [])

  useEffect(() => {
    const aoExpirar = () => {
      setUsuario(null)
      setAviso('Sua sessão expirou. Entre de novo para continuar.')
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    const { token } = await entrarNaApi(email, senha)
    const minha = ++geracao.current
    tokenSalvo.salvar(token)
    try {
      const u = await buscarUsuarioAtual()
      if (geracao.current !== minha) return
      setUsuario(u)
      setAviso(null)
      setCarregando(false)
    } catch (erro) {
      if (tokenSalvo.ler() === token) tokenSalvo.apagar()
      throw erro
    }
  }, [])

  const sair = useCallback(() => {
    geracao.current++
    setCarregando(false)
    tokenSalvo.apagar()
    setUsuario(null)
    setAviso(null)
  }, [])

  const valor = useMemo<ValorAuth>(
    () => ({ usuario, carregando, ehAdmin: usuario?.role === 'ADMIN', aviso, entrar, sair }),
    [usuario, carregando, aviso, entrar, sair],
  )

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
}

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContexto)
  if (!valor) throw new Error('useAuth precisa estar dentro do AuthProvider')
  return valor
}
