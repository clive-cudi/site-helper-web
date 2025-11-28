# Implementation Plan

- [x] 1. Create database schema for multi-tenant RBAC
  - Create business_accounts table with owner_id and unique constraint
  - Create team_members table with role enum and status tracking
  - Create invitations table with token, expiration, and status fields
  - Create audit_logs table for tracking sensitive operations
  - Add indexes for business_account_id, user_id, role, and token fields
  - _Requirements: 1.1, 14.1, 14.2, 14.4_

- [x] 1.1 Add business_account_id to existing tables
  - Add business_account_id column to websites table as nullable initially
  - Create migration script to generate business accounts for existing users
  - Create team_member records with 'owner' role for existing users
  - Update websites records to reference new business_account_id
  - Make business_account_id NOT NULL after migration
  - Drop user_id column from websites table
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 2. Implement Row-Level Security policies for business accounts
  - Create RLS policy for team members to view their business account
  - Create RLS policy for owners to update business account
  - Create RLS policy for owners to delete business account
  - Enable RLS on business_accounts table
  - _Requirements: 1.1, 1.4, 8.1, 10.1, 10.4_

- [x] 2.1 Implement RLS policies for team members
  - Create RLS policy for team members to view other team members
  - Create RLS policy for owners and admins to add team members
  - Create RLS policy for owners and admins to update team members
  - Create RLS policy for owners and admins to remove team members (excluding owner)
  - Enable RLS on team_members table
  - _Requirements: 2.3, 2.4, 3.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2.2 Update RLS policies for websites table
  - Drop existing user_id-based RLS policies on websites
  - Create RLS policy for team members to view websites in their business account
  - Create RLS policy for owners and admins to insert websites
  - Create RLS policy for owners and admins to update websites
  - Create RLS policy for owners and admins to delete websites
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.4_

- [x] 2.3 Update RLS policies for knowledge_bases table
  - Drop existing RLS policies on knowledge_bases
  - Create RLS policy for all team members to view knowledge bases
  - Create RLS policy for all team members to update knowledge bases
  - Create RLS policy for owners and admins to delete knowledge bases
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.3_

- [x] 2.4 Update RLS policies for conversations and messages
  - Drop existing RLS policies on conversations
  - Create RLS policy for team members to view conversations in their business account
  - Create RLS policy for owners and admins to delete conversations
  - Update messages RLS policies to align with new conversation policies
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.2_

- [x] 3. Create permission service and types
  - Define Role type ('owner', 'admin', 'editor')
  - Define Permission type with all granular permissions
  - Create rolePermissions mapping object
  - Implement hasPermission function to check role against permission
  - Implement canManageRole function for role hierarchy validation
  - Export permission utilities for use throughout the app
  - _Requirements: 1.2, 2.1, 3.1, 5.1, 5.2, 5.3, 5.4_

- [x] 4. Create TeamContext for role and permission management
  - Define TeamMember, BusinessAccount, and TeamContextType interfaces
  - Create TeamContext with React.createContext
  - Implement TeamProvider component with state management
  - Load current user's team_member record on mount
  - Load business account information
  - Load all team members for the business account
  - Implement hasPermission wrapper function using permission service
  - Implement canManageRole wrapper function
  - Implement refreshTeam function to reload team data
  - Export useTeam hook for consuming context
  - _Requirements: 1.2, 5.1, 9.1, 14.2, 14.3_

- [x] 5. Create PermissionGuard component
  - Accept permission prop and children
  - Accept optional fallback prop for unauthorized state
  - Use useTeam hook to check permissions
  - Conditionally render children or fallback based on permission check
  - Export component for use throughout the app
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. Update App component to include TeamProvider
  - Wrap application with TeamProvider inside AuthProvider
  - Ensure TeamProvider has access to auth context
  - Update loading states to wait for both auth and team data
  - _Requirements: 1.1, 14.2_

- [x] 7. Update Dashboard navigation with role-based visibility
  - Define tabs array with permission requirements
  - Add 'Team' tab with 'view_team' permission
  - Filter visible tabs based on user permissions using hasPermission
  - Update tab rendering to show only permitted tabs
  - Add Users icon from lucide-react for Team tab
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Update WebsiteList component for business  account context
  - Update website queries to use business_account_id from TeamContext
  - Wrap "Add Website" button with PermissionGuard for 'manage_websites'
  - Wrap "Delete Website" button with PermissionGuard for 'manage_websites'
  - Update website creation to use business_account_id instead of user_id
  - _Requirements: 2.1, 8.1, 8.2, 8.3, 8.4_

