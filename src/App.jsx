import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://uqqztjanagmoccfpcyxa.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcXp0amFuYWdtb2NjZnBjeXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI5MzIsImV4cCI6MjA5Nzg4ODkzMn0.agQ-wupnb6gIe6WxiLmwQu2Wu4F6R5rA8Xs8HuMnNqw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Palette ───────────────────────────────────────────────────────────────────
const TEAL = "#1B3A4B", AMBER = "#C8861A", WHITE = "#FFFFFF", BG = "#F6F7F9";
const TXT = "#1A1A1A", MUTED = "#8A8A8A", OK = "#27AE60", ERR = "#E03131";
const BORDER = "#E5E7EB", INP = "#F2F4F6", SHADOW = "0 2px 10px rgba(0,0,0,0.07)";
const BLUE = "#3B7DD8", PURPLE = "#7C3AED";

const ROLE_COLOR = { supervisor: AMBER, manager: OK, viewer: BLUE };
const ROLE_LABEL = { supervisor: "Supervisor", manager: "Manager", viewer: "Viewer" };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const mkey = d => (d || today()).slice(0, 7);
const fmtTs = t => new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function genBarCode(name) {
  const prefix = name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "BAR";
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const C = {
  card: { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 15px", marginBottom: 12, boxShadow: SHADOW },
  inp: { width: "100%", background: INP, border: `1px solid ${BORDER}`, borderRadius: 10, color: TXT, padding: "11px 13px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  lbl: { fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 5, display: "block" },
  btn: (v = "primary") => ({
    width: "100%", padding: "13px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
    background: v === "primary" ? TEAL : v === "amber" ? AMBER : v === "ok" ? OK : v === "err" ? ERR : v === "ghost" ? "transparent" : v === "google" ? WHITE : INP,
    color: v === "ghost" ? MUTED : v === "google" ? TXT : WHITE,
    border: v === "ghost" ? `1px solid ${BORDER}` : v === "google" ? `1px solid ${BORDER}` : "none",
    boxShadow: v === "google" ? SHADOW : "none",
  }),
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  slbl: { fontSize: 13, color: MUTED },
  sval: c => ({ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: c || TXT }),
  sec: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  line: { flex: 1, height: 1, background: BORDER },
  div: { height: 1, background: BORDER, margin: "10px 0" },
  tag: c => ({ display: "inline-block", background: c + "18", color: c, borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "3px 9px" }),
  empty: { textAlign: "center", color: MUTED, padding: "40px 14px", fontSize: 13 },
  tw: { overflowX: "auto", borderRadius: 12, border: `1px solid ${BORDER}`, background: WHITE, marginBottom: 14, boxShadow: SHADOW },
  th: c => ({ padding: "9px 11px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: c || MUTED, background: "#F5F7F9", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", textAlign: "left" }),
  td: c => ({ padding: "10px 11px", fontSize: 13, color: c || TXT, borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap", verticalAlign: "middle" }),
};

// ── Loading ───────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: WHITE, fontFamily: "Georgia,serif" }}>
      <div style={{ fontSize: 36, fontWeight: 400, color: TXT, marginBottom: 20 }}>Barnakular</div>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("landing"); // landing | login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function handleEmail() {
    if (!email || !password) { setErr("Please fill in all fields."); return; }
    if (mode === "signup" && !name.trim()) { setErr("Please enter your name."); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name.trim() } } });
        if (error) throw error;
        if (data.user) onAuth(data.user);
        else { setMsg("Check your email to confirm your account, then log in."); setMode("login"); }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setLoading(true); setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (e) { setErr(e.message); setLoading(false); }
  }

  const wrap = { minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 36px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };

  if (mode === "landing") return (
    <div style={wrap}>
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 46, fontWeight: 400, color: TXT, letterSpacing: -1 }}>Barnakular</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Bar Management System</div>
      </div>
      <button onClick={() => setMode("signup")} style={{ ...C.btn("primary"), marginBottom: 12 }}>Create Account</button>
      <button onClick={() => setMode("login")} style={C.btn("ghost")}>Log In</button>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 400, color: TXT }}>Barnakular</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{mode === "login" ? "Welcome back" : "Create your account"}</div>
      </div>

      {msg && <div style={{ background: OK + "15", border: `1px solid ${OK}33`, borderRadius: 10, color: OK, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%", textAlign: "center" }}>{msg}</div>}
      {err && <div style={{ background: ERR + "12", border: `1px solid ${ERR}33`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%", textAlign: "center" }}>{err}</div>}

      <button onClick={handleGoogle} disabled={loading} style={{ ...C.btn("google"), marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14 }}>
        <span style={{ fontSize: 18 }}>G</span> Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: 1.5 }}>OR</span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      {mode === "signup" && (
        <div style={{ width: "100%", marginBottom: 10 }}>
          <label style={C.lbl}>Full Name</label>
          <input style={C.inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
        </div>
      )}
      <div style={{ width: "100%", marginBottom: 10 }}>
        <label style={C.lbl}>Email</label>
        <input style={C.inp} type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div style={{ width: "100%", marginBottom: 16, position: "relative" }}>
        <label style={C.lbl}>Password</label>
        <input style={{ ...C.inp, paddingRight: 44 }} type={showPass ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmail()} />
        <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 13, bottom: 11, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 16 }}>{showPass ? "🙈" : "👁"}</button>
      </div>
      <button onClick={handleEmail} disabled={loading} style={{ ...C.btn("primary"), opacity: loading ? 0.6 : 1 }}>
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
      </button>
      <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: MUTED }}>
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}
          style={{ color: TEAL, fontWeight: 600, cursor: "pointer" }}>
          {mode === "login" ? "Sign up" : "Log in"}
        </span>
      </div>
      <button onClick={() => setMode("landing")} style={{ marginTop: 12, background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>← Back</button>
    </div>
  );
}

