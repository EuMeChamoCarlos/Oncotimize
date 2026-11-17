# MEMÓRIA DO FRONT — Oncotimize

> **Agente: a memória principal do TCC é `..\oncoDoseAPI\MEMORIA.md`. Leia aquela primeiro, inteira.** Este
> arquivo guarda só o que é do frontend: escopo, fases, decisões de tela, contrato com a API e lacunas.
> Datas no formato AAAA-MM-DD.
>
> **Regra do autor: este arquivo acompanha toda mudança, na mesma conversa.** Informação nova → acrescentar.
> Nome trocado (componente, rota, tela, campo) → trocar aqui. Decisão revista → substituir. Item descartado →
> remover ou marcar. O que for do TCC ou da API vai também para a memória da API.
>
> Última atualização: 2026-11-16.
>
> **Sem dados de pacientes aqui nem na interface.** Só códigos de protocolo e prescrição.

---

## 1. Contexto

- Repositório `EuMeChamoCarlos/Oncotimize` (público), em `C:\Users\Segundo\IdeaProjects\Oncotimize`, ao lado da
  API (`..\oncoDoseAPI`, GitHub `EuMeChamoCarlos/Oncotimize-API`).
- Objetivo: um front enxuto com as telas que demonstram o trabalho na defesa (dezembro de 2026). O artigo descreve
  a arquitetura como "frontend responsivo e backend encapsulado por uma API RESTful" (Introdução); na Figura 2 o
  front ainda aparece tracejado, como trabalho futuro. Quando o front existir, a figura e a seção 3.5 devem mudar.
- Plano aprovado pelo autor em 2026-11-16.

## 2. Decisões

| Data | Decisão |
|---|---|
| 2026-11-16 | React, escolhido pelo autor. Ferramenta de build: Vite (porta 5173, já liberada no `CorsConfig` da API). |
| 2026-11-16 | Dependências: `react`, `react-dom`, `react-router-dom`. `fetch` nativo, `<input type="date">`, `Intl` para números e datas. Sem axios, sem biblioteca de componentes, sem gerenciador de estado. |
| 2026-11-16 | Uma tela por fase, uma branch por fase; o autor valida rodando localmente antes do commit. |
| 2026-11-16 | Código e textos da interface em português. |
| 2026-11-16 | A interface mostra só códigos (`PTC…`, `PRE…`), nunca nomes de paciente, mesmo os protótipos tendo nomes. |
| 2026-11-16 | Token JWT (10 h) guardado no `localStorage`; o perfil vem de `GET /api/users/me`. Um 401 leva ao login. Não há rota de logout: sair = apagar o token. |
| 2026-11-16 | **TypeScript** (escolha do autor). Versões fixas, sem `^`, todas publicadas há mais de duas semanas: `react`/`react-dom` 19.3.1, `react-router-dom` 7.18.5, `vite` 8.3.5, `@vitejs/plugin-react` 6.1.2, `typescript` 7.0.2, `@types/react`/`@types/react-dom` 19.3.0. `npm run build` = `tsc --noEmit && vite build`. |
| 2026-11-16 | **Identidade visual** (skill `frontend-design`, fase 1): tokens em `src/estilos.css`. Cores: petróleo `#123C44` (barra lateral, botões), vidro `#F5F7F7` (fundo), aço `#D2D9DB`, tinta `#1A2427` (texto), âmbar `#B8700F`/`#E0A040` (sobra, foco, item ativo). Fonte única: Atkinson Hyperlegible Next (Google Fonts), escolhida pela legibilidade de números e letras parecidas (0/O, 1/l) em doses; números tabulares. O elemento marcante é o **frasco graduado dividido em doses, com a sobra hachurada em âmbar** (login); a fase 2 reaproveita esse desenho para os frascos reais do plano. Descartados: fundo creme com serifa, cartões com sombra, rótulos em caixa-alta. |
| 2026-11-16 | Login: 401 vira "E-mail ou senha incorretos."; outros erros mostram o `detail` da API; API fora do ar → "Não foi possível falar com a API em …". Token salvo em `localStorage` (`oncotimize.token`) e em memória (quando o `localStorage` falha). Um 401 com token apaga o token e mostra "Sua sessão expirou." no login. Depois de entrar, volta à tela pedida. Ajustes da revisão independente (12 agentes, 7 achados confirmados): o login
não envia o token salvo (`semSessao`), então senha errada não derruba a sessão; cada aba fixa o token em memória e
acompanha outra aba pelo evento `storage` (sair lá → "A sessão foi encerrada em outra aba."); respostas atrasadas da
conferência inicial são ignoradas depois de um login novo (contador de geração no `AuthContext`); só o token ainda
atual é apagado num 401; título da aba por tela (`<title>` do React 19); `<main>` no login; borda dos campos com 3,4:1.
Barra lateral agrupada por setor (Farmácia: Plano do dia; Enfermagem: Agenda; Consultas: Protocolos e Prescrições); perfil exibido como "Administrador: decide planos e remarcações" ou "Consulta: só leitura". |
| 2026-11-16 | Skill `frontend-design` (instalada em `.agents/skills/frontend-design`, link para o Claude Code) usada na fase 1 (identidade visual) e na fase 2 (tela principal da defesa). Versionados: `.agents/` e `skills-lock.json`. O link `.claude/skills/frontend-design` aponta para um caminho absoluto da máquina e fica no `.gitignore`; em outra máquina, recriar com `npx skills add https://github.com/anthropics/skills --skill frontend-design`. |

