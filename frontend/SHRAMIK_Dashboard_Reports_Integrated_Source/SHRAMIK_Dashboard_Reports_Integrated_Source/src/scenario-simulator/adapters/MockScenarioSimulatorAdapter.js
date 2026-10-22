import example from "../contracts/example-synthetic-run.json";
const fixture = example;
const skills = [
    { id: "demo-skill-data-analysis", label: "Data Analysis", code: "DEMO-DATA-ANALYSIS", codeSystem: "SHRAMIK_DEMO", description: "Only skill in the supplied example result." },
    { id: "demo-skill-cloud-architecture", label: "Cloud Architecture", available: false, unavailableReason: "No compatible baseline or result fixture is supplied." },
    { id: "demo-skill-cybersecurity", label: "Cybersecurity", available: false, unavailableReason: "No compatible baseline or result fixture is supplied." },
    { id: "demo-skill-renewable-energy", label: "Renewable Energy Systems", available: false, unavailableReason: "No compatible baseline or result fixture is supplied." },
];
const occupations = [
    { id: "demo-occupation-data-analyst", label: "Data Analyst", available: false, unavailableReason: "The supplied fixture contains a skill result, not an occupation result." },
    { id: "demo-occupation-cloud-engineer", label: "Cloud Engineer", available: false, unavailableReason: "No compatible baseline or result fixture is supplied." },
];
const baseline = {
    baselineForecastRunId: "demo-baseline-2025-2035", label: "SHRAMIK Baseline 2025–2035 (demo)", modelName: "mock-interface-fixture", modelVersion: "0.1-demo",
    inputWindowStart: "2025", inputWindowEnd: "2035", targetYearStart: 2025, targetYearEnd: 2035, qualityStatus: "CAUTION", provenance: "SYNTHETIC_DEMO", compatible: true,
};
export class MockScenarioSimulatorAdapter {
    async getOptions() {
        return { entityTypes: ["skill", "occupation"], additionalAnnualSeats: { minimum: 0, maximum: 200000, step: 1000, unit: "seats_per_year" },
            trainingLagMonths: { minimum: 0, maximum: 60, step: 12, unit: "months" }, startYears: [2026, 2027, 2028, 2029, 2030], evaluationYears: [2028, 2029, 2030],
            supportedAdvancedParameters: [], geographies: [{ id: "INDIA", label: "India (All States)" }], sectors: [], baselines: [baseline], provenance: "SYNTHETIC_DEMO" };
    }
    async searchEntities({ entityType, query }) {
        const list = entityType === "skill" ? skills : occupations;
        const q = query.trim().toLowerCase();
        return list.filter(item => item.label.toLowerCase().includes(q));
    }
    async getCompatibleBaselines({ entityType, entityId, geographyId }) {
        return entityType === "skill" && entityId === "demo-skill-data-analysis" && geographyId === "INDIA" ? [baseline] : [];
    }
    async runSimulation(input) {
        const exactExample = input.scope.entityType === "skill" && input.scope.entityId === "demo-skill-data-analysis" && input.scope.geographyId === "INDIA" &&
            input.baselineForecastRunId === baseline.baselineForecastRunId && input.intervention.additionalAnnualSeats === 50000 &&
            input.intervention.trainingLagMonths === 24 && input.intervention.interventionStartYear === 2027 && input.evaluationYear === 2030 && Object.keys(input.intervention.advancedParameters).length === 0;
        if (!exactExample)
            throw new Error("The supplied adapter only includes one fixed synthetic result (Data Analysis, India, +50,000 annual seats, 2-year lag, start 2027, evaluation 2030). Connect the REST adapter to run other configurations; no output was fabricated.");
        return { ...fixture.run, runStatus: "SUCCEEDED", statusMessage: "Loaded the fixed example fixture; no model was executed." };
    }
    async getRunStatus() { return { ...fixture.run }; }
    async getResults({ evaluationYear, view }) {
        if (evaluationYear !== 2030)
            throw new Error(`The supplied fixture has no outcome data for ${evaluationYear}.`);
        if (view === "regional-impact" && fixture.regionalImpact.length === 0)
            return { ...fixture, regionalImpact: [] };
        if (view === "sector-breakdown" && fixture.sectorBreakdown.length === 0)
            return { ...fixture, sectorBreakdown: [] };
        if (view === "occupation-impact" && fixture.occupationImpact.length === 0)
            return { ...fixture, occupationImpact: [] };
        if (view === "sensitivity-analysis" && !fixture.sensitivity)
            throw new Error("Sensitivity results are not supplied by the example fixture.");
        return { ...fixture, series: structuredClone(fixture.series), outcomes: structuredClone(fixture.outcomes) };
    }
    async runSensitivity() { throw new Error("The sample fixture does not include a sensitivity run. Connect the model-backed sensitivity endpoint."); }
}
