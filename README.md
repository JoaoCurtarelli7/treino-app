# Treino

PWA pessoal para registrar treinos no iPhone: cargas por série, último treino, sugestão de progressão, evolução, peso corporal e fotos dos exercícios. Sem back-end — os dados ficam no aparelho (localStorage + IndexedDB para fotos).

## Estrutura

```
index.html          shell da página
css/app.css         estilos
js/main.js          bootstrap, eventos e roteamento de ações
js/config/          exercícios e programas (ABC, Full Body)
js/core/            regras e dados (store, histórico, progressão, fotos, catálogo, cache)
js/ui/              componentes (sheet, mídia, gráfico, timer, campos de plano)
js/views/           telas (treino, sessão, evolução, histórico, ajustes, editor de treino)
catalog.json        544 exercícios com nome em português
img/                fotos dos exercícios (free-exercise-db, domínio público)
sw.js               service worker (offline)
```

Deploy: site estático, sem build. Qualquer push na `main` publica na Vercel.
