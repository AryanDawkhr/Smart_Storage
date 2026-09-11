"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeftRight, Bell, Box, ChevronRight, CircleUserRound, Home as HomeIcon, Plus, ScanLine, Settings2, Snowflake, UserRound, X } from 'lucide-react';
import { api, clearSession, connectTelemetry, getUser, setSession } from './api';
import { Badge, Button, Card as UiCard } from './ui';

const nav = [['home','Overview',HomeIcon],['storage','Storage',Snowflake],['add-produce','Add produce',Plus],['alerts','Alerts',Bell],['history','History',Box]];
const icons = { Tomato: '🍅', Cucumber: '🥒', 'King Chilli': '🌶️', Ginger: '🫚', 'Khasi Mandarin': '🍊', Potato: '🥔', Cabbage: '🥬' };

function useAppState() {
  const [user, setUser] = useState(() => typeof window === 'undefined' ? null : (getUser() || { name: 'Ramesh Bora', mobile: '9876543210', village: 'Mayong Village', district: 'Morigaon', state: 'Assam' }));
  const [unitId, setUnitId] = useState(() => typeof window === 'undefined' ? 1 : Number(localStorage.getItem('smart_storage_unit_id') || 1));
  const [unitCode, setUnitCode] = useState(() => typeof window === 'undefined' ? 'NER-CS-001' : (localStorage.getItem('smart_storage_unit') || 'NER-CS-001'));
  const [toast, setToast] = useState(null);
  const notify = (message, type = 'info') => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };
  const selectUnit = (unit) => { setUnitId(unit.id); setUnitCode(unit.unit_code); localStorage.setItem('smart_storage_unit_id', unit.id); localStorage.setItem('smart_storage_unit', unit.unit_code); };
  return { user, setUser, unitId, unitCode, toast, notify, selectUnit };
}

function Shell({ page, children, state }) {
  const { user, unitCode, toast } = state;
  return <div className="app-frame">
    <aside className="sidebar"><Link href="/home" className="brand"><span className="brand-mark"><Snowflake size={17} /></span><span><b>Smart Storage</b><small>Farmer console</small></span></Link><div className="sidebar-label">Workspace</div><nav className="side-nav">{nav.map(([href, label, Icon]) => <Link key={href} href={`/${href}`} className={page === href ? 'active' : ''}><Icon size={17} /><span>{label}</span>{href === 'alerts' && <span className="nav-count">2</span>}</Link>)}</nav><div className="sidebar-spacer" /><Link className="side-settings" href="/settings"><Settings2 size={17} /><span>Settings</span></Link><div className="account-chip"><span className="avatar-small"><UserRound size={15} /></span><span><b suppressHydrationWarning>{user?.name || 'Farmer'}</b><small>Farmer account</small></span></div></aside>
    <div className="shell"><header className="topbar"><div className="mobile-brand"><Link href="/home" className="brand"><span className="brand-mark"><Snowflake size={17} /></span><span><b>Smart Storage</b><small suppressHydrationWarning>{unitCode}</small></span></Link></div><div className="topbar-actions"><Badge tone="success"><i /> System safe</Badge><Button variant="ghost" size="icon" aria-label="Profile"><CircleUserRound size={18} /></Button></div></header><main className="content">{children}</main><nav className="bottom-nav">{nav.map(([href, label, Icon]) => <Link key={href} href={`/${href}`} className={`${page === href ? 'active ' : ''}${href === 'add-produce' ? 'add-link' : ''}`}><Icon size={19} /><span>{label === 'Add produce' ? 'Add' : label}</span></Link>)}</nav>{toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}</div>
  </div>;
}

