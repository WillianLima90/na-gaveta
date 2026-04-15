# Na Gaveta — Ambiente Oficial de Validação

> **Este é o documento de referência único para o ambiente de teste e validação.**
> Qualquer outro link, porta ou servidor que não esteja aqui deve ser considerado descartado.

---

## Link Oficial

```
https://4175-iv2ovznc6becjxpm4kjr6-bded4636.us2.manus.computer
```

> **Atenção:** Este link é gerado pelo sandbox do Manus e muda a cada nova sessão.
> Quando o Manus reiniciar, o link muda — mas a porta **4175** e o servidor `serve.js` permanecem os mesmos.
> Em uma nova sessão, basta pedir ao Manus: *"Qual é o link atual do ambiente oficial?"*

---

## Credenciais de Teste

| Usuário | E-mail | Senha |
|---|---|---|
| João Silva (líder do ranking) | `joao@nagaveta.com` | `senha123` |
| Maria Souza (2º lugar) | `maria@nagaveta.com` | `senha123` |
| Pedro Costa (3º lugar) | `pedro@nagaveta.com` | `senha123` |
| Admin Na Gaveta | `admin@nagaveta.com` | `senha123` |

---

## Bolão Principal de Validação

| Campo | Valor |
|---|---|
| Nome | Bolão do Brasileirão 2026 |
| Código de acesso | `BRAS26` |
| Visibilidade | Público |
| Membros | 4 (João, Maria, Pedro, Admin) |
| ID interno | `b3616745-385f-4994-829f-5c90c0960626` |

**Rota direta no app:**
```
https://4175-iv2ovznc6becjxpm4kjr6-bded4636.us2.manus.computer/pools/b3616745-385f-4994-829f-5c90c0960626
```

**Ranking atual do bolão (dados de validação):**
- 1º João Silva — 140 pts
- 2º Maria Souza — 85 pts
- 3º Pedro Costa — 35 pts
- 4º Admin Na Gaveta — 20 pts

---

## Arquitetura do Ambiente

| Componente | Porta | Processo |
|---|---|---|
| Frontend (app) | 4175 | `node serve.js` em `/home/ubuntu/na-gaveta/` |
| Backend (API) | 3001 | `ts-node-dev src/server.ts` em `/home/ubuntu/na-gaveta/backend/` |
| Banco de dados | 5432 | PostgreSQL local |

---

## O Que Preservar no Backup

### Obrigatório (fonte da verdade)

| O que | Onde | Por quê |
|---|---|---|
| Código-fonte completo | `/home/ubuntu/na-gaveta/` | Todo o projeto |
| Banco de dados | PostgreSQL: `na_gaveta_dev` | Todos os dados, usuários, bolões, palpites |
| Variáveis de ambiente | `/home/ubuntu/na-gaveta/backend/.env` | Configuração de banco e JWT |

### Como fazer backup do banco

```bash
pg_dump -U postgres na_gaveta_dev > backup_na_gaveta_$(date +%Y%m%d).sql
```

### Como restaurar o banco

```bash
psql -U postgres na_gaveta_dev < backup_na_gaveta_YYYYMMDD.sql
```

---

## O Que Pode Ser Ignorado

| O que | Por quê |
|---|---|
| Porta 4173 | Vite preview antigo — encerrado |
| Porta 4174 | Vite preview antigo — encerrado |
| Porta 4176 | Workaround temporário — encerrado |
| Porta 5173 | Vite dev server — encerrado |
| `/tmp/serve4176.js` | Script temporário — pode ser deletado |
| `frontend/dist/assets/` | Gerado pelo build — pode ser regenerado com `pnpm build` |
| `node_modules/` | Dependências — regeneradas com `pnpm install` |

---

## Substituição Formal do Ambiente

Se em algum momento este ambiente precisar ser substituído (ex: nova sessão do Manus com link diferente),
o Manus comunicará explicitamente: **"O ambiente oficial foi substituído. O novo link é: [URL]"**

Não haverá múltiplos links concorrendo. Apenas um link oficial por vez.

---

*Última atualização: 07/04/2026*
