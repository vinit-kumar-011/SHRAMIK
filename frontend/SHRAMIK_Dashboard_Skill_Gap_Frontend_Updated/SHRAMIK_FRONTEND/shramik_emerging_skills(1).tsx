import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Briefcase, 
  Map as MapIcon, 
  Network, 
  TrendingUp, 
  Search, 
  Bell, 
  User, 
  Users,
  AlertTriangle,
  ChevronRight,
  Info,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Home,
  Settings,
  Database,
  ShieldCheck,
  FileText,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';


export type SkillCategory = 'EMERGING' | 'ACCELERATING' | 'ESTABLISHED' | 'DECLINING' | 'UNCLASSIFIED';
export type ProvenanceState = 'SOURCE_BACKED' | 'DERIVED' | 'MIXED' | 'SYNTHETIC_DEMO';
export type RelationBasis = 'DIRECT_OBSERVATION' | 'APPROVED_MAPPING' | 'DERIVED_ASSOCIATION';

export interface RegionalSignal {
  regionCode: string;
  regionName: string;
  mentions: number;
  growthRate: number;
}

export interface OccupationConnection {
  occupationId: string;
  occupationName: string;
  relationBasis: RelationBasis;
  evidenceCount: number;
  relevanceScore: number;
}

export interface EmergingSkill {
  skillId: string;
  canonicalName: string;
  category: SkillCategory;
  momentumScore: number; 
  mentions: number;
  growthRate: number;
  ruleVersion: string;
  observationWindow: string;
  provenanceState: ProvenanceState;
  sectors: number;
  regionalSignals: RegionalSignal[];
  occupations: OccupationConnection[];
  trend: { year: string; value: number }[];
}

export interface EmergingSkillsSummary {
  totalEmerging: number;
  totalAccelerating: number;
  totalEstablished: number;
  totalDeclining: number;
  topSkills: EmergingSkill[];
  meta: {
    provenance: ProvenanceState;
    updatedAt: string;
    note: string;
  }
}


const MOCK_SKILLS: EmergingSkill[] = [
  {
    skillId: 'sk-101',
    canonicalName: 'Generative AI',
    category: 'EMERGING',
    momentumScore: 95,
    mentions: 48000,
    growthRate: 142.5,
    sectors: 6,
    ruleVersion: 'v2.1.0-alpha',
    observationWindow: 'Past 90 Days',
    provenanceState: 'SYNTHETIC_DEMO',
    trend: [
      { year: '2020', value: 2000 }, { year: '2021', value: 5000 }, { year: '2022', value: 12000 },
      { year: '2023', value: 28000 }, { year: '2024', value: 48000 }
    ],
    regionalSignals: [
      { regionCode: 'KA', regionName: 'Karnataka', mentions: 18000, growthRate: 142 },
      { regionCode: 'MH', regionName: 'Maharashtra', mentions: 12000, growthRate: 84 },
      { regionCode: 'TS', regionName: 'Telangana', mentions: 11000, growthRate: 76 }
    ],
    occupations: [
      { occupationId: 'occ-501', occupationName: 'Data Scientists', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 5120, relevanceScore: 0.78 },
      { occupationId: 'occ-502', occupationName: 'Software Developers', relationBasis: 'DERIVED_ASSOCIATION', evidenceCount: 1200, relevanceScore: 0.61 },
    ]
  },
  {
    skillId: 'sk-102',
    canonicalName: 'Data Engineering',
    category: 'EMERGING',
    momentumScore: 88,
    mentions: 42000,
    growthRate: 118.2,
    sectors: 5,
    ruleVersion: 'v2.0.5',
    observationWindow: 'Past 180 Days',
    provenanceState: 'SYNTHETIC_DEMO',
    trend: [
      { year: '2020', value: 15000 }, { year: '2021', value: 22000 }, { year: '2022', value: 28000 },
      { year: '2023', value: 35000 }, { year: '2024', value: 42000 }
    ],
    regionalSignals: [
      { regionCode: 'KA', regionName: 'Karnataka', mentions: 15000, growthRate: 105 },
      { regionCode: 'MH', regionName: 'Maharashtra', mentions: 9000, growthRate: 75 },
    ],
    occupations: [
      { occupationId: 'occ-503', occupationName: 'Data Engineers', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 8120, relevanceScore: 0.92 },
    ]
  },
  {
    skillId: 'sk-103',
    canonicalName: 'Cloud Architecture',
    category: 'ACCELERATING',
    momentumScore: 82,
    mentions: 38000,
    growthRate: 105.0,
    sectors: 4,
    ruleVersion: 'v2.1.0-alpha',
    observationWindow: 'Past 90 Days',
    provenanceState: 'SYNTHETIC_DEMO',
    trend: [
      { year: '2020', value: 10000 }, { year: '2021', value: 18000 }, { year: '2022', value: 25000 },
      { year: '2023', value: 32000 }, { year: '2024', value: 38000 }
    ],
    regionalSignals: [
      { regionCode: 'TS', regionName: 'Telangana', mentions: 12000, growthRate: 110 },
      { regionCode: 'TN', regionName: 'Tamil Nadu', mentions: 8500, growthRate: 80 },
    ],
    occupations: [
      { occupationId: 'occ-601', occupationName: 'Cloud Architects', relationBasis: 'APPROVED_MAPPING', evidenceCount: 0, relevanceScore: 0.85 },
    ]
  },
  {
    skillId: 'sk-104',
    canonicalName: 'Cybersecurity',
    category: 'ACCELERATING',
    momentumScore: 75,
    mentions: 76000,
    growthRate: 86.2,
    sectors: 8,
    ruleVersion: 'v1.9.0',
    observationWindow: 'Past 365 Days',
    provenanceState: 'SYNTHETIC_DEMO',
    trend: [
      { year: '2020', value: 30000 }, { year: '2021', value: 40000 }, { year: '2022', value: 52000 },
      { year: '2023', value: 64000 }, { year: '2024', value: 76000 }
    ],
    regionalSignals: [
      { regionCode: 'KA', regionName: 'Karnataka', mentions: 22000, growthRate: 90 },
      { regionCode: 'MH', regionName: 'Maharashtra', mentions: 18000, growthRate: 85 },
    ],
    occupations: [
      { occupationId: 'occ-701', occupationName: 'Security Analysts', relationBasis: 'DIRECT_OBSERVATION', evidenceCount: 18500, relevanceScore: 0.88 },
    ]
  }
];

