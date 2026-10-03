import { getPayPalCredentials } from '../paypal.js';

describe('getPayPalCredentials', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
  });

  it('should throw an error if PAYPAL_CLIENT_ID is missing', () => {
    delete process.env.PAYPAL_CLIENT_ID;
    process.env.PAYPAL_CLIENT_SECRET = 'test_secret';

    expect(() => getPayPalCredentials()).toThrow(
      'Missing PayPal API credentials. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set.'
    );
  });

  it('should throw an error if PAYPAL_CLIENT_SECRET is missing', () => {
    process.env.PAYPAL_CLIENT_ID = 'test_client_id';
    delete process.env.PAYPAL_CLIENT_SECRET;

    expect(() => getPayPalCredentials()).toThrow(
      'Missing PayPal API credentials. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set.'
    );
  });

  it('should throw an error if both PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are missing', () => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;

    expect(() => getPayPalCredentials()).toThrow(
      'Missing PayPal API credentials. PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set.'
    );
  });

  it('should return credentials with default sandbox mode and URL when PAYPAL_MODE is not set', () => {
    process.env.PAYPAL_CLIENT_ID = 'my_client_id';
    process.env.PAYPAL_CLIENT_SECRET = 'my_client_secret';
    delete process.env.PAYPAL_MODE;

    const credentials = getPayPalCredentials();

    expect(credentials).toEqual({
      clientId: 'my_client_id',
      clientSecret: 'my_client_secret',
      mode: 'sandbox',
      baseUrl: 'https://api-m.sandbox.paypal.com',
    });
  });

  it('should return credentials with sandbox mode and URL when PAYPAL_MODE is sandbox', () => {
    process.env.PAYPAL_CLIENT_ID = 'my_client_id';
    process.env.PAYPAL_CLIENT_SECRET = 'my_client_secret';
    process.env.PAYPAL_MODE = 'sandbox';

    const credentials = getPayPalCredentials();

    expect(credentials).toEqual({
      clientId: 'my_client_id',
      clientSecret: 'my_client_secret',
      mode: 'sandbox',
      baseUrl: 'https://api-m.sandbox.paypal.com',
    });
  });

  it('should return credentials with live mode and URL when PAYPAL_MODE is live', () => {
    process.env.PAYPAL_CLIENT_ID = 'my_live_client_id';
    process.env.PAYPAL_CLIENT_SECRET = 'my_live_client_secret';
    process.env.PAYPAL_MODE = 'live';

    const credentials = getPayPalCredentials();

    expect(credentials).toEqual({
      clientId: 'my_live_client_id',
      clientSecret: 'my_live_client_secret',
      mode: 'live',
      baseUrl: 'https://api-m.paypal.com',
    });
  });
});
