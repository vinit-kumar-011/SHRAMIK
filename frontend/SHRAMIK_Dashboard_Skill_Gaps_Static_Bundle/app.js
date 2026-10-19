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
    if (window.location.hash === '#dashboard')
        return 'dashboard';
    const path = decodeURIComponent(window.location.pathname).toLowerCase();
    if (new URLSearchParams(window.location.search).get('page') === 'skill-gaps' || path.endsWith('skill-gap-analysis.html') || path.endsWith('/skill-gaps'))
        return 'skill-gaps';
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
    const [active, setActive] = (0, react_1.useState)(() => getInitialPage() === 'skill-gaps' ? 'Skill Gaps' : 'Dashboard');
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
            setActive(page === 'skill-gaps' ? 'Skill Gaps' : 'Dashboard');
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
    return (0, jsx_runtime_1.jsxs)("div", { className: `app-root data-mode-${adapter.mode}`, children: [(0, jsx_runtime_1.jsx)(Header, { regions: regions, region: region, onRegionChange: handleRegionChange, onMenu: () => setMobileOpen(true), profile: profile, query: query, onQueryChange: setQuery, searchResults: searchResults, searchBusy: searchBusy, searchOpen: searchOpen, onSearchOpenChange: setSearchOpen, onSearchSelect: handleSearchSelect, notifications: notifications, notificationsOpen: notificationsOpen, onNotificationsToggle: () => { setNotificationsOpen((value) => !value); setProfileOpen(false); }, onNotificationRead: (id) => void markRead(id), profileOpen: profileOpen, onProfileToggle: () => { setProfileOpen((value) => !value); setNotificationsOpen(false); }, onOpenSection: (section) => void openSection(section), adapterMode: adapter.mode }), (0, jsx_runtime_1.jsxs)("div", { className: "app-layout", children: [(0, jsx_runtime_1.jsx)(Sidebar, { active: active, onNavigate: handleNavigate, mobileOpen: mobileOpen, onClose: () => setMobileOpen(false) }), (0, jsx_runtime_1.jsx)("main", { className: "dashboard-main", "aria-busy": activePage === 'dashboard' ? loading || refreshing : undefined, children: activePage === 'skill-gaps' ? (0, jsx_runtime_1.jsx)(SkillGapAnalysisPage_1.default, { globalRegionCode: region, onGlobalRegionChange: handleGapRegionChange, onOpenDetail: handleGapDetail, onDetailError: handleGapDetailError }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { className: "hero-band", "aria-labelledby": "page-title", children: [(0, jsx_runtime_1.jsxs)("div", { className: "hero-copy", children: [(0, jsx_runtime_1.jsxs)("div", { className: "breadcrumb", children: ["DASHBOARD ", (0, jsx_runtime_1.jsx)("span", { children: "/" }), " ", regionLabel.toUpperCase()] }), (0, jsx_runtime_1.jsxs)("h1", { id: "page-title", children: ["India\u2019s Labour Market", (0, jsx_runtime_1.jsx)("br", { className: "desktop-break" }), " at a Glance"] }), (0, jsx_runtime_1.jsx)("div", { className: "title-underline" }), (0, jsx_runtime_1.jsx)("p", { children: "Key insights on demand, supply, skill gaps and emerging opportunities across sectors and regions." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "hero-art-wrap", style: { transform: `translate3d(0, ${parallax}px, 0)` }, "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("img", { className: "hero-art", src: "./assets/hero-worker-industrial.png", alt: "" }), (0, jsx_runtime_1.jsx)("img", { className: "sticky-note-art", src: "./assets/sticky-note-decorative.png", alt: "" }), (0, jsx_runtime_1.jsx)("span", { className: "hero-accent-dot" })] })] }), error && (0, jsx_runtime_1.jsxs)("div", { role: "alert", className: "data-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 17 }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Dashboard data unavailable." }), " ", error] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: refresh, children: "Retry" })] }), rankingsError && (0, jsx_runtime_1.jsxs)("div", { role: "status", className: "data-error subtle-error", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 16 }), (0, jsx_runtime_1.jsxs)("span", { children: ["Regional rankings: ", rankingsError] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: refresh, children: "Retry" })] }), loading && !dashboard && (0, jsx_runtime_1.jsxs)("div", { className: "load-strip", role: "status", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16, className: "spin-icon" }), " Loading dashboard data from the active adapter\u2026"] }), (0, jsx_runtime_1.jsxs)("section", { className: "kpi-grid", "aria-label": "Key labour market indicators", children: [(dashboard?.kpis ?? []).map((item, index) => (0, jsx_runtime_1.jsx)(KpiCard, { item: item, index: index, onOpen: (selected) => void openIndicator(selected) }, item.id)), loading && !dashboard && Array.from({ length: 4 }, (_, index) => (0, jsx_runtime_1.jsx)("div", { className: "kpi-skeleton", "aria-hidden": "true" }, index))] }), (0, jsx_runtime_1.jsxs)("section", { className: "middle-grid", "aria-label": "Market trends and regional intelligence", children: [(0, jsx_runtime_1.jsx)(ChartPanel, { data: dashboard, periodYears: periodYears, onPeriodChange: setPeriodYears, onOpenDetail: (section) => void openSection(section) }), (0, jsx_runtime_1.jsx)(RegionalPanel, { rankings: rankings, metric: rankingMetric, onMetricChange: handleRankingMetricChange, onOpenDetail: (section) => void openSection(section), busy: !rankings && !rankingsError })] }), (0, jsx_runtime_1.jsxs)("section", { className: "summary-grid", "aria-label": "Skills, sectors and occupation summaries", children: [(0, jsx_runtime_1.jsx)(SummaryPanel, { title: "Emerging Skills", subtitle: "Skills with rising demand signals", kind: "skills", rows: dashboard?.emergingSkills ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) }), (0, jsx_runtime_1.jsx)(SummaryPanel, { title: "Skill Gaps by Sector", subtitle: "Estimated gap (in millions)", kind: "gaps", rows: dashboard?.sectorGaps ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) }), (0, jsx_runtime_1.jsx)(SummaryPanel, { title: "Occupation Forecasts", subtitle: "Projected demand change (2024\u20132029)", kind: "forecasts", rows: dashboard?.occupationForecasts ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) })] }), (0, jsx_runtime_1.jsxs)("footer", { className: "method-note", children: [(0, jsx_runtime_1.jsx)("span", { className: "note-marker", children: "i" }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: dashboard?.meta.provenance === 'source-backed' ? 'Data notes:' : 'Prototype preview:' }), " ", dashboard?.meta.provenance === 'source-backed' ? `${dashboard.meta.sourceLabel}. Check the detail panels for source notes, units and coverage.` : 'All numbers currently visible come from an illustrative adapter unless a source-backed API is configured; do not treat them as verified labour-market statistics.'] }), (0, jsx_runtime_1.jsxs)("span", { className: `data-status-footer ${dashboard?.meta.provenance ?? 'mock'}`, children: [(0, jsx_runtime_1.jsx)("span", { className: "status-dot" }), dashboard?.meta.provenance === 'source-backed' ? 'Source-backed' : dashboard?.meta.provenance === 'mixed' ? 'Mixed provenance' : dashboard?.meta.provenance === 'derived' ? 'Derived values' : 'Illustrative data'] }), (0, jsx_runtime_1.jsxs)("span", { className: "updated", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CalendarDays, { size: 14 }), dashboard?.meta.updatedAt ? formatUpdated(dashboard.meta.updatedAt) : 'Update unavailable'] }), (0, jsx_runtime_1.jsxs)("span", { className: "updated", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Database, { size: 14 }), adapter.mode === 'rest' ? 'REST API' : 'Mock adapter'] }), (0, jsx_runtime_1.jsxs)("button", { className: "refresh-button", type: "button", onClick: refresh, disabled: loading || refreshing, "aria-label": "Refresh dashboard data", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 13, className: refreshing ? 'spin-icon' : '' }), " Refresh"] })] })] }) })] }), toast && (0, jsx_runtime_1.jsxs)("div", { role: "status", className: "toast-message", children: [(0, jsx_runtime_1.jsx)("span", { children: toast }), (0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "Dismiss notification", onClick: () => setToast(''), children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { size: 15 }) })] }), (0, jsx_runtime_1.jsx)(DetailDrawer, { detail: detail, loading: detailLoading, error: detailError, onClose: closeDetail })] });
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
