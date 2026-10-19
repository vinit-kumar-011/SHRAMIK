(function(){
'use strict';
const __modules={
"main": function(module, exports, require) {
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const SHRAMIKDashboard_1 = __importDefault(require("./SHRAMIKDashboard"));
(0, client_1.createRoot)(document.getElementById('root')).render((0, jsx_runtime_1.jsx)(react_1.default.StrictMode, { children: (0, jsx_runtime_1.jsx)(SHRAMIKDashboard_1.default, {}) }));

},
"SHRAMIKDashboard": function(module, exports, require) {
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SHRAMIKDashboard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const adapter_1 = require("./api/adapter");
const SkillGapAnalysisPage_1 = __importDefault(require("./skill-gaps/SkillGapAnalysisPage"));
const ForecastsPage_1 = __importDefault(require("./forecasts/ForecastsPage"));
const ReportsPage_1 = __importDefault(require("./reports/ReportsPage"));
const ICONS = {
    activity: lucide_react_1.Activity, alert: lucide_react_1.AlertCircle, brain: lucide_react_1.BrainCircuit, 'brain-circuit': lucide_react_1.BrainCircuit,
    building: lucide_react_1.Building2, 'building-2': lucide_react_1.Building2, chart: lucide_react_1.ChartColumn, 'chart-column': lucide_react_1.ChartColumn,
    database: lucide_react_1.Database, factory: lucide_react_1.Factory, file: lucide_react_1.FileText, 'file-text': lucide_react_1.FileText,
    healthcare: lucide_react_1.HeartPulse, 'heart-pulse': lucide_react_1.HeartPulse, leaf: lucide_react_1.Leaf, lightbulb: lucide_react_1.Lightbulb,
    settings: lucide_react_1.Settings, star: lucide_react_1.Star, truck: lucide_react_1.Truck, users: lucide_react_1.Users, wrench: lucide_react_1.Wrench,
};
const KPI_ICONS = {
    demand: lucide_react_1.Users, supply: lucide_react_1.Users, 'skill-gap': lucide_react_1.ChartColumn, 'emerging-skills': lucide_react_1.BrainCircuit,
};
const NAV_ITEMS = [
    { label: 'Dashboard', section: 'dashboard', icon: lucide_react_1.ChartColumn, group: 'primary' },
    { label: 'Demand', section: 'demand', icon: lucide_react_1.Activity, group: 'primary' },
    { label: 'Supply', section: 'supply', icon: lucide_react_1.Users, group: 'primary' },
    { label: 'Skill Gaps', section: 'skill-gaps', icon: lucide_react_1.BrainCircuit, group: 'primary' },
    { label: 'Forecasts', section: 'forecasts', icon: lucide_react_1.ChartColumn, group: 'primary' },
    { label: 'Emerging Skills', section: 'emerging-skills', icon: lucide_react_1.Leaf, group: 'primary' },
    { label: 'Scenario Simulator', section: 'scenario-simulator', icon: lucide_react_1.Wrench, group: 'primary' },
    { label: 'Reports', section: 'reports', icon: lucide_react_1.FileText, group: 'primary' },
    { label: 'Data Sources', section: 'data-sources', icon: lucide_react_1.Database, group: 'secondary' },
    { label: 'Data Quality', section: 'data-quality', icon: lucide_react_1.HeartPulse, group: 'secondary' },
];
function toneForKpi(item, index) {
    if (item.key === 'supply')
        return 'teal';
    if (item.key === 'skill-gap')
        return 'orange';
    if (item.key === 'emerging-skills')
        return 'teal';
    return index === 1 ? 'teal' : 'navy';
}
function formatUpdated(value) {
    if (!value)
        return 'Update time not supplied';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function getInitialPage() {
    if (typeof window === 'undefined')
        return 'dashboard';
    if (window.location.hash === '#skill-gaps')
        return 'skill-gaps';
    if (window.location.hash === '#forecasts')
        return 'forecasts';
    if (window.location.hash === '#reports')
        return 'reports';
    if (window.location.hash === '#dashboard')
        return 'dashboard';
    const path = decodeURIComponent(window.location.pathname).toLowerCase();
    const requestedPage = new URLSearchParams(window.location.search).get('page');
    if (requestedPage === 'skill-gaps' || path.endsWith('skill-gap-analysis.html') || path.endsWith('/skill-gaps'))
        return 'skill-gaps';
    if (requestedPage === 'forecasts' || path.endsWith('forecasts.html') || path.endsWith('/forecasts'))
        return 'forecasts';
    if (requestedPage === 'reports' || path.endsWith('reports.html') || path.endsWith('/reports'))
        return 'reports';
    return 'dashboard';
}
function sectionForTarget(target) {
    const accepted = new Set(NAV_ITEMS.map((item) => item.section));
    return accepted.has(target) ? target : 'dashboard';
}
function Sparkline({ values, tone, id }) {
    const safeValues = values.length ? values : [0, 0];
    const min = Math.min(...safeValues);
    const max = Math.max(...safeValues);
    const range = Math.max(1, max - min);
    const points = safeValues.map((value, i) => {
        const x = safeValues.length <= 1 ? 4 : 4 + i * (92 / (safeValues.length - 1));
        const y = 29 - ((value - min) / range) * 22;
        return `${x},${y}`;
    }).join(' ');
    const firstX = 4;
    const lastX = safeValues.length <= 1 ? 4 : 96;
    return (0, jsx_runtime_1.jsxs)("svg", { className: `sparkline tone-${tone}`, viewBox: "0 0 100 36", role: "img", "aria-label": "Recent trend", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsxs)("linearGradient", { id: `spark-fill-${id}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [(0, jsx_runtime_1.jsx)("stop", { offset: "0%", stopColor: "currentColor", stopOpacity: ".2" }), (0, jsx_runtime_1.jsx)("stop", { offset: "100%", stopColor: "currentColor", stopOpacity: "0" })] }) }), (0, jsx_runtime_1.jsx)("polygon", { points: `${firstX},35 ${points} ${lastX},35`, fill: `url(#spark-fill-${id})` }), (0, jsx_runtime_1.jsx)("polyline", { points: points, fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round" })] });
}
function KpiCard({ item, index, onOpen }) {
    const Icon = KPI_ICONS[item.key] ?? lucide_react_1.Activity;
    const tone = toneForKpi(item, index);
    return (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `kpi-card tone-${tone}`, onClick: () => onOpen(item), "aria-label": `Open ${item.title} details`, children: [(0, jsx_runtime_1.jsx)("div", { className: "kpi-icon", children: (0, jsx_runtime_1.jsx)(Icon, { size: 25, strokeWidth: 2.1 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "kpi-main", children: [(0, jsx_runtime_1.jsx)("div", { className: "eyebrow", children: item.title }), (0, jsx_runtime_1.jsx)("div", { className: "kpi-subtitle", children: item.subtitle }), (0, jsx_runtime_1.jsx)("div", { className: "kpi-value", children: item.formattedValue }), (0, jsx_runtime_1.jsxs)("div", { className: `kpi-change ${item.deltaPct < 0 ? 'change-negative' : ''}`, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.TrendingUp, { size: 18, strokeWidth: 2.8 }), (0, jsx_runtime_1.jsxs)("strong", { children: [item.deltaPct > 0 ? '+' : '', item.deltaPct, "%"] }), (0, jsx_runtime_1.jsx)("span", { children: item.context })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "kpi-spark", children: (0, jsx_runtime_1.jsx)(Sparkline, { values: item.trend, tone: tone, id: item.id }) }), (0, jsx_runtime_1.jsx)("span", { className: "card-open", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 15 }) })] });
}
function SelectControl({ label, value, onChange, options, compact = false }) {
    return (0, jsx_runtime_1.jsxs)("label", { className: `select-wrap ${compact ? 'compact-select' : ''}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: label }), (0, jsx_runtime_1.jsx)("select", { value: value, onChange: (event) => onChange(event.target.value), children: options.map((option) => (0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value)) }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 14, "aria-hidden": "true" })] });
}
function ChartPanel({ data, periodYears, onPeriodChange, onOpenDetail }) {
    const points = data?.trend ?? [];
    const maxValue = Math.max(300, ...points.map((point) => Math.max(point.demand, point.supply)));
    const step = Math.ceil(maxValue / 6 / 10) * 10;
    const yMax = step * 6;
    const xFor = (i, count) => 42 + i * (560 / Math.max(1, count - 1));
    const yFor = (value) => 163 - (value / yMax) * 158;
    const demandPts = points.map((point, i) => `${xFor(i, points.length)},${yFor(point.demand)}`).join(' ');
    const supplyPts = points.map((point, i) => `${xFor(i, points.length)},${yFor(point.supply)}`).join(' ');
    return (0, jsx_runtime_1.jsxs)("section", { className: "panel trend-panel", "aria-labelledby": "trend-title", "aria-busy": !data, children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: "trend-title", children: "Demand vs Supply Trends" }), (0, jsx_runtime_1.jsx)("p", { children: "Estimated labour demand and supply (in millions)" })] }), (0, jsx_runtime_1.jsx)(SelectControl, { label: "Trend period", value: periodYears, onChange: onPeriodChange, options: [{ value: 5, label: 'Last 5 years' }, { value: 3, label: 'Last 3 years' }] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "chart-legend", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "legend-line demand" }), "Demand"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "legend-line supply" }), "Supply"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "trend-chart", children: [points.length ? (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 650 210", preserveAspectRatio: "none", role: "img", "aria-label": "Demand and supply trend chart. Values are from the selected data adapter.", children: [Array.from({ length: 7 }, (_, i) => i * step).map((value) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: "42", x2: "605", y1: yFor(value), y2: yFor(value), className: "chart-grid" }), (0, jsx_runtime_1.jsx)("text", { x: "30", y: yFor(value) + 4, className: "chart-axis", textAnchor: "end", children: value })] }, value)), points.map((point, i) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: xFor(i, points.length), x2: xFor(i, points.length), y1: "5", y2: "163", className: "chart-vgrid" }), (0, jsx_runtime_1.jsx)("text", { x: xFor(i, points.length), y: "190", className: "chart-axis", textAnchor: "middle", children: point.year })] }, point.year)), (0, jsx_runtime_1.jsx)("polyline", { points: demandPts, className: "chart-demand" }), (0, jsx_runtime_1.jsx)("polyline", { points: supplyPts, className: "chart-supply" }), points.map((point, i) => (0, jsx_runtime_1.jsx)("circle", { cx: xFor(i, points.length), cy: yFor(point.demand), r: "4.2", className: "point-demand" }, `d-${point.year}`)), points.map((point, i) => (0, jsx_runtime_1.jsx)("circle", { cx: xFor(i, points.length), cy: yFor(point.supply), r: "4.2", className: "point-supply" }, `s-${point.year}`))] }) : (0, jsx_runtime_1.jsx)("div", { className: "panel-empty", children: "Trend data is not available for this filter." }), (0, jsx_runtime_1.jsx)("button", { className: "chart-next", type: "button", "aria-label": "Open detailed demand and supply trends", onClick: () => onOpenDetail('demand'), children: (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 18 }) })] })] });
}
function RegionalPanel({ rankings, metric, onMetricChange, onOpenDetail, busy }) {
    const metricLabels = { demand: 'Demand', supply: 'Supply', 'skill-gap': 'Skill gap' };
    return (0, jsx_runtime_1.jsxs)("section", { className: "panel regional-panel", "aria-labelledby": "regional-title", "aria-busy": busy, children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: "regional-title", children: "Regional Intelligence" }), (0, jsx_runtime_1.jsx)("p", { children: "Labour market ranking by state" })] }), (0, jsx_runtime_1.jsx)(SelectControl, { label: "Regional metric", value: metric, onChange: onMetricChange, compact: true, options: [{ value: 'demand', label: 'Demand' }, { value: 'supply', label: 'Supply' }, { value: 'skill-gap', label: 'Skill gap' }] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "regional-content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "map-block", children: [(0, jsx_runtime_1.jsx)("img", { src: "./assets/india-map-illustrative.png", alt: "Decorative illustration of India; state shading does not represent the selected metric" }), (0, jsx_runtime_1.jsxs)("div", { className: "map-legend map-legend-note", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "map-dot high" }), "Regional"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "map-dot medium" }), "ranking"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "map-dot low" }), "data below"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "state-list", children: [(0, jsx_runtime_1.jsxs)("h3", { children: ["Top States by ", metricLabels[metric]] }), rankings?.items?.length ? rankings.items.slice(0, 5).map((state, index) => (0, jsx_runtime_1.jsxs)("div", { className: "state-row", children: [(0, jsx_runtime_1.jsx)("span", { className: "rank", children: state.rank ?? index + 1 }), (0, jsx_runtime_1.jsx)("span", { children: state.name }), (0, jsx_runtime_1.jsx)("strong", { children: state.formattedValue })] }, state.code || state.name)) : (0, jsx_runtime_1.jsx)("div", { className: "panel-empty", children: "No regional ranking is available." }), (0, jsx_runtime_1.jsxs)("button", { className: "button-primary state-cta", onClick: () => onOpenDetail('regional-intelligence'), type: "button", children: ["View all states ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 15 })] })] })] })] });
}
function DataRows({ rows, kind, onOpenRow }) {
    const section = kind === 'skills' ? 'emerging-skills' : kind === 'gaps' ? 'skill-gaps' : 'forecasts';
    return (0, jsx_runtime_1.jsxs)("div", { className: `data-rows data-rows-${kind}`, children: [rows.map((row) => {
                const Icon = ICONS[row.iconKey] ?? lucide_react_1.Activity;
                const trailing = row.formattedDelta ?? row.formattedValue;
                const hasValue = trailing !== undefined;
                return (0, jsx_runtime_1.jsxs)("button", { className: "data-row", type: "button", onClick: () => onOpenRow(row, section), "aria-label": `Open details for ${row.name}`, children: [(0, jsx_runtime_1.jsx)("span", { className: `row-icon tone-${row.tone}`, children: (0, jsx_runtime_1.jsx)(Icon, { size: 18 }) }), (0, jsx_runtime_1.jsx)("span", { className: "row-name", children: row.name }), hasValue ? (0, jsx_runtime_1.jsx)("strong", { className: row.formattedDelta ? 'row-delta' : 'row-value', children: trailing }) : null, (0, jsx_runtime_1.jsx)("span", { className: "bar-track", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("span", { className: `bar-fill tone-${row.tone}`, style: { width: `${Math.max(0, Math.min(100, row.displayScore ?? 0))}%` } }) })] }, row.id);
            }), !rows.length && (0, jsx_runtime_1.jsx)("div", { className: "panel-empty", children: "No rows returned for this section." })] });
}
function SummaryPanel({ title, subtitle, kind, rows, onOpenSection, onOpenRow }) {
    const section = kind === 'skills' ? 'emerging-skills' : kind === 'gaps' ? 'skill-gaps' : 'forecasts';
    return (0, jsx_runtime_1.jsxs)("section", { className: `panel summary-panel summary-${kind}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsx)("p", { children: subtitle })] }), (0, jsx_runtime_1.jsxs)("button", { className: "button-outline", onClick: () => onOpenSection(section), type: "button", children: ["View all ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14 })] })] }), (0, jsx_runtime_1.jsx)(DataRows, { rows: rows, kind: kind, onOpenRow: onOpenRow })] });
}
function Sidebar({ active, onNavigate, mobileOpen, onClose }) {
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [mobileOpen && (0, jsx_runtime_1.jsx)("button", { className: "mobile-scrim", "aria-label": "Close navigation", onClick: onClose }), (0, jsx_runtime_1.jsxs)("aside", { className: `sidebar ${mobileOpen ? 'sidebar-open' : ''}`, "aria-label": "Main navigation", children: [(0, jsx_runtime_1.jsxs)("div", { className: "sidebar-brand mobile-brand", children: [(0, jsx_runtime_1.jsx)("div", { className: "brand-mark", children: "S" }), (0, jsx_runtime_1.jsxs)("div", { className: "brand-copy", children: [(0, jsx_runtime_1.jsx)("strong", { children: "SHRAMIK" }), (0, jsx_runtime_1.jsx)("span", { children: "Labour Market Intelligence" })] })] }), (0, jsx_runtime_1.jsx)("nav", { className: "nav-list", children: NAV_ITEMS.map((item, index) => {
                            const Icon = item.icon;
                            return (0, jsx_runtime_1.jsxs)("span", { className: "nav-wrapper", children: [index === 8 && (0, jsx_runtime_1.jsx)("span", { className: "nav-divider" }), (0, jsx_runtime_1.jsxs)("button", { className: `nav-item ${active === item.label ? 'active' : ''}`, type: "button", onClick: () => { onNavigate(item); onClose(); }, children: [(0, jsx_runtime_1.jsx)(Icon, { size: 19 }), (0, jsx_runtime_1.jsx)("span", { children: item.label })] })] }, item.label);
                        }) }), (0, jsx_runtime_1.jsx)("div", { className: "sidebar-art", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("img", { src: "./assets/sidebar-workers.png", alt: "" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "mission-note", children: [(0, jsx_runtime_1.jsx)("span", { className: "mission-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lightbulb, { size: 19 }) }), (0, jsx_runtime_1.jsxs)("p", { children: ["Data for people.", (0, jsx_runtime_1.jsx)("br", {}), "Opportunities for a stronger India."] })] })] })] });
}
function SearchResults({ results, busy, onSelect }) {
    if (busy)
        return (0, jsx_runtime_1.jsx)("div", { className: "search-hint", role: "status", children: "Searching connected labour-market data\u2026" });
    if (!results.length)
        return (0, jsx_runtime_1.jsx)("div", { className: "search-hint", children: "No matching results. Try a skill, occupation, sector or state." });
    return (0, jsx_runtime_1.jsx)("div", { className: "search-hint search-results", role: "listbox", "aria-label": "Search results", children: results.map((result) => (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "option", onClick: () => onSelect(result), children: [(0, jsx_runtime_1.jsx)("strong", { children: result.label }), (0, jsx_runtime_1.jsx)("small", { children: result.description })] }, `${result.kind}-${result.id}`)) });
}
function Header({ regions, region, onRegionChange, onMenu, profile, query, onQueryChange, searchResults, searchBusy, searchOpen, onSearchOpenChange, onSearchSelect, notifications, notificationsOpen, onNotificationsToggle, onNotificationRead, profileOpen, onProfileToggle, onOpenSection, adapterMode, }) {
    const unreadCount = notifications.filter((item) => !item.read).length;
    const visibleRegionOptions = regions.length ? regions : [{ code: region, label: region, level: 'national' }];
    return (0, jsx_runtime_1.jsxs)("header", { className: "topbar", children: [(0, jsx_runtime_1.jsx)("button", { className: "mobile-menu icon-button", onClick: onMenu, type: "button", "aria-label": "Open navigation", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { size: 22 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "brand-lockup", children: [(0, jsx_runtime_1.jsx)("div", { className: "brand-mark", children: "S" }), (0, jsx_runtime_1.jsxs)("div", { className: "brand-word", children: [(0, jsx_runtime_1.jsx)("strong", { children: "SHRAMIK" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Labour Market", (0, jsx_runtime_1.jsx)("br", {}), "Intelligence System"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "global-search", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 18 }), (0, jsx_runtime_1.jsx)("input", { value: query, onFocus: () => onSearchOpenChange(true), onChange: (event) => { onQueryChange(event.target.value); onSearchOpenChange(true); }, onKeyDown: (event) => { if (event.key === 'Escape')
                            onSearchOpenChange(false); }, placeholder: "Search for skills, occupations, sectors or regions\u2026", "aria-label": "Search labour market data", "aria-expanded": searchOpen, "aria-controls": "shramik-search-results" }), (0, jsx_runtime_1.jsx)("kbd", { children: "Ctrl" }), (0, jsx_runtime_1.jsx)("kbd", { children: "K" }), searchOpen && query.trim().length >= 2 && (0, jsx_runtime_1.jsx)("div", { id: "shramik-search-results", children: (0, jsx_runtime_1.jsx)(SearchResults, { results: searchResults, busy: searchBusy, onSelect: onSearchSelect }) }), searchOpen && query.trim().length > 0 && query.trim().length < 2 && (0, jsx_runtime_1.jsx)("div", { className: "search-hint", children: "Enter at least 2 characters to search." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "region-select", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MapPin, { size: 18 }), (0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Choose region" }), (0, jsx_runtime_1.jsx)("select", { value: region, onChange: (event) => onRegionChange(event.target.value), "aria-label": "Region", children: visibleRegionOptions.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.code, children: item.label }, item.code)) }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 14 })] }), (0, jsx_runtime_1.jsxs)("div", { className: "header-popover-anchor", children: [(0, jsx_runtime_1.jsxs)("button", { className: "icon-button notification-button", "aria-label": `Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`, "aria-expanded": notificationsOpen, type: "button", onClick: onNotificationsToggle, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Bell, { size: 21 }), unreadCount > 0 && (0, jsx_runtime_1.jsx)("span", { className: "notification-dot" })] }), notificationsOpen && (0, jsx_runtime_1.jsxs)("div", { className: "header-popover notifications-popover", children: [(0, jsx_runtime_1.jsxs)("div", { className: "popover-title", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Notifications" }), (0, jsx_runtime_1.jsxs)("span", { children: [unreadCount, " unread"] })] }), notifications.length ? notifications.map((item) => (0, jsx_runtime_1.jsxs)("div", { className: `notification-item ${item.read ? 'is-read' : ''}`, children: [(0, jsx_runtime_1.jsx)("span", { className: `notification-mark severity-${item.severity}` }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.title }), (0, jsx_runtime_1.jsx)("p", { children: item.body }), (0, jsx_runtime_1.jsx)("small", { children: formatUpdated(item.createdAt) })] }), !item.read && (0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": `Mark ${item.title} read`, onClick: () => onNotificationRead(item.id), children: (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 15 }) })] }, item.id)) : (0, jsx_runtime_1.jsx)("p", { className: "popover-empty", children: "No notifications." })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "header-popover-anchor", children: [(0, jsx_runtime_1.jsxs)("button", { className: "profile-button", type: "button", onClick: onProfileToggle, "aria-expanded": profileOpen, children: [(0, jsx_runtime_1.jsx)("span", { className: "avatar", children: profile?.initials ?? 'A' }), (0, jsx_runtime_1.jsxs)("span", { className: "profile-name", children: [(0, jsx_runtime_1.jsx)("strong", { children: profile?.displayName ?? 'Research Analyst' }), (0, jsx_runtime_1.jsx)("small", { children: profile?.role ?? 'Workspace user' })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 14 })] }), profileOpen && (0, jsx_runtime_1.jsxs)("div", { className: "header-popover profile-popover", children: [(0, jsx_runtime_1.jsxs)("div", { className: "profile-card-top", children: [(0, jsx_runtime_1.jsx)("span", { className: "avatar", children: profile?.initials ?? 'A' }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: profile?.displayName ?? 'Research Analyst' }), (0, jsx_runtime_1.jsx)("small", { children: profile?.role ?? 'Workspace user' })] })] }), profile?.organisation && (0, jsx_runtime_1.jsx)("p", { children: profile.organisation }), (0, jsx_runtime_1.jsxs)("div", { className: "adapter-mode-label", children: ["Data adapter: ", (0, jsx_runtime_1.jsx)("strong", { children: adapterMode === 'rest' ? 'Connected REST API' : 'Interactive mock data' })] }), (0, jsx_runtime_1.jsxs)("button", { className: "popover-action", type: "button", onClick: () => { onOpenSection('profile'); onProfileToggle(); }, children: ["Open profile details ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14 })] })] })] })] });
}
function DetailDrawer({ detail, loading, error, onClose }) {
    if (!detail && !loading && !error)
        return null;
    return (0, jsx_runtime_1.jsx)("div", { className: "detail-scrim", role: "presentation", onMouseDown: (event) => { if (event.target === event.currentTarget)
            onClose(); }, children: (0, jsx_runtime_1.jsxs)("aside", { className: "detail-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "detail-title", children: [(0, jsx_runtime_1.jsxs)("div", { className: "detail-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "breadcrumb", children: "SHRAMIK / DETAILS" }), (0, jsx_runtime_1.jsx)("h2", { id: "detail-title", children: detail?.title ?? (loading ? 'Loading details' : 'Details unavailable') })] }), (0, jsx_runtime_1.jsx)("button", { className: "icon-button", type: "button", onClick: onClose, "aria-label": "Close details", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, {}) })] }), loading && (0, jsx_runtime_1.jsxs)("div", { className: "detail-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "spin-icon", size: 20 }), " Loading connected detail data\u2026"] }), !loading && error && (0, jsx_runtime_1.jsxs)("div", { className: "inline-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsx)("span", { children: error })] }), !loading && detail && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("p", { className: "detail-description", children: detail.description }), (0, jsx_runtime_1.jsx)("div", { className: "detail-facts", children: detail.facts.map((fact) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: fact.label }), (0, jsx_runtime_1.jsx)("strong", { children: fact.value })] }, fact.label)) }), detail.table && (0, jsx_runtime_1.jsx)("div", { className: "detail-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "detail-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsx)("tr", { children: detail.table.columns.map((column) => (0, jsx_runtime_1.jsx)("th", { children: column }, column)) }) }), (0, jsx_runtime_1.jsx)("tbody", { children: detail.table.rows.map((row, index) => (0, jsx_runtime_1.jsx)("tr", { children: detail.table.columns.map((column) => (0, jsx_runtime_1.jsx)("td", { children: row[column] ?? '—' }, column)) }, index)) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "detail-provenance", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 16 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: detail.meta.sourceLabel }), (0, jsx_runtime_1.jsxs)("p", { children: [detail.meta.provenance === 'source-backed' ? 'Source-backed response' : detail.meta.provenance === 'derived' ? 'Derived analytical value' : detail.meta.provenance === 'mixed' ? 'Mixed source provenance' : 'Mock / illustrative response', " \u00B7 Updated ", formatUpdated(detail.meta.updatedAt)] }), detail.meta.notes?.map((note) => (0, jsx_runtime_1.jsx)("p", { children: note }, note))] })] })] })] }) });
}
function SHRAMIKDashboard({ onNavigate, dataAdapter } = {}) {
    const [defaultAdapter] = (0, react_1.useState)(() => (0, adapter_1.createLabourMarketDataAdapter)());
    const adapter = dataAdapter ?? defaultAdapter;
    const [activePage, setActivePage] = (0, react_1.useState)(getInitialPage);
    const [active, setActive] = (0, react_1.useState)(() => ({ 'skill-gaps': 'Skill Gaps', forecasts: 'Forecasts', reports: 'Reports', dashboard: 'Dashboard' }[getInitialPage()]));
    const [regions, setRegions] = (0, react_1.useState)([]);
    const [region, setRegion] = (0, react_1.useState)('IN');
    const [periodYears, setPeriodYears] = (0, react_1.useState)(5);
    const [rankingMetric, setRankingMetric] = (0, react_1.useState)('demand');
    const [dashboard, setDashboard] = (0, react_1.useState)(null);
    const [rankings, setRankings] = (0, react_1.useState)(null);
    const [profile, setProfile] = (0, react_1.useState)(null);
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const [mobileOpen, setMobileOpen] = (0, react_1.useState)(false);
    const [toast, setToast] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const [rankingsError, setRankingsError] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [refreshCounter, setRefreshCounter] = (0, react_1.useState)(0);
    const [query, setQuery] = (0, react_1.useState)('');
    const [searchResults, setSearchResults] = (0, react_1.useState)([]);
    const [searchBusy, setSearchBusy] = (0, react_1.useState)(false);
    const [searchOpen, setSearchOpen] = (0, react_1.useState)(false);
    const [notificationsOpen, setNotificationsOpen] = (0, react_1.useState)(false);
    const [profileOpen, setProfileOpen] = (0, react_1.useState)(false);
    const [detail, setDetail] = (0, react_1.useState)(null);
    const [detailLoading, setDetailLoading] = (0, react_1.useState)(false);
    const [detailError, setDetailError] = (0, react_1.useState)('');
    const [parallax, setParallax] = (0, react_1.useState)(0);
    const hasDashboard = (0, react_1.useRef)(false);
    const searchQueryController = (0, react_1.useRef)(null);
    const notify = (0, react_1.useCallback)((message) => setToast(message), []);
    const regionLabel = (0, react_1.useMemo)(() => regions.find((item) => item.code === region)?.label ?? dashboard?.regionName ?? region, [regions, region, dashboard?.regionName]);
    (0, react_1.useEffect)(() => {
        const syncRoute = () => {
            const page = getInitialPage();
            setActivePage(page);
            setActive({ 'skill-gaps': 'Skill Gaps', forecasts: 'Forecasts', reports: 'Reports', dashboard: 'Dashboard' }[page]);
        };
        window.addEventListener('hashchange', syncRoute);
        window.addEventListener('popstate', syncRoute);
        return () => { window.removeEventListener('hashchange', syncRoute); window.removeEventListener('popstate', syncRoute); };
    }, []);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        Promise.allSettled([adapter.getRegions(controller.signal), adapter.getProfile(controller.signal), adapter.getNotifications(controller.signal)]).then((results) => {
            if (controller.signal.aborted)
                return;
            if (results[0].status === 'fulfilled')
                setRegions(results[0].value);
            else
                notify(`Region list could not load: ${results[0].reason instanceof Error ? results[0].reason.message : 'Unknown error'}`);
            if (results[1].status === 'fulfilled')
                setProfile(results[1].value);
            if (results[2].status === 'fulfilled')
                setNotifications(results[2].value);
        });
        return () => controller.abort();
    }, [adapter, notify]);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        setLoading(!hasDashboard.current);
        setRefreshing(hasDashboard.current);
        setError('');
        adapter.getDashboard({ regionCode: region, periodYears, signal: controller.signal }).then((response) => {
            if (controller.signal.aborted)
                return;
            setDashboard(response);
            hasDashboard.current = true;
            setError('');
        }).catch((reason) => {
            if (controller.signal.aborted)
                return;
            setError(reason instanceof Error ? reason.message : 'Dashboard data could not be loaded.');
        }).finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        });
        return () => controller.abort();
    }, [adapter, region, periodYears, refreshCounter]);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        setRankings(null);
        setRankingsError('');
        adapter.getRegionRankings({ regionCode: region, metric: rankingMetric, signal: controller.signal }).then((response) => {
            if (!controller.signal.aborted)
                setRankings(response);
        }).catch((reason) => {
            if (!controller.signal.aborted)
                setRankingsError(reason instanceof Error ? reason.message : 'Regional ranking data could not be loaded.');
        });
        return () => controller.abort();
    }, [adapter, region, rankingMetric, refreshCounter]);
    (0, react_1.useEffect)(() => {
        searchQueryController.current?.abort();
        if (query.trim().length < 2) {
            setSearchResults([]);
            setSearchBusy(false);
            return;
        }
        const controller = new AbortController();
        searchQueryController.current = controller;
        setSearchBusy(true);
        const timer = window.setTimeout(() => {
            adapter.search({ query: query.trim(), regionCode: region, signal: controller.signal }).then((results) => {
                if (!controller.signal.aborted)
                    setSearchResults(results);
            }).catch((reason) => {
                if (!controller.signal.aborted) {
                    setSearchResults([]);
                    notify(reason instanceof Error ? reason.message : 'Search failed.');
                }
            }).finally(() => { if (!controller.signal.aborted)
                setSearchBusy(false); });
        }, 220);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [adapter, query, region, notify]);
    (0, react_1.useEffect)(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
        const compact = window.matchMedia('(max-width: 620px)');
        let ticking = false;
        const update = () => {
            if (reduce.matches || compact.matches) {
                setParallax(0);
                ticking = false;
                return;
            }
            setParallax(Math.max(-18, Math.min(18, window.scrollY * 0.035)));
            ticking = false;
        };
        const onScroll = () => { if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        } };
        window.addEventListener('scroll', onScroll, { passive: true });
        update();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    (0, react_1.useEffect)(() => { if (!toast)
        return; const timer = window.setTimeout(() => setToast(''), 3600); return () => window.clearTimeout(timer); }, [toast]);
    (0, react_1.useEffect)(() => {
        const closeOverlays = (event) => {
            if (event.key === 'Escape') {
                setSearchOpen(false);
                setNotificationsOpen(false);
                setProfileOpen(false);
                setMobileOpen(false);
                if (detail || detailLoading || detailError) {
                    setDetail(null);
                    setDetailLoading(false);
                    setDetailError('');
                }
            }
        };
        const onKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                document.querySelector('.global-search input')?.focus();
                setSearchOpen(true);
            }
        };
        window.addEventListener('keydown', closeOverlays);
        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', closeOverlays); window.removeEventListener('keydown', onKeyDown); };
    }, [detail, detailLoading, detailError]);
    const closeDetail = (0, react_1.useCallback)(() => { setDetail(null); setDetailLoading(false); setDetailError(''); }, []);
    const openIndicator = (0, react_1.useCallback)(async (item) => {
        setDetail(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            setDetail(await adapter.getIndicatorDetail(item.id, { regionCode: region }));
        }
        catch (reason) {
            setDetailError(reason instanceof Error ? reason.message : 'Indicator detail could not be loaded.');
        }
        finally {
            setDetailLoading(false);
        }
    }, [adapter, region]);
    const openSection = (0, react_1.useCallback)(async (section) => {
        setDetail(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            setDetail(await adapter.getSectionDetail(section, { regionCode: region }));
        }
        catch (reason) {
            setDetailError(reason instanceof Error ? reason.message : `The ${section} detail could not be loaded.`);
        }
        finally {
            setDetailLoading(false);
        }
    }, [adapter, region]);
    const openRow = (0, react_1.useCallback)(async (row, section) => {
        setDetail(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            const rowDetail = await adapter.getIndicatorDetail(row.id, { regionCode: region });
            setDetail(rowDetail);
        }
        catch {
            try {
                setDetail(await adapter.getSectionDetail(section, { regionCode: region }));
            }
            catch (reason) {
                setDetailError(reason instanceof Error ? reason.message : `${row.name} details could not be loaded.`);
            }
        }
        finally {
            setDetailLoading(false);
        }
    }, [adapter, region]);
    const handleNavigate = (0, react_1.useCallback)((item) => {
        setActive(item.label);
        setMobileOpen(false);
        if (item.section === 'dashboard') {
            setActivePage('dashboard');
            closeDetail();
            setSearchOpen(false);
            if (!onNavigate)
                window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#dashboard`);
            return;
        }
        if (item.section === 'skill-gaps') {
            if (onNavigate)
                onNavigate('/skill-gaps', item.label);
            else {
                setActivePage('skill-gaps');
                closeDetail();
                setSearchOpen(false);
                window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#skill-gaps`);
                window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path: '/skill-gaps', label: item.label } }));
            }
            return;
        }
        if (item.section === 'forecasts') {
            if (onNavigate)
                onNavigate('/forecasts', item.label);
            else {
                setActivePage('forecasts');
                closeDetail();
                setSearchOpen(false);
                window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#forecasts`);
                window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path: '/forecasts', label: item.label } }));
            }
            return;
        }
        if (item.section === 'reports') {
            if (onNavigate)
                onNavigate('/reports', item.label);
            else {
                setActivePage('reports');
                closeDetail();
                setSearchOpen(false);
                window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#reports`);
                window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path: '/reports', label: item.label } }));
            }
            return;
        }
        if (onNavigate)
            onNavigate(`/${item.section}`, item.label);
        else {
            window.dispatchEvent(new CustomEvent('shramik:navigate', { detail: { path: `/${item.section}`, label: item.label } }));
            void openSection(item.section);
        }
    }, [closeDetail, onNavigate, openSection]);
    const handleSearchSelect = (0, react_1.useCallback)(async (result) => {
        setQuery(result.label);
        setSearchOpen(false);
        if (result.kind === 'region') {
            setRegion(result.id);
            return;
        }
        setDetail(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            setDetail(await adapter.getIndicatorDetail(result.id, { regionCode: region }));
        }
        catch {
            const section = sectionForTarget(result.target);
            try {
                setDetail(await adapter.getSectionDetail(section, { regionCode: region }));
            }
            catch (reason) {
                setDetailError(reason instanceof Error ? reason.message : `Search result “${result.label}” could not be loaded.`);
            }
        }
        finally {
            setDetailLoading(false);
        }
        window.dispatchEvent(new CustomEvent('shramik:search-select', { detail: result }));
    }, [adapter, region]);
    const markRead = (0, react_1.useCallback)(async (id) => {
        try {
            await adapter.markNotificationRead(id);
            setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
        }
        catch (reason) {
            notify(reason instanceof Error ? reason.message : 'Could not mark notification as read.');
        }
    }, [adapter, notify]);
    const refresh = () => setRefreshCounter((value) => value + 1);
    const handleRegionChange = (value) => { setRegion(value); closeDetail(); };
    const handleGapRegionChange = (0, react_1.useCallback)((value) => { setRegion(value); closeDetail(); }, [closeDetail]);
    const handleGapDetail = (0, react_1.useCallback)((gapDetail) => {
        const provenance = gapDetail.meta.provenance === 'source_backed' ? 'source-backed' : gapDetail.meta.provenance;
        const common = {
            id: gapDetail.id, title: gapDetail.title, description: gapDetail.description, facts: gapDetail.facts,
            meta: { provenance, sourceLabel: gapDetail.meta.sourceLabel, updatedAt: gapDetail.meta.updatedAt ?? null,
                coverage: gapDetail.meta.coverage?.summary ?? 'Coverage not supplied', notes: gapDetail.meta.notes },
        };
        setDetail(common);
        setDetailError('');
        setDetailLoading(false);
    }, []);
    const handleGapDetailError = (0, react_1.useCallback)((message) => { setDetail(null); setDetailLoading(false); setDetailError(message); }, []);
    const handleRankingMetricChange = (value) => setRankingMetric(value);
    return (0, jsx_runtime_1.jsxs)("div", { className: `app-root data-mode-${adapter.mode}`, children: [(0, jsx_runtime_1.jsx)(Header, { regions: regions, region: region, onRegionChange: handleRegionChange, onMenu: () => setMobileOpen(true), profile: profile, query: query, onQueryChange: setQuery, searchResults: searchResults, searchBusy: searchBusy, searchOpen: searchOpen, onSearchOpenChange: setSearchOpen, onSearchSelect: handleSearchSelect, notifications: notifications, notificationsOpen: notificationsOpen, onNotificationsToggle: () => { setNotificationsOpen((value) => !value); setProfileOpen(false); }, onNotificationRead: (id) => void markRead(id), profileOpen: profileOpen, onProfileToggle: () => { setProfileOpen((value) => !value); setNotificationsOpen(false); }, onOpenSection: (section) => void openSection(section), adapterMode: adapter.mode }), (0, jsx_runtime_1.jsxs)("div", { className: "app-layout", children: [(0, jsx_runtime_1.jsx)(Sidebar, { active: active, onNavigate: handleNavigate, mobileOpen: mobileOpen, onClose: () => setMobileOpen(false) }), (0, jsx_runtime_1.jsx)("main", { className: "dashboard-main", "aria-busy": activePage === 'dashboard' ? loading || refreshing : undefined, children: activePage === 'skill-gaps' ? (0, jsx_runtime_1.jsx)(SkillGapAnalysisPage_1.default, { globalRegionCode: region, onGlobalRegionChange: handleGapRegionChange, onOpenDetail: handleGapDetail, onDetailError: handleGapDetailError }) : activePage === 'forecasts' ? (0, jsx_runtime_1.jsx)(ForecastsPage_1.default, { globalRegionCode: region, onGlobalRegionChange: handleGapRegionChange }) : activePage === 'reports' ? (0, jsx_runtime_1.jsx)(ReportsPage_1.default, {}) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { className: "hero-band", "aria-labelledby": "page-title", children: [(0, jsx_runtime_1.jsxs)("div", { className: "hero-copy", children: [(0, jsx_runtime_1.jsxs)("div", { className: "breadcrumb", children: ["DASHBOARD ", (0, jsx_runtime_1.jsx)("span", { children: "/" }), " ", regionLabel.toUpperCase()] }), (0, jsx_runtime_1.jsxs)("h1", { id: "page-title", children: ["India\u2019s Labour Market", (0, jsx_runtime_1.jsx)("br", { className: "desktop-break" }), " at a Glance"] }), (0, jsx_runtime_1.jsx)("div", { className: "title-underline" }), (0, jsx_runtime_1.jsx)("p", { children: "Key insights on demand, supply, skill gaps and emerging opportunities across sectors and regions." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "hero-art-wrap", style: { transform: `translate3d(0, ${parallax}px, 0)` }, "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("img", { className: "hero-art", src: "./assets/hero-worker-industrial.png", alt: "" }), (0, jsx_runtime_1.jsx)("img", { className: "sticky-note-art", src: "./assets/sticky-note-decorative.png", alt: "" }), (0, jsx_runtime_1.jsx)("span", { className: "hero-accent-dot" })] })] }), error && (0, jsx_runtime_1.jsxs)("div", { role: "alert", className: "data-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Dashboard data unavailable." }), " ", error] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: refresh, children: "Retry" })] }), rankingsError && (0, jsx_runtime_1.jsxs)("div", { role: "status", className: "data-error subtle-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 16 }), (0, jsx_runtime_1.jsxs)("span", { children: ["Regional rankings: ", rankingsError] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: refresh, children: "Retry" })] }), loading && !dashboard && (0, jsx_runtime_1.jsxs)("div", { className: "load-strip", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16, className: "spin-icon" }), " Loading dashboard data from the active adapter\u2026"] }), (0, jsx_runtime_1.jsxs)("section", { className: "kpi-grid", "aria-label": "Key labour market indicators", children: [(dashboard?.kpis ?? []).map((item, index) => (0, jsx_runtime_1.jsx)(KpiCard, { item: item, index: index, onOpen: (selected) => void openIndicator(selected) }, item.id)), loading && !dashboard && Array.from({ length: 4 }, (_, index) => (0, jsx_runtime_1.jsx)("div", { className: "kpi-skeleton", "aria-hidden": "true" }, index))] }), (0, jsx_runtime_1.jsxs)("section", { className: "middle-grid", "aria-label": "Market trends and regional intelligence", children: [(0, jsx_runtime_1.jsx)(ChartPanel, { data: dashboard, periodYears: periodYears, onPeriodChange: setPeriodYears, onOpenDetail: (section) => void openSection(section) }), (0, jsx_runtime_1.jsx)(RegionalPanel, { rankings: rankings, metric: rankingMetric, onMetricChange: handleRankingMetricChange, onOpenDetail: (section) => void openSection(section), busy: !rankings && !rankingsError })] }), (0, jsx_runtime_1.jsxs)("section", { className: "summary-grid", "aria-label": "Skills, sectors and occupation summaries", children: [(0, jsx_runtime_1.jsx)(SummaryPanel, { title: "Emerging Skills", subtitle: "Skills with rising demand signals", kind: "skills", rows: dashboard?.emergingSkills ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) }), (0, jsx_runtime_1.jsx)(SummaryPanel, { title: "Skill Gaps by Sector", subtitle: "Estimated gap (in millions)", kind: "gaps", rows: dashboard?.sectorGaps ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) }), (0, jsx_runtime_1.jsx)(SummaryPanel, { title: "Occupation Forecasts", subtitle: "Projected demand change (2024\u20132029)", kind: "forecasts", rows: dashboard?.occupationForecasts ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) })] }), (0, jsx_runtime_1.jsxs)("footer", { className: "method-note", children: [(0, jsx_runtime_1.jsx)("span", { className: "note-marker", children: "i" }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: dashboard?.meta.provenance === 'source-backed' ? 'Data notes:' : 'Prototype preview:' }), " ", dashboard?.meta.provenance === 'source-backed' ? `${dashboard.meta.sourceLabel}. Check the detail panels for source notes, units and coverage.` : 'All numbers currently visible come from an illustrative adapter unless a source-backed API is configured; do not treat them as verified labour-market statistics.'] }), (0, jsx_runtime_1.jsxs)("span", { className: `data-status-footer ${dashboard?.meta.provenance ?? 'mock'}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "status-dot" }), dashboard?.meta.provenance === 'source-backed' ? 'Source-backed' : dashboard?.meta.provenance === 'mixed' ? 'Mixed provenance' : dashboard?.meta.provenance === 'derived' ? 'Derived values' : 'Illustrative data'] }), (0, jsx_runtime_1.jsxs)("span", { className: "updated", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarDays, { size: 14 }), dashboard?.meta.updatedAt ? formatUpdated(dashboard.meta.updatedAt) : 'Update unavailable'] }), (0, jsx_runtime_1.jsxs)("span", { className: "updated", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 14 }), adapter.mode === 'rest' ? 'REST API' : 'Mock adapter'] }), (0, jsx_runtime_1.jsxs)("button", { className: "refresh-button", type: "button", onClick: refresh, disabled: loading || refreshing, "aria-label": "Refresh dashboard data", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 13, className: refreshing ? 'spin-icon' : '' }), " Refresh"] })] })] }) })] }), toast && (0, jsx_runtime_1.jsxs)("div", { role: "status", className: "toast-message", children: [(0, jsx_runtime_1.jsx)("span", { children: toast }), (0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "Dismiss notification", onClick: () => setToast(''), children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 15 }) })] }), (0, jsx_runtime_1.jsx)(DetailDrawer, { detail: detail, loading: detailLoading, error: detailError, onClose: closeDetail })] });
}

},
"api/adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLabourMarketDataAdapter = createLabourMarketDataAdapter;
const mock_adapter_1 = require("./mock-adapter");
const rest_adapter_1 = require("./rest-adapter");
function createLabourMarketDataAdapter() {
    const baseUrl = (typeof window !== 'undefined' && window.SHRAMIK_CONFIG && window.SHRAMIK_CONFIG.apiBaseUrl || '').trim();
    if (baseUrl) {
        return new rest_adapter_1.RestLabourMarketDataAdapter({
            baseUrl,
            getAccessToken: () => null,
        });
    }
    return new mock_adapter_1.MockLabourMarketDataAdapter();
}

},
"api/mock-adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDataMeta = exports.MockLabourMarketDataAdapter = void 0;
const MOCK_META = {
    provenance: 'mock',
    sourceLabel: 'Illustrative prototype data',
    updatedAt: '2026-10-11T00:00:00.000Z',
    coverage: 'UI demonstration only',
    notes: ['Not source-backed labour-market statistics. Replace with validated API data before production use.'],
};
exports.mockDataMeta = MOCK_META;
const regions = [
    { code: 'IN', label: 'India (National)', level: 'national' },
    { code: 'EAST', label: 'East India', level: 'region' },
    { code: 'OD', label: 'Odisha', level: 'state' },
    { code: 'MH', label: 'Maharashtra', level: 'state' },
    { code: 'TN', label: 'Tamil Nadu', level: 'state' },
    { code: 'KA', label: 'Karnataka', level: 'state' },
    { code: 'GJ', label: 'Gujarat', level: 'state' },
    { code: 'UP', label: 'Uttar Pradesh', level: 'state' },
];
function metric(id, key, title, subtitle, value, formattedValue, unit, deltaPct, context, trend) {
    return { id, key, title, subtitle, value, formattedValue, unit, deltaPct, context, trend, meta: MOCK_META };
}
const baseKpis = [
    metric('total-labour-demand', 'demand', 'Total Labour Demand', 'Estimated workforce demand', 236.8, '236.8M', 'million workers', 4.2, 'vs. last year', [18, 25, 23, 36, 32, 45, 49, 64]),
    metric('total-labour-supply', 'supply', 'Total Labour Supply', 'Estimated workforce supply', 229.1, '229.1M', 'million workers', 3.1, 'vs. last year', [17, 22, 20, 30, 35, 32, 44, 54]),
    metric('overall-skill-gap', 'skill-gap', 'Overall Skill Gap', 'Demand − Supply', 7.7, '7.7M', 'million workers', 12.6, 'vs. last year', [15, 19, 17, 31, 28, 41, 38, 52]),
    metric('emerging-skills', 'emerging-skills', 'Emerging Skills', 'High-growth opportunities', 312, '312', 'signals', 28, 'new this year', [13, 18, 15, 26, 24, 35, 33, 47]),
];
const demandTrend = [
    { year: 2020, demand: 112, supply: 82 },
    { year: 2021, demand: 151, supply: 107 },
    { year: 2022, demand: 169, supply: 132 },
    { year: 2023, demand: 202, supply: 163 },
    { year: 2024, demand: 236, supply: 214 },
];
const skillRows = [
    { id: 'artificial-intelligence', name: 'Artificial Intelligence', deltaPct: 52, formattedDelta: '+52%', displayScore: 83, tone: 'navy', iconKey: 'brain-circuit', meta: MOCK_META },
    { id: 'green-energy-systems', name: 'Green Energy Systems', deltaPct: 41, formattedDelta: '+41%', displayScore: 62, tone: 'teal', iconKey: 'leaf', meta: MOCK_META },
    { id: 'data-analysis', name: 'Data Analysis', deltaPct: 37, formattedDelta: '+37%', displayScore: 53, tone: 'orange', iconKey: 'chart-column', meta: MOCK_META },
    { id: 'industrial-automation', name: 'Industrial Automation', deltaPct: 33, formattedDelta: '+33%', displayScore: 70, tone: 'navy', iconKey: 'wrench', meta: MOCK_META },
    { id: 'sustainable-construction', name: 'Sustainable Construction', deltaPct: 29, formattedDelta: '+29%', displayScore: 46, tone: 'teal', iconKey: 'building-2', meta: MOCK_META },
];
const gapRows = [
    { id: 'manufacturing', name: 'Manufacturing', value: 2.8, formattedValue: '2.8M', displayScore: 93, tone: 'orange', iconKey: 'factory', meta: MOCK_META },
    { id: 'construction', name: 'Construction', value: 1.9, formattedValue: '1.9M', displayScore: 66, tone: 'orange', iconKey: 'building-2', meta: MOCK_META },
    { id: 'retail-trade', name: 'Retail & Trade', value: 1.1, formattedValue: '1.1M', displayScore: 48, tone: 'orange', iconKey: 'truck', meta: MOCK_META },
    { id: 'healthcare', name: 'Healthcare', value: 0.8, formattedValue: '0.8M', displayScore: 31, tone: 'navy', iconKey: 'heart-pulse', meta: MOCK_META },
    { id: 'agriculture', name: 'Agriculture', value: 0.6, formattedValue: '0.6M', displayScore: 22, tone: 'teal', iconKey: 'leaf', meta: MOCK_META },
];
const forecastRows = [
    { id: 'construction-workers', name: 'Construction Workers', deltaPct: 22, formattedDelta: '+22%', displayScore: 66, tone: 'navy', iconKey: 'building-2', meta: MOCK_META },
    { id: 'machine-operators', name: 'Machine Operators', deltaPct: 18, formattedDelta: '+18%', displayScore: 52, tone: 'teal', iconKey: 'wrench', meta: MOCK_META },
    { id: 'healthcare-assistants', name: 'Healthcare Assistants', deltaPct: 16, formattedDelta: '+16%', displayScore: 44, tone: 'orange', iconKey: 'heart-pulse', meta: MOCK_META },
    { id: 'logistics-supply-chain', name: 'Logistics & Supply Chain', deltaPct: 15, formattedDelta: '+15%', displayScore: 37, tone: 'navy', iconKey: 'truck', meta: MOCK_META },
    { id: 'data-ai-specialists', name: 'Data & AI Specialists', deltaPct: 35, formattedDelta: '+35%', displayScore: 82, tone: 'teal', iconKey: 'brain-circuit', meta: MOCK_META },
];
let notifications = [
    { id: 'demo-data-warning', title: 'Prototype data active', body: 'Values are illustrative until a source-backed API is configured.', createdAt: '2026-10-11T08:00:00.000Z', read: false, severity: 'warning' },
    { id: 'demo-refresh', title: 'Dashboard adapter ready', body: 'Configure VITE_SHRAMIK_API_BASE_URL to use the REST adapter.', createdAt: '2026-10-11T07:00:00.000Z', read: false, severity: 'info' },
];
const profile = { id: 'demo-analyst', displayName: 'Arjun Mehta', role: 'Research Analyst', initials: 'A', organisation: 'SHRAMIK Demo Workspace' };
function detailFor(title, description, rows = []) {
    const tableRows = rows.map((row) => ({
        Item: row.name,
        Value: row.formattedValue ?? row.formattedDelta ?? '—',
        'Display score': row.displayScore ?? '—',
    }));
    return {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title, description,
        facts: [
            { label: 'Data mode', value: 'Illustrative mock adapter' },
            { label: 'Provenance', value: 'Not source-backed' },
            { label: 'Region', value: 'Selected region filter applied for integration parity' },
        ],
        table: tableRows.length ? { columns: ['Item', 'Value', 'Display score'], rows: tableRows } : undefined,
        meta: MOCK_META,
    };
}
function assertNotAborted(signal) {
    if (signal?.aborted)
        throw new DOMException('The operation was aborted.', 'AbortError');
}
class MockLabourMarketDataAdapter {
    constructor() {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'mock'
        });
    }
    async getRegions(signal) { assertNotAborted(signal); return regions; }
    async getProfile(signal) { assertNotAborted(signal); return profile; }
    async getDashboard(query) {
        assertNotAborted(query.signal);
        const period = query.periodYears;
        return {
            regionCode: query.regionCode,
            regionName: regions.find((item) => item.code === query.regionCode)?.label ?? 'Selected region',
            periodYears: period,
            kpis: baseKpis.map((item) => ({ ...item, trend: [...item.trend] })),
            trend: period === 3 ? demandTrend.slice(-3) : demandTrend,
            emergingSkills: skillRows,
            sectorGaps: gapRows,
            occupationForecasts: forecastRows,
            meta: MOCK_META,
        };
    }
    async getRegionRankings(query) {
        assertNotAborted(query.signal);
        const source = {
            demand: [
                { code: 'MH', name: 'Maharashtra', value: 28.4, formattedValue: '28.4M', level: 'high' },
                { code: 'UP', name: 'Uttar Pradesh', value: 24.1, formattedValue: '24.1M', level: 'high' },
                { code: 'TN', name: 'Tamil Nadu', value: 18.7, formattedValue: '18.7M', level: 'medium' },
                { code: 'KA', name: 'Karnataka', value: 16.3, formattedValue: '16.3M', level: 'medium' },
                { code: 'GJ', name: 'Gujarat', value: 14.9, formattedValue: '14.9M', level: 'medium' },
            ],
            supply: [
                { code: 'UP', name: 'Uttar Pradesh', value: 23.2, formattedValue: '23.2M', level: 'high' },
                { code: 'MH', name: 'Maharashtra', value: 22.6, formattedValue: '22.6M', level: 'high' },
                { code: 'TN', name: 'Tamil Nadu', value: 17.8, formattedValue: '17.8M', level: 'medium' },
                { code: 'WB', name: 'West Bengal', value: 15.2, formattedValue: '15.2M', level: 'medium' },
                { code: 'KA', name: 'Karnataka', value: 14.8, formattedValue: '14.8M', level: 'medium' },
            ],
            'skill-gap': [
                { code: 'MH', name: 'Maharashtra', value: 3.1, formattedValue: '3.1M', level: 'high' },
                { code: 'KA', name: 'Karnataka', value: 2.4, formattedValue: '2.4M', level: 'high' },
                { code: 'GJ', name: 'Gujarat', value: 1.8, formattedValue: '1.8M', level: 'medium' },
                { code: 'TN', name: 'Tamil Nadu', value: 1.6, formattedValue: '1.6M', level: 'medium' },
                { code: 'UP', name: 'Uttar Pradesh', value: 1.2, formattedValue: '1.2M', level: 'low' },
            ],
        };
        return { metric: query.metric, unit: query.metric === 'skill-gap' ? 'million workers' : 'million workers', items: source[query.metric], meta: MOCK_META };
    }
    async search(query) {
        assertNotAborted(query.signal);
        const q = query.query.trim().toLowerCase();
        if (!q)
            return [];
        const items = [
            ...skillRows.map((row) => ({ id: row.id, label: row.name, description: `Emerging skill · ${row.formattedDelta ?? 'signal'}`, kind: 'skill', target: 'emerging-skills' })),
            ...gapRows.map((row) => ({ id: row.id, label: row.name, description: `Sector skill gap · ${row.formattedValue}`, kind: 'sector', target: 'skill-gaps' })),
            ...forecastRows.map((row) => ({ id: row.id, label: row.name, description: `Occupation forecast · ${row.formattedDelta}`, kind: 'occupation', target: 'forecasts' })),
            ...regions.map((region) => ({ id: region.code, label: region.label, description: `Region filter · ${region.level}`, kind: 'region', target: region.code })),
        ];
        return items.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(q)).slice(0, 7);
    }
    async getNotifications(signal) { assertNotAborted(signal); return [...notifications]; }
    async markNotificationRead(id, signal) {
        assertNotAborted(signal);
        notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item);
    }
    async getIndicatorDetail(id, query) {
        assertNotAborted(query.signal);
        const item = baseKpis.find((kpi) => kpi.id === id);
        if (item)
            return detailFor(item.title, `${item.subtitle}. Current demonstration value: ${item.formattedValue}.`, []);
        const row = [...skillRows, ...gapRows, ...forecastRows].find((entry) => entry.id === id);
        if (row)
            return detailFor(row.name, `Detail record for ${row.name}; values are illustrative in the mock adapter.`, [row]);
        throw new Error(`No indicator found for id '${id}'.`);
    }
    async getSectionDetail(section, query) {
        assertNotAborted(query.signal);
        const allRows = {
            demand: [], supply: [], 'skill-gaps': gapRows, 'emerging-skills': skillRows,
            forecasts: forecastRows, reports: [], 'data-sources': [], 'data-quality': [],
            'scenario-simulator': [], dashboard: [],
        };
        const titles = {
            demand: 'Demand insights', supply: 'Supply insights', 'skill-gaps': 'Skill gaps',
            'emerging-skills': 'Emerging skills', forecasts: 'Occupation forecasts', reports: 'Reports',
            'data-sources': 'Data sources', 'data-quality': 'Data quality',
            'scenario-simulator': 'Scenario simulator', dashboard: 'Dashboard overview',
        };
        const title = titles[section] ?? section.replace(/-/g, ' ').replace(/^./, (char) => char.toUpperCase());
        return detailFor(title, 'This detail response is delivered by the mock data adapter. The REST adapter loads the same view from the configured API.', allRows[section] ?? []);
    }
}
exports.MockLabourMarketDataAdapter = MockLabourMarketDataAdapter;

},
"api/rest-adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestLabourMarketDataAdapter = exports.ApiRequestError = void 0;
class ApiRequestError extends Error {
    constructor(message, status, path) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: status
        });
        Object.defineProperty(this, "path", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: path
        });
        this.name = 'ApiRequestError';
    }
}
exports.ApiRequestError = ApiRequestError;
class RestLabourMarketDataAdapter {
    constructor(options) {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'rest'
        });
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchImpl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getAccessToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const trimmed = options.baseUrl.replace(/\/+$/, '');
        this.baseUrl = trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
        this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
        this.getAccessToken = options.getAccessToken;
    }
    async request(path, init = {}, signal) {
        const token = await this.getAccessToken?.();
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/json');
        if (init.body && !headers.has('Content-Type'))
            headers.set('Content-Type', 'application/json');
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        let response;
        try {
            response = await this.fetchImpl(`${this.baseUrl}${path}`, {
                ...init,
                headers,
                signal: signal ?? init.signal ?? undefined,
                credentials: init.credentials ?? 'include',
            });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError')
                throw error;
            throw new ApiRequestError('Cannot reach the SHRAMIK API. Check the API URL and network connection.', 0, path);
        }
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new ApiRequestError(detail.trim() || `Request failed (${response.status}).`, response.status, path);
        }
        if (response.status === 204)
            return undefined;
        const payload = await response.json();
        return typeof payload === 'object' && payload !== null && 'data' in payload
            ? payload.data
            : payload;
    }
    getRegions(signal) {
        return this.request('/regions', {}, signal);
    }
    getProfile(signal) {
        return this.request('/me', {}, signal);
    }
    getDashboard(query) {
        const params = new URLSearchParams({ region: query.regionCode, period: `${query.periodYears}y` });
        return this.request(`/dashboard/summary?${params}`, {}, query.signal);
    }
    getRegionRankings(query) {
        const params = new URLSearchParams({ region: query.regionCode, metric: query.metric });
        return this.request(`/dashboard/regions/rankings?${params}`, {}, query.signal);
    }
    search(query) {
        const params = new URLSearchParams({ q: query.query, region: query.regionCode });
        return this.request(`/search?${params}`, {}, query.signal);
    }
    getNotifications(signal) {
        return this.request('/notifications', {}, signal);
    }
    markNotificationRead(id, signal) {
        return this.request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }, signal);
    }
    getIndicatorDetail(id, query) {
        const params = new URLSearchParams({ region: query.regionCode });
        return this.request(`/dashboard/indicators/${encodeURIComponent(id)}?${params}`, {}, query.signal);
    }
    getSectionDetail(section, query) {
        const params = new URLSearchParams({ region: query.regionCode });
        return this.request(`/dashboard/details/${encodeURIComponent(section)}?${params}`, {}, query.signal);
    }
}
exports.RestLabourMarketDataAdapter = RestLabourMarketDataAdapter;

},
"skill-gaps/SkillGapAnalysisPage": function(module, exports, require) {
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SkillGapAnalysisPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const adapter_1 = require("./adapter");
const blankResource = () => ({ data: null, loading: true, error: '', stale: false });
const FILTER_LABELS = {
    period: 'Time period', geographyLevel: 'Geography', regionCode: 'Region code', stateCode: 'State / UT',
    sectorCode: 'Sector', ncoCode: 'Occupation (NCO)', skillCode: 'Skill',
};
const CLASS_LABEL = {
    high_shortage: 'High shortage', moderate_shortage: 'Moderate shortage', balanced: 'Balanced',
    moderate_surplus: 'Moderate surplus', high_surplus: 'High surplus', not_comparable: 'Not comparable',
    no_data: 'No data', suppressed: 'Suppressed',
};
const CLASS_SYMBOL = {
    high_shortage: '▲', moderate_shortage: '▲', balanced: '●', moderate_surplus: '■', high_surplus: '■',
    not_comparable: '?', no_data: '—', suppressed: '—',
};
const STATE_SHORTCODES = {
    'IN-MH': 'MH', 'IN-UP': 'UP', 'IN-TN': 'TN', 'IN-GJ': 'GJ', 'IN-KA': 'KA', 'IN-WB': 'WB',
    'IN-RJ': 'RJ', 'IN-BR': 'BR', 'IN-KL': 'KL', 'IN-PB': 'PB', 'IN-OD': 'OD', 'IN-LA': 'LA',
};
const STATE_CANONICAL = Object.fromEntries(Object.entries(STATE_SHORTCODES).map(([canonical, short]) => [short, canonical]));
function formatNumber(value) {
    return value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}
function formatSigned(value) {
    if (value == null || !Number.isFinite(value))
        return '—';
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatNumber(Math.abs(value))}`;
}
function formatPercent(value) {
    return value == null || !Number.isFinite(value) ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}
function compactValue(value) {
    if (Math.abs(value) >= 1000000)
        return `${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 10000)
        return `${(value / 1000).toFixed(0)}k`;
    if (Math.abs(value) >= 1000)
        return `${(value / 1000).toFixed(1)}k`;
    return String(Math.round(value));
}
function stateClass(value) { return `gap-class-${value.replace('_', '-')}`; }
function metaLabel(meta) {
    if (!meta)
        return 'Provenance unavailable';
    if (meta.provenance === 'source_backed')
        return 'Source-backed';
    if (meta.provenance === 'derived')
        return 'Derived';
    if (meta.provenance === 'mixed')
        return 'Mixed provenance';
    return 'Illustrative demo data';
}
function safeError(error) {
    return error instanceof Error ? error.message : 'The request could not be completed.';
}
function dateLabel(value) {
    if (!value)
        return 'Update time not supplied';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}
function getRegionLabel(options, code) {
    return options?.regions.find((option) => option.code === code)?.label ?? (code || 'All India');
}
function DataBadge({ meta, stale = false }) {
    const label = stale ? 'Stale · previous result' : metaLabel(meta);
    const cls = stale ? 'stale' : meta?.provenance ?? 'unavailable';
    return (0, jsx_runtime_1.jsxs)("span", { className: `gap-provenance-badge ${cls}`, children: [(0, jsx_runtime_1.jsx)("i", { "aria-hidden": "true" }), label] });
}
function PanelState({ loading, error, stale, onRetry, children }) {
    if (loading && !stale)
        return (0, jsx_runtime_1.jsxs)("div", { className: "gap-state", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16, className: "spin-icon" }), " Loading analysis\u2026"] });
    if (error && !stale)
        return (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty gap-empty-error", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Could not load this section." }), (0, jsx_runtime_1.jsx)("p", { children: error }), (0, jsx_runtime_1.jsxs)("button", { className: "gap-inline-button", type: "button", onClick: onRetry, children: ["Retry ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] })] })] });
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [stale && (0, jsx_runtime_1.jsxs)("div", { className: "gap-stale-banner", role: "status", children: [error ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Showing the last successful result because refresh failed: ", error] }) : 'Updating this section; the previous successful result remains visible.', " ", (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onRetry, children: "Retry" })] }), children] });
}
function MetricCard({ title, value, subtitle, meta, kind, onOpen, loading }) {
    const Icon = kind === 'demand' ? lucide_react_1.Users : kind === 'supply' ? lucide_react_1.Factory : kind === 'gap' ? lucide_react_1.Activity : lucide_react_1.BarChart3;
    return (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `gap-kpi-card gap-kpi-${kind}`, onClick: onOpen, "aria-label": `Open ${title} details`, children: [(0, jsx_runtime_1.jsx)("span", { className: "gap-kpi-icon", children: (0, jsx_runtime_1.jsx)(Icon, { size: 22, strokeWidth: 2.2 }) }), (0, jsx_runtime_1.jsxs)("span", { className: "gap-kpi-main", children: [(0, jsx_runtime_1.jsx)("span", { className: "gap-kpi-label", children: title }), (0, jsx_runtime_1.jsx)("strong", { children: loading && value === '—' ? '…' : value }), (0, jsx_runtime_1.jsx)("span", { className: "gap-kpi-sub", children: subtitle })] }), (0, jsx_runtime_1.jsx)("span", { className: "gap-kpi-open", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14 }) }), meta?.provenance === 'mock' && (0, jsx_runtime_1.jsx)("span", { className: "gap-kpi-demo", children: "DEMO" })] });
}
function FilterToolbar({ options, draft, onDraftChange, onApply, onReset, disabled }) {
    const select = (key, optionsList) => ((0, jsx_runtime_1.jsxs)("label", { className: "gap-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: FILTER_LABELS[key] }), (0, jsx_runtime_1.jsx)("select", { value: draft[key], onChange: (event) => onDraftChange(key, event.target.value), disabled: disabled, children: optionsList.map((option) => (0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, `${key}-${option.value}`)) })] }, key));
    const geography = options.geographyLevels.length ? options.geographyLevels : [{ value: 'national', label: 'All India' }, { value: 'state', label: 'State / UT' }];
    const states = [{ value: '', label: 'All states / UTs' }, ...options.regions.filter((item) => item.level === 'state').map((item) => ({ value: item.code, label: item.label }))];
    const period = options.periods.length ? options.periods : [{ value: '', label: 'Periods unavailable' }];
    return (0, jsx_runtime_1.jsxs)("form", { className: "gap-filter-toolbar", onSubmit: onApply, "aria-label": "Skill gap analysis filters", children: [select('period', period), select('geographyLevel', geography), select('stateCode', states), select('sectorCode', options.sectors), select('ncoCode', options.occupations), select('skillCode', options.skills), (0, jsx_runtime_1.jsxs)("div", { className: "gap-filter-actions", children: [(0, jsx_runtime_1.jsxs)("button", { type: "submit", className: "gap-btn gap-btn-primary", disabled: disabled, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.SlidersHorizontal, { size: 15 }), " Apply filters"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-btn", onClick: onReset, disabled: disabled, "aria-label": "Reset filters", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15 }), (0, jsx_runtime_1.jsx)("span", { className: "gap-reset-label", children: "Reset" })] })] })] });
}
function GapLandscapeChart({ data, loading, error, stale, onRetry, onOpenPoint }) {
    const points = data?.points ?? [];
    const usable = points.filter((point) => point.demand != null && point.supply != null && point.gap != null && point.classification !== 'not_comparable' && point.classification !== 'no_data' && point.classification !== 'suppressed');
    const xScale = data?.xAxis.scale ?? 'linear';
    const yScale = data?.yAxis.scale ?? 'linear';
    const xValues = usable.map((point) => point.supply);
    const yValues = usable.map((point) => point.demand);
    const maxXValue = Math.max(1, ...xValues);
    const maxYValue = Math.max(1, ...yValues);
    const minXPositive = Math.min(...xValues.filter((value) => value > 0), Infinity);
    const minYPositive = Math.min(...yValues.filter((value) => value > 0), Infinity);
    const logInvalid = !!data && ((xScale === 'log' && xValues.some((value) => value <= 0)) || (yScale === 'log' && yValues.some((value) => value <= 0)));
    const parityAllowed = !!data?.parityLineEligible && data.xAxis.unit === data.yAxis.unit && xScale === yScale;
    const sharedMax = Math.max(maxXValue, maxYValue);
    const sharedMinPositive = Math.min(minXPositive, minYPositive);
    const xMin = parityAllowed ? (xScale === 'log' ? Math.log10(Math.max(1, sharedMinPositive)) : 0) : (xScale === 'log' ? Math.log10(Math.max(1, minXPositive)) : 0);
    const yMin = parityAllowed ? (yScale === 'log' ? Math.log10(Math.max(1, sharedMinPositive)) : 0) : (yScale === 'log' ? Math.log10(Math.max(1, minYPositive)) : 0);
    const xMax = parityAllowed ? (xScale === 'log' ? Math.log10(sharedMax) : sharedMax) : (xScale === 'log' ? Math.log10(maxXValue) : maxXValue);
    const yMax = parityAllowed ? (yScale === 'log' ? Math.log10(sharedMax) : sharedMax) : (yScale === 'log' ? Math.log10(maxYValue) : maxYValue);
    const transform = (value, scale) => scale === 'log' ? Math.log10(Math.max(1, value)) : value;
    const X = (value) => 52 + ((transform(value, xScale) - xMin) / Math.max(.0001, xMax - xMin)) * 390;
    const Y = (value) => 292 - ((transform(value, yScale) - yMin) / Math.max(.0001, yMax - yMin)) * 252;
    const makeTicks = (scale, values, useShared) => {
        if (!values.length)
            return [];
        if (scale === 'log') {
            const minimum = useShared ? sharedMinPositive : Math.min(...values.filter((value) => value > 0), 1);
            const maximum = useShared ? sharedMax : Math.max(...values);
            const start = Math.ceil(Math.log10(Math.max(1, minimum)));
            const end = Math.floor(Math.log10(Math.max(1, maximum)));
            const result = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => 10 ** (start + i));
            return result.length ? result.slice(0, 5) : [Math.max(1, minimum), Math.max(1, maximum)];
        }
        const maximum = useShared ? sharedMax : Math.max(1, ...values);
        return [0, .25, .5, .75, 1].map((step) => maximum * step);
    };
    const xTicks = makeTicks(xScale, xValues, parityAllowed);
    const yTicks = makeTicks(yScale, yValues, parityAllowed);
    const legend = data?.classifications.filter((item) => ['high_shortage', 'moderate_shortage', 'balanced', 'moderate_surplus', 'high_surplus', 'not_comparable', 'no_data', 'suppressed'].includes(item.key)) ?? [];
    return (0, jsx_runtime_1.jsxs)("section", { className: "gap-card gap-landscape-card", "aria-labelledby": "gap-landscape-title", "aria-busy": loading, children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: "gap-landscape-title", children: "Skill Gap Landscape" }), (0, jsx_runtime_1.jsx)("p", { children: "Demand (y) against supply (x) for compatible measures" })] }), (0, jsx_runtime_1.jsx)("span", { className: "gap-chart-mark", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { size: 19 }) })] }), (0, jsx_runtime_1.jsx)(PanelState, { loading: loading, error: error, stale: stale, onRetry: onRetry, children: !data || !usable.length ? (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.BarChart3, { size: 22 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "No comparable points for this filter." }), (0, jsx_runtime_1.jsx)("p", { children: "Choose another skill, occupation, or period to view the scatterplot." })] })] }) : logInvalid ? (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty gap-empty-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 18 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Invalid logarithmic scale payload." }), (0, jsx_runtime_1.jsx)("p", { children: "The API selected a log scale but returned zero or negative values. The chart is withheld instead of misrepresenting the data." })] })] }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-chart-scroll", children: (0, jsx_runtime_1.jsxs)("svg", { className: "gap-scatter", viewBox: "0 0 500 342", role: "img", "aria-label": `Skill gap scatter plot. Horizontal axis ${data.xAxis.label} in ${data.xAxis.unit}; vertical axis ${data.yAxis.label} in ${data.yAxis.unit}. Select a point for detail.`, children: [yTicks.map((tick) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: "52", x2: "458", y1: Y(tick), y2: Y(tick), className: "gap-grid-line" }), (0, jsx_runtime_1.jsx)("text", { x: "44", y: Y(tick) + 4, textAnchor: "end", className: "gap-axis-text", children: compactValue(tick) })] }, `y-grid-${tick}`)), xTicks.map((tick) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: X(tick), x2: X(tick), y1: "40", y2: "292", className: "gap-grid-line gap-grid-vertical" }), (0, jsx_runtime_1.jsx)("text", { x: X(tick), y: "311", textAnchor: "middle", className: "gap-axis-text", children: compactValue(tick) })] }, `x-grid-${tick}`)), parityAllowed && (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: X(xScale === 'log' ? sharedMinPositive : 0), y1: Y(yScale === 'log' ? sharedMinPositive : 0), x2: X(sharedMax), y2: Y(sharedMax), className: "gap-parity-line" }), (0, jsx_runtime_1.jsx)("text", { x: "450", y: "48", className: "gap-parity-label", textAnchor: "end", children: "Demand = supply" })] }), usable.map((point) => {
                                        const x = X(point.supply);
                                        const y = Y(point.demand);
                                        const cls = point.classification;
                                        return (0, jsx_runtime_1.jsxs)("g", { className: "gap-point-group", role: "button", tabIndex: 0, "aria-label": `${point.label}: demand ${formatNumber(point.demand)}, supply ${formatNumber(point.supply)}, gap ${formatSigned(point.gap)} ${point.unit}, ${CLASS_LABEL[cls]}`, onClick: () => onOpenPoint(point), onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onOpenPoint(point);
                                            } }, children: [cls === 'high_shortage' || cls === 'moderate_shortage' ? (0, jsx_runtime_1.jsx)("path", { d: `M ${x} ${y - 7} L ${x + 7} ${y + 6} L ${x - 7} ${y + 6} Z`, className: `gap-point ${stateClass(cls)}` }) : cls === 'high_surplus' || cls === 'moderate_surplus' ? (0, jsx_runtime_1.jsx)("rect", { x: x - 6, y: y - 6, width: "12", height: "12", rx: "1", className: `gap-point ${stateClass(cls)}` }) : (0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: "6", className: `gap-point ${stateClass(cls)}` }), (0, jsx_runtime_1.jsx)("title", { children: `${point.label} · Demand ${formatNumber(point.demand)} · Supply ${formatNumber(point.supply)} · Gap ${formatSigned(point.gap)} · ${point.unit} · ${metaLabel(point.meta)}` })] }, `${point.entityType}-${point.id}`);
                                    }), (0, jsx_runtime_1.jsxs)("text", { x: "255", y: "336", textAnchor: "middle", className: "gap-axis-title", children: [data.xAxis.label, " (", data.xAxis.unit, ")", xScale === 'log' ? ' · log scale' : ''] }), (0, jsx_runtime_1.jsxs)("text", { transform: "rotate(-90)", x: "-166", y: "15", textAnchor: "middle", className: "gap-axis-title", children: [data.yAxis.label, " (", data.yAxis.unit, ")", yScale === 'log' ? ' · log scale' : ''] })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "gap-legend", "aria-label": "Gap classification legend", children: legend.map((item) => (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: `gap-legend-dot ${stateClass(item.key)}` }), CLASS_SYMBOL[item.key], " ", item.label] }, item.key)) }), !parityAllowed && (0, jsx_runtime_1.jsxs)("p", { className: "gap-chart-note", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 14 }), " No parity line: the API has not confirmed that both axes share a compatible definition, scale and unit. ", data.parityLineReason ?? ''] }), (0, jsx_runtime_1.jsxs)("p", { className: "gap-chart-note", children: [parityAllowed ? 'Above the parity line, comparable demand exceeds supply; below it, supply exceeds demand.' : 'Axes are not confirmed comparable; use the returned gap and status fields rather than visual position to interpret shortage or surplus.', " Shape and label supplement colour. Select a point or open the table alternative below."] }), (0, jsx_runtime_1.jsxs)("details", { className: "gap-chart-table-alt", children: [(0, jsx_runtime_1.jsxs)("summary", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Table2, { size: 14 }), " View chart data as an accessible table"] }), (0, jsx_runtime_1.jsx)("div", { className: "gap-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Entity" }), (0, jsx_runtime_1.jsx)("th", { children: "Demand" }), (0, jsx_runtime_1.jsx)("th", { children: "Supply" }), (0, jsx_runtime_1.jsx)("th", { children: "Gap" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" }), (0, jsx_runtime_1.jsx)("th", { children: "Provenance" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: usable.map((point) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("button", { className: "gap-text-link", type: "button", onClick: () => onOpenPoint(point), children: point.label }) }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(point.demand) }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(point.supply) }), (0, jsx_runtime_1.jsx)("td", { children: formatSigned(point.gap) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `gap-status ${stateClass(point.classification)}`, children: CLASS_LABEL[point.classification] }) }), (0, jsx_runtime_1.jsx)("td", { children: metaLabel(point.meta) })] }, point.id)) })] }) })] })] }) }), data?.meta && (0, jsx_runtime_1.jsxs)("footer", { className: "gap-panel-meta", children: [(0, jsx_runtime_1.jsx)(DataBadge, { meta: data.meta }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.period }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.unit })] })] });
}
function collectGeoRings(value, rings = []) {
    if (!Array.isArray(value) || value.length === 0)
        return rings;
    const first = value[0];
    if (Array.isArray(first) && typeof first[0] === 'number' && typeof first[1] === 'number') {
        rings.push(value.filter((point) => Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number'));
        return rings;
    }
    for (const child of value)
        collectGeoRings(child, rings);
    return rings;
}
function VerifiedRegionalMap({ geometry, geometryUnavailableReason, rows, metric, onSelectRegion }) {
    const [collection, setCollection] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const geometryReady = !!geometry && !!geometry.assetUrl && !!geometry.assetId && !!geometry.version && !!geometry.source && !!geometry.licence && !!geometry.codeProperty && !!geometry.codeCrosswalkVersion;
    (0, react_1.useEffect)(() => {
        setCollection(null);
        setError('');
        if (!geometryReady || !geometry?.assetUrl) {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        let assetUrl;
        try {
            assetUrl = new URL(geometry.assetUrl, window.location.href);
        }
        catch {
            setLoading(false);
            setError('The configured geometry URL is invalid.');
            return;
        }
        if (!['http:', 'https:'].includes(assetUrl.protocol)) {
            setLoading(false);
            setError('The geometry URL must use HTTP or HTTPS.');
            return;
        }
        fetch(assetUrl.toString(), { signal: controller.signal, credentials: assetUrl.origin === window.location.origin ? 'same-origin' : 'omit', headers: { Accept: 'application/geo+json, application/json' } })
            .then(async (response) => {
            if (!response.ok)
                throw new Error(`Geometry asset request failed (${response.status}).`);
            const json = await response.json();
            if (json.type !== 'FeatureCollection' || !Array.isArray(json.features))
                throw new Error('The geometry asset is not a GeoJSON FeatureCollection.');
            const valid = json.features.filter((feature) => ['Polygon', 'MultiPolygon'].includes(feature.geometry?.type ?? '') && collectGeoRings(feature.geometry?.coordinates).some((ring) => ring.length >= 3));
            if (!valid.length)
                throw new Error('The GeoJSON asset contains no usable Polygon or MultiPolygon features.');
            if (!controller.signal.aborted)
                setCollection({ ...json, features: valid });
        })
            .catch((reason) => { if (!controller.signal.aborted)
            setError(safeError(reason)); })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [geometryReady, geometry?.assetUrl, geometry?.assetId, geometry?.version, geometry?.source, geometry?.licence, geometry?.codeProperty, geometry?.codeCrosswalkVersion]);
    const mapModel = buildMapModel(collection, geometry?.codeProperty ?? '', rows);
    if (!geometryReady)
        return (0, jsx_runtime_1.jsxs)("div", { className: "gap-map-unavailable", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MapPin, { size: 23 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Verified map geometry unavailable" }), (0, jsx_runtime_1.jsxs)("p", { children: [geometryUnavailableReason ?? 'No versioned GeoJSON asset with source, licence, canonical-code property and crosswalk version has been configured.', " The decorative PNG is deliberately not used as data geography."] })] })] });
    if (loading)
        return (0, jsx_runtime_1.jsxs)("div", { className: "gap-map-unavailable", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 20, className: "spin-icon" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Loading licensed State / UT geometry" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Geometry ", geometry?.assetId, " \u00B7 version ", geometry?.version] })] })] });
    if (error || !collection || !mapModel)
        return (0, jsx_runtime_1.jsxs)("div", { className: "gap-map-unavailable", role: error ? 'alert' : 'status', children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MapPin, { size: 23 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Regional map could not be rendered" }), (0, jsx_runtime_1.jsx)("p", { children: error || 'No renderable feature geometry was returned.' }), (0, jsx_runtime_1.jsxs)("p", { children: ["Asset: ", geometry?.source, " \u00B7 Licence: ", geometry?.licence, " \u00B7 Crosswalk: ", geometry?.codeCrosswalkVersion] })] })] });
    const { features, bounds } = mapModel;
    const codeKey = geometry?.codeProperty ?? '';
    const metricValue = (row) => metric === 'demand' ? row.demand : metric === 'supply' ? row.supply : metric === 'gap_percent' ? row.gapPercent ?? null : row.gap;
    const mapped = new Map(rows.map((row) => [row.regionCode, row]));
    const width = 320;
    const height = 330;
    const pad = 8;
    const lonScale = Math.cos(((bounds.minY + bounds.maxY) / 2) * Math.PI / 180);
    const spanX = Math.max(.0001, (bounds.maxX - bounds.minX) * Math.max(.2, lonScale));
    const spanY = Math.max(.0001, bounds.maxY - bounds.minY);
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    const drawWidth = spanX * scale;
    const drawHeight = spanY * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;
    const project = ([lon, lat]) => [offsetX + ((lon - bounds.minX) * Math.max(.2, lonScale) * scale), offsetY + ((bounds.maxY - lat) * scale)];
    const valueLabel = (value) => value == null ? 'No value' : metric === 'gap_percent' ? formatPercent(value) : metric === 'gap_absolute' ? formatSigned(value) : formatNumber(value);
    return (0, jsx_runtime_1.jsxs)("div", { className: "gap-verified-map-wrap", children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-verified-map-scroll", children: (0, jsx_runtime_1.jsxs)("svg", { className: "gap-verified-map", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `State and Union Territory map colored by ${metric}; features joined to regional observations using canonical property ${codeKey}. Select a region to apply the filter.`, children: [(0, jsx_runtime_1.jsx)("title", { children: `Verified regional geometry · ${geometry?.source} · ${geometry?.version}` }), features.map(({ feature, code, row }) => {
                            const rings = collectGeoRings(feature.geometry?.coordinates);
                            const path = rings.map((ring) => ring.map((position, index) => { const [x, y] = project(position); return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`; }).join(' ') + ' Z').join(' ');
                            const label = row ? `${row.regionName}: ${metric} ${valueLabel(metricValue(row))}; demand ${formatNumber(row.demand)}; supply ${formatNumber(row.supply)}; gap ${formatSigned(row.gap)}; ${CLASS_LABEL[row.classification]}; ${metaLabel(row.meta)}` : `${code}: no regional observation returned`;
                            const missing = !row || metricValue(row) == null || row.classification === 'no_data' || row.classification === 'suppressed';
                            return (0, jsx_runtime_1.jsx)("path", { d: path, className: `gap-map-feature ${missing ? 'gap-map-feature-missing' : stateClass(row.classification)}`, fillRule: "evenodd", tabIndex: 0, role: "button", "aria-label": `${label}. Activate to select this State / UT.`, onClick: () => { if (code)
                                    onSelectRegion(code); }, onKeyDown: (event) => { if ((event.key === 'Enter' || event.key === ' ') && code) {
                                    event.preventDefault();
                                    onSelectRegion(code);
                                } }, children: (0, jsx_runtime_1.jsx)("title", { children: label }) }, code || path.slice(0, 32));
                        })] }) }), (0, jsx_runtime_1.jsxs)("p", { className: "gap-map-source", children: [geometry?.source, " \u00B7 ", geometry?.licence, " \u00B7 Geometry ", geometry?.assetId, " v", geometry?.version, " \u00B7 code crosswalk ", geometry?.codeCrosswalkVersion] }), (0, jsx_runtime_1.jsx)("p", { className: "gap-panel-footnote", children: "Regions with no returned value remain neutral. Select a polygon to apply its canonical State / UT filter." })] });
}
function buildMapModel(collection, codeProperty, rows) {
    if (!collection || !codeProperty)
        return null;
    const features = (collection.features ?? []).map((feature) => ({ feature, code: String(feature.properties?.[codeProperty] ?? ''), row: rows.find((item) => item.regionCode === String(feature.properties?.[codeProperty] ?? '')) ?? null }));
    const positions = features.flatMap(({ feature }) => collectGeoRings(feature.geometry?.coordinates).flat());
    if (!positions.length)
        return null;
    return { features, bounds: { minX: Math.min(...positions.map((position) => position[0])), maxX: Math.max(...positions.map((position) => position[0])), minY: Math.min(...positions.map((position) => position[1])), maxY: Math.max(...positions.map((position) => position[1])) } };
}
function RegionalGapPanel({ data, loading, error, stale, metric, onMetricChange, onRetry, onSelectRegion, onOpenRegion }) {
    const rows = data?.regions ?? [];
    const valueOf = (region) => metric === 'demand' ? region.demand : metric === 'supply' ? region.supply : metric === 'gap_percent' ? region.gapPercent ?? null : region.gap;
    const validValues = rows.map(valueOf).filter((value) => value != null && Number.isFinite(value));
    const maximum = Math.max(1, ...validValues.map((value) => Math.abs(value)));
    const sorted = [...rows].sort((a, b) => (valueOf(b) ?? -Infinity) - (valueOf(a) ?? -Infinity));
    return (0, jsx_runtime_1.jsxs)("section", { className: "gap-card gap-region-card", "aria-labelledby": "gap-regions-title", "aria-busy": loading, children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: "gap-regions-title", children: "Skill Gap by State / UT" }), (0, jsx_runtime_1.jsx)("p", { children: "Regional rankings use canonical codes" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "gap-metric-select", children: [(0, jsx_runtime_1.jsx)("span", { className: "sr-only", children: "Regional metric" }), (0, jsx_runtime_1.jsxs)("select", { value: metric, onChange: (event) => onMetric(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "gap_absolute", children: "Gap (absolute)" }), (0, jsx_runtime_1.jsx)("option", { value: "gap_percent", children: "Gap % of demand" }), (0, jsx_runtime_1.jsx)("option", { value: "demand", children: "Demand" }), (0, jsx_runtime_1.jsx)("option", { value: "supply", children: "Supply" })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 13 })] })] }), (0, jsx_runtime_1.jsxs)(PanelState, { loading: loading, error: error, stale: stale, onRetry: onRetry, children: [data ? (0, jsx_runtime_1.jsx)(VerifiedRegionalMap, { geometry: data.geometry, geometryUnavailableReason: data.geometryUnavailableReason, rows: rows, metric: metric, onSelectRegion: onSelectRegion }) : (0, jsx_runtime_1.jsxs)("div", { className: "gap-map-unavailable", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MapPin, { size: 23 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Regional geometry unavailable" }), (0, jsx_runtime_1.jsx)("p", { children: "Geometry metadata has not been returned by the data service." })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "gap-map-legend", children: (data?.scale ?? []).filter((item) => ['high_shortage', 'moderate_shortage', 'balanced', 'moderate_surplus', 'high_surplus', 'no_data', 'suppressed'].includes(item.key)).map((item) => (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: `gap-legend-dot ${stateClass(item.key)}` }), item.label] }, item.key)) }), (0, jsx_runtime_1.jsx)("div", { className: "gap-region-list", "aria-label": "Regional ranking list", children: sorted.map((region) => {
                            const val = valueOf(region);
                            const isGapMetric = metric === 'gap_absolute' || metric === 'gap_percent';
                            const barWidth = val == null ? 0 : Math.max(1, Math.min(isGapMetric ? 50 : 100, Math.abs(val) / maximum * (isGapMetric ? 50 : 100)));
                            const barStyle = val == null ? { left: '0%', width: '100%' } : isGapMetric ? val >= 0 ? { left: '50%', width: `${barWidth}%` } : { right: '50%', width: `${barWidth}%` } : { left: '0%', width: `${barWidth}%` };
                            const gapVal = metric === 'gap_percent' ? formatPercent(val) : metric === 'gap_absolute' ? formatSigned(val) : formatNumber(val);
                            return (0, jsx_runtime_1.jsxs)("div", { className: `gap-region-row ${region.classification === 'no_data' || region.classification === 'suppressed' ? 'no-region-data' : ''}`, children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-region-name", onClick: () => onSelectRegion(region.regionCode), "aria-label": `Apply State / UT filter: ${region.regionName}`, children: [(0, jsx_runtime_1.jsx)("span", { children: region.regionName }), (0, jsx_runtime_1.jsx)("small", { children: region.regionCode })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-region-bar-button", onClick: () => region.gap != null || region.demand != null ? onOpenRegion(region) : undefined, disabled: region.gap == null && region.demand == null, "aria-label": `${region.regionName}, ${gapVal}; open details`, children: [(0, jsx_runtime_1.jsx)("span", { className: "gap-region-track", children: (0, jsx_runtime_1.jsx)("i", { className: `gap-region-fill ${stateClass(region.classification)}`, style: barStyle }) }), (0, jsx_runtime_1.jsx)("strong", { children: gapVal })] })] }, region.regionCode);
                        }) }), rows.length === 0 && (0, jsx_runtime_1.jsx)("div", { className: "gap-empty", children: (0, jsx_runtime_1.jsx)("strong", { children: "No regional values returned for these filters." }) }), (0, jsx_runtime_1.jsx)("p", { className: "gap-panel-footnote", children: "Selecting a region applies the State / UT filter and reloads related panels. Missing or suppressed values remain neutral, not \u201Clow gap\u201D." })] }), data?.meta && (0, jsx_runtime_1.jsxs)("footer", { className: "gap-panel-meta", children: [(0, jsx_runtime_1.jsx)(DataBadge, { meta: data.meta }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.coverage?.summary ?? 'Coverage details unavailable' })] })] });
}
function InsightRail({ data, loading, error, stale, onRetry, onOpen }) {
    return (0, jsx_runtime_1.jsxs)("aside", { className: "gap-card gap-insights", "aria-labelledby": "gap-insights-title", "aria-busy": loading, children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-insights-heading", children: [(0, jsx_runtime_1.jsx)("span", { className: "gap-insights-kicker", children: "EVIDENCE FIRST" }), (0, jsx_runtime_1.jsx)("h2", { id: "gap-insights-title", children: "Key Insights" }), (0, jsx_runtime_1.jsx)("p", { children: "Up to four findings tied to the active filter snapshot." })] }), (0, jsx_runtime_1.jsx)(PanelState, { loading: loading, error: error, stale: stale, onRetry: onRetry, children: data?.length ? (0, jsx_runtime_1.jsx)("div", { className: "gap-insight-list", children: data.slice(0, 4).map((insight, index) => (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-insight-item", onClick: () => onOpen(insight), children: [(0, jsx_runtime_1.jsx)("span", { className: "gap-insight-number", children: String(index + 1).padStart(2, '0') }), (0, jsx_runtime_1.jsx)("span", { className: `gap-insight-icon importance-${insight.importance ?? 'info'}`, children: insight.importance === 'priority' ? (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowUpRight, { size: 18 }) : insight.importance === 'watch' ? (0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { size: 18 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 18 }) }), (0, jsx_runtime_1.jsxs)("span", { className: "gap-insight-copy", children: [(0, jsx_runtime_1.jsx)("strong", { children: insight.title }), (0, jsx_runtime_1.jsx)("span", { children: insight.summary }), (0, jsx_runtime_1.jsx)("small", { children: insight.generatedBy === 'mock' ? 'Illustrative rule · not AI generated' : insight.generatedBy === 'ai_grounded' ? 'AI grounded in returned evidence' : 'Rule engine finding' }), insight.claims?.[0] && (0, jsx_runtime_1.jsxs)("small", { className: "gap-insight-evidence", children: ["Evidence: ", insight.claims[0].metricId, insight.claims[0].value != null ? ` · ${formatNumber(insight.claims[0].value)}${insight.claims[0].unit ? ` ${insight.claims[0].unit}` : ''}` : '', insight.claims[0].sourceIds?.length ? ` · ${insight.claims[0].sourceIds.slice(0, 2).join(', ')}` : ''] })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14, className: "gap-insight-arrow" })] }, insight.id)) }) : (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CircleHelp, { size: 20 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "No insights returned" }), (0, jsx_runtime_1.jsx)("p", { children: "The current filter snapshot does not include evidence-linked findings." })] })] }) }), data?.length ? (0, jsx_runtime_1.jsx)("p", { className: "gap-insight-note", children: "Every statement should be traceable to a returned metric or source. Mock findings are explicitly labelled." }) : null] });
}
function MiniTrend({ item }) {
    const values = item.trend?.map((point) => point.gap).filter((value) => value != null) ?? [];
    if (values.length < 2)
        return (0, jsx_runtime_1.jsx)("span", { className: "gap-trend-na", children: "n/a" });
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const points = values.map((value, index) => `${index * 28},${17 - ((value - min) / span) * 13}`).join(' ');
    return (0, jsx_runtime_1.jsx)("svg", { className: "gap-mini-trend", viewBox: "0 0 84 20", role: "img", "aria-label": `Trend across ${values.length} returned points; latest gap ${formatSigned(values[values.length - 1])} ${item.unit}`, children: (0, jsx_runtime_1.jsx)("polyline", { points: points, fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", strokeLinejoin: "round" }) });
}
function RankedSkillsTable({ data, loading, error, stale, sort, direction, page, pageSize, onSort, onPage, onRetry, onOpenRow, onViewAll }) {
    const total = data?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const headings = [{ key: 'rank', label: '#' }, { key: 'skillLabel', label: 'Skill' }, { key: 'demand', label: 'Demand' }, { key: 'supply', label: 'Supply' }, { key: 'gap', label: 'Gap' }, { key: 'gapPercent', label: 'Gap %' }];
    return (0, jsx_runtime_1.jsxs)("section", { className: "gap-card gap-skills-table", "aria-labelledby": "gap-top-skills-title", "aria-busy": loading, children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: "gap-top-skills-title", children: page === 0 && pageSize === 5 ? 'Top Skills by Gap' : 'Skills by Gap' }), (0, jsx_runtime_1.jsx)("p", { children: "Compatible demand and supply values only \u00B7 select a row for evidence" })] }), (0, jsx_runtime_1.jsxs)("button", { className: "gap-btn gap-btn-small", type: "button", onClick: onViewAll, children: ["View all skills ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] })] }), (0, jsx_runtime_1.jsx)(PanelState, { loading: loading, error: error, stale: stale, onRetry: onRetry, children: data?.items.length ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "gap-data-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [headings.map((heading) => (0, jsx_runtime_1.jsx)("th", { "aria-sort": sort === heading.key ? (direction === 'asc' ? 'ascending' : 'descending') : 'none', children: (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSort(heading.key), children: [heading.label, sort === heading.key ? (direction === 'asc' ? ' ▲' : ' ▼') : ''] }) }, heading.key)), (0, jsx_runtime_1.jsx)("th", { children: "Trend" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: data.items.map((item) => (0, jsx_runtime_1.jsxs)("tr", { tabIndex: 0, onClick: () => onOpenRow(item), onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                onOpenRow(item);
                                            } }, "aria-label": `Open ${item.skillLabel} detail`, children: [(0, jsx_runtime_1.jsx)("td", { children: item.rank }), (0, jsx_runtime_1.jsxs)("td", { className: "gap-table-skill", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "gap-text-link", onClick: (event) => { event.stopPropagation(); onOpenRow(item); }, children: item.skillLabel }), (0, jsx_runtime_1.jsx)("small", { children: item.skillCode })] }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(item.demand) }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(item.supply) }), (0, jsx_runtime_1.jsx)("td", { className: item.gap == null ? '' : item.gap > 0 ? 'gap-positive' : item.gap < 0 ? 'gap-negative' : '', children: formatSigned(item.gap) }), (0, jsx_runtime_1.jsx)("td", { children: formatPercent(item.gapPercent) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(MiniTrend, { item: item }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("span", { className: `gap-status ${stateClass(item.gapClass)}`, children: [CLASS_SYMBOL[item.gapClass], " ", CLASS_LABEL[item.gapClass]] }) })] }, item.skillId)) })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-table-pagination", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Showing ", Math.min(total, page * pageSize + 1), "\u2013", Math.min(total, page * pageSize + data.items.length), " of ", total, " skills \u00B7 Taxonomy ", data.skillTaxonomyVersion] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-btn gap-btn-small", onClick: () => onPage(-1), disabled: page <= 0, "aria-label": "Previous table page", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { size: 15 }), " Previous"] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", page + 1, " / ", pages] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-btn gap-btn-small", onClick: () => onPage(1), disabled: page >= pages - 1, "aria-label": "Next table page", children: ["Next ", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 15 })] })] })] })] }) : (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Table2, { size: 20 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "No skills match these filters." }), (0, jsx_runtime_1.jsx)("p", { children: "Reset or widen the filters to see more records." })] })] }) }), data?.meta && (0, jsx_runtime_1.jsxs)("footer", { className: "gap-panel-meta", children: [(0, jsx_runtime_1.jsx)(DataBadge, { meta: data.meta }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.period }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.unit })] })] });
}
function SectorPanel({ filters, data, loading, error, stale, onRetry, onViewSectors, viewingSectors = false }) {
    const nodes = data?.nodes ?? [];
    const links = data?.links ?? [];
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const units = [...nodes.map((node) => node.unit), ...links.map((link) => link.unit)];
    const compatible = new Set(units).size <= 1 && links.every((link) => nodesById.has(link.source) && nodesById.has(link.target) && nodesById.get(link.source)?.unit === link.unit && nodesById.get(link.target)?.unit === link.unit);
    const valid = !!data?.available && nodes.length > 0 && links.length > 0 && nodes.every((node) => Number.isFinite(node.total) && node.total >= 0 && !!node.unit) && links.every((link) => Number.isFinite(link.value) && link.value >= 0 && !!link.unit && link.source !== link.target);
    const hasIncoming = (id) => links.some((link) => link.target === id);
    const hasOutgoing = (id) => links.some((link) => link.source === id);
    const sourceNodes = nodes.filter((node) => !hasIncoming(node.id) && hasOutgoing(node.id));
    const targetNodes = nodes.filter((node) => hasIncoming(node.id) && !hasOutgoing(node.id));
    const middleNodes = nodes.filter((node) => hasIncoming(node.id) && hasOutgoing(node.id));
    const columns = [sourceNodes, middleNodes, targetNodes];
    const maxNodes = Math.max(1, ...columns.map((group) => group.length));
    const svgHeight = Math.max(150, maxNodes * 58 + 20);
    const nodeWidth = 154;
    const nodeHeight = 40;
    const xs = [8, 222, 436];
    const positions = new Map();
    columns.forEach((group, column) => group.forEach((node, index) => positions.set(node.id, { x: xs[column], y: 10 + index * (svgHeight - 20 - nodeHeight) / Math.max(1, group.length - 1), w: nodeWidth, h: nodeHeight })));
    const maxLink = Math.max(1, ...links.map((link) => link.value));
    const invalidNodes = nodes.filter((node) => !positions.has(node.id));
    return (0, jsx_runtime_1.jsxs)("section", { className: "gap-card gap-flow-card", "aria-labelledby": "gap-flow-title", "aria-busy": loading, children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { id: "gap-flow-title", children: "Supply\u2013Demand Flow" }), (0, jsx_runtime_1.jsx)("p", { children: filters?.sectorCode ? 'Selected sector' : 'Selected sector · choose a sector to scope the analysis' })] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-btn gap-btn-small", onClick: onViewSectors, children: [viewingSectors ? 'Back to overview' : 'View sectors', " ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] })] }), loading && !data ? (0, jsx_runtime_1.jsxs)("div", { className: "gap-state", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16, className: "spin-icon" }), " Checking for measured flow data\u2026"] }) : error && !stale ? (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty gap-empty-error", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Flow data could not be loaded." }), (0, jsx_runtime_1.jsx)("p", { children: error }), (0, jsx_runtime_1.jsxs)("button", { className: "gap-inline-button", type: "button", onClick: onRetry, children: ["Retry ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] })] })] }) : valid && compatible && !invalidNodes.length ? (0, jsx_runtime_1.jsxs)("div", { className: "gap-flow-visual", "aria-label": data?.flowDefinition ?? 'Measured sector flow', children: [(0, jsx_runtime_1.jsx)("p", { className: "gap-flow-definition", children: data?.flowDefinition }), (0, jsx_runtime_1.jsx)("div", { className: "gap-flow-svg-scroll", children: (0, jsx_runtime_1.jsxs)("svg", { className: "gap-flow-svg", viewBox: `0 0 600 ${svgHeight}`, role: "img", "aria-label": `Measured flow diagram with ${links.length} links. Link width is proportional to its reported value. Unit: ${units[0] ?? 'not supplied'}.`, children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("marker", { id: "gap-flow-arrow", markerWidth: "5", markerHeight: "5", refX: "4", refY: "2.5", orient: "auto", children: (0, jsx_runtime_1.jsx)("path", { d: "M0,0 L5,2.5 L0,5 z", fill: "#20A89C" }) }) }), links.map((link, index) => { const from = positions.get(link.source); const to = positions.get(link.target); if (!from || !to)
                                    return null; const x1 = from.x + from.w; const y1 = from.y + from.h / 2; const x2 = to.x; const y2 = to.y + to.h / 2; const bend = Math.max(18, (x2 - x1) * .45); return (0, jsx_runtime_1.jsx)("path", { d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2 - 3} ${y2}`, className: "gap-flow-link", strokeWidth: Math.max(1.8, Math.sqrt(link.value / maxLink) * 12), markerEnd: "url(#gap-flow-arrow)", children: (0, jsx_runtime_1.jsx)("title", { children: `${nodesById.get(link.source)?.label ?? link.source} to ${nodesById.get(link.target)?.label ?? link.target}: ${formatNumber(link.value)} ${link.unit}; sources ${link.sourceIds.join(', ')}` }) }, `${link.source}-${link.target}-${index}`); }), columns.flatMap((group) => group.map((node) => { const pos = positions.get(node.id); const groupClass = `group-${node.group.replace(/[^a-z0-9-]/gi, '-')}`; const shortLabel = node.label.length > 23 ? `${node.label.slice(0, 21)}…` : node.label; return (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("title", { children: `${node.label}: ${formatNumber(node.total)} ${node.unit}; group ${node.group}` }), (0, jsx_runtime_1.jsx)("rect", { className: `gap-flow-node-box ${groupClass}`, x: pos.x, y: pos.y, width: pos.w, height: pos.h, rx: "3" }), (0, jsx_runtime_1.jsx)("text", { x: pos.x + 7, y: pos.y + 16, children: shortLabel }), (0, jsx_runtime_1.jsxs)("text", { x: pos.x + 7, y: pos.y + 30, className: "flow-total", children: [formatNumber(node.total), " ", node.unit] })] }, node.id); }))] }) }), data?.conservationRule && (0, jsx_runtime_1.jsxs)("p", { className: "gap-flow-definition", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Conservation rule:" }), " ", data.conservationRule] }), (0, jsx_runtime_1.jsx)("div", { className: "gap-flow-link-list", role: "list", "aria-label": "Flow link values", children: links.map((link, index) => (0, jsx_runtime_1.jsxs)("div", { role: "listitem", children: [(0, jsx_runtime_1.jsxs)("span", { children: [nodesById.get(link.source)?.label ?? link.source, " \u2192 ", nodesById.get(link.target)?.label ?? link.target] }), (0, jsx_runtime_1.jsxs)("strong", { children: [formatNumber(link.value), " ", link.unit] })] }, `${link.source}-${link.target}-${index}`)) })] }) : (0, jsx_runtime_1.jsxs)("div", { className: "gap-flow-unavailable", children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-flow-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Factory, { size: 23 }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: data?.unavailableReason ? 'Flow not available for this data snapshot' : 'Measured flow evidence not supplied' }), (0, jsx_runtime_1.jsx)("p", { children: !compatible ? 'The returned flow links and node quantities have incompatible units or reference missing nodes, so the diagram is withheld.' : data?.unavailableReason ?? 'A Sankey/flow diagram is shown only when the API supplies defined nodes and links with compatible units. No relationship is inferred from gap totals.' }), (0, jsx_runtime_1.jsxs)("span", { className: "gap-flow-tag", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 12 }), " No synthetic flow drawn"] })] })] }), data?.meta && (0, jsx_runtime_1.jsxs)("footer", { className: "gap-panel-meta", children: [(0, jsx_runtime_1.jsx)(DataBadge, { meta: data.meta, stale: stale }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.period }), (0, jsx_runtime_1.jsx)("span", { children: data.meta.unit })] })] });
}
function DataProvenanceStrip({ meta, loading, errors, onRefresh, refreshing }) {
    return (0, jsx_runtime_1.jsxs)("footer", { className: "gap-method-note", children: [(0, jsx_runtime_1.jsx)("span", { className: "gap-method-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 15 }) }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-method-copy", children: [(0, jsx_runtime_1.jsx)("strong", { children: meta?.provenance === 'source_backed' ? 'Data and method notes' : 'Prototype preview / method notes' }), (0, jsx_runtime_1.jsx)("p", { children: "Gap = demand \u2212 supply only where period, geography, unit and entity definition are compatible. Positive means potential shortage; negative means potential surplus. Gap percentage uses the backend-provided denominator/formula and is shown as n/a when unavailable. A period estimate is not a forecast." }), (0, jsx_runtime_1.jsx)("p", { children: meta?.notes?.join(' ') ?? 'Metadata and coverage notes have not been returned.' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-method-status", children: [(0, jsx_runtime_1.jsx)(DataBadge, { meta: meta }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 13 }), meta?.sourceLabel ?? 'Source label unavailable'] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { size: 13 }), meta?.coverage?.summary ?? 'Coverage not supplied'] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 13 }), loading ? 'Updating' : meta?.updatedAt ? `Updated ${dateLabel(meta.updatedAt)}` : 'Update time not supplied'] }), errors > 0 && (0, jsx_runtime_1.jsxs)("span", { className: "gap-method-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 13 }), errors, " section(s) need attention"] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "gap-btn gap-btn-small", onClick: onRefresh, disabled: refreshing, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 13, className: refreshing ? 'spin-icon' : '' }), " Refresh data"] })] })] });
}
function SkillGapAnalysisPage({ globalRegionCode, onGlobalRegionChange, onOpenDetail, onDetailError, adapter: injectedAdapter, }) {
    const [defaultAdapter] = (0, react_1.useState)(() => (0, adapter_1.createSkillGapDataAdapter)());
    const adapter = injectedAdapter ?? defaultAdapter;
    const [filterOptions, setFilterOptions] = (0, react_1.useState)(null);
    const [optionsLoading, setOptionsLoading] = (0, react_1.useState)(true);
    const [optionsError, setOptionsError] = (0, react_1.useState)('');
    const [draft, setDraft] = (0, react_1.useState)(null);
    const [applied, setApplied] = (0, react_1.useState)(null);
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const [regionalMetric, setRegionalMetric] = (0, react_1.useState)('gap_absolute');
    const [sort, setSort] = (0, react_1.useState)('gap');
    const [direction, setDirection] = (0, react_1.useState)('desc');
    const [page, setPage] = (0, react_1.useState)(0);
    const [pageSize, setPageSize] = (0, react_1.useState)(5);
    const [refreshCount, setRefreshCount] = (0, react_1.useState)(0);
    const [optionsRefresh, setOptionsRefresh] = (0, react_1.useState)(0);
    const [overviewState, setOverviewState] = (0, react_1.useState)(blankResource);
    const [landscapeState, setLandscapeState] = (0, react_1.useState)(blankResource);
    const [regionsState, setRegionsState] = (0, react_1.useState)(blankResource);
    const [skillsState, setSkillsState] = (0, react_1.useState)(blankResource);
    const [insightsState, setInsightsState] = (0, react_1.useState)(blankResource);
    const [flowState, setFlowState] = (0, react_1.useState)(blankResource);
    const lastGlobalRegion = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        setOptionsLoading(true);
        setOptionsError('');
        adapter.getFilterOptions(controller.signal).then((options) => {
            if (controller.signal.aborted)
                return;
            setFilterOptions(options);
            setDraft((current) => current ?? { ...options.defaults });
            setApplied((current) => current ?? { ...options.defaults });
        }).catch((error) => {
            if (!controller.signal.aborted)
                setOptionsError(safeError(error));
        }).finally(() => { if (!controller.signal.aborted)
            setOptionsLoading(false); });
        return () => controller.abort();
    }, [adapter, optionsRefresh]);
    (0, react_1.useEffect)(() => {
        if (!filterOptions || !applied || lastGlobalRegion.current === globalRegionCode)
            return;
        lastGlobalRegion.current = globalRegionCode;
        const canonical = STATE_CANONICAL[globalRegionCode];
        const next = canonical
            ? { ...applied, geographyLevel: 'state', stateCode: canonical, regionCode: canonical }
            : globalRegionCode === 'IN'
                ? { ...applied, geographyLevel: 'national', stateCode: '', regionCode: 'IN' }
                : { ...applied, regionCode: globalRegionCode };
        setDraft(next);
        setApplied(next);
        setPage(0);
    }, [filterOptions, globalRegionCode, applied]);
    const startPanel = (0, react_1.useCallback)((setter) => {
        setter((previous) => ({ ...previous, loading: true, error: '', stale: Boolean(previous.data) }));
    }, []);
    const settlePanel = (0, react_1.useCallback)(async (setter, request, signal) => {
        try {
            const result = await request;
            if (!signal.aborted)
                setter({ data: result, loading: false, error: '', stale: false });
        }
        catch (reason) {
            if (!signal.aborted)
                setter((previous) => ({ ...previous, loading: false, error: safeError(reason), stale: Boolean(previous.data) }));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        if (!applied)
            return;
        const controller = new AbortController();
        startPanel(setOverviewState);
        startPanel(setLandscapeState);
        startPanel(setRegionsState);
        startPanel(setInsightsState);
        startPanel(setFlowState);
        const requests = [
            settlePanel(setOverviewState, adapter.getOverview(applied, controller.signal), controller.signal),
            settlePanel(setLandscapeState, adapter.getGapLandscape(applied, controller.signal), controller.signal),
            settlePanel(setRegionsState, adapter.getRegionalGaps(applied, regionalMetric, controller.signal), controller.signal),
            settlePanel(setInsightsState, adapter.getSkillGapInsights(applied, controller.signal), controller.signal),
            settlePanel(setFlowState, adapter.getSectorFlow(applied, applied.sectorCode, controller.signal), controller.signal),
        ];
        void Promise.all(requests);
        return () => controller.abort();
    }, [adapter, applied, regionalMetric, refreshCount, settlePanel, startPanel]);
    (0, react_1.useEffect)(() => {
        if (!applied)
            return;
        const controller = new AbortController();
        startPanel(setSkillsState);
        const query = { sort, direction, page, pageSize };
        void settlePanel(setSkillsState, adapter.getRankedSkills(applied, query, controller.signal), controller.signal);
        return () => controller.abort();
    }, [adapter, applied, sort, direction, page, pageSize, refreshCount, settlePanel, startPanel]);
    const updateDraft = (0, react_1.useCallback)((key, value) => {
        setDraft((previous) => {
            if (!previous)
                return previous;
            if (key === 'geographyLevel')
                return value === 'national'
                    ? { ...previous, geographyLevel: value, stateCode: '', regionCode: 'IN' }
                    : { ...previous, geographyLevel: value, regionCode: previous.stateCode || 'IN' };
            if (key === 'stateCode')
                return value
                    ? { ...previous, stateCode: value, geographyLevel: 'state', regionCode: value }
                    : { ...previous, stateCode: '', geographyLevel: 'national', regionCode: 'IN' };
            return { ...previous, [key]: value };
        });
    }, []);
    const applyFilters = (0, react_1.useCallback)((event) => {
        event.preventDefault();
        if (!draft)
            return;
        const next = { ...draft, regionCode: draft.stateCode || draft.regionCode || 'IN' };
        setApplied(next);
        setPage(0);
        const topbarCode = next.stateCode ? (STATE_SHORTCODES[next.stateCode] ?? next.stateCode) : 'IN';
        lastGlobalRegion.current = topbarCode;
        onGlobalRegionChange(topbarCode);
    }, [draft, onGlobalRegionChange]);
    const resetFilters = (0, react_1.useCallback)(() => {
        if (!filterOptions)
            return;
        const next = { ...filterOptions.defaults };
        setDraft(next);
        setApplied(next);
        setPage(0);
        setSort('gap');
        setDirection('desc');
        setPageSize(5);
        setRegionalMetric('gap_absolute');
        lastGlobalRegion.current = 'IN';
        onGlobalRegionChange('IN');
    }, [filterOptions, onGlobalRegionChange]);
    const chooseRegion = (0, react_1.useCallback)((code) => {
        if (!draft)
            return;
        const next = { ...draft, geographyLevel: 'state', stateCode: code, regionCode: code };
        setDraft(next);
        setApplied(next);
        setPage(0);
        const topbarCode = STATE_SHORTCODES[code] ?? code;
        lastGlobalRegion.current = topbarCode;
        onGlobalRegionChange(topbarCode);
    }, [draft, onGlobalRegionChange]);
    const requestDetail = (0, react_1.useCallback)(async (type, id) => {
        if (!applied)
            return;
        try {
            const result = await adapter.getDetail(type, id, applied);
            onOpenDetail(result);
        }
        catch (error) {
            onDetailError(safeError(error));
        }
    }, [adapter, applied, onDetailError, onOpenDetail]);
    const retry = (0, react_1.useCallback)(() => setRefreshCount((value) => value + 1), []);
    const retryOptions = (0, react_1.useCallback)(() => setOptionsRefresh((value) => value + 1), []);
    const onSort = (0, react_1.useCallback)((key) => {
        if (sort === key)
            setDirection((value) => value === 'asc' ? 'desc' : 'asc');
        else {
            setSort(key);
            setDirection(key === 'skillLabel' ? 'asc' : 'desc');
        }
        setPage(0);
    }, [sort]);
    const onPage = (0, react_1.useCallback)((step) => setPage((value) => Math.max(0, value + step)), []);
    const viewAllSkills = (0, react_1.useCallback)(() => { setActiveTab('skills'); setPageSize(10); setPage(0); }, []);
    const currentMeta = overviewState.data?.meta ?? landscapeState.data?.meta ?? regionsState.data?.meta ?? skillsState.data?.meta ?? insightsState.data?.[0]?.meta ?? null;
    const errors = [overviewState, landscapeState, regionsState, skillsState, insightsState, flowState].filter((state) => Boolean(state.error)).length;
    const isLoading = optionsLoading || [overviewState, landscapeState, regionsState, skillsState, insightsState, flowState].some((state) => state.loading);
    const anyStale = [overviewState, landscapeState, regionsState, skillsState, insightsState, flowState].some((state) => state.stale);
    const regionLabel = getRegionLabel(filterOptions, applied?.stateCode || applied?.regionCode || 'IN');
    const tabDefinitions = [
        { key: 'overview', label: 'Overview' }, { key: 'occupations', label: 'Occupations' },
        { key: 'skills', label: 'Skills' }, { key: 'sectors', label: 'Sectors' }, { key: 'regions', label: 'Regions' },
    ];
    const onTabKeyDown = (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft')
            return;
        event.preventDefault();
        const current = tabDefinitions.findIndex((tab) => tab.key === activeTab);
        const next = tabDefinitions[(current + (event.key === 'ArrowRight' ? 1 : tabDefinitions.length - 1)) % tabDefinitions.length];
        setActiveTab(next.key);
        document.getElementById(`gap-tab-${next.key}`)?.focus();
    };
    const overview = overviewState.data;
    const mapRows = regionsState.data?.regions ?? [];
    const landscapePoints = landscapeState.data?.points ?? [];
    const selectedPointType = activeTab === 'occupations' ? 'occupation' : 'skill';
    const visibleLandscape = landscapeState.data ? {
        ...landscapeState.data,
        points: activeTab === 'occupations' ? landscapeState.data.points.filter((point) => point.entityType === 'occupation') : activeTab === 'skills' ? landscapeState.data.points.filter((point) => point.entityType === 'skill') : landscapeState.data.points,
    } : null;
    return (0, jsx_runtime_1.jsxs)("div", { className: "skill-gap-page", "aria-label": "Skill Gap Analysis page", children: [(0, jsx_runtime_1.jsxs)("section", { className: "gap-hero", "aria-labelledby": "gap-page-title", children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-hero-copy", children: [(0, jsx_runtime_1.jsxs)("p", { className: "gap-eyebrow", children: ["ANALYSIS ", (0, jsx_runtime_1.jsx)("span", { children: "/" }), " ", regionLabel.toUpperCase()] }), (0, jsx_runtime_1.jsxs)("h1", { id: "gap-page-title", children: ["SKILL GAP ", (0, jsx_runtime_1.jsx)("span", { children: "ANALYSIS" })] }), (0, jsx_runtime_1.jsx)("div", { className: "gap-title-rule" }), (0, jsx_runtime_1.jsx)("p", { children: "Compare compatible labour demand and workforce supply to identify potential shortages, relative balance, and surpluses by skill, occupation, sector and State / UT." }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-hero-foot", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 13 }), " Traceable definitions"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 13 }), " Source and period aware"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-hero-art", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-hero-sun" }), (0, jsx_runtime_1.jsx)("img", { src: "./assets/hero-worker-industrial.png", alt: "" }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-hero-note", children: ["SKILLS", (0, jsx_runtime_1.jsx)("br", {}), "JOBS", (0, jsx_runtime_1.jsx)("br", {}), "GROWTH"] }), (0, jsx_runtime_1.jsx)("span", { className: "gap-art-block block-one" }), (0, jsx_runtime_1.jsx)("span", { className: "gap-art-block block-two" })] })] }), optionsError && (0, jsx_runtime_1.jsxs)("div", { className: "gap-global-error", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Filter options unavailable." }), " ", optionsError] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "gap-btn", onClick: retryOptions, children: "Retry" })] }), filterOptions && draft && (0, jsx_runtime_1.jsx)(FilterToolbar, { options: filterOptions, draft: draft, onDraftChange: updateDraft, onApply: applyFilters, onReset: resetFilters, disabled: optionsLoading }), !filterOptions && optionsLoading && (0, jsx_runtime_1.jsxs)("div", { className: "gap-loading-strip", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: "spin-icon" }), " Loading supported filters\u2026"] }), (isLoading || errors > 0 || anyStale) && (0, jsx_runtime_1.jsxs)("div", { className: `gap-global-status ${errors ? 'has-errors' : ''}`, role: "status", children: [(0, jsx_runtime_1.jsx)("span", { children: errors ? (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 15 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: isLoading ? 'spin-icon' : '' }) }), (0, jsx_runtime_1.jsx)("strong", { children: errors ? `${errors} section(s) need attention` : anyStale ? 'Refreshing applied filters' : 'Loading current analysis' }), (0, jsx_runtime_1.jsx)("span", { children: anyStale ? 'Previous successful results are retained and marked stale where a request failed.' : 'Every panel reads the same applied filter snapshot.' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "gap-btn gap-btn-small", onClick: retry, disabled: isLoading, children: "Retry / refresh" })] }), (0, jsx_runtime_1.jsxs)("section", { className: "gap-kpi-grid", "aria-label": "Key skill gap indicators", "aria-busy": overviewState.loading, children: [(0, jsx_runtime_1.jsx)(MetricCard, { kind: "demand", title: overview?.demand.label ?? 'Estimated Demand', value: overview?.demand.formattedValue ?? formatNumber(overview?.demand.value), subtitle: overview?.demand.unit ?? 'Unit unavailable', meta: overview?.demand.meta, loading: overviewState.loading, onOpen: () => void requestDetail('kpi', 'demand') }), (0, jsx_runtime_1.jsx)(MetricCard, { kind: "supply", title: overview?.supply.label ?? 'Estimated Supply', value: overview?.supply.formattedValue ?? formatNumber(overview?.supply.value), subtitle: overview?.supply.unit ?? 'Unit unavailable', meta: overview?.supply.meta, loading: overviewState.loading, onOpen: () => void requestDetail('kpi', 'supply') }), (0, jsx_runtime_1.jsx)(MetricCard, { kind: "gap", title: overview?.gap.kind === 'forecast' ? 'Projected Gap / Shortage' : 'Estimated Gap / Shortage', value: overview?.gap.formattedValue ?? formatNumber(overview?.gap.value), subtitle: overview?.gap.kind === 'forecast' ? 'Forecast · horizon as returned' : 'Observed-period estimate · not a forecast', meta: overview?.gap.meta, loading: overviewState.loading, onOpen: () => void requestDetail('kpi', 'gap') }), (0, jsx_runtime_1.jsx)(MetricCard, { kind: "significant", title: "Skills with Significant Gaps", value: overview?.significantGaps.formattedValue ?? formatNumber(overview?.significantGaps.value), subtitle: overview?.significantGaps.unit ?? 'Threshold not supplied', meta: overview?.significantGaps.meta, loading: overviewState.loading, onOpen: () => void requestDetail('kpi', 'significantGaps') })] }), (0, jsx_runtime_1.jsx)("div", { className: "gap-view-tabs", role: "tablist", "aria-label": "Skill gap views", onKeyDown: onTabKeyDown, children: tabDefinitions.map((tab) => (0, jsx_runtime_1.jsx)("button", { type: "button", role: "tab", id: `gap-tab-${tab.key}`, "data-tab": tab.key, "aria-selected": activeTab === tab.key, tabIndex: activeTab === tab.key ? 0 : -1, onClick: () => setActiveTab(tab.key), children: tab.label }, tab.key)) }), activeTab === 'overview' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-main-analytics", children: [(0, jsx_runtime_1.jsx)(GapLandscapeChart, { data: visibleLandscape, loading: landscapeState.loading, error: landscapeState.error, stale: landscapeState.stale, onRetry: retry, onOpenPoint: (point) => void requestDetail(point.entityType, point.id) }), (0, jsx_runtime_1.jsx)(RegionalGapPanel, { data: regionsState.data, loading: regionsState.loading, error: regionsState.error, stale: regionsState.stale, metric: regionalMetric, onMetricChange: setRegionalMetric, onRetry: retry, onSelectRegion: chooseRegion, onOpenRegion: (region) => void requestDetail('region', region.regionCode) }), (0, jsx_runtime_1.jsx)(InsightRail, { data: insightsState.data, loading: insightsState.loading, error: insightsState.error, stale: insightsState.stale, onRetry: retry, onOpen: (insight) => void requestDetail('insight', insight.id) })] }), activeTab === 'occupations' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-view-stack", children: [(0, jsx_runtime_1.jsx)(GapLandscapeChart, { data: visibleLandscape, loading: landscapeState.loading, error: landscapeState.error, stale: landscapeState.stale, onRetry: retry, onOpenPoint: (point) => void requestDetail(point.entityType, point.id) }), (0, jsx_runtime_1.jsxs)("section", { className: "gap-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-panel-heading", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Occupation results" }), (0, jsx_runtime_1.jsx)("p", { children: "Click any occupation point or select a row in the chart data table." })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "gap-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "gap-data-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Occupation" }), (0, jsx_runtime_1.jsx)("th", { children: "Demand" }), (0, jsx_runtime_1.jsx)("th", { children: "Supply" }), (0, jsx_runtime_1.jsx)("th", { children: "Gap" }), (0, jsx_runtime_1.jsx)("th", { children: "Gap %" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: landscapePoints.filter((point) => point.entityType === selectedPointType).map((point) => (0, jsx_runtime_1.jsxs)("tr", { onClick: () => void requestDetail(point.entityType, point.id), tabIndex: 0, onKeyDown: (event) => { if (event.key === 'Enter')
                                                    void requestDetail(point.entityType, point.id); }, children: [(0, jsx_runtime_1.jsx)("td", { children: point.label }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(point.demand) }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(point.supply) }), (0, jsx_runtime_1.jsx)("td", { children: formatSigned(point.gap) }), (0, jsx_runtime_1.jsx)("td", { children: formatPercent(point.gapPercent) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `gap-status ${stateClass(point.classification)}`, children: CLASS_LABEL[point.classification] }) })] }, point.id)) })] }) })] })] }), activeTab === 'skills' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-view-stack", children: [(0, jsx_runtime_1.jsx)(GapLandscapeChart, { data: visibleLandscape, loading: landscapeState.loading, error: landscapeState.error, stale: landscapeState.stale, onRetry: retry, onOpenPoint: (point) => void requestDetail(point.entityType, point.id) }), (0, jsx_runtime_1.jsx)(RankedSkillsTable, { data: skillsState.data, loading: skillsState.loading, error: skillsState.error, stale: skillsState.stale, sort: sort, direction: direction, page: page, pageSize: pageSize, onSort: onSort, onPage: onPage, onRetry: retry, onOpenRow: (row) => void requestDetail('skill', row.skillId), onViewAll: viewAllSkills })] }), activeTab === 'sectors' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-view-stack", children: [(0, jsx_runtime_1.jsxs)("section", { className: "gap-card gap-sector-table", children: [(0, jsx_runtime_1.jsxs)("div", { className: "gap-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Sector Comparison" }), (0, jsx_runtime_1.jsx)("p", { children: "Connect this view to the backend's established sector analytics response." })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.Factory, { size: 22 })] }), (0, jsx_runtime_1.jsxs)("div", { className: "gap-empty", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 21 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Sector gap summary endpoint not specified" }), (0, jsx_runtime_1.jsx)("p", { children: "The supplied API handoff defines sector flow only when measured, unit-compatible links exist; it does not define a sector-gap totals endpoint. No sector totals are fabricated. Agree the existing endpoint/response with the backend team before enabling this table." }), (0, jsx_runtime_1.jsxs)("button", { className: "gap-inline-button", type: "button", onClick: () => setActiveTab('overview'), children: ["Return to overview ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 13 })] })] })] })] }), (0, jsx_runtime_1.jsx)(SectorPanel, { filters: applied, data: flowState.data, loading: flowState.loading, error: flowState.error, stale: flowState.stale, onRetry: retry, onViewSectors: () => setActiveTab('overview'), viewingSectors: true })] }), activeTab === 'regions' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-view-stack", children: [(0, jsx_runtime_1.jsx)(RegionalGapPanel, { data: regionsState.data, loading: regionsState.loading, error: regionsState.error, stale: regionsState.stale, metric: regionalMetric, onMetricChange: setRegionalMetric, onRetry: retry, onSelectRegion: chooseRegion, onOpenRegion: (region) => void requestDetail('region', region.regionCode) }), (0, jsx_runtime_1.jsxs)("section", { className: "gap-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "gap-panel-heading", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: "Regional Detail Table" }), (0, jsx_runtime_1.jsx)("p", { children: "Canonical State / UT codes, explicit missing values and returned coverage." })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "gap-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "gap-data-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "State / UT" }), (0, jsx_runtime_1.jsx)("th", { children: "Code" }), (0, jsx_runtime_1.jsx)("th", { children: "Demand" }), (0, jsx_runtime_1.jsx)("th", { children: "Supply" }), (0, jsx_runtime_1.jsx)("th", { children: "Gap" }), (0, jsx_runtime_1.jsx)("th", { children: "Gap %" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: mapRows.map((item) => (0, jsx_runtime_1.jsxs)("tr", { tabIndex: 0, onClick: () => void requestDetail('region', item.regionCode), onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    void requestDetail('region', item.regionCode);
                                                } }, children: [(0, jsx_runtime_1.jsx)("td", { children: item.regionName }), (0, jsx_runtime_1.jsx)("td", { children: item.regionCode }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(item.demand) }), (0, jsx_runtime_1.jsx)("td", { children: formatNumber(item.supply) }), (0, jsx_runtime_1.jsx)("td", { children: formatSigned(item.gap) }), (0, jsx_runtime_1.jsx)("td", { children: formatPercent(item.gapPercent) }), (0, jsx_runtime_1.jsx)("td", { children: CLASS_LABEL[item.classification] })] }, item.regionCode)) })] }) })] })] }), activeTab === 'overview' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-lower-grid", children: [(0, jsx_runtime_1.jsx)(RankedSkillsTable, { data: skillsState.data, loading: skillsState.loading, error: skillsState.error, stale: skillsState.stale, sort: sort, direction: direction, page: page, pageSize: pageSize, onSort: onSort, onPage: onPage, onRetry: retry, onOpenRow: (row) => void requestDetail('skill', row.skillId), onViewAll: viewAllSkills }), (0, jsx_runtime_1.jsx)(SectorPanel, { filters: applied, data: flowState.data, loading: flowState.loading, error: flowState.error, stale: flowState.stale, onRetry: retry, onViewSectors: () => setActiveTab('sectors') })] }), activeTab !== 'overview' && (0, jsx_runtime_1.jsxs)("div", { className: "gap-tab-bottom", children: [(0, jsx_runtime_1.jsx)(DataBadge, { meta: currentMeta }), (0, jsx_runtime_1.jsxs)("span", { children: [activeTab === 'occupations' ? 'Occupations view' : activeTab === 'skills' ? 'Skills view' : activeTab === 'sectors' ? 'Sectors view' : 'Regions view', " \u00B7 same applied filter snapshot"] })] }), (0, jsx_runtime_1.jsx)(DataProvenanceStrip, { meta: currentMeta, loading: isLoading, errors: errors, onRefresh: retry, refreshing: isLoading })] });
}

},
"skill-gaps/adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSkillGapDataAdapter = createSkillGapDataAdapter;
const mockAdapter_1 = require("./mockAdapter");
const restAdapter_1 = require("./restAdapter");
function createSkillGapDataAdapter() {
    const baseUrl = (typeof window !== 'undefined' && window.SHRAMIK_CONFIG && window.SHRAMIK_CONFIG.apiBaseUrl || '').trim();
    if (baseUrl)
        return new restAdapter_1.RestSkillGapDataAdapter({ baseUrl, getAccessToken: () => null });
    return new mockAdapter_1.MockSkillGapDataAdapter();
}

},
"skill-gaps/mockAdapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCCUPATIONS = exports.SKILLS = exports.SECTORS = exports.STATES = exports.CLASSIFICATIONS = exports.MockSkillGapDataAdapter = void 0;
const UNIT = 'persons (illustrative)';
const SOURCE_LABEL = 'Illustrative demo data';
const CLASSIFICATIONS = [
    { key: 'high_shortage', label: 'High shortage', colorToken: 'orange', thresholdDescription: 'Gap at or above 20% of demand (demo configuration).' },
    { key: 'moderate_shortage', label: 'Moderate shortage', colorToken: 'yellow', thresholdDescription: 'Gap from +5% to below +20% of demand (demo configuration).' },
    { key: 'balanced', label: 'Balanced', colorToken: 'teal', thresholdDescription: 'Absolute gap within the configured 5% of demand tolerance.' },
    { key: 'moderate_surplus', label: 'Moderate surplus', colorToken: 'blue', thresholdDescription: 'Supply exceeds demand by 5% to below 20% of demand (demo configuration).' },
    { key: 'high_surplus', label: 'High surplus', colorToken: 'navy', thresholdDescription: 'Supply exceeds demand by 20% or more of demand (demo configuration).' },
    { key: 'not_comparable', label: 'Not comparable', colorToken: 'neutral', thresholdDescription: 'Input definitions, units or periods are not compatible.' },
    { key: 'no_data', label: 'No data', colorToken: 'neutral', thresholdDescription: 'No value returned for this region.' },
];
exports.CLASSIFICATIONS = CLASSIFICATIONS;
const PERIODS = [{ value: '2024-25', label: '2024–25 (demo period)' }, { value: '2023-24', label: '2023–24 (demo period)' }];
const STATES = [
    { code: 'IN-MH', label: 'Maharashtra', weight: 1.5 }, { code: 'IN-UP', label: 'Uttar Pradesh', weight: 1.6 },
    { code: 'IN-TN', label: 'Tamil Nadu', weight: 1.2 }, { code: 'IN-GJ', label: 'Gujarat', weight: 1.2 },
    { code: 'IN-KA', label: 'Karnataka', weight: 1.1 }, { code: 'IN-WB', label: 'West Bengal', weight: 1 },
    { code: 'IN-RJ', label: 'Rajasthan', weight: .9 }, { code: 'IN-BR', label: 'Bihar', weight: .9 },
    { code: 'IN-KL', label: 'Kerala', weight: .7 }, { code: 'IN-PB', label: 'Punjab', weight: .6 },
    { code: 'IN-OD', label: 'Odisha', weight: .6 }, { code: 'IN-LA', label: 'Ladakh', weight: 0 },
];
exports.STATES = STATES;
const SECTORS = [
    { code: 'MFG', label: 'Manufacturing', weight: .3 }, { code: 'CON', label: 'Construction', weight: .2 },
    { code: 'RET', label: 'Retail & trade', weight: .17 }, { code: 'HLT', label: 'Healthcare', weight: .12 },
    { code: 'LOG', label: 'Logistics', weight: .1 }, { code: 'ENG', label: 'Energy', weight: .06 },
];
exports.SECTORS = SECTORS;
const OCCUPATIONS = [
    { code: 'O1', label: 'Welders & flame cutters', demand: 26000, supply: 17400 },
    { code: 'O2', label: 'Machine tool operators', demand: 31000, supply: 21000 },
    { code: 'O3', label: 'Electricians', demand: 44000, supply: 40500 },
    { code: 'O4', label: 'Data entry operators', demand: 24000, supply: 33000 },
    { code: 'O5', label: 'Retail salespersons', demand: 52000, supply: 54500 },
    { code: 'O6', label: 'Plumbers & pipe fitters', demand: 16500, supply: 12100 },
    { code: 'O7', label: 'Nursing associates', demand: 29000, supply: 18500 },
    { code: 'O8', label: 'Warehouse workers', demand: 35000, supply: 34000 },
];
exports.OCCUPATIONS = OCCUPATIONS;
const SKILLS = [
    { code: 'S01', label: 'Welding', demand: 48200, supply: 31000 },
    { code: 'S02', label: 'CNC machine operation', demand: 36500, supply: 22100 },
    { code: 'S03', label: 'Electrical wiring', demand: 52000, supply: 47800 },
    { code: 'S04', label: 'Data entry', demand: 30100, supply: 41500 },
    { code: 'S05', label: 'Solar PV installation', demand: 18700, supply: 9800 },
    { code: 'S06', label: 'Retail sales', demand: 61000, supply: 63400 },
    { code: 'S07', label: 'Plumbing', demand: 22400, supply: 15900 },
    { code: 'S08', label: 'Basic digital literacy', demand: 44000, supply: 52300 },
    { code: 'S09', label: 'Equipment maintenance', demand: 27800, supply: 20100 },
    { code: 'S10', label: 'Warehouse operations', demand: 39500, supply: 36200 },
    { code: 'S11', label: 'Patient care assistance', demand: 33200, supply: 19800 },
    { code: 'S12', label: 'Garment stitching', demand: 41000, supply: 43900 },
];
exports.SKILLS = SKILLS;
function meta(period, unit = UNIT, extraNotes = []) {
    return {
        period, unit, provenance: 'mock', sourceLabel: SOURCE_LABEL, sourceIds: ['demo-generator'], updatedAt: null,
        coverage: { observedCount: 12, expectedCount: 36, geographyCovered: 12, geographyExpected: 36, summary: 'Illustrative coverage only; this is not a verified national dataset.' },
        notes: ['Values are generated for layout and interaction testing, not source-backed labour-market findings.', ...extraNotes],
    };
}
function seededRandom(seedText) {
    let a = [...seedText].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function multiplier(filters) {
    let factor = filters.period === '2023-24' ? .93 : 1;
    const state = STATES.find((item) => item.code === filters.stateCode);
    if (state)
        factor *= state.weight > 0 ? state.weight / 1.1 : .12;
    const sector = SECTORS.find((item) => item.code === filters.sectorCode);
    if (sector)
        factor *= sector.weight * 3;
    return factor;
}
function classify(demand, supply, balancedTolerance, significantThreshold) {
    if (demand == null || supply == null || (demand === 0 && supply !== 0))
        return 'not_comparable';
    if (demand === 0 && supply === 0)
        return 'balanced';
    const relativeGap = (demand - supply) / demand;
    if (relativeGap >= significantThreshold)
        return 'high_shortage';
    if (relativeGap >= balancedTolerance)
        return 'moderate_shortage';
    if (relativeGap > -balancedTolerance)
        return 'balanced';
    if (relativeGap > -significantThreshold)
        return 'moderate_surplus';
    return 'high_surplus';
}
function gapPercent(demand, supply) {
    return demand == null || supply == null || demand <= 0 ? null : (demand - supply) / demand;
}
function formatted(value) {
    return value == null ? 'Not available' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}
function filtersLabel(filters) {
    const region = STATES.find((item) => item.code === filters.stateCode)?.label ?? 'All India';
    return `${PERIODS.find((item) => item.value === filters.period)?.label ?? filters.period}; ${region}`;
}
function createSnapshot(filters) {
    const rng = seededRandom(`${filters.period}:${filters.regionCode}:${filters.stateCode}:${filters.sectorCode}:${filters.ncoCode}:${filters.skillCode}`);
    const scale = multiplier(filters);
    const shift = (base) => Math.max(0, Math.round(base * scale * (.92 + rng() * .16)));
    const stateScale = STATES.reduce((sum, item) => sum + item.weight, 0) || 1;
    const skillSources = filters.skillCode ? SKILLS.filter((item) => item.code === filters.skillCode) : SKILLS;
    const occSources = filters.ncoCode ? OCCUPATIONS.filter((item) => item.code === filters.ncoCode) : OCCUPATIONS;
    const skills = skillSources.map((item) => {
        const demand = shift(item.demand);
        const supply = shift(item.supply);
        const gap = demand - supply;
        return { id: item.code, code: item.code, entityType: 'skill', label: item.label, demand, supply, gap, gapPercent: gapPercent(demand, supply), unit: UNIT, classification: classify(demand, supply, .05, .2), detailAvailable: true, meta: meta(filters.period) };
    }).sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
    const occupations = occSources.map((item) => {
        const demand = shift(item.demand);
        const supply = shift(item.supply);
        const gap = demand - supply;
        return { id: item.code, code: item.code, entityType: 'occupation', label: item.label, demand, supply, gap, gapPercent: gapPercent(demand, supply), unit: UNIT, classification: classify(demand, supply, .05, .2), detailAvailable: true, meta: meta(filters.period) };
    }).sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
    const demandTotal = skills.reduce((sum, item) => sum + (item.demand ?? 0), 0);
    const supplyTotal = skills.reduce((sum, item) => sum + (item.supply ?? 0), 0);
    const skillGapTotal = demandTotal - supplyTotal;
    const significantCount = skills.filter((item) => item.classification === 'high_shortage').length;
    const sectors = SECTORS.filter((item) => !filters.sectorCode || item.code === filters.sectorCode).map((item) => {
        const demand = Math.round(demandTotal * item.weight * (.9 + rng() * .2));
        const supply = Math.round(supplyTotal * item.weight * (.85 + rng() * .3));
        return { id: item.code, label: item.label, demand, supply, gap: demand - supply, gapPercent: gapPercent(demand, supply), classification: classify(demand, supply, .05, .2) };
    }).sort((a, b) => b.gap - a.gap);
    const regions = STATES.map((item) => {
        if (item.weight <= 0)
            return { regionCode: item.code, regionName: item.label, demand: null, supply: null, gap: null, gapPercent: null, unit: UNIT, classification: 'no_data', missingReason: 'Illustrative suppression: no usable record in demo adapter.', meta: meta(filters.period) };
        const demand = Math.round((demandTotal * item.weight / stateScale) * (.9 + rng() * .2));
        const supply = Math.round((supplyTotal * item.weight / stateScale) * (.85 + rng() * .3));
        const gap = demand - supply;
        return { regionCode: item.code, regionName: item.label, demand, supply, gap, gapPercent: gapPercent(demand, supply), unit: UNIT, classification: classify(demand, supply, .05, .2), rank: null, meta: meta(filters.period) };
    });
    return { filters: { ...filters }, skills, occupations, sectors, regions, demandTotal, supplyTotal, skillGapTotal, significantCount, meta: meta(filters.period) };
}
function makeMetric(label, value, unit, definition, m, extra = {}) {
    return { label, value, formattedValue: formatted(value), unit, definition, meta: m, ...extra };
}
function detailFromPoint(type, point, filters) {
    const row = point;
    return {
        id: row.id ?? row.regionCode ?? row.skillId,
        type,
        title: row.label ?? row.regionName ?? row.skillLabel,
        description: 'Detail record from the illustrative adapter. Replace with traceable source-backed evidence before analytical use.',
        facts: [
            { label: 'Demand', value: formatted(row.demand ?? null) },
            { label: 'Supply', value: formatted(row.supply ?? null) },
            { label: 'Gap', value: formatted(row.gap ?? null) },
            { label: 'Gap %', value: row.gapPercent == null ? 'Not available' : `${(row.gapPercent * 100).toFixed(1)}%` },
            { label: 'Unit', value: row.unit ?? UNIT },
            { label: 'Period', value: filtersLabel(filters) },
            { label: 'Classification', value: String(row.classification ?? row.gapClass ?? 'Not returned') },
            { label: 'Applied filters', value: Object.entries(filters).map(([key, value]) => `${key}: ${value || 'All'}`).join(' · ') },
        ],
        meta: row.meta ?? meta(filters.period),
    };
}
class MockSkillGapDataAdapter {
    constructor() {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'mock'
        });
    }
    async getFilterOptions(signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const m = meta('2024–25 (illustrative period)');
        return {
            periods: PERIODS,
            geographyLevels: [{ value: 'national', label: 'All India' }, { value: 'state', label: 'State / UT' }],
            regions: [{ code: 'IN', value: 'IN', label: 'All India', level: 'national' }, ...STATES.map((item) => ({ code: item.code, value: item.code, label: item.label, level: 'state' }))],
            sectors: [{ value: '', label: 'All sectors' }, ...SECTORS.map((item) => ({ value: item.code, label: item.label }))],
            occupations: [{ value: '', label: 'All occupations' }, ...OCCUPATIONS.map((item) => ({ value: item.code, label: item.label }))],
            skills: [{ value: '', label: 'All skills' }, ...SKILLS.map((item) => ({ value: item.code, label: item.label }))],
            defaults: { period: '2024-25', geographyLevel: 'national', regionCode: 'IN', stateCode: '', sectorCode: '', ncoCode: '', skillCode: '' },
            configuration: { balancedTolerance: .05, significantGapThreshold: .2, classificationVersion: 'demo-thresholds-v1' },
            meta: m,
        };
    }
    async getOverview(filters, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const s = createSnapshot(filters);
        const m = s.meta;
        return {
            demand: makeMetric('Estimated demand', s.demandTotal, UNIT, 'Sum of the listed skill-demand estimates for the current filter snapshot. Demonstration only.', m),
            supply: makeMetric('Estimated supply', s.supplyTotal, UNIT, 'Sum of the listed skill-supply estimates for the current filter snapshot. Demonstration only.', m),
            gap: makeMetric('Estimated gap / shortage', s.skillGapTotal, UNIT, 'Observed-period estimate, calculated in the mock adapter as comparable demand minus supply; it is not a forecast.', m, { kind: 'observed_estimate', formulaId: 'demo-demand-minus-supply-v1', gapPercent: gapPercent(s.demandTotal, s.supplyTotal), gapPercentFormula: 'gap / demand; unavailable when demand is zero', denominator: s.demandTotal }),
            significantGaps: makeMetric('Skills with significant gaps', s.significantCount, 'skills', 'Count of currently listed skills classified high shortage using the adapter demo threshold.', m),
            balancedTolerance: { value: .05, unit: 'share of demand', configId: 'demo-thresholds-v1' },
            dataStatus: 'partial', meta: { ...m, notes: [...(m.notes ?? []), 'Only 12 of 36 State/UTs are listed by this illustrative adapter.'] },
        };
    }
    async getGapLandscape(filters, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const snapshot = createSnapshot(filters);
        const points = filters.ncoCode ? snapshot.occupations : snapshot.skills;
        return { points, xAxis: { key: 'supply', label: 'Supply', unit: UNIT, scale: 'linear' }, yAxis: { key: 'demand', label: 'Demand', unit: UNIT, scale: 'linear' }, parityLineEligible: true, classifications: CLASSIFICATIONS, meta: snapshot.meta };
    }
    async getRegionalGaps(filters, metric, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const snapshot = createSnapshot(filters);
        const items = snapshot.regions.map((item) => ({ ...item, rank: item.gap == null ? null : null }));
        const val = (item) => metric === 'demand' ? item.demand : metric === 'supply' ? item.supply : metric === 'gap_percent' ? item.gapPercent : item.gap;
        items.sort((a, b) => (val(b) ?? -Infinity) - (val(a) ?? -Infinity));
        let rank = 0;
        for (const item of items)
            if (val(item) != null)
                item.rank = ++rank;
        return { metric, regions: items, geometry: null, geometryUnavailableReason: 'No verified, licensed state/UT GeoJSON and canonical-code crosswalk are included in this package. The illustrative PNG is deliberately not used as data geography.', scale: CLASSIFICATIONS, meta: { ...snapshot.meta, coverage: { geographyCovered: 11, geographyExpected: 36, missingCodes: ['multiple states/UTs not present in demo data'], summary: 'Illustrative coverage only; no geometry available.' } } };
    }
    async getRankedSkills(filters, query, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const snapshot = createSnapshot(filters);
        const sortKeys = {
            rank: (item) => item.rank, skillLabel: (item) => item.skillLabel, demand: (item) => item.demand,
            supply: (item) => item.supply, gap: (item) => item.gap, gapPercent: (item) => item.gapPercent ?? null,
        };
        const items = snapshot.skills.map((item, index) => ({
            rank: index + 1, skillId: item.id, skillCode: item.code, skillLabel: item.label, demand: item.demand,
            supply: item.supply, gap: item.gap, gapPercent: item.gapPercent, gapClass: item.classification,
            trend: [-2, -1, 0, 1].map((step, idx) => ({ period: idx === 3 ? filters.period : `t${step}`, gap: item.gap == null ? null : Math.round(item.gap * (0.78 + idx * .06)) })),
            unit: item.unit, detailAvailable: true, meta: item.meta,
        }));
        const selector = sortKeys[query.sort];
        const direction = query.direction === 'asc' ? 1 : -1;
        items.sort((a, b) => {
            const aa = selector(a);
            const bb = selector(b);
            if (typeof aa === 'string' && typeof bb === 'string')
                return direction * aa.localeCompare(bb);
            return direction * ((Number(aa) || 0) - (Number(bb) || 0));
        });
        const start = query.page * query.pageSize;
        return { items: items.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize, total: items.length, sort: `${query.sort}:${query.direction}`, skillTaxonomyVersion: 'DEMO-SKILLS-1.0', meta: snapshot.meta };
    }
    async getSkillGapInsights(filters, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const snapshot = createSnapshot(filters);
        const metaValue = snapshot.meta;
        const insights = [];
        const skills = [...snapshot.skills].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
        const largestShortage = skills.find((item) => item.gap != null && item.gap > 0);
        const largestSurplus = [...skills].reverse().find((item) => item.gap != null && item.gap < 0);
        const topRegion = [...snapshot.regions].filter((item) => item.gap != null).sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0];
        if (largestShortage)
            insights.push({ id: 'demo-insight-shortage', title: `${largestShortage.label} has the largest listed shortage`, summary: `Demand exceeds supply by ${formatted(largestShortage.gap)} ${UNIT}.`, importance: 'priority', claims: [{ text: 'Calculated from the corresponding demo point in the current filter snapshot.', metricId: largestShortage.id, value: largestShortage.gap, unit: UNIT, sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'skill', id: largestShortage.id }, generatedBy: 'mock', meta: metaValue });
        if (largestSurplus)
            insights.push({ id: 'demo-insight-surplus', title: `${largestSurplus.label} has a potential surplus`, summary: `Supply exceeds demand by ${formatted(Math.abs(largestSurplus.gap ?? 0))} ${UNIT}.`, importance: 'info', claims: [{ text: 'Calculated from the corresponding demo point in the current filter snapshot.', metricId: largestSurplus.id, value: largestSurplus.gap, unit: UNIT, sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'skill', id: largestSurplus.id }, generatedBy: 'mock', meta: metaValue });
        insights.push({ id: 'demo-insight-count', title: `${snapshot.significantCount} of ${snapshot.skills.length} listed skills are in the high-shortage class`, summary: 'The classification uses the explicitly labelled demo threshold, not a source-backed policy rule.', importance: 'watch', claims: [{ text: 'Count returned by the demo adapter configuration.', metricId: 'significantGaps', value: snapshot.significantCount, unit: 'skills', sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'skill', id: largestShortage?.id ?? snapshot.skills[0]?.id ?? 'none' }, generatedBy: 'mock', meta: metaValue });
        if (topRegion)
            insights.push({ id: 'demo-insight-region', title: `${topRegion.regionName} ranks highest on the current demo gap measure`, summary: `Listed gap: ${formatted(topRegion.gap)} ${UNIT}. This ranking is not source-backed.`, importance: 'watch', claims: [{ text: 'Regional ranking from the current demo filter snapshot.', metricId: topRegion.regionCode, value: topRegion.gap, unit: UNIT, sourceIds: ['demo-generator'] }], evidenceEntity: { type: 'region', id: topRegion.regionCode }, generatedBy: 'mock', meta: metaValue });
        return insights.slice(0, 4);
    }
    async getSectorFlow(filters, sectorCode, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        return { available: false, sectorCode, nodes: [], links: [], unavailableReason: 'No measured, unit-compatible sector-flow dataset is provided by the demo adapter. SHRAMIK will not infer flows from skill gaps.', meta: meta(filters.period, UNIT, ['Flow visualisation is intentionally unavailable in demo mode.']) };
    }
    async getDetail(type, id, filters, signal) {
        if (signal?.aborted)
            throw new DOMException('The request was aborted.', 'AbortError');
        const snapshot = createSnapshot(filters);
        let point;
        if (type === 'skill')
            point = [...snapshot.skills, ...snapshot.occupations].find((item) => item.id === id);
        if (type === 'occupation')
            point = snapshot.occupations.find((item) => item.id === id);
        if (type === 'region')
            point = snapshot.regions.find((item) => item.regionCode === id);
        if (type === 'sector') {
            const item = snapshot.sectors.find((row) => row.id === id);
            if (item)
                point = { ...item, id: item.id, code: item.id, label: item.label, unit: UNIT, detailAvailable: true, entityType: 'skill', meta: snapshot.meta };
        }
        if (type === 'kpi') {
            const overview = await this.getOverview(filters, signal);
            const item = id === 'demand' ? overview.demand : id === 'supply' ? overview.supply : id === 'gap' ? overview.gap : overview.significantGaps;
            return { id, type, title: item.label, description: item.definition, facts: [{ label: 'Value', value: item.formattedValue ?? formatted(item.value) }, { label: 'Unit', value: item.unit }, { label: 'Period', value: item.meta.period }, { label: 'Formula', value: id === 'gap' ? 'Demand − supply when definitions, units and period are compatible.' : 'Returned estimate for the applied filter snapshot.' }, { label: 'Applied filters', value: filtersLabel(filters) }], meta: item.meta };
        }
        if (type === 'insight') {
            const item = (await this.getSkillGapInsights(filters, signal)).find((row) => row.id === id);
            if (item)
                return { id, type, title: item.title, description: item.summary, facts: [{ label: 'Generated by', value: item.generatedBy === 'mock' ? 'Illustrative rule (mock)' : item.generatedBy }, { label: 'Evidence IDs', value: item.claims.flatMap((claim) => claim.sourceIds).join(', ') || 'No evidence IDs returned' }, { label: 'Applied filters', value: filtersLabel(filters) }], meta: item.meta };
        }
        if (!point)
            throw new Error(`No ${type} detail found for ${id}.`);
        return detailFromPoint(type, point, filters);
    }
}
exports.MockSkillGapDataAdapter = MockSkillGapDataAdapter;

},
"skill-gaps/restAdapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestSkillGapDataAdapter = exports.SkillGapApiError = void 0;
class SkillGapApiError extends Error {
    constructor(message, status, endpoint, code, requestId) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: status
        });
        Object.defineProperty(this, "endpoint", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: endpoint
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: code
        });
        Object.defineProperty(this, "requestId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: requestId
        });
        this.name = 'SkillGapApiError';
    }
}
exports.SkillGapApiError = SkillGapApiError;
function apiPath(baseUrl) {
    const clean = baseUrl.replace(/\/+$/, '');
    if (clean.endsWith('/api/v1/skill-gaps'))
        return clean;
    if (clean.endsWith('/api/v1'))
        return `${clean}/skill-gaps`;
    return `${clean}/api/v1/skill-gaps`;
}
function filterParams(filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
        if (value !== undefined && value !== null && value !== '')
            params.set(key, value);
    return params;
}
class RestSkillGapDataAdapter {
    constructor(options) {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'rest'
        });
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchImpl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getAccessToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.baseUrl = apiPath(options.baseUrl);
        this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
        this.getAccessToken = options.getAccessToken;
    }
    async request(endpoint, params, signal) {
        const token = await this.getAccessToken?.();
        const query = params?.toString();
        const url = `${this.baseUrl}${endpoint}${query ? `?${query}` : ''}`;
        const headers = new Headers({ Accept: 'application/json' });
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        let response;
        try {
            response = await this.fetchImpl(url, { method: 'GET', headers, credentials: 'include', signal });
        }
        catch (reason) {
            if (reason instanceof DOMException && reason.name === 'AbortError')
                throw reason;
            throw new SkillGapApiError('Cannot reach the SHRAMIK Skill Gap API. Check the API URL and network connection.', 0, endpoint);
        }
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const code = payload?.code ?? payload?.error?.code;
            const requestId = payload?.requestId ?? payload?.error?.requestId;
            const message = payload?.message ?? payload?.error?.message ?? `Request failed (${response.status}).`;
            throw new SkillGapApiError(message, response.status, endpoint, code, requestId);
        }
        if (response.status === 204)
            return undefined;
        const body = await response.json();
        return typeof body === 'object' && body !== null && 'data' in body ? body.data : body;
    }
    getFilterOptions(signal) { return this.request('/filters', undefined, signal); }
    getOverview(filters, signal) { return this.request('/overview', filterParams(filters), signal); }
    getGapLandscape(filters, signal) { return this.request('/landscape', filterParams(filters), signal); }
    getRegionalGaps(filters, metric, signal) {
        const params = filterParams(filters);
        params.set('metric', metric);
        return this.request('/regions', params, signal);
    }
    getRankedSkills(filters, query, signal) {
        const params = filterParams(filters);
        params.set('sort', query.sort);
        params.set('direction', query.direction);
        params.set('page', String(query.page));
        params.set('pageSize', String(query.pageSize));
        return this.request('/skills', params, signal);
    }
    getSkillGapInsights(filters, signal) { return this.request('/insights', filterParams(filters), signal); }
    getSectorFlow(filters, sectorCode, signal) {
        const params = filterParams(filters);
        if (sectorCode)
            params.set('sectorCode', sectorCode);
        return this.request('/sector-flow', params, signal);
    }
    getDetail(type, id, filters, signal) {
        const params = filterParams(filters);
        return this.request(`/details/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, params, signal);
    }
}
exports.RestSkillGapDataAdapter = RestSkillGapDataAdapter;

},
"forecasts/ForecastsPage": function(module, exports, require) {
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
var ForecastsEarlyWarningsPage_1 = require("./ForecastsEarlyWarningsPage");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(ForecastsEarlyWarningsPage_1).default; } });

},
"forecasts/ForecastsEarlyWarningsPage": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ForecastsEarlyWarningsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const legacyAdapter_1 = require("./legacyAdapter");
const VIEWS = [
    { key: 'overview', label: 'Forecast Overview', short: 'Overview' },
    { key: 'risk-radar', label: 'Risk Radar', short: 'Risk Radar' },
    { key: 'scenario-analysis', label: 'Scenario Analysis', short: 'Scenarios' },
    { key: 'model-performance', label: 'Model Performance', short: 'Performance' },
    { key: 'alert-management', label: 'Alert Management', short: 'Alerts' },
];
const defaultFilters = { horizonYears: 3, geographyCode: 'IN', period: '2026' };
const defaultView = () => {
    if (typeof window === 'undefined')
        return 'overview';
    const value = new URLSearchParams(window.location.search).get('view');
    return VIEWS.some((item) => item.key === value) ? value : 'overview';
};
const fmt = (value, unit) => value == null || !Number.isFinite(value)
    ? 'Not available'
    : `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value)}${unit === '%' ? '%' : ''}`;
const signed = (value, unit) => value == null || !Number.isFinite(value)
    ? 'Not available'
    : `${value > 0 ? '+' : value < 0 ? '−' : ''}${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(Math.abs(value))}${unit ? ` ${unit}` : ''}`;
const percent = (value) => value == null || !Number.isFinite(value) ? 'Not available' : `${value.toFixed(1)}%`;
const niceDate = (value) => {
    if (!value)
        return 'Not supplied';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
const titleCase = (value) => value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
const alertSeverityLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const riskClassLabel = {
    'high-shortage': 'High shortage', 'moderate-shortage': 'Moderate shortage', balanced: 'Approx. balance',
    'moderate-surplus': 'Moderate surplus', 'high-surplus': 'High surplus', 'no-data': 'No data',
};
const metaSource = (meta) => !meta ? 'Provenance not supplied' : `${titleCase(meta.provenance)} · ${(meta.sourceLabels ?? []).join(', ') || 'Source label not supplied'}`;
function ProvenanceBadge({ meta }) {
    const value = meta?.provenance ?? 'mock';
    return (0, jsx_runtime_1.jsxs)("span", { className: `fw-provenance fw-prov-${value}`, children: [(0, jsx_runtime_1.jsx)("i", {}), " ", titleCase(value)] });
}
function DataFootnote({ meta, compact = false }) {
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-data-footnote", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 14 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: metaSource(meta) }), !compact && (0, jsx_runtime_1.jsxs)("p", { children: [meta?.notes?.join(' ') || 'Units, coverage and update timing should be checked against the source response.', " ", meta?.updatedAt ? `Updated ${niceDate(meta.updatedAt)}.` : 'Update time not supplied.'] })] }), (0, jsx_runtime_1.jsx)(ProvenanceBadge, { meta: meta })] });
}
function Panel({ title, subtitle, children, action, className = '' }) {
    return (0, jsx_runtime_1.jsxs)("section", { className: `fw-panel ${className}`, children: [(0, jsx_runtime_1.jsxs)("header", { className: "fw-panel-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), subtitle && (0, jsx_runtime_1.jsx)("p", { children: subtitle })] }), action] }), children] });
}
function ErrorPanel({ message, onRetry }) {
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-error-panel", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 18 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Service response unavailable" }), (0, jsx_runtime_1.jsx)("p", { children: message })] }), onRetry && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "fw-button", onClick: onRetry, children: "Retry" })] });
}
function EmptyPanel({ title, message, icon = 'info' }) {
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-empty-panel", children: [icon === 'chart' ? (0, jsx_runtime_1.jsx)(lucide_react_1.BarChart3, { size: 23 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.CircleHelp, { size: 23 }), (0, jsx_runtime_1.jsx)("strong", { children: title }), (0, jsx_runtime_1.jsx)("p", { children: message })] });
}
function ForecastFilterBar({ draft, options, onChange, onApply, onReset, loading }) {
    const fields = [
        { key: 'stateCode', label: 'State / UT', options: [{ code: '', label: 'All India' }, ...(options?.states ?? [])] },
        { key: 'sectorCode', label: 'Sector', options: [{ code: '', label: 'All sectors' }, ...(options?.sectors ?? [])] },
        { key: 'occupationCode', label: 'Occupation', options: [{ code: '', label: 'All occupations' }, ...(options?.occupations ?? [])] },
        { key: 'skillCode', label: 'Skill', options: [{ code: '', label: 'All skills' }, ...(options?.skills ?? [])] },
    ];
    return (0, jsx_runtime_1.jsxs)("form", { className: "fw-filter-bar", onSubmit: (event) => { event.preventDefault(); onApply(); }, "aria-label": "Forecast filters", children: [(0, jsx_runtime_1.jsxs)("label", { className: "fw-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Forecast horizon" }), (0, jsx_runtime_1.jsx)("select", { value: draft.horizonYears, onChange: (event) => onChange('horizonYears', Number(event.target.value)), children: (options?.horizons ?? [1, 3, 5]).map((years) => (0, jsx_runtime_1.jsxs)("option", { value: years, children: [years, " ", years === 1 ? 'year' : 'years'] }, years)) })] }), fields.map((field) => (0, jsx_runtime_1.jsxs)("label", { className: "fw-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: field.label }), (0, jsx_runtime_1.jsx)("select", { value: String(draft[field.key] ?? ''), onChange: (event) => onChange(field.key, event.target.value), children: (field.options ?? []).map((option) => (0, jsx_runtime_1.jsx)("option", { value: option.code, children: option.label }, option.code || 'all')) })] }, field.key)), (0, jsx_runtime_1.jsxs)("div", { className: "fw-filter-actions", children: [(0, jsx_runtime_1.jsxs)("button", { className: "fw-button fw-button-primary", type: "submit", disabled: loading, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.SlidersHorizontal, { size: 15 }), " Apply filters"] }), (0, jsx_runtime_1.jsx)("button", { className: "fw-button", type: "button", onClick: onReset, disabled: loading, children: "Reset" })] })] });
}
function Tabs({ active, onChange }) {
    const tabRefs = (0, react_1.useRef)([]);
    const onKeyDown = (event, index) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key))
            return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? VIEWS.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length;
        onChange(VIEWS[next].key);
        tabRefs.current[next]?.focus();
    };
    return (0, jsx_runtime_1.jsx)("div", { className: "fw-tabs", role: "tablist", "aria-label": "Forecast workspace views", children: VIEWS.map((item, index) => (0, jsx_runtime_1.jsx)("button", { ref: (node) => { tabRefs.current[index] = node; }, id: `forecast-tab-${item.key}`, type: "button", role: "tab", "aria-selected": active === item.key, "aria-controls": "forecast-view-panel", tabIndex: active === item.key ? 0 : -1, className: active === item.key ? 'is-active' : '', onClick: () => onChange(item.key), onKeyDown: (event) => onKeyDown(event, index), children: item.label }, item.key)) });
}
function KpiCards({ kpis, onOpen }) {
    const labels = { projectedDemand: 'Demand', projectedSupply: 'Supply', projectedGap: 'Gap', highRiskOccupations: 'Risk' };
    return (0, jsx_runtime_1.jsx)("div", { className: "fw-kpi-grid", children: kpis.map((metric, index) => {
            const gap = metric.key === 'projectedGap' && metric.value != null;
            return (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `fw-kpi fw-kpi-${labels[metric.key] ?? 'Other'}`, onClick: () => onOpen(metric), children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-kpi-mark", children: index === 0 ? (0, jsx_runtime_1.jsx)(lucide_react_1.TrendingUp, { size: 20 }) : index === 1 ? (0, jsx_runtime_1.jsx)(lucide_react_1.Users, { size: 20 }) : index === 2 ? (0, jsx_runtime_1.jsx)(lucide_react_1.BarChart3, { size: 20 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Bell, { size: 20 }) }), (0, jsx_runtime_1.jsx)("span", { className: "fw-kpi-label", children: metric.label }), (0, jsx_runtime_1.jsx)("strong", { children: metric.formattedValue ?? fmt(metric.value) }), (0, jsx_runtime_1.jsx)("span", { className: "fw-kpi-sub", children: gap ? metric.value > 0 ? 'Potential shortage' : metric.value < 0 ? 'Potential surplus' : 'Approx. balance' : `${metric.unit}${metric.period ? ` · ${metric.period}` : ''}` }), metric.notes?.length ? (0, jsx_runtime_1.jsx)("span", { className: "fw-kpi-meta", children: metric.notes[0] }) : null] }, metric.key);
        }) });
}
function ForecastChart({ series }) {
    if (!series || series.points.length < 2)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Forecast series unavailable", message: "The service has not returned enough compatible history and forecast points to draw a meaningful series.", icon: "chart" });
    const points = series.points;
    const values = points.flatMap((point) => [point.actualDemand, point.actualSupply, point.forecastDemand, point.forecastSupply, point.demandInterval?.upper, point.supplyInterval?.upper].filter((v) => typeof v === 'number' && Number.isFinite(v)));
    if (!values.length)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No plottable values", message: "This response contains no numeric demand or supply values for the selected filters.", icon: "chart" });
    const max = Math.max(1, ...values) * 1.12;
    const min = Math.min(0, ...values);
    const width = 760;
    const height = 290;
    const left = 58;
    const right = 18;
    const top = 18;
    const bottom = 42;
    const x = (index) => left + index * ((width - left - right) / (points.length - 1));
    const y = (value) => top + (height - top - bottom) * (1 - (value - min) / (max - min || 1));
    const ticks = Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4);
    const historicalDemand = points.map((point, index) => point.actualDemand != null ? `${x(index)},${y(point.actualDemand)}` : null).filter(Boolean).join(' ');
    const historicalSupply = points.map((point, index) => point.actualSupply != null ? `${x(index)},${y(point.actualSupply)}` : null).filter(Boolean).join(' ');
    const forecastStartIndex = Math.max(0, points.findIndex((point) => point.forecastDemand != null || point.forecastSupply != null));
    const forecastSegment = (key, previousKey) => {
        const start = Math.max(0, forecastStartIndex - 1);
        return points.map((point, index) => index < start ? null : (point[key] ?? (index === start ? point[previousKey] : null)) != null ? `${x(index)},${y((point[key] ?? (index === start ? point[previousKey] : null)))}` : null).filter(Boolean).join(' ');
    };
    const drawIntervals = (field) => points.map((point, index) => {
        const interval = point[field];
        const level = interval?.level ?? series.intervalLevel;
        if (!interval || level == null || !Number.isFinite(interval.lower) || !Number.isFinite(interval.upper) || interval.lower > interval.upper)
            return null;
        const barY = y(interval.upper);
        const h = Math.max(1, y(interval.lower) - barY);
        return (0, jsx_runtime_1.jsx)("rect", { x: x(index) - 7, y: barY, width: "14", height: h, className: field === 'demandInterval' ? 'fw-band-demand' : 'fw-band-supply', children: (0, jsx_runtime_1.jsx)("title", { children: `${point.year}: ${field === 'demandInterval' ? 'Demand' : 'Supply'} interval ${level}% (${fmt(interval.lower)}–${fmt(interval.upper)} ${series.unit})` }) }, `${field}-${point.year}`);
    });
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-chart-wrap", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-chart-legend", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-solid demand" }), " Historical demand"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-dashed demand" }), " Forecast demand"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-solid supply" }), " Historical supply"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-dashed supply" }), " Forecast supply"] }), series.intervalLevel != null && (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-band" }), " Uncertainty interval (", series.intervalLevel, "%)"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "fw-chart-scroll", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `Historical and forecast demand and supply; unit ${series.unit}; history through ${series.historicalThrough ?? 'not supplied'}. Forecast intervals drawn only when bounds and interval level are present.`, children: [ticks.map((tick) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: left, x2: width - right, y1: y(tick), y2: y(tick), className: "fw-chart-grid" }), (0, jsx_runtime_1.jsx)("text", { x: left - 9, y: y(tick) + 4, className: "fw-chart-axis", textAnchor: "end", children: new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(tick) })] }, tick)), series.historicalThrough != null && points.some((point) => point.year > series.historicalThrough) && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("line", { x1: x(Math.max(0, points.findIndex((point) => point.year > series.historicalThrough) - 1)), x2: x(Math.max(0, points.findIndex((point) => point.year > series.historicalThrough) - 1)), y1: top, y2: height - bottom, className: "fw-chart-divider" }), (0, jsx_runtime_1.jsx)("text", { x: x(Math.max(0, points.findIndex((point) => point.year > series.historicalThrough) - 1)) + 6, y: top + 11, className: "fw-chart-annotation", children: "Forecast \u2192" })] }), drawIntervals('demandInterval'), drawIntervals('supplyInterval'), historicalDemand && (0, jsx_runtime_1.jsx)("polyline", { points: historicalDemand, className: "fw-line-demand" }), historicalSupply && (0, jsx_runtime_1.jsx)("polyline", { points: historicalSupply, className: "fw-line-supply" }), (0, jsx_runtime_1.jsx)("polyline", { points: forecastSegment('forecastDemand', 'actualDemand'), className: "fw-line-demand fw-forecast-line" }), (0, jsx_runtime_1.jsx)("polyline", { points: forecastSegment('forecastSupply', 'actualSupply'), className: "fw-line-supply fw-forecast-line" }), points.map((point, index) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("text", { x: x(index), y: height - 18, className: "fw-chart-axis", textAnchor: "middle", children: point.period }), point.actualDemand != null && (0, jsx_runtime_1.jsx)("circle", { cx: x(index), cy: y(point.actualDemand), r: "3.5", className: "fw-point-demand", children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, ": observed demand ", fmt(point.actualDemand), " ", series.unit] }) }), point.actualSupply != null && (0, jsx_runtime_1.jsx)("circle", { cx: x(index), cy: y(point.actualSupply), r: "3.5", className: "fw-point-supply", children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, ": observed supply ", fmt(point.actualSupply), " ", series.unit] }) }), point.forecastDemand != null && (0, jsx_runtime_1.jsx)("circle", { cx: x(index), cy: y(point.forecastDemand), r: "3.5", className: "fw-point-demand", children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, ": forecast demand ", fmt(point.forecastDemand), " ", series.unit] }) }), point.forecastSupply != null && (0, jsx_runtime_1.jsx)("circle", { cx: x(index), cy: y(point.forecastSupply), r: "3.5", className: "fw-point-supply", children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, ": forecast supply ", fmt(point.forecastSupply), " ", series.unit] }) })] }, point.period)), (0, jsx_runtime_1.jsxs)("text", { x: left, y: height - 2, className: "fw-chart-axis", children: ["Unit: ", series.unit] })] }) }), (0, jsx_runtime_1.jsxs)("details", { className: "fw-chart-table", children: [(0, jsx_runtime_1.jsxs)("summary", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Table2, { size: 14 }), " View chart data as table"] }), (0, jsx_runtime_1.jsx)("div", { className: "fw-table-scroll", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Period" }), (0, jsx_runtime_1.jsx)("th", { children: "Type" }), (0, jsx_runtime_1.jsx)("th", { children: "Demand" }), (0, jsx_runtime_1.jsx)("th", { children: "Supply" }), (0, jsx_runtime_1.jsx)("th", { children: "Demand interval" }), (0, jsx_runtime_1.jsx)("th", { children: "Supply interval" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: points.map((point) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: point.period }), (0, jsx_runtime_1.jsx)("td", { children: point.year <= (series.historicalThrough ?? -Infinity) ? 'Observed' : 'Forecast' }), (0, jsx_runtime_1.jsxs)("td", { children: [fmt(point.actualDemand ?? point.forecastDemand), " ", series.unit] }), (0, jsx_runtime_1.jsxs)("td", { children: [fmt(point.actualSupply ?? point.forecastSupply), " ", series.unit] }), (0, jsx_runtime_1.jsx)("td", { children: point.demandInterval && (point.demandInterval.level ?? series.intervalLevel) != null ? `${fmt(point.demandInterval.lower)}–${fmt(point.demandInterval.upper)} (${point.demandInterval.level ?? series.intervalLevel}%)` : 'Not supplied' }), (0, jsx_runtime_1.jsx)("td", { children: point.supplyInterval && (point.supplyInterval.level ?? series.intervalLevel) != null ? `${fmt(point.supplyInterval.lower)}–${fmt(point.supplyInterval.upper)} (${point.supplyInterval.level ?? series.intervalLevel}%)` : 'Not supplied' })] }, point.period)) })] }) })] })] });
}
function SeverityBadge({ value }) { return (0, jsx_runtime_1.jsx)("span", { className: `fw-severity fw-severity-${value}`, children: alertSeverityLabel(value) }); }
function StatusBadge({ value }) { return (0, jsx_runtime_1.jsx)("span", { className: `fw-status fw-status-${value}`, children: titleCase(value) }); }
function WarningCard({ warning, onClick }) {
    return (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "fw-warning-card", onClick: onClick, children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-warning-accent" }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-warning-main", children: [(0, jsx_runtime_1.jsxs)("span", { className: "fw-warning-top", children: [(0, jsx_runtime_1.jsx)(SeverityBadge, { value: warning.severity }), (0, jsx_runtime_1.jsx)("span", { children: warning.category.replace(/-/g, ' ') })] }), (0, jsx_runtime_1.jsx)("strong", { children: warning.title }), (0, jsx_runtime_1.jsxs)("span", { className: "fw-warning-entity", children: [warning.entityLabel, warning.regionLabel ? ` · ${warning.regionLabel}` : ''] }), (0, jsx_runtime_1.jsxs)("span", { className: "fw-warning-horizon", children: ["Expected horizon ", warning.expectedHorizon.startYear, "\u2013", warning.expectedHorizon.endYear] })] }), (0, jsx_runtime_1.jsxs)("span", { className: "fw-warning-end", children: [(0, jsx_runtime_1.jsx)(StatusBadge, { value: warning.status }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 16 })] })] });
}
function TopOccupations({ matrix, filters, onSelect }) {
    const regionCode = filters.stateCode || 'IN';
    const ranked = (matrix?.cells ?? []).filter((cell) => cell.entityType === 'occupation' && cell.regionCode === regionCode && cell.gap != null && cell.gap > 0).sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity)).slice(0, 5);
    if (!matrix)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Occupation ranking unavailable", message: "The risk service did not return occupation-level shortage values." });
    if (!ranked.length)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No comparable occupation gaps", message: "No occupation shortage values were returned for this geography and filter set." });
    return (0, jsx_runtime_1.jsx)("div", { className: "fw-ranked-list", children: ranked.map((cell, index) => { const entity = matrix.entities.find((item) => item.code === cell.entityCode); return (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "fw-ranked-row", onClick: () => onSelect(cell), children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-rank-index", children: String(index + 1).padStart(2, '0') }), (0, jsx_runtime_1.jsxs)("span", { className: "fw-rank-copy", children: [(0, jsx_runtime_1.jsx)("strong", { children: entity?.label ?? cell.entityCode }), (0, jsx_runtime_1.jsxs)("small", { children: [cell.regionCode, " \u00B7 horizon ", cell.forecastYear, " \u00B7 ", cell.unit] })] }), (0, jsx_runtime_1.jsx)("span", { className: `fw-gap-value ${cell.gap > 0 ? 'is-shortage' : cell.gap < 0 ? 'is-surplus' : ''}`, children: signed(cell.gap, cell.unit) }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 14 })] }, `${cell.regionCode}-${cell.entityCode}`); }) });
}
function ReliabilitySummary({ performance, onViewDetails }) {
    if (!performance)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Reliability summary unavailable", message: "The model-performance service has not supplied evaluation or history-coverage data." });
    const coverage = performance.coverage;
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-reliability", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-reliability-top", children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-history-mark", children: (0, jsx_runtime_1.jsx)(lucide_react_1.BarChart3, { size: 19 }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "History coverage" }), (0, jsx_runtime_1.jsxs)("small", { children: [coverage.usablePeriods, " usable periods", coverage.expectedPeriods != null ? ` / ${coverage.expectedPeriods} expected` : ''] })] }), coverage.percent != null ? (0, jsx_runtime_1.jsxs)("b", { children: [Math.round(coverage.percent), "%"] }) : (0, jsx_runtime_1.jsx)("b", { children: "\u2014" })] }), coverage.percent != null && (0, jsx_runtime_1.jsx)("div", { className: "fw-progress", children: (0, jsx_runtime_1.jsx)("span", { style: { width: `${Math.max(0, Math.min(100, coverage.percent))}%` } }) }), (0, jsx_runtime_1.jsxs)("p", { children: ["Backtest window: ", performance.evaluation.startPeriod, "\u2013", performance.evaluation.endPeriod, " \u00B7 horizon ", performance.evaluation.horizon, " period(s)."] }), performance.coverage.gaps.length > 0 && (0, jsx_runtime_1.jsxs)("p", { className: "fw-reliability-warning", children: ["Coverage gaps: ", performance.coverage.gaps.join(', ')] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "fw-link-button", onClick: onViewDetails, children: ["View model details ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14 })] })] });
}
function OverviewView({ overview, series, warnings, matrix, performance, filters, onOpenWarning, onViewAllAlerts, onViewPerformance, onSelectCell }) {
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-view-stack", children: [!overview && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Overview KPI response unavailable", message: "The service did not return projected demand, supply, gap and high-risk occupation counts." }), overview && (0, jsx_runtime_1.jsx)(KpiCards, { kpis: overview.kpis, onOpen: (metric) => { if (metric.key === 'highRiskOccupations')
                    onViewAllAlerts();
                else if (metric.key === 'projectedGap')
                    onSelectCell(matrix?.cells.find((cell) => cell.gap != null && cell.gap > 0) ?? { regionCode: filters.stateCode || 'IN', entityCode: '', entityType: 'occupation', riskClass: 'no-data', demand: null, supply: null, gap: null, unit: overview?.meta.units ?? 'persons', forecastYear: series?.horizon.endYear ?? 0, provenance: 'mock', sourceLabels: [] });
                else
                    onViewPerformance(); } }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-overview-main-grid", children: [(0, jsx_runtime_1.jsxs)(Panel, { title: "Demand & supply forecast", subtitle: `History and projected values · ${series?.unit ?? overview?.meta.units ?? 'unit not supplied'}`, action: (0, jsx_runtime_1.jsxs)("span", { className: "fw-small-meta", children: ["Horizon ", series ? `${series.horizon.startYear}–${series.horizon.endYear}` : 'not supplied'] }), children: [(0, jsx_runtime_1.jsx)(ForecastChart, { series: series }), series && (0, jsx_runtime_1.jsx)(DataFootnote, { meta: series.meta, compact: true })] }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Early warning alerts", subtitle: `${warnings?.counts.total ?? warnings?.items.length ?? '—'} alert record(s) returned`, action: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "fw-link-button", onClick: onViewAllAlerts, children: ["View all ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14 })] }), className: "fw-warning-rail", children: [warnings?.items.length ? (0, jsx_runtime_1.jsx)("div", { className: "fw-warning-list", children: warnings.items.slice(0, 5).map((warning) => (0, jsx_runtime_1.jsx)(WarningCard, { warning: warning, onClick: () => onOpenWarning(warning.id) }, warning.id)) }) : (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No alerts returned", message: "No warning records match these filters, or the service response is empty." }), warnings && (0, jsx_runtime_1.jsx)(DataFootnote, { meta: warnings.meta, compact: true })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-overview-lower-grid", children: [(0, jsx_runtime_1.jsxs)(Panel, { title: "Top occupations by projected shortage", subtitle: "Signed gap only where returned demand and supply are comparable", children: [(0, jsx_runtime_1.jsx)(TopOccupations, { matrix: matrix, filters: filters, onSelect: onSelectCell }), matrix && (0, jsx_runtime_1.jsx)(DataFootnote, { meta: matrix.meta, compact: true })] }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Forecast reliability summary", subtitle: "History coverage and model evaluation evidence", action: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "fw-link-button", onClick: onViewPerformance, children: ["View details ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 14 })] }), children: [(0, jsx_runtime_1.jsx)(ReliabilitySummary, { performance: performance, onViewDetails: onViewPerformance }), performance && (0, jsx_runtime_1.jsx)(DataFootnote, { meta: performance.meta, compact: true })] })] })] });
}
function RiskMatrixTable({ matrix, selected, onSelect }) {
    if (!matrix)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Risk matrix unavailable", message: "No matrix cells were returned for this filter selection." });
    if (!matrix.cells.length || !matrix.entities.length || !matrix.regions.length)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No risk cells", message: "No comparable risk values were returned. No-data cells are distinct from low risk." });
    return (0, jsx_runtime_1.jsx)("div", { className: "fw-table-scroll fw-matrix-scroll", children: (0, jsx_runtime_1.jsxs)("table", { className: "fw-matrix-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Region" }), matrix.entities.map((entity) => (0, jsx_runtime_1.jsx)("th", { scope: "col", children: entity.label }, entity.code))] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: matrix.regions.map((region) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("th", { scope: "row", children: [region.label, (0, jsx_runtime_1.jsx)("small", { children: region.code })] }), matrix.entities.map((entity) => {
                                const cell = matrix.cells.find((item) => item.regionCode === region.code && item.entityCode === entity.code);
                                if (!cell)
                                    return (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: "fw-matrix-missing", children: "No record" }) }, entity.code);
                                const isSelected = selected?.regionCode === cell.regionCode && selected.entityCode === cell.entityCode;
                                return (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `fw-matrix-cell risk-${cell.riskClass} ${isSelected ? 'is-selected' : ''}`, onClick: () => onSelect(cell), "aria-label": `${region.label}, ${entity.label}: ${cell.gap == null ? 'gap unavailable' : `gap ${signed(cell.gap, cell.unit)}`}, ${riskClassLabel[cell.riskClass]}`, children: [(0, jsx_runtime_1.jsx)("strong", { children: cell.gap == null ? '—' : signed(cell.gap) }), (0, jsx_runtime_1.jsx)("small", { children: riskClassLabel[cell.riskClass] })] }) }, entity.code);
                            })] }, region.code)) })] }) });
}
function GeoJSONRiskMap({ mapData, selectedRegion, onSelectRegion }) {
    const features = mapData?.geometry?.features ?? [];
    const codeKey = mapData?.canonicalCodeProperty;
    const verified = Boolean(features.length && mapData?.geometryVersion && mapData?.sourceLicense && codeKey);
    if (!mapData || !verified)
        return (0, jsx_runtime_1.jsxs)("div", { className: "fw-map-unavailable", children: [(0, jsx_runtime_1.jsx)("div", { className: "fw-map-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.MapPin, { size: 23 }) }), (0, jsx_runtime_1.jsx)("strong", { children: "Regional map unavailable" }), (0, jsx_runtime_1.jsx)("p", { children: mapData?.geometryUnavailableReason ?? 'The service has not supplied verified, versioned and licensed state/UT GeoJSON joined by canonical region codes.' }), (0, jsx_runtime_1.jsx)("span", { children: "Showing the regional risk matrix and ranked values instead. Decorative image assets are not used as data layers." })] });
    const coords = [];
    const featureRings = (feature) => {
        if (!feature.geometry)
            return [];
        if (feature.geometry.type === 'Polygon')
            return feature.geometry.coordinates;
        return feature.geometry.coordinates.flatMap((polygon) => polygon);
    };
    features.forEach((feature) => featureRings(feature).forEach((ring) => ring.forEach((point) => { if (point.length >= 2)
        coords.push(point); })));
    if (!coords.length)
        return (0, jsx_runtime_1.jsxs)("div", { className: "fw-map-unavailable", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Geometry could not be projected" }), (0, jsx_runtime_1.jsx)("p", { children: "GeoJSON was supplied but no valid coordinate ring was found. Use the accessible regional table." })] });
    const xs = coords.map((point) => point[0]);
    const ys = coords.map((point) => point[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const width = 380, height = 440, pad = 8;
    const project = (point) => `${pad + ((point[0] - minX) / Math.max(1e-9, maxX - minX)) * (width - pad * 2)},${height - pad - ((point[1] - minY) / Math.max(1e-9, maxY - minY)) * (height - pad * 2)}`;
    const shapeFor = (feature) => featureRings(feature).map((ring) => ring.map(project).join(' ')).join(' ');
    const getCode = (feature) => String(feature.properties?.[codeKey] ?? feature.id ?? '');
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-map-real-wrap", children: [(0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${width} ${height}`, className: "fw-map-real", role: "img", "aria-label": `Forecast risk map generated from GeoJSON version ${mapData.geometryVersion}; join property ${codeKey}; licensed under ${mapData.sourceLicense}. Select a region to inspect.`, children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("pattern", { id: "fw-map-no-data", width: "6", height: "6", patternUnits: "userSpaceOnUse", children: (0, jsx_runtime_1.jsx)("path", { d: "M0 6L6 0", stroke: "#B9B6AA", strokeWidth: "1" }) }) }), features.map((feature, index) => {
                        const code = getCode(feature);
                        const risk = mapData.valuesByStateCode[code];
                        const label = String(feature.properties?.name ?? feature.properties?.NAME_1 ?? code);
                        return (0, jsx_runtime_1.jsx)("path", { d: shapeFor(feature), className: `fw-map-feature ${risk ? `risk-${risk.riskClass}` : 'risk-no-data'} ${selectedRegion === code ? 'is-selected' : ''}`, fill: risk ? undefined : 'url(#fw-map-no-data)', role: "button", tabIndex: 0, "aria-label": `${label}: ${risk ? `${riskClassLabel[risk.riskClass]}, ${fmt(risk.value)} ${mapData.unit}` : 'no joined risk data'}`, onClick: () => onSelectRegion(code), onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onSelectRegion(code);
                            } }, children: (0, jsx_runtime_1.jsx)("title", { children: `${label} (${code}) · ${risk ? `${riskClassLabel[risk.riskClass]} · ${fmt(risk.value)} ${mapData.unit}` : 'No data'}` }) }, `${code}-${index}`);
                    })] }), (0, jsx_runtime_1.jsxs)("p", { className: "fw-map-attribution", children: ["Geometry ", mapData.geometryVersion, " \u00B7 ", mapData.sourceLicense, " \u00B7 keyed by ", codeKey] })] });
}
function RiskView({ matrix, mapData, grouping, onGroupingChange, selectedCell, onSelectCell, onSelectRegion, riskDetail, detailLoading }) {
    const selectedEntity = matrix?.entities.find((item) => item.code === selectedCell?.entityCode);
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-view-stack", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-view-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "fw-eyebrow", children: "Detect \u00B7 Prioritise" }), (0, jsx_runtime_1.jsx)("h2", { children: "Risk Radar" }), (0, jsx_runtime_1.jsx)("p", { children: "Inspect forecast risk clusters by geography and the entity grouping returned by the service." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "fw-inline-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Group matrix by" }), (0, jsx_runtime_1.jsxs)("select", { value: grouping, onChange: (event) => onGroupingChange(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "occupation", children: "Occupation" }), (0, jsx_runtime_1.jsx)("option", { value: "sector", children: "Sector" }), (0, jsx_runtime_1.jsx)("option", { value: "skill", children: "Skill" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-risk-layout", children: [(0, jsx_runtime_1.jsxs)(Panel, { title: "Regional risk matrix", subtitle: "Keyboard-accessible data table \u00B7 select a cell to inspect its evidence", children: [(0, jsx_runtime_1.jsx)(RiskMatrixTable, { matrix: matrix, selected: selectedCell, onSelect: onSelectCell }), (0, jsx_runtime_1.jsx)("div", { className: "fw-risk-legend", children: (matrix?.legend ?? []).map((item) => (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: `risk-swatch risk-${item.riskClass}` }), item.label, item.min != null || item.max != null ? (0, jsx_runtime_1.jsxs)("small", { children: [item.min != null ? `≥ ${item.min}` : '', item.min != null && item.max != null ? ' · ' : '', item.max != null ? `≤ ${item.max}` : ''] }) : null] }, item.riskClass)) }), (0, jsx_runtime_1.jsx)(DataFootnote, { meta: matrix?.meta, compact: true })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-risk-side", children: [(0, jsx_runtime_1.jsx)(Panel, { title: "State / UT map", subtitle: "Only verified, versioned geometry can be shaded", children: (0, jsx_runtime_1.jsx)(GeoJSONRiskMap, { mapData: mapData, selectedRegion: selectedCell?.regionCode ?? '', onSelectRegion: onSelectRegion }) }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Selected risk detail", subtitle: selectedCell ? `${selectedCell.regionCode} · ${selectedEntity?.label ?? selectedCell.entityCode}` : 'Select a matrix cell', children: [detailLoading && (0, jsx_runtime_1.jsxs)("div", { className: "fw-inline-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: "fw-spin" }), " Loading detail evidence\u2026"] }), !detailLoading && !riskDetail && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No cell selected", message: "Choose a matrix cell to request details, evidence, assumptions and source coverage." }), riskDetail && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-detail-stat-grid", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Demand" }), (0, jsx_runtime_1.jsxs)("strong", { children: [fmt(riskDetail.cell.demand), " ", riskDetail.cell.unit] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Supply" }), (0, jsx_runtime_1.jsxs)("strong", { children: [fmt(riskDetail.cell.supply), " ", riskDetail.cell.unit] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Signed gap" }), (0, jsx_runtime_1.jsx)("strong", { children: signed(riskDetail.cell.gap, riskDetail.cell.unit) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Forecast year" }), (0, jsx_runtime_1.jsx)("strong", { children: riskDetail.cell.forecastYear })] })] }), (0, jsx_runtime_1.jsxs)("p", { className: "fw-detail-classification", children: [(0, jsx_runtime_1.jsx)("span", { className: `risk-swatch risk-${riskDetail.cell.riskClass}` }), riskClassLabel[riskDetail.cell.riskClass], " \u00B7 ", riskDetail.cell.ruleLabel ?? riskDetail.cell.ruleId ?? 'Rule not supplied'] }), (0, jsx_runtime_1.jsx)("h3", { children: "Evidence" }), (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: riskDetail.evidence.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) }), (0, jsx_runtime_1.jsx)("h3", { children: "Assumptions & limitations" }), (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: riskDetail.assumptions.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) }), (0, jsx_runtime_1.jsxs)("p", { className: "fw-small-meta", children: [metaSource(riskDetail.meta), " \u00B7 ", riskDetail.cell.sourceLabels.join(', ') || 'Source labels not supplied'] })] })] })] })] }), (0, jsx_runtime_1.jsx)(Panel, { title: "Regional ranking fallback", subtitle: "Use this list when licensed geometry is unavailable", children: (0, jsx_runtime_1.jsx)("div", { className: "fw-regional-ranking", children: (matrix?.regions ?? []).map((region) => { const cell = matrix?.cells.find((item) => item.regionCode === region.code && item.entityCode === selectedCell?.entityCode) ?? matrix?.cells.find((item) => item.regionCode === region.code); return (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => cell && onSelectCell(cell), className: selectedCell?.regionCode === region.code ? 'is-selected' : '', children: [(0, jsx_runtime_1.jsxs)("span", { children: [region.label, (0, jsx_runtime_1.jsx)("small", { children: region.code })] }), (0, jsx_runtime_1.jsx)("strong", { children: cell ? signed(cell.gap, cell.unit) : 'No record' }), (0, jsx_runtime_1.jsx)("span", { className: `fw-status risk-label-${cell?.riskClass ?? 'no-data'}`, children: cell ? riskClassLabel[cell.riskClass] : 'No data' })] }, region.code); }) }) })] });
}
function ScenarioView({ options, comparison, comparing, error, selectedScenarios, onToggleScenario, assumptionValues, onAssumptionChange, onCompare, onReset }) {
    const chartWidth = 720, chartHeight = 285, pad = { left: 54, right: 20, top: 20, bottom: 40 };
    const values = (comparison?.scenarios ?? []).flatMap((scenario) => scenario.points.map((point) => point.forecastDemand != null && point.forecastSupply != null ? point.forecastDemand - point.forecastSupply : null).filter((value) => value != null && Number.isFinite(value)));
    const min = Math.min(0, ...values), max = Math.max(1, ...values);
    const allPoints = comparison?.scenarios.flatMap((scenario) => scenario.points) ?? [];
    const years = [...new Set(allPoints.map((point) => point.year))].sort((a, b) => a - b);
    const x = (year) => pad.left + years.indexOf(year) * ((chartWidth - pad.left - pad.right) / Math.max(1, years.length - 1));
    const y = (value) => pad.top + (chartHeight - pad.top - pad.bottom) * (1 - (value - min) / (max - min || 1));
    const colors = { baseline: 'var(--navy)', 'higher-growth': 'var(--orange)', 'lower-growth': 'var(--teal)' };
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-view-stack", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-view-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "fw-eyebrow", children: "Compare \u00B7 Investigate" }), (0, jsx_runtime_1.jsx)("h2", { children: "Scenario Analysis" }), (0, jsx_runtime_1.jsx)("p", { children: "Compare service-defined assumptions. Conditional scenarios are not guaranteed predictions." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-scenario-actions", children: [(0, jsx_runtime_1.jsxs)("button", { className: "fw-button", type: "button", onClick: onReset, disabled: comparing, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 14 }), " Reset to baseline"] }), (0, jsx_runtime_1.jsxs)("button", { className: "fw-button fw-button-primary", type: "button", onClick: onCompare, disabled: comparing || selectedScenarios.length === 0, children: [comparing ? (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 14, className: "fw-spin" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.BarChart3, { size: 14 }), " Compare scenarios"] })] })] }), error && (0, jsx_runtime_1.jsx)(ErrorPanel, { message: error }), (0, jsx_runtime_1.jsx)(Panel, { title: "Scenario selector", subtitle: "Choose one or more scenarios supplied by the configured service", children: (0, jsx_runtime_1.jsxs)("div", { className: "fw-scenario-choice-list", children: [(options?.scenarios ?? []).map((scenario) => (0, jsx_runtime_1.jsxs)("label", { className: `fw-scenario-choice ${selectedScenarios.includes(scenario.id) ? 'is-selected' : ''}`, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: selectedScenarios.includes(scenario.id), onChange: () => onToggleScenario(scenario.id) }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: scenario.label }), (0, jsx_runtime_1.jsx)("small", { children: scenario.description ?? 'Service-defined conditional path.' })] }), scenario.isDefault && (0, jsx_runtime_1.jsx)("em", { children: "Default" })] }, scenario.id)), !options?.scenarios.length && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Scenario options unavailable", message: "The service did not return any supported scenario definitions." })] }) }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Projected gap by scenario", subtitle: "Gap = projected demand \u2212 projected supply, only when both returned values share compatible scope and units", children: [comparing && (0, jsx_runtime_1.jsxs)("div", { className: "fw-inline-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: "fw-spin" }), " Calculating scenario comparison\u2026"] }), !comparison && !comparing && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Run a comparison", message: "Select the scenario paths above and choose Compare. No scenario curve is generated in the UI before the adapter returns results.", icon: "chart" }), comparison && values.length > 0 && (0, jsx_runtime_1.jsx)("div", { className: "fw-chart-scroll", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${chartWidth} ${chartHeight}`, role: "img", "aria-label": "Conditional scenario comparison of projected demand minus supply by year. Values are from the selected adapter.", children: [Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4).map((value) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: pad.left, x2: chartWidth - pad.right, y1: y(value), y2: y(value), className: "fw-chart-grid" }), (0, jsx_runtime_1.jsx)("text", { x: pad.left - 8, y: y(value) + 4, className: "fw-chart-axis", textAnchor: "end", children: new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value) })] }, value)), years.map((year) => (0, jsx_runtime_1.jsx)("text", { x: x(year), y: chartHeight - 15, className: "fw-chart-axis", textAnchor: "middle", children: year }, year)), comparison.scenarios.map((scenario) => { const points = scenario.points.filter((point) => point.forecastDemand != null && point.forecastSupply != null).map((point) => `${x(point.year)},${y(point.forecastDemand - point.forecastSupply)}`).join(' '); if (!points)
                                    return null; return (0, jsx_runtime_1.jsx)("polyline", { points: points, fill: "none", stroke: colors[scenario.id] ?? 'var(--navy)', strokeWidth: "3", strokeLinejoin: "round", strokeLinecap: "round", children: (0, jsx_runtime_1.jsxs)("title", { children: [scenario.label, ": conditional projected gap"] }) }, scenario.id); })] }) }), comparison && values.length === 0 && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Comparable scenario gaps unavailable", message: "Scenario results did not contain compatible demand and supply values for the selected year points.", icon: "chart" }), comparison && (0, jsx_runtime_1.jsx)("div", { className: "fw-scenario-legend", children: comparison.scenarios.map((scenario) => (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { style: { background: colors[scenario.id] ?? 'var(--navy)' } }), scenario.label] }, scenario.id)) }), comparison && (0, jsx_runtime_1.jsx)("div", { className: "fw-table-scroll", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Scenario" }), (0, jsx_runtime_1.jsx)("th", { children: "Year" }), (0, jsx_runtime_1.jsx)("th", { children: "Projected demand" }), (0, jsx_runtime_1.jsx)("th", { children: "Projected supply" }), (0, jsx_runtime_1.jsx)("th", { children: "Conditional gap" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: comparison.scenarios.flatMap((scenario) => scenario.points.map((point) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: scenario.label }), (0, jsx_runtime_1.jsx)("td", { children: point.year }), (0, jsx_runtime_1.jsx)("td", { children: fmt(point.forecastDemand) }), (0, jsx_runtime_1.jsx)("td", { children: fmt(point.forecastSupply) }), (0, jsx_runtime_1.jsx)("td", { children: point.forecastDemand != null && point.forecastSupply != null ? signed(point.forecastDemand - point.forecastSupply, comparison.meta.units ?? 'persons') : 'Not comparable' })] }, `${scenario.id}-${point.year}`))) })] }) })] }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Returned assumptions", subtitle: "Only assumptions explicitly returned by the service are shown", children: [(0, jsx_runtime_1.jsx)("div", { className: "fw-assumptions-table", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Parameter" }), (0, jsx_runtime_1.jsx)("th", { children: "Value" }), (0, jsx_runtime_1.jsx)("th", { children: "Unit" }), (0, jsx_runtime_1.jsx)("th", { children: "Source / owner" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: (comparison?.assumptions ?? options?.assumptions ?? []).map((assumption) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: assumption.label }), (0, jsx_runtime_1.jsx)("td", { children: assumption.editable && typeof assumption.value === 'number' ? (0, jsx_runtime_1.jsx)("input", { className: "fw-assumption-input", type: "number", "aria-label": assumption.label, value: assumptionValues[assumption.key] ?? assumption.value, min: assumption.min, max: assumption.max, step: assumption.step ?? 'any', onChange: (event) => { const next = event.currentTarget.valueAsNumber; if (Number.isFinite(next))
                                                        onAssumptionChange(assumption.key, next); } }) : String(assumption.value) }), (0, jsx_runtime_1.jsx)("td", { children: assumption.unit }), (0, jsx_runtime_1.jsxs)("td", { children: [assumption.source ?? 'Not supplied', assumption.owner ? ` · ${assumption.owner}` : '', assumption.editable && (0, jsx_runtime_1.jsx)("small", { children: "Editable according to service metadata. Bounds are enforced before comparison." })] })] }, assumption.key)) })] }) }), (0, jsx_runtime_1.jsx)(DataFootnote, { meta: comparison?.meta ?? options?.meta, compact: true })] })] });
}
function PerformanceChart({ performance }) {
    const points = performance.series;
    if (!points.length)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Backtest series unavailable", message: "No actual-versus-predicted points were returned by the evaluation service.", icon: "chart" });
    const values = points.flatMap((point) => [point.actual, point.predicted, point.lower, point.upper].filter((v) => typeof v === 'number' && Number.isFinite(v)));
    const min = Math.min(...values) * 0.96, max = Math.max(...values) * 1.04;
    const w = 640, h = 250, l = 58, r = 18, t = 16, b = 38;
    const x = (index) => l + index * ((w - l - r) / Math.max(1, points.length - 1));
    const y = (value) => t + (h - t - b) * (1 - (value - min) / (max - min || 1));
    const line = (key) => points.map((point, index) => `${x(index)},${y(point[key])}`).join(' ');
    return (0, jsx_runtime_1.jsx)("div", { className: "fw-chart-scroll", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": `Backtest actual and predicted values from ${performance.evaluation.startPeriod} through ${performance.evaluation.endPeriod}; horizon ${performance.evaluation.horizon}.`, children: [Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4).map((value) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: l, x2: w - r, y1: y(value), y2: y(value), className: "fw-chart-grid" }), (0, jsx_runtime_1.jsx)("text", { x: l - 8, y: y(value) + 4, className: "fw-chart-axis", textAnchor: "end", children: new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(value) })] }, value)), points.some((p) => p.lower != null && p.upper != null) && points.map((point, index) => point.lower != null && point.upper != null ? (0, jsx_runtime_1.jsx)("rect", { className: "fw-band-demand", x: x(index) - 9, y: y(point.upper), width: "18", height: Math.max(1, y(point.lower) - y(point.upper)), children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, " interval ", fmt(point.lower), "\u2013", fmt(point.upper)] }) }, `i-${point.period}`) : null), (0, jsx_runtime_1.jsx)("polyline", { points: line('actual'), className: "fw-line-demand" }), (0, jsx_runtime_1.jsx)("polyline", { points: line('predicted'), className: "fw-line-supply" }), points.map((point, index) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("circle", { cx: x(index), cy: y(point.actual), r: "4", className: "fw-point-demand", children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, ": actual ", fmt(point.actual)] }) }), (0, jsx_runtime_1.jsx)("circle", { cx: x(index), cy: y(point.predicted), r: "4", className: "fw-point-supply", children: (0, jsx_runtime_1.jsxs)("title", { children: [point.period, ": predicted ", fmt(point.predicted)] }) }), (0, jsx_runtime_1.jsx)("text", { x: x(index), y: h - 14, className: "fw-chart-axis", textAnchor: "middle", children: point.period })] }, point.period))] }) });
}
function PerformanceView({ performance }) {
    if (!performance)
        return (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Model evaluation unavailable", message: "The model-performance service has not returned backtest metrics and history coverage." });
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-view-stack", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-view-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "fw-eyebrow", children: "Verify \u00B7 Calibrate" }), (0, jsx_runtime_1.jsx)("h2", { children: "Model Performance" }), (0, jsx_runtime_1.jsx)("p", { children: "Historical evaluation evidence, data coverage and known limitations." })] }), (0, jsx_runtime_1.jsxs)("span", { className: "fw-small-meta", children: ["Evaluated through ", performance.evaluation.evaluatedThrough ?? performance.evaluation.endPeriod ?? 'not supplied'] })] }), performance.forecastUnavailableReason && (0, jsx_runtime_1.jsxs)("div", { className: "fw-info-callout", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 17 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Eligibility note" }), (0, jsx_runtime_1.jsx)("p", { children: performance.forecastUnavailableReason })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-performance-grid", children: [(0, jsx_runtime_1.jsxs)(Panel, { title: "Actual vs predicted", subtitle: `${performance.evaluation.startPeriod}–${performance.evaluation.endPeriod} · horizon ${performance.evaluation.horizon}`, children: [performance.series.length ? (0, jsx_runtime_1.jsx)(PerformanceChart, { performance: performance }) : (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "Backtest not available", message: "No evaluation points were returned.", icon: "chart" }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-chart-legend", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-solid demand" }), " Actual"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { className: "fw-legend-solid supply" }), " Predicted"] })] })] }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Evaluation coverage", subtitle: "History counts returned by the evaluation service", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-coverage-display", children: [(0, jsx_runtime_1.jsx)("strong", { children: performance.coverage.usablePeriods }), (0, jsx_runtime_1.jsx)("span", { children: "usable periods" }), (0, jsx_runtime_1.jsx)("div", { className: "fw-progress", children: (0, jsx_runtime_1.jsx)("span", { style: { width: `${Math.max(0, Math.min(100, performance.coverage.percent ?? 0))}%` } }) }), (0, jsx_runtime_1.jsxs)("p", { children: [performance.coverage.expectedPeriods != null ? `${performance.coverage.usablePeriods} of ${performance.coverage.expectedPeriods} expected periods` : 'Expected period count not supplied', performance.coverage.percent != null ? ` · ${Math.round(performance.coverage.percent)}%` : ''] })] }), performance.coverage.gaps.length > 0 && (0, jsx_runtime_1.jsxs)("div", { className: "fw-gap-periods", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Missing periods" }), (0, jsx_runtime_1.jsx)("span", { children: performance.coverage.gaps.join(', ') })] }), (0, jsx_runtime_1.jsxs)("dl", { className: "fw-model-meta", children: [(0, jsx_runtime_1.jsx)("dt", { children: "Model / version" }), (0, jsx_runtime_1.jsx)("dd", { children: performance.evaluation.modelVersion ?? 'Not supplied' }), (0, jsx_runtime_1.jsx)("dt", { children: "Baseline" }), (0, jsx_runtime_1.jsx)("dd", { children: performance.evaluation.baseline ?? 'Not supplied' }), (0, jsx_runtime_1.jsx)("dt", { children: "Evaluation scope" }), (0, jsx_runtime_1.jsx)("dd", { children: performance.evaluation.scope ?? 'Not supplied' }), (0, jsx_runtime_1.jsx)("dt", { children: "Evaluated through" }), (0, jsx_runtime_1.jsx)("dd", { children: performance.evaluation.evaluatedThrough ?? performance.evaluation.endPeriod })] })] })] }), (0, jsx_runtime_1.jsx)(Panel, { title: "Returned model metrics", subtitle: "Only metrics supplied by the service are displayed; no confidence score is inferred", children: (0, jsx_runtime_1.jsxs)("div", { className: "fw-metric-grid", children: [performance.metrics.map((metric) => (0, jsx_runtime_1.jsxs)("article", { className: "fw-metric-card", children: [(0, jsx_runtime_1.jsx)("span", { children: metric.label }), (0, jsx_runtime_1.jsx)("strong", { children: metric.value == null ? 'Not available' : `${fmt(metric.value)} ${metric.unit}` }), (0, jsx_runtime_1.jsx)("p", { children: metric.definition }), metric.suitabilityNote && (0, jsx_runtime_1.jsx)("small", { children: metric.suitabilityNote })] }, metric.key)), !performance.metrics.length && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No eligible metrics", message: "The service returned no model metrics for this series or the history eligibility rule was not met." })] }) }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Methodology and limitations", subtitle: "Backtest scores describe historical error; they do not guarantee future accuracy", children: [(0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: performance.limitations.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) }), performance.meta.coverage?.notes?.length ? (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: performance.meta.coverage.notes.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) }) : null, (0, jsx_runtime_1.jsx)(DataFootnote, { meta: performance.meta })] })] });
}
function AlertManagementView({ response, queryDraft, onQueryDraftChange, onSearch, status, onStatusChange, severity, onSeverityChange, page, pageSize, onPage, onOpenAlert, onRetry, loading, error }) {
    const pages = Math.max(1, Math.ceil((response?.total ?? 0) / pageSize));
    return (0, jsx_runtime_1.jsxs)("div", { className: "fw-view-stack", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-view-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "fw-eyebrow", children: "Act \u00B7 Track" }), (0, jsx_runtime_1.jsx)("h2", { children: "Alert Management" }), (0, jsx_runtime_1.jsx)("p", { children: "Search warning records, inspect the evidence, and update workflow state when the service permits it." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-alert-total", children: [(0, jsx_runtime_1.jsx)("strong", { children: response?.total ?? '—' }), (0, jsx_runtime_1.jsx)("span", { children: "matching alerts" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "fw-alert-count-grid", children: [{ key: 'critical', label: 'Critical' }, { key: 'high', label: 'High' }, { key: 'new', label: 'New' }, { key: 'under-review', label: 'Under review' }, { key: 'acknowledged', label: 'Acknowledged' }, { key: 'resolved', label: 'Resolved' }].map((item) => (0, jsx_runtime_1.jsxs)("div", { className: "fw-alert-count", children: [(0, jsx_runtime_1.jsx)("span", { children: item.label }), (0, jsx_runtime_1.jsx)("strong", { children: response?.counts[item.key] ?? '—' })] }, item.key)) }), (0, jsx_runtime_1.jsxs)(Panel, { title: "Warning register", subtitle: "Expected risk horizon and workflow status are separate fields", children: [(0, jsx_runtime_1.jsxs)("form", { className: "fw-alert-filters", onSubmit: onSearch, children: [(0, jsx_runtime_1.jsxs)("label", { className: "fw-search-field", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 16 }), (0, jsx_runtime_1.jsx)("input", { value: queryDraft, onChange: (event) => onQueryDraftChange(event.target.value), placeholder: "Search ID, occupation, region or summary", "aria-label": "Search alerts" })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Status" }), (0, jsx_runtime_1.jsxs)("select", { value: status, onChange: (event) => onStatusChange(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "All statuses" }), (0, jsx_runtime_1.jsx)("option", { value: "new", children: "New" }), (0, jsx_runtime_1.jsx)("option", { value: "under-review", children: "Under review" }), (0, jsx_runtime_1.jsx)("option", { value: "acknowledged", children: "Acknowledged" }), (0, jsx_runtime_1.jsx)("option", { value: "resolved", children: "Resolved" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Severity" }), (0, jsx_runtime_1.jsxs)("select", { value: severity, onChange: (event) => onSeverityChange(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "All severities" }), (0, jsx_runtime_1.jsx)("option", { value: "critical", children: "Critical" }), (0, jsx_runtime_1.jsx)("option", { value: "high", children: "High" }), (0, jsx_runtime_1.jsx)("option", { value: "moderate", children: "Moderate" }), (0, jsx_runtime_1.jsx)("option", { value: "low", children: "Low" }), (0, jsx_runtime_1.jsx)("option", { value: "information", children: "Information" })] })] }), (0, jsx_runtime_1.jsxs)("button", { className: "fw-button fw-button-primary", type: "submit", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 14 }), " Search"] })] }), error && (0, jsx_runtime_1.jsx)(ErrorPanel, { message: error, onRetry: onRetry }), (0, jsx_runtime_1.jsx)("div", { className: "fw-table-scroll", children: (0, jsx_runtime_1.jsxs)("table", { className: "fw-alert-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Alert / entity" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Severity" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Region" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Expected horizon" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Rule / trigger" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Status" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Owner" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Updated" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Action" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: response?.items.map((alert) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: alert.title }), (0, jsx_runtime_1.jsxs)("small", { children: [alert.id, " \u00B7 ", alert.entityLabel] })] }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(SeverityBadge, { value: alert.severity }) }), (0, jsx_runtime_1.jsx)("td", { children: alert.regionLabel ?? alert.regionCode ?? 'Not supplied' }), (0, jsx_runtime_1.jsxs)("td", { children: [alert.expectedHorizon.startYear, "\u2013", alert.expectedHorizon.endYear] }), (0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: alert.rule.label }), (0, jsx_runtime_1.jsx)("small", { children: alert.rule.thresholdDescription })] }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(StatusBadge, { value: alert.status }) }), (0, jsx_runtime_1.jsx)("td", { children: alert.assigneeId ?? 'Unassigned' }), (0, jsx_runtime_1.jsx)("td", { children: niceDate(alert.updatedAt) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("button", { className: "fw-button fw-button-small", type: "button", onClick: () => onOpenAlert(alert.id), children: ["Review ", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 13 })] }) })] }, alert.id)) })] }) }), loading && (0, jsx_runtime_1.jsxs)("div", { className: "fw-inline-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: "fw-spin" }), " Loading alert register\u2026"] }), !loading && !response?.items.length && (0, jsx_runtime_1.jsx)(EmptyPanel, { title: "No alerts match this view", message: "No matching warnings were returned. Clear the search or broaden the filters; this is not the same as a failed service request." }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-pagination", children: [(0, jsx_runtime_1.jsxs)("span", { children: [response?.total ? `Showing ${page * pageSize + 1}–${Math.min(page * pageSize + pageSize, response.total)} of ${response.total}` : 'No rows to show', " \u00B7 Page ", Math.min(page + 1, pages), " of ", pages] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { className: "fw-button", type: "button", disabled: page <= 0 || loading, onClick: () => onPage(page - 1), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { size: 14 }), " Previous"] }), (0, jsx_runtime_1.jsxs)("button", { className: "fw-button", type: "button", disabled: page >= pages - 1 || loading, onClick: () => onPage(page + 1), children: ["Next ", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 14 })] })] })] }), response && (0, jsx_runtime_1.jsx)(DataFootnote, { meta: response.meta, compact: true })] })] });
}
function AlertDrawer({ response, loading, error, busyAction, actionError, note, onNoteChange, assignee, onAssigneeChange, onClose, onAcknowledge, onStatusChange, onAssign, onAddNote }) {
    if (!response && !loading && !error)
        return null;
    const warning = response?.alert;
    return (0, jsx_runtime_1.jsx)("div", { className: "fw-drawer-scrim", role: "presentation", onMouseDown: (event) => { if (event.target === event.currentTarget)
            onClose(); }, children: (0, jsx_runtime_1.jsxs)("aside", { className: "fw-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "fw-drawer-title", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-drawer-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-eyebrow", children: "Warning detail" }), (0, jsx_runtime_1.jsx)("h2", { id: "fw-drawer-title", children: warning?.title ?? 'Warning details' }), warning && (0, jsx_runtime_1.jsxs)("small", { children: [warning.id, " \u00B7 ", warning.entityLabel] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "fw-icon-button", onClick: onClose, "aria-label": "Close warning detail", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 18 }) })] }), loading && (0, jsx_runtime_1.jsxs)("div", { className: "fw-inline-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16, className: "fw-spin" }), " Loading warning evidence\u2026"] }), error && (0, jsx_runtime_1.jsx)(ErrorPanel, { message: error }), actionError && (0, jsx_runtime_1.jsxs)("div", { className: "fw-error-panel", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsx)("p", { children: actionError })] }), response && warning && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-drawer-badges", children: [(0, jsx_runtime_1.jsx)(SeverityBadge, { value: warning.severity }), (0, jsx_runtime_1.jsx)(StatusBadge, { value: warning.status }), (0, jsx_runtime_1.jsx)(ProvenanceBadge, { meta: response.meta })] }), (0, jsx_runtime_1.jsx)("p", { className: "fw-alert-summary", children: warning.summary }), (0, jsx_runtime_1.jsxs)("dl", { className: "fw-alert-facts", children: [(0, jsx_runtime_1.jsx)("dt", { children: "Entity" }), (0, jsx_runtime_1.jsxs)("dd", { children: [warning.entityLabel, " (", warning.entityCode, ")"] }), (0, jsx_runtime_1.jsx)("dt", { children: "Region" }), (0, jsx_runtime_1.jsx)("dd", { children: warning.regionLabel ?? warning.regionCode ?? 'Not supplied' }), (0, jsx_runtime_1.jsx)("dt", { children: "Expected risk horizon" }), (0, jsx_runtime_1.jsxs)("dd", { children: [warning.expectedHorizon.startYear, "\u2013", warning.expectedHorizon.endYear] }), (0, jsx_runtime_1.jsx)("dt", { children: "Rule" }), (0, jsx_runtime_1.jsxs)("dd", { children: [warning.rule.id, " \u00B7 ", warning.rule.label, (0, jsx_runtime_1.jsx)("small", { children: warning.rule.thresholdDescription })] }), (0, jsx_runtime_1.jsx)("dt", { children: "Created" }), (0, jsx_runtime_1.jsx)("dd", { children: niceDate(warning.createdAt) }), (0, jsx_runtime_1.jsx)("dt", { children: "Workflow updated" }), (0, jsx_runtime_1.jsx)("dd", { children: niceDate(warning.updatedAt) }), (0, jsx_runtime_1.jsx)("dt", { children: "Sources" }), (0, jsx_runtime_1.jsx)("dd", { children: warning.sourceLabels.join(', ') || 'Not supplied' })] }), (0, jsx_runtime_1.jsxs)("section", { className: "fw-drawer-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Key factors" }), response.factors.length ? (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: response.factors.map((item) => (0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsxs)("strong", { children: [item.label, ":"] }), " ", item.explanation, item.value != null ? ` (${fmt(item.value)} ${item.unit ?? ''})` : ''] }, item.label)) }) : (0, jsx_runtime_1.jsx)("p", { children: "No factors were supplied." })] }), (0, jsx_runtime_1.jsxs)("section", { className: "fw-drawer-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Data evidence" }), (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: response.evidence.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "fw-drawer-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Assumptions & limits" }), (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: response.assumptions.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "fw-drawer-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Timeline" }), (0, jsx_runtime_1.jsx)("div", { className: "fw-timeline", children: response.timeline.map((item, index) => (0, jsx_runtime_1.jsxs)("div", { className: `fw-timeline-item timeline-${item.kind ?? 'workflow'}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-timeline-dot" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.event }), (0, jsx_runtime_1.jsxs)("small", { children: [niceDate(item.at), item.actor ? ` · ${item.actor}` : ''] })] })] }, `${item.at}-${index}`)) }), (0, jsx_runtime_1.jsx)("p", { className: "fw-small-meta", children: "The expected risk horizon above is the forecast's time horizon. This timeline records workflow/review events separately." })] }), (0, jsx_runtime_1.jsxs)("section", { className: "fw-drawer-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Recommended review actions" }), (0, jsx_runtime_1.jsx)("ul", { className: "fw-bullet-list", children: (response.recommendations ?? []).map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "fw-drawer-actions", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Workflow actions" }), (0, jsx_runtime_1.jsx)("p", { children: "Actions are applied only after the configured adapter confirms a response. A live service may enforce role permissions." }), (0, jsx_runtime_1.jsxs)("button", { className: "fw-button fw-button-primary", type: "button", disabled: Boolean(busyAction) || warning.status === 'acknowledged' || warning.status === 'resolved', onClick: onAcknowledge, children: [busyAction === 'acknowledge' ? (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 14, className: "fw-spin" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 14 }), " Acknowledge warning"] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Assign owner" }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-inline-action", children: [(0, jsx_runtime_1.jsx)("input", { value: assignee, onChange: (event) => onAssigneeChange(event.target.value), placeholder: "Owner ID / team" }), (0, jsx_runtime_1.jsx)("button", { className: "fw-button", type: "button", disabled: Boolean(busyAction), onClick: onAssign, children: busyAction === 'assign' ? 'Saving…' : 'Assign' })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Update workflow status" }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-inline-action", children: [(0, jsx_runtime_1.jsxs)("select", { defaultValue: warning.status, id: "fw-status-select", children: [(0, jsx_runtime_1.jsx)("option", { value: "new", children: "New" }), (0, jsx_runtime_1.jsx)("option", { value: "under-review", children: "Under review" }), (0, jsx_runtime_1.jsx)("option", { value: "acknowledged", children: "Acknowledged" }), (0, jsx_runtime_1.jsx)("option", { value: "resolved", children: "Resolved" })] }, warning.status), (0, jsx_runtime_1.jsx)("button", { className: "fw-button", type: "button", disabled: Boolean(busyAction), onClick: () => { const select = document.getElementById('fw-status-select'); if (select)
                                                        onStatusChange(select.value); }, children: busyAction === 'status' ? 'Saving…' : 'Save status' })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("span", { children: "Add note to workflow timeline" }), (0, jsx_runtime_1.jsx)("textarea", { value: note, onChange: (event) => onNoteChange(event.target.value), rows: 3, placeholder: "Record the review decision or follow-up needed\u2026" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "fw-button fw-button-primary", disabled: Boolean(busyAction) || note.trim().length < 3, onClick: onAddNote, children: busyAction === 'note' ? 'Adding…' : 'Add note' })] })] }), (0, jsx_runtime_1.jsx)(DataFootnote, { meta: response.meta })] })] }) });
}
function ForecastsEarlyWarningsPage({ globalRegionCode = 'IN', onGlobalRegionChange }) {
    const [adapter] = (0, react_1.useState)(() => (0, legacyAdapter_1.createForecastsDataAdapter)());
    const [activeView, setActiveView] = (0, react_1.useState)(defaultView);
    const [filterOptions, setFilterOptions] = (0, react_1.useState)(null);
    const [optionsError, setOptionsError] = (0, react_1.useState)('');
    const [optionsLoading, setOptionsLoading] = (0, react_1.useState)(true);
    const [draftFilters, setDraftFilters] = (0, react_1.useState)({ ...defaultFilters, ...(globalRegionCode && globalRegionCode !== 'IN' ? { stateCode: globalRegionCode } : {}) });
    const [filters, setFilters] = (0, react_1.useState)({ ...defaultFilters, ...(globalRegionCode && globalRegionCode !== 'IN' ? { stateCode: globalRegionCode } : {}) });
    const [resourceState, setResourceState] = (0, react_1.useState)({ loading: false, errors: [] });
    const [overview, setOverview] = (0, react_1.useState)(null);
    const [series, setSeries] = (0, react_1.useState)(null);
    const [warnings, setWarnings] = (0, react_1.useState)(null);
    const [overviewMatrix, setOverviewMatrix] = (0, react_1.useState)(null);
    const [performance, setPerformance] = (0, react_1.useState)(null);
    const [riskGrouping, setRiskGrouping] = (0, react_1.useState)('occupation');
    const [riskMatrix, setRiskMatrix] = (0, react_1.useState)(null);
    const [riskMap, setRiskMap] = (0, react_1.useState)(null);
    const [selectedCell, setSelectedCell] = (0, react_1.useState)(null);
    const [riskDetail, setRiskDetail] = (0, react_1.useState)(null);
    const [riskDetailLoading, setRiskDetailLoading] = (0, react_1.useState)(false);
    const [scenarioOptions, setScenarioOptions] = (0, react_1.useState)(null);
    const [scenarioSelection, setScenarioSelection] = (0, react_1.useState)(['baseline', 'higher-growth', 'lower-growth']);
    const [scenarioAssumptionValues, setScenarioAssumptionValues] = (0, react_1.useState)({});
    const [scenarioComparison, setScenarioComparison] = (0, react_1.useState)(null);
    const [scenarioComparing, setScenarioComparing] = (0, react_1.useState)(false);
    const [scenarioError, setScenarioError] = (0, react_1.useState)('');
    const [alertResponse, setAlertResponse] = (0, react_1.useState)(null);
    const [alertQueryDraft, setAlertQueryDraft] = (0, react_1.useState)('');
    const [alertQuery, setAlertQuery] = (0, react_1.useState)('');
    const [alertStatus, setAlertStatus] = (0, react_1.useState)('all');
    const [alertSeverity, setAlertSeverity] = (0, react_1.useState)('all');
    const [alertPage, setAlertPage] = (0, react_1.useState)(0);
    const alertPageSize = 8;
    const [alertQueryError, setAlertQueryError] = (0, react_1.useState)('');
    const [drawer, setDrawer] = (0, react_1.useState)(null);
    const [alertDetail, setAlertDetail] = (0, react_1.useState)(null);
    const [drawerLoading, setDrawerLoading] = (0, react_1.useState)(false);
    const [drawerError, setDrawerError] = (0, react_1.useState)('');
    const [mutationError, setMutationError] = (0, react_1.useState)('');
    const [pendingAction, setPendingAction] = (0, react_1.useState)('');
    const [noteDraft, setNoteDraft] = (0, react_1.useState)('');
    const [assigneeDraft, setAssigneeDraft] = (0, react_1.useState)('');
    const optionsInitialized = (0, react_1.useRef)(false);
    const priorGlobalRegion = (0, react_1.useRef)(globalRegionCode);
    const currentLoad = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const controller = new AbortController();
        setOptionsLoading(true);
        setOptionsError('');
        adapter.getFilterOptions(controller.signal).then((result) => {
            if (controller.signal.aborted)
                return;
            setFilterOptions(result);
            if (!optionsInitialized.current) {
                optionsInitialized.current = true;
                const selectedState = globalRegionCode && globalRegionCode !== 'IN' ? globalRegionCode : '';
                const initial = { ...result.defaults, geographyCode: result.defaults.geographyCode ?? 'IN', ...(selectedState ? { stateCode: selectedState } : {}) };
                setDraftFilters(initial);
                setFilters(initial);
            }
        }).catch((reason) => {
            if (!controller.signal.aborted)
                setOptionsError(reason instanceof Error ? reason.message : 'Forecast filter options could not be loaded.');
        }).finally(() => { if (!controller.signal.aborted)
            setOptionsLoading(false); });
        return () => controller.abort();
    }, [adapter]);
    (0, react_1.useEffect)(() => {
        if (priorGlobalRegion.current === globalRegionCode)
            return;
        priorGlobalRegion.current = globalRegionCode;
        const stateCode = globalRegionCode === 'IN' ? '' : globalRegionCode;
        setDraftFilters((current) => ({ ...current, geographyCode: 'IN', stateCode }));
        setFilters((current) => ({ ...current, geographyCode: 'IN', stateCode }));
    }, [globalRegionCode]);
    const changeView = (0, react_1.useCallback)((view) => {
        setActiveView(view);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (view === 'overview')
                url.searchParams.delete('view');
            else
                url.searchParams.set('view', view);
            window.history.replaceState({}, '', url);
        }
    }, []);
    const changeDraft = (key, value) => setDraftFilters((current) => ({ ...current, [key]: key === 'horizonYears' ? Number(value) : value === '' ? undefined : String(value) }));
    const applyFilters = () => { const next = { ...draftFilters, geographyCode: 'IN' }; setFilters(next); setScenarioComparison(null); setAlertPage(0); onGlobalRegionChange?.(next.stateCode || 'IN'); };
    const resetFilters = () => { const next = { ...(filterOptions?.defaults ?? defaultFilters), geographyCode: 'IN', ...(globalRegionCode && globalRegionCode !== 'IN' ? { stateCode: globalRegionCode } : {}) }; setDraftFilters(next); setFilters(next); setScenarioComparison(null); setAlertPage(0); onGlobalRegionChange?.(next.stateCode || 'IN'); };
    const loadView = (0, react_1.useCallback)(async () => {
        currentLoad.current?.abort();
        const controller = new AbortController();
        currentLoad.current = controller;
        setResourceState({ loading: true, errors: [] });
        const errors = [];
        const reportFailure = (label, result) => { if (result.status === 'rejected' && !controller.signal.aborted)
            errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : 'Service request failed.'}`); };
        try {
            if (activeView === 'overview') {
                const results = await Promise.allSettled([
                    adapter.getOverview(filters, controller.signal), adapter.getSeries(filters, 'total', controller.signal),
                    adapter.getWarnings(filters, { limit: 6 }, controller.signal), adapter.getRiskMatrix(filters, 'occupation', controller.signal),
                    adapter.getModelPerformance(filters, controller.signal),
                ]);
                if (controller.signal.aborted)
                    return;
                if (results[0].status === 'fulfilled')
                    setOverview(results[0].value);
                else {
                    setOverview(null);
                    reportFailure('Overview KPIs', results[0]);
                }
                if (results[1].status === 'fulfilled')
                    setSeries(results[1].value);
                else {
                    setSeries(null);
                    reportFailure('Forecast series', results[1]);
                }
                if (results[2].status === 'fulfilled')
                    setWarnings(results[2].value);
                else {
                    setWarnings(null);
                    reportFailure('Early warnings', results[2]);
                }
                if (results[3].status === 'fulfilled')
                    setOverviewMatrix(results[3].value);
                else {
                    setOverviewMatrix(null);
                    reportFailure('Occupation ranking', results[3]);
                }
                if (results[4].status === 'fulfilled')
                    setPerformance(results[4].value);
                else {
                    setPerformance(null);
                    reportFailure('Reliability summary', results[4]);
                }
            }
            else if (activeView === 'risk-radar') {
                const results = await Promise.allSettled([adapter.getRiskMatrix(filters, riskGrouping, controller.signal), adapter.getStateRiskMap(filters, riskGrouping, controller.signal)]);
                if (controller.signal.aborted)
                    return;
                if (results[0].status === 'fulfilled') {
                    setRiskMatrix(results[0].value);
                    const previous = selectedCell && results[0].value.cells.find((cell) => cell.regionCode === selectedCell.regionCode && cell.entityCode === selectedCell.entityCode);
                    setSelectedCell(previous || results[0].value.cells[0] || null);
                }
                else {
                    setRiskMatrix(null);
                    reportFailure('Risk matrix', results[0]);
                }
                if (results[1].status === 'fulfilled')
                    setRiskMap(results[1].value);
                else {
                    setRiskMap(null);
                    reportFailure('Regional map metadata', results[1]);
                }
            }
            else if (activeView === 'scenario-analysis') {
                const result = await adapter.getScenarioOptions(filters, controller.signal);
                if (controller.signal.aborted)
                    return;
                setScenarioOptions(result);
                setScenarioAssumptionValues((current) => { const next = { ...current }; for (const assumption of result.assumptions)
                    if (assumption.editable && typeof assumption.value === 'number' && next[assumption.key] === undefined)
                        next[assumption.key] = assumption.value; return next; });
                setScenarioSelection((current) => current.filter((id) => result.scenarios.some((scenario) => scenario.id === id)).length ? current.filter((id) => result.scenarios.some((scenario) => scenario.id === id)) : result.scenarios.filter((scenario) => scenario.isDefault).map((scenario) => scenario.id));
            }
            else if (activeView === 'model-performance') {
                const result = await adapter.getModelPerformance(filters, controller.signal);
                if (controller.signal.aborted)
                    return;
                setPerformance(result);
            }
            else {
                const result = await adapter.getAlerts(filters, { status: alertStatus, severity: alertSeverity, query: alertQuery, page: alertPage, pageSize: alertPageSize }, controller.signal);
                if (controller.signal.aborted)
                    return;
                setAlertResponse(result);
                setAlertQueryError('');
            }
            if (controller.signal.aborted)
                return;
            setResourceState({ loading: false, errors });
            if (activeView === 'alert-management' && errors.length)
                setAlertQueryError(errors.join(' '));
        }
        catch (reason) {
            if (controller.signal.aborted)
                return;
            const message = reason instanceof Error ? reason.message : 'Forecast service request failed.';
            setResourceState({ loading: false, errors: [message] });
            if (activeView === 'alert-management')
                setAlertQueryError(message);
        }
    }, [adapter, activeView, filters, riskGrouping, alertStatus, alertSeverity, alertQuery, alertPage]);
    (0, react_1.useEffect)(() => { void loadView(); return () => currentLoad.current?.abort(); }, [loadView]);
    const retry = () => void loadView();
    const loadRiskDetail = (0, react_1.useCallback)(async (cell) => {
        setSelectedCell(cell);
        setRiskDetailLoading(true);
        setRiskDetail(null);
        setDrawerError('');
        if (activeView !== 'risk-radar')
            changeView('risk-radar');
        const controller = new AbortController();
        try {
            const response = await adapter.getRiskDetails(filters, cell.regionCode, cell.entityCode, cell.entityType, controller.signal);
            setRiskDetail(response);
        }
        catch (reason) {
            setDrawerError(reason instanceof Error ? reason.message : 'Risk detail could not be loaded.');
        }
        finally {
            setRiskDetailLoading(false);
        }
    }, [adapter, filters, activeView, changeView]);
    const loadAlertDetail = (0, react_1.useCallback)(async (id) => {
        setDrawer({ kind: 'alert', id });
        setAlertDetail(null);
        setDrawerLoading(true);
        setDrawerError('');
        setMutationError('');
        setNoteDraft('');
        setAssigneeDraft('');
        try {
            const response = await adapter.getAlertDetail(id);
            setAlertDetail(response);
            setAssigneeDraft(response.alert.assigneeId ?? '');
        }
        catch (reason) {
            setDrawerError(reason instanceof Error ? reason.message : 'Warning details could not be loaded.');
        }
        finally {
            setDrawerLoading(false);
        }
    }, [adapter]);
    const closeDrawer = () => { setDrawer(null); setAlertDetail(null); setRiskDetail(null); setDrawerError(''); setMutationError(''); setPendingAction(''); };
    (0, react_1.useEffect)(() => { if (!drawer)
        return; const onKey = (event) => { if (event.key === 'Escape')
        closeDrawer(); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [drawer]);
    const refreshAlertList = (0, react_1.useCallback)(async () => {
        const controller = new AbortController();
        const response = await adapter.getAlerts(filters, { status: alertStatus, severity: alertSeverity, query: alertQuery, page: alertPage, pageSize: alertPageSize }, controller.signal);
        setAlertResponse(response);
    }, [adapter, filters, alertStatus, alertSeverity, alertQuery, alertPage]);
    const mutateAlert = (0, react_1.useCallback)(async (action, patch) => {
        if (!drawer || drawer.kind !== 'alert')
            return;
        setPendingAction(action);
        setMutationError('');
        try {
            if (action === 'acknowledge')
                await adapter.acknowledgeAlert(drawer.id);
            else if (action === 'status')
                await adapter.updateAlert(drawer.id, { status: patch?.status });
            else if (action === 'assign')
                await adapter.updateAlert(drawer.id, { assigneeId: patch?.assigneeId ?? null, assigneeLabel: patch?.assigneeId ?? null });
            else if (action === 'note') {
                await adapter.addAlertNote(drawer.id, patch?.note ?? '');
                setNoteDraft('');
            }
            const refreshed = await adapter.getAlertDetail(drawer.id);
            setAlertDetail(refreshed);
            setAssigneeDraft(refreshed.alert.assigneeId ?? '');
            await refreshAlertList();
        }
        catch (reason) {
            setMutationError(reason instanceof Error ? reason.message : 'The service did not confirm this workflow action. No local success state was applied.');
        }
        finally {
            setPendingAction('');
        }
    }, [adapter, drawer, refreshAlertList]);
    const viewError = resourceState.errors.length ? resourceState.errors.join(' ') : '';
    return (0, jsx_runtime_1.jsxs)("section", { className: "fw-page", "aria-busy": resourceState.loading || optionsLoading, children: [(0, jsx_runtime_1.jsxs)("section", { className: "fw-hero", "aria-labelledby": "fw-page-title", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-hero-copy", children: [(0, jsx_runtime_1.jsxs)("div", { className: "fw-breadcrumb", children: ["LABOUR MARKET INTELLIGENCE ", (0, jsx_runtime_1.jsx)("span", { children: "/" }), " FORECASTS"] }), (0, jsx_runtime_1.jsx)("p", { className: "fw-eyebrow", children: "Detect \u2192 Explain \u2192 Investigate \u2192 Compare \u2192 Act" }), (0, jsx_runtime_1.jsx)("h1", { id: "fw-page-title", children: "FORECASTS & EARLY WARNINGS" }), (0, jsx_runtime_1.jsx)("div", { className: "fw-title-rule" }), (0, jsx_runtime_1.jsx)("p", { children: "Inspect demand and supply projections, investigate evidence-backed risk signals, compare conditional scenarios and manage review actions." }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-hero-meta", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarDays, { size: 14 }), " Horizon ", filters.horizonYears, " year(s)"] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.MapPin, { size: 14 }), filters.stateCode ? filterOptions?.states.find((item) => item.code === filters.stateCode)?.label ?? filters.stateCode : 'India'] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 14 }), adapter.mode === 'mock' ? 'Illustrative adapter' : 'Configured REST service'] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-hero-art", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("img", { src: "./assets/industrial-skyline.png", alt: "" }), (0, jsx_runtime_1.jsx)("span", { className: "fw-hero-art-label", children: "FORECAST / RISK / EVIDENCE" })] })] }), adapter.mode === 'mock' && (0, jsx_runtime_1.jsxs)("div", { className: "fw-demo-banner", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 16 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Illustrative demo mode" }), (0, jsx_runtime_1.jsx)("span", { children: "All numeric forecast, warning, risk, scenario and performance values are mock fixtures\u2014not source-backed labour-market findings." })] }), (0, jsx_runtime_1.jsx)(ProvenanceBadge, { meta: overview?.meta })] }), optionsError && (0, jsx_runtime_1.jsx)(ErrorPanel, { message: `Filter options could not be loaded. ${optionsError}`, onRetry: () => { setOptionsError(''); setOptionsLoading(true); void adapter.getFilterOptions().then(setFilterOptions).catch((reason) => setOptionsError(reason instanceof Error ? reason.message : 'Retry failed.')).finally(() => setOptionsLoading(false)); } }), (0, jsx_runtime_1.jsx)(ForecastFilterBar, { draft: draftFilters, options: filterOptions, onChange: changeDraft, onApply: applyFilters, onReset: resetFilters, loading: resourceState.loading || optionsLoading }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-active-filter-summary", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Applied:" }), " ", filters.stateCode ? filterOptions?.states.find((item) => item.code === filters.stateCode)?.label ?? filters.stateCode : 'India', " \u00B7 ", filterOptions?.sectors.find((item) => item.code === filters.sectorCode)?.label ?? (filters.sectorCode ? filters.sectorCode : 'All sectors'), " \u00B7 ", filters.horizonYears, "-year horizon"] }), (0, jsx_runtime_1.jsx)("span", { children: (0, jsx_runtime_1.jsx)(ProvenanceBadge, { meta: activeView === 'overview' ? overview?.meta ?? series?.meta : activeView === 'risk-radar' ? riskMatrix?.meta : activeView === 'model-performance' ? performance?.meta : activeView === 'scenario-analysis' ? scenarioComparison?.meta ?? scenarioOptions?.meta : alertResponse?.meta }) })] }), (0, jsx_runtime_1.jsx)(Tabs, { active: activeView, onChange: changeView }), viewError && (0, jsx_runtime_1.jsx)(ErrorPanel, { message: viewError, onRetry: retry }), resourceState.loading && (0, jsx_runtime_1.jsxs)("div", { className: "fw-load-strip", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: "fw-spin" }), " Loading ", VIEWS.find((view) => view.key === activeView)?.label.toLowerCase(), " from the configured adapter\u2026"] }), (0, jsx_runtime_1.jsxs)("div", { id: "forecast-view-panel", role: "tabpanel", "aria-labelledby": `forecast-tab-${activeView}`, className: "fw-view-panel", children: [activeView === 'overview' && (0, jsx_runtime_1.jsx)(OverviewView, { filters: filters, overview: overview, series: series, warnings: warnings, matrix: overviewMatrix, performance: performance, onOpenWarning: (id) => void loadAlertDetail(id), onViewAllAlerts: () => changeView('alert-management'), onViewPerformance: () => changeView('model-performance'), onSelectCell: (cell) => { setRiskGrouping(cell.entityType); void loadRiskDetail(cell); } }), activeView === 'risk-radar' && (0, jsx_runtime_1.jsx)(RiskView, { matrix: riskMatrix, mapData: riskMap, grouping: riskGrouping, onGroupingChange: setRiskGrouping, selectedCell: selectedCell, onSelectCell: (cell) => void loadRiskDetail(cell), onSelectRegion: (regionCode) => { const cell = riskMatrix?.cells.find((item) => item.regionCode === regionCode); if (cell)
                            void loadRiskDetail(cell); }, riskDetail: riskDetail, detailLoading: riskDetailLoading }), activeView === 'scenario-analysis' && (0, jsx_runtime_1.jsx)(ScenarioView, { options: scenarioOptions, comparison: scenarioComparison, comparing: scenarioComparing, error: scenarioError, selectedScenarios: scenarioSelection, onToggleScenario: (id) => setScenarioSelection((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]), assumptionValues: scenarioAssumptionValues, onAssumptionChange: (key, value) => setScenarioAssumptionValues((current) => ({ ...current, [key]: value })), onCompare: () => { setScenarioError(''); const invalid = (scenarioOptions?.assumptions ?? []).find((item) => item.editable && scenarioAssumptionValues[item.key] !== undefined && ((item.min !== undefined && scenarioAssumptionValues[item.key] < item.min) || (item.max !== undefined && scenarioAssumptionValues[item.key] > item.max))); if (invalid) {
                            setScenarioError(`${invalid.label} must be between ${invalid.min ?? 'the minimum'} and ${invalid.max ?? 'the maximum'} ${invalid.unit}.`);
                            return;
                        } setScenarioComparing(true); const controller = new AbortController(); adapter.compareScenarios(filters, scenarioSelection, scenarioAssumptionValues, controller.signal).then(setScenarioComparison).catch((reason) => setScenarioError(reason instanceof Error ? reason.message : 'Scenario comparison failed. No mock fallback was used.')).finally(() => setScenarioComparing(false)); }, onReset: () => { const base = scenarioOptions?.scenarios.find((scenario) => scenario.isDefault) ?? scenarioOptions?.scenarios.find((scenario) => scenario.id === 'baseline'); setScenarioSelection(base ? [base.id] : []); setScenarioAssumptionValues(Object.fromEntries((scenarioOptions?.assumptions ?? []).filter((item) => item.editable && typeof item.value === 'number').map((item) => [item.key, item.value]))); setScenarioComparison(null); setScenarioError(''); } }), activeView === 'model-performance' && (0, jsx_runtime_1.jsx)(PerformanceView, { performance: performance }), activeView === 'alert-management' && (0, jsx_runtime_1.jsx)(AlertManagementView, { response: alertResponse, queryDraft: alertQueryDraft, onQueryDraftChange: setAlertQueryDraft, onSearch: (event) => { event.preventDefault(); setAlertPage(0); setAlertQuery(alertQueryDraft); }, status: alertStatus, onStatusChange: (value) => { setAlertStatus(value); setAlertPage(0); }, severity: alertSeverity, onSeverityChange: (value) => { setAlertSeverity(value); setAlertPage(0); }, page: alertPage, pageSize: alertPageSize, onPage: setAlertPage, onOpenAlert: (id) => void loadAlertDetail(id), onRetry: retry, loading: resourceState.loading, error: alertQueryError })] }), (0, jsx_runtime_1.jsxs)("footer", { className: "fw-method-footer", children: [(0, jsx_runtime_1.jsx)("span", { className: "fw-method-icon", children: "i" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Interpretation & trust" }), (0, jsx_runtime_1.jsx)("p", { children: "Gap = demand \u2212 supply only when target population, geography, period and units are comparable. Positive values indicate potential shortage; negative values indicate potential surplus. Historical observations are solid, forecasts are dashed, and intervals are drawn only when bounds and interval semantics are returned. Risk classes and alert severity come from the adapter's rules, not a UI threshold." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "fw-method-status", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 13 }), adapter.mode === 'rest' ? 'REST adapter' : 'Mock adapter'] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarDays, { size: 13 }), " Updated ", niceDate((activeView === 'overview' ? series?.meta : activeView === 'risk-radar' ? riskMatrix?.meta : activeView === 'scenario-analysis' ? scenarioComparison?.meta : activeView === 'model-performance' ? performance?.meta : alertResponse?.meta)?.updatedAt)] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "fw-button fw-button-small", onClick: retry, disabled: resourceState.loading, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 13 }), " Refresh view"] })] })] }), drawer && (0, jsx_runtime_1.jsx)(AlertDrawer, { response: drawer.kind === 'alert' ? alertDetail : null, loading: drawer.kind === 'alert' ? drawerLoading : riskDetailLoading, error: drawerError, busyAction: pendingAction, actionError: mutationError, note: noteDraft, onNoteChange: setNoteDraft, assignee: assigneeDraft, onAssigneeChange: setAssigneeDraft, onClose: closeDrawer, onAcknowledge: () => void mutateAlert('acknowledge'), onStatusChange: (status) => void mutateAlert('status', { status }), onAssign: () => void mutateAlert('assign', { assigneeId: assigneeDraft.trim() || null }), onAddNote: () => void mutateAlert('note', { note: noteDraft.trim() }) })] });
}

},
"forecasts/legacyAdapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createForecastsDataAdapter = createForecastsDataAdapter;
const adapter_1 = require("./adapter");
function createForecastsDataAdapter() {
    const adapter = (0, adapter_1.createForecastsAdapter)();
    return {
        mode: adapter.mode,
        getFilterOptions: (signal) => adapter.getFilterOptions({ signal }),
        getOverview: (filters, signal) => adapter.getOverview(filters, { signal }),
        getSeries: (filters, viewBy, signal) => adapter.getSeries(filters, viewBy, { signal }),
        getWarnings: (filters, params, signal) => adapter.getWarnings(filters, params, { signal }),
        getRiskMatrix: (filters, entityType, signal) => adapter.getRiskMatrix(filters, entityType, { signal }),
        getStateRiskMap: (filters, entityType, signal) => adapter.getStateRiskMap(filters, entityType, { signal }),
        getRiskDetails: (filters, regionCode, entityCode, entityType, signal) => adapter.getRiskDetails(filters, regionCode, entityCode, { signal, entityType }),
        getScenarioOptions: (filters, signal) => adapter.getScenarioOptions(filters, { signal }),
        compareScenarios: (filters, scenarioIds, assumptions, signal) => adapter.compareScenarios(filters, scenarioIds, assumptions, { signal }),
        getModelPerformance: (filters, signal) => adapter.getModelPerformance(filters, { signal }),
        getAlerts: (filters, params, signal) => adapter.getAlerts(filters, params, { signal }),
        getAlertDetail: (id, signal) => adapter.getAlertDetail(id, { signal }),
        acknowledgeAlert: (id, signal) => adapter.acknowledgeAlert(id, { signal }),
        updateAlert: (id, patch, signal) => adapter.updateAlert(id, patch, { signal }),
        addAlertNote: (id, note, signal) => adapter.addAlertNote(id, note, { signal }),
    };
}

},
"forecasts/adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createForecastsAdapter = createForecastsAdapter;
const mockAdapter_1 = require("./mockAdapter");
const restAdapter_1 = require("./restAdapter");
function createForecastsAdapter() {
    const baseUrl = (typeof window !== 'undefined' && window.SHRAMIK_CONFIG && window.SHRAMIK_CONFIG.apiBaseUrl || '').trim();
    if (baseUrl) {
        return new restAdapter_1.RestForecastsAdapter({ baseUrl, getAccessToken: () => null });
    }
    return new mockAdapter_1.MockForecastsAdapter();
}

},
"forecasts/mockAdapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_FORECAST_META = exports.MockForecastsAdapter = void 0;
const DEMO_DATE = '2026-10-18';
const mockMeta = {
    provenance: 'mock', sourceLabels: ['Illustrative deterministic fixture'], asOf: DEMO_DATE,
    units: 'persons', geographyCode: 'IN',
    notes: ['Demo values only. Not verified SHRAMIK labour-market findings.', 'No live model or source refresh is implied.'],
    coverage: { usablePeriods: 7, expectedPeriods: 9, percent: 77.8, notes: ['Illustrative training fixture; coverage is not a source-backed statistic.'] },
};
exports.MOCK_FORECAST_META = mockMeta;
const states = [
    { code: 'IN-MH', label: 'Maharashtra' }, { code: 'IN-UP', label: 'Uttar Pradesh' },
    { code: 'IN-TN', label: 'Tamil Nadu' }, { code: 'IN-KA', label: 'Karnataka' },
    { code: 'IN-GJ', label: 'Gujarat' }, { code: 'IN-OD', label: 'Odisha' },
    { code: 'IN-WB', label: 'West Bengal' }, { code: 'IN-BR', label: 'Bihar' },
];
const sectors = [
    { code: 'MFG', label: 'Manufacturing' }, { code: 'CON', label: 'Construction' },
    { code: 'ENG', label: 'Energy' }, { code: 'HLT', label: 'Healthcare' },
    { code: 'LOG', label: 'Logistics' }, { code: 'IT', label: 'Information technology' },
];
const occupations = [
    { code: '7212', label: 'Welders and flame cutters' }, { code: '7411', label: 'Electrical installation workers' },
    { code: '3115', label: 'Mechanical engineering technicians' }, { code: '2512', label: 'Software developers' },
    { code: '8332', label: 'Heavy truck and lorry drivers' }, { code: '5321', label: 'Health care assistants' },
];
const skills = [
    { code: 'SK-WELD', label: 'Industrial welding' }, { code: 'SK-SOLAR', label: 'Solar PV installation' },
    { code: 'SK-ELEC', label: 'Electrical maintenance' }, { code: 'SK-DIGI', label: 'Applied digital skills' },
    { code: 'SK-CNC', label: 'CNC machine operation' }, { code: 'SK-CARE', label: 'Patient care assistance' },
];
const horizons = [1, 3, 5];
const legend = [
    { riskClass: 'high-shortage', label: 'High shortage', min: 0.2 },
    { riskClass: 'moderate-shortage', label: 'Moderate shortage', min: 0.08, max: 0.2 },
    { riskClass: 'balanced', label: 'Approximately balanced', min: -0.08, max: 0.08 },
    { riskClass: 'moderate-surplus', label: 'Moderate surplus', min: -0.2, max: -0.08 },
    { riskClass: 'high-surplus', label: 'High surplus', max: -0.2 },
    { riskClass: 'no-data', label: 'No data' },
];
function checkSignal(signal) {
    if (signal?.aborted)
        throw new DOMException('The request was cancelled.', 'AbortError');
}
function metaFor(filters, provenance = 'mock') {
    return { ...mockMeta, provenance, geographyCode: filters.stateCode || filters.geographyCode || 'IN', period: filters.period ?? 'Demo baseline', forecastHorizon: { startYear: 2025, endYear: 2024 + filters.horizonYears } };
}
function scaleFor(filters) {
    let factor = 1;
    if (filters.stateCode)
        factor *= { 'IN-MH': 0.24, 'IN-UP': 0.31, 'IN-TN': 0.15, 'IN-KA': 0.14, 'IN-GJ': 0.12, 'IN-OD': 0.07, 'IN-WB': 0.13, 'IN-BR': 0.1 }[filters.stateCode] ?? 0.1;
    if (filters.sectorCode)
        factor *= { MFG: 0.32, CON: 0.2, ENG: 0.1, HLT: 0.16, LOG: 0.12, IT: 0.1 }[filters.sectorCode] ?? 0.15;
    if (filters.occupationCode)
        factor *= 0.17;
    if (filters.skillCode)
        factor *= 0.14;
    return factor;
}
function makeSeries(filters, viewBy) {
    const factor = scaleFor(filters);
    const historicalThrough = 2024;
    const horizonEnd = 2024 + filters.horizonYears;
    const points = [];
    let lastDemand = 0;
    let lastSupply = 0;
    for (let year = 2018; year <= horizonEnd; year += 1) {
        if (year <= historicalThrough) {
            const demand = Math.round((79000 + (year - 2018) * 4750) * factor);
            const supply = Math.round((76500 + (year - 2018) * 4140) * factor);
            lastDemand = demand;
            lastSupply = supply;
            points.push({ period: String(year), year, actualDemand: demand, actualSupply: supply, forecastDemand: null, forecastSupply: null });
        }
        else {
            const n = year - historicalThrough;
            const demand = Math.round(lastDemand * Math.pow(1.041, n));
            const supply = Math.round(lastSupply * Math.pow(1.029, n));
            const demandSpread = demand * (0.025 + n * 0.009);
            const supplySpread = supply * (0.022 + n * 0.007);
            points.push({
                period: String(year), year, actualDemand: null, actualSupply: null, forecastDemand: demand, forecastSupply: supply,
                demandInterval: { lower: Math.max(0, Math.round(demand - demandSpread)), upper: Math.round(demand + demandSpread), level: 80 },
                supplyInterval: { lower: Math.max(0, Math.round(supply - supplySpread)), upper: Math.round(supply + supplySpread), level: 80 },
            });
        }
    }
    return { points, unit: 'persons', historicalThrough, horizon: { startYear: historicalThrough + 1, endYear: horizonEnd }, intervalLevel: 80, viewBy, meta: metaFor(filters, 'mock') };
}
function riskClassFor(gap, demand) {
    if (demand <= 0)
        return 'no-data';
    const ratio = gap / demand;
    if (ratio >= 0.2)
        return 'high-shortage';
    if (ratio >= 0.08)
        return 'moderate-shortage';
    if (ratio > -0.08)
        return 'balanced';
    if (ratio > -0.2)
        return 'moderate-surplus';
    return 'high-surplus';
}
function fmt(value) { return value == null ? '—' : new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value); }
function currentPoint(filters) {
    const data = makeSeries(filters, 'total');
    return data.points.find((point) => point.year === data.horizon.endYear) ?? data.points[data.points.length - 1];
}
function makeWarning(id, title, entityCode, entityLabel, entityType, regionCode, regionLabel, severity, category, startYear, endYear, status, ruleId, ruleLabel, thresholdDescription, summary, assigneeId = null, assigneeLabel = null) {
    return { id, title, entityCode, entityLabel, entityType, regionCode, regionLabel, severity, category, expectedHorizon: { startYear, endYear }, status, rule: { id: ruleId, label: ruleLabel, thresholdDescription }, summary, provenance: 'mock', sourceLabels: ['Illustrative forecast fixture'], createdAt: '2026-10-15T08:00:00.000Z', updatedAt: '2026-10-17T09:30:00.000Z', assigneeId, assigneeLabel };
}
const warningFixtures = [
    makeWarning('FW-001', 'Welders — projected shortage risk', '7212', 'Welders and flame cutters', 'occupation', 'IN-MH', 'Maharashtra', 'critical', 'shortage', 2026, 2028, 'new', 'DEMO-GAP-20', 'Projected gap threshold', 'Illustrative rule: projected gap-to-demand ratio at or above the configured high-shortage band.', 'Mock forecast shows demand outpacing available supply over the selected horizon.'),
    makeWarning('FW-002', 'Solar installation — elevated growth signal', 'SK-SOLAR', 'Solar PV installation', 'skill', 'IN-GJ', 'Gujarat', 'high', 'emerging-skill', 2026, 2030, 'under-review', 'DEMO-GROWTH-15', 'Growth threshold', 'Illustrative rule: projected growth band crossed; actual production rule must come from analytics configuration.', 'The demo scenario carries a higher growth trajectory than the comparison period.', 'analyst-a', 'Workforce Analyst'),
    makeWarning('FW-003', 'Electrical installers — regional pressure', '7411', 'Electrical installation workers', 'occupation', 'IN-OD', 'Odisha', 'high', 'regional-risk', 2027, 2029, 'acknowledged', 'DEMO-REGION-01', 'Regional concentration', 'Illustrative rule: regional risk class returned as high shortage.', 'Regional matrix fixture indicates concentration under this demo filter.', 'planning-unit', 'State Planning Unit'),
    makeWarning('FW-004', 'Health care assistants — demand increase', '5321', 'Health care assistants', 'occupation', 'IN-TN', 'Tamil Nadu', 'moderate', 'high-growth', 2026, 2028, 'new', 'DEMO-TREND-02', 'Demand trend rule', 'Illustrative rule: demand growth crosses a demo trend threshold.', 'The fixture trend grows more quickly than its preceding period.', null, null),
    makeWarning('FW-005', 'Manufacturing maintenance — potential shortage', '3115', 'Mechanical engineering technicians', 'occupation', 'IN-KA', 'Karnataka', 'moderate', 'shortage', 2028, 2030, 'under-review', 'DEMO-GAP-08', 'Gap threshold', 'Illustrative rule: projected gap-to-demand ratio crosses the demo moderate-shortage band.', 'A conditional forecast indicates a possible gap; the values are not verified observations.', 'analyst-a', 'Workforce Analyst'),
    makeWarning('FW-006', 'Applied digital skills — coverage watch', 'SK-DIGI', 'Applied digital skills', 'skill', 'IN-WB', 'West Bengal', 'low', 'emerging-skill', 2027, 2030, 'resolved', 'DEMO-COVERAGE-01', 'Coverage review', 'Illustrative workflow record, not a live production alert.', 'This fixture exists to exercise resolved-state and timeline handling.', 'planning-unit', 'State Planning Unit'),
    makeWarning('FW-007', 'Heavy vehicle operators — horizon watch', '8332', 'Heavy truck and lorry drivers', 'occupation', 'IN-UP', 'Uttar Pradesh', 'high', 'shortage', 2027, 2029, 'new', 'DEMO-GAP-20-B', 'Projected gap threshold', 'Illustrative threshold metadata returned by demo fixture.', 'Demo alert record for search, status, pagination and details testing.'),
];
class MockForecastsAdapter {
    constructor() {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'mock'
        });
        Object.defineProperty(this, "alerts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: warningFixtures.map((item) => ({ ...item, expectedHorizon: { ...item.expectedHorizon }, rule: { ...item.rule } }))
        });
        Object.defineProperty(this, "timeline", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "notes", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
    }
    async getFilterOptions(options) {
        checkSignal(options?.signal);
        return {
            horizons: [...horizons], geographies: [{ code: 'IN', label: 'All India' }], states: [...states], sectors: [...sectors], occupations: [...occupations], skills: [...skills],
            defaults: { horizonYears: 5, geographyCode: 'IN', stateCode: '', sectorCode: '', occupationCode: '', skillCode: '' },
            meta: { ...mockMeta },
        };
    }
    async getOverview(filters, options) {
        checkSignal(options?.signal);
        const series = makeSeries(filters, 'total');
        const point = series.points.find((entry) => entry.year === series.horizon.endYear) ?? series.points[series.points.length - 1];
        const demand = point.forecastDemand ?? point.actualDemand ?? null;
        const supply = point.forecastSupply ?? point.actualSupply ?? null;
        const gap = demand !== null && supply !== null ? demand - supply : null;
        const previous = series.points.find((entry) => entry.year === series.horizon.endYear - 1);
        const previousDemand = previous?.forecastDemand ?? previous?.actualDemand ?? null;
        const previousSupply = previous?.forecastSupply ?? previous?.actualSupply ?? null;
        const warnings = await this.getWarnings(filters, { limit: 100 }, options);
        const highRisk = new Set(warnings.items.filter((item) => item.entityType === 'occupation' && (item.severity === 'critical' || item.severity === 'high') && item.status !== 'resolved').map((item) => item.entityCode)).size;
        const meta = metaFor(filters, 'mock');
        const metric = (key, label, value, unit, note, prior) => ({
            key, label, value, formattedValue: fmt(value), unit, period: String(series.horizon.endYear), note,
            delta: value !== null && prior !== null && prior !== 0 ? { value: ((value - prior) / Math.abs(prior)) * 100, unit: 'percent', direction: value >= prior ? 'up' : 'down', comparisonLabel: 'vs prior year (demo)' } : undefined,
            meta,
        });
        return { kpis: [
                metric('projectedDemand', 'Projected Demand', demand, 'persons', 'Forecast point for the selected horizon; illustrative fixture.', previousDemand),
                metric('projectedSupply', 'Projected Supply', supply, 'persons', 'Compatible supply proxy in the same illustrative unit and horizon.', previousSupply),
                metric('projectedGap', 'Projected Gap', gap, 'persons', gap === null ? 'Unavailable because compatible inputs are missing.' : gap > 0 ? 'Positive values indicate potential shortage (demand − supply).' : gap < 0 ? 'Negative values indicate potential surplus (demand − supply).' : 'Demand and supply are equal in this fixture.', null),
                metric('highRiskOccupations', 'High-Risk Occupations', highRisk, 'occupations', 'Distinct occupations in high/critical non-resolved demo warnings; rule metadata is illustrative.', null),
            ], meta };
    }
    async getSeries(filters, viewBy, options) {
        checkSignal(options?.signal);
        return makeSeries(filters, viewBy);
    }
    async getWarnings(filters, params, options) {
        checkSignal(options?.signal);
        let list = this.alerts.filter((alert) => {
            if (filters.stateCode && alert.regionCode !== filters.stateCode)
                return false;
            if (filters.occupationCode && alert.entityCode !== filters.occupationCode && alert.entityType === 'occupation')
                return false;
            if (filters.skillCode && alert.entityCode !== filters.skillCode && alert.entityType === 'skill')
                return false;
            if (params?.category && alert.category !== params.category)
                return false;
            return true;
        });
        const severityWeight = { critical: 0, high: 1, moderate: 2, low: 3, information: 4 };
        list = list.sort((a, b) => severityWeight[a.severity] - severityWeight[b.severity] || a.expectedHorizon.startYear - b.expectedHorizon.startYear);
        const counts = { total: list.length, new: 0, 'under-review': 0, acknowledged: 0, resolved: 0, critical: 0, high: 0, moderate: 0, low: 0, information: 0 };
        for (const item of list) {
            counts[item.status] = (counts[item.status] ?? 0) + 1;
            counts[item.severity] = (counts[item.severity] ?? 0) + 1;
        }
        return { items: list.slice(0, params?.limit ?? list.length).map((item) => ({ ...item })), counts, meta: metaFor(filters, 'mock') };
    }
    async getRiskMatrix(filters, entityType, options) {
        checkSignal(options?.signal);
        const regionList = filters.stateCode ? states.filter((item) => item.code === filters.stateCode) : states;
        const entityList = entityType === 'occupation' ? occupations : entityType === 'sector' ? sectors : skills;
        const filteredEntities = entityType === 'occupation' && filters.occupationCode ? entityList.filter((item) => item.code === filters.occupationCode)
            : entityType === 'sector' && filters.sectorCode ? entityList.filter((item) => item.code === filters.sectorCode)
                : entityType === 'skill' && filters.skillCode ? entityList.filter((item) => item.code === filters.skillCode) : entityList;
        const factorByRegion = { 'IN-MH': 1.12, 'IN-UP': 1.23, 'IN-TN': 0.9, 'IN-KA': 0.88, 'IN-GJ': 1.04, 'IN-OD': 0.78, 'IN-WB': 0.96, 'IN-BR': 1.01 };
        const gapRatios = [0.26, 0.14, 0.04, -0.12, -0.24, 0.18, 0.1, -0.04];
        const cells = [];
        regionList.forEach((region, ri) => filteredEntities.forEach((entity, ei) => {
            const demand = Math.round((40000 + ei * 8400) * (factorByRegion[region.code] ?? 1));
            const ratio = gapRatios[(ri * 3 + ei * 5) % gapRatios.length];
            const gap = Math.round(demand * ratio);
            const supply = demand - gap;
            cells.push({ regionCode: region.code, entityCode: entity.code, entityType, riskClass: riskClassFor(gap, demand), demand, supply, gap, unit: 'persons', forecastYear: 2024 + filters.horizonYears, ruleId: `DEMO-RISK-${riskClassFor(gap, demand).toUpperCase()}`, provenance: 'mock', sourceLabels: [...mockMeta.sourceLabels], notes: ['Deterministic risk cell for UI validation only; not a production risk classification.'] });
        }));
        return { regions: regionList, entities: filteredEntities, cells, legend: [...legend], meta: metaFor(filters, 'mock') };
    }
    async getStateRiskMap(filters, entityType, options) {
        checkSignal(options?.signal);
        const matrix = await this.getRiskMatrix(filters, entityType, options);
        const valuesByStateCode = {};
        for (const region of matrix.regions) {
            const cells = matrix.cells.filter((cell) => cell.regionCode === region.code && cell.gap !== null);
            if (!cells.length)
                valuesByStateCode[region.code] = { value: null, riskClass: 'no-data' };
            else {
                const maximum = [...cells].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity))[0];
                valuesByStateCode[region.code] = { value: maximum.gap, riskClass: maximum.riskClass };
            }
        }
        return { valuesByStateCode, unit: 'persons', legend: [...legend], geometryAvailable: false, geometryUnavailableReason: 'No verified, licensed State/UT GeoJSON is included in this frontend package; map shading is intentionally disabled.', meta: metaFor(filters, 'mock') };
    }
    async getRiskDetails(filters, regionCode, entityCode, options) {
        checkSignal(options?.signal);
        const entityType = options?.entityType ?? (sectors.some((item) => item.code === entityCode) ? 'sector' : skills.some((item) => item.code === entityCode) ? 'skill' : 'occupation');
        const matrix = await this.getRiskMatrix({ ...filters, stateCode: '' }, entityType, options);
        const cell = matrix.cells.find((item) => item.regionCode === regionCode && item.entityCode === entityCode);
        if (!cell)
            throw new Error('Risk detail is not available for this region/entity in the active fixture.');
        return { cell, evidence: ['Illustrative historical and projected series used by the fixture.', `Rule ${cell.ruleId} returned this illustrative risk band.`, 'No source-backed labour-market observation is included in this demo detail.'], assumptions: ['Forecast growth follows the scenario fixture and does not represent an official projection.', 'Regional and occupation series are simplified synthetic aggregates.'], drivers: [{ label: 'Projected demand pressure', contribution: cell.gap === null ? null : cell.gap / Math.max(1, cell.demand ?? 1), unit: 'gap / demand ratio' }], meta: metaFor(filters, 'mock') };
    }
    async getScenarioOptions(filters, options) {
        checkSignal(options?.signal);
        return {
            scenarios: [
                { id: 'baseline', label: 'Baseline', description: 'Current fixture trajectory with no additional growth adjustment.', isDefault: true },
                { id: 'higher-growth', label: 'Higher Growth', description: 'Conditional trajectory with growth above the baseline.' },
                { id: 'lower-growth', label: 'Lower Growth', description: 'Conditional trajectory with growth below the baseline.' },
            ],
            assumptions: [{ key: 'growthRatePct', label: 'Annual demand growth adjustment', value: 0, unit: 'percentage points', min: -4, max: 4, step: 0.5, editable: true, source: 'Mock scenario fixture (demo only)' }],
            meta: metaFor(filters, 'mock'),
        };
    }
    async compareScenarios(filters, scenarioIds, assumptionValues = {}, options) {
        checkSignal(options?.signal);
        const series = makeSeries(filters, 'total');
        const baseDemand = series.points.filter((point) => point.forecastDemand !== null && point.forecastDemand !== undefined);
        const baseSupply = series.points.filter((point) => point.forecastSupply !== null && point.forecastSupply !== undefined);
        const adjustment = Math.max(-4, Math.min(4, assumptionValues.growthRatePct ?? 0)) / 100;
        const labels = { baseline: 'Baseline', 'higher-growth': 'Higher Growth', 'lower-growth': 'Lower Growth' };
        const scenarios = scenarioIds.map((id) => {
            const direction = id === 'higher-growth' ? 1 : id === 'lower-growth' ? -1 : 0;
            return { id, label: labels[id] ?? id, points: baseDemand.map((point, i) => {
                    const base = point.forecastDemand ?? 0;
                    const supply = baseSupply[i]?.forecastSupply ?? 0;
                    const deltaRate = (direction * 0.022) + adjustment;
                    const demand = Math.round(base * Math.pow(1 + deltaRate, i + 1));
                    return { ...point, forecastDemand: demand, forecastSupply: supply, demandInterval: point.demandInterval, supplyInterval: point.supplyInterval };
                }) };
        });
        return { scenarios, assumptions: [{ key: 'growthRatePct', label: 'Annual demand growth adjustment', value: adjustment * 100, unit: 'percentage points', min: -4, max: 4, editable: true, source: 'Mock scenario fixture (demo only)' }], meta: metaFor(filters, 'mock') };
    }
    async getModelPerformance(filters, options) {
        checkSignal(options?.signal);
        const factor = scaleFor(filters);
        const source = [
            { period: '2019', actual: 83500, error: -1500 }, { period: '2020', actual: 87100, error: 2300 },
            { period: '2022', actual: 95600, error: -2800 }, { period: '2023', actual: 99800, error: 1900 }, { period: '2024', actual: 104600, error: 2700 },
        ].map((item) => ({ period: item.period, actual: Math.round(item.actual * factor), predicted: Math.round((item.actual + item.error) * factor) }));
        const errors = source.map((item) => item.predicted - item.actual);
        const mae = errors.reduce((sum, value) => sum + Math.abs(value), 0) / errors.length;
        const rmse = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
        const mape = source.every((item) => Math.abs(item.actual) > 1) ? errors.reduce((sum, value, i) => sum + Math.abs(value / source[i].actual), 0) / errors.length * 100 : null;
        return {
            series: source.map((item) => ({ ...item, lower: Math.round(item.predicted * 0.97), upper: Math.round(item.predicted * 1.03) })),
            metrics: [
                { key: 'mae', label: 'Mean absolute error (MAE)', value: mae, unit: 'persons', definition: 'Average absolute difference between actual and predicted values.', suitabilityNote: 'Unit remains persons; lower is better for the same series and evaluation window.' },
                { key: 'rmse', label: 'Root mean square error (RMSE)', value: rmse, unit: 'persons', definition: 'Square root of mean squared prediction error; larger misses receive more weight.' },
                ...(mape === null ? [] : [{ key: 'mape', label: 'Mean absolute percentage error (MAPE)', value: mape, unit: '%', definition: 'Mean absolute percentage error over the supplied non-zero actuals.', suitabilityNote: 'Only shown because all fixture actuals are non-zero; interpret cautiously.' }]),
            ],
            evaluation: { startPeriod: '2019', endPeriod: '2024', horizon: 1, modelVersion: 'DEMO-FCST-0.1', baseline: 'Illustrative historical baseline' },
            coverage: { usablePeriods: 5, expectedPeriods: 6, percent: 83.3, gaps: ['2021: no fixture observation supplied'] },
            limitations: ['All values are synthetic fixture values, not validated model backtests.', 'Historical backtest performance does not guarantee future accuracy.', 'Coverage values exist solely to exercise the explanatory UI.'],
            meta: metaFor(filters, 'mock'),
        };
    }
    async getAlerts(filters, params, options) {
        checkSignal(options?.signal);
        const needle = (params?.query ?? '').trim().toLowerCase();
        const matched = this.alerts.filter((item) => {
            if (filters.stateCode && item.regionCode !== filters.stateCode)
                return false;
            if (params?.status && params.status !== 'all' && item.status !== params.status)
                return false;
            if (params?.severity && params.severity !== 'all' && item.severity !== params.severity)
                return false;
            if (needle && ![item.id, item.title, item.entityLabel, item.regionLabel, item.rule.label].some((v) => (v ?? '').toLowerCase().includes(needle)))
                return false;
            return true;
        });
        const counts = { total: matched.length, new: 0, 'under-review': 0, acknowledged: 0, resolved: 0, critical: 0, high: 0, moderate: 0, low: 0, information: 0 };
        matched.forEach((item) => { counts[item.status] = (counts[item.status] ?? 0) + 1; counts[item.severity] = (counts[item.severity] ?? 0) + 1; });
        const page = Math.max(0, params?.page ?? 0);
        const pageSize = Math.max(1, params?.pageSize ?? 8);
        return { items: matched.slice(page * pageSize, page * pageSize + pageSize).map((item) => ({ ...item })), total: matched.length, counts, meta: metaFor(filters, 'mock') };
    }
    async getAlertDetail(id, options) {
        checkSignal(options?.signal);
        const alert = this.alerts.find((item) => item.id === id);
        if (!alert)
            throw new Error(`Alert ${id} was not found.`);
        const timeline = this.timeline.get(id) ?? [{ at: alert.createdAt, event: 'Illustrative alert fixture created', actor: 'Demo adapter' }, ...(alert.status !== 'new' ? [{ at: alert.updatedAt, event: `Status set to ${alert.status}`, actor: alert.assigneeLabel ?? 'Demo adapter' }] : [])];
        return {
            alert: { ...alert },
            factors: [
                { label: 'Projected demand pressure', explanation: 'Synthetic projected demand compared with a compatible illustrative supply proxy.', value: alert.severity === 'critical' ? 0.26 : alert.severity === 'high' ? 0.18 : 0.1, unit: 'gap / demand ratio' },
                { label: 'Observation coverage', explanation: 'This fixture does not contain source-backed coverage evidence.', value: null },
            ],
            evidence: ['The alert is part of the deterministic mock fixture.', `Rule ${alert.rule.id}: ${alert.rule.thresholdDescription}`, `Entity: ${alert.entityLabel}; region: ${alert.regionLabel ?? 'not specified'}.`],
            assumptions: ['This is not a production warning.', 'A model/service must supply verified source observations, thresholds and evaluation horizon before operational use.'],
            timeline: timeline.map((item) => ({ ...item })),
            recommendations: ['Validate source coverage and rule configuration with the analytics owner.', 'Review the projected horizon against observed data before taking action.'],
            meta: metaFor({ horizonYears: 5, geographyCode: alert.regionCode ?? 'IN' }, 'mock'),
        };
    }
    async acknowledgeAlert(id, options) {
        checkSignal(options?.signal);
        return this.updateAlert(id, { status: 'acknowledged' }, options);
    }
    async updateAlert(id, patch, options) {
        checkSignal(options?.signal);
        const index = this.alerts.findIndex((item) => item.id === id);
        if (index < 0)
            throw new Error(`Alert ${id} was not found.`);
        const prior = this.alerts[index];
        const updated = { ...prior, ...patch, updatedAt: new Date().toISOString() };
        this.alerts[index] = updated;
        const events = this.timeline.get(id) ?? [{ at: prior.createdAt, event: 'Illustrative alert fixture created', actor: 'Demo adapter' }];
        if (patch.status && patch.status !== prior.status)
            events.push({ at: updated.updatedAt, event: `Status changed: ${prior.status} → ${patch.status}`, actor: updated.assigneeLabel ?? 'Demo analyst' });
        if (patch.assigneeId !== undefined && patch.assigneeId !== prior.assigneeId)
            events.push({ at: updated.updatedAt, event: `Assignment updated: ${updated.assigneeLabel ?? updated.assigneeId ?? 'Unassigned'}`, actor: 'Demo analyst' });
        this.timeline.set(id, events);
        return { ...updated };
    }
    async addAlertNote(id, note, options) {
        checkSignal(options?.signal);
        if (!this.alerts.some((item) => item.id === id))
            throw new Error(`Alert ${id} was not found.`);
        const clean = note.trim();
        if (!clean)
            throw new Error('Enter a note before saving.');
        const createdAt = new Date().toISOString();
        const noteId = `demo-note-${(this.notes.get(id)?.length ?? 0) + 1}`;
        const notes = this.notes.get(id) ?? [];
        notes.push(clean);
        this.notes.set(id, notes);
        const timeline = this.timeline.get(id) ?? [];
        timeline.push({ at: createdAt, event: `Note added: ${clean}`, actor: 'Demo analyst' });
        this.timeline.set(id, timeline);
        return { id: noteId, createdAt };
    }
}
exports.MockForecastsAdapter = MockForecastsAdapter;

},
"forecasts/restAdapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestForecastsAdapter = exports.ForecastsApiError = void 0;
class ForecastsApiError extends Error {
    constructor(message, status, code) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = 'ForecastsApiError';
        this.status = status;
        this.code = code;
    }
}
exports.ForecastsApiError = ForecastsApiError;
function normalizePrefix(baseUrl) {
    const root = baseUrl.trim().replace(/\/+$/, '');
    if (/\/api\/v1\/forecasts$/i.test(root))
        return root;
    if (/\/api\/v1$/i.test(root))
        return `${root}/forecasts`;
    return `${root}/api/v1/forecasts`;
}
function queryFor(filters, extra = {}) {
    const params = new URLSearchParams();
    params.set('horizonYears', String(filters.horizonYears));
    if (filters.geographyCode)
        params.set('geographyCode', filters.geographyCode);
    if (filters.stateCode)
        params.set('stateCode', filters.stateCode);
    if (filters.sectorCode)
        params.set('sectorCode', filters.sectorCode);
    if (filters.occupationCode)
        params.set('occupationCode', filters.occupationCode);
    if (filters.skillCode)
        params.set('skillCode', filters.skillCode);
    if (filters.period)
        params.set('period', filters.period);
    for (const [key, value] of Object.entries(extra))
        if (value !== undefined && value !== '')
            params.set(key, String(value));
    return params.toString();
}
class RestForecastsAdapter {
    constructor(options) {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'rest'
        });
        Object.defineProperty(this, "prefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "getAccessToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fetchImpl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (!options.baseUrl.trim())
            throw new Error('A SHRAMIK API base URL is required for REST mode.');
        this.prefix = normalizePrefix(options.baseUrl);
        this.getAccessToken = options.getAccessToken;
        this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
    }
    async request(path, init = {}, options) {
        const token = await this.getAccessToken?.();
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/json');
        if (init.body !== undefined && !headers.has('Content-Type'))
            headers.set('Content-Type', 'application/json');
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        let response;
        try {
            response = await this.fetchImpl(`${this.prefix}${path}`, { ...init, headers, credentials: 'include', signal: options?.signal ?? init.signal });
        }
        catch (error) {
            if (options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError'))
                throw error;
            throw new ForecastsApiError(error instanceof Error ? `Forecast service is unreachable: ${error.message}` : 'Forecast service is unreachable.', 0, 'NETWORK_ERROR');
        }
        if (response.status === 204)
            return undefined;
        const contentType = response.headers.get('content-type') ?? '';
        const body = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
        if (!response.ok) {
            const message = typeof body === 'string' ? body : body?.message ?? body?.error ?? `Forecast service returned HTTP ${response.status}.`;
            const code = typeof body === 'object' && body ? body.code : undefined;
            throw new ForecastsApiError(String(message), response.status, typeof code === 'string' ? code : undefined);
        }
        if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data'))
            return body.data;
        return body;
    }
    path(route, query = '') { return `/${route}${query ? `?${query}` : ''}`; }
    async getFilterOptions(options) {
        return this.request(this.path('filter-options'), {}, options);
    }
    async getOverview(filters, options) {
        return this.request(this.path('overview', queryFor(filters)), {}, options);
    }
    async getSeries(filters, viewBy, options) {
        return this.request(this.path('series', queryFor(filters, { viewBy })), {}, options);
    }
    async getWarnings(filters, params, options) {
        return this.request(this.path('warnings', queryFor(filters, { limit: params?.limit, category: params?.category })), {}, options);
    }
    async getRiskMatrix(filters, entityType, options) {
        return this.request(this.path('risk-matrix', queryFor(filters, { entityType })), {}, options);
    }
    async getStateRiskMap(filters, entityType, options) {
        return this.request(this.path('state-risk-map', queryFor(filters, { entityType })), {}, options);
    }
    async getRiskDetails(filters, regionCode, entityCode, options) {
        return this.request(this.path('risk-details', queryFor(filters, { regionCode, entityCode, entityType: options?.entityType })), {}, options);
    }
    async getScenarioOptions(filters, options) {
        return this.request(this.path('scenario-options', queryFor(filters)), {}, options);
    }
    async compareScenarios(filters, scenarioIds, assumptionValues = {}, options) {
        return this.request(this.path('scenario-comparisons'), { method: 'POST', body: JSON.stringify({ filters, scenarioIds, assumptionValues }) }, options);
    }
    async getModelPerformance(filters, options) {
        return this.request(this.path('model-performance', queryFor(filters)), {}, options);
    }
    async getAlerts(filters, params, options) {
        return this.request(this.path('alerts', queryFor(filters, { status: params?.status, severity: params?.severity, query: params?.query, page: params?.page, pageSize: params?.pageSize })), {}, options);
    }
    async getAlertDetail(id, options) {
        return this.request(this.path(`alerts/${encodeURIComponent(id)}`), {}, options);
    }
    async acknowledgeAlert(id, options) {
        return this.request(this.path(`alerts/${encodeURIComponent(id)}/acknowledge`), { method: 'POST', body: JSON.stringify({}) }, options);
    }
    async updateAlert(id, patch, options) {
        return this.request(this.path(`alerts/${encodeURIComponent(id)}`), { method: 'PATCH', body: JSON.stringify(patch) }, options);
    }
    async addAlertNote(id, note, options) {
        return this.request(this.path(`alerts/${encodeURIComponent(id)}/notes`), { method: 'POST', body: JSON.stringify({ note }) }, options);
    }
}
exports.RestForecastsAdapter = RestForecastsAdapter;

},
"reports/ReportsPage": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsPage = ReportsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const ReportDocument_1 = require("./ReportDocument");
const adapter_1 = require("./adapter");
const VIEW_TABS = [
    { key: 'builder', label: 'Report Builder', description: 'Configure an evidence-backed intelligence document.' },
    { key: 'library', label: 'Report Library', description: 'Search and reopen saved report snapshots.' },
    { key: 'preview', label: 'Report Preview', description: 'Review the structured document before printing or exporting.' },
];
const TYPE_INFO = {
    STATE: { title: 'State Report', desc: 'State/UT workforce demand, supply and skill intelligence.', mark: 'ST' },
    SECTOR: { title: 'Sector Report', desc: 'Sector patterns, occupations and workforce signals.', mark: 'SC' },
    SKILL: { title: 'Skill Report', desc: 'Evidence and limitations for a selected skill scope.', mark: 'SK' },
    POLICY_BRIEF: { title: 'Policy Brief', desc: 'A concise, decision-oriented summary of selected evidence.', mark: 'PB' },
    CUSTOM: { title: 'Custom Report', desc: 'Build a report from the sections you choose.', mark: 'CU' },
};
const statusLabel = { QUEUED: 'Queued', RUNNING: 'Generating', COMPLETED: 'Completed', FAILED: 'Failed', CANCELLED: 'Cancelled', NOT_CONFIGURED: 'Not configured' };
const safeFileName = (value) => value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'shramik-report';
const clone = (value) => JSON.parse(JSON.stringify(value));
function initialConfig(options) {
    const geography = options.geographies.find((item) => item.id === 'IN-KA') ?? options.geographies[0];
    const period = options.periods[0] ?? { start: '', end: '', label: 'Period not supplied' };
    const preferred = ['EXECUTIVE_SUMMARY', 'DEMAND', 'SUPPLY', 'SKILL_GAPS', 'FORECASTS', 'SOURCES_METHOD'];
    const selected = options.sections.filter((section) => section.required || preferred.includes(section.key)).map((section) => section.key);
    return {
        reportType: options.reportTypes.includes('STATE') ? 'STATE' : options.reportTypes[0] ?? 'CUSTOM',
        title: `Labour Market Intelligence — ${geography?.label ?? 'India'}`,
        geographyIds: geography ? [geography.id] : [], period: clone(period), referenceYear: options.referenceYears[options.referenceYears.length - 1],
        sectionKeys: selected, sourcePolicy: { mode: 'LATEST_VALIDATED' }, options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: 'shramik-report-v1',
    };
}
function dateLabel(value) {
    if (!value)
        return 'Not supplied';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
function PeriodLabel({ period }) { return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: period.label || `${period.start || 'Start not supplied'} – ${period.end || 'End not supplied'}` }); }
function ProvenanceChip({ provenance }) {
    const text = provenance === 'SYNTHETIC_DEMO' ? 'SYNTHETIC_DEMO' : provenance.replaceAll('_', ' ');
    return (0, jsx_runtime_1.jsxs)("span", { className: `reports-provenance reports-prov-${provenance.toLowerCase()}`, children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true" }), text] });
}
function ReportsPage({ dataAdapter, initialView = 'builder', className = '' }) {
    const [defaultAdapter] = (0, react_1.useState)(() => (0, adapter_1.createReportsAdapter)());
    const adapter = dataAdapter ?? defaultAdapter;
    const [activeView, setActiveView] = (0, react_1.useState)(initialView);
    const [options, setOptions] = (0, react_1.useState)(null);
    const [config, setConfig] = (0, react_1.useState)(null);
    const [generatedConfig, setGeneratedConfig] = (0, react_1.useState)(null);
    const [reportDocument, setReportDocument] = (0, react_1.useState)(null);
    const [optionsLoading, setOptionsLoading] = (0, react_1.useState)(true);
    const [optionsError, setOptionsError] = (0, react_1.useState)('');
    const [busyAction, setBusyAction] = (0, react_1.useState)('');
    const [message, setMessage] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const [librarySearch, setLibrarySearch] = (0, react_1.useState)('');
    const [libraryType, setLibraryType] = (0, react_1.useState)('');
    const [libraryGeography, setLibraryGeography] = (0, react_1.useState)('');
    const [libraryStatus, setLibraryStatus] = (0, react_1.useState)('');
    const [libraryPeriodStart, setLibraryPeriodStart] = (0, react_1.useState)('');
    const [libraryPeriodEnd, setLibraryPeriodEnd] = (0, react_1.useState)('');
    const [libraryResult, setLibraryResult] = (0, react_1.useState)(null);
    const [libraryPage, setLibraryPage] = (0, react_1.useState)(1);
    const [libraryLoading, setLibraryLoading] = (0, react_1.useState)(false);
    const [libraryError, setLibraryError] = (0, react_1.useState)('');
    const [libraryReload, setLibraryReload] = (0, react_1.useState)(0);
    const [selectedCsvSection, setSelectedCsvSection] = (0, react_1.useState)('');
    const [outlineExpanded, setOutlineExpanded] = (0, react_1.useState)(true);
    const [validationErrors, setValidationErrors] = (0, react_1.useState)([]);
    const optionsController = (0, react_1.useRef)(null);
    const loadOptions = (0, react_1.useCallback)(async () => {
        optionsController.current?.abort();
        const controller = new AbortController();
        optionsController.current = controller;
        setOptionsLoading(true);
        setOptionsError('');
        try {
            const nextOptions = await adapter.getOptions(controller.signal);
            if (controller.signal.aborted)
                return;
            if (!nextOptions.reportTypes.length || !nextOptions.geographies.length || !nextOptions.periods.length || !nextOptions.sections.length) {
                throw new Error('The Reports service returned incomplete configuration options. Check supported report types, geographies, periods and sections.');
            }
            setOptions(nextOptions);
            setConfig((current) => current ?? initialConfig(nextOptions));
        }
        catch (reason) {
            if (!controller.signal.aborted)
                setOptionsError(reason instanceof Error ? reason.message : 'Reports configuration could not be loaded.');
        }
        finally {
            if (!controller.signal.aborted)
                setOptionsLoading(false);
        }
    }, [adapter]);
    (0, react_1.useEffect)(() => { void loadOptions(); return () => optionsController.current?.abort(); }, [loadOptions]);
    const isStale = !!reportDocument && !!generatedConfig && !!config && JSON.stringify(generatedConfig) !== JSON.stringify(config);
    const selectedSections = (0, react_1.useMemo)(() => options?.sections.filter((section) => config?.sectionKeys.includes(section.key)) ?? [], [options, config]);
    const requiredSectionKeys = (0, react_1.useMemo)(() => options?.sections.filter((section) => section.required).map((section) => section.key) ?? [], [options]);
    const validations = (0, react_1.useMemo)(() => {
        if (!config || !options)
            return [];
        const problems = [];
        if (!config.title.trim())
            problems.push('Enter a report title.');
        if (!config.geographyIds.length)
            problems.push('Select at least one supported geography.');
        if (!options.periods.some((period) => period.start === config.period.start && period.end === config.period.end))
            problems.push('Select a reporting period supported by the current data options.');
        if (!config.sectionKeys.length)
            problems.push('Select at least one report section.');
        const missingRequired = requiredSectionKeys.filter((key) => !config.sectionKeys.includes(key));
        if (missingRequired.length)
            problems.push(`Required sections are missing: ${missingRequired.map((key) => options.sections.find((item) => item.key === key)?.label ?? key).join(', ')}.`);
        if (config.sourcePolicy.mode === 'FIXED_SNAPSHOT' && !(config.sourcePolicy.snapshotIds?.length))
            problems.push('Choose a supported snapshot for fixed-snapshot reporting.');
        return problems;
    }, [config, options, requiredSectionKeys]);
    const loadLibrary = (0, react_1.useCallback)(async (signal) => {
        const query = {
            query: librarySearch.trim() || undefined, reportType: libraryType || undefined, geographyId: libraryGeography || undefined,
            status: libraryStatus, periodStart: libraryPeriodStart || undefined, periodEnd: libraryPeriodEnd || undefined, page: libraryPage, pageSize: 8,
        };
        setLibraryLoading(true);
        setLibraryError('');
        try {
            const result = await adapter.listReports(query, signal);
            if (!signal?.aborted)
                setLibraryResult({ items: result.items, total: result.total, page: result.page, pageSize: result.pageSize, provenance: result.provenance });
        }
        catch (reason) {
            if (!signal?.aborted)
                setLibraryError(reason instanceof Error ? reason.message : 'The report library could not be loaded.');
        }
        finally {
            if (!signal?.aborted)
                setLibraryLoading(false);
        }
    }, [adapter, librarySearch, libraryType, libraryGeography, libraryStatus, libraryPeriodStart, libraryPeriodEnd, libraryPage]);
    (0, react_1.useEffect)(() => {
        if (activeView !== 'library' || !options)
            return;
        const controller = new AbortController();
        void loadLibrary(controller.signal);
        return () => controller.abort();
    }, [activeView, options, loadLibrary, libraryReload]);
    const updateConfig = (updater) => {
        setConfig((current) => current ? updater(current) : current);
        setMessage('');
        setError('');
        setValidationErrors([]);
    };
    const setField = (key, value) => updateConfig((current) => ({ ...current, [key]: value }));
    const generate = async (event) => {
        event?.preventDefault();
        if (!config || !options || busyAction)
            return;
        if (validations.length) {
            setValidationErrors(validations);
            setError('Review the required fields before generating this report.');
            return;
        }
        setBusyAction('generate');
        setError('');
        setMessage('');
        setValidationErrors([]);
        const snapshot = clone(config);
        const controller = new AbortController();
        try {
            const response = await adapter.createReport(snapshot, controller.signal);
            if (response.status === 'COMPLETED' && response.document) {
                setReportDocument(response.document);
                setGeneratedConfig(snapshot);
                setActiveView('preview');
                setSelectedCsvSection(response.document.sections.find((section) => section.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart'))?.key ?? response.document.sections[0]?.key ?? '');
                setMessage(response.message ?? 'Report preview is ready.');
                setLibraryReload((value) => value + 1);
            }
            else if (response.status === 'QUEUED' || response.status === 'RUNNING') {
                setMessage(`Report job ${response.reportId || '(ID not supplied)'} was accepted with status ${statusLabel[response.status]}. A completed document was not returned; check the Library for backend status updates.`);
                setActiveView('library');
                setLibraryReload((value) => value + 1);
            }
            else if (response.status === 'NOT_CONFIGURED') {
                setError(response.message ?? 'Report generation is not configured on the backend.');
            }
            else {
                setError(response.message ?? `Report generation returned status ${statusLabel[response.status]}.`);
            }
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Report generation failed. Your selections were preserved.');
        }
        finally {
            setBusyAction('');
        }
    };
    const configureFromDocument = (doc) => {
        const snapshot = doc.configSnapshot;
        if (snapshot) {
            const validGeographies = snapshot.geographyIds.filter((id) => options?.geographies.some((geo) => geo.id === id));
            const validPeriod = options?.periods.find((period) => period.start === snapshot.period.start && period.end === snapshot.period.end);
            const validSections = snapshot.sectionKeys.filter((key) => options?.sections.some((section) => section.key === key));
            return {
                ...clone(snapshot), reportType: options?.reportTypes.includes(snapshot.reportType) ? snapshot.reportType : options?.reportTypes[0] ?? 'CUSTOM',
                geographyIds: validGeographies.length ? validGeographies : options?.geographies.slice(0, 1).map((geo) => geo.id) ?? [],
                period: clone(validPeriod ?? options?.periods[0] ?? doc.period),
                referenceYear: snapshot.referenceYear !== undefined && options?.referenceYears.includes(snapshot.referenceYear) ? snapshot.referenceYear : options?.referenceYears[options.referenceYears.length - 1],
                sectionKeys: [...new Set([...validSections, ...(options?.sections.filter((section) => section.required).map((section) => section.key) ?? [])])],
            };
        }
        const geoIds = doc.geographyLabels.map((label) => options?.geographies.find((geo) => geo.label === label)?.id).filter((id) => !!id);
        const supportedPeriod = options?.periods.find((period) => period.start === doc.period.start && period.end === doc.period.end) ?? options?.periods[0] ?? doc.period;
        const supportedType = options?.reportTypes.includes(doc.reportType) ? doc.reportType : options?.reportTypes[0] ?? 'CUSTOM';
        const supportedYear = doc.referenceYear !== undefined && options?.referenceYears.includes(doc.referenceYear) ? doc.referenceYear : options?.referenceYears[options.referenceYears.length - 1];
        return {
            reportType: supportedType, title: doc.title, geographyIds: geoIds.length ? geoIds : config?.geographyIds ?? [], period: clone(supportedPeriod), referenceYear: supportedYear,
            sectionKeys: [...new Set([...doc.sections.map((section) => section.key), ...(options?.sections.filter((section) => section.required).map((section) => section.key) ?? [])])], sourcePolicy: { mode: 'LATEST_VALIDATED' }, options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: doc.templateVersion,
        };
    };
    const openReport = async (item) => {
        if (!item.capabilities.open || busyAction)
            return;
        setBusyAction('open');
        setError('');
        setMessage('');
        try {
            const doc = await adapter.getReport(item.id);
            const openedConfig = configureFromDocument(doc);
            setReportDocument(doc);
            setConfig(openedConfig);
            setGeneratedConfig(clone(openedConfig));
            setActiveView('preview');
            setSelectedCsvSection(doc.sections.find((section) => section.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart'))?.key ?? doc.sections[0]?.key ?? '');
        }
        catch (reason) {
            setLibraryError(reason instanceof Error ? reason.message : 'Report could not be opened.');
        }
        finally {
            setBusyAction('');
        }
    };
    const duplicateReport = async (item) => {
        if (!item.capabilities.duplicate || busyAction)
            return;
        setBusyAction('duplicate');
        setError('');
        setMessage('');
        try {
            const duplicate = await adapter.duplicateReport(item.id);
            setConfig(duplicate.config);
            setGeneratedConfig(null);
            setReportDocument(null);
            setActiveView('builder');
            setMessage(`${duplicate.message ?? 'Configuration copied.'} Review the settings and generate a new snapshot.`);
        }
        catch (reason) {
            setLibraryError(reason instanceof Error ? reason.message : 'Report configuration could not be duplicated.');
        }
        finally {
            setBusyAction('');
        }
    };
    const retryReport = async (item) => {
        if (!item.capabilities.retry || busyAction)
            return;
        setBusyAction('retry');
        setLibraryError('');
        try {
            const result = await adapter.retryReport(item.id);
            setMessage(result.message ?? `Retry request returned ${statusLabel[result.status]}.`);
            setLibraryReload((value) => value + 1);
        }
        catch (reason) {
            setLibraryError(reason instanceof Error ? reason.message : 'Retry request failed.');
        }
        finally {
            setBusyAction('');
        }
    };
    const deleteReport = async (item) => {
        if (!item.capabilities.delete || !adapter.deleteReport || busyAction)
            return;
        if (!window.confirm(`Delete “${item.title}” from the report library? This action may not be reversible.`))
            return;
        setBusyAction('delete');
        setLibraryError('');
        try {
            const result = await adapter.deleteReport(item.id);
            if (!result.deleted)
                throw new Error(result.message ?? 'The report was not deleted.');
            setMessage(result.message ?? 'Report deleted.');
            setLibraryReload((value) => value + 1);
        }
        catch (reason) {
            setLibraryError(reason instanceof Error ? reason.message : 'Delete failed.');
        }
        finally {
            setBusyAction('');
        }
    };
    const exportCsv = async () => {
        if (!reportDocument || !selectedCsvSection || busyAction)
            return;
        setBusyAction('csv');
        setError('');
        setMessage('');
        try {
            const result = await adapter.exportCsv(reportDocument.id, selectedCsvSection);
            if (result.status !== 'READY')
                throw new Error(result.message ?? `CSV export status: ${result.status}.`);
            if (result.csvText !== undefined) {
                const blob = new Blob([result.csvText], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const anchor = window.document.createElement('a');
                anchor.href = url;
                anchor.download = `${safeFileName(reportDocument.title)}-${selectedCsvSection.toLowerCase()}.csv`;
                anchor.rel = 'noopener';
                window.document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                window.setTimeout(() => URL.revokeObjectURL(url), 1500);
                setMessage(`CSV download started for ${reportDocument.sections.find((section) => section.key === selectedCsvSection)?.title ?? selectedCsvSection}. Provenance is included in the file.`);
            }
            else if (result.downloadUrl) {
                const anchor = window.document.createElement('a');
                anchor.href = result.downloadUrl;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.click();
                setMessage(result.message ?? 'Authorised CSV download opened.');
            }
            else
                throw new Error('CSV export returned no file content or download URL.');
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'CSV export failed.');
        }
        finally {
            setBusyAction('');
        }
    };
    const exportPdf = async () => {
        if (!reportDocument || busyAction)
            return;
        setError('');
        setMessage('');
        if (options?.exportCapabilities.serverPdf && adapter.exportPdf) {
            setBusyAction('pdf');
            try {
                const result = await adapter.exportPdf(reportDocument.id);
                if (result.status !== 'READY' || !result.downloadUrl)
                    throw new Error(result.message ?? 'The Reports service did not return a completed PDF download.');
                const anchor = window.document.createElement('a');
                anchor.href = result.downloadUrl;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.click();
                setMessage('The backend returned an authorised PDF download.');
            }
            catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Server PDF export failed. No download was reported as complete.');
            }
            finally {
                setBusyAction('');
            }
        }
        else {
            setMessage('Browser print opened. Choose “Save as PDF” in the print dialog. No server-generated PDF was created.');
            window.print();
        }
    };
    const selectView = (view) => { setActiveView(view); setError(''); setMessage(''); };
    const sectionExportable = (sectionKey) => reportDocument?.sections.find((section) => section.key === sectionKey)?.blocks.some((block) => block.kind === 'table' || block.kind === 'metric_grid' || block.kind === 'chart') ?? false;
    const canExportCsv = !!reportDocument && options?.exportCapabilities.csv !== false && reportDocument.sections.some((section) => sectionExportable(section.key));
    const onSectionNav = (key) => {
        const target = key === 'top' ? 'report-top' : key === 'report-limitations' ? 'report-limitations' : `report-section-${key}`;
        const element = window.document.getElementById(target);
        element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        if (element) {
            element.setAttribute('tabindex', '-1');
            element.focus({ preventScroll: true });
        }
    };
    if (optionsLoading && !options)
        return (0, jsx_runtime_1.jsxs)("div", { className: `reports-page ${className}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "reports-page-header", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "reports-breadcrumb", children: "SHRAMIK / INTELLIGENCE" }), (0, jsx_runtime_1.jsx)("h1", { children: "REPORTS & INTELLIGENCE BRIEFS" }), (0, jsx_runtime_1.jsx)("p", { children: "Configure, review and export evidence-oriented workforce reports." })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-load-state", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 19, className: "reports-spin" }), " Loading supported report options\u2026"] })] });
    if (optionsError || !options || !config)
        return (0, jsx_runtime_1.jsxs)("div", { className: `reports-page ${className}`, children: [(0, jsx_runtime_1.jsx)("div", { className: "reports-page-header", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "reports-breadcrumb", children: "SHRAMIK / INTELLIGENCE" }), (0, jsx_runtime_1.jsx)("h1", { children: "REPORTS & INTELLIGENCE BRIEFS" }), (0, jsx_runtime_1.jsx)("p", { children: "Configure, review and export evidence-oriented workforce reports." })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-error", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 20 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Reports configuration unavailable" }), (0, jsx_runtime_1.jsx)("p", { children: optionsError || 'The Reports service returned no supported options.' }), (0, jsx_runtime_1.jsx)("p", { children: "Your page has not switched to demo data because the configured adapter failed." }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button", type: "button", onClick: () => void loadOptions(), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15 }), " Retry loading options"] })] })] })] });
    return (0, jsx_runtime_1.jsxs)("div", { className: `reports-page ${className}`, children: [(0, jsx_runtime_1.jsxs)("header", { className: "reports-page-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "reports-breadcrumb", children: "SHRAMIK / INTELLIGENCE / REPORTS" }), (0, jsx_runtime_1.jsx)("h1", { children: "REPORTS & INTELLIGENCE BRIEFS" }), (0, jsx_runtime_1.jsx)("p", { children: "Assemble a versioned report, inspect its evidence and export only what the selected snapshot supports." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-heading-meta", children: [(0, jsx_runtime_1.jsx)(ProvenanceChip, { provenance: options.provenance }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 14 }), " ", adapter.mode === 'demo' ? 'Demo adapter' : 'Connected adapter'] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "reports-view-tabs", role: "tablist", "aria-label": "Reports workspace views", children: VIEW_TABS.map((tab) => (0, jsx_runtime_1.jsxs)("button", { type: "button", role: "tab", id: `reports-tab-${tab.key}`, "aria-selected": activeView === tab.key, "aria-controls": `reports-panel-${tab.key}`, tabIndex: activeView === tab.key ? 0 : -1, className: activeView === tab.key ? 'is-active' : '', onClick: () => selectView(tab.key), onKeyDown: (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                        event.preventDefault();
                        const index = VIEW_TABS.findIndex((item) => item.key === activeView);
                        const next = VIEW_TABS[(index + (event.key === 'ArrowRight' ? 1 : VIEW_TABS.length - 1)) % VIEW_TABS.length];
                        selectView(next.key);
                        event.currentTarget.parentElement?.querySelector(`#reports-tab-${next.key}`)?.focus();
                    } }, children: [(0, jsx_runtime_1.jsx)("span", { children: tab.label }), (0, jsx_runtime_1.jsx)("small", { children: tab.description })] }, tab.key)) }), (message || error) && (0, jsx_runtime_1.jsxs)("div", { className: error ? 'reports-alert reports-alert-error' : 'reports-alert reports-alert-info', role: error ? 'alert' : 'status', children: [(0, jsx_runtime_1.jsx)("span", { children: error ? (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 17 }) }), (0, jsx_runtime_1.jsx)("p", { children: error || message }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "reports-alert-dismiss", "aria-label": "Dismiss message", onClick: () => { setError(''); setMessage(''); }, children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 16 }) })] }), activeView === 'builder' && (0, jsx_runtime_1.jsxs)("section", { id: "reports-panel-builder", role: "tabpanel", "aria-labelledby": "reports-tab-builder", className: "reports-builder-grid", children: [(0, jsx_runtime_1.jsxs)("form", { className: "reports-config-panel", onSubmit: (event) => void generate(event), noValidate: true, children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "reports-step", children: "01 / CONFIGURE" }), (0, jsx_runtime_1.jsx)("h2", { children: "Build your report" }), (0, jsx_runtime_1.jsx)("p", { children: "Only supported geographies, periods and sections are selectable." })] }), (0, jsx_runtime_1.jsx)("span", { className: "reports-heading-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 21 }) })] }), (0, jsx_runtime_1.jsxs)("fieldset", { className: "reports-type-fieldset", children: [(0, jsx_runtime_1.jsx)("legend", { children: "Report type" }), (0, jsx_runtime_1.jsx)("div", { className: "reports-type-grid", children: options.reportTypes.map((type) => (0, jsx_runtime_1.jsxs)("button", { type: "button", className: `reports-type-card ${config.reportType === type ? 'selected' : ''}`, "aria-pressed": config.reportType === type, onClick: () => {
                                                const geography = options.geographies.find((item) => item.id === config.geographyIds[0]);
                                                const title = config.title.trim() ? config.title : `${TYPE_INFO[type].title} — ${geography?.label ?? 'India'}`;
                                                setField('reportType', type);
                                                setField('title', title);
                                            }, children: [(0, jsx_runtime_1.jsx)("span", { className: "reports-type-mark", children: TYPE_INFO[type].mark }), (0, jsx_runtime_1.jsxs)("span", { className: "reports-type-copy", children: [(0, jsx_runtime_1.jsx)("strong", { children: TYPE_INFO[type].title }), (0, jsx_runtime_1.jsx)("small", { children: TYPE_INFO[type].desc })] }), config.reportType === type && (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 17, className: "reports-selected-check" })] }, type)) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-form-grid", children: [(0, jsx_runtime_1.jsxs)("label", { className: "reports-field reports-field-wide", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Report title ", (0, jsx_runtime_1.jsx)("b", { children: "*" })] }), (0, jsx_runtime_1.jsx)("input", { value: config.title, maxLength: 140, onChange: (event) => setField('title', event.target.value), placeholder: "Enter a descriptive report title", required: true }), (0, jsx_runtime_1.jsx)("small", { children: "Appears on the report cover and in the library." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-field", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Primary geography ", (0, jsx_runtime_1.jsx)("b", { children: "*" })] }), (0, jsx_runtime_1.jsxs)("select", { value: config.geographyIds[0] ?? '', onChange: (event) => { const id = event.target.value; updateConfig((current) => ({ ...current, geographyIds: id ? [id] : [], options: { ...current.options, compareGeographyIds: current.options.compareGeographyIds?.filter((other) => other !== id) } })); }, required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select supported geography" }), options.geographies.map((geo) => (0, jsx_runtime_1.jsxs)("option", { value: geo.id, children: [geo.label, " \u00B7 ", geo.level.replaceAll('_', ' ')] }, geo.id))] }), (0, jsx_runtime_1.jsx)("small", { children: "Districts appear only if the data service supports them." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-field", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Reporting period ", (0, jsx_runtime_1.jsx)("b", { children: "*" })] }), (0, jsx_runtime_1.jsx)("select", { value: `${config.period.start}|${config.period.end}`, onChange: (event) => { const period = options.periods.find((item) => `${item.start}|${item.end}` === event.target.value); if (period)
                                                    setField('period', clone(period)); }, required: true, children: options.periods.map((period) => (0, jsx_runtime_1.jsx)("option", { value: `${period.start}|${period.end}`, children: period.label || `${period.start} – ${period.end}` }, `${period.start}-${period.end}`)) }), (0, jsx_runtime_1.jsx)("small", { children: "Period options come from the active adapter." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-field", children: [(0, jsx_runtime_1.jsx)("span", { children: "Reference year" }), (0, jsx_runtime_1.jsxs)("select", { value: config.referenceYear ?? '', onChange: (event) => setField('referenceYear', event.target.value ? Number(event.target.value) : undefined), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Not specified" }), options.referenceYears.map((year) => (0, jsx_runtime_1.jsx)("option", { value: year, children: year }, year))] }), (0, jsx_runtime_1.jsx)("small", { children: "Only supported reference years are shown." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-field", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Comparison geography ", (0, jsx_runtime_1.jsx)("em", { children: "Optional" })] }), (0, jsx_runtime_1.jsxs)("select", { value: config.options.compareGeographyIds?.[0] ?? '', onChange: (event) => setField('options', { ...config.options, compareGeographyIds: event.target.value ? [event.target.value] : [] }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "No comparison" }), options.geographies.filter((geo) => !config.geographyIds.includes(geo.id)).map((geo) => (0, jsx_runtime_1.jsx)("option", { value: geo.id, children: geo.label }, geo.id))] }), (0, jsx_runtime_1.jsx)("small", { children: "Comparison scope is metadata unless returned by the report service." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-field", children: [(0, jsx_runtime_1.jsx)("span", { children: "Source policy" }), (0, jsx_runtime_1.jsxs)("select", { value: config.sourcePolicy.mode, onChange: (event) => setField('sourcePolicy', event.target.value === 'FIXED_SNAPSHOT' ? { mode: 'FIXED_SNAPSHOT', snapshotIds: options.sourceSnapshots?.[0] ? [options.sourceSnapshots[0].id] : [] } : { mode: 'LATEST_VALIDATED' }), children: [(0, jsx_runtime_1.jsx)("option", { value: "LATEST_VALIDATED", children: "Latest validated data" }), options.sourceSnapshots?.length ? (0, jsx_runtime_1.jsx)("option", { value: "FIXED_SNAPSHOT", children: "Fixed snapshot / version" }) : null] }), (0, jsx_runtime_1.jsx)("small", { children: config.sourcePolicy.mode === 'FIXED_SNAPSHOT' ? 'A fixed source snapshot will be recorded if the backend supports it.' : 'Uses the latest validated data available to the service.' })] }), config.sourcePolicy.mode === 'FIXED_SNAPSHOT' && options.sourceSnapshots?.length ? (0, jsx_runtime_1.jsxs)("label", { className: "reports-field reports-field-wide", children: [(0, jsx_runtime_1.jsx)("span", { children: "Source snapshot / version" }), (0, jsx_runtime_1.jsxs)("select", { value: config.sourcePolicy.snapshotIds?.[0] ?? '', onChange: (event) => setField('sourcePolicy', { mode: 'FIXED_SNAPSHOT', snapshotIds: event.target.value ? [event.target.value] : [] }), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select snapshot" }), options.sourceSnapshots.map((snapshot) => (0, jsx_runtime_1.jsxs)("option", { value: snapshot.id, children: [snapshot.label, snapshot.asOfDate ? ` · ${dateLabel(snapshot.asOfDate)}` : ''] }, snapshot.id))] })] }) : null] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-coverage-line", children: [(0, jsx_runtime_1.jsx)("span", { className: "reports-coverage-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 16 }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("strong", { children: [options.provenance === 'SYNTHETIC_DEMO' ? 'Illustrative demo mode' : 'Adapter provenance', " \u00B7 ", options.provenance.replaceAll('_', ' ')] }), (0, jsx_runtime_1.jsx)("p", { children: options.provenance === 'SYNTHETIC_DEMO' ? 'The fixture is synthetic. It is for UI review only and must not be cited as verified workforce evidence.' : 'Source availability, snapshot identifiers and coverage depend on the report service response.' })] })] }), (0, jsx_runtime_1.jsxs)("fieldset", { className: "reports-sections-fieldset", children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-section-legend", children: [(0, jsx_runtime_1.jsx)("legend", { children: "Include report sections" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "reports-link-button", onClick: () => updateConfig((current) => ({ ...current, sectionKeys: options.sections.map((section) => section.key) })), children: "Select all" }), (0, jsx_runtime_1.jsx)("span", { children: "\u00B7" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "reports-link-button", onClick: () => updateConfig((current) => ({ ...current, sectionKeys: options.sections.filter((section) => section.required).map((section) => section.key) })), children: "Deselect optional" })] }), (0, jsx_runtime_1.jsx)("p", { className: "reports-section-help", children: "Required sections are protected because scope and source limitations must travel with a report." }), (0, jsx_runtime_1.jsx)("div", { className: "reports-section-grid", children: options.sections.map((section) => {
                                            const selected = config.sectionKeys.includes(section.key);
                                            return (0, jsx_runtime_1.jsxs)("label", { className: `reports-section-option ${selected ? 'checked' : ''}`, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: selected, disabled: !!section.required, onChange: (event) => updateConfig((current) => ({ ...current, sectionKeys: event.target.checked ? [...current.sectionKeys, section.key] : current.sectionKeys.filter((key) => key !== section.key) })) }), (0, jsx_runtime_1.jsx)("span", { className: "reports-checkbox-ui", "aria-hidden": "true", children: selected && (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 13 }) }), (0, jsx_runtime_1.jsxs)("span", { className: "reports-section-option-copy", children: [(0, jsx_runtime_1.jsxs)("strong", { children: [section.label, section.required ? (0, jsx_runtime_1.jsx)("i", { children: "Required" }) : null] }), (0, jsx_runtime_1.jsx)("small", { children: section.description })] })] }, section.key);
                                        }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-advanced", children: [(0, jsx_runtime_1.jsxs)("span", { className: "reports-advanced-title", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.SlidersHorizontal, { size: 16 }), " Report options"] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-toggle-row", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: config.options.includeUncertainty, onChange: (event) => setField('options', { ...config.options, includeUncertainty: event.target.checked }) }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Include uncertainty and caveats" }), (0, jsx_runtime_1.jsx)("small", { children: "Carry uncertainty and quality limitations into the report where supplied." })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-toggle-row", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: config.options.includeDataAppendix, onChange: (event) => setField('options', { ...config.options, includeDataAppendix: event.target.checked }) }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Include data appendix" }), (0, jsx_runtime_1.jsx)("small", { children: "Request an appendix of selected structured data; included only if the report service supports it." })] })] })] }), validationErrors.length > 0 && (0, jsx_runtime_1.jsxs)("div", { className: "reports-error-list", role: "alert", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Fix these items:" }), (0, jsx_runtime_1.jsx)("ul", { children: validationErrors.map((item) => (0, jsx_runtime_1.jsx)("li", { children: item }, item)) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-builder-footer", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("small", { children: [config.sectionKeys.length, " sections selected \u00B7 template ", config.templateVersion] }), (0, jsx_runtime_1.jsxs)("strong", { children: [options.geographies.find((geo) => geo.id === config.geographyIds[0])?.label ?? 'Scope not selected', " ", (0, jsx_runtime_1.jsx)("span", { children: "\u00B7" }), " ", (0, jsx_runtime_1.jsx)(PeriodLabel, { period: config.period })] })] }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button reports-button-primary", type: "submit", disabled: !!busyAction || validations.length > 0, title: validations.length ? validations.join(' ') : undefined, children: [busyAction === 'generate' ? (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 17, className: "reports-spin" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 17 }), " ", busyAction === 'generate' ? 'Generating…' : 'Generate report', " ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 16 })] })] }), validations.length > 0 && (0, jsx_runtime_1.jsx)("p", { className: "reports-disabled-reason", children: "Generation is disabled until the required title, geography, period and section selection are valid." })] }), (0, jsx_runtime_1.jsxs)("aside", { className: "reports-builder-preview", "aria-label": "Live report configuration preview", children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-panel-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "reports-step", children: "02 / OUTLINE" }), (0, jsx_runtime_1.jsx)("h2", { children: "Live document outline" }), (0, jsx_runtime_1.jsx)("p", { children: "This is a draft outline, not a generated report." })] }), (0, jsx_runtime_1.jsx)("span", { className: "reports-heading-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Activity, { size: 20 }) })] }), isStale && (0, jsx_runtime_1.jsxs)("div", { className: "reports-stale-banner", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 15 }), " Configuration changed since the last generated snapshot. Regenerate to refresh the preview."] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-mini-cover", children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-mini-brand", children: [(0, jsx_runtime_1.jsx)("span", { children: "SH" }), "RAMIK ", (0, jsx_runtime_1.jsx)("small", { children: "LABOUR MARKET INTELLIGENCE" })] }), (0, jsx_runtime_1.jsx)("div", { className: "reports-mini-rule" }), (0, jsx_runtime_1.jsx)("p", { children: TYPE_INFO[config.reportType].title.toUpperCase() }), (0, jsx_runtime_1.jsx)("h3", { children: config.title || 'Untitled report' }), (0, jsx_runtime_1.jsxs)("dl", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Geography" }), (0, jsx_runtime_1.jsx)("dd", { children: config.geographyIds.map((id) => options.geographies.find((geo) => geo.id === id)?.label ?? id).join(', ') || 'Not selected' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Period" }), (0, jsx_runtime_1.jsx)("dd", { children: (0, jsx_runtime_1.jsx)(PeriodLabel, { period: config.period }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Reference year" }), (0, jsx_runtime_1.jsx)("dd", { children: config.referenceYear ?? 'Not specified' })] })] }), (0, jsx_runtime_1.jsx)("span", { className: "reports-mini-demo", children: options.provenance === 'SYNTHETIC_DEMO' ? 'ILLUSTRATIVE — SYNTHETIC DEMO DATA' : options.provenance.replaceAll('_', ' ') })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-outline-list", children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-outline-head", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Included sections" }), (0, jsx_runtime_1.jsx)("span", { children: selectedSections.length })] }), selectedSections.length ? selectedSections.map((section, index) => (0, jsx_runtime_1.jsxs)("div", { className: "reports-outline-row", children: [(0, jsx_runtime_1.jsx)("span", { children: String(index + 1).padStart(2, '0') }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: section.label }), (0, jsx_runtime_1.jsx)("small", { children: section.required ? 'Required context' : 'Selected analysis' })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.Check, { size: 15 })] }, section.key)) : (0, jsx_runtime_1.jsx)("p", { className: "reports-empty-inline", children: "Select at least one section to outline the document." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-draft-note", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 15 }), (0, jsx_runtime_1.jsx)("p", { children: "Source dates, model versions, metrics and findings are added only when supplied by the adapter. Unsupported sections remain unavailable rather than being filled with invented values." })] })] })] }), activeView === 'library' && (0, jsx_runtime_1.jsxs)("section", { id: "reports-panel-library", role: "tabpanel", "aria-labelledby": "reports-tab-library", className: "reports-library-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-panel-heading reports-library-heading", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "reports-step", children: "REPORT ARCHIVE" }), (0, jsx_runtime_1.jsx)("h2", { children: "Report library" }), (0, jsx_runtime_1.jsx)("p", { children: "Open versioned snapshots or duplicate a configuration to create a new one." })] }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button reports-button-primary", type: "button", onClick: () => selectView('builder'), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 16 }), " New report"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-library-toolbar", children: [(0, jsx_runtime_1.jsxs)("label", { className: "reports-search", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { size: 16 }), (0, jsx_runtime_1.jsx)("input", { value: librarySearch, onChange: (event) => { setLibraryPage(1); setLibrarySearch(event.target.value); }, placeholder: "Search title, report ID or geography\u2026", "aria-label": "Search reports" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Type" }), (0, jsx_runtime_1.jsxs)("select", { value: libraryType, onChange: (event) => { setLibraryPage(1); setLibraryType(event.target.value); }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All report types" }), options.reportTypes.map((type) => (0, jsx_runtime_1.jsx)("option", { value: type, children: TYPE_INFO[type]?.title ?? type }, type))] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Geography" }), (0, jsx_runtime_1.jsxs)("select", { value: libraryGeography, onChange: (event) => { setLibraryPage(1); setLibraryGeography(event.target.value); }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All geographies" }), options.geographies.map((geo) => (0, jsx_runtime_1.jsx)("option", { value: geo.id, children: geo.label }, geo.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Status" }), (0, jsx_runtime_1.jsxs)("select", { value: libraryStatus, onChange: (event) => { setLibraryPage(1); setLibraryStatus(event.target.value); }, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "All statuses" }), ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'NOT_CONFIGURED'].map((status) => (0, jsx_runtime_1.jsx)("option", { value: status, children: statusLabel[status] }, status))] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Period starts after" }), (0, jsx_runtime_1.jsx)("input", { type: "date", value: libraryPeriodStart, onChange: (event) => { setLibraryPage(1); setLibraryPeriodStart(event.target.value); }, "aria-label": "Filter periods starting after date" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-filter", children: [(0, jsx_runtime_1.jsx)("span", { children: "Period ends before" }), (0, jsx_runtime_1.jsx)("input", { type: "date", value: libraryPeriodEnd, onChange: (event) => { setLibraryPage(1); setLibraryPeriodEnd(event.target.value); }, "aria-label": "Filter periods ending before date" })] }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button reports-button-secondary", type: "button", onClick: () => { setLibrarySearch(''); setLibraryType(''); setLibraryGeography(''); setLibraryStatus(''); setLibraryPeriodStart(''); setLibraryPeriodEnd(''); setLibraryPage(1); }, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 15 }), " Clear filters"] })] }), libraryError && (0, jsx_runtime_1.jsxs)("div", { className: "reports-error", role: "alert", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 18 }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Library request failed" }), (0, jsx_runtime_1.jsx)("p", { children: libraryError }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button", type: "button", onClick: () => setLibraryReload((value) => value + 1), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15 }), " Retry"] })] })] }), libraryLoading && (0, jsx_runtime_1.jsxs)("div", { className: "reports-load-state", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "reports-spin", size: 18 }), " Loading report records\u2026"] }), !libraryLoading && !libraryError && libraryResult && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-library-summary", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: libraryResult.total }), " report ", libraryResult.total === 1 ? 'record' : 'records', " returned"] }), (0, jsx_runtime_1.jsx)(ProvenanceChip, { provenance: libraryResult.provenance })] }), libraryResult.items.length ? (0, jsx_runtime_1.jsx)("div", { className: "reports-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "reports-library-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Report" }), (0, jsx_runtime_1.jsx)("th", { children: "Type" }), (0, jsx_runtime_1.jsx)("th", { children: "Geography" }), (0, jsx_runtime_1.jsx)("th", { children: "Period" }), (0, jsx_runtime_1.jsx)("th", { children: "Generated / updated" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" }), (0, jsx_runtime_1.jsx)("th", { children: "Provenance" }), (0, jsx_runtime_1.jsx)("th", { children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: libraryResult.items.map((item) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.title }), (0, jsx_runtime_1.jsx)("small", { children: item.id })] }), (0, jsx_runtime_1.jsx)("td", { children: TYPE_INFO[item.reportType]?.title ?? item.reportType }), (0, jsx_runtime_1.jsx)("td", { children: item.geographyLabels.join(', ') || 'Not supplied' }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(PeriodLabel, { period: item.period }) }), (0, jsx_runtime_1.jsx)("td", { children: item.updatedAt || item.createdAt ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [dateLabel(item.updatedAt ?? item.createdAt), (0, jsx_runtime_1.jsx)("small", { children: item.createdAt ? `Created ${dateLabel(item.createdAt)}` : '' })] }) : (0, jsx_runtime_1.jsx)("span", { className: "reports-muted", children: "Timestamp not supplied" }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `reports-status status-${item.status.toLowerCase()}`, children: statusLabel[item.status] }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)(ProvenanceChip, { provenance: item.provenance }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "reports-row-actions", children: [item.capabilities.open && (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void openReport(item), disabled: !!busyAction, title: "Open this report snapshot", children: "Open" }), item.capabilities.duplicate && (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void duplicateReport(item), disabled: !!busyAction, title: "Use this configuration as a template", children: "Duplicate" }), item.capabilities.retry && (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void retryReport(item), disabled: !!busyAction, title: "Retry a failed report job", children: "Retry" }), item.capabilities.delete && adapter.deleteReport && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "reports-danger-action", onClick: () => void deleteReport(item), disabled: !!busyAction, title: "Delete report", children: "Delete" })] }) })] }, item.id)) })] }) }) : (0, jsx_runtime_1.jsxs)("div", { className: "reports-empty-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 26 }), (0, jsx_runtime_1.jsx)("strong", { children: librarySearch || libraryType || libraryGeography || libraryStatus || libraryPeriodStart || libraryPeriodEnd ? 'No reports match these filters' : 'No saved reports yet' }), (0, jsx_runtime_1.jsx)("p", { children: librarySearch || libraryType || libraryGeography || libraryStatus || libraryPeriodStart || libraryPeriodEnd ? 'Clear or adjust the filters to broaden your search.' : 'Generate a report to create the first report snapshot available to this library.' }), (librarySearch || libraryType || libraryGeography || libraryStatus || libraryPeriodStart || libraryPeriodEnd) && (0, jsx_runtime_1.jsx)("button", { className: "reports-button", type: "button", onClick: () => { setLibrarySearch(''); setLibraryType(''); setLibraryGeography(''); setLibraryStatus(''); setLibraryPeriodStart(''); setLibraryPeriodEnd(''); setLibraryPage(1); }, children: "Clear filters" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-pagination", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Showing ", libraryResult.total ? (libraryResult.page - 1) * libraryResult.pageSize + 1 : 0, "\u2013", Math.min(libraryResult.page * libraryResult.pageSize, libraryResult.total), " of ", libraryResult.total] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "reports-button reports-button-small", disabled: libraryPage <= 1 || !!busyAction, onClick: () => setLibraryPage((page) => page - 1), children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ChevronLeft, { size: 15 }), " Previous"] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Page ", libraryResult.page, " of ", Math.max(1, Math.ceil(libraryResult.total / libraryResult.pageSize))] }), (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "reports-button reports-button-small", disabled: libraryPage >= Math.ceil(libraryResult.total / libraryResult.pageSize) || !!busyAction, onClick: () => setLibraryPage((page) => page + 1), children: ["Next ", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 15 })] })] })] })] })] }), activeView === 'preview' && (0, jsx_runtime_1.jsx)("section", { id: "reports-panel-preview", role: "tabpanel", "aria-labelledby": "reports-tab-preview", className: "reports-preview-view", children: !reportDocument ? (0, jsx_runtime_1.jsxs)("div", { className: "reports-empty-state", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 30 }), (0, jsx_runtime_1.jsx)("strong", { children: "No report preview is open" }), (0, jsx_runtime_1.jsx)("p", { children: "Generate a report from the Builder or open an existing snapshot from the Library." }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { className: "reports-button reports-button-primary", type: "button", onClick: () => selectView('builder'), children: ["Open Builder ", (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { size: 15 })] }), (0, jsx_runtime_1.jsx)("button", { className: "reports-button reports-button-secondary", type: "button", onClick: () => selectView('library'), children: "Open Library" })] })] }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-preview-toolbar no-print", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "reports-step", children: "DOCUMENT PREVIEW" }), (0, jsx_runtime_1.jsx)("h2", { children: reportDocument.title }), (0, jsx_runtime_1.jsxs)("p", { children: [reportDocument.geographyLabels.join(', ') || 'Scope not supplied', " \u00B7 ", (0, jsx_runtime_1.jsx)(PeriodLabel, { period: reportDocument.period })] }), isStale && (0, jsx_runtime_1.jsxs)("span", { className: "reports-stale-tag", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 14 }), " Draft changed \u2014 displayed document is the previous immutable snapshot."] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-preview-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "reports-button reports-button-secondary", type: "button", onClick: () => selectView('builder'), children: "Back to edit" }), (0, jsx_runtime_1.jsxs)("label", { className: "reports-export-select", children: [(0, jsx_runtime_1.jsx)("span", { children: "CSV section" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedCsvSection, onChange: (event) => setSelectedCsvSection(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Select section" }), reportDocument.sections.map((section) => (0, jsx_runtime_1.jsx)("option", { value: section.key, children: section.title }, section.key))] })] }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button reports-button-secondary", type: "button", onClick: () => void exportCsv(), disabled: !canExportCsv || !selectedCsvSection || !!busyAction, children: [busyAction === 'csv' ? (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "reports-spin", size: 15 }) : (0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 15 }), " Export CSV"] }), (0, jsx_runtime_1.jsxs)("button", { className: "reports-button reports-button-primary", type: "button", onClick: () => void exportPdf(), disabled: !!busyAction || (!options.exportCapabilities.serverPdf && !options.exportCapabilities.browserPrint), title: !options.exportCapabilities.serverPdf && !options.exportCapabilities.browserPrint ? 'PDF export is not available for this adapter.' : undefined, children: [busyAction === 'pdf' ? (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 15, className: "reports-spin" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { size: 15 }), " ", options.exportCapabilities.serverPdf ? 'Export PDF' : 'Print / Save as PDF'] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: `reports-preview-layout ${outlineExpanded ? '' : 'outline-collapsed'}`, children: [(0, jsx_runtime_1.jsxs)("aside", { className: "reports-outline no-print", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "reports-outline-toggle", onClick: () => setOutlineExpanded((value) => !value), "aria-expanded": outlineExpanded, children: [(0, jsx_runtime_1.jsxs)("span", { children: ["CONTENTS ", (0, jsx_runtime_1.jsxs)("small", { children: [reportDocument.sections.length + 1, " sections"] })] }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 16 })] }), outlineExpanded && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "reports-outline-links", children: [reportDocument.sections.map((section, index) => (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSectionNav(section.key), children: [(0, jsx_runtime_1.jsx)("span", { children: String(index + 1).padStart(2, '0') }), section.title, (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 13 })] }, section.key)), (0, jsx_runtime_1.jsxs)("button", { type: "button", onClick: () => onSectionNav('report-limitations'), children: [(0, jsx_runtime_1.jsx)("span", { children: String(reportDocument.sections.length + 1).padStart(2, '0') }), "Sources & limitations", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { size: 13 })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reports-outline-meta", children: [(0, jsx_runtime_1.jsx)("small", { children: "REPORT SNAPSHOT" }), (0, jsx_runtime_1.jsx)("strong", { children: reportDocument.id }), (0, jsx_runtime_1.jsxs)("span", { children: ["Template: ", reportDocument.templateVersion] }), (0, jsx_runtime_1.jsx)(ProvenanceChip, { provenance: reportDocument.provenance })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "reports-document-wrap", children: (0, jsx_runtime_1.jsx)(ReportDocument_1.ReportDocument, { document: reportDocument, onSectionNav: onSectionNav }) })] })] }) }), (0, jsx_runtime_1.jsxs)("footer", { className: "reports-page-footer", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Info, { size: 14 }), " Report snapshots preserve their original configuration and provenance."] }), (0, jsx_runtime_1.jsx)("span", { children: "SHRAMIK \u00B7 Reports & Intelligence Briefs" })] })] });
}
exports.default = ReportsPage;

},
"reports/ReportDocument": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportDocument = ReportDocument;
const jsx_runtime_1 = require("react/jsx-runtime");
const fmt = (metric) => metric.value == null ? 'Not available' : metric.formattedValue ?? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(metric.value);
const displayDate = (value) => {
    if (!value)
        return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(parsed);
};
const numberLabel = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);
function MetricGrid({ metrics }) {
    return (0, jsx_runtime_1.jsx)("div", { className: "rd-metric-grid", children: metrics.map((metric) => (0, jsx_runtime_1.jsxs)("article", { className: "rd-metric", children: [(0, jsx_runtime_1.jsx)("span", { className: "rd-metric-label", children: metric.label }), (0, jsx_runtime_1.jsx)("strong", { children: fmt(metric) }), (0, jsx_runtime_1.jsxs)("span", { className: "rd-metric-unit", children: [metric.unit, metric.period ? ` · ${metric.period}` : ''] }), (0, jsx_runtime_1.jsx)("span", { className: `rd-provenance rd-prov-${metric.provenance.toLowerCase()}`, children: metric.provenance.replaceAll('_', ' ') }), metric.note && (0, jsx_runtime_1.jsx)("p", { children: metric.note }), metric.value == null && (0, jsx_runtime_1.jsx)("small", { className: "rd-null-note", children: "A missing value is not zero." })] }, metric.key)) });
}
function ChartBlock({ block }) {
    const allValues = block.series.flatMap((series) => series.points.map((point) => point.y).filter((value) => value != null));
    if (!allValues.length)
        return (0, jsx_runtime_1.jsxs)("div", { className: "rd-unavailable", children: [(0, jsx_runtime_1.jsx)("strong", { children: block.title }), (0, jsx_runtime_1.jsx)("p", { children: "No chart values are available for this report snapshot. Missing observations are not plotted as zero." })] });
    const width = 720, height = 270, left = 56, right = 24, top = 18, bottom = 42;
    const min = Math.min(0, ...allValues), max = Math.max(1, ...allValues), range = max - min || 1;
    const colors = ['#203A5B', '#20A89C', '#EB791D', '#8B5E3C'];
    const longest = Math.max(...block.series.map((series) => series.points.length), 1);
    const xAt = (index) => left + (longest <= 1 ? 0 : (index / (longest - 1)) * (width - left - right));
    const yAt = (value) => top + ((max - value) / range) * (height - top - bottom);
    const ticks = Array.from({ length: 5 }, (_, index) => min + (range * index / 4));
    return (0, jsx_runtime_1.jsxs)("div", { className: "rd-chart-wrap", children: [(0, jsx_runtime_1.jsxs)("svg", { className: "rd-chart", viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": `${block.title}. ${block.yLabel ?? 'Value'} measured in ${block.unit ?? 'units'}. Exact points are available in the accompanying data table.`, children: [ticks.map((tick) => (0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: left, y1: yAt(tick), x2: width - right, y2: yAt(tick), stroke: "#D8D6CD", strokeDasharray: "3 4" }), (0, jsx_runtime_1.jsx)("text", { x: left - 9, y: yAt(tick) + 4, textAnchor: "end", className: "rd-axis-label", children: numberLabel(tick) })] }, tick)), block.series.map((series, seriesIndex) => {
                        const segments = [];
                        let current = [];
                        series.points.forEach((point, index) => {
                            if (point.y == null) {
                                if (current.length)
                                    segments.push(current);
                                current = [];
                                return;
                            }
                            current.push({ x: xAt(index), y: yAt(point.y) });
                        });
                        if (current.length)
                            segments.push(current);
                        return (0, jsx_runtime_1.jsx)("g", { children: segments.map((segment, segmentIndex) => (0, jsx_runtime_1.jsxs)("g", { children: [segment.length > 1 && (0, jsx_runtime_1.jsx)("polyline", { points: segment.map((point) => `${point.x},${point.y}`).join(' '), fill: "none", stroke: colors[seriesIndex % colors.length], strokeWidth: "3", strokeLinejoin: "round", strokeLinecap: "round" }), segment.map((point, index) => (0, jsx_runtime_1.jsx)("circle", { cx: point.x, cy: point.y, r: "4", fill: colors[seriesIndex % colors.length], stroke: "#FFFEFA", strokeWidth: "1.5" }, `${point.x}-${index}`))] }, segmentIndex)) }, series.name);
                    }), longest <= 9 && (block.series[0]?.points ?? []).map((point, index) => (0, jsx_runtime_1.jsx)("text", { x: xAt(index), y: height - 18, textAnchor: "middle", className: "rd-axis-label", children: String(point.x).slice(0, 12) }, `${point.x}-${index}`)), (0, jsx_runtime_1.jsx)("text", { x: left, y: 12, className: "rd-axis-title", children: block.yLabel ?? block.unit ?? 'Value' }), (0, jsx_runtime_1.jsx)("text", { x: width - right, y: height - 2, textAnchor: "end", className: "rd-axis-title", children: block.xLabel ?? 'Period' })] }), (0, jsx_runtime_1.jsx)("div", { className: "rd-legend", children: block.series.map((series, index) => (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("i", { style: { backgroundColor: colors[index % colors.length] } }), series.name] }, series.name)) }), block.caption && (0, jsx_runtime_1.jsx)("p", { className: "rd-caption", children: block.caption }), (0, jsx_runtime_1.jsxs)("details", { className: "rd-chart-data", children: [(0, jsx_runtime_1.jsx)("summary", { children: "View exact chart values" }), (0, jsx_runtime_1.jsx)("div", { className: "rd-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Series" }), (0, jsx_runtime_1.jsx)("th", { children: block.xLabel ?? 'Period' }), (0, jsx_runtime_1.jsxs)("th", { children: [block.yLabel ?? 'Value', block.unit ? ` (${block.unit})` : ''] })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: block.series.flatMap((series) => series.points.map((point, index) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: series.name }), (0, jsx_runtime_1.jsx)("td", { children: String(point.x) }), (0, jsx_runtime_1.jsx)("td", { children: point.y == null ? 'Not available' : numberLabel(point.y) })] }, `${series.name}-${index}`))) })] }) })] })] });
}
function TableBlock({ block }) {
    return (0, jsx_runtime_1.jsxs)("div", { className: "rd-table-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: block.title }), (0, jsx_runtime_1.jsx)("div", { className: "rd-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsx)("tr", { children: block.columns.map((column) => (0, jsx_runtime_1.jsxs)("th", { children: [column.label, column.unit ? (0, jsx_runtime_1.jsxs)("small", { children: ["(", column.unit, ")"] }) : null] }, column.key)) }) }), (0, jsx_runtime_1.jsx)("tbody", { children: block.rows.length ? block.rows.map((row) => (0, jsx_runtime_1.jsx)("tr", { children: block.columns.map((column) => (0, jsx_runtime_1.jsx)("td", { children: row.cells[column.key] == null ? (0, jsx_runtime_1.jsx)("span", { className: "rd-null", children: "Not available" }) : String(row.cells[column.key]) }, column.key)) }, row.id)) : (0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: block.columns.length, children: "No rows are available for this section." }) }) })] }) }), block.caption && (0, jsx_runtime_1.jsx)("p", { className: "rd-caption", children: block.caption })] });
}
function BlockRenderer({ block }) {
    switch (block.kind) {
        case 'paragraph': return (0, jsx_runtime_1.jsx)("p", { className: "rd-paragraph", children: block.text });
        case 'finding': return (0, jsx_runtime_1.jsxs)("article", { className: "rd-finding", children: [(0, jsx_runtime_1.jsx)("span", { children: "FINDING" }), (0, jsx_runtime_1.jsx)("h3", { children: block.title }), (0, jsx_runtime_1.jsx)("p", { children: block.text }), block.evidenceRefs?.length ? (0, jsx_runtime_1.jsxs)("small", { children: ["Evidence references: ", block.evidenceRefs.join(', ')] }) : null] });
        case 'metric_grid': return (0, jsx_runtime_1.jsx)(MetricGrid, { metrics: block.metrics });
        case 'chart': return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { className: "rd-block-title", children: block.title }), (0, jsx_runtime_1.jsx)(ChartBlock, { block: block })] });
        case 'table': return (0, jsx_runtime_1.jsx)(TableBlock, { block: block });
        case 'map': return (0, jsx_runtime_1.jsxs)("div", { className: "rd-unavailable", children: [(0, jsx_runtime_1.jsx)("strong", { children: block.title }), (0, jsx_runtime_1.jsxs)("p", { children: ["A map is not rendered because this report does not include verified geography geometry for ", (0, jsx_runtime_1.jsx)("code", { children: block.geometryKey }), ". Values and missing records are kept separate; no decorative map is presented as measured data."] }), (0, jsx_runtime_1.jsx)("div", { className: "rd-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Geography code" }), (0, jsx_runtime_1.jsx)("th", { children: block.metricLabel })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: Object.entries(block.valuesByGeographyId).map(([id, value]) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: id }), (0, jsx_runtime_1.jsx)("td", { children: value == null ? 'Not available' : numberLabel(value) })] }, id)) })] }) })] });
        case 'callout': return (0, jsx_runtime_1.jsxs)("aside", { className: `rd-callout rd-callout-${block.tone}`, children: [(0, jsx_runtime_1.jsx)("strong", { children: block.title }), (0, jsx_runtime_1.jsx)("p", { children: block.text })] });
        case 'source_list': return (0, jsx_runtime_1.jsx)("div", { className: "rd-sources", children: block.sources.length ? block.sources.map((source, index) => (0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("strong", { children: source.name }), (0, jsx_runtime_1.jsx)("span", { children: [source.datasetVersion, source.observationPeriod, source.asOfDate ? `As of ${source.asOfDate}` : undefined].filter(Boolean).join(' · ') || 'Version / observation period not supplied' }), source.notes && (0, jsx_runtime_1.jsx)("p", { children: source.notes })] }, `${source.name}-${index}`)) : (0, jsx_runtime_1.jsx)("p", { children: "Source metadata has not been supplied for this report snapshot." }) });
        case 'methodology': return (0, jsx_runtime_1.jsxs)("div", { className: "rd-method", children: [(0, jsx_runtime_1.jsx)("h3", { children: block.title }), block.version && (0, jsx_runtime_1.jsxs)("span", { children: ["Method version: ", block.version] }), (0, jsx_runtime_1.jsx)("p", { children: block.text })] });
        case 'unavailable': return (0, jsx_runtime_1.jsxs)("div", { className: "rd-unavailable", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Section data unavailable" }), (0, jsx_runtime_1.jsx)("p", { children: block.reason }), block.nextStep && (0, jsx_runtime_1.jsx)("small", { children: block.nextStep })] });
        default: return null;
    }
}
function Section({ section, index, onSectionNav }) {
    return (0, jsx_runtime_1.jsxs)("section", { id: `report-section-${section.key}`, className: "rd-section", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rd-section-kicker", children: ["SECTION ", String(index + 1).padStart(2, '0'), " ", (0, jsx_runtime_1.jsx)("span", { className: `rd-section-status status-${section.status.toLowerCase()}`, children: section.status })] }), (0, jsx_runtime_1.jsx)("h2", { children: section.title }), section.blocks.length ? section.blocks.map((block, i) => (0, jsx_runtime_1.jsx)(BlockRenderer, { block: block }, `${section.key}-${block.kind}-${i}`)) : (0, jsx_runtime_1.jsxs)("div", { className: "rd-unavailable", children: [(0, jsx_runtime_1.jsx)("strong", { children: "No section content supplied" }), (0, jsx_runtime_1.jsx)("p", { children: "This section is included in the structure, but the snapshot contains no content blocks." })] }), onSectionNav && (0, jsx_runtime_1.jsx)("button", { className: "rd-back-top no-print", onClick: () => onSectionNav('top'), type: "button", children: "Back to report top \u2191" })] });
}
function ReportDocument({ document, onSectionNav }) {
    const typeName = { STATE: 'State Report', SECTOR: 'Sector Report', SKILL: 'Skill Report', POLICY_BRIEF: 'Policy Brief', CUSTOM: 'Custom Report' };
    const createdLabel = displayDate(document.createdAt);
    const provenanceLabel = document.provenance === 'SYNTHETIC_DEMO' ? 'ILLUSTRATIVE — SYNTHETIC DEMO DATA' : document.provenance.replaceAll('_', ' ');
    return (0, jsx_runtime_1.jsxs)("article", { className: "report-document", "aria-label": `Report document: ${document.title}`, id: "report-document", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rd-cover", id: "report-top", children: [(0, jsx_runtime_1.jsxs)("div", { className: "rd-cover-brand", children: [(0, jsx_runtime_1.jsx)("span", { className: "rd-cover-mark", children: "SH" }), (0, jsx_runtime_1.jsxs)("span", { children: ["RAMIK ", (0, jsx_runtime_1.jsx)("small", { children: "LABOUR MARKET INTELLIGENCE" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "rd-cover-rule" }), (0, jsx_runtime_1.jsxs)("p", { className: "rd-cover-type", children: [typeName[document.reportType], " ", (0, jsx_runtime_1.jsx)("span", { children: "\u2022" }), " REPORT SNAPSHOT v", document.version ?? 1] }), (0, jsx_runtime_1.jsx)("h1", { children: document.title }), (0, jsx_runtime_1.jsxs)("div", { className: "rd-cover-scope", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "GEOGRAPHY / SCOPE" }), (0, jsx_runtime_1.jsx)("strong", { children: document.geographyLabels.join(', ') || 'Scope not supplied' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "REPORTING PERIOD" }), (0, jsx_runtime_1.jsx)("strong", { children: document.period.label || `${document.period.start || 'Start not supplied'} – ${document.period.end || 'End not supplied'}` })] }), document.referenceYear !== undefined && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "REFERENCE YEAR" }), (0, jsx_runtime_1.jsx)("strong", { children: document.referenceYear })] }), createdLabel && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "GENERATED" }), (0, jsx_runtime_1.jsx)("strong", { children: createdLabel })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rd-cover-foot", children: [(0, jsx_runtime_1.jsx)("span", { children: provenanceLabel }), (0, jsx_runtime_1.jsxs)("span", { children: ["Template ", document.templateVersion] })] }), (0, jsx_runtime_1.jsx)("p", { className: "rd-cover-note", children: "An evidence-oriented workforce intelligence document. No agency endorsement is implied." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rd-document-meta", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["REPORT ID ", (0, jsx_runtime_1.jsx)("strong", { children: document.id })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["PROVENANCE ", (0, jsx_runtime_1.jsx)("strong", { children: provenanceLabel })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["SOURCE SNAPSHOTS ", (0, jsx_runtime_1.jsx)("strong", { children: document.metadata.sourceSnapshotIds.length ? document.metadata.sourceSnapshotIds.join(', ') : 'Not supplied' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "rd-document-body", children: [document.sections.map((section, index) => (0, jsx_runtime_1.jsx)(Section, { section: section, index: index, onSectionNav: onSectionNav }, section.key)), (0, jsx_runtime_1.jsxs)("section", { className: "rd-limitations", id: "report-limitations", children: [(0, jsx_runtime_1.jsx)("div", { className: "rd-section-kicker", children: "REPORT NOTES" }), (0, jsx_runtime_1.jsx)("h2", { children: "Sources, coverage & limitations" }), (0, jsx_runtime_1.jsxs)("div", { className: "rd-sources-summary", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Source labels" }), (0, jsx_runtime_1.jsx)("p", { children: document.metadata.sourceLabels.length ? document.metadata.sourceLabels.join(' · ') : 'No source labels supplied.' }), document.metadata.methodologyVersion && (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Methodology version:" }), " ", document.metadata.methodologyVersion] })] }), (0, jsx_runtime_1.jsx)("ul", { children: document.metadata.limitations.map((limitation, index) => (0, jsx_runtime_1.jsx)("li", { children: limitation }, `${limitation}-${index}`)) }), document.metadata.generatedByLabel && (0, jsx_runtime_1.jsx)("p", { className: "rd-generated-label", children: document.metadata.generatedByLabel })] })] })] });
}

},
"reports/adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReportsAdapter = createReportsAdapter;
const demoAdapter_1 = require("./demoAdapter");
const restAdapter_1 = require("./restAdapter");
function createReportsAdapter() {
    const baseUrl = (typeof window !== 'undefined' && window.SHRAMIK_CONFIG && window.SHRAMIK_CONFIG.apiBaseUrl || '').trim();
    if (baseUrl)
        return new restAdapter_1.RestReportsAdapter(baseUrl);
    return new demoAdapter_1.DemoReportsAdapter();
}

},
"reports/demoAdapter": function(module, exports, require) {
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoReportsAdapter = void 0;
const mock_state_report_json_1 = __importDefault(require("../../examples/mock-state-report.json"));
const SECTION_OPTIONS = [
    { key: 'EXECUTIVE_SUMMARY', label: 'Executive Summary', description: 'Key findings and high-level indicators.', required: true },
    { key: 'DEMAND', label: 'Demand Analysis', description: 'Labour demand levels, trends and projections.' },
    { key: 'SUPPLY', label: 'Supply Analysis', description: 'Available workforce and training pipeline.' },
    { key: 'SKILL_GAPS', label: 'Skill Gap Analysis', description: 'Demand minus supply where measures are compatible.' },
    { key: 'EMERGING_SKILLS', label: 'Emerging Skills', description: 'Skills with emerging demand signals.' },
    { key: 'FORECASTS', label: 'Forecasts & Early Warnings', description: 'Future outlook, risks and forecast uncertainty.' },
    { key: 'SCENARIO', label: 'Scenario Analysis', description: 'Alternative futures and intervention assumptions.' },
    { key: 'REGIONAL', label: 'Regional Breakdown', description: 'State/UT and district views where coverage permits.' },
    { key: 'SECTOR', label: 'Sector Breakdown', description: 'Sector-wise demand and workforce structure.' },
    { key: 'OCCUPATION', label: 'Occupation Analysis', description: 'Occupation group and taxonomy analysis.' },
    { key: 'POLICY_RECOMMENDATIONS', label: 'Policy Recommendations', description: 'Evidence-linked implications; omitted when unsupported.' },
    { key: 'SOURCES_METHOD', label: 'Data Sources & Methodology', description: 'Source lineage, definitions, coverage and limitations.', required: true },
];
const TYPES = ['STATE', 'SECTOR', 'SKILL', 'POLICY_BRIEF', 'CUSTOM'];
const TYPE_LABEL = { STATE: 'State Report', SECTOR: 'Sector Report', SKILL: 'Skill Report', POLICY_BRIEF: 'Policy Brief', CUSTOM: 'Custom Report' };
const GEO = [
    { id: 'IN', label: 'India', level: 'COUNTRY' },
    { id: 'IN-KA', label: 'Karnataka', level: 'STATE_UT' },
    { id: 'IN-MH', label: 'Maharashtra', level: 'STATE_UT' },
    { id: 'IN-TN', label: 'Tamil Nadu', level: 'STATE_UT' },
];
const PERIODS = [
    { start: '2025-01-01', end: '2030-12-31', label: '2025–2030 (illustrative)' },
    { start: '2024-01-01', end: '2029-12-31', label: '2024–2029 (illustrative)' },
];
const clone = (value) => JSON.parse(JSON.stringify(value));
class DemoReportsAdapter {
    constructor() {
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'demo'
        });
        Object.defineProperty(this, "documents", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "configs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        Object.defineProperty(this, "sequence", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        const base = clone(mock_state_report_json_1.default);
        this.documents.set(base.id, base);
        this.configs.set(base.id, {
            reportType: 'STATE', title: base.title, geographyIds: ['IN-KA'], period: base.period, referenceYear: base.referenceYear,
            sectionKeys: base.sections.map((section) => section.key), sourcePolicy: { mode: 'LATEST_VALIDATED' },
            options: { includeUncertainty: true, includeDataAppendix: false }, templateVersion: base.templateVersion,
        });
    }
    async getOptions() {
        return {
            reportTypes: TYPES,
            sections: clone(SECTION_OPTIONS),
            geographies: clone(GEO),
            periods: clone(PERIODS),
            referenceYears: [2029, 2030],
            exportCapabilities: { serverPdf: false, browserPrint: true, csv: true, xlsx: false },
            provenance: 'SYNTHETIC_DEMO',
        };
    }
    buildDocument(config, id, version = 1) {
        const base = clone(mock_state_report_json_1.default);
        const available = new Map(base.sections.map((section) => [section.key, section]));
        const sections = config.sectionKeys.map((key) => {
            const supplied = available.get(key);
            if (supplied)
                return clone(supplied);
            const option = SECTION_OPTIONS.find((item) => item.key === key);
            return {
                key, title: option?.label ?? key, status: 'UNAVAILABLE',
                blocks: [{ kind: 'unavailable', reason: 'The demo fixture does not contain approved structured data for this section.', nextStep: 'Connect the report assembly API to include a validated result; this placeholder is not a zero or an empty finding.' }],
            };
        });
        const geoLabels = config.geographyIds.map((id) => GEO.find((geo) => geo.id === id)?.label ?? id);
        const isOtherScope = !(config.geographyIds.length === 1 && config.geographyIds[0] === 'IN-KA');
        const scopeNote = isOtherScope || (config.options.compareGeographyIds?.length ?? 0) > 0 ? 'The sample metrics are generic synthetic fixture values and are not geographically estimated for the selected scope. Comparison geography selections are configuration metadata only in this demo; no comparison result was computed.' : '';
        if (scopeNote && sections.length) {
            const executive = sections.find((section) => section.key === 'EXECUTIVE_SUMMARY');
            if (executive)
                executive.blocks.unshift({ kind: 'callout', tone: 'limitation', title: 'Scope limitation', text: scopeNote });
        }
        const limitations = [...base.metadata.limitations];
        if (scopeNote)
            limitations.push(scopeNote);
        if (config.sourcePolicy.mode === 'FIXED_SNAPSHOT')
            limitations.push('Fixed snapshot selection is illustrative in demo mode; no backend source snapshot was read.');
        return {
            ...base,
            id,
            version,
            title: config.title.trim() || `${TYPE_LABEL[config.reportType]} — ${geoLabels.join(', ')}`,
            reportType: config.reportType,
            geographyLabels: geoLabels,
            period: clone(config.period),
            referenceYear: config.referenceYear,
            createdAt: undefined,
            templateVersion: config.templateVersion,
            provenance: 'SYNTHETIC_DEMO',
            configSnapshot: clone(config),
            sections,
            metadata: { ...base.metadata, sourceSnapshotIds: config.sourcePolicy.mode === 'FIXED_SNAPSHOT' ? [...(config.sourcePolicy.snapshotIds ?? [])] : [], limitations, generatedByLabel: 'SYNTHETIC_DEMO · Illustrative preview only · Not for publication' },
        };
    }
    async createReport(config) {
        if (!config.title.trim())
            throw new Error('Enter a report title before generating.');
        if (!config.geographyIds.length)
            throw new Error('Select at least one supported geography.');
        if (!config.sectionKeys.length)
            throw new Error('Select at least one report section.');
        const id = `demo-report-${String(this.sequence++).padStart(4, '0')}`;
        const document = this.buildDocument(config, id);
        this.documents.set(id, document);
        this.configs.set(id, clone(config));
        return { reportId: id, status: 'COMPLETED', document, message: 'Generated from the synthetic report fixture. No source-backed report was produced.' };
    }
    async getReport(reportId) {
        const doc = this.documents.get(reportId);
        if (!doc)
            throw new Error(`Report ${reportId} was not found in this demo library.`);
        return clone(doc);
    }
    async listReports(query) {
        const geoLabel = GEO.find((geo) => geo.id === query.geographyId)?.label ?? query.geographyId;
        const filtered = [...this.documents.values()].map((doc) => ({
            id: doc.id, title: doc.title, reportType: doc.reportType, geographyLabels: doc.geographyLabels, period: doc.period,
            status: 'COMPLETED', provenance: doc.provenance,
            capabilities: { open: true, duplicate: true, retry: false, delete: true, pdf: true, csv: true },
        })).filter((item) => {
            const q = query.query?.trim().toLowerCase();
            if (q && !`${item.title} ${item.id} ${item.geographyLabels.join(' ')}`.toLowerCase().includes(q))
                return false;
            if (query.reportType && item.reportType !== query.reportType)
                return false;
            if (geoLabel && !item.geographyLabels.includes(geoLabel))
                return false;
            if (query.status && item.status !== query.status)
                return false;
            if (query.periodStart && item.period.end < query.periodStart)
                return false;
            if (query.periodEnd && item.period.start > query.periodEnd)
                return false;
            return true;
        });
        const pageSize = Math.max(1, Math.min(query.pageSize ?? 10, 50));
        const page = Math.max(1, query.page ?? 1);
        return { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, provenance: 'SYNTHETIC_DEMO' };
    }
    async duplicateReport(reportId) {
        const config = this.configs.get(reportId);
        if (!config)
            throw new Error(`Report ${reportId} was not found; it cannot be duplicated.`);
        return { config: { ...clone(config), title: `Copy of ${config.title}` }, message: 'Copied the configuration only. Generate a new report to create a new demo snapshot.' };
    }
    async retryReport(reportId) {
        if (!this.documents.has(reportId))
            throw new Error(`Report ${reportId} was not found in this demo library.`);
        return { reportId, status: 'NOT_CONFIGURED', message: 'Retry is not available for completed demo reports.' };
    }
    async deleteReport(reportId) {
        const deleted = this.documents.delete(reportId);
        this.configs.delete(reportId);
        return { deleted, message: deleted ? 'Removed the report from the in-memory demo library for this session.' : 'Report not found.' };
    }
    async exportCsv(reportId, sectionKey) {
        const doc = this.documents.get(reportId);
        if (!doc)
            return { status: 'FAILED', message: 'Report not found in the demo library.' };
        const section = doc.sections.find((item) => item.key === sectionKey);
        if (!section)
            return { status: 'NOT_CONFIGURED', message: 'That section is not present in this report snapshot.' };
        const lines = [
            ['Report', doc.title],
            ['Report ID', doc.id],
            ['Provenance', doc.provenance],
            ['Export scope', section.title],
            ['Period', doc.period.label || `${doc.period.start} to ${doc.period.end}`],
            [],
        ];
        let tableCount = 0;
        for (const block of section.blocks) {
            if (block.kind === 'table') {
                tableCount++;
                lines.push([block.title], block.columns.map((column) => `${column.label}${column.unit ? ` (${column.unit})` : ''}`));
                for (const row of block.rows)
                    lines.push(block.columns.map((column) => row.cells[column.key] == null ? '' : String(row.cells[column.key])));
                lines.push([]);
            }
            else if (block.kind === 'metric_grid') {
                lines.push(['Metric', 'Value', 'Unit', 'Period', 'Provenance', 'Definition / note']);
                for (const metric of block.metrics)
                    lines.push([metric.label, metric.value == null ? '' : metric.formattedValue ?? String(metric.value), metric.unit, metric.period ?? '', metric.provenance, metric.definition ?? metric.note ?? '']);
                lines.push([]);
            }
            else if (block.kind === 'chart') {
                lines.push([block.title], ['Series', block.xLabel ?? 'Period', `Value (${block.unit ?? block.yLabel ?? 'unit not supplied'})`]);
                for (const series of block.series)
                    for (const point of series.points)
                        lines.push([series.name, String(point.x), point.y == null ? '' : String(point.y)]);
                lines.push([]);
            }
        }
        if (!tableCount && !lines.some((line) => line[0] === 'Metric') && lines.length <= 6)
            return { status: 'NOT_CONFIGURED', message: 'This section has no structured rows, metrics or chart series to export.' };
        const csvText = lines.map((line) => line.map((cell) => {
            const value = String(cell ?? '');
            return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',')).join('\r\n') + '\r\n';
        return { status: 'READY', csvText, message: 'CSV prepared from structured report content. Provenance is included in the file.' };
    }
}
exports.DemoReportsAdapter = DemoReportsAdapter;

},
"reports/restAdapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestReportsAdapter = exports.ReportsApiError = void 0;
class ReportsApiError extends Error {
    constructor(message, status, code, retryable = false) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "code", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "retryable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = 'ReportsApiError';
        this.status = status;
        this.code = code;
        this.retryable = retryable;
    }
}
exports.ReportsApiError = ReportsApiError;
const asObject = (value) => value && typeof value === 'object' ? value : {};
const asArray = (value) => Array.isArray(value) ? value : [];
const provenance = (value) => ['SOURCE_BACKED', 'DERIVED', 'MIXED', 'SYNTHETIC_DEMO', 'NOT_AVAILABLE'].includes(String(value)) ? value : 'NOT_AVAILABLE';
function normalizeDocument(input) {
    const raw = asObject(input);
    const scope = asObject(raw.scope);
    const meta = asObject(raw.metadata ?? raw.meta);
    const period = asObject(raw.period);
    return {
        id: String(raw.id ?? raw.reportId ?? ''),
        version: typeof raw.version === 'number' ? raw.version : undefined,
        title: String(raw.title ?? 'Untitled SHRAMIK report'),
        reportType: raw.reportType ?? 'CUSTOM',
        geographyLabels: asArray(raw.geographyLabels ?? scope.labels),
        period: { start: String(period.start ?? ''), end: String(period.end ?? ''), label: period.label },
        referenceYear: typeof raw.referenceYear === 'number' ? raw.referenceYear : undefined,
        createdAt: typeof (raw.createdAt ?? raw.generatedAt) === 'string' ? raw.createdAt ?? raw.generatedAt : undefined,
        templateVersion: String(raw.templateVersion ?? 'unknown'),
        provenance: provenance(raw.provenance ?? meta.provenance),
        configSnapshot: raw.configSnapshot && typeof raw.configSnapshot === 'object' ? raw.configSnapshot : raw.config && typeof raw.config === 'object' ? raw.config : undefined,
        sections: asArray(raw.sections),
        metadata: {
            sourceSnapshotIds: asArray(meta.sourceSnapshotIds ?? meta.dataSnapshotIds),
            methodologyVersion: typeof meta.methodologyVersion === 'string' ? meta.methodologyVersion : undefined,
            sourceLabels: asArray(meta.sourceLabels),
            limitations: asArray(meta.limitations),
            generatedByLabel: typeof meta.generatedByLabel === 'string' ? meta.generatedByLabel : undefined,
        },
    };
}
function normalizeListItem(input) {
    const raw = asObject(input);
    const scope = asObject(raw.scope);
    const p = asObject(raw.period);
    const caps = asObject(raw.capabilities);
    const meta = asObject(raw.metadata ?? raw.meta);
    return {
        id: String(raw.id ?? raw.reportId ?? ''), title: String(raw.title ?? 'Untitled report'), reportType: raw.reportType ?? 'CUSTOM',
        geographyLabels: asArray(raw.geographyLabels ?? scope.labels),
        period: { start: String(p.start ?? ''), end: String(p.end ?? ''), label: p.label },
        status: (['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'NOT_CONFIGURED'].includes(String(raw.status)) ? raw.status : 'NOT_CONFIGURED'),
        createdAt: typeof (raw.createdAt ?? raw.generatedAt) === 'string' ? raw.createdAt ?? raw.generatedAt : undefined,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
        provenance: provenance(raw.provenance ?? meta.provenance),
        capabilities: {
            open: caps.open !== false, duplicate: caps.duplicate === true, retry: caps.retry === true,
            delete: caps.delete === true, pdf: caps.pdf === true, csv: caps.csv === true,
        },
    };
}
const sectionLabels = {
    EXECUTIVE_SUMMARY: 'Executive Summary', DEMAND: 'Demand Analysis', SUPPLY: 'Supply Analysis', SKILL_GAPS: 'Skill Gap Analysis',
    EMERGING_SKILLS: 'Emerging Skills', FORECASTS: 'Forecasts & Early Warnings', SCENARIO: 'Scenario Analysis', REGIONAL: 'Regional Breakdown',
    SECTOR: 'Sector Breakdown', OCCUPATION: 'Occupation Analysis', POLICY_RECOMMENDATIONS: 'Policy Recommendations', SOURCES_METHOD: 'Data Sources & Methodology',
};
class RestReportsAdapter {
    constructor(baseUrl, getAccessToken = () => null) {
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: baseUrl
        });
        Object.defineProperty(this, "getAccessToken", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: getAccessToken
        });
        Object.defineProperty(this, "mode", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'rest'
        });
    }
    async request(path, init = {}, signal) {
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/json');
        if (init.body !== undefined)
            headers.set('Content-Type', 'application/json');
        const token = this.getAccessToken();
        if (token)
            headers.set('Authorization', `Bearer ${token}`);
        let response;
        try {
            response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { ...init, headers, signal: signal ?? init.signal, credentials: 'include' });
        }
        catch (error) {
            if (signal?.aborted)
                throw error;
            throw new ReportsApiError(error instanceof Error ? `Reports service is unreachable: ${error.message}` : 'Reports service is unreachable.', 0, 'NETWORK_ERROR', true);
        }
        const text = await response.text();
        let payload = {};
        try {
            payload = text ? JSON.parse(text) : {};
        }
        catch {
            payload = { message: text.slice(0, 500) };
        }
        if (!response.ok) {
            const err = asObject(payload.error);
            throw new ReportsApiError(String(err.message ?? payload.message ?? `Reports request failed (${response.status}).`), response.status, typeof err.code === 'string' ? err.code : undefined, err.retryable === true || response.status >= 500);
        }
        return payload;
    }
    async getOptions(signal) {
        const raw = asObject(await this.request('/api/v1/reports/options', {}, signal));
        const meta = asObject(raw.meta);
        const exports = asObject(raw.exports);
        const geo = asArray(raw.geographies ?? raw.supportedGeographies).map((item) => ({ id: String(item.id), label: String(item.label ?? item.name ?? item.id), level: String(item.level ?? 'UNKNOWN') }));
        const periods = asArray(raw.periods ?? raw.availablePeriods).map((item) => ({ start: String(item.start), end: String(item.end), label: item.label }));
        const sections = asArray(raw.sections).map((item) => typeof item === 'string' ? ({ key: item, label: sectionLabels[item] ?? item, description: '', required: item === 'EXECUTIVE_SUMMARY' || item === 'SOURCES_METHOD' }) : ({ key: item.key, label: String(item.label ?? sectionLabels[item.key] ?? item.key), description: String(item.description ?? ''), required: item.required === true || item.key === 'EXECUTIVE_SUMMARY' || item.key === 'SOURCES_METHOD' }));
        return {
            reportTypes: asArray(raw.reportTypes), sections: sections, geographies: geo, periods,
            referenceYears: asArray(raw.referenceYears), exportCapabilities: {
                serverPdf: exports.pdf === 'SERVER' || exports.pdf === 'SERVER_PDF' || exports.pdf === true, browserPrint: exports.pdf === 'PRINT_FALLBACK' || exports.browserPrint === true,
                csv: exports.csv === true, xlsx: exports.xlsx === true,
            },
            provenance: provenance(meta.provenance),
            sourceSnapshots: asArray(raw.sourceSnapshots ?? raw.availableSnapshots).map((item) => ({ id: String(item.id), label: String(item.label ?? item.id), asOfDate: item.asOfDate })),
        };
    }
    async createReport(config, signal) {
        const raw = asObject(await this.request('/api/v1/reports', { method: 'POST', body: JSON.stringify(config) }, signal));
        const status = (raw.status ?? 'QUEUED');
        const documentValue = raw.document ?? (Array.isArray(raw.sections) ? raw : null);
        return { reportId: String(raw.reportId ?? raw.id ?? ''), status, document: documentValue ? normalizeDocument(documentValue) : undefined, message: typeof raw.message === 'string' ? raw.message : undefined };
    }
    async getReport(reportId, signal) {
        const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}`, {}, signal));
        const doc = raw.document ?? (raw.report && asObject(raw.report).sections ? raw.report : raw);
        if (!Array.isArray(asObject(doc).sections)) {
            const status = String(raw.status ?? asObject(raw.report).status ?? 'RUNNING');
            throw new ReportsApiError(`Report ${reportId} is ${status.toLowerCase()}; its structured document is not available yet.`, 202, 'REPORT_NOT_READY', true);
        }
        return normalizeDocument(doc);
    }
    async listReports(query, signal) {
        const params = new URLSearchParams();
        if (query.query)
            params.set('query', query.query);
        if (query.reportType)
            params.set('type', query.reportType);
        if (query.geographyId)
            params.set('geographyId', query.geographyId);
        if (query.status)
            params.set('status', query.status);
        if (query.periodStart)
            params.set('periodStart', query.periodStart);
        if (query.periodEnd)
            params.set('periodEnd', query.periodEnd);
        params.set('page', String(query.page ?? 1));
        params.set('pageSize', String(query.pageSize ?? 10));
        const raw = asObject(await this.request(`/api/v1/reports?${params.toString()}`, {}, signal));
        return { items: asArray(raw.items).map(normalizeListItem), total: Number(raw.total ?? 0), page: Number(raw.page ?? query.page ?? 1), pageSize: Number(raw.pageSize ?? query.pageSize ?? 10), provenance: provenance(raw.provenance) };
    }
    async duplicateReport(reportId, signal) {
        const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/duplicate`, { method: 'POST', body: '{}' }, signal));
        return { config: asObject(raw.config), message: typeof raw.message === 'string' ? raw.message : undefined };
    }
    async retryReport(reportId, signal) {
        const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/regenerate`, { method: 'POST', body: '{}' }, signal));
        return { reportId: String(raw.reportId ?? raw.id ?? reportId), status: (raw.status ?? 'QUEUED'), message: typeof raw.message === 'string' ? raw.message : undefined };
    }
    async deleteReport(reportId, signal) {
        const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' }, signal));
        return { deleted: raw.deleted === true || raw.status === 'DELETED', message: typeof raw.message === 'string' ? raw.message : undefined };
    }
    async exportCsv(reportId, sectionKey, signal) {
        const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/exports`, { method: 'POST', body: JSON.stringify({ format: 'CSV', sectionKey }) }, signal));
        if (typeof raw.csvText === 'string')
            return { status: 'READY', csvText: raw.csvText, message: 'CSV returned by the Reports service.' };
        if (typeof raw.downloadUrl === 'string' && raw.status === 'COMPLETED')
            return { status: 'READY', downloadUrl: raw.downloadUrl, message: 'CSV export is ready for authorised download.' };
        if (raw.status === 'QUEUED' || raw.status === 'RUNNING')
            return { status: 'NOT_CONFIGURED', message: 'The backend accepted the export job but has not returned a completed download. Check the Reports service job status.' };
        return { status: 'FAILED', message: String(raw.message ?? 'Reports service did not return CSV content or a completed download.') };
    }
    async exportPdf(reportId, signal) {
        const raw = asObject(await this.request(`/api/v1/reports/${encodeURIComponent(reportId)}/exports`, { method: 'POST', body: JSON.stringify({ format: 'PDF' }) }, signal));
        if (typeof raw.downloadUrl === 'string' && (raw.status === 'COMPLETED' || raw.status === 'READY'))
            return { kind: 'SERVER_PDF', status: 'READY', downloadUrl: raw.downloadUrl, message: 'Authorised report PDF is ready.' };
        if (raw.status === 'QUEUED' || raw.status === 'RUNNING')
            return { kind: 'SERVER_PDF', status: 'NOT_CONFIGURED', message: 'The backend accepted the PDF job but did not return a completed download URL.' };
        return { kind: 'SERVER_PDF', status: 'FAILED', message: String(raw.message ?? 'PDF export did not complete.') };
    }
}
exports.RestReportsAdapter = RestReportsAdapter;

},
"examples/mock-state-report.json": function(module, exports, require) {
module.exports = {"id":"demo-state-report-karnataka","version":1,"title":"Labour Market Insights — Karnataka","reportType":"STATE","geographyLabels":["Karnataka"],"period":{"start":"2025-01-01","end":"2030-12-31","label":"2025–2030"},"referenceYear":2030,"createdAt":null,"templateVersion":"shramik-report-v1","provenance":"SYNTHETIC_DEMO","sections":[{"key":"EXECUTIVE_SUMMARY","title":"Executive Summary","status":"PARTIAL","blocks":[{"kind":"callout","tone":"warning","title":"Illustrative demo data","text":"This fixture is synthetic and does not represent verified labour-market findings."},{"kind":"paragraph","text":"This sample demonstrates the document layout only. Replace all values with approved SHRAMIK data before publication."},{"kind":"metric_grid","metrics":[{"key":"demand","label":"Projected Labour Demand","value":1420000,"formattedValue":"1.42M","unit":"persons (illustrative)","period":"2030","provenance":"SYNTHETIC_DEMO","note":"Synthetic UI fixture."},{"key":"supply","label":"Projected Supply","value":1050000,"formattedValue":"1.05M","unit":"persons (illustrative)","period":"2030","provenance":"SYNTHETIC_DEMO","note":"Synthetic UI fixture."},{"key":"gap","label":"Projected Gap","value":370000,"formattedValue":"370K","unit":"persons (illustrative)","period":"2030","provenance":"SYNTHETIC_DEMO","note":"Arithmetic example only; not a validated metric."}]}]},{"key":"DEMAND","title":"Demand Analysis","status":"PARTIAL","blocks":[{"kind":"paragraph","text":"The chart below is a synthetic example of the report's data-visualisation component."},{"kind":"chart","chartType":"line","title":"Illustrative Demand Trend","xLabel":"Year","yLabel":"Illustrative index","unit":"index points","series":[{"name":"Observed (demo)","points":[{"x":"2021","y":42},{"x":"2022","y":48},{"x":"2023","y":53},{"x":"2024","y":59},{"x":"2025","y":63}]},{"name":"Projection (demo)","points":[{"x":"2025","y":63},{"x":"2026","y":68},{"x":"2027","y":73},{"x":"2028","y":77},{"x":"2029","y":82},{"x":"2030","y":87}]}],"caption":"Synthetic illustration only. The index and values are not actual SHRAMIK data."},{"kind":"table","title":"Illustrative occupation summary","columns":[{"key":"occupation","label":"Occupation"},{"key":"demand","label":"Demand (demo index)","unit":"index"},{"key":"note","label":"Evidence note"}],"rows":[{"id":"row1","cells":{"occupation":"Data Analyst","demand":78,"note":"Synthetic fixture"}},{"id":"row2","cells":{"occupation":"Electrical Technician","demand":69,"note":"Synthetic fixture"}},{"id":"row3","cells":{"occupation":"Machine Operator","demand":61,"note":"Synthetic fixture"}}],"caption":"Fictional sample rows for layout testing."}]},{"key":"SOURCES_METHOD","title":"Data Sources & Methodology","status":"PARTIAL","blocks":[{"kind":"methodology","title":"Methodology status","text":"No statistical method has been applied to this fixture. This section demonstrates where approved definitions and model methods will appear.","version":"DEMO_ONLY"},{"kind":"source_list","sources":[{"name":"Synthetic UI fixture","datasetVersion":"fixture-v1","observationPeriod":"Illustrative only","notes":"Not a public source and not evidence about Karnataka or India's labour market."}]},{"kind":"callout","tone":"limitation","title":"Publication restriction","text":"Do not publish the fixture as a real report. Replace it with validated source-backed or explicitly derived results first."}]}],"metadata":{"sourceSnapshotIds":[],"methodologyVersion":"DEMO_ONLY","sourceLabels":["Synthetic UI fixture"],"limitations":["All figures, occupations, chart series and dates are illustrative UI data.","This fixture is not a verified finding and must not be published as a real SHRAMIK report."],"generatedByLabel":"DEMO PREVIEW — NOT FOR PUBLICATION"}};
},
"lucide-runtime": function(module, exports, require) {
const iconPaths={"Activity":[["polyline",{"points":"22 12 18 12 15 21 9 3 6 12 2 12"}]],"AlertCircle":[["circle",{"cx":12,"cy":12,"r":10}],["line",{"x1":12,"y1":8,"x2":12,"y2":12}],["circle",{"cx":12,"cy":16,"r":0.7,"fill":"currentColor"}]],"ArrowRight":[["line",{"x1":5,"y1":12,"x2":19,"y2":12}],["polyline",{"points":"12 5 19 12 12 19"}]],"ArrowUpRight":[["line",{"x1":7,"y1":17,"x2":17,"y2":7}],["polyline",{"points":"7 7 17 7 17 17"}]],"BarChart3":[["line",{"x1":3,"y1":3,"x2":3,"y2":21}],["line",{"x1":3,"y1":21,"x2":21,"y2":21}],["rect",{"x":6,"y":12,"width":4,"height":7}],["rect",{"x":13,"y":8,"width":4,"height":11}],["rect",{"x":19,"y":4,"width":2,"height":15}]],"Bell":[["path",{"d":"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"}],["path",{"d":"M10 21h4"}]],"BrainCircuit":[["path",{"d":"M12 18V5a3 3 0 1 0-5.8-1A4 4 0 0 0 4 11a4 4 0 0 0 3 7"}],["path",{"d":"M12 8a3 3 0 1 1 6 0 4 4 0 0 1 1 8 3 3 0 1 1-6 2"}],["path",{"d":"M8 13h4m-2-2v4m4-7h2m-2 6h2"}]],"Building2":[["path",{"d":"M6 22V3h12v19M3 22h18"}],["path",{"d":"M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1"}],["path",{"d":"M10 22v-3h4v3"}]],"CalendarDays":[["rect",{"x":3,"y":4,"width":18,"height":17,"rx":2}],["line",{"x1":16,"y1":2,"x2":16,"y2":6}],["line",{"x1":8,"y1":2,"x2":8,"y2":6}],["line",{"x1":3,"y1":10,"x2":21,"y2":10}],["path",{"d":"M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"}]],"ChartColumn":[["path",{"d":"M3 3v18h18"}],["rect",{"x":7,"y":12,"width":3,"height":6,"rx":0.5}],["rect",{"x":13,"y":8,"width":3,"height":10,"rx":0.5}],["rect",{"x":19,"y":4,"width":2,"height":14,"rx":0.5}]],"Check":[["polyline",{"points":"20 6 9 17 4 12"}]],"ChevronDown":[["polyline",{"points":"6 9 12 15 18 9"}]],"ChevronLeft":[["polyline",{"points":"15 18 9 12 15 6"}]],"ChevronRight":[["polyline",{"points":"9 18 15 12 9 6"}]],"CircleHelp":[["circle",{"cx":12,"cy":12,"r":10}],["path",{"d":"M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"}],["path",{"d":"M12 17h.01"}]],"Database":[["ellipse",{"cx":12,"cy":5,"r":9}],["path",{"d":"M3 5v14c0 2 4 3 9 3s9-1 9-3V5"}],["path",{"d":"M3 12c0 2 4 3 9 3s9-1 9-3"}]],"Factory":[["path",{"d":"M2 21V10l7 4V9l7 5V4h4v17z"}],["path",{"d":"M5 18h2m3 0h2m3 0h2m3 0h1"}]],"FileText":[["path",{"d":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}],["polyline",{"points":"14 2 14 8 20 8"}],["line",{"x1":8,"y1":13,"x2":16,"y2":13}],["line",{"x1":8,"y1":17,"x2":16,"y2":17}]],"HeartPulse":[["path",{"d":"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8"}],["path",{"d":"M3 12h4l2-3 3 6 2-3h7"}]],"Info":[["circle",{"cx":12,"cy":12,"r":10}],["line",{"x1":12,"y1":11,"x2":12,"y2":16}],["circle",{"cx":12,"cy":7,"r":0.7,"fill":"currentColor"}]],"Leaf":[["path",{"d":"M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16z"}],["path",{"d":"M4 21c3-5 7-8 13-12"}]],"Lightbulb":[["path",{"d":"M9 18h6m-5 4h4"}],["path",{"d":"M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4h-6c0-2 0-3-1-4z"}]],"MapPin":[["path",{"d":"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"}],["circle",{"cx":12,"cy":10,"r":2.5}]],"Menu":[["line",{"x1":4,"y1":6,"x2":20,"y2":6}],["line",{"x1":4,"y1":12,"x2":20,"y2":12}],["line",{"x1":4,"y1":18,"x2":20,"y2":18}]],"RefreshCw":[["path",{"d":"M20 7v5h-5M4 17v-5h5"}],["path",{"d":"M5.5 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.5-4"}]],"Search":[["circle",{"cx":11,"cy":11,"r":7}],["line",{"x1":16.5,"y1":16.5,"x2":21,"y2":21}]],"Settings":[["circle",{"cx":12,"cy":12,"r":3}],["path",{"d":"M19 13.5a7.5 7.5 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.6-1.5L13.5 2h-4L9 5a7.5 7.5 0 0 0-2.6 1.5L4 5.5 2 9l2 1.5a7.5 7.5 0 0 0 0 3L2 15l2 3.5 2.4-1A7.5 7.5 0 0 0 9 19l.5 3h4l.5-3a7.5 7.5 0 0 0 2.6-1.5l2.4 1L21 15z"}]],"SlidersHorizontal":[["line",{"x1":4,"y1":21,"x2":4,"y2":14}],["line",{"x1":4,"y1":10,"x2":4,"y2":3}],["line",{"x1":12,"y1":21,"x2":12,"y2":12}],["line",{"x1":12,"y1":8,"x2":12,"y2":3}],["line",{"x1":20,"y1":21,"x2":20,"y2":16}],["line",{"x1":20,"y1":12,"x2":20,"y2":3}],["line",{"x1":2,"y1":14,"x2":6,"y2":14}],["line",{"x1":10,"y1":8,"x2":14,"y2":8}],["line",{"x1":18,"y1":16,"x2":22,"y2":16}]],"Star":[["polygon",{"points":"12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.7 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"}]],"Table2":[["rect",{"x":3,"y":3,"width":18,"height":18,"rx":1}],["line",{"x1":3,"y1":9,"x2":21,"y2":9}],["line",{"x1":3,"y1":15,"x2":21,"y2":15}],["line",{"x1":9,"y1":3,"x2":9,"y2":21}],["line",{"x1":15,"y1":3,"x2":15,"y2":21}]],"TrendingUp":[["polyline",{"points":"22 7 13.5 15.5 8.5 10.5 2 17"}],["polyline",{"points":"16 7 22 7 22 13"}]],"Truck":[["path",{"d":"M1 3h14v13H1zM15 8h4l4 4v4h-8z"}],["circle",{"cx":5.5,"cy":18.5,"r":2.5}],["circle",{"cx":18.5,"cy":18.5,"r":2.5}]],"Users":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}],["circle",{"cx":10,"cy":7,"r":4}],["path",{"d":"M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"}]],"Wrench":[["path",{"d":"M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-3-3z"}]],"X":[["line",{"x1":18,"y1":6,"x2":6,"y2":18}],["line",{"x1":6,"y1":6,"x2":18,"y2":18}]]};
function makeIcon(name){return function Icon(props){const {size=24,color='currentColor',strokeWidth=2,...rest}=props||{}; const nodes=(iconPaths[name]||iconPaths.Info).map((entry,index)=>React.createElement(entry[0],{key:index,...entry[1]}));return React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':rest['aria-label']?undefined:true,...rest},...nodes);};}
module.exports={Activity:makeIcon("Activity"),AlertCircle:makeIcon("AlertCircle"),ArrowRight:makeIcon("ArrowRight"),ArrowUpRight:makeIcon("ArrowUpRight"),BarChart3:makeIcon("BarChart3"),Bell:makeIcon("Bell"),BrainCircuit:makeIcon("BrainCircuit"),Building2:makeIcon("Building2"),CalendarDays:makeIcon("CalendarDays"),ChartColumn:makeIcon("ChartColumn"),Check:makeIcon("Check"),ChevronDown:makeIcon("ChevronDown"),ChevronLeft:makeIcon("ChevronLeft"),ChevronRight:makeIcon("ChevronRight"),CircleHelp:makeIcon("CircleHelp"),Database:makeIcon("Database"),Factory:makeIcon("Factory"),FileText:makeIcon("FileText"),HeartPulse:makeIcon("HeartPulse"),Info:makeIcon("Info"),Leaf:makeIcon("Leaf"),Lightbulb:makeIcon("Lightbulb"),MapPin:makeIcon("MapPin"),Menu:makeIcon("Menu"),RefreshCw:makeIcon("RefreshCw"),Search:makeIcon("Search"),Settings:makeIcon("Settings"),SlidersHorizontal:makeIcon("SlidersHorizontal"),Star:makeIcon("Star"),Table2:makeIcon("Table2"),TrendingUp:makeIcon("TrendingUp"),Truck:makeIcon("Truck"),Users:makeIcon("Users"),Wrench:makeIcon("Wrench"),X:makeIcon("X")};

},
"react-jsx-runtime-shim": function(module, exports, require) {
exports.jsx=(type,props,key)=>React.createElement(type,{...(props||{}),...(key!==undefined?{key}: {})});
exports.jsxs=exports.jsx;
exports.Fragment=React.Fragment;

}
};
const __cache={};
function __normalize(id,from){if(!id.startsWith('.'))return id;const base=(from.split('/').slice(0,-1)).concat(id.split('/'));const out=[];for(const part of base){if(!part||part==='.')continue;if(part==='..')out.pop();else out.push(part);}return out.join('/').replace(/\.(tsx?|jsx?)$/,'');}
function __require(id,from){if(id==='react')return window.React;if(id==='react-dom/client')return {createRoot:window.ReactDOM.createRoot.bind(window.ReactDOM)};if(id==='lucide-react')return __require('lucide-runtime','entry');if(id==='react/jsx-runtime')return __require('react-jsx-runtime-shim','entry');const key=from?__normalize(id,from):id;if(__cache[key])return __cache[key].exports;const factory=__modules[key];if(!factory)throw new Error('Bundle module missing: '+key+' (imported from '+(from||'entry')+')');const module={exports:{}};__cache[key]=module;factory(module,module.exports,dep=>__require(dep,key));return module.exports;}
__require('main');
})();
