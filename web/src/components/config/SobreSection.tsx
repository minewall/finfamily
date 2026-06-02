import { Sparkles, Mail, FileText, Shield, ExternalLink } from 'lucide-react'

// Versão estática — quando o pipeline injetar via build (vite-plugin-version),
// substituir por __APP_VERSION__. Por enquanto reflete package.json manualmente.
const VERSION = '0.0.0'
const BUILD = 'Beta 2026'

export function SobreSection() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Sobre</h2>
        <p className="mt-1 text-sm text-mist">
          Quem é o Haile, qual versão você está usando e como entrar em contato.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo/10 text-indigo">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Haile</h3>
            <p className="mt-1 text-sm text-mist">
              Uma inteligência financeira pessoal que entende sua vida. Em vez de só
              registrar gastos, o Haile transforma seus números em escolhas — usando
              o Modelo Minewall pra separar o que é essencial do que é Poder de Escolha.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-[11px] uppercase tracking-wide text-faint">Versão</p>
          <p className="mt-1 text-lg font-semibold text-ink">{VERSION}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-[11px] uppercase tracking-wide text-faint">Build</p>
          <p className="mt-1 text-lg font-semibold text-ink">{BUILD}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <h3 className="text-sm font-semibold text-ink">Links úteis</h3>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <li>
            <a
              href="/termos"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-indigo hover:underline"
            >
              <FileText size={14} />
              Termos de uso
              <ExternalLink size={11} />
            </a>
          </li>
          <li>
            <a
              href="/privacidade"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-indigo hover:underline"
            >
              <Shield size={14} />
              Política de privacidade
              <ExternalLink size={11} />
            </a>
          </li>
          <li>
            <a
              href="mailto:oi@haile.com.br"
              className="inline-flex items-center gap-2 text-indigo hover:underline"
            >
              <Mail size={14} />
              Suporte — oi@haile.com.br
            </a>
          </li>
          <li>
            <a
              href="mailto:privacidade@haile.com.br"
              className="inline-flex items-center gap-2 text-indigo hover:underline"
            >
              <Shield size={14} />
              Privacidade — privacidade@haile.com.br
            </a>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-xs text-mist">
          Construído com Claude pela <span className="font-semibold text-ink">Averse Tecnologia</span>.
        </p>
      </div>
    </div>
  )
}
