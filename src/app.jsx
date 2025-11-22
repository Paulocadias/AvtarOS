import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, CheckCircle, XCircle, RefreshCcw, ChevronRight, Shield, User, AlertCircle, Loader2, ScanFace, MoveLeft, MoveRight, MoveUp, MoveDown, BadgeCheck, Zap, Fingerprint, Sun, Moon, CameraOff } from 'lucide-react';
import { useFaceDetection } from './hooks/useFaceDetection';
import { personaStorage, captureFrameFromVideo } from './services/personaStorage';

// --- Components ---

const StepIndicator = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center space-x-3 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
            index + 1 <= currentStep 
              ? 'w-8 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' 
              : 'w-2 bg-gray-300 dark:bg-neutral-800'
          }`}
        />
      ))}
    </div>
  );
};

const CameraView = ({ onCapture, onFrameCapture, isVideo = false, autoStart = false }) => {
  const videoRef = useRef(null);
  const [hasStream, setHasStream] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectionState, setDetectionState] = useState(autoStart ? "initializing" : "idle");
  const [flash, setFlash] = useState(false);
  const [moveInstruction, setMoveInstruction] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState([]);

  // Real face detection with BlazeFace
  const { isLoading: isModelLoading, faceData, isModelReady } = useFaceDetection(
    videoRef,
    hasStream && !cameraError && (isVideo || detectionState !== "idle")
  ); 

  // --- Real Camera Implementation ---
  useEffect(() => {
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasStream(true);
          setCameraError(false);
        }
      } catch (err) {
        console.error("Camera access denied or unavailable:", err);
        setCameraError(true);
        // Fallback: If camera fails, we still allow the UI flow to proceed for demo purposes
        setHasStream(true); 
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- Auto-Detection Logic with Real Face Detection ---
  useEffect(() => {
    if (!isVideo || !autoStart || !hasStream) return;

    let detectTimeout;

    // Transition from initializing to scanning once stream and model are ready
    if (detectionState === "initializing" && isModelReady) {
      setDetectionState("scanning");
    }

    // Use real face detection to determine if face is detected and centered
    if (detectionState === "scanning" && faceData.detected && faceData.centered) {
      setDetectionState("detected");
    }

    // Start recording once face is locked
    if (detectionState === "detected") {
      detectTimeout = setTimeout(() => {
        setDetectionState("recording");
        setIsRecording(true);
      }, 1000);
    }

    return () => {
      clearTimeout(detectTimeout);
    };
  }, [isVideo, autoStart, detectionState, hasStream, isModelReady, faceData.detected, faceData.centered]);

  // --- Recording/Movement Logic ---
  useEffect(() => {
    let interval;
    let lastPhase = -1;
    const frames = [];

    if (isRecording && isVideo) {
      const phaseDuration = 2500;
      const totalPhases = 5;
      const totalDuration = phaseDuration * totalPhases;

      const startTime = Date.now();

      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const currentProgress = Math.min((elapsed / totalDuration) * 100, 100);
        const currentPhase = Math.floor((currentProgress / 100) * totalPhases);

        setProgress(currentProgress);
        setMoveInstruction(currentPhase);

        // Capture frame at each phase change
        if (currentPhase !== lastPhase && videoRef.current) {
          const frame = captureFrameFromVideo(videoRef.current);
          if (frame) {
            frames.push(frame);
            if (onFrameCapture) {
              onFrameCapture(frame);
            }
          }
          lastPhase = currentPhase;
        }

        if (currentProgress >= 100) {
          clearInterval(interval);
          setIsRecording(false);
          setCapturedFrames(frames);
          onCapture(frames);
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRecording, isVideo, onCapture, onFrameCapture]);

  const handleManualCapture = () => {
    if (isVideo) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // Capture actual frame from video
    const frame = captureFrameFromVideo(videoRef.current);
    if (onFrameCapture && frame) {
      onFrameCapture(frame);
    }
    onCapture(frame);
  };

  const getFeedbackText = () => {
    if (cameraError) return "Camera Unavailable";
    if (!hasStream) return "Initializing Camera...";
    if (isModelLoading) return "Loading AI Model...";

    if (!isVideo) {
      if (faceData.detected && faceData.centered) return "Perfect! Tap to capture";
      if (faceData.detected) return "Center your face";
      return "Position face in frame";
    }
    if (detectionState === "scanning") {
      if (faceData.detected && !faceData.centered) return "Center your face";
      return "Searching for face...";
    }
    if (detectionState === "detected") return "Face Locked";
    if (isRecording) {
      const instructions = ["Look Center", "Turn Left", "Turn Right", "Look Up", "Look Down"];
      return instructions[moveInstruction] || "Processing";
    }
    return "Ready";
  };

  const renderMovementIcon = () => {
    const iconClass = "w-16 h-16 text-yellow-500 dark:text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] transition-all duration-300";
    
    // Only show icons if we are NOT showing the video feed (fallback) OR if we need specific overlay icons
    // If video is active, we mostly want the view clear, but the movement icons are helpful guides
    
    if (cameraError) return <CameraOff className="w-16 h-16 text-red-500" />;
    
    if (isRecording) {
        switch (moveInstruction) {
        case 0: return <ScanFace className={iconClass + " opacity-50"} />;
        case 1: return <MoveLeft className={iconClass} />;
        case 2: return <MoveRight className={iconClass} />;
        case 3: return <MoveUp className={iconClass} />;
        case 4: return <MoveDown className={iconClass} />;
        default: return null;
        }
    }
    
    if (detectionState === 'scanning') return <ScanFace className="w-24 h-24 text-yellow-500/50 animate-pulse" />;
    
    return null;
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-black rounded-[2rem] overflow-hidden shadow-2xl aspect-[3/4] flex flex-col border border-gray-200 dark:border-neutral-800 ring-4 ring-gray-100 dark:ring-neutral-900 group">
      
      {/* 1. Video Layer (The Base) */}
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center overflow-hidden">
        {!cameraError ? (
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
          />
        ) : (
           /* Fallback Pattern if no camera */
           <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
           </div>
        )}
      </div>

      {/* 2. Overlays Layer */}
      <div className="absolute inset-0 z-10">
        
        {/* Face Alignment Guide (Oval) */}
        {!isRecording && detectionState !== 'recording' && !cameraError && (
             <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] w-64 h-80 border-2 rounded-[50%] box-border transition-colors duration-500 ${
               faceData.detected && faceData.centered
                 ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                 : faceData.detected
                 ? 'border-yellow-500'
                 : 'border-white/20'
             }`}>
                {detectionState === 'scanning' && !faceData.detected && (
                    <div className="absolute inset-0 border-2 border-yellow-500 rounded-[50%] animate-ping opacity-20"></div>
                )}
             </div>
        )}

        {/* Central HUD Logic */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-500 ${isRecording ? 'scale-100' : 'scale-100'}`}>
             
             {/* Scanning Radar Effect (Only during scan phase) */}
             {detectionState === 'scanning' && (
               <div className="absolute inset-0 rounded-full border-t-2 border-yellow-500 animate-[spin_2s_linear_infinite] shadow-[0_0_30px_rgba(234,179,8,0.3)]"></div>
             )}

             {/* Active Recording Ring */}
             {isRecording && (
               <>
                 <svg className="absolute inset-0 w-full h-full -rotate-90 opacity-40" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" className="text-black" />
                 </svg>
                 <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" viewBox="0 0 100 100">
                   <circle
                     cx="50" cy="50" r="48"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="4"
                     className="text-yellow-400 transition-all duration-100 ease-linear"
                     strokeDasharray="301"
                     strokeDashoffset={301 - (301 * progress) / 100}
                     strokeLinecap="round"
                   />
                 </svg>
               </>
             )}

             {/* Icons Overlay */}
             <div className="relative z-10">
               {renderMovementIcon()}
             </div>
          </div>
        </div>

        {/* Top HUD Text */}
        <div className="absolute top-12 left-0 right-0 flex justify-center">
            <div className="px-6 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-center">
                <p className={`text-lg font-bold tracking-wide transition-all duration-300 ${isRecording ? 'text-yellow-400' : 'text-white'}`}>
                {getFeedbackText()}
                </p>
                {isRecording && (
                <p className="text-yellow-200/60 text-[10px] font-mono tracking-widest uppercase mt-1">
                    Rec: {Math.round(progress)}%
                </p>
                )}
            </div>
        </div>

        {/* Flash Overlay */}
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-100 ${flash ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* 3. Static Tech UI Elements (Corners) */}
      <div className="absolute inset-0 pointer-events-none m-6 z-20">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-yellow-500/50 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-yellow-500/50 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-yellow-500/50 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-yellow-500/50 rounded-br-lg"></div>
      </div>

      {/* 4. Bottom Controls */}
      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center pb-6 z-30">
        {!isVideo ? (
          <button
            onClick={handleManualCapture}
            disabled={!hasStream && !cameraError}
            className="group relative w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 rounded-full border-4 border-white/30 group-hover:border-white/50 transition-colors"></div>
            <div className="w-16 h-16 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all"></div>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-neutral-900/80 border border-neutral-800 backdrop-blur-md shadow-lg">
             {isRecording ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                  </span>
                  <span className="text-yellow-400 text-xs font-bold tracking-widest uppercase">Capturing Mesh</span>
                </>
             ) : (
                <span className="text-neutral-400 text-xs font-medium tracking-wider uppercase flex items-center gap-2">
                  <Zap className="w-3 h-3 text-yellow-500" /> 
                  {detectionState === 'initializing' ? 'Initializing Sensors...' : 'Auto-Sensor Active'}
                </span>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

const ValidationLoader = ({ onComplete }) => {
  const [status, setStatus] = useState("Initializing upload...");
  const [progress, setProgress] = useState(0);

  const steps = [
    { msg: "Uploading High-Res Textures...", time: 0 },
    { msg: "Processing Point Cloud...", time: 2000 },
    { msg: "Mapping Facial Topology...", time: 4000 },
    { msg: "Calculating Depth Vectors...", time: 6000 },
    { msg: "Rendering 3D Mesh...", time: 8000 },
  ];

  useEffect(() => {
    const totalTime = 9000; 
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(p);

      const currentStep = steps.slice().reverse().find(s => elapsed >= s.time);
      if (currentStep) {
        setStatus(currentStep.msg);
      }

      if (elapsed >= totalTime) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in duration-700 w-full">
      <div className="relative w-40 h-40 mb-10">
        {/* Outer glow */}
        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full"></div>
        
        <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
          {/* Track */}
          <circle
            cx="80" cy="80" r="70"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            className="text-gray-200 dark:text-neutral-800"
          />
          {/* Progress */}
          <circle
            cx="80" cy="80" r="70"
            fill="transparent"
            stroke="url(#gradient)"
            strokeWidth="6"
            strokeLinecap="round"
            style={{
              strokeDasharray: 440,
              strokeDashoffset: 440 - (440 * progress) / 100,
            }}
            className="transition-all duration-200 ease-linear"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#eab308" /> {/* Yellow-500 */}
              <stop offset="100%" stopColor="#fbbf24" /> {/* Amber-400 */}
            </linearGradient>
          </defs>
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <Fingerprint className="w-16 h-16 text-gray-800 dark:text-white/90 animate-pulse" />
        </div>
      </div>
      
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{Math.round(progress)}%</h3>
        <p className="text-yellow-600 dark:text-yellow-400 font-medium text-sm uppercase tracking-widest animate-pulse">{status}</p>
      </div>
    </div>
  );
};

export default function IdentityVerificationApp() {
  const [step, setStep] = useState(0);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [videoTaken, setVideoTaken] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentPersona, setCurrentPersona] = useState(null);

  // Handlers
  const nextStep = () => setStep(s => s + 1);

  // Initialize or get persona when starting capture
  const handleStartCapture = () => {
    const persona = personaStorage.create();
    setCurrentPersona(persona);
    nextStep();
  };

  const handlePhotoCapture = (frame) => {
    if (currentPersona && frame) {
      personaStorage.saveTexturePhoto(currentPersona.id, frame);
    }
    setPhotoTaken(true);
    setTimeout(() => nextStep(), 800);
  };

  const handleVideoCapture = (frames) => {
    if (currentPersona && frames && Array.isArray(frames)) {
      frames.forEach(frame => {
        personaStorage.addVolumetricFrame(currentPersona.id, frame);
      });
    }
    setVideoTaken(true);
    setTimeout(() => nextStep(), 500);
  };

  const handleValidationComplete = () => {
    if (currentPersona) {
      personaStorage.markComplete(currentPersona.id);
      // Update local state with completed persona
      setCurrentPersona(personaStorage.getById(currentPersona.id));
    }
    nextStep();
  };

  const restart = () => {
    setStep(0);
    setPhotoTaken(false);
    setVideoTaken(false);
    setCurrentPersona(null);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Renders
  const renderStep = () => {
    switch (step) {
      case 0: // Intro
        return (
          <div className="text-center space-y-8 py-6 animate-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 blur-3xl opacity-20 rounded-full"></div>
              <div className="relative w-24 h-24 bg-gradient-to-tr from-gray-100 to-white dark:from-neutral-800 dark:to-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 transform hover:rotate-0 transition-transform duration-300">
                <ScanFace className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            
            <div className="space-y-3 max-w-xs mx-auto">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-neutral-400 tracking-tight">
                AvatarOS
              </h1>
              <p className="text-gray-500 dark:text-neutral-400 text-sm leading-relaxed">
                Initialize biometric capture sequence. Data will be used to generate high-fidelity 3D mesh.
              </p>
            </div>

            <div className="w-full max-w-xs bg-white dark:bg-neutral-900/50 p-6 rounded-2xl border border-gray-200 dark:border-neutral-800 backdrop-blur-sm space-y-5 text-left shadow-sm dark:shadow-none">
              <div className="flex items-start gap-4 group">
                <div className="mt-1 p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg group-hover:bg-yellow-500/20 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors text-gray-500 dark:text-neutral-500">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-gray-900 dark:text-neutral-200 font-semibold block mb-0.5">Texture Map</span>
                  <span className="text-gray-500 dark:text-neutral-500 text-xs">High-res static capture.</span>
                </div>
              </div>
              <div className="flex items-start gap-4 group">
                <div className="mt-1 p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg group-hover:bg-yellow-500/20 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors text-gray-500 dark:text-neutral-500">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-gray-900 dark:text-neutral-200 font-semibold block mb-0.5">Volumetric Scan</span>
                  <span className="text-gray-500 dark:text-neutral-500 text-xs">Multi-angle depth geometry acquisition.</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleStartCapture}
              className="w-full max-w-xs bg-gray-900 dark:bg-yellow-500 hover:bg-gray-800 dark:hover:bg-yellow-400 text-white dark:text-black font-bold py-4 rounded-xl shadow-lg shadow-gray-400/20 dark:shadow-yellow-900/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 group"
            >
              Initialize Capture
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        );

      case 1: // Photo
        return (
          <div className="space-y-6 animate-in fade-in duration-500 w-full">
             <div className="text-center px-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">Texture Acquisition</h2>
                <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">Remove glasses. Position face in oval guide.</p>
             </div>
             <CameraView onCapture={handlePhotoCapture} isVideo={false} />
          </div>
        );

      case 2: // Video
        return (
          <div className="space-y-6 animate-in fade-in duration-500 w-full">
             <div className="text-center px-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">Volumetric Scan</h2>
                <p className="text-gray-500 dark:text-neutral-400 text-sm mt-1">Follow the holographic guides.</p>
             </div>
             <CameraView onCapture={handleVideoCapture} isVideo={true} autoStart={true} />
          </div>
        );

      case 3: // Processing
        return <ValidationLoader onComplete={handleValidationComplete} />;

      case 4: // Success
        return (
          <div className="text-center py-8 space-y-8 animate-in zoom-in-95 duration-500 flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
              <BadgeCheck className="relative w-28 h-28 text-emerald-500 dark:text-emerald-400 drop-shadow-2xl" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Twin Generated</h2>
              <p className="text-gray-500 dark:text-neutral-400">Your digital avatar is ready for deployment.</p>
            </div>

            <div className="w-full max-w-xs bg-white dark:bg-neutral-900/50 rounded-2xl border border-gray-200 dark:border-neutral-800 divide-y divide-gray-100 dark:divide-neutral-800 backdrop-blur-sm">
               <div className="flex justify-between p-4 items-center">
                 <span className="text-gray-500 dark:text-neutral-400 text-sm">Poly Count</span>
                 <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold text-sm">2.4M</span>
               </div>
               <div className="flex justify-between p-4 items-center">
                 <span className="text-gray-500 dark:text-neutral-400 text-sm">Texture</span>
                 <span className="font-mono text-yellow-600 dark:text-yellow-400 font-bold text-sm">8K RAW</span>
               </div>
               <div className="flex justify-between p-4 items-center">
                 <span className="text-gray-500 dark:text-neutral-400 text-sm">Rigging</span>
                 <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">Auto-Weight</span>
               </div>
            </div>

            <button
              onClick={restart}
              className="text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white font-medium flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-neutral-800 px-6 py-3 rounded-full transition-all"
            >
              <RefreshCcw className="w-4 h-4" /> New Scan
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`${isDarkMode ? 'dark' : ''} w-full h-screen overflow-hidden`}>
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4 font-sans selection:bg-yellow-500/30 transition-colors duration-500">
        <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_-12px_rgba(234,179,8,0.1)] border border-gray-100 dark:border-neutral-800 overflow-hidden flex flex-col min-h-[750px] relative transition-colors duration-500">
          
          {/* Top Bar */}
          <div className="px-8 py-6 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-20 transition-colors duration-500">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 dark:bg-yellow-500 rounded-lg flex items-center justify-center text-white dark:text-black shadow-lg shadow-yellow-500/20">
                <ScanFace className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-900 dark:text-neutral-200 tracking-wide">AvatarOS</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-yellow-500 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${step === 4 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-neutral-500'}`}>
                {step === 4 ? 'Online' : 'Standby'}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 flex flex-col relative z-10">
            {step > 0 && step < 4 && (
              <StepIndicator currentStep={step} totalSteps={3} />
            )}
            
            <div className="flex-1 flex flex-col justify-center items-center w-full">
              {renderStep()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}