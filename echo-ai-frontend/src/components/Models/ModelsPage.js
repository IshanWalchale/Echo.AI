import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Grid,
  Fade,
} from '@mui/material';
import { Send as SendIcon, History as HistoryIcon, Close as CloseIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import deepseekLogo from '../../assets/deepseek.png';
import openaiLogo from '../../assets/Chatgpt.png';
import mistralLogo from '../../assets/mistral.png';
import cohereLogo from '../../assets/cohere.png';
import geminiLogo from '../../assets/gemini.png';
import qwenLogo from '../../assets/qwen.webp';
import metaLogo from '../../assets/meta.png';
import rogueRoseLogo from '../../assets/Rose.png';
import axios from 'axios';
import ReactDOM from 'react-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';

// Dummy model list (replace with your real models)
const availableModels = [
  { id: 'Cohere', name: 'Cohere', color: '#111', logo: cohereLogo },
  { id: 'Mistral', name: 'Mistral', color: '#111', logo: mistralLogo },
  { id: 'Gemini', name: 'Gemini', color: '#111', logo: geminiLogo },
  { id: 'ChatGPT', name: 'ChatGPT', color: '#111', logo: openaiLogo },
  { id: 'Qwen', name: 'Qwen', color: '#111', logo: qwenLogo },
  { id: 'Deepseek', name: 'Deepseek', color: '#111', logo: deepseekLogo },
  { id: 'Rogue Rose', name: 'Rogue Rose', color: '#111', logo: rogueRoseLogo },
  { id: 'Meta', name: 'Meta', color: '#111', logo: metaLogo }
];

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api/query';

const CopyableCodeBlock = ({ codeString, language }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <Box sx={{ position: 'relative', overflowX: 'auto', my: 2 }}>
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          color: copied ? '#00eaff' : '#9CA3AF',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: 1,
          opacity: 0.85,
          transition: 'color 0.2s',
          '&:hover': {
            color: '#fff',
            background: 'rgba(0,0,0,0.25)'
          }
        }}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        <CopyIcon fontSize="small" />
      </IconButton>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        customStyle={{
          margin: 0,
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.4)',
          padding: '1.2rem',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          backdropFilter: 'blur(10px)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
          overflowX: 'auto',
          whiteSpace: 'pre',
          wordBreak: 'normal',
          maxWidth: '100%',
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </Box>
  );
};

