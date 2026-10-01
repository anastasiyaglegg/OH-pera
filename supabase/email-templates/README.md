# OH-pera authentication emails

Prepared locally; not yet applied to the hosted Supabase project.

Dashboard verified October 1, 2026: the current project cannot customize templates with the default email service. The dashboard offers upgrading to Pro to customize templates with Supabase’s email service, or configuring custom SMTP. No billing or SMTP settings have been changed.

In Supabase → Authentication → Emails → Templates:

| Template | Subject | Body file |
| --- | --- | --- |
| Confirm signup | Confirm your OH-pera email | confirmation.html |
| Reset password | Reset your OH-pera password | recovery.html |

Copy each HTML file into its matching template and save. Once eligible for template editing, preserve existing authentication/redirect settings. Keeping the default sender requires the Pro option shown in the dashboard. These files are not automatically deployed with the website.

Both buttons preserve Supabase’s `{{ .ConfirmationURL }}` variable. Do not replace it with a homepage or hardcoded invitation link. Email confirmation does not itself promise activated club membership.

Uses inline styles, presentation tables and system fonts without external assets. Rounded corners may fall back to square corners in older email clients.

After installation, check a confirmation email and a password-reset email sent to a controlled test account. Verify the links and the complete flows; a browser preview does not verify email delivery.
