# Design Tokens — Haile

Tokens gerenciados pelo **Token Studio** (plugin Figma). Este arquivo é gerado automaticamente — não editar à mão.

## Estrutura

```
tokens.json         ← fonte de verdade, editada via Token Studio no Figma
README.md           ← este arquivo
```

## Como funciona o fluxo

1. Designer edita tokens no Figma via Token Studio
2. Token Studio faz push automático para a branch `design/tokens`
3. Engenharia abre PR → revisa conflitos com `css/main.css`
4. Merge → engenharia aplica os tokens no CSS

## Grupos de tokens

| Grupo | Descrição |
|---|---|
| `global` | Valores brutos (cores Haile, spacing, radius, tipografia) |
| `semantic/dark` | Aliases para o tema escuro (padrão) |
| `semantic/light` | Aliases para o tema claro |

## Regra de nomeação

Os nomes dos tokens espelham as CSS variables do app:
- Token `global.color.haile-indigo` → `--haile-indigo` no CSS
- Token `semantic/dark.color.bg-surface` → `--bg-surface` no CSS

Qualquer token novo precisa ter a CSS variable correspondente criada pela engenharia antes de ser usado em componentes.
