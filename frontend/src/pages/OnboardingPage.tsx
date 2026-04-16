import { useState } from 'react'
import { clsx } from 'clsx'
import WelcomeScreen from '../components/onboarding/WelcomeScreen'
import RoleSelectScreen from '../components/onboarding/RoleSelectScreen'
import NameInputScreen from '../components/onboarding/NameInputScreen'
import type { Role } from '../types'

type OnboardingStep = 'welcome' | 'role' | 'name'

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>('welcome')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  return (
    <div
      className="flex flex-col h-screen w-screen"
      style={{ backgroundColor: '#000' }}
    >
      {/* Step indicator (only visible on role and name screens) */}
      {step !== 'welcome' && (
        <div className="flex justify-center items-center gap-2 pt-12 pb-2">
          {(['role', 'name'] as const).map((s, index) => (
            <div
              key={s}
              className={clsx(
                'rounded-full transition-all duration-300',
                step === s
                  ? 'w-6 h-2'
                  : index < (['role', 'name'] as const).indexOf(step)
                  ? 'w-2 h-2'
                  : 'w-2 h-2'
              )}
              style={{
                backgroundColor:
                  step === s
                    ? '#007AFF'
                    : index < (['role', 'name'] as const).indexOf(step)
                    ? '#007AFF'
                    : '#38383A',
              }}
            />
          ))}
        </div>
      )}

      {/* Screen content */}
      <div className="flex-1 overflow-hidden">
        {step === 'welcome' && (
          <WelcomeScreen onGetStarted={() => setStep('role')} />
        )}
        {step === 'role' && (
          <RoleSelectScreen
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onNext={() => {
              if (selectedRole) setStep('name')
            }}
          />
        )}
        {step === 'name' && selectedRole && (
          <NameInputScreen role={selectedRole} />
        )}
      </div>
    </div>
  )
}
