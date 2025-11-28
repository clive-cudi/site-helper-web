# Send Invitation Edge Function

This Supabase Edge Function handles sending team member invitations for the RBAC system.

## Purpose

Allows business account owners and admins to invite new team members via email. The function:
- Validates the requester has permission (owner or admin role)
- Generates a unique invitation token
- Creates an invitation record in the database
- Sends a formatted email with an acceptance link
- Handles errors gracefully

## Request

**Method:** POST

**Headers:**
- `Authorization`: Bearer token from authenticated user
- `Content-Type`: application/json

**Body:**
```json
{
  "email": "newmember@example.com",
  "role": "admin",
  "businessAccountId": "uuid-of-business-account"
}
```

**Fields:**
- `email` (required): Email address of the person to invite
- `role` (required): Role to assign - must be "admin" or "editor"
- `businessAccountId` (required): UUID of the business account

## Response

**Success (200):**
```json
{
  "success": true,
  "invitation": {
    "id": "invitation-uuid",
    "email": "newmember@example.com",
    "role": "admin",
    "expires_at": "2025-12-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `400`: Missing required fields, invalid role, invalid email format, or user already invited
- `401`: Missing or invalid authorization
- `403`: User lacks permission (not owner or admin)
- `500`: Server error (database or email service failure)

## Environment Variables

Required environment variables:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `RESEND_API_KEY`: API key for Resend email service
- `APP_URL`: Base URL of the application (for invitation links)

## Email Service

Uses [Resend](https://resend.com) for sending invitation emails. The email includes:
- Business account name
- Role being assigned
- Acceptance link with unique token
- Expiration date (7 days from creation)
- Formatted HTML and plain text versions

## Security

- Verifies requester is authenticated via Supabase auth
- Checks requester has owner or admin role in the business account
- Validates email format
- Prevents duplicate invitations
- Uses secure random UUID for tokens
- Enforces 7-day expiration on invitations

## Testing

To test locally:

1. Set up environment variables in `.env.local`
2. Deploy the function: `supabase functions deploy send-invitation`
3. Call the function with a valid auth token:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-invitation \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "role": "editor",
    "businessAccountId": "your-business-account-id"
  }'
```

## Related Functions

- `accept-invitation`: Processes invitation acceptance (Task 12)
- Related tables: `invitations`, `team_members`, `business_accounts`
