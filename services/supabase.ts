
import { createClient } from '@supabase/supabase-js';

// Credenciales del proyecto Supabase "ktfuhmbludjoqakjhyoo"
const SUPABASE_URL = 'https://ktfuhmbludjoqakjhyoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0ZnVobWJsdWRqb3Fha2poeW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMDA3MDIsImV4cCI6MjA4MDU3NjcwMn0.4k0dhGqN86MJqedRZ3yebKube14S-qvQHm8jOyH_FGM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
