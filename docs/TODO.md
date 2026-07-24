# TODO

## No release blocker

The deployed teaching flow and automatic deployment are operational.

## Deliberate demo limitations

- Passwords are stored as plaintext and captcha is fixed for deterministic automation. Before any real-user use, add password hashing, signed/expiring sessions, rate limits, and a non-deterministic verification mechanism.
- Checkout has no payment provider, inventory reservation, cancellation, refund, or idempotency protections.
- Public demo state is shared. Add isolated test users or a protected reset mechanism only if concurrent learners require it.
- Administrator authentication is role-based but still uses a demo password and unsigned id cookie. Real deployment needs stronger authentication, authorization auditing, and a dedicated admin identity lifecycle.
- The administrator dashboard shows cumulative demo metrics. Add date-range aggregation, pagination and data-export controls only with matching API, test-selector and Playwright contract updates.

## Future enhancements

- Add product variants and pagination only with corresponding stable selector and Playwright contract updates.
- Add a production monitoring/error-reporting path if the demo becomes broadly public.
- Consider a staging Worker/D1 environment before introducing schema changes beyond the teaching dataset.
