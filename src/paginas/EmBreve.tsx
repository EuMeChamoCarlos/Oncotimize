/** Ocupa o lugar de uma tela até a fase dela (MEMORIA.md, seção 4). */
export default function EmBreve({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <section className="pagina">
      {/* React 19 leva o <title> para o <head>. */}
      <title>{`${titulo} – Oncotimize`}</title>
      <h1>{titulo}</h1>
      <p className="nota">Esta tela entra na fase {fase} do frontend.</p>
    </section>
  )
}
