import Sidebar from './Sidebar'
import TabBar from './TabBar'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: '#000' }}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        <TabBar />
      </div>
    </div>
  )
}
