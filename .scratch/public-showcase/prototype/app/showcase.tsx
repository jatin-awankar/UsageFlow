'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight, Fingerprint, Layers2, LockKeyhole, RotateCcw, Braces, Radio, BookOpen } from 'lucide-react';

const EVENT = 'evt_demo_0125';
const PRICE = 'pv_api_sep_01';
const stages = ['Accept usage', 'Inspect pricing', 'Monthly record', 'Webhook delivery'];
const copy = {
  headline: 'Every number has a story.',
  intro: 'Follow usage from an accepted event to a priced monthly BillingRecord. See the evidence behind every amount.',
  explanation: 'One customer. One month. A calculation you can explain.',
};
// Exact INR rounding: 2,500 micro-rupees × quantity, half-up to paise.
// This is a deliberately bounded prototype control, not an ingestion API limit.
function paise(quantity: number) { return (BigInt(quantity) * 2500n + 5000n) / 10000n; }
function money(value: bigint) { return `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`; }

export default function Showcase() {
  const router = useRouter();
  const params = useSearchParams();
  const variant = params.get('variant') === 'B' ? 'B' : 'A';
  const demo = params.get('view') === 'demo';
  const [input, setInput] = useState('1250');
  const [accepted, setAccepted] = useState<number | null>(null);
  const [rated, setRated] = useState(false);
  const [retries, setRetries] = useState(0);
  const [stage, setStage] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const chapterHeading = useRef<HTMLHeadingElement>(null);
  const retryButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (accepted !== null) retryButton.current?.focus({ preventScroll: true }); }, [accepted]);
  const previousStage = useRef(stage);
  useEffect(() => {
    if (previousStage.current !== stage) chapterHeading.current?.focus({ preventScroll: true });
    previousStage.current = stage;
  }, [stage]);
  const quantity = accepted ?? (/^\d+$/.test(input) && Number(input) <= 10000 ? Number(input) : 0);
  const contribution = paise(quantity);
  const total = 2500n + (rated ? contribution : 0n);
  function navigate(view: string, nextVariant = variant) {
    router.replace(`/?variant=${nextVariant}&view=${view}`, {scroll: view !== (demo ? 'demo' : 'landing')});
  }
  function switchVariant() { navigate(demo ? 'demo' : 'landing', variant === 'A' ? 'B' : 'A'); }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,button,a,[contenteditable],[role="tab"],[role="dialog"]')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        router.replace(`/?variant=${variant === 'A' ? 'B' : 'A'}&view=${demo ? 'demo' : 'landing'}`, {scroll:false});
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [variant, demo, router]);
  function accept() {
    if (!/^\d+$/.test(input) || Number(input) < 1 || Number(input) > 10000) {
      setError('Choose a whole quantity from 1 to 10,000 for this prototype.'); return;
    }
    setError(''); setAccepted(Number(input));
    setMessage(`${EVENT} accepted. Ledger pending; not yet rated.`);
  }
  function reset() { setInput('1250'); setAccepted(null); setRated(false); setRetries(0); setStage(0); setError(''); setMessage('Demo reset to the original scenario.'); }
  function rate() { setRated(true); setStage(1); setMessage(`Processing and rating simulated. INR ${money(contribution)} added once to the monthly calculation.`); }

  const resetButton = <Dialog.Root><Dialog.Trigger asChild><button className="text-button"><RotateCcw size={15}/> Reset demo</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content"><Dialog.Title>Reset this demonstration?</Dialog.Title><Dialog.Description>Your quantity, accepted event, and retry history will be cleared. No real data is affected.</Dialog.Description><div className="flex gap-3 mt-6"><Dialog.Close asChild><button className="primary" onClick={reset}>Reset demo</button></Dialog.Close><Dialog.Close asChild><button className="secondary">Keep exploring</button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>;

  function scenarioHeader() { return <div className="scenario-line"><span>NORTHSTAR API <span className="muted">/</span> CUSTOMER: ORBIT STUDIO</span><span>SEPTEMBER 2026 · INR</span></div>; }
  function eventForm() { return <div className="event-form">
    <div className="section-kicker"><span>01 / ACCEPT USAGE</span><span className="status">{accepted === null ? 'Prepared' : 'Accepted'}</span></div>
    <h2 ref={chapterHeading} tabIndex={-1}>A little usage.<br/>A lasting record.</h2>
    <p>Orbit Studio made API calls. Accept this event to create an immutable record of that usage.</p>
    <div className="input-row"><div><label htmlFor="quantity">Quantity <span className="muted">· API calls</span></label><input id="quantity" inputMode="numeric" value={input} onChange={e=>{setInput(e.target.value);setError('');}} readOnly={accepted !== null} aria-describedby="quantity-help quantity-error" aria-invalid={!!error}/></div><div className="unit-note">INR 0.0025<span>per API call</span></div></div>
    <p id="quantity-help" className="micro">{accepted === null ? 'Try 1–10,000 calls in this prototype. This control range is not an API limit.' : 'Accepted events are immutable. Reset to try another quantity.'}</p><p id="quantity-error" className="error" role="alert">{error}</p>
    <dl className="facts"><div><dt>Occurred at</dt><dd>28 Sep 2026, 14:32 UTC</dd></div><div><dt>Metric</dt><dd>API_CALL</dd></div><div><dt>Customer reference</dt><dd>orbit_studio</dd></div></dl>
    {accepted === null ? <button className="primary" onClick={accept}>Accept event <ArrowRight size={17}/></button> : <div className="accepted-actions"><div className="accept-receipt"><Check size={18}/><span><strong>{EVENT}</strong><small>{rated ? 'Ledger processed · Rated' : 'Ledger pending · Not rated'}</small></span></div><div className="flex flex-wrap gap-3"><button ref={retryButton} className="secondary" onClick={()=>{setRetries(retries+1);setMessage(`Identical retry ${retries+1}: returned ${EVENT}. No new event or amount added.`);}}><RotateCcw size={15}/> Retry identical event</button>{!rated && <button className="primary" onClick={rate}>Process & rate event <ArrowRight size={16}/></button>}</div></div>}
    <p className="micro action-note">Local simulation · No API request is sent.</p>
  </div>; }
  function pricing() { return <div className="pricing-panel"><div className="section-kicker"><span>02 / INSPECT PRICING</span><span className="status">{rated ? 'Rated' : 'Preview'}</span></div><h2 ref={chapterHeading} tabIndex={-1}>The price at that moment.</h2><p>The occurrence time selects the price. A later retry never creates a second contribution.</p><div className="equation"><div><strong>{quantity.toLocaleString('en-IN')}</strong><span>API calls</span></div><span>×</span><div><strong>0.0025</strong><span>INR per call</span></div><span>=</span><div><strong>{money(contribution)}</strong><span>INR · rounded once</span></div></div><dl className="facts"><div><dt>PriceVersion</dt><dd>{PRICE}</dd></div><div><dt>Effective from</dt><dd>01 Sep 2026, 00:00 UTC</dd></div><div><dt>Source event</dt><dd>{accepted !== null ? EVENT : 'Not accepted yet'}</dd></div><div><dt>Rating</dt><dd>{rated ? 'RATED · exact persisted amount '+money(contribution)+'0' : 'Preview only · no rated contribution'}</dd></div></dl>{accepted !== null && !rated && <button className="primary" onClick={rate}>Process & rate event <ArrowRight size={16}/></button>}<p className="micro">Half-up rounding to INR paise happens once per event. Monthly amounts sum those rounded contributions.</p></div>; }
  function ledger() { return <div className="ledger-block"><div className="section-kicker"><span>SEPTEMBER / CALCULATION</span><span className="status">Open</span></div><h3>Every contribution accounted for.</h3><div className="ledger-row"><span>Earlier usage <small>2 rated events · 10,000 calls</small></span><strong>INR 25.00</strong></div><div className={`ledger-row current ${rated ? 'rated' : ''}`}><span>This event <small>{rated ? EVENT : 'Not included until rated'}</small></span><strong>{rated ? `+ INR ${money(contribution)}` : '—'}</strong></div><div className="ledger-total"><span>Monthly total <small>{2+(accepted !== null ? 1 : 0)} accepted · {2+(rated ? 1 : 0)} rated</small></span><strong><small>INR</small> {money(total)}</strong></div><p className="micro">Comparison calculation · Not a tax invoice or payment request.</p></div>; }
  function preview(which: number) { return <div className="preview-panel"><span className="eyebrow">{which === 2 ? '03 / MONTHLY RECORD' : '04 / WEBHOOK DELIVERY'} · PREVIEW ONLY</span><h2 ref={chapterHeading} tabIndex={-1}>{which === 2 ? 'Close the month. Review the evidence.' : 'A record your system can follow.'}</h2><p>{which === 2 ? 'The full experience will advance scenario time explicitly, then let an owner review and finalize the reconciled BillingRecord.' : 'The full experience will connect the finalized version to its invoice.finalized event and a successful simulated delivery.'}</p><dl className="facts"><div><dt>UTC month</dt><dd>01 Sep → 01 Oct 2026 (end excluded)</dd></div><div><dt>Inclusive late close</dt><dd>04 Oct 2026, 00:00 UTC</dd></div><div><dt>Eligible finalization</dt><dd>Strictly after that close</dd></div></dl><div className="preview-note"><LockKeyhole size={19}/><span>No finalization or delivery runs in this prototype. Pilot gates remain closed.</span></div></div>; }
  function inspector() { return <aside className="inspector"><div className="inspector-heading"><Braces size={17}/><span>Evidence inspector</span></div><div className="inspector-content"><span className="eyebrow">CURRENT EVENT</span><h3>{accepted !== null ? EVENT : 'Prepared event'}</h3><dl className="facts"><div><dt>Acceptance</dt><dd>{accepted !== null ? 'ACCEPTED' : 'NOT SENT'}</dd></div><div><dt>Ledger</dt><dd>{accepted === null ? '—' : rated ? 'PROCESSED' : 'PENDING'}</dd></div><div><dt>Rating</dt><dd>{rated ? 'RATED' : 'NOT RATED'}</dd></div><div><dt>Identical retries</dt><dd>{retries}</dd></div></dl><div className="trace-path"><span>{accepted !== null ? EVENT : 'Awaiting acceptance'}</span><ChevronRight size={16}/><span>{PRICE}</span></div>{ledger()}<p className="micro">{retries ? `Retry returned the same event ${retries} time${retries>1?'s':''}. Counts and total are unchanged.` : 'Accept an event, then retry it to inspect the same identity.'}</p></div></aside>; }
  function heroFigure() { return <div className="hero-figure" aria-label="Illustrative calculation for 1,250 calls"><div className="figure-top"><span>ORBIT STUDIO</span><span>SEP / 2026</span></div><span className="eyebrow">ONE EVENT, EXPLAINED</span><div className="hero-number">1,250<span>API calls</span></div><div className="figure-rule"><span>Price at occurrence</span><strong>INR 0.0025</strong></div><div className="figure-result"><span>Monthly contribution</span><strong>INR 3.13</strong></div><div className="figure-caption"><Fingerprint size={20}/><span>One stable identity.<br/>Even when you send it twice.</span></div><span className="figure-footnote">Illustrative rated outcome · synthetic data</span></div>; }
  function landing() { return <>
    <section className="landing-hero"><div className="hero-copy"><span className="eyebrow">USAGE BILLING, MADE EXPLAINABLE</span><h1>{copy.headline}</h1><p>{copy.intro}</p><button className="primary hero-cta" onClick={()=>navigate('demo')}>Explore the demo <ArrowUpRight size={19}/></button><div className="micro hero-meta">3–5 minute story <span>•</span> No signup</div></div>{variant === 'A' ? heroFigure() : <div className="signal-hero-art"><div className="signal-caption"><Radio size={17}/> TRACE / 001 <span>ILLUSTRATIVE OUTCOME</span></div><div className="signal-flow">{['1,250 calls','INR 0.0025','INR 3.13','Delivery'].map((v,i)=><div className="signal-node" key={v}><span>0{i+1} / {['EVENT','PRICE','CONTRIBUTION','WEBHOOK'][i]}</span><strong>{v}</strong><small>{['evt_demo_0125','pv_api_sep_01','Rounded once','Preview'][i]}</small></div>)}</div><p>Same event. Same evidence. From acceptance to delivery.</p></div>}</section>
    <section className="landing-bottom"><div><span className="eyebrow">THE THREAD THAT CONNECTS IT ALL</span><h2>{copy.explanation}</h2></div><div className="principles">{[['01','Accept once','A stable event ID makes identical retries safe.'],['02','Explain the amount','Trace the price and the exact monthly contribution.'],['03','Keep the evidence','Follow the record through to its delivery.']].map(([n,t,p])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{p}</p></article>)}</div></section>
    <footer className="landing-footer"><span>Built for technical teams who need to trust their numbers.</span><span>Synthetic demonstration. Production readiness is a separate review.</span></footer>
  </>; }

  return <div className={`study ${variant === 'A' ? 'annotated' : 'signal'}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="masthead"><button className="wordmark" onClick={()=>navigate('landing')} aria-label="UsageFlow home"><span className="brand-mark"><Layers2 size={22}/></span>UsageFlow<span className="wordmark-period">.</span></button><nav aria-label="Page"><button onClick={()=>navigate('landing')} aria-current={!demo ? 'page' : undefined}>Overview</button><button onClick={()=>navigate('demo')} aria-current={demo ? 'page' : undefined}>Interactive demo <ArrowUpRight size={14}/></button></nav></header>
    <div className="simulation-band"><span><span className="dot"/> SYNTHETIC DATA · LOCAL SIMULATION</span><span>DESIGN STUDY / {variant === 'A' ? 'ANNOTATED LEDGER' : 'SIGNAL DESK'}</span></div>
    <main id="main" tabIndex={-1}>{!demo ? landing() : <div className="workspace">
      <div className="workspace-title"><div><span className="eyebrow">AN EVENT’S JOURNEY</span><h1>From usage to understanding.</h1></div>{resetButton}</div>{scenarioHeader()}
      {variant === 'A' ? <div className="editorial-workspace"><nav className="chapter-nav" aria-label="Demo chapters">{stages.map((label,i)=><button key={label} onClick={()=>setStage(i)} aria-current={stage===i ? 'step' : undefined}><span>0{i+1}</span>{label}{i>1 && <small>Preview</small>}</button>)}</nav><div className="editorial-body"><section className="chapter-main" key={stage}>{stage === 0 ? eventForm() : stage === 1 ? pricing() : preview(stage)}<div className="chapter-next">{stage>0 && <button className="text-button" onClick={()=>setStage(stage-1)}><ArrowLeft size={15}/> Previous chapter</button>}{stage<3 && <button className="text-button" onClick={()=>setStage(stage+1)}>Next: {stages[stage+1]} <ArrowRight size={15}/></button>}</div></section><aside className="margin-evidence"><span className="annotation-label"><BookOpen size={16}/> IN THE MARGIN</span><h3>A record, not just a number.</h3><p>Accept the event once. Its identity stays with the calculation—even when the sender retries.</p><div className="margin-id"><Fingerprint size={19}/><span>{accepted !== null ? EVENT : 'Event identity appears on acceptance'}</span></div>{ledger()}<div className="retry-note"><RotateCcw size={16}/><span>{retries} identical {retries === 1 ? 'retry' : 'retries'} · {accepted !== null ? '1' : '0'} new event</span></div></aside></div></div> : <><nav className="stage-rail" aria-label="Demo stages">{stages.map((label,i)=><button key={label} onClick={()=>setStage(i)} aria-current={stage===i ? 'step' : undefined}><span>{i+1}</span><div>{label}{i>1 && <small>Preview</small>}</div><ChevronRight size={17}/></button>)}</nav><div className="signal-workspace"><section className="signal-object" key={stage}>{stage === 0 ? eventForm() : stage === 1 ? pricing() : preview(stage)}<div className="chapter-next">{stage<3 && <button className="text-button" onClick={()=>setStage(stage+1)}>Next: {stages[stage+1]} <ArrowRight size={15}/></button>}</div></section>{inspector()}</div></>}
      <div className="live-message" role="status" aria-live="polite">{message || 'Explore at your own pace. Everything here stays in this browser session.'}</div>
      <details className="prototype-state"><summary>Prototype state · inspect this comparison</summary><pre>{JSON.stringify({variant, stage:stages[stage], input, acceptedEventId:accepted !== null ? EVENT : null, acceptedQuantity:accepted, ledger:accepted === null ? null : rated ? 'PROCESSED' : 'PENDING', rating:rated?'RATED':null, retries, monthlyAcceptedEvents:2+(accepted !== null?1:0), monthlyRatedEvents:2+(rated?1:0), monthlyAmount:money(total)+'0', finalization:'PREVIEW_ONLY', delivery:'PREVIEW_ONLY'},null,2)}</pre></details>
    </div>}</main>
    <div className="prototype-switcher" aria-label="Prototype comparison"><button onClick={switchVariant} aria-label="Previous direction"><ArrowLeft size={17}/></button><div><span>THROWAWAY PROTOTYPE</span><strong>{variant} / {variant==='A'?'Annotated Ledger':'Signal Desk'}</strong></div><button onClick={switchVariant} aria-label="Next direction"><ArrowRight size={17}/></button><span className="switch-divider"/><button className="view-switch" onClick={()=>navigate(demo?'landing':'demo')}>{demo?'Landing':'Demo'} <ArrowUpRight size={14}/></button></div>
  </div>;
}
