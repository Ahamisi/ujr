import { AuthGate } from '@/components/shell/auth-gate'
import { Sidebar } from '@/components/shell/sidebar'
import { Topbar } from '@/components/shell/topbar'
import { NotificationScope } from '@/components/shell/notification-scope'
import { RoleProvider } from '@/lib/roles'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <AuthGate>
        <NotificationScope>
          <div className="flex min-h-screen flex-col">
            <Topbar />
            <div className="flex flex-1">
              <Sidebar />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>
        </NotificationScope>
      </AuthGate>
    </RoleProvider>
  )
}
