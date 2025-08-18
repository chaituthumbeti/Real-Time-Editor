import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://asbzwoubqugzeishbzdh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYnp3b3VicXVnemVpc2hiemRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjUxNTYsImV4cCI6MjA3MTEwMTE1Nn0.VzDui5XtP2QazPOxLRQanFpa8K4IQjaU5RFr5JXXo6o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
});