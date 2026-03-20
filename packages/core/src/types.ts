// ---------------------------------------------------------------------------
// Shared metadata and generic wrapper
// ---------------------------------------------------------------------------

export interface SourceMeta {
  adapter: string;
  cached: boolean;
  fetchedAt: string; // ISO 8601
  latencyMs: number;
  partial: boolean;
  locale: string;
}

export interface ToolResponse<T> {
  data: T;
  _meta: SourceMeta;
}

// ---------------------------------------------------------------------------
// Adapter and DI interfaces
// ---------------------------------------------------------------------------

export interface DataAdapter<TQuery, TResult> {
  name: string;
  fetch(query: TQuery): Promise<TResult>;
  healthCheck(): Promise<boolean>;
}

export interface GSTDataProvider {
  verifyGSTIN(gstin: string): Promise<GSTINResult>;
  getReturnStatus(gstin: string, period?: string): Promise<ReturnStatusResult>;
}

export interface MCADataProvider {
  lookupByPAN(pan: string): Promise<CompanyResult[]>;
  getComplianceStatus(cin: string): Promise<ComplianceResult>;
}

// ---------------------------------------------------------------------------
// GST result types
// ---------------------------------------------------------------------------

export interface GSTINResult {
  gstin: string;
  legalName: string;
  tradeName: string;
  status: 'Active' | 'Cancelled' | 'Suspended' | 'Inactive';
  registrationDate: string;
  lastUpdated: string;
  constitutionOfBusiness: string;
  taxpayerType: string;
  address: string;
  state: string;
  pincode: string;
  natureOfBusiness: string[];
  filingStatus?: FilingPeriod[];
}

export interface FilingPeriod {
  period: string; // e.g. "042024"
  type: string;   // e.g. "GSTR3B"
  status: 'Filed' | 'Not Filed' | 'NA';
  filedDate?: string;
}

export interface ReturnStatusResult {
  gstin: string;
  returns: FilingPeriod[];
}

export interface HSNResult {
  hsn: string;
  description: string;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  cessRate: number;
  effectiveDate: string;
}

export interface GSTRateResult {
  goodsOrServices: 'Goods' | 'Services';
  description: string;
  hsn: string;
  igstRate: number;
  cgstRate: number;
  sgstRate: number;
  chapter: string;
}

// ---------------------------------------------------------------------------
// MCA result types
// ---------------------------------------------------------------------------

export interface CompanyResult {
  cin: string;
  companyName: string;
  registrationNumber: string;
  companyCategory: string;
  companySubcategory: string;
  classOfCompany: string;
  dateOfIncorporation: string;
  registeredAddress: string;
  email: string;
  authorizedCapital: number;
  paidUpCapital: number;
  companyStatus: 'Active' | 'Strike Off' | 'Under Liquidation' | 'Dormant';
  lastAGMDate?: string;
  lastBalanceSheetDate?: string;
  complianceStatus: string;
  whetherListed: boolean;
}

export interface DirectorResult {
  din: string;
  name: string;
  designation: string;
  dateOfAppointment: string;
  dateOfCessation?: string;
  pan?: string;
  companies: string[];
}

export interface ComplianceResult {
  cin: string;
  filings: ComplianceFiling[];
  lastUpdated: string;
  overallStatus: 'Compliant' | 'Non-Compliant' | 'Partial';
}

export interface ComplianceFiling {
  formType: string;
  period: string;
  filedDate?: string;
  status: 'Filed' | 'Not Filed' | 'Pending';
  dueDate: string;
}

// ---------------------------------------------------------------------------
// Risk types
// ---------------------------------------------------------------------------

export interface RiskSignal {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  source: string;
}

export interface RiskScore {
  score: number; // 0-10
  confidence: 'high' | 'medium' | 'low';
  signalsAvailable: number;
  signalsTotal: number;
  flags: RiskSignal[];
  summary: string;
}
