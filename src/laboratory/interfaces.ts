export interface EntityDescription {
    name: string;
    description: string;
    owner: string;
    created: Date;
}

export interface BenchmarkDescription extends EntityDescription {
    containerBaseName: string;
    containerVersion: string;
}

export interface CandidateDescription extends EntityDescription {
    benchmarkId: string;
    containerBaseName: string;
    containerVersion: string;
}

// TODO: ISSUE: do suites refer to versioned or unversioned benchmark
// containers?
export interface SuiteDescription extends EntityDescription {
    benchmarkId: string;
    domainData: string[];
    testData: string[];
}

export interface RunDescription extends EntityDescription {
    runId: string;  // Probably a guid.
    benchmarkId: string;
    containerId: string;
    suiteId: string;
    results: string[];
}