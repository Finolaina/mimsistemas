# OpnForm API -- Complete Reference Guide

Instance: `https://forms.optihost.pro`
GitHub: `https://github.com/OpnForm/OpnForm`
Official Docs: `https://docs.opnform.com`
OpenAPI Spec: `https://github.com/OpnForm/OpnForm/blob/main/docs/api-reference/openapi.yaml`
Tech Stack: Laravel (PHP) backend, Nuxt.js frontend, PostgreSQL database

---

## 1. AUTHENTICATION

### 1.1 Personal Access Tokens (PAT) -- Primary API Auth

OpnForm uses **Laravel Sanctum** Personal Access Tokens for API authentication.

**Creating a token via UI:**
1. Sign in to OpnForm (`https://forms.optihost.pro`)
2. Go to Settings -> Access Tokens (`/home?user-settings=access-tokens`)
3. Click "Create new token"
4. Select name + abilities (scopes)
5. Copy the token -- it is shown only once

**Creating a token via API** (requires JWT auth first):
```
POST /api/settings/tokens
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "name": "My Integration Token",
  "abilities": ["forms-read", "forms-write", "workspaces-read"]
}
```

Response:
```json
{
  "token": "1|abc123def456...",
  "message": "Access token successfully created!"
}
```

**Using the token:**
```
Authorization: Bearer <access_token>
```

**Available Abilities (Scopes):**

| Ability | Grants |
|---------|--------|
| `workspaces-read` | List workspaces |
| `workspaces-write` | Create, update, delete workspaces |
| `workspace-users-read` | List members and invites |
| `workspace-users-write` | Manage members and invites |
| `forms-read` | List forms and submissions |
| `forms-write` | Create or modify forms and submissions |
| `manage-integrations` | Manage form integrations (webhooks) |

**Revoking a token:**
```
DELETE /api/settings/tokens/{tokenId}
Authorization: Bearer <jwt_token>
```

**Listing tokens:**
```
GET /api/settings/tokens
Authorization: Bearer <jwt_token>
```

### 1.2 JWT Authentication (Session-based, for UI interactions)

**Login:**
```
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword",
  "remember": false
}
```

Response:
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Register** (self-hosted: only the first user can self-register; subsequent users need invite):
```
POST /api/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecureP@ss1",
  "password_confirmation": "SecureP@ss1",
  "hear_about_us": "api"
}
```

Response:
```json
{
  "token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "new_user": true,
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" }
}
```

**Logout:**
```
POST /api/logout
Authorization: Bearer <jwt_token>
```

**Get current user:**
```
GET /api/user
Authorization: Bearer <jwt_or_pat_token>
```

**Password Reset:**
```
POST /api/password/email
{ "email": "user@example.com" }

POST /api/password/reset
{ "token": "...", "email": "...", "password": "...", "password_confirmation": "..." }
```

### 1.3 Base URL

For self-hosted instance: `https://forms.optihost.pro/api`
For cloud: `https://api.opnform.com`

All endpoints below are relative to the base URL. For the self-hosted instance, prefix all paths with `/api`.

### 1.4 Rate Limits

- 100 requests per minute per IP
- Exceeding returns `429 Too Many Requests`

### 1.5 Error Format

```json
{
  "message": "Validation failed.",
  "errors": {
    "title": ["The title field is required."]
  }
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation error |
| 401 | Missing or invalid token |
| 403 | Token lacks required ability |
| 404 | Resource not found |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Server error |

### 1.6 Pagination

List endpoints use `?page=N` query parameter. Response includes `meta` with `current_page`, `per_page`, `total`, `last_page`.

---

## 2. WORKSPACES API

### 2.1 List Workspaces
```
GET /open/workspaces
Authorization: Bearer <token>
Ability: workspaces-read
```
Response: Array of Workspace objects.

### 2.2 Create Workspace
```
POST /open/workspaces/create
Authorization: Bearer <token>
Ability: workspaces-write
Content-Type: application/json

{
  "name": "Design Team",
  "emoji": "paint"
}
```
Response `200`:
```json
{
  "message": "Workspace created.",
  "workspace_id": 7,
  "workspace": {
    "id": 7,
    "name": "Design Team",
    "icon": "paint",
    "settings": {},
    "max_file_size": 25,
    "is_readonly": false
  }
}
```

### 2.3 Update Workspace
```
PUT /open/workspaces/{workspaceId}
Authorization: Bearer <token>
Ability: workspaces-write (must be admin)