function PageTitle({ title, subtitle, back = true, action }) { return <div className="page-title">{back && <Link href="/home" className="back" aria-label="Back"><ChevronRight size={20} /></Link>}<div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
function Card({ children, className = '' }) { return <UiCard className={className}>{children}</UiCard>; }
function Empty({ title, text }) { return <div className="empty"><strong>{title}</strong><span>{text}</span></div>; }

function Login({ state }) {
  const [mobile, setMobile] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); try { const data = await api.login(mobile, password); setSession(data); state.setUser(data.user); window.location.href = '/home'; } catch (e) { state.notify(e.message, 'error'); } finally { setBusy(false); } }
  async function quick(code) { const mobileNumber = code === 'B' ? '9876543211' : '9876543210'; try { const data = await api.login(mobileNumber, 'farmer123'); setSession(data); state.setUser(data.user); window.location.href = '/home'; } catch (e) { state.notify(e.message, 'error'); } }
  return <div className="auth-page"><Card><div className="auth-brand"><span className="brand-mark large"><Snowflake size={28} /></span><h1>Smart Storage</h1><p>Smart storage for better farming</p></div><form onSubmit={submit} className="form"><label>Mobile Number<input required pattern="[0-9]{10}" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="9876543210" /></label><label>Password<input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label><button disabled={busy}>{busy ? 'Signing in...' : 'Login to Storage'}</button></form><p className="center muted">New farmer? <Link href="/register">Register here</Link></p><div className="quick-login"><small>JUDGE DEMO QUICK-LOGIN</small><div><button className="secondary" onClick={() => quick('A')}>Farmer A · Tomato</button><button className="secondary" onClick={() => quick('B')}>Farmer B · Cucumber</button></div></div></Card></div>;
}

function Home({ state }) {
  const [unit, setUnit] = useState(null); const [records, setRecords] = useState([]); const [alerts, setAlerts] = useState([]); const [recs, setRecs] = useState([]);
  useEffect(() => { Promise.all([api.unit(state.unitId), api.produce(state.unitId), api.alerts(state.unitId, true), api.recommendations()]).then(([u,p,a,r]) => { setUnit(u); setRecords(p); setAlerts(a); setRecs(r); }).catch(e => state.notify(e.message, 'error')); }, [state.unitId]);
  if (!unit) return <Shell page="home" state={state}><div className="loading">Loading dashboard...</div></Shell>;
  const pct = unit.occupancy_percentage || 0;
  return <Shell page="home" state={state}><div className="greeting"><div><h1>Namaste, {state.user?.name || 'Farmer'} 🙏</h1><p>{unit.village}, {unit.district}, {unit.state}</p></div><Link href="/scan" className="text-link">Switch unit →</Link></div><Card className="capacity"><div className="section-head"><b>Current storage</b><span>{pct.toFixed(0)}% occupied</span></div><div className="capacity-row"><strong>{unit.occupied_capacity.toFixed(1)} kg</strong><span>{unit.available_capacity.toFixed(1)} kg available<br />of {unit.total_capacity.toFixed(0)} kg</span></div><div className="progress"><i style={{width:`${Math.min(pct,100)}%`}} /></div><div className="meta-row"><span>Capacity {unit.total_capacity} kg</span><span>Shared chamber</span></div></Card><div><div className="eyebrow">Current condition</div><div className="metric-grid"><Metric label="Inside temp" value={`${(unit.current_temp ?? 11.6).toFixed(1)}°C`} sub="Target 11.5°C" /><Metric label="Humidity" value={`${(unit.current_humidity ?? 78).toFixed(0)}%`} sub="Safe 75–90%" /><Metric label="Battery" value={`${(unit.battery_percentage ?? 82).toFixed(0)}%`} sub="LiFePO4 Solar" /><Metric label="Door" value={unit.door_open ? 'Open' : 'Closed'} sub="Magnetic seal" /></div></div><div className="action-grid"><Link href="/scan"><ScanLine size={22} /><span>Scan storage</span></Link><Link href="/add-produce" className="primary-action"><Plus size={22} /><span>Add produce</span></Link><Link href="/live-storage"><Activity size={22} /><span>Live status</span></Link></div><Card><div className="section-head"><b>Active alerts</b><Link href="/alerts">View all →</Link></div>{alerts[0] ? <AlertRow alert={alerts[0]} /> : <Empty title="Storage operating normal" text="Solar cooling and humidity are within safe bands." />}</Card><Card><div className="section-head"><b>Current produce</b><span>Chamber inventory</span></div>{records.length ? records.map(r => <div className="list-row" key={r.id}><span className="crop-icon">{icons[r.crop_name] || '📦'}</span><span><b>{r.crop_name}</b><small>Stored {r.storage_age_human} · {r.farmer_name}</small></span><strong>{r.quantity_kg} kg</strong></div>) : <Empty title="No produce stored" text="Add a harvest batch to begin." />}</Card><Card><div className="section-head"><b>Decision support</b><Link href="/recommendation">Full analysis →</Link></div><div className="recommendation"><b>{recs[0]?.decision || 'STORE'}</b><p>{recs[0]?.primary_reason || 'Storage conditions are optimal. Produce is safely preserved.'}</p></div></Card></Shell>;
}