## 3. Estrutura de pastas

Criada na fase 1; os itens marcados com "(fase N)" entram depois.

```
Oncotimize/
├─ CLAUDE.md  MEMORIA.md  .env.example (VITE_API_URL=http://localhost:8080)
├─ index.html  package.json  tsconfig.json  vite.config.ts (porta 5173 fixa)
├─ .claude/launch.json            servidor "front" para o painel de navegador do Claude Code
└─ src/
   ├─ main.tsx  App.tsx            rotas; telas futuras aparecem como EmBreve
   ├─ api/  cliente.ts             fetch + Bearer + ProblemDetail (ErroApi) + token
   │        auth.ts  tipos.ts      (otimizacoes, agenda, consultas: fases 2 a 5)
   ├─ auth/                        AuthContext (useAuth: usuario, ehAdmin, entrar, sair), RotaProtegida
   ├─ componentes/Layout.tsx       barra lateral (marca, telas por setor, sessão e Sair)
   ├─ paginas/                     Login, EmBreve (PlanoDoDia, Agenda, Protocolos, Prescricoes: fases 2 a 5)
   └─ estilos.css                  tokens e estilos (util/formatos com Intl: fase 2)
```

## 4. Fases

| Fase | Branch | Tela | Situação |
|---|---|---|---|
| 0 | `docs/memoria-e-claude` | `CLAUDE.md`, `MEMORIA.md`, `.gitignore` e a skill `frontend-design` (`.agents/`, `skills-lock.json`) | validada e commitada (`e584d87`) em 2026-11-16; `main` local aponta para ela (sem push) |
| 1 | `feature/login` | Vite + login + layout + rota protegida | implementada em 2026-11-16 (build ok; testada no navegador contra a API local: erro de senha, login, recarregar, token inválido, volta à tela pedida, sair, 375 px); validada pelo autor e commitada em 2026-11-16 na `feature/login` (sem push; falta levar ao `main`) |
| 2 | `feature/plano-do-dia` | Plano do dia (farmácia): filtro por medicamento e data na URL (`?medicamento=&data=`), tabela das prescrições do dia com a origem de cada dose, barras de custo (por paciente × com o plano) e economia, frascos desenhados com uma faixa por prescrição e a sobra em âmbar, gerar/confirmar (diálogo)/recusar (diálogo com motivo) só para ADMIN | implementada em 2026-11-17 a partir da `feature/login`; build ok; testada no navegador só como perfil de consulta (Paclitaxel 01/03/2027). O agente não testou as ações de ADMIN (a promoção do usuário de teste foi bloqueada); revisão independente com 13 achados confirmados e corrigidos; validada pelo autor e commitada em 2026-11-17 na `feature/plano-do-dia` (sem push). Precisa da API nas branches `feature/listar-otimizacoes` + `feature/prescricoes-do-dia` (ou no `master` depois do merge) |
| 3 | `feature/agenda` | Sugestões de remarcação + não apto | a fazer; depende da lacuna (b) |
| 4 | `feature/consulta-protocolos` | Protocolos e aplicações (só leitura) | a fazer |
| 5 | `feature/consulta-prescricoes` | Prescrições (só leitura) | a fazer |

