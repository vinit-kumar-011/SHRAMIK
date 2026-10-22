import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RestScenarioSimulatorAdapter } from "./adapters/RestScenarioSimulatorAdapter";
import "./scenario-simulator.css";
const VIEWS = [
    { id: "overview", label: "Overview" }, { id: "regional-impact", label: "Regional Impact" },
    { id: "sector-breakdown", label: "Sector Breakdown" }, { id: "occupation-impact", label: "Occupation Impact" },
    { id: "sensitivity-analysis", label: "Sensitivity" },
];
const fmt = (value, unit) => {
    if (value == null || !Number.isFinite(value))
        return "Not available";
    if (unit === "percent" || unit === "%")
        return `${value.toFixed(1)}%`;
    if (Math.abs(value) >= 1_000_000)
        return `${(value / 1_000_000).toFixed(2).replace(/\.00$/, "")}M`;
    if (Math.abs(value) >= 1_000)
        return `${(value / 1_000).toFixed(0)}K`;
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
};
const apiBase = import.meta.env?.VITE_SCENARIO_SIMULATOR_API_BASE_URL ?? "";
export function ScenarioSimulatorPage({ dataAdapter, onNavigate, initialScope, boundaryGeoJsonUrl = `${import.meta.env.BASE_URL}assets/india-states.geojson` }) {
    const adapter = useMemo(() => dataAdapter ?? new RestScenarioSimulatorAdapter(apiBase), [dataAdapter]);
    const [options, setOptions] = useState(null);
    const [entityType, setEntityType] = useState(initialScope?.entityType ?? "skill");
    const [search, setSearch] = useState("");
    const [entities, setEntities] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [baselines, setBaselines] = useState([]);
    const [baselineId, setBaselineId] = useState("");
    const [draft, setDraft] = useState({ seats: 50_000, lagYears: 2, startYear: 2027, evaluationYear: 2030, geographyId: initialScope?.geographyId ?? "INDIA", sectorId: initialScope?.sectorId ?? "" });
    const [status, setStatus] = useState("idle");
    const [statusMessage, setStatusMessage] = useState("");
    const [validationMessage, setValidationMessage] = useState("");
    const [runMeta, setRunMeta] = useState(null);
    const [results, setResults] = useState(null);
    const [activeView, setActiveView] = useState("overview");
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState("");
    const [draftStale, setDraftStale] = useState(false);
    const [mapSelected, setMapSelected] = useState(null);
    const [, setMapRows] = useState([]);
    const [sensitivityLoading, setSensitivityLoading] = useState(false);
    const [sensitivityError, setSensitivityError] = useState("");
    const [advancedParameters, setAdvancedParameters] = useState({});
    const loadAbort = useRef(null);
    const searchAbort = useRef(null);
    const runAbort = useRef(null);
    const requestSerial = useRef(0);
    const initialized = useRef(false);
    const updateDraft = useCallback((key, value) => {
        setDraft(previous => ({ ...previous, [key]: value }));
        if (runMeta)
            setDraftStale(true);
    }, [runMeta]);
    useEffect(() => {
        const controller = new AbortController();
        loadAbort.current?.abort();
        loadAbort.current = controller;
        setStatusMessage("Loading model-supported options…");
        adapter.getOptions(controller.signal).then(data => {
            if (controller.signal.aborted)
                return;
            if (!data.entityTypes.length || !data.geographies.length || !data.evaluationYears.length)
                throw new Error("The simulator options response contains no supported choices.");
            setOptions(data);
            setAdvancedParameters(current => {
                const next = { ...current };
                for (const parameter of data.supportedAdvancedParameters) {
                    if (next[parameter.key] === undefined && parameter.defaultValue !== undefined)
                        next[parameter.key] = parameter.defaultValue;
                }
                return next;
            });
            setDraft(previous => ({ ...previous,
                seats: clamp(previous.seats, data.additionalAnnualSeats.minimum, data.additionalAnnualSeats.maximum),
                lagYears: clamp(previous.lagYears, data.trainingLagMonths.minimum / 12, data.trainingLagMonths.maximum / 12),
                startYear: data.startYears.includes(previous.startYear) ? previous.startYear : data.startYears[0],
                evaluationYear: data.evaluationYears.includes(previous.evaluationYear) ? previous.evaluationYear : data.evaluationYears[data.evaluationYears.length - 1],
                geographyId: data.geographies.some(g => g.id === previous.geographyId) ? previous.geographyId : data.geographies[0].id,
            }));
            setStatusMessage("");
        }).catch(error => { if (!controller.signal.aborted)
            setStatusMessage(errorMessage(error)); });
        return () => controller.abort();
    }, [adapter]);
    useEffect(() => {
        if (!options)
            return;
        if (!options.entityTypes.includes(entityType)) {
            setEntityType(options.entityTypes[0]);
            return;
        }
        searchAbort.current?.abort();
        const controller = new AbortController();
        searchAbort.current = controller;
        const serial = ++requestSerial.current;
        const timer = window.setTimeout(() => {
            adapter.searchEntities({ entityType, query: search.trim(), geographyId: draft.geographyId, sectorId: draft.sectorId || undefined, signal: controller.signal })
                .then(items => { if (!controller.signal.aborted && serial === requestSerial.current) {
                setEntities(items);
                if (!initialized.current && items.length) {
                    setSelectedEntity(items.find(i => i.id === initialScope?.entityId) ?? items[0]);
                    initialized.current = true;
                }
            } })
                .catch(error => { if (!controller.signal.aborted)
                setViewError(errorMessage(error)); });
        }, 180);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [adapter, options, entityType, search, draft.geographyId, draft.sectorId, initialScope?.entityId]);
    useEffect(() => {
        if (!selectedEntity || !draft.geographyId) {
            setBaselines([]);
            setBaselineId("");
            return;
        }
        const controller = new AbortController();
        adapter.getCompatibleBaselines({ entityType, entityId: selectedEntity.id, geographyId: draft.geographyId, sectorId: draft.sectorId || undefined, signal: controller.signal })
            .then(items => { if (!controller.signal.aborted) {
            setBaselines(items.filter(item => item.compatible));
            setBaselineId(current => items.some(item => item.compatible && item.baselineForecastRunId === current) ? current : (items.find(item => item.compatible)?.baselineForecastRunId ?? ""));
        } })
            .catch(error => { if (!controller.signal.aborted) {
            setBaselines([]);
            setBaselineId("");
            setValidationMessage(errorMessage(error));
        } });
        return () => controller.abort();
    }, [adapter, entityType, selectedEntity, draft.geographyId, draft.sectorId]);
    const selectedBaseline = baselines.find(item => item.baselineForecastRunId === baselineId) ?? null;
    const validate = useCallback(() => {
        if (!selectedEntity)
            return "Select an entity from the available results.";
        if (selectedEntity.available === false)
            return selectedEntity.unavailableReason ?? "This entity is not available for simulation.";
        if (!selectedBaseline)
            return "No compatible baseline is available for this entity, geography and sector.";
        if (!options)
            return "Model-supported options are still loading.";
        const seatSpec = options.additionalAnnualSeats;
        if (!Number.isFinite(draft.seats) || draft.seats < seatSpec.minimum || draft.seats > seatSpec.maximum || (draft.seats - seatSpec.minimum) % seatSpec.step !== 0)
            return `Additional annual seats must be ${seatSpec.minimum}–${seatSpec.maximum} in steps of ${seatSpec.step}.`;
        const lagMonths = draft.lagYears * 12;
        const lagSpec = options.trainingLagMonths;
        if (!Number.isInteger(lagMonths) || lagMonths < lagSpec.minimum || lagMonths > lagSpec.maximum || (lagMonths - lagSpec.minimum) % lagSpec.step !== 0)
            return `Training lag must align with model-supported ${lagSpec.step}-month steps.`;
        if (!options.startYears.includes(draft.startYear))
            return "Select a supported intervention start year.";
        if (!options.evaluationYears.includes(draft.evaluationYear))
            return "Select a supported evaluation year.";
        if (draft.evaluationYear < draft.startYear)
            return "Evaluation year must not precede the intervention start year.";
        if (!options.geographies.some(g => g.id === draft.geographyId))
            return "Select a supported geography.";
        return "";
    }, [selectedEntity, selectedBaseline, options, draft]);
    const runSimulation = useCallback(async () => {
        if (status === "submitting" || status === "running" || !options)
            return;
        setStatus("validating");
        setStatusMessage("Validating the selected scope and intervention…");
        setValidationMessage("");
        setViewError("");
        const error = validate();
        if (error) {
            setStatus("failed");
            setStatusMessage("");
            setValidationMessage(error);
            return;
        }
        runAbort.current?.abort();
        const controller = new AbortController();
        runAbort.current = controller;
        const request = {
            scenarioName: `Training capacity increment — ${selectedEntity.label}`,
            baselineForecastRunId: selectedBaseline.baselineForecastRunId,
            scope: { entityType, entityId: selectedEntity.id, entityCode: selectedEntity.code, codeSystem: selectedEntity.codeSystem, geographyId: draft.geographyId, sectorId: draft.sectorId || undefined },
            intervention: { additionalAnnualSeats: draft.seats, interventionStartYear: draft.startYear, trainingLagMonths: draft.lagYears * 12, advancedParameters },
            evaluationYear: draft.evaluationYear,
        };
        setStatus("submitting");
        setStatusMessage("Submitting scenario to the configured adapter…");
        setDraftStale(false);
        try {
            let meta = await adapter.runSimulation(request, controller.signal);
            setRunMeta(meta);
            setStatus(meta.runStatus === "FAILED" ? "failed" : ["QUEUED", "RUNNING"].includes(meta.runStatus) ? "running" : meta.runStatus === "SUCCEEDED_WITH_WARNINGS" ? "warning" : "succeeded");
            // Bounded polling only while the server explicitly reports a queued/running status.
            for (let attempt = 0; attempt < 20 && ["QUEUED", "RUNNING"].includes(meta.runStatus); attempt++) {
                setStatusMessage(meta.statusMessage ?? "Simulation is running…");
                await sleep(Math.min(1000 + attempt * 250, 3500), controller.signal);
                meta = await adapter.getRunStatus(meta.simulationRunId, controller.signal);
                setRunMeta(meta);
            }
            if (["QUEUED", "RUNNING"].includes(meta.runStatus))
                throw new Error("The simulation is still running after the polling limit. You can retry status retrieval without changing the draft.");
            if (meta.runStatus === "FAILED")
                throw new Error(meta.statusMessage ?? "The model service reported a failed simulation.");
            const output = await adapter.getResults({ simulationRunId: meta.simulationRunId, view: "overview", evaluationYear: draft.evaluationYear, signal: controller.signal });
            setResults(output);
            setMapRows(output.regionalImpact);
            setStatus(meta.runStatus === "SUCCEEDED_WITH_WARNINGS" ? "warning" : "succeeded");
            setStatusMessage(meta.statusMessage ?? `Run ${meta.simulationRunId} completed.`);
            setActiveView("overview");
            setDraftStale(false);
        }
        catch (error) {
            if (!controller.signal.aborted) {
                setStatus("failed");
                setStatusMessage(errorMessage(error)); /* Preserve the prior completed result and all draft inputs. */
                if (runMeta)
                    setDraftStale(true);
            }
        }
    }, [status, options, validate, adapter, selectedEntity, selectedBaseline, entityType, draft, advancedParameters, runMeta]);
    const loadView = useCallback(async (view) => {
        setActiveView(view);
        setViewError("");
        setSensitivityError("");
        if (!runMeta || !results)
            return;
        setViewLoading(true);
        const controller = new AbortController();
        try {
            const data = await adapter.getResults({ simulationRunId: runMeta.simulationRunId, view, evaluationYear: draft.evaluationYear, signal: controller.signal });
            setResults(previous => previous ? { ...previous, ...data } : data);
            setMapRows(data.regionalImpact);
            if (view === "sensitivity-analysis" && !data.sensitivity)
                setSensitivityError("The selected run has no sensitivity result. This view stays empty rather than inventing a curve.");
        }
        catch (error) {
            setViewError(errorMessage(error));
        }
        finally {
            setViewLoading(false);
        }
    }, [adapter, runMeta, results, draft.evaluationYear]);
    const onSensitivity = async () => {
        if (!adapter.runSensitivity || !runMeta) {
            setSensitivityError("Sensitivity analysis is not supported by the configured adapter.");
            return;
        }
        setSensitivityLoading(true);
        setSensitivityError("");
        try {
            const sensitivity = await adapter.runSensitivity({ simulationRunId: runMeta.simulationRunId, parameterKey: "additionalAnnualSeats", values: [options?.additionalAnnualSeats.minimum ?? 0, draft.seats, options?.additionalAnnualSeats.maximum ?? draft.seats], evaluationYear: draft.evaluationYear });
            setResults(current => current ? { ...current, sensitivity } : current);
            if (!sensitivity)
                setSensitivityError("The adapter returned no sensitivity points.");
        }
        catch (error) {
            setSensitivityError(errorMessage(error));
        }
        finally {
            setSensitivityLoading(false);
        }
    };
    const busy = status === "submitting" || status === "running" || status === "validating";
    return _jsxs("div", { className: "ss-page", children: [_jsxs("header", { className: "ss-hero", children: [_jsxs("div", { children: [_jsxs("div", { className: "ss-breadcrumb", children: ["Home ", _jsx("span", { children: "\u203A" }), " Scenario Simulator"] }), _jsx("p", { className: "ss-kicker", children: "POLICY PLANNING WORKSPACE" }), _jsx("h1", { children: "SCENARIO SIMULATOR" }), _jsx("p", { className: "ss-intro", children: "Explore a server-backed scenario when available, or calculate intervention-only planning counts using editable assumptions." }), _jsx("p", { className: "ss-subintro", children: "Without a validated baseline, the local fallback does not estimate labour demand, total workforce supply, skill gaps, or employment outcomes." })] }), _jsxs("div", { className: "ss-hero-art", "aria-hidden": "true", children: [_jsxs("span", { children: ["PEOPLE", _jsx("br", {}), "\u00B7 SKILLS", _jsx("br", {}), "\u00B7 OPPORTUNITIES"] }), _jsxs("b", { children: ["SIMULATE", _jsx("br", {}), "PLAN", _jsx("br", {}), "BRIDGE GAPS"] })] })] }), options?.baselines.some(item => item.baselineForecastRunId === "LOCAL-PLANNING-NO-VALIDATED-BASELINE") && _jsxs("div", { className: "ss-alert is-warn", role: "note", children: [_jsx("strong", { children: "Local assumptions-only mode." }), " This planner calculates illustrative seat cohorts, completions and potential transitions from editable assumptions. It does not produce official workforce demand, supply, shortages, forecasts, or job counts."] }), _jsxs("section", { className: "ss-scope", "aria-label": "Current scenario scope", children: [_jsx(Scope, { label: "Skill / Occupation", value: selectedEntity?.label ?? "— Not selected —" }), _jsx(Scope, { label: "Geography", value: options?.geographies.find(g => g.id === draft.geographyId)?.label ?? draft.geographyId }), _jsx(Scope, { label: "Baseline reference", value: selectedBaseline?.label ?? "No compatible baseline" }), _jsx(Scope, { label: "Evaluation year", value: String(draft.evaluationYear) }), _jsx(Scope, { label: "Run status", value: status === "idle" ? "Idle — configure and run" : status.replaceAll("_", " ").toLowerCase() })] }), !options && _jsx("div", { className: `ss-alert ${statusMessage ? "is-error" : ""}`, role: "status", children: statusMessage || "Loading simulator options…" }), _jsxs("div", { className: "ss-workspace", children: [_jsxs("section", { className: "ss-card ss-entity", children: [_jsx(PanelTitle, { step: "1", title: "Select Skill / Occupation" }), _jsxs("div", { className: "ss-toggle", children: [_jsx("button", { type: "button", "aria-pressed": entityType === "skill", onClick: () => { setEntityType("skill"); setSelectedEntity(null); setDraftStale(Boolean(runMeta)); }, children: "Skill View" }), _jsx("button", { type: "button", "aria-pressed": entityType === "occupation", onClick: () => { setEntityType("occupation"); setSelectedEntity(null); setDraftStale(Boolean(runMeta)); }, children: "Occupation View" })] }), _jsxs("label", { className: "ss-search", children: [_jsx("span", { "aria-hidden": "true", children: "\u2315" }), _jsx("input", { value: search, onChange: e => setSearch(e.target.value), placeholder: `Search ${entityType}s…`, "aria-label": `Search ${entityType}s` }), search && _jsx("button", { type: "button", onClick: () => setSearch(""), "aria-label": "Clear search", children: "\u00D7" })] }), _jsxs("div", { className: "ss-entities", role: "listbox", "aria-label": `Available ${entityType}s`, children: [entities.map(item => _jsxs("button", { type: "button", role: "option", "aria-selected": selectedEntity?.id === item.id, className: `ss-entity-row ${selectedEntity?.id === item.id ? "is-selected" : ""}`, onClick: () => { setSelectedEntity(item); setDraftStale(Boolean(runMeta)); }, children: [_jsx("span", { className: "ss-entity-dot", children: item.label.slice(0, 1).toUpperCase() }), _jsxs("span", { children: [item.label, item.available === false && _jsx("small", { children: "Unavailable" })] }), _jsx("span", { className: "ss-arrow", children: "\u203A" })] }, item.id)), options && entities.length === 0 && _jsx(Empty, { title: "No matching entities", text: "Try another search term or check backend taxonomy coverage." })] }), selectedEntity?.available === false && _jsx("div", { className: "ss-alert is-warn", children: selectedEntity.unavailableReason ?? "No compatible result is available." }), _jsx("p", { className: "ss-help", children: "Items and stable IDs are returned by the configured adapter." })] }), _jsxs("section", { className: "ss-card ss-config", children: [_jsx(PanelTitle, { step: "2", title: "Configure Intervention" }), _jsxs("div", { className: "ss-fields", children: [_jsxs("div", { className: "ss-field", children: [_jsxs("label", { htmlFor: "ss-seats", className: "ss-label", children: ["Additional annual training seats ", _jsx("em", { children: "(increment, not total capacity)" })] }), _jsxs("div", { className: "ss-slider", children: [_jsx("input", { type: "range", min: options?.additionalAnnualSeats.minimum ?? 0, max: options?.additionalAnnualSeats.maximum ?? 200000, step: options?.additionalAnnualSeats.step ?? 1000, value: draft.seats, onChange: e => updateDraft("seats", Number(e.target.value)), "aria-label": "Additional annual training seats slider" }), _jsx("input", { id: "ss-seats", className: "ss-number", type: "number", min: options?.additionalAnnualSeats.minimum ?? 0, max: options?.additionalAnnualSeats.maximum ?? 200000, step: options?.additionalAnnualSeats.step ?? 1000, value: draft.seats, onChange: e => updateDraft("seats", e.target.value === "" ? 0 : Number(e.target.value)) })] }), _jsx("p", { className: "ss-help", children: "Seats do not equal trained or employed workers; conversion is model-defined." })] }), _jsxs("div", { className: "ss-field", children: [_jsxs("label", { htmlFor: "ss-lag", className: "ss-label", children: ["Training lag ", _jsx("em", { children: "years until modelled effect" })] }), _jsxs("div", { className: "ss-slider", children: [_jsx("input", { type: "range", min: (options?.trainingLagMonths.minimum ?? 0) / 12, max: (options?.trainingLagMonths.maximum ?? 60) / 12, step: (options?.trainingLagMonths.step ?? 12) / 12, value: draft.lagYears, onChange: e => updateDraft("lagYears", Number(e.target.value)), "aria-label": "Training lag slider, years" }), _jsx("input", { id: "ss-lag", className: "ss-number", type: "number", min: (options?.trainingLagMonths.minimum ?? 0) / 12, max: (options?.trainingLagMonths.maximum ?? 60) / 12, step: (options?.trainingLagMonths.step ?? 12) / 12, value: draft.lagYears, onChange: e => updateDraft("lagYears", e.target.value === "" ? 0 : Number(e.target.value)) })] }), _jsx("p", { className: "ss-help", children: "Sent to the adapter in months; model timing conventions must be documented by the backend." })] }), _jsxs("div", { className: "ss-field", children: [_jsx("label", { htmlFor: "ss-start", className: "ss-label", children: "Intervention start year" }), _jsx("select", { id: "ss-start", className: "ss-input", value: draft.startYear, onChange: e => updateDraft("startYear", Number(e.target.value)), children: (options?.startYears ?? []).map(y => _jsx("option", { value: y, children: y }, y)) })] }), _jsxs("div", { className: "ss-field", children: [_jsx("label", { htmlFor: "ss-eval", className: "ss-label", children: "Evaluation / result year" }), _jsx("select", { id: "ss-eval", className: "ss-input", value: draft.evaluationYear, onChange: e => updateDraft("evaluationYear", Number(e.target.value)), children: (options?.evaluationYears ?? []).map(y => _jsx("option", { value: y, children: y }, y)) })] }), _jsxs("div", { className: "ss-field", children: [_jsx("label", { htmlFor: "ss-geo", className: "ss-label", children: "Geographic scope" }), _jsx("select", { id: "ss-geo", className: "ss-input", value: draft.geographyId, onChange: e => updateDraft("geographyId", e.target.value), children: (options?.geographies ?? []).map(g => _jsx("option", { value: g.id, children: g.label }, g.id)) })] }), options?.sectors.length ? _jsxs("div", { className: "ss-field", children: [_jsx("label", { htmlFor: "ss-sector", className: "ss-label", children: "Sector scope" }), _jsxs("select", { id: "ss-sector", className: "ss-input", value: draft.sectorId, onChange: e => updateDraft("sectorId", e.target.value), children: [_jsx("option", { value: "", children: "All supported sectors" }), options.sectors.map(s => _jsx("option", { value: s.id, children: s.label }, s.id))] })] }) : null, _jsxs("div", { className: "ss-baseline", children: [_jsx("span", { children: "Baseline reference" }), _jsx("strong", { children: selectedBaseline?.label ?? "No compatible baseline" }), _jsx("code", { children: selectedBaseline?.baselineForecastRunId ?? "Select a compatible entity and geography" }), selectedBaseline && _jsxs("small", { children: [selectedBaseline.inputWindowStart, "\u2013", selectedBaseline.inputWindowEnd, " \u00B7 ", selectedBaseline.modelVersion, " \u00B7 ", selectedBaseline.qualityStatus] })] }), _jsxs("details", { className: "ss-advanced", open: options?.baselines.some(item => item.baselineForecastRunId === "LOCAL-PLANNING-NO-VALIDATED-BASELINE"), children: [_jsx("summary", { children: "Assumptions & advanced parameters" }), options?.supportedAdvancedParameters.length ? options.supportedAdvancedParameters.map(param => _jsx(AdvancedField, { param: param, value: advancedParameters[param.key], onChange: value => { setAdvancedParameters(current => ({ ...current, [param.key]: value })); setDraftStale(Boolean(runMeta)); } }, param.key)) : _jsx("p", { children: "No advanced assumptions are enabled by the current model contract. Unsupported completion, certification and workforce-entry controls are intentionally omitted." })] })] }), validationMessage && _jsx("div", { className: "ss-alert is-error", role: "alert", children: validationMessage }), statusMessage && _jsxs("div", { className: `ss-alert ${status === "failed" ? "is-error" : status === "succeeded" ? "is-ok" : "is-info"}`, role: "status", "aria-live": "polite", children: [busy && _jsx("span", { className: "ss-spinner" }), statusMessage] }), _jsx("button", { className: "ss-button ss-primary", type: "button", disabled: busy || !options, onClick: runSimulation, children: busy ? "Working…" : "▶ Run Simulation" }), _jsx("div", { className: "ss-actions", children: _jsx("button", { className: "ss-button", type: "button", disabled: busy, onClick: () => { setDraft({ seats: options?.additionalAnnualSeats.minimum ?? 0, lagYears: 0, startYear: options?.startYears[0] ?? 2026, evaluationYear: options?.evaluationYears[0] ?? 2030, geographyId: options?.geographies[0]?.id ?? "INDIA", sectorId: "" }); setAdvancedParameters({}); setValidationMessage(""); setDraftStale(Boolean(runMeta)); }, children: "Reset draft" }) })] }), _jsxs("section", { className: "ss-card ss-outcomes", children: [_jsxs("div", { className: "ss-outcome-head", children: [_jsx(PanelTitle, { step: "3", title: `Key Outcomes (${draft.evaluationYear})` }), results && _jsx("span", { className: "ss-badge", children: results.run.provenance })] }), draftStale && _jsx("div", { className: "ss-alert is-warn", children: "Modified \u2014 inputs changed; rerun to update results. The displayed result belongs to the previous run." }), _jsx("div", { className: "ss-tabs", role: "tablist", "aria-label": "Simulation results views", children: VIEWS.map(view => _jsx("button", { type: "button", role: "tab", "aria-selected": activeView === view.id, onClick: () => loadView(view.id), children: view.label }, view.id)) }), viewError && _jsx("div", { className: "ss-alert is-error", role: "alert", children: viewError }), viewLoading && _jsxs("div", { className: "ss-load", role: "status", children: ["Loading ", VIEWS.find(v => v.id === activeView)?.label.toLowerCase(), " results\u2026"] }), !results ? _jsx(Empty, { title: "No simulation run yet", text: "Choose a supported skill or occupation, configure the intervention and baseline, then run a simulation." }) : _jsxs(_Fragment, { children: [results.run.provenance === "SYNTHETIC_DEMO" && _jsx("div", { className: "ss-alert is-warn", children: "ILLUSTRATIVE / ASSUMPTION-ONLY OUTPUT \u2014 not a verified SHRAMIK estimate. No calibrated model was executed." }), activeView === "overview" && _jsx(Overview, { results: results }), activeView === "regional-impact" && _jsx(RegionalImpact, { rows: results.regionalImpact, selected: mapSelected, onSelect: setMapSelected, geoJsonUrl: boundaryGeoJsonUrl }), activeView === "sector-breakdown" && _jsx(Breakdown, { title: "Sector Breakdown", rows: results.sectorBreakdown, dimension: "sector" }), activeView === "occupation-impact" && _jsx(Breakdown, { title: "Occupation Impact", rows: results.occupationImpact, dimension: "occupation" }), activeView === "sensitivity-analysis" && _jsxs("section", { className: "ss-result-section", children: [_jsx("h3", { children: "Sensitivity Analysis" }), results.sensitivity ? _jsx(Sensitivity, { data: results.sensitivity }) : _jsxs(_Fragment, { children: [_jsx("p", { className: "ss-muted", children: "No sensitivity points were included with this run. Sensitivity is not an uncertainty interval." }), _jsx("button", { className: "ss-button", type: "button", onClick: onSensitivity, disabled: sensitivityLoading || !adapter.runSensitivity, children: sensitivityLoading ? "Requesting…" : "Run sensitivity analysis" }), sensitivityError && _jsx("div", { className: "ss-alert is-warn", role: "status", children: sensitivityError })] })] })] })] })] }), _jsx("div", { className: "ss-footer", children: "Scenario Simulator is an analytical interface. Check run quality, provenance, metric comparability and limitations before using outputs for planning." }), onNavigate && _jsxs("div", { className: "ss-context-links", children: [_jsx("button", { type: "button", onClick: () => onNavigate("/forecasts"), children: "Open Forecasts" }), _jsx("button", { type: "button", onClick: () => onNavigate("/skill-gaps"), children: "Open Skill Gap Analysis" })] })] });
}
function PanelTitle({ step, title }) { return _jsxs("h2", { className: "ss-panel-title", children: [_jsx("span", { children: step }), title] }); }
function Scope({ label, value }) { return _jsxs("div", { className: "ss-scope-item", children: [_jsx("span", { children: label }), _jsx("strong", { children: value })] }); }
function Empty({ title, text }) { return _jsxs("div", { className: "ss-empty", children: [_jsx("span", { "aria-hidden": "true", children: "\u25CC" }), _jsx("strong", { children: title }), _jsx("p", { children: text })] }); }
function AdvancedField({ param, value, onChange }) {
    if (param.type === "boolean")
        return _jsxs("label", { className: "ss-advanced-field", children: [_jsx("input", { type: "checkbox", checked: Boolean(value), onChange: e => onChange(e.target.checked) }), param.label, _jsx("small", { children: param.description })] });
    if (param.type === "enum")
        return _jsxs("label", { className: "ss-advanced-field", children: [param.label, _jsxs("select", { className: "ss-input", value: String(value ?? ""), onChange: e => onChange(e.target.value), children: [_jsx("option", { value: "", children: "Choose\u2026" }), (param.options ?? []).map(o => _jsx("option", { value: o.id, children: o.label }, o.id))] }), _jsx("small", { children: param.description })] });
    return _jsxs("label", { className: "ss-advanced-field", children: [param.label, _jsx("input", { className: "ss-input", type: "number", min: param.minimum, max: param.maximum, step: param.step ?? 1, value: typeof value === "number" ? value : "", onChange: e => onChange(Number(e.target.value)) }), _jsxs("small", { children: [param.description, param.unit ? ` · ${param.unit}` : ""] })] });
}
function Overview({ results }) {
    const get = (code) => results.outcomes.find(item => item.metricCode === code);
    const cards = [
        { code: "DEMAND_ESTIMATE", fallback: "Projected Demand", sub: "Baseline and scenario demand" },
        { code: "SUPPLY_ESTIMATE", fallback: "Projected Supply", sub: "Compared with baseline supply" },
        { code: "SKILL_GAP", fallback: "Projected Skill Gap", sub: "Gap = demand − supply; positive means shortage" },
        { code: "GAP_TO_DEMAND_RATIO", fallback: "Gap-to-Demand Ratio", sub: "Shown only for comparable, valid demand" },
    ];
    const primaryCodes = new Set(cards.map(card => card.code));
    const assumptionMetrics = results.outcomes.filter(item => !primaryCodes.has(item.metricCode));
    return _jsxs("div", { className: "ss-result-section", children: [_jsxs("div", { className: "ss-kpis", children: [cards.map(card => { const item = get(card.code); return _jsxs("article", { className: "ss-kpi", children: [_jsx("span", { children: item?.label ?? card.fallback }), _jsx("strong", { children: item?.displayValue ?? (item?.scenarioValue != null ? fmt(item.scenarioValue, item.unitCode) : "Not available") }), _jsx("small", { children: item?.comparisonDisplay ?? item?.notAvailableReason ?? card.sub }), item?.qualityStatus === "NOT_COMPARABLE" && _jsx("em", { children: "Not comparable" })] }, card.code); }), assumptionMetrics.map(item => _jsxs("article", { className: "ss-kpi", children: [_jsx("span", { children: item.label }), _jsx("strong", { children: item.displayValue ?? (item.scenarioValue != null ? fmt(item.scenarioValue, item.unitCode) : "Not available") }), _jsx("small", { children: item.comparisonDisplay ?? item.notAvailableReason ?? item.definition ?? "Illustrative assumption only." }), _jsx("em", { children: "UNSUPPORTED \u00B7 ASSUMPTION ONLY" })] }, item.metricCode))] }), _jsx(ProjectionChart, { series: results.series }), _jsxs("div", { className: "ss-runmeta", children: [_jsx("h3", { children: "Run lineage & limitations" }), _jsxs("dl", { children: [_jsx("dt", { children: "Run ID" }), _jsx("dd", { children: _jsx("code", { children: results.run.simulationRunId }) }), _jsx("dt", { children: "Baseline" }), _jsx("dd", { children: _jsx("code", { children: results.run.baselineForecastRunId }) }), _jsx("dt", { children: "Model" }), _jsxs("dd", { children: [results.run.modelName, " \u00B7 ", results.run.modelVersion] }), _jsx("dt", { children: "Quality" }), _jsx("dd", { children: results.run.qualityStatus }), _jsx("dt", { children: "Provenance" }), _jsx("dd", { children: results.run.provenance }), _jsx("dt", { children: "Last updated" }), _jsx("dd", { children: results.lastUpdatedAt ?? results.run.finishedAt ?? "Not supplied" })] }), results.coverageSummary.length > 0 && _jsxs("p", { children: [_jsx("b", { children: "Coverage:" }), " ", results.coverageSummary.join(" ")] }), [...results.run.limitations, ...results.limitations].map((item, i) => _jsxs("p", { children: ["\u2022 ", item] }, i + "-" + item))] })] });
}
function ProjectionChart({ series }) {
    const names = [["baselineDemand", "Baseline demand", "#203A5B", true], ["scenarioDemand", "Scenario demand", "#53749A", false], ["baselineSupply", "Baseline supply", "#EB791D", true], ["scenarioSupply", "Scenario supply", "#20A89C", false]];
    const all = names.flatMap(([key]) => series[key].filter(p => p.value != null));
    if (all.length < 2)
        return _jsx("div", { className: "ss-nochart", children: "Projection series are not available for this run." });
    const years = Array.from(new Set(all.map(p => Number(p.periodStart.slice(0, 4))))).sort((a, b) => a - b);
    const max = Math.max(...all.map(p => p.value ?? 0), 1) * 1.08;
    const w = 620, h = 220, left = 55, right = 12, top = 14, bottom = 32, plotW = w - left - right, plotH = h - top - bottom;
    const x = (year) => left + (years.length <= 1 ? .5 : years.indexOf(year) / (years.length - 1)) * plotW;
    const y = (value) => top + (1 - value / max) * plotH;
    return _jsxs("section", { className: "ss-chart", children: [_jsx("div", { className: "ss-chart-title", children: "Demand vs Supply Projection" }), _jsx("p", { children: "Units follow the API metric definitions. No interval is drawn unless the model returns defined bounds." }), _jsx("div", { className: "ss-legend", children: names.map(([key, label, color, dashed]) => _jsxs("span", { children: [_jsx("i", { style: { borderColor: color, borderTopStyle: dashed ? "dashed" : "solid" } }), label] }, key)) }), _jsxs("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "Demand and supply projections with table details below", children: [Array.from({ length: 4 }, (_, i) => { const v = max * i / 3; return _jsxs("g", { children: [_jsx("line", { x1: left, x2: w - right, y1: y(v), y2: y(v), stroke: "#e4e1d8" }), _jsx("text", { x: left - 8, y: y(v) + 3, textAnchor: "end", fontSize: "10", fill: "#72726b", children: fmt(v) })] }, i); }), years.map(year => _jsx("text", { x: x(year), y: h - 10, textAnchor: "middle", fontSize: "10", fill: "#72726b", children: year }, year)), names.map(([key, label, color, dashed]) => { const points = series[key].filter(p => p.value != null).map(p => `${x(Number(p.periodStart.slice(0, 4)))},${y(p.value)}`).join(" "); if (!points)
                        return null; return _jsx("polyline", { points: points, fill: "none", stroke: color, strokeWidth: dashed ? 1.8 : 2.5, strokeDasharray: dashed ? "6 4" : undefined, children: _jsx("title", { children: label }) }, key); })] }), _jsx("p", { className: "ss-chart-caption", children: "For a supply-side-only intervention, scenario demand should overlap baseline demand unless the backend returns an approved demand-side effect." })] });
}
function RegionalImpact({ rows, selected, onSelect, geoJsonUrl }) {
    const [geo, setGeo] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect(() => { const controller = new AbortController(); setLoading(true); setError(""); fetch(geoJsonUrl, { signal: controller.signal, credentials: "omit" }).then(res => { if (!res.ok)
        throw new Error(`Boundary request failed (${res.status}).`); return res.json(); }).then(data => { if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features))
        throw new Error("Boundary file is not a GeoJSON FeatureCollection."); setGeo(data); }).catch(e => { if (!controller.signal.aborted)
        setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted)
        setLoading(false); }); return () => controller.abort(); }, [geoJsonUrl]);
    const selectedRow = rows.find(row => row.canonicalCode === selected) ?? null;
    return _jsxs("section", { className: "ss-result-section", children: [_jsxs("h3", { children: ["Regional Impact (", rows.length, " regions with returned rows)"] }), _jsx("p", { className: "ss-muted", children: "The map and ranking table use the same adapter response. Unreported regions remain grey and are labelled \u201CNo data\u201D. Selecting a region does not silently change the intervention scope." }), _jsxs("p", { className: "ss-map-attribution", children: ["Boundary geometry is an OpenStreetMap-derived, best-effort visualization\u2014not an official or survey-grade map. Map fills are shown only where the model returns comparable scenario results. ", _jsx("a", { href: "https://www.openstreetmap.org/copyright", target: "_blank", rel: "noreferrer", children: "\u00A9 OpenStreetMap contributors" }), " \u00B7 ", _jsx("a", { href: "https://opendatacommons.org/licenses/odbl/1-0/", target: "_blank", rel: "noreferrer", children: "ODbL 1.0 data licence" }), "."] }), loading && _jsx("p", { role: "status", children: "Loading boundary geometry\u2026" }), error && _jsxs("div", { className: "ss-alert is-warn", children: ["Boundary geometry unavailable: ", error, ". Bundle an approved, versioned GeoJSON file with the host app to remove this dependency."] }), geo && _jsx(Choropleth, { geometry: geo, rows: rows, selected: selected, onSelect: onSelect }), _jsxs("div", { className: "ss-map-legend", children: [_jsxs("span", { children: [_jsx("i", { className: "no-data" }), "No data"] }), _jsxs("span", { children: [_jsx("i", { className: "less" }), "Shortage reduced"] }), _jsxs("span", { children: [_jsx("i", { className: "same" }), "No change"] }), _jsxs("span", { children: [_jsx("i", { className: "more" }), "Shortage increased"] })] }), _jsx("div", { className: "ss-map-detail", children: selectedRow ? _jsxs(_Fragment, { children: [_jsxs("strong", { children: [selectedRow.regionName, " \u00B7 ", selectedRow.canonicalCode] }), _jsxs("p", { children: ["Baseline gap: ", fmt(selectedRow.baselineGap, selectedRow.unitCode), " \u00B7 Scenario gap: ", fmt(selectedRow.scenarioGap, selectedRow.unitCode), " \u00B7 Change: ", fmt(selectedRow.deltaValue, selectedRow.unitCode)] }), _jsxs("p", { children: ["Quality: ", selectedRow.qualityStatus, " \u00B7 Provenance: ", selectedRow.provenance] })] }) : _jsxs(_Fragment, { children: [_jsx("strong", { children: geo ? "Select a state / UT" : "No region selected" }), _jsx("p", { children: "Regional baseline/scenario gaps and deltas appear here only when returned by the model." })] }) }), rows.length ? _jsx("div", { className: "ss-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "State / UT" }), _jsx("th", { children: "Baseline gap" }), _jsx("th", { children: "Scenario gap" }), _jsx("th", { children: "Change" }), _jsx("th", { children: "Quality" })] }) }), _jsx("tbody", { children: rows.map(r => _jsxs("tr", { children: [_jsx("td", { children: _jsx("button", { type: "button", className: "ss-link-button", onClick: () => onSelect(r.canonicalCode), children: r.regionName }) }), _jsx("td", { children: fmt(r.baselineGap, r.unitCode) }), _jsx("td", { children: fmt(r.scenarioGap, r.unitCode) }), _jsx("td", { children: fmt(r.deltaValue, r.unitCode) }), _jsx("td", { children: r.qualityStatus })] }, r.canonicalCode)) })] }) }) : _jsx(Empty, { title: "No regional impact rows returned", text: "This result does not contain regionalImpact values. The map remains neutral; it does not infer regional numbers from national results." })] });
}
const norm = (value) => String(value ?? '').normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').trim().toLocaleLowerCase();
function Choropleth({ geometry, rows, selected, onSelect }) {
    const features = geometry.features;
    const coordinates = [];
    const gather = (c) => { if (Array.isArray(c) && typeof c[0] === "number")
        coordinates.push(c);
    else if (Array.isArray(c))
        c.forEach(gather); };
    features.forEach(f => gather(f.geometry?.coordinates));
    if (!coordinates.length)
        return _jsx("div", { className: "ss-alert is-warn", children: "The GeoJSON file did not contain polygon coordinates." });
    const bounds = [Math.min(...coordinates.map(c => c[0])), Math.max(...coordinates.map(c => c[0])), Math.min(...coordinates.map(c => c[1])), Math.max(...coordinates.map(c => c[1]))];
    const width = 510, height = 520;
    const projection = (c) => [14 + ((c[0] - bounds[0]) / (bounds[1] - bounds[0])) * (width - 28), 14 + ((bounds[3] - c[1]) / (bounds[3] - bounds[2])) * (height - 28)];
    const pathOf = (geo) => { const rings = []; const visit = (c) => { if (Array.isArray(c) && c.length && Array.isArray(c[0]) && typeof c[0][0] === "number")
        rings.push(c);
    else if (Array.isArray(c))
        c.forEach(visit); }; visit(geo.coordinates); return rings.map(ring => ring.map((c, i) => { const p = projection(c); return `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`; }).join("") + "Z").join(""); };
    return _jsxs("div", { className: "ss-map-shell", children: [_jsxs("svg", { viewBox: `0 0 ${width} ${height}`, role: "group", "aria-label": "Interactive state and union territory map", children: [_jsx("title", { children: "Regional scenario impact map" }), features.map((feature, index) => { const name = String(feature.properties?.name ?? feature.properties?.shapeName ?? feature.properties?.NAME_1 ?? `Region ${index + 1}`); const code = String(feature.properties?.code ?? feature.properties?.shapeISO ?? ""); const match = rows.find(r => norm(r.canonicalCode) === norm(code) || norm(r.regionName) === norm(name)); const id = match?.canonicalCode ?? (code || name); const color = !match || match.scenarioGap == null || match.baselineGap == null || match.qualityStatus === "NOT_COMPARABLE" || match.qualityStatus === "SUPPRESSED" ? "#e4e2da" : (match.deltaValue ?? 0) < 0 ? "#20a89c" : (match.deltaValue ?? 0) > 0 ? "#e97835" : "#f2d34f"; return _jsx("path", { d: pathOf(feature.geometry), fill: selected === id ? "#f2d34f" : color, className: "ss-region-shape", tabIndex: 0, role: "button", "aria-label": `${name}: ${match ? `scenario gap ${fmt(match.scenarioGap, match.unitCode)}` : "No data"}`, "aria-pressed": selected === id, onClick: () => onSelect(id), onKeyDown: e => { if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelect(id);
                        } }, children: _jsxs("title", { children: [name, ": ", match ? `baseline ${fmt(match.baselineGap, match.unitCode)}, scenario ${fmt(match.scenarioGap, match.unitCode)}` : "No data"] }) }, `${name}-${index}`); })] }), _jsx("p", { children: "Keyboard support: focus a region and press Enter or Space. Use the adjacent table for equivalent details." })] });
}
function Breakdown({ title, rows, dimension }) { const keys = rows.length ? Object.keys(rows[0]) : []; return _jsxs("section", { className: "ss-result-section", children: [_jsx("h3", { children: title }), rows.length && keys.length ? _jsx("div", { className: "ss-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsx("tr", { children: keys.map(k => _jsx("th", { children: k.replace(/([A-Z])/g, " $1") }, k)) }) }), _jsx("tbody", { children: rows.map((row, i) => _jsx("tr", { children: keys.map(k => _jsx("td", { children: row[k] == null ? "No data" : String(row[k]) }, k)) }, i)) })] }) }) : _jsx(Empty, { title: `No ${dimension} impact rows returned`, text: `The adapter returned an empty ${dimension} breakdown. The interface will not invent a ranking or distribution.` })] }); }
function Sensitivity({ data }) { return _jsxs("section", { children: [_jsxs("p", { className: "ss-muted", children: ["Varied: ", data.variedParameter, ". Fixed assumptions: ", data.fixedAssumptions.join(", ") || "Not supplied", ". This is sensitivity output, not a confidence interval."] }), _jsx("div", { className: "ss-table-wrap", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Input" }), _jsx("th", { children: "Output" }), _jsx("th", { children: "Quality" })] }) }), _jsx("tbody", { children: data.points.map((p, i) => _jsxs("tr", { children: [_jsx("td", { children: fmt(p.inputValue) }), _jsx("td", { children: fmt(p.outputValue, p.unitCode) }), _jsx("td", { children: p.qualityStatus })] }, i)) })] }) })] }); }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function errorMessage(error) { return error instanceof Error ? error.message : "An unexpected simulator error occurred."; }
function sleep(ms, signal) { return new Promise((resolve, reject) => { const timer = window.setTimeout(resolve, ms); signal.addEventListener("abort", () => { window.clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true }); }); }