function Metric({ label, value, sub }) { return <div className="metric"><small>{label}</small><strong>{value}</strong><span>{sub}</span></div>; }
function AlertRow({ alert }) { return <div className="alert-row"><span>{alert.severity === 'CRITICAL' ? '🚨' : '⚠️'}</span><span><b>{alert.title}</b><small>{alert.message}</small></span></div>; }

function Storage({ state }) { const [unit,setUnit]=useState(null); const [records,setRecords]=useState([]); const [units,setUnits]=useState([]); useEffect(()=>{Promise.all([api.unit(state.unitId),api.produce(state.unitId),api.units()]).then(([u,p,all])=>{setUnit(u);setRecords(p);setUnits(all)}).catch(e=>state.notify(e.message,'error'))},[state.unitId]); if(!unit)return <Shell page="storage" state={state}><div className="loading">Loading storage...</div></Shell>; return <Shell page="storage" state={state}><PageTitle title="Storage unit details" action={<Link href="/scan" className="icon-link" aria-label="Scan another unit"><ScanLine size={18} /></Link>} /><Card className="capacity"><div className="section-head"><span>COMMUNITY COLD CHAMBER</span><em>ACTIVE</em></div><h2>{unit.unit_code}</h2><p>{unit.village}, {unit.district}, {unit.state}</p><div className="progress"><i style={{width:`${unit.occupancy_percentage}%`}}/></div><div className="meta-row"><b>{unit.occupied_capacity} kg / {unit.total_capacity} kg</b><span>{unit.occupancy_percentage}% occupied</span></div><div className="info-grid"><span>Safe temp<strong>{unit.min_safe_temp}–{unit.max_safe_temp}°C</strong></span><span>Power<strong>Solar + LiFePO4</strong></span></div></Card><Card><div className="section-head"><b>Chamber occupants</b><span>Shared records</span></div>{records.length?records.map(r=><div className="list-row" key={r.id}><span className="crop-icon">📦</span><span><b>{r.farmer_name} · {r.crop_name}</b><small>{r.storage_age_human} ago · {r.current_condition}</small></span><strong>{r.quantity_kg} kg</strong></div>):<Empty title="Chamber is empty" text="No stored produce in this unit."/>}</Card><div className="eyebrow">Decentralized network</div>{units.map(u=><button className="unit-row" key={u.id} onClick={()=>{state.selectUnit(u);setUnit(u)}}><b>❄ {u.unit_code}</b><span>{u.available_capacity.toFixed(0)} kg available</span><small>{u.village}, {u.district} · {u.occupied_capacity}/{u.total_capacity} kg</small></button>)}</Shell>; }

function Scan({ state }) {
  const [code, setCode] = useState('');
  const [cameraState, setCameraState] = useState('idle');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    if (cameraState !== 'active' || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraState]);

  async function lookup(value = code) {
    const id = value.trim().toUpperCase();
    if (!id) return state.notify('Enter a Unit ID', 'warning');
    try {
      const unit = await api.unitByQr(id);
      state.selectUnit(unit);
      window.location.href = '/storage';
    } catch (e) {
      state.notify(e.message, 'error');
    }
  }

  function stopCamera() {
    if (scanTimerRef.current) window.clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle');
  }

  async function startCamera() {
    const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    if (!window.isSecureContext && !localHost) {
      setCameraState('secure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      setCameraState('active');
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        scanTimerRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              stopCamera();
              await lookup(codes[0].rawValue);
            }
          } catch {}
        }, 500);
      }
    } catch (error) {
      setCameraState(error?.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }

  const cameraMessage = {
    idle: 'Camera scanner ready',
    active: 'Point the camera at the unit QR code',
    denied: 'Camera permission was denied. Allow camera access in browser settings, then try again.',
    unsupported: 'Camera access is unavailable in this browser. Use manual entry below.',
    secure: 'Camera access requires HTTPS on a phone. Open the app over HTTPS, or use manual entry below.',
    error: 'Camera could not start. Check that no other app is using it, then try again.',
  }[cameraState];

  return <Shell page="scan" state={state}><PageTitle title="Identify storage unit"/><Card className="center"><div className={`scanner ${cameraState === 'active' ? 'scanner-live' : ''}`}>{cameraState === 'active' ? <><video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={event => event.currentTarget.play().catch(() => {})} /><span className="camera-frame" /></> : <><span className="scanner-icon"><ScanLine size={54} /></span><span className="scanner-message">{cameraMessage}</span></>}<div className="scanner-actions">{cameraState === 'active' ? <button className="secondary" onClick={stopCamera}>Stop camera</button> : <button onClick={startCamera}>Start camera scan</button>}{cameraState === 'active' && !('BarcodeDetector' in (typeof window === 'undefined' ? {} : window)) && <small>QR auto-detection is unavailable. Use manual entry below.</small>}</div></div><div className="divider"/><label className="form-label">Or enter Unit ID manually<div className="inline-form"><input value={code} onChange={e=>setCode(e.target.value)} placeholder="NER-CS-001"/><button onClick={()=>lookup()}>Go</button></div></label></Card><Card><div className="section-head"><b>Regional units</b></div>{['NER-CS-001','NER-CS-002','NER-CS-003'].map((x,i)=><button className="unit-row" key={x} onClick={()=>lookup(x)}><b>{x}</b><span>{i===2?'75':'50'} kg</span><small>{['Mayong, Morigaon','Teok, Jorhat','Mawkynrew, Shillong'][i]}</small></button>)}</Card></Shell>;
}

function AddProduce({ state }) { const [crops,setCrops]=useState([]);const [crop,setCrop]=useState('');const [qty,setQty]=useState('');const [check,setCheck]=useState(null);const [form,setForm]=useState({condition:'Good',date:new Date().toISOString().slice(0,10),notes:''}); useEffect(()=>{api.crops().then(setCrops)},[]); async function validate(){if(!crop||!qty)return;try{setCheck(await api.compatibility({storage_unit_id:state.unitId,candidate_crop_id:Number(crop),quantity_kg:Number(qty)}))}catch(e){state.notify(e.message,'error')}} async function submit(e){e.preventDefault();if(!check?.compatible||!check.capacity_available)return state.notify('Resolve capacity or compatibility warnings first','warning');try{await api.addProduce(state.unitId,{storage_unit_id:state.unitId,crop_id:Number(crop),quantity_kg:Number(qty),initial_condition:form.condition,harvest_date:form.date,farmer_notes:form.notes});state.notify('Produce stored successfully','success');setTimeout(()=>window.location.href='/home',600)}catch(e){state.notify(e.message,'error')}}return <Shell page="add-produce" state={state}><PageTitle title="Add produce to storage" action={<Link href="/compatibility" className="icon-link" aria-label="Check crop compatibility"><ArrowLeftRight size={18} /></Link>}/><Card><p className="callout">Target unit: <b>{state.unitCode}</b><br/><small>Capacity and thermal compatibility are checked automatically.</small></p><form className="form" onSubmit={submit}><label>Harvested crop<select required value={crop} onChange={e=>{setCrop(e.target.value);setCheck(null)}}><option value="">Select crop</option>{crops.map(c=><option key={c.id} value={c.id}>{c.name} · {c.profile?.min_temp}–{c.profile?.max_temp}°C</option>)}</select></label><label>Quantity (kg)<input required type="number" min="1" step="0.5" value={qty} onChange={e=>{setQty(e.target.value);setCheck(null)}} onBlur={validate}/></label><label>Condition<select value={form.condition} onChange={e=>setForm({...form,condition:e.target.value})}><option>Fresh</option><option>Good</option><option>Slightly damaged</option><option>Damaged</option></select></label><label>Harvest date<input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label>Farmer notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{check&&<div className={`result ${check.compatible&&check.capacity_available?'success':'error'}`}><b>{check.capacity_available?(check.compatible?'✓ Compatible & space confirmed':'⚠ Incompatible produce'):'⛔ Capacity exceeded'}</b><span>{check.message}</span></div>}<button disabled={!check?.compatible||!check?.capacity_available}>Confirm & store produce</button></form></Card></Shell>; }

