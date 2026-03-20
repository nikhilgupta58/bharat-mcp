import { GSTDataProvider, MCADataProvider, GSTINResult, CompanyResult } from './types';
import { extractPANFromGSTIN, validateGSTIN, redactPAN } from './validation';
import { ValidationError } from './errors';

export interface ResolvedEntity {
  gstin?: GSTINResult;
  pan: string;
  panRedacted: string;
  companies: CompanyResult[];
  resolvedVia: ('gstin' | 'pan' | 'cin')[];
  partial: boolean; // true if one source failed
}

export class EntityResolver {
  constructor(
    private gst: GSTDataProvider,
    private mca: MCADataProvider
  ) {}

  async resolve(input: { gstin?: string; cin?: string; pan?: string }): Promise<ResolvedEntity> {
    let pan: string;
    let gstResult: GSTINResult | undefined;
    const resolvedVia: ('gstin' | 'pan' | 'cin')[] = [];
    let partial = false;

    if (input.gstin) {
      if (!validateGSTIN(input.gstin)) throw new ValidationError('Invalid GSTIN');
      pan = extractPANFromGSTIN(input.gstin);
      resolvedVia.push('gstin');

      const [gst, companies] = await Promise.allSettled([
        this.gst.verifyGSTIN(input.gstin),
        this.mca.lookupByPAN(pan),
      ]);

      gstResult = gst.status === 'fulfilled' ? gst.value : undefined;
      if (gst.status === 'rejected') partial = true;

      const companyResults = companies.status === 'fulfilled' ? companies.value : [];
      if (companies.status === 'rejected') partial = true;

      return {
        gstin: gstResult,
        pan,
        panRedacted: redactPAN(pan),
        companies: companyResults,
        resolvedVia,
        partial,
      };
    }

    if (input.pan) {
      pan = input.pan.toUpperCase();
      resolvedVia.push('pan');
      const companies = await this.mca
        .lookupByPAN(pan)
        .catch(() => {
          partial = true;
          return [] as CompanyResult[];
        });
      return { pan, panRedacted: redactPAN(pan), companies, resolvedVia, partial };
    }

    if (input.cin) {
      resolvedVia.push('cin');
      // CIN does not embed a PAN — return partial result with empty pan
      pan = '';
      return { pan, panRedacted: '', companies: [], resolvedVia, partial: true };
    }

    throw new ValidationError('At least one of gstin, cin, or pan is required');
  }
}
