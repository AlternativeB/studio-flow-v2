import { supabase } from './supabase';

const DUMMY_DOMAIN = '@auth.local';

const cleanPhone = (phone: string) => {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
};

export const authApi = {
  // Регистрация: принимаем firstName и lastName
  signUp: async (phone: string, password: string | undefined, firstName: string, lastName: string) => {
    try {
      const cleanNumber = cleanPhone(phone);
      if (!cleanNumber || cleanNumber.length < 10) throw new Error('Некорректный номер телефона');
      
      const email = `${cleanNumber}${DUMMY_DOMAIN}`;
      const finalPassword = password || cleanNumber; 
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: finalPassword,
        options: {
          data: {
            first_name: firstName, // <-- Важно: отправляем раздельно
            last_name: lastName,   // <-- Важно: отправляем раздельно
            phone_display: phone,
            role: 'client'
          }
        }
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('SignUp Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Вход
  signIn: async (phone: string, password: string | undefined) => {
    try {
      const cleanNumber = cleanPhone(phone);
      const email = `${cleanNumber}${DUMMY_DOMAIN}`;
      const finalPassword = password || cleanNumber;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: finalPassword,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('SignIn Error:', error);
      return { success: false, error: error.message };
    }
  },

  // Профиль
  getProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      return { ...data, email: user.email }; 
    } catch (error) {
      return null;
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
};