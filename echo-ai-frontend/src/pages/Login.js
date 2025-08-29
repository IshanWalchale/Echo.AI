import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#181818'
      }}>
        <CircularProgress sx={{ color: '#7c4d3a' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: '#181818',
      position: 'relative'
    }}>
      <Paper sx={{
        p: 4,
        width: '100%',
        maxWidth: 400,
        bgcolor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Typography
          variant="h4"
          sx={{
            textAlign: 'center',
            mb: 3,
            color: '#fff',
            fontWeight: 600,
            fontFamily: 'serif'
          }}
        >
          Echo AI
        </Typography>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#7c4d3a',
                  brandAccent: '#a97c50',
                },
              },
            },
            style: {
              button: {
                borderRadius: '8px',
                padding: '12px 16px',
              },
              input: {
                borderRadius: '8px',
                padding: '12px 16px',
              },
            },
          }}
          providers={['google', 'github']}
          theme="dark"
          redirectTo={window.location.origin}
        />
      </Paper>

      {/* Powered by EchoAI footer */}
      <Box sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        py: 1,
        background: 'linear-gradient(180deg, rgba(24,24,24,0) 0%, rgba(24,24,24,0.8) 100%)',
        backdropFilter: 'blur(8px)',
        zIndex: 10
      }}>
        <Typography sx={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}>
          Powered by
          <Box component="span" sx={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 600
          }}>
            EchoAI
          </Box>
        </Typography>
      </Box>
    </Box>
  );
};

export default Login; 