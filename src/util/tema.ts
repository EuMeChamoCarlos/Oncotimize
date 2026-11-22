// Preferência de tema: apenas claro/escuro; sem preferência salva, o padrão é claro.
export type PreferenciaTema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'oncotimize.tema'

export function lerPreferencia(): PreferenciaTema {
  try {
    if (localStorage.getItem(CHAVE_TEMA) === 'escuro') return 'escuro'
  } catch {
    /* armazenamento bloqueado: vale o padrão claro */
  }
  return 'claro'
}

export function salvarPreferencia(preferencia: PreferenciaTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, preferencia)
  } catch {
    /* sem persistência, a escolha vale para esta sessão */
  }
}

export function aplicarTema(preferencia: PreferenciaTema): void {
  document.documentElement.dataset.tema = preferencia
}
