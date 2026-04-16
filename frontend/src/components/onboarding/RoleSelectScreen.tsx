import { Building2, GraduationCap, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'
import type { Role } from '../../types'

interface RoleOption {
  role: Role
  icon: React.ReactNode
  title: string
  description: string
}

const roleOptions: RoleOption[] = [
  {
    role: 'admin',
    icon: <Building2 size={36} />,
    title: 'Admin',
    description: 'Schule verwalten',
  },
  {
    role: 'teacher',
    icon: <GraduationCap size={36} />,
    title: 'Lehrer',
    description: 'Klassen & Aufgaben',
  },
  {
    role: 'student',
    icon: <BookOpen size={36} />,
    title: 'Schüler',
    description: 'Lernen & Einreichen',
  },
]

interface RoleSelectScreenProps {
  selectedRole: Role | null
  onSelectRole: (role: Role) => void
  onNext: () => void
}

export default function RoleSelectScreen({
  selectedRole,
  onSelectRole,
  onNext,
}: RoleSelectScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-8">
      <div className="w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-white text-center mb-2">Wer bist du?</h2>
        <p className="text-[#8E8E93] text-center mb-10">Wähle deine Rolle aus, um loszulegen.</p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          {roleOptions.map((option) => {
            const isSelected = selectedRole === option.role
            return (
              <button
                key={option.role}
                onClick={() => onSelectRole(option.role)}
                className={clsx(
                  'flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-200 ease-in-out min-h-[160px] flex-1 max-w-[200px] mx-auto md:mx-0',
                  isSelected
                    ? 'border-[#007AFF]'
                    : 'border-[#38383A] hover:border-[#48484A]'
                )}
                style={{
                  backgroundColor: isSelected ? 'rgba(0, 122, 255, 0.15)' : '#1C1C1E',
                }}
              >
                <span className={isSelected ? 'text-[#007AFF]' : 'text-[#8E8E93]'}>
                  {option.icon}
                </span>
                <div className="text-center">
                  <p
                    className={clsx(
                      'font-semibold text-lg',
                      isSelected ? 'text-[#007AFF]' : 'text-white'
                    )}
                  >
                    {option.title}
                  </p>
                  <p className="text-[#8E8E93] text-sm mt-1">{option.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={onNext}
            disabled={!selectedRole}
            className={clsx(
              'px-12 py-4 rounded-full font-semibold text-lg transition-all duration-200 ease-in-out min-h-[56px] min-w-[200px]',
              selectedRole
                ? 'text-white active:scale-95'
                : 'text-[#8E8E93] cursor-not-allowed'
            )}
            style={{
              backgroundColor: selectedRole ? '#007AFF' : '#2C2C2E',
            }}
          >
            Weiter
          </button>
        </div>
      </div>
    </div>
  )
}