{
  "name": "Marketing Team",
  "emoji": "rocket"
}
```
Response `200`: Updated Workspace object.

### 2.4 Delete Workspace
```
DELETE /open/workspaces/{workspaceId}
Authorization: Bearer <token>
Ability: workspaces-write (must be admin)
```
Response `200`:
```json
{
  "message": "Workspace deleted.",
  "workspace_id": 12
}
```

### Workspace Schema
```json
{
  "id": 1,
  "name": "My Marketing Team",
  "icon": "rocket",
  "settings": {}
}
```

---

## 3. WORKSPACE USERS API

### 3.1 List Workspace Users
```
GET /open/workspaces/{workspaceId}/users
Authorization: Bearer <token>
Ability: workspace-users-read
```
Response: Array of `{ id, name, email, role }`.

### 3.2 List Workspace Invites
```
GET /open/workspaces/{workspaceId}/invites
Authorization: Bearer <token>
Ability: workspace-users-read
```
Response: Array of `{ id, email, role, status, valid_until }`.
- `status`: `"pending"` or `"accepted"`
- `role`: `"admin"`, `"user"`, or `"readonly"`

### 3.3 Add Workspace User
```
POST /open/workspaces/{workspaceId}/users/add
Authorization: Bearer <token>
Ability: workspace-users-write (must be admin)

{
  "email": "jane@example.com",
  "role": "user"
}
```
Roles: `admin`, `user`, `readonly`

Response `200`:
```json
{ "message": "User has been successfully added to workspace." }
```
Or: `"Registration invitation email sent to user."` (if user doesn't exist yet)
Or: `"User is already in workspace."`

### 3.4 Remove Workspace User
```
DELETE /open/workspaces/{workspaceId}/users/{userId}/remove
Authorization: Bearer <token>
Ability: workspace-users-write
```

### 3.5 Update Workspace User Role
```
PUT /open/workspaces/{workspaceId}/users/{userId}/update-role
Authorization: Bearer <token>
Ability: workspace-users-write (must be admin)

{ "role": "readonly" }
```

### 3.6 Leave Workspace
```
POST /open/workspaces/{workspaceId}/leave
Authorization: Bearer <token>
Ability: workspace-users-write
```

### 3.7 Resend Workspace Invite
```
POST /open/workspaces/{workspaceId}/invites/{inviteId}/resend
Authorization: Bearer <token>
Ability: workspace-users-write
```

### 3.8 Cancel Workspace Invite
```
DELETE /open/workspaces/{workspaceId}/invites/{inviteId}/cancel
Authorization: Bearer <token>
Ability: workspace-users-write
```

---

## 4. FORMS API

### 4.1 List Workspace Forms
```
GET /open/workspaces/{workspaceId}/forms?page=1
Authorization: Bearer <token>
Ability: forms-read
```
Returns **lightweight summaries** (no `properties` array). Use Get Form for full details.

Response `200`:
```json
{
  "data": [
    {
      "id": 42,
      "slug": "customer-feedback",
      "title": "Customer Feedback",
      "visibility": "public",
      "tags": ["feedback"],
      "views_count": 1250,
      "submissions_count": 15,
      "created_at": "2024-11-15T10:30:00+00:00",
      "updated_at": "2025-01-02T14:25:00+00:00",
      "last_edited_human": "2 hours ago",
      "closes_at": null,
      "is_closed": false,
      "max_submissions_count": null,
      "max_number_of_submissions_reached": false,
      "is_pro": true,
      "workspace_id": 1,
      "share_url": "https://forms.optihost.pro/forms/customer-feedback"
    }
  ],
  "meta": { "current_page": 1, "per_page": 10, "total": 1 }
}
```

### 4.2 Get Form (Full Details)
```
GET /open/forms/{slug}
Authorization: Bearer <token>
Ability: forms-read
```
`slug` can be the human-readable slug or UUID.

Response `200`: Full Form object including `properties` array.

### 4.3 Create Form
```
POST /open/forms
Authorization: Bearer <token>
Ability: forms-write
Content-Type: application/json

