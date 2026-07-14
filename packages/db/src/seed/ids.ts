/** Stable ULIDs for local dev seed — safe to reference in tests and docs. */

export const SEED_ORG_SLUG = 'relay-dev'

export const ids = {
  org: '01SEED00000000000000000001',

  users: {
    noel: '01SEED00000000000000000002',
    shaun: '01SEED00000000000000000003',
    priya: '01SEED00000000000000000004',
    marcus: '01SEED00000000000000000005',
    james: '01SEED00000000000000000006',
    viewer: '01SEED00000000000000000007',
    nadim: '01SEED00000000000000000008',
    syed: '01SEED00000000000000000009',
  },

  projects: {
    ctms: '01SEED00000000000000000010',
    etmf: '01SEED00000000000000000011',
    viewer: '01SEED00000000000000000012',
    ssoIam: '01SEED00000000000000000013',
    reporting: '01SEED00000000000000000014',
    apiGateway: '01SEED00000000000000000015',
    /** 7th project — richly-seeded explorable demo (folders/cases/plans/runs at
     * every lifecycle stage). See demo-project-seed.ts. Default landing project
     * for the fresh app and the "Create Demo Project" clone-source. */
    demo: '01SEED00000000000000000016',
    efeasibility: '01SEED00000000000000000017',
    gl: '01SEED00000000000000000018',
  },

  folders: {
    ctmsStudySetup: '01SEED00000000000000000100',
    ctmsVisits: '01SEED00000000000000000101',
    etmfUpload: '01SEED00000000000000000110',
    etmfQc: '01SEED00000000000000000111',
    viewerLoad: '01SEED00000000000000000120',
    viewerAnnotations: '01SEED00000000000000000121',
    ssoLogin: '01SEED00000000000000000130',
    ssoRoles: '01SEED00000000000000000131',
    reportingExport: '01SEED00000000000000000140',
    reportingScheduled: '01SEED00000000000000000141',
    apiRouting: '01SEED00000000000000000150',
    apiAuth: '01SEED00000000000000000151',
  },

  cases: {
    ctmsTc1001: '01SEED00000000000000000200',
    ctmsTc1002: '01SEED00000000000000000201',
    ctmsTc1003: '01SEED00000000000000000202',
    ctmsTc1004: '01SEED00000000000000000203',
    etmfTc1001: '01SEED00000000000000000210',
    etmfTc1002: '01SEED00000000000000000211',
    viewerTc1001: '01SEED00000000000000000220',
    ssoTc1001: '01SEED00000000000000000230',
    ssoTc1002: '01SEED00000000000000000231',
    reportingTc1001: '01SEED00000000000000000240',
    apiTc1001: '01SEED00000000000000000250',
  },

  steps: {
    ctmsTc1001S1: '01SEED00000000000000000300',
    ctmsTc1001S2: '01SEED00000000000000000301',
    ctmsTc1002S1: '01SEED00000000000000000302',
    ctmsTc1002S2: '01SEED00000000000000000303',
    ctmsTc1003S1: '01SEED00000000000000000304',
    ctmsTc1004S1: '01SEED00000000000000000305',
    etmfTc1001S1: '01SEED00000000000000000310',
    etmfTc1002S1: '01SEED00000000000000000311',
    viewerTc1001S1: '01SEED00000000000000000320',
    ssoTc1001S1: '01SEED00000000000000000330',
    ssoTc1002S1: '01SEED00000000000000000331',
    reportingTc1001S1: '01SEED00000000000000000340',
    apiTc1001S1: '01SEED00000000000000000350',
  },

  plans: {
    ctmsRegression: '01SEED00000000000000000400',
    etmfSmoke: '01SEED00000000000000000401',
    /** Demo Project plans — stable so validate scripts can target them. */
    demoCriticalPath: '01SEED00000000000000000410',
    demoFullRegression: '01SEED00000000000000000411',
  },

  planCases: {
    ctmsPc1: '01SEED00000000000000000500',
    ctmsPc2: '01SEED00000000000000000501',
    ctmsPc3: '01SEED00000000000000000502',
    ctmsPc4: '01SEED00000000000000000503',
    etmfPc1: '01SEED00000000000000000510',
    etmfPc2: '01SEED00000000000000000511',
  },

  projectRoles: {
    shaunCtms: '01SEED00000000000000000600',
    priyaCtms: '01SEED00000000000000000601',
    jamesEtmf: '01SEED00000000000000000602',
  },

  /** Admin-panel built-in role definitions (Phase G). Matched to the frontend
   * by NAME on sync, so these ids are internal-only; names must stay aligned
   * with rbac.ts's ADMIN_USER_ROLES. */
  roleDefinitions: {
    owner: '01SEED00000000000000000700',
    administrator: '01SEED00000000000000000701',
    projectAdmin: '01SEED00000000000000000702',
    editor: '01SEED00000000000000000703',
    runManager: '01SEED00000000000000000704',
    runExecutor: '01SEED00000000000000000705',
    viewer: '01SEED00000000000000000706',
  },

  /** Admin-panel demo API keys (Phase G). */
  apiKeys: {
    myApiKey: '01SEED00000000000000000710',
    ciKey: '01SEED00000000000000000711',
    automationKey: '01SEED00000000000000000712',
    noelDev: '01SEED00000000000000000713',
    monicaCi: '01SEED00000000000000000714',
    arvindhSync: '01SEED00000000000000000715',
    stagingKey: '01SEED00000000000000000716',
    syedExport: '01SEED00000000000000000717',
  },
} as const

/** Primary IDs for TestRunService.create() manual testing */
export const seedRefs = {
  // Default-roster change: only the Demo Project carries seeded plans/cases
  // now, so validation scripts target it instead of CTMS.
  projectId: ids.projects.demo,
  testPlanId: ids.plans.demoCriticalPath,
  createdBy: ids.users.shaun,
} as const
