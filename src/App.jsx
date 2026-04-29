// src/App.jsx — SAP AR Collections Co-pilot  |  Full Demo v2
// 9 views covering all 5 scenarios + dashboard + chat + ptp + log
import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { api } from './api/client'
import ChatInterface          from './components/ChatInterface'
import RiskWorklist           from './components/RiskWorklist'
import CustomerDetail         from './components/CustomerDetail'
import AgingChart             from './components/AgingChart'
import ActivityLog, { PTPTracker } from './components/ActivityLog'
import WTPWorklist            from './components/WTPWorklist'
import EmailInbox             from './components/EmailInbox'
import DisputeBoard, { CashApplication, DynamicDiscounting } from './components/DisputeBoard'

// ── Navigation definition ──────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id:'dashboard', icon:'▦', label:'Dashboard',      tip:'Portfolio KPIs + aging' },
      { id:'chat',      icon:'◎', label:'AI Co-pilot',    tip:'Chat with all agents' },
    ]
  },
  {
    label: 'Scenarios',
    items: [
      { id:'wtp',       icon:'⚡', label:'WTP Worklist',   tip:'S2: Behaviour-based priority', badge:'S2' },
      { id:'email',     icon:'✉', label:'Smart Inbox',    tip:'S3: Email intent agent',       badge:'S3' },
      { id:'disputes',  icon:'⚖', label:'Dispute Board',  tip:'S4: Dispute resolution',       badge:'S4' },
      { id:'cash',      icon:'₹', label:'Cash App',       tip:'S5: Same-day matching',        badge:'S5' },
      { id:'discount',  icon:'✦', label:'Dynamic Disc.',  tip:'S5: Early pay incentives',     badge:'S5' },
    ]
  },
  {
    label: 'Operations',
    items: [
      { id:'ptp',       icon:'✓', label:'PTP Tracker',    tip:'Promise-to-pay monitoring' },
      { id:'log',       icon:'◷', label:'Activity Log',   tip:'SAP audit trail' },
    ]
  },
]

const SCENARIO_LABELS = {
  wtp:      { num:'S2', color:'var(--accent-purple)', label:'WTP Prioritisation' },
  email:    { num:'S3', color:'var(--accent-amber)',  label:'Email Agent' },
  disputes: { num:'S4', color:'var(--risk-critical)', label:'Dispute Resolution' },
  cash:     { num:'S5', color:'var(--risk-low)',      label:'Cash Application' },
  discount: { num:'S5', color:'var(--accent-amber)',  label:'Dynamic Discounting' },
}

  // ── Layout wrappers ────────────────────────────────────────────────────
  const TwoCol = ({ left, right, leftW = 300 }) => (
    <div style={{ flex:1, overflow:'hidden', display:'grid',
      gridTemplateColumns:`${leftW}px 1fr`, height:'100%' }}>
      <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>{left}</div>
      <div style={{ overflow:'hidden' }}>{right}</div>
    </div>
  )

  const ThreeCol = ({ left, center, right, lW=260, rW=280 }) => (
    <div style={{ flex:1, overflow:'hidden', display:'grid',
      gridTemplateColumns:`${lW}px 1fr ${rW}px`, height:'100%' }}>
      <div style={{ borderRight:'1px solid var(--border)', overflow:'hidden' }}>{left}</div>
      <div style={{ overflow:'hidden' }}>{center}</div>
      <div style={{ borderLeft:'1px solid var(--border)', overflow:'hidden' }}>{right}</div>
    </div>
  )

