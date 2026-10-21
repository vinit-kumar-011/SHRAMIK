(function(){
'use strict';
const __modules={
"main": function(module, exports, require) {
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = require("react-dom/client");
const SHRAMIKDashboard_1 = __importDefault(require("./SHRAMIKDashboard"));
(0, client_1.createRoot)(document.getElementById('root')).render(react_1.default.createElement(react_1.default.StrictMode, null,
    react_1.default.createElement(SHRAMIKDashboard_1.default, null)));

},
"SHRAMIKDashboard": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SHRAMIKDashboard;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const adapter_1 = require("./api/adapter");
const assetUrl = (name) => `${"./"}assets/${name}`;
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
    return React.createElement("svg", { className: `sparkline tone-${tone}`, viewBox: "0 0 100 36", role: "img", "aria-label": "Recent trend" },
        React.createElement("defs", null,
            React.createElement("linearGradient", { id: `spark-fill-${id}`, x1: "0", y1: "0", x2: "0", y2: "1" },
                React.createElement("stop", { offset: "0%", stopColor: "currentColor", stopOpacity: ".2" }),
                React.createElement("stop", { offset: "100%", stopColor: "currentColor", stopOpacity: "0" }))),
        React.createElement("polygon", { points: `${firstX},35 ${points} ${lastX},35`, fill: `url(#spark-fill-${id})` }),
        React.createElement("polyline", { points: points, fill: "none", stroke: "currentColor", strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round" }));
}
function KpiCard({ item, index, onOpen }) {
    const Icon = KPI_ICONS[item.key] ?? lucide_react_1.Activity;
    const tone = toneForKpi(item, index);
    return React.createElement("button", { type: "button", className: `kpi-card tone-${tone}`, onClick: () => onOpen(item), "aria-label": `Open ${item.title} details` },
        React.createElement("div", { className: "kpi-icon" },
            React.createElement(Icon, { size: 25, strokeWidth: 2.1 })),
        React.createElement("div", { className: "kpi-main" },
            React.createElement("div", { className: "eyebrow" }, item.title),
            React.createElement("div", { className: "kpi-subtitle" }, item.subtitle),
            React.createElement("div", { className: "kpi-value" }, item.formattedValue),
            React.createElement("div", { className: `kpi-change ${item.deltaPct < 0 ? 'change-negative' : ''}` },
                React.createElement(lucide_react_1.TrendingUp, { size: 18, strokeWidth: 2.8 }),
                React.createElement("strong", null,
                    item.deltaPct > 0 ? '+' : '',
                    item.deltaPct,
                    "%"),
                React.createElement("span", null, item.context))),
        React.createElement("div", { className: "kpi-spark" },
            React.createElement(Sparkline, { values: item.trend, tone: tone, id: item.id })),
        React.createElement("span", { className: "card-open" },
            React.createElement(lucide_react_1.ChevronRight, { size: 15 })));
}
function SelectControl({ label, value, onChange, options, compact = false }) {
    return React.createElement("label", { className: `select-wrap ${compact ? 'compact-select' : ''}` },
        React.createElement("span", { className: "sr-only" }, label),
        React.createElement("select", { value: value, onChange: (event) => onChange(event.target.value) }, options.map((option) => React.createElement("option", { key: option.value, value: option.value }, option.label))),
        React.createElement(lucide_react_1.ChevronDown, { size: 14, "aria-hidden": "true" }));
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
    return React.createElement("section", { className: "panel trend-panel", "aria-labelledby": "trend-title", "aria-busy": !data },
        React.createElement("div", { className: "panel-header" },
            React.createElement("div", null,
                React.createElement("h2", { id: "trend-title" }, "Demand vs Supply Trends"),
                React.createElement("p", null, "Estimated labour demand and supply (in millions)")),
            React.createElement(SelectControl, { label: "Trend period", value: periodYears, onChange: onPeriodChange, options: [{ value: 5, label: 'Last 5 years' }, { value: 3, label: 'Last 3 years' }] })),
        React.createElement("div", { className: "chart-legend" },
            React.createElement("span", null,
                React.createElement("i", { className: "legend-line demand" }),
                "Demand"),
            React.createElement("span", null,
                React.createElement("i", { className: "legend-line supply" }),
                "Supply")),
        React.createElement("div", { className: "trend-chart" },
            points.length ? React.createElement("svg", { viewBox: "0 0 650 210", preserveAspectRatio: "none", role: "img", "aria-label": "Demand and supply trend chart. Values are from the selected data adapter." },
                Array.from({ length: 7 }, (_, i) => i * step).map((value) => React.createElement("g", { key: value },
                    React.createElement("line", { x1: "42", x2: "605", y1: yFor(value), y2: yFor(value), className: "chart-grid" }),
                    React.createElement("text", { x: "30", y: yFor(value) + 4, className: "chart-axis", textAnchor: "end" }, value))),
                points.map((point, i) => React.createElement("g", { key: point.year },
                    React.createElement("line", { x1: xFor(i, points.length), x2: xFor(i, points.length), y1: "5", y2: "163", className: "chart-vgrid" }),
                    React.createElement("text", { x: xFor(i, points.length), y: "190", className: "chart-axis", textAnchor: "middle" }, point.year))),
                React.createElement("polyline", { points: demandPts, className: "chart-demand" }),
                React.createElement("polyline", { points: supplyPts, className: "chart-supply" }),
                points.map((point, i) => React.createElement("circle", { key: `d-${point.year}`, cx: xFor(i, points.length), cy: yFor(point.demand), r: "4.2", className: "point-demand" })),
                points.map((point, i) => React.createElement("circle", { key: `s-${point.year}`, cx: xFor(i, points.length), cy: yFor(point.supply), r: "4.2", className: "point-supply" }))) : React.createElement("div", { className: "panel-empty" }, "Trend data is not available for this filter."),
            React.createElement("button", { className: "chart-next", type: "button", "aria-label": "Open detailed demand and supply trends", onClick: () => onOpenDetail('demand') },
                React.createElement(lucide_react_1.ChevronRight, { size: 18 }))));
}
function RegionalPanel({ rankings, metric, onMetricChange, onOpenDetail, busy }) {
    const metricLabels = { demand: 'Demand', supply: 'Supply', 'skill-gap': 'Skill gap' };
    return React.createElement("section", { className: "panel regional-panel", "aria-labelledby": "regional-title", "aria-busy": busy },
        React.createElement("div", { className: "panel-header" },
            React.createElement("div", null,
                React.createElement("h2", { id: "regional-title" }, "Regional Intelligence"),
                React.createElement("p", null, "Labour market ranking by state")),
            React.createElement(SelectControl, { label: "Regional metric", value: metric, onChange: onMetricChange, compact: true, options: [{ value: 'demand', label: 'Demand' }, { value: 'supply', label: 'Supply' }, { value: 'skill-gap', label: 'Skill gap' }] })),
        React.createElement("div", { className: "regional-content" },
            React.createElement("div", { className: "map-block" },
                React.createElement("img", { src: assetUrl('india-map-illustrative.png'), alt: "Decorative illustration of India; state shading does not represent the selected metric" }),
                React.createElement("div", { className: "map-legend map-legend-note" },
                    React.createElement("span", null,
                        React.createElement("i", { className: "map-dot high" }),
                        "Regional"),
                    React.createElement("span", null,
                        React.createElement("i", { className: "map-dot medium" }),
                        "ranking"),
                    React.createElement("span", null,
                        React.createElement("i", { className: "map-dot low" }),
                        "data below"))),
            React.createElement("div", { className: "state-list" },
                React.createElement("h3", null,
                    "Top States by ",
                    metricLabels[metric]),
                rankings?.items?.length ? rankings.items.slice(0, 5).map((state, index) => React.createElement("div", { className: "state-row", key: state.code || state.name },
                    React.createElement("span", { className: "rank" }, state.rank ?? index + 1),
                    React.createElement("span", null, state.name),
                    React.createElement("strong", null, state.formattedValue))) : React.createElement("div", { className: "panel-empty" }, "No regional ranking is available."),
                React.createElement("button", { className: "button-primary state-cta", onClick: () => onOpenDetail('regional-intelligence'), type: "button" },
                    "View all states ",
                    React.createElement(lucide_react_1.ArrowRight, { size: 15 })))));
}
function DataRows({ rows, kind, onOpenRow }) {
    const section = kind === 'skills' ? 'emerging-skills' : kind === 'gaps' ? 'skill-gaps' : 'forecasts';
    return React.createElement("div", { className: `data-rows data-rows-${kind}` },
        rows.map((row) => {
            const Icon = ICONS[row.iconKey] ?? lucide_react_1.Activity;
            const trailing = row.formattedDelta ?? row.formattedValue;
            const hasValue = trailing !== undefined;
            return React.createElement("button", { className: "data-row", key: row.id, type: "button", onClick: () => onOpenRow(row, section), "aria-label": `Open details for ${row.name}` },
                React.createElement("span", { className: `row-icon tone-${row.tone}` },
                    React.createElement(Icon, { size: 18 })),
                React.createElement("span", { className: "row-name" }, row.name),
                hasValue ? React.createElement("strong", { className: row.formattedDelta ? 'row-delta' : 'row-value' }, trailing) : null,
                React.createElement("span", { className: "bar-track", "aria-hidden": "true" },
                    React.createElement("span", { className: `bar-fill tone-${row.tone}`, style: { width: `${Math.max(0, Math.min(100, row.displayScore ?? 0))}%` } })));
        }),
        !rows.length && React.createElement("div", { className: "panel-empty" }, "No rows returned for this section."));
}
function SummaryPanel({ title, subtitle, kind, rows, onOpenSection, onOpenRow }) {
    const section = kind === 'skills' ? 'emerging-skills' : kind === 'gaps' ? 'skill-gaps' : 'forecasts';
    return React.createElement("section", { className: `panel summary-panel summary-${kind}` },
        React.createElement("div", { className: "panel-header" },
            React.createElement("div", null,
                React.createElement("h2", null, title),
                React.createElement("p", null, subtitle)),
            React.createElement("button", { className: "button-outline", onClick: () => onOpenSection(section), type: "button" },
                "View all ",
                React.createElement(lucide_react_1.ArrowRight, { size: 14 }))),
        React.createElement(DataRows, { rows: rows, kind: kind, onOpenRow: onOpenRow }));
}
function Sidebar({ active, onNavigate, mobileOpen, onClose }) {
    return React.createElement(React.Fragment, null,
        mobileOpen && React.createElement("button", { className: "mobile-scrim", "aria-label": "Close navigation", onClick: onClose }),
        React.createElement("aside", { className: `sidebar ${mobileOpen ? 'sidebar-open' : ''}`, "aria-label": "Main navigation" },
            React.createElement("div", { className: "sidebar-brand mobile-brand" },
                React.createElement("div", { className: "brand-mark" }, "S"),
                React.createElement("div", { className: "brand-copy" },
                    React.createElement("strong", null, "SHRAMIK"),
                    React.createElement("span", null, "Labour Market Intelligence"))),
            React.createElement("nav", { className: "nav-list" }, NAV_ITEMS.map((item, index) => {
                const Icon = item.icon;
                return React.createElement("span", { className: "nav-wrapper", key: item.label },
                    index === 8 && React.createElement("span", { className: "nav-divider" }),
                    React.createElement("button", { className: `nav-item ${active === item.label ? 'active' : ''}`, type: "button", onClick: () => { onNavigate(item); onClose(); } },
                        React.createElement(Icon, { size: 19 }),
                        React.createElement("span", null, item.label)));
            })),
            React.createElement("div", { className: "sidebar-art", "aria-hidden": "true" },
                React.createElement("img", { src: assetUrl('sidebar-workers.png'), alt: "" })),
            React.createElement("div", { className: "mission-note" },
                React.createElement("span", { className: "mission-icon" },
                    React.createElement(lucide_react_1.Lightbulb, { size: 19 })),
                React.createElement("p", null,
                    "Data for people.",
                    React.createElement("br", null),
                    "Opportunities for a stronger India."))));
}
function SearchResults({ results, busy, onSelect }) {
    if (busy)
        return React.createElement("div", { className: "search-hint", role: "status" }, "Searching connected labour-market data\u2026");
    if (!results.length)
        return React.createElement("div", { className: "search-hint" }, "No matching results. Try a skill, occupation, sector or state.");
    return React.createElement("div", { className: "search-hint search-results", role: "listbox", "aria-label": "Search results" }, results.map((result) => React.createElement("button", { key: `${result.kind}-${result.id}`, type: "button", role: "option", onClick: () => onSelect(result) },
        React.createElement("strong", null, result.label),
        React.createElement("small", null, result.description))));
}
function Header({ regions, region, onRegionChange, onMenu, profile, query, onQueryChange, searchResults, searchBusy, searchOpen, onSearchOpenChange, onSearchSelect, notifications, notificationsOpen, onNotificationsToggle, onNotificationRead, profileOpen, onProfileToggle, onOpenSection, adapterMode, }) {
    const unreadCount = notifications.filter((item) => !item.read).length;
    const visibleRegionOptions = regions.length ? regions : [{ code: region, label: region, level: 'national' }];
    return React.createElement("header", { className: "topbar" },
        React.createElement("button", { className: "mobile-menu icon-button", onClick: onMenu, type: "button", "aria-label": "Open navigation" },
            React.createElement(lucide_react_1.Menu, { size: 22 })),
        React.createElement("div", { className: "brand-lockup" },
            React.createElement("div", { className: "brand-mark" }, "S"),
            React.createElement("div", { className: "brand-word" },
                React.createElement("strong", null, "SHRAMIK"),
                React.createElement("span", null,
                    "Labour Market",
                    React.createElement("br", null),
                    "Intelligence System"))),
        React.createElement("div", { className: "global-search" },
            React.createElement(lucide_react_1.Search, { size: 18 }),
            React.createElement("input", { value: query, onFocus: () => onSearchOpenChange(true), onChange: (event) => { onQueryChange(event.target.value); onSearchOpenChange(true); }, onKeyDown: (event) => { if (event.key === 'Escape')
                    onSearchOpenChange(false); }, placeholder: "Search for skills, occupations, sectors or regions\u2026", "aria-label": "Search labour market data", "aria-expanded": searchOpen, "aria-controls": "shramik-search-results" }),
            React.createElement("kbd", null, "Ctrl"),
            React.createElement("kbd", null, "K"),
            searchOpen && query.trim().length >= 2 && React.createElement("div", { id: "shramik-search-results" },
                React.createElement(SearchResults, { results: searchResults, busy: searchBusy, onSelect: onSearchSelect })),
            searchOpen && query.trim().length > 0 && query.trim().length < 2 && React.createElement("div", { className: "search-hint" }, "Enter at least 2 characters to search.")),
        React.createElement("label", { className: "region-select" },
            React.createElement(lucide_react_1.MapPin, { size: 18 }),
            React.createElement("span", { className: "sr-only" }, "Choose region"),
            React.createElement("select", { value: region, onChange: (event) => onRegionChange(event.target.value), "aria-label": "Region" }, visibleRegionOptions.map((item) => React.createElement("option", { key: item.code, value: item.code }, item.label))),
            React.createElement(lucide_react_1.ChevronDown, { size: 14 })),
        React.createElement("div", { className: "header-popover-anchor" },
            React.createElement("button", { className: "icon-button notification-button", "aria-label": `Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`, "aria-expanded": notificationsOpen, type: "button", onClick: onNotificationsToggle },
                React.createElement(lucide_react_1.Bell, { size: 21 }),
                unreadCount > 0 && React.createElement("span", { className: "notification-dot" })),
            notificationsOpen && React.createElement("div", { className: "header-popover notifications-popover" },
                React.createElement("div", { className: "popover-title" },
                    React.createElement("strong", null, "Notifications"),
                    React.createElement("span", null,
                        unreadCount,
                        " unread")),
                notifications.length ? notifications.map((item) => React.createElement("div", { key: item.id, className: `notification-item ${item.read ? 'is-read' : ''}` },
                    React.createElement("span", { className: `notification-mark severity-${item.severity}` }),
                    React.createElement("div", null,
                        React.createElement("strong", null, item.title),
                        React.createElement("p", null, item.body),
                        React.createElement("small", null, formatUpdated(item.createdAt))),
                    !item.read && React.createElement("button", { type: "button", "aria-label": `Mark ${item.title} read`, onClick: () => onNotificationRead(item.id) },
                        React.createElement(lucide_react_1.Check, { size: 15 })))) : React.createElement("p", { className: "popover-empty" }, "No notifications."))),
        React.createElement("div", { className: "header-popover-anchor" },
            React.createElement("button", { className: "profile-button", type: "button", onClick: onProfileToggle, "aria-expanded": profileOpen },
                React.createElement("span", { className: "avatar" }, profile?.initials ?? 'A'),
                React.createElement("span", { className: "profile-name" },
                    React.createElement("strong", null, profile?.displayName ?? 'Research Analyst'),
                    React.createElement("small", null, profile?.role ?? 'Workspace user')),
                React.createElement(lucide_react_1.ChevronDown, { size: 14 })),
            profileOpen && React.createElement("div", { className: "header-popover profile-popover" },
                React.createElement("div", { className: "profile-card-top" },
                    React.createElement("span", { className: "avatar" }, profile?.initials ?? 'A'),
                    React.createElement("div", null,
                        React.createElement("strong", null, profile?.displayName ?? 'Research Analyst'),
                        React.createElement("small", null, profile?.role ?? 'Workspace user'))),
                profile?.organisation && React.createElement("p", null, profile.organisation),
                React.createElement("div", { className: "adapter-mode-label" },
                    "Data adapter: ",
                    React.createElement("strong", null, adapterMode === 'rest' ? 'Connected REST API' : 'Interactive mock data')),
                React.createElement("button", { className: "popover-action", type: "button", onClick: () => { onOpenSection('profile'); onProfileToggle(); } },
                    "Open profile details ",
                    React.createElement(lucide_react_1.ArrowRight, { size: 14 })))));
}
function DetailDrawer({ detail, loading, error, onClose }) {
    if (!detail && !loading && !error)
        return null;
    return React.createElement("div", { className: "detail-scrim", role: "presentation", onMouseDown: (event) => { if (event.target === event.currentTarget)
            onClose(); } },
        React.createElement("aside", { className: "detail-drawer", role: "dialog", "aria-modal": "true", "aria-labelledby": "detail-title" },
            React.createElement("div", { className: "detail-heading" },
                React.createElement("div", null,
                    React.createElement("span", { className: "breadcrumb" }, "SHRAMIK / DETAILS"),
                    React.createElement("h2", { id: "detail-title" }, detail?.title ?? (loading ? 'Loading details' : 'Details unavailable'))),
                React.createElement("button", { className: "icon-button", type: "button", onClick: onClose, "aria-label": "Close details" },
                    React.createElement(lucide_react_1.X, null))),
            loading && React.createElement("div", { className: "detail-state" },
                React.createElement(lucide_react_1.RefreshCw, { className: "spin-icon", size: 20 }),
                " Loading connected detail data\u2026"),
            !loading && error && React.createElement("div", { className: "inline-error" },
                React.createElement(lucide_react_1.AlertCircle, { size: 17 }),
                React.createElement("span", null, error)),
            !loading && detail && React.createElement(React.Fragment, null,
                React.createElement("p", { className: "detail-description" }, detail.description),
                React.createElement("div", { className: "detail-facts" }, detail.facts.map((fact) => React.createElement("div", { key: fact.label },
                    React.createElement("small", null, fact.label),
                    React.createElement("strong", null, fact.value)))),
                detail.table && React.createElement("div", { className: "detail-table-wrap" },
                    React.createElement("table", { className: "detail-table" },
                        React.createElement("thead", null,
                            React.createElement("tr", null, detail.table.columns.map((column) => React.createElement("th", { key: column }, column)))),
                        React.createElement("tbody", null, detail.table.rows.map((row, index) => React.createElement("tr", { key: index }, detail.table.columns.map((column) => React.createElement("td", { key: column }, row[column] ?? '—'))))))),
                React.createElement("div", { className: "detail-provenance" },
                    React.createElement(lucide_react_1.Info, { size: 16 }),
                    React.createElement("div", null,
                        React.createElement("strong", null, detail.meta.sourceLabel),
                        React.createElement("p", null,
                            detail.meta.provenance === 'source-backed' ? 'Source-backed response' : detail.meta.provenance === 'mixed' ? 'Mixed source provenance' : 'Mock / illustrative response',
                            " \u00B7 Updated ",
                            formatUpdated(detail.meta.updatedAt)),
                        detail.meta.notes?.map((note) => React.createElement("p", { key: note }, note)))))));
}
function SHRAMIKDashboard({ onNavigate, dataAdapter } = {}) {
    const [defaultAdapter] = (0, react_1.useState)(() => (0, adapter_1.createLabourMarketDataAdapter)());
    const adapter = dataAdapter ?? defaultAdapter;
    const [active, setActive] = (0, react_1.useState)('Dashboard');
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
            closeDetail();
            setSearchOpen(false);
            return;
        }
        if (onNavigate) {
            onNavigate(`/${item.section}`, item.label);
        }
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
    const handleRankingMetricChange = (value) => setRankingMetric(value);
    return React.createElement("div", { className: `app-root data-mode-${adapter.mode}` },
        React.createElement(Header, { regions: regions, region: region, onRegionChange: handleRegionChange, onMenu: () => setMobileOpen(true), profile: profile, query: query, onQueryChange: setQuery, searchResults: searchResults, searchBusy: searchBusy, searchOpen: searchOpen, onSearchOpenChange: setSearchOpen, onSearchSelect: handleSearchSelect, notifications: notifications, notificationsOpen: notificationsOpen, onNotificationsToggle: () => { setNotificationsOpen((value) => !value); setProfileOpen(false); }, onNotificationRead: (id) => void markRead(id), profileOpen: profileOpen, onProfileToggle: () => { setProfileOpen((value) => !value); setNotificationsOpen(false); }, onOpenSection: (section) => void openSection(section), adapterMode: adapter.mode }),
        React.createElement("div", { className: "app-layout" },
            React.createElement(Sidebar, { active: active, onNavigate: handleNavigate, mobileOpen: mobileOpen, onClose: () => setMobileOpen(false) }),
            React.createElement("main", { className: "dashboard-main", "aria-busy": loading || refreshing },
                React.createElement("section", { className: "hero-band", "aria-labelledby": "page-title" },
                    React.createElement("div", { className: "hero-copy" },
                        React.createElement("div", { className: "breadcrumb" },
                            "DASHBOARD ",
                            React.createElement("span", null, "/"),
                            " ",
                            regionLabel.toUpperCase()),
                        React.createElement("h1", { id: "page-title" },
                            "India\u2019s Labour Market",
                            React.createElement("br", { className: "desktop-break" }),
                            " at a Glance"),
                        React.createElement("div", { className: "title-underline" }),
                        React.createElement("p", null, "Key insights on demand, supply, skill gaps and emerging opportunities across sectors and regions.")),
                    React.createElement("div", { className: "hero-art-wrap", style: { transform: `translate3d(0, ${parallax}px, 0)` }, "aria-hidden": "true" },
                        React.createElement("img", { className: "hero-art", src: assetUrl('hero-worker-industrial.png'), alt: "" }),
                        React.createElement("img", { className: "sticky-note-art", src: assetUrl('sticky-note-decorative.png'), alt: "" }),
                        React.createElement("span", { className: "hero-accent-dot" }))),
                error && React.createElement("div", { role: "alert", className: "data-error" },
                    React.createElement(lucide_react_1.AlertCircle, { size: 17 }),
                    React.createElement("span", null,
                        React.createElement("strong", null, "Dashboard data unavailable."),
                        " ",
                        error),
                    React.createElement("button", { type: "button", onClick: refresh }, "Retry")),
                rankingsError && React.createElement("div", { role: "status", className: "data-error subtle-error" },
                    React.createElement(lucide_react_1.AlertCircle, { size: 16 }),
                    React.createElement("span", null,
                        "Regional rankings: ",
                        rankingsError),
                    React.createElement("button", { type: "button", onClick: refresh }, "Retry")),
                loading && !dashboard && React.createElement("div", { className: "load-strip", role: "status" },
                    React.createElement(lucide_react_1.RefreshCw, { size: 16, className: "spin-icon" }),
                    " Loading dashboard data from the active adapter\u2026"),
                React.createElement("section", { className: "kpi-grid", "aria-label": "Key labour market indicators" },
                    (dashboard?.kpis ?? []).map((item, index) => React.createElement(KpiCard, { key: item.id, item: item, index: index, onOpen: (selected) => void openIndicator(selected) })),
                    loading && !dashboard && Array.from({ length: 4 }, (_, index) => React.createElement("div", { className: "kpi-skeleton", key: index, "aria-hidden": "true" }))),
                React.createElement("section", { className: "middle-grid", "aria-label": "Market trends and regional intelligence" },
                    React.createElement(ChartPanel, { data: dashboard, periodYears: periodYears, onPeriodChange: setPeriodYears, onOpenDetail: (section) => void openSection(section) }),
                    React.createElement(RegionalPanel, { rankings: rankings, metric: rankingMetric, onMetricChange: handleRankingMetricChange, onOpenDetail: (section) => void openSection(section), busy: !rankings && !rankingsError })),
                React.createElement("section", { className: "summary-grid", "aria-label": "Skills, sectors and occupation summaries" },
                    React.createElement(SummaryPanel, { title: "Emerging Skills", subtitle: "Skills with rising demand signals", kind: "skills", rows: dashboard?.emergingSkills ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) }),
                    React.createElement(SummaryPanel, { title: "Skill Gaps by Sector", subtitle: "Estimated gap (in millions)", kind: "gaps", rows: dashboard?.sectorGaps ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) }),
                    React.createElement(SummaryPanel, { title: "Occupation Forecasts", subtitle: "Projected demand change (2024\u20132029)", kind: "forecasts", rows: dashboard?.occupationForecasts ?? [], onOpenSection: (section) => void openSection(section), onOpenRow: (row, section) => void openRow(row, section) })),
                React.createElement("footer", { className: "method-note" },
                    React.createElement("span", { className: "note-marker" }, "i"),
                    React.createElement("p", null,
                        React.createElement("strong", null, dashboard?.meta.provenance === 'source-backed' ? 'Data notes:' : 'Prototype preview:'),
                        " ",
                        dashboard?.meta.provenance === 'source-backed' ? `${dashboard.meta.sourceLabel}. Check the detail panels for source notes, units and coverage.` : 'All numbers currently visible come from an illustrative adapter unless a source-backed API is configured; do not treat them as verified labour-market statistics.'),
                    React.createElement("span", { className: `data-status-footer ${dashboard?.meta.provenance ?? 'mock'}` },
                        React.createElement("span", { className: "status-dot" }),
                        dashboard?.meta.provenance === 'source-backed' ? 'Source-backed' : dashboard?.meta.provenance === 'mixed' ? 'Mixed provenance' : 'Illustrative data'),
                    React.createElement("span", { className: "updated" },
                        React.createElement(lucide_react_1.CalendarDays, { size: 14 }),
                        dashboard?.meta.updatedAt ? formatUpdated(dashboard.meta.updatedAt) : 'Update unavailable'),
                    React.createElement("span", { className: "updated" },
                        React.createElement(lucide_react_1.Database, { size: 14 }),
                        adapter.mode === 'rest' ? 'REST API' : 'Mock adapter'),
                    React.createElement("button", { className: "refresh-button", type: "button", onClick: refresh, disabled: loading || refreshing, "aria-label": "Refresh dashboard data" },
                        React.createElement(lucide_react_1.RefreshCw, { size: 13, className: refreshing ? 'spin-icon' : '' }),
                        " Refresh")))),
        toast && React.createElement("div", { role: "status", className: "toast-message" },
            React.createElement("span", null, toast),
            React.createElement("button", { type: "button", "aria-label": "Dismiss notification", onClick: () => setToast('') },
                React.createElement(lucide_react_1.X, { size: 15 }))),
        React.createElement(DetailDrawer, { detail: detail, loading: detailLoading, error: detailError, onClose: closeDetail }));
}

},
"api/adapter": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLabourMarketDataAdapter = createLabourMarketDataAdapter;
const mock_adapter_1 = require("./mock-adapter");
const rest_adapter_1 = require("./rest-adapter");
function createLabourMarketDataAdapter() {
    const env = { VITE_SHRAMIK_API_BASE_URL: (window.SHRAMIK_CONFIG && window.SHRAMIK_CONFIG.apiBaseUrl) || "" };
    const baseUrl = env?.VITE_SHRAMIK_API_BASE_URL?.trim();
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
"lucide-runtime": function(module, exports, require) {
const paths = {"Activity":[["polyline",{"points":"22 12 18 12 15 21 9 3 6 12 2 12"}]],"AlertCircle":[["circle",{"cx":12,"cy":12,"r":10}],["line",{"x1":12,"y1":8,"x2":12,"y2":12}],["circle",{"cx":12,"cy":16,"r":0.6,"fill":"currentColor"}]],"ArrowRight":[["line",{"x1":5,"y1":12,"x2":19,"y2":12}],["polyline",{"points":"12 5 19 12 12 19"}]],"Bell":[["path",{"d":"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"}],["path",{"d":"M10 21h4"}]],"BrainCircuit":[["path",{"d":"M12 18V5a3 3 0 1 0-5.8-1A4 4 0 0 0 4 11a4 4 0 0 0 3 7"}],["path",{"d":"M12 8a3 3 0 1 1 6 0 4 4 0 0 1 1 8 3 3 0 1 1-6 2"}],["path",{"d":"M8 13h4m-2-2v4m4-7h2m-2 6h2"}]],"Building2":[["path",{"d":"M6 22V3h12v19M3 22h18"}],["path",{"d":"M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1"}],["path",{"d":"M10 22v-3h4v3"}]],"CalendarDays":[["rect",{"x":3,"y":4,"width":18,"height":17,"rx":2}],["line",{"x1":16,"y1":2,"x2":16,"y2":6}],["line",{"x1":8,"y1":2,"x2":8,"y2":6}],["line",{"x1":3,"y1":10,"x2":21,"y2":10}],["path",{"d":"M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"}]],"ChartColumn":[["path",{"d":"M3 3v18h18"}],["rect",{"x":7,"y":12,"width":3,"height":6,"rx":0.5}],["rect",{"x":13,"y":8,"width":3,"height":10,"rx":0.5}],["rect",{"x":19,"y":4,"width":2,"height":14,"rx":0.5}]],"Check":[["polyline",{"points":"20 6 9 17 4 12"}]],"ChevronDown":[["polyline",{"points":"6 9 12 15 18 9"}]],"ChevronRight":[["polyline",{"points":"9 18 15 12 9 6"}]],"Database":[["ellipse",{"cx":12,"cy":5,"r":9}],["path",{"d":"M3 5v14c0 2 4 3 9 3s9-1 9-3V5"}],["path",{"d":"M3 12c0 2 4 3 9 3s9-1 9-3"}]],"Factory":[["path",{"d":"M2 21V10l7 4V9l7 5V4h4v17z"}],["path",{"d":"M5 18h2m3 0h2m3 0h2m3 0h1"}]],"FileText":[["path",{"d":"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}],["polyline",{"points":"14 2 14 8 20 8"}],["line",{"x1":8,"y1":13,"x2":16,"y2":13}],["line",{"x1":8,"y1":17,"x2":16,"y2":17}]],"HeartPulse":[["path",{"d":"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8"}],["path",{"d":"M3 12h4l2-3 3 6 2-3h7"}]],"Info":[["circle",{"cx":12,"cy":12,"r":10}],["line",{"x1":12,"y1":11,"x2":12,"y2":16}],["circle",{"cx":12,"cy":7,"r":0.7,"fill":"currentColor"}]],"Leaf":[["path",{"d":"M20 4c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 10-6 8-16z"}],["path",{"d":"M4 21c3-5 7-8 13-12"}]],"Lightbulb":[["path",{"d":"M9 18h6m-5 4h4"}],["path",{"d":"M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4h-6c0-2 0-3-1-4z"}]],"MapPin":[["path",{"d":"M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"}],["circle",{"cx":12,"cy":10,"r":2.5}]],"Menu":[["line",{"x1":4,"y1":6,"x2":20,"y2":6}],["line",{"x1":4,"y1":12,"x2":20,"y2":12}],["line",{"x1":4,"y1":18,"x2":20,"y2":18}]],"RefreshCw":[["path",{"d":"M20 7v5h-5M4 17v-5h5"}],["path",{"d":"M5.5 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.5-4"}]],"Search":[["circle",{"cx":11,"cy":11,"r":7}],["line",{"x1":16.5,"y1":16.5,"x2":21,"y2":21}]],"Settings":[["circle",{"cx":12,"cy":12,"r":3}],["path",{"d":"M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.8-.2 1.7 1.7 0 0 0-1 1.5v.2h-3.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.2l-.2.1L7 17l.1-.1A1.7 1.7 0 0 0 7.4 15a1.7 1.7 0 0 0-1.4-1H5.8v-3.5H6a1.7 1.7 0 0 0 1.4-1 1.7 1.7 0 0 0-.3-1.9L7 7.5l1.7-2.9.2.1a1.7 1.7 0 0 0 1.8.2 1.7 1.7 0 0 0 1-1.5v-.2h3.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.2l.2-.1 1.7 2.9-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.4 1h.2V14h-.2a1.7 1.7 0 0 0-1.4 1z"}]],"Star":[["polygon",{"points":"12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.7 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"}]],"TrendingUp":[["polyline",{"points":"22 7 13.5 15.5 8.5 10.5 2 17"}],["polyline",{"points":"16 7 22 7 22 13"}]],"Truck":[["path",{"d":"M1 3h14v13H1zM15 8h4l4 4v4h-8z"}],["circle",{"cx":5.5,"cy":18.5,"r":2.5}],["circle",{"cx":18.5,"cy":18.5,"r":2.5}]],"Users":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"}],["circle",{"cx":10,"cy":7,"r":4}],["path",{"d":"M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"}]],"Wrench":[["path",{"d":"M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-3-3z"}]],"X":[["line",{"x1":18,"y1":6,"x2":6,"y2":18}],["line",{"x1":6,"y1":6,"x2":18,"y2":18}]]};
function icon(name){return function Icon(props){const {size=24, color='currentColor', strokeWidth=2, ...rest}=props||{}; const children=(paths[name]||paths.Star||[]).map((it,i)=>React.createElement(it[0],{key:i,...it[1]})); return React.createElement('svg',{xmlns:'http://www.w3.org/2000/svg',width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,strokeWidth,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':rest['aria-label']?undefined:true,...rest},...children);};}
module.exports = { Activity:icon('Activity'), AlertCircle:icon('AlertCircle'), ArrowRight:icon('ArrowRight'), Bell:icon('Bell'), BrainCircuit:icon('BrainCircuit'), Building2:icon('Building2'), CalendarDays:icon('CalendarDays'), ChartColumn:icon('ChartColumn'), Check:icon('Check'), ChevronDown:icon('ChevronDown'), ChevronRight:icon('ChevronRight'), Database:icon('Database'), Factory:icon('Factory'), FileText:icon('FileText'), HeartPulse:icon('HeartPulse'), Info:icon('Info'), Leaf:icon('Leaf'), Lightbulb:icon('Lightbulb'), MapPin:icon('MapPin'), Menu:icon('Menu'), RefreshCw:icon('RefreshCw'), Search:icon('Search'), Settings:icon('Settings'), Star:icon('Star'), TrendingUp:icon('TrendingUp'), Truck:icon('Truck'), Users:icon('Users'), Wrench:icon('Wrench'), X:icon('X') };

}
};
const __cache={};
function __normalize(id, from){ if(!id.startsWith('.')) return id; const base=(from.split('/').slice(0,-1)).concat(id.split('/')); const out=[]; for(const part of base){if(!part||part==='.') continue; if(part==='..') out.pop(); else out.push(part);} let result=out.join('/'); return result.replace(/\.(tsx?|jsx?)$/, ''); }
function __require(id, from){ if(id==='react') return window.React; if(id==='react-dom/client') return {createRoot: window.ReactDOM.createRoot.bind(window.ReactDOM)}; if(id==='lucide-react') return __require('lucide-runtime','main'); const key=from?__normalize(id,from):id; if(__cache[key]) return __cache[key].exports; const factory=__modules[key]; if(!factory) throw new Error('Production bundle module not found: '+key+' (from '+(from||'entry')+')'); const module={exports:{}}; __cache[key]=module; factory(module,module.exports,(dep)=>__require(dep,key)); return module.exports; }
__require('main');
})();
