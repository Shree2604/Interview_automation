import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  Sparkles,
  Mic,
  MicOff,
  AlertCircle,
  Bot,
  UserCircle
} from 'lucide-react';
import ThankYou from './ThankYou';
import './User.css';
import MobileNumberScreen from './MobileNumber';
import websocketService from "./WebsocketService";
// Questions for the interview
const INTERVIEW_QUESTIONS = [
  "Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education? Can you tell us why you're interested in working in early childhood education?"
];

const SpeechInterviewApp = ({ onLogout, currentUser }) => {
  const [currentStep, setCurrentStep] = useState('invitation');
  const [micPermission, setMicPermission] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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
        synthRef.current.onvoiceschanged = null;
      }
    };
  }, []);
// web socket connection
useEffect(() => {
    const token = localStorage.getItem("jwtToken");

    websocketService.connect(
      token,
      (msg) => setMessages((prev) => [...prev, msg]), // onMessage
      () => console.log("Connected to server"),       // onOpen
      () => console.log("Connection closed"),         // onClose
      (err) => console.error("Error:", err)           // onError
    );

    return () => {
      websocketService.close();
    };
  }, []);

  const sendMessage = () => {
    websocketService.send(input);
    setInput("");
  };
  // Cleanup audio resources
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error stopping recognition:', e);
        }
        recognitionRef.current = null;
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(console.error);
        }
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

  // AI Speaking
  const speakText = (text) => {
    if (synthRef.current && 'speechSynthesis' in window) {
      // stop listening while AI talks
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);

      synthRef.current.cancel();
      setIsAISpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;

      const voices = synthRef.current.getVoices();
      const femaleVoice = voices.find(
        voice =>
          voice.name.includes('Female') ||
          voice.name.includes('Samantha') ||
          voice.name.includes('Karen')
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => {
        setIsAISpeaking(false);
        // restart listening after AI finished
        if (recognitionRef.current && currentStep === 'interview') {
          recognitionRef.current.start();
          setIsListening(true);
        }
      };
      utterance.onerror = () => {
        setIsAISpeaking(false);
      };

      synthRef.current.speak(utterance);
    }
  };

  // Handle user response
  const processUserResponse = useCallback(
    async (userResponse) => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const nextQuestionIndex = currentQuestionIndex + 1;

        if (nextQuestionIndex < INTERVIEW_QUESTIONS.length) {
          const nextQuestion = INTERVIEW_QUESTIONS[nextQuestionIndex];
          addToConversation('ai', nextQuestion);
          setCurrentQuestionIndex(nextQuestionIndex);
          speakText(nextQuestion);
        } else {
          const closingMessage =
            "Thank you for your responses. We've completed the interview.";
          addToConversation('ai', closingMessage);
          speakText(closingMessage);
          setTimeout(() => setCurrentStep('thankyou'), 2000);
        }
      } catch (error) {
        setHasError(true);
        setErrorMessage('Error while processing your response.');
      }
    },
    [currentQuestionIndex, currentStep]
  );

  const startInterview = useCallback(async () => {
    try {
      setIsLoading(true);
      const firstQuestion = INTERVIEW_QUESTIONS[0];
      addToConversation('ai', firstQuestion);
      setCurrentQuestionIndex(0);
      speakText(firstQuestion);
    } catch (error) {
      setHasError(true);
      setErrorMessage('Failed to start interview.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  



  // Microphone permission
  const checkMicPermission = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        if (currentStep === 'interview') requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

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
          if (interimTranscript) setCurrentTranscript(interimTranscript);
          if (finalTranscript.trim()) {
            addToConversation('human', finalTranscript.trim());
            setCurrentTranscript('');
            setIsListening(false);
            processUserResponse(finalTranscript.trim());
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // only restart if AI is not speaking
          if (currentStep === 'interview' && !isAISpeaking) {
            recognitionRef.current.start();
            setIsListening(true);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setCurrentTranscript('');
        };

        setCurrentStep('interview');
        startInterview();
      } else {
        setHasError(true);
        setErrorMessage('Speech recognition not supported in this browser.');
      }
    } catch (error) {
      setMicPermission(false);
      setHasError(true);
      setErrorMessage('Microphone access failed.');
      setCurrentStep('interview');
    } finally {
      setIsLoading(false);
    }
  }, [currentStep, isAISpeaking, startInterview, processUserResponse]);

  const startListening = () => {
    if (!recognitionRef.current || isAISpeaking) return;
    setIsListening(true);
    setCurrentTranscript('');
    try {
      recognitionRef.current.start();
    } catch (error) {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isAISpeaking) return; // block while AI is talking
    if (isListening) stopListening();
    else startListening();
  };

  // Invitation Step
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

              <button onClick={checkMicPermission} className="primary-button">
                <Sparkles size={20} /> Get Started
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
          <button onClick={checkMicPermission} className="close-button">
            <AlertCircle size={24} />
          </button>
        </div>
      </div>
    );
  }

  // Interview Step
  if (currentStep === 'interview') {
    const getCurrentAIText = () => {
      const lastAIMessage = [...conversation].reverse().find(msg => msg.speaker === 'ai');
      return lastAIMessage ? lastAIMessage.text : 'Welcome to your screening round interview';
    };

    const getCurrentUserText = () => {
      if (currentTranscript) return currentTranscript;
      const lastUserMessage = [...conversation].reverse().find(msg => msg.speaker === 'human');
      return lastUserMessage ? lastUserMessage.text : 'Click the microphone to start speaking...';
    };

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
              {new Date().toLocaleTimeString()}
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
                  <Bot className="w-16 h-16" />
                </div>
              </div>
              
              <h2 className="panel-title">AI Interviewer Agent</h2>
              <div className="speech-bubble ai-bubble">
                <p className={`speech-text transition-all duration-300 ${
                  isAISpeaking ? 'ai-speaking' : ''
                }`}>
                  {getCurrentAIText()}
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
                  <UserCircle className="w-16 h-16" />
                </div>
              </div>
              
              <h2 className="panel-title">
                {currentUser?.name || 'Candidate'}
              </h2>
              <div className="speech-bubble user-bubble">
                <p className={`speech-text transition-all duration-300 ${
                  currentTranscript ? 'user-speaking' : ''
                }`}>
                  {getCurrentUserText()}
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
              disabled={isAISpeaking} // block while AI talks
              className={`microphone-button ${
                isListening ? 'listening' : ''
              } ${isAISpeaking ? 'disabled' : ''}`}
            >
              {isListening ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
            
            <p className="status-message">
              {isAISpeaking ? 'AI is Speaking...' : 
               isListening ? 'Listening... Click to Stop' : 
               'Click Microphone to Speak'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'thankyou') {
    // return <ThankYou onReturnHome={onLogout} />;
    return <MobileNumberScreen/>;

  }

  return null;
};

export default SpeechInterviewApp;
