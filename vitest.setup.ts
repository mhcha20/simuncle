// Server modules create their Stripe client at import time. Unit tests mock
// every Stripe call, so a placeholder key is enough when no real key is set.
process.env.STRIPE_SECRET_KEY ??= "sk_test_placeholder";
// Session cookies are signed with this; tests must not depend on a real secret.
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret-0123";
