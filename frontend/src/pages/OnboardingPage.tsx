import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import WelcomeScreen from '../components/onboarding/WelcomeScreen'
import RoleSelectScreen from '../components/onboarding/RoleSelectScreen'
import NameInputScreen from '../components/onboarding/NameInputScreen'
import type { Role } from '../types'
import { client } from '../api/client'

interface SetupInfo {
  hasUsers: boolean
  settings: {
    allow_admin_register: boolean
    open_registration: boolean
  }
}

type OnboardingStep = 'welcome' | 'role' | 'name'

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [setup, setSetup] = useState<SetupInfo | null>(null)

  useEffect(() => {
    client.get<SetupInfo>('/auth/setup').then(setSetup).catch(() => {
      // Fallback: assume open system
      setSetup({ hasUsers: true, settings: { allow_admin_register: true, open_registration: true } })
    })
  }, [])

  // Derived: does this flow need a role selection step?
  const needsRoleSelect = setup
    ? setup.hasUsers && setup.settings.open_registration
    : true

  // If first user → forced admin; if closed mode → no role needed (backend assigns it)
  const forcedRole: Role | null = setup
    ? !setup.hasUsers
      ? 'admin'
      : !setup.settings.open_registration
        ? 'student' // placeholder, backend ignores it in closed mode
        : null
    : null

  function handleGetStarted() {
    if (!needsRoleSelect) {
      // Skip role selection
      setSelectedRole(forcedRole ?? 'student')
      setStep('name')
    } else {
      setStep('role')
    }
  }

  const showSteps = step !== 'welcome' && needsRoleSelect
  const isFirstUser = setup ? !setup.hasUsers : false
  const isClosedMode = setup ? !setup.settings.open_registration && setup.hasUsers : false

  return (
    <div className="flex flex-col h-screen w-screen" style={{ backgroundColor: '#000' }}>
      {showSteps && (
        <div className="flex justify-center items-center gap-2 pt-12 pb-2">
          {(['role', 'name'] as const).map((s, index) => (
            <div
              key={s}
              className={clsx('rounded-full transition-all duration-300', step === s ? 'w-6 h-2' : 'w-2 h-2')}
              style={{
                backgroundColor: step === s || index < (['role', 'name'] as const).indexOf(step)
                  ? '#007AFF' : '#38383A',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {step === 'welcome' && (
          <WelcomeScreen onGetStarted={handleGetStarted} />
        )}
        {step === 'role' && (
          <RoleSelectScreen
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            allowAdmin={setup?.settings.allow_admin_register ?? true}
            onNext={() => { if (selectedRole) setStep('name') }}
          />
        )}
        {step === 'name' && (
          <NameInputScreen
            role={selectedRole ?? 'student'}
            isFirstUser={isFirstUser}
            isClosedMode={isClosedMode}
          />
        )}
      </div>
    </div>
  )
}
