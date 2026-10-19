import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BaselineOption, EntityType, ResultView, ScenarioResults, ScenarioRunMetadata, ScenarioRunRequest, ScenarioSimulatorOptions, SelectOption } from "./contracts/scenario-simulator.types";
import type { ScenarioSimulatorDataAdapter } from "./adapters/ScenarioSimulatorDataAdapter";
import { RestScenarioSimulatorAdapter } from "./adapters/RestScenarioSimulatorAdapter";
import "./scenario-simulator.css";

export interface ScenarioSimulatorPageProps {
  /** Inject MockScenarioSimulatorAdapter in a development harness. Production defaults to REST only. */
  dataAdapter?: ScenarioSimulatorDataAdapter;
  /** Host-owned navigation; the feature does not own or duplicate the global app shell. */
  onNavigate?: (destination: string) => void;
  initialScope?: Partial<ScenarioRunRequest["scope"]>;
  /** Host-approved, versioned GeoJSON URL; geometry alone is not labour-market data. */
  boundaryGeoJsonUrl?: string;
}

type Status = "idle" | "validating" | "submitting" | "running" | "succeeded" | "warning" | "failed";
type Draft = { seats: number; lagYears: number; startYear: number; evaluationYear: number; geographyId: string; sectorId: string };
const VIEWS: Array<{ id: ResultView; label: string }> = [
  { id: "overview", label: "Overview" }, { id: "regional-impact", label: "Regional Impact" },
  { id: "sector-breakdown", label: "Sector Breakdown" }, { id: "occupation-impact", label: "Occupation Impact" },
  { id: "sensitivity-analysis", label: "Sensitivity" },
];
const fmt = (value: number | null | undefined, unit?: string) => {
  if (value == null || !Number.isFinite(value)) return "Not available";
  if (unit === "percent" || unit === "%") return `${value.toFixed(1)}%`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
};
const apiBase = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_SHRAMIK_API_BASE_URL ?? "";

