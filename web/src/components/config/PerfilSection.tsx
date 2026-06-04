import { useRef, useState } from 'react'
import { Upload, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/store/useData'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'

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

const AVATAR_BUCKET = 'avatars'
const AVATAR_MAX_DIM = 512
const AVATAR_QUALITY = 0.85
const MAX_INPUT_BYTES = 10 * 1024 * 1024 // 10MB no input bruto; comprime depois

async function resizeImageToJpeg(file: File): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => (typeof r.result === 'string' ? resolve(r.result) : reject(new Error('read fail')))
    r.onerror = () => reject(new Error('Falha ao ler imagem'))
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('Falha ao decodificar imagem'))
    i.src = dataUrl
  })
  const ratio = Math.min(1, AVATAR_MAX_DIM / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * ratio))
  const h = Math.max(1, Math.round(img.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não disponível')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob retornou nulo'))),
      'image/jpeg',
      AVATAR_QUALITY,
    )
  })
  return blob
}

/**
 * Tenta extrair o path do storage a partir de uma public URL.
 * Retorna null se a URL não bater com o bucket avatars (ou for base64).
 */
function pathFromAvatarUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('data:')) return null
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx < 0) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

export function PerfilSection() {
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const email = session?.user?.email ?? ''
  const getProfile = useData((s) => s.getProfile)
  const setProfile = useData((s) => s.setProfile)
  const data = useData((s) => s.data)

  const initial = getProfile()
  const [name, setName] = useState(initial.name)
  const [timezone, setTimezone] = useState(initial.timezone)
  const [avatar, setAvatar] = useState<string | null>(initial.avatar)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
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

  async function handleAvatarFile(file: File | null) {
    setError(null)
    if (!file) return
    if (!userId) {
      setError('Sessão expirada. Faça login de novo.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('Imagem muito grande. Máximo 10MB no upload bruto.')
      return
    }

    setUploading(true)
    try {
      const blob = await resizeImageToJpeg(file)
      const path = `${userId}/avatar-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, {
          upsert: true,
          contentType: 'image/jpeg',
          cacheControl: '3600',
        })
      if (upErr) {
        setError(`Falha no upload: ${upErr.message}`)
        return
      }
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
      const newUrl = pub?.publicUrl
      if (!newUrl) {
        setError('Upload feito, mas não foi possível recuperar a URL.')
        return
      }
      const cacheBusted = `${newUrl}?t=${Date.now()}`
      // Tenta remover o avatar anterior pra não acumular lixo (best-effort).
      const oldPath = pathFromAvatarUrl(avatar)
      if (oldPath && oldPath !== path) {
        void supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      }
      setAvatar(cacheBusted)
      setProfile({ avatar: cacheBusted })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao processar imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveAvatar() {
    setError(null)
    const path = pathFromAvatarUrl(avatar)
    if (path) {
      const { error: rmErr } = await supabase.storage.from(AVATAR_BUCKET).remove([path])
      if (rmErr) {
        // Não bloqueia — limpa do profile mesmo assim.
        console.warn('[perfil] remove avatar falhou:', rmErr.message)
      }
    }
    setAvatar(null)
    setProfile({ avatar: null })
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
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                void handleAvatarFile(f)
                if (fileRef.current) fileRef.current.value = ''
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} />
              {uploading ? 'Enviando…' : 'Escolher foto'}
            </Button>
            {avatar && !uploading && (
              <button
                type="button"
                className="text-xs text-mist hover:text-ink"
                onClick={() => void handleRemoveAvatar()}
              >
                Remover foto
              </button>
            )}
            <p className="text-[11px] text-faint">
              Redimensionamos pra 512px e guardamos no seu armazenamento.
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