- [x] 9. Update ConversationList component with permission guards
  - Update conversation queries to filter by business account websites
  - Wrap delete conversation button with PermissionGuard for 'delete_conversations'
  - Ensure all team members can view conversations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Create TeamManagement component
  - Create component with team member list display
  - Show team member email, role, status, and join date
  - Add role badge with color coding (owner: blue, admin: purple, editor: green)
  - Display current user's own team member record prominently
  - Wrap entire component with PermissionGuard for 'view_team'
  - _Requirements: 9.1, 9.4_

- [x] 10.1 Add team member invitation form
  - Create invitation form with email input and role selector
  - Add role dropdown with 'admin' and 'editor' options
  - Implement form validation for email format
  - Add "Send Invitation" button
  - Wrap form with PermissionGuard for 'manage_team'
  - Call send-invitation edge function on form submit
  - Display success/error messages
  - Refresh team data after successful invitation
  - _Requirements: 4.1, 4.2, 9.2_

- [x] 10.2 Add role change functionality
  - Add role dropdown for each team member (except owner)
  - Disable role change for owner
  - Implement role change handler that updates team_members table
  - Verify user has permission to change target role using canManageRole
  - Show confirmation dialog for role changes
  - Wrap role selector with PermissionGuard for 'manage_team'
  - Refresh team data after successful role change
  - _Requirements: 9.2, 9.3, 9.5_

- [x] 10.3 Add team member removal functionality
  - Add "Remove" button for each team member (except owner and self)
  - Implement removal handler that deletes team_member record
  - Show confirmation dialog with warning about access revocation
  - Wrap remove button with PermissionGuard for 'manage_team'
  - Verify user cannot remove owner or themselves
  - Refresh team data after successful removal
  - _Requirements: 9.3, 9.5_

- [x] 10.4 Display pending invitations
  - Query invitations table for pending invitations
  - Display list of pending invitations with email, role, and expiration
  - Add "Revoke" button for each pending invitation
  - Implement revoke handler that updates invitation status
  - Show invitation expiration countdown
  - Wrap revoke button with PermissionGuard for 'manage_team'
  - _Requirements: 4.1, 4.5_

- [x] 11. Create send-invitation edge function
  - Set up Deno function with CORS headers
  - Accept email, role, and businessAccountId in request body
  - Verify requester is owner or admin using team_members query
  - Return 403 if requester lacks permission
  - Generate unique invitation token using crypto.randomUUID()
  - Set expiration to 7 days from creation
  - Insert invitation record into invitations table
  - Construct invitation acceptance URL with token
  - Send invitation email with acceptance link
  - Return success response with invitation details
  - _Requirements: 4.1, 4.2, 4.3, 15.1, 15.2, 15.3_

- [x] 11.1 Implement email sending for invitations
  - Configure email service (Resend, SendGrid, or similar)
  - Create email template for team invitation
  - Include role information in email
  - Include expiration notice (7 days)
  - Include acceptance link with token
  - Add error handling for email delivery failures
  - _Requirements: 4.2_

- [x] 12. Create accept-invitation edge function
  - Set up Deno function with CORS headers
  - Accept token and userId in request body
  - Query invitations table for matching token with 'pending' status
  - Return 404 if invitation not found
  - Check if invitation is expired
  - Update invitation status to 'expired' if past expiration date
  - Return 400 if invitation is expired
  - Insert team_member record with specified role
  - Set joined_at timestamp to current time
  - Update invitation status to 'accepted' and set accepted_at
  - Return success response
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 13. Create invitation acceptance page
  - Create AcceptInvite component that reads token from URL params
  - Display invitation details (business name, role)
  - Show registration form if user not authenticated
  - Show accept button if user is authenticated
  - Call accept-invitation edge function on acceptance
  - Redirect to dashboard after successful acceptance
  - Handle expired invitation error with clear message
  - Handle invalid token error
  - _Requirements: 4.3, 4.4, 13.1, 13.2, 13.3_

- [ ] 14. Implement audit logging utility
  - Create createAuditLog function in shared utilities
  - Accept businessAccountId, userId, action, resourceType, resourceId, and details
  - Insert audit log record into audit_logs table
  - Export function for use in edge functions and other operations
  - _Requirements: 11.1, 11.2, 11.3_

- [ ] 14.1 Add audit logging to website operations
  - Call createAuditLog when website is created
  - Call createAuditLog when website is updated
  - Call createAuditLog when website is deleted
  - Include website name and URL in log details
  - _Requirements: 11.1_

