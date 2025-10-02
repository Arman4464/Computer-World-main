'use client'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'

export function useSupabase() {
  const [supabase, setSupabase] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = createClient()
    setSupabase(client)
    setLoading(false)
  }, [])

  return { supabase, loading }
}
