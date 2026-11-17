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
| 2026-11-16 | Skill `frontend-design` (instalada em `.agents/skills/frontend-design`, link para o Claude Code) usada na fase 1 (identidade visual) e na fase 2 (tela principal da defesa). Versionados: `.agents/` e `skills-lock.json`. O link `.claude/skills/frontend-design` aponta para um caminho absoluto da máquina e fica no `.gitignore`; em outra máquina, recriar com `npx skills add https://github.com/anthropics/skills --skill frontend-design`. |

## 3. Estrutura de pastas (planejada; criada na fase 1)

```
Oncotimize/
├─ CLAUDE.md  MEMORIA.md  .env.example (VITE_API_URL=http://localhost:8080)
├─ index.html  package.json  vite.config.*
└─ src/
   ├─ main  App                    rotas
   ├─ api/                         cliente (fetch + Bearer + ProblemDetail), tipos dos DTOs,
   │                               otimizacoes, agenda, consultas, auth
   ├─ auth/                        AuthContext, RotaProtegida
   ├─ componentes/                 Layout (barra lateral + cabeçalho)
   ├─ paginas/                     Login, PlanoDoDia, Agenda, Protocolos, Prescricoes
   ├─ util/formatos                datas, mg, moeda (Intl)
   └─ estilos.css
```

## 4. Fases

| Fase | Branch | Tela | Situação |
|---|---|---|---|
| 0 | `docs/memoria-e-claude` | `CLAUDE.md`, `MEMORIA.md`, `.gitignore` e a skill `frontend-design` (`.agents/`, `skills-lock.json`) | validada e commitada em 2026-11-16; falta levar ao `main` (sem push) |
| 1 | `feature/login` | Vite + login + layout + rota protegida | a fazer |
| 2 | `feature/plano-do-dia` | Plano do dia (farmácia) | a fazer; depende da lacuna (a) |
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
| a | Não há `GET /api/otimizacoes?medicamentoId=&data=`; cada `POST` cria um plano novo | ao recarregar, o front não acha o plano do dia (nem se já foi confirmado), e cada "Gerar" duplica o plano | necessária na fase 2; branch na API quando o autor autorizar |
| b | `POST /api/aplicacoes/{id}/remarcacao` não marca as prescrições da aplicação como `NAO_APTO` | a otimização do dia ainda contaria o paciente; no front, seriam um `PUT /api/prescricoes/{id}` (corpo completo) por medicamento e depois o `POST`, sem transação | necessária na fase 3; proposta: a remarcação marca as prescrições daquela data na mesma transação |
| — | CORS | já libera `localhost:5173` e `3000` | ok, nada a fazer |
| — | Nomes de medicamento e frasco ausentes nas respostas; sugestões sem filtro por medicamento | resolvido no front | sem mudança na API |

**Atenção (2026-11-16):** a API tinha trabalho em andamento na branch `feature/entidades-sem-setters` (não commitada).
As branches das lacunas (a) e (b) partem do `master` depois que esse trabalho for validado e mesclado.

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

## 9. Perguntas em aberto

- **TypeScript ou JavaScript?** Recomendado: TypeScript (tipos dos DTOs). Confirmar se o professor de Web tem
  preferência (o autor está montando uma skill dele para o front).
- **Moeda na tela:** os custos do seed são fictícios e os números de Gê estão em US$; o protótipo de relatórios usa R$.
- **Imagens dos protótipos:** se o visual deles for a referência, exportar as telas em PNG.