{
  "workspace_id": 1,
  "title": "Event Registration",
  "visibility": "public",
  "language": "en",
  "properties": [
    {
      "id": "field-1",
      "type": "text",
      "name": "First name",
      "required": true,
      "placeholder": "Enter your name",
      "width": "1/2"
    },
    {
      "id": "field-2",
      "type": "email",
      "name": "Email",
      "required": true,
      "placeholder": "name@example.com",
      "width": "1/2"
    }
  ]
}
```

Response `201`: Full Form object with generated `id` and `slug`.

### 4.4 Update Form
```
PUT /open/forms/{id}
Authorization: Bearer <token>
Ability: forms-write
Content-Type: application/json
```

**IMPORTANT:** The update endpoint requires ALL of these fields in every request, even if you only want to change one field:

| Required Field | Type | Description |
|---|---|---|
| `title` | string | Form title (max 60 chars) |
| `visibility` | string | `"public"`, `"draft"`, `"closed"` |
| `language` | string | Two-letter ISO code |
| `theme` | string | `"default"`, `"simple"`, `"notion"` |
| `presentation_style` | string | How form is presented |
| `width` | string | `"centered"` or `"full"` |
| `size` | string | `"sm"`, `"md"`, `"lg"` |
| `border_radius` | string | `"none"`, `"small"`, `"full"` |
| `dark_mode` | string | `"light"`, `"dark"`, `"auto"` |
| `color` | string | Hex color (e.g. `"#3b82f6"`) |
| `uppercase_labels` | boolean | |
| `no_branding` | boolean | |
| `transparent_background` | boolean | |
| `properties` | array | **Must NOT be empty** |

**Recommended update pattern:**
1. `GET /open/forms/{slug}` to fetch current state
2. Modify only the fields you need
3. `PUT /open/forms/{id}` with the complete form object

Response `200`: Updated Form object.

### 4.5 Delete Form
```
DELETE /open/forms/{id}
Authorization: Bearer <token>
Ability: forms-write
```
Response `204`: No content.

### 4.6 Duplicate Form
```
POST /open/forms/{form}/duplicate
Authorization: Bearer <jwt_token>
```

### 4.7 Regenerate Form Link
```
PUT /open/forms/{form}/regenerate-link/{option}
Authorization: Bearer <jwt_token>
```
Where `option` is `uuid` or `slug`.

### Form Schema (Complete)
```json
{
  "id": 42,
  "slug": "customer-feedback",
  "workspace_id": 1,
  "title": "Customer Feedback",
  "visibility": "public",
  "tags": ["feedback", "support"],
  "language": "en",
  "custom_domain": null,

  "theme": "default",
  "font_family": null,
  "color": "#3b82f6",
  "dark_mode": "light",
  "width": "centered",
  "size": "md",
  "border_radius": "small",
  "layout_rtl": false,
  "uppercase_labels": false,

  "cover_picture": null,
  "logo_picture": null,
  "no_branding": false,
  "transparent_background": false,

  "submit_button_text": "Submit",
  "submitted_text": "Thank you!",
  "redirect_url": null,
  "re_fillable": false,
  "re_fill_button_text": "Fill Again",
  "confetti_on_submission": false,
  "show_progress_bar": false,

  "closes_at": null,
  "closed_text": null,
  "max_submissions_count": null,
  "max_submissions_reached_text": null,

  "auto_save": false,
  "auto_focus": false,
  "enable_partial_submissions": false,
  "editable_submissions": false,
  "editable_submissions_button_text": "Edit",

  "password": null,
  "use_captcha": false,
  "captcha_provider": "recaptcha",

  "can_be_indexed": false,
  "seo_meta": null,
  "custom_code": null,
  "database_fields_update": null,

  "properties": []
}
```

---

## 5. FORM FIELD TYPES (FormProperty)

### 5.1 FormProperty Base Schema

Every property/field has these base attributes:

```json
{
  "id": "uuid-string",
  "type": "text",
  "name": "Field Label",
  "help": "Help text shown below field",
  "hidden": false,
  "required": true,
  "placeholder": "Type here...",
  "width": "full"
}
```

`width` values: `"full"`, `"1/2"`, `"1/3"`, `"2/3"`, `"1/4"`, `"3/4"`

The schema uses `additionalProperties: true`, so each type adds its own specific fields.

### 5.2 All Available Field Types

#### INPUT FIELDS (is_input: true)

| Type | Title | Default Values / Notes |
|------|-------|----------------------|
| `text` | Text | `multi_lines: false`, `max_char_limit: 2000`, `placeholder: "Type your answer"`. Set `multi_lines: true` for textarea. |
| `rich_text` | Rich Text | `max_char_limit: 2000`, `placeholder: "Write your answer"`. HTML rich text editor. |
| `email` | Email | `max_char_limit: 2000`, `placeholder: "name@example.com"` |
| `url` | URL | `max_char_limit: 2000`, `placeholder: "https://example.com"` |
| `phone_number` | Phone | `placeholder: "+1 202 555 0142"` |
| `number` | Number | `placeholder: "Type a number"` |
| `date` | Date | No special defaults. |
| `select` | Select (dropdown) | Requires `select.options` array: `[{"name": "Option 1", "id": "Option 1"}, ...]`, `placeholder: "Select an option"` |
| `radio` | Radio Button | Same as `select` but with `without_dropdown: true`. Options in `select.options`. Actually renders as select input. |
| `multi_select` | Multi-select | Requires `multi_select.options` array: `[{"name": "Option 1", "id": "Option 1"}, ...]`, `placeholder: "Select options"` |
| `checkbox` | Checkbox | Boolean true/false. No special defaults. |
| `toggle_switch` | Toggle Switch | Renders as checkbox with `use_toggle_switch: true`. |
| `rating` | Rating | `rating_max_value: 5` |
| `scale` | Scale | `scale_min_value: 1`, `scale_max_value: 5`, `scale_step_value: 1` |
| `slider` | Slider | `slider_min_value: 0`, `slider_max_value: 50`, `slider_step_value: 1` |
| `matrix` | Matrix | `rows: ["Row 1"]`, `columns: [1, 2, 3]`, `selection_data: {"Row 1": null}` |
| `files` | File Upload | No special defaults. |
| `signature` | Signature | Canvas signature field. |
| `barcode` | Barcode Reader | `decoders: ["qr_reader", "ean_reader", "ean_8_reader"]` |
| `qrcode` | QR Code Reader | `decoders: ["qr_reader"]`. Actually uses barcode input. |
| `password` | Password | `secret_input: true`, `multi_lines: false`, `max_char_limit: 2000`. Actually uses text input. |
| `payment` | Payment (Stripe) | Requires auth. Max 1 per form. Not available in self-hosted. |

#### LAYOUT/DISPLAY BLOCKS (is_input: false)

| Type | Title | Notes |
|------|-------|-------|
| `nf-text` | Text Block | Static text/HTML content display. |
| `nf-page-break` | Page Break | Multi-page forms (classic mode only). |
| `nf-divider` | Divider | Horizontal line separator (classic mode only). |
| `nf-image` | Image | Static image display (classic mode only). |
| `nf-video` | Video | Embedded video. |
| `nf-code` | Code Block | Display code snippet. |

### 5.3 Field Type Examples

**Text field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "text",
  "name": "Full Name",
  "required": true,
  "placeholder": "Enter your full name",
  "multi_lines": false,
  "max_char_limit": 200,
  "width": "full"
}
```

