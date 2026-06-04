import { useRef, useState } from 'react'
import { Upload, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/store/useData'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'

// Lista curta de timezones que cobre o ICP brasileiro + diáspora.
// Não é exaustiva: usuário em outro fuso pode digitar via fallback (futuro).
const TIMEZONES: string[] = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Rio_Branco',
  'America/Noronha',
  'America/Bahia',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
]

const MAX_AVATAR_BYTES = 512 * 1024 // 512KB — base64 inline; storage real fica pra próxima sprint.

export function PerfilSection() {
  const { session } = useAuth()
  const email = session?.user?.email ?? ''
  const getProfile = useData((s) => s.getProfile)
  const setProfile = useData((s) => s.setProfile)
  const data = useData((s) => s.data)

  // Seed local a partir do blob. Atualiza quando o blob recarrega.
  const initial = getProfile()
  const [name, setName] = useState(initial.name)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [avatar, setAvatar] = useState<string | null>(initial.avatar)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Resync quando data muda (vindo de outro device, por ex). Padrão React docs: ajustar
  // state ao mudar prop derivada sem useEffect, comparando referência prev.
  const [prevData, setPrevData] = useState(data)
  if (data && data !== prevData) {
    setPrevData(data)
    const p = getProfile()
    setName(p.name)
    setTimezone(p.timezone)
    setAvatar(p.avatar)
  }

  function handleSave() {
    setError(null)
    setProfile({ name: name.trim() || 'Usuário', timezone, avatar })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }

  function handleAvatarFile(file: File | null) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Imagem muito grande. Máximo 512KB (limite temporário).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') setAvatar(result)
    }
    reader.onerror = () => setError('Falha ao ler imagem.')
    reader.readAsDataURL(file)
  }

  function handleRemoveAvatar() {
    setAvatar(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-ink">Perfil</h2>
        <p className="mt-1 text-sm text-mist">
          Como o Haile te identifica. Mudanças ficam guardadas e sincronizam entre seus dispositivos.
        </p>
      </header>

      <div className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-elevated">
            {avatar ? (
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User size={32} className="text-mist" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} />
              Escolher foto
            </Button>
            {avatar && (
              <button
                type="button"
                className="text-xs text-mist hover:text-ink"
                onClick={handleRemoveAvatar}
              >
                Remover foto
              </button>
            )}
            <p className="text-[11px] text-faint">
              Máximo 512KB por enquanto. Storage dedicado em breve.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-line bg-surface p-6 md:grid-cols-2">
        <Field label="Nome">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você quer ser chamado"
          />
        </Field>
        <Field label="E-mail" hint="Vem da sua conta. Pra trocar, fale com a gente.">
          <Input value={email} disabled />
        </Field>
        <Field label="Fuso horário" className="md:col-span-2">
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {error && (
        <div className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave}>
          Salvar perfil
        </Button>
        {saved && <span className="text-sm text-green">Perfil atualizado.</span>}
      </div>
    </div>
  )
}
