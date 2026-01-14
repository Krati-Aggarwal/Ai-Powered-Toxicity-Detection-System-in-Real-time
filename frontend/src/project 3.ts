import { useEffect, useRef, useState } from "react";

export default function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);

  const [micOn, setMicOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [users, setUsers] = useState([
    { id: 1, name: "User1", x: 80, y: 100 },
    { id: 2, name: "User2", x: 200, y: 120 },
    { id: 3, name: "User3", x: 320, y: 100 },
    { id: 4, name: "User4", x: 440, y: 130 },
    { id: 5, name: "User5", x: 260, y: 50 },
  ]);

  const [violations, setViolations] = useState([]);
  const [text, setText] = useState("");

  /* ================= CAMERA ================= */
  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    videoRef.current.srcObject = stream;
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

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    setMicOn(true);
  };

  useEffect(() => {
    if (!micOn) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const loop = () => {
      analyserRef.current.getByteFrequencyData(dataArray);
      const avg =
        dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      setAudioLevel(avg);

      if (avg > 160) {
        setViolations((v) => [
          ...v,
          { type: "Voice", user: "Mic User", severity: "high" },
        ]);
      }

      requestAnimationFrame(loop);
    };

    loop();
  }, [micOn]);

  /* ================= TEXT ================= */
  const detectText = () => {
    if (!text.trim()) return;

    const score = Math.random();
    const severity =
      score > 0.7 ? "high" : score > 0.4 ? "medium" : "safe";

    setViolations((v) => [
      ...v,
      { type: "Text", user: "You", severity },
    ]);

    setText("");
  };

  /* ================= PROXIMITY ================= */
  const distance = (a, b) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const proximityColor = (d) =>
    d < 60 ? "#ef4444" : d < 120 ? "#facc15" : "#22c55e";

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 600;
    canvas.height = 220;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          x: u.x + Math.random() * 4 - 2,
          y: u.y + Math.random() * 4 - 2,
        }))
      );

      users.forEach((u, i) => {
        let minDist = Infinity;
        users.forEach((o, j) => {
          if (i !== j) minDist = Math.min(minDist, distance(u, o));
        });

        if (minDist < 60) {
          setViolations((v) => [
            ...v,
            { type: "Proximity", user: u.name, severity: "high" },
          ]);
        }

        ctx.fillStyle = proximityColor(minDist);
        ctx.beginPath();
        ctx.arc(u.x, u.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#111";
        ctx.fillText(u.name, u.x - 16, u.y + 30);
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, [users]);

  return (
    <div className="app">
      <h1>AI Moderation Dashboard</h1>

      {/* DASHBOARD */}
      <div className="dashboard">
        <div className="card green">Active Users<br />{users.length}</div>
        <div className="card red">Violations<br />{violations.length}</div>
        <div className="card yellow">Voice Alerts<br />{violations.filter(v => v.type==="Voice").length}</div>
        <div className="card blue">Proximity Alerts</div>
      </div>

      {/* CAMERA */}
      <div className="panel">
        <h2>Camera</h2>
        <button onClick={startCamera}>Start Camera</button>
        <video ref={videoRef} autoPlay className="video" />
      </div>

      {/* MICROPHONE */}
      <div className="panel">
        <h2>Microphone</h2>
        <button onClick={toggleMic}>
          {micOn ? "Stop Mic" : "Start Mic"}
        </button>
        <div className="mic-bar">
          <div
            className="mic-level"
            style={{ width: `${Math.min(audioLevel, 200)}px` }}
          />
        </div>
      </div>

      {/* TEXT */}
      <div className="panel">
        <h2>Text Detection</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button onClick={detectText}>Analyze</button>
      </div>

      {/* PROXIMITY */}
      <div className="panel">
        <h2>Proximity Detection</h2>
        <canvas ref={canvasRef} />
      </div>

      {/* LOG */}
      <div className="panel">
        <h2>Violation Log</h2>
        <ul>
          {violations.slice(-8).map((v, i) => (
            <li key={i} className={v.severity}>
              {v.user} → {v.type}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