**Select field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "type": "select",
  "name": "Department",
  "required": true,
  "placeholder": "Choose department",
  "select": {
    "options": [
      { "name": "Engineering", "id": "Engineering" },
      { "name": "Marketing", "id": "Marketing" },
      { "name": "Sales", "id": "Sales" }
    ]
  },
  "width": "1/2"
}
```

**Multi-select field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "multi_select",
  "name": "Skills",
  "required": false,
  "multi_select": {
    "options": [
      { "name": "JavaScript", "id": "JavaScript" },
      { "name": "Python", "id": "Python" },
      { "name": "Go", "id": "Go" }
    ]
  }
}
```

**Rating field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "type": "rating",
  "name": "How would you rate our service?",
  "required": true,
  "rating_max_value": 5
}
```

**Scale field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "type": "scale",
  "name": "Satisfaction",
  "scale_min_value": 1,
  "scale_max_value": 10,
  "scale_step_value": 1
}
```

**Date field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "type": "date",
  "name": "Event Date",
  "required": true
}
```

**File upload field:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440006",
  "type": "files",
  "name": "Upload Resume",
  "required": false
}
```

**Page break (multi-page):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440007",
  "type": "nf-page-break",
  "name": "Page Break"
}
```

**Static text block:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440008",
  "type": "nf-text",
  "name": "Instructions",
  "content": "<p>Please fill in all required fields below.</p>"
}
```

---

## 6. SUBMISSIONS API

### 6.1 Create Submission (PUBLIC -- No Auth Required)
```
POST /forms/{slug}/answer
Content-Type: application/json

{
  "completion_time": 45,
  "3700d380-197b-47b9-a008-3acc31bbd506": "Alice Johnson",
  "12461db5-0c19-429e-840b-8de1e359c42f": "alice@example.com",
  "a8f5c2d1-9b7e-4c3f-8a1d-2e5f9c4b7a8e": "This is my message"
}
```

The request body keys are the **field UUIDs** (the `id` in each FormProperty).

Value types depend on field type:
- Text/email/url/phone: `string`
- Number/rating/scale/slider: `number`
- Checkbox/toggle: `boolean`
- Select/radio: `string` (the option id)
- Multi-select: `array` of strings
- Date: `string` (date format)
- Files: uploaded file references
- Matrix: `object`

Special fields:
- `completion_time` (number): Seconds to complete
- `is_partial` (boolean): Submit as partial (requires form setting)
- `submission_hash` (string): To update a partial submission

Response `200`:
```json
{
  "type": "success",
  "message": "Form submission saved.",
  "submission_id": "sub_1234567890",
  "is_first_submission": true,
  "redirect": false,
  "submission_hash": null
}
```

Partial submission response:
```json
{
  "type": "success",
  "message": "Partial form submission saved.",
  "submission_hash": "hash_abc123def456"
}
```

Validation error `422`:
```json
{
  "message": "The Name field is required.",
  "errors": {
    "3700d380-197b-47b9-a008-3acc31bbd506": ["The Name field is required."]
  }
}
```

### 6.2 List Submissions
```
GET /open/forms/{id}/submissions?page=1&per_page=100&status=completed&search=alice
Authorization: Bearer <token>
Ability: forms-read
```

Query parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `per_page` | number | 100 | Results per page (max 100) |
| `search` | string | - | Case-insensitive search in field values |
| `status` | string | `all` | `completed`, `partial`, or `all` |

Response `200`:
```json
{
  "data": [
    {
      "data": {
        "field-id-1": "Sample text response",
        "field-id-2": ["Option 1", "Option 2"],
        "field-id-3": [
          {
            "file_url": "https://...signed-url...",
            "file_name": "document.pdf"
          }
        ],
        "status": "completed",
        "created_at": "2024-06-12 09:15:23",
        "id": 615432
      },
      "completion_time": 45,
      "form_id": 123,
      "id": 615432
    }
  ],
  "links": { "first": "...", "last": "...", "prev": null, "next": "..." },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 3,
    "per_page": 100,
    "to": 100,
    "total": 250
  }
}
```

