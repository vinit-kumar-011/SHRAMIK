import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Briefcase, Map as MapIcon, Network, ShieldAlert, TrendingUp, ChevronRight, Info, Activity, Layers, CheckCircle2, AlertCircle, Filter, Globe, Hash, Star } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
const TOKENS = {
    canvas: '#F7F6F0',
    surface: '#FFFEFA',
    surfaceMuted: '#F0EFE8',
    ink: '#171717',
    inkMuted: '#62625C',
    borderMuted: '#D8D6CD',
    border: '#292929',
    yellow: '#F2D34F',
    yellowHover: '#E6C33C',
    navy: '#203A5B',
    orange: '#EB791D',
    teal: '#20A89C',
    success: '#35745D',
    warning: '#B56732',
    danger: '#B42318',
    info: '#315D8A',
};
const DEFAULT_FILTERS = {
    period: 'All Windows', geography: 'All India', sector: 'All Sectors', category: 'ALL',
};
const MOCK_SKILLS = [
    {
        skillId: 'sk-101',
        canonicalName: 'Green Hydrogen Processing',
        category: 'EMERGING',
        momentumScore: 85,
        mentions: 1240,
        growthRate: 145.5,
        ruleVersion: 'v2.1.0-alpha',
        observationWindow: 'Past 90 Days',
        provenanceState: 'SYNTHETIC_DEMO',
        sectors: ['Energy & Environment', 'Manufacturing'],
        regionalSignals: [
            { regionCode: 'OD', regionName: 'Odisha', mentions: 450, growthRate: 210 },
            { regionCode: 'MH', regionName: 'Maharashtra', mentions: 320, growthRate: 120 },
            { regionCode: 'GJ', regionName: 'Gujarat', mentions: 280, growthRate: 95 },
        ],
        occupations: [
            { occupationId: 'occ-401', occupationName: 'Chemical Plant Operator', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 340 },
            { occupationId: 'occ-402', occupationName: 'Energy Engineer', relationBasis: 'APPROVED_MAPPING', evidenceCount: 0 },
        ],
    },
    {
        skillId: 'sk-102',
        canonicalName: 'AI Model Pruning',
        category: 'ACCELERATING',
        momentumScore: 92,
        mentions: 8900,
        growthRate: 88.2,
        ruleVersion: 'v2.0.5',
        observationWindow: 'Past 180 Days',
        provenanceState: 'SYNTHETIC_DEMO',
        sectors: ['Information Technology'],
        regionalSignals: [
            { regionCode: 'KA', regionName: 'Karnataka', mentions: 4100, growthRate: 105 },
            { regionCode: 'MH', regionName: 'Maharashtra', mentions: 2200, growthRate: 75 },
        ],
        occupations: [
            { occupationId: 'occ-501', occupationName: 'Machine Learning Engineer', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 5120 },
            { occupationId: 'occ-502', occupationName: 'Data Scientist', relationBasis: 'DERIVED_ASSOCIATION', evidenceCount: 1200 },
        ],
    },
    {
        skillId: 'sk-103',
        canonicalName: 'Drone Fleet Maintenance',
        category: 'EMERGING',
        momentumScore: 78,
        mentions: 850,
        growthRate: 210.0,
        ruleVersion: 'v2.1.0-alpha',
        observationWindow: 'Past 90 Days',
        provenanceState: 'SYNTHETIC_DEMO',
        sectors: ['Manufacturing', 'Logistics & Transport'],
        regionalSignals: [
            { regionCode: 'TS', regionName: 'Telangana', mentions: 300, growthRate: 250 },
            { regionCode: 'TN', regionName: 'Tamil Nadu', mentions: 250, growthRate: 180 },
        ],
        occupations: [
            { occupationId: 'occ-601', occupationName: 'Aviation Technician', relationBasis: 'APPROVED_MAPPING', evidenceCount: 0 },
            { occupationId: 'occ-602', occupationName: 'Logistics Operations Supervisor', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 150 },
        ],
    },
    {
        skillId: 'sk-104',
        canonicalName: 'React Native Development',
        category: 'ESTABLISHED',
        momentumScore: 45,
        mentions: 45000,
        growthRate: 5.2,
        ruleVersion: 'v1.9.0',
        observationWindow: 'Past 365 Days',
        provenanceState: 'SYNTHETIC_DEMO',
        sectors: ['Information Technology'],
        regionalSignals: [
            { regionCode: 'KA', regionName: 'Karnataka', mentions: 18000, growthRate: 4 },
            { regionCode: 'MH', regionName: 'Maharashtra', mentions: 12000, growthRate: 6 },
        ],
        occupations: [
            { occupationId: 'occ-701', occupationName: 'Mobile App Developer', relationBasis: 'APPROVED_MAPPING', evidenceCount: 0 },
            { occupationId: 'occ-702', occupationName: 'Frontend Engineer', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 18500 },
        ],
    },
    {
        skillId: 'sk-105',
        canonicalName: 'Legacy Mainframe Cobol',
        category: 'DECLINING',
        momentumScore: 12,
        mentions: 3200,
        growthRate: -15.4,
        ruleVersion: 'v1.9.0',
        observationWindow: 'Past 365 Days',
        provenanceState: 'SYNTHETIC_DEMO',
        sectors: ['Information Technology'],
        regionalSignals: [
            { regionCode: 'MH', regionName: 'Maharashtra', mentions: 1500, growthRate: -12 },
        ],
        occupations: [
            { occupationId: 'occ-801', occupationName: 'Systems Programmer', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 2100 },
        ],
    },
];
const abortableDelay = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
    }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', onAbort, { once: true });
});
function filterMockSkills(filters = {}) {
    return MOCK_SKILLS.filter((skill) => {
        if (filters.category && filters.category !== 'ALL' && skill.category !== filters.category)
            return false;
        if (filters.period && filters.period !== 'All Windows' && skill.observationWindow !== filters.period)
            return false;
        if (filters.geography && filters.geography !== 'All India' && !skill.regionalSignals.some(r => r.regionName === filters.geography || r.regionCode === filters.geography))
            return false;
        if (filters.sector && filters.sector !== 'All Sectors' && !(skill.sectors || []).includes(filters.sector))
            return false;
        return true;
    });
}
class MockEmergingSkillsDataAdapter {
    constructor() {
        Object.defineProperty(this, "watchlist", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Set(['sk-102'])
        });
    }
    async getSummary(filters = {}, signal) {
        await abortableDelay(250, signal);
        const matching = filterMockSkills(filters);
        return {
            totalEmerging: matching.filter(s => s.category === 'EMERGING').length,
            totalAccelerating: matching.filter(s => s.category === 'ACCELERATING').length,
            totalEstablished: matching.filter(s => s.category === 'ESTABLISHED').length,
            totalDeclining: matching.filter(s => s.category === 'DECLINING').length,
            topSkills: matching.slice(0, 4),
            meta: {
                provenance: 'SYNTHETIC_DEMO',
                updatedAt: new Date().toISOString(),
                note: 'Illustrative deterministic demo fixtures only. Not source-backed labour-market findings.',
            },
        };
    }
    async getSkills(filters = {}, signal) {
        await abortableDelay(200, signal);
        return filterMockSkills(filters).map(s => ({ ...s, regionalSignals: [...s.regionalSignals], occupations: [...s.occupations] }));
    }
    async getSkillDetail(skillId, filters, signal) {
        await abortableDelay(120, signal);
        return MOCK_SKILLS.find(s => s.skillId === skillId) || null;
    }
    async getRelationships(skillId, filters, signal) {
        await abortableDelay(120, signal);
        const skill = MOCK_SKILLS.find(s => s.skillId === skillId);
        if (!skill)
            return null;
        const nodes = [
            { id: skillId, type: 'SKILL', label: skill.canonicalName, code: skillId, metrics: { momentum: skill.momentumScore } },
            ...skill.occupations.map(o => ({ id: o.occupationId, type: 'OCCUPATION', label: o.occupationName, code: o.occupationId, metrics: { evidence: o.evidenceCount } })),
        ];
        const edges = skill.occupations.map(o => ({
            id: `${skillId}-${o.occupationId}`, source: skillId, target: o.occupationId,
            relationType: 'SKILL_OCCUPATION', relationBasis: o.relationBasis,
            evidenceCount: o.evidenceCount, provenanceState: 'SYNTHETIC_DEMO',
        }));
        return { nodes, edges, meta: { provenanceState: 'SYNTHETIC_DEMO', note: 'Relationships are illustrative demo fixtures.', filters } };
    }
    async getRegionalSignals(skillId, filters, signal) {
        await abortableDelay(120, signal);
        const skill = MOCK_SKILLS.find(s => s.skillId === skillId);
        if (!skill)
            return null;
        const rows = filters?.geography && filters.geography !== 'All India' ? skill.regionalSignals.filter(r => r.regionName === filters.geography || r.regionCode === filters.geography) : skill.regionalSignals;
        return [...rows].sort((a, b) => b.mentions - a.mentions);
    }
    async getEvidence(skillId, filters, signal) {
        await abortableDelay(120, signal);
        const skill = MOCK_SKILLS.find(s => s.skillId === skillId);
        return skill ? {
            ruleVersion: skill.ruleVersion, observationWindow: skill.observationWindow,
            provenanceState: skill.provenanceState,
            sources: ['Synthetic Job Posting Index (demo)', 'Sector Mapping Registry (demo)'],
            evidenceCount: skill.mentions, updatedAt: '2026-10-14T00:00:00.000Z',
            classificationNotes: 'Illustrative classification based on synthetic fixture values; not a statistical finding or forecast.',
        } : null;
    }
    async compareSkills(skillIds, filters, signal) {
        await abortableDelay(120, signal);
        const uniqueIds = [...new Set(skillIds)].slice(0, 4);
        const skills = filterMockSkills(filters).filter(s => uniqueIds.includes(s.skillId));
        return { skills, comparable: skills.length >= 2 && new Set(skills.map(s => s.observationWindow)).size === 1, comparisonNotes: 'Metric comparison is constrained by observation windows; review comparability before drawing conclusions.', provenanceState: 'SYNTHETIC_DEMO' };
    }
    async getWatchlist(signal) {
        await abortableDelay(60, signal);
        return [...this.watchlist];
    }
    async addWatchlistItem(skillId, signal) {
        await abortableDelay(60, signal);
        if (!MOCK_SKILLS.some(s => s.skillId === skillId))
            return false;
        this.watchlist.add(skillId);
        return true;
    }
    async removeWatchlistItem(skillId, signal) {
        await abortableDelay(60, signal);
        this.watchlist.delete(skillId);
        return true;
    }
    async getSkillAlerts(signal) {
        await abortableDelay(60, signal);
        return [{ ruleId: 'demo-alert-01', skillId: 'sk-102', metric: 'growthRate', threshold: 60, status: 'TRIGGERED', createdAt: '2026-10-14T09:30:00Z', provenanceState: 'SYNTHETIC_DEMO' }];
    }
}
export const demoEmergingSkillsDataAdapter = new MockEmergingSkillsDataAdapter();
const Badge = ({ children, variant = 'neutral' }) => {
    const map = {
        neutral: 'bg-[#F0EFE8] text-[#171717] border-[#D8D6CD]',
        emerging: 'bg-[#203A5B]/10 text-[#203A5B] border-[#203A5B]/20',
        accelerating: 'bg-[#20A89C]/10 text-[#20A89C] border-[#20A89C]/20',
        established: 'bg-[#EB791D]/10 text-[#EB791D] border-[#EB791D]/20',
        declining: 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/20',
        demo: 'bg-[#F2D34F]/20 text-[#8A6D1F] border-[#F2D34F]/40 font-medium',
        basis: 'bg-[#F7F6F0] text-[#62625C] border-[#D8D6CD] text-[11px]',
        warning: 'bg-[#B56732]/10 text-[#B56732] border-[#B56732]/20',
    };
    return React.createElement("span", { className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[variant] || map.neutral}` }, children);
};
const CategoryBadge = ({ category }) => {
    const labelMap = {
        EMERGING: 'Emerging', ACCELERATING: 'Accelerating', ESTABLISHED: 'Established', DECLINING: 'Declining', UNCLASSIFIED: 'Unclassified',
    };
    const variantMap = { EMERGING: 'emerging', ACCELERATING: 'accelerating', ESTABLISHED: 'established', DECLINING: 'declining', UNCLASSIFIED: 'neutral' };
    return React.createElement(Badge, { variant: variantMap[category] }, labelMap[category]);
};
const SectionHeader = ({ title, subtitle, icon: Icon }) => (React.createElement("div", { className: "mb-5" },
    React.createElement("div", { className: "flex items-center gap-2.5 mb-1" },
        Icon && React.createElement(Icon, { className: "w-5 h-5 text-[#203A5B]" }),
        React.createElement("h2", { className: "text-xl font-bold tracking-tight text-[#171717] leading-tight" }, title)),
    subtitle && React.createElement("p", { className: "text-sm text-[#62625C]" }, subtitle)));
const ProvenanceStrip = ({ state, note }) => (React.createElement("div", { className: "flex items-center gap-2 text-[11px] font-medium" },
    React.createElement("span", { className: `px-2 py-0.5 rounded-full border ${state === 'SYNTHETIC_DEMO' ? 'bg-[#F2D34F]/20 text-[#8A6D1F] border-[#F2D34F]/40' : 'bg-[#20A89C]/10 text-[#20A89C] border-[#20A89C]/20'}` }, state === 'SYNTHETIC_DEMO' ? 'Illustrative demo data' : state),
    note && React.createElement("span", { className: "text-[#62625C]" }, note)));
const FilterBar = ({ filters, onChange, onApply, onReset, }) => {
    const categories = ['ALL', 'EMERGING', 'ACCELERATING', 'ESTABLISHED', 'DECLINING'];
    return (React.createElement("div", { className: "bg-[#FFFEFA] border border-[#D8D6CD] rounded-xl p-4 shadow-[0_1px_2px_rgba(23,23,23,0.04)] mb-6" },
        React.createElement("div", { className: "flex items-center gap-2 mb-3" },
            React.createElement(Filter, { className: "w-4 h-4 text-[#62625C]" }),
            React.createElement("span", { className: "text-xs font-semibold uppercase tracking-wider text-[#62625C]" }, "Filters")),
        React.createElement("div", { className: "flex flex-wrap items-end gap-3" },
            React.createElement("div", { className: "flex flex-col gap-1" },
                React.createElement("label", { className: "text-[11px] font-medium text-[#62625C]" }, "Observation Window"),
                React.createElement("select", { value: filters.period, onChange: e => onChange('period', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]" },
                    React.createElement("option", null, "All Windows"),
                    React.createElement("option", null, "Past 90 Days"),
                    React.createElement("option", null, "Past 180 Days"),
                    React.createElement("option", null, "Past 365 Days"))),
            React.createElement("div", { className: "flex flex-col gap-1" },
                React.createElement("label", { className: "text-[11px] font-medium text-[#62625C]" }, "Geography"),
                React.createElement("select", { value: filters.geography, onChange: e => onChange('geography', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]" },
                    React.createElement("option", null, "All India"),
                    React.createElement("option", null, "Odisha"),
                    React.createElement("option", null, "Maharashtra"),
                    React.createElement("option", null, "Karnataka"),
                    React.createElement("option", null, "Gujarat"))),
            React.createElement("div", { className: "flex flex-col gap-1" },
                React.createElement("label", { className: "text-[11px] font-medium text-[#62625C]" }, "Sector"),
                React.createElement("select", { value: filters.sector, onChange: e => onChange('sector', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]" },
                    React.createElement("option", null, "All Sectors"),
                    React.createElement("option", null, "Energy & Environment"),
                    React.createElement("option", null, "Information Technology"),
                    React.createElement("option", null, "Manufacturing"),
                    React.createElement("option", null, "Logistics & Transport"))),
            React.createElement("div", { className: "flex flex-col gap-1" },
                React.createElement("label", { className: "text-[11px] font-medium text-[#62625C]" }, "Category"),
                React.createElement("select", { value: filters.category, onChange: e => onChange('category', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]" }, categories.map(c => React.createElement("option", { key: c, value: c }, c === 'ALL' ? 'All Categories' : c.replace(/([A-Z])/g, ' $1').trim())))),
            React.createElement("div", { className: "flex gap-2 mt-auto" },
                React.createElement("button", { onClick: onApply, className: "bg-[#203A5B] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#152D45] transition-colors shadow-[2px_2px_0_#292929]" }, "Apply"),
                React.createElement("button", { onClick: onReset, className: "text-xs font-medium text-[#62625C] px-3 py-2.5 hover:text-[#171717] hover:bg-[#F0EFE8] rounded-lg border border-transparent hover:border-[#D8D6CD] transition-colors" }, "Reset")))));
};
const OverviewView = ({ summary, skills, onSelectSkill, selectedSkillId }) => {
    const categories = [
        { label: 'Emerging', count: summary?.totalEmerging || 0, colorClass: 'bg-[#203A5B]' },
        { label: 'Accelerating', count: summary?.totalAccelerating || 0, colorClass: 'bg-[#20A89C]' },
        { label: 'Established', count: summary?.totalEstablished || 0, colorClass: 'bg-[#EB791D]' },
        { label: 'Declining', count: summary?.totalDeclining || 0, colorClass: 'bg-[#B42318]' },
    ];
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement(SectionHeader, { title: "Skills Overview", subtitle: "Which skills are gaining importance at a glance? Data derived from normalized job-posting observations.", icon: Layers }),
        React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" }, categories.map(c => (React.createElement("div", { key: c.label, className: "bg-white border border-[#D8D6CD] rounded-2xl p-5 shadow-[0_2px_6px_rgba(23,23,23,0.03)] hover:shadow-[0_4px_12px_rgba(23,23,23,0.06)] transition-shadow relative overflow-hidden" },
            React.createElement("div", { className: "absolute top-0 left-0 w-1 h-full bg-[#171717] opacity-10" }),
            React.createElement("div", { className: "text-[11px] font-semibold uppercase tracking-wide text-[#62625C] mb-2" }, c.label),
            React.createElement("div", { className: "text-3xl font-extrabold text-[#171717] tracking-tight" }, c.count),
            React.createElement("div", { className: "text-xs text-[#62625C] mt-2" }, "Signals in current window"),
            React.createElement("div", { className: `absolute bottom-0 left-0 h-1 w-full ${c.colorClass} opacity-60` }))))),
        React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-5" },
            React.createElement("div", { className: "lg:col-span-2 bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden" },
                React.createElement("div", { className: "px-5 py-4 border-b border-[#D8D6CD] bg-[#F0EFE8] flex items-center justify-between" },
                    React.createElement("h3", { className: "font-bold text-[#171717]" }, "Top Skill Signals"),
                    React.createElement("span", { className: "text-[11px] text-[#62625C] bg-white px-2 py-0.5 rounded-full border border-[#D8D6CD]" }, "By momentum score")),
                React.createElement("div", { className: "divide-y divide-[#F0EFE8]" }, skills.map(skill => (React.createElement("button", { key: skill.skillId, onClick: () => onSelectSkill(skill.skillId), className: `w-full text-left px-5 py-4 hover:bg-[#F7F6F0] transition-colors flex items-center justify-between gap-4 ${selectedSkillId === skill.skillId ? 'bg-[#F7F6F0] ring-1 ring-[#F2D34F]/40' : ''}` },
                    React.createElement("div", { className: "min-w-0" },
                        React.createElement("div", { className: "flex items-center gap-2.5 mb-1" },
                            React.createElement("h4", { className: "font-bold text-[#171717] text-sm truncate" }, skill.canonicalName),
                            React.createElement(CategoryBadge, { category: skill.category }),
                            React.createElement(Badge, { variant: "demo" }, skill.provenanceState)),
                        React.createElement("div", { className: "text-xs text-[#62625C] flex gap-4 flex-wrap" },
                            React.createElement("span", null,
                                React.createElement("strong", { className: "text-[#171717]" }, skill.mentions.toLocaleString()),
                                " mentions"),
                            React.createElement("span", null,
                                React.createElement("strong", { className: `${skill.growthRate >= 0 ? 'text-[#35745D]' : 'text-[#B42318]'}` },
                                    skill.growthRate > 0 ? '+' : '',
                                    skill.growthRate,
                                    "%"),
                                " growth"),
                            React.createElement("span", null,
                                React.createElement("strong", { className: "text-[#171717]" }, skill.momentumScore),
                                " momentum"),
                            React.createElement("span", { className: "text-[#62625C]" }, skill.ruleVersion))),
                    React.createElement(ChevronRight, { className: "w-4 h-4 text-[#D8D6CD] shrink-0" })))))),
            React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] p-5" },
                React.createElement("h3", { className: "font-bold text-[#171717] mb-4" }, "Category Distribution"),
                React.createElement("div", { className: "space-y-3" }, categories.map(c => {
                    const pct = summary ? Math.round((c.count / (summary.totalEmerging + summary.totalAccelerating + summary.totalEstablished + summary.totalDeclining || 1)) * 100) : 0;
                    return (React.createElement("div", { key: c.label },
                        React.createElement("div", { className: "flex justify-between text-xs mb-1" },
                            React.createElement("span", { className: "font-medium text-[#171717]" }, c.label),
                            React.createElement("span", { className: "text-[#62625C]" },
                                c.count,
                                " (",
                                pct,
                                "%)")),
                        React.createElement("div", { className: "h-2 bg-[#F0EFE8] rounded-full overflow-hidden" },
                            React.createElement("div", { className: `h-full rounded-full ${c.colorClass}`, style: { width: `${Math.max(pct, 4)}%` } }))));
                })),
                React.createElement("div", { className: "mt-5 pt-4 border-t border-[#D8D6CD] text-xs text-[#62625C] leading-relaxed" },
                    React.createElement("p", null, "Category definitions are returned by the backend rule engine. Do not treat these as statistical forecasts.")))),
        React.createElement("div", { className: "bg-[#203A5B] text-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(32,58,91,0.18)]" },
            React.createElement("div", { className: "flex items-start gap-4" },
                React.createElement("div", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0" },
                    React.createElement(Info, { className: "w-5 h-5 text-[#F2D34F]" })),
                React.createElement("div", null,
                    React.createElement("h3", { className: "font-bold text-lg mb-1" }, "Key Findings"),
                    React.createElement("p", { className: "text-sm text-white/80 leading-relaxed" },
                        "Emerging signals show the highest growth in ",
                        React.createElement("strong", null, "Green Hydrogen Processing"),
                        " and ",
                        React.createElement("strong", null, "Drone Fleet Maintenance"),
                        ", with regional intensity in Odisha, Telangana and Maharashtra. The synthetic demo dataset is marked ",
                        React.createElement(Badge, { variant: "demo" }, "SYNTHETIC_DEMO"),
                        " and is not backed by verified posting sources."))))));
};
const MomentumView = ({ skills, onSelectSkill }) => {
    const chartData = skills.map(s => ({ name: s.canonicalName, id: s.skillId, mentions: s.mentions, growthRate: s.growthRate, score: s.momentumScore, category: s.category }));
    const getCategoryColor = (category) => {
        switch (category) {
            case 'EMERGING': return '#9333ea';
            case 'ACCELERATING': return '#2563eb';
            case 'ESTABLISHED': return '#059669';
            case 'DECLINING': return '#ea580c';
            default: return '#64748b';
        }
    };
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement(SectionHeader, { title: "Skill Momentum", subtitle: "Demand volume versus growth rate. Bubble size reflects momentum score.", icon: TrendingUp }),
        React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] p-6" },
            React.createElement("div", { className: "mb-4 flex items-center justify-between" },
                React.createElement("div", null,
                    React.createElement("h3", { className: "font-bold text-[#171717]" }, "Demand vs Growth Landscape"),
                    React.createElement("p", { className: "text-xs text-[#62625C]" }, "X: Observation volume (mentions) \u00B7 Y: Growth rate (%) \u00B7 Size: Momentum score")),
                React.createElement("div", { className: "flex gap-3 text-xs font-medium text-[#62625C] flex-wrap" },
                    React.createElement("span", { className: "flex items-center gap-1.5" },
                        React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-[#9333ea]" }),
                        " Emerging"),
                    React.createElement("span", { className: "flex items-center gap-1.5" },
                        React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-[#2563eb]" }),
                        " Accelerating"),
                    React.createElement("span", { className: "flex items-center gap-1.5" },
                        React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-[#059669]" }),
                        " Established"),
                    React.createElement("span", { className: "flex items-center gap-1.5" },
                        React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-[#ea580c]" }),
                        " Declining"))),
            React.createElement("div", { className: "h-[420px] w-full" },
                React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                    React.createElement(ScatterChart, { margin: { top: 20, right: 20, bottom: 50, left: 30 } },
                        React.createElement(CartesianGrid, { strokeDasharray: "3 3", stroke: "#F0EFE8" }),
                        React.createElement(XAxis, { type: "number", dataKey: "mentions", name: "Mentions", tick: { fontSize: 12, fill: '#62625C' }, axisLine: { stroke: '#D8D6CD' }, label: { value: 'Observation Volume (Mentions)', position: 'insideBottom', offset: -30, style: { fill: '#62625C', fontSize: 12 } } }),
                        React.createElement(YAxis, { type: "number", dataKey: "growthRate", name: "Growth Rate", tick: { fontSize: 12, fill: '#62625C' }, axisLine: { stroke: '#D8D6CD' }, label: { value: 'Growth Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#62625C', fontSize: 12 } } }),
                        React.createElement(ZAxis, { type: "number", dataKey: "score", range: [80, 1200], name: "Score" }),
                        React.createElement(Tooltip, { cursor: { strokeDasharray: '3 3' }, content: ({ active, payload }) => {
                                if (!active || !payload || !payload.length)
                                    return null;
                                const d = payload[0].payload;
                                return (React.createElement("div", { className: "bg-[#FFFEFA] border border-[#D8D6CD] rounded-xl p-3 shadow-lg text-sm" },
                                    React.createElement("p", { className: "font-bold text-[#171717]" }, d.name),
                                    React.createElement("div", { className: "mt-2 space-y-0.5 text-[#62625C] text-xs" },
                                        React.createElement("p", null,
                                            "Mentions: ",
                                            React.createElement("span", { className: "font-medium text-[#171717]" }, d.mentions.toLocaleString())),
                                        React.createElement("p", null,
                                            "Growth: ",
                                            React.createElement("span", { className: "font-medium text-[#171717]" },
                                                d.growthRate > 0 ? '+' : '',
                                                d.growthRate,
                                                "%")),
                                        React.createElement("p", null,
                                            "Score: ",
                                            React.createElement("span", { className: "font-medium text-[#171717]" }, d.score)),
                                        React.createElement("p", null,
                                            "Category: ",
                                            React.createElement("span", { className: "font-medium text-[#171717]" }, d.category))),
                                    React.createElement(ProvenanceStrip, { state: "SYNTHETIC_DEMO" })));
                            } }),
                        React.createElement(Scatter, { name: "Skills", data: chartData, onClick: (data) => onSelectSkill(data.id), className: "cursor-pointer" }, chartData.map((entry, index) => (React.createElement(Cell, { key: `cell-${index}`, fill: getCategoryColor(entry.category), opacity: 0.8, stroke: "#171717", strokeWidth: 0.5 }))))))),
            React.createElement("p", { className: "text-[11px] text-[#62625C] mt-3" }, "Note: Log scale not applied. Zero/negative growth rates are shown explicitly. Click any bubble to open the profile."))));
};
const ConnectionsView = ({ skill, skills, dataAdapter, onSelectSkill, filters }) => {
    const [graph, setGraph] = useState(null);
    const [graphLoading, setGraphLoading] = useState(false);
    const [graphError, setGraphError] = useState(null);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!skill) {
            setGraph(null);
            setGraphError(null);
            return;
        }
        const controller = new AbortController();
        setGraphLoading(true);
        setGraphError(null);
        setGraph(null);
        setSelectedNodeId(null);
        dataAdapter.getRelationships(skill.skillId, filters, controller.signal)
            .then((result) => { if (!controller.signal.aborted)
            setGraph(result); })
            .catch((error) => { if (!controller.signal.aborted && error?.name !== 'AbortError')
            setGraphError(error?.message || 'Relationship data could not be loaded.'); })
            .finally(() => { if (!controller.signal.aborted)
            setGraphLoading(false); });
        return () => controller.abort();
    }, [dataAdapter, skill?.skillId, filters.period, filters.geography, filters.sector, filters.category, retry]);
    if (!skill)
        return (React.createElement("div", { className: "bg-white border border-dashed border-[#D8D6CD] rounded-2xl p-12 text-center text-[#62625C]" },
            React.createElement(Network, { className: "w-10 h-10 mx-auto mb-3 text-[#D8D6CD]" }),
            React.createElement("p", { className: "font-medium text-[#171717]" }, "Select a skill first"),
            React.createElement("p", { className: "text-sm mt-1" }, "Choose a skill from Overview or Momentum to inspect returned occupation/sector relationships.")));
    const nodes = graph?.nodes || [];
    const edges = graph?.edges || [];
    const center = nodes.find(n => n.id === skill.skillId) || { id: skill.skillId, type: 'SKILL', label: skill.canonicalName };
    const related = nodes.filter(n => n.id !== center.id);
    const position = (node, i) => ({ x: related.length <= 1 ? 320 : 55 + (i * 530 / (related.length - 1)), y: 225 });
    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
    const byId = new Map(nodes.map(n => [n.id, n]));
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement(SectionHeader, { title: "Occupation & Sector Connections", subtitle: `Relationships returned by the data adapter for ${skill.canonicalName}`, icon: Network }),
        React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-5" },
            React.createElement("div", { className: "lg:col-span-2 space-y-4" },
                React.createElement("div", { className: "bg-[#203A5B] rounded-2xl p-6 text-white shadow-[0_4px_16px_rgba(32,58,91,0.2)]" },
                    React.createElement("h3", { className: "font-bold text-lg mb-1" }, skill.canonicalName),
                    React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                        React.createElement(CategoryBadge, { category: skill.category }),
                        React.createElement(Badge, { variant: "demo" }, skill.provenanceState)),
                    React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },
                        React.createElement("div", { className: "bg-white/10 rounded-lg p-3" },
                            React.createElement("div", { className: "text-lg font-extrabold" }, skill.mentions.toLocaleString()),
                            React.createElement("div", { className: "text-[10px] text-white/60" }, "Mentions")),
                        React.createElement("div", { className: "bg-white/10 rounded-lg p-3" },
                            React.createElement("div", { className: "text-lg font-extrabold" },
                                skill.growthRate > 0 ? '+' : '',
                                skill.growthRate,
                                "%"),
                            React.createElement("div", { className: "text-[10px] text-white/60" }, "Growth")),
                        React.createElement("div", { className: "bg-white/10 rounded-lg p-3" },
                            React.createElement("div", { className: "text-lg font-extrabold" }, skill.momentumScore),
                            React.createElement("div", { className: "text-[10px] text-white/60" }, "Momentum")))),
                React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl p-5 shadow-[0_2px_6px_rgba(23,23,23,0.03)]" },
                    React.createElement("h4", { className: "font-bold text-[#171717] mb-3 flex items-center gap-2" },
                        React.createElement(Briefcase, { className: "w-4 h-4 text-[#203A5B]" }),
                        " Returned relationships"),
                    graphLoading ? React.createElement("div", { className: "text-sm text-[#62625C] py-5", role: "status" }, "Loading relationships\u2026")
                        : graphError ? React.createElement("div", { role: "alert", className: "text-sm text-[#B42318]" },
                            graphError,
                            React.createElement("button", { className: "ml-3 underline font-semibold", onClick: () => setRetry(x => x + 1) }, "Retry"))
                            : edges.length === 0 ? React.createElement("div", { className: "text-sm text-[#62625C] py-4" }, "No mapped relationships were returned. No graph edges are invented to fill the canvas.")
                                : React.createElement("div", { className: "overflow-x-auto" },
                                    React.createElement("table", { className: "min-w-full text-sm" },
                                        React.createElement("thead", { className: "text-[11px] font-semibold text-[#62625C] uppercase tracking-wider border-b border-[#D8D6CD]" },
                                            React.createElement("tr", null,
                                                React.createElement("th", { className: "text-left py-2 pr-2" }, "Related entity"),
                                                React.createElement("th", { className: "text-left py-2 pr-2" }, "Basis"),
                                                React.createElement("th", { className: "text-right py-2" }, "Evidence"))),
                                        React.createElement("tbody", { className: "divide-y divide-[#F0EFE8]" }, edges.map((edge) => { const target = byId.get(edge.target) || byId.get(edge.source); const isSkill = target?.type === 'SKILL'; return React.createElement("tr", { key: edge.id },
                                            React.createElement("td", { className: "py-2 pr-2" },
                                                React.createElement("button", { className: "text-left underline font-medium", onClick: () => { setSelectedNodeId(target?.id || null); if (isSkill)
                                                        onSelectSkill(target.id); } }, target?.label || edge.target),
                                                React.createElement("small", { className: "block text-[10px] text-[#62625C]" }, target?.code || target?.id || '')),
                                            React.createElement("td", { className: "py-2 pr-2" },
                                                React.createElement(Badge, { variant: "basis" }, String(edge.relationBasis || edge.relationType || 'Basis unavailable').replace(/_/g, ' '))),
                                            React.createElement("td", { className: "py-2 text-right" }, Number(edge.evidenceCount) > 0 ? Number(edge.evidenceCount).toLocaleString() : '—')); })))))),
            React.createElement("div", { className: "lg:col-span-3 bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden" },
                React.createElement("div", { className: "px-5 py-4 border-b border-[#D8D6CD] bg-[#F0EFE8] flex items-center justify-between gap-2" },
                    React.createElement("div", { className: "flex items-center gap-2" },
                        React.createElement(Network, { className: "w-4 h-4 text-[#203A5B]" }),
                        React.createElement("h3", { className: "font-bold text-[#171717]" }, "Relationship graph")),
                    React.createElement("span", { className: "text-[11px] text-[#62625C]" },
                        nodes.length,
                        " nodes \u00B7 ",
                        edges.length,
                        " edges")),
                React.createElement("div", { className: "p-4 md:p-6 bg-[#F7F6F0] min-h-[360px]" }, graphLoading ? React.createElement("div", { className: "py-24 text-center text-sm text-[#62625C]", role: "status" }, "Loading relationship graph\u2026")
                    : graphError ? React.createElement("div", { className: "py-16 text-center" },
                        React.createElement(AlertCircle, { className: "w-8 h-8 mx-auto text-[#B42318] mb-2" }),
                        React.createElement("p", { className: "text-sm text-[#B42318]" }, graphError),
                        React.createElement("button", { className: "mt-2 underline text-sm", onClick: () => setRetry(x => x + 1) }, "Retry"))
                        : edges.length === 0 ? React.createElement("div", { className: "py-16 text-center" },
                            React.createElement(Network, { className: "w-10 h-10 mx-auto text-[#D8D6CD] mb-3" }),
                            React.createElement("p", { className: "font-semibold text-[#171717]" }, "No relationship graph available"),
                            React.createElement("p", { className: "text-sm text-[#62625C] max-w-sm mx-auto mt-2" }, "The adapter returned no verified edges for this skill and filter set."))
                            : React.createElement(React.Fragment, null,
                                React.createElement("svg", { viewBox: "0 0 640 300", role: "img", "aria-label": `Relationship graph for ${skill.canonicalName}; ${nodes.length} nodes and ${edges.length} edges`, className: "w-full h-auto min-h-[250px]" },
                                    edges.map((edge) => { const a = byId.get(edge.source), b = byId.get(edge.target); if (!a || !b)
                                        return null; const targetIndex = related.findIndex(n => n.id === (a.id === center.id ? b.id : a.id)); const dest = a.id === center.id ? b : a; const pos = position(dest, targetIndex < 0 ? 0 : targetIndex); const y1 = a.id === center.id ? 82 : pos.y - 18; const x1 = a.id === center.id ? 320 : pos.x; const x2 = b.id === center.id ? 320 : pos.x; const y2 = b.id === center.id ? 82 : pos.y - 18; const direct = edge.relationBasis === 'DIRECT_OBSERVATION'; return React.createElement("line", { key: edge.id, x1: x1, y1: y1, x2: x2, y2: y2, stroke: direct ? '#20A89C' : edge.relationBasis === 'APPROVED_MAPPING' ? '#203A5B' : '#EB791D', strokeWidth: Math.max(1.5, Math.min(4, Number(edge.evidenceCount || 1) / 150)), strokeDasharray: direct ? 'none' : '6 4', opacity: ".85" }); }),
                                    React.createElement("g", { role: "button", tabIndex: 0, "aria-label": `Selected skill ${center.label}`, onClick: () => setSelectedNodeId(center.id), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedNodeId(center.id);
                                        } }, style: { cursor: 'pointer' } },
                                        React.createElement("circle", { cx: "320", cy: "64", r: "31", fill: "#203A5B", stroke: selectedNodeId === center.id ? '#F2D34F' : '#171717', strokeWidth: selectedNodeId === center.id ? 4 : 1.5 }),
                                        React.createElement("text", { x: "320", y: "61", textAnchor: "middle", fill: "white", fontSize: "9", fontWeight: "bold" }, "SKILL"),
                                        React.createElement("text", { x: "320", y: "73", textAnchor: "middle", fill: "white", fontSize: "7" }, center.label.slice(0, 22))),
                                    related.map((node, i) => { const pos = position(node, i); const fill = node.type === 'OCCUPATION' ? '#FFFEFA' : node.type === 'SECTOR' ? '#F2D34F' : '#CDEDE5'; return React.createElement("g", { key: node.id, role: "button", tabIndex: 0, "aria-label": `Select ${node.type} ${node.label}`, onClick: () => setSelectedNodeId(node.id), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedNodeId(node.id);
                                        } }, style: { cursor: 'pointer' } },
                                        React.createElement("circle", { cx: pos.x, cy: pos.y, r: "22", fill: fill, stroke: selectedNodeId === node.id ? '#F2D34F' : '#171717', strokeWidth: selectedNodeId === node.id ? 4 : 1.3 }),
                                        React.createElement("text", { x: pos.x, y: pos.y - 2, textAnchor: "middle", fill: "#171717", fontSize: "7.5", fontWeight: "bold" }, node.type === 'OCCUPATION' ? 'OCC' : node.type === 'SECTOR' ? 'SECTOR' : String(node.type || 'NODE').slice(0, 6)),
                                        React.createElement("text", { x: pos.x, y: pos.y + 8, textAnchor: "middle", fill: "#171717", fontSize: "6.5" }, String(node.label || '').slice(0, 18))); })),
                                selectedNode && React.createElement("div", { className: "mt-3 bg-white border border-[#D8D6CD] rounded-lg p-3 text-sm" },
                                    React.createElement("div", { className: "font-bold" }, selectedNode.label),
                                    React.createElement("div", { className: "text-xs text-[#62625C]" },
                                        selectedNode.type,
                                        " \u00B7 ",
                                        selectedNode.code || selectedNode.id),
                                    selectedNode.metrics && React.createElement("pre", { className: "mt-2 whitespace-pre-wrap text-xs text-[#62625C]" }, JSON.stringify(selectedNode.metrics, null, 2))),
                                React.createElement("div", { className: "flex flex-wrap gap-3 mt-4 text-[11px] text-[#62625C]" },
                                    React.createElement("span", null,
                                        React.createElement("i", { className: "inline-block w-5 border-t-2 border-[#20A89C] mr-1 align-middle" }),
                                        "Direct observation"),
                                    React.createElement("span", null,
                                        React.createElement("i", { className: "inline-block w-5 border-t-2 border-[#203A5B] border-dashed mr-1 align-middle" }),
                                        "Approved mapping"),
                                    React.createElement("span", null,
                                        React.createElement("i", { className: "inline-block w-5 border-t-2 border-[#EB791D] border-dashed mr-1 align-middle" }),
                                        "Derived association"))))))));
};
const RegionalSignalsView = ({ skill, dataAdapter, onSelectGeography, filters }) => {
    const [regions, setRegions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [metric, setMetric] = useState('mentions');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!skill) {
            setRegions(null);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError(null);
        setRegions(null);
        dataAdapter.getRegionalSignals(skill.skillId, filters, controller.signal)
            .then((result) => { if (!controller.signal.aborted)
            setRegions(result); })
            .catch((e) => { if (!controller.signal.aborted && e?.name !== 'AbortError')
            setError(e?.message || 'Regional signals could not be loaded.'); })
            .finally(() => { if (!controller.signal.aborted)
            setLoading(false); });
        return () => controller.abort();
    }, [dataAdapter, skill?.skillId, filters.period, filters.geography, filters.sector, filters.category, retry]);
    if (!skill)
        return React.createElement("div", { className: "bg-white border border-dashed border-[#D8D6CD] rounded-2xl p-12 text-center text-[#62625C]" },
            React.createElement(MapIcon, { className: "w-10 h-10 mx-auto mb-3 text-[#D8D6CD]" }),
            React.createElement("p", { className: "font-medium text-[#171717]" }, "Select a skill first"),
            React.createElement("p", { className: "text-sm mt-1" }, "Choose a skill to inspect the regional signals returned by the adapter."));
    const sortedRegions = [...(regions || [])].sort((a, b) => metric === 'mentions' ? b.mentions - a.mentions : b.growthRate - a.growthRate);
    return React.createElement("div", { className: "space-y-6" },
        React.createElement(SectionHeader, { title: "Regional Signals", subtitle: `${skill.canonicalName} — region-level values returned by the adapter`, icon: Globe }),
        React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-5" },
            React.createElement("div", { className: "bg-[#F7F6F0] border border-[#D8D6CD] rounded-2xl p-6 min-h-[420px] flex flex-col" },
                React.createElement("div", { className: "flex items-start justify-between gap-3 mb-5" },
                    React.createElement("div", null,
                        React.createElement("h3", { className: "font-bold text-[#171717]" }, "State / UT map"),
                        React.createElement("p", { className: "text-xs text-[#62625C] mt-1" }, "Geographic rendering status")),
                    React.createElement(Badge, { variant: "warning" }, "Geometry required")),
                React.createElement("div", { className: "flex-1 flex items-center justify-center" },
                    React.createElement("div", { className: "max-w-sm text-center" },
                        React.createElement("div", { className: "w-20 h-20 mx-auto rounded-full border-2 border-dashed border-[#D8D6CD] flex items-center justify-center mb-4" },
                            React.createElement(MapIcon, { className: "w-9 h-9 text-[#D8D6CD]" })),
                        React.createElement("h4", { className: "font-bold text-[#171717]" }, "Map unavailable in this bundle"),
                        React.createElement("p", { className: "text-sm text-[#62625C] mt-2 leading-relaxed" }, "The developer handoff does not include a verified state/UT GeoJSON asset and canonical geography crosswalk. This page will not simulate a choropleth with a decorative image."),
                        React.createElement("p", { className: "text-xs text-[#62625C] mt-3" }, "Regional table values below are adapter data; preview values are explicitly synthetic."))),
                React.createElement("div", { className: "mt-5 pt-4 border-t border-[#D8D6CD]" },
                    React.createElement(ProvenanceStrip, { state: skill.provenanceState, note: "Regional signals returned by the current adapter." }))),
            React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden" },
                React.createElement("div", { className: "px-5 py-4 border-b border-[#D8D6CD] bg-[#F0EFE8] flex flex-wrap items-center justify-between gap-3" },
                    React.createElement("div", null,
                        React.createElement("h3", { className: "font-bold text-[#171717]" }, "Regional rankings"),
                        React.createElement("p", { className: "text-[11px] text-[#62625C]" }, skill.canonicalName)),
                    React.createElement("label", { className: "text-xs text-[#62625C] flex items-center gap-2" },
                        "Rank by",
                        React.createElement("select", { value: metric, onChange: e => setMetric(e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-2 py-1.5 text-xs text-[#171717]" },
                            React.createElement("option", { value: "mentions" }, "Mentions"),
                            React.createElement("option", { value: "growthRate" }, "Growth rate")))),
                loading ? React.createElement("div", { className: "p-12 text-center text-sm text-[#62625C]", role: "status" }, "Loading regional data\u2026") : error ? React.createElement("div", { className: "p-5 text-sm text-[#B42318]", role: "alert" },
                    error,
                    React.createElement("button", { className: "ml-3 underline font-semibold", onClick: () => setRetry(x => x + 1) }, "Retry")) : !sortedRegions.length ? React.createElement("div", { className: "p-12 text-center text-sm text-[#62625C]" }, "No regional signals were returned for the current skill.") : React.createElement("div", { className: "divide-y divide-[#F0EFE8]" }, sortedRegions.map((region, idx) => { const value = metric === 'mentions' ? region.mentions : region.growthRate; const max = Math.max(1, ...sortedRegions.map(r => metric === 'mentions' ? r.mentions : r.growthRate)); return React.createElement("button", { key: region.regionCode, onClick: () => onSelectGeography?.(region.regionCode), className: "w-full text-left p-4 flex items-center gap-3 hover:bg-[#F7F6F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2D34F]", "aria-label": `Select ${region.regionName}, ${metric === 'mentions' ? region.mentions.toLocaleString() + ' mentions' : region.growthRate + ' percent growth'}` },
                    React.createElement("span", { className: "w-8 h-8 shrink-0 rounded-full bg-[#203A5B]/10 text-[#203A5B] flex items-center justify-center text-xs font-extrabold" }, idx + 1),
                    React.createElement("span", { className: "flex-1 min-w-0" },
                        React.createElement("span", { className: "block font-bold text-sm text-[#171717]" }, region.regionName),
                        React.createElement("span", { className: "block text-[11px] text-[#62625C]" },
                            "Code: ",
                            region.regionCode),
                        React.createElement("span", { className: "block mt-2 h-2 rounded bg-[#F0EFE8] overflow-hidden" },
                            React.createElement("i", { className: "block h-full bg-[#203A5B]", style: { width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` } }))),
                    React.createElement("span", { className: "text-right font-bold text-sm text-[#171717]" }, metric === 'mentions' ? region.mentions.toLocaleString() : `${region.growthRate > 0 ? '+' : ''}${region.growthRate}%`)); })))));
};
const ProfileEvidenceView = ({ skill, skills, watchlist, compareIds, onCompareToggle, onWatchlistToggle, dataAdapter, onOpenSource }) => {
    const [profileTab, setProfileTab] = useState('overview');
    const [evidenceData, setEvidenceData] = useState(null);
    const [evidenceError, setEvidenceError] = useState(null);
    const [compareResult, setCompareResult] = useState(null);
    const [compareError, setCompareError] = useState(null);
    useEffect(() => {
        if (compareIds.length < 2) {
            setCompareResult(null);
            setCompareError(null);
            return;
        }
        const controller = new AbortController();
        setCompareResult(null);
        setCompareError(null);
        dataAdapter.compareSkills([...new Set(compareIds)].slice(0, 4), filters, controller.signal)
            .then((result) => { if (!controller.signal.aborted)
            setCompareResult(result); })
            .catch((error) => { if (!controller.signal.aborted && error?.name !== 'AbortError')
            setCompareError(error?.message || 'Skill comparison is unavailable.'); });
        return () => controller.abort();
    }, [dataAdapter, compareIds.join('|'), filters.period, filters.geography, filters.sector, filters.category]);
    useEffect(() => {
        if (!skill) {
            setEvidenceData(null);
            setEvidenceError(null);
            return;
        }
        const controller = new AbortController();
        setEvidenceData(null);
        setEvidenceError(null);
        dataAdapter.getEvidence(skill.skillId, filters, controller.signal)
            .then((result) => { if (!controller.signal.aborted)
            setEvidenceData(result); })
            .catch((error) => { if (!controller.signal.aborted && error?.name !== 'AbortError')
            setEvidenceError(error?.message || 'Evidence could not be loaded.'); });
        return () => controller.abort();
    }, [dataAdapter, skill?.skillId, filters.period, filters.geography, filters.sector, filters.category]);
    if (!skill) {
        return (React.createElement("div", { className: "bg-white border border-dashed border-[#D8D6CD] rounded-2xl p-12 text-center text-[#62625C]" },
            React.createElement(Info, { className: "w-10 h-10 mx-auto mb-3 text-[#D8D6CD]" }),
            React.createElement("p", { className: "font-medium text-[#171717]" }, "Select a skill to view its profile"),
            React.createElement("p", { className: "text-sm mt-1" }, "Profile details, classification rules, evidence sources and comparison controls only appear when a skill is selected.")));
    }
    const isWatching = watchlist.includes(skill.skillId);
    const isComparing = compareIds.includes(skill.skillId);
    const profileEvidence = evidenceData || {
        observationWindow: skill.observationWindow, ruleVersion: skill.ruleVersion,
        provenanceState: skill.provenanceState, sources: [], evidenceCount: skill.mentions,
        updatedAt: null, classificationNotes: 'Evidence details were not supplied by the adapter.',
    };
    return (React.createElement("div", { className: "space-y-6" },
        React.createElement(SectionHeader, { title: "Skill Profiles & Evidence", subtitle: `${skill.canonicalName} — classification explanation, source evidence and actions`, icon: Info }),
        React.createElement("div", { className: "bg-[#203A5B] text-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(32,58,91,0.2)] relative overflow-hidden" },
            React.createElement("div", { className: "absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4" }),
            React.createElement("div", { className: "relative z-10" },
                React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-4" },
                    React.createElement("div", null,
                        React.createElement("h2", { className: "text-2xl font-extrabold tracking-tight" }, skill.canonicalName),
                        React.createElement("div", { className: "text-sm text-white/70 mt-1 flex items-center gap-2" },
                            React.createElement("span", { className: "inline-block w-1.5 h-1.5 rounded-full bg-[#F2D34F]" }),
                            React.createElement("code", { className: "text-xs bg-white/10 px-1.5 py-0.5 rounded" }, skill.skillId),
                            React.createElement("span", null, "\u00B7"),
                            React.createElement("span", null, skill.category),
                            React.createElement("span", null, "\u00B7"),
                            React.createElement("span", null,
                                "Rule ",
                                skill.ruleVersion))),
                    React.createElement("div", { className: "flex gap-2 shrink-0" },
                        React.createElement("button", { onClick: () => onCompareToggle(skill.skillId), className: `text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isComparing ? 'bg-[#F2D34F] text-[#171717] border-[#F2D34F]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}` }, isComparing ? 'Comparing' : 'Compare'),
                        React.createElement("button", { onClick: () => onWatchlistToggle(skill.skillId), className: `text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isWatching ? 'bg-[#20A89C] text-white border-[#20A89C]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}` },
                            React.createElement(Star, { className: `w-3 h-3 inline mr-1 ${isWatching ? 'fill-white' : ''}` }),
                            isWatching ? 'Watching' : 'Watchlist'))))),
        dataAdapter === demoEmergingSkillsDataAdapter && React.createElement("p", { className: "text-xs text-[#62625C]" }, "Preview mode: watchlist changes are in-memory only and are not saved to a user account."),
        evidenceError && React.createElement("div", { role: "alert", className: "bg-[#FFF4F2] border border-[#B42318]/30 rounded-lg p-3 text-sm text-[#B42318]" },
            "Evidence service error: ",
            evidenceError,
            ". Other skill details remain available."),
        !evidenceData && !evidenceError && React.createElement("div", { "aria-live": "polite", className: "text-xs text-[#62625C]" }, "Loading evidence metadata\u2026"),
        React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden" },
            React.createElement("div", { className: "flex border-b border-[#D8D6CD] overflow-x-auto" }, [
                { key: 'overview', label: 'Overview', icon: Activity },
                { key: 'why', label: 'Why this category?', icon: CheckCircle2 },
                { key: 'evidence', label: 'Evidence & Sources', icon: ShieldAlert },
                { key: 'related', label: 'Related', icon: Briefcase },
                { key: 'regional', label: 'Regional', icon: MapIcon },
                { key: 'compare', label: 'Compare', icon: Hash },
            ].map(tab => (React.createElement("button", { key: tab.key, onClick: () => setProfileTab(tab.key), className: `flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${profileTab === tab.key ? 'border-[#203A5B] text-[#203A5B] bg-[#F0EFE8]' : 'border-transparent text-[#62625C] hover:text-[#171717] hover:bg-[#F7F6F0]'}` },
                React.createElement(tab.icon, { className: "w-3.5 h-3.5" }),
                tab.label)))),
            React.createElement("div", { className: "p-6" },
                profileTab === 'overview' && (React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                    React.createElement("div", { className: "md:col-span-2 space-y-4" },
                        React.createElement("div", { className: "bg-[#F7F6F0] rounded-xl p-5 border border-[#D8D6CD]" },
                            React.createElement("h4", { className: "font-bold text-[#171717] mb-3" }, "Key Metrics"),
                            React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },
                                React.createElement(MetricBox, { label: "Mentions", value: skill.mentions.toLocaleString(), sub: "Unique observations" }),
                                React.createElement(MetricBox, { label: "Growth Rate", value: `${skill.growthRate > 0 ? '+' : ''}${skill.growthRate}%`, sub: skill.observationWindow, positive: skill.growthRate >= 0 }),
                                React.createElement(MetricBox, { label: "Momentum", value: `${skill.momentumScore} / 100`, sub: "Composite score" }),
                                React.createElement(MetricBox, { label: "Category", value: skill.category, sub: `Rule ${skill.ruleVersion}` }))),
                        React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-5 shadow-[0_1px_2px_rgba(23,23,23,0.03)]" },
                            React.createElement("h4", { className: "font-bold text-[#171717] mb-3" }, "Evidence Snapshot"),
                            React.createElement("p", { className: "text-sm text-[#62625C] leading-relaxed" }, profileEvidence.classificationNotes),
                            React.createElement("div", { className: "flex gap-3 mt-4" },
                                React.createElement(Badge, { variant: "demo" }, "SYNTHETIC_DEMO"),
                                React.createElement(Badge, { variant: "neutral" },
                                    "Rule ",
                                    profileEvidence.ruleVersion)))),
                    React.createElement("div", { className: "space-y-3" },
                        React.createElement("div", { className: "bg-[#203A5B]/5 rounded-xl p-4 border border-[#203A5B]/10" },
                            React.createElement("h4", { className: "font-bold text-[#203A5B] text-sm mb-1" }, "Data Freshness"),
                            React.createElement("p", { className: "text-xs text-[#62625C]" }, profileEvidence.observationWindow),
                            React.createElement("p", { className: "text-[11px] text-[#62625C] mt-1" },
                                "As of ",
                                profileEvidence.updatedAt ? new Date(profileEvidence.updatedAt).toLocaleString() : 'not supplied')),
                        React.createElement("div", { className: "bg-[#EB791D]/5 rounded-xl p-4 border border-[#EB791D]/10" },
                            React.createElement("h4", { className: "font-bold text-[#EB791D] text-sm mb-1" }, "Source Note"),
                            React.createElement("p", { className: "text-xs text-[#62625C]" }, "Synthetic demonstration dataset. Not backed by verified live posting sources."))))),
                profileTab === 'why' && (React.createElement("div", { className: "space-y-4" },
                    React.createElement("h4", { className: "font-bold text-[#171717]" }, "Classification Rule Inputs"),
                    React.createElement("div", { className: "bg-[#F7F6F0] rounded-xl p-5 border border-[#D8D6CD]" },
                        React.createElement("ul", { className: "space-y-3 text-sm text-[#171717]" },
                            React.createElement("li", { className: "flex items-start gap-3" },
                                React.createElement(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }),
                                " ",
                                React.createElement("span", null,
                                    React.createElement("strong", null, "Rule version:"),
                                    " ",
                                    profileEvidence.ruleVersion)),
                            React.createElement("li", { className: "flex items-start gap-3" },
                                React.createElement(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }),
                                " ",
                                React.createElement("span", null,
                                    React.createElement("strong", null, "Observation window:"),
                                    " ",
                                    profileEvidence.observationWindow)),
                            React.createElement("li", { className: "flex items-start gap-3" },
                                React.createElement(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }),
                                " ",
                                React.createElement("span", null,
                                    React.createElement("strong", null, "Evidence threshold:"),
                                    " ",
                                    profileEvidence.evidenceCount.toLocaleString(),
                                    " normalized mentions")),
                            React.createElement("li", { className: "flex items-start gap-3" },
                                React.createElement(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }),
                                " ",
                                React.createElement("span", null,
                                    React.createElement("strong", null, "Category assigned:"),
                                    " ",
                                    skill.category)),
                            React.createElement("li", { className: "flex items-start gap-3" },
                                React.createElement(AlertCircle, { className: "w-4 h-4 text-[#EB791D] shrink-0 mt-0.5" }),
                                " ",
                                React.createElement("span", null,
                                    React.createElement("strong", null, "Caveat:"),
                                    " Classification uses synthetic demo fixtures; production rules must be validated by the analytics owner.")))))),
                profileTab === 'evidence' && (React.createElement("div", { className: "space-y-4" },
                    React.createElement("h4", { className: "font-bold text-[#171717]" }, "Evidence & Source References"),
                    React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                        React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4 shadow-[0_1px_2px_rgba(23,23,23,0.03)]" },
                            React.createElement("h5", { className: "font-bold text-sm text-[#171717] mb-2" }, "Sources"),
                            React.createElement("ul", { className: "text-xs text-[#62625C] space-y-1" }, profileEvidence.sources.map((s, i) => { const label = typeof s === 'string' ? s : (s.label || s.sourceName || s.datasetName || `Source ${i + 1}`); const ref = typeof s === 'object' ? (s.sourceRef || s.url || s.datasetId) : null; return React.createElement("li", { key: `${label}-${i}`, className: "flex items-center gap-2" },
                                React.createElement("div", { className: "w-1 h-1 rounded-full bg-[#20A89C]" }),
                                ref && onOpenSource ? React.createElement("button", { className: "underline text-left", onClick: () => onOpenSource(ref) }, label) : React.createElement("span", null, label)); }))),
                        React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4 shadow-[0_1px_2px_rgba(23,23,23,0.03)]" },
                            React.createElement("h5", { className: "font-bold text-sm text-[#171717] mb-2" }, "Coverage & Quality"),
                            React.createElement("div", { className: "text-xs text-[#62625C] space-y-1" },
                                React.createElement("p", null,
                                    "Provenance: ",
                                    React.createElement("strong", { className: "text-[#171717]" }, profileEvidence.provenanceState)),
                                React.createElement("p", null,
                                    "Evidence count: ",
                                    React.createElement("strong", { className: "text-[#171717]" }, profileEvidence.evidenceCount.toLocaleString())),
                                React.createElement("p", null,
                                    "Updated: ",
                                    React.createElement("strong", { className: "text-[#171717]" }, profileEvidence.updatedAt ? new Date(profileEvidence.updatedAt).toLocaleString() : 'Not supplied'))))))),
                profileTab === 'related' && (React.createElement("div", { className: "space-y-4" },
                    React.createElement("h4", { className: "font-bold text-[#171717]" }, "Related Occupations & Sectors"),
                    React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(23,23,23,0.03)]" },
                        React.createElement("table", { className: "w-full text-sm" },
                            React.createElement("thead", { className: "bg-[#F0EFE8] text-[11px] font-semibold text-[#62625C] uppercase tracking-wider" },
                                React.createElement("tr", null,
                                    React.createElement("th", { className: "text-left px-4 py-3" }, "Occupation"),
                                    React.createElement("th", { className: "text-left px-4 py-3" }, "Relation Basis"),
                                    React.createElement("th", { className: "text-right px-4 py-3" }, "Evidence"))),
                            React.createElement("tbody", { className: "divide-y divide-[#F0EFE8]" }, skill.occupations.map(occ => (React.createElement("tr", { key: occ.occupationId, className: "hover:bg-[#F7F6F0] transition-colors" },
                                React.createElement("td", { className: "px-4 py-3 font-medium text-[#171717]" }, occ.occupationName),
                                React.createElement("td", { className: "px-4 py-3" },
                                    React.createElement(Badge, { variant: "basis" }, occ.relationBasis.replace(/_/g, ' '))),
                                React.createElement("td", { className: "px-4 py-3 text-right font-medium text-[#171717]" }, occ.evidenceCount > 0 ? occ.evidenceCount.toLocaleString() : '—'))))))))),
                profileTab === 'regional' && (React.createElement("div", { className: "space-y-4" },
                    React.createElement("h4", { className: "font-bold text-[#171717]" }, "Regional Insights"),
                    React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" }, skill.regionalSignals.map(r => (React.createElement("div", { key: r.regionCode, className: "bg-[#F0EFE8] rounded-xl p-4 border border-[#D8D6CD]" },
                        React.createElement("div", { className: "text-xs text-[#62625C] mb-1" }, r.regionName),
                        React.createElement("div", { className: "text-xl font-extrabold text-[#171717]" }, r.mentions.toLocaleString()),
                        React.createElement("div", { className: `text-xs font-semibold mt-1 ${r.growthRate >= 0 ? 'text-[#35745D]' : 'text-[#B42318]'}` },
                            r.growthRate > 0 ? '+' : '',
                            r.growthRate,
                            "%"))))))),
                profileTab === 'compare' && (React.createElement("div", { className: "space-y-4" },
                    React.createElement("h4", { className: "font-bold text-[#171717]" }, "Compare Skills"),
                    React.createElement("p", { className: "text-sm text-[#62625C]" }, "Select 2\u20134 skills to compare side-by-side. Only comparable metrics with matching observation windows and geography are shown numerically."),
                    React.createElement("div", { className: "flex flex-wrap gap-2" }, skills.map(s => (React.createElement("button", { key: s.skillId, onClick: () => onCompareToggle(s.skillId), className: `text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${compareIds.includes(s.skillId) ? 'bg-[#203A5B] text-white border-[#203A5B]' : 'bg-white text-[#171717] border-[#D8D6CD] hover:border-[#203A5B]'}` }, s.canonicalName)))),
                    compareIds.length > 0 && (React.createElement("div", { className: "bg-[#F7F6F0] rounded-xl p-4 border border-[#D8D6CD] space-y-3" },
                        React.createElement("div", { className: "flex items-center justify-between gap-2" },
                            React.createElement("p", { className: "text-sm font-semibold text-[#171717]" },
                                "Selected skills (",
                                compareIds.length,
                                "/4)"),
                            React.createElement("button", { onClick: () => compareIds.forEach(id => onCompareToggle(id)), className: "text-xs underline text-[#62625C]" }, "Clear selection")),
                        compareIds.length < 2 && React.createElement("p", { className: "text-xs text-[#62625C]" }, "Select at least two skills to compare."),
                        compareError && React.createElement("p", { role: "alert", className: "text-xs text-[#B42318]" },
                            "Comparison service error: ",
                            compareError),
                        compareIds.length >= 2 && !compareResult && !compareError && React.createElement("p", { className: "text-xs text-[#62625C]", role: "status" }, "Checking metric comparability\u2026"),
                        compareResult?.comparable === false && React.createElement("p", { className: "text-xs text-[#B56732]", role: "note" }, compareResult.comparisonNotes || 'These signals are not directly comparable under the current filters.'),
                        compareIds.length >= 2 && React.createElement("div", { className: "overflow-x-auto" },
                            React.createElement("table", { className: "min-w-full text-xs border-collapse" },
                                React.createElement("thead", null,
                                    React.createElement("tr", { className: "bg-[#F0EFE8]" }, ['Skill', 'Category', 'Mentions', 'Growth', 'Momentum', 'Window'].map(h => React.createElement("th", { key: h, className: "text-left p-2 border border-[#D8D6CD]" }, h)))),
                                React.createElement("tbody", null, compareIds.map(id => skills.find(s => s.skillId === id)).filter((s) => Boolean(s)).map(s => React.createElement("tr", { key: s.skillId, className: "bg-white" },
                                    React.createElement("td", { className: "p-2 border border-[#D8D6CD] font-semibold" }, s.canonicalName),
                                    React.createElement("td", { className: "p-2 border border-[#D8D6CD]" }, s.category),
                                    React.createElement("td", { className: "p-2 border border-[#D8D6CD]" }, s.mentions.toLocaleString()),
                                    React.createElement("td", { className: "p-2 border border-[#D8D6CD]" },
                                        s.growthRate > 0 ? '+' : '',
                                        s.growthRate,
                                        "%"),
                                    React.createElement("td", { className: "p-2 border border-[#D8D6CD]" },
                                        s.momentumScore,
                                        "/100"),
                                    React.createElement("td", { className: "p-2 border border-[#D8D6CD]" }, s.observationWindow)))))),
                        new Set(compareIds.map(id => skills.find(s => s.skillId === id)?.observationWindow)).size > 1 && React.createElement("p", { className: "text-xs text-[#B56732]", role: "note" }, "These values use different observation windows. Compare side-by-side only; percentage or rank comparisons are not directly comparable."),
                        React.createElement("p", { className: "text-xs text-[#62625C]" }, "Demo adapter comparison is local to this preview. Production comparison must be confirmed by the backend adapter.")))))))));
};
const MetricBox = ({ label, value, sub, positive }) => (React.createElement("div", { className: "bg-[#F0EFE8] rounded-lg p-3 border border-[#D8D6CD]" },
    React.createElement("div", { className: "text-[10px] font-semibold text-[#62625C] uppercase tracking-wide" }, label),
    React.createElement("div", { className: `text-lg font-extrabold tracking-tight ${positive === false ? 'text-[#B42318]' : positive === true ? 'text-[#35745D]' : 'text-[#171717]'}` }, value),
    React.createElement("div", { className: "text-[10px] text-[#62625C]" }, sub)));
