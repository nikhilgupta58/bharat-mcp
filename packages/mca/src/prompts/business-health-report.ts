export const businessHealthReportPrompt = {
  name: 'business_health_report',
  description:
    'Generate a comprehensive business health report cross-referencing GST, MCA, and compliance data.',
  arguments: [
    { name: 'gstin', description: 'GSTIN (optional)', required: false },
    { name: 'cin', description: 'CIN (optional)', required: false },
    { name: 'pan', description: 'PAN (optional)', required: false },
    { name: 'include_directors', description: 'Include director analysis', required: false },
    {
      name: 'include_compliance_history',
      description: 'Include compliance history',
      required: false,
    },
  ],
}

export function buildBusinessHealthReportMessages(input: {
  gstin?: string
  cin?: string
  pan?: string
  includeDirectors?: boolean
  includeComplianceHistory?: boolean
}) {
  const { gstin, cin, pan, includeDirectors = false, includeComplianceHistory = false } = input

  const identifiers: string[] = []
  if (gstin) identifiers.push(`GSTIN: ${gstin}`)
  if (cin) identifiers.push(`CIN: ${cin}`)
  if (pan) identifiers.push(`PAN: ${pan}`)

  if (identifiers.length === 0) {
    throw new Error('At least one of gstin, cin, or pan must be provided.')
  }

  const identifierList = identifiers.join(', ')

  const gstSteps = gstin
    ? `- Verify the GSTIN using gstin_verify tool for GSTIN: ${gstin}
- Check GST return filing status using gst_return_status tool`
    : pan
      ? `- Look up GSTINs registered against PAN using gstin_by_pan tool for PAN: ${pan}`
      : ''

  const mcaSteps = cin
    ? `- Validate the CIN using cin_validate tool for CIN: ${cin}
- Look up company details using company_lookup tool`
    : pan
      ? `- Look up company details using company_lookup tool for PAN: ${pan}`
      : gstin
        ? `- Extract the PAN from the GSTIN and look up the company using company_lookup tool`
        : ''

  const complianceStep = `- Check MCA compliance filings using company_compliance_check tool${includeComplianceHistory ? ' (include full history)' : ''}`

  const directorStep = includeDirectors
    ? `- Map director network using director_network_map tool`
    : ''

  const directorSection = includeDirectors
    ? `
## Director Network
- List of directors with DINs
- Companies associated with each director
- Potential conflicts of interest or cross-directorships`
    : ''

  const complianceHistorySection = includeComplianceHistory
    ? `
## Compliance History
- Historical filing timeline
- Past defaults or penalties
- Trend analysis (improving/deteriorating)`
    : ''

  return {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Generate a comprehensive business health report for the entity identified by: ${identifierList}

## Steps to Execute

### 1. Entity Resolution
${gstSteps}
${mcaSteps}

### 2. GST Data Gathering
- Retrieve full GST profile including registration status, taxpayer type, and state
- Check return filing compliance and identify any gaps

### 3. MCA Data Gathering
${complianceStep}
${directorStep}

### 4. Risk Scoring
- Assess overall risk based on GST compliance, MCA filings, age, and capital
- Flag any high-risk indicators

## Report Structure

### Executive Summary
- Entity name, type, and status
- Overall health score (0-100)
- Key risk flags (if any)

## GST Health
- GSTIN status and registration date
- Return filing rate (last 12 months)
- Pending or defaulted returns
- Taxpayer category (Regular / Composition / QRMP)

## Corporate Health
- Company type, listing status, authorised vs paid-up capital
- MCA filing compliance (AOC-4, MGT-7 etc.)
- Date of incorporation and registered office state
${complianceHistorySection}
${directorSection}

## Risk Assessment
- Risk level: Low / Medium / High / Critical
- Score breakdown (GST: X/40, MCA: Y/40, Age: Z/20)
- Specific risk factors identified

## Recommendations
- Actionable items for the analyst or procurement team
- Suggested follow-up verifications

Use Hindi translation if the user's locale is set to Hindi.`,
        },
      },
    ],
  }
}
