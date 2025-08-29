import { supabase } from './supabaseClient';

export async function signInWithEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function saveMessage(user_id, role, text) {
  return supabase.from('messages').insert([{ user_id, role, text }]);
}

export async function getMessages(user_id) {
  return supabase
    .from('messages')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true });
}
