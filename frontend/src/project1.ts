import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Shield, Volume2, VolumeX, Ban, Eye, Users, MessageSquare, Activity, Mic, MicOff, BarChart3, TrendingUp, Clock, Navigation } from 'lucide-react';

const AIModeration = () => {
  const [users, setUsers] = useState([
    { id: 1, name: 'User1', position: { x: 50, y: 50 }, status: 'active', warnings: 0, voiceActive: false, score: 100 },
    { id: 2, name: 'User2', position: { x: 150, y: 100 }, status: 'active', warnings: 0, voiceActive: false, score: 100 },
    { id: 3, name: 'User3', position: { x: 250, y: 150 }, status: 'active', warnings: 0, voiceActive: false, score: 100 }
  ]);
  
  const [logs, setLogs] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [selectedUser, setSelectedUser] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [proximityThreshold, setProximityThreshold] = useState(80);
  const [stats, setStats] = useState({
    totalViolations: 0,
    toxicMessages: 0,
    proximityViolations: 0,
    voiceViolations: 0,
    activeUsers: 3,
    autoWarnings: 0,
    autoMutes: 0,
    autoBlocks: 0,
    hourlyViolations: [12, 8, 15, 10, 18, 14, 9, 16]
  });
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const proximityCheckRef = useRef(null);

  // AI Scoring system - reduces score based on violations
  const updateUserScore = (userId, penalty) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        const newScore = Math.max(0, user.score - penalty);
        return { ...user, score: newScore };
      }
      return user;
    }));
  };

  // Automatic moderation based on score
  const autoModerateUser = (userId, violationType, severity) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.status === 'blocked') return;

    let penalty = 0;
    let action = null;

    // Determine penalty and action based on violation type and severity
    switch(severity) {
      case 'high':
        penalty = 40;
        action = user.score - penalty <= 50 ? 'block' : 'mute';
        break;
      case 'medium':
        penalty = 25;
        action = user.score - penalty <= 30 ? 'mute' : 'warn';
        break;
      case 'low':
        penalty = 15;
        action = 'warn';
        break;
      default:
        penalty = 10;
        action = 'warn';
    }

    updateUserScore(userId, penalty);

    // Execute automatic action
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u };
        const newScore = Math.max(0, u.score - penalty);
        
        if (action === 'block' || newScore <= 20) {
          updated.status = 'blocked';
          updated.voiceActive = false;
          addLog('auto-block', `🤖 AUTO-BLOCKED: ${u.name} (Score: ${newScore}/100, Violation: ${violationType})`, 'danger');
          setStats(prev => ({ 
            ...prev, 
            activeUsers: prev.activeUsers - 1,
            autoBlocks: prev.autoBlocks + 1
          }));
        } else if (action === 'mute' || newScore <= 40) {
          if (updated.status !== 'muted') {
            updated.status = 'muted';
            updated.voiceActive = false;
            addLog('auto-mute', `🤖 AUTO-MUTED: ${u.name} (Score: ${newScore}/100, Violation: ${violationType})`, 'warning');
            setStats(prev => ({ ...prev, autoMutes: prev.autoMutes + 1 }));
          }
        } else {
          updated.warnings += 1;
          addLog('auto-warn', `🤖 AUTO-WARNING: ${u.name} (Score: ${newScore}/100, Warnings: ${updated.warnings}, Violation: ${violationType})`, 'warning');
          setStats(prev => ({ ...prev, autoWarnings: prev.autoWarnings + 1 }));
        }
        
        return updated;
      }
      return u;
    }));
  };

  // Simulated AI toxicity detection
  const detectToxicity = (text) => {
    const toxicPatterns = [
      { pattern: /\b(hate|stupid|idiot|kill|die|attack)\b/i, severity: 'high' },
      { pattern: /\b(dumb|annoying|suck|loser)\b/i, severity: 'medium' },
      { pattern: /\b(bad|worst|terrible|ugly)\b/i, severity: 'low' }
    ];
    
    for (let { pattern, severity } of toxicPatterns) {
      if (pattern.test(text)) {
        return { isToxic: true, severity, confidence: 0.85 + Math.random() * 0.14 };
      }
    }
    return { isToxic: false, severity: 'none', confidence: 0.95 };
  };

  // Check proximity violations with configurable threshold
  const checkProximity = (user1, user2, threshold = proximityThreshold) => {
    const dx = user1.position.x - user2.position.x;
    const dy = user1.position.y - user2.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return { isViolation: distance < threshold, distance: Math.round(distance) };
  };

  // Add log entry
  const addLog = (type, message, severity = 'info') => {
    const newLog = {
      id: Date.now(),
      type,
      message,
      severity,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  // Toggle voice recording simulation
  const toggleVoiceRecording = () => {
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      const user = users.find(u => u.id === selectedUser);
      if (user.status === 'blocked' || user.status === 'muted') {
        addLog('blocked', `❌ ${user.name} cannot speak (Status: ${user.status})`, 'danger');
        return;
      }

      setUsers(prev => prev.map(u => 
        u.id === selectedUser ? { ...u, voiceActive: true } : u
      ));
      addLog('voice', `${user.name} started speaking`, 'info');
      
      // Simulate voice detection after 2 seconds
      setTimeout(() => {
        const toxicPhrases = [
          { text: "I hate you all", severity: 'high' },
          { text: "You're so annoying", severity: 'medium' },
          { text: "This is terrible", severity: 'low' },
          { text: "Hello everyone", severity: 'none' }
        ];
        const phrase = toxicPhrases[Math.floor(Math.random() * toxicPhrases.length)];
        const result = detectToxicity(phrase.text);
        
        if (result.isToxic) {
          addLog('voice-toxic', `🎤 Toxic speech detected from ${user.name}: "${phrase.text}" (Confidence: ${(result.confidence * 100).toFixed(1)}%)`, result.severity);
          setStats(prev => ({ 
            ...prev, 
            voiceViolations: prev.voiceViolations + 1,
            totalViolations: prev.totalViolations + 1
          }));
          
          autoModerateUser(selectedUser, 'Toxic Voice', result.severity);
        } else {
          addLog('voice', `${user.name}: "${phrase.text}"`, 'info');
        }
        
        setUsers(prev => prev.map(u => 
          u.id === selectedUser ? { ...u, voiceActive: false } : u
        ));
        setIsRecording(false);
      }, 2500);
    } else {
      setUsers(prev => prev.map(u => 
        u.id === selectedUser ? { ...u, voiceActive: false } : u
      ));
    }
  };

  // Handle text submission
  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    
    const user = users.find(u => u.id === selectedUser);
    if (user.status === 'blocked' || user.status === 'muted') {
      addLog('blocked', `❌ ${user.name} cannot send messages (Status: ${user.status})`, 'danger');
      setTextInput('');
      return;
    }

    const result = detectToxicity(textInput);
    
    if (result.isToxic) {
      addLog('toxic', `💬 Toxic message detected from ${user.name}: "${textInput}" (Confidence: ${(result.confidence * 100).toFixed(1)}%)`, result.severity);
      setStats(prev => ({ 
        ...prev, 
        toxicMessages: prev.toxicMessages + 1,
        totalViolations: prev.totalViolations + 1
      }));
      
      autoModerateUser(selectedUser, 'Toxic Text', result.severity);
    } else {
      addLog('message', `${user.name}: "${textInput}"`, 'info');
    }
    
    setTextInput('');
  };

  // VR simulation animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw grid
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 0; i < height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }
       // Draw proximity zones and users
      users.forEach((user, idx) => {
        if (user.status === 'blocked') return;
        
        // Draw proximity zone (safety bubble)
        ctx.beginPath();
        ctx.arc(user.position.x, user.position.y, proximityThreshold / 2, 0, 2 * Math.PI);
        ctx.fillStyle = user.status === 'muted' ? 'rgba(251, 191, 36, 0.08)' : 'rgba(59, 130, 246, 0.08)';
        ctx.fill();
        ctx.strokeStyle = user.status === 'muted' ? '#fbbf24' : '#60a5fa';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw user
        ctx.beginPath();
        ctx.arc(user.position.x, user.position.y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = user.status === 'blocked' ? '#ef4444' : 
                       user.status === 'muted' ? '#f59e0b' : '#10b981';
        ctx.fill();
        
        // Draw score indicator
        const scoreAngle = (user.score / 100) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(user.position.x, user.position.y, 18, -Math.PI / 2, -Math.PI / 2 + scoreAngle);
        ctx.strokeStyle = user.score > 60 ? '#10b981' : user.score > 30 ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw voice indicator if active
        if (user.voiceActive) {
          ctx.beginPath();
          ctx.arc(user.position.x, user.position.y, 23 + Math.sin(Date.now() / 200) * 3, 0, 2 * Math.PI);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        // Draw label
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(user.name, user.position.x, user.position.y - 30);
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(`Score: ${user.score}`, user.position.x, user.position.y - 18);
      });
      
      // Check and draw proximity violations
      users.forEach((user1, i) => {
        if (user1.status === 'blocked') return;
        users.forEach((user2, j) => {
          if (i < j && user2.status !== 'blocked') {
            const { isViolation, distance } = checkProximity(user1, user2);
            if (isViolation) {
              ctx.beginPath();
              ctx.moveTo(user1.position.x, user1.position.y);
              ctx.lineTo(user2.position.x, user2.position.y);
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 3;
              ctx.stroke();
              
              // Draw warning icon and distance
              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 20px sans-serif';
              ctx.textAlign = 'center';
              const midX = (user1.position.x + user2.position.x) / 2;
              const midY = (user1.position.y + user2.position.y) / 2;
              ctx.fillText('⚠', midX, midY - 5);
              ctx.font = 'bold 10px sans-serif';
              ctx.fillText(`${distance}px`, midX, midY + 10);
            }
          }
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [users, proximityThreshold]);

  // Automatic proximity violation detection
  useEffect(() => {
    const checkProximityViolations = () => {
      const activeUsers = users.filter(u => u.status !== 'blocked');
      
      for (let i = 0; i < activeUsers.length; i++) {
        for (let j = i + 1; j < activeUsers.length; j++) {
          const { isViolation, distance } = checkProximity(activeUsers[i], activeUsers[j]);
          
          if (isViolation) {
            // Calculate severity based on distance
            const severity = distance < proximityThreshold * 0.5 ? 'high' : 
                           distance < proximityThreshold * 0.75 ? 'medium' : 'low';
            
            addLog('proximity', `🚨 PROXIMITY VIOLATION: ${activeUsers[i].name} and ${activeUsers[j].name} too close (${distance}px < ${proximityThreshold}px threshold)`, severity);
            
            setStats(prev => ({ 
              ...prev, 
              proximityViolations: prev.proximityViolations + 1,
              totalViolations: prev.totalViolations + 1
            }));
            
            // Auto-moderate both users
            autoModerateUser(activeUsers[i].id, 'Proximity Violation', severity);
            autoModerateUser(activeUsers[j].id, 'Proximity Violation', severity);
          }
        }
      }
    };

    proximityCheckRef.current = setInterval(checkProximityViolations, 3000);
    
    return () => {
      if (proximityCheckRef.current) {
        clearInterval(proximityCheckRef.current);
      }
    };
  }, [users, proximityThreshold]);

  // Simulate random user movement
  useEffect(() => {
    const interval = setInterval(() => {
      setUsers(prev => prev.map(user => {
        if (user.status === 'blocked') return user;
        
        return {
          ...user,
          position: {
            x: Math.max(30, Math.min(370, user.position.x + (Math.random() - 0.5) * 25)),
            y: Math.max(30, Math.min(270, user.position.y + (Math.random() - 0.5) * 25))
          }
        };
      }));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'danger': return 'bg-red-50 border-red-300 text-red-900';
      case 'warning': return 'bg-yellow-50 border-yellow-300 text-yellow-900';
      case 'high': return 'bg-red-50 border-red-300 text-red-900';
      case 'medium': return 'bg-orange-50 border-orange-300 text-orange-900';
      default: return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 text-gray-900">
    <div style={{ width: "100%" }}>
      <div className="mb-6 p-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3 text-gray-900">
          <Shield className="text-blue-600" />
          AI Moderation System
        </h1>
        <p className="text-gray-600">
          Automated real-time content moderation with AI-powered safety monitoring
        </p>
      </div>


        {/* Navigation */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>

          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeView === 'dashboard' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveView('moderation')}
            className={`px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
              activeView === 'moderation' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Shield size={20} />
            Live Moderation
          </button>
        </div>

        {activeView === 'dashboard' ? (
          // Dashboard View
          <div className="space-y-6">
            {/* Stats Dashboard */}
            <div style={{
             display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16
            }}>

              <div style={{
                   background: "#ffffff",
                  border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  padding: 20,
                   boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
                  }}>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Violations</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{stats.totalViolations}</p>
                  </div>
                  <AlertTriangle className="text-red-600" size={36} />
                </div>
              </div>
              
              <div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Toxic Messages</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.toxicMessages}</p>
                  </div>
                  <MessageSquare className="text-purple-600" size={36} />
                </div>
              </div>
              <div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Voice Violations</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.voiceViolations}</p>
                  </div>
                  <Mic className="text-indigo-600" size={36} />
                </div>
              </div>
              
        <div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Active Users</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeUsers}</p>
                  </div>
                  <Users className="text-green-600" size={36} />
                </div>
              </div>
            </div>

            {/* Charts and Analytics */}
            <div style={{
                 display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                   gap: 16
                }}>

             <div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="text-blue-600" />
                  Hourly Violations Trend
                </h3>
                <div className="flex items-end justify-between h-48 gap-2">
                  {stats.hourlyViolations.map((value, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t"
                        style={{ height: `${(value / 20) * 100}%` }}
                      />
                      <span className="text-xs text-gray-600">{idx}h</span>
                    </div>
                  ))}
                </div>
              </div>
<div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="text-blue-600" />
                  Recent Automated Actions
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {logs.filter(log => log.type.startsWith('auto-')).slice(0, 6).map(log => (
                    <div key={log.id} className="flex items-start gap-3 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        log.severity === 'danger' ? 'bg-red-500' :
                        log.severity === 'warning' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-gray-900">{log.message}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{log.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Status Overview */}
          <div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

              <h3 className="text-lg font-semibold mb-4">User Status Overview</h3>
              <div className="grid grid-cols-3 gap-4">
                {users.map(user => (
                  <div key={user.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{user.name}</h4>
                      <span className={`w-3 h-3 rounded-full ${
                        user.status === 'blocked' ? 'bg-red-500' :
                        user.status === 'muted' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium text-gray-900 capitalize">{user.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Safety Score:</span>
                        <span className={`font-bold ${
                          user.score > 60 ? 'text-green-600' :
                          user.score > 30 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{user.score}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Warnings:</span>
                        <span className="font-medium text-yellow-600">{user.warnings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Voice:</span>
                        <span className="font-medium">{user.voiceActive ? '🔊 Active' : '🔇 Inactive'}</span>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          user.score > 60 ? 'bg-green-500' :
                          user.score > 30 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${user.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Moderation View
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* VR Simulation */}
              <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Eye className="text-blue-600" />
                    VR Space Simulation
                  </h2>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700 font-medium">Proximity Threshold:</label>
                    <input
                      type="range"
                      min="40"
                      max="120"
                      value={proximityThreshold}
                      onChange={(e) => setProximityThreshold(Number(e.target.value))}
                      className="w-32"
                    />
                    <span className="text-sm font-bold text-blue-600">{proximityThreshold}px</span>
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
                  <canvas 
                    ref={canvasRef} 
                    width={600} 
                    height={400}
                    className="w-full"
                  />
                </div>
                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p>🟢 Active | 🟠 Muted | 🔴 Blocked</p>
                  <p>Red lines indicate automatic proximity violations</p>
                  <p>Blue pulse indicates active voice communication</p>
                  <p>Circle around user shows safety score (green=high, yellow=medium, red=low)</p>
                </div>
              </div>

              {/* Text & Voice Testing */}
              <div style={{
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
}}>

                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="text-blue-600" />
                  Test Content Detection
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">Select User</label>
                    <select 
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(Number(e.target.value))}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
                    >
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} {user.status === 'muted' ? '(Muted)' : user.status === 'blocked' ? '(Blocked)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-2">Test Message</label>
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Try: 'You're stupid' or 'That's terrible' or 'Nice work!'"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 h-24 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleTextSubmit();
                        }
                      }}
                    />
                  </div>

                  <div style={{
                   display: "grid",
                     gridTemplateColumns: "repeat(4, 1fr)",
                     gap: 16
                     }}>

                    <button
                      onClick={handleTextSubmit}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <MessageSquare size={18} />
                      Send Text Message
                    </button>

                    <button
                      onClick={toggleVoiceRecording}
                      className={`font-semibold py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                        isRecording 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff size={18} />
                          Stop Voice Recording
                        </>
                      ) : (
                        <>
                          <Mic size={18} />
                          Test Voice Input
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-blue-900 mb-1">🤖 Automatic Moderation Active</p>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• High severity → Auto-mute or block</li>
                        <li>• Medium severity → Auto-warn or mute</li>
                        <li>• Low severity → Auto-warn</li>
                        <li>• Score &lt; 40 → Auto-mute</li>
                        <li>• Score &lt; 20 → Auto-block</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Log */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="text-blue-600" />
                Live Activity Log (Automated Moderation)
              </h2>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activity yet - Test messages or voice to see automatic moderation</p>
                ) : (
                  logs.map(log => (
                    <div 
                      key={log.id}
                      className={`p-3 rounded-lg border ${getSeverityColor(log.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="font-semibold text-xs uppercase">{log.type}</span>
                          <p className="mt-1">{log.message}</p>
                        </div>
                        <span className="text-xs opacity-75">{log.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIModeration;