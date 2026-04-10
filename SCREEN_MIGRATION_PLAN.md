# Plano de Migração de Telas — Blazor → React

Cada tela Blazor existente mapeada para sua equivalente React, com rota, endpoint(s) consumido(s), nível de complexidade e status.

---

## Legenda

| Complexidade | Critério |
|---|---|
| 🟢 Baixa | Apenas leitura, sem autenticação, sem estado complexo |
| 🟡 Média | Múltiplos endpoints, paginação, ou exige login |
| 🔴 Alta | Formulários com mutação, upload, lógica de negócio no front, ou fluxo admin |

| Status | Significado |
|---|---|
| ✅ Concluído | Tela funcionando no React |
| 🔄 Em andamento | Trabalho iniciado |
| ⬜ Pendente | Ainda não começado |

---

## Fase 1 — Telas públicas, sem autenticação

Prioridade máxima. Qualquer visitante acessa. Risco mínimo.

### 1. Home
- **Blazor:** `Pages/GameListPage/Home.razor` → `/{Banned?}`
- **React:** `/#/`
- **APIs:** `GET /api/home`
- **Complexidade:** 🟢 Baixa
- **Status:** ✅ Concluído
- **Observações:** Pinned lists, user activity feed, tag filters, lista paginada de todas as listas.

---

### 2. Busca
- **Blazor:** `Pages/Search/SeachIndex.razor` → `/search/{input?}`
- **React:** `/#/search`
- **APIs:** `GET /api/search?input=&page=&pageSize=`
- **Complexidade:** 🟢 Baixa
- **Status:** ✅ Concluído
- **Observações:** Três abas: Listas, Jogos, Usuários. A aba Usuários só aparece se logado. Input de busca na URL via query param.

---

### 3. Banco de Jogos
- **Blazor:** `Pages/Games/GamesIndex.razor` → `/games-database`
- **React:** `/#/games`
- **APIs:** `GET /api/games?page=&pageSize=&title=&trackStatus=&order=`
- **Complexidade:** 🟡 Média
- **Status:** ✅ Concluído
- **Observações:** Grid de jogos com paginação. Filtros de status do tracker (radio buttons) e ordenação. Se logado, filtra por jogos já trackeados.

---

### 4. Detalhe de Jogo
- **Blazor:** `Pages/Games/Details.razor` → `/game/{id}`
- **React:** `/#/games/:id`
- **APIs:**
  - `GET /api/games/:id`
  - `GET /api/games/:id/citations?page=`
  - `GET /api/games/:id/tracker` (se logado)
- **Complexidade:** 🟡 Média
- **Status:** ✅ Concluído
- **Observações:** Exibe capa, score, posição média, lista de citações paginada. Se logado, mostra widget de tracker e comentários de amigos.

---

### 5. Detalhe de Lista
- **Blazor:** `Pages/GameListPage/Details.razor` → `/list/{slug}/{mode?}`
- **React:** `/#/list/:slug`
- **APIs:**
  - `GET /api/game-lists/:slug`
  - `GET /api/game-lists/:slug/critic-lists?page=`
  - `GET /api/game-lists/:slug/user-lists?page=`
  - `GET /api/game-lists/:slug/contributors`
- **Complexidade:** 🔴 Alta
- **Status:** ⬜ Pendente
- **Observações:** Tela mais complexa do projeto. Abas entre ranking por críticos e por usuários. Top winners com covers, tracker stats, fontes, contribuidores. Modo de edição para adicionar lista de usuário.

---

### 6. Timeline / História dos Video Games
- **Blazor:** `Pages/VideoGameHistory/Timeline.razor` → `/video-game-history`
- **React:** `/#/timeline`
- **APIs:** `GET /api/timeline` / `GET /api/timeline?generation=N`
- **Complexidade:** 🟢 Baixa
- **Status:** ✅ Concluído
- **Observações:** Lista de gerações com suas listas. Estrutura simples, dado estático.

---

### 7. Detalhe de Source List
- **Blazor:** `Pages/SourceList/Details.razor` → `/view-list/{id}`
- **React:** `/#/source-lists/:id`
- **APIs:** `GET /api/source-lists/:id`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Exibe uma lista original de uma fonte (crítico/site), com os jogos e posições.

---

### 8. Sobre
- **Blazor:** `Pages/About.razor` → `/about`
- **React:** `/#/about`
- **APIs:** `GET /api/pages/about`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Página estática com conteúdo do arquivo `wwwroot/about.txt`.

---

### 9. Privacidade
- **Blazor:** `Pages/Privacy.razor` → `/privacy-policy`
- **React:** `/#/privacy`
- **APIs:** `GET /api/pages/privacy`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Conteúdo estático.

---

## Fase 2 — Perfis públicos de usuários

Acessíveis sem login, mas com dados enriquecidos quando logado.

### 10. Perfil Público de Usuário
- **Blazor:** `Pages/Users/UserPage.razor` → `/users/{nickname}`
- **React:** `/#/users/:nickname`
- **APIs:**
  - `GET /api/users/:nickname`
  - `POST /api/users/:nickname/friend-requests` (se logado)
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Avatar pixel art, badges, listas e trackers públicos. Botão de adicionar amigo se logado e não for o próprio perfil. PixelEditor requer implementação própria em React.

---

### 11. Trackers de Usuário
- **Blazor:** `Pages/Users/UserTrackers.razor` → `/users/{nickname}/trackers`
- **React:** `/#/users/:nickname/trackers`
- **APIs:**
  - `GET /api/users/:nickname/tracker-stats`
  - `GET /api/users/:nickname/trackers/compare` (se amigo)
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Estatísticas de jogos completados, em andamento, etc. Aba de comparação disponível se o visitante for amigo do usuário.

---

### 12. Listas de Usuário
- **Blazor:** `Pages/UserLists/List.razor` → `/users/{nickname}/lists`
- **React:** `/#/users/:nickname/lists`
- **APIs:** `GET /api/users/:nickname/lists`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Lista paginada de listas enviadas pelo usuário.

---

### 13. Badges
- **Blazor:** `Pages/Badges/BadgesIndex.razor` → `/badges`
- **React:** `/#/badges`
- **APIs:** `GET /api/badges`
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Exibe todas as badges disponíveis em pixel art. Marca as que o usuário logado já conquistou. Requer renderização do pixel art.

---

### 14. Badges Promo
- **Blazor:** `Pages/Badges/BadgesPromoIndex.razor` → `/badges/promo`
- **React:** `/#/badges/promo`
- **APIs:** `GET /api/badges`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Versão promocional/simplificada da página de badges.

---

### 15. Top Contributors
- **Blazor:** `Pages/Users/TopContributors.razor` → `/top-contributors`
- **React:** `/#/top-contributors`
- **APIs:** `GET /api/users/top-contributors`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Ranking de usuários com mais contribuições. Tabela simples.

---

### 16. Busca de Usuários
- **Blazor:** `Pages/Users/UsersSearchIndex.razor` → `/users`
- **React:** `/#/users`
- **APIs:** `GET /api/users?search=&page=` (somente logado)
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Lista paginada de usuários com campo de busca. Acesso restrito a logados.

---

## Fase 3 — Fluxos autenticados

Requer login funcionando (Fase 3.0). Implementar autenticação antes de qualquer tela desta fase.

### 3.0 Login e Sessão ⚠️ Pré-requisito de toda a fase
- **Blazor:** redirecionamento via Identity → `/Identity/Account/Login`
- **React:** link para `GET /api/auth/login?returnUrl=`
- **APIs:**
  - `GET /api/auth/login` — redireciona para Google OAuth
  - `GET /api/auth/callback` — tratado pelo backend
  - `GET /api/auth/logout`
  - `GET /api/auth/session` — verifica se há sessão ativa
  - `GET /api/users/me` — retorna dados do usuário logado
- **Complexidade:** 🔴 Alta
- **Status:** ⬜ Pendente
- **Observações:** Fluxo cross-domain entre GitHub Pages e Render. Cookie `SameSite=None; Secure` já configurado no backend. O maior risco técnico do projeto — validar o mais cedo possível.

---

### 17. Preencher Informações do Usuário
- **Blazor:** `Pages/Users/UserExtraInfo.razor` → `/users/fill`
- **React:** `/#/users/fill`
- **APIs:**
  - `GET /api/users/me`
  - `PUT /api/users/me/nickname`
  - `GET /api/users/nickname-availability`
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Formulário de primeiro acesso. Usuário escolhe nickname, verifica disponibilidade em tempo real, salva.

---

### 18. Criar / Editar Lista de Usuário
- **Blazor:** `Pages/UserLists/NewList.razor` → `/users/{listType}/{mode}/{slug?}/{gameListId?}`
- **React:** `/#/lists/new` e `/#/lists/:id/edit`
- **APIs:**
  - `GET /api/trackers/list-options`
  - `GET /api/trackers/list-year-options`
  - `POST /api/user-lists`
  - `PUT /api/user-lists/:id`
  - `DELETE /api/user-lists/:id`
