Frontend integration notes — DimensionaV3 backend changes

Resumo rápido

Este documento resume as mudanças no backend e fornece exemplos práticos (requests/respostas) para o time de frontend atualizar a tela de login, fluxos de avaliação e exibição de dados.

Principais mudanças

- Rota única de login: POST /login — mesma tela para admins e colaboradores.
- Colaborador loga por email (não CPF).
- `Cargo` é agora uma entidade com CRUD (/cargos).
- `ScpMetodo` está associado à `Unidade` (ao criar `Unidade` é obrigatório `scpMetodoId` e `numeroLeitos`).
- `Leito` aceita `justificativa` ao alterar status (PATCH /leitos/:id/status).
- Avaliações são "sessões": POST /avaliacoes/sessao cria ou sobrescreve a avaliação do mesmo leito no mesmo dia (para evitar duplicatas nas estatísticas).
- Sessões expiram no fim do dia local; job noturno consolida histórico (e há um endpoint manual para testes: POST /jobs/session-expiry).
- Estatísticas e exportação para PDF disponíveis em /estatisticas.

Autenticação (como usar)

- Endpoint: POST /login
- Body (JSON):

  {
    "email": "user@example.com",
    "senha": "senha123"
  }

- Header para chamadas autenticadas:

  Authorization: Bearer <token>

- Resposta (AuthResult):

  {
    "token": "<jwt>",
    "nome": "Fulano",
    "hospital": { "id": "<id>", "nome": "Hospital X" } | null,
    "cargo": "Enfermeiro" | null,
    "role": "ADMIN" | "COLAB" | "OTHER",
    "mustChangePassword": true|false
  }

- Observações: admin token expira ~2h; colaborador ~8h.

Principais endpoints e exemplos

1) Login (unificado)

- POST /login
- Body: { "email": "admin@example.com", "senha": "senha123" }

2) Criar unidade

- POST /unidades
- Body:
  {
    "nome": "UTI A",
    "hospitalId": "<hospitalId>",
    "scpMetodoId": "<scpMetodoId>",
    "numeroLeitos": 10
  }

3) Criar / sobrescrever sessão de avaliação

- POST /avaliacoes/sessao
- Header: Authorization: Bearer {{token}}
- Body:
  {
    "leitoId": "<leitoId>",
    "unidadeId": "<unidadeId>",
    "scp": "FUGULIN",
    "itens": { "q1": 2, "q2": 1 },
    "colaboradorId": "<colaboradorId>",
    "prontuario": "12345" // opcional
  }

- Comportamento: se já houver avaliação para o mesmo leito e data, o registro existente é atualizado (mesmo id) em vez de criar novo registro — isso evita inflar estatísticas.

4) Liberar sessão

- POST /avaliacoes/sessao/:avaliacaoId/liberar
- Header: Authorization

5) Atualizar status do leito (com justificativa)

- PATCH /leitos/:id/status
- Header: Authorization
- Body: { "status": "PENDENTE", "justificativa": "Limpeza necessária" }

6) Criar colaborador (login por email)

- POST /colaboradores
- Body exemplo:
  {
    "nome": "Fulano Teste",
    "email": "fulano@example.com",
    "senha": "senha",            // opcional — se omitida, senha inicial = cpf
    "cargo": "<cargoId>",
    "unidadeId": "<unidadeId>",
    "cpf": "00000000000"
  }

7) Cargos (CRUD)

- GET /cargos
- POST /cargos { "nome":"Enfermeiro", "sigla":"ENF" }
- PATCH /cargos/:id
- DELETE /cargos/:id

8) SCP Métodos

- POST /scp-metodos (cria schema dinâmico)
- GET /scp-metodos
- GET /scp-metodos/key/:key

9) Estatísticas e relatórios

- Unidade JSON: GET /estatisticas/unidade/:unidadeId/json?dataIni=YYYY-MM-DD&dataFim=YYYY-MM-DD
- Unidade PDF: GET /estatisticas/unidade/:unidadeId/pdf?dataIni=...&dataFim=...
- Hospital JSON: GET /estatisticas/hospital/:hospitalId/json?dataIni=...&dataFim=...
- Relatórios existentes:
  - GET /relatorios/resumo-diario?data=YYYY-MM-DD&unidadeId=...
  - GET /relatorios/mensal?unidadeId=...&ano=YYYY&mes=MM

10) Job de expiração (manual para testes)

- POST /jobs/session-expiry
- Body opcional: { "date": "YYYY-MM-DD" }

Notas para o frontend

- Login: única tela. Ao receber o JSON de login, salvar `token` e informações do usuário (nome, hospital, cargo, mustChangePassword). Se `mustChangePassword` for true, redirecionar para flow de mudança de senha (PATCH /colaboradores/:id/senha).

- Reavaliação: quando o usuário reavaliar o mesmo leito no mesmo dia, backend irá sobrescrever a avaliação existente; o frontend deve mostrar uma confirmação/aviso se for importante.

- Exibir SCP: ao listar unidades, ler o `scpMetodoKey`/`scpMetodoId` e carregar o schema (GET /avaliacoes/schema?scp=KEY ou GET /scp-metodos/key/:key) para renderizar o formulário de avaliação corretamente.

- PDF endpoints: retornam application/pdf; baixar/exibir no cliente quando solicitado.

Postman / testes

- Coleção de exemplo com todos os endpoints: `backend/postman_collections/all_endpoints.postman_collection.json` (inclui exemplos de body e variáveis: baseUrl, token, hospitalId, unidadeId, leitoId, colaboradorId, scpMetodoId, cargoId, dataIni, dataFim).

Sugestões opcionais (se quiser melhorar UX)

- Mostrar aviso ao reavaliar leito do mesmo dia.
- Incluir `hospitalId` explicitamente no payload retornado pelo login (se preferirem evitar usar hospital.id dentro do campo hospital) — posso adicionar se desejarem.

Contato

Se precisar de ajustes na API ou exemplos adicionais, posso: atualizar a coleção Postman (scripts/tests), adicionar um Environment com valores de exemplo, ou ajustar a resposta do login para incluir campos extras. 

---
Arquivo gerado automaticamente a partir das notas de integração do backend.
