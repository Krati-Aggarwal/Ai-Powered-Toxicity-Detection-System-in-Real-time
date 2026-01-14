    import { useEffect, useRef, useState } from "react";

export default function App() {
  const canvasRef = useRef(null);

  const [users, setUsers] = useState([
    { id: 1, name: "User1", status: "active", score: 0.1, warnings: 0 },
    { id: 2, name: "User2", status: "warned", score: 0.35, warnings: 2 },
    { id: 3, name: "User3", status: "muted", score: 0.55, warnings: 3 },
    { id: 4, name: "User4", status: "blocked", score: 0.9, warnings: 5 },
    { id: 5, name: "User5", status: "active", score: 0.15, warnings: 0 },
  ]);

  const [logs, setLogs] = useState([]);
  const [live, setLive] = useState(false);

  /* ------------------ Canvas Visualization ------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let bubbles = users.map(u => ({
      ...u,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: Math.random() * 1.4 - 0.7,
      vy: Math.random() * 1.4 - 0.7,
      r: 14 + u.score * 28
    }));

    const color = s =>
      s === "blocked" ? "#ef4444" :
      s === "muted" ? "#94a3b8" :
      s === "warned" ? "#fb923c" :
      "#22c55e";

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bubbles.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < b.r || b.x > canvas.width - b.r) b.vx *= -1;
        if (b.y < b.r || b.y > canvas.height - b.r) b.vy *= -1;

        const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.3, b.x, b.y, b.r);
        g.addColorStop(0, color(b.status));
        g.addColorStop(1, "transparent");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#cbd5f5";
        ctx.font = "12px Inter";
        ctx.textAlign = "center";
        ctx.fillText(b.name, b.x, b.y - b.r - 6);
      });
      requestAnimationFrame(draw);
    }
    draw();
    return () => window.removeEventListener("resize", resize);
  }, [users]);

  /* ------------------ Fake Live Stream ------------------ */
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const u = users[Math.floor(Math.random() * users.length)];
      const score = Math.random();
      const status =
        score > 0.7 ? "blocked" :
        score > 0.4 ? "warned" :
        score > 0.25 ? "muted" : "active";

      setUsers(prev =>
        prev.map(x =>
          x.id === u.id
            ? { ...x, score, status, warnings: status !== "active" ? x.warnings + 1 : x.warnings }
            : x
        )
      );

      setLogs(l => [
        {
          id: Date.now(),
          msg: `${u.name} → ${status.toUpperCase()} (${score.toFixed(2)})`
        },
        ...l.slice(0, 20)
      ]);
    }, 1500);

    return () => clearInterval(id);
  }, [live, users]);

  /* ------------------ UI ------------------ */
  return (
    <>
      <style>{css}</style>

      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <h2>AI Moderation</h2>
          <button onClick={() => setLive(!live)} className="btn">
            {live ? "Stop Live Stream" : "Start Live Stream"}
          </button>
          <ul className="legend">
            <li><span className="dot green" /> Active</li>
            <li><span className="dot orange" /> Warned</li>
            <li><span className="dot gray" /> Muted</li>
            <li><span className="dot red" /> Blocked</li>
          </ul>
        </aside>

        {/* Main */}
        <main className="main">
          {/* Dashboard */}
          <div className="stats">
            <Stat title="Total Violations" value={logs.length} color="red" />
            <Stat title="Toxic Messages" value={logs.filter(l => l.msg.includes("blocked")).length} color="purple" />
            <Stat title="Voice Alerts" value="6" color="blue" />
            <Stat title="Active Users" value={users.filter(u => u.status === "active").length} color="green" />
          </div>

          {/* Content */}
          <div className="content">
            <div className="card">
              <h3>User Status Visualization</h3>
              <canvas ref={canvasRef} />
            </div>

            <div className="card">
              <h3>User Overview</h3>
              {users.map(u => (
                <div key={u.id} className={`row ${u.status}`}>
                  <span>{u.name}</span>
                  <span>{u.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div className="card log">
            <h3>Live Activity</h3>
            {logs.map(l => (
              <div key={l.id} className="log-item">{l.msg}</div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

/* ------------------ Components ------------------ */
function Stat({ title, value, color }) {
  return (
    <div className={`stat ${color}`}>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

/* ------------------ CSS ------------------ */
const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; background:#0b0f14; color:#e5e7eb; font-family: Inter, Arial; }

.app { display:flex; height:100vh; }
.sidebar {
  width:260px; background:#111827; padding:20px; border-right:1px solid #1f2937;
}
.sidebar h2 { margin-bottom:16px; }
.btn {
  width:100%; padding:10px; border-radius:10px; border:none;
  background:#2563eb; color:white; font-weight:600; cursor:pointer;
}
.legend { list-style:none; margin-top:20px; }
.legend li { display:flex; align-items:center; gap:10px; margin-bottom:8px; }

.dot { width:10px; height:10px; border-radius:50%; }
.green{background:#22c55e}
.orange{background:#fb923c}
.gray{background:#94a3b8}
.red{background:#ef4444}

.main { flex:1; display:flex; flex-direction:column; }
.stats {
  display:grid; grid-template-columns:repeat(4,1fr);
  gap:16px; padding:20px; border-bottom:1px solid #1f2937;
}
.stat {
  background:#111827; padding:16px; border-radius:14px;
}
.stat h2 { font-size:28px; }
.stat.red h2{color:#ef4444}
.stat.green h2{color:#22c55e}
.stat.blue h2{color:#60a5fa}
.stat.purple h2{color:#c084fc}

.content {
  display:grid; grid-template-columns:2fr 1fr;
  gap:20px; padding:20px;
}
.card {
  background:#111827; border-radius:16px; padding:16px;
}
.card canvas {
  width:100%; height:320px; margin-top:10px;
  background:radial-gradient(circle,#0f172a,#020617);
  border-radius:12px;
}
.row {
  display:flex; justify-content:space-between;
  padding:8px; border-bottom:1px solid #1f2937;
}
.row.active{color:#22c55e}
.row.warned{color:#fb923c}
.row.muted{color:#94a3b8}
.row.blocked{color:#ef4444}

.log {
  margin:0 20px 20px;
  max-height:160px; overflow:auto;
}
.log-item {
  font-size:13px; padding:6px 0; border-bottom:1px dashed #1f2937;
}
`;