## 5. Contrato com a API, por tela

Fonte da verdade: `..\oncoDoseAPI\src\main\java\br\edu\ufersa\pw\oncotimize\application\api`. Listas vêm como
`PagedModel` (`content` + `page {size, number, totalElements, totalPages}`; `?page=&size=&sort=`). Toda escrita de
domínio (otimizações, agenda, aplicações, prescrições, protocolos, medicamentos, frascos) exige ADMIN; as exceções são
`POST /api/users` (público) e `DELETE /api/users/me` (qualquer autenticado), que o front não usa. Erros de negócio
(`DomainException` fora da lista de 400) voltam como 422.

### Fase 1 — Login
- `POST /api/auth/login` `{username, password}` → 200 `{token}`. Credencial errada → 401 `ProblemDetail`; campo em
  branco → 400.
- `GET /api/users/me` → `{id, username, name, role}`. `role` vale `"ADMIN"` ou `"USER"`, sem o prefixo `ROLE_`
  (o prefixo só existe na authority interna do Spring). `name` pode vir `null` (usuário sem perfil).
- Públicas: só `POST /api/auth/login`, `POST /api/users` e `GET /api/medicamentos` (exatamente essa rota:
  `/api/medicamentos/{id}` e `/api/medicamentos/{id}/frascos` exigem token).

### Fase 2 — Plano do dia
- `GET /api/medicamentos` → `{id, nome, codigoInterno}`.
- `GET /api/medicamentos/{id}/frascos` → `{id, medicamentoId, volumeMg, custo, quantidadeEstoque, descricaoTasy}`
  (para dar nome aos frascos do plano).
- `GET /api/prescricoes?data=&medicamentoId=` → `{id, codigoPrescricao, medicamentoId, doseMg, status (APTO|NAO_APTO),
  dataPrescricao, aplicacaoId}`: os pacientes do dia. A otimização usa só os APTO.
- `POST /api/otimizacoes` `{medicamentoId, data}` → 201 + `OtimizacaoResponse`: `{id, medicamentoId, data, status
  (CONCLUIDA|CONFIRMADA|RECUSADA), confirmadaEm, recusadaEm, recusadaPor, motivoRecusa, custoOtimizado,
  custoSemCompartilhamento, economia, desperdicioMg, frascosAbertos[{apresentacaoId, volumeMg, custo, numeroFrasco}],
  alocacoes[{codigoPrescricao, apresentacaoId, numeroFrasco, fracao, volumeMg}]}`. Sem prescrição APTO → 404;
  estoque insuficiente → 422. O enum `StatusOtimizacao` também declara `INFACTIVEL` e `ERRO`, que nenhum código
  atribui hoje; o front deve tolerá-los.
- `GET /api/otimizacoes/{id}`.
- `PUT /api/otimizacoes/{id}/confirmacao` (idempotente; baixa o estoque) e `PUT /api/otimizacoes/{id}/recusa`
  `{motivo?}` (confirmado não se recusa; recusado não se confirma → 422).

### Fase 3 — Agenda
- `GET /api/agenda/sugestoes/previa?medicamentoId=&inicio=&fim=` → `{medicamentoId, inicio, fim, ganhoTotal, tempoMs,
  sugestoes[{aplicacaoId, codigoProtocolo, numero, origem, destino, ganho}]}` (não grava nada).
