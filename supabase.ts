import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pzbqiyvssbynxpsxkrou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YnFpeXZzc2J5bnhwc3hrcm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NzI4NzQsImV4cCI6MjA4ODE0ODg3NH0.JXQaLduyV5F9U9xYmz-tyl5gJbsMpzDi-2Pjw-OqADk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
