import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Shield, Mic, MessageSquare, VolumeX, Ban, User, RefreshCw, CheckCircle, Camera, Activity, FileText, Unlock } from 'lucide-react';

const AIModeration = () => {
  const videoRef = useRef(null); 
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('STUDENT');
  const [userName, setUserName] = useState('User_1');
  const [userStatus, setUserStatus] = useState({ strikes: 0, isMuted: false, isBlocked: false });
  
  const [chatMessages, setChatMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activityLog, setActivityLog] = useState([]);

  // --- NAYA: Survey/Apology States ---
  const [quizStep, setQuizStep] = useState(0);
  const ethicsQuestions = [
    {
      q: "Kya aap mante hain ki aapka vyavahar guidelines ke khilaaf tha?",
      options: ["Haan, main maanta hoon", "Nahi, main sahi tha"],
      correct: "Haan, main maanta hoon"
    },
    {
      q: "Kya aap vaada karte hain ki aage se aap toxic language use nahi karenge?",
      options: ["Nahi", "Haan, vaada karta hoon"],
      correct: "Haan, vaada karta hoon"
    }
  ];

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- NAYA: Unmute Appeal Logic ---
  const handleUnmuteAppeal = () => {
    setUserStatus(prev => ({ ...prev, isMuted: false }));
    addActivityLog("System", "User appealed and unmuted", "low");
    alert("Aapko unmute kar diya gaya hai. Kripya guidelines ka dhyan rakhein.");
  };

  const handleModeration = async (formData) => {
    try {
      formData.append('userId', userName);
      formData.append('role', userRole);
      formData.append('distance', '0.1');
      const res = await axios.post('http://localhost:5001/api/moderation/process', formData);
      setUserStatus(res.data.userStatus);
      return res.data.aiAnalysis;
    } catch (err) {
      console.error("Backend Error:", err);
      return null;
    }
  };

  // --- NAYA: Quiz Answer Logic ---
  const handleQuizAnswer = (answer) => {
    if (answer === ethicsQuestions[quizStep].correct) {
      if (quizStep < ethicsQuestions.length - 1) {
        setQuizStep(quizStep + 1);
      } else {
        setUserStatus({ strikes: 0, isMuted: false, isBlocked: false });
        setQuizStep(0);
        addActivityLog("System", "User Apology Accepted - Access Restored", "low");
        alert("Aapka apology accept kar liya gaya hai. Access Restored!");
      }
    } else {
      alert("Galat jawab! Aapko guidelines samajhni hongi. Access blocked hi rahega.");
      setQuizStep(0);
    }
  };

  const toggleVoiceMonitoring = async () => {
    if (userStatus.isBlocked || userStatus.isMuted) return;
    if (!isListening) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], "voice.wav", { type: 'audio/wav' });
          const formData = new FormData();
          formData.append('audio', audioFile);
          formData.append('text', 'Voice Input');
          const aiResult = await handleModeration(formData);
          if (aiResult) addActivityLog(userName, `Voice: ${aiResult.transcribedText}`, 'low');
        };
        mediaRecorderRef.current.start();
        setIsListening(true);
      } catch (err) { alert("Mic Access Denied!"); }
    } else {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsListening(false);
    }
  };

  const handleSendMessage = async () => {
    if (!textInput.trim() || userStatus.isBlocked || userStatus.isMuted) return;
    const formData = new FormData();
    formData.append('text', textInput);
    const aiResult = await handleModeration(formData);
    if (aiResult) {
      setChatMessages(prev => [...prev, { text: textInput, user: userName, toxic: aiResult.toxicityScore > 0.7 }]);
      addActivityLog(userName, `Text: ${aiResult.reason}`, aiResult.toxicityScore > 0.7 ? 'high' : 'low');
    }
    setTextInput('');
  };

  const toggleCamera = async () => {
    if (!isCameraOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setIsCameraOn(true);
      } catch (err) { alert("Camera access denied."); }
    } else {
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      setIsCameraOn(false);
    }
  };

  const addActivityLog = (user, action, severity) => {
    setActivityLog(prev => [{ time: new Date().toLocaleTimeString(), user, action, severity }, ...prev].slice(0, 6));
  };

  const s = {
    app: { backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: 'sans-serif' },
    card: { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' },
    btn: (bg) => ({ padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: 'none', backgroundColor: bg, color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }),
    input: { flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white' }
  };

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Shield color="#3b82f6" size={35} />
            <input value={userName} onChange={e => setUserName(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '18px', fontWeight: 'bold', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ padding: '5px 10px', borderRadius: '5px', fontWeight: 'bold', backgroundColor: userStatus.isBlocked ? '#ef4444' : (userStatus.isMuted ? '#f59e0b' : '#10b981') }}>
              {userStatus.isBlocked ? 'BLOCKED' : (userStatus.isMuted ? 'MUTED' : 'ACTIVE')}
            </div>
            <div style={{ textAlign: 'center' }}>
              <small>STRIKES</small>
              <div style={{ color: userStatus.strikes >= 3 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{userStatus.strikes}/5</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button style={s.btn(activeTab === 'dashboard' ? '#3b82f6' : '#334155')} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button style={s.btn(activeTab === 'chat' ? '#3b82f6' : '#334155')} onClick={() => setActiveTab('chat')}>Chat & Mic</button>
      </div>

      {activeTab === 'dashboard' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={s.card}>
            <h3><Camera size={20} color="#a78bfa" /> Gesture Monitor</h3>
            <div style={{ width: '100%', height: '240px', backgroundColor: 'black', borderRadius: '10px', marginBottom: '15px', overflow: 'hidden' }}>
              <video ref={videoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <button onClick={toggleCamera} style={s.btn(isCameraOn ? '#ef4444' : '#3b82f6')}>{isCameraOn ? 'Stop Camera' : 'Start Camera'}</button>
          </div>
          <div style={s.card}>
            <h3>System Logs</h3>
            <div style={{ height: '300px', overflowY: 'auto' }}>
              {activityLog.map((log, i) => (
                <div key={i} style={{ padding: '10px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#60a5fa' }}>[{log.time}]</span> <b>{log.user}:</b> {log.action}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={s.card}>
          {userStatus.isBlocked ? (
            /* --- NAYA: APOLOGY SURVEY FORM --- */
            <div style={{ textAlign: 'center', padding: '30px', border: '2px solid #ef4444', borderRadius: '15px', backgroundColor: 'rgba(239,68,68,0.05)' }}>
              <Ban size={50} color="#ef4444" />
              <h2 style={{ color: '#ef4444' }}>ACCESS TERMINATED</h2>
              <p>Aapne violations ki hain. Wapas meeting join karne ke liye maafi naama (Appeal) bharein.</p>
              
              <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', textAlign: 'left', marginTop: '20px', border: '1px solid #3b82f6' }}>
                <p style={{ color: '#3b82f6', fontWeight: 'bold' }}>Ethics Question {quizStep + 1}/2:</p>
                <p style={{ fontSize: '16px', margin: '15px 0' }}>{ethicsQuestions[quizStep].q}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {ethicsQuestions[quizStep].options.map((opt, i) => (
                    <button key={i} onClick={() => handleQuizAnswer(opt)} style={{ padding: '12px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}>{opt}</button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* --- UNMUTE APPEAL BUTTON --- */}
              {userStatus.isMuted && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '15px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center' }}>
                  <p style={{ color: '#f59e0b', marginBottom: '10px', fontSize: '14px' }}>Aapka microphone aur chat temporarily band hai.</p>
                  <button onClick={handleUnmuteAppeal} style={{ ...s.btn('#f59e0b'), color: 'black', margin: 'auto' }}>
                    <Unlock size={16} /> Appeal to Unmute
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h3>Moderation Hub</h3>
                <button style={s.btn(isListening ? '#ef4444' : '#10b981')} onClick={toggleVoiceMonitoring} disabled={userStatus.isMuted}>
                  {isListening ? <VolumeX size={16} /> : <Mic size={16} />} {isListening ? 'Stop Mic' : 'Start Mic'}
                </button>
              </div>
              <div style={{ height: '250px', background: '#0f172a', padding: '15px', borderRadius: '10px', overflowY: 'auto', marginBottom: '15px' }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ padding: '8px', background: m.toxic ? 'rgba(239, 68, 68, 0.1)' : '#1e293b', marginBottom: '8px', borderRadius: '5px' }}>
                    <small style={{ color: '#60a5fa' }}>{m.user}</small><p style={{ margin: 0 }}>{m.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input style={s.input} value={textInput} onChange={e => setTextInput(e.target.value)} disabled={userStatus.isMuted} placeholder={userStatus.isMuted ? "Click 'Appeal to Unmute' to talk" : "Type message..."} />
                <button style={s.btn('#3b82f6')} onClick={handleSendMessage} disabled={userStatus.isMuted}>SEND</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIModeration;