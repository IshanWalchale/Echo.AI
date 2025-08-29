import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate('/');
    });
    // Listen for login
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) navigate('/');
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#181818' }}>
      <div style={{ maxWidth: 400, width: '100%', background: '#232323', borderRadius: 12, padding: 32, boxShadow: '0 4px 32px 0 rgba(0,0,0,0.18)' }}>
        <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: 24 }}>Sign in to Echo AI</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'github']}
          theme="dark"
        />
      </div>
    </div>
  );
}
