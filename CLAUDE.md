# CLAUDE.md

Orientação para o Claude Code neste repositório: o **frontend do Oncotimize** (TCC de Ciência da Computação,
UFERSA, prazo dezembro de 2026). A API fica em outro repositório, na mesma máquina:
`C:\Users\Segundo\IdeaProjects\oncoDoseAPI` (GitHub `EuMeChamoCarlos/Oncotimize-API`).

## Ler antes de qualquer tarefa

1. `..\oncoDoseAPI\MEMORIA.md`: **memória principal do TCC** (LMECC, Tasy, fluxo do paciente, modelo de Gê,
   decisões e o que falta). Ler inteira.
2. `MEMORIA.md` (deste repositório): estado do front, com as fases, as decisões de tela e o contrato com a API.
3. `..\oncoDoseAPI\AGENTS.md`: protocolo de trabalho (triagem, branch por tarefa, validação do autor, segurança).
   Vale aqui também, trocando "Postman" por "rodar a tela localmente".
4. Os controllers e DTOs em `..\oncoDoseAPI\src\main\java\br\edu\ufersa\pw\oncotimize\application\api` são a fonte
   da verdade do contrato. Conferir lá antes de supor um campo ou rota.

**As duas memórias acompanham toda mudança, na mesma conversa** (regra do autor): informação nova, nome trocado,
decisão revista ou item descartado vão para o `MEMORIA.md` do front. Se a mudança for do TCC ou da API, vão também
para o `MEMORIA.md` da API. Ao fim, atualizar a data de "Última atualização".

## Escopo

Telas que demonstram o trabalho na defesa: login, plano do dia (farmácia), agenda (sugestões e não apto) e consultas
só de leitura (protocolos, aplicações, prescrições). **Fora:** cadastros, relatórios, painéis, administração de
usuários. Não acrescentar telas fora dessa lista sem o autor pedir.

## Regras

- **Português** no código (nomes de componentes, funções, variáveis) e em todos os textos da interface.
- **Sem dados de pacientes.** A interface mostra só códigos (`PTC…`, `PRE…`), medicamento, dose em mg e datas.
  Nada de nome, prontuário, CPF ou nascimento, nem em dados de exemplo. Os protótipos do autor usam nomes, mas eles
  não entram.
- **Dependências mínimas:** React, React DOM, React Router e Vite. Chamadas com `fetch` nativo, datas com
  `<input type="date">`, formatação com `Intl`. Nenhuma dependência nova sem perguntar ao autor.
- **Erros da API** chegam como RFC 9457 `ProblemDetail` (`title`, `detail`, `status`, e `erros` nos 400 de
  validação). Mostrar o `detail` ao usuário. Um 401 apaga o token e volta ao login.
- **Perfis:** a escrita (otimizar, confirmar, recusar, gerar sugestões, aceitar, registrar não apto) exige o papel
  ADMIN (authority `ROLE_ADMIN` na API). O perfil vem de `GET /api/users/me`, campo `role` com valor `"ADMIN"` ou
  `"USER"`, **sem** o prefixo `ROLE_`: comparar `role === 'ADMIN'`. Esconder ou desabilitar as ações para quem não é
  ADMIN; a API recusa com 403 de qualquer forma.
- Não mudar a API a partir daqui. Lacuna encontrada → registrar no `MEMORIA.md` e propor uma branch na API.

## Fluxo de trabalho

- Triagem antes de cada tarefa, como no `AGENTS.md` da API (tamanho, testes, branch).
- **Uma branch por fase** (`feature/<tela>`), nunca no `main`. A IA implementa e confere `npm run build`. Depois
  entrega ao autor os passos para validar a tela no navegador. **O autor valida e decide o commit**; a IA só
  commita ou faz push quando ele pede.
- Cada entrega inclui os passos para ver a tela: subir a API com o seed, subir o front, usuário de teste e o caminho
  na interface (quais medicamento e data escolher para ver dados).
- A skill `frontend-design` (em `.agents/skills`) define a identidade visual na fase 1 e a tela principal na fase 2.
  As outras telas reaproveitam os mesmos tokens e componentes.

## Comandos

Front (definidos na fase 1; atualizar aqui se mudarem):

```
npm install
npm run dev      # http://localhost:5173 (porta liberada no CorsConfig da API)
npm run build    # confere tipos e build antes de entregar
```

API (no repositório dela; precisa do Postgres local, serviço `postgresql-x64-18`):

```
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"   # http://localhost:8080, carrega o seed
```

O seed não cria usuário: `POST /api/users` cria um USER e a promoção a ADMIN é feita pelo SQL do `AGENTS.md` da API.

## Ambiente

- Windows. Não reescrever arquivos com PowerShell 5.1 (quebra o UTF-8); usar as ferramentas de edição ou o Bash.
- O hook GateGuard pede fatos antes da primeira escrita em cada arquivo: apresentar os fatos e repetir a operação.
