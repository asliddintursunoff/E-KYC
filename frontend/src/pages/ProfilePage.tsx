import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { TopBar } from '@/components/layout/TopBar'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { userService } from '@/services/userService'
import { extractErrorMessage } from '@/services/apiClient'
import { useAuthStore } from '@/store/authStore'
import type { UserProfile } from '@/types/api'

export function ProfilePage() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageVersion, setImageVersion] = useState<string>('0')

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await userService.getMe()
      setProfile(data)
      setImageVersion(Date.now().toString())
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your profile.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const fullName = profile
    ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ')
    : ''

  return (
    <PageShell>
      <TopBar title="Profile" showBack={false} />

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-ink-faint border-t-ink" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-[14px] text-danger">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={loadProfile}>
            Retry
          </Button>
        </div>
      )}

      {!loading && profile && (
        <div className="flex flex-1 flex-col">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 h-28 w-28 overflow-hidden rounded-full border-2 border-white/10 bg-base-surface">
              {profile.image ? (
                <img
                  src={`${profile.image}${profile.image.includes('?') ? '&' : '?'}t=${imageVersion}`}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[28px] font-semibold text-ink-muted">
                  {profile.first_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            <h2 className="text-[19px] font-semibold text-ink">{fullName}</h2>
            <div className="mt-2">
              <StatusBadge verified={profile.verified} />
            </div>
          </div>

          <GlassCard className="flex flex-col gap-4">
            <ProfileRow label="Passport ID" value={profile.passport_id} />
            <Divider />
            <ProfileRow label="Date of birth" value={profile.date_of_birth} />
          </GlassCard>

          <div className="mt-6 flex flex-col gap-3 pb-4">
            <Button fullWidth variant="secondary" onClick={() => navigate('/profile/update-face')}>
              Update face image
            </Button>
            <Button fullWidth variant="ghost" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      )}
    </PageShell>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] text-ink-muted">{label}</span>
      <span className="text-[14px] font-medium text-ink">{value}</span>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-white/10" />
}
