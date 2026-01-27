/**
 * Input Validation Schemas
 * 
 * Zod schemas for validating API inputs.
 * Using Zod for type-safe runtime validation.
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const emailSchema = z.string().email('Invalid email address').toLowerCase();

export const companyIdSchema = z.string().min(1, 'Company ID is required');

export const userIdSchema = z.string().min(1, 'User ID is required');

// =============================================================================
// LEAD SCHEMAS
// =============================================================================

export const leadStatusSchema = z.enum([
  'New',
  'Contacted',
  'Qualified',
  'Proposal',
  'Negotiation',
  'Closed',
  'Lost',
]);

export const createLeadSchema = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Business name too long'),
  contactName: z.string().max(100, 'Contact name too long').optional(),
  email: emailSchema.optional(),
  phone: z
    .string()
    .max(20, 'Phone number too long')
    .regex(/^[\d\s\-+()]*$/, 'Invalid phone format')
    .optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  status: leadStatusSchema.default('New'),
  notes: z.string().max(5000, 'Notes too long').optional(),
  industry: z.string().max(100, 'Industry too long').optional(),
  dealValue: z.number().min(0, 'Deal value cannot be negative').optional(),
  companyId: companyIdSchema.optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string().min(1, 'Lead ID is required'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// =============================================================================
// TEAM SCHEMAS
// =============================================================================

export const teamRoleSchema = z.enum(['admin', 'manager', 'rep']);

export const inviteTeamMemberSchema = z.object({
  companyId: companyIdSchema,
  companyName: z.string().min(1, 'Company name is required').max(200),
  email: emailSchema,
  role: teamRoleSchema,
  invitedBy: userIdSchema,
  invitedByName: z.string().max(100).optional(),
});

export const acceptInviteSchema = z.object({
  companyId: companyIdSchema,
  inviteId: z.string().min(1, 'Invite ID is required'),
});

export type InviteTeamMemberInput = z.infer<typeof inviteTeamMemberSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// =============================================================================
// COMPANY SCHEMAS
// =============================================================================

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200, 'Company name too long'),
  settings: z
    .object({
      industry: z.string().max(100).optional(),
      persona: z.enum(['professional', 'friendly', 'casual']).optional(),
    })
    .optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// =============================================================================
// EMAIL SCHEMAS
// =============================================================================

export const sendEmailSchema = z.object({
  to: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Body is required').max(50000, 'Email body too long'),
  leadId: z.string().optional(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// =============================================================================
// ACTIVITY SCHEMAS
// =============================================================================

export const activityTypeSchema = z.enum([
  'email',
  'call',
  'meeting',
  'note',
  'task',
  'sms',
]);

export const createActivitySchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  type: activityTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(5000, 'Description too long').optional(),
  dueDate: z.number().optional(),
  completed: z.boolean().default(false),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

// =============================================================================
// SETTINGS SCHEMAS
// =============================================================================

export const updateSettingsSchema = z.object({
  industry: z.string().max(100).optional(),
  persona: z.enum(['professional', 'friendly', 'casual']).optional(),
  qualificationRules: z.array(z.string().max(500)).max(20).optional(),
  prompts: z
    .object({
      research: z.string().max(2000).optional(),
      qualification: z.string().max(2000).optional(),
    })
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// =============================================================================
// EMAIL CONFIG SCHEMAS
// =============================================================================

export const updateEmailConfigSchema = z.object({
  sendgridApiKey: z.string().optional(),
  fromEmail: emailSchema.optional(),
  fromName: z.string().max(100).optional(),
});

export type UpdateEmailConfigInput = z.infer<typeof updateEmailConfigSchema>;
