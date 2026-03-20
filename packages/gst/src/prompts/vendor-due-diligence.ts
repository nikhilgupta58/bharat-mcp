export const vendorDueDiligencePrompt = {
  name: 'vendor_due_diligence',
  description:
    'Run a comprehensive vendor due diligence check by GSTIN, cross-referencing GST and MCA data with risk scoring.',
  arguments: [
    { name: 'gstin', description: 'GSTIN of the vendor to verify', required: true },
    {
      name: 'include_directors',
      description: 'Include director network analysis',
      required: false,
    },
  ],
}

export function buildVendorDueDiligenceMessages(
  gstin: string,
  includeDirectors: boolean = false,
) {
  return {
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Perform a comprehensive vendor due diligence for GSTIN: ${gstin}

Please execute the following steps:
1. Verify the GSTIN using gstin_verify tool
2. Extract the PAN from the GSTIN and look up the company using company_lookup tool
3. Check MCA compliance using company_compliance_check tool
4. Check GST return filing status using gst_return_status tool
${includeDirectors ? '5. Map the director network using director_network_map tool' : ''}

After gathering all data, provide a structured report with:
- Entity Summary (name, status, registration details)
- GST Health (filing status, compliance flags)
- Corporate Health (MCA status, capital, compliance)
${includeDirectors ? '- Director Network (associated companies, potential conflicts)' : ''}
- Risk Assessment (overall risk score with explanation)
- Recommendations (specific actions based on findings)

Use Hindi translation if the user's locale is set to Hindi.`,
        },
      },
    ],
  }
}
