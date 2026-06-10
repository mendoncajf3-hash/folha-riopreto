import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export function useAuth() {
  const [sessao, setSessao] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  return { sessao, carregando: sessao === undefined };
}
