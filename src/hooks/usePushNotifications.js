'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('SW registered:', registration)

      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        setSubscription(sub)
        setIsSubscribed(true)
      }
    } catch (error) {
      console.error('SW registration failed:', error)
    }
  }

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('BAsrni9roA0NRoAS7vT4_Su83BSsMZalHdgXI72yv35nAfVZG-a4_eq1uCzFVNpqrFKVvnjQpynlXhAt0SYVPN4')
      })

      setSubscription(sub)
      setIsSubscribed(true)

      // Save subscription to database (optional)
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      toast.success('Push notifications enabled!')
      return sub
    } catch (error) {
      console.error('Push subscription failed:', error)
      toast.error('Failed to enable notifications')
      return null
    }
  }

  const unsubscribeFromPush = async () => {
    try {
      if (subscription) {
        await subscription.unsubscribe()
        setSubscription(null)
        setIsSubscribed(false)
        toast.success('Push notifications disabled')
      }
    } catch (error) {
      console.error('Push unsubscription failed:', error)
      toast.error('Failed to disable notifications')
    }
  }

  const sendTestNotification = async () => {
    if (isSubscribed) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '🔧 Test notification from Computer World Admin!',
            subscription
          })
        })
        toast.success('Test notification sent!')
      } catch (error) {
        console.error('Test notification failed:', error)
        toast.error('Failed to send test notification')
      }
    }
  }

  return {
    isSupported,
    isSubscribed,
    subscription,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification
  }
}

// Helper function
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
