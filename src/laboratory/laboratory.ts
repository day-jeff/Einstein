import * as yaml from 'js-yaml';

import {
    BlobLogger,
    Environment,
    IOrchestrator,
    IStorage,
    IWorker,
    RamDisk,
    Volume,
    World,
} from '../cloud';

import {
    encodeBenchmark,
    encodeCandidate,
    encodeSuite,
    encodeLog,
    createRunId
} from '../naming';

import { decryptSecrets, generateKeys, KeyPair } from '../secrets';
import { sleep } from '../utilities';

import {
    AnyDescription,
    BenchmarkDescription,
    CandidateDescription,
    ILaboratory,
    SuiteDescription,
    Kind,
} from './interfaces';

import { loadCandidate, loadSuite } from './loaders';

export class Laboratory implements ILaboratory {
    static image = {
        tag: 'labratory:1.0',
        create: () => Laboratory.entryPoint
    };

    // TODO: this should do a bind, not a connect.
    static async entryPoint(worker: IWorker): Promise<void> {
        worker.log(`Labratory.entryPoint()`);

        // TODO: following code is for scenario where CLI gives existing credentials
        // to Laboratory.
        // // Get private key from secrets.txt
        // const secrets =
        //     (await worker.getWorld().localStorage.readBlob('secrets/keys')).toString('utf-8');
        // console.log(`Labratory: secrets = "${secrets}"`);

        // Simulate server startup time.
        const startupDelaySeconds = 9;
        worker.log(`sleeping for ${startupDelaySeconds} seconds`);
        await sleep(startupDelaySeconds * 1000);
        worker.log('woke up');

        // TODO: get KeyPair from local storage instead.
        const keys: KeyPair = generateKeys();

        // Construct and bind service RPC stub. 
        const world = worker.getWorld();
        const myService = new Laboratory(keys, world);

        const env =  worker.getWorld().environment;
        // TODO: error check on port number parsing.
        const port = Number(env.get('port'));

        worker.bind(worker.getWorld(), myService, port);

        worker.log(`Labratory service running at ${world.hostname}:${port}`);
    }

    private keys: KeyPair;
    private world: World;

    // Convenience aliases
    private cloudStorage: IStorage;
    private orchestrator: IOrchestrator;

    constructor(keys: KeyPair, world: World) {
        this.keys = keys;
        this.world = world;

        // Convenience aliases
        this.cloudStorage = world.cloudStorage;
        this.orchestrator = world.orchestrator;
    }

    async getPublicKey(): Promise<string> {
        return this.keys.publicKey;
    }

    async create(description: AnyDescription): Promise<string> {
        switch (description.kind) {
            case Kind.BENCHMARK:
                return this.createBenchmark(description);
            case Kind.CANDIDATE:
                return this.createCandidate(description);
            case Kind.SUITE:
                return this.createSuite(description);
            default:
                const message = `Laboratory.create(): unsupported kind==="${description.kind}"`;
                this.world.logger.log(message);
                throw new TypeError(message);
        }
    }

    private async createBenchmark(description: BenchmarkDescription): Promise<string> {
        const encoded = encodeBenchmark(description.image);
        const buffer = Buffer.from(yaml.safeDump(description), 'utf8');
        // TODO: check for attempt blob overwrite.
        await this.cloudStorage.writeBlob(encoded, buffer, false);
        this.world.logger.log(`Uploaded benchmark schema to ${encoded}`);
        return encoded;
    }

    private async createCandidate(description: CandidateDescription): Promise<string> {
        const encoded = encodeCandidate(description.image);
        const buffer = Buffer.from(yaml.safeDump(description), 'utf8');
        // TODO: check for attempt blob overwrite.
        await this.cloudStorage.writeBlob(encoded, buffer, false);
        this.world.logger.log(`Uploaded candidate schema to ${encoded}`);
        return encoded;
    }

    private async createSuite(description: SuiteDescription): Promise<string> {
        const encoded = encodeSuite(description.name);
        const buffer = Buffer.from(yaml.safeDump(description), 'utf8');
        // TODO: check for attempt blob overwrite.
        await this.cloudStorage.writeBlob(encoded, buffer, false);
        this.world.logger.log(`Uploaded suite schema to ${encoded}`);
        return encoded;
    }

    async run(candidateId: string, suiteId: string): Promise<void> {
        this.world.logger.log(`run(${candidateId}, ${suiteId})`);

        let suiteData: SuiteDescription;
        try {
            suiteData = await loadSuite(suiteId, this.cloudStorage);
        } catch (e) {
            // TODO: only change exception when file not found.
            const message = `Cannot find suite ${suiteId}`;
            throw new TypeError(message);
        }

        let candidateData: CandidateDescription;
        try {
            candidateData = await loadCandidate(candidateId, this.cloudStorage);
        } catch (e) {
            // TODO: only change exception when file not found.
            const message = `Cannot find candidate ${candidateId}`;
            throw new TypeError(message);
        }

        if (suiteData.benchmarkId !== candidateData.benchmarkId) {
            const message = "Suite and Candidate benchmarks don't match.";
            this.world.logger.log(message);
            throw new TypeError(message);
        }

        const runId = createRunId();

        //
        // Decrypt candidate manifest secrets
        //
        decryptSecrets(candidateData, this.keys.privateKey);
        const yamlText = yaml.safeDump(candidateData);
        const secrets = new RamDisk();
        // TODO: use naming service for blob name
        await secrets.writeBlob(
            'spec.yaml',
            Buffer.from(yamlText, 'utf8'),
            true
        );
        const volume: Volume = {
            mount: '/secrets',
            storage: secrets
        };

        // Start the candidate container.
        // TODO: use naming service for host name
        const candidateHost = 'c' + runId;
        this.world.logger.log(`Starting candidate ${candidateId} on ${candidateHost}`);
        // Don't await createWorker(). Want to model separate process.
        this.orchestrator.createWorker(
            candidateHost,
            candidateId,
            this.cloudStorage,
            [ volume ],
            new Environment(),
            new BlobLogger(this.cloudStorage, candidateHost, encodeLog(candidateHost))
        );

        // Start the benchmark container.
        // TODO: use naming service for host name
        const benchmarkHost = 'b' + runId;
        this.world.logger.log(`Starting benchmark ${suiteData.benchmarkId} on ${benchmarkHost}`);
        // Don't await createWorker(). Want to model separate process.
        this.orchestrator.createWorker(
            benchmarkHost,
            suiteData.benchmarkId,
            this.cloudStorage,
            [],
            new Environment([
                ['candidate', candidateId],
                ['host', candidateHost],
                // TODO: use naming service for runId
                ['run', 'r' + runId],
                ['suite', suiteId],
            ]),
            new BlobLogger(this.cloudStorage, benchmarkHost, encodeLog(benchmarkHost))
        );
    }
}

// TODO: save for unit tests
// async function go() {
//     const keys = generateKeys();
//     const cloudStorage = new RamDisk();
//     const lab = new Laboratory(keys, cloudStorage);

//     const benchmark: BenchmarkDescription = {
//         name: 'Sample True_Or_False Benchmark',
//         description: 'A sample benchmark for boolean expressions evaluation.',
//         owner: 'Mike',
//         created: new Date().toISOString(),
//         image: 'myregistry.azurecr.io/true_or_false_benchmark:1.0'
//     };
//     const benchmarkId = await lab.createBenchmark(benchmark);

//     const suite: SuiteDescription = {
//         name: 'Sample True_Or_False Suite',
//         description: 'A sample benchmark for boolean expressions evaluation.',
//         owner: 'Mike',
//         created: new Date().toISOString(),
//         benchmarkId,
//         // domainData: [],
//         // testData: []
//     };
//     const suiteId = await lab.createSuite(suite);

//     const candidate: CandidateDescription = {
//         name: 'Sample True_Or_False Candidate',
//         description: 'A sample candidate that implements a boolean expression parser.',
//         owner: 'Mike',
//         created: new Date().toISOString(),
//         benchmarkId,
//         image: 'myregistry.azurecr.io/true_or_false_candidate:1.0'
//     };
//     const candidateId = await lab.createCandidate(candidate);

//     lab.run(candidateId, suiteId);
// }

// go();

///////////////////////////////////////////////////////////////////////////////
// TODO: Save for Analysis service

// async listBenchmarks(pattern: CandidateDescription): Promise<BenchmarkDescription[]> {
//     // TODO: implement wildcard matching
//     return [];
// }

// async listCandidates(pattern: CandidateDescription): Promise<CandidateDescription[]> {
//     // TODO: implement wildcard matching
//     return [];
// }

// async listSuites(pattern: SuiteDescription): Promise<BenchmarkDescription[]> {
//     // TODO: implement wildcard matching
//     return [];
// }
