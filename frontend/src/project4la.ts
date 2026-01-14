import { useEffect, useRef, useState } from "react";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  const usersRef = useRef([]);
  const proximityLoggedRef = useRef({});

  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [users] = useState([
    { id: 1, name: "User1", x: 80, y: 100 },
    { id: 2, name: "User2", x: 200, y: 120 },
    { id: 3, name: "User3", x: 320, y: 100 },
    { id: 4, name: "User4", x: 440, y: 130 },
    { id: 5, name: "User5", x: 260, y: 50 },
  ]);

  const [violations, setViolations] = useState([]);
  const [text, setText] = useState("");

  /* ================= INIT USERS ================= */
  useEffect(() => {
    usersRef.current = JSON.parse(JSON.stringify(users));
  }, []);

  /* ================= CAMERA ================= */
  const toggleCamera = async () => {
    if (cameraOn) {
      streamRef.current.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
      setCameraOn(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    setCameraOn(true);
  };

  /* ================= MICROPHONE ================= */
  const toggleMic = async () => {
    if (micOn) {
      audioCtxRef.current.close();
      setMicOn(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    audioCtx.createMediaStreamSource(stream).connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    setMicOn(true);
  };

  useEffect(() => {
    if (!micOn) return;

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);

    const loop = () => {
      analyserRef.current.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(avg);

      if (avg > 160) {
        setViolations(v => [
          ...v.slice(-30),
          { type: "Voice", user: "Mic", severity: "high", score: 95 }
        ]);
      }

      requestAnimationFrame(loop);
    };

    loop();
  }, [micOn]);

  /* ================= TEXT ================= */
  const detectText = () => {
    if (!text.trim()) return;

    const toxic = ["idiot", "hate", "stupid", "kill", "trash"];
    let score = 10;
    toxic.forEach(w => text.toLowerCase().includes(w) && (score += 25));

    const severity = score > 70 ? "high" : score > 40 ? "medium" : "safe";

    setViolations(v => [
      ...v.slice(-30),
      { type: "Text", user: "You", severity, score }
    ]);

    setText("");
  };

  /* ================= PROXIMITY ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 600;
    canvas.height = 220;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      usersRef.current.forEach(u => {
        u.x += Math.random() * 2 - 1;
        u.y += Math.random() * 2 - 1;
      });

      usersRef.current.forEach((u, i) => {
        let min = Infinity;
        usersRef.current.forEach((o, j) => {
          if (i !== j) {
            min = Math.min(min, Math.hypot(u.x - o.x, u.y - o.y));
          }
        });

        let severity = "safe";
        let color = "#22c55e";

        if (min < 60) { severity = "high"; color = "#ef4444"; }
        else if (min < 120) { severity = "medium"; color = "#facc15"; }

        if (severity !== proximityLoggedRef.current[u.id]) {
          proximityLoggedRef.current[u.id] = severity;
          if (severity !== "safe") {
            setViolations(v => [
              ...v.slice(-30),
              {
                type: "Proximity",
                user: u.name,
                severity,
                score: Math.round((1 - min / 120) * 100)
              }
            ]);
          }
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(u.x, u.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111";
        ctx.fillText(u.name, u.x - 15, u.y + 30);
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="app">
      <h1>AI Moderation Dashboard</h1>

      <div className="dashboard">
        <div className="card green">👥 Active Users<br />5</div>
        <div className="card red">🚨 Violations<br />{violations.length}</div>
        <div className="card yellow">🎙 Voice<br />{violations.filter(v => v.type === "Voice").length}</div>
        <div className="card purple">💬 Text<br />{violations.filter(v => v.type === "Text").length}</div>
      </div>

      <div className="panel">
        <h2>Camera</h2>
        <button onClick={toggleCamera}>{cameraOn ? "Stop" : "Start"}</button>
        <video ref={videoRef} autoPlay className="video" />
      </div>

      <div className="panel">
        <h2>Microphone</h2>
        <button onClick={toggleMic}>{micOn ? "Stop" : "Start"}</button>
        <div className="mic-bar">
          <div className="mic-level" style={{ width: `${Math.min(audioLevel, 200)}px` }} />
        </div>
      </div>

      <div className="panel">
        <h2>Text Detection</h2>
        <textarea value={text} onChange={e => setText(e.target.value)} />
        <button onClick={detectText}>Analyze</button>
      </div>

      <div className="panel">
        <h2>Proximity Detection</h2>
        <canvas ref={canvasRef} />
      </div>
      <div style={{ marginTop: "10px", fontSize: "14px" }}>
    <p><span style={{ color: "#22c55e" }}>●</span> Green – Safe Distance</p>
   <p><span style={{ color: "#facc15" }}>●</span> Yellow – Warning (Medium Risk)</p>
   <p><span style={{ color: "#ef4444" }}>●</span> Red – Danger (Too Close)</p>
    </div>
    <div className="panel">
  <h2>User-wise Violation Analytics</h2>

  <table className="analytics-table">
    <thead>
      <tr>
        <th>User</th>
        <th>Violations</th>
        <th>Toxicity Level</th>
      </tr>
    </thead>

    <tbody>
      {users.map((u) => {
        const userViolations = violations.filter(v => v.user === u.name);
        const count = userViolations.length;

        const severities = userViolations.map(v => v.severity);

        const level =
          severities.includes("high") ? "high" :
          severities.includes("medium") ? "medium" :
          severities.includes("safe") ? "safe" :
          "none";

        return (
          <tr key={u.id}>
            <td className="user-name">{u.name}</td>

            <td className="count">{count}</td>

            <td>
              <div className="toxicity-bar">
                <div
                  className={`toxicity-fill ${level}`}
                  style={{ width: `${Math.min(count * 20, 100)}%` }}
                />
              </div>
              <span className={`severity-label ${level}`}>
                {level.toUpperCase()}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>



      <div className="panel">
        <h2>Violation Log</h2>
        <ul>
          {violations.slice(-8).map((v, i) => (
            <li key={i} className={v.severity}>
              {v.user} → {v.type} ({v.severity.toUpperCase()} | {v.score}%)
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