export function ScenarioSimulatorPage({ dataAdapter, onNavigate, initialScope, boundaryGeoJsonUrl = "/assets/india-states.geojson" }: ScenarioSimulatorPageProps) {
  const adapter = useMemo(() => dataAdapter ?? new RestScenarioSimulatorAdapter(apiBase), [dataAdapter]);
  const [options, setOptions] = useState<ScenarioSimulatorOptions | null>(null);
  const [entityType, setEntityType] = useState<EntityType>(initialScope?.entityType ?? "skill");
  const [search, setSearch] = useState("");
  const [entities, setEntities] = useState<SelectOption[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SelectOption | null>(null);
  const [baselines, setBaselines] = useState<BaselineOption[]>([]);
  const [baselineId, setBaselineId] = useState("");
  const [draft, setDraft] = useState<Draft>({ seats: 50_000, lagYears: 2, startYear: 2027, evaluationYear: 2030, geographyId: initialScope?.geographyId ?? "INDIA", sectorId: initialScope?.sectorId ?? "" });
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [runMeta, setRunMeta] = useState<ScenarioRunMetadata | null>(null);
  const [results, setResults] = useState<ScenarioResults | null>(null);
  const [activeView, setActiveView] = useState<ResultView>("overview");
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");
  const [draftStale, setDraftStale] = useState(false);
  const [mapSelected, setMapSelected] = useState<string | null>(null);
  const [, setMapRows] = useState<ScenarioResults["regionalImpact"]>([]);
  const [sensitivityLoading, setSensitivityLoading] = useState(false);
  const [sensitivityError, setSensitivityError] = useState("");
  const [advancedParameters, setAdvancedParameters] = useState<Record<string, string | number | boolean>>({});
  const loadAbort = useRef<AbortController | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const runAbort = useRef<AbortController | null>(null);
  const requestSerial = useRef(0);
  const initialized = useRef(false);

  const updateDraft = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    if (runMeta) setDraftStale(true);
  }, [runMeta]);

  useEffect(() => {
    const controller = new AbortController(); loadAbort.current?.abort(); loadAbort.current = controller;
    setStatusMessage("Loading model-supported options…");
    adapter.getOptions(controller.signal).then(data => {
      if (controller.signal.aborted) return;
      if (!data.entityTypes.length || !data.geographies.length || !data.evaluationYears.length) throw new Error("The simulator options response contains no supported choices.");
      setOptions(data);
      setDraft(previous => ({ ...previous,
        seats: clamp(previous.seats, data.additionalAnnualSeats.minimum, data.additionalAnnualSeats.maximum),
        lagYears: clamp(previous.lagYears, data.trainingLagMonths.minimum / 12, data.trainingLagMonths.maximum / 12),
        startYear: data.startYears.includes(previous.startYear) ? previous.startYear : data.startYears[0],
        evaluationYear: data.evaluationYears.includes(previous.evaluationYear) ? previous.evaluationYear : data.evaluationYears[data.evaluationYears.length - 1],
        geographyId: data.geographies.some(g => g.id === previous.geographyId) ? previous.geographyId : data.geographies[0].id,
      }));
      setStatusMessage("");
    }).catch(error => { if (!controller.signal.aborted) setStatusMessage(errorMessage(error)); });
    return () => controller.abort();
  }, [adapter]);

  useEffect(() => {
    if (!options) return;
    if (!options.entityTypes.includes(entityType)) { setEntityType(options.entityTypes[0]); return; }
    searchAbort.current?.abort(); const controller = new AbortController(); searchAbort.current = controller;
    const serial = ++requestSerial.current;
    const timer = window.setTimeout(() => {
      adapter.searchEntities({ entityType, query: search.trim(), geographyId: draft.geographyId, sectorId: draft.sectorId || undefined, signal: controller.signal })
        .then(items => { if (!controller.signal.aborted && serial === requestSerial.current) { setEntities(items); if (!initialized.current && items.length) { setSelectedEntity(items.find(i => i.id === initialScope?.entityId) ?? items[0]); initialized.current = true; } } })
        .catch(error => { if (!controller.signal.aborted) setViewError(errorMessage(error)); });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [adapter, options, entityType, search, draft.geographyId, draft.sectorId, initialScope?.entityId]);

  useEffect(() => {
    if (!selectedEntity || !draft.geographyId) { setBaselines([]); setBaselineId(""); return; }
    const controller = new AbortController();
    adapter.getCompatibleBaselines({ entityType, entityId: selectedEntity.id, geographyId: draft.geographyId, sectorId: draft.sectorId || undefined, signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) { setBaselines(items.filter(item => item.compatible)); setBaselineId(current => items.some(item => item.compatible && item.baselineForecastRunId === current) ? current : (items.find(item => item.compatible)?.baselineForecastRunId ?? "")); } })
      .catch(error => { if (!controller.signal.aborted) { setBaselines([]); setBaselineId(""); setValidationMessage(errorMessage(error)); } });
    return () => controller.abort();
  }, [adapter, entityType, selectedEntity, draft.geographyId, draft.sectorId]);

  const selectedBaseline = baselines.find(item => item.baselineForecastRunId === baselineId) ?? null;
  const validate = useCallback(() => {
    if (!selectedEntity) return "Select an entity from the available results.";
    if (selectedEntity.available === false) return selectedEntity.unavailableReason ?? "This entity is not available for simulation.";
    if (!selectedBaseline) return "No compatible baseline is available for this entity, geography and sector.";
    if (!options) return "Model-supported options are still loading.";
    const seatSpec = options.additionalAnnualSeats;
    if (!Number.isFinite(draft.seats) || draft.seats < seatSpec.minimum || draft.seats > seatSpec.maximum || (draft.seats - seatSpec.minimum) % seatSpec.step !== 0) return `Additional annual seats must be ${seatSpec.minimum}–${seatSpec.maximum} in steps of ${seatSpec.step}.`;
    const lagMonths = draft.lagYears * 12; const lagSpec = options.trainingLagMonths;
    if (!Number.isInteger(lagMonths) || lagMonths < lagSpec.minimum || lagMonths > lagSpec.maximum || (lagMonths - lagSpec.minimum) % lagSpec.step !== 0) return `Training lag must align with model-supported ${lagSpec.step}-month steps.`;
    if (!options.startYears.includes(draft.startYear)) return "Select a supported intervention start year.";
    if (!options.evaluationYears.includes(draft.evaluationYear)) return "Select a supported evaluation year.";
    if (draft.evaluationYear < draft.startYear) return "Evaluation year must not precede the intervention start year.";
    if (!options.geographies.some(g => g.id === draft.geographyId)) return "Select a supported geography.";
    return "";
  }, [selectedEntity, selectedBaseline, options, draft]);

  const runSimulation = useCallback(async () => {
    if (status === "submitting" || status === "running" || !options) return;
    setStatus("validating"); setStatusMessage("Validating the selected scope and intervention…"); setValidationMessage(""); setViewError("");
    const error = validate();
    if (error) { setStatus("failed"); setStatusMessage(""); setValidationMessage(error); return; }
    runAbort.current?.abort(); const controller = new AbortController(); runAbort.current = controller;
    const request: ScenarioRunRequest = {
      scenarioName: `Training capacity increment — ${selectedEntity!.label}`,
      baselineForecastRunId: selectedBaseline!.baselineForecastRunId,
      scope: { entityType, entityId: selectedEntity!.id, entityCode: selectedEntity!.code, codeSystem: selectedEntity!.codeSystem, geographyId: draft.geographyId, sectorId: draft.sectorId || undefined },
      intervention: { additionalAnnualSeats: draft.seats, interventionStartYear: draft.startYear, trainingLagMonths: draft.lagYears * 12, advancedParameters },
      evaluationYear: draft.evaluationYear,
    };
    setStatus("submitting"); setStatusMessage("Submitting scenario to the configured adapter…"); setDraftStale(false);
    try {
      let meta = await adapter.runSimulation(request, controller.signal);
      setRunMeta(meta); setStatus(meta.runStatus === "FAILED" ? "failed" : ["QUEUED", "RUNNING"].includes(meta.runStatus) ? "running" : meta.runStatus === "SUCCEEDED_WITH_WARNINGS" ? "warning" : "succeeded");
      // Bounded polling only while the server explicitly reports a queued/running status.
      for (let attempt = 0; attempt < 20 && ["QUEUED", "RUNNING"].includes(meta.runStatus); attempt++) {
        setStatusMessage(meta.statusMessage ?? "Simulation is running…");
        await sleep(Math.min(1000 + attempt * 250, 3500), controller.signal);
        meta = await adapter.getRunStatus(meta.simulationRunId, controller.signal); setRunMeta(meta);
      }
      if (["QUEUED", "RUNNING"].includes(meta.runStatus)) throw new Error("The simulation is still running after the polling limit. You can retry status retrieval without changing the draft.");
      if (meta.runStatus === "FAILED") throw new Error(meta.statusMessage ?? "The model service reported a failed simulation.");
      const output = await adapter.getResults({ simulationRunId: meta.simulationRunId, view: "overview", evaluationYear: draft.evaluationYear, signal: controller.signal });
      setResults(output); setMapRows(output.regionalImpact); setStatus(meta.runStatus === "SUCCEEDED_WITH_WARNINGS" ? "warning" : "succeeded"); setStatusMessage(meta.statusMessage ?? `Run ${meta.simulationRunId} completed.`); setActiveView("overview"); setDraftStale(false);
    } catch (error) { if (!controller.signal.aborted) { setStatus("failed"); setStatusMessage(errorMessage(error)); /* Preserve the prior completed result and all draft inputs. */ if (runMeta) setDraftStale(true); } }
  }, [status, options, validate, adapter, selectedEntity, selectedBaseline, entityType, draft, advancedParameters, runMeta]);

  const loadView = useCallback(async (view: ResultView) => {
    setActiveView(view); setViewError(""); setSensitivityError("");
    if (!runMeta || !results) return;
    setViewLoading(true); const controller = new AbortController();
    try {
      const data = await adapter.getResults({ simulationRunId: runMeta.simulationRunId, view, evaluationYear: draft.evaluationYear, signal: controller.signal });
      setResults(previous => previous ? { ...previous, ...data } : data); setMapRows(data.regionalImpact);
      if (view === "sensitivity-analysis" && !data.sensitivity) setSensitivityError("The selected run has no sensitivity result. This view stays empty rather than inventing a curve.");
    } catch (error) { setViewError(errorMessage(error)); }
    finally { setViewLoading(false); }
  }, [adapter, runMeta, results, draft.evaluationYear]);

  const onSensitivity = async () => {
    if (!adapter.runSensitivity || !runMeta) { setSensitivityError("Sensitivity analysis is not supported by the configured adapter."); return; }
    setSensitivityLoading(true); setSensitivityError("");
    try { const sensitivity = await adapter.runSensitivity({ simulationRunId: runMeta.simulationRunId, parameterKey: "additionalAnnualSeats", values: [options?.additionalAnnualSeats.minimum ?? 0, draft.seats, options?.additionalAnnualSeats.maximum ?? draft.seats], evaluationYear: draft.evaluationYear }); setResults(current => current ? { ...current, sensitivity } : current); if (!sensitivity) setSensitivityError("The adapter returned no sensitivity points."); }
    catch (error) { setSensitivityError(errorMessage(error)); } finally { setSensitivityLoading(false); }
  };

  const busy = status === "submitting" || status === "running" || status === "validating";

  return <div className="ss-page">
    <header className="ss-hero"><div><div className="ss-breadcrumb">Home <span>›</span> Scenario Simulator</div><p className="ss-kicker">POLICY PLANNING WORKSPACE</p><h1>SCENARIO SIMULATOR</h1><p className="ss-intro">Explore how training and policy interventions could affect future skill demand and supply.</p><p className="ss-subintro">Configure → run → compare → investigate. Model calculations remain in the backend service.</p></div><div className="ss-hero-art" aria-hidden="true"><span>PEOPLE<br/>· SKILLS<br/>· OPPORTUNITIES</span><b>SIMULATE<br/>PLAN<br/>BRIDGE GAPS</b></div></header>
    <section className="ss-scope" aria-label="Current scenario scope"><Scope label="Skill / Occupation" value={selectedEntity?.label ?? "— Not selected —"}/><Scope label="Geography" value={options?.geographies.find(g => g.id === draft.geographyId)?.label ?? draft.geographyId}/><Scope label="Baseline reference" value={selectedBaseline?.label ?? "No compatible baseline"}/><Scope label="Evaluation year" value={String(draft.evaluationYear)}/><Scope label="Run status" value={status === "idle" ? "Idle — configure and run" : status.replaceAll("_", " ").toLowerCase()}/></section>
    {!options && <div className={`ss-alert ${statusMessage ? "is-error" : ""}`} role="status">{statusMessage || "Loading simulator options…"}</div>}
    <div className="ss-workspace">
      <section className="ss-card ss-entity"><PanelTitle step="1" title="Select Skill / Occupation"/><div className="ss-toggle"><button type="button" aria-pressed={entityType === "skill"} onClick={() => { setEntityType("skill"); setSelectedEntity(null); setDraftStale(Boolean(runMeta)); }}>Skill View</button><button type="button" aria-pressed={entityType === "occupation"} onClick={() => { setEntityType("occupation"); setSelectedEntity(null); setDraftStale(Boolean(runMeta)); }}>Occupation View</button></div><label className="ss-search"><span aria-hidden="true">⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${entityType}s…`} aria-label={`Search ${entityType}s`}/>{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}</label><div className="ss-entities" role="listbox" aria-label={`Available ${entityType}s`}>{entities.map(item => <button type="button" key={item.id} role="option" aria-selected={selectedEntity?.id === item.id} className={`ss-entity-row ${selectedEntity?.id === item.id ? "is-selected" : ""}`} onClick={() => { setSelectedEntity(item); setDraftStale(Boolean(runMeta)); }}><span className="ss-entity-dot">{item.label.slice(0, 1).toUpperCase()}</span><span>{item.label}{item.available === false && <small>Unavailable</small>}</span><span className="ss-arrow">›</span></button>)}{options && entities.length === 0 && <Empty title="No matching entities" text="Try another search term or check backend taxonomy coverage."/>}</div>{selectedEntity?.available === false && <div className="ss-alert is-warn">{selectedEntity.unavailableReason ?? "No compatible result is available."}</div>}<p className="ss-help">Items and stable IDs are returned by the configured adapter.</p></section>
      <section className="ss-card ss-config"><PanelTitle step="2" title="Configure Intervention"/><div className="ss-fields">
        <div className="ss-field"><label htmlFor="ss-seats" className="ss-label">Additional annual training seats <em>(increment, not total capacity)</em></label><div className="ss-slider"><input type="range" min={options?.additionalAnnualSeats.minimum ?? 0} max={options?.additionalAnnualSeats.maximum ?? 200000} step={options?.additionalAnnualSeats.step ?? 1000} value={draft.seats} onChange={e => updateDraft("seats", Number(e.target.value))} aria-label="Additional annual training seats slider"/><input id="ss-seats" className="ss-number" type="number" min={options?.additionalAnnualSeats.minimum ?? 0} max={options?.additionalAnnualSeats.maximum ?? 200000} step={options?.additionalAnnualSeats.step ?? 1000} value={draft.seats} onChange={e => updateDraft("seats", e.target.value === "" ? 0 : Number(e.target.value))}/></div><p className="ss-help">Seats do not equal trained or employed workers; conversion is model-defined.</p></div>
        <div className="ss-field"><label htmlFor="ss-lag" className="ss-label">Training lag <em>years until modelled effect</em></label><div className="ss-slider"><input type="range" min={(options?.trainingLagMonths.minimum ?? 0) / 12} max={(options?.trainingLagMonths.maximum ?? 60) / 12} step={(options?.trainingLagMonths.step ?? 12) / 12} value={draft.lagYears} onChange={e => updateDraft("lagYears", Number(e.target.value))} aria-label="Training lag slider, years"/><input id="ss-lag" className="ss-number" type="number" min={(options?.trainingLagMonths.minimum ?? 0) / 12} max={(options?.trainingLagMonths.maximum ?? 60) / 12} step={(options?.trainingLagMonths.step ?? 12) / 12} value={draft.lagYears} onChange={e => updateDraft("lagYears", e.target.value === "" ? 0 : Number(e.target.value))}/></div><p className="ss-help">Sent to the adapter in months; model timing conventions must be documented by the backend.</p></div>
        <div className="ss-field"><label htmlFor="ss-start" className="ss-label">Intervention start year</label><select id="ss-start" className="ss-input" value={draft.startYear} onChange={e => updateDraft("startYear", Number(e.target.value))}>{(options?.startYears ?? []).map(y => <option key={y} value={y}>{y}</option>)}</select></div>
        <div className="ss-field"><label htmlFor="ss-eval" className="ss-label">Evaluation / result year</label><select id="ss-eval" className="ss-input" value={draft.evaluationYear} onChange={e => updateDraft("evaluationYear", Number(e.target.value))}>{(options?.evaluationYears ?? []).map(y => <option key={y} value={y}>{y}</option>)}</select></div>
        <div className="ss-field"><label htmlFor="ss-geo" className="ss-label">Geographic scope</label><select id="ss-geo" className="ss-input" value={draft.geographyId} onChange={e => updateDraft("geographyId", e.target.value)}>{(options?.geographies ?? []).map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></div>
        {options?.sectors.length ? <div className="ss-field"><label htmlFor="ss-sector" className="ss-label">Sector scope</label><select id="ss-sector" className="ss-input" value={draft.sectorId} onChange={e => updateDraft("sectorId", e.target.value)}><option value="">All supported sectors</option>{options.sectors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div> : null}
        <div className="ss-baseline"><span>Baseline reference</span><strong>{selectedBaseline?.label ?? "No compatible baseline"}</strong><code>{selectedBaseline?.baselineForecastRunId ?? "Select a compatible entity and geography"}</code>{selectedBaseline && <small>{selectedBaseline.inputWindowStart}–{selectedBaseline.inputWindowEnd} · {selectedBaseline.modelVersion} · {selectedBaseline.qualityStatus}</small>}</div>
        <details className="ss-advanced"><summary>Advanced assumptions (optional)</summary>{options?.supportedAdvancedParameters.length ? options.supportedAdvancedParameters.map(param => <AdvancedField key={param.key} param={param} value={advancedParameters[param.key]} onChange={value => { setAdvancedParameters(current => ({ ...current, [param.key]: value })); setDraftStale(Boolean(runMeta)); }}/>) : <p>No advanced assumptions are enabled by the current model contract. Unsupported completion, certification and workforce-entry controls are intentionally omitted.</p>}</details>
      </div>
      {validationMessage && <div className="ss-alert is-error" role="alert">{validationMessage}</div>}{statusMessage && <div className={`ss-alert ${status === "failed" ? "is-error" : status === "succeeded" ? "is-ok" : "is-info"}`} role="status" aria-live="polite">{busy && <span className="ss-spinner"/>}{statusMessage}</div>}
      <button className="ss-button ss-primary" type="button" disabled={busy || !options} onClick={runSimulation}>{busy ? "Working…" : "▶ Run Simulation"}</button><div className="ss-actions"><button className="ss-button" type="button" disabled={busy} onClick={() => { setDraft({ seats: options?.additionalAnnualSeats.minimum ?? 0, lagYears: 0, startYear: options?.startYears[0] ?? 2026, evaluationYear: options?.evaluationYears[0] ?? 2030, geographyId: options?.geographies[0]?.id ?? "INDIA", sectorId: "" }); setAdvancedParameters({}); setValidationMessage(""); setDraftStale(Boolean(runMeta)); }}>Reset draft</button></div>
      </section>
      <section className="ss-card ss-outcomes"><div className="ss-outcome-head"><PanelTitle step="3" title={`Key Outcomes (${draft.evaluationYear})`}/>{results && <span className="ss-badge">{results.run.provenance}</span>}</div>{draftStale && <div className="ss-alert is-warn">Modified — inputs changed; rerun to update results. The displayed result belongs to the previous run.</div>}
        <div className="ss-tabs" role="tablist" aria-label="Simulation results views">{VIEWS.map(view => <button key={view.id} type="button" role="tab" aria-selected={activeView === view.id} onClick={() => loadView(view.id)}>{view.label}</button>)}</div>
        {viewError && <div className="ss-alert is-error" role="alert">{viewError}</div>}{viewLoading && <div className="ss-load" role="status">Loading {VIEWS.find(v => v.id === activeView)?.label.toLowerCase()} results…</div>}
        {!results ? <Empty title="No simulation run yet" text="Choose a supported skill or occupation, configure the intervention and baseline, then run a simulation."/> : <>
          {results.run.provenance === "SYNTHETIC_DEMO" && <div className="ss-alert is-warn">ILLUSTRATIVE DEMO DATA — not a verified SHRAMIK estimate. No calibrated model was executed.</div>}
          {activeView === "overview" && <Overview results={results} />}
          {activeView === "regional-impact" && <RegionalImpact rows={results.regionalImpact} selected={mapSelected} onSelect={setMapSelected} geoJsonUrl={boundaryGeoJsonUrl} />}
          {activeView === "sector-breakdown" && <Breakdown title="Sector Breakdown" rows={results.sectorBreakdown} dimension="sector" />}
          {activeView === "occupation-impact" && <Breakdown title="Occupation Impact" rows={results.occupationImpact} dimension="occupation" />}
          {activeView === "sensitivity-analysis" && <section className="ss-result-section"><h3>Sensitivity Analysis</h3>{results.sensitivity ? <Sensitivity data={results.sensitivity}/> : <><p className="ss-muted">No sensitivity points were included with this run. Sensitivity is not an uncertainty interval.</p><button className="ss-button" type="button" onClick={onSensitivity} disabled={sensitivityLoading || !adapter.runSensitivity}>{sensitivityLoading ? "Requesting…" : "Request model-backed sensitivity"}</button>{sensitivityError && <div className="ss-alert is-warn" role="status">{sensitivityError}</div>}</>}</section>}
        </>}
      </section>
    </div>
    <div className="ss-footer">Scenario Simulator is an analytical interface. Check run quality, provenance, metric comparability and limitations before using outputs for planning.</div>
    {onNavigate && <div className="ss-context-links"><button type="button" onClick={() => onNavigate("/forecasts")}>Open Forecasts</button><button type="button" onClick={() => onNavigate("/skill-gaps")}>Open Skill Gap Analysis</button></div>}
  </div>;
}

function PanelTitle({ step, title }: { step: string; title: string }) { return <h2 className="ss-panel-title"><span>{step}</span>{title}</h2>; }
function Scope({ label, value }: { label: string; value: string }) { return <div className="ss-scope-item"><span>{label}</span><strong>{value}</strong></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="ss-empty"><span aria-hidden="true">◌</span><strong>{title}</strong><p>{text}</p></div>; }
function AdvancedField({ param, value, onChange }: { param: ScenarioSimulatorOptions["supportedAdvancedParameters"][number]; value: string | number | boolean | undefined; onChange: (value: string | number | boolean) => void }) {
  if (param.type === "boolean") return <label className="ss-advanced-field"><input type="checkbox" checked={Boolean(value)} onChange={e => onChange(e.target.checked)}/>{param.label}<small>{param.description}</small></label>;
  if (param.type === "enum") return <label className="ss-advanced-field">{param.label}<select className="ss-input" value={String(value ?? "")} onChange={e => onChange(e.target.value)}><option value="">Choose…</option>{(param.options ?? []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select><small>{param.description}</small></label>;
  return <label className="ss-advanced-field">{param.label}<input className="ss-input" type="number" min={param.minimum} max={param.maximum} step={param.step ?? 1} value={typeof value === "number" ? value : ""} onChange={e => onChange(Number(e.target.value))}/><small>{param.description}{param.unit ? ` · ${param.unit}` : ""}</small></label>;
}
function Overview({ results }: { results: ScenarioResults }) {
  const get = (code: string) => results.outcomes.find(item => item.metricCode === code);
  const cards: Array<{ code: string; fallback: string; sub: string }> = [
    { code: "DEMAND_ESTIMATE", fallback: "Projected Demand", sub: "Baseline and scenario demand" },
    { code: "SUPPLY_ESTIMATE", fallback: "Projected Supply", sub: "Compared with baseline supply" },
    { code: "SKILL_GAP", fallback: "Projected Skill Gap", sub: "Gap = demand − supply; positive means shortage" },
    { code: "GAP_TO_DEMAND_RATIO", fallback: "Gap-to-Demand Ratio", sub: "Shown only for comparable, valid demand" },
  ];
  return <div className="ss-result-section"><div className="ss-kpis">{cards.map(card => { const item = get(card.code); return <article className="ss-kpi" key={card.code}><span>{item?.label ?? card.fallback}</span><strong>{item?.displayValue ?? (item?.scenarioValue != null ? fmt(item.scenarioValue, item.unitCode) : "Not available")}</strong><small>{item?.comparisonDisplay ?? item?.notAvailableReason ?? card.sub}</small>{item?.qualityStatus === "NOT_COMPARABLE" && <em>Not comparable</em>}</article>; })}</div><ProjectionChart series={results.series}/><div className="ss-runmeta"><h3>Run lineage &amp; limitations</h3><dl><dt>Run ID</dt><dd><code>{results.run.simulationRunId}</code></dd><dt>Baseline</dt><dd><code>{results.run.baselineForecastRunId}</code></dd><dt>Model</dt><dd>{results.run.modelName} · {results.run.modelVersion}</dd><dt>Quality</dt><dd>{results.run.qualityStatus}</dd><dt>Provenance</dt><dd>{results.run.provenance}</dd><dt>Last updated</dt><dd>{results.lastUpdatedAt ?? results.run.finishedAt ?? "Not supplied"}</dd></dl>{results.coverageSummary.length > 0 && <p><b>Coverage:</b> {results.coverageSummary.join(" ")}</p>}{[...results.run.limitations, ...results.limitations].map((item, i) => <p key={`${i}-${item}`}>• {item}</p>)}</div></div>;
}
function ProjectionChart({ series }: { series: ScenarioResults["series"] }) {
  const names: Array<[keyof ScenarioResults["series"], string, string, boolean]> = [["baselineDemand", "Baseline demand", "#203A5B", true], ["scenarioDemand", "Scenario demand", "#53749A", false], ["baselineSupply", "Baseline supply", "#EB791D", true], ["scenarioSupply", "Scenario supply", "#20A89C", false]];
  const all = names.flatMap(([key]) => series[key].filter(p => p.value != null));
  if (all.length < 2) return <div className="ss-nochart">Projection series are not available for this run.</div>;
  const years = Array.from(new Set(all.map(p => Number(p.periodStart.slice(0, 4))))).sort((a, b) => a - b);
  const max = Math.max(...all.map(p => p.value ?? 0), 1) * 1.08; const w = 620, h = 220, left = 55, right = 12, top = 14, bottom = 32, plotW = w - left - right, plotH = h - top - bottom;
  const x = (year: number) => left + (years.length <= 1 ? .5 : years.indexOf(year) / (years.length - 1)) * plotW;
  const y = (value: number) => top + (1 - value / max) * plotH;
  return <section className="ss-chart"><div className="ss-chart-title">Demand vs Supply Projection</div><p>Units follow the API metric definitions. No interval is drawn unless the model returns defined bounds.</p><div className="ss-legend">{names.map(([key, label, color, dashed]) => <span key={key}><i style={{ borderColor: color, borderTopStyle: dashed ? "dashed" : "solid" }}/>{label}</span>)}</div><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Demand and supply projections with table details below">{Array.from({ length: 4 }, (_, i) => { const v = max * i / 3; return <g key={i}><line x1={left} x2={w - right} y1={y(v)} y2={y(v)} stroke="#e4e1d8"/><text x={left - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#72726b">{fmt(v)}</text></g>; })}{years.map(year => <text key={year} x={x(year)} y={h - 10} textAnchor="middle" fontSize="10" fill="#72726b">{year}</text>)}{names.map(([key, label, color, dashed]) => { const points = series[key].filter(p => p.value != null).map(p => `${x(Number(p.periodStart.slice(0, 4)))},${y(p.value!)}`).join(" "); if (!points) return null; return <polyline key={key} points={points} fill="none" stroke={color} strokeWidth={dashed ? 1.8 : 2.5} strokeDasharray={dashed ? "6 4" : undefined}><title>{label}</title></polyline>; })}</svg><p className="ss-chart-caption">For a supply-side-only intervention, scenario demand should overlap baseline demand unless the backend returns an approved demand-side effect.</p></section>;
}
function RegionalImpact({ rows, selected, onSelect, geoJsonUrl }: { rows: ScenarioResults["regionalImpact"]; selected: string | null; onSelect: (id: string | null) => void; geoJsonUrl: string }) {
  const [geo, setGeo] = useState<any>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(""); fetch(geoJsonUrl, { signal: controller.signal, credentials: "omit" }).then(res => { if (!res.ok) throw new Error(`Boundary request failed (${res.status}).`); return res.json(); }).then(data => { if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error("Boundary file is not a GeoJSON FeatureCollection."); setGeo(data); }).catch(e => { if (!controller.signal.aborted) setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [geoJsonUrl]);
  const selectedRow = rows.find(row => row.canonicalCode === selected) ?? null;
  return <section className="ss-result-section"><h3>Regional Impact ({rows.length} regions with returned rows)</h3><p className="ss-muted">The map and ranking table use the same adapter response. Unreported regions remain grey and are labelled “No data”. Selecting a region does not silently change the intervention scope.</p>{loading && <p role="status">Loading boundary geometry…</p>}{error && <div className="ss-alert is-warn">Boundary geometry unavailable: {error}. Bundle an approved, versioned GeoJSON file with the host app to remove this dependency.</div>}{geo && <Choropleth geometry={geo} rows={rows} selected={selected} onSelect={onSelect}/>}<div className="ss-map-legend"><span><i className="no-data"/>No data</span><span><i className="less"/>Shortage reduced</span><span><i className="same"/>No change</span><span><i className="more"/>Shortage increased</span></div><div className="ss-map-detail">{selectedRow ? <><strong>{selectedRow.regionName} · {selectedRow.canonicalCode}</strong><p>Baseline gap: {fmt(selectedRow.baselineGap, selectedRow.unitCode)} · Scenario gap: {fmt(selectedRow.scenarioGap, selectedRow.unitCode)} · Change: {fmt(selectedRow.deltaValue, selectedRow.unitCode)}</p><p>Quality: {selectedRow.qualityStatus} · Provenance: {selectedRow.provenance}</p></> : <><strong>{geo ? "Select a state / UT" : "No region selected"}</strong><p>Regional baseline/scenario gaps and deltas appear here only when returned by the model.</p></>}</div>{rows.length ? <div className="ss-table-wrap"><table><thead><tr><th>State / UT</th><th>Baseline gap</th><th>Scenario gap</th><th>Change</th><th>Quality</th></tr></thead><tbody>{rows.map(r => <tr key={r.canonicalCode}><td><button type="button" className="ss-link-button" onClick={() => onSelect(r.canonicalCode)}>{r.regionName}</button></td><td>{fmt(r.baselineGap, r.unitCode)}</td><td>{fmt(r.scenarioGap, r.unitCode)}</td><td>{fmt(r.deltaValue, r.unitCode)}</td><td>{r.qualityStatus}</td></tr>)}</tbody></table></div> : <Empty title="No regional impact rows returned" text="This result does not contain regionalImpact values. The map remains neutral; it does not infer regional numbers from national results."/>}</section>;
}
const norm = (value: unknown) => String(value ?? '').normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').trim().toLocaleLowerCase();

function Choropleth({ geometry, rows, selected, onSelect }: { geometry: any; rows: ScenarioResults["regionalImpact"]; selected: string | null; onSelect: (id: string) => void }) {
  const features = geometry.features as any[]; const coordinates: number[][] = [];
  const gather = (c: any): void => { if (Array.isArray(c) && typeof c[0] === "number") coordinates.push(c); else if (Array.isArray(c)) c.forEach(gather); };
  features.forEach(f => gather(f.geometry?.coordinates)); if (!coordinates.length) return <div className="ss-alert is-warn">The GeoJSON file did not contain polygon coordinates.</div>;
  const bounds = [Math.min(...coordinates.map(c => c[0])), Math.max(...coordinates.map(c => c[0])), Math.min(...coordinates.map(c => c[1])), Math.max(...coordinates.map(c => c[1]))];
  const width = 510, height = 520; const projection = (c: number[]) => [14 + ((c[0] - bounds[0]) / (bounds[1] - bounds[0])) * (width - 28), 14 + ((bounds[3] - c[1]) / (bounds[3] - bounds[2])) * (height - 28)];
  const pathOf = (geo: any): string => { const rings: number[][][] = []; const visit = (c: any): void => { if (Array.isArray(c) && c.length && Array.isArray(c[0]) && typeof c[0][0] === "number") rings.push(c); else if (Array.isArray(c)) c.forEach(visit); }; visit(geo.coordinates); return rings.map(ring => ring.map((c, i) => { const p = projection(c); return `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`; }).join("") + "Z").join(""); };
  return <div className="ss-map-shell"><svg viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Interactive state and union territory map"><title>Regional scenario impact map</title>{features.map((feature, index) => { const name = String(feature.properties?.name ?? feature.properties?.shapeName ?? feature.properties?.NAME_1 ?? `Region ${index + 1}`); const code = String(feature.properties?.code ?? feature.properties?.shapeISO ?? ""); const match = rows.find(r => norm(r.canonicalCode) === norm(code) || norm(r.regionName) === norm(name)); const id = match?.canonicalCode ?? (code || name); const color = !match || match.scenarioGap == null || match.baselineGap == null || match.qualityStatus === "NOT_COMPARABLE" || match.qualityStatus === "SUPPRESSED" ? "#e4e2da" : (match.deltaValue ?? 0) < 0 ? "#20a89c" : (match.deltaValue ?? 0) > 0 ? "#e97835" : "#f2d34f"; return <path key={`${name}-${index}`} d={pathOf(feature.geometry)} fill={selected === id ? "#f2d34f" : color} className="ss-region-shape" tabIndex={0} role="button" aria-label={`${name}: ${match ? `scenario gap ${fmt(match.scenarioGap, match.unitCode)}` : "No data"}`} aria-pressed={selected === id} onClick={() => onSelect(id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(id); } }}><title>{name}: {match ? `baseline ${fmt(match.baselineGap, match.unitCode)}, scenario ${fmt(match.scenarioGap, match.unitCode)}` : "No data"}</title></path>; })}</svg><p>Keyboard support: focus a region and press Enter or Space. Use the adjacent table for equivalent details.</p></div>;
}
function Breakdown({ title, rows, dimension }: { title: string; rows: Array<Record<string, string | number | null>>; dimension: string }) { const keys = rows.length ? Object.keys(rows[0]) : []; return <section className="ss-result-section"><h3>{title}</h3>{rows.length && keys.length ? <div className="ss-table-wrap"><table><thead><tr>{keys.map(k => <th key={k}>{k.replace(/([A-Z])/g, " $1")}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{keys.map(k => <td key={k}>{row[k] == null ? "No data" : String(row[k])}</td>)}</tr>)}</tbody></table></div> : <Empty title={`No ${dimension} impact rows returned`} text={`The adapter returned an empty ${dimension} breakdown. The interface will not invent a ranking or distribution.`}/>}</section>; }
function Sensitivity({ data }: { data: NonNullable<ScenarioResults["sensitivity"]> }) { return <section><p className="ss-muted">Varied: {data.variedParameter}. Fixed assumptions: {data.fixedAssumptions.join(", ") || "Not supplied"}. This is sensitivity output, not a confidence interval.</p><div className="ss-table-wrap"><table><thead><tr><th>Input</th><th>Output</th><th>Quality</th></tr></thead><tbody>{data.points.map((p, i) => <tr key={i}><td>{fmt(p.inputValue)}</td><td>{fmt(p.outputValue, p.unitCode)}</td><td>{p.qualityStatus}</td></tr>)}</tbody></table></div></section>; }
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : "An unexpected simulator error occurred."; }
function sleep(ms: number, signal: AbortSignal) { return new Promise<void>((resolve, reject) => { const timer = window.setTimeout(resolve, ms); signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true }); }); }
