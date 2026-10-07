const { createClient } = require('@supabase/supabase-js')

// Supabase credentials come from environment variables
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Replace 'vehicles' with any table name from your Supabase project
  const { data, error } = await supabase.from('vehicles').select('*').limit(10)

  if (error) {
    console.error('[v0] Error querying table:', error.message)
    return
  }

  console.log('[v0] Rows returned:', data.length)
  console.log(data)
}

main()

module.exports = { supabase }
