import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gohqhahewuacaqtxocis.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvaHFoYWhld3VhY2FxdHhvY2lzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2MzczODgsImV4cCI6MjA2NzIxMzM4OH0.9Na4AQG7NIKOkWONaRlB8k258w_rJEkFOV4TikxMTos'

if (SUPABASE_URL === 'https://<PROJECT-ID>.supabase.co' || SUPABASE_ANON_KEY === '<ANON_KEY>') {
  throw new Error('Missing Supabase variables')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})

// Test connection
supabase
  .from('users_sommerhus_2024')
  .select('count')
  .limit(1)
  .then(() => console.log('✅ Supabase: Connected successfully'))
  .catch((error) => console.error('❌ Supabase connection error:', error))

export default supabase