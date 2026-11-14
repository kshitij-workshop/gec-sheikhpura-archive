## Summary

<!-- What changed and why? Link the phase or issue. -->

## Scope

- Phase:
- Affected modules:

## Verification

<!-- List the exact commands executed and their actual results. -->

- [ ] `cd backend && ./mvnw -B verify`
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm run typecheck`
- [ ] `cd frontend && npm run test`
- [ ] `cd frontend && npm run build`

## Security review

- [ ] Authorization and ownership are enforced on the backend.
- [ ] No secrets, tokens, or production connection strings are added.
- [ ] Public APIs do not expose pending, private, or deleted content.
- [ ] Untrusted client input (URLs, IDs, metadata) is validated and authorized.
- [ ] Administrative actions produce audit records where required.

## Documentation

- [ ] Documentation updated for contract or architecture changes.
- [ ] Not applicable.

## Screenshots

<!-- UI changes only. Remove this section if not applicable. -->
