import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const subscription = await request.json()
    
    // In a real app, save subscription to database
    // For demo, just return success
    console.log('Push subscription:', subscription)
    
    return NextResponse.json({ success: true, message: 'Subscribed to notifications' })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
