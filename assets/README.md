# Assets — Haile

SVGs, favicons e assets visuais do app. Gerenciados pela equipe de design, revisados pela engenharia antes do merge.

## Estrutura

```
assets/
├── svg/            ← SVGs de marca (wordmark, Flow Mark, variantes)
├── favicon/        ← Ícones do app (favicon.ico, apple-touch-icon, etc.)
└── README.md
```

## Convenções

**SVGs de marca (`svg/`):**
- Nomeados com padrão: `haile-{elemento}-{variante}.svg`
- Ex: `haile-wordmark-dark.svg`, `haile-mark-indigo.svg`, `haile-mark-light.svg`
- Devem ter `viewBox` definido, sem `width`/`height` fixos no elemento raiz
- Otimizados via SVGO antes do commit (engenharia valida)

**Favicons (`favicon/`):**
- `favicon.ico` — 16x16 + 32x32 multi-size
- `favicon-32.png` — 32x32 PNG
- `favicon-192.png` — 192x192 para Android/PWA
- `favicon-512.png` — 512x512 para splash
- `apple-touch-icon-180.png` — 180x180 para iOS

## Fluxo

1. Designer exporta assets do Figma
2. Faz commit na branch `design/assets`
3. Engenharia abre PR → valida viewBox, otimização, nomenclatura
4. Merge → engenharia atualiza referências no HTML/CSS
