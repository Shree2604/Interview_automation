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
  
  // Simplified flow management
  const [currentAIContent, setCurrentAIContent] = useState('');
  const [canInteract, setCanInteract] = useState(false);
  const [flowState, setFlowState] = useState('waiting'); // waiting, playing-q1, waiting-3sec, playing-q2, user-turn
  const [speechRecognitionReady, setSpeechRecognitionReady] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);

  // Message storage
  const [storedMessages, setStoredMessages] = useState([]);

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
const handleStartListening = () => {
  if (!recognitionRef.current) {
    setupSpeechRecognition(); // Initialize if not ready
  }
  try {
    recognitionRef.current.start();
  } catch (err) {
    console.error("Failed to start recognition:", err);
    setErrorMessage("Please allow microphone access.");
    setHasError(true);
  }
};
  // Setup speech recognition
  const setupSpeechRecognition = useCallback(() => {
    console.log("🎤 Setting up speech recognition...");
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 3;
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
if (interimTranscript.trim()) {
  setCurrentTranscript(interimTranscript.trim());
}

        
        if (finalTranscript.trim()) {
          console.log("🎤 User final response:", finalTranscript.trim());
          addToConversation('human', finalTranscript.trim());
          setCurrentTranscript('');
          setIsListening(false);
          setCanInteract(false);
          // Send response to backend
          sendUserResponse(finalTranscript.trim());
        }
      };

      recognitionRef.current.onstart = () => {
        console.log("🎤 Recognition started");
        setIsListening(true);
      };

      // recognitionRef.current.onend = () => {
      //   console.log("🎤 Recognition ended");
      //   setIsListening(false);
        
      //   // Only restart if we're in user-turn state and can interact
      //   if (flowState === 'user-turn' && canInteract && !isAISpeaking) {
      //     console.log("🔄 Auto-restarting recognition...");
      //     setTimeout(() => {
      //       if (canInteract && flowState === 'user-turn' && recognitionRef.current) {
      //         try {
      //           recognitionRef.current.start();
      //         } catch (e) {
      //           console.warn('Error restarting recognition:', e);
      //         }
      //       }
      //     }, 800);
      //   }
      // };
recognitionRef.current.onend = () => {
  console.log("🎤 Recognition ended");
  setIsListening(false);

  if (flowState === 'user-turn' && canInteract && !isAISpeaking) {
    console.log("🔄 Trying to restart recognition...");
    setTimeout(() => {
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.abort(); // ensure clean stop
          recognitionRef.current.start();
        } catch (e) {
          console.warn('⚠️ Restart blocked:', e.message);
        }
      }
    }, 1200); // increase timeout for mobile
  }
};



      recognitionRef.current.onerror = (event) => {
        console.error('🚫 Speech recognition error:', event.error);
        setIsListening(false);
        setCurrentTranscript('');
        
        // Don't restart on certain errors
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setHasError(true);
          setErrorMessage('Microphone access denied. Please allow microphone access and try again.');
        }
      };

      setSpeechRecognitionReady(true);
      console.log("✅ Speech recognition setup complete");
      return true;
    } else {
      console.error("❌ Speech recognition not supported");
      setHasError(true);
      setErrorMessage('Speech recognition not supported in this browser.');
      return false;
    }
  }, [canInteract, flowState, isAISpeaking]);

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
      () =>{ console.log("❌ Connection closed");
     setTimeout(() => {
      console.log("✅ Going to thank you screen");
      setCurrentStep('thankyou');
       if (recognitionRef.current) {
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
    if (currentStep === 'interview' && storedMessages.length > 0 && flowState === 'waiting') {
      console.log("🎯 Starting interview flow with messages:", storedMessages.length);
      startInterviewFlow();
    }
  }, [currentStep, storedMessages.length, flowState]);

  // Start the interview flow
  const startInterviewFlow = useCallback(() => {
    if (storedMessages.length === 0) {
      console.log("⏳ No messages yet, waiting...");
      return;
    }

    console.log("🚀 Starting interview flow");
    console.log("Question 1:", storedMessages[0].substring(0, 100) + '...');
    if (storedMessages.length > 1) {
      console.log("Question 2:", storedMessages[1].substring(0, 100) + '...');
    }

    // Step 1: Play first question immediately
    setFlowState('playing-q1');
    setCurrentAIContent(storedMessages[0]);
    addToConversation('ai', storedMessages[0]);
    speakText(storedMessages[0], () => {
      console.log("✅ Question 1 finished, starting 3-second wait");
      
      // Step 2: Wait 3 seconds
      setFlowState('waiting-3sec');
      timeoutRef.current = setTimeout(() => {
        console.log("⏰ 3-second wait complete");
        
        // Step 3: Play second question if available
        if (storedMessages.length >= 2) {
          console.log("🎯 Playing Question 2");
          setFlowState('playing-q2');
          setCurrentAIContent(storedMessages[storedMessages.length-1]);
          addToConversation('ai', storedMessages[storedMessages.length-1]);
          speakText(storedMessages[storedMessages.length-1], () => {
            console.log("✅ Question 2 finished, enabling user interaction");
            
            // Step 4: Enable user interaction
            setFlowState('user-turn');
            setCanInteract(true);
            setIsAISpeaking(false);
            
            // Auto-start listening after a brief delay
            setTimeout(() => {
              if (recognitionRef.current && speechRecognitionReady) {
                console.log("🎤 Auto-starting listening...");
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.warn('Error auto-starting recognition:', e);
                }
              }
            }, 1000);
          });
        } else {
          console.log("⚠️ Question 2 not available yet, waiting...");
          // Keep waiting for second message
          const checkInterval = setInterval(() => {
            if (storedMessages.length) {
              clearInterval(checkInterval);
              console.log("🎯 Found Question 2, playing now");
              setFlowState('playing-q2');
              setCurrentAIContent(storedMessages[1]);
              addToConversation('ai', storedMessages[1]);
              speakText(storedMessages[1], () => {
                setFlowState('user-turn');
                setCanInteract(true);
                setIsAISpeaking(false);
                setTimeout(() => {
                  if (recognitionRef.current && speechRecognitionReady) {
                    try {
                      recognitionRef.current.start();
                    } catch (e) {
                      console.warn('Error starting recognition:', e);
                    }
                  }
                }, 1000);
              });
            }
          }, 500);
          
          // Stop checking after 15 seconds
          setTimeout(() => clearInterval(checkInterval), 15000);
        }
      }, 3000);
    });
  }, [storedMessages, speechRecognitionReady]);
  useEffect(() => {
    if (storedMessages.length > 2) {
      const lastMessage = storedMessages[storedMessages.length - 1];
      checkResponsePlay(lastMessage);
    }
  }, [storedMessages]);
  // Send user response
  const sendUserResponse = useCallback((userResponse) => {
    const responseData = {
      answer: userResponse,
    };
    
    console.log("📤 Sending user response:", responseData);
    websocketService.send(JSON.stringify(responseData));
    
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
    }
    
    // Wait 2 seconds then go to thank you screen
    // setTimeout(() => {
    //   console.log("✅ Going to thank you screen");
    //   setCurrentStep('thankyou');
    // }, 2000);
  }, [currentUser]);
 const checkResponsePlay = useCallback(() => {
  console.log("🎯 Playing Question 2");
          setFlowState('playing-q2');
          setCurrentAIContent(storedMessages[storedMessages.length-1]);
          addToConversation('ai', storedMessages[storedMessages.length-1]);
          speakText(storedMessages[storedMessages.length-1], () => {
            console.log("✅ Question 2 finished, enabling user interaction");
            
            // Step 4: Enable user interaction
            setFlowState('user-turn');
            setCanInteract(true);
            setIsAISpeaking(false);
            
            // Auto-start listening after a brief delay
            setTimeout(() => {
              if (recognitionRef.current && speechRecognitionReady) {
                console.log("🎤 Auto-starting listening...");
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.warn('Error auto-starting recognition:', e);
                }
              }
            }, 1000);
          });
        // if(storedMessages[storedMessages.length-1].includes("Thank")){
       
        // }
 });
  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
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

  // AI Speaking function
  const speakText = (text, onEndCallback = null) => {
    console.log("🗣️ Speaking:", text.substring(0, 100) + '...');
    
    if (synthRef.current && 'speechSynthesis' in window) {
      // Stop listening while AI speaks
      if (recognitionRef.current && isListening) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition for speech:', e);
        }
      }
      setIsListening(false);
      setCanInteract(false);

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
        console.log("🗣️ Speech synthesis ended");
        setIsAISpeaking(false);
        if (onEndCallback) {
          setTimeout(onEndCallback, 200);
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

  // Check microphone permission and setup
  const checkMicPermission = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      console.log("🎤 Requesting microphone permission...");
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;
      setMicPermission(true);

      // Setup audio context for level monitoring
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Audio level monitoring
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

      // Setup speech recognition
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

  // Manual microphone controls
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
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.warn('Error starting recognition:', error);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      console.log("🔇 Manually stopping listening...");
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
      hasRecognition: !!recognitionRef.current
    });
    
    if (isAISpeaking || !canInteract || flowState !== 'user-turn') {
      console.log("❌ Cannot toggle - conditions not met");
      return;
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Get status message
  const getStatusMessage = () => {
    if (isAISpeaking) return '🤖 AI is Speaking...';
    
    switch (flowState) {
      case 'waiting':
        return '⏳ Waiting for interview questions...';
      case 'playing-q1':
        return '🤖 AI is speaking (Question 1)...';
      case 'waiting-3sec':
        return '⏸️ Please wait (3-second pause)...';
      case 'playing-q2':
        return '🤖 AI is speaking (Question 2)...';
      case 'user-turn':
        if (isListening) return '🎤 Listening... Click to Stop';
        return '🎤 Click Microphone to Speak';
      default:
        return '⏳ Please wait...';
    }
  };

  // Helper function for text sizing
  const getTextSizeClass = (text) => {
    if (!text) return 'text-base';
    const length = text.length;
    if (length < 50) return 'text-lg';
    if (length < 100) return 'text-base';
    if (length < 200) return 'text-sm';
    return 'text-xs';
  };

  // Show error screen
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

  // Invitation screen
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

  // Microphone permission denied
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

  // Interview screen
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
        {/* Header */}
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

        {/* Main Interview Area */}
        <div className="interview-content">
          {/* AI Agent Side */}
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

          {/* User Side */}
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

        {/* Microphone Control */}
        <div className="microphone-control-area">
          <div className="microphone-control-container">
            <button
              onClick={toggleListening}
              disabled={isAISpeaking || !canInteract || flowState !== 'user-turn'}
              className={`microphone-button ${
                isListening ? 'listening' : ''
              } ${(isAISpeaking || !canInteract || flowState !== 'user-turn') ? 'disabled' : ''}`}
            >
              {isListening ? (
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

  // Thank you screen
  if (currentStep === 'thankyou') {
    return <MobileNumberScreen />;
  }

  return null;
};

export default SpeechInterviewApp;