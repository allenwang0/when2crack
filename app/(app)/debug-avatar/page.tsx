'use client'

import { useEffect, useState } from 'react'
import { useLocalStorage } from '@/lib/hooks/useLocalStorage'
import { isValidAvatarUrl, DEFAULT_PROFILE_PIC } from '@/lib/utils/avatar'

export default function DebugAvatarPage() {
  const [userAvatar] = useLocalStorage<string | null>('user_avatar', null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    setDebugInfo({
      userAvatar,
      userAvatarType: typeof userAvatar,
      userAvatarIsNull: userAvatar === null,
      userAvatarIsUndefined: userAvatar === undefined,
      userAvatarTrimmed: userAvatar?.trim(),
      userAvatarLength: userAvatar?.length,
      isValid: isValidAvatarUrl(userAvatar),
      defaultPic: DEFAULT_PROFILE_PIC,
      localStorage: {
        user_avatar: localStorage.getItem('user_avatar'),
      }
    })
  }, [userAvatar])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Avatar Debug Page</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Avatar State</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Avatar Display Test</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Default Egg Image (should always show):</h3>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-pink/20">
              <img
                src="/egg.png"
                alt="Default Profile"
                className="w-20 h-20 object-contain"
                onError={(e) => {
                  console.error('EGG IMAGE FAILED TO LOAD!')
                  e.currentTarget.style.border = '2px solid red'
                }}
                onLoad={() => console.log('EGG IMAGE LOADED SUCCESSFULLY')}
              />
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Current Avatar (from localStorage):</h3>
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-pink/20 overflow-hidden">
              {isValidAvatarUrl(userAvatar) ? (
                <img
                  src={userAvatar!}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('USER AVATAR FAILED TO LOAD, FALLING BACK')
                    e.currentTarget.src = DEFAULT_PROFILE_PIC
                    e.currentTarget.className = 'w-20 h-20 object-contain'
                  }}
                  onLoad={() => console.log('USER AVATAR LOADED')}
                />
              ) : (
                <img src={DEFAULT_PROFILE_PIC} alt="Default Profile" className="w-20 h-20 object-contain" />
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Raw IMG test:</h3>
            <img src="/egg.png" alt="Raw test" style={{ width: '100px', height: '100px', border: '2px solid black' }} />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        <div className="space-x-4">
          <button
            onClick={() => {
              localStorage.removeItem('user_avatar')
              window.location.reload()
            }}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Clear Avatar from localStorage
          </button>
          <button
            onClick={() => {
              localStorage.setItem('user_avatar', '')
              window.location.reload()
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded"
          >
            Set Avatar to Empty String
          </button>
          <button
            onClick={() => {
              localStorage.setItem('user_avatar', 'null')
              window.location.reload()
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            Set Avatar to "null" string
          </button>
        </div>
      </div>
    </div>
  )
}
