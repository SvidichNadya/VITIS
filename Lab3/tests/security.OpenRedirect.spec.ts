test.describe('КРИТИЧЕСКИЕ: Open Redirect', () => {
  const redirectParams = [
    { path: '/login/index.php', param: 'wantsurl' },
    { path: '/login/oauth.php', param: 'redirect' },
    { path: '/admin/index.php', param: 'returnurl' },
  ];

  const maliciousUrls = [
    'https://evil.com',
    'https://evil.com/phishing',
    '//evil.com',
    '/\\evil.com',
    'https:evil.com',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
  ];

  for (const { path, param } of redirectParams) {
    test(`Open Redirect через ${path}?${param}=`, async ({ request }) => {
      for (const malicious of maliciousUrls) {
        const response = await request.get(path, {
          params: { [param]: malicious },
          maxRedirects: 0,
          failOnStatusCode: false
        });
        
        const location = response.headers()['location'] || '';
        
        const isMaliciousRedirect = 
          location.includes('evil.com') ||
          location.startsWith('javascript:') ||
          location.startsWith('data:');
        
        expect(isMaliciousRedirect, 
          `КРИТИЧНО: Open Redirect на ${malicious} через ${param}`
        ).toBeFalsy();
      }
    });
  }

  test('OAuth callback не перенаправляет на произвольный домен', async ({ request }) => {
    const response = await request.get('/auth/oauth2/callback.php', {
      params: { 
        code: 'test',
        redirect_uri: 'https://evil.com/steal'
      },
      maxRedirects: 0,
      failOnStatusCode: false
    });
    
    const location = response.headers()['location'] || '';
    expect(location).not.toContain('evil.com');
  });
});