- `POST /api/agenda/sugestoes` `{medicamentoId, inicio, fim}` → 201 + lista de `SugestaoResponse`.
- `GET /api/agenda/sugestoes?status=` (SUGERIDA|ACEITA|RECUSADA|EXPIRADA) → `SugestaoResponse {id, aplicacaoId,
  codigoProtocolo, numero, tipo (AGENDA|NAO_APTO), origem, destino, economiaEstimada, motivoRemarcacao, status,
  geradaEm, decididaEm, decididaPor, motivoDecisao}`. Sem filtro por medicamento: o filtro fica no front.
- `PUT /api/agenda/sugestoes/{id}/aceite` e `.../{id}/recusa` `{motivo?}` (até 500 caracteres). O aceite remarca a aplicação na
  mesma transação e expira as outras sugestões pendentes dela; falha se a data agendada mudou desde a sugestão.
- Não apto: `POST /api/aplicacoes/{aplicacaoId}/remarcacao` `{dataMinima, motivo}` → 201 + sugestão `NAO_APTO`
  (busca o melhor dia nos 14 dias após a data mínima). A aplicação vem do `aplicacaoId` da prescrição do dia.
  A data mínima tem de ser depois da data agendada; a aplicação tem de estar AGENDADA.

### Fases 4 e 5 — Consultas
- `GET /api/protocolos?medicamentoId=` e `GET /api/protocolos/{id}` → `{id, codigoProtocolo, medicacaoSubtipo, grupo,
  dataInicio, ciclos, diasIntervalo, intervaloMinimoDias, totalAplicacoes, medicamentos[{medicamentoId, doseMg, via,
  diasAplicacao}], aplicacoes[{id, protocoloId, numero, cicloNumero, diaCiclo, dataPrevista, dataAgendada, dataReal,
  diasAntes, diasDepois, inicioJanela, fimJanela, status (AGENDADA|REALIZADA|CANCELADA), motivoAlteracao}]}`.
  Não há rota de listagem de aplicações: elas vêm dentro do protocolo.
- `GET /api/prescricoes?data=&medicamentoId=` e `GET /api/prescricoes/{id}`.

As respostas trazem só os ids de medicamento e de apresentação. O front completa os nomes com as listas de
medicamentos e de frascos.

## 6. Lacunas da API

| | Lacuna | Efeito no front | Situação |
|---|---|---|---|
| a | Não há `GET /api/otimizacoes?medicamentoId=&data=`; cada `POST` cria um plano novo | ao recarregar, o front não acha o plano do dia (nem se já foi confirmado), e cada "Gerar" duplica o plano | **resolvida** (2026-11-17, API `39cc212` na `feature/listar-otimizacoes`, sem push; a fase 2 precisa da API rodando nessa branch ou no `master` depois do merge): `GET` paginado, mais recente primeiro; `POST` dá 409 se o dia já tem plano CONFIRMADO. **Na fase 2, o front abre o item CONFIRMADA da lista, se houver; senão, o mais recente** (um CONCLUIDA criado antes da confirmação de outro pode vir no topo) |
| b | `POST /api/aplicacoes/{id}/remarcacao` não marca as prescrições da aplicação como `NAO_APTO` | a otimização do dia ainda contaria o paciente; no front, seriam um `PUT /api/prescricoes/{id}` (corpo completo) por medicamento e depois o `POST`, sem transação | necessária na fase 3; proposta: a remarcação marca as prescrições daquela data na mesma transação |
| c | **Datas diferentes para "prescrição do dia"** (achado da revisão da fase 2): `GET /api/prescricoes?data=` filtra por `dataPrescricao`; o `OtimizarDiaUseCase` (`PrescricaoRepository.buscarDoDia`) usa a `dataAgendada` da aplicação (e `dataPrescricao` só sem aplicação). Aceitar uma remarcação muda só a `dataAgendada` | depois de uma remarcação, a tabela mostra pacientes diferentes dos que entram no plano | **resolvida na API** (decisão do autor em 2026-11-17: "listagem como o solver"; branch `feature/prescricoes-do-dia`, a partir da `feature/listar-otimizacoes`): `?data=` agora segue a data agendada da aplicação para as APTO (igual ao `buscarDoDia`) e a `dataPrescricao` para as NAO_APTO e o legado (o não apto fica no dia em que foi avaliado). A `dataPrescricao` continua sendo a data de emissão. No front, um código que só aparece no plano (plano gerado antes de a aplicação sair do dia) entra na tabela como "Saiu deste dia depois do plano; gere de novo" |
| — | Economia negativa possível: a linha de base "sem compartilhar" resolve cada paciente com o estoque cheio, ignorando o que os outros consomem | com estoque curto, a economia pode vir negativa | o front mostra "O plano custa X a mais que a linha de base…"; avaliar na API se a linha de base deve respeitar o estoque (afeta a métrica do artigo) |
| — | CORS | já libera `localhost:5173` e `3000` | ok, nada a fazer |
| — | Nomes de medicamento e frasco ausentes nas respostas; sugestões sem filtro por medicamento | resolvido no front | sem mudança na API |