class MockEmergingSkillsDataAdapter {
  async getSummary(signal?: AbortSignal): Promise<EmergingSkillsSummary> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalEmerging: 186,
          totalAccelerating: 412,
          totalEstablished: 1024,
          totalDeclining: 87,
          topSkills: MOCK_SKILLS,
          meta: {
            provenance: 'SYNTHETIC_DEMO',
            updatedAt: new Date().toISOString(),
            note: 'Illustrative demo data only.'
          }
        });
      }, 600);
    });
  }

  async getSkills(signal?: AbortSignal): Promise<EmergingSkill[]> {
    return new Promise((resolve) => {
      setTimeout(() => { resolve([...MOCK_SKILLS]); }, 500);
    });
  }
}

const dataAdapter = new MockEmergingSkillsDataAdapter();


const Card = ({ children, className = '', noPadding = false }: { children: React.ReactNode, className?: string, noPadding?: boolean }) => (
  <div className={`bg-white border-[1.5px] border-[#292929] rounded-xl shadow-[3px_3px_0px_#292929] overflow-hidden ${noPadding ? '' : 'p-5'} ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'neutral' }: { children: React.ReactNode, variant?: 'neutral'|'emerging'|'accelerating'|'established'|'declining'|'demo' }) => {
  const styles = {
    neutral: 'bg-[#F0EFE8] text-[#171717] border-[#D8D6CD]',
    emerging: 'bg-[#F2D34F]/20 text-[#B56732] border-[#F2D34F]',
    accelerating: 'bg-[#20A89C]/10 text-[#20A89C] border-[#20A89C]/30',
    established: 'bg-[#315D8A]/10 text-[#315D8A] border-[#315D8A]/30',
    declining: 'bg-[#B42318]/10 text-[#B42318] border-[#B42318]/30',
    demo: 'bg-[#F2D34F] text-[#171717] border-[#292929] shadow-[1px_1px_0px_#292929]'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[variant]} uppercase tracking-wide`}>
      {children}
    </span>
  );
}

const CategoryBadge = ({ category }: { category: SkillCategory }) => {
  const map: Record<SkillCategory, any> = {
    'EMERGING': 'emerging',
    'ACCELERATING': 'accelerating',
    'ESTABLISHED': 'established',
    'DECLINING': 'declining',
    'UNCLASSIFIED': 'neutral'
  };
  return <Badge variant={map[category]}>{category}</Badge>;
}