File URLs are signed and expire after 10 minutes.

### 6.3 Update Submission
```
PUT /open/forms/{id}/submissions/{submission_id}
Authorization: Bearer <token>
Ability: forms-write
Content-Type: application/json

{
  "field_name_uuid": "Updated Value",
  "completion_time": 125
}
```
Only send fields you want to change.

Response `200`:
```json
{
  "message": "Record successfully updated.",
  "data": { ... }
}
```

### 6.4 Delete Submission
```
DELETE /open/forms/{id}/submissions/{submission_id}
Authorization: Bearer <token>
Ability: forms-write
```
Response `200`:
```json
{ "message": "Record successfully removed." }
```

### 6.5 Bulk Delete Submissions
```
POST /open/forms/{form}/submissions/multi
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "ids": [1, 2, 3]
}
```

### 6.6 Export Submissions (CSV)
```
POST /open/forms/{id}/submissions/export
Authorization: Bearer <token>
Ability: forms-read
Content-Type: application/json

{
  "columns": {
    "field-uuid-1": true,
    "field-uuid-2": true,
    "created_at": true
  }
}
```

For small forms: returns CSV file directly (`Content-Type: text/csv`).
For large forms: returns async job:
```json
{
  "message": "Export started. Large export will be processed in the background.",
  "job_id": "export_abc123def456",
  "is_async": true
}
```

### 6.7 Check Export Status
```
GET /open/forms/{id}/submissions/export/{job_id}/status
Authorization: Bearer <token>
Ability: forms-read
```

Response states:
```json
// Processing
{ "status": "processing", "progress": 65, "processed_submissions": 650, "total_submissions": 1000 }

// Completed
{ "status": "completed", "progress": 100, "file_url": "https://...", "expires_at": "2024-06-13T09:15:23.000Z" }

// Failed
{ "status": "failed", "error_message": "Database connection timeout" }
```

Export files expire after 24 hours.

---

## 7. INTEGRATIONS / WEBHOOKS API

### 7.1 List Form Integrations
```
GET /open/forms/{formId}/integrations
Authorization: Bearer <token>
Ability: manage-integrations
```
Response: Array of integration objects.

### 7.2 Create Webhook Integration
```
POST /open/forms/{formId}/integrations
Authorization: Bearer <token>
Ability: manage-integrations
Content-Type: application/json

{
  "integration_id": "webhook",
  "status": "active",
  "data": {
    "webhook_url": "https://example.com/opnform-hook",
    "webhook_secret": "whsec_1234567890abcdefghijklmnop",
    "webhook_headers": {
      "X-API-Key": "my-api-key",
      "X-Custom-Header": "custom-value"
    }
  }
}
```

- `integration_id`: Must be `"webhook"`
- `status`: `"active"` or `"inactive"`
- `webhook_url`: Required. Valid HTTP/HTTPS URL.
- `webhook_secret`: Optional. Min 12 characters. Enables HMAC-SHA256 signing.
- `webhook_headers`: Optional. Max 10 custom headers. Max 255 chars per value.
- `logic`: Optional. Conditional logic for when to trigger.

**Blocked headers** (cannot be set): `Authorization`, `X-Webhook-Signature`, `Content-Type`, `Content-Length`, `Host`, `Cookie`, `X-CSRF-Token`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Real-IP`

Response `200`:
```json
{
  "message": "Form Integration was created.",
  "form_integration": {
    "id": 42,
    "form_id": 123,
    "integration_id": "webhook",
    "status": "active",
    "data": { "webhook_url": "...", "webhook_secret": "...", "webhook_headers": {...} }
  }
}
```

### 7.3 Update Webhook Integration
```
PUT /open/forms/{formId}/integrations/{integrationId}
Authorization: Bearer <token>
Ability: manage-integrations
Content-Type: application/json

