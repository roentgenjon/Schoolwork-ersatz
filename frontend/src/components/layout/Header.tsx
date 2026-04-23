import { useAuth } from '../../hooks/useAuth'

interface HeaderProps {
  title: string
  actions?: React.ReactNode
}

export default function Header({ title, actions }: HeaderProps) {
  const { initials } = useAuth()

  return (
    <header
      className="flex items-center justify-between px-6 py-4 shrink-0"
      style={{ borderBottom: '1px solid #38383A' }}
    >
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 md:hidden"
          style={{ backgroundColor: '#007AFF' }}
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