// ── Onboarding Choice ─────────────────────────────────────────────────────────
function OnboardingChoice({ user, onDone }) {
  const [choice, setChoice] = useState(null); // null | "create" | "join"
  const [barName, setBarName] = useState("");
  const [barCode, setBarCode] = useState("");
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [requested, setRequested] = useState(false);

  async function createBar() {
    if (!barName.trim() || !displayName.trim()) { setErr("Please fill in all fields."); return; }
    setLoading(true); setErr("");
    try {
      const code = genBarCode(barName);
      const { data: bar, error: barErr } = await supabase.from("bars").insert({ name: barName.trim(), owner_id: user.id, bar_code: code }).select().single();
      if (barErr) throw barErr;
      const { error: profErr } = await supabase.from("profiles").upsert({ id: user.id, bar_id: bar.id, display_name: displayName.trim(), role: "supervisor" });
      if (profErr) throw profErr;
      onDone({ bar, role: "supervisor", displayName: displayName.trim() });
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function joinBar() {
    if (!barCode.trim() || !displayName.trim()) { setErr("Please fill in all fields."); return; }
    setLoading(true); setErr("");
    try {
      const { data: bar, error: barErr } = await supabase.from("bars").select("*").eq("bar_code", barCode.trim().toUpperCase()).single();
      if (barErr || !bar) throw new Error("Bar not found. Please check the code and try again.");
      // Check viewer slots
      const { data: viewers } = await supabase.from("profiles").select("id").eq("bar_id", bar.id).eq("role", "viewer");
      if ((viewers || []).length >= 5) throw new Error("This bar has reached its maximum viewer capacity.");
      // Check if already requested
      const { data: existing } = await supabase.from("join_requests").select("id, status").eq("bar_id", bar.id).eq("user_id", user.id).single();
      if (existing) {
        if (existing.status === "pending") throw new Error("You already have a pending request for this bar.");
        if (existing.status === "approved") throw new Error("Your request was already approved.");
      }
      const { error: reqErr } = await supabase.from("join_requests").insert({ bar_id: bar.id, user_id: user.id, display_name: displayName.trim() });
      if (reqErr) throw reqErr;
      // Save display name to profile
      await supabase.from("profiles").upsert({ id: user.id, display_name: displayName.trim() });
      setRequested(true);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const wrap = { minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };

  if (requested) return (
    <div style={wrap}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 24, color: TXT, marginBottom: 12, textAlign: "center" }}>Request Sent!</div>
      <div style={{ fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 1.6 }}>Your join request has been sent to the bar Supervisor. You'll be notified once they approve it.</div>
    </div>
  );

  if (!choice) return (
    <div style={wrap}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🍺</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 28, color: TXT, marginBottom: 8 }}>Welcome to Barnakular</div>
        <div style={{ fontSize: 13, color: MUTED }}>What would you like to do?</div>
      </div>
      <button onClick={() => setChoice("create")}
        style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px", marginBottom: 12, background: WHITE, border: `1.5px solid ${TEAL}`, borderRadius: 16, cursor: "pointer", boxShadow: SHADOW }}>
        <div style={{ fontSize: 28, width: 48, height: 48, borderRadius: 12, background: TEAL + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>🏪</div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: TXT }}>Create a Bar</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Set up your bar and become Supervisor</div>
        </div>
        <div style={{ marginLeft: "auto", color: MUTED, fontSize: 20 }}>›</div>
      </button>
      <button onClick={() => setChoice("join")}
        style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px", background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 16, cursor: "pointer", boxShadow: SHADOW }}>
        <div style={{ fontSize: 28, width: 48, height: 48, borderRadius: 12, background: BLUE + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>🔗</div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: TXT }}>Join a Bar</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Enter a bar code to request access</div>
        </div>
        <div style={{ marginLeft: "auto", color: MUTED, fontSize: 20 }}>›</div>
      </button>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 26, color: TXT }}>{choice === "create" ? "Create Your Bar" : "Join a Bar"}</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{choice === "create" ? "You will be assigned as Supervisor" : "Send a request to join"}</div>
      </div>
      {err && <div style={{ background: ERR + "12", border: `1px solid ${ERR}33`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%" }}>{err}</div>}
      <div style={{ width: "100%", marginBottom: 12 }}>
        <label style={C.lbl}>Your Display Name</label>
        <input style={C.inp} placeholder="e.g. Chukwuemeka" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </div>
      {choice === "create" ? (
        <div style={{ width: "100%", marginBottom: 24 }}>
          <label style={C.lbl}>Bar Name</label>
          <input style={C.inp} placeholder="e.g. The Gold Bar, Club Luxe" value={barName} onChange={e => setBarName(e.target.value)} onKeyDown={e => e.key === "Enter" && createBar()} />
        </div>
      ) : (
        <div style={{ width: "100%", marginBottom: 24 }}>
          <label style={C.lbl}>Bar Code</label>
          <input style={{ ...C.inp, letterSpacing: 3, textTransform: "uppercase" }} placeholder="e.g. QUA-2847" value={barCode} onChange={e => setBarCode(e.target.value)} onKeyDown={e => e.key === "Enter" && joinBar()} />
          <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>Ask the Supervisor for the bar code</div>
        </div>
      )}
      <button onClick={choice === "create" ? createBar : joinBar} disabled={loading} style={{ ...C.btn("primary"), opacity: loading ? 0.6 : 1 }}>
        {loading ? "Please wait..." : choice === "create" ? "Create My Bar →" : "Send Join Request →"}
      </button>
      <button onClick={() => { setChoice(null); setErr(""); }} style={{ marginTop: 10, background: "none", border: "none", color: MUTED, fontSize: 12, cursor: "pointer" }}>← Back</button>
    </div>
  );
}

// ── Join via Invite Link ───────────────────────────────────────────────────────
function JoinViaInvite({ user, token, onDone }) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || "");
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("invites").select("*, bars(name)").eq("token", token).eq("used", false).single();
      if (error || !data) setErr("This invite link is invalid or has already been used.");
      else setInvite(data);
      setLoading(false);
    }
    load();
  }, [token]);

  async function join() {
    if (!displayName.trim()) { setErr("Please enter your display name."); return; }
    setJoining(true); setErr("");
    try {
      await supabase.from("profiles").upsert({ id: user.id, bar_id: invite.bar_id, display_name: displayName.trim(), role: invite.role });
      await supabase.from("invites").update({ used: true }).eq("id", invite.id);
      const { data: bar } = await supabase.from("bars").select().eq("id", invite.bar_id).single();
      onDone({ bar, role: invite.role, displayName: displayName.trim() });
    } catch (e) { setErr(e.message); }
    finally { setJoining(false); }
  }

  if (loading) return <LoadingScreen />;
  return (
    <div style={{ minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 40 }}>🍺</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 26, color: TXT, marginTop: 8 }}>You've been invited</div>
        {invite && <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>Join <strong style={{ color: TXT }}>{invite.bars?.name}</strong> as <span style={C.tag(ROLE_COLOR[invite.role] || BLUE)}>{ROLE_LABEL[invite.role] || invite.role}</span></div>}
      </div>
      {err && <div style={{ background: ERR + "12", border: `1px solid ${ERR}33`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%" }}>{err}</div>}
      {invite && (
        <>
          <div style={{ width: "100%", marginBottom: 24 }}>
            <label style={C.lbl}>Your Display Name</label>
            <input style={C.inp} placeholder="e.g. Taiwo" value={displayName} onChange={e => setDisplayName(e.target.value)} onKeyDown={e => e.key === "Enter" && join()} />
          </div>
          <button onClick={join} disabled={joining} style={{ ...C.btn("primary"), opacity: joining ? 0.6 : 1 }}>
            {joining ? "Joining..." : `Join ${invite.bars?.name} →`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Shared Components ─────────────────────────────────────────────────────────
function PLCard({ label, daysLogged, totalRev, totalCOGS, totalExp }) {
  const gross = totalRev - totalCOGS, net = gross - totalExp;
  return (
    <div style={{ ...C.card, borderLeft: `4px solid ${TEAL}` }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: TEAL, marginBottom: 12 }}>{label}</div>
      {daysLogged !== undefined && <div style={C.row}><span style={C.slbl}>Days Logged</span><span style={C.sval()}>{daysLogged}</span></div>}
      <div style={C.row}><span style={C.slbl}>Revenue</span><span style={C.sval(TEAL)}>{fmt(totalRev)}</span></div>
      <div style={C.row}><span style={C.slbl}>Cost of Goods</span><span style={C.sval()}>{fmt(totalCOGS)}</span></div>
      <div style={C.row}><span style={C.slbl}>Gross Profit</span><span style={C.sval(gross >= 0 ? OK : ERR)}>{fmt(gross)}</span></div>
      <div style={C.row}><span style={C.slbl}>Expenses</span><span style={C.sval(ERR)}>{fmt(totalExp)}</span></div>
      <div style={C.div} />
      <div style={C.row}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>Net {net >= 0 ? "Profit" : "Loss"}</span>
        <span style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 800, color: net >= 0 ? OK : ERR }}>{fmt(Math.abs(net))}</span>
      </div>
      <div style={{ textAlign: "right", marginTop: 4 }}>
        <span style={C.tag(net >= 0 ? OK : ERR)}>{net >= 0 ? "▲ PROFIT" : "▼ LOSS"}</span>
      </div>
    </div>
  );
}

function SalesTable({ rows, totalRev, totalCOGS, role }) {
  const show = role !== "manager";
  const gross = totalRev - totalCOGS;
  return (
    <div style={C.tw}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: show ? 420 : 280 }}>
        <thead><tr>
          <th style={C.th()}>Drink</th>
          <th style={C.th(AMBER)}>Sold</th>
          {show && <th style={C.th(TEAL)}>Revenue</th>}
          {show && <th style={C.th(OK)}>Profit</th>}
          <th style={C.th()}>Closing</th>
        </tr></thead>
        <tbody>{rows.map(d => (
          <tr key={d.id} style={{ opacity: d.sold === 0 ? 0.45 : 1 }}>
            <td style={{ ...C.td(), fontWeight: 600 }}>{d.name}</td>
            <td style={{ ...C.td(d.sold > 0 ? AMBER : MUTED), fontFamily: "monospace", fontWeight: 700 }}>{d.sold}</td>
            {show && <td style={C.td(d.sold > 0 ? TEAL : MUTED)}>{fmt(d.rev)}</td>}
            {show && <td style={C.td(d.profit > 0 ? OK : d.profit < 0 ? ERR : MUTED)}>{fmt(d.profit)}</td>}
            <td style={{ ...C.td(), fontFamily: "monospace" }}>{d.lastClose ?? "—"}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
          <td style={{ ...C.td(), fontSize: 11, color: MUTED, fontWeight: 700 }}>Totals</td>
          <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700, color: AMBER }}>{rows.reduce((s, d) => s + d.sold, 0)}</td>
          {show && <td style={{ ...C.td(), fontWeight: 700, color: TEAL }}>{fmt(totalRev)}</td>}
          {show && <td style={{ ...C.td(), fontWeight: 800, color: gross >= 0 ? OK : ERR }}>{fmt(gross)}</td>}
          <td style={C.td()}></td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function OpsTable({ rows }) {
  return (
    <div style={C.tw}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 260 }}>
        <thead><tr>
          <th style={C.th()}>Drink</th>
          <th style={C.th(AMBER)}>Units Sold</th>
          <th style={C.th()}>Closing Stock</th>
        </tr></thead>
        <tbody>{rows.map(d => (
          <tr key={d.id} style={{ opacity: d.sold === 0 ? 0.45 : 1 }}>
            <td style={{ ...C.td(), fontWeight: 600 }}>{d.name}</td>
            <td style={{ ...C.td(d.sold > 0 ? AMBER : MUTED), fontFamily: "monospace", fontWeight: 700 }}>{d.sold}</td>
            <td style={{ ...C.td(), fontFamily: "monospace" }}>{d.lastClose ?? "—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function calcSales(drinks, logs) {
  let totalRev = 0, totalCOGS = 0;
  const rows = drinks.map(d => {
    let sold = 0, lastClose = null;
    [...logs].sort((a, b) => b.log_date?.localeCompare(a.log_date)).forEach(l => {
      const o = l.opening_qty, c = l.closing_qty;
      if (l.drink_id === d.id && l.log_type === "closing" && c !== undefined && c !== null) { lastClose = lastClose ?? c; }
    });
    const dayLogs = {};
    logs.forEach(l => { if (l.drink_id === d.id) { if (!dayLogs[l.log_date]) dayLogs[l.log_date] = {}; dayLogs[l.log_date][l.log_type] = l; } });
    Object.values(dayLogs).forEach(day => { if (day.opening && day.closing) sold += Math.max(0, day.opening.opening_qty - day.closing.closing_qty); });
    const rev = sold * d.sell_price, cogs = sold * d.buy_price;
    totalRev += rev; totalCOGS += cogs;
    return { ...d, sold, rev, cogs, profit: rev - cogs, lastClose };
  });
  return { rows, totalRev, totalCOGS };
}

// ── Stock Tab ─────────────────────────────────────────────────────────────────
function StockTab({ barId, role, userId, displayName }) {
  const [drinks, setDrinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState({ name: "", buy_price: "", quantity: "", min_quantity: "" });
  const [priceId, setPriceId] = useState(null);
  const [priceData, setPriceData] = useState({});
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [err, setErr] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const canEdit = role === "manager";
  const canPrice = role === "supervisor";
  const isReadOnly = role === "viewer";
  const showMoney = role !== "manager";

  async function loadDrinks() {
    const { data } = await supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false).order("name");
    setDrinks(data || []); setLoading(false);
  }

  useEffect(() => {
    loadDrinks();
    const sub = supabase.channel("drinks-" + barId).on("postgres_changes", { event: "*", schema: "public", table: "drinks", filter: `bar_id=eq.${barId}` }, loadDrinks).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  async function addDrink() {
    if (!newRow.name.trim()) { setErr("Drink name required."); return; }
    await supabase.from("drinks").insert({ bar_id: barId, name: newRow.name.trim(), buy_price: parseFloat(newRow.buy_price) || 0, quantity: parseInt(newRow.quantity) || 0, min_quantity: parseInt(newRow.min_quantity) || 3, price_pending: true });
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Added drink", detail: newRow.name.trim() });
    setNewRow({ name: "", buy_price: "", quantity: "", min_quantity: "" }); setErr("");
  }

  async function savePrice(id) {
    const s = parseFloat(priceData.sell_price);
    const d = drinks.find(x => x.id === id);
    if (isNaN(s) || s <= d.buy_price) { setErr("Sell price must exceed buy price."); return; }
    await supabase.from("drinks").update({ sell_price: s, price_pending: false }).eq("id", id);
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: `Set sell price of ${d.name}`, detail: fmt(s) });
    setPriceId(null); setErr("");
  }

  async function doRestock() {
    const q = parseInt(restockQty);
    if (isNaN(q) || q <= 0) { alert("Enter a valid quantity."); return; }
    const d = drinks.find(x => x.id === restockId);
    await supabase.from("restocks").insert({ bar_id: barId, drink_id: restockId, quantity: q, restock_date: today() });
    await supabase.from("drinks").update({ quantity: d.quantity + q }).eq("id", restockId);
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: `Restocked ${d.name}`, detail: `+${q} units` });
    setRestockId(null); setRestockQty("");
  }

  async function archiveDrink(id) {
    const d = drinks.find(x => x.id === id);
    await supabase.from("drinks").update({ archived: true }).eq("id", id);
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Archived drink", detail: d.name });
  }

  const pending = drinks.filter(d => d.price_pending);
  const lowItems = drinks.filter(d => d.quantity <= d.min_quantity);
  const dayName = now.toLocaleDateString("en-NG", { weekday: "long" });
  const fullDate = now.toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  if (loading) return <div style={C.empty}>Loading stock...</div>;

  return (
    <div>
      <div style={{ background: TEAL, borderRadius: 16, padding: "14px 18px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 14px rgba(27,58,75,0.22)" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: WHITE }}>{dayName}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{fullDate}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: WHITE }}>{timeStr}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: 2, marginTop: 2 }}>LIVE</div>
        </div>
      </div>

      {isReadOnly && (
        <div style={{ background: BLUE + "12", border: `1px solid ${BLUE}33`, borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: BLUE, fontWeight: 500 }}>
          👁 You are viewing this bar as a Viewer. You cannot make any changes.
        </div>
      )}

      {lowItems.length > 0 && (
        <div style={{ background: "#FFF5F5", border: `1px solid ${ERR}33`, borderRadius: 14, padding: "13px 15px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: ERR, fontSize: 13, marginBottom: 8 }}>⚠ Low Stock Alert</div>
          {lowItems.map(d => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
              <span>{d.name}</span>
              <span style={{ color: ERR, fontWeight: 700 }}>{d.quantity} left (min {d.min_quantity})</span>
            </div>
          ))}
        </div>
      )}

      {canPrice && pending.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: ERR, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            ⚠ {pending.length} drink{pending.length !== 1 ? "s" : ""} awaiting sell price
          </div>
          {pending.map(d => (
            <div key={d.id}>
              {priceId === d.id ? (
                <div style={{ ...C.card, border: `1.5px solid ${AMBER}`, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 13 }}>Buy price: {fmt(d.buy_price)}</div>
                  <label style={C.lbl}>Sell Price (₦)</label>
                  <input style={{ ...C.inp, marginBottom: 13 }} type="number" placeholder="0.00" value={priceData.sell_price ?? ""} onChange={e => setPriceData(p => ({ ...p, sell_price: e.target.value }))} autoFocus />
                  {err && <div style={{ color: ERR, fontSize: 12, marginBottom: 10 }}>{err}</div>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => savePrice(d.id)} style={{ ...C.btn("primary"), flex: 1 }}>✓ Save Price</button>
                    <button onClick={() => { setPriceId(null); setErr(""); }} style={{ ...C.btn("ghost"), flex: 1 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setPriceId(d.id); setPriceData({}); setErr(""); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", marginBottom: 8, background: WHITE, border: `1.5px solid ${AMBER}55`, borderRadius: 14, cursor: "pointer", boxShadow: SHADOW }}>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: TXT }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Buy: {fmt(d.buy_price)} · Tap to set sell price</div>
                  </div>
                  <div style={{ background: AMBER, color: WHITE, borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13 }}>₦ Set Price</div>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && pending.length > 0 && (
        <div style={{ background: "#FFFBF0", border: `1px solid ${AMBER}33`, borderRadius: 12, padding: "11px 14px", marginBottom: 13, fontSize: 13, color: AMBER, fontWeight: 500 }}>
          ⏳ {pending.length} drink{pending.length !== 1 ? "s" : ""} awaiting sell price from Supervisor.
        </div>
      )}

      {err && !priceId && <div style={{ background: "#FFF5F5", border: `1px solid ${ERR}44`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 12 }}>{err}</div>}

      <div style={C.sec}>Stock Register <div style={C.line} /></div>

      <div style={C.tw}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
          <thead><tr>
            <th style={C.th()}>Drink Name</th>
            <th style={C.th()}>Qty</th>
            <th style={C.th()}>Min</th>
            <th style={C.th()}>Buy ₦</th>
            <th style={C.th(TEAL)}>Sell ₦</th>
            <th style={C.th()}>Stock Value</th>
            <th style={C.th(TEAL)}>Sell Value</th>
            {!isReadOnly && <th style={C.th()}></th>}
          </tr></thead>
          <tbody>
            {drinks.length === 0 && (
              <tr><td colSpan={8} style={{ ...C.td(), textAlign: "center", color: MUTED, padding: "24px 0" }}>No drinks yet{canEdit ? " — add below ↓" : "."}</td></tr>
            )}
            {drinks.map(d => {
              const isLow = d.quantity <= d.min_quantity;
              return (
                <tr key={d.id} style={{ background: d.price_pending ? AMBER + "07" : isLow ? ERR + "06" : "transparent" }}>
                  <td style={{ ...C.td(), fontWeight: 600 }}>
                    {d.name}
                    {isLow && <span style={{ marginLeft: 5, fontSize: 9, color: ERR }}>●</span>}
                    {d.price_pending && <span style={{ marginLeft: 7, fontSize: 10, background: AMBER + "20", color: AMBER, borderRadius: 10, padding: "2px 7px", fontWeight: 700 }}>Pending</span>}
                  </td>
                  <td style={{ ...C.td(isLow ? ERR : TXT), fontFamily: "monospace", fontWeight: 700 }}>{d.quantity}</td>
                  <td style={{ ...C.td(), color: MUTED }}>{d.min_quantity}</td>
                  <td style={C.td()}>{fmt(d.buy_price)}</td>
                  <td style={{ ...C.td(), color: TEAL, fontWeight: 600 }}>{d.price_pending ? <span style={{ color: AMBER }}>—</span> : fmt(d.sell_price)}</td>
                  <td style={C.td()}>{d.price_pending ? "—" : fmt(d.quantity * d.buy_price)}</td>
                  <td style={{ ...C.td(), color: TEAL }}>{d.price_pending ? "—" : fmt(d.quantity * d.sell_price)}</td>
                  {!isReadOnly && (
                    <td style={{ ...C.td(), whiteSpace: "nowrap" }}>
                      {canEdit && <button onClick={() => setRestockId(d.id)} style={{ background: OK + "18", color: OK, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 3 }}>+</button>}
                      {canPrice && !d.price_pending && <button onClick={() => { setPriceId(d.id === priceId ? null : d.id); setPriceData({ sell_price: d.sell_price }); }} style={{ background: AMBER + "18", color: AMBER, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 3 }}>₦</button>}
                      {role === "supervisor" && <button onClick={() => archiveDrink(d.id)} style={{ background: ERR + "18", color: ERR, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Archive</button>}
                    </td>
                  )}
                </tr>
              );
            })}
            {canEdit && (
              <tr style={{ background: "#F5F7F9" }}>
                <td style={{ padding: "8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12 }} placeholder="Drink name" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && addDrink()} /></td>
                <td style={{ padding: "8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 70 }} type="number" placeholder="Qty" value={newRow.quantity} onChange={e => setNewRow(p => ({ ...p, quantity: e.target.value }))} /></td>
                <td style={{ padding: "8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 54 }} type="number" placeholder="Min" value={newRow.min_quantity} onChange={e => setNewRow(p => ({ ...p, min_quantity: e.target.value }))} /></td>
                <td style={{ padding: "8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 90 }} type="number" placeholder="Buy ₦" value={newRow.buy_price} onChange={e => setNewRow(p => ({ ...p, buy_price: e.target.value }))} /></td>
                <td style={{ padding: "8px", color: MUTED, fontSize: 11 }}>Supervisor sets</td>
                <td colSpan={2} style={C.td()}></td>
                <td style={{ padding: "8px" }}><button onClick={addDrink} style={{ background: TEAL, color: WHITE, border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Add</button></td>
              </tr>
            )}
          </tbody>
          {drinks.length > 0 && (
            <tfoot><tr style={{ background: BG, borderTop: `1px solid ${BORDER}` }}>
              <td style={{ ...C.td(), fontWeight: 700, fontSize: 11, color: MUTED }}>{drinks.length} drinks</td>
              <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700 }}>{drinks.reduce((s, d) => s + d.quantity, 0)}</td>
              <td colSpan={3} style={C.td()}></td>
              <td style={{ ...C.td(), fontWeight: 700 }}>{fmt(drinks.reduce((s, d) => s + d.quantity * d.buy_price, 0))}</td>
              <td style={{ ...C.td(), fontWeight: 700, color: TEAL }}>{fmt(drinks.reduce((s, d) => s + d.quantity * d.sell_price, 0))}</td>
              {!isReadOnly && <td style={C.td()}></td>}
            </tr></tfoot>
          )}
        </table>
      </div>

      {restockId && (() => {
        const d = drinks.find(x => x.id === restockId);
        return (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: WHITE, borderRadius: 20, padding: 22, width: "100%", maxWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Restock — {d?.name}</div>
              <label style={C.lbl}>Units to Add</label>
              <input style={{ ...C.inp, marginBottom: 16 }} type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="e.g. 12" autoFocus />
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...C.btn("primary"), flex: 1 }} onClick={doRestock}>Confirm</button>
                <button style={{ ...C.btn("ghost"), flex: 1 }} onClick={() => { setRestockId(null); setRestockQty(""); }}>Cancel</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Daily Log Tab ─────────────────────────────────────────────────────────────
function DailyLogTab({ barId, role, userId, displayName }) {
  const [drinks, setDrinks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [date, setDate] = useState(today());
  const [recorderName, setRecorderName] = useState(displayName);
  const [closeEnt, setCloseEnt] = useState({});
  const [cash, setCash] = useState("");
  const [showCash, setShowCash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDate, setExpandedDate] = useState(null);

  const canLog = role === "manager";
  const isLocked = date < today() && role === "manager";

  useEffect(() => {
    async function load() {
      const [{ data: drinksData }, { data: logsData }] = await Promise.all([
        supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false).order("name"),
        supabase.from("stock_logs").select("*").eq("bar_id", barId).order("log_date", { ascending: false })
      ]);
      setDrinks(drinksData || []); setLogs(logsData || []); setLoading(false);
    }
    load();
    const sub = supabase.channel("logs-" + barId).on("postgres_changes", { event: "*", schema: "public", table: "stock_logs", filter: `bar_id=eq.${barId}` }, load).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  function getOpening(drinkId) {
    const prev = logs.filter(l => l.drink_id === drinkId && l.log_type === "closing" && l.log_date < date).sort((a, b) => b.log_date.localeCompare(a.log_date))[0];
    return prev ? prev.closing_qty : null;
  }

  function getClosing(drinkId) {
    return logs.find(l => l.drink_id === drinkId && l.log_type === "closing" && l.log_date === date)?.closing_qty ?? null;
  }

  async function saveClosing() {
    const hasAny = drinks.some(d => closeEnt[d.id] !== undefined && closeEnt[d.id] !== "");
    if (!hasAny) { alert("Enter at least one closing quantity."); return; }
    setSaving(true);
    try {
      for (const d of drinks) {
        const val = closeEnt[d.id];
        if (val === undefined || val === "") continue;
        const opening = getOpening(d.id) ?? 0;
        const existingOpen = logs.find(l => l.drink_id === d.id && l.log_type === "opening" && l.log_date === date);
        if (!existingOpen) await supabase.from("stock_logs").insert({ bar_id: barId, drink_id: d.id, log_date: date, opening_qty: opening, log_type: "opening", recorded_by: recorderName });
        const existingClose = logs.find(l => l.drink_id === d.id && l.log_type === "closing" && l.log_date === date);
        if (existingClose) await supabase.from("stock_logs").update({ closing_qty: parseFloat(val), recorded_by: recorderName }).eq("id", existingClose.id);
        else await supabase.from("stock_logs").insert({ bar_id: barId, drink_id: d.id, log_date: date, closing_qty: parseFloat(val), log_type: "closing", recorded_by: recorderName });
      }
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Saved closing stock", detail: `for ${date}` });
      setCloseEnt({}); setShowCash(true);
    } finally { setSaving(false); }
  }

  async function saveCash() {
    const amount = parseFloat(cash);
    if (isNaN(amount) || amount < 0) { alert("Enter a valid cash amount."); return; }
    await supabase.from("cash_records").upsert({ bar_id: barId, record_date: date, amount, recorded_by: recorderName });
    setCash(""); setShowCash(false); alert("Cash recorded successfully!");
  }

  if (loading) return <div style={C.empty}>Loading logs...</div>;
  const pastDates = [...new Set(logs.map(l => l.log_date))].filter(d => d !== today()).sort().reverse();

  return (
    <div>
      <div style={C.sec}>Daily Stock Log <div style={C.line} /></div>
      <div style={{ ...C.card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={C.lbl}>Date</label>
          <input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} />
        </div>
        {canLog && (
          <div style={{ flex: 1 }}>
            <label style={C.lbl}>Stock Taken By</label>
            <input style={C.inp} value={recorderName} onChange={e => setRecorderName(e.target.value)} placeholder="Name" />
          </div>
        )}
      </div>
      {isLocked && <div style={{ background: "#FFF5F5", border: `1px solid ${ERR}33`, borderRadius: 12, padding: "11px 14px", marginBottom: 13, fontSize: 13, color: ERR }}>🔒 Past records are locked.</div>}
      {drinks.length === 0 ? <div style={C.empty}>No drinks in stock register.</div> : (
        <>
          <div style={C.tw}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
              <thead><tr>
                <th style={C.th()}>Drink</th>
                <th style={C.th(OK)}>Opening</th>
                <th style={C.th(TEAL)}>Closing</th>
                <th style={C.th()}>Sold</th>
              </tr></thead>
              <tbody>{drinks.map(d => {
                const opening = getOpening(d.id);
                const closing = getClosing(d.id);
                const sold = opening !== null && closing !== null ? Math.max(0, opening - closing) : null;
                return (
                  <tr key={d.id}>
                    <td style={{ ...C.td(), fontWeight: 600 }}>{d.name}</td>
                    <td style={{ ...C.td(), fontFamily: "monospace", color: OK, fontWeight: 600 }}>
                      {opening !== null ? opening : <span style={{ color: MUTED }}>—</span>}
                    </td>
                    <td style={C.td(TEAL)}>
                      {canLog && !isLocked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <input style={{ ...C.inp, padding: "5px 7px", fontSize: 12, width: 64, textAlign: "center" }}
                            type="number" placeholder={closing !== null ? String(closing) : "—"}
                            value={closeEnt[d.id] ?? ""} onChange={e => setCloseEnt(p => ({ ...p, [d.id]: e.target.value }))} />
                          {closing !== null && <span style={{ fontSize: 10, color: TEAL }}>✓{closing}</span>}
                        </div>
                      ) : <span style={{ fontFamily: "monospace" }}>{closing ?? "—"}</span>}
                    </td>
                    <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700 }}>{sold !== null ? sold : "—"}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
          {canLog && !isLocked && (
            <button onClick={saveClosing} disabled={saving} style={{ ...C.btn("primary"), marginBottom: 14, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Closing Stock"}
            </button>
          )}
          {showCash && (
            <div style={{ ...C.card, border: `1.5px solid ${OK}`, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: OK, marginBottom: 12 }}>💰 Record Cash Collected</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>How much cash was collected today ({date})?</div>
              <label style={C.lbl}>Cash Amount (₦)</label>
              <input style={{ ...C.inp, marginBottom: 13 }} type="number" placeholder="0.00" value={cash} onChange={e => setCash(e.target.value)} autoFocus />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveCash} style={{ ...C.btn("ok"), flex: 1 }}>Save Cash</button>
                <button onClick={() => setShowCash(false)} style={{ ...C.btn("ghost"), flex: 1 }}>Skip</button>
              </div>
            </div>
          )}
        </>
      )}
      <div style={C.sec}>Past Records <div style={C.line} /></div>
      {pastDates.length === 0 ? <div style={C.empty}>No past records yet.</div> : pastDates.map(d => {
        const dayLogs = logs.filter(l => l.log_date === d);
        const closingLogs = dayLogs.filter(l => l.log_type === "closing");
        const recorder = closingLogs[0]?.recorded_by;
        return (
          <div key={d} style={C.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: TEAL }}>{fmtDate(d)}</div>
                {recorder && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Recorded by {recorder}</div>}
              </div>
              <span style={C.tag(closingLogs.length > 0 ? OK : MUTED)}>{closingLogs.length > 0 ? "✓ Complete" : "Incomplete"}</span>
            </div>
            <button onClick={() => setExpandedDate(expandedDate === d ? null : d)}
              style={{ marginTop: 10, width: "100%", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 11, padding: "6px", cursor: "pointer" }}>
              {expandedDate === d ? "▲ Hide" : "▼ View Breakdown"}
            </button>
            {expandedDate === d && (
              <div style={{ ...C.tw, marginTop: 10, marginBottom: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 260 }}>
                  <thead><tr>
                    <th style={C.th()}>Drink</th>
                    <th style={C.th(OK)}>Opening</th>
                    <th style={C.th(TEAL)}>Closing</th>
                    <th style={C.th()}>Sold</th>
                  </tr></thead>
                  <tbody>{drinks.map(drink => {
                    const o = dayLogs.find(l => l.drink_id === drink.id && l.log_type === "opening")?.opening_qty;
                    const c = dayLogs.find(l => l.drink_id === drink.id && l.log_type === "closing")?.closing_qty;
                    const sold = o !== undefined && c !== undefined ? Math.max(0, o - c) : null;
                    return (
                      <tr key={drink.id}>
                        <td style={{ ...C.td(), fontWeight: 600 }}>{drink.name}</td>
                        <td style={C.td(OK)}>{o ?? "—"}</td>
                        <td style={C.td(TEAL)}>{c ?? "—"}</td>
                        <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700 }}>{sold ?? "—"}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Expenses Tab ──────────────────────────────────────────────────────────────
const EXPENSE_CATS = ["Utilities", "Staff", "Supplies", "Maintenance"];

function ExpensesTab({ barId, role, userId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("Utilities");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");

  const canAdd = role === "manager";

  async function load() {
    const { data } = await supabase.from("expenses").select("*").eq("bar_id", barId).order("expense_date", { ascending: false });
    setExpenses(data || []); setLoading(false);
  }

  useEffect(() => {
    load();
    const sub = supabase.channel("expenses-" + barId).on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `bar_id=eq.${barId}` }, load).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  async function add() {
    if (!desc.trim() || !amount) { setErr("Fill in all fields."); return; }
    await supabase.from("expenses").insert({ bar_id: barId, category, description: desc.trim(), amount: parseFloat(amount), expense_date: date, created_by: userId });
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Added expense", detail: `${category}: ${desc}` });
    setDesc(""); setAmount(""); setErr("");
  }

  if (loading) return <div style={C.empty}>Loading expenses...</div>;
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div style={C.sec}>Expenses <div style={C.line} /></div>
      {role === "supervisor" && <div style={{ background: "#FFFBF0", border: `1px solid ${AMBER}33`, borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: AMBER, fontWeight: 500 }}>👁 Viewing all expense records. Only Managers can add expenses.</div>}
      {role === "viewer" && <div style={{ background: BLUE + "12", border: `1px solid ${BLUE}33`, borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: BLUE, fontWeight: 500 }}>👁 You are viewing expense records as a Viewer.</div>}
      {canAdd && (
        <div style={C.card}>
          <div style={{ marginBottom: 11 }}><label style={C.lbl}>Date</label><input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div style={{ marginBottom: 11 }}>
            <label style={C.lbl}>Category</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {EXPENSE_CATS.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${category === cat ? TEAL : BORDER}`, background: category === cat ? TEAL : WHITE, color: category === cat ? WHITE : MUTED, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 11 }}><label style={C.lbl}>Description</label><input style={C.inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Generator fuel" /></div>
          <div style={{ marginBottom: 11 }}><label style={C.lbl}>Amount (₦)</label><input style={C.inp} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
          {err && <div style={{ color: ERR, fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <button style={C.btn("primary")} onClick={add}>+ Add Expense</button>
        </div>
      )}
      {expenses.length === 0 ? <div style={C.empty}>No expenses recorded yet.</div> : (
        <>
          {expenses.map(e => (
            <div key={e.id} style={C.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><div style={{ fontWeight: 600 }}>{e.description}</div><div style={{ display: "flex", gap: 6, marginTop: 4 }}><span style={C.tag(TEAL)}>{e.category}</span><span style={{ fontSize: 11, color: MUTED }}>{e.expense_date}</span></div></div>
                <div style={{ fontFamily: "monospace", fontWeight: 700, color: ERR, fontSize: 14 }}>{fmt(e.amount)}</div>
              </div>
            </div>
          ))}
          <div style={{ ...C.card, borderLeft: `4px solid ${ERR}` }}>
            <div style={C.row}><span style={{ fontWeight: 700 }}>Total Expenses</span><span style={C.sval(ERR)}>{fmt(total)}</span></div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Report Tab ────────────────────────────────────────────────────────────────
function ReportTab({ barId, role }) {
  const [view, setView] = useState("daily");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const [{ data: drinks }, { data: logs }, { data: expenses }, { data: restocks }, { data: cash }] = await Promise.all([
        supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false),
        supabase.from("stock_logs").select("*").eq("bar_id", barId),
        supabase.from("expenses").select("*").eq("bar_id", barId),
        supabase.from("restocks").select("*, drinks(name, buy_price)").eq("bar_id", barId),
        supabase.from("cash_records").select("*").eq("bar_id", barId),
      ]);
      const key = view === "daily" ? date : month;
      const filterLogs = view === "daily" ? (logs || []).filter(l => l.log_date === key) : (logs || []).filter(l => l.log_date?.startsWith(key));
      const filterExp = view === "daily" ? (expenses || []).filter(e => e.expense_date === key) : (expenses || []).filter(e => e.expense_date?.startsWith(key));
      const filterRestocks = view === "daily" ? (restocks || []).filter(r => r.restock_date === key) : (restocks || []).filter(r => r.restock_date?.startsWith(key));
      const filterCash = view === "daily" ? (cash || []).find(c => c.record_date === key) : (cash || []).filter(c => c.record_date?.startsWith(key));

      const drinkStats = (drinks || []).map(d => {
        const dayLogs = {};
        filterLogs.filter(l => l.drink_id === d.id).forEach(l => { if (!dayLogs[l.log_date]) dayLogs[l.log_date] = {}; dayLogs[l.log_date][l.log_type] = l; });
        let sold = 0, lastClose = null;
        Object.values(dayLogs).forEach(day => {
          if (day.opening && day.closing) { sold += Math.max(0, day.opening.opening_qty - day.closing.closing_qty); }
          if (day.closing && lastClose === null) lastClose = day.closing.closing_qty;
        });
        return { ...d, sold, rev: sold * d.sell_price, cogs: sold * d.buy_price, profit: sold * (d.sell_price - d.buy_price), lastClose };
      });

      const totalRev = drinkStats.reduce((s, d) => s + d.rev, 0);
      const totalCOGS = drinkStats.reduce((s, d) => s + d.cogs, 0);
      const totalExp = filterExp.reduce((s, e) => s + Number(e.amount), 0);
      const restockVal = filterRestocks.reduce((s, r) => s + r.quantity * (r.drinks?.buy_price || 0), 0);
      const totalCash = view === "monthly" ? (filterCash || []).reduce((s, c) => s + Number(c.amount), 0) : filterCash?.amount || 0;
      const daysLogged = view === "monthly" ? [...new Set(filterLogs.map(l => l.log_date))].length : undefined;
      const byCategory = EXPENSE_CATS.reduce((acc, cat) => { acc[cat] = filterExp.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0); return acc; }, {});

      setData({ drinkStats, totalRev, totalCOGS, totalExp, restockVal, totalCash, daysLogged, byCategory, filterExp, filterRestocks, dayCash: view === "daily" ? filterCash : null });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadReport(); }, [view, date, month, barId]);

  const seg = v => ({ flex: 1, padding: "11px", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: view === v ? TEAL : INP, color: view === v ? WHITE : MUTED, borderRadius: 10 });
  const isManager = role === "manager";

  return (
    <div>
      <div style={{ display: "flex", gap: 6, background: INP, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button style={seg("daily")} onClick={() => setView("daily")}>📅 Daily</button>
        <button style={seg("monthly")} onClick={() => setView("monthly")}>📊 Monthly</button>
      </div>

      {view === "daily" ? (
        <div style={C.card}>
          <label style={C.lbl}>Select Day</label>
          <input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} />
        </div>
      ) : (
        <div style={C.card}>
          <label style={C.lbl}>Select Month</label>
          <input style={C.inp} type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      )}

      {loading && <div style={C.empty}>Loading report...</div>}

      {!loading && data && (
        <>
          {!isManager && (
            <>
              <PLCard
                label={view === "daily" ? `Day Summary — ${fmtDate(date)}` : new Date(month + "-01").toLocaleString("en-NG", { month: "long", year: "numeric" })}
                daysLogged={data.daysLogged}
                totalRev={data.totalRev} totalCOGS={data.totalCOGS} totalExp={data.totalExp}
              />
              {data.dayCash && (
                <div style={{ ...C.card, borderLeft: `4px solid ${OK}` }}>
                  <div style={C.row}><span style={{ fontWeight: 700 }}>Cash Collected</span><span style={C.sval(OK)}>{fmt(data.dayCash.amount)}</span></div>
                </div>
              )}
              {view === "monthly" && (
                <div style={{ ...C.card, borderLeft: `4px solid ${OK}` }}>
                  <div style={C.row}><span style={{ fontWeight: 700 }}>Total Cash Collected</span><span style={C.sval(OK)}>{fmt(data.totalCash)}</span></div>
                </div>
              )}
            </>
          )}

          {isManager ? (
            <>
              <div style={{ ...C.card, borderLeft: `4px solid ${AMBER}` }}>
                <div style={{ fontWeight: 700, color: AMBER, marginBottom: 10 }}>Operational Summary</div>
                <div style={C.row}><span style={C.slbl}>Units Sold</span><span style={C.sval(AMBER)}>{data.drinkStats.reduce((s, d) => s + d.sold, 0)}</span></div>
                <div style={C.row}><span style={C.slbl}>Drinks with Sales</span><span style={C.sval(OK)}>{data.drinkStats.filter(d => d.sold > 0).length}</span></div>
                <div style={C.row}><span style={C.slbl}>Expenses Logged</span><span style={C.sval()}>{data.filterExp.length}</span></div>
              </div>
              <div style={C.sec}>Units Breakdown <div style={C.line} /></div>
              <OpsTable rows={data.drinkStats} />
            </>
          ) : (
            <>
              <div style={C.sec}>Sales Breakdown <div style={C.line} /></div>
              <SalesTable rows={data.drinkStats} totalRev={data.totalRev} totalCOGS={data.totalCOGS} role={role} />
            </>
          )}

          {view === "monthly" && !isManager && (
            <>
              <div style={C.sec}>Expenses by Category <div style={C.line} /></div>
              <div style={C.card}>
                {EXPENSE_CATS.map(cat => {
                  const amt = data.byCategory[cat] || 0;
                  const max = Math.max(...Object.values(data.byCategory), 1);
                  const isTop = amt === max && amt > 0;
                  return (

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{isTop ? "🔴 " : ""}{cat}</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: amt > 0 ? ERR : MUTED }}>{fmt(amt)}</span>
                      </div>
                      <div style={{ height: 6, background: BORDER, borderRadius: 3 }}>
                        <div style={{ height: "100%", background: ERR, borderRadius: 3, width: `${(amt / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {data.filterRestocks.length > 0 && (
            <>
              <div style={C.sec}>Restock Report <div style={C.line} /></div>
              <div style={C.tw}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
                  <thead><tr>
                    <th style={C.th()}>Drink</th>
                    {view === "monthly" && <th style={C.th()}>Date</th>}
                    <th style={C.th()}>Units Added</th>
                    <th style={C.th()}>Value</th>
                  </tr></thead>
                  <tbody>{data.filterRestocks.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...C.td(), fontWeight: 600 }}>{r.drinks?.name}</td>
                      {view === "monthly" && <td style={{ ...C.td(), color: MUTED }}>{r.restock_date}</td>}
                      <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700 }}>{r.quantity}</td>
                      <td style={C.td()}>{fmt(r.quantity * (r.drinks?.buy_price || 0))}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{ background: BG }}>
                    <td colSpan={view === "monthly" ? 3 : 2} style={{ ...C.td(), fontWeight: 700 }}>Total Restock Value</td>
                    <td style={{ ...C.td(), fontWeight: 700 }}>{fmt(data.restockVal)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </>
          )}

          {data.filterExp.length > 0 && !isManager && (
            <>
              <div style={C.sec}>Expenses <div style={C.line} /></div>
              {data.filterExp.map(e => (
                <div key={e.id} style={C.card}>
                  <div style={C.row}>
                    <div><div style={{ fontWeight: 600 }}>{e.description}</div><span style={C.tag(TEAL)}>{e.category}</span></div>
                    <span style={C.sval(ERR)}>{fmt(e.amount)}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ barId, userId, role, displayName, barName, barCode, onUpdate, onLogout }) {
  const [newName, setNewName] = useState(displayName);
  const [newBarName, setNewBarName] = useState(barName);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [inviteLink, setInviteLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [promotionWindow, setPromotionWindow] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  async function loadData() {
    const [{ data: profs }, { data: reqs }, { data: promos }] = await Promise.all([
      supabase.from("profiles").select("*").eq("bar_id", barId),
      role === "supervisor" ? supabase.from("join_requests").select("*").eq("bar_id", barId).eq("status", "pending") : Promise.resolve({ data: [] }),
      supabase.from("promotion_windows").select("*").eq("bar_id", barId).eq("cancelled", false).gte("expires_at", new Date().toISOString()),
    ]);
    setMembers(profs || []);
    setRequests(reqs || []);
    const myPromo = (promos || []).find(p => p.old_supervisor_id === userId);
    setPromotionWindow(myPromo || null);
  }

  useEffect(() => {
    loadData();
    const sub = supabase.channel("settings-" + barId)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `bar_id=eq.${barId}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "join_requests", filter: `bar_id=eq.${barId}` }, loadData)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  useEffect(() => {
    if (!promotionWindow) return;
    const interval = setInterval(() => {
      const diff = new Date(promotionWindow.expires_at) - new Date();
      if (diff <= 0) { setPromotionWindow(null); clearInterval(interval); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h + "h " + m + "m " + s + "s");
    }, 1000);
    return () => clearInterval(interval);
  }, [promotionWindow]);

  async function saveProfile() {
    await supabase.from("profiles").update({ display_name: newName.trim() }).eq("id", userId);
    if (role === "supervisor" && newBarName.trim() !== barName) {
      await supabase.from("bars").update({ name: newBarName.trim() }).eq("id", barId);
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    onUpdate({ displayName: newName.trim(), barName: newBarName.trim() });
  }

  async function approveRequest(req) {
    const viewers = members.filter(m => m.role === "viewer");
    if (viewers.length >= 5) { alert("Maximum 5 viewers already reached."); return; }
    await supabase.from("profiles").upsert({ id: req.user_id, bar_id: barId, display_name: req.display_name, role: "viewer" });
    await supabase.from("join_requests").update({ status: "approved" }).eq("id", req.id);
    loadData();
  }

  async function rejectRequest(req) {
    await supabase.from("join_requests").update({ status: "rejected" }).eq("id", req.id);
    loadData();
  }

  async function removeViewer(memberId) {
    if (!window.confirm("Remove this viewer from the bar?")) return;
    await supabase.from("profiles").update({ bar_id: null, role: null }).eq("id", memberId);
    loadData();
  }

  async function assignRole(memberId, newRole) {
    const member = members.find(m => m.id === memberId);
    if (!window.confirm("Assign " + member?.display_name + " as " + (ROLE_LABEL[newRole] || newRole) + "?")) return;
    if (newRole === "supervisor") {
      const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
      await supabase.from("promotion_windows").insert({ bar_id: barId, old_supervisor_id: userId, new_supervisor_id: memberId, expires_at: expiresAt });
      await supabase.from("profiles").update({ role: "supervisor" }).eq("id", memberId);
      alert(member?.display_name + " is now Supervisor. You have 24 hours to cancel this if it was a mistake.");
    } else if (newRole === "manager") {
      const currentManager = members.find(m => m.role === "manager");
      if (currentManager) await supabase.from("profiles").update({ role: "viewer" }).eq("id", currentManager.id);
      await supabase.from("profiles").update({ role: "manager" }).eq("id", memberId);
    } else {
      await supabase.from("profiles").update({ role: newRole }).eq("id", memberId);
    }
    loadData();
  }

  async function cancelPromotion() {
    if (!promotionWindow) return;
    await supabase.from("promotion_windows").update({ cancelled: true }).eq("id", promotionWindow.id);
    await supabase.from("profiles").update({ role: "viewer" }).eq("id", promotionWindow.new_supervisor_id);
    await supabase.from("profiles").update({ role: "supervisor" }).eq("id", userId);
    setPromotionWindow(null);
    alert("Promotion cancelled. You are Supervisor again.");
    loadData();
  }

  async function generateInvite() {
    setGenerating(true);
    const { data } = await supabase.from("invites").insert({ bar_id: barId, role: "manager" }).select().single();
    const link = window.location.origin + "?invite=" + data.token;
    setInviteLink(link);
    setGenerating(false);
  }

  const viewers = members.filter(m => m.role === "viewer");
  const manager = members.find(m => m.role === "manager");
  const supervisor = members.find(m => m.role === "supervisor");

  return (
    <div>
      {promotionWindow && (
        <div style={{ background: ERR + "12", border: "1.5px solid " + ERR, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: ERR, fontSize: 14, marginBottom: 6 }}>You are being demoted to Viewer</div>
          <div style={{ fontSize: 13, color: TXT, marginBottom: 10 }}>A Supervisor promotion is in progress. You have <strong>{timeLeft}</strong> to cancel.</div>
          <button onClick={cancelPromotion} style={C.btn("err")}>Cancel Promotion</button>
        </div>
      )}

      <div style={C.sec}>Profile <div style={C.line} /></div>
      <div style={C.card}>
        <div style={{ marginBottom: 12 }}>
          <label style={C.lbl}>Display Name</label>
          <input style={C.inp} value={newName} onChange={e => setNewName(e.target.value)} />
        </div>
        {role === "supervisor" && (
          <div style={{ marginBottom: 12 }}>
            <label style={C.lbl}>Bar Name</label>
            <input style={C.inp} value={newBarName} onChange={e => setNewBarName(e.target.value)} />
          </div>
        )}
        {saved && <div style={{ color: OK, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>Saved!</div>}
        <button style={C.btn("primary")} onClick={saveProfile}>Save Changes</button>
      </div>

      <div style={C.sec}>Bar Code <div style={C.line} /></div>
      <div style={C.card}>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>Share this code with anyone who wants to join this bar as a Viewer.</div>
        <div style={{ background: INP, border: "1px solid " + BORDER, borderRadius: 10, padding: "14px", textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 800, color: TEAL, letterSpacing: 4 }}>{barCode}</div>
        </div>
        <button onClick={() => navigator.clipboard.writeText(barCode)} style={C.btn("ghost")}>Copy Bar Code</button>
      </div>

      {role === "supervisor" && requests.length > 0 && (
        <>
          <div style={C.sec}>Join Requests ({requests.length}) <div style={C.line} /></div>
          {requests.map(req => (
            <div key={req.id} style={C.card}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{req.display_name}</div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>Requesting to join as Viewer</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveRequest(req)} style={{ ...C.btn("ok"), flex: 1 }}>Approve</button>
                <button onClick={() => rejectRequest(req)} style={{ ...C.btn("err"), flex: 1 }}>Reject</button>
              </div>
            </div>
          ))}
        </>
      )}

      <div style={C.sec}>Team Members <div style={C.line} /></div>
      <div style={C.card}>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>Viewers: {viewers.length}/5</div>

        {supervisor && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + BORDER }}>
            <div><div style={{ fontWeight: 600 }}>{supervisor.display_name}</div><span style={C.tag(AMBER)}>Supervisor</span></div>
          </div>
        )}

        {manager && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + BORDER }}>
            <div><div style={{ fontWeight: 600 }}>{manager.display_name}</div><span style={C.tag(OK)}>Manager</span></div>
            {role === "supervisor" && (
              <select onChange={e => e.target.value && assignRole(manager.id, e.target.value)} defaultValue=""
                style={{ ...C.inp, width: "auto", padding: "5px 10px", fontSize: 12 }}>
                <option value="">Reassign</option>
                <option value="supervisor">Promote to Supervisor</option>
                <option value="viewer">Demote to Viewer</option>
              </select>
            )}
          </div>
        )}

        {viewers.map(v => (
          <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + BORDER }}>
            <div><div style={{ fontWeight: 600 }}>{v.display_name}</div><span style={C.tag(BLUE)}>Viewer</span></div>
            {role === "supervisor" && (
              <div style={{ display: "flex", gap: 6 }}>
                <select onChange={e => e.target.value && assignRole(v.id, e.target.value)} defaultValue=""
                  style={{ ...C.inp, width: "auto", padding: "5px 10px", fontSize: 12 }}>
                  <option value="">Promote</option>
                  <option value="supervisor">To Supervisor</option>
                  <option value="manager">To Manager</option>
                </select>
                <button onClick={() => removeViewer(v.id)} style={{ background: ERR + "18", color: ERR, border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {role === "supervisor" && (
        <>
          <div style={C.sec}>Invite Manager <div style={C.line} /></div>
          <div style={C.card}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 13 }}>Generate a one-time link to invite someone as Manager.</div>
            <button style={{ ...C.btn("amber"), marginBottom: inviteLink ? 13 : 0 }} onClick={generateInvite} disabled={generating}>
              {generating ? "Generating..." : "Generate Manager Invite Link"}
            </button>
            {inviteLink && (
              <div>
                <div style={{ background: INP, border: "1px solid " + BORDER, borderRadius: 10, padding: "11px 13px", fontSize: 12, wordBreak: "break-all", marginBottom: 10, color: TEAL, fontWeight: 500 }}>{inviteLink}</div>
                <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={C.btn("ghost")}>Copy Link</button>
              </div>
            )}
          </div>
        </>
      )}

      <div style={C.sec}>Account <div style={C.line} /></div>
      <div style={C.card}>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 13 }}>Signing out will return you to the login screen.</div>
        <button style={C.btn("err")} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState("loading");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bar, setBar] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) setInviteToken(token);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await loadUserData(session.user);
      else setAppState("auth");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) await loadUserData(session.user);
      else if (event === "SIGNED_OUT") { setUser(null); setProfile(null); setBar(null); setAppState("auth"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(u) {
    setUser(u);
    const { data: prof } = await supabase.from("profiles").select("*, bars(*)").eq("id", u.id).single();
    if (!prof || !prof.bar_id) {
      if (inviteToken) setAppState("invite");
      else setAppState("onboarding");
    } else {
      setProfile(prof);
      setBar(prof.bars);
      setAppState("app");
    }
  }

  function handleAuth(u) { setUser(u); loadUserData(u); }
  function handleDone({ bar: b, role, displayName }) { setBar(b); setProfile({ role, display_name: displayName, bar_id: b.id }); setAppState("app"); }
  function handleUpdate({ displayName, barName }) { setProfile(p => ({ ...p, display_name: displayName })); if (barName) setBar(b => ({ ...b, name: barName })); }
  async function handleLogout() { await supabase.auth.signOut(); }

  if (appState === "loading") return <LoadingScreen />;
  if (appState === "auth") return <AuthScreen onAuth={handleAuth} />;
  if (appState === "onboarding") return <OnboardingChoice user={user} onDone={handleDone} />;
  if (appState === "invite") return <JoinViaInvite user={user} token={inviteToken} onDone={handleDone} />;

  const role = profile?.role;
  const displayName = profile?.display_name || user?.email;
  const barId = bar?.id;
  const barCode = bar?.bar_code || "";

  const NAV = [
    { icon: "📦", label: "Stock" },
    { icon: "📋", label: "Log" },
    { icon: "💸", label: "Expenses" },
    { icon: "📊", label: "Report" },
    { icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: BG, minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", paddingBottom: 72 }}>
      <div style={{ padding: "13px 18px 11px", background: WHITE, borderBottom: "1px solid " + BORDER, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 400, color: TXT }}>{bar?.name || "Barnakular"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={C.tag(ROLE_COLOR[role] || BLUE)}>{displayName}</span>
            <span style={{ fontSize: 10, color: MUTED }}>{"· " + (ROLE_LABEL[role] || role)}</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: "16px 14px 10px", overflowY: "auto" }}>
        {tab === 0 && <StockTab barId={barId} role={role} userId={user?.id} displayName={displayName} />}
        {tab === 1 && <DailyLogTab barId={barId} role={role} userId={user?.id} displayName={displayName} />}
        {tab === 2 && <ExpensesTab barId={barId} role={role} userId={user?.id} />}
        {tab === 3 && <ReportTab barId={barId} role={role} />}
        {tab === 4 && <SettingsTab barId={barId} userId={user?.id} role={role} displayName={displayName} barName={bar?.name} barCode={barCode} onUpdate={handleUpdate} onLogout={handleLogout} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: WHITE, borderTop: "1px solid " + BORDER, display: "flex", zIndex: 50, boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}>
        {NAV.map((n, i) => (
          <button key={n.label} onClick={() => setTab(i)} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderTop: tab === i ? "2px solid " + TEAL : "2px solid transparent", marginTop: -1 }}>
            <span style={{ fontSize: 18, filter: tab === i ? "none" : "grayscale(1) opacity(0.4)" }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: tab === i ? TEAL : MUTED }}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