export default function App() {
  const [view,             setView]             = useState('chat')
  const [customers,        setCustomers]        = useState([])
  const [agingData,        setAgingData]        = useState(null)
  const [summary,          setSummary]          = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [chatCustomer,     setChatCustomer]     = useState(null)
  const [chatQuery, setChatQuery] = useState(null)      // for chat view
const [wtpQuery,  setWtpQuery]  = useState(null)      // for wtp view
  const [refreshKey,       setRefreshKey]       = useState(0)
  const [backendOk,        setBackendOk]        = useState(null)
  const [loading,          setLoading]          = useState(false)



  // ── Load portfolio ─────────────────────────────────────────────────────
  const loadPortfolio = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.portfolio()
      const c    = data.customers || []
      setCustomers(c)
      setAgingData(data.aging_buckets)
      setSummary({
        ...data.summary,
        avg_score: c.length ? Math.round(c.reduce((s,x)=>s+x.risk_score,0)/c.length) : 0
      })
      setBackendOk(true)
    } catch(e) { console.error(e); setBackendOk(false) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { loadPortfolio() }, [])

  // ── Navigation helpers ─────────────────────────────────────────────────
  const goView = (v) => setView(v)

const handleChatQuery = useCallback((query, customer) => {

  if (customer) {
    setChatCustomer(customer)
     setChatQuery(query + '___' + Date.now() )
     setView('chat') // ALWAYS switch to chat 
  }

  
}, [])

 const handleChatQuery1 = useCallback((query, customer) => {
  if (customer) {
    setChatCustomer(customer)
    setWtpQuery(query + '___' + Date.now())  // separate state, don't change view
    // NO setView() call — stay on wtp
  } else {
    setWtpQuery(query + '___' + Date.now())  // header button, no customer
  }
}, [])

  const handleDataUpdate = useCallback((res) => {
    if (res.portfolio_data) setCustomers(res.portfolio_data)
    setRefreshKey(k => k + 1)
  }, [])

  const selectCustomer = useCallback((c) => {
    setSelectedCustomer(c)
    setChatCustomer(c)
  }, [])

  // ── Backend offline banner ─────────────────────────────────────────────
  const OfflineBanner = () => backendOk === false ? (
    <div style={{ background:'rgba(239,68,68,0.1)', borderBottom:'1px solid rgba(239,68,68,0.3)',
      padding:'7px 16px', fontSize:11, color:'var(--risk-critical)', display:'flex', alignItems:'center', gap:8 }}>
      ⚠ Flask backend offline — run <code style={{ background:'rgba(239,68,68,0.15)', padding:'1px 6px', borderRadius:4 }}>python app.py</code> in the backend folder
    </div>
  ) : null

  // ── Scenario label bar ─────────────────────────────────────────────────
  const ScenarioBar = ({ viewId }) => {
    const s = SCENARIO_LABELS[viewId]
    if (!s) return null
    return (
      <div style={{ padding:'4px 16px', borderBottom:'1px solid var(--border)',
        background:'var(--bg-surface)', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', padding:'2px 8px',
          borderRadius:3, background:`${s.color}20`, color:s.color, border:`1px solid ${s.color}44` }}>
          {s.num}
        </span>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{s.label}</span>
        <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:'auto' }}>
          Live on SAP S/4HANA OData · Claude AI + LangGraph
        </span>
      </div>
    )
  }



  // ── VIEWS ──────────────────────────────────────────────────────────────
  const renderView = () => {
    switch(view) {

      // ── Dashboard ───────────────────────────────────────────────────────
      case 'dashboard':
        return (
          <div style={{ flex:1, overflow:'hidden', display:'grid',
            gridTemplateColumns:'300px 1fr 300px', gridTemplateRows:'1.5fr 1fr',
            height:'100%' }}>
            <div style={{ gridRow:'1/3', borderRight:'1px solid var(--border)', overflow:'hidden' }}>
              <RiskWorklist customers={customers} selected={selectedCustomer}
                onSelect={selectCustomer} onChat={handleChatQuery} loading={loading}/>
            </div>
            <div style={{ borderBottom:'1px solid var(--border)', padding:16, overflow:'auto' }}>
              <CustomerDetail customer={selectedCustomer}
                onChat={q => handleChatQuery(q, selectedCustomer)}/>
              
            </div>
            <div style={{ gridRow:'1/3', borderLeft:'1px solid var(--border)', overflow:'hidden' }}>
            <AgingChart aging={agingData} summary={summary} loading={loading}/>
              
            </div>
            <div style={{ overflow:'auto' }}>
              <ActivityLog customerId={selectedCustomer?.customer_id} refreshKey={refreshKey}/>
            </div>
          </div>
        )

      // ── AI Chat ─────────────────────────────────────────────────────────
      case 'chat':
        return (
          // <ThreeCol
          //   left={
          //     <RiskWorklist customers={customers} selected={chatCustomer}
          //       onSelect={c => { setChatCustomer(c); selectCustomer(c) }}
          //       onChat={handleChatQuery} loading={loading}/>
          //   }
          //   center={
              
          //     <ChatInterface selectedCustomer={chatCustomer}
          //       onDataUpdate={handleDataUpdate}
          //       initialQuery={chatQuery?.split('___')[0]} />
          //   }
          //   right={
          //     <CustomerDetail customer={chatCustomer || selectedCustomer}
          //       onChat={q => handleChatQuery(q, chatCustomer || selectedCustomer)}/>
          //   }
          // />
          <TwoCol
  left={
    <RiskWorklist
      customers={customers}
      selected={chatCustomer}
      onSelect={c => { setChatCustomer(c); selectCustomer(c) }}
      onChat={handleChatQuery}
      loading={loading}
    />
  }
  right={
    <ChatInterface
     key="chat-view"     
      selectedCustomer={chatCustomer}
      onDataUpdate={handleDataUpdate}
      initialQuery={chatQuery?.split('___')[0]}
    />
  }
/>
        )

      // ── WTP Worklist (Scenario 2) ───────────────────────────────────────
      case 'wtp':
  return (
    <TwoCol
      leftW={300}
      left={
        <WTPWorklist
          onSelectCustomer={c => { selectCustomer(c) }}
          onChat={handleChatQuery1}
        />
      }
      right={
        <ChatInterface
           key="wtp-view"   
          selectedCustomer={chatCustomer}
          onDataUpdate={handleDataUpdate}
          initialQuery={wtpQuery?.split('___')[0]}   // ← wtpQuery not chatQuery
          placeholder="Ask about WTP signals, delinquency predictions, or channel strategies…"
        />
      }
    />
  )
      // ── Email Inbox (Scenario 3) ────────────────────────────────────────
      case 'email':
        return (
          <div style={{ flex:1, overflow:'hidden', height:'100%' }}>
            <EmailInbox
              onChat={handleChatQuery}
              onSelectCustomer={c => { selectCustomer(c) }}/>
          </div>
        )

      // ── Dispute Board (Scenario 4) ──────────────────────────────────────
      case 'disputes':
        return (
          <div style={{ flex:1, overflow:'hidden', height:'100%' }}>
            <DisputeBoard
              onChat={handleChatQuery}
              onSelectCustomer={c => { selectCustomer(c) }}/>
          </div>
        )

      // ── Cash Application (Scenario 5c) ──────────────────────────────────
      case 'cash':
        return (
          <div style={{ flex:1, overflow:'hidden', height:'100%' }}>
            <CashApplication onChat={handleChatQuery}/>
          </div>
        )

      // ── Dynamic Discounting (Scenario 5b) ──────────────────────────────
      case 'discount':
        return (
          <div style={{ flex:1, overflow:'hidden', height:'100%' }}>
            <DynamicDiscounting customers={customers} onChat={handleChatQuery}/>
          </div>
        )

      // ── PTP Tracker ─────────────────────────────────────────────────────
      case 'ptp':
        return (
          <TwoCol
            leftW={420}
            left={
              <PTPTracker
                refreshKey={refreshKey}
                onSelectCustomer={c => { selectCustomer(c); setView('dashboard') }}
                onChat={(q, cid) => {
                  const match = customers.find(x => x.customer_id === cid)
                  if (match) setChatCustomer(match)
                  handleChatQuery(q, match || null)
                }}/>
            }
            right={<ActivityLog refreshKey={refreshKey}/>}
          />
        )

      // ── Activity Log ─────────────────────────────────────────────────────
      case 'log':
        return (
          <TwoCol
            leftW={320}
            left={
              <RiskWorklist customers={customers} selected={selectedCustomer}
                onSelect={selectCustomer} onChat={handleChatQuery} loading={loading}/>
            }
            right={
              <ActivityLog
                customerId={selectedCustomer?.customer_id}
                refreshKey={refreshKey}/>
            }
          />
        )

      default: return null
    }
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <nav style={{
        width:56, background:'var(--bg-surface)',
        borderRight:'1px solid var(--border)',
        display:'flex', flexDirection:'column', alignItems:'center',
        padding:'10px 0', gap:2, flexShrink:0, overflowY:'auto',
      }}>
        {/* Logo */}
        <div style={{ width:34, height:34, borderRadius:'var(--radius-sm)', marginBottom:14,
          background:'linear-gradient(135deg,#4f8ef7,#a78bfa)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-head)', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
          AR
        </div>

        {/* Nav groups */}
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ width:'100%', display:'flex', flexDirection:'column', alignItems:'center',
            gap:2, paddingBottom:gi < NAV_GROUPS.length-1 ? 8 : 0,
            borderBottom: gi < NAV_GROUPS.length-1 ? '1px solid var(--border)' : 'none',
            marginBottom: gi < NAV_GROUPS.length-1 ? 8 : 0 }}>
            {group.items.map(item => {
              const isActive = view === item.id
              const scn = SCENARIO_LABELS[item.id]
              return (
                <button key={item.id} title={item.tip} onClick={() => {
  goView(item.id)
  if (item.id === 'chat') {
    setChatQuery(null)
  }
  if(item.id === 'wtp') {
    setWtpQuery(null)
  }
}}
                  style={{
                    position:'relative', width:42, height:42, borderRadius:'var(--radius-sm)',
                    border:'none', cursor:'pointer', display:'flex', alignItems:'center',
                    justifyContent:'center', transition:'all 0.15s',
                    background: isActive ? 'rgba(79,142,247,0.15)' : 'transparent',
                    color: isActive ? 'var(--accent-blue)' : 'var(--text-muted)',
                    fontSize:15,
                  }}
                  onMouseEnter={e => { if(!isActive){ e.currentTarget.style.background='var(--bg-hover)'; e.currentTarget.style.color='var(--text-secondary)' }}}
                  onMouseLeave={e => { if(!isActive){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}}>
                  {item.icon}
                  {scn && (
                    <span style={{
                      position:'absolute', top:4, right:4,
                      fontSize:6, fontWeight:800, letterSpacing:'0.04em',
                      color:isActive ? scn.color : 'var(--text-muted)', lineHeight:1,
                    }}>{scn.num}</span>
                  )}
                  {isActive && (
                    <div style={{ position:'absolute', left:0, top:'20%', width:2, height:'60%',
                      background:'var(--accent-blue)', borderRadius:2 }}/>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        <div style={{ flex:1 }}/>
        <button onClick={loadPortfolio} title="Refresh SAP data"
          style={{ width:42, height:42, borderRadius:'var(--radius-sm)', border:'none',
            cursor:'pointer', background:'transparent', color:'var(--text-muted)', fontSize:14,
            display:'flex', alignItems:'center', justifyContent:'center' }}
          onMouseEnter={e => { e.currentTarget.style.background='var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background='transparent' }}>
          ↻
        </button>
      </nav>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <OfflineBanner/>
        <ScenarioBar viewId={view}/>
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {renderView()}
        </div>
      </div>
    </div>
  )
}
