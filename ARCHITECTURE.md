# Angular architecture

This application uses feature-based architecture with standalone components,
lazy-loaded feature routes, and NgRx SignalStore for entity state.

```text
src/app/
  application/       Cross-feature loading and mutation coordination
  core/
    auth/            Authentication, session state, guards
    http/            API client, endpoints, interceptors, transport contracts
    notifications/   Application messages and API error formatting
    realtime/        SignalR connection and event contracts
  features/
    auth/            Login page and routes
    students/        Student pages, API service, model, and store
    courses/         Course list, detail, and course management
    enrollments/     Enrollment and grading pages, services, and store
    certificates/    Certificate page, eligibility projection, and store
    transcripts/     Transcript request UI and workflow
    dashboard/       Dashboard page and aggregate API reads
  shared/
    data-access/     Feature-independent resource loading contract
  layout/            Application shell and navigation
```

## Responsibilities and dependencies

- Pages own forms, dialog state, search input, focus management, and feedback.
- Feature UI lives next to its business feature. Only genuinely generic UI
  belongs in `shared/ui`; add that directory when there is a shared component.
- API services perform HTTP calls and normalize transport responses.
- Each entity collection has one root-provided SignalStore. Stores expose
  readonly state signals, API operations, load state, and hydration methods.
  Successful API responses update the collection; failed writes leave it intact.
- Feature facades compose public store signals and operations when a page needs
  several features. For example, certificate eligibility combines enrollment,
  student, course, and certificate data without keeping another copy.
- `ApplicationDataCoordinator` is initialized by the shell. It loads the initial
  data for the signed-in role, hydrates feature stores, coordinates student
  deletion cleanup, and refreshes aggregate data after relevant mutations.
  The dashboard uses its aggregate projection. It does not own entity caches.
- Course and enrollment stores consume realtime events. The SignalR connection
  itself remains in `core/realtime`.
- `core` and `shared` must not import application orchestration or feature code.
  Cross-feature imports use public models, API services, or store methods;
  never another feature's page or private state. Keep the dependency graph acyclic.
- Business authorization and certificate eligibility remain enforced by the API.

## Routes and state lifetime

`app.routes.ts` owns the shell, access guards, and existing compatibility redirects.
Each navigable feature owns a `*.routes.ts` file with lazy component imports.
Public URLs and role restrictions are preserved. Root store instances intentionally
survive navigation so the dashboard and feature pages observe the same data.
Do not provide these stores again at route or component level.

The shell still loads the existing aggregate student/course/enrollment data on
sign-in. Lazy loading currently splits page code, not initial API requests.

## Adding a feature

Start with a feature directory, its model, page, and API service. Introduce a
store when state must survive navigation or be shared, and a facade when a page
needs to compose several stores. Keep simple UI state in the component. Add
cross-feature coordination to the application layer only when an operation
actually affects multiple features.

Run `npm run build` and `npm test -- --watch=false` after a structural change.
The coordinator integration tests cover shared hydration, failed writes,
deletion cleanup, and realtime certificate eligibility.