function Compatibility({ state }) { const [crops,setCrops]=useState([]);const [a,setA]=useState('');const [b,setB]=useState('');const [result,setResult]=useState(null); useEffect(()=>{api.crops().then(setCrops)},[]);function check(){const x=crops.find(c=>c.id===Number(a)),y=crops.find(c=>c.id===Number(b));if(!x||!y)return;const min=Math.max(x.profile.min_temp,y.profile.min_temp),max=Math.min(x.profile.max_temp,y.profile.max_temp);setResult({ok:min<=max,message:min<=max?`${x.name} and ${y.name} share ${min}–${max}°C.`:`${x.name} and ${y.name} have no common safe range.`,target:min<=max?((min+max)/2).toFixed(1):null})}return <Shell page="compatibility" state={state}><PageTitle title="Crop compatibility checker"/><Card><div className="section-head"><b>Test crop pair compatibility</b></div><p className="muted">Calculate the safe temperature intersection before mixing produce.</p><div className="form two"><label>Crop 1<select value={a} onChange={e=>{setA(e.target.value);setResult(null)}}><option value="">Select crop</option>{crops.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Crop 2<select value={b} onChange={e=>{setB(e.target.value);setResult(null)}}><option value="">Select crop</option>{crops.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><button className="secondary full" onClick={check}>Analyze intersection</button>{result&&<div className={`result ${result.ok?'success':'error'}`}><b>{result.ok?'✓ COMPATIBLE':'⛔ INCOMPATIBLE'}</b><span>{result.message}{result.target&&` Target: ${result.target}°C.`}</span></div>}</Card></Shell>; }

function LiveStorage({ state }) { const [data,setData]=useState(null);const [history,setHistory]=useState([]);useEffect(()=>{api.telemetry(state.unitId).then(d=>{setData(d.latest);setHistory(d.history||[])});const ws=connectTelemetry(msg=>{if(msg.type==='telemetry_update'&&msg.storage_unit_id===state.unitId)setData(msg)});return()=>ws.close()},[state.unitId]);return <Shell page="live-storage" state={state}><PageTitle title="Live chamber telemetry" action={<Simulation state={state} compact/>}/><Card className="hero-metric"><small>INSIDE STORAGE TEMPERATURE</small><strong>{data?`${Number(data.inside_temp).toFixed(1)}°C`:'11.6°C'}</strong><span>Target 11.5°C · SAFE</span></Card><div className="metric-grid"><Metric label="Humidity" value={`${Number(data?.inside_humidity||78).toFixed(0)}%`} sub="Optimal 75–90%"/><Metric label="Door" value={data?.door_open?'OPEN':'CLOSED'} sub="Magnetic reed switch"/><Metric label="Battery" value={`${Number(data?.battery_percentage||82).toFixed(0)}%`} sub={`${Number(data?.battery_voltage||13.2).toFixed(2)}V Solar`}/><Metric label="Cooling" value={data?.cooling_active?'ON':'IDLE'} sub="Hysteresis active"/></div><Card><div className="section-head"><b>Recent trend</b><span>{history.length} readings</span></div><div className="sparkline">{history.map((p,i)=><i key={i} style={{height:`${Math.max(8,Number(p.inside_temp)*4)}%`}}/> )}</div></Card></Shell>; }

function Simulation({ state, compact=false }) { const [open,setOpen]=useState(false);async function control(payload){await api.controlSimulation(payload);state.notify('Simulation updated','success');setOpen(false)}return <>{<button className={compact?'secondary compact':'secondary'} onClick={()=>setOpen(true)}>Demo controls</button>}{open&&<div className="modal-backdrop"><Card className="modal"><div className="section-head"><b>Hardware demo controls</b><button className="icon-button" onClick={()=>setOpen(false)} aria-label="Close"><X size={16} /></button></div><p className="muted">Trigger sensor conditions without physical hardware.</p><div className="button-grid"><button onClick={()=>control({force_temperature:16.5})}>🔥 Force 16.5°C</button><button onClick={()=>control({force_temperature:11.5})}>❄ Reset 11.5°C</button><button onClick={()=>control({force_door_open:true})}>🚪 Open door</button><button onClick={()=>control({force_door_open:false})}>🔒 Seal door</button><button onClick={()=>control({force_battery_pct:22})}>🪫 Drain to 22%</button><button onClick={()=>control({force_battery_pct:85})}>🔋 Restore battery</button></div></Card></div>}</> }

function Alerts({ state }) { const [items,setItems]=useState([]);const [active,setActive]=useState(true);function load(){api.alerts(null,active).then(setItems)}useEffect(load,[active]);return <Shell page="alerts" state={state}><PageTitle title="Alerts & safety" action={<Simulation state={state} compact/>}/><div className="tabs"><button className={active?'selected':''} onClick={()=>setActive(true)}>Active alerts</button><button className={!active?'selected':''} onClick={()=>setActive(false)}>All history</button></div>{items.length?items.map(a=><Card key={a.id}><AlertRow alert={a}/>{a.is_active&&<button className="secondary" onClick={()=>api.resolveAlert(a.id).then(load)}>Acknowledge & resolve</button>}</Card>):<Card><Empty title="No active alerts" text="All monitored units are within safe boundaries."/></Card>}</Shell>; }

function History({ state }) { const [items,setItems]=useState([]);const [all,setAll]=useState(false);function load(){api.history(all).then(setItems)}useEffect(load,[all]);return <Shell page="history" state={state}><PageTitle title="Storage history & aging"/><div className="tabs"><button className={!all?'selected':''} onClick={()=>setAll(false)}>My produce</button><button className={all?'selected':''} onClick={()=>setAll(true)}>Entire chamber</button></div>{items.length?items.map(r=><Card key={r.id}><div className="section-head"><b>{r.crop_name} · {r.quantity_kg} kg</b><em className={r.status === 'retrieved' ? 'pill-neutral' : r.status === 'dispatched' ? 'pill-warning' : ''}>{r.status}</em></div><p>{r.unit_code} · stored {r.storage_age_human} ago</p><p className="muted">Safe shelf-life left: {r.remaining_safe_human}</p>{r.status==='stored'&&<button className="secondary" onClick={()=>api.checkout(r.id).then(load)}>Retrieve / checkout</button>}</Card>):<Card><Empty title="No storage history" text="No produce batches found."/></Card>}</Shell>; }

function Market({ state }) { const [market,setMarket]=useState([]);const [transport,setTransport]=useState([]);useEffect(()=>{Promise.all([api.market(),api.transport()]).then(([m,t])=>{setMarket(m);setTransport(t)})},[]);return <Shell page="market" state={state}><PageTitle title="Market & logistics"/><div className="eyebrow">Regional mandi rates</div>{market.map(m=><Card key={m.id}><div className="section-head"><b>{m.crop_name}</b><em className={m.price_trend === 'DOWN' ? 'pill-danger' : m.price_trend === 'STABLE' ? 'pill-neutral' : ''}>{m.price_trend}</em></div><p>{m.market_name}, {m.district} · {m.distance_km} km</p><h2>₹{m.modal_price.toFixed(0)} <small>/ quintal</small></h2></Card>)}<div className="eyebrow">Rural freight</div>{transport.map(t=><Card key={t.id}><b>🚚 {t.transport_mode}</b><p>{t.origin_village} → {t.destination_market}</p><p className="muted">{t.estimated_hours} hours · ₹{t.cost_per_quintal}/qtl · {t.departure_time}</p><a className="secondary button-link" href={`tel:${t.provider_phone}`}>Call driver</a></Card>)}</Shell>; }

function Recommendations({ state }) { const [items,setItems]=useState([]);useEffect(()=>{api.recommendations().then(setItems)},[]);return <Shell page="recommendation" state={state}><PageTitle title="Decision support"/><Card className="callout"><b>Explainable farmer intelligence</b><p>Recommendations combine chamber stability, storage age, mandi prices, and transport availability.</p></Card>{items.length?items.map(r=><Card key={r.id}><div className="section-head"><b className="decision">{r.decision}</b><strong>{r.confidence_score}% confidence</strong></div><h3>{r.crop_name} · {r.quantity_kg} kg</h3><p>{r.primary_reason}</p></Card>):<Card><Empty title="No active produce to analyze" text="Store produce to receive a recommendation."/></Card>}</Shell>; }

function Profile({ state }) { return <Shell page="profile" state={state}><PageTitle title="Farmer profile"/><Card className="profile"><span className="avatar">👨‍🌾</span><h1>{state.user?.name}</h1><p>+91 {state.user?.mobile}</p><p>{state.user?.village}, {state.user?.district}, {state.user?.state}</p></Card><Card><div className="section-head"><b>Quick actions</b></div><Link className="unit-row" href="/history">Storage history →</Link><Link className="unit-row" href="/market">Mandi prices & logistics →</Link><Link className="unit-row" href="/settings">System preferences →</Link><Logout/></Card></Shell>; }
function Logout(){return <button className="danger full" onClick={()=>{clearSession();window.location.href='/'}}>Log out</button>}
function Settings({ state }) { return <Shell page="settings" state={state}><PageTitle title="Settings & preferences"/><Card><div className="section-head"><b>Language</b></div><select defaultValue="en"><option value="en">English</option><option value="as">Assamese</option><option value="hi">Hindi</option><option value="bn">Bengali</option></select></Card><Card><div className="section-head"><b>Temperature units</b></div><label className="radio"><input type="radio" defaultChecked name="temp"/> Celsius (°C)</label><label className="radio"><input type="radio" name="temp"/> Fahrenheit (°F)</label></Card><Card><div className="section-head"><b>Simulation mode</b><em>ACTIVE</em></div><p className="muted">Use the controls to test temperature, door, battery, and connectivity alerts.</p><Simulation state={state}/></Card><Card><Logout/></Card></Shell>; }
function Register({ state }) { const [form,setForm]=useState({name:'',mobile:'',state:'Assam',district:'',village:'',password:'',confirm:''});async function submit(e){e.preventDefault();if(form.password!==form.confirm)return state.notify('Passwords do not match','error');try{const data=await api.register(form);setSession(data);window.location.href='/home'}catch(e){state.notify(e.message,'error')}}return <div className="auth-page"><Card><div className="auth-brand"><span className="brand-mark large"><Snowflake size={28} /></span><h1>Farmer registration</h1><p>Join your local solar cold storage network</p></div><form className="form" onSubmit={submit}>{[['name','Full name'],['mobile','Mobile number'],['district','District'],['village','Village'],['password','Create password'],['confirm','Confirm password']].map(([key,label])=><label key={key}>{label}<input required type={key.includes('password')||key==='confirm'?'password':'text'} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}<label>State<select value={form.state} onChange={e=>setForm({...form,state:e.target.value})}><option>Assam</option><option>Meghalaya</option><option>Manipur</option><option>Mizoram</option><option>Nagaland</option><option>Tripura</option></select></label><button>Complete registration</button></form><p className="center muted">Already registered? <Link href="/">Login</Link></p></Card></div>; }

export default function AppScreen({ page }) { const state=useAppState(); if(page==='index') return <Login state={state}/>; if(page==='register') return <Register state={state}/>; const screens={home:Home,storage:Storage,scan:Scan,'add-produce':AddProduce,compatibility:Compatibility,'live-storage':LiveStorage,alerts:Alerts,history:History,market:Market,recommendation:Recommendations,profile:Profile,settings:Settings}; const Screen=screens[page]||Home; return <Screen state={state}/>; }
