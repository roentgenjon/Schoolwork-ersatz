import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, token, isAuthenticated, login, logout } = useAuthStore()

  const isTeacher = user?.role === 'teacher'
  const isStudent = user?.role === 'student'
  const isAdmin = user?.role === 'admin'

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return {
    user,
    token,
    isAuthenticated,
    isTeacher,
    isStudent,
    isAdmin,
    login,
    logout,
    initials: user ? getInitials(user.name) : '',
  }
}
