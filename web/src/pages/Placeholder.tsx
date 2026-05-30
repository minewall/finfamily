interface Props {
  title: string
  hint?: string
}

export default function Placeholder({ title, hint }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="mb-2 text-2xl font-bold text-ink">{title}</h1>
      <p className="text-sm text-mist">
        Esta tela ainda não foi migrada do Dino. {hint ?? 'Em breve no DUO.'}
      </p>
    </div>
  )
}
