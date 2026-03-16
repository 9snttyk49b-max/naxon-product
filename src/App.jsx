import { useState, useEffect, useRef } from "react";

// ── AI helper ────────────────────────────────────────────────────────────────
async function callClaude(system, userPrompt, onChunk) {
  const storedKey = typeof localStorage !== "undefined" ? localStorage.getItem("naxon-anthropic-key") : null;
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(storedKey ? { "x-api-key-override": storedKey } : {}) },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      stream: true,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          const d = JSON.parse(line.slice(6));
          if (d.type === "content_block_delta" && d.delta?.text) {
            full += d.delta.text;
            onChunk && onChunk(full);
          }
        } catch {}
      }
    }
  }
  return full;
}

// ── AI Agent widget ──────────────────────────────────────────────────────────
function AIAgent({ product }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: product === "gridmind"
      ? "Hi! I'm the Gridmind AI assistant. Ask me about energy grid intelligence, predictive analytics, SCADA integration, or how Gridmind can help your utility operations."
      : product === "aria"
      ? "Hi! I'm Aria — Naxon's conversation AI. Ask me about enterprise AI, scaling interactions, workflow automation, or how Aria can transform your customer experience."
      : "Hi! I'm your Naxon Systems AI assistant. Ask me about Gridmind (energy grid AI) or Aria (conversation AI platform)." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  const SYSTEM = `You are an AI assistant for Naxon Systems, a technology company with two flagship AI products:

GRIDMIND — AI-powered energy grid intelligence platform
- Real-time grid analytics for utility companies
- Predictive fault detection (99.2% accuracy)
- Load forecasting and demand response
- SCADA integration and automation
- Monitors 12,400+ grid nodes in real-time
- Average response time <80ms
- Achieved $2.1M energy optimization savings YTD
- Ideal for: electric utilities, grid operators, energy companies

ARIA — AI conversation intelligence for enterprise
- Voice, chat, and workflow automation
- Scales to 20-25 million interactions
- 94.1% average resolution rate (AI-first)
- 18 active enterprise clients
- -61% average handle time vs human baseline
- Integrates with existing enterprise systems (SAP, Salesforce, ServiceNow)
- Ideal for: enterprises, contact centers, utilities, healthcare

NAXON SYSTEMS is based in Plano, TX and is a subsidiary of Ziksatech.
Contact: info@naxonsystems.com

Be helpful, concise, and focused on how Naxon products solve real business problems.
${product ? `The user is currently viewing the ${product === "gridmind" ? "Gridmind" : "Aria"} product page.` : ""}`;

  const QUICK = product === "gridmind"
    ? ["How does fault prediction work?", "SCADA integration options?", "Pricing model?", "Grid node capacity?"]
    : product === "aria"
    ? ["How does Aria scale to 25M?", "Integration with SAP?", "Implementation timeline?", "ROI examples?"]
    : ["Tell me about Gridmind", "Tell me about Aria", "Which product fits utilities?", "Request a demo"];

  const isGridmind = product === "gridmind";
  const accentColor = isGridmind ? "#059669" : product === "aria" ? "#d97706" : "#0369a1";
  const accentGlow = isGridmind ? "rgba(5,150,105,0.4)" : product === "aria" ? "rgba(217,119,6,0.4)" : "rgba(3,105,161,0.4)";

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg = { role: "user", text };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    setMessages(m => [...m, { role: "assistant", text: "…", streaming: true }]);
    try {
      await callClaude(SYSTEM, text, txt => {
        setMessages(m => [...m.slice(0, -1), { role: "assistant", text: txt, streaming: true }]);
      });
      setMessages(m => [...m.slice(0, -1), { role: "assistant", text: m[m.length - 1].text }]);
    } catch {
      setMessages(m => [...m.slice(0, -1), { role: "assistant", text: "Couldn't connect. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, width: 54, height: 54, borderRadius: "50%",
          background: `linear-gradient(135deg,${accentColor},#0369a1)`, border: "none", cursor: "pointer",
          boxShadow: `0 4px 24px ${accentGlow}`, fontSize: 22, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
        {open ? "✕" : isGridmind ? "🧠" : product === "aria" ? "✦" : "◈"}
      </button>

      {open && (
        <div style={{ position: "fixed", bottom: 90, right: 24, zIndex: 9999, width: 360, height: 500,
          display: "flex", flexDirection: "column", background: "#060d1c",
          border: `1px solid ${accentColor}44`, borderRadius: 16,
          boxShadow: `0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px ${accentColor}22`,
          fontFamily: "'DM Sans','Segoe UI',sans-serif", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #0f1e30", background: "#050e1c",
            display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%",
              background: `linear-gradient(135deg,${accentColor},#0369a1)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              {isGridmind ? "🧠" : product === "aria" ? "✦" : "◈"}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
                {product === "gridmind" ? "Gridmind AI" : product === "aria" ? "Aria Assistant" : "Naxon AI"}
              </div>
              <div style={{ fontSize: 10, color: "#334155" }}>Naxon Systems · Powered by Claude</div>
            </div>
            <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#34d399" }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "84%", padding: "9px 13px",
                  borderRadius: m.role === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background: m.role === "user" ? `linear-gradient(135deg,${accentColor},#0369a1)` : "#0a1829",
                  border: m.role === "user" ? "none" : "1px solid #1a2d45",
                  fontSize: 12, lineHeight: 1.6, color: m.role === "user" ? "#fff" : "#cbd5e1",
                  whiteSpace: "pre-wrap", opacity: m.streaming ? 0.85 : 1 }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
              {QUICK.map(q => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  style={{ background: "#0a1829", border: `1px solid #1a2d45`, borderRadius: 12,
                    color: "#64748b", fontSize: 10, padding: "4px 10px", cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a2d45"; e.currentTarget.style.color = "#64748b"; }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: "10px 12px", borderTop: "1px solid #0f1e30", display: "flex", gap: 8, alignItems: "center" }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={product === "gridmind" ? "Ask about grid intelligence…" : product === "aria" ? "Ask about Aria AI…" : "Ask about Naxon products…"}
              disabled={loading}
              style={{ flex: 1, background: "#0a1829", border: "1px solid #1a2d45", borderRadius: 10, color: "#e2e8f0",
                fontSize: 12, padding: "8px 12px", outline: "none", fontFamily: "inherit" }} />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
                background: loading || !input.trim() ? "#0a1829" : `linear-gradient(135deg,${accentColor},#0369a1)`,
                color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? "⋯" : "↑"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
// ── GridMind ROI Calculator ───────────────────────────────────────────────────
const GRIDMIND_PRESETS = {
  "Electric Utility":  {outages:48,avgOutageCost:180000,operators:42,ticketsMonth:3200,compliance:250000,contract:1200000},
  "Gas Utility":       {outages:32,avgOutageCost:120000,operators:28,ticketsMonth:2100,compliance:180000,contract:900000},
  "Water Utility":     {outages:24,avgOutageCost:80000, operators:18,ticketsMonth:1400,compliance:120000,contract:650000},
  "Telecom":           {outages:96,avgOutageCost:240000,operators:65,ticketsMonth:8500,compliance:150000,contract:1800000},
  "Manufacturing":     {outages:60,avgOutageCost:95000, operators:35,ticketsMonth:2800,compliance:80000, contract:850000},
  "Healthcare":        {outages:20,avgOutageCost:200000,operators:55,ticketsMonth:4200,compliance:400000,contract:1400000},
};

function GridMindROI() {
  const [industry, setIndustry] = useState("Electric Utility");
  const [f, setF]               = useState({...GRIDMIND_PRESETS["Electric Utility"]});
  const [showROI, setShowROI]   = useState(false);
  const [copied, setCopied]     = useState(false);

  const upd = (k,v) => setF(p => ({...p, [k]: +v}));
  const setPreset = ind => { setIndustry(ind); setF({...GRIDMIND_PRESETS[ind]}); setShowROI(false); };

  const outageSavings  = f.outages * 0.40 * f.avgOutageCost;
  const ticketSavings  = f.ticketsMonth * 12 * 0.35 * 85;
  const complianceSave = f.compliance * 0.60;
  const opEfficiency   = f.operators * 85000 * 0.25;
  const yr1            = outageSavings + ticketSavings + complianceSave + opEfficiency;
  const yr2            = yr1 * 1.15;
  const yr3            = yr2 * 1.12;
  const totalBenefit   = yr1 + yr2 + yr3;
  const totalInvest    = f.contract * 3;
  const netROI         = totalBenefit - totalInvest;
  const roiPct         = totalInvest > 0 ? Math.round(netROI / totalInvest * 100) : 0;
  const payback        = yr1 > 0 ? Math.round(f.contract / (yr1 / 12)) : 0;
  const maxBar         = Math.max(outageSavings, ticketSavings, complianceSave, opEfficiency, 1);
  const fmt            = n => "$" + Math.round(n).toLocaleString();

  const inp = { width:"100%", padding:"8px 12px", background:"#0a1120", border:"1px solid #1a2d45",
    borderRadius:8, color:"#e2e8f0", fontSize:14, outline:"none", boxSizing:"border-box" };
  const lbl = { fontSize:11, color:"#475569", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em", display:"block" };
  const card = { background:"#060d1c", border:"1px solid #1a2d45", borderRadius:12, padding:"20px 24px" };

  const NF = ({label, k, pre=""}) => (
    <div style={{marginBottom:14}}>
      <label style={lbl}>{label}</label>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {pre && <span style={{color:"#475569",fontSize:13,flexShrink:0}}>{pre}</span>}
        <input type="number" value={f[k]||0} onChange={e=>upd(k,e.target.value)} style={{...inp,flex:1}}/>
      </div>
    </div>
  );

  return (
    <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:24,alignItems:"start"}}>
      {/* Left: Inputs */}
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={card}>
          <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:16}}>⚙️ Configure Customer Profile</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>Industry Vertical</label>
            <select value={industry} onChange={e=>setPreset(e.target.value)} style={inp}>
              {Object.keys(GRIDMIND_PRESETS).map(i=><option key={i}>{i}</option>)}
            </select>
          </div>
          <NF label="Annual Outages / Incidents" k="outages"/>
          <NF label="Avg Cost per Outage" k="avgOutageCost" pre="$"/>
          <NF label="Operations Staff" k="operators"/>
          <NF label="Support Tickets / Month" k="ticketsMonth"/>
          <NF label="Annual Compliance Fine Exposure" k="compliance" pre="$"/>
          <NF label="GridMind™ Annual License" k="contract" pre="$"/>
          <button onClick={()=>setShowROI(true)}
            style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#059669,#047857)",
              border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8}}>
            ⚡ Calculate 3-Year ROI
          </button>
        </div>
        <div style={{...card,background:"#022c22",border:"1px solid #065f46"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#34d399",marginBottom:10}}>GridMind™ AI Capabilities</div>
          {["Predictive outage prevention — 40% reduction","Automated ticket routing — 35% volume reduction","Real-time compliance monitoring — 60% fine reduction","Operator copilot — natural language to action","Anomaly detection with AI confidence scoring"].map(cap=>(
            <div key={cap} style={{fontSize:11,color:"#6ee7b7",marginBottom:6}}>✓ {cap}</div>
          ))}
        </div>
      </div>

      {/* Right: Results */}
      <div>
        {!showROI ? (
          <div style={{...card,padding:"60px 40px",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:16}}>⚡</div>
            <div style={{fontSize:20,fontWeight:700,color:"#334155",marginBottom:8}}>GridMind™ ROI Model</div>
            <p style={{color:"#1e3a5f",fontSize:14,lineHeight:1.7,marginBottom:24}}>Configure your prospect's operational profile on the left, then calculate their 3-year return on GridMind™ investment.</p>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              {["40% Fewer Outages","35% Ticket Reduction","60% Compliance Risk Reduction","25% Operator Efficiency"].map(t=>(
                <span key={t} style={{background:"#022c22",border:"1px solid #065f46",borderRadius:20,padding:"4px 12px",fontSize:11,color:"#34d399"}}>{t}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Summary */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                {l:"3-Year Net ROI",   v:fmt(netROI),  sub:roiPct+"% return",   c:"#34d399"},
                {l:"Year 1 Benefits",  v:fmt(yr1),     sub:"vs "+fmt(f.contract)+" cost", c:"#38bdf8"},
                {l:"Payback Period",   v:payback+"mo", sub:"break-even",          c:"#a78bfa"},
              ].map(s=>(
                <div key={s.l} style={{...card,textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#3d5a7a",marginBottom:4,textTransform:"uppercase"}}>{s.l}</div>
                  <div style={{fontSize:28,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Breakdown bars */}
            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:16}}>Annual Benefit Breakdown</div>
              {[
                {l:"Outage Reduction (40%)",    v:outageSavings,  c:"#34d399", d:`${f.outages} outages × $${(f.avgOutageCost/1000).toFixed(0)}K × 40%`},
                {l:"Ticket Automation (35%)",   v:ticketSavings,  c:"#38bdf8", d:`${(f.ticketsMonth*12).toLocaleString()} tickets/yr × 35% × $85`},
                {l:"Compliance Risk (60%)",     v:complianceSave, c:"#a78bfa", d:`$${(f.compliance/1000).toFixed(0)}K exposure × 60%`},
                {l:"Operator Efficiency (25%)", v:opEfficiency,   c:"#f59e0b", d:`${f.operators} staff × $85K × 25%`},
              ].map(({l,v,c,d})=>(
                <div key={l} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:12,color:"#94a3b8"}}>{l}</span>
                    <span style={{fontSize:13,fontWeight:700,color:c}}>{fmt(v)}/yr</span>
                  </div>
                  <div style={{height:8,background:"#0a1626",borderRadius:4,marginBottom:3}}>
                    <div style={{height:8,borderRadius:4,background:c,width:Math.round(v/maxBar*100)+"%",transition:"width 0.6s"}}/>
                  </div>
                  <div style={{fontSize:10,color:"#334155"}}>{d}</div>
                </div>
              ))}
            </div>

            {/* 3-Year projection */}
            <div style={card}>
              <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:14}}>3-Year Value Projection</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[[1,yr1],[2,yr2],[3,yr3]].map(([yr,val])=>(
                  <div key={yr} style={{padding:"14px",background:"#070c18",borderRadius:8,border:"1px solid #1a2d45",textAlign:"center"}}>
                    <div style={{fontSize:10,color:"#3d5a7a",marginBottom:4}}>YEAR {yr}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#34d399"}}>{fmt(val)}</div>
                  </div>
                ))}
              </div>
              <div style={{padding:"16px",background:"#022c22",borderRadius:8,border:"1px solid #065f46",textAlign:"center"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div><div style={{fontSize:10,color:"#065f46"}}>3-YR INVESTMENT</div><div style={{fontSize:18,fontWeight:800,color:"#34d399"}}>{fmt(totalInvest)}</div></div>
                  <div style={{fontSize:20,color:"#065f46"}}>→</div>
                  <div><div style={{fontSize:10,color:"#065f46"}}>3-YR BENEFIT</div><div style={{fontSize:18,fontWeight:800,color:"#34d399"}}>{fmt(totalBenefit)}</div></div>
                </div>
                <div style={{fontSize:16,fontWeight:900,color:"#34d399"}}>
                  Net ROI: {fmt(netROI)} ({roiPct}%) · Payback in {payback} months
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{textAlign:"center",padding:"24px"}}>
              <button onClick={()=>setCopied(true)||navigator.clipboard.writeText(`GridMind ROI: ${fmt(netROI)} (${roiPct}%) | Payback: ${payback}mo | Year 1: ${fmt(yr1)} | Industry: ${industry}`).then(()=>setTimeout(()=>setCopied(false),2000))}
                style={{padding:"12px 28px",background:"#022c22",border:"1px solid #065f46",borderRadius:10,color:"#34d399",fontSize:13,fontWeight:600,cursor:"pointer",marginRight:12}}>
                {copied ? "✓ Copied!" : "📋 Copy Summary"}
              </button>
              <a href="mailto:gridmind@naxonsystems.com?subject=GridMind ROI Discussion"
                style={{padding:"12px 28px",background:"linear-gradient(135deg,#059669,#047857)",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,textDecoration:"none",display:"inline-block"}}>
                Schedule a Demo →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default function App() {
  const [activeProduct, setActiveProduct] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return ["gridmind", "aria"].includes(hash) ? hash : null;
  });

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      setActiveProduct(["gridmind", "aria"].includes(h) ? h : null);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const nav = (p) => { window.location.hash = p || ""; setActiveProduct(p); };

  return (
    <div style={{ minHeight: "100vh", background: "#030810", color: "#e2e8f0",
      fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #060d1c; }
        ::-webkit-scrollbar-thumb { background: #1a2d45; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fadeIn 0.6s ease forwards; }
        .card-hover { transition: all 0.2s ease; }
        .card-hover:hover { transform: translateY(-4px); }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(3,8,16,0.95)",
        backdropFilter: "blur(12px)", borderBottom: "1px solid #0f1e30",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 48px", height: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => nav(null)}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#38bdf8", letterSpacing: "-0.04em" }}>◈ NAXON</span>
          <span style={{ fontSize: 11, color: "#1e3a5f", borderLeft: "1px solid #1a2d45", paddingLeft: 10,
            textTransform: "uppercase", letterSpacing: "0.1em" }}>Systems</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ id: null, label: "Home" }, { id: "gridmind", label: "🧠 Gridmind" }, { id: "aria", label: "✦ Aria" }].map(item => (
            <button key={String(item.id)} onClick={() => nav(item.id)}
              style={{ background: activeProduct === item.id ? "#0c2340" : "none",
                border: `1px solid ${activeProduct === item.id ? "#0369a1" : "transparent"}`,
                borderRadius: 8, color: activeProduct === item.id ? "#38bdf8" : "#64748b",
                fontSize: 13, fontWeight: 500, padding: "6px 16px", cursor: "pointer",
                transition: "all 0.15s" }}
              onMouseEnter={e => { if (activeProduct !== item.id) e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={e => { if (activeProduct !== item.id) e.currentTarget.style.color = "#64748b"; }}>
              {item.label}
            </button>
          ))}
        </div>
        <a href="https://ziksatech-ops.vercel.app" target="_blank" rel="noopener"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7,
            padding: "7px 16px", borderRadius: 8,
            background: "linear-gradient(135deg,#0D1B2A,#1a2d45)",
            border: "1px solid #C9A84C44",
            fontSize: 12, fontWeight: 700, color: "#C9A84C",
            transition: "all 0.15s", whiteSpace: "nowrap" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#C9A84C"; e.currentTarget.style.background = "linear-gradient(135deg,#1a2d45,#0c2340)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#C9A84C44"; e.currentTarget.style.background = "linear-gradient(135deg,#0D1B2A,#1a2d45)"; }}>
          <span style={{ fontSize: 14 }}>⚡</span> Team Portal
        </a>
      </nav>

      {/* ── Home view ── */}
      {!activeProduct && (
        <div className="fade-in">
          {/* Hero */}
          <div style={{ textAlign: "center", padding: "96px 24px 72px", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "10%", left: "20%", width: 400, height: 400,
                borderRadius: "50%", background: "rgba(5,150,105,0.06)", filter: "blur(80px)" }} />
              <div style={{ position: "absolute", top: "10%", right: "20%", width: 400, height: 400,
                borderRadius: "50%", background: "rgba(217,119,6,0.06)", filter: "blur(80px)" }} />
            </div>
            <div style={{ fontSize: 11, color: "#334155", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>
              Naxon Systems — Plano, TX
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1,
              color: "#e2e8f0", marginBottom: 20, maxWidth: 700, margin: "0 auto 20px" }}>
              AI Built for the{" "}
              <span style={{ background: "linear-gradient(90deg,#34d399,#38bdf8)", WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent" }}>Real World</span>
            </h1>
            <p style={{ fontSize: 18, color: "#475569", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>
              Two enterprise AI platforms — one for energy grids, one for conversations — both built to scale.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => nav("gridmind")}
                style={{ padding: "12px 28px", background: "linear-gradient(135deg,#059669,#047857)",
                  border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                🧠 Explore Gridmind
              </button>
              <button onClick={() => nav("aria")}
                style={{ padding: "12px 28px", background: "linear-gradient(135deg,#d97706,#b45309)",
                  border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                ✦ Explore Aria
              </button>
            </div>
          </div>

          {/* Product tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 960,
            margin: "0 auto 80px", padding: "0 24px" }}>
            {[
              { id: "gridmind", emoji: "🧠", label: "Gridmind", tagline: "AI-powered energy grid intelligence",
                color: "#059669", glow: "rgba(5,150,105,0.15)", border: "rgba(52,211,153,0.25)",
                desc: "Real-time analytics, predictive fault detection, and load forecasting for modern electric grids.",
                stats: [{ l: "Grid nodes", v: "12,400+" }, { l: "Fault accuracy", v: "99.2%" }, { l: "Response time", v: "<80ms" }, { l: "Savings YTD", v: "$2.1M" }] },
              { id: "aria", emoji: "✦", label: "Aria", tagline: "AI conversation intelligence at scale",
                color: "#d97706", glow: "rgba(217,119,6,0.15)", border: "rgba(251,191,36,0.25)",
                desc: "Enterprise-grade AI for voice, chat, and workflow automation — built to handle millions.",
                stats: [{ l: "Interactions/mo", v: "2.4M" }, { l: "Resolution rate", v: "94.1%" }, { l: "Enterprise clients", v: "18" }, { l: "Handle time", v: "−61%" }] },
            ].map(p => (
              <div key={p.id} className="card-hover" onClick={() => nav(p.id)}
                style={{ background: "#060d1c", border: `1px solid ${p.border}`, borderRadius: 20,
                  padding: "32px 28px", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160,
                  borderRadius: "50%", background: p.glow, filter: "blur(30px)", pointerEvents: "none" }} />
                <div style={{ fontSize: 36, marginBottom: 12 }}>{p.emoji}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 12, color: p.color, marginBottom: 12, fontWeight: 600 }}>{p.tagline}</div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 20 }}>{p.desc}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {p.stats.map(s => (
                    <div key={s.l} style={{ background: "#040810", borderRadius: 8, padding: "10px 12px",
                      border: "1px solid #0a1828" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", fontFamily: "monospace" }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: "#334155", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, fontSize: 13, fontWeight: 700, color: p.color }}>
                  Learn more →
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center", padding: "48px 24px 80px", borderTop: "1px solid #0a1828" }}>
            <div style={{ fontSize: 13, color: "#334155", marginBottom: 8 }}>
              A Naxon Systems + Ziksatech Company · Plano, TX
            </div>
            <a href="mailto:info@naxonsystems.com" style={{ color: "#38bdf8", fontSize: 14, textDecoration: "none" }}>
              info@naxonsystems.com
            </a>
          </div>
        </div>
      )}

      {/* ── Gridmind view ── */}
      {activeProduct === "gridmind" && (
        <div className="fade-in">
          {/* Hero */}
          <div style={{ padding: "80px 48px 64px", maxWidth: 1100, margin: "0 auto", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 500, height: 500,
              borderRadius: "50%", background: "rgba(5,150,105,0.06)", filter: "blur(100px)", pointerEvents: "none" }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#022c22",
              border: "1px solid #065f46", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399",
                animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, color: "#34d399", fontWeight: 600 }}>Live — 12,400 nodes monitored</span>
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05,
              color: "#e2e8f0", marginBottom: 20 }}>
              🧠 Gridmind
              <br />
              <span style={{ background: "linear-gradient(90deg,#34d399,#059669)", WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent" }}>Grid Intelligence AI</span>
            </h1>
            <p style={{ fontSize: 19, color: "#475569", maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
              Real-time analytics, predictive fault detection, and intelligent load forecasting for electric utilities and grid operators.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={{ padding: "12px 28px", background: "linear-gradient(135deg,#059669,#047857)",
                border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Request Demo
              </button>
              <button onClick={() => nav(null)}
                style={{ padding: "12px 28px", background: "none",
                  border: "1px solid #1a2d45", borderRadius: 10, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
                ← Back
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ background: "#050e1c", borderTop: "1px solid #0f1e30", borderBottom: "1px solid #0f1e30",
            padding: "28px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0,
              maxWidth: 900, margin: "0 auto" }}>
              {[
                { v: "12,400+", l: "Grid Nodes Monitored" },
                { v: "99.2%", l: "Fault Prediction Accuracy" },
                { v: "<80ms", l: "Real-time Response" },
                { v: "$2.1M", l: "Energy Savings YTD" },
              ].map((s, i) => (
                <div key={s.l} style={{ textAlign: "center", padding: "0 24px",
                  borderRight: i < 3 ? "1px solid #0f1e30" : "none" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#34d399",
                    fontFamily: "monospace", letterSpacing: "-0.02em" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 4, textTransform: "uppercase",
                    letterSpacing: "0.07em" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 48px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>
              Built for modern grid operations
            </h2>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 40 }}>
              From generation to distribution — Gridmind gives you full visibility and control.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { icon: "⚡", title: "Real-time Analytics", desc: "Monitor every grid node in real time with sub-100ms latency. Detect anomalies before they become outages." },
                { icon: "🔮", title: "Predictive Fault Detection", desc: "ML models trained on millions of grid events predict equipment failures days in advance with 99.2% accuracy." },
                { icon: "📊", title: "Load Forecasting", desc: "AI-driven demand prediction integrates weather, usage patterns, and market signals for optimal dispatching." },
                { icon: "🔗", title: "SCADA Integration", desc: "Seamless integration with existing SCADA systems. No rip-and-replace — Gridmind enhances what you have." },
                { icon: "🤖", title: "Automated Response", desc: "Trigger automated remediation actions when Gridmind detects threats — reduce operator workload by 40%." },
                { icon: "📡", title: "Multi-site Dashboard", desc: "Unified view across all substations, feeders, and generation assets in one command center." },
              ].map(f => (
                <div key={f.title} className="card-hover" style={{ background: "#060d1c",
                  border: "1px solid rgba(52,211,153,0.12)", borderRadius: 14, padding: "24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: "#050e1c", borderTop: "1px solid #0f1e30", padding: "56px 48px",
            textAlign: "center" }}>
            <h3 style={{ fontSize: 26, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>
              Ready to see Gridmind in action?
            </h3>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 28 }}>
              Schedule a live demo with your grid data. Implementation in as little as 6 weeks.
            </p>
            <a href="mailto:gridmind@naxonsystems.com"
              style={{ display: "inline-block", padding: "12px 32px",
                background: "linear-gradient(135deg,#059669,#047857)",
                borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700,
                textDecoration: "none" }}>
              Contact: gridmind@naxonsystems.com
            </a>
          </div>

          {/* ROI Calculator Section */}
          <div style={{ padding: "40px 48px 80px", maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <h2 style={{ fontSize: 36, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>ROI Calculator</h2>
              <p style={{ color: "#475569", fontSize: 16 }}>Configure your operational profile and see your 3-year return on investment</p>
            </div>
            <GridMindROI />
          </div>
        </div>
      )}

      {/* ── Aria view ── */}
      {activeProduct === "aria" && (
        <div className="fade-in">
          {/* Hero */}
          <div style={{ padding: "80px 48px 64px", maxWidth: 1100, margin: "0 auto", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 500, height: 500,
              borderRadius: "50%", background: "rgba(217,119,6,0.06)", filter: "blur(100px)", pointerEvents: "none" }} />
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1a1005",
              border: "1px solid #92400e", borderRadius: 20, padding: "5px 14px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b",
                animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>2.4M interactions this month · Scaling to 25M</span>
            </div>
            <h1 style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.05,
              color: "#e2e8f0", marginBottom: 20 }}>
              ✦ Aria
              <br />
              <span style={{ background: "linear-gradient(90deg,#fbbf24,#d97706)", WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent" }}>Conversation AI</span>
            </h1>
            <p style={{ fontSize: 19, color: "#475569", maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
              Enterprise AI for voice, chat, and workflow automation. Built to handle 20–25 million interactions with 94% resolution rates.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button style={{ padding: "12px 28px", background: "linear-gradient(135deg,#d97706,#b45309)",
                border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Request Demo
              </button>
              <button onClick={() => nav(null)}
                style={{ padding: "12px 28px", background: "none",
                  border: "1px solid #1a2d45", borderRadius: 10, color: "#64748b", fontSize: 14, cursor: "pointer" }}>
                ← Back
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: "#050e1c", borderTop: "1px solid #0f1e30", borderBottom: "1px solid #0f1e30",
            padding: "28px 48px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0,
              maxWidth: 900, margin: "0 auto" }}>
              {[
                { v: "2.4M", l: "Monthly Interactions" },
                { v: "94.1%", l: "AI Resolution Rate" },
                { v: "18", l: "Enterprise Clients" },
                { v: "−61%", l: "Handle Time Reduction" },
              ].map((s, i) => (
                <div key={s.l} style={{ textAlign: "center", padding: "0 24px",
                  borderRight: i < 3 ? "1px solid #0f1e30" : "none" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#f59e0b",
                    fontFamily: "monospace", letterSpacing: "-0.02em" }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: "#334155", marginTop: 4, textTransform: "uppercase",
                    letterSpacing: "0.07em" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 48px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0", marginBottom: 8 }}>
              Enterprise-grade from day one
            </h2>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 40 }}>
              Aria integrates with your existing systems and scales to any volume.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              {[
                { icon: "🎙️", title: "Voice AI", desc: "Natural language voice interactions with sub-200ms response times. Handles complex multi-turn conversations." },
                { icon: "💬", title: "Omnichannel Chat", desc: "Web, mobile, WhatsApp, SMS — Aria maintains context across every channel in a unified conversation thread." },
                { icon: "⚙️", title: "Workflow Automation", desc: "Connect Aria to your CRM, ERP, and ticketing systems. Automate end-to-end resolutions without human handoff." },
                { icon: "🔌", title: "SAP & Enterprise Integrations", desc: "Native connectors for SAP, Salesforce, ServiceNow, and Zendesk. Live in days, not months." },
                { icon: "📈", title: "Analytics Dashboard", desc: "Real-time visibility into resolution rates, escalation patterns, sentiment trends, and agent performance." },
                { icon: "🛡️", title: "Enterprise Security", desc: "SOC 2 Type II, HIPAA, GDPR-ready. Private deployment options for regulated industries." },
              ].map(f => (
                <div key={f.title} className="card-hover" style={{ background: "#060d1c",
                  border: "1px solid rgba(251,191,36,0.12)", borderRadius: 14, padding: "24px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scale section */}
          <div style={{ background: "#050e1c", borderTop: "1px solid #0f1e30",
            borderBottom: "1px solid #0f1e30", padding: "56px 48px" }}>
            <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
              <h3 style={{ fontSize: 26, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>
                Built for 20–25 million interactions
              </h3>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 32, lineHeight: 1.7 }}>
                Aria's infrastructure is purpose-built for enterprise scale. Horizontal auto-scaling, multi-region deployment, and 99.9% SLA uptime keep you running when it matters most.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
                {[["99.9%", "Uptime SLA"], ["<200ms", "Avg Response"], ["Multi-region", "Deployment"], ["SOC 2 II", "Certified"]].map(([v, l]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b", fontFamily: "monospace" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "#334155", marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div style={{ padding: "56px 48px", textAlign: "center" }}>
            <h3 style={{ fontSize: 26, fontWeight: 800, color: "#e2e8f0", marginBottom: 12 }}>
              Start your Aria pilot in 2 weeks
            </h3>
            <p style={{ fontSize: 14, color: "#475569", marginBottom: 28 }}>
              We'll connect Aria to your top 3 use cases and show you live results before you commit.
            </p>
            <a href="mailto:aria@naxonsystems.com"
              style={{ display: "inline-block", padding: "12px 32px",
                background: "linear-gradient(135deg,#d97706,#b45309)",
                borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700,
                textDecoration: "none" }}>
              Contact: aria@naxonsystems.com
            </a>
          </div>
        </div>
      )}

      {/* ── AI Agent — always visible ── */}
      <AIAgent product={activeProduct} />
    </div>
  );
}
