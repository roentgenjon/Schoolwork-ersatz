import { BookOpen } from 'lucide-react'

interface WelcomeScreenProps {
  onGetStarted: () => void
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full w-full px-8"
      style={{
        background: 'linear-gradient(135deg, #001A3D 0%, #003087 50%, #001A3D 100%)',
      }}
    >
      <div
        className="flex flex-col items-center gap-6 animate-fade-in"
        style={{ animation: 'fadeIn 0.6s ease-in-out' }}
      >
        {/* Logo */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{ backgroundColor: '#007AFF' }}
        >
          <BookOpen size={52} color="#fff" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white tracking-tight">SchoolWork</h1>
          <p className="mt-3 text-lg text-blue-200 font-light">Deine Schule. Digital.</p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2 mt-4 text-center">
          <p className="text-[#8E8E93] text-sm">Aufgaben • Klassen • Fortschritt • Chat</p>
        </div>

        {/* CTA Button */}
        <button
          onClick={onGetStarted}
          className="mt-8 px-12 py-4 rounded-full text-white font-semibold text-lg transition-all duration-200 ease-in-out active:scale-95 min-h-[56px] min-w-[200px]"
          style={{ backgroundColor: '#007AFF' }}
        >
          Get Started
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
