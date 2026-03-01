# apps/web (Optional Portal)

This app is an optional web portal for clinician/admin operations.

- Not the primary patient product
- Patient primary experience is `apps/mobile`

Primary responsibilities:
- clinician dashboard and patient review
- admin analytics and operations
- care team collaboration tools

Auth notes:
- web uses cookie session (`cmx_token`) for browser flows
- mobile uses API auth token flows
