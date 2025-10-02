import { NextResponse } from 'next/server'
import webpush from 'web-push'

// Configure web-push with your generated VAPID keys
webpush.setVapidDetails(
  'mailto:computerworldsurat@gmail.com',
  'BAsrni9roA0NRoAS7vT4_Su83BSsMZalHdgXI72yv35nAfVZG-a4_eq1uCzFVNpqrFKVvnjQpynlXhAt0SYVPN4', // Your new public key
  'acC5bG-wfB0eaobDfxQhJfM2KocWFyXlT_8JVhBagGU' // Your new private key
)

export async function POST(request) {
  try {
    const { message, subscription } = await request.json()

    if (!subscription) {
      return NextResponse.json({ success: false, error: 'No subscription provided' }, { status: 400 })
    }

    // Send push notification
    await webpush.sendNotification(subscription, JSON.stringify({
      title: 'Computer World',
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    }))

    return NextResponse.json({ success: true, message: 'Notification sent' })
  } catch (error) {
    console.error('Push notification error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
