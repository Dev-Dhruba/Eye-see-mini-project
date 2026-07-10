import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface AppUser {
  id: number;
  name: string | null;
  username: string | null;
  age: number | null;
  gender: string | null;
}

const CURRENT_USER_KEY = 'currentUser';

export interface SignUpData {
  username: string;
  password: string;
  name: string;
  age: number;
  gender: string;
}

// Returns true if the username is already present in the users table.
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data;
};

export const signUpUser = async (
  details: SignUpData
): Promise<{ user?: AppUser; error?: string }> => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: details.username,
      password: details.password,
      name: details.name,
      age: details.age,
      gender: details.gender,
    })
    .select('id, name, username, age, gender')
    .single();

  if (error) return { error: error.message };
  return { user: data as AppUser };
};

export const signInUser = async (
  username: string,
  password: string
): Promise<{ user?: AppUser; error?: string }> => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, username, age, gender, password')
    .eq('username', username)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data || data.password !== password) {
    return { error: 'Invalid username or password.' };
  }

  const { password: _ignored, ...user } = data;
  return { user: user as AppUser };
};

// ── Local session persistence ───────────────────────────────────────────────
export const saveCurrentUser = async (user: AppUser): Promise<void> => {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const loadCurrentUser = async (): Promise<AppUser | null> => {
  const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
  return raw ? (JSON.parse(raw) as AppUser) : null;
};

export const clearCurrentUser = async (): Promise<void> => {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
};
