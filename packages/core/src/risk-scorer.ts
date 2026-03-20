import { RiskSignal, RiskScore, GSTINResult, CompanyResult, ComplianceResult } from './types';

export class RiskScorer {
  score(signals: {
    gstResult?: GSTINResult;
    companyResult?: CompanyResult;
    complianceResult?: ComplianceResult;
    returnsFiled?: boolean;
    returnsOverdue?: number;
  }): RiskScore {
    const flags: RiskSignal[] = [];
    let signalsAvailable = 0;
    const signalsTotal = 5;

    // Signal 1: GSTIN status (critical)
    if (signals.gstResult) {
      signalsAvailable++;
      if (signals.gstResult.status !== 'Active') {
        flags.push({
          source: 'gst',
          code: 'gstin_status',
          severity: 'critical',
          description: `GSTIN is ${signals.gstResult.status}`,
        });
      }
    }

    // Signal 2: Returns overdue (high)
    if (signals.returnsOverdue !== undefined) {
      signalsAvailable++;
      if (signals.returnsOverdue > 0) {
        flags.push({
          source: 'gst',
          code: 'returns_overdue',
          severity: 'high',
          description: `${signals.returnsOverdue} GST returns overdue`,
        });
      }
    }

    // Signal 3: Company status (critical)
    if (signals.companyResult) {
      signalsAvailable++;
      if (signals.companyResult.companyStatus !== 'Active') {
        flags.push({
          source: 'mca',
          code: 'company_status',
          severity: 'critical',
          description: `Company is ${signals.companyResult.companyStatus}`,
        });
      }
    }

    // Signal 4: MCA compliance (high)
    if (signals.complianceResult) {
      signalsAvailable++;
      const overdue = signals.complianceResult.filings.filter(
        (f) => f.status === 'Not Filed' || f.status === 'Pending'
      );
      if (overdue.length > 0) {
        flags.push({
          source: 'mca',
          code: 'mca_compliance',
          severity: 'high',
          description: `${overdue.length} MCA filings overdue`,
        });
      }
    }

    // Signal 5: Capital adequacy (low)
    if (signals.companyResult && signals.companyResult.paidUpCapital > 0) {
      signalsAvailable++;
      if (signals.companyResult.paidUpCapital < 100000) {
        flags.push({
          source: 'mca',
          code: 'low_capital',
          severity: 'low',
          description: 'Paid-up capital below \u20b91,00,000',
        });
      }
    }

    // Calculate score: 0 = safe, 10 = highest risk
    const weights: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0.5, info: 0.1 };
    const riskPoints = flags.reduce((sum, f) => sum + (weights[f.severity] ?? 0), 0);
    const maxPoints = 3 + 2 + 3 + 2 + 0.5; // all flags triggered simultaneously
    const score = Math.min(10, Math.round((riskPoints / maxPoints) * 10 * 10) / 10);

    const confidence: RiskScore['confidence'] =
      signalsAvailable >= 4 ? 'high' : signalsAvailable >= 2 ? 'medium' : 'low';

    const greenSignals = signalsAvailable - flags.length;
    const summary = this.buildSummary(score, confidence, flags, greenSignals, signalsAvailable);

    return { score, confidence, signalsAvailable, signalsTotal, flags, summary };
  }

  private buildSummary(
    score: number,
    confidence: string,
    flags: RiskSignal[],
    green: number,
    total: number
  ): string {
    const level = score >= 7 ? 'High Risk' : score >= 4 ? 'Moderate Risk' : 'Low Risk';
    let summary = `${level} (${score}/10, ${confidence} confidence). `;
    if (green > 0) summary += `${green} of ${total} signals are green. `;
    if (flags.length > 0) {
      summary += 'Red flags: ' + flags.map((f) => f.description).join('; ') + '.';
    } else {
      summary += 'No red flags detected.';
    }
    return summary;
  }
}