const ModelsPage = () => {
  // Chat state
  const [messages, setMessages] = useState([]); // {role: 'user'|'ai', text: '...', model: string}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [user, setUser] = useState(null);

  // Model selection
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [selectedModels, setSelectedModels] = useState([]);

  // History
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [history, setHistory] = useState([]); // [{id, messages, responses, created_at}]

  // Profile
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  // Tour
  const [showTour, setShowTour] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);

  const [showLanding, setShowLanding] = useState(true);

  const [activeResponseTab, setActiveResponseTab] = useState(0);

  const [activeTabs, setActiveTabs] = useState({}); // {userMsgIdx: activeTabIdx}

  const navigate = useNavigate();

  // Tour refs for highlight positioning
  const profileRef = useRef();
  const newChatRef = useRef();
  const historyRef = useRef();
  const modelSelectRef = useRef();
  const chatAreaRef = useRef();
  const [highlightStyle, setHighlightStyle] = useState({});

  // Add state for hasSeenTour
  const [hasSeenTour, setHasSeenTour] = useState(false);

  // Add a flag to distinguish between onboarding and manual tour
  const [manualTour, setManualTour] = useState(false);

  // Load user from Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user === null) return; // still loading
    if (!user) navigate('/login');
  }, [user, navigate]);

  // Function to load chat history from Supabase
  const loadHistory = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    console.log('Loaded history:', data, error);
    if (error) {
      console.error('Error loading history:', error);
      return;
    }
    if (data) {
      const parsed = data.map(item => ({
        ...item,
        messages: typeof item.messages === 'string' ? JSON.parse(item.messages) : item.messages,
        responses: typeof item.responses === 'string' ? JSON.parse(item.responses) : item.responses,
      }));
      setHistory(parsed);
    }
  };

  // Load history when user changes
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When the user sends the first message, hide the landing
  useEffect(() => {
    if (messages.length > 0) setShowLanding(false);
  }, [messages]);

  // Update the useEffect for showing tour
  useEffect(() => {
    const checkAndShowTour = async () => {
      if (!user) return;
      try {
        // Always check Supabase for has_seen_tour
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('has_seen_tour')
          .eq('id', user.id)
          .single();
        if (profileError && profileError.code === 'PGRST116') {
          // New user, create profile and show tour
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{ 
              id: user.id,
              has_seen_tour: false,
              email: user.email,
              created_at: new Date().toISOString()
            }]);
          if (!insertError) {
            setShowTour(true);
            setHasSeenTour(false);
          }
          return;
        }
        // Only show tour if has_seen_tour is false
        if (profileData && profileData.has_seen_tour === false) {
          setShowTour(true);
          setHasSeenTour(false);
        } else {
          setHasSeenTour(true);
          setShowTour(false);
        }
      } catch (error) {
        console.error('Error in tour check:', error);
        setShowTour(false);
        setHasSeenTour(true);
      }
    };
    checkAndShowTour();
  }, [user]);

  // Update highlight position for each tour step (limit to 4 steps)
  useEffect(() => {
    let ref = null;
    if (showTour) {
      if (currentTourStep === 0) ref = profileRef;
      if (currentTourStep === 1) ref = newChatRef;
      if (currentTourStep === 2) ref = historyRef;
      if (currentTourStep === 3) ref = modelSelectRef;
      if (ref && ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setHighlightStyle({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          borderRadius: 12,
          position: 'fixed',
          zIndex: 3002 // ensure above overlay
        });
        ref.current.style.zIndex = 3002;
        ref.current.style.position = 'relative';
      } else {
        setHighlightStyle({ display: 'none' });
      }
    } else {
      setHighlightStyle({ display: 'none' });
      [profileRef, newChatRef, historyRef, modelSelectRef].forEach(r => {
        if (r.current) {
          r.current.style.zIndex = '';
          r.current.style.position = '';
        }
      });
    }
  }, [showTour, currentTourStep]);

  // Model selection dialog logic
  const handleModelToggle = (modelId) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  // History drawer logic
  const handleHistoryClick = (item) => {
    setMessages(item.messages || []);
    setHistoryDrawerOpen(false);
    setInput('');
  };

  // Profile menu logic
  const handleProfileMenuOpen = (e) => setProfileDialogOpen(true);
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Tour logic: finish sets localStorage
  const handleNextTour = async () => {
    if (currentTourStep < 3) {
      setCurrentTourStep(s => s + 1);
    } else {
      if (user && user.id) {
        await setTourSeen(user.id);
      }
      setShowTour(false);
      setManualTour(false);
    }
  };
  const handlePrevTour = () => { if (currentTourStep > 0) setCurrentTourStep(s => s - 1); };
  const handleSkipTour = async () => {
    if (user && user.id) {
      await setTourSeen(user.id);
    }
    setShowTour(false);
    setManualTour(false);
  };

  // Helper to save chat to Supabase
  const saveChatToHistory = async (chatMessages) => {
    if (!user || !chatMessages || chatMessages.length === 0) return;
    const firstUserMsg = chatMessages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const { error } = await supabase.from('chat_history').insert([
        {
          user_id: user.id,
          messages: JSON.stringify(chatMessages),
          responses: JSON.stringify(chatMessages.filter(m => m.role === 'ai')),
          chat_name: firstUserMsg.text.slice(0, 50),
          created_at: new Date().toISOString()
        }
      ]);
      if (error) {
        console.error('Error saving chat:', error);
        alert('Error saving chat: ' + error.message);
      }
      // Reload history
      const { data, error: fetchError } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!fetchError && data) {
        const parsed = data.map(item => ({
          ...item,
          messages: typeof item.messages === 'string' ? JSON.parse(item.messages) : item.messages,
          responses: typeof item.responses === 'string' ? JSON.parse(item.responses) : item.responses,
        }));
        setHistory(parsed);
      }
    }
  };

  // Update handleNewChat to prevent duplicate history entries
  const handleNewChat = async () => {
    // Only save to history if this is a new chat (not from history)
    if (messages.length > 0 && !history.some(item => 
      JSON.stringify(item.messages) === JSON.stringify(messages)
    )) {
      await saveChatToHistory(messages);
    }
    setMessages([]);
    setInput('');
    setShowLanding(true);
  };

  // Update handleSend to save the chat if it's the first message in a new chat
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user || selectedModels.length === 0) return;

    // Prevent duplicate queries
    if (messages.length > 0 && messages[messages.length - 1].role === 'user' && messages[messages.length - 1].text.trim() === input.trim()) {
      setInput('');
      return;
    }

    setLoading(true); // Set loading to true to show the "Abort" button
    const baseMessages = [...messages, { user_id: user.id, role: 'user', text: input, models: [...selectedModels] }];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const { data } = await axios.post(API_URL, {
        prompt: input,
        models: selectedModels
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      });

      if (data?.responses && data?.evaluation?.evaluations) {
        const aiMessages = Object.entries(data.responses).map(([model, text]) => ({
          user_id: user.id,
          role: 'ai',
          text,
          model,
          score: data.evaluation.evaluations[model]?.overall
        }));
        const sortedResponses = [...aiMessages].sort((a, b) => (b.score || 0) - (a.score || 0));
        const allMessages = [...baseMessages, ...sortedResponses];
        setMessages(allMessages);
      } else {
        console.error('No valid responses received from the AI models.');
      }
    } catch (err) {
      console.error(err.response?.data?.message || 'Error fetching responses. Please try again.');
    } finally {
      setLoading(false); // Reset loading state
      setInput('');
    }
  };

  const handleAbort = () => {
    setLoading(false);
  };

  // Fetch has_seen_tour from Supabase profiles table
  const fetchTourStatus = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('has_seen_tour')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setHasSeenTour(!!data.has_seen_tour);
      if (!localStorage.getItem('hasSeenTour')) setShowTour(!data.has_seen_tour);
    } else {
      setHasSeenTour(false); // fallback
      if (!localStorage.getItem('hasSeenTour')) setShowTour(true);
    }
  }, []);

  // Update has_seen_tour in Supabase
  const setTourSeen = useCallback(async (userId) => {
    if (!userId) return;
    
    try {
      // Update profile to mark tour as seen
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId,
          has_seen_tour: true,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating tour status:', error);
        return;
      }
      
      setHasSeenTour(true);
      setShowTour(false);
    } catch (error) {
      console.error('Error in setTourSeen:', error);
    }
  }, []);

  // On user load, fetch tour status
  useEffect(() => {
    if (user && user.id) {
      fetchTourStatus(user.id);
    }
  }, [user, fetchTourStatus]);

  // Add modern spinner component
  const ModernSpinner = () => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      gap: 2,
      mt: 2,
      mb: 2
    }}>
      <Box sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#00eaff',
        animation: 'spin 1s linear infinite',
        '@keyframes spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      }} />
      <Typography sx={{ 
        color: '#9CA3AF',
        fontSize: '1.1rem',
        fontWeight: 500
      }}>
        Generating responses...
      </Typography>
    </Box>
  );

  // Add code block extraction helper
  const extractCodeBlocks = (text) => {
    if (!text) return [];
    const regex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim()
      });
    }
    return blocks;
  };

  // Add ResponseCard component
  const ResponseCard = ({ response, modelInfo, score, onCopy }) => {
    // Helper to render LaTeX math (inline and block)
    const renderMath = (text) => {
      // Render block math ($$...$$) and inline math ($...$)
      const blockRegex = /\$\$(.+?)\$\$/gs;
      const inlineRegex = /\$(.+?)\$/g;
      let elements = [];
      let lastIndex = 0;
      let match;
      // Block math
      while ((match = blockRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          elements.push(text.slice(lastIndex, match.index));
        }
        elements.push(<BlockMath math={match[1].trim()} key={match.index} />);
        lastIndex = blockRegex.lastIndex;
      }
      if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
      }
      // Now process inline math in each string part
      elements = elements.flatMap((el, i) => {
        if (typeof el !== 'string') return el;
        const parts = [];
        let last = 0;
        let m;
        while ((m = inlineRegex.exec(el)) !== null) {
          if (m.index > last) parts.push(el.slice(last, m.index));
          parts.push(<InlineMath math={m[1].trim()} key={i + '-' + m.index} />);
          last = inlineRegex.lastIndex;
        }
        if (last < el.length) parts.push(el.slice(last));
        return parts;
      });
      return elements;
    };
    const renderContent = (text) => (
      <Box sx={{ wordBreak: 'break-word', width: '100%' }}>
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              return !inline ? (
                <CopyableCodeBlock codeString={codeString} language={match ? match[1] : 'plaintext'} />
              ) : (
                <code
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.95em',
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            },
          }}
          skipHtml
        >
          {text}
        </ReactMarkdown>
      </Box>
    );

    return (
      <Paper sx={{
        width: '100%',
        maxWidth: 900,
        background: 'linear-gradient(135deg, rgba(35,35,35,0.95) 0%, rgba(24,24,24,0.95) 100%)',
        color: '#fff',
        borderRadius: 6,
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
        overflow: 'hidden',
        position: 'relative',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 12px 40px 0 rgba(0,0,0,0.3)'
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          padding: '1px',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.05))',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          pointerEvents: 'none'
        }
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5, 
          p: 2, 
          borderBottom: '1px solid rgba(255,255,255,0.1)', 
          background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(10px)'
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.3)'
            }
          }}>
            <img
              src={modelInfo?.logo}
              alt={modelInfo?.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
              }}
            />
          </Box>
          <Typography sx={{ 
            fontWeight: 700, 
            fontSize: '1.1rem', 
            color: '#fff',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            letterSpacing: 0.3
          }}>
            {modelInfo?.name}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            color: '#fff', 
            borderRadius: 2, 
            px: 1.5, 
            py: 0.5, 
            fontWeight: 700, 
            fontSize: '0.95rem',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }
          }}>
            <span>Score:</span>
            <span style={{ 
              color: score >= 80 ? '#4CAF50' : score >= 60 ? '#FFA726' : '#EF4444',
              textShadow: '0 0 12px currentColor',
              fontWeight: 800
            }}>
              {score ? Math.round(score) : '-'}
            </span>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onCopy(response)}
            startIcon={<CopyIcon sx={{ fontSize: '1rem' }} />}
            sx={{ 
              color: '#fff', 
              borderColor: 'rgba(255,255,255,0.2)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              letterSpacing: 0.3,
              backdropFilter: 'blur(10px)',
              '&:hover': { 
                borderColor: '#fff',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%)',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            Copy All
          </Button>
        </Box>
        
        {/* Content */}
        <Box sx={{ 
          p: 2.5, 
          fontSize: '1.08rem', 
          lineHeight: 1.8, 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-word',
          minHeight: 160,
          background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
          borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid rgba(255,255,255,0.07)',
          mt: 2,
          mb: 2,
          '& pre': {
            margin: '1.2em 0',
            borderRadius: '8px',
            overflow: 'hidden'
          }
        }}>
          {renderContent(response)}
        </Box>
      </Paper>
    );
  };

  // Sidebar is always rendered
  return (
    <Box sx={{ height: '100vh', bgcolor: '#181818', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar */}
      <Box sx={{ width: 72, bgcolor: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, borderRight: '1px solid #232323', zIndex: 20, position: 'fixed', height: '100vh', left: 0, top: 0, gap: 2 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #232b3a 0%, #00eaff 100%)',
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
            border: 'none',
            transition: 'transform 0.25s, box-shadow 0.25s',
            '&:hover': {
              transform: 'scale(1.08) rotate(-2deg)',
              boxShadow: '0 8px 32px 0 rgba(0,0,0,0.28)',
              cursor: 'pointer',
            },
            overflow: 'hidden',
          }}
        >
          <img
            src="/EchoAIweb.jpg"
            alt="Echo AI"
            style={{
              width: '80%',
              height: '80%',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
            }}
          />
        </Box>
        <IconButton ref={profileRef} onClick={handleProfileMenuOpen} sx={{
          color: '#fff',
          bgcolor: (showTour && currentTourStep === 0) ? 'transparent' : 'rgba(255,255,255,0.03)',
          boxShadow: (showTour && currentTourStep === 0) ? 'none' : undefined,
          '&:hover': { bgcolor: (showTour && currentTourStep === 0) ? 'transparent' : 'rgba(255,255,255,0.08)' },
          width: 48,
          height: 48,
          mb: 2,
          zIndex: (showTour && currentTourStep === 0) ? 3000 : 'auto',
          position: (showTour && currentTourStep === 0) ? 'relative' : 'static',
          border: (showTour && currentTourStep === 0) ? '2.5px solid #00eaff' : undefined,
        }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#7c4d3a', fontSize: '1rem' }}>{user?.email?.[0]?.toUpperCase() || 'U'}</Avatar>
        </IconButton>
        <Button
          ref={newChatRef}
          variant="contained"
          onClick={handleNewChat}
          sx={{
            bgcolor: (showTour && currentTourStep === 1) ? 'transparent' : '#232323',
            color: '#fff',
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '1.05rem',
            px: 0,
            py: 1.2,
            minWidth: 48,
            minHeight: 48,
            mb: 2,
            boxShadow: (showTour && currentTourStep === 1) ? 'none' : (showTour ? '0 2px 8px 0 #0002' : undefined),
            border: (showTour && currentTourStep === 1) ? '2.5px solid #00eaff' : undefined,
            zIndex: (showTour && currentTourStep === 1) ? 3000 : 'auto',
            position: (showTour && currentTourStep === 1) ? 'relative' : 'static',
            '&:hover': { bgcolor: (showTour && currentTourStep === 1) ? 'transparent' : '#333' },
            textTransform: 'none',
            letterSpacing: 0.5
          }}
          title="Start a new chat"
        >
          +
        </Button>
        <IconButton ref={historyRef} onClick={() => setHistoryDrawerOpen(true)} sx={{
          color: '#fff',
          bgcolor: (showTour && currentTourStep === 2) ? 'transparent' : 'rgba(255,255,255,0.03)',
          boxShadow: (showTour && currentTourStep === 2) ? 'none' : undefined,
          '&:hover': { bgcolor: (showTour && currentTourStep === 2) ? 'transparent' : 'rgba(255,255,255,0.08)' },
          width: 48,
          height: 48,
          zIndex: (showTour && currentTourStep === 2) ? 3000 : 'auto',
          position: (showTour && currentTourStep === 2) ? 'relative' : 'static',
          border: (showTour && currentTourStep === 2) ? '2.5px solid #00eaff' : undefined,
        }}>
          <HistoryIcon fontSize="medium" />
        </IconButton>
      </Box>
      {/* Main content (landing or chat) */}
      <Fade in={showLanding} timeout={500} unmountOnExit>
        <Box sx={{ minHeight: '100vh', flex: 1, ml: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <Typography variant="h3" sx={{ fontFamily: 'serif', fontWeight: 500, color: '#ece7e1', mb: 1, letterSpacing: 0.5, fontSize: { xs: '2rem', md: '2.8rem' } }}>
            Namaste! Hola! Bonjour!
          </Typography>
          <Typography variant="h6" sx={{ fontFamily: 'times new roman', color: '#ece7e1', fontWeight: 400, fontSize: { xs: '1.1rem', md: '1.3rem' }, mb: 4 }}>
            Think. Echo. Achieve.
          </Typography>
          <Box component="form" onSubmit={handleSend} sx={{ width: '100%', maxWidth: 700, mx: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, mt: 4 }}>
            <TextField
              fullWidth
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask anything to your AI assistants..."
              variant="outlined"
              sx={{ bgcolor: '#232323', borderRadius: 2, input: { color: '#fff' } }}
              disabled={loading}
            />
            <Button
              ref={modelSelectRef}
              variant="outlined"
              onClick={() => setModelDialogOpen(true)}
              sx={{
                border: (showTour && currentTourStep === 3) ? '2.5px solid #00eaff' : undefined,
                color: '#fff',
                bgcolor: (showTour && currentTourStep === 3) ? 'transparent' : 'rgba(20,20,20,0.85)',
                boxShadow: (showTour && currentTourStep === 3) ? 'none' : undefined,
                borderRadius: 3,
                fontWeight: 600,
                px: 3,
                py: 1.2,
                fontSize: '0.85rem',
                minWidth: 120,
                height: 48,
                zIndex: (showTour && currentTourStep === 3) ? 3000 : 'auto',
                position: (showTour && currentTourStep === 3) ? 'relative' : 'static',
                boxShadow: (showTour && currentTourStep === 3) ? 'none' : undefined,
                textTransform: 'none',
                letterSpacing: 0.5
              }}
            >
              {selectedModels.length === 0 ? 'Select AI(s)' : `AI(s) (${selectedModels.length})`}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !input.trim() || selectedModels.length === 0}
              sx={{ minWidth: 48, minHeight: 48, borderRadius: 2, bgcolor: '#232323', color: '#fff', '&:hover': { bgcolor: '#111', color: '#fff', boxShadow: '0 2px 8px 0 #fff2' }, transition: 'all 0.22s cubic-bezier(.4,2,.6,1)', border: '1px solid #232323' }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : <SendIcon />}
            </Button>
          </Box>
        </Box>
      </Fade>
      <Fade in={!showLanding} timeout={500} unmountOnExit>
        <Box sx={{ flex: 1, ml: '72px', display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Chat area */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1, md: 4 }, display: 'flex', flexDirection: 'column', gap: 3, bgcolor: '#181818' }}>
            {messages.length === 0 && (
              <Typography sx={{ color: '#888', textAlign: 'center', mt: 4, fontSize: '1.1rem' }}>
                Start the conversation!
              </Typography>
            )}
            {messages.map((msg, idx) => {
              if (msg.role === 'user') {
                // Find all consecutive AI responses after this user message
                const aiResponses = [];
                for (let i = idx + 1; i < messages.length && messages[i].role === 'ai'; i++) {
                  aiResponses.push(messages[i]);
                }
                // User message bubble
                return (
                  <React.Fragment key={idx}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                      <Paper
                        sx={{
                          p: 2.5,
                          maxWidth: '70%',
                          bgcolor: '#000', // Black background
                          color: '#fff', // White text
                          borderRadius: 4,
                          boxShadow: '0 4px 12px 0 rgba(0,0,0,0.5)', // Enhanced shadow
                          fontSize: '1.08rem',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          mb: 1.5,
                          transition: 'all 0.18s',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255,255,255,0.1)', // Subtle border
                        }}
                      >
                        {msg.text}
                      </Paper>
                    </Box>
                    {/* AI Responses as tabbed card */}
                    {aiResponses.length > 0 && (
                      <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', mt: 0, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #333', mb: 1, overflowX: 'auto', pb: 1, gap: 2 }}>
                          {aiResponses.map((resp, tabIdx) => {
                            const modelInfo = availableModels.find(m => m.id === resp.model);
                            return (
                              <Button
                                key={resp.model}
                                onClick={() => setActiveTabs(tabs => ({ ...tabs, [idx]: tabIdx }))}
                                sx={{
                                  color: (activeTabs[idx] ?? 0) === tabIdx ? '#fff' : '#bbb',
                                  fontWeight: 700,
                                  fontSize: '1.15rem',
                                  borderBottom: (activeTabs[idx] ?? 0) === tabIdx ? '3px solid #00eaff' : 'none',
                                  borderRadius: 3,
                                  px: 3,
                                  py: 1.2,
                                  minWidth: 110,
                                  transition: 'all 0.18s',
                                  bgcolor: (activeTabs[idx] ?? 0) === tabIdx ? 'rgba(0,234,255,0.08)' : 'rgba(255,255,255,0.02)',
                                  boxShadow: (activeTabs[idx] ?? 0) === tabIdx ? '0 2px 8px 0 #00eaff22' : 'none',
                                  textTransform: 'none',
                                  mr: 1.5,
                                  mb: 0.5,
                                  '&:hover': {
                                    color: '#fff',
                                    bgcolor: 'rgba(0,234,255,0.12)'
                                  }
                                }}
                              >
                                {resp.model}
                                <Box component="span" sx={{ 
                                  ml: 1, 
                                  fontWeight: 600, 
                                  fontSize: '0.98rem', 
                                  bgcolor: 'rgba(255,255,255,0.1)', 
                                  color: '#fff', 
                                  borderRadius: 2, 
                                  px: 1, 
                                  py: 0.1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}>
                                  {resp.score ? Math.round(resp.score) : '-'}
                                  {tabIdx === 0 && resp.score && (
                                    <Box component="span" sx={{ 
                                      fontSize: '0.8rem',
                                      color: '#4CAF50',
                                      ml: 0.5
                                    }}>★</Box>
                                  )}
                                </Box>
                              </Button>
                            );
                          })}
                        </Box>
                        <ResponseCard
                          response={aiResponses[activeTabs[idx] ?? 0]?.text}
                          modelInfo={availableModels.find(m => m.id === aiResponses[activeTabs[idx] ?? 0]?.model)}
                          score={aiResponses[activeTabs[idx] ?? 0]?.score}
                          onCopy={(text) => navigator.clipboard.writeText(text)}
                        />
                      </Box>
                    )}
                  </React.Fragment>
                );
              }
              return null;
            })}
            {loading && <ModernSpinner />}
            <div ref={chatEndRef} />
          </Box>
          {/* Input bar */}
          <Box
            ref={chatAreaRef}
            component="form"
            onSubmit={handleSend}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2.5,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              bgcolor: '#000',
              gap: 2.5,
              boxShadow: '0 -2px 12px 0 rgba(0,0,0,0.5)',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)',
              zIndex: (showTour && currentTourStep === 3) ? 3000 : 'auto',
              position: (showTour && currentTourStep === 3) ? 'relative' : 'static',
              boxShadow: (showTour && currentTourStep === 3) ? '0 0 32px 8px #00eaffcc, 0 0 0 6px #fff' : undefined,
              border: (showTour && currentTourStep === 3) ? '2.5px solid #00eaff' : undefined,
            }}
          >
            <Button
              ref={modelSelectRef}
              variant="outlined"
              onClick={() => setModelDialogOpen(true)}
              sx={{
                border: (showTour && currentTourStep === 3) ? '2.5px solid #00eaff' : undefined,
                color: '#fff',
                bgcolor: (showTour && currentTourStep === 3) ? 'transparent' : 'rgba(20,20,20,0.85)',
                boxShadow: (showTour && currentTourStep === 3) ? 'none' : undefined,
                borderRadius: 3,
                fontWeight: 600,
                px: 3,
                py: 1.2,
                fontSize: '0.85rem',
                minWidth: 120,
                height: 48,
                zIndex: (showTour && currentTourStep === 3) ? 3000 : 'auto',
                position: (showTour && currentTourStep === 3) ? 'relative' : 'static',
                boxShadow: (showTour && currentTourStep === 3) ? 'none' : undefined,
                textTransform: 'none',
                letterSpacing: 0.5
              }}
            >
              {selectedModels.length === 0 ? 'Select AI(s)' : `AI(s) (${selectedModels.length})`}
            </Button>
            <TextField
              fullWidth
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              variant="outlined"
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                input: {
                  color: '#fff',
                  fontSize: '1rem',
                  py: 1.5
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'rgba(255,255,255,0.1)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255,255,255,0.2)',
                  },
                },
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
              }}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !input.trim() || selectedModels.length === 0}
              sx={{
                minWidth: 48,
                minHeight: 48,
                borderRadius: 2,
                bgcolor: '#232323',
                '&:hover': {
                  bgcolor: '#111',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease',
                border: '1px solid #232323',
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : <SendIcon />}
            </Button>
            {loading && (
              <Button
                onClick={handleAbort}
                variant="outlined"
                color="error"
                sx={{
                  minWidth: 48,
                  minHeight: 48,
                  borderRadius: 2,
                  bgcolor: '#232323',
                  '&:hover': {
                    bgcolor: '#111',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease',
                  border: '1px solid #232323',
                  color: '#EF4444',
                }}
              >
                Abort
              </Button>
            )}
          </Box>
        </Box>
      </Fade>
      {/* Powered by EchoAI footer */}
      {showLanding && (
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
      )}
      {/* Model Selection Dialog */}
      <Dialog
        open={modelDialogOpen}
        onClose={() => setModelDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'linear-gradient(135deg, #fff 60%, #f8f9fa 100%)',
            color: '#181818',
            borderRadius: 5,
            boxShadow: '0 8px 40px 0 #fff8, 0 0 0 1px #fff',
            border: '2px solid #fff',
            maxWidth: 800,
            mx: 'auto',
            p: 0,
            transition: 'box-shadow 0.25s, border 0.25s, background 0.25s',
            pointerEvents: 'auto',
            zIndex: 1400,
          }
        }}
      >
        <DialogTitle sx={{
          color: '#fff',
          fontWeight: 800,
          fontSize: '1.35rem',
          textAlign: 'left',
          letterSpacing: 0.5,
          fontFamily: 'Inter, sans-serif',
          bgcolor: 'transparent',
          p: 3,
          pb: 1.2,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          Select AI Assistant(s)
          <Typography sx={{ color: '#9CA3AF', fontWeight: 400, fontSize: '1.08rem', mt: 0.5 }}>
            Choose one or more AI assistants to compare their responses.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          bgcolor: 'transparent',
          minWidth: 0,
          p: 3,
          pt: 0,
          gap: 2,
          pb: 2
        }}>
          <Grid container spacing={2}>
            {availableModels.map((model, idx) => {
              const selected = selectedModels.includes(model.id);
              const descriptions = {
                Cohere: 'Advanced language model by Cohere',
                Mistral: 'Powerful open-source model',
                Gemini: "Google's latest AI model",
                ChatGPT: "OpenAI's conversational AI",
                Qwen: "Alibaba's large language model",
                Deepseek: 'Specialized in deep learning tasks',
                'Rogue Rose': 'Advanced reasoning model',
                Meta: "Meta's AI language model"
              };
              return (
                <Grid item xs={6} sm={4} md={3} key={model.id}>
                  <Box
                    onClick={() => handleModelToggle(model.id)}
                    sx={{
                      cursor: 'pointer',
                      border: selected ? '2px solid #fff' : '1px solid #232323',
                      borderRadius: 3,
                      bgcolor: selected ? 'linear-gradient(135deg, #232323 60%, #181818 100%)' : 'rgba(24,24,24,0.98)',
                      boxShadow: selected ? '0 4px 24px 0 rgba(255,255,255,0.08)' : '0 1px 8px 0 rgba(0,0,0,0.18)',
                      p: 2.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minHeight: 120,
                      minWidth: 0,
                      position: 'relative',
                      transition: 'box-shadow 0.25s, border 0.25s, background 0.25s, color 0.18s',
                      outline: selected ? '1px solid #111' : 'none',
                      '&:hover': {
                        bgcolor: 'linear-gradient(135deg, #232323 80%, #111 100%)',
                        borderColor: '#fff',
                        boxShadow: '0 8px 32px 0 rgba(255,255,255,0.10)',
                        transform: 'translateY(-2px) scale(1.03)',
                      }
                    }}
                  >
                    <img
                      src={model.logo}
                      alt={model.name}
                      style={{
                        width: 38,
                        height: 38,
                        marginBottom: 8,
                        display: 'block',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                      }}
                    />
                    <Typography sx={{
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      textAlign: 'center',
                      width: '100%',
                      color: '#fff',
                    }}>
                      {model.name}
                    </Typography>
                    <Typography sx={{
                      color: '#9CA3AF',
                      fontWeight: 400,
                      fontSize: '0.92rem',
                      mt: 0.5,
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      {descriptions[model.id]}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
          {selectedModels.length === 0 && (
            <Typography sx={{
              color: '#EF4444',
              fontWeight: 500,
              fontSize: '1.05rem',
              mt: 2,
              textAlign: 'center',
              bgcolor: 'rgba(239,68,68,0.1)',
              p: 2,
              borderRadius: 2,
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              You must select at least one AI assistant to continue.
            </Typography>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              disabled={selectedModels.length === 0}
              onClick={() => setModelDialogOpen(false)}
              sx={{
                bgcolor: '#232323',
                color: '#fff',
                borderRadius: 3,
                fontWeight: 800,
                fontSize: '1.15rem',
                px: 5,
                py: 1.5,
                boxShadow: '0 2px 12px 0 rgba(17,17,17,0.2)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                '&:hover': {
                  bgcolor: '#111',
                  color: '#fff',
                  boxShadow: '0 4px 18px 0 rgba(17,17,17,0.25)',
                  transform: 'translateY(-1px)',
                },
                minWidth: 110,
                transition: 'all 0.2s ease',
                border: '1px solid #232323',
              }}
            >
              NEXT
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      {/* Profile Dialog */}
      <Dialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'linear-gradient(135deg, #232323 60%, #181818 100%)',
            color: '#fff',
            borderRadius: 5,
            boxShadow: '0 8px 40px 0 #000c',
            border: '1.5px solid #232323',
            p: 0,
            transition: 'box-shadow 0.25s, border 0.25s, background 0.25s',
          }
        }}
      >
        <DialogTitle sx={{
          color: '#fff',
          fontWeight: 900,
          fontSize: '1.25rem',
          textAlign: 'left',
          letterSpacing: 0.5,
          fontFamily: 'Inter, sans-serif',
          bgcolor: 'transparent',
          p: 3,
          pb: 1.2,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          Profile
          <IconButton
            onClick={() => setProfileDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 12,
              top: 12,
              color: '#9CA3AF',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          p: 4,
          pt: 2
        }}>
          <Avatar sx={{
            width: 80,
            height: 80,
            bgcolor: '#181818',
            color: '#fff',
            border: '2.5px solid #fff',
            boxShadow: '0 4px 24px 0 #fff2',
            fontSize: '2.5rem',
            mb: 2,
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Typography sx={{
            fontWeight: 700,
            fontSize: '1.15rem',
            color: '#fff',
            mb: 1
          }}>
            {user?.email}
          </Typography>
          <Button
            variant="contained"
            onClick={handleLogout}
            sx={{
              mt: 2,
              borderRadius: 3,
              fontWeight: 700,
              px: 4,
              py: 1.2,
              fontSize: '1.08rem',
              bgcolor: 'rgba(239,68,68,0.1)',
              color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.2)',
              '&:hover': {
                bgcolor: 'rgba(239,68,68,0.2)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            Logout
          </Button>
        </DialogContent>
      </Dialog>
      {/* History Drawer */}
      <Drawer
        anchor="left"
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 340,
            bgcolor: '#181818',
            color: '#fff',
            borderRight: '1.5px solid #232323',
            boxShadow: '0 8px 40px 0 #000c',
            transition: 'box-shadow 0.25s, border 0.25s, background 0.25s',
          }
        }}
      >
        <Box sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.2rem' }}>Chat History</Typography>
          <IconButton
            onClick={() => setHistoryDrawerOpen(false)}
            sx={{
              color: '#9CA3AF',
              '&:hover': {
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {history.length === 0 && (
            <ListItem>
              <ListItemText
                primary="No history yet."
                primaryTypographyProps={{
                  sx: {
                    color: '#9CA3AF',
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }
                }}
              />
            </ListItem>
          )}
          {history.map(item => (
            <ListItem
              button
              key={item.id}
              onClick={() => handleHistoryClick(item)}
              sx={{
                borderRadius: 2,
                mb: 1,
                bgcolor: 'rgba(255,255,255,0.02)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  transform: 'translateY(-1px)',
                },
                boxShadow: '0 2px 8px 0 rgba(0,0,0,0.1)',
                transition: 'all 0.18s',
                border: '1px solid rgba(255,255,255,0.1)',
                mx: 1,
              }}
            >
              <ListItemText
                primary={item.chat_name || (item.messages?.[0]?.text?.slice(0, 30) + (item.messages?.[0]?.text?.length > 30 ? '...' : ''))}
                secondary={new Date(item.created_at).toLocaleString()}
                primaryTypographyProps={{
                  sx: {
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '1.05rem'
                  }
                }}
                secondaryTypographyProps={{
                  sx: {
                    color: '#9CA3AF',
                    fontSize: '0.95rem'
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
      {/* Tour Dialog: minimal, modern, with overlay and highlight */}
      {(showTour && hasSeenTour !== true) && ReactDOM.createPortal(
        <>
          {/* Calculate spotlight position and size from highlightStyle */}
          {highlightStyle && highlightStyle.width && highlightStyle.height && (
            <Box
              sx={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 1301,
                pointerEvents: 'none',
                background: 'rgba(0,0,0,0.55)',
                // No blur at all
                transition: 'clip-path 0.3s cubic-bezier(.4,2,.6,1)',
                clipPath: `circle(${Math.max(highlightStyle.width, highlightStyle.height)/2 + 24}px at ${highlightStyle.left + highlightStyle.width/2}px ${highlightStyle.top + highlightStyle.height/2}px)`
              }}
            />
          )}
          {/* Glowing border for highlight */}
          {highlightStyle && highlightStyle.width && highlightStyle.height && (
            <Box
              sx={{
                position: 'fixed',
                left: highlightStyle.left - 8,
                top: highlightStyle.top - 8,
                width: highlightStyle.width + 16,
                height: highlightStyle.height + 16,
                borderRadius: highlightStyle.borderRadius || 12,
                border: '3px solid #00eaff',
                boxShadow: '0 0 32px 8px #00eaff88',
                pointerEvents: 'none',
                zIndex: 3001,
                animation: 'glow 1.5s infinite alternate',
                '@keyframes glow': {
                  from: { boxShadow: '0 0 32px 8px #00eaff88' },
                  to: { boxShadow: '0 0 48px 16px #00eaffcc' }
                },
              }}
            />
          )}
          {/* Tour dialog, positioned near the highlight */}
          {highlightStyle && highlightStyle.width && highlightStyle.height && (
            <Dialog
              open={showTour}
              onClose={handleSkipTour}
              maxWidth="xs"
              fullWidth
              PaperProps={{
                sx: (() => {
                  // Default: to the right of the highlight
                  let left = Math.min(highlightStyle.left + highlightStyle.width + 32, window.innerWidth - 400);
                  let top = Math.max(highlightStyle.top - 16, 24);
                  // If not enough space on right, show to the left
                  if (highlightStyle.left + highlightStyle.width + 400 > window.innerWidth) {
                    left = Math.max(highlightStyle.left - 400, 24);
                    top = highlightStyle.top + highlightStyle.height + 32;
                  }
                  // If still overflows right, clamp
                  if (left + 400 > window.innerWidth) left = window.innerWidth - 410;
                  // If overflows left, clamp
                  if (left < 0) left = 24;
                  // If overflows bottom, show above
                  if (top + 350 > window.innerHeight) top = Math.max(highlightStyle.top - 350, 24);
                  return {
                    bgcolor: 'linear-gradient(135deg, #00eaff 0%, #fff 100%)',
                    color: '#181818',
                    borderRadius: 5,
                    boxShadow: '0 8px 40px 0 #00eaff44, 0 0 0 1px #fff',
                    border: '2px solid #00eaff',
                    p: 0,
                    zIndex: 4000,
                    position: 'fixed',
                    left,
                    top,
                    transform: 'none',
                    opacity: 1,
                    transition: 'all 0.35s cubic-bezier(.4,2,.6,1)',
                  };
                })()
              }}
            >
              <DialogTitle sx={{
                color: '#fff',
                fontWeight: 900,
                fontSize: '1.18rem',
                textAlign: 'left',
                letterSpacing: 0.5,
                fontFamily: 'Inter, sans-serif',
                bgcolor: 'transparent',
                p: 3,
                pb: 1.2,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {currentTourStep === 0 && <Avatar sx={{ bgcolor: '#111', width: 36, height: 36 }}>👤</Avatar>}
                  {currentTourStep === 1 && <Avatar sx={{ bgcolor: '#111', width: 36, height: 36 }}>＋</Avatar>}
                  {currentTourStep === 2 && <Avatar sx={{ bgcolor: '#111', width: 36, height: 36 }}><HistoryIcon /></Avatar>}
                  {currentTourStep === 3 && <Avatar sx={{ bgcolor: '#111', width: 36, height: 36 }}>🤖</Avatar>}
                  <Box>
                    {currentTourStep === 0 && 'Your Profile'}
                    {currentTourStep === 1 && 'Start a New Chat'}
                    {currentTourStep === 2 && 'Chat History'}
                    {currentTourStep === 3 && 'Select AI Models'}
                  </Box>
                </Box>
                <IconButton
                  onClick={handleSkipTour}
                  sx={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    color: '#9CA3AF',
                    '&:hover': {
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                p: 4,
                pt: 2,
                bgcolor: 'transparent',
                borderRadius: 4,
                boxShadow: '0 0 32px 0 #fff4',
              }}>
                {/* Progress bar */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[0,1,2,3].map(i => (
                    <Box
                      key={i}
                      sx={{
                        width: 18,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: currentTourStep === i ? '#111' : 'rgba(255,255,255,0.1)',
                        transition: 'all 0.2s',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </Box>
                {/* Step description */}
                <Typography sx={{
                  fontWeight: 700,
                  fontSize: '1.08rem',
                  color: '#fff',
                  textAlign: 'center',
                  mb: 1,
                  lineHeight: 1.6,
                }}>
                  {currentTourStep === 0 && 'View your profile and logout securely.'}
                  {currentTourStep === 1 && 'Click here to start a new chat. Each chat is saved in your history.'}
                  {currentTourStep === 2 && 'Access your chat history and revisit any conversation.'}
                  {currentTourStep === 3 && 'Select one or more AI assistants to compare their responses.'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    onClick={handlePrevTour}
                    disabled={currentTourStep === 0}
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      fontWeight: 600,
                      bgcolor: 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-1px)',
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255,255,255,0.3)',
                        bgcolor: 'rgba(255,255,255,0.02)',
                      },
                      transition: 'all 0.2s ease',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleNextTour}
                    sx={{
                      borderRadius: 3,
                      px: 3,
                      fontWeight: 700,
                      bgcolor: '#232323',
                      color: '#fff',
                      '&:hover': {
                        bgcolor: '#111',
                        transform: 'translateY(-1px)',
                      },
                      transition: 'all 0.2s ease',
                      border: '1px solid #232323',
                    }}
                  >
                    {currentTourStep < 3 ? 'Next' : 'Finish'}
                  </Button>
                </Box>
              </DialogContent>
            </Dialog>
          )}
        </>,
        document.body
      )}
    </Box>
  );
};

export default ModelsPage;