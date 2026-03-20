import { DataAdapter, CompanyResult, DirectorResult, ComplianceResult } from '@bharat-mcp/core';
import { EntityNotFoundError } from '@bharat-mcp/core';
import fixtures from '../data/mock-fixtures.json';

// ---------------------------------------------------------------------------
// Types for fixture data
// ---------------------------------------------------------------------------

interface FixtureCompany extends CompanyResult {
  pan?: string;
  isLLP?: boolean;
  overdueFilings?: string[];
}

// ---------------------------------------------------------------------------
// Company Mock Adapter
// ---------------------------------------------------------------------------

export interface CompanyQuery {
  cin?: string;
  company_name?: string;
  pan?: string;
}

export class MCACompanyMockAdapter implements DataAdapter<CompanyQuery, CompanyResult[]> {
  readonly name = 'mca-company-mock';

  async fetch(query: CompanyQuery): Promise<CompanyResult[]> {
    const companies = fixtures.companies as FixtureCompany[];

    if (query.cin) {
      const upper = query.cin.toUpperCase();
      const found = companies.filter((c) => c.cin.toUpperCase() === upper);
      if (found.length === 0) {
        throw new EntityNotFoundError('Company', query.cin);
      }
      return found.map(toCompanyResult);
    }

    if (query.pan) {
      const upper = query.pan.toUpperCase();
      const cin = (fixtures.panToCIN as Record<string, string>)[upper];
      if (!cin) {
        throw new EntityNotFoundError('Company', query.pan);
      }
      const found = companies.filter((c) => c.cin === cin);
      if (found.length === 0) {
        throw new EntityNotFoundError('Company', query.pan);
      }
      return found.map(toCompanyResult);
    }

    if (query.company_name) {
      const needle = query.company_name.toLowerCase();
      const found = companies.filter((c) => c.companyName.toLowerCase().includes(needle));
      if (found.length === 0) {
        throw new EntityNotFoundError('Company', query.company_name);
      }
      return found.map(toCompanyResult);
    }

    return companies.map(toCompanyResult);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

function toCompanyResult(c: FixtureCompany): CompanyResult {
  return {
    cin: c.cin,
    companyName: c.companyName,
    registrationNumber: c.registrationNumber,
    companyCategory: c.companyCategory,
    companySubcategory: c.companySubcategory,
    classOfCompany: c.classOfCompany,
    dateOfIncorporation: c.dateOfIncorporation,
    registeredAddress: c.registeredAddress,
    email: c.email,
    authorizedCapital: c.authorizedCapital,
    paidUpCapital: c.paidUpCapital,
    companyStatus: c.companyStatus,
    lastAGMDate: c.lastAGMDate ?? undefined,
    lastBalanceSheetDate: c.lastBalanceSheetDate ?? undefined,
    complianceStatus: c.complianceStatus,
    whetherListed: c.whetherListed,
  };
}

// ---------------------------------------------------------------------------
// Director Mock Adapter
// ---------------------------------------------------------------------------

export interface DirectorQuery {
  din: string;
}

export class MCADirectorMockAdapter implements DataAdapter<DirectorQuery, DirectorResult> {
  readonly name = 'mca-director-mock';

  async fetch(query: DirectorQuery): Promise<DirectorResult> {
    const found = fixtures.directors.find((d) => d.din === query.din);
    if (!found) {
      throw new EntityNotFoundError('Director', query.din);
    }
    return {
      din: found.din,
      name: found.name,
      designation: found.designation,
      dateOfAppointment: found.dateOfAppointment,
      dateOfCessation: found.dateOfCessation ?? undefined,
      pan: found.pan,
      companies: found.companies,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Compliance Mock Adapter
// ---------------------------------------------------------------------------

export interface ComplianceQuery {
  cin: string;
}

export class MCAComplianceMockAdapter implements DataAdapter<ComplianceQuery, ComplianceResult> {
  readonly name = 'mca-compliance-mock';

  async fetch(query: ComplianceQuery): Promise<ComplianceResult> {
    const record = (fixtures.compliance as Record<string, ComplianceResult>)[query.cin];
    if (!record) {
      throw new EntityNotFoundError('ComplianceRecord', query.cin);
    }
    return record;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
