import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Palette ───────────────────────────────────────────────────────────────────
const TEAL = "#1B3A4B", AMBER = "#C8861A", WHITE = "#FFFFFF", BG = "#F6F7F9";
const TXT = "#1A1A1A", MUTED = "#8A8A8A", OK = "#27AE60", ERR = "#E03131";
const BORDER = "#E5E7EB", INP = "#F2F4F6", SHADOW = "0 2px 10px rgba(0,0,0,0.07)";
const BLUE = "#3B7DD8", PURPLE = "#7C3AED";

const ROLE_COLOR = { supervisor: AMBER, manager: OK, viewer: BLUE };
const ROLE_LABEL = { supervisor: "Admin", manager: "Manager", viewer: "Viewer" };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const mkey = d => (d || today()).slice(0, 7);
const fmtTs = t => new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const sanitise = (text, maxLen = 100) => (text || "").trim().slice(0, maxLen).replace(/[<>]/g, "");

function genBarCode(name) {
  const prefix = name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase() || "BAR";
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const num = 100000 + (buf[0] % 900000);
  return prefix + "-" + num;
}

// Extracts a human-readable message from any error shape Supabase can throw
function errMsg(e) {
  if (!e) return "Something went wrong. Please try again.";
  if (typeof e === "string") return e;
  return e.message || e.error_description || e.msg || e.details || "Something went wrong (" + (e.code || e.status || "unknown") + "). Please try again.";
}

// Validates a money/quantity input: returns a non-negative number or null if invalid
function num(val, allowFloat = true) {
  const n = allowFloat ? parseFloat(val) : parseInt(val, 10);
  if (isNaN(n) || n < 0 || n > 1000000000) return null;
  return n;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const C = {
  card: { background: WHITE, border: "1px solid " + BORDER, borderRadius: 16, padding: "14px 15px", marginBottom: 12, boxShadow: SHADOW },
  inp: { width: "100%", background: INP, border: "1px solid " + BORDER, borderRadius: 10, color: TXT, padding: "11px 13px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  lbl: { fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 5, display: "block" },
  btn: (v = "primary") => ({
    width: "100%", padding: "13px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer",
    background: v === "primary" ? TEAL : v === "amber" ? AMBER : v === "ok" ? OK : v === "err" ? ERR : v === "ghost" ? "transparent" : v === "google" ? WHITE : INP,
    color: v === "ghost" ? MUTED : v === "google" ? TXT : WHITE,
    border: v === "ghost" ? "1px solid " + BORDER : v === "google" ? "1px solid " + BORDER : "none",
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
  tw: { overflowX: "auto", borderRadius: 12, border: "1px solid " + BORDER, background: WHITE, marginBottom: 14, boxShadow: SHADOW },
  th: c => ({ padding: "9px 11px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: c || MUTED, background: "#F5F7F9", borderBottom: "1px solid " + BORDER, whiteSpace: "nowrap", textAlign: "left" }),
  td: c => ({ padding: "10px 11px", fontSize: 13, color: c || TXT, borderBottom: "1px solid " + BORDER, whiteSpace: "nowrap", verticalAlign: "middle" }),
};

// ── Loading ───────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: WHITE, fontFamily: "Georgia,serif" }}>
      <div style={{ fontSize: 36, fontWeight: 400, color: TXT, marginBottom: 20 }}>Barnakular</div>
      <div style={{ width: 32, height: 32, border: "3px solid " + BORDER, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
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
    } catch (e) { console.error("Auth error:", e); setErr(errMsg(e)); }
    finally { setLoading(false); }
  }

  async function handleGoogle() {
    setLoading(true); setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (e) { console.error("Auth error:", e); setErr(errMsg(e)); setLoading(false); }
  }

  const wrap = { minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 36px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };

  if (mode === "landing") return (
    <div style={wrap}>
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <img src="https://raw.githubusercontent.com/amayindin/Barnacular/main/logo.png" alt="Barnakular" style={{ width: 120, height: 120, objectFit: "contain", marginBottom: 8 }} />
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
        <img src="https://raw.githubusercontent.com/amayindin/Barnacular/main/logo.png" alt="Barnakular" style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 8 }} />
        <div style={{ fontFamily: "Georgia,serif", fontSize: 36, fontWeight: 400, color: TXT }}>Barnakular</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{mode === "login" ? "Welcome back" : "Create your account"}</div>
      </div>

      {msg && <div style={{ background: OK + "15", border: "1px solid " + OK + "33", borderRadius: 10, color: OK, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%", textAlign: "center" }}>{msg}</div>}
      {err && <div style={{ background: ERR + "12", border: "1px solid " + ERR + "33", borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%", textAlign: "center" }}>{err}</div>}

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
  const accountName = sanitise(user?.user_metadata?.full_name || user?.email || "", 50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [requested, setRequested] = useState(false);

  async function createBar() {
    if (!barName.trim()) { setErr("Please enter a bar name."); return; }
    setLoading(true); setErr("");
    try {
      const code = genBarCode(barName);
      const { data: bar, error: barErr } = await supabase.from("bars").insert({ name: sanitise(barName, 60), owner_id: user.id, bar_code: code }).select().single();
      if (barErr) throw barErr;
      const { error: profErr } = await supabase.from("profiles").insert({ id: user.id, bar_id: bar.id, display_name: accountName, role: "supervisor", is_owner: true });
      if (profErr) { await supabase.from("bars").delete().eq("id", bar.id); throw profErr; }
      onDone({ bar, role: "supervisor", displayName: accountName });
    } catch (e) { console.error(e); setErr(errMsg(e)); }
    finally { setLoading(false); }
  }

  async function joinBar() {
    if (!barCode.trim()) { setErr("Please enter a bar code."); return; }
    setLoading(true); setErr("");
    try {
      const raw = barCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const code = raw.slice(0, 3) + "-" + raw.slice(3);
      const { data: bar, error: barErr } = await supabase.from("bars").select("*").eq("bar_code", code).single();
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
      const { error: reqErr } = await supabase.from("join_requests").insert({ bar_id: bar.id, user_id: user.id, display_name: accountName });
      if (reqErr) throw reqErr;
      setRequested(true);
    } catch (e) { console.error(e); setErr(errMsg(e)); }
    finally { setLoading(false); }
  }

  const wrap = { minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };

  if (requested) return (
    <div style={wrap}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 24, color: TXT, marginBottom: 12, textAlign: "center" }}>Request Sent!</div>
      <div style={{ fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 1.6 }}>Your join request has been sent to the bar Admin. You'll be notified once they approve it.</div>
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
        style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px", marginBottom: 12, background: WHITE, border: "1.5px solid " + TEAL, borderRadius: 16, cursor: "pointer", boxShadow: SHADOW }}>
        <div style={{ fontSize: 28, width: 48, height: 48, borderRadius: 12, background: TEAL + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>🏪</div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: TXT }}>Create a Bar</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Set up your bar and become Admin</div>
        </div>
        <div style={{ marginLeft: "auto", color: MUTED, fontSize: 20 }}>›</div>
      </button>
      <button onClick={() => setChoice("join")}
        style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "18px", background: WHITE, border: "1.5px solid " + BORDER, borderRadius: 16, cursor: "pointer", boxShadow: SHADOW }}>
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
        <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{choice === "create" ? "You will be assigned as Admin" : "Send a request to join"}</div>
      </div>
      {err && <div style={{ background: ERR + "12", border: "1px solid " + ERR + "33", borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%" }}>{err}</div>}
      {choice === "create" ? (
        <div style={{ width: "100%", marginBottom: 24 }}>
          <label style={C.lbl}>Bar Name</label>
          <input style={C.inp} placeholder="e.g. The Gold Bar, Club Luxe" value={barName} onChange={e => setBarName(e.target.value)} onKeyDown={e => e.key === "Enter" && createBar()} />
        </div>
      ) : (
        <div style={{ width: "100%", marginBottom: 24 }}>
          <label style={C.lbl}>Bar Code</label>
          <input style={{ ...C.inp, letterSpacing: 3, textTransform: "uppercase" }} placeholder="e.g. QUA-2847" value={barCode} onChange={e => setBarCode(e.target.value)} onKeyDown={e => e.key === "Enter" && joinBar()} />
          <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>Ask the Admin for the bar code</div>
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
      const { data, error } = await supabase.from("invites").select("*, bars(name)").eq("token", token).eq("used", false).gte("expires_at", new Date().toISOString()).single();
      if (error || !data) setErr("This invite link is invalid or has already been used.");
      else setInvite(data);
      setLoading(false);
    }
    load();
  }, [token]);

  async function join() {
    setJoining(true); setErr("");
    try {
      const { error: profErr } = await supabase.from("profiles").insert({ id: user.id, bar_id: invite.bar_id, display_name: accountName, role: invite.role, is_owner: false });
      if (profErr) throw profErr;
      await supabase.from("invites").update({ used: true }).eq("id", invite.id);
      const { data: bar } = await supabase.from("bars").select().eq("id", invite.bar_id).single();
      onDone({ bar, role: invite.role, displayName: accountName });
    } catch (e) { console.error(e); setErr(errMsg(e)); }
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
      {err && <div style={{ background: ERR + "12", border: "1px solid " + ERR + "33", borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%" }}>{err}</div>}
      {invite && (
        <>
          <div style={{ ...C.card, background: "#EBF2F5", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Joining as</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: TEAL }}>{accountName}</div>
          </div>
          <button onClick={join} disabled={joining} style={{ ...C.btn("primary"), opacity: joining ? 0.6 : 1 }}>
            {joining ? "Joining..." : "Join " + (invite.bars?.name || "") + " →"}
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
    <div style={{ ...C.card, borderLeft: "4px solid " + TEAL }}>
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
        <tfoot><tr style={{ background: BG, borderTop: "1px solid " + BORDER }}>
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
  const [newRow, setNewRow] = useState({ name: "", buy_price: "", sell_price: "", quantity: "", min_quantity: "" });
  const [priceId, setPriceId] = useState(null);
  const [priceData, setPriceData] = useState({});
  const [restockId, setRestockId] = useState(null);
  const [restockQty, setRestockQty] = useState("");
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [editErr, setEditErr] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [err, setErr] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const canEdit = role === "manager" || role === "supervisor";
  const canPrice = role === "supervisor";
  const isReadOnly = role === "viewer";
  const showMoney = role !== "manager";

  async function loadDrinks() {
    const { data } = await supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false).order("name");
    setDrinks(data || []); setLoading(false);
  }

  useEffect(() => {
    loadDrinks();
    const sub = supabase.channel("drinks-" + barId).on("postgres_changes", { event: "*", schema: "public", table: "drinks", filter: "bar_id=eq." + barId }, loadDrinks).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  async function addDrink() {
    if (!newRow.name.trim()) { setErr("Drink name required."); return; }
    const buy = num(newRow.buy_price) ?? 0;
    const sell = num(newRow.sell_price) ?? 0;
    const qty = num(newRow.quantity, false) ?? 0;
    const min = num(newRow.min_quantity, false) ?? 3;
    if (newRow.buy_price && num(newRow.buy_price) === null) { setErr("Buy price must be a valid non-negative number."); return; }
    const addedBySuper = role === "supervisor";
    if (addedBySuper && sell > 0 && sell <= buy) { setErr("Sell price must exceed buy price."); return; }
    try {
      const { error } = await supabase.from("drinks").insert({ bar_id: barId, name: sanitise(newRow.name, 60), buy_price: buy, sell_price: addedBySuper ? sell : 0, quantity: qty, min_quantity: min, price_pending: addedBySuper ? sell <= 0 : true });
      if (error) throw error;
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Added drink", detail: newRow.name.trim() });
      setNewRow({ name: "", buy_price: "", sell_price: "", quantity: "", min_quantity: "" }); setErr("");
      loadDrinks();
    } catch (e) { setErr("Could not add drink: " + errMsg(e)); }
  }

  function openEdit(d) {
    setEditId(d.id);
    setEditRow({ name: d.name, quantity: String(d.quantity), min_quantity: String(d.min_quantity), buy_price: String(d.buy_price), sell_price: String(d.sell_price) });
    setEditErr("");
  }

  async function saveEdit() {
    const d = drinks.find(x => x.id === editId);
    if (!d) return;
    const name = sanitise(editRow.name, 60);
    if (!name) { setEditErr("Drink name is required."); return; }
    const qty = num(editRow.quantity, false);
    const min = num(editRow.min_quantity, false);
    const buy = num(editRow.buy_price);
    if (qty === null || min === null || buy === null) { setEditErr("Quantity, Min and Buy price must be valid non-negative numbers."); return; }
    const update = { name, quantity: qty, min_quantity: min, buy_price: buy };
    if (canPrice) {
      const sell = num(editRow.sell_price);
      if (sell === null) { setEditErr("Sell price must be a valid non-negative number."); return; }
      if (sell > 0 && sell <= buy) { setEditErr("Sell price must exceed buy price."); return; }
      update.sell_price = sell;
      update.price_pending = sell <= 0;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.from("drinks").update(update).eq("id", editId).eq("bar_id", barId);
      if (error) throw error;
      const changes = [];
      if (name !== d.name) changes.push("name: " + d.name + " → " + name);
      if (qty !== d.quantity) changes.push("qty: " + d.quantity + " → " + qty);
      if (min !== d.min_quantity) changes.push("min: " + d.min_quantity + " → " + min);
      if (buy !== d.buy_price) changes.push("buy: " + fmt(d.buy_price) + " → " + fmt(buy));
      if (canPrice && update.sell_price !== d.sell_price) changes.push("sell: " + fmt(d.sell_price) + " → " + fmt(update.sell_price));
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Edited drink " + d.name, detail: changes.join(", ") || "no changes" });
      setEditId(null); setEditErr("");
      loadDrinks();
    } catch (e) { setEditErr("Could not save: " + errMsg(e)); }
    finally { setSavingEdit(false); }
  }

  async function savePrice(id) {
    const s = parseFloat(priceData.sell_price);
    const d = drinks.find(x => x.id === id);
    if (isNaN(s) || s <= d.buy_price) { setErr("Sell price must exceed buy price."); return; }
    await supabase.from("drinks").update({ sell_price: s, price_pending: false }).eq("id", id);
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Set sell price of " + d.name, detail: fmt(s) });
    setPriceId(null); setErr("");
    loadDrinks();
  }

  async function doRestock() {
    const q = num(restockQty, false);
    if (q === null || q <= 0) { alert("Enter a valid quantity."); return; }
    const d = drinks.find(x => x.id === restockId);
    try {
      const { error } = await supabase.from("restocks").insert({ bar_id: barId, drink_id: restockId, quantity: q, restock_date: today() });
      if (error) throw error;
      await supabase.from("drinks").update({ quantity: d.quantity + q }).eq("id", restockId).eq("bar_id", barId);
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Restocked " + d.name, detail: "+"+q+" units" });
      setRestockId(null); setRestockQty("");
      loadDrinks();
    } catch (e) { alert("Restock failed: " + errMsg(e)); }
  }

  async function archiveDrink(id) {
    const d = drinks.find(x => x.id === id);
    if (!window.confirm("Archive " + d.name + "? It will be hidden from the stock register but its history is kept. You can restore it from Settings.")) return;
    try {
      const { error } = await supabase.from("drinks").update({ archived: true }).eq("id", id).eq("bar_id", barId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Archived drink", detail: d.name });
      loadDrinks();
    } catch (e) { alert("Archive failed: " + errMsg(e)); }
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
        <div style={{ background: BLUE + "12", border: "1px solid " + BLUE + "33", borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: BLUE, fontWeight: 500 }}>
          👁 You are viewing this bar as a Viewer. You cannot make any changes.
        </div>
      )}

      {lowItems.length > 0 && (
        <div style={{ background: "#FFF5F5", border: "1px solid " + ERR + "33", borderRadius: 14, padding: "13px 15px", marginBottom: 14 }}>
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
                <div style={{ ...C.card, border: "1.5px solid " + AMBER, marginBottom: 8 }}>
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
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 16px", marginBottom: 8, background: WHITE, border: "1.5px solid " + AMBER + "55", borderRadius: 14, cursor: "pointer", boxShadow: SHADOW }}>
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
        <div style={{ background: "#FFFBF0", border: "1px solid " + AMBER + "33", borderRadius: 12, padding: "11px 14px", marginBottom: 13, fontSize: 13, color: AMBER, fontWeight: 500 }}>
          ⏳ {pending.length} drink{pending.length !== 1 ? "s" : ""} awaiting sell price from Admin.
        </div>
      )}

      {err && !priceId && <div style={{ background: "#FFF5F5", border: "1px solid " + ERR + "44", borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 12 }}>{err}</div>}

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
                      {canEdit && <button onClick={() => setRestockId(d.id)} title="Restock" style={{ background: OK + "18", color: OK, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 3 }}>+</button>}
                      {canEdit && <button onClick={() => openEdit(d)} title="Edit figures" style={{ background: TEAL + "14", color: TEAL, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 3 }}>✎</button>}
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
                {role === "supervisor" ? (
                  <td style={{ padding: "8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 90 }} type="number" placeholder="Sell ₦" value={newRow.sell_price} onChange={e => setNewRow(p => ({ ...p, sell_price: e.target.value }))} /></td>
                ) : (
                  <td style={{ padding: "8px", color: MUTED, fontSize: 11 }}>Admin sets</td>
                )}
                <td colSpan={2} style={C.td()}></td>
                <td style={{ padding: "8px" }}><button onClick={addDrink} style={{ background: TEAL, color: WHITE, border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Add</button></td>
              </tr>
            )}
          </tbody>
          {drinks.length > 0 && (
            <tfoot><tr style={{ background: BG, borderTop: "1px solid " + BORDER }}>
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

      {editId && (() => {
        const d = drinks.find(x => x.id === editId);
        if (!d) return null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: WHITE, borderRadius: 20, padding: 22, width: "100%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Edit — {d.name}</div>
              <div style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>All changes are recorded in the audit log.</div>
              <div style={{ marginBottom: 11 }}>
                <label style={C.lbl}>Drink Name</label>
                <input style={C.inp} value={editRow.name} onChange={e => setEditRow(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 11 }}>
                <div style={{ flex: 1 }}>
                  <label style={C.lbl}>Quantity</label>
                  <input style={C.inp} type="number" value={editRow.quantity} onChange={e => setEditRow(p => ({ ...p, quantity: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={C.lbl}>Min Quantity</label>
                  <input style={C.inp} type="number" value={editRow.min_quantity} onChange={e => setEditRow(p => ({ ...p, min_quantity: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 11 }}>
                <div style={{ flex: 1 }}>
                  <label style={C.lbl}>Buy Price (₦)</label>
                  <input style={C.inp} type="number" value={editRow.buy_price} onChange={e => setEditRow(p => ({ ...p, buy_price: e.target.value }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={C.lbl}>Sell Price (₦)</label>
                  {canPrice ? (
                    <input style={C.inp} type="number" value={editRow.sell_price} onChange={e => setEditRow(p => ({ ...p, sell_price: e.target.value }))} />
                  ) : (
                    <div style={{ ...C.inp, background: BG, color: MUTED, fontSize: 12, display: "flex", alignItems: "center" }}>Admin only</div>
                  )}
                </div>
              </div>
              {editErr && <div style={{ color: ERR, fontSize: 12, marginBottom: 10 }}>{editErr}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...C.btn("primary"), flex: 1, opacity: savingEdit ? 0.6 : 1 }} disabled={savingEdit} onClick={saveEdit}>{savingEdit ? "Saving..." : "✓ Save Changes"}</button>
                <button style={{ ...C.btn("ghost"), flex: 1 }} onClick={() => setEditId(null)}>Cancel</button>
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
  const [reloadKey, setReloadKey] = useState(0);

  const canLog = role === "manager" || role === "supervisor";
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
    const sub = supabase.channel("logs-" + barId).on("postgres_changes", { event: "*", schema: "public", table: "stock_logs", filter: "bar_id=eq." + barId }, load).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId, reloadKey]);

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
    for (const d of drinks) {
      const val = closeEnt[d.id];
      if (val === undefined || val === "") continue;
      const n = num(val, false);
      if (n === null) { alert("Invalid closing quantity for " + d.name + ". Enter a non-negative whole number."); return; }
      const opening = getOpening(d.id);
      if (opening !== null && n > opening && !window.confirm(d.name + ": closing (" + n + ") is higher than opening (" + opening + "). Save anyway?")) return;
    }
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
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Saved closing stock", detail: "for " + date });
      setCloseEnt({}); setShowCash(true);
      setReloadKey(k => k + 1);
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
      {isLocked && <div style={{ background: "#FFF5F5", border: "1px solid " + ERR + "33", borderRadius: 12, padding: "11px 14px", marginBottom: 13, fontSize: 13, color: ERR }}>🔒 Past records are locked.</div>}
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
            <div style={{ ...C.card, border: "1.5px solid " + OK, marginBottom: 14 }}>
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
              style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid " + BORDER, borderRadius: 8, color: MUTED, fontSize: 11, padding: "6px", cursor: "pointer" }}>
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

  const canAdd = role === "manager" || role === "supervisor";

  async function load() {
    const { data } = await supabase.from("expenses").select("*").eq("bar_id", barId).order("expense_date", { ascending: false });
    setExpenses(data || []); setLoading(false);
  }

  useEffect(() => {
    load();
    const sub = supabase.channel("expenses-" + barId).on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: "bar_id=eq." + barId }, load).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  async function add() {
    if (!desc.trim() || !amount) { setErr("Fill in all fields."); return; }
    await supabase.from("expenses").insert({ bar_id: barId, category, description: sanitise(desc, 200), amount: parseFloat(amount), expense_date: date, created_by: userId });
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Added expense", detail: category + ": " + desc });
    setDesc(""); setAmount(""); setErr("");
    load();
  }

  if (loading) return <div style={C.empty}>Loading expenses...</div>;
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div style={C.sec}>Expenses <div style={C.line} /></div>
      {role === "supervisor" && <div style={{ background: "#FFFBF0", border: "1px solid " + AMBER + "33", borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: AMBER, fontWeight: 500 }}>👁 Viewing all expense records. Only Managers can add expenses.</div>}
      {role === "viewer" && <div style={{ background: BLUE + "12", border: "1px solid " + BLUE + "33", borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: BLUE, fontWeight: 500 }}>👁 You are viewing expense records as a Viewer.</div>}
      {canAdd && (
        <div style={C.card}>
          <div style={{ marginBottom: 11 }}><label style={C.lbl}>Date</label><input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div style={{ marginBottom: 11 }}>
            <label style={C.lbl}>Category</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {EXPENSE_CATS.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid " + (category === cat ? TEAL : BORDER), background: category === cat ? TEAL : WHITE, color: category === cat ? WHITE : MUTED, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
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
          <div style={{ ...C.card, borderLeft: "4px solid " + ERR }}>
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

  function downloadReport() {
    if (!data) return;
    const showMoney = role !== "manager";
    const label = view === "daily" ? fmtDate(date) : new Date(month + "-01").toLocaleString("en-NG", { month: "long", year: "numeric" });
    const gross = data.totalRev - data.totalCOGS;
    const net = gross - data.totalExp;
    const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const h = [];
    h.push("<!DOCTYPE html><html><head><title>Barnakular Report</title><meta charset='utf-8'>");
    h.push("<style>body{font-family:-apple-system,Segoe UI,sans-serif;color:#1A1A1A;padding:24px;max-width:720px;margin:0 auto}h1{font-family:Georgia,serif;font-weight:400;font-size:26px;color:#1B3A4B;margin:0}h2{font-size:13px;letter-spacing:1px;text-transform:uppercase;color:#8A8A8A;border-bottom:1px solid #E5E7EB;padding-bottom:6px;margin-top:28px}table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8A8A8A;border-bottom:2px solid #E5E7EB;padding:7px}td{padding:7px;border-bottom:1px solid #F0F1F3}.r{text-align:right}.mono{font-family:monospace;font-weight:700}.ok{color:#27AE60}.err{color:#E03131}.teal{color:#1B3A4B}.sub{color:#8A8A8A;font-size:12px}.sum{background:#F6F7F9;border-radius:10px;padding:14px 16px;margin-top:12px}.sum div{display:flex;justify-content:space-between;padding:4px 0}@media print{body{padding:0}}</style></head><body>");
    h.push("<h1>Barnakular</h1><div class='sub'>" + esc(view === "daily" ? "Daily Report" : "Monthly Report") + " — " + esc(label) + "</div>");
    h.push("<div class='sub'>Generated " + esc(new Date().toLocaleString("en-NG")) + " · Role: " + esc(ROLE_LABEL[role] || role) + "</div>");
    if (showMoney) {
      h.push("<h2>Profit &amp; Loss</h2><div class='sum'>");
      if (data.daysLogged !== undefined) h.push("<div><span>Days Logged</span><span class='mono'>" + data.daysLogged + "</span></div>");
      h.push("<div><span>Revenue</span><span class='mono teal'>" + esc(fmt(data.totalRev)) + "</span></div>");
      h.push("<div><span>Cost of Goods</span><span class='mono'>" + esc(fmt(data.totalCOGS)) + "</span></div>");
      h.push("<div><span>Gross Profit</span><span class='mono " + (gross >= 0 ? "ok" : "err") + "'>" + esc(fmt(gross)) + "</span></div>");
      h.push("<div><span>Expenses</span><span class='mono err'>" + esc(fmt(data.totalExp)) + "</span></div>");
      h.push("<div style='border-top:1px solid #E5E7EB;margin-top:6px;padding-top:8px'><span><strong>Net " + (net >= 0 ? "Profit" : "Loss") + "</strong></span><span class='mono " + (net >= 0 ? "ok" : "err") + "' style='font-size:16px'>" + esc(fmt(Math.abs(net))) + "</span></div>");
      const cashAmt = view === "daily" ? data.dayCash?.amount : data.totalCash;
      if (cashAmt) h.push("<div><span>Cash Collected</span><span class='mono ok'>" + esc(fmt(cashAmt)) + "</span></div>");
      h.push("</div>");
    }
    h.push("<h2>" + (showMoney ? "Sales Breakdown" : "Units Breakdown") + "</h2><table><tr><th>Drink</th><th class='r'>Sold</th>" + (showMoney ? "<th class='r'>Revenue</th><th class='r'>Profit</th>" : "") + "<th class='r'>Closing</th></tr>");
    data.drinkStats.forEach(d => {
      h.push("<tr><td>" + esc(d.name) + "</td><td class='r mono'>" + d.sold + "</td>" + (showMoney ? "<td class='r mono'>" + esc(fmt(d.rev)) + "</td><td class='r mono'>" + esc(fmt(d.profit)) + "</td>" : "") + "<td class='r mono'>" + (d.lastClose ?? "—") + "</td></tr>");
    });
    h.push("<tr><td><strong>Totals</strong></td><td class='r mono'>" + data.drinkStats.reduce((s, d) => s + d.sold, 0) + "</td>" + (showMoney ? "<td class='r mono teal'>" + esc(fmt(data.totalRev)) + "</td><td class='r mono " + (gross >= 0 ? "ok" : "err") + "'>" + esc(fmt(gross)) + "</td>" : "") + "<td></td></tr></table>");
    if (data.filterRestocks.length > 0) {
      h.push("<h2>Restocks</h2><table><tr><th>Drink</th><th class='r'>Units Added</th>" + (showMoney ? "<th class='r'>Value</th>" : "") + "</tr>");
      data.filterRestocks.forEach(r => {
        h.push("<tr><td>" + esc(r.drinks?.name) + "</td><td class='r mono'>" + r.quantity + "</td>" + (showMoney ? "<td class='r mono'>" + esc(fmt(r.quantity * (r.drinks?.buy_price || 0))) + "</td>" : "") + "</tr>");
      });
      h.push("</table>");
    }
    if (showMoney && data.filterExp.length > 0) {
      h.push("<h2>Expenses</h2><table><tr><th>Description</th><th>Category</th><th class='r'>Amount</th></tr>");
      data.filterExp.forEach(e => {
        h.push("<tr><td>" + esc(e.description) + "</td><td>" + esc(e.category) + "</td><td class='r mono err'>" + esc(fmt(e.amount)) + "</td></tr>");
      });
      h.push("</table>");
    }
    h.push("<div class='sub' style='margin-top:28px;text-align:center'>Barnakular Bar Management System</div>");
    h.push("</body></html>");
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups to download the report."); return; }
    w.document.write(h.join(""));
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

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
          <button onClick={downloadReport} style={{ ...C.btn("amber"), marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            ⬇ Download {view === "daily" ? "Daily" : "Monthly"} Report (PDF)
          </button>
          {!isManager && (
            <>
              <PLCard
                label={view === "daily" ? "Day Summary — " + fmtDate(date) : new Date(month + "-01").toLocaleString("en-NG", { month: "long", year: "numeric" })}
                daysLogged={data.daysLogged}
                totalRev={data.totalRev} totalCOGS={data.totalCOGS} totalExp={data.totalExp}
              />
              {data.dayCash && (
                <div style={{ ...C.card, borderLeft: "4px solid " + OK }}>
                  <div style={C.row}><span style={{ fontWeight: 700 }}>Cash Collected</span><span style={C.sval(OK)}>{fmt(data.dayCash.amount)}</span></div>
                </div>
              )}
              {view === "monthly" && (
                <div style={{ ...C.card, borderLeft: "4px solid " + OK }}>
                  <div style={C.row}><span style={{ fontWeight: 700 }}>Total Cash Collected</span><span style={C.sval(OK)}>{fmt(data.totalCash)}</span></div>
                </div>
              )}
            </>
          )}

          {isManager ? (
            <>
              <div style={{ ...C.card, borderLeft: "4px solid " + AMBER }}>
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
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{isTop ? "🔴 " : ""}{cat}</span>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: amt > 0 ? ERR : MUTED }}>{fmt(amt)}</span>
                      </div>
                      <div style={{ height: 6, background: BORDER, borderRadius: 3 }}>
                        <div style={{ height: "100%", background: ERR, borderRadius: 3, width: ((amt / max) * 100) + "%" }} />
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
  const [archived, setArchived] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [menuMember, setMenuMember] = useState(null);
  const [menuStage, setMenuStage] = useState("root");

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
    loadArchived();
    const sub = supabase.channel("settings-" + barId)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: "bar_id=eq." + barId }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "join_requests", filter: "bar_id=eq." + barId }, loadData)
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
    const clean = sanitise(newName, 50);
    if (!clean) { alert("Display name cannot be empty."); return; }
    // Account-wide: this updates the user's name in EVERY bar they belong to
    await supabase.from("profiles").update({ display_name: clean }).eq("id", userId);
    if (role === "supervisor" && newBarName.trim() !== barName) {
      await supabase.from("bars").update({ name: sanitise(newBarName, 60) }).eq("id", barId);
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    onUpdate({ displayName: clean, barName: newBarName.trim() });
  }

  async function loadArchived() {
    const { data } = await supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", true).order("name");
    setArchived(data || []);
  }

  async function restoreDrink(d) {
    await supabase.from("drinks").update({ archived: false }).eq("id", d.id).eq("bar_id", barId);
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Restored drink", detail: d.name });
    loadArchived();
  }

  async function deleteArchivedDrink(d) {
    if (!window.confirm("Permanently delete " + d.name + "? This also removes its stock logs and restock history. This cannot be undone.")) return;
    try {
      await supabase.from("stock_logs").delete().eq("drink_id", d.id).eq("bar_id", barId);
      await supabase.from("restocks").delete().eq("drink_id", d.id).eq("bar_id", barId);
      const { error } = await supabase.from("drinks").delete().eq("id", d.id).eq("bar_id", barId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Deleted archived drink", detail: d.name });
      loadArchived();
    } catch (e) { alert("Delete failed: " + errMsg(e)); }
  }

  async function deleteBar() {
    if (deleteConfirm !== barName) { alert("Type the bar name exactly to confirm deletion."); return; }
    if (!window.confirm("FINAL WARNING: This permanently deletes " + barName + " and ALL its data — drinks, logs, expenses, reports, members. This cannot be undone. Continue?")) return;
    setDeleting(true);
    try {
      const tables = ["audit_logs", "cash_records", "expenses", "restocks", "stock_logs", "drinks", "invites", "join_requests", "promotion_windows", "profiles"];
      for (const t of tables) {
        const { error } = await supabase.from(t).delete().eq("bar_id", barId);
        if (error) throw new Error(t + ": " + error.message);
      }
      const { error: barErr } = await supabase.from("bars").delete().eq("id", barId);
      if (barErr) throw barErr;
      alert("Bar deleted.");
      window.location.reload();
    } catch (e) { alert("Delete failed: " + errMsg(e)); setDeleting(false); }
  }

  async function approveRequest(req) {
    const viewers = members.filter(m => m.role === "viewer");
    if (viewers.length >= 5) { alert("Maximum 5 viewers already reached. Remove a viewer first."); return; }
    if (!req.user_id || !req.bar_id) { alert("Invalid request."); return; }
    const { error } = await supabase.from("profiles").insert({ id: req.user_id, bar_id: barId, display_name: req.display_name, role: "viewer", is_owner: false });
    if (error) { alert("Could not approve: " + error.message); return; }
    await supabase.from("join_requests").update({ status: "approved" }).eq("id", req.id);
    loadData();
  }

  async function rejectRequest(req) {
    await supabase.from("join_requests").update({ status: "rejected" }).eq("id", req.id);
    loadData();
  }

  async function removeViewer(memberId) {
    if (!window.confirm("Remove this viewer from the bar?")) return;
    const member = members.find(m => m.id === memberId);
    await supabase.from("profiles").delete().eq("id", memberId).eq("bar_id", barId);
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Member left", detail: (member?.display_name || "A member") + " was removed from the bar" });
    loadData();
  }

  async function assignRole(memberId, newRole) {
    if (!["supervisor", "manager", "viewer"].includes(newRole)) { alert("Invalid role."); return; }
    if (memberId === userId && newRole !== "supervisor") { alert("You cannot demote yourself."); return; }
    const member = members.find(m => m.id === memberId);
    if (!member) { alert("Member not found."); return; }
    if (!window.confirm("Assign " + member?.display_name + " as " + (ROLE_LABEL[newRole] || newRole) + "?")) return;
    if (newRole === "supervisor") {
      const expiresAt = new Date(Date.now() + 24 * 3600000).toISOString();
      await supabase.from("promotion_windows").insert({ bar_id: barId, old_supervisor_id: userId, new_supervisor_id: memberId, expires_at: expiresAt });
      await supabase.from("profiles").update({ role: "supervisor" }).eq("id", memberId).eq("bar_id", barId);
      alert(member?.display_name + " is now Admin. You have 24 hours to cancel this if it was a mistake.");
    } else if (newRole === "manager") {
      const currentManager = members.find(m => m.role === "manager");
      if (currentManager) await supabase.from("profiles").update({ role: "viewer" }).eq("id", currentManager.id).eq("bar_id", barId);
      await supabase.from("profiles").update({ role: "manager" }).eq("id", memberId).eq("bar_id", barId);
    } else {
      await supabase.from("profiles").update({ role: newRole }).eq("id", memberId).eq("bar_id", barId);
    }
    loadData();
  }

  async function cancelPromotion() {
    if (!promotionWindow) return;
    await supabase.from("promotion_windows").update({ cancelled: true }).eq("id", promotionWindow.id);
    await supabase.from("profiles").update({ role: "viewer" }).eq("id", promotionWindow.new_supervisor_id).eq("bar_id", barId);
    await supabase.from("profiles").update({ role: "supervisor" }).eq("id", userId).eq("bar_id", barId);
    setPromotionWindow(null);
    alert("Promotion cancelled. You are Admin again.");
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
          <div style={{ fontSize: 13, color: TXT, marginBottom: 10 }}>An Admin promotion is in progress. You have <strong>{timeLeft}</strong> to cancel.</div>
          <button onClick={cancelPromotion} style={C.btn("err")}>Cancel Promotion</button>
        </div>
      )}

      <div style={C.sec}>Profile <div style={C.line} /></div>
      <div style={C.card}>
        <div style={{ marginBottom: 12 }}>
          <label style={C.lbl}>Display Name (used in all your bars)</label>
          <input style={C.inp} value={newName} onChange={e => setNewName(e.target.value)} />
          <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>Changing this updates your name in every bar you own or have joined.</div>
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
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
          Viewers: {viewers.length}/5{role === "supervisor" ? " · Tap a role badge to manage" : ""}
        </div>
        {[...members].sort((a, b) => {
          const order = { supervisor: 0, manager: 1, viewer: 2 };
          return (order[a.role] ?? 3) - (order[b.role] ?? 3) || (a.display_name || "").localeCompare(b.display_name || "");
        }).map(m => {
          const tagColor = m.role === "supervisor" ? AMBER : m.role === "manager" ? OK : BLUE;
          const canManage = role === "supervisor" && m.id !== userId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid " + BORDER }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.display_name}{m.id === userId ? " (you)" : ""}</div>
              <button
                onClick={() => { if (canManage) { setMenuMember(m); setMenuStage("root"); } }}
                style={{ ...C.tag(tagColor), border: canManage ? "1.5px solid " + tagColor + "55" : "none", background: tagColor + "18", cursor: canManage ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 5 }}>
                {ROLE_LABEL[m.role] || m.role}{canManage ? " ▾" : ""}
              </button>
            </div>
          );
        })}
        {members.length === 0 && <div style={{ fontSize: 13, color: MUTED }}>No members yet.</div>}
      </div>

      {menuMember && (() => {
        const m = menuMember;
        const close = () => { setMenuMember(null); setMenuStage("root"); };
        const act = async (fn) => { close(); await fn(); };
        const opt = (label, color, fn) => (
          <button key={label} onClick={() => act(fn)}
            style={{ display: "block", width: "100%", padding: "14px", background: "none", border: "none", borderBottom: "1px solid " + BORDER, color, fontSize: 15, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>
            {label}
          </button>
        );
        let options = [];
        if (menuStage === "root") {
          if (m.role === "viewer") {
            options = [
              opt("Promote", TEAL, async () => { setMenuMember(m); setMenuStage("promote"); }),
              opt("Remove from bar", ERR, () => removeViewer(m.id))
            ];
          } else if (m.role === "manager") {
            options = [
              opt("Promote", TEAL, async () => { setMenuMember(m); setMenuStage("promote"); }),
              opt("Demote", AMBER, async () => { setMenuMember(m); setMenuStage("demote"); })
            ];
          }
        } else if (menuStage === "promote") {
          options = m.role === "viewer" ? [
            opt("To Manager", OK, () => assignRole(m.id, "manager")),
            opt("To Admin", AMBER, () => assignRole(m.id, "supervisor"))
          ] : [
            opt("To Admin", AMBER, () => assignRole(m.id, "supervisor"))
          ];
        } else if (menuStage === "demote") {
          options = [
            opt("To Viewer", BLUE, () => assignRole(m.id, "viewer")),
            opt("Remove from bar", ERR, () => removeViewer(m.id))
          ];
        }
        return (
          <div onClick={close} style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: WHITE, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, paddingBottom: 24 }}>
              <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid " + BORDER }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{m.display_name}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {ROLE_LABEL[m.role]}{menuStage === "promote" ? " → Promote to..." : menuStage === "demote" ? " → Demote to..." : ""}
                </div>
              </div>
              {options}
              <button onClick={menuStage === "root" ? close : () => setMenuStage("root")}
                style={{ display: "block", width: "100%", padding: "14px", background: "none", border: "none", color: MUTED, fontSize: 14, cursor: "pointer", textAlign: "center" }}>
                {menuStage === "root" ? "Cancel" : "← Back"}
              </button>
            </div>
          </div>
        );
      })()}

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

      {(role === "supervisor" || role === "manager") && (
        <>
          <div style={C.sec}>Archived Drinks ({archived.length}) <div style={C.line} /></div>
          <div style={C.card}>
            {archived.length === 0 ? (
              <div style={{ fontSize: 13, color: MUTED }}>No archived drinks. Drinks you archive from the stock register will appear here.</div>
            ) : (
              <>
                <button onClick={() => setShowArchived(s => !s)} style={{ ...C.btn("ghost"), marginBottom: showArchived ? 12 : 0 }}>
                  {showArchived ? "▲ Hide Archived Drinks" : "▼ View Archived Drinks (" + archived.length + ")"}
                </button>
                {showArchived && archived.map(d => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid " + BORDER }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Buy {fmt(d.buy_price)} · Last qty {d.quantity}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => restoreDrink(d)} style={{ background: OK + "18", color: OK, border: "none", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Restore</button>
                      {role === "supervisor" && <button onClick={() => deleteArchivedDrink(d)} style={{ background: ERR + "18", color: ERR, border: "none", borderRadius: 8, padding: "6px 11px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Delete</button>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {role === "supervisor" && (
        <>
          <div style={{ ...C.sec, color: ERR }}>Danger Zone <div style={{ ...C.line, background: ERR + "33" }} /></div>
          <div style={{ ...C.card, border: "1.5px solid " + ERR + "44" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: ERR, marginBottom: 6 }}>Delete This Bar</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 13, lineHeight: 1.5 }}>
              Permanently deletes <strong style={{ color: TXT }}>{barName}</strong> and all its drinks, logs, expenses, reports and members. This cannot be undone.
            </div>
            <label style={C.lbl}>Type the bar name to confirm</label>
            <input style={{ ...C.inp, marginBottom: 12 }} placeholder={barName} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <button
              onClick={deleteBar}
              disabled={deleting || deleteConfirm !== barName}
              style={{ ...C.btn("err"), opacity: deleting || deleteConfirm !== barName ? 0.4 : 1, cursor: deleteConfirm !== barName ? "not-allowed" : "pointer" }}>
              {deleting ? "Deleting..." : "Delete Bar Permanently"}
            </button>
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


// ── Home Screen — Bar Selection ───────────────────────────────────────────────
function HomeScreen({ user, onSelectBar, onSignOut }) {
  const [bars, setBars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [barName, setBarName] = useState("");
  const [barCode, setBarCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifCounts, setNotifCounts] = useState({});

  async function loadBars() {
    const { data: profiles } = await supabase.from("profiles").select("*, bars(*)").eq("id", user.id).not("bar_id", "is", null);
    const list = (profiles || []).filter(p => p.bars);
    setBars(list);
    setLoading(false);
    loadNotifications(list);
  }

  async function loadNotifications(list) {
    try {
      const barIds = list.map(p => p.bar_id);
      if (barIds.length === 0) { setNotifs([]); setNotifCounts({}); return; }
      const roleByBar = {}; const nameByBar = {};
      list.forEach(p => { roleByBar[p.bar_id] = p.role; nameByBar[p.bar_id] = p.bars?.name; });
      const since = new Date(Date.now() - 48 * 3600000).toISOString();
      const [reqRes, drinkRes, logRes, auditRes] = await Promise.all([
        supabase.from("join_requests").select("bar_id, display_name, status").in("bar_id", barIds).eq("status", "pending"),
        supabase.from("drinks").select("bar_id, name, quantity, min_quantity, archived").in("bar_id", barIds),
        supabase.from("stock_logs").select("bar_id, log_type, log_date").in("bar_id", barIds).eq("log_date", today()).eq("log_type", "closing"),
        supabase.from("audit_logs").select("bar_id, action, detail, created_at").in("bar_id", barIds).gte("created_at", since).order("created_at", { ascending: false })
      ]);
      const items = []; const counts = {};
      const bump = id => { counts[id] = (counts[id] || 0) + 1; };
      (reqRes.data || []).forEach(r => {
        if (roleByBar[r.bar_id] === "supervisor") {
          items.push({ barId: r.bar_id, bar: nameByBar[r.bar_id], icon: "👤", text: (r.display_name || "Someone") + " requested to join", kind: "request" });
          bump(r.bar_id);
        }
      });
      const lowByBar = {};
      (drinkRes.data || []).forEach(d => {
        if (!d.archived && d.quantity <= d.min_quantity) { lowByBar[d.bar_id] = lowByBar[d.bar_id] || []; lowByBar[d.bar_id].push(d.name); }
      });
      Object.keys(lowByBar).forEach(bid => {
        if (roleByBar[bid] === "viewer") return;
        const names = lowByBar[bid];
        const text = names.length === 1 ? names[0] + " is running low" : names.length + " drinks are running low (" + names.slice(0, 3).join(", ") + (names.length > 3 ? "..." : "") + ")";
        items.push({ barId: bid, bar: nameByBar[bid], icon: "📉", text, kind: "stock" });
        bump(bid);
      });
      const loggedBars = new Set((logRes.data || []).map(l => l.bar_id));
      barIds.forEach(bid => {
        if (roleByBar[bid] === "viewer") return;
        if (loggedBars.has(bid)) {
          items.push({ barId: bid, bar: nameByBar[bid], icon: "✅", text: "Today's closing stock has been logged", kind: "log" });
        } else {
          items.push({ barId: bid, bar: nameByBar[bid], icon: "🕗", text: "Closing stock not logged yet today", kind: "log" });
        }
      });
      (auditRes.data || []).forEach(a => {
        if (a.action === "Member left" && roleByBar[a.bar_id] !== "viewer") {
          items.push({ barId: a.bar_id, bar: nameByBar[a.bar_id], icon: "🚪", text: a.detail || "A member left the bar", kind: "member" });
          bump(a.bar_id);
        }
      });
      setNotifs(items); setNotifCounts(counts);
    } catch (e) { console.error("Notifications failed:", e); }
  }

  useEffect(() => { loadBars(); }, []);

  const ownedCount = bars.filter(p => p.is_owner).length;
  const joinedCount = bars.filter(p => !p.is_owner).length;

  async function createBar() {
    if (!barName.trim()) { setErr("Enter a bar name."); return; }
    if (ownedCount >= 5) { setErr("You are currently at your bar limit."); return; }
    setSaving(true); setErr("");
    try {
      const code = genBarCode(barName);
      const { data: bar, error: barErr } = await supabase.from("bars").insert({ name: sanitise(barName, 60), owner_id: user.id, bar_code: code }).select().single();
      if (barErr) throw barErr;
      const name = sanitise(user.user_metadata?.full_name || user.email, 50);
      const { error: profErr } = await supabase.from("profiles").insert({ id: user.id, bar_id: bar.id, display_name: name, role: "supervisor", is_owner: true });
      if (profErr) {
        // Don't leave an orphan bar behind
        await supabase.from("bars").delete().eq("id", bar.id);
        throw new Error("Could not create your Admin profile: " + profErr.message);
      }
      setBarName(""); setDisplayName(""); setShowCreate(false);
      loadBars();
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function joinBar() {
    if (!barCode.trim()) { setErr("Enter a bar code."); return; }
    if (joinedCount >= 5) { setErr("You are currently at your bar limit."); return; }
    setSaving(true); setErr("");
    try {
      const raw = barCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const code = raw.slice(0, 3) + "-" + raw.slice(3);
      const { data: bar, error: barErr } = await supabase.from("bars").select("*").eq("bar_code", code).single();
      if (barErr || !bar) throw new Error("Bar not found. Check the code and try again.");
      const already = bars.find(p => p.bar_id === bar.id);
      if (already) throw new Error("You are already part of this bar.");
      const { data: viewers } = await supabase.from("profiles").select("id").eq("bar_id", bar.id).eq("role", "viewer");
      if ((viewers || []).length >= 5) throw new Error("This bar has reached its maximum viewer capacity.");
      const { data: existing } = await supabase.from("join_requests").select("id,status").eq("bar_id", bar.id).eq("user_id", user.id).maybeSingle();
      if (existing?.status === "pending") throw new Error("You already have a pending request for this bar.");
      const name = sanitise(user.user_metadata?.full_name || user.email || "", 50);
      const { error: reqErr } = await supabase.from("join_requests").insert({ bar_id: bar.id, user_id: user.id, display_name: name });
      if (reqErr) throw reqErr;
      setBarCode(""); setDisplayName(""); setShowJoin(false);
      alert("Join request sent! Wait for the Admin to approve.");
    } catch(e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingScreen />;

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: BG, minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ background: TEAL, padding: "20px 18px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://raw.githubusercontent.com/amayindin/Barnacular/main/logo.png" alt="Barnakular" style={{ width: 40, height: 40, objectFit: "contain" }} />
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 22, color: WHITE, fontWeight: 400 }}>Barnakular</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{user.email}</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, color: WHITE, fontSize: 12, fontWeight: 600, padding: "7px 12px", cursor: "pointer" }}>Sign Out</button>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Bar limit info */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: WHITE, borderRadius: 12, padding: "12px", textAlign: "center", boxShadow: SHADOW }}>
            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: TEAL }}>{ownedCount}/5</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Bars Owned</div>
          </div>
          <div style={{ flex: 1, background: WHITE, borderRadius: 12, padding: "12px", textAlign: "center", boxShadow: SHADOW }}>
            <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: BLUE }}>{joinedCount}/5</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Bars Joined</div>
          </div>
        </div>

        {/* Notifications */}
        {notifs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED }}>Notifications</div>
              <button onClick={loadBars} style={{ background: "none", border: "none", color: TEAL, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>↻ Refresh</button>
            </div>
            <div style={{ background: WHITE, borderRadius: 16, boxShadow: SHADOW, overflow: "hidden" }}>
              {notifs.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderBottom: i < notifs.length - 1 ? "1px solid " + BORDER : "none" }}>
                  <div style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: TXT, lineHeight: 1.4 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{n.bar}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bar cards */}
        {bars.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🍺</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: TXT, marginBottom: 6 }}>No bars yet</div>
            <div style={{ fontSize: 13 }}>Create or join a bar to get started</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Your Bars</div>
            {bars.map(p => {
              const memberCount = 0;
              const roleColor = ROLE_COLOR[p.role] || BLUE;
              return (
                <button key={p.bar_id} onClick={() => onSelectBar(p)}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "16px", marginBottom: 10, background: WHITE, border: "1px solid " + BORDER, borderRadius: 16, cursor: "pointer", boxShadow: SHADOW, textAlign: "left" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: roleColor + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginRight: 14, flexShrink: 0 }}>
                    🍺
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: TXT, marginBottom: 4 }}>{p.bars?.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={C.tag(roleColor)}>{ROLE_LABEL[p.role] || p.role}</span>
                      <span style={{ fontSize: 11, color: MUTED }}>{p.bars?.bar_code}</span>
                    </div>
                  </div>
                  {notifCounts[p.bar_id] > 0 && (
                    <div style={{ minWidth: 20, height: 20, borderRadius: 10, background: ERR, color: WHITE, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px", marginLeft: 8 }}>{notifCounts[p.bar_id]}</div>
                  )}
                  <div style={{ color: MUTED, fontSize: 20, marginLeft: 8 }}>›</div>
                </button>
              );
            })}
          </>
        )}

        {/* Create bar modal */}
        {showCreate && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: WHITE, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Create a Bar</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>You will be assigned as Admin</div>
              {err && <div style={{ background: ERR + "12", border: "1px solid " + ERR + "33", borderRadius: 10, color: ERR, fontSize: 13, padding: "10px 13px", marginBottom: 13 }}>{err}</div>}
              <div style={{ marginBottom: 20 }}>
                <label style={C.lbl}>Bar Name</label>
                <input style={C.inp} placeholder="e.g. The Gold Bar" value={barName} onChange={e => setBarName(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={createBar} disabled={saving} style={{ ...C.btn("primary"), flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? "Creating..." : "Create Bar"}</button>
                <button onClick={() => { setShowCreate(false); setErr(""); }} style={{ ...C.btn("ghost"), flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Join bar modal */}
        {showJoin && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{ background: WHITE, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Join a Bar</div>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>Enter the bar code to send a join request</div>
              {err && <div style={{ background: ERR + "12", border: "1px solid " + ERR + "33", borderRadius: 10, color: ERR, fontSize: 13, padding: "10px 13px", marginBottom: 13 }}>{err}</div>}
              <div style={{ marginBottom: 20 }}>
                <label style={C.lbl}>Bar Code</label>
                <input style={{ ...C.inp, letterSpacing: 3, textTransform: "uppercase" }} placeholder="e.g. QUA-2847" value={barCode} onChange={e => setBarCode(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={joinBar} disabled={saving} style={{ ...C.btn("primary"), flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? "Sending..." : "Send Request"}</button>
                <button onClick={() => { setShowJoin(false); setErr(""); }} style={{ ...C.btn("ghost"), flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={() => { setShowCreate(true); setErr(""); }}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: TEAL, color: WHITE, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Create Bar
          </button>
          <button onClick={() => { setShowJoin(true); setErr(""); }}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: "1px solid " + BORDER, background: WHITE, color: TEAL, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Join Bar
          </button>
        </div>
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
  const [selectedBarProfile, setSelectedBarProfile] = useState(null);

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
    // Check if user has any bar profiles
    const { data: profiles } = await supabase.from("profiles").select("*, bars(*)").eq("id", u.id).not("bar_id", "is", null);
    if (inviteToken) {
      setAppState("invite");
    } else if (!profiles || profiles.length === 0) {
      setAppState("home");
    } else {
      setAppState("home");
    }
  }

  function handleAuth(u) { setUser(u); loadUserData(u); }
  function handleDone({ bar: b, role, displayName }) { setAppState("home"); }
  function handleUpdate({ displayName, barName }) { setProfile(p => ({ ...p, display_name: displayName })); if (barName) setBar(b => ({ ...b, name: barName })); }
  async function handleLogout() { await supabase.auth.signOut(); }
  function handleSelectBar(barProfile) {
    setSelectedBarProfile(barProfile);
    setProfile({ ...barProfile, display_name: barProfile.display_name });
    setBar(barProfile.bars);
    setTab(0);
    setAppState("app");
  }
  function handleBackToHome() { setAppState("home"); setSelectedBarProfile(null); }

  if (appState === "loading") return <LoadingScreen />;
  if (appState === "auth") return <AuthScreen onAuth={handleAuth} />;
  if (appState === "home") return <HomeScreen user={user} onSelectBar={handleSelectBar} onSignOut={handleLogout} />;
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
      <style>{"@keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}} .tabwrap{animation:fadeUp 0.22s ease} button{-webkit-tap-highlight-color:transparent;transition:transform 0.08s ease,opacity 0.15s ease} button:active{transform:scale(0.97)} input{transition:border-color 0.15s ease,box-shadow 0.15s ease} input:focus{border-color:" + TEAL + " !important;box-shadow:0 0 0 3px " + TEAL + "22} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}"}</style>
      <div style={{ padding: "13px 18px 11px", background: WHITE, borderBottom: "1px solid " + BORDER, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={handleBackToHome} style={{ background: "none", border: "none", cursor: "pointer", color: TEAL, fontSize: 20, padding: 0, lineHeight: 1 }}>‹</button>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 400, color: TXT }}>{bar?.name || "Barnakular"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={C.tag(ROLE_COLOR[role] || BLUE)}>{displayName}</span>
              <span style={{ fontSize: 10, color: MUTED }}>{"· " + (ROLE_LABEL[role] || role)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tabwrap" key={tab} style={{ flex: 1, padding: "16px 14px 10px", overflowY: "auto" }}>
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
