import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UnavailableEmergingSkillsDataAdapter } from './unavailableAdapter';
import { Briefcase, Map as MapIcon, Network, ShieldAlert, TrendingUp, ChevronRight, Info, Activity, Layers, CheckCircle2, AlertCircle, Filter, Globe, Hash, Star } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
const DEFAULT_FILTERS = {
    period: 'All Windows', geography: 'All India', sector: 'All Sectors', category: 'ALL',
};
// ------------------------------------------------------------------
// Mock Fixtures
// ------------------------------------------------------------------
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
    watchlist = new Set(['sk-102']);
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
        return filterMockSkills(filters ?? {}).find(s => s.skillId === skillId) || null;
    }
    async getRelationships(skillId, filters, signal) {
        await abortableDelay(120, signal);
        const skill = filterMockSkills(filters ?? {}).find(s => s.skillId === skillId);
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
        const skill = filterMockSkills(filters ?? {}).find(s => s.skillId === skillId);
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
// ------------------------------------------------------------------
// Presentation helpers
// ------------------------------------------------------------------
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
    return _jsx("span", { className: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[variant] || map.neutral}`, children: children });
};
const CategoryBadge = ({ category }) => {
    const labelMap = {
        EMERGING: 'Emerging', ACCELERATING: 'Accelerating', ESTABLISHED: 'Established', DECLINING: 'Declining', UNCLASSIFIED: 'Unclassified',
    };
    const variantMap = { EMERGING: 'emerging', ACCELERATING: 'accelerating', ESTABLISHED: 'established', DECLINING: 'declining', UNCLASSIFIED: 'neutral' };
    return _jsx(Badge, { variant: variantMap[category], children: labelMap[category] });
};
const SectionHeader = ({ title, subtitle, icon: Icon }) => (_jsxs("div", { className: "mb-5", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-1", children: [Icon && _jsx(Icon, { className: "w-5 h-5 text-[#203A5B]" }), _jsx("h2", { className: "text-xl font-bold tracking-tight text-[#171717] leading-tight", children: title })] }), subtitle && _jsx("p", { className: "text-sm text-[#62625C]", children: subtitle })] }));
const ProvenanceStrip = ({ state, note }) => (_jsxs("div", { className: "flex items-center gap-2 text-[11px] font-medium", children: [_jsx("span", { className: `px-2 py-0.5 rounded-full border ${state === 'SYNTHETIC_DEMO' ? 'bg-[#F2D34F]/20 text-[#8A6D1F] border-[#F2D34F]/40' : 'bg-[#20A89C]/10 text-[#20A89C] border-[#20A89C]/20'}`, children: state === 'SYNTHETIC_DEMO' ? 'Illustrative demo data' : state }), note && _jsx("span", { className: "text-[#62625C]", children: note })] }));
// ------------------------------------------------------------------
// Sub-components for Views
// ------------------------------------------------------------------
const FilterBar = ({ filters, onChange, onApply, onReset, }) => {
    const categories = ['ALL', 'EMERGING', 'ACCELERATING', 'ESTABLISHED', 'DECLINING'];
    return (_jsxs("div", { className: "bg-[#FFFEFA] border border-[#D8D6CD] rounded-xl p-4 shadow-[0_1px_2px_rgba(23,23,23,0.04)] mb-6", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Filter, { className: "w-4 h-4 text-[#62625C]" }), _jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-[#62625C]", children: "Filters" })] }), _jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[11px] font-medium text-[#62625C]", children: "Observation Window" }), _jsxs("select", { value: filters.period, onChange: e => onChange('period', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]", children: [_jsx("option", { children: "All Windows" }), _jsx("option", { children: "Past 90 Days" }), _jsx("option", { children: "Past 180 Days" }), _jsx("option", { children: "Past 365 Days" })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[11px] font-medium text-[#62625C]", children: "Geography" }), _jsxs("select", { value: filters.geography, onChange: e => onChange('geography', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]", children: [_jsx("option", { children: "All India" }), _jsx("option", { children: "Odisha" }), _jsx("option", { children: "Maharashtra" }), _jsx("option", { children: "Karnataka" }), _jsx("option", { children: "Gujarat" })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[11px] font-medium text-[#62625C]", children: "Sector" }), _jsxs("select", { value: filters.sector, onChange: e => onChange('sector', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]", children: [_jsx("option", { children: "All Sectors" }), _jsx("option", { children: "Energy & Environment" }), _jsx("option", { children: "Information Technology" }), _jsx("option", { children: "Manufacturing" }), _jsx("option", { children: "Logistics & Transport" })] })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("label", { className: "text-[11px] font-medium text-[#62625C]", children: "Category" }), _jsx("select", { value: filters.category, onChange: e => onChange('category', e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-3 py-2 text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#F2D34F]/40 focus:border-[#F2D34F]", children: categories.map(c => _jsx("option", { value: c, children: c === 'ALL' ? 'All Categories' : c.replace(/([A-Z])/g, ' $1').trim() }, c)) })] }), _jsxs("div", { className: "flex gap-2 mt-auto", children: [_jsx("button", { onClick: onApply, className: "bg-[#203A5B] text-white text-xs font-semibold px-4 py-2.5 rounded-lg hover:bg-[#152D45] transition-colors shadow-[2px_2px_0_#292929]", children: "Apply" }), _jsx("button", { onClick: onReset, className: "text-xs font-medium text-[#62625C] px-3 py-2.5 hover:text-[#171717] hover:bg-[#F0EFE8] rounded-lg border border-transparent hover:border-[#D8D6CD] transition-colors", children: "Reset" })] })] })] }));
};
// ------------------------------------------------------------------
// View 1 — Skills Overview
// ------------------------------------------------------------------
const OverviewView = ({ summary, skills, onSelectSkill, selectedSkillId }) => {
    const categories = [
        { label: 'Emerging', count: summary?.totalEmerging || 0, colorClass: 'bg-[#203A5B]' },
        { label: 'Accelerating', count: summary?.totalAccelerating || 0, colorClass: 'bg-[#20A89C]' },
        { label: 'Established', count: summary?.totalEstablished || 0, colorClass: 'bg-[#EB791D]' },
        { label: 'Declining', count: summary?.totalDeclining || 0, colorClass: 'bg-[#B42318]' },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(SectionHeader, { title: "Skills Overview", subtitle: "Which skills are gaining importance at a glance? Data derived from normalized job-posting observations.", icon: Layers }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: categories.map(c => (_jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl p-5 shadow-[0_2px_6px_rgba(23,23,23,0.03)] hover:shadow-[0_4px_12px_rgba(23,23,23,0.06)] transition-shadow relative overflow-hidden", children: [_jsx("div", { className: "absolute top-0 left-0 w-1 h-full bg-[#171717] opacity-10" }), _jsx("div", { className: "text-[11px] font-semibold uppercase tracking-wide text-[#62625C] mb-2", children: c.label }), _jsx("div", { className: "text-3xl font-extrabold text-[#171717] tracking-tight", children: c.count }), _jsx("div", { className: "text-xs text-[#62625C] mt-2", children: "Signals in current window" }), _jsx("div", { className: `absolute bottom-0 left-0 h-1 w-full ${c.colorClass} opacity-60` })] }, c.label))) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-5", children: [_jsxs("div", { className: "lg:col-span-2 bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden", children: [_jsxs("div", { className: "px-5 py-4 border-b border-[#D8D6CD] bg-[#F0EFE8] flex items-center justify-between", children: [_jsx("h3", { className: "font-bold text-[#171717]", children: "Top Skill Signals" }), _jsx("span", { className: "text-[11px] text-[#62625C] bg-white px-2 py-0.5 rounded-full border border-[#D8D6CD]", children: "By momentum score" })] }), _jsx("div", { className: "divide-y divide-[#F0EFE8]", children: skills.map(skill => (_jsxs("button", { onClick: () => onSelectSkill(skill.skillId), className: `w-full text-left px-5 py-4 hover:bg-[#F7F6F0] transition-colors flex items-center justify-between gap-4 ${selectedSkillId === skill.skillId ? 'bg-[#F7F6F0] ring-1 ring-[#F2D34F]/40' : ''}`, children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-1", children: [_jsx("h4", { className: "font-bold text-[#171717] text-sm truncate", children: skill.canonicalName }), _jsx(CategoryBadge, { category: skill.category }), _jsx(Badge, { variant: "demo", children: skill.provenanceState })] }), _jsxs("div", { className: "text-xs text-[#62625C] flex gap-4 flex-wrap", children: [_jsxs("span", { children: [_jsx("strong", { className: "text-[#171717]", children: skill.mentions.toLocaleString() }), " mentions"] }), _jsxs("span", { children: [_jsxs("strong", { className: `${skill.growthRate >= 0 ? 'text-[#35745D]' : 'text-[#B42318]'}`, children: [skill.growthRate > 0 ? '+' : '', skill.growthRate, "%"] }), " growth"] }), _jsxs("span", { children: [_jsx("strong", { className: "text-[#171717]", children: skill.momentumScore }), " momentum"] }), _jsx("span", { className: "text-[#62625C]", children: skill.ruleVersion })] })] }), _jsx(ChevronRight, { className: "w-4 h-4 text-[#D8D6CD] shrink-0" })] }, skill.skillId))) })] }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] p-5", children: [_jsx("h3", { className: "font-bold text-[#171717] mb-4", children: "Category Distribution" }), _jsx("div", { className: "space-y-3", children: categories.map(c => {
                                    const pct = summary ? Math.round((c.count / (summary.totalEmerging + summary.totalAccelerating + summary.totalEstablished + summary.totalDeclining || 1)) * 100) : 0;
                                    return (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between text-xs mb-1", children: [_jsx("span", { className: "font-medium text-[#171717]", children: c.label }), _jsxs("span", { className: "text-[#62625C]", children: [c.count, " (", pct, "%)"] })] }), _jsx("div", { className: "h-2 bg-[#F0EFE8] rounded-full overflow-hidden", children: _jsx("div", { className: `h-full rounded-full ${c.colorClass}`, style: { width: `${Math.max(pct, 4)}%` } }) })] }, c.label));
                                }) }), _jsx("div", { className: "mt-5 pt-4 border-t border-[#D8D6CD] text-xs text-[#62625C] leading-relaxed", children: _jsx("p", { children: "Category definitions are returned by the backend rule engine. Do not treat these as statistical forecasts." }) })] })] }), _jsx("div", { className: "bg-[#203A5B] text-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(32,58,91,0.18)]", children: summary?.meta.provenance === 'SYNTHETIC_DEMO' && _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0", children: _jsx(Info, { className: "w-5 h-5 text-[#F2D34F]" }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-bold text-lg mb-1", children: "Key Findings \u00B7 Demo only" }), _jsxs("p", { className: "text-sm text-white/80 leading-relaxed", children: ["Emerging signals show the highest growth in ", _jsx("strong", { children: "Green Hydrogen Processing" }), " and ", _jsx("strong", { children: "Drone Fleet Maintenance" }), ", with regional intensity in Odisha, Telangana and Maharashtra. These synthetic examples are not backed by verified posting sources."] })] })] }) })] }));
};
// ------------------------------------------------------------------
// View 2 — Skill Momentum
// ------------------------------------------------------------------
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
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(SectionHeader, { title: "Skill Momentum", subtitle: "Demand volume versus growth rate. Bubble size reflects momentum score.", icon: TrendingUp }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] p-6", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-[#171717]", children: "Demand vs Growth Landscape" }), _jsx("p", { className: "text-xs text-[#62625C]", children: "X: Observation volume (mentions) \u00B7 Y: Growth rate (%) \u00B7 Size: Momentum score" })] }), _jsxs("div", { className: "flex gap-3 text-xs font-medium text-[#62625C] flex-wrap", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-[#9333ea]" }), " Emerging"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-[#2563eb]" }), " Accelerating"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-[#059669]" }), " Established"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-[#ea580c]" }), " Declining"] })] })] }), _jsx("div", { className: "h-[420px] w-full", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(ScatterChart, { margin: { top: 20, right: 20, bottom: 50, left: 30 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#F0EFE8" }), _jsx(XAxis, { type: "number", dataKey: "mentions", name: "Mentions", tick: { fontSize: 12, fill: '#62625C' }, axisLine: { stroke: '#D8D6CD' }, label: { value: 'Observation Volume (Mentions)', position: 'insideBottom', offset: -30, style: { fill: '#62625C', fontSize: 12 } } }), _jsx(YAxis, { type: "number", dataKey: "growthRate", name: "Growth Rate", tick: { fontSize: 12, fill: '#62625C' }, axisLine: { stroke: '#D8D6CD' }, label: { value: 'Growth Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#62625C', fontSize: 12 } } }), _jsx(ZAxis, { type: "number", dataKey: "score", range: [80, 1200], name: "Score" }), _jsx(Tooltip, { cursor: { strokeDasharray: '3 3' }, content: ({ active, payload }) => {
                                            if (!active || !payload || !payload.length)
                                                return null;
                                            const d = payload[0].payload;
                                            return (_jsxs("div", { className: "bg-[#FFFEFA] border border-[#D8D6CD] rounded-xl p-3 shadow-lg text-sm", children: [_jsx("p", { className: "font-bold text-[#171717]", children: d.name }), _jsxs("div", { className: "mt-2 space-y-0.5 text-[#62625C] text-xs", children: [_jsxs("p", { children: ["Mentions: ", _jsx("span", { className: "font-medium text-[#171717]", children: d.mentions.toLocaleString() })] }), _jsxs("p", { children: ["Growth: ", _jsxs("span", { className: "font-medium text-[#171717]", children: [d.growthRate > 0 ? '+' : '', d.growthRate, "%"] })] }), _jsxs("p", { children: ["Score: ", _jsx("span", { className: "font-medium text-[#171717]", children: d.score })] }), _jsxs("p", { children: ["Category: ", _jsx("span", { className: "font-medium text-[#171717]", children: d.category })] })] }), _jsx(ProvenanceStrip, { state: "SYNTHETIC_DEMO" })] }));
                                        } }), _jsx(Scatter, { name: "Skills", data: chartData, onClick: (data) => onSelectSkill(data.id), className: "cursor-pointer", children: chartData.map((entry, index) => (_jsx(Cell, { fill: getCategoryColor(entry.category), opacity: 0.8, stroke: "#171717", strokeWidth: 0.5 }, `cell-${index}`))) })] }) }) }), _jsx("p", { className: "text-[11px] text-[#62625C] mt-3", children: "Note: Log scale not applied. Zero/negative growth rates are shown explicitly. Click any bubble to open the profile." })] })] }));
};
// ------------------------------------------------------------------
// View 3 — Occupation & Sector Connections
// ------------------------------------------------------------------
const ConnectionsView = ({ skill, dataAdapter, onSelectSkill, filters }) => {
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
        return (_jsxs("div", { className: "bg-white border border-dashed border-[#D8D6CD] rounded-2xl p-12 text-center text-[#62625C]", children: [_jsx(Network, { className: "w-10 h-10 mx-auto mb-3 text-[#D8D6CD]" }), _jsx("p", { className: "font-medium text-[#171717]", children: "Select a skill first" }), _jsx("p", { className: "text-sm mt-1", children: "Choose a skill from Overview or Momentum to inspect returned occupation/sector relationships." })] }));
    const nodes = graph?.nodes || [];
    const edges = graph?.edges || [];
    const center = nodes.find(n => n.id === skill.skillId) || { id: skill.skillId, type: 'SKILL', label: skill.canonicalName };
    const related = nodes.filter(n => n.id !== center.id);
    const position = (_node, i) => ({ x: related.length <= 1 ? 320 : 55 + (i * 530 / (related.length - 1)), y: 225 });
    const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
    const byId = new Map(nodes.map(n => [n.id, n]));
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(SectionHeader, { title: "Occupation & Sector Connections", subtitle: `Relationships returned by the data adapter for ${skill.canonicalName}`, icon: Network }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-5 gap-5", children: [_jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsxs("div", { className: "bg-[#203A5B] rounded-2xl p-6 text-white shadow-[0_4px_16px_rgba(32,58,91,0.2)]", children: [_jsx("h3", { className: "font-bold text-lg mb-1", children: skill.canonicalName }), _jsxs("div", { className: "flex flex-wrap gap-2 mb-4", children: [_jsx(CategoryBadge, { category: skill.category }), _jsx(Badge, { variant: "demo", children: skill.provenanceState })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 text-center", children: [_jsxs("div", { className: "bg-white/10 rounded-lg p-3", children: [_jsx("div", { className: "text-lg font-extrabold", children: skill.mentions.toLocaleString() }), _jsx("div", { className: "text-[10px] text-white/60", children: "Mentions" })] }), _jsxs("div", { className: "bg-white/10 rounded-lg p-3", children: [_jsxs("div", { className: "text-lg font-extrabold", children: [skill.growthRate > 0 ? '+' : '', skill.growthRate, "%"] }), _jsx("div", { className: "text-[10px] text-white/60", children: "Growth" })] }), _jsxs("div", { className: "bg-white/10 rounded-lg p-3", children: [_jsx("div", { className: "text-lg font-extrabold", children: skill.momentumScore }), _jsx("div", { className: "text-[10px] text-white/60", children: "Momentum" })] })] })] }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl p-5 shadow-[0_2px_6px_rgba(23,23,23,0.03)]", children: [_jsxs("h4", { className: "font-bold text-[#171717] mb-3 flex items-center gap-2", children: [_jsx(Briefcase, { className: "w-4 h-4 text-[#203A5B]" }), " Returned relationships"] }), graphLoading ? _jsx("div", { className: "text-sm text-[#62625C] py-5", role: "status", children: "Loading relationships\u2026" })
                                        : graphError ? _jsxs("div", { role: "alert", className: "text-sm text-[#B42318]", children: [graphError, _jsx("button", { className: "ml-3 underline font-semibold", onClick: () => setRetry(x => x + 1), children: "Retry" })] })
                                            : edges.length === 0 ? _jsx("div", { className: "text-sm text-[#62625C] py-4", children: "No mapped relationships were returned. No graph edges are invented to fill the canvas." })
                                                : _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-sm", children: [_jsx("thead", { className: "text-[11px] font-semibold text-[#62625C] uppercase tracking-wider border-b border-[#D8D6CD]", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left py-2 pr-2", children: "Related entity" }), _jsx("th", { className: "text-left py-2 pr-2", children: "Basis" }), _jsx("th", { className: "text-right py-2", children: "Evidence" })] }) }), _jsx("tbody", { className: "divide-y divide-[#F0EFE8]", children: edges.map((edge) => { const target = byId.get(edge.target) || byId.get(edge.source); const isSkill = target?.type === 'SKILL'; return _jsxs("tr", { children: [_jsxs("td", { className: "py-2 pr-2", children: [_jsx("button", { className: "text-left underline font-medium", onClick: () => { setSelectedNodeId(target?.id || null); if (isSkill)
                                                                                        onSelectSkill(target.id); }, children: target?.label || edge.target }), _jsx("small", { className: "block text-[10px] text-[#62625C]", children: target?.code || target?.id || '' })] }), _jsx("td", { className: "py-2 pr-2", children: _jsx(Badge, { variant: "basis", children: String(edge.relationBasis || edge.relationType || 'Basis unavailable').replace(/_/g, ' ') }) }), _jsx("td", { className: "py-2 text-right", children: Number(edge.evidenceCount) > 0 ? Number(edge.evidenceCount).toLocaleString() : '—' })] }, edge.id); }) })] }) })] })] }), _jsxs("div", { className: "lg:col-span-3 bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden", children: [_jsxs("div", { className: "px-5 py-4 border-b border-[#D8D6CD] bg-[#F0EFE8] flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Network, { className: "w-4 h-4 text-[#203A5B]" }), _jsx("h3", { className: "font-bold text-[#171717]", children: "Relationship graph" })] }), _jsxs("span", { className: "text-[11px] text-[#62625C]", children: [nodes.length, " nodes \u00B7 ", edges.length, " edges"] })] }), _jsx("div", { className: "p-4 md:p-6 bg-[#F7F6F0] min-h-[360px]", children: graphLoading ? _jsx("div", { className: "py-24 text-center text-sm text-[#62625C]", role: "status", children: "Loading relationship graph\u2026" })
                                    : graphError ? _jsxs("div", { className: "py-16 text-center", children: [_jsx(AlertCircle, { className: "w-8 h-8 mx-auto text-[#B42318] mb-2" }), _jsx("p", { className: "text-sm text-[#B42318]", children: graphError }), _jsx("button", { className: "mt-2 underline text-sm", onClick: () => setRetry(x => x + 1), children: "Retry" })] })
                                        : edges.length === 0 ? _jsxs("div", { className: "py-16 text-center", children: [_jsx(Network, { className: "w-10 h-10 mx-auto text-[#D8D6CD] mb-3" }), _jsx("p", { className: "font-semibold text-[#171717]", children: "No relationship graph available" }), _jsx("p", { className: "text-sm text-[#62625C] max-w-sm mx-auto mt-2", children: "The adapter returned no verified edges for this skill and filter set." })] })
                                            : _jsxs(_Fragment, { children: [_jsxs("svg", { viewBox: "0 0 640 300", role: "img", "aria-label": `Relationship graph for ${skill.canonicalName}; ${nodes.length} nodes and ${edges.length} edges`, className: "w-full h-auto min-h-[250px]", children: [edges.map((edge) => { const a = byId.get(edge.source), b = byId.get(edge.target); if (!a || !b)
                                                                return null; const targetIndex = related.findIndex(n => n.id === (a.id === center.id ? b.id : a.id)); const dest = a.id === center.id ? b : a; const pos = position(dest, targetIndex < 0 ? 0 : targetIndex); const y1 = a.id === center.id ? 82 : pos.y - 18; const x1 = a.id === center.id ? 320 : pos.x; const x2 = b.id === center.id ? 320 : pos.x; const y2 = b.id === center.id ? 82 : pos.y - 18; const direct = edge.relationBasis === 'DIRECT_OBSERVATION'; return _jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: direct ? '#20A89C' : edge.relationBasis === 'APPROVED_MAPPING' ? '#203A5B' : '#EB791D', strokeWidth: Math.max(1.5, Math.min(4, Number(edge.evidenceCount || 1) / 150)), strokeDasharray: direct ? 'none' : '6 4', opacity: ".85" }, edge.id); }), _jsxs("g", { role: "button", tabIndex: 0, "aria-label": `Selected skill ${center.label}`, onClick: () => setSelectedNodeId(center.id), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setSelectedNodeId(center.id);
                                                                } }, style: { cursor: 'pointer' }, children: [_jsx("circle", { cx: "320", cy: "64", r: "31", fill: "#203A5B", stroke: selectedNodeId === center.id ? '#F2D34F' : '#171717', strokeWidth: selectedNodeId === center.id ? 4 : 1.5 }), _jsx("text", { x: "320", y: "61", textAnchor: "middle", fill: "white", fontSize: "9", fontWeight: "bold", children: "SKILL" }), _jsx("text", { x: "320", y: "73", textAnchor: "middle", fill: "white", fontSize: "7", children: center.label.slice(0, 22) })] }), related.map((node, i) => { const pos = position(node, i); const fill = node.type === 'OCCUPATION' ? '#FFFEFA' : node.type === 'SECTOR' ? '#F2D34F' : '#CDEDE5'; return _jsxs("g", { role: "button", tabIndex: 0, "aria-label": `Select ${node.type} ${node.label}`, onClick: () => setSelectedNodeId(node.id), onKeyDown: e => { if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setSelectedNodeId(node.id);
                                                                } }, style: { cursor: 'pointer' }, children: [_jsx("circle", { cx: pos.x, cy: pos.y, r: "22", fill: fill, stroke: selectedNodeId === node.id ? '#F2D34F' : '#171717', strokeWidth: selectedNodeId === node.id ? 4 : 1.3 }), _jsx("text", { x: pos.x, y: pos.y - 2, textAnchor: "middle", fill: "#171717", fontSize: "7.5", fontWeight: "bold", children: node.type === 'OCCUPATION' ? 'OCC' : node.type === 'SECTOR' ? 'SECTOR' : String(node.type || 'NODE').slice(0, 6) }), _jsx("text", { x: pos.x, y: pos.y + 8, textAnchor: "middle", fill: "#171717", fontSize: "6.5", children: String(node.label || '').slice(0, 18) })] }, node.id); })] }), selectedNode && _jsxs("div", { className: "mt-3 bg-white border border-[#D8D6CD] rounded-lg p-3 text-sm", children: [_jsx("div", { className: "font-bold", children: selectedNode.label }), _jsxs("div", { className: "text-xs text-[#62625C]", children: [selectedNode.type, " \u00B7 ", selectedNode.code || selectedNode.id] }), selectedNode.metrics && _jsx("pre", { className: "mt-2 whitespace-pre-wrap text-xs text-[#62625C]", children: JSON.stringify(selectedNode.metrics, null, 2) })] }), _jsxs("div", { className: "flex flex-wrap gap-3 mt-4 text-[11px] text-[#62625C]", children: [_jsxs("span", { children: [_jsx("i", { className: "inline-block w-5 border-t-2 border-[#20A89C] mr-1 align-middle" }), "Direct observation"] }), _jsxs("span", { children: [_jsx("i", { className: "inline-block w-5 border-t-2 border-[#203A5B] border-dashed mr-1 align-middle" }), "Approved mapping"] }), _jsxs("span", { children: [_jsx("i", { className: "inline-block w-5 border-t-2 border-[#EB791D] border-dashed mr-1 align-middle" }), "Derived association"] })] })] }) })] })] })] }));
};
// ------------------------------------------------------------------
// View 4 — Regional Signals
// ------------------------------------------------------------------
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
        return _jsxs("div", { className: "bg-white border border-dashed border-[#D8D6CD] rounded-2xl p-12 text-center text-[#62625C]", children: [_jsx(MapIcon, { className: "w-10 h-10 mx-auto mb-3 text-[#D8D6CD]" }), _jsx("p", { className: "font-medium text-[#171717]", children: "Select a skill first" }), _jsx("p", { className: "text-sm mt-1", children: "Choose a skill to inspect the regional signals returned by the adapter." })] });
    const sortedRegions = [...(regions || [])].sort((a, b) => metric === 'mentions' ? b.mentions - a.mentions : b.growthRate - a.growthRate);
    return _jsxs("div", { className: "space-y-6", children: [_jsx(SectionHeader, { title: "Regional Signals", subtitle: `${skill.canonicalName} — region-level values returned by the adapter`, icon: Globe }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-5", children: [_jsxs("div", { className: "bg-[#F7F6F0] border border-[#D8D6CD] rounded-2xl p-6 min-h-[420px] flex flex-col", children: [_jsxs("div", { className: "flex items-start justify-between gap-3 mb-5", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-[#171717]", children: "State / UT map" }), _jsx("p", { className: "text-xs text-[#62625C] mt-1", children: "Geographic rendering status" })] }), _jsx(Badge, { variant: "warning", children: "Geometry required" })] }), _jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsxs("div", { className: "max-w-sm text-center", children: [_jsx("div", { className: "w-20 h-20 mx-auto rounded-full border-2 border-dashed border-[#D8D6CD] flex items-center justify-center mb-4", children: _jsx(MapIcon, { className: "w-9 h-9 text-[#D8D6CD]" }) }), _jsx("h4", { className: "font-bold text-[#171717]", children: "Map unavailable in this bundle" }), _jsx("p", { className: "text-sm text-[#62625C] mt-2 leading-relaxed", children: "The developer handoff does not include a verified state/UT GeoJSON asset and canonical geography crosswalk. This page will not simulate a choropleth with a decorative image." }), _jsx("p", { className: "text-xs text-[#62625C] mt-3", children: "Regional table values below are adapter data; preview values are explicitly synthetic." })] }) }), _jsx("div", { className: "mt-5 pt-4 border-t border-[#D8D6CD]", children: _jsx(ProvenanceStrip, { state: skill.provenanceState, note: "Regional signals returned by the current adapter." }) })] }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden", children: [_jsxs("div", { className: "px-5 py-4 border-b border-[#D8D6CD] bg-[#F0EFE8] flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-[#171717]", children: "Regional rankings" }), _jsx("p", { className: "text-[11px] text-[#62625C]", children: skill.canonicalName })] }), _jsxs("label", { className: "text-xs text-[#62625C] flex items-center gap-2", children: ["Rank by", _jsxs("select", { value: metric, onChange: e => setMetric(e.target.value), className: "bg-white border border-[#D8D6CD] rounded-lg px-2 py-1.5 text-xs text-[#171717]", children: [_jsx("option", { value: "mentions", children: "Mentions" }), _jsx("option", { value: "growthRate", children: "Growth rate" })] })] })] }), loading ? _jsx("div", { className: "p-12 text-center text-sm text-[#62625C]", role: "status", children: "Loading regional data\u2026" }) : error ? _jsxs("div", { className: "p-5 text-sm text-[#B42318]", role: "alert", children: [error, _jsx("button", { className: "ml-3 underline font-semibold", onClick: () => setRetry(x => x + 1), children: "Retry" })] }) : !sortedRegions.length ? _jsx("div", { className: "p-12 text-center text-sm text-[#62625C]", children: "No regional signals were returned for the current skill." }) : _jsx("div", { className: "divide-y divide-[#F0EFE8]", children: sortedRegions.map((region, idx) => { const value = metric === 'mentions' ? region.mentions : region.growthRate; const max = Math.max(1, ...sortedRegions.map(r => metric === 'mentions' ? r.mentions : r.growthRate)); return _jsxs("button", { onClick: () => onSelectGeography?.(region.regionCode), className: "w-full text-left p-4 flex items-center gap-3 hover:bg-[#F7F6F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2D34F]", "aria-label": `Select ${region.regionName}, ${metric === 'mentions' ? region.mentions.toLocaleString() + ' mentions' : region.growthRate + ' percent growth'}`, children: [_jsx("span", { className: "w-8 h-8 shrink-0 rounded-full bg-[#203A5B]/10 text-[#203A5B] flex items-center justify-center text-xs font-extrabold", children: idx + 1 }), _jsxs("span", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "block font-bold text-sm text-[#171717]", children: region.regionName }), _jsxs("span", { className: "block text-[11px] text-[#62625C]", children: ["Code: ", region.regionCode] }), _jsx("span", { className: "block mt-2 h-2 rounded bg-[#F0EFE8] overflow-hidden", children: _jsx("i", { className: "block h-full bg-[#203A5B]", style: { width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` } }) })] }), _jsx("span", { className: "text-right font-bold text-sm text-[#171717]", children: metric === 'mentions' ? region.mentions.toLocaleString() : `${region.growthRate > 0 ? '+' : ''}${region.growthRate}%` })] }, region.regionCode); }) })] })] })] });
};
// ------------------------------------------------------------------
// View 5 — Skill Profiles & Evidence
// ------------------------------------------------------------------
const ProfileEvidenceView = ({ skill, skills, watchlist, compareIds, onCompareToggle, onWatchlistToggle, dataAdapter, filters, onOpenSource }) => {
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
        return (_jsxs("div", { className: "bg-white border border-dashed border-[#D8D6CD] rounded-2xl p-12 text-center text-[#62625C]", children: [_jsx(Info, { className: "w-10 h-10 mx-auto mb-3 text-[#D8D6CD]" }), _jsx("p", { className: "font-medium text-[#171717]", children: "Select a skill to view its profile" }), _jsx("p", { className: "text-sm mt-1", children: "Profile details, classification rules, evidence sources and comparison controls only appear when a skill is selected." })] }));
    }
    const isWatching = watchlist.includes(skill.skillId);
    const isComparing = compareIds.includes(skill.skillId);
    const profileEvidence = evidenceData || {
        observationWindow: skill.observationWindow, ruleVersion: skill.ruleVersion,
        provenanceState: skill.provenanceState, sources: [], evidenceCount: skill.mentions,
        updatedAt: null, classificationNotes: 'Evidence details were not supplied by the adapter.',
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(SectionHeader, { title: "Skill Profiles & Evidence", subtitle: `${skill.canonicalName} — classification explanation, source evidence and actions`, icon: Info }), _jsxs("div", { className: "bg-[#203A5B] text-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(32,58,91,0.2)] relative overflow-hidden", children: [_jsx("div", { className: "absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4" }), _jsx("div", { className: "relative z-10", children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-2xl font-extrabold tracking-tight", children: skill.canonicalName }), _jsxs("div", { className: "text-sm text-white/70 mt-1 flex items-center gap-2", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rounded-full bg-[#F2D34F]" }), _jsx("code", { className: "text-xs bg-white/10 px-1.5 py-0.5 rounded", children: skill.skillId }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: skill.category }), _jsx("span", { children: "\u00B7" }), _jsxs("span", { children: ["Rule ", skill.ruleVersion] })] })] }), _jsxs("div", { className: "flex gap-2 shrink-0", children: [_jsx("button", { onClick: () => onCompareToggle(skill.skillId), className: `text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isComparing ? 'bg-[#F2D34F] text-[#171717] border-[#F2D34F]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`, children: isComparing ? 'Comparing' : 'Compare' }), _jsxs("button", { onClick: () => onWatchlistToggle(skill.skillId), className: `text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${isWatching ? 'bg-[#20A89C] text-white border-[#20A89C]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`, children: [_jsx(Star, { className: `w-3 h-3 inline mr-1 ${isWatching ? 'fill-white' : ''}` }), isWatching ? 'Watching' : 'Watchlist'] })] })] }) })] }), dataAdapter === demoEmergingSkillsDataAdapter && _jsx("p", { className: "text-xs text-[#62625C]", children: "Preview mode: watchlist changes are in-memory only and are not saved to a user account." }), evidenceError && _jsxs("div", { role: "alert", className: "bg-[#FFF4F2] border border-[#B42318]/30 rounded-lg p-3 text-sm text-[#B42318]", children: ["Evidence service error: ", evidenceError, ". Other skill details remain available."] }), !evidenceData && !evidenceError && _jsx("div", { "aria-live": "polite", className: "text-xs text-[#62625C]", children: "Loading evidence metadata\u2026" }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl shadow-[0_2px_6px_rgba(23,23,23,0.03)] overflow-hidden", children: [_jsx("div", { className: "flex border-b border-[#D8D6CD] overflow-x-auto", children: [
                            { key: 'overview', label: 'Overview', icon: Activity },
                            { key: 'why', label: 'Why this category?', icon: CheckCircle2 },
                            { key: 'evidence', label: 'Evidence & Sources', icon: ShieldAlert },
                            { key: 'related', label: 'Related', icon: Briefcase },
                            { key: 'regional', label: 'Regional', icon: MapIcon },
                            { key: 'compare', label: 'Compare', icon: Hash },
                        ].map(tab => (_jsxs("button", { onClick: () => setProfileTab(tab.key), className: `flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${profileTab === tab.key ? 'border-[#203A5B] text-[#203A5B] bg-[#F0EFE8]' : 'border-transparent text-[#62625C] hover:text-[#171717] hover:bg-[#F7F6F0]'}`, children: [_jsx(tab.icon, { className: "w-3.5 h-3.5" }), tab.label] }, tab.key))) }), _jsxs("div", { className: "p-6", children: [profileTab === 'overview' && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "md:col-span-2 space-y-4", children: [_jsxs("div", { className: "bg-[#F7F6F0] rounded-xl p-5 border border-[#D8D6CD]", children: [_jsx("h4", { className: "font-bold text-[#171717] mb-3", children: "Key Metrics" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: [_jsx(MetricBox, { label: "Mentions", value: skill.mentions.toLocaleString(), sub: "Unique observations" }), _jsx(MetricBox, { label: "Growth Rate", value: `${skill.growthRate > 0 ? '+' : ''}${skill.growthRate}%`, sub: skill.observationWindow, positive: skill.growthRate >= 0 }), _jsx(MetricBox, { label: "Momentum", value: `${skill.momentumScore} / 100`, sub: "Composite score" }), _jsx(MetricBox, { label: "Category", value: skill.category, sub: `Rule ${skill.ruleVersion}` })] })] }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-5 shadow-[0_1px_2px_rgba(23,23,23,0.03)]", children: [_jsx("h4", { className: "font-bold text-[#171717] mb-3", children: "Evidence Snapshot" }), _jsx("p", { className: "text-sm text-[#62625C] leading-relaxed", children: profileEvidence.classificationNotes }), _jsxs("div", { className: "flex gap-3 mt-4", children: [_jsx(ProvenanceStrip, { state: profileEvidence.provenanceState }), _jsxs(Badge, { variant: "neutral", children: ["Rule ", profileEvidence.ruleVersion] })] })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "bg-[#203A5B]/5 rounded-xl p-4 border border-[#203A5B]/10", children: [_jsx("h4", { className: "font-bold text-[#203A5B] text-sm mb-1", children: "Data Freshness" }), _jsx("p", { className: "text-xs text-[#62625C]", children: profileEvidence.observationWindow }), _jsxs("p", { className: "text-[11px] text-[#62625C] mt-1", children: ["As of ", profileEvidence.updatedAt ? new Date(profileEvidence.updatedAt).toLocaleString() : 'not supplied'] })] }), _jsxs("div", { className: "bg-[#EB791D]/5 rounded-xl p-4 border border-[#EB791D]/10", children: [_jsx("h4", { className: "font-bold text-[#EB791D] text-sm mb-1", children: "Source Note" }), _jsx("p", { className: "text-xs text-[#62625C]", children: "Synthetic demonstration dataset. Not backed by verified live posting sources." })] })] })] })), profileTab === 'why' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-bold text-[#171717]", children: "Classification Rule Inputs" }), _jsx("div", { className: "bg-[#F7F6F0] rounded-xl p-5 border border-[#D8D6CD]", children: _jsxs("ul", { className: "space-y-3 text-sm text-[#171717]", children: [_jsxs("li", { className: "flex items-start gap-3", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }), " ", _jsxs("span", { children: [_jsx("strong", { children: "Rule version:" }), " ", profileEvidence.ruleVersion] })] }), _jsxs("li", { className: "flex items-start gap-3", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }), " ", _jsxs("span", { children: [_jsx("strong", { children: "Observation window:" }), " ", profileEvidence.observationWindow] })] }), _jsxs("li", { className: "flex items-start gap-3", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }), " ", _jsxs("span", { children: [_jsx("strong", { children: "Evidence threshold:" }), " ", profileEvidence.evidenceCount.toLocaleString(), " normalized mentions"] })] }), _jsxs("li", { className: "flex items-start gap-3", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-[#203A5B] shrink-0 mt-0.5" }), " ", _jsxs("span", { children: [_jsx("strong", { children: "Category assigned:" }), " ", skill.category] })] }), _jsxs("li", { className: "flex items-start gap-3", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-[#EB791D] shrink-0 mt-0.5" }), " ", _jsxs("span", { children: [_jsx("strong", { children: "Caveat:" }), " Classification uses synthetic demo fixtures; production rules must be validated by the analytics owner."] })] })] }) })] })), profileTab === 'evidence' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-bold text-[#171717]", children: "Evidence & Source References" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4 shadow-[0_1px_2px_rgba(23,23,23,0.03)]", children: [_jsx("h5", { className: "font-bold text-sm text-[#171717] mb-2", children: "Sources" }), _jsx("ul", { className: "text-xs text-[#62625C] space-y-1", children: profileEvidence.sources.map((s, i) => { const label = typeof s === 'string' ? s : (s.label || s.sourceName || s.datasetName || `Source ${i + 1}`); const ref = typeof s === 'object' ? (s.sourceRef || s.url || s.datasetId) : null; return _jsxs("li", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-1 rounded-full bg-[#20A89C]" }), ref && onOpenSource ? _jsx("button", { className: "underline text-left", onClick: () => onOpenSource(ref), children: label }) : _jsx("span", { children: label })] }, `${label}-${i}`); }) })] }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4 shadow-[0_1px_2px_rgba(23,23,23,0.03)]", children: [_jsx("h5", { className: "font-bold text-sm text-[#171717] mb-2", children: "Coverage & Quality" }), _jsxs("div", { className: "text-xs text-[#62625C] space-y-1", children: [_jsxs("p", { children: ["Provenance: ", _jsx("strong", { className: "text-[#171717]", children: profileEvidence.provenanceState })] }), _jsxs("p", { children: ["Evidence count: ", _jsx("strong", { className: "text-[#171717]", children: evidenceData ? profileEvidence.evidenceCount.toLocaleString() : 'Not supplied' })] }), _jsxs("p", { children: ["Updated: ", _jsx("strong", { className: "text-[#171717]", children: profileEvidence.updatedAt ? new Date(profileEvidence.updatedAt).toLocaleString() : 'Not supplied' })] })] })] })] })] })), profileTab === 'related' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-bold text-[#171717]", children: "Related Occupations & Sectors" }), _jsx("div", { className: "bg-white border border-[#D8D6CD] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(23,23,23,0.03)]", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-[#F0EFE8] text-[11px] font-semibold text-[#62625C] uppercase tracking-wider", children: _jsxs("tr", { children: [_jsx("th", { className: "text-left px-4 py-3", children: "Occupation" }), _jsx("th", { className: "text-left px-4 py-3", children: "Relation Basis" }), _jsx("th", { className: "text-right px-4 py-3", children: "Evidence" })] }) }), _jsx("tbody", { className: "divide-y divide-[#F0EFE8]", children: skill.occupations.map(occ => (_jsxs("tr", { className: "hover:bg-[#F7F6F0] transition-colors", children: [_jsx("td", { className: "px-4 py-3 font-medium text-[#171717]", children: occ.occupationName }), _jsx("td", { className: "px-4 py-3", children: _jsx(Badge, { variant: "basis", children: occ.relationBasis.replace(/_/g, ' ') }) }), _jsx("td", { className: "px-4 py-3 text-right font-medium text-[#171717]", children: occ.evidenceCount > 0 ? occ.evidenceCount.toLocaleString() : '—' })] }, occ.occupationId))) })] }) })] })), profileTab === 'regional' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-bold text-[#171717]", children: "Regional Insights" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3", children: skill.regionalSignals.map(r => (_jsxs("div", { className: "bg-[#F0EFE8] rounded-xl p-4 border border-[#D8D6CD]", children: [_jsx("div", { className: "text-xs text-[#62625C] mb-1", children: r.regionName }), _jsx("div", { className: "text-xl font-extrabold text-[#171717]", children: r.mentions.toLocaleString() }), _jsxs("div", { className: `text-xs font-semibold mt-1 ${r.growthRate >= 0 ? 'text-[#35745D]' : 'text-[#B42318]'}`, children: [r.growthRate > 0 ? '+' : '', r.growthRate, "%"] })] }, r.regionCode))) })] })), profileTab === 'compare' && (_jsxs("div", { className: "space-y-4", children: [_jsx("h4", { className: "font-bold text-[#171717]", children: "Compare Skills" }), _jsx("p", { className: "text-sm text-[#62625C]", children: "Select 2\u20134 skills to compare side-by-side. Only comparable metrics with matching observation windows and geography are shown numerically." }), _jsx("div", { className: "flex flex-wrap gap-2", children: skills.map(s => (_jsx("button", { onClick: () => onCompareToggle(s.skillId), className: `text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${compareIds.includes(s.skillId) ? 'bg-[#203A5B] text-white border-[#203A5B]' : 'bg-white text-[#171717] border-[#D8D6CD] hover:border-[#203A5B]'}`, children: s.canonicalName }, s.skillId))) }), compareIds.length > 0 && (_jsxs("div", { className: "bg-[#F7F6F0] rounded-xl p-4 border border-[#D8D6CD] space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("p", { className: "text-sm font-semibold text-[#171717]", children: ["Selected skills (", compareIds.length, "/4)"] }), _jsx("button", { onClick: () => compareIds.forEach(id => onCompareToggle(id)), className: "text-xs underline text-[#62625C]", children: "Clear selection" })] }), compareIds.length < 2 && _jsx("p", { className: "text-xs text-[#62625C]", children: "Select at least two skills to compare." }), compareError && _jsxs("p", { role: "alert", className: "text-xs text-[#B42318]", children: ["Comparison service error: ", compareError] }), compareIds.length >= 2 && !compareResult && !compareError && _jsx("p", { className: "text-xs text-[#62625C]", role: "status", children: "Checking metric comparability\u2026" }), compareResult?.comparable === false && _jsx("p", { className: "text-xs text-[#B56732]", role: "note", children: compareResult.comparisonNotes || 'These signals are not directly comparable under the current filters.' }), compareIds.length >= 2 && _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full text-xs border-collapse", children: [_jsx("thead", { children: _jsx("tr", { className: "bg-[#F0EFE8]", children: ['Skill', 'Category', 'Mentions', 'Growth', 'Momentum', 'Window'].map(h => _jsx("th", { className: "text-left p-2 border border-[#D8D6CD]", children: h }, h)) }) }), _jsx("tbody", { children: compareIds.map(id => skills.find(s => s.skillId === id)).filter((s) => Boolean(s)).map(s => _jsxs("tr", { className: "bg-white", children: [_jsx("td", { className: "p-2 border border-[#D8D6CD] font-semibold", children: s.canonicalName }), _jsx("td", { className: "p-2 border border-[#D8D6CD]", children: s.category }), _jsx("td", { className: "p-2 border border-[#D8D6CD]", children: s.mentions.toLocaleString() }), _jsxs("td", { className: "p-2 border border-[#D8D6CD]", children: [s.growthRate > 0 ? '+' : '', s.growthRate, "%"] }), _jsxs("td", { className: "p-2 border border-[#D8D6CD]", children: [s.momentumScore, "/100"] }), _jsx("td", { className: "p-2 border border-[#D8D6CD]", children: s.observationWindow })] }, s.skillId)) })] }) }), new Set(compareIds.map(id => skills.find(s => s.skillId === id)?.observationWindow)).size > 1 && _jsx("p", { className: "text-xs text-[#B56732]", role: "note", children: "These values use different observation windows. Compare side-by-side only; percentage or rank comparisons are not directly comparable." }), _jsx("p", { className: "text-xs text-[#62625C]", children: "Demo adapter comparison is local to this preview. Production comparison must be confirmed by the backend adapter." })] }))] }))] })] })] }));
};
const MetricBox = ({ label, value, sub, positive }) => (_jsxs("div", { className: "bg-[#F0EFE8] rounded-lg p-3 border border-[#D8D6CD]", children: [_jsx("div", { className: "text-[10px] font-semibold text-[#62625C] uppercase tracking-wide", children: label }), _jsx("div", { className: `text-lg font-extrabold tracking-tight ${positive === false ? 'text-[#B42318]' : positive === true ? 'text-[#35745D]' : 'text-[#171717]'}`, children: value }), _jsx("div", { className: "text-[10px] text-[#62625C]", children: sub })] }));
export const EmergingSkillsPage = ({ dataAdapter: suppliedAdapter, initialFilters, initialView = 'overview', onOpenSource } = {}) => {
    const adapter = useMemo(() => suppliedAdapter || new UnavailableEmergingSkillsDataAdapter(), [suppliedAdapter]);
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
            // Keep view but update selected skill
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
    return (_jsxs("div", { className: "min-h-0 w-full bg-[#F7F6F0] text-[#171717] font-sans", children: [_jsxs("div", { className: `border-b px-6 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold ${adapter === demoEmergingSkillsDataAdapter ? 'bg-[#F2D34F]/20 border-[#F2D34F]/30 text-[#8A6D1F]' : adapter instanceof UnavailableEmergingSkillsDataAdapter ? 'bg-[#FFF4F2] border-[#B42318]/30 text-[#8A241A]' : 'bg-[#20A89C]/10 border-[#20A89C]/25 text-[#185F59]'}`, role: "status", children: [adapter === demoEmergingSkillsDataAdapter ? _jsx(ShieldAlert, { className: "w-3.5 h-3.5" }) : adapter instanceof UnavailableEmergingSkillsDataAdapter ? _jsx(AlertCircle, { className: "w-3.5 h-3.5" }) : _jsx(Info, { className: "w-3.5 h-3.5" }), adapter === demoEmergingSkillsDataAdapter
                        ? 'Illustrative demo data (Provenance: SYNTHETIC_DEMO). Not for production analytics.'
                        : adapter instanceof UnavailableEmergingSkillsDataAdapter
                            ? 'Emerging Skills API is not configured. No live skill signals are available.'
                            : 'Connected data adapter. Review each panel’s provenance, coverage and quality metadata before interpreting results.'] }), _jsx("div", { className: "bg-white border-b border-[#D8D6CD] px-8 py-6 shadow-[0_1px_2px_rgba(23,23,23,0.03)]", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsx("div", { className: "flex items-center gap-2 mb-1", children: _jsx("span", { className: "text-[11px] font-bold uppercase tracking-widest text-[#62625C]", children: "Emerging Skills Intelligence" }) }), _jsx("h1", { className: "text-3xl md:text-4xl font-extrabold tracking-tight text-[#171717] leading-tight", children: "Discover skills whose demand signals are newly appearing, accelerating, or declining." }), _jsx("p", { className: "text-[#62625C] mt-2 max-w-2xl text-sm leading-relaxed", children: "Evidence-backed classification, occupation mappings, regional intensity and source transparency \u2014 not static infographics." })] }) }), _jsx("div", { className: "bg-white border-b border-[#D8D6CD] px-8 shadow-[0_1px_2px_rgba(23,23,23,0.03)]", children: _jsx("div", { className: "max-w-6xl mx-auto", children: _jsx("nav", { className: "flex overflow-x-auto no-scrollbar", role: "tablist", "aria-label": "Emerging Skills views", children: tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (_jsxs("button", { onClick: () => setActiveTab(tab.id), role: "tab", "aria-selected": isActive, tabIndex: isActive ? 0 : -1, className: `flex items-center gap-2 px-4 py-3.5 text-sm font-bold border-b-[3px] transition-colors whitespace-nowrap ${isActive ? 'border-[#203A5B] text-[#203A5B]' : 'border-transparent text-[#62625C] hover:text-[#171717] hover:border-[#D8D6CD]'}`, children: [_jsx(Icon, { className: "w-4 h-4" }), tab.label] }, tab.id));
                        }) }) }) }), _jsxs("div", { className: "max-w-6xl mx-auto px-8 py-8", children: [_jsx(FilterBar, { filters: filters, onChange: (k, v) => { setFilters(f => ({ ...f, [k]: v })); setFilterApplied(false); }, onApply: handleApplyFilters, onReset: handleResetFilters }), !filterApplied && _jsx("div", { className: "mb-3 rounded-lg border border-[#D8D6CD] bg-white px-3 py-2 text-xs text-[#62625C]", children: "Draft filters changed. Select Apply to refresh the page." }), loadError && _jsxs("div", { role: "alert", className: "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B42318]/30 bg-[#FFF4F2] px-4 py-3 text-sm text-[#B42318]", children: [_jsx("span", { children: loadError }), _jsx("button", { onClick: () => setRetryKey(k => k + 1), className: "rounded-lg border border-[#B42318]/30 bg-white px-3 py-1.5 font-semibold", children: "Retry" })] }), loading ? (_jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl p-16 text-center shadow-[0_2px_6px_rgba(23,23,23,0.03)]", children: [_jsx("div", { className: "w-10 h-10 border-4 border-[#F2D34F]/30 border-t-[#203A5B] rounded-full animate-spin mx-auto mb-4" }), _jsx("p", { className: "text-[#62625C] font-medium", children: "Loading intelligence data..." }), _jsx("p", { className: "text-xs text-[#62625C] mt-1", children: adapter === demoEmergingSkillsDataAdapter ? 'Illustrative demo adapter' : 'Connected data adapter' })] })) : loadError && !summary && skills.length === 0 ? (_jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-2xl p-10 text-center shadow-[0_2px_6px_rgba(23,23,23,0.03)]", role: "status", children: [_jsx(AlertCircle, { className: "w-8 h-8 text-[#B42318] mx-auto mb-3" }), _jsx("h2", { className: "font-bold text-lg text-[#171717]", children: "Emerging Skills results unavailable" }), _jsx("p", { className: "text-sm text-[#62625C] mt-2", children: "No skill counts, rankings, watchlist activity or findings are inferred while the service is unavailable." }), _jsx("button", { type: "button", onClick: () => setRetryKey(key => key + 1), className: "mt-4 rounded-lg border border-[#292929] bg-[#F2D34F] px-4 py-2 text-sm font-semibold", children: "Retry data load" })] })) : (_jsxs(_Fragment, { children: [activeTab === 'overview' && (_jsx(OverviewView, { summary: summary, skills: skills, onSelectSkill: handleSelectSkill, selectedSkillId: selectedSkillId })), activeTab === 'momentum' && (_jsx(MomentumView, { skills: skills, onSelectSkill: handleSelectSkill })), activeTab === 'connections' && (_jsx(ConnectionsView, { skill: selectedSkill, skills: skills, dataAdapter: adapter, onSelectSkill: handleSelectSkill, filters: appliedFilters })), activeTab === 'regional' && (_jsx(RegionalSignalsView, { skill: selectedSkill, dataAdapter: adapter, filters: appliedFilters, onSelectGeography: (code) => { const geography = selectedSkill?.regionalSignals.find(r => r.regionCode === code)?.regionName || code; setFilters(f => ({ ...f, geography })); setAppliedFilters(f => ({ ...f, geography })); setFilterApplied(true); } })), activeTab === 'profile' && (_jsx(ProfileEvidenceView, { skill: selectedSkill, skills: skills, watchlist: watchlist, compareIds: compareIds, onCompareToggle: handleCompareToggle, onWatchlistToggle: handleWatchlistToggle, dataAdapter: adapter, filters: appliedFilters, onOpenSource: onOpenSource }))] })), activeTab === 'overview' && !loading && _jsxs("section", { className: "mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4", "aria-label": "Watchlist and recent alerts", children: [_jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-3", children: [_jsx("h2", { className: "text-base font-bold text-[#171717]", children: "Your skill watchlist" }), _jsx("span", { className: "text-[10px] text-[#62625C]", children: adapter === demoEmergingSkillsDataAdapter ? 'PREVIEW ONLY' : 'ACCOUNT WATCHLIST' })] }), watchlist.length === 0 ? _jsx("p", { className: "text-sm text-[#62625C]", children: "No skills saved yet. Open a skill profile to add one." }) : _jsx("ul", { className: "space-y-2", children: watchlist.map(id => skills.find(s => s.skillId === id)).filter((x) => Boolean(x)).map(item => _jsxs("li", { className: "flex justify-between items-center gap-3", children: [_jsx("button", { onClick: () => handleSelectSkill(item.skillId), className: "text-sm font-semibold underline text-left", children: item.canonicalName }), _jsx(CategoryBadge, { category: item.category })] }, item.skillId)) }), adapter === demoEmergingSkillsDataAdapter && _jsx("p", { className: "mt-3 text-[11px] text-[#62625C]", children: "Demo changes are held in memory only; persistence requires an authenticated backend." })] }), _jsxs("div", { className: "bg-white border border-[#D8D6CD] rounded-xl p-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-3", children: [_jsx("h2", { className: "text-base font-bold text-[#171717]", children: "Recent skill alerts" }), _jsx("span", { className: "text-[10px] text-[#62625C]", children: adapter === demoEmergingSkillsDataAdapter ? 'SYNTHETIC_DEMO' : 'ADAPTER DATA' })] }), alerts.length === 0 ? _jsx("p", { className: "text-sm text-[#62625C]", children: "No alerts were returned by the data adapter." }) : _jsx("ul", { className: "space-y-2", children: alerts.slice(0, 4).map(a => { const item = skills.find(s => s.skillId === a.skillId); return _jsxs("li", { className: "flex items-start gap-2 text-sm", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-[#B56732] mt-0.5 shrink-0" }), _jsxs("div", { children: [_jsxs("p", { className: "font-semibold text-[#171717]", children: [item?.canonicalName || a.skillId, " \u00B7 ", a.status || 'Alert'] }), _jsxs("p", { className: "text-xs text-[#62625C]", children: [a.metric || 'Metric', " threshold ", a.threshold ?? '—', " \u00B7 ", a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Date not supplied'] })] })] }, a.ruleId || `${a.skillId}-${a.metric}`); }) })] })] }), _jsxs("div", { className: "mt-10 pt-6 border-t border-[#D8D6CD] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] text-[#62625C]", children: [_jsxs("div", { children: [_jsx("span", { className: "font-semibold text-[#171717]", children: "Data source:" }), " ", adapter === demoEmergingSkillsDataAdapter ? 'Mock adapter (SYNTHETIC_DEMO); not official labour-market findings.' : 'Host-provided data adapter. Check each result’s provenance metadata.'] }), adapter === demoEmergingSkillsDataAdapter ? _jsx(ProvenanceStrip, { state: "SYNTHETIC_DEMO", note: "Demo values are illustrative only." }) : _jsx("div", { className: "text-[11px] text-[#62625C]", children: "Provenance is supplied by the host adapter." })] })] })] }));
};
export default EmergingSkillsPage;