- **Complexidade:** 🔴 Alta
- **Status:** ⬜ Pendente
- **Observações:** Formulário com seleção de jogos via busca, ordenação de itens, seleção de categoria. Um dos formulários mais complexos do projeto.

---

### 19. Sugestões de Lista
- **Blazor:** `Pages/ListSuggestions/ListSuggestions.razor` → `/list-suggestions`
- **React:** `/#/list-suggestions`
- **APIs:** `GET /api/list-suggestions`
- **Complexidade:** 🟢 Baixa
- **Status:** ⬜ Pendente
- **Observações:** Lista de sugestões enviadas pela comunidade para novas listas a agregar.

---

### 20. Sugerir Nova Lista
- **Blazor:** `Pages/ListSuggestions/AddNewList.razor` → `/new-list/{slug}`
- **React:** `/#/lists/:slug/suggest`
- **APIs:** `POST /api/list-suggestions`
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Formulário de sugestão vinculado a uma lista existente. Requer login.

---

### 21. Amigos
- **Blazor:** `Pages/Users/FriendsIndex.razor` → `/users/friends`
- **React:** `/#/friends`
- **APIs:** `GET /api/friends`
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Lista de amigos e solicitações pendentes. Aceitar/recusar amizade.

---

### 22. Notificações
- **Blazor:** `Pages/Users/UserNotificationsPage.razor` → `/users/notifications`
- **React:** `/#/notifications`
- **APIs:** `GET /api/notifications?markAsRead=true`
- **Complexidade:** 🟡 Média
- **Status:** ⬜ Pendente
- **Observações:** Lista de notificações. Marcar como lidas ao abrir a página.

---

## Fase 4 — Admin

Acesso restrito a usuários com papel `admin`. Implementar por último.

### 23. Admin — Lista de Usuários
- **Blazor:** `Pages/Users/UsersIndex.razor` → `/admin/users`
- **React:** `/#/admin/users`
- **APIs:**
  - `GET /api/users/admin`
  - `PUT /api/users/admin/:nameIdentifier/ban`
- **Complexidade:** 🔴 Alta
- **Status:** ⬜ Pendente
- **Observações:** Tabela paginada de usuários com busca. Ação de banir/desbanir. Guarda de rota para `role=admin`.

---

### 24. Admin — Nova Lista Master
- **Blazor:** `Pages/Admin/NewMasterList.razor` → `/admin/master-lists/new`
- **React:** `/#/admin/lists/new`
- **APIs:** `POST /api/game-lists`
- **Complexidade:** 🔴 Alta
- **Status:** ⬜ Pendente
- **Observações:** Formulário de criação de uma nova `FinalGameList`. Apenas admin.

---

## Resumo por Fase

| Fase | Telas | Concluídas | Pendentes |
|---|---|---|---|
| 1 — Público sem auth | 9 | 5 (Home, Busca, Games, Game Detail, Timeline) | 4 |
| 2 — Perfis públicos | 7 | 0 | 7 |
| 3 — Autenticado | 6 + login | 0 | 7 |
| 4 — Admin | 2 | 0 | 2 |
| **Total** | **24** | **5** | **19** |

---

## Ordem de implementação recomendada

```
1.  Home                    ✅
2.  Busca
3.  Banco de Jogos
4.  Detalhe de Jogo
5.  Timeline
6.  Detalhe de Lista
7.  Detalhe de Source List
8.  Sobre + Privacidade
9.  Top Contributors
10. Badges
11. Perfil de Usuário
12. Trackers de Usuário
13. Listas de Usuário (pública)
--- LOGIN (validar aqui) ---
14. Login / Sessão
15. Preencher Info do Usuário
16. Busca de Usuários
17. Amigos
18. Notificações
19. Criar / Editar Lista
20. Sugestões de Lista
21. Badges Promo
22. Admin — Usuários
23. Admin — Nova Lista Master
```

---

## Componentes React reutilizáveis a criar

| Componente | Usado em |
|---|---|
| `ListCard` | Home, Busca, Detalhe de Lista ✅ |
| `GameCard` | Banco de Jogos, Busca ✅ |
| `Paginator` | Todas as telas com paginação ✅ |
| `Navbar` | Global ✅ |
| `Footer` | Global ✅ |
| `PixelAvatar` | Activity, Perfil, Badges |
| `TrackerWidget` | Detalhe de Jogo, Trackers de Usuário |
| `TabBar` | Busca, Detalhe de Lista, Trackers |
| `GameSelector` | Criar Lista, Sugerir Lista |
| `AdminGuard` | Telas de admin |
| `AuthGuard` | Telas autenticadas |