export const EmergingSkillsPage = ({ dataAdapter: suppliedAdapter, initialFilters, initialView = 'overview', onNavigate, onOpenSource } = {}) => {
    const adapter = useMemo(() => suppliedAdapter || demoEmergingSkillsDataAdapter, [suppliedAdapter]);
    const [activeTab, setActiveTab] = useState(initialView);
    const [summary, setSummary] = useState(null);
    const [skills, setSkills] = useState([]);
    const [selectedSkillId, setSelectedSkillId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [retryKey, setRetryKey] = useState(0);
    const [watchlist, setWatchlist] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [compareIds, setCompareIds] = useState([]);
    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...(initialFilters || {}) });
    const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS, ...(initialFilters || {}) });
    const [filterApplied, setFilterApplied] = useState(true);
    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const [sum, sk, saved, recentAlerts] = await Promise.all([
                    adapter.getSummary(appliedFilters, controller.signal),
                    adapter.getSkills(appliedFilters, controller.signal),
                    adapter.getWatchlist(controller.signal),
                    adapter.getSkillAlerts(controller.signal),
                ]);
                if (controller.signal.aborted)
                    return;
                setSummary(sum);
                setSkills(sk);
                setWatchlist(saved);
                setAlerts(recentAlerts);
            }
            catch (e) {
                if (!controller.signal.aborted && e?.name !== 'AbortError') {
                    setLoadError(e?.message || 'Emerging Skills data could not be loaded.');
                }
            }
            finally {
                if (!controller.signal.aborted)
                    setLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [adapter, appliedFilters, retryKey]);
    useEffect(() => {
        if (skills.length && !skills.some(s => s.skillId === selectedSkillId))
            setSelectedSkillId(skills[0].skillId);
        if (!skills.length && selectedSkillId !== null)
            setSelectedSkillId(null);
    }, [skills, selectedSkillId]);
    const selectedSkill = skills.find(s => s.skillId === selectedSkillId) || null;
    const handleApplyFilters = useCallback(() => {
        setFilterApplied(true);
        setAppliedFilters({ ...filters });
    }, [filters]);
    const handleResetFilters = useCallback(() => {
        setFilters({ ...DEFAULT_FILTERS });
        setAppliedFilters({ ...DEFAULT_FILTERS });
        setCompareIds([]);
        setFilterApplied(true);
    }, []);
    const handleSelectSkill = useCallback((id) => {
        setSelectedSkillId(id);
        if (['overview', 'momentum'].includes(activeTab)) {
            setActiveTab('profile');
        }
        else if (['regional', 'connections'].includes(activeTab)) {
        }
    }, [activeTab]);
    const handleWatchlistToggle = useCallback(async (id) => {
        try {
            if (watchlist.includes(id)) {
                const success = await adapter.removeWatchlistItem(id);
                if (!success)
                    throw new Error('The watchlist service did not confirm removal.');
                setWatchlist(w => w.filter(x => x !== id));
            }
            else {
                const success = await adapter.addWatchlistItem(id);
                if (!success)
                    throw new Error('The watchlist service did not confirm saving this skill.');
                setWatchlist(w => w.includes(id) ? w : [...w, id]);
            }
        }
        catch (e) {
            setLoadError(e?.message || 'Watchlist update failed.');
        }
    }, [adapter, watchlist]);
    const handleCompareToggle = useCallback((id) => {
        setCompareIds(curr => {
            if (curr.includes(id))
                return curr.filter(x => x !== id);
            if (curr.length >= 4)
                return curr;
            return [...curr, id];
        });
    }, []);
    const tabs = useMemo(() => [
        { id: 'overview', label: 'Overview', icon: Layers },
        { id: 'momentum', label: 'Momentum', icon: TrendingUp },
        { id: 'connections', label: 'Connections', icon: Network },
        { id: 'regional', label: 'Regional Signals', icon: MapIcon },
        { id: 'profile', label: 'Profiles & Evidence', icon: Info },
    ], []);
    return (React.createElement("div", { className: "min-h-screen bg-[#F7F6F0] text-[#171717] font-sans" },
        React.createElement("div", { className: "bg-[#F2D34F]/20 border-b border-[#F2D34F]/30 px-6 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-[#8A6D1F]" },
            React.createElement(ShieldAlert, { className: "w-3.5 h-3.5" }),
            "Illustrative demo data (Provenance: SYNTHETIC_DEMO). Not for production analytics."),
        React.createElement("div", { className: "bg-white border-b border-[#D8D6CD] px-8 py-6 shadow-[0_1px_2px_rgba(23,23,23,0.03)]" },
            React.createElement("div", { className: "max-w-6xl mx-auto" },
                React.createElement("div", { className: "flex items-center gap-2 mb-1" },
                    React.createElement("span", { className: "text-[11px] font-bold uppercase tracking-widest text-[#62625C]" }, "Emerging Skills Intelligence")),
                React.createElement("h1", { className: "text-3xl md:text-4xl font-extrabold tracking-tight text-[#171717] leading-tight" }, "Discover skills whose demand signals are newly appearing, accelerating, or declining."),
                React.createElement("p", { className: "text-[#62625C] mt-2 max-w-2xl text-sm leading-relaxed" }, "Evidence-backed classification, occupation mappings, regional intensity and source transparency \u2014 not static infographics."))),
        React.createElement("div", { className: "bg-white border-b border-[#D8D6CD] px-8 shadow-[0_1px_2px_rgba(23,23,23,0.03)] sticky top-0 z-20" },
            React.createElement("div", { className: "max-w-6xl mx-auto" },
                React.createElement("nav", { className: "flex overflow-x-auto no-scrollbar", role: "tablist", "aria-label": "Emerging Skills views" }, tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (React.createElement("button", { key: tab.id, onClick: () => setActiveTab(tab.id), role: "tab", "aria-selected": isActive, tabIndex: isActive ? 0 : -1, className: `flex items-center gap-2 px-4 py-3.5 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${isActive ? 'border-[#203A5B] text-[#203A5B]' : 'border-transparent text-[#62625C] hover:text-[#171717] hover:border-[#D8D6CD]'}` },
                        React.createElement(Icon, { className: "w-4 h-4" }),
                        tab.label));
                })))),
        React.createElement("main", { className: "max-w-6xl mx-auto px-8 py-8" },
            React.createElement(FilterBar, { filters: filters, onChange: (k, v) => { setFilters(f => ({ ...f, [k]: v })); setFilterApplied(false); }, onApply: handleApplyFilters, onReset: handleResetFilters }),
            !filterApplied && React.createElement("div", { className: "mb-3 rounded-lg border border-[#D8D6CD] bg-white px-3 py-2 text-xs text-[#62625C]" }, "Draft filters changed. Select Apply to refresh the page."),
            loadError && React.createElement("div", { role: "alert", className: "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B42318]/30 bg-[#FFF4F2] px-4 py-3 text-sm text-[#B42318]" },
                React.createElement("span", null, loadError),
                React.createElement("button", { onClick: () => setRetryKey(k => k + 1), className: "rounded-lg border border-[#B42318]/30 bg-white px-3 py-1.5 font-semibold" }, "Retry")),
            loading ? (React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl p-16 text-center shadow-[0_2px_6px_rgba(23,23,23,0.03)]" },
                React.createElement("div", { className: "w-10 h-10 border-4 border-[#F2D34F]/30 border-t-[#203A5B] rounded-full animate-spin mx-auto mb-4" }),
                React.createElement("p", { className: "text-[#62625C] font-medium" }, "Loading intelligence data..."),
                React.createElement("p", { className: "text-xs text-[#62625C] mt-1" }, adapter === demoEmergingSkillsDataAdapter ? 'Illustrative demo adapter' : 'Connected data adapter'))) : (React.createElement(React.Fragment, null,
                activeTab === 'overview' && (React.createElement(OverviewView, { summary: summary, skills: skills, onSelectSkill: handleSelectSkill, selectedSkillId: selectedSkillId })),
                activeTab === 'momentum' && (React.createElement(MomentumView, { skills: skills, onSelectSkill: handleSelectSkill })),
                activeTab === 'connections' && (React.createElement(ConnectionsView, { skill: selectedSkill, skills: skills, dataAdapter: adapter, onSelectSkill: handleSelectSkill, filters: appliedFilters })),
                activeTab === 'regional' && (React.createElement(RegionalSignalsView, { skill: selectedSkill, dataAdapter: adapter, filters: appliedFilters, onSelectGeography: (code) => { const geography = selectedSkill?.regionalSignals.find(r => r.regionCode === code)?.regionName || code; setFilters(f => ({ ...f, geography })); setAppliedFilters(f => ({ ...f, geography })); setFilterApplied(true); } })),
                activeTab === 'profile' && (React.createElement(ProfileEvidenceView, { skill: selectedSkill, skills: skills, watchlist: watchlist, compareIds: compareIds, onCompareToggle: handleCompareToggle, onWatchlistToggle: handleWatchlistToggle, dataAdapter: adapter, filters: appliedFilters, onOpenSource: onOpenSource })))),
            activeTab === 'overview' && !loading && React.createElement("section", { className: "mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4", "aria-label": "Watchlist and recent alerts" },
                React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4" },
                    React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3" },
                        React.createElement("h2", { className: "text-base font-bold text-[#171717]" }, "Your skill watchlist"),
                        React.createElement("span", { className: "text-[10px] text-[#62625C]" }, adapter === demoEmergingSkillsDataAdapter ? 'PREVIEW ONLY' : 'ACCOUNT WATCHLIST')),
                    watchlist.length === 0 ? React.createElement("p", { className: "text-sm text-[#62625C]" }, "No skills saved yet. Open a skill profile to add one.") : React.createElement("ul", { className: "space-y-2" }, watchlist.map(id => skills.find(s => s.skillId === id)).filter((x) => Boolean(x)).map(item => React.createElement("li", { key: item.skillId, className: "flex justify-between items-center gap-3" },
                        React.createElement("button", { onClick: () => handleSelectSkill(item.skillId), className: "text-sm font-semibold underline text-left" }, item.canonicalName),
                        React.createElement(CategoryBadge, { category: item.category })))),
                    adapter === demoEmergingSkillsDataAdapter && React.createElement("p", { className: "mt-3 text-[11px] text-[#62625C]" }, "Demo changes are held in memory only; persistence requires an authenticated backend.")),
                React.createElement("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4" },
                    React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3" },
                        React.createElement("h2", { className: "text-base font-bold text-[#171717]" }, "Recent skill alerts"),
                        React.createElement("span", { className: "text-[10px] text-[#62625C]" }, adapter === demoEmergingSkillsDataAdapter ? 'SYNTHETIC_DEMO' : 'ADAPTER DATA')),
                    alerts.length === 0 ? React.createElement("p", { className: "text-sm text-[#62625C]" }, "No alerts were returned by the data adapter.") : React.createElement("ul", { className: "space-y-2" }, alerts.slice(0, 4).map(a => { const item = skills.find(s => s.skillId === a.skillId); return React.createElement("li", { key: a.ruleId || `${a.skillId}-${a.metric}`, className: "flex items-start gap-2 text-sm" },
                        React.createElement(AlertCircle, { className: "w-4 h-4 text-[#B56732] mt-0.5 shrink-0" }),
                        React.createElement("div", null,
                            React.createElement("p", { className: "font-semibold text-[#171717]" },
                                item?.canonicalName || a.skillId,
                                " \u00B7 ",
                                a.status || 'Alert'),
                            React.createElement("p", { className: "text-xs text-[#62625C]" },
                                a.metric || 'Metric',
                                " threshold ",
                                a.threshold ?? '—',
                                " \u00B7 ",
                                a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Date not supplied'))); })))),
            React.createElement("div", { className: "mt-10 pt-6 border-t border-[#D8D6CD] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] text-[#62625C]" },
                React.createElement("div", null,
                    React.createElement("span", { className: "font-semibold text-[#171717]" }, "Data source:"),
                    " ",
                    adapter === demoEmergingSkillsDataAdapter ? 'Mock adapter (SYNTHETIC_DEMO); not official labour-market findings.' : 'Host-provided data adapter. Check each result’s provenance metadata.'),
                adapter === demoEmergingSkillsDataAdapter ? React.createElement(ProvenanceStrip, { state: "SYNTHETIC_DEMO", note: "Demo values are illustrative only." }) : React.createElement("div", { className: "text-[11px] text-[#62625C]" }, "Provenance is supplied by the host adapter.")))));
};
export default EmergingSkillsPage;
