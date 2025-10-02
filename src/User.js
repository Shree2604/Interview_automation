import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  Sparkles,
  Mic,
  MicOff,
  AlertCircle
} from 'lucide-react';
import ThankYou from './ThankYou';
import './User.css';
import MobileNumberScreen from './MobileNumber';
import websocketService from "./WebsocketService";
import defaultuser from "./assets/defaultuser.png";
import bot1 from "./assets/bot1.jpg";

const SpeechInterviewApp = ({ onLogout, currentUser }) => {
  const [currentStep, setCurrentStep] = useState('invitation');
  const [micPermission, setMicPermission] = useState(null);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const [currentAIContent, setCurrentAIContent] = useState('');
  const [canInteract, setCanInteract] = useState(false);
  const [flowState, setFlowState] = useState('waiting');
  const [speechRecognitionReady, setSpeechRecognitionReady] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const restartAttemptRef = useRef(0);
  const isManualStopRef = useRef(false);
  const lastFinalTranscriptRef = useRef('');
  const recognitionActiveRef = useRef(false);
  const accumulatedTranscriptRef = useRef('');
  const finalTranscriptTimeoutRef = useRef(null);

  const [storedMessages, setStoredMessages] = useState([]);
  const [isAndroid, setIsAndroid] = useState(false);

  // Detect Android device
  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isAndroidDevice = /android/i.test(userAgent);
    setIsAndroid(isAndroidDevice);
    
    if (isAndroidDevice) {
      console.log("📱 Android device detected - optimizations enabled");
      console.log("Browser:", /chrome/i.test(userAgent) ? 'Chrome' : 'Other');
    } else {
      console.log("💻 Desktop/iOS device detected");
    }
  }, []);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const loadVoices = () => {
        const voices = synthRef.current.getVoices();
        if (voices.length === 0) {
          setTimeout(loadVoices, 100);
        }
      };

      synthRef.current.onvoiceschanged = loadVoices;
      loadVoices();
    } else {
      setHasError(true);
      setErrorMessage('Text-to-speech is not supported in your browser.');
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Setup speech recognition with Android Chrome fixes
  const setupSpeechRecognition = useCallback(() => {
    console.log("🎤 Setting up speech recognition...");
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Android Chrome optimized settings
      recognitionRef.current.continuous = true; // Better for Android
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;
      
      // Android Chrome specific: prevent premature stopping
      if (/android/i.test(navigator.userAgent)) {
        console.log("🤖 Android device detected - using optimized settings");
      }

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show interim results immediately
        if (interimTranscript.trim()) {
          setCurrentTranscript(accumulatedTranscriptRef.current + ' ' + interimTranscript.trim());
          resetSilenceTimer();
        }
        
        // Handle final transcript - accumulate all parts
        if (finalTranscript.trim()) {
          const trimmedFinal = finalTranscript.trim();
          console.log("🎤 User final segment:", trimmedFinal);
          
          // Accumulate the transcript
          accumulatedTranscriptRef.current = accumulatedTranscriptRef.current 
            ? accumulatedTranscriptRef.current + ' ' + trimmedFinal 
            : trimmedFinal;
          
          setCurrentTranscript(accumulatedTranscriptRef.current);
          
          // Clear any existing timeout
          if (finalTranscriptTimeoutRef.current) {
            clearTimeout(finalTranscriptTimeoutRef.current);
          }
          
          // Start a 1.5-second timer to send accumulated response
          // This works for both short ("yes", "no") and long answers
          // Shorter timeout for Android Chrome responsiveness
          const timeoutDuration = /android/i.test(navigator.userAgent) ? 1200 : 1500;
          
          finalTranscriptTimeoutRef.current = setTimeout(() => {
            if (accumulatedTranscriptRef.current.trim()) {
              console.log("✅ Sending complete response:", accumulatedTranscriptRef.current);
              
              const completeResponse = accumulatedTranscriptRef.current.trim();
              addToConversation('human', completeResponse);
              setCurrentTranscript('');
              
              // Stop recognition
              isManualStopRef.current = true;
              if (recognitionRef.current && recognitionActiveRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {
                  console.warn('Error stopping recognition:', e);
                }
              }
              
              setIsListening(false);
              setCanInteract(false);
              
              // Send response
              sendUserResponse(completeResponse);
              
              // Reset
              accumulatedTranscriptRef.current = '';
              lastFinalTranscriptRef.current = completeResponse;
              
              // Set waiting state for next question
              setFlowState('waiting');
              console.log("⏳ Waiting for next question from server...");
            }
          }, timeoutDuration); // 1.2s for Android, 1.5s for desktop
        }
      };

      recognitionRef.current.onstart = () => {
        console.log("🎤 Recognition started");
        setIsListening(true);
        recognitionActiveRef.current = true;
        restartAttemptRef.current = 0;
        isManualStopRef.current = false;
      };

      recognitionRef.current.onend = () => {
        console.log("🎤 Recognition ended", {
          flowState,
          canInteract,
          isManualStop: isManualStopRef.current,
          recognitionActive: recognitionActiveRef.current
        });
        
        recognitionActiveRef.current = false;
        setIsListening(false);

        // Don't restart if manually stopped or not in user turn
        if (isManualStopRef.current || flowState !== 'user-turn' || !canInteract) {
          console.log("⏹️ Not restarting recognition");
          return;
        }

        // Retry logic for Android Chrome - more aggressive on Android
        const maxRetries = /android/i.test(navigator.userAgent) ? 5 : 3;
        
        if (restartAttemptRef.current < maxRetries) {
          restartAttemptRef.current++;
          console.log(`🔄 Auto-restart attempt ${restartAttemptRef.current}/${maxRetries}`);
          
          // Shorter delay for Android
          const restartDelay = /android/i.test(navigator.userAgent) ? 300 : 500;
          
          setTimeout(() => {
            if (recognitionRef.current && !recognitionActiveRef.current && 
                flowState === 'user-turn' && canInteract && !isAISpeaking) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.warn('⚠️ Restart failed:', e.message);
                if (e.message.includes('already started')) {
                  recognitionActiveRef.current = true;
                  setIsListening(true);
                }
              }
            }
          }, restartDelay);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('🚫 Speech recognition error:', event.error);
        recognitionActiveRef.current = false;
        
        // Handle specific errors
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setHasError(true);
          setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
          setIsListening(false);
          setCurrentTranscript('');
        } else if (event.error === 'no-speech') {
          console.log('⚠️ No speech detected, will auto-restart');
          // Let onend handle restart
        } else if (event.error === 'aborted') {
          console.log('⚠️ Recognition aborted');
          // Normal abort, let onend handle it
        } else if (event.error === 'network') {
          setErrorMessage('Network error. Please check your connection.');
          setIsListening(false);
        } else {
          // Other errors - try to continue
          console.warn('⚠️ Non-fatal error:', event.error);
        }
      };

      setSpeechRecognitionReady(true);
      console.log("✅ Speech recognition setup complete");
      return true;
    } else {
      console.error("❌ Speech recognition not supported");
      setHasError(true);
      setErrorMessage('Speech recognition not supported in this browser. Please use Chrome or Safari.');
      return false;
    }
  }, [canInteract, flowState, isAISpeaking]);

  // Silence detection - not needed anymore, using finalTranscriptTimeout instead
  const resetSilenceTimer = () => {
    // Keep this function for compatibility but it's not critical anymore
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const handleStartListening = () => {
    // CRITICAL: Never start recognition if TTS is active
    if (isAISpeaking) {
      console.log("❌ Cannot start recognition - TTS is active");
      return;
    }
    
    // CRITICAL: Cancel any ongoing speech synthesis first
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    
    if (!recognitionRef.current) {
      setupSpeechRecognition();
    }
    
    if (recognitionActiveRef.current) {
      console.log("⚠️ Recognition already active");
      return;
    }
    
    try {
      console.log("🎤 Starting speech recognition (TTS confirmed stopped)");
      isManualStopRef.current = false;
      restartAttemptRef.current = 0;
      lastFinalTranscriptRef.current = '';
      accumulatedTranscriptRef.current = '';
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      if (err.message && err.message.includes('already started')) {
        recognitionActiveRef.current = true;
        setIsListening(true);
      } else if (err.message && err.message.includes('recording')) {
        // Chrome mobile specific error
        console.error("🚫 Chrome is already recording - TTS/STT overlap detected!");
        setErrorMessage("Please wait for the AI to finish speaking before trying again.");
        setTimeout(() => setErrorMessage(''), 3000);
      } else {
        setErrorMessage("Please allow microphone access.");
        setHasError(true);
      }
    }
  };

  // WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    websocketService.connect(
      token,
      (msg) => {
        console.log("📩 WebSocket message received:", msg);
        
        let content = null;
        if (msg.type === 'interview_data' && msg.content) {
          content = msg.content;
        } else if (msg.content && typeof msg.content === 'string') {
          content = msg.content;
        } else if (typeof msg === 'string') {
          content = msg;
        }
        
        if (content && typeof content === 'string') {
          setStoredMessages(prev => {
            const newMessages = [...prev];
            if (!newMessages.includes(content)) {
              newMessages.push(content);
              console.log(`📦 Added message ${newMessages.length}:`, content.substring(0, 50) + '...');
            }
            return newMessages;
          });
        }
      },
      () => console.log("✅ Connected to server"),
      () => {
        console.log("❌ Connection closed");
        setTimeout(() => {
          console.log("✅ Going to thank you screen");
          setCurrentStep('thankyou');
          
          // Clean stop recognition
          isManualStopRef.current = true;
          if (recognitionRef.current && recognitionActiveRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.warn('Error stopping recognition:', e);
            }
          }
        }, 6000);
      },
      (err) => console.error("❌ WebSocket Error:", err)
    );

    return () => {
      if (process.env.NODE_ENV === 'production') {
        websocketService.close();
      }
    };
  }, []);

  // Start interview flow when messages are received
  useEffect(() => {
    if (currentStep === 'interview' && storedMessages.length > 0) {
      const lastIndex = storedMessages.length - 1;
      
      // Only play new questions (server sends questions based on answers)
      if (lastIndex > currentQuestionIndex) {
        console.log(`🎯 New question received from server (${lastIndex + 1}):`, storedMessages[lastIndex].substring(0, 100) + '...');
        console.log(`📊 Total questions received so far: ${storedMessages.length}`);
        setCurrentQuestionIndex(lastIndex);
        playQuestion(storedMessages[lastIndex]);
      }
    }
  }, [currentStep, storedMessages.length, currentQuestionIndex]);

  // Play a question and enable user response
  const playQuestion = useCallback((questionText) => {
    console.log("🗣️ Playing question");
    
    // CRITICAL: Ensure no recognition is running
    isManualStopRef.current = true;
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recognition before question:', e);
      }
    }
    
    setFlowState('ai-speaking');
    setCurrentAIContent(questionText);
    addToConversation('ai', questionText);
    setIsListening(false);
    setCanInteract(false);
    
    speakText(questionText, () => {
      console.log("✅ Question finished, enabling user interaction");
      
      // CRITICAL: Only enable user interaction after TTS completely ends
      setFlowState('user-turn');
      setCanInteract(true);
      setIsAISpeaking(false);
      
      // Auto-start listening with proper delay
      setTimeout(() => {
        if (recognitionRef.current && speechRecognitionReady && !isAISpeaking) {
          console.log("🎤 Auto-starting listening after TTS completion...");
          handleStartListening();
        }
      }, 500);
    });
  }, [speechRecognitionReady]);

  const sendUserResponse = useCallback((userResponse) => {
    const responseData = {
      answer: userResponse,
    };
    
    console.log("📤 Sending user response to server:", responseData);
    console.log("⏳ Server will process and send next question...");
    
    websocketService.send(JSON.stringify(responseData));
    
    // Reset state for next question
    accumulatedTranscriptRef.current = '';
    lastFinalTranscriptRef.current = '';
    if (finalTranscriptTimeoutRef.current) {
      clearTimeout(finalTranscriptTimeoutRef.current);
      finalTranscriptTimeoutRef.current = null;
    }
    resetSilenceTimer();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (finalTranscriptTimeoutRef.current) {
        clearTimeout(finalTranscriptTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      isManualStopRef.current = true;
      if (recognitionRef.current && recognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition:', e);
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const addToConversation = (speaker, text) => {
    setConversation(prev => [
      ...prev,
      {
        id: Date.now(),
        speaker,
        text,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const speakText = (text, onEndCallback = null) => {
    console.log("🗣️ Speaking:", text.substring(0, 100) + '...');
    
    if (synthRef.current && 'speechSynthesis' in window) {
      // Stop listening while AI speaks
      isManualStopRef.current = true;
      if (recognitionRef.current && recognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition for speech:', e);
        }
      }
      setIsListening(false);
      setCanInteract(false);
      resetSilenceTimer();

      synthRef.current.cancel();
      setIsAISpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(voice =>
        voice.name.includes('Female') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Karen') ||
        voice.name.includes('Zira') ||
        voice.lang.includes('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        console.log("🗣️ Speech synthesis started");
        setIsAISpeaking(true);
      };
      
      utterance.onend = () => {
        console.log("🗣️ Speech synthesis ended - ready for recognition");
        setIsAISpeaking(false);
        
        // CRITICAL: Only call callback after TTS completely finishes
        if (onEndCallback) {
          // Small delay to ensure TTS resources are fully released
          setTimeout(() => {
            console.log("🔄 TTS cleanup complete, executing callback");
            onEndCallback();
          }, 300);
        }
      };
      
      utterance.onerror = (event) => {
        console.error("🗣️ Speech synthesis error:", event);
        setIsAISpeaking(false);
        if (onEndCallback) {
          onEndCallback();
        }
      };

      synthRef.current.speak(utterance);
    } else {
      console.error("🗣️ Speech synthesis not available");
      if (onEndCallback) {
        onEndCallback();
      }
    }
  };

  const checkMicPermission = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      console.log("🎤 Requesting microphone permission...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;
      setMicPermission(true);

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average);
        if (currentStep === 'interview') {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      const recognitionSuccess = setupSpeechRecognition();
      
      if (recognitionSuccess) {
        console.log("✅ All setup complete, starting interview");
        setCurrentStep('interview');
        setFlowState('waiting');
      } else {
        throw new Error('Speech recognition setup failed');
      }
      
    } catch (error) {
      console.error('🚫 Setup error:', error);
      setMicPermission(false);
      setHasError(true);
      if (error.name === 'NotAllowedError') {
        setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
      } else {
        setErrorMessage('Failed to access microphone or setup speech recognition.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [setupSpeechRecognition]);

  const startListening = () => {
    if (!recognitionRef.current || isAISpeaking || !canInteract || flowState !== 'user-turn') {
      console.log("❌ Cannot start listening:", { 
        hasRecognition: !!recognitionRef.current, 
        isAISpeaking, 
        canInteract, 
        flowState 
      });
      return;
    }
    
    console.log("🎤 Manually starting listening...");
    handleStartListening();
  };

  const stopListening = () => {
    if (recognitionRef.current && recognitionActiveRef.current) {
      console.log("🔇 Manually stopping listening...");
      isManualStopRef.current = true;
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('Error stopping recognition:', error);
      }
    }
  };

  const toggleListening = () => {
    console.log("🔄 Toggle listening:", { 
      isListening, 
      isAISpeaking, 
      canInteract, 
      flowState,
      hasRecognition: !!recognitionRef.current,
      recognitionActive: recognitionActiveRef.current
    });
    
    if (isAISpeaking || !canInteract || flowState !== 'user-turn') {
      console.log("❌ Cannot toggle - conditions not met");
      return;
    }
    
    if (isListening || recognitionActiveRef.current) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getStatusMessage = () => {
    if (isAISpeaking) return '🤖 AI is Speaking...';
    
    switch (flowState) {
      case 'waiting':
        return currentQuestionIndex >= 0 
          ? '⏳ Waiting for next question from server...' 
          : '⏳ Waiting for interview questions...';
      case 'ai-speaking':
        return `🤖 AI is speaking (Question ${currentQuestionIndex + 1})...`;
      case 'user-turn':
        if (isListening || recognitionActiveRef.current) {
          return '🎤 Listening... (Speak your answer, I\'ll detect when you\'re done)';
        }
        return '🎤 Click Microphone to Answer';
      default:
        return '⏳ Please wait...';
    }
  };

  const getTextSizeClass = (text) => {
    if (!text) return 'text-base';
    const length = text.length;
    if (length < 50) return 'text-lg';
    if (length < 100) return 'text-base';
    if (length < 200) return 'text-sm';
    return 'text-xs';
  };

  if (hasError) {
    return (
      <div className="interview-screen-dark">
        <div className="microphone-permission">
          <h2>Setup Error</h2>
          <p>{errorMessage}</p>
          <button onClick={() => window.location.reload()} className="primary-button">
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'invitation') {
    return (
      <div className="speech-interview-app">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-gray-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
        </div>

        <div className="step-container">
          <div className="step-header">
            <h1 className="step-title">Screening Round Invitation</h1>
          </div>

          <div className="step-content">
            <div className="invitation-content">
              <div className="interview-details">
                <h2 className="step-title">
                  🎉 Congratulations
                  {currentUser?.name ? `, ${currentUser.name}` : ''}! You're Invited!
                </h2>
                <p className="welcome-message">
                  You have been selected to participate in screening round for the{' '}
                  <strong>Teacher / Assistant Teacher</strong> role in the{' '}
                  <strong>UPK Program</strong>.
                </p>
                
              </div>

              <div className="interview-details-grid">
                <div className="detail-item">
                  <Calendar className="detail-icon" />
                  <span>
                    <strong>Date:</strong>{' '}
                    {new Date().toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <div className="detail-item">
                  <Clock className="detail-icon" />
                  <span>
                    <strong>Duration:</strong> 20 - 30 minutes
                  </span>
                </div>

                <div className="detail-item">
                  <User className="detail-icon" />
                  <span>
                    <strong>Format:</strong> Voice Interview
                  </span>
                </div>
              </div>

              <div className="interview-details">
                <h3>
                  <strong>Before You Start</strong>
                </h3>
                <br />
                <div className="interview-details-checklist">
                  <span>🎤 Microphone Ready</span>
                  <span>🔇 Quiet Environment</span>
                  <span>🌐 Stable Internet</span>
                </div>
              </div>

              <button 
                onClick={checkMicPermission} 
                className="primary-button"
                disabled={isLoading}
              >
                {isLoading ? 'Setting up...' : <><Sparkles size={20} /> Get Started</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (micPermission === false) {
    return (
      <div className="interview-screen-dark">
        <div className="microphone-permission">
          <h2>Enable microphone access</h2>
          <p>{errorMessage}</p>
          <button onClick={checkMicPermission} className="primary-button">
            <AlertCircle size={24} />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (currentStep === 'interview') {
    const getCurrentAIText = () => {
      if (currentAIContent) {
        return currentAIContent;
      }
      return 'Welcome to your screening round interview 👋';
    };

    const getCurrentUserText = () => {
      if (currentTranscript) return currentTranscript;
      const lastUserMessage = [...conversation].reverse().find(msg => msg.speaker === 'human');
      return lastUserMessage ? lastUserMessage.text : 'Wait for your turn to speak...';
    };

    const aiText = getCurrentAIText();
    const userText = getCurrentUserText();

    return (
      <div className="interview-main-container">
        <div className="interview-header">
          <div className="interview-header-content">
            <div></div>
            <h1 className="interview-title">
              Screening Round Interview
            </h1>
            <div className="interview-time">
              Started At: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="interview-content">
          <div className="ai-agent-side">
            <div className="panel-content">
              <div className="avatar-container">
                <div className={`avatar-circle ai-avatar transition-all duration-300 ${
                  isAISpeaking ? 'speaking' : ''
                }`}>
                  <img src={bot1} alt="Logo" width="200" />
                </div>
              </div>
              
              <h2 className="panel-title">AI Interviewer Agent</h2>
              <div className="speech-bubble ai-bubble" style={{
                minHeight: Math.max(80, Math.min(200, aiText.length * 0.8)) + 'px'
              }}>
                <p className={`speech-text ${getTextSizeClass(aiText)} transition-all duration-300 ${
                  isAISpeaking ? 'ai-speaking' : ''
                }`}>
                  {aiText}
                </p>
              </div>
            </div>
          </div>

          <div className="user-side">
            <div className="panel-content">
              <div className="avatar-container">
                <div className={`avatar-circle user-avatar transition-all duration-300 ${
                  (isListening || currentTranscript) ? 'speaking' : ''
                }`}>
                  <img src={defaultuser} alt="Logo" />
                </div>
              </div>
              
              <h2 className="panel-title">
                {currentUser?.name || 'Candidate'}
              </h2>
              <div className="speech-bubble user-bubble" style={{
                minHeight: Math.max(80, Math.min(200, userText.length * 0.8)) + 'px'
              }}>
                <p className={`speech-text ${getTextSizeClass(userText)} transition-all duration-300 ${
                  currentTranscript ? 'user-speaking' : ''
                }`}>
                  {userText}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="microphone-control-area">
          <div className="microphone-control-container">
            <button
              onClick={toggleListening}
              disabled={isAISpeaking || !canInteract || flowState !== 'user-turn'}
              className={`microphone-button ${
                (isListening || recognitionActiveRef.current) ? 'listening' : ''
              } ${(isAISpeaking || !canInteract || flowState !== 'user-turn') ? 'disabled' : ''}`}
            >
              {(isListening || recognitionActiveRef.current) ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
            
            <p className="status-message">
              {getStatusMessage()}
            </p>
          
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'thankyou') {
    return <MobileNumberScreen />;
  }

  return null;
};

export default SpeechInterviewApp;