const Button = ({ children, variant = 'primary', className = '', icon: Icon }: any) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border-[1.5px] border-[#292929] transition-transform active:translate-y-[2px] active:shadow-none";
  const variants = {
    primary: "bg-[#F2D34F] text-[#171717] shadow-[3px_3px_0px_#292929] hover:bg-[#E6C33C]",
    secondary: "bg-white text-[#171717] shadow-[2px_2px_0px_#292929] hover:bg-[#F0EFE8]",
  };
  return (
    <button className={`${base} ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
      {Icon && <Icon className="w-4 h-4" />}
    </button>
  );
}


const GlobalFilters = () => (
  <Card className="mb-6 py-3 px-4 flex flex-wrap items-center gap-4 bg-white">
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-[#62625C] uppercase tracking-wider mb-1">Time Horizon</span>
      <select className="border border-[#D8D6CD] rounded-md px-3 py-1.5 text-sm font-medium bg-[#F0EFE8] outline-none focus:border-[#292929]">
        <option>3 Years (2023-2025)</option>
        <option>1 Year (2024-2025)</option>
      </select>
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-[#62625C] uppercase tracking-wider mb-1">Geography</span>
      <select className="border border-[#D8D6CD] rounded-md px-3 py-1.5 text-sm font-medium bg-[#F0EFE8] outline-none focus:border-[#292929]">
        <option>All India</option>
        <option>Maharashtra</option>
        <option>Karnataka</option>
      </select>
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-[#62625C] uppercase tracking-wider mb-1">Sector</span>
      <select className="border border-[#D8D6CD] rounded-md px-3 py-1.5 text-sm font-medium bg-[#F0EFE8] outline-none focus:border-[#292929]">
        <option>All Sectors</option>
        <option>IT & Software</option>
        <option>Manufacturing</option>
      </select>
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-[#62625C] uppercase tracking-wider mb-1">Skill Category</span>
      <select className="border border-[#D8D6CD] rounded-md px-3 py-1.5 text-sm font-medium bg-[#F0EFE8] outline-none focus:border-[#292929]">
        <option>All Categories</option>
        <option>Emerging</option>
        <option>Accelerating</option>
      </select>
    </div>
    <div className="ml-auto flex gap-2 pt-4">
      <Button variant="primary" icon={Filter}>Apply Filters</Button>
      <Button variant="secondary" icon={RefreshCw} className="px-3" />
    </div>
  </Card>
);


const OverviewView = ({ summary, skills, onSelectSkill }: { summary: EmergingSkillsSummary, skills: EmergingSkill[], onSelectSkill: (id: string) => void }) => {
  const pieData = [
    { name: 'Emerging', value: 186, fill: '#EB791D' },
    { name: 'Accelerating', value: 412, fill: '#20A89C' },
    { name: 'Established', value: 1024, fill: '#315D8A' },
    { name: 'Declining', value: 87, fill: '#B42318' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="flex flex-col border-t-4 border-t-[#EB791D]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-[#EB791D]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#EB791D]" />
            </div>
            <span className="text-xs font-bold text-[#35745D] flex items-center gap-1 bg-[#35745D]/10 px-2 py-1 rounded-md">
              <ArrowUpRight className="w-3 h-3" /> 22%
            </span>
          </div>
          <span className="text-3xl font-black text-[#171717] font-['Barlow_Condensed',sans-serif]">{summary.totalEmerging}</span>
          <span className="text-sm font-semibold text-[#62625C]">Emerging Skills</span>
        </Card>
        
        <Card className="flex flex-col border-t-4 border-t-[#20A89C]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-[#20A89C]/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#20A89C]" />
            </div>
            <span className="text-xs font-bold text-[#35745D] flex items-center gap-1 bg-[#35745D]/10 px-2 py-1 rounded-md">
              <ArrowUpRight className="w-3 h-3" /> 24%
            </span>
          </div>
          <span className="text-3xl font-black text-[#171717] font-['Barlow_Condensed',sans-serif]">{summary.totalAccelerating}</span>
          <span className="text-sm font-semibold text-[#62625C]">Accelerating Skills</span>
        </Card>

        <Card className="flex flex-col border-t-4 border-t-[#315D8A]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-[#315D8A]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#315D8A]" />
            </div>
            <span className="text-xs font-bold text-[#35745D] flex items-center gap-1 bg-[#35745D]/10 px-2 py-1 rounded-md">
              <ArrowUpRight className="w-3 h-3" /> 8%
            </span>
          </div>
          <span className="text-3xl font-black text-[#171717] font-['Barlow_Condensed',sans-serif]">1,024</span>
          <span className="text-sm font-semibold text-[#62625C]">Established Skills</span>
        </Card>

        <Card className="flex flex-col border-t-4 border-t-[#B42318]">
          <div className="flex justify-between items-start mb-2">
            <div className="w-10 h-10 rounded-full bg-[#B42318]/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-[#B42318]" />
            </div>
            <span className="text-xs font-bold text-[#B42318] flex items-center gap-1 bg-[#B42318]/10 px-2 py-1 rounded-md">
              <ArrowDownRight className="w-3 h-3" /> 16%
            </span>
          </div>
          <span className="text-3xl font-black text-[#171717] font-['Barlow_Condensed',sans-serif]">87</span>
          <span className="text-sm font-semibold text-[#62625C]">Declining Skills</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Skills Table */}
        <Card className="lg:col-span-2" noPadding>
          <div className="p-4 border-b border-[#292929] bg-[#F0EFE8] flex justify-between items-center">
            <h3 className="font-bold text-lg text-[#171717]">Top Emerging Skills <span className="text-[#62625C] font-medium text-sm">(by demand growth)</span></h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-[#D8D6CD] text-[#62625C] font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">Growth Rate</th>
                <th className="px-4 py-3">Demand Vol</th>
                <th className="px-4 py-3">Sectors</th>
                <th className="px-4 py-3">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D6CD]">
              {skills.map((skill, idx) => (
                <tr 
                  key={skill.skillId} 
                  className="hover:bg-[#F7F6F0] cursor-pointer transition-colors group"
                  onClick={() => onSelectSkill(skill.skillId)}
                >
                  <td className="px-4 py-3 font-bold text-[#62625C]">{idx + 1}</td>
                  <td className="px-4 py-3 font-bold text-[#171717] group-hover:text-[#315D8A]">{skill.canonicalName}</td>
                  <td className="px-4 py-3 font-bold text-[#35745D] flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> {skill.growthRate}%</td>
                  <td className="px-4 py-3 font-medium text-[#171717]">{(skill.mentions / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 font-medium text-[#62625C]">{skill.sectors}</td>
                  <td className="px-4 py-3"><CategoryBadge category={skill.category} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-white border-t border-[#D8D6CD]">
            <Button variant="secondary" icon={ArrowRight}>View All Skills</Button>
          </div>
        </Card>

        {/* Category Distribution */}
        <Card className="flex flex-col">
          <h3 className="font-bold text-lg text-[#171717] mb-4">Skills by Category</h3>
          <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black font-['Barlow_Condensed',sans-serif] text-[#171717]">1,622</span>
              <span className="text-xs font-bold text-[#62625C] uppercase tracking-wider">Total</span>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }}></div>
                  <span className="font-semibold text-[#171717]">{d.name}</span>
                </div>
                <span className="text-[#62625C] font-medium">{((d.value/1622)*100).toFixed(0)}% ({d.value})</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-[#F2D34F]/10 border border-[#F2D34F] rounded-lg flex items-start gap-2 text-xs text-[#171717]">
            <Info className="w-4 h-4 shrink-0 text-[#EB791D]" />
            <p>Categories are determined using defined demand growth rules and minimum data thresholds. <a href="#" className="font-bold underline">View methodology</a></p>
          </div>
        </Card>
      </div>
    </div>
  );
};


const MomentumView = ({ skills, onSelectSkill }: { skills: EmergingSkill[], onSelectSkill: (id: string) => void }) => {
  const chartData = skills.map(s => ({
    name: s.canonicalName,
    id: s.skillId,
    mentions: s.mentions,
    growthRate: s.growthRate,
    score: s.momentumScore,
    category: s.category
  }));

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'EMERGING': return '#EB791D'; // Orange
      case 'ACCELERATING': return '#20A89C'; // Teal
      case 'ESTABLISHED': return '#315D8A'; // Navy
      case 'DECLINING': return '#B42318'; // Danger
      default: return '#62625C';
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#171717] text-white p-3 border border-[#292929] shadow-lg rounded-lg">
          <p className="font-bold">{data.name}</p>
          <div className="mt-1 text-sm text-gray-300">
            <p>Growth: <span className="font-bold text-white">{data.growthRate}%</span></p>
            <p>Volume: <span className="font-bold text-white">{(data.mentions/1000).toFixed(0)}K</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const selectedSkill = skills[0]; // Auto-select first for demo layout

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      <Card className="lg:col-span-2 flex flex-col">
        <div className="mb-4">
          <h3 className="font-bold text-xl text-[#171717] uppercase tracking-wide">Skill Momentum Map</h3>
          <p className="text-sm text-[#62625C] mt-1">Explore skills by current demand and demand growth. Bubble size represents volume.</p>
        </div>
        
        <div className="flex-1 min-h-[400px] w-full bg-[#F0EFE8]/50 rounded-lg border border-[#D8D6CD] p-4 relative">
          {/* Quadrant Labels */}
          <div className="absolute top-6 left-6 text-xs font-bold text-[#62625C] uppercase">High Growth<br/>Lower Demand</div>
          <div className="absolute top-6 right-6 text-xs font-bold text-[#62625C] uppercase text-right">High Growth<br/>High Demand</div>
          <div className="absolute bottom-12 left-6 text-xs font-bold text-[#62625C] uppercase">Lower Growth<br/>Lower Demand</div>
          <div className="absolute bottom-12 right-6 text-xs font-bold text-[#62625C] uppercase text-right">Lower Growth<br/>High Demand</div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D6CD" />
            <XAxis 
              type="number" 
              dataKey="mentions" 
              name="Volume" 
              domain={[0, 100000]} 
              tickFormatter={(val) => `${val/1000}K`}
            />
            <YAxis 
              type="number" 
              dataKey="growthRate" 
              name="Growth" 
              domain={[-50, 200]}
            />
            <ZAxis type="number" dataKey="score" range={[100, 800]} name="Momentum" />
            <RechartsTooltip content={CustomTooltip} />
            <Scatter name="Skills" data={chartData} onClick={(data) => onSelectSkill(data.id)} className="cursor-pointer">
              {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category)} opacity={0.8} stroke="#171717" strokeWidth={1} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Selected Skill Panel */}
      <div className="flex flex-col gap-4">
        <Card className="flex-1">
          <h4 className="text-sm font-bold text-[#62625C] uppercase tracking-wider mb-2">Selected Skill</h4>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-[#171717]">{selectedSkill.canonicalName}</h2>
            <CategoryBadge category={selectedSkill.category} />
          </div>

          <div className="flex gap-2 border-b border-[#D8D6CD] mb-4">
            <button className="px-3 py-1.5 border-b-2 border-[#171717] text-sm font-bold text-[#171717]">Overview</button>
            <button className="px-3 py-1.5 border-b-2 border-transparent text-sm font-semibold text-[#62625C] hover:text-[#171717]">Why Emerging?</button>
            <button className="px-3 py-1.5 border-b-2 border-transparent text-sm font-semibold text-[#62625C] hover:text-[#171717]">Evidence</button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center border-b border-[#F0EFE8] pb-2">
              <span className="text-sm font-semibold text-[#62625C]">Projected Growth Rate</span>
              <span className="text-sm font-bold text-[#35745D]">+{selectedSkill.growthRate}%</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#F0EFE8] pb-2">
              <span className="text-sm font-semibold text-[#62625C]">Current Demand Volume</span>
              <span className="text-sm font-bold text-[#171717]">{(selectedSkill.mentions/1000).toFixed(0)}K Postings</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#F0EFE8] pb-2">
              <span className="text-sm font-semibold text-[#62625C]">Associated Occupations</span>
              <span className="text-sm font-bold text-[#171717]">{selectedSkill.occupations.length}</span>
            </div>
            <div className="flex justify-between items-start pb-2">
              <span className="text-sm font-semibold text-[#62625C]">Key Sectors</span>
              <span className="text-sm font-medium text-[#171717] text-right">IT & Software, BFSI, Education</span>
            </div>
          </div>

          <div className="mb-6">
            <h5 className="text-xs font-bold text-[#62625C] uppercase mb-2">Demand Trend</h5>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedSkill.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0EFE8" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Line type="monotone" dataKey="value" stroke="#315D8A" strokeWidth={3} dot={{r: 4, fill: '#315D8A', strokeWidth: 2, stroke: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ConnectionsView = ({ skill }: { skill: EmergingSkill | null }) => {
  if (!skill) return null;
  return (
    <div className="animate-in fade-in duration-500">
      <Card>
        <h3 className="font-bold text-lg text-[#171717] mb-4">Occupation & Sector Connections</h3>
        <div className="h-[400px] w-full flex items-center justify-center bg-[#F0EFE8] border border-[#D8D6CD] rounded-lg">
          <div className="text-center">
              <Network className="w-12 h-12 text-[#62625C] mx-auto mb-3 opacity-50" />
              <p className="text-[#171717] font-bold">Network Graph Visualization</p>
              <p className="text-sm text-[#62625C] mt-1">Relationships for {skill.canonicalName}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const RegionalSignalsView = ({ skill }: { skill: EmergingSkill | null }) => {
  if (!skill) return null;
  return (
    <div className="animate-in fade-in duration-500">
      <Card>
        <h3 className="font-bold text-lg text-[#171717] mb-4">Regional Signals</h3>
        <div className="h-[400px] w-full flex items-center justify-center bg-[#F0EFE8] border border-[#D8D6CD] rounded-lg">
          <div className="text-center">
              <MapIcon className="w-12 h-12 text-[#62625C] mx-auto mb-3 opacity-50" />
              <p className="text-[#171717] font-bold">Geographic Map Visualization</p>
              <p className="text-sm text-[#62625C] mt-1">State-level demand for {skill.canonicalName}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const ProfileEvidenceView = ({ skill }: { skill: EmergingSkill | null }) => {
  if (!skill) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#D8D6CD] pb-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-black text-[#171717] font-['Barlow_Condensed',sans-serif] uppercase tracking-wide">{skill.canonicalName}</h2>
              <CategoryBadge category={skill.category} />
            </div>
            <p className="text-sm font-medium text-[#62625C]">Analysis, interpretation and visualisation of data to support decision making across functions.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" icon={Plus}>Compare</Button>
            <Button variant="primary" icon={Bell}>Watchlist</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-3">
            <h3 className="font-bold text-lg text-[#171717] mb-4">Demand Trend (Job Postings)</h3>
            <div className="h-64 w-full border border-[#D8D6CD] rounded-lg p-4 bg-[#F0EFE8]/30 mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={skill.trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8D6CD" />
                  <XAxis dataKey="year" axisLine={{stroke: '#292929'}} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Line type="monotone" dataKey="value" stroke="#315D8A" strokeWidth={4} dot={{r: 6, fill: '#315D8A', strokeWidth: 2, stroke: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <h3 className="font-bold text-lg text-[#171717] mb-4">Regional Trend (Karnataka)</h3>
            <div className="h-48 w-full border border-[#D8D6CD] rounded-lg p-4 bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[{year:'2020',v:2},{year:'2021',v:4},{year:'2022',v:8},{year:'2023',v:12},{year:'2024',v:18}]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D8D6CD" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v)=>`${v}K`} />
                  <Line type="monotone" dataKey="v" stroke="#EB791D" strokeWidth={3} dot={{r: 5, fill: '#EB791D', strokeWidth: 2, stroke: '#fff'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-[#62625C] uppercase tracking-wider mb-2">Key Metrics</h4>
              <div className="bg-[#F7F6F0] p-4 rounded-lg border border-[#D8D6CD]">
                <div className="text-3xl font-black text-[#35745D] font-['Barlow_Condensed',sans-serif]">+{skill.growthRate}%</div>
                <div className="text-xs font-bold text-[#171717]">Demand Growth</div>
                <div className="text-[10px] text-[#62625C]">({skill.observationWindow})</div>
              </div>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-[#62625C] uppercase tracking-wider mb-2">Classification Details</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-[#D8D6CD] pb-1">
                  <span className="font-medium text-[#62625C]">Category</span>
                  <span className="font-bold text-[#171717]">{skill.category}</span>
                </div>
                <div className="flex justify-between border-b border-[#D8D6CD] pb-1">
                  <span className="font-medium text-[#62625C]">Rule Version</span>
                  <span className="font-bold text-[#171717]">{skill.ruleVersion}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="font-medium text-[#62625C]">Provenance</span>
                  <Badge variant="demo">{skill.provenanceState}</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};


type ViewTab = 'overview' | 'momentum' | 'connections' | 'regional' | 'profile';

export const EmergingSkillsPage = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [summary, setSummary] = useState<EmergingSkillsSummary | null>(null);
  const [skills, setSkills] = useState<EmergingSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sumData, skillsData] = await Promise.all([
          dataAdapter.getSummary(),
          dataAdapter.getSkills()
        ]);
        setSummary(sumData);
        setSkills(skillsData);
        setSelectedSkillId(skillsData[0].skillId); // Auto-select first for demo
      } catch (err) {
        console.error("Failed to load skills data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSelectSkill = (id: string) => {
    setSelectedSkillId(id);
    setActiveTab('profile');
  };

  const selectedSkill = skills.find(s => s.skillId === selectedSkillId) || null;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F7F6F0] overflow-hidden relative">
      {/* Subtle Dotted Texture Background (CSS approach) */}
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'radial-gradient(#292929 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

      {/* Demo Banner */}
      <div className="relative z-10 bg-[#F2D34F] px-4 py-2 border-b-[1.5px] border-[#292929] flex items-center justify-center gap-2 text-sm text-[#171717] shadow-sm">
        <ShieldCheck className="w-4 h-4" />
        <strong className="uppercase tracking-wider">Illustrative Demo Data</strong>
        <span className="font-medium">(Provenance: SYNTHETIC_DEMO). Do not use for production analytics.</span>
      </div>

      <div className="flex-1 overflow-auto relative z-10 p-6 md:p-8">
        <div className="max-w-[1280px] mx-auto">
          
          {/* Header */}
          <div className="mb-6">
            <div className="text-xs font-bold text-[#62625C] uppercase tracking-wider mb-2">Home / Emerging Skills</div>
            <h1 className="text-5xl font-black text-[#171717] font-['Barlow_Condensed',sans-serif] uppercase tracking-wide">
              {activeTab === 'overview' && 'Skills Overview'}
              {activeTab === 'momentum' && 'Skill Momentum'}
              {activeTab === 'connections' && 'Occupation & Sector Connections'}
              {activeTab === 'regional' && 'Regional Signals'}
              {activeTab === 'profile' && 'Skill Profiles & Evidence'}
            </h1>
            <p className="text-[#62625C] font-medium text-lg mt-2">
              {activeTab === 'overview' && 'Which skills are gaining importance based on real labour market signals?'}
              {activeTab === 'momentum' && 'Which skills have the strongest growth signals?'}
              {activeTab === 'connections' && 'Where are these skills becoming relevant?'}
              {activeTab === 'regional' && 'Where is demand for these skills increasing?'}
              {activeTab === 'profile' && 'Detailed evidence, classification rules, and comparison options.'}
            </p>
          </div>

          <GlobalFilters />

          {/* Neo-brutalist Tabs */}
          <div className="flex gap-2 mb-8 border-b-2 border-[#D8D6CD] pb-px overflow-x-auto hide-scrollbar">
            {[
              { id: 'overview', num: '01', label: 'Overview' },
              { id: 'momentum', num: '02', label: 'Momentum' },
              { id: 'connections', num: '03', label: 'Connections' },
              { id: 'regional', num: '04', label: 'Regional Signals' },
              { id: 'profile', num: '05', label: 'Profiles & Evidence' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ViewTab)}
                  className={`flex items-center gap-3 px-4 py-3 font-bold transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-white border-t-[1.5px] border-l-[1.5px] border-r-[1.5px] border-[#292929] text-[#171717] translate-y-px rounded-t-lg shadow-[inset_0_4px_0_#F2D34F]' 
                      : 'text-[#62625C] hover:text-[#171717] hover:bg-white/50 border-transparent border-t-[1.5px] border-l-[1.5px] border-r-[1.5px] rounded-t-lg'
                  }`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded-sm text-xs ${isActive ? 'bg-[#F2D34F] text-[#171717] border border-[#292929]' : 'bg-[#D8D6CD] text-white'}`}>
                    {tab.num}
                  </span>
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* View Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-[#D8D6CD] border-t-[#F2D34F] rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="min-h-[500px]">
              {activeTab === 'overview' && summary && (
                <OverviewView summary={summary} skills={skills} onSelectSkill={handleSelectSkill} />
              )}
              {activeTab === 'momentum' && (
                <MomentumView skills={skills} onSelectSkill={handleSelectSkill} />
              )}
              {activeTab === 'connections' && (
                <ConnectionsView skill={selectedSkill} />
              )}
              {activeTab === 'regional' && (
                <RegionalSignalsView skill={selectedSkill} />
              )}
              {activeTab === 'profile' && (
                <ProfileEvidenceView skill={selectedSkill} />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};



// Sidebar matching the exact requirement from SIDEBAR_CONSISTENCY_LOCK.md and SHRAMIK_Dashboard_Reference.png
const Sidebar = () => {
  const navItems = [
    { icon: Home, label: 'Dashboard' },
    { icon: BarChart3, label: 'Demand' },
    { icon: Layers, label: 'Supply' },
    { icon: Network, label: 'Skill Gaps' },
    { icon: Activity, label: 'Forecasts' },
    { icon: Cpu, label: 'Emerging Skills', active: true },
    { icon: FileText, label: 'Scenario Simulator' },
    { icon: FileText, label: 'Reports' },
  ];

  const bottomItems = [
    { icon: Database, label: 'Data Sources' },
    { icon: Settings, label: 'Data Quality' },
  ];

  return (
    <div className="w-[260px] bg-[#F7F6F0] flex flex-col h-screen shrink-0 border-r-[1.5px] border-[#292929] relative z-20">
      <div className="h-16 flex items-center px-6 border-b-[1.5px] border-[#292929] bg-[#F2D34F]">
        <div className="flex items-center gap-3 font-black text-[#171717] text-2xl font-['Barlow_Condensed',sans-serif] tracking-wider">
          <div className="w-8 h-8 bg-[#171717] text-[#F2D34F] rounded flex items-center justify-center text-lg">S</div>
          SHRAMIK
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button 
              key={idx} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all w-full text-left ${
                item.active 
                  ? 'bg-[#F2D34F] text-[#171717] border-[1.5px] border-[#292929] shadow-[2px_2px_0px_#292929] translate-y-[-1px]' 
                  : 'text-[#62625C] hover:bg-white hover:text-[#171717]'
              }`}
            >
              <Icon className={`w-5 h-5 ${item.active ? 'text-[#171717]' : 'text-[#62625C]'}`} />
              {item.label}
            </button>
          );
        })}

        <div className="my-4 border-t border-[#D8D6CD] mx-4"></div>

        {bottomItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button 
              key={`bottom-${idx}`} 
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-[#62625C] hover:bg-white hover:text-[#171717] transition-colors w-full text-left"
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t-[1.5px] border-[#292929] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F2D34F] border-[1.5px] border-[#292929] flex items-center justify-center font-bold shadow-[2px_2px_0px_#292929]">
            <Info className="w-5 h-5"/>
          </div>
          <div>
            <p className="text-xs font-bold text-[#171717] leading-tight">Data for people.</p>
            <p className="text-[10px] font-medium text-[#62625C] leading-tight mt-0.5">Opportunities for<br/>a stronger India.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Topbar = () => (
  <div className="h-16 bg-[#F7F6F0] border-b-[1.5px] border-[#292929] flex items-center justify-between px-6 shrink-0 relative z-20">
    <div className="flex-1 flex justify-center">
      <div className="flex items-center bg-white rounded-lg px-4 py-2 w-full max-w-xl border-[1.5px] border-[#292929] shadow-[2px_2px_0px_#292929] focus-within:translate-y-[-1px] focus-within:shadow-[3px_3px_0px_#292929] transition-all">
        <Search className="w-4 h-4 text-[#62625C] mr-3" />
        <input 
          type="text" 
          placeholder="Search for skills, occupations, sectors or regions..." 
          className="bg-transparent border-none outline-none text-sm w-full font-medium text-[#171717] placeholder:text-[#62625C]"
        />
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#62625C] bg-[#F0EFE8] px-2 py-1 rounded border border-[#D8D6CD]">
          <span>Ctrl</span><span>K</span>
        </div>
      </div>
    </div>
    
    <div className="flex items-center gap-6 ml-6">
      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border-[1.5px] border-[#292929] shadow-[2px_2px_0px_#292929] cursor-pointer">
        <MapIcon className="w-4 h-4 text-[#171717]" />
        <span className="text-sm font-bold text-[#171717]">India (National)</span>
      </div>

      <button className="relative p-2 text-[#171717] hover:bg-[#F2D34F] rounded-full transition-colors">
        <Bell className="w-5 h-5" />
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#B42318] rounded-full border-2 border-[#F7F6F0]"></span>
      </button>
      
      <div className="flex items-center gap-3 border-l border-[#D8D6CD] pl-6 cursor-pointer group">
        <div className="h-9 w-9 rounded-full bg-[#F2D34F] border-[1.5px] border-[#292929] flex items-center justify-center text-[#171717] font-black shadow-[2px_2px_0px_#292929] group-hover:translate-y-[-1px]">
          A
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-bold text-[#171717] leading-none">Arjun Mehta</p>
          <p className="text-xs font-medium text-[#62625C] mt-1">Research Analyst</p>
        </div>
      </div>
    </div>
  </div>
);

export default function App() {
  return (
    <div className="flex h-screen w-full font-sans bg-[#F7F6F0] text-[#171717]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <EmergingSkillsPage />
      </div>
    </div>
  );
}