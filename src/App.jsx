import { useState, useEffect, useCallback } from "react";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://uqqztjanagmoccfpcyxa.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxcXp0amFuYWdtb2NjZnBjeXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI5MzIsImV4cCI6MjA5Nzg4ODkzMn0.agQ-wupnb6gIe6WxiLmwQu2Wu4F6R5rA8Xs8HuMnNqw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Palette ───────────────────────────────────────────────────────────────────
const TEAL = "#1B3A4B", AMBER = "#C8861A", WHITE = "#FFFFFF", BG = "#F6F7F9";
const TXT = "#1A1A1A", MUTED = "#8A8A8A", OK = "#27AE60", ERR = "#E03131";
const BORDER = "#E5E7EB", INP = "#F2F4F6", SHADOW = "0 2px 10px rgba(0,0,0,0.07)";
const BLUE = "#3B7DD8";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = n => "₦" + Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const mkey = d => (d || today()).slice(0, 7);
const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtTs = t => new Date(t).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ── Styles ────────────────────────────────────────────────────────────────────
const C = {
  card: { background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 15px", marginBottom: 12, boxShadow: SHADOW },
  inp: { width: "100%", background: INP, border: `1px solid ${BORDER}`, borderRadius: 10, color: TXT, padding: "11px 13px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  lbl: { fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 5, display: "block" },
  btn: (v = "primary") => ({ width: "100%", padding: "13px", borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", background: v === "primary" ? TEAL : v === "amber" ? AMBER : v === "ok" ? OK : v === "err" ? ERR : v === "google" ? WHITE : INP, color: v === "google" ? TXT : v === "ghost" ? MUTED : WHITE, border: v === "ghost" ? `1px solid ${BORDER}` : v === "google" ? `1px solid ${BORDER}` : "none", boxShadow: v === "google" ? SHADOW : "none" }),
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

// ── Auth Screen ───────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
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
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name.trim() } }
        });
        if (error) throw error;
        setMsg("Check your email to confirm your account, then log in.");
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true); setErr("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 36px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 46, fontWeight: 400, color: TXT, letterSpacing: -1 }}>Barnakular</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Bar Management System</div>
      </div>

      {msg && <div style={{ background: OK + "15", border: `1px solid ${OK}33`, borderRadius: 10, color: OK, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%", textAlign: "center", fontWeight: 500 }}>{msg}</div>}
      {err && <div style={{ background: ERR + "12", border: `1px solid ${ERR}33`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%", textAlign: "center" }}>{err}</div>}

      {/* Google button */}
      <button onClick={handleGoogle} disabled={loading} style={{ ...C.btn("google"), marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14 }}>
        <span style={{ fontSize: 18 }}>G</span>
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 700, letterSpacing: 1.5 }}>OR</span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", background: INP, borderRadius: 10, padding: 4, width: "100%", marginBottom: 16 }}>
        {["login", "signup"].map(m => (
          <button key={m} onClick={() => { setMode(m); setErr(""); setMsg(""); }}
            style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", background: mode === m ? WHITE : "transparent", color: mode === m ? TEAL : MUTED, boxShadow: mode === m ? SHADOW : "none" }}>
            {m === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
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
        <input style={{ ...C.inp, paddingRight: 44 }} type={showPass ? "text" : "password"} placeholder="••••••••" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleEmail()} />
        <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 13, bottom: 11, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 16 }}>{showPass ? "🙈" : "👁"}</button>
      </div>

      <button onClick={handleEmail} disabled={loading} style={{ ...C.btn("primary"), opacity: loading ? 0.6 : 1 }}>
        {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
      </button>

      <div style={{ marginTop: 20, textAlign: "center", fontSize: 13, color: MUTED }}>
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}
          style={{ color: TEAL, fontWeight: 600, cursor: "pointer" }}>
          {mode === "login" ? "Sign up" : "Log in"}
        </span>
      </div>
    </div>
  );
}

// ── Onboarding: Create Bar ────────────────────────────────────────────────────
function CreateBar({ user, onDone }) {
  const [barName, setBarName] = useState("");
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function create() {
    if (!barName.trim()) { setErr("Please enter your bar name."); return; }
    if (!displayName.trim()) { setErr("Please enter your display name."); return; }
    setLoading(true); setErr("");
    try {
      // Create bar
      const { data: bar, error: barErr } = await supabase
        .from("bars").insert({ name: barName.trim(), owner_id: user.id }).select().single();
      if (barErr) throw barErr;

      // Update profile
      const { error: profErr } = await supabase.from("profiles")
        .upsert({ id: user.id, bar_id: bar.id, display_name: displayName.trim(), role: "supervisor" });
      if (profErr) throw profErr;

      onDone({ bar, role: "supervisor", displayName: displayName.trim() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 40 }}>🍺</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 28, fontWeight: 400, color: TXT, marginTop: 8 }}>Welcome to Barnakular</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>Let's set up your bar. This only takes a moment.</div>
      </div>

      {err && <div style={{ background: ERR + "12", border: `1px solid ${ERR}33`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 14, width: "100%" }}>{err}</div>}

      <div style={{ width: "100%", marginBottom: 14 }}>
        <label style={C.lbl}>Your Display Name</label>
        <input style={C.inp} placeholder="e.g. Chukwuemeka" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </div>

      <div style={{ width: "100%", marginBottom: 24 }}>
        <label style={C.lbl}>Bar Name</label>
        <input style={C.inp} placeholder="e.g. The Gold Bar, Club Luxe" value={barName} onChange={e => setBarName(e.target.value)} onKeyDown={e => e.key === "Enter" && create()} />
        <div style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>You will be assigned as Supervisor of this bar.</div>
      </div>

      <button onClick={create} disabled={loading} style={{ ...C.btn("primary"), opacity: loading ? 0.6 : 1 }}>
        {loading ? "Creating..." : "Create My Bar →"}
      </button>
    </div>
  );
}

// ── Onboarding: Join via Invite ───────────────────────────────────────────────
function JoinBar({ user, token, onDone }) {
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || "");
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadInvite() {
      const { data, error } = await supabase.from("invites").select("*, bars(name)").eq("token", token).eq("used", false).single();
      if (error || !data) { setErr("This invite link is invalid or has already been used."); }
      else setInvite(data);
      setLoading(false);
    }
    loadInvite();
  }, [token]);

  async function join() {
    if (!displayName.trim()) { setErr("Please enter your display name."); return; }
    setJoining(true); setErr("");
    try {
      const { error: profErr } = await supabase.from("profiles")
        .upsert({ id: user.id, bar_id: invite.bar_id, display_name: displayName.trim(), role: invite.role });
      if (profErr) throw profErr;

      await supabase.from("invites").update({ used: true }).eq("id", invite.id);

      const { data: bar } = await supabase.from("bars").select().eq("id", invite.bar_id).single();
      onDone({ bar, role: invite.role, displayName: displayName.trim() });
    } catch (e) {
      setErr(e.message);
    } finally {
      setJoining(false);
    }
  }

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}><div style={{ color: MUTED }}>Loading invite...</div></div>;

  return (
    <div style={{ minHeight: "100vh", background: WHITE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 40 }}>🍺</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 26, color: TXT, marginTop: 8 }}>You've been invited</div>
        {invite && <div style={{ fontSize: 14, color: MUTED, marginTop: 8 }}>Join <strong style={{ color: TXT }}>{invite.bars?.name}</strong> as <span style={C.tag(invite.role === "supervisor" ? AMBER : OK)}>{invite.role}</span></div>}
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

// ── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: WHITE, fontFamily: "Georgia,serif" }}>
      <div style={{ fontSize: 36, fontWeight: 400, color: TXT, marginBottom: 16 }}>Barnakular</div>
      <div style={{ width: 32, height: 32, border: `3px solid ${BORDER}`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Shared: PLCard ────────────────────────────────────────────────────────────
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
  const showMoney = true;

  async function loadDrinks() {
    const { data } = await supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false).order("name");
    setDrinks(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadDrinks();
    // Real-time subscription
    const sub = supabase.channel("drinks").on("postgres_changes", { event: "*", schema: "public", table: "drinks", filter: `bar_id=eq.${barId}` }, loadDrinks).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  async function addDrink() {
    if (!newRow.name.trim()) { setErr("Drink name required."); return; }
    const { error } = await supabase.from("drinks").insert({
      bar_id: barId, name: newRow.name.trim(),
      buy_price: parseFloat(newRow.buy_price) || 0,
      quantity: parseInt(newRow.quantity) || 0,
      min_quantity: parseInt(newRow.min_quantity) || 3,
      price_pending: true
    });
    if (error) { setErr(error.message); return; }
    setNewRow({ name: "", buy_price: "", quantity: "", min_quantity: "" }); setErr("");
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Added drink", detail: newRow.name.trim() });
  }

  async function savePrice(id) {
    const s = parseFloat(priceData.sell_price);
    const d = drinks.find(x => x.id === id);
    if (isNaN(s) || s <= d.buy_price) { setErr("Sell price must exceed buy price."); return; }
    const { error } = await supabase.from("drinks").update({ sell_price: s, price_pending: false }).eq("id", id);
    if (error) { setErr(error.message); return; }
    setPriceId(null); setErr("");
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: `Set sell price of ${d.name}`, detail: fmt(s) });
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
      {/* Date/time bar */}
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

      {/* Low stock */}
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

      {/* Pending price cards */}
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
                  <input style={{ ...C.inp, marginBottom: 13 }} type="number" placeholder="0.00"
                    value={priceData.sell_price ?? ""} onChange={e => setPriceData(p => ({ ...p, sell_price: e.target.value }))} autoFocus />
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

      {/* Manager pending note */}
      {canEdit && pending.length > 0 && (
        <div style={{ background: "#FFFBF0", border: `1px solid ${AMBER}33`, borderRadius: 12, padding: "11px 14px", marginBottom: 13, fontSize: 13, color: AMBER, fontWeight: 500 }}>
          ⏳ {pending.length} drink{pending.length !== 1 ? "s" : ""} awaiting sell price from Supervisor.
        </div>
      )}

      {err && !priceId && <div style={{ background: "#FFF5F5", border: `1px solid ${ERR}44`, borderRadius: 10, color: ERR, fontSize: 13, padding: "11px 14px", marginBottom: 12 }}>{err}</div>}

      <div style={C.sec}>Stock Register <div style={C.line} /></div>

      {/* Stock table */}
      <div style={C.tw}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
          <thead><tr>
            <th style={C.th()}>Drink Name</th>
            <th style={C.th()}>Qty</th>
            <th style={C.th()}>Min</th>
            <th style={C.th()}>Buy ₦</th>
            <th style={C.th(TEAL)}>Sell ₦</th>
            <th style={C.th()}>Stock Value</th>
            <th style={C.th(TEAL)}>Sell Value</th>
            <th style={C.th()}></th>
          </tr></thead>
          <tbody>
            {drinks.length === 0 && (
              <tr><td colSpan={8} style={{ ...C.td(), textAlign: "center", color: MUTED, padding: "24px 0" }}>No drinks yet{canEdit ? " — add below ↓" : "."}</td></tr>
            )}
            {drinks.map(d => {
              const isLow = d.quantity <= d.min_quantity;
              const stockVal = d.quantity * d.buy_price;
              const sellVal = d.quantity * d.sell_price;
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
                  <td style={C.td()}>{d.price_pending ? "—" : fmt(stockVal)}</td>
                  <td style={{ ...C.td(), color: TEAL }}>{d.price_pending ? "—" : fmt(sellVal)}</td>
                  <td style={{ ...C.td(), whiteSpace: "nowrap" }}>
                    {canEdit && <button onClick={() => setRestockId(d.id)} style={{ background: OK + "18", color: OK, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 3 }}>+</button>}
                    {canPrice && !d.price_pending && <button onClick={() => { setPriceId(d.id === priceId ? null : d.id); setPriceData({ sell_price: d.sell_price }); }} style={{ background: AMBER + "18", color: AMBER, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", marginRight: 3 }}>₦</button>}
                    <button onClick={() => archiveDrink(d.id)} style={{ background: ERR + "18", color: ERR, border: "none", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>Archive</button>
                  </td>
                </tr>
              );
            })}

            {/* New row — Manager only */}
            {canEdit && (
              <tr style={{ background: "#F5F7F9" }}>
                <td style={{ padding: "8px 8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12 }} placeholder="Drink name" value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} onKeyDown={e => e.key === "Enter" && addDrink()} /></td>
                <td style={{ padding: "8px 8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 72 }} type="number" placeholder="Qty" value={newRow.quantity} onChange={e => setNewRow(p => ({ ...p, quantity: e.target.value }))} /></td>
                <td style={{ padding: "8px 8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 54 }} type="number" placeholder="Min" value={newRow.min_quantity} onChange={e => setNewRow(p => ({ ...p, min_quantity: e.target.value }))} /></td>
                <td style={{ padding: "8px 8px" }}><input style={{ ...C.inp, padding: "6px 9px", fontSize: 12, width: 90 }} type="number" placeholder="Buy ₦" value={newRow.buy_price} onChange={e => setNewRow(p => ({ ...p, buy_price: e.target.value }))} /></td>
                <td style={{ padding: "8px", color: MUTED, fontSize: 11 }}>Supervisor sets</td>
                <td colSpan={2} style={C.td()}></td>
                <td style={{ padding: "8px 8px" }}><button onClick={addDrink} style={{ background: TEAL, color: WHITE, border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Add</button></td>
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
              <td style={C.td()}></td>
            </tr></tfoot>
          )}
        </table>
      </div>

      {/* Restock modal */}
      {restockId && (() => {
        const d = drinks.find(x => x.id === restockId);
        return (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: WHITE, borderRadius: 20, padding: 22, width: "100%", maxWidth: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.16)" }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Restock — {d?.name}</div>
              <div style={{ marginBottom: 16 }}>
                <label style={C.lbl}>Units to Add</label>
                <input style={C.inp} type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="e.g. 12" autoFocus />
              </div>
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
  const [pastDates, setPastDates] = useState([]);
  const [expandedDate, setExpandedDate] = useState(null);

  const canLog = role === "manager";
  const isLocked = date < today() && role === "manager";

  useEffect(() => {
    async function load() {
      const [{ data: drinksData }, { data: logsData }] = await Promise.all([
        supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false).order("name"),
        supabase.from("stock_logs").select("*").eq("bar_id", barId).order("log_date", { ascending: false })
      ]);
      setDrinks(drinksData || []);
      setLogs(logsData || []);
      const dates = [...new Set((logsData || []).map(l => l.log_date))].sort().reverse();
      setPastDates(dates);
      setLoading(false);
    }
    load();

    const sub = supabase.channel("logs").on("postgres_changes", { event: "*", schema: "public", table: "stock_logs", filter: `bar_id=eq.${barId}` }, load).subscribe();
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
        // Save opening (locked/auto)
        const existingOpen = logs.find(l => l.drink_id === d.id && l.log_type === "opening" && l.log_date === date);
        if (!existingOpen) {
          await supabase.from("stock_logs").insert({ bar_id: barId, drink_id: d.id, log_date: date, opening_qty: opening, log_type: "opening", recorded_by: recorderName });
        }
        // Save closing
        const existingClose = logs.find(l => l.drink_id === d.id && l.log_type === "closing" && l.log_date === date);
        if (existingClose) {
          await supabase.from("stock_logs").update({ closing_qty: parseFloat(val), recorded_by: recorderName }).eq("id", existingClose.id);
        } else {
          await supabase.from("stock_logs").insert({ bar_id: barId, drink_id: d.id, log_date: date, closing_qty: parseFloat(val), log_type: "closing", recorded_by: recorderName });
        }
      }
      await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Saved closing stock", detail: `for ${date}` });
      setCloseEnt({});
      setShowCash(true);
    } finally {
      setSaving(false);
    }
  }

  async function saveCash() {
    const amount = parseFloat(cash);
    if (isNaN(amount) || amount < 0) { alert("Enter a valid cash amount."); return; }
    await supabase.from("cash_records").upsert({ bar_id: barId, record_date: date, amount, recorded_by: recorderName });
    setCash(""); setShowCash(false);
    alert("Cash recorded successfully!");
  }

  if (loading) return <div style={C.empty}>Loading logs...</div>;

  const hasTodayClosing = drinks.some(d => getClosing(d.id) !== null);

  return (
    <div>
      <div style={C.sec}>Daily Stock Log <div style={C.line} /></div>

      <div style={{ ...C.card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={C.lbl}>Date</label>
          <input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={C.lbl}>Stock Taken By</label>
          <input style={C.inp} value={recorderName} onChange={e => setRecorderName(e.target.value)} placeholder="Name" />
        </div>
      </div>

      {isLocked && <div style={{ background: "#FFF5F5", border: `1px solid ${ERR}33`, borderRadius: 12, padding: "11px 14px", marginBottom: 13, fontSize: 13, color: ERR }}>🔒 Past records are locked.</div>}

      {drinks.length === 0 ? <div style={C.empty}>No drinks in stock register.</div> : (
        <>
          <div style={C.tw}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
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
                      <div style={{ fontSize: 9, color: MUTED }}>auto</div>
                    </td>
                    <td style={C.td(TEAL)}>
                      {canLog && !isLocked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <input style={{ ...C.inp, padding: "5px 7px", fontSize: 12, width: 64, textAlign: "center" }}
                            type="number" placeholder={closing !== null ? String(closing) : "—"}
                            value={closeEnt[d.id] ?? ""}
                            onChange={e => setCloseEnt(p => ({ ...p, [d.id]: e.target.value }))} />
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

          {/* Cash modal */}
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

      {/* Past records */}
      <div style={C.sec}>Past Records <div style={C.line} /></div>
      {pastDates.filter(d => d !== today()).length === 0 ? <div style={C.empty}>No past records yet.</div> : (
        pastDates.filter(d => d !== today()).map(d => {
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
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 280 }}>
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
        })
      )}
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
  const canView = true;

  async function load() {
    const { data } = await supabase.from("expenses").select("*").eq("bar_id", barId).order("expense_date", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const sub = supabase.channel("expenses").on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `bar_id=eq.${barId}` }, load).subscribe();
    return () => supabase.removeChannel(sub);
  }, [barId]);

  async function add() {
    if (!desc.trim() || !amount) { setErr("Fill in all fields."); return; }
    const { error } = await supabase.from("expenses").insert({ bar_id: barId, category, description: desc.trim(), amount: parseFloat(amount), expense_date: date, created_by: userId });
    if (error) { setErr(error.message); return; }
    await supabase.from("audit_logs").insert({ bar_id: barId, user_id: userId, role, action: "Added expense", detail: `${category}: ${desc}` });
    setDesc(""); setAmount(""); setErr("");
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  if (loading) return <div style={C.empty}>Loading expenses...</div>;

  return (
    <div>
      <div style={C.sec}>Expenses <div style={C.line} /></div>

      {role === "supervisor" && (
        <div style={{ background: "#FFFBF0", border: `1px solid ${AMBER}33`, borderRadius: 12, padding: "10px 14px", marginBottom: 13, fontSize: 12, color: AMBER, fontWeight: 500 }}>
          👁 Viewing all expense records. Only Managers can add expenses.
        </div>
      )}

      {canAdd && (
        <div style={C.card}>
          <div style={{ marginBottom: 11 }}>
            <label style={C.lbl}>Date</label>
            <input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
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
          <div style={{ marginBottom: 11 }}>
            <label style={C.lbl}>Description</label>
            <input style={C.inp} value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Generator fuel, Staff wages" />
          </div>
          <div style={{ marginBottom: 11 }}>
            <label style={C.lbl}>Amount (₦)</label>
            <input style={C.inp} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          {err && <div style={{ color: ERR, fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <button style={C.btn("primary")} onClick={add}>+ Add Expense</button>
        </div>
      )}

      {expenses.length === 0 ? <div style={C.empty}>No expenses recorded yet.</div> : (
        <>
          {expenses.map(e => (
            <div key={e.id} style={C.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.description}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <span style={C.tag(TEAL)}>{e.category}</span>
                    <span style={{ fontSize: 11, color: MUTED }}>{e.expense_date}</span>
                  </div>
                </div>
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

  async function loadReport(type, key) {
    setLoading(true);
    try {
      const [{ data: drinks }, { data: logs }, { data: expenses }, { data: restocks }, { data: cash }] = await Promise.all([
        supabase.from("drinks").select("*").eq("bar_id", barId).eq("archived", false),
        supabase.from("stock_logs").select("*").eq("bar_id", barId),
        supabase.from("expenses").select("*").eq("bar_id", barId),
        supabase.from("restocks").select("*, drinks(name, buy_price)").eq("bar_id", barId),
        supabase.from("cash_records").select("*").eq("bar_id", barId),
      ]);

      if (type === "daily") {
        const dayLogs = (logs || []).filter(l => l.log_date === key);
        const dayExp = (expenses || []).filter(e => e.expense_date === key);
        const dayRestocks = (restocks || []).filter(r => r.restock_date === key);
        const dayCash = (cash || []).find(c => c.record_date === key);

        const drinkStats = (drinks || []).map(d => {
          const o = dayLogs.find(l => l.drink_id === d.id && l.log_type === "opening")?.opening_qty;
          const c = dayLogs.find(l => l.drink_id === d.id && l.log_type === "closing")?.closing_qty;
          const sold = o !== undefined && c !== undefined ? Math.max(0, o - c) : 0;
          return { ...d, sold, rev: sold * d.sell_price, profit: sold * (d.sell_price - d.buy_price), closing: c ?? null };
        });

        const totalRev = drinkStats.reduce((s, d) => s + d.rev, 0);
        const totalProfit = drinkStats.reduce((s, d) => s + d.profit, 0);
        const totalExp = dayExp.reduce((s, e) => s + Number(e.amount), 0);
        const restockVal = dayRestocks.reduce((s, r) => s + r.quantity * (r.drinks?.buy_price || 0), 0);

        setData({ type: "daily", date: key, drinkStats, dayExp, dayRestocks, dayCash, totalRev, totalProfit, totalExp, restockVal });
      } else {
        const mLogs = (logs || []).filter(l => l.log_date?.startsWith(key));
        const mExp = (expenses || []).filter(e => e.expense_date?.startsWith(key));
        const mRestocks = (restocks || []).filter(r => r.restock_date?.startsWith(key));
        const mCash = (cash || []).filter(c => c.record_date?.startsWith(key));

        const drinkStats = (drinks || []).map(d => {
          let sold = 0;
          const dates = [...new Set(mLogs.map(l => l.log_date))];
          dates.forEach(dt => {
            const o = mLogs.find(l => l.drink_id === d.id && l.log_type === "opening" && l.log_date === dt)?.opening_qty;
            const c = mLogs.find(l => l.drink_id === d.id && l.log_type === "closing" && l.log_date === dt)?.closing_qty;
            if (o !== undefined && c !== undefined) sold += Math.max(0, o - c);
          });
          return { ...d, sold, rev: sold * d.sell_price, profit: sold * (d.sell_price - d.buy_price) };
        });

        const totalRev = drinkStats.reduce((s, d) => s + d.rev, 0);
        const totalCOGS = drinkStats.reduce((s, d) => s + d.sold * d.buy_price, 0);
        const totalExp = mExp.reduce((s, e) => s + Number(e.amount), 0);
        const restockVal = mRestocks.reduce((s, r) => s + r.quantity * (r.drinks?.buy_price || 0), 0);
        const totalCash = mCash.reduce((s, c) => s + Number(c.amount), 0);
        const daysLogged = [...new Set(mLogs.map(l => l.log_date))].length;

        // Expenses by category
        const byCategory = EXPENSE_CATS.reduce((acc, cat) => {
          acc[cat] = mExp.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
          return acc;
        }, {});

        setData({ type: "monthly", month: key, drinkStats, mExp, mRestocks, totalRev, totalCOGS, totalExp, restockVal, totalCash, daysLogged, byCategory });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReport(view, view === "daily" ? date : month); }, [view, date, month]);

  const seg = v => ({ flex: 1, padding: "11px", border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer", background: view === v ? TEAL : INP, color: view === v ? WHITE : MUTED, borderRadius: 10 });

  return (
    <div>
      <div style={{ display: "flex", gap: 6, background: INP, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        <button style={seg("daily")} onClick={() => setView("daily")}>📅 Daily</button>
        <button style={seg("monthly")} onClick={() => setView("monthly")}>📊 Monthly</button>
      </div>

      {view === "daily" && (
        <div style={C.card}>
          <label style={C.lbl}>Select Day</label>
          <input style={C.inp} type="date" value={date} onChange={e => setDate(e.target.value)} max={today()} />
        </div>
      )}
      {view === "monthly" && (
        <div style={C.card}>
          <label style={C.lbl}>Select Month</label>
          <input style={C.inp} type="month" value={month} onChange={e => setMonth(e.target.value)} />
        </div>
      )}

      {loading && <div style={C.empty}>Loading report...</div>}

      {!loading && data && data.type === "daily" && (
        <>
          <div style={{ ...C.card, borderLeft: `4px solid ${TEAL}` }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: TEAL, marginBottom: 12 }}>Day Summary — {fmtDate(data.date)}</div>
            <div style={C.row}><span style={C.slbl}>Total Sales</span><span style={C.sval(TEAL)}>{fmt(data.totalRev)}</span></div>
            <div style={C.row}><span style={C.slbl}>Total Profit</span><span style={C.sval(data.totalProfit >= 0 ? OK : ERR)}>{fmt(data.totalProfit)}</span></div>
            <div style={C.row}><span style={C.slbl}>Total Expenses</span><span style={C.sval(ERR)}>{fmt(data.totalExp)}</span></div>
            <div style={C.row}><span style={C.slbl}>Net</span><span style={C.sval(data.totalProfit - data.totalExp >= 0 ? OK : ERR)}>{fmt(data.totalProfit - data.totalExp)}</span></div>
            {data.dayCash && <><div style={C.div} /><div style={C.row}><span style={C.slbl}>Cash Collected</span><span style={C.sval(OK)}>{fmt(data.dayCash.amount)}</span></div></>}
          </div>

          {/* Sales breakdown */}
          <div style={C.sec}>Sales Breakdown <div style={C.line} /></div>
          <div style={C.tw}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
              <thead><tr>
                <th style={C.th()}>Drink</th>
                <th style={C.th(AMBER)}>Sold</th>
                <th style={C.th(TEAL)}>Revenue</th>
                <th style={C.th(OK)}>Profit</th>
                <th style={C.th()}>Closing</th>
              </tr></thead>
              <tbody>{data.drinkStats.sort((a, b) => b.sold - a.sold).map(d => (
                <tr key={d.id} style={{ opacity: d.sold === 0 ? 0.45 : 1 }}>
                  <td style={{ ...C.td(), fontWeight: 600 }}>{d.name}</td>
                  <td style={{ ...C.td(d.sold > 0 ? AMBER : MUTED), fontFamily: "monospace", fontWeight: 700 }}>{d.sold}</td>
                  <td style={C.td(d.sold > 0 ? TEAL : MUTED)}>{fmt(d.rev)}</td>
                  <td style={C.td(d.profit > 0 ? OK : d.profit < 0 ? ERR : MUTED)}>{fmt(d.profit)}</td>
                  <td style={{ ...C.td(), fontFamily: "monospace" }}>{d.closing ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Restock report */}
          {data.dayRestocks.length > 0 && (
            <>
              <div style={C.sec}>Restock Report <div style={C.line} /></div>
              <div style={C.tw}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 260 }}>
                  <thead><tr>
                    <th style={C.th()}>Drink</th>
                    <th style={C.th()}>Units Added</th>
                    <th style={C.th()}>Value</th>
                  </tr></thead>
                  <tbody>{data.dayRestocks.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...C.td(), fontWeight: 600 }}>{r.drinks?.name}</td>
                      <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700 }}>{r.quantity}</td>
                      <td style={C.td()}>{fmt(r.quantity * (r.drinks?.buy_price || 0))}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{ background: BG }}>
                    <td colSpan={2} style={{ ...C.td(), fontWeight: 700 }}>Total Restock Value</td>
                    <td style={{ ...C.td(), fontWeight: 700 }}>{fmt(data.restockVal)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </>
          )}

          {/* Expenses */}
          {data.dayExp.length > 0 && (
            <>
              <div style={C.sec}>Expenses <div style={C.line} /></div>
              {data.dayExp.map(e => (
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

      {!loading && data && data.type === "monthly" && (
        <>
          <PLCard label={new Date(data.month + "-01").toLocaleString("en-NG", { month: "long", year: "numeric" })} daysLogged={data.daysLogged} totalRev={data.totalRev} totalCOGS={data.totalCOGS} totalExp={data.totalExp} />

          {/* Cash summary */}
          <div style={{ ...C.card, borderLeft: `4px solid ${OK}` }}>
            <div style={C.row}><span style={{ fontWeight: 700 }}>Total Cash Collected</span><span style={C.sval(OK)}>{fmt(data.totalCash)}</span></div>
          </div>

          {/* Best sellers */}
          <div style={C.sec}>Best Sellers <div style={C.line} /></div>
          <div style={C.tw}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 320 }}>
              <thead><tr>
                <th style={C.th()}>#</th>
                <th style={C.th()}>Drink</th>
                <th style={C.th(AMBER)}>Units Sold</th>
                <th style={C.th(OK)}>Profit</th>
              </tr></thead>
              <tbody>{[...data.drinkStats].sort((a, b) => b.sold - a.sold).map((d, i) => (
                <tr key={d.id} style={{ opacity: d.sold === 0 ? 0.4 : 1 }}>
                  <td style={{ ...C.td(), color: MUTED }}>{i + 1}</td>
                  <td style={{ ...C.td(), fontWeight: 600 }}>{d.name}</td>
                  <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700, color: AMBER }}>{d.sold}</td>
                  <td style={C.td(d.profit >= 0 ? OK : ERR)}>{fmt(d.profit)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* Expenses by category */}
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
                    <div style={{ height: "100%", background: ERR, borderRadius: 3, width: `${(amt / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restock summary */}
          {data.mRestocks.length > 0 && (
            <>
              <div style={C.sec}>Monthly Restock Summary <div style={C.line} /></div>
              <div style={C.tw}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 300 }}>
                  <thead><tr>
                    <th style={C.th()}>Drink</th>
                    <th style={C.th()}>Date</th>
                    <th style={C.th()}>Units</th>
                    <th style={C.th()}>Value</th>
                  </tr></thead>
                  <tbody>{data.mRestocks.map(r => (
                    <tr key={r.id}>
                      <td style={{ ...C.td(), fontWeight: 600 }}>{r.drinks?.name}</td>
                      <td style={{ ...C.td(), color: MUTED }}>{r.restock_date}</td>
                      <td style={{ ...C.td(), fontFamily: "monospace", fontWeight: 700 }}>{r.quantity}</td>
                      <td style={C.td()}>{fmt(r.quantity * (r.drinks?.buy_price || 0))}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{ background: BG }}>
                    <td colSpan={3} style={{ ...C.td(), fontWeight: 700 }}>Total Restock Value</td>
                    <td style={{ ...C.td(), fontWeight: 700 }}>{fmt(data.restockVal)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ barId, userId, role, displayName, barName, onUpdate, onLogout }) {
  const [newName, setNewName] = useState(displayName);
  const [newBarName, setNewBarName] = useState(barName);
  const [inviteLink, setInviteLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveProfile() {
    await supabase.from("profiles").update({ display_name: newName.trim() }).eq("id", userId);
    if (role === "supervisor" && newBarName.trim() !== barName) {
      await supabase.from("bars").update({ name: newBarName.trim() }).eq("id", barId);
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    onUpdate({ displayName: newName.trim(), barName: newBarName.trim() });
  }

  async function generateInvite() {
    setGenerating(true);
    const { data } = await supabase.from("invites").insert({ bar_id: barId, role: "manager" }).select().single();
    const link = `${window.location.origin}?invite=${data.token}`;
    setInviteLink(link);
    setGenerating(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div>
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
        {saved && <div style={{ color: OK, fontSize: 13, marginBottom: 10, fontWeight: 600 }}>✓ Saved!</div>}
        <button style={C.btn("primary")} onClick={saveProfile}>Save Changes</button>
      </div>

      {role === "supervisor" && (
        <>
          <div style={C.sec}>Invite Manager <div style={C.line} /></div>
          <div style={C.card}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 13 }}>Generate a link to send to your Manager. The link can only be used once.</div>
            <button style={{ ...C.btn("amber"), marginBottom: inviteLink ? 13 : 0 }} onClick={generateInvite} disabled={generating}>
              {generating ? "Generating..." : "Generate Invite Link"}
            </button>
            {inviteLink && (
              <div>
                <div style={{ background: INP, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 13px", fontSize: 12, wordBreak: "break-all", marginBottom: 10, color: TEAL, fontWeight: 500 }}>{inviteLink}</div>
                <button onClick={() => navigator.clipboard.writeText(inviteLink)} style={C.btn("ghost")}>📋 Copy Link</button>
              </div>
            )}
          </div>
        </>
      )}

      <div style={C.sec}>Account <div style={C.line} /></div>
      <div style={C.card}>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 13 }}>Signing out will return you to the login screen.</div>
        <button style={C.btn("err")} onClick={signOut}>Sign Out</button>
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [appState, setAppState] = useState("loading"); // loading | auth | onboarding | join | app
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [bar, setBar] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [tab, setTab] = useState(0);

  // Check for invite token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) setInviteToken(token);
  }, []);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setAppState("auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await loadUserData(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null); setProfile(null); setBar(null); setAppState("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(u) {
    setUser(u);
    const { data: prof } = await supabase.from("profiles").select("*, bars(*)").eq("id", u.id).single();
    if (!prof || !prof.bar_id) {
      if (inviteToken) setAppState("join");
      else setAppState("onboarding");
    } else {
      setProfile(prof);
      setBar(prof.bars);
      setAppState("app");
    }
  }

  function handleAuth(u) { setUser(u); loadUserData(u); }

  function handleBarCreated({ bar: b, role, displayName }) {
    setBar(b);
    setProfile({ role, display_name: displayName, bar_id: b.id });
    setAppState("app");
  }

  function handleJoined({ bar: b, role, displayName }) {
    setBar(b);
    setProfile({ role, display_name: displayName, bar_id: b.id });
    setInviteToken(null);
    window.history.replaceState({}, "", window.location.pathname);
    setAppState("app");
  }

  function handleUpdate({ displayName, barName }) {
    setProfile(p => ({ ...p, display_name: displayName }));
    if (barName) setBar(b => ({ ...b, name: barName }));
  }

  if (appState === "loading") return <LoadingScreen />;
  if (appState === "auth") return <AuthScreen onAuth={handleAuth} />;
  if (appState === "onboarding") return <CreateBar user={user} onDone={handleBarCreated} />;
  if (appState === "join") return <JoinBar user={user} token={inviteToken} onDone={handleJoined} />;

  const role = profile?.role;
  const displayName = profile?.display_name || user?.email;
  const barId = bar?.id;
  const ROLE_COLOR = { supervisor: AMBER, manager: OK };

  const NAV = [
    { icon: "📦", label: "Stock" },
    { icon: "📋", label: "Log" },
    { icon: "💸", label: "Expenses" },
    { icon: "📊", label: "Report" },
    { icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: BG, minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", paddingBottom: 72 }}>
      {/* Header */}
      <div style={{ padding: "13px 18px 11px", background: WHITE, borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 400, color: TXT }}>{bar?.name || "Barnakular"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={C.tag(ROLE_COLOR[role] || BLUE)}>{displayName}</span>
            <span style={{ fontSize: 10, color: MUTED }}>· {role}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "16px 14px 10px", overflowY: "auto" }}>
        {tab === 0 && <StockTab barId={barId} role={role} userId={user?.id} displayName={displayName} />}
        {tab === 1 && <DailyLogTab barId={barId} role={role} userId={user?.id} displayName={displayName} />}
        {tab === 2 && <ExpensesTab barId={barId} role={role} userId={user?.id} />}
        {tab === 3 && <ReportTab barId={barId} role={role} />}
        {tab === 4 && <SettingsTab barId={barId} userId={user?.id} role={role} displayName={displayName} barName={bar?.name} onUpdate={handleUpdate} onLogout={() => supabase.auth.signOut()} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: WHITE, borderTop: `1px solid ${BORDER}`, display: "flex", zIndex: 50, boxShadow: "0 -2px 10px rgba(0,0,0,0.06)" }}>
        {NAV.map((n, i) => (
          <button key={n.label} onClick={() => setTab(i)} style={{ flex: 1, padding: "10px 4px 8px", border: "none", background: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, borderTop: tab === i ? `2px solid ${TEAL}` : "2px solid transparent", marginTop: -1 }}>
            <span style={{ fontSize: 18, filter: tab === i ? "none" : "grayscale(1) opacity(0.4)" }}>{n.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: tab === i ? TEAL : MUTED }}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