{
  "integration_id": "webhook",
  "status": "active",
  "data": {
    "webhook_url": "https://new-endpoint.com/hook",
    "webhook_secret": "whsec_newsecret123456789abcdef"
  }
}
```

### 7.4 Delete Webhook Integration
```
DELETE /open/forms/{formId}/integrations/{integrationId}
Authorization: Bearer <token>
Ability: manage-integrations
```
Response: `{ "message": "Form Integration was deleted." }`

### 7.5 List Webhook Events (Audit Log)
```
GET /open/forms/{formId}/integrations/{integrationId}/events
Authorization: Bearer <token>
Ability: manage-integrations
```
Response:
```json
[
  {
    "id": 1001,
    "integration_id": 42,
    "event": "submission.created",
    "status": "success",
    "response_code": 200,
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 1000,
    "integration_id": 42,
    "event": "submission.created",
    "status": "failed",
    "response_code": 500,
    "error_message": "Internal Server Error",
    "created_at": "2024-01-15T10:25:00Z"
  }
]
```

Event statuses: `"success"`, `"failed"`, `"timeout"`

### 7.6 Webhook Payload & Signature Validation

Each webhook POST contains the submission data as JSON.

When `webhook_secret` is set, each request includes:
```
X-Webhook-Signature: sha256=HEXADECIMAL_VALUE
```

Signature is: `HMAC-SHA256(webhook_secret, raw_request_body)`

**Node.js validation:**
```javascript
const crypto = require('crypto');
const signature = req.headers['x-webhook-signature'];
const expectedSignature = 'sha256=' + crypto
  .createHmac('sha256', process.env.OPNFORM_WEBHOOK_SECRET)
  .update(req.body) // raw body, not parsed JSON
  .digest('hex');
const valid = crypto.timingSafeEqual(
  Buffer.from(signature), Buffer.from(expectedSignature)
);
```

**Python validation:**
```python
import hmac, hashlib
signature = request.headers.get('X-Webhook-Signature')
raw_body = request.get_data()
expected = 'sha256=' + hmac.new(
    secret.encode(), raw_body, hashlib.sha256
).hexdigest()
valid = hmac.compare_digest(signature, expected)
```

### 7.7 Available Integration Types

| Integration | Type | Pro Required |
|------------|------|-------------|
| Email Notification | `email` | No |
| Slack Notification | `slack` | Yes |
| Discord Notification | `discord` | Yes |
| Telegram Notification | `telegram` | Yes |
| Webhook | `webhook` | No |
| Zapier | `zapier` | No (external) |
| n8n | `n8n` | No (external) |
| Activepieces | `activepieces` | No (external) |
| Google Sheets | `google_sheets` | No |

---

## 8. TEMPLATES API

### 8.1 List Templates
```
GET /templates?limit=20&onlymy=false
```
No auth required for public templates. Auth required for private/user templates.

### 8.2 Get Template
```
GET /templates/{slug}
```

### 8.3 Create Template
```
POST /templates
Authorization: Bearer <jwt_token>
```

### 8.4 Update Template
```
PUT /templates/{id}
Authorization: Bearer <jwt_token>
```

### 8.5 Delete Template
```
DELETE /templates/{id}
Authorization: Bearer <jwt_token>
```

---

## 9. EMBEDDING FORMS

### 9.1 Direct URL

Every published form has a public URL:
```
https://forms.optihost.pro/forms/{slug}
```

### 9.2 iframe Embed

```html
<iframe
  style="border:none;width:100%;"
  id="my-form-slug"
  src="https://forms.optihost.pro/forms/my-form-slug"
></iframe>
<script
  type="text/javascript"
  onload="initEmbed('my-form-slug', { autoResize: true })"
  src="https://forms.optihost.pro/widgets/iframe.min.js"
></script>
```

For focused presentation style, use fixed height:
```html
<iframe
  style="border:none;width:100%;height:700px;max-height:90vh;"
  id="my-form-slug"
  src="https://forms.optihost.pro/forms/my-form-slug"
></iframe>
```

The `iframe.min.js` widget handles auto-resizing of the iframe to fit content.

### 9.3 Popup/Widget Embed

Add to `<head>`:
```html
<script
  async
  data-nf='{"formurl":"https://forms.optihost.pro/forms/my-form-slug","emoji":"chat","position":"right","bgcolor":"#3B82F6","width":"500"}'
  src="https://forms.optihost.pro/widgets/embed-min.js"
></script>
```

Options in `data-nf` JSON:
| Option | Type | Description |
|--------|------|-------------|
| `formurl` | string | Full URL of the form |
| `emoji` | string | Emoji for the floating button |
| `position` | string | `"right"` or `"left"` |
| `bgcolor` | string | Button background color (hex) |
| `width` | string | Popup max width in pixels |

### 9.4 API-based Submission (Headless)

You can build your own form UI and submit directly:

1. Fetch form structure: `GET /forms/{slug}` (public, no auth)
2. Render your own UI based on `properties`
3. Submit: `POST /forms/{slug}/answer` with field UUIDs as keys

This is a fully public flow -- no authentication needed.

### 9.5 PostMessage Events (for embedded forms)

When a form is submitted (embedded or standalone), OpnForm emits a `postMessage`:

```javascript
{
  "type": "form-submitted",
  "form": {
    "slug": "my-form-slug",
    "id": "42"
  },
  "submission_data": {
    "field_uuid": "field_value"
  }
}
```

Listen for it:
```javascript
window.addEventListener('message', function(event) {
  if (event.data?.type !== 'form-submitted') return;
  if (event.data?.form?.slug !== 'my-form-slug') return;
  // Handle submission (redirect, track event, etc.)
  console.log('Submission data:', event.data.submission_data);
});
```

---

## 10. ZAPIER / EXTERNAL API

These are legacy endpoints for the Zapier integration, authenticated with Sanctum tokens.

### 10.1 Validate API Key
```
GET /external/zapier/validate
Authorization: Bearer <token>
```

### 10.2 List Workspaces
```
GET /external/zapier/workspaces
Authorization: Bearer <token>
Ability: workspaces-read
```

### 10.3 List Forms
```
GET /external/zapier/forms?workspace_id=1
Authorization: Bearer <token>
Ability: forms-read
```

### 10.4 Subscribe Webhook (New Submission Trigger)
```
POST /external/zapier/webhook
Authorization: Bearer <token>
Ability: manage-integrations