- [ ] 14.2 Add audit logging to knowledge base operations
  - Call createAuditLog when knowledge base is updated
  - Include summary of changes in log details
  - _Requirements: 11.2_

- [ ] 14.3 Add audit logging to team member operations
  - Call createAuditLog when team member is added
  - Call createAuditLog when team member role is changed
  - Call createAuditLog when team member is removed
  - Include target user email and role in log details
  - _Requirements: 11.3_

- [ ] 15. Create AuditLog viewing component
  - Create AuditLog component to display audit log entries
  - Query audit_logs table filtered by business account
  - Display log entries in reverse chronological order
  - Show actor (user who performed action), action, resource type, and timestamp
  - Format timestamps for readability
  - Add pagination for large log lists
  - Wrap component with PermissionGuard for 'view_audit_logs'
  - Add to Settings tab in Dashboard
  - _Requirements: 11.4, 11.5_

- [ ] 16. Implement ownership transfer functionality
  - Create OwnershipTransfer component in Settings
  - Add team member selector (admins only)
  - Add confirmation dialog with security verification
  - Implement transfer handler that updates both team_member records
  - Change new owner's role to 'owner'
  - Change previous owner's role to 'admin'
  - Update business_accounts.owner_id to new owner
  - Send email notifications to both parties
  - Wrap component with PermissionGuard for owner role only
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 17. Add permission error handling throughout app
  - Create PermissionError component for displaying permission errors
  - Add try-catch blocks around permission-sensitive operations
  - Display user-friendly error messages when permission denied
  - Include role requirement in error message
  - Suggest contacting Owner or Admin for access
  - Log permission errors for security monitoring
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 18. Update scrape-website edge function for business accounts
  - Update website queries to use business_account_id
  - Verify requester has permission through team_members join
  - Ensure RLS policies are enforced
  - _Requirements: 10.4, 15.4, 15.5_

- [ ] 19. Update chat-assistant edge function for business accounts
  - Update website and knowledge base queries to use business_account_id
  - Ensure anonymous users can still create conversations
  - Verify RLS policies allow public access for chat widget
  - _Requirements: 10.2, 15.5_

- [ ] 20. Add business account name management
  - Add business account name field to Settings
  - Allow owner to update business account name
  - Display business account name in dashboard header
  - Wrap edit functionality with PermissionGuard for owner role
  - _Requirements: 1.2, 1.3_

- [ ] 21. Create data migration script for existing users
  - Write migration script to create business accounts for all existing users
  - Create team_member records with 'owner' role for each user
  - Update all websites to reference new business_account_id
  - Verify data integrity after migration
  - Create rollback script in case of issues
  - _Requirements: 14.1, 14.2, 14.3_

- [ ]* 22. Write unit tests for permission service
  - Test hasPermission function with all roles and permissions
  - Test canManageRole function with role hierarchy
  - Test edge cases (null role, invalid permission)
  - Verify permission mappings are correct
  - _Requirements: All_

- [ ]* 23. Write integration tests for RLS policies
  - Test owner can access all resources
  - Test admin cannot access billing or delete account
  - Test editor can only access knowledge bases and conversations
  - Test data isolation between business accounts
  - Test team member cannot access other business accounts' data
  - _Requirements: 8.1, 8.2, 8.3, 10.1, 10.2, 10.3, 10.4, 15.4, 15.5_

- [ ]* 24. Write end-to-end tests for invitation flow
  - Test sending invitation as owner
  - Test sending invitation as admin
  - Test accepting invitation creates team member
  - Test expired invitation cannot be accepted
  - Test invitation can be revoked
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 25. Write tests for team management operations
  - Test adding team members with different roles
  - Test changing team member roles
  - Test removing team members
  - Test owner cannot be removed
  - Test admin cannot modify owner
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 26. Perform security audit
  - Verify all RLS policies are correctly implemented
  - Test for privilege escalation vulnerabilities
  - Verify data isolation between business accounts
  - Test permission checks in all edge functions
  - Review audit logging coverage
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ]* 27. Add performance optimizations
  - Add database indexes for frequently queried fields
  - Optimize RLS policy queries
  - Cache team member data in frontend context
  - Implement lazy loading for audit logs
  - Test query performance with large datasets
  - _Requirements: All_

- [ ]* 28. Create user documentation
  - Document role permissions and capabilities
  - Create guide for inviting team members
  - Document ownership transfer process
  - Create troubleshooting guide for permission errors
  - _Requirements: All_