**Base das lacunas (2026-11-17):** a `feature/entidades-sem-setters` foi mesclada no `master` da API (PR #30, `40bca50`).
Ela só tirou setters; **não** resolve (a) nem (b). As branches das lacunas partem desse `master`.

## 7. Protótipos do autor (`Downloads\Oncotimize.pdf`, feitos às pressas)

Lidos só como texto (o PDF não pôde ser renderizado como imagem na máquina). Telas: login ("Entrar no sistema",
usuário institucional), "Pacientes do dia" (enfermagem: agendados, atendidos, ausentes, intercorrências), "Frascos do
dia" / "Plano de abertura" (farmácia: frasco, medicamento, volume, pacientes, uso previsto, ações), modal "Atender
prescrição", administração de permissões e relatórios. Layout: barra lateral (Pacientes, Frascos, Relatórios,
Administração), cabeçalho com usuário e perfil.

- **Fica:** login; barra lateral + cabeçalho com usuário e perfil; "Plano de abertura" vira o plano do dia; a lista de
  prescrições do dia (APTO/NÃO APTO) entra no plano do dia.
- **Sai:** presença, ausência e intercorrência (não existem na API; a intercorrência é trabalho futuro); "Usar amanhã"
  e "Cancelar uso de sobra" (reaproveitamento entre dias fora do escopo, decisão de 16/11); administração; relatórios;
  "Esqueci minha senha"; nomes de pacientes.

## 8. Como ver os dados do seed (API com o perfil `dev`)

- Plano do dia: 2027-03-01 (fictício). Paclitaxel (custo 190 × 215 sem compartilhar), Doxorrubicina (540 × 570;
  o paciente não apto fica de fora), Ciclofosfamida (68 × 76).
- Agenda: período em torno de 2027-06-21/22 (`PTC2027-000101..110`). A aplicação `PTC2027-000110` nº 3 já foi
  remarcada para 22/06 num teste anterior, então o banco local pode não reproduzir a sugestão original.

- **Usuário de teste do agente:** `teste.front@oncotimize.test` (perfil USER), criado no banco local em 2026-11-16 por
  `POST /api/users` para testar o login. A senha ficou fora do repositório. Para testar as ações de escrita é preciso
  um usuário ADMIN (o autor usa o dele ou promove este pelo SQL do `AGENTS.md` da API).

## 9. Perguntas em aberto

- **Moeda na tela (provisório: R$, em `src/util/formatos.ts`, um lugar só):** os custos do seed são fictícios e os números de Gê estão em US$; o protótipo de relatórios usa R$.
- **Imagens dos protótipos:** se o visual deles for a referência, exportar as telas em PNG.
- **Fonte na defesa:** a Atkinson Hyperlegible Next vem do Google Fonts; sem internet, cai para a fonte do sistema.
  Se a apresentação for offline, baixar a fonte para `public/` (sem dependência nova).
- **Skill do professor de Web:** se ela chegar, conferir o código das fases já feitas contra ela.
