/**
 * Email Templates for Lead Outreach
 * 
 * Three-tier system:
 * 1. System defaults (built-in)
 * 2. Company templates (admin customizes)
 * 3. User favorites (individual saves)
 */

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'outreach' | 'follow-up' | 'proposal' | 'check-in' | 'custom';
  subject: string;
  body: string;
  description?: string;
  isDefault?: boolean;
  companyId?: string;
  userId?: string;
  createdAt?: number;
  updatedAt?: number;
}

// ============================================
// SYSTEM DEFAULT TEMPLATES
// ============================================

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'cold-outreach',
    name: 'Cold Outreach',
    category: 'outreach',
    subject: 'Quick question about {{companyName}}',
    body: `Hi {{contactName}},

I came across {{companyName}} and was impressed by what you're doing in the {{industry}} space.

I help companies like yours {{valueProposition}}, and I think there might be an opportunity for us to work together.

Would you be open to a quick 15-minute call this week to explore if there's a fit?

Best regards,
{{senderName}}`,
    description: 'Initial outreach to a new prospect',
    isDefault: true,
  },
  {
    id: 'follow-up-no-response',
    name: 'Follow-up (No Response)',
    category: 'follow-up',
    subject: 'Re: Quick question about {{companyName}}',
    body: `Hi {{contactName}},

I wanted to follow up on my previous email. I know things get busy, so I thought I'd reach out again.

I believe we could help {{companyName}} {{valueProposition}}.

Is there a better time to connect, or would you prefer I reach out to someone else on your team?

Thanks,
{{senderName}}`,
    description: 'Second touch after no response',
    isDefault: true,
  },
  {
    id: 'after-meeting',
    name: 'After Meeting',
    category: 'follow-up',
    subject: 'Great speaking with you, {{contactName}}!',
    body: `Hi {{contactName}},

Thank you for taking the time to speak with me today. I really enjoyed learning more about {{companyName}} and the challenges you're facing.

As discussed, here's a quick summary:
• [Key point 1]
• [Key point 2]
• [Next steps]

I'll follow up [timeframe] with more details. In the meantime, feel free to reach out if you have any questions.

Best,
{{senderName}}`,
    description: 'Follow-up after an initial meeting',
    isDefault: true,
  },
  {
    id: 'proposal-sent',
    name: 'Proposal Sent',
    category: 'proposal',
    subject: 'Proposal for {{companyName}} - {{proposalTitle}}',
    body: `Hi {{contactName}},

As promised, please find attached our proposal for {{companyName}}.

Key highlights:
• [Benefit 1]
• [Benefit 2]
• [Investment/Timeline]

I'd love to walk you through this in detail. Would you have 30 minutes this week to discuss?

Looking forward to your feedback.

Best regards,
{{senderName}}`,
    description: 'Email accompanying a proposal',
    isDefault: true,
  },
  {
    id: 'check-in-after-quote',
    name: 'Check-in After Quote',
    category: 'check-in',
    subject: 'Checking in on the proposal for {{companyName}}',
    body: `Hi {{contactName}},

I wanted to check in and see if you had a chance to review the proposal I sent over.

Do you have any questions I can help clarify? I'm happy to jump on a quick call or adjust anything based on your feedback.

Let me know what works best for you.

Best,
{{senderName}}`,
    description: 'Gentle follow-up after sending a quote',
    isDefault: true,
  },
  {
    id: 'breakup-email',
    name: 'Breakup Email',
    category: 'follow-up',
    subject: 'Should I close your file?',
    body: `Hi {{contactName}},

I've reached out a few times but haven't heard back, so I wanted to check if you're still interested in exploring how we might help {{companyName}}.

If now isn't the right time, I completely understand. Just let me know, and I'll close your file for now.

If things change down the road, I'd be happy to reconnect.

Thanks for your time,
{{senderName}}`,
    description: 'Final attempt before closing the loop',
    isDefault: true,
  },
];

// ============================================
// TEMPLATE VARIABLE REPLACEMENT
// ============================================

export interface TemplateVariables {
  contactName?: string;
  companyName?: string;
  industry?: string;
  senderName?: string;
  valueProposition?: string;
  proposalTitle?: string;
  [key: string]: string | undefined;
}

/**
 * Replace template variables with actual values
 */
export function applyTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    if (value) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  }
  
  // Replace any remaining variables with placeholder text
  result = result.replace(/\{\{(\w+)\}\}/g, '[$1]');
  
  return result;
}

/**
 * Get template with variables applied
 */
export function getPopulatedTemplate(
  template: EmailTemplate,
  variables: TemplateVariables
): { subject: string; body: string } {
  return {
    subject: applyTemplateVariables(template.subject, variables),
    body: applyTemplateVariables(template.body, variables),
  };
}

// ============================================
// TEMPLATE CATEGORIES
// ============================================

export const TEMPLATE_CATEGORIES = {
  outreach: { label: 'Cold Outreach', icon: '📤', color: 'blue' },
  'follow-up': { label: 'Follow-up', icon: '🔄', color: 'amber' },
  proposal: { label: 'Proposal', icon: '📋', color: 'purple' },
  'check-in': { label: 'Check-in', icon: '👋', color: 'green' },
  custom: { label: 'Custom', icon: '✏️', color: 'slate' },
} as const;

export type TemplateCategory = keyof typeof TEMPLATE_CATEGORIES;