{
  "hookUrl": "https://hooks.zapier.com/...",
  "form_id": 123
}
```

### 10.5 Unsubscribe Webhook
```
DELETE /external/zapier/webhook
Authorization: Bearer <token>
Ability: manage-integrations

{
  "hookUrl": "https://hooks.zapier.com/...",
  "form_id": 123
}
```

### 10.6 Poll Recent Submissions
```
GET /external/zapier/submissions/recent?form_id=123
Authorization: Bearer <token>
Ability: manage-integrations
```

---

## 11. OTHER ENDPOINTS

### 11.1 Health Check (self-hosted only)
```
GET /healthcheck
```

### 11.2 Feature Flags
```
GET /content/feature-flags
```

### 11.3 Available Fonts
```
GET /fonts
```

### 11.4 File Upload
```
POST /upload-file
```
Rate limited: 10/minute, 30/hour.

### 11.5 Form Asset Upload
```
POST /open/forms/assets/upload
```
Rate limited: 10/minute, 30/hour. No auth required.

### 11.6 AI Form Generation
```
POST /forms/ai/generate
{ "prompt": "Create a contact form with name, email, and message" }
```

### 11.7 User Profile Management
```
PATCH /settings/profile
Authorization: Bearer <jwt_token>
{ "name": "New Name" }

PATCH /settings/password
Authorization: Bearer <jwt_token>
{ "old_password": "...", "password": "...", "password_confirmation": "..." }
```

---

## 12. COMPLETE WORKFLOW EXAMPLES

### Example 1: Create a form and get submissions

```bash
# 1. List workspaces to get workspace_id
curl -s -H "Authorization: Bearer $TOKEN" \
  https://forms.optihost.pro/api/open/workspaces

# 2. Create a contact form
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://forms.optihost.pro/api/open/forms \
  -d '{
    "workspace_id": 1,
    "title": "Contact Form",
    "visibility": "public",
    "language": "en",
    "properties": [
      {
        "id": "name-field",
        "type": "text",
        "name": "Your Name",
        "required": true,
        "placeholder": "Full name"
      },
      {
        "id": "email-field",
        "type": "email",
        "name": "Email Address",
        "required": true,
        "placeholder": "email@example.com"
      },
      {
        "id": "message-field",
        "type": "text",
        "name": "Message",
        "required": true,
        "multi_lines": true,
        "placeholder": "Your message..."
      }
    ]
  }'

# 3. Submit to the form (no auth needed)
curl -s -X POST -H "Content-Type: application/json" \
  https://forms.optihost.pro/api/forms/contact-form/answer \
  -d '{
    "name-field": "John Doe",
    "email-field": "john@example.com",
    "message-field": "Hello from the API!",
    "completion_time": 30
  }'

# 4. List submissions
curl -s -H "Authorization: Bearer $TOKEN" \
  https://forms.optihost.pro/api/open/forms/42/submissions
```

### Example 2: Set up a webhook

```bash
# Create webhook for form ID 42
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://forms.optihost.pro/api/open/forms/42/integrations \
  -d '{
    "integration_id": "webhook",
    "status": "active",
    "data": {
      "webhook_url": "https://myapp.com/webhook",
      "webhook_secret": "my_secure_secret_12chars"
    }
  }'
```

### Example 3: Programmatic form creation with all field types

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://forms.optihost.pro/api/open/forms \
  -d '{
    "workspace_id": 1,
    "title": "Complete Survey",
    "visibility": "public",
    "language": "en",
    "properties": [
      {
        "id": "f1", "type": "text", "name": "Name",
        "required": true, "width": "1/2"
      },
      {
        "id": "f2", "type": "email", "name": "Email",
        "required": true, "width": "1/2"
      },
      {
        "id": "f3", "type": "select", "name": "Department",
        "required": true,
        "select": {
          "options": [
            {"name": "Engineering", "id": "eng"},
            {"name": "Marketing", "id": "mkt"},
            {"name": "Sales", "id": "sales"}
          ]
        }
      },
      {
        "id": "f4", "type": "multi_select", "name": "Skills",
        "multi_select": {
          "options": [
            {"name": "Python", "id": "py"},
            {"name": "JavaScript", "id": "js"},
            {"name": "SQL", "id": "sql"}
          ]
        }
      },
      {
        "id": "f5", "type": "rating", "name": "Satisfaction",
        "rating_max_value": 5
      },
      {
        "id": "f6", "type": "scale", "name": "Likelihood to recommend",
        "scale_min_value": 0, "scale_max_value": 10, "scale_step_value": 1
      },
      {
        "id": "f7", "type": "date", "name": "Start Date"
      },
      {
        "id": "f8", "type": "checkbox", "name": "I agree to terms",
        "required": true
      },
      {
        "id": "f9", "type": "text", "name": "Additional Comments",
        "multi_lines": true, "max_char_limit": 5000
      },
      {
        "id": "f10", "type": "files", "name": "Attachments"
      }
    ]
  }'
```

---

## 13. SELF-HOSTED NOTES (forms.optihost.pro)

- Base URL: `https://forms.optihost.pro/api` (all API paths are prefixed with `/api`)
- The public form URL: `https://forms.optihost.pro/forms/{slug}`
- For the public submission endpoint: `POST https://forms.optihost.pro/api/forms/{slug}/answer`
- First user registration is open (setup mode). Subsequent users must be invited.
- Health check available at: `GET /api/healthcheck`
- Templates may be fetched from the official OpnForm cloud if `OPNFORM_SHOW_OFFICIAL_TEMPLATES` is enabled.
- Embedding widgets are served from: `https://forms.optihost.pro/widgets/iframe.min.js` and `https://forms.optihost.pro/widgets/embed-min.js`
- File uploads stored locally or in S3 depending on configuration.
- Captcha (reCAPTCHA or hCaptcha) must be configured server-side for `use_captcha` to work.

---

## 14. NO MCP SERVER

There is no official "opnform-mcp" server or MCP integration available as of the latest repository state. For programmatic AI access, use the REST API documented above.

---

## 15. QUICK REFERENCE: ALL API ENDPOINTS

### Authenticated (Bearer Token - PAT)

| Method | Path | Ability | Description |
|--------|------|---------|-------------|
| GET | `/open/workspaces` | workspaces-read | List workspaces |
| POST | `/open/workspaces/create` | workspaces-write | Create workspace |
| PUT | `/open/workspaces/{id}` | workspaces-write | Update workspace |
| DELETE | `/open/workspaces/{id}` | workspaces-write | Delete workspace |
| GET | `/open/workspaces/{id}/users` | workspace-users-read | List workspace users |
| GET | `/open/workspaces/{id}/invites` | workspace-users-read | List invites |
| POST | `/open/workspaces/{id}/users/add` | workspace-users-write | Add/invite user |
| DELETE | `/open/workspaces/{id}/users/{userId}/remove` | workspace-users-write | Remove user |
| PUT | `/open/workspaces/{id}/users/{userId}/update-role` | workspace-users-write | Update role |
| POST | `/open/workspaces/{id}/leave` | workspace-users-write | Leave workspace |
| POST | `/open/workspaces/{id}/invites/{inviteId}/resend` | workspace-users-write | Resend invite |
| DELETE | `/open/workspaces/{id}/invites/{inviteId}/cancel` | workspace-users-write | Cancel invite |
| GET | `/open/workspaces/{id}/forms` | forms-read | List workspace forms |
| GET | `/open/forms/{slug}` | forms-read | Get form details |
| POST | `/open/forms` | forms-write | Create form |
| PUT | `/open/forms/{id}` | forms-write | Update form |
| DELETE | `/open/forms/{id}` | forms-write | Delete form |
| GET | `/open/forms/{id}/submissions` | forms-read | List submissions |
| PUT | `/open/forms/{id}/submissions/{subId}` | forms-write | Update submission |
| DELETE | `/open/forms/{id}/submissions/{subId}` | forms-write | Delete submission |
| POST | `/open/forms/{id}/submissions/export` | forms-read | Export CSV |
| GET | `/open/forms/{id}/submissions/export/{jobId}/status` | forms-read | Export status |
| GET | `/open/forms/{formId}/integrations` | manage-integrations | List integrations |
| POST | `/open/forms/{formId}/integrations` | manage-integrations | Create webhook |
| PUT | `/open/forms/{formId}/integrations/{intId}` | manage-integrations | Update webhook |
| DELETE | `/open/forms/{formId}/integrations/{intId}` | manage-integrations | Delete webhook |
| GET | `/open/forms/{formId}/integrations/{intId}/events` | manage-integrations | List webhook events |

### Public (No Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/forms/{slug}/answer` | Submit form response |
| GET | `/forms/{slug}` | Get public form (for rendering) |
| GET | `/templates` | List public templates |
| GET | `/templates/{slug}` | Get template |

### Session Auth (JWT)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Login |
| POST | `/register` | Register (first user / invited) |
| POST | `/logout` | Logout |
| GET | `/user` | Current user |
| GET | `/settings/tokens` | List PATs |
| POST | `/settings/tokens` | Create PAT |
| DELETE | `/settings/tokens/{id}` | Revoke PAT |
