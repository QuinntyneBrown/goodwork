// Acceptance Test
// Traces to: L2-011
// Description: HTTPS is enforced with HSTS, every response carries the security headers,
// cross-origin writes are refused, and endpoints require authentication unless they opt out.

using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Goodwork.Api.Tests;

public sealed class TransportSecurityTests
{
    private readonly GoodworkFactory factory = new();

    private static object Valid => new { email = "ruth@hopehouse.org", message = "Hello" };

    [Fact]
    public async Task Http_request_is_redirected_to_https()
    {
        var client = factory.CreateClient(new() { AllowAutoRedirect = false, BaseAddress = new Uri("http://goodwork.test") });

        var response = await client.PostAsJsonAsync("/api/contact-requests", Valid);

        Assert.Equal(HttpStatusCode.RedirectKeepVerb, response.StatusCode);
        Assert.Equal("https", response.Headers.Location!.Scheme);
    }

    [Fact]
    public async Task Https_responses_carry_HSTS()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });

        var response = await client.PostAsJsonAsync("/api/contact-requests", Valid);

        Assert.True(response.Headers.TryGetValues("Strict-Transport-Security", out var hsts));
        Assert.Contains("max-age=", hsts!.Single());
    }

    [Fact]
    public async Task Every_response_carries_the_security_headers()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });

        var response = await client.PostAsJsonAsync("/api/contact-requests", Valid);

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());
        var csp = response.Headers.GetValues("Content-Security-Policy").Single();
        Assert.Contains("script-src 'self'", csp);
        Assert.DoesNotContain("'unsafe-inline'", csp.Split(';').Single(d => d.TrimStart().StartsWith("script-src")));
        Assert.Contains("frame-ancestors 'none'", csp);
    }

    [Fact]
    public async Task Security_headers_are_also_sent_on_error_responses()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });

        var response = await client.PostAsJsonAsync("/api/contact-requests", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
    }

    [Fact]
    public async Task Cross_origin_post_is_rejected()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/contact-requests") { Content = JsonContent.Create(Valid) };
        request.Headers.Add("Origin", "https://evil.test");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(await factory.StoredRequestsAsync());
    }

    [Fact]
    public async Task Same_origin_post_is_accepted()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/contact-requests") { Content = JsonContent.Create(Valid) };
        request.Headers.Add("Origin", "https://goodwork.test");

        Assert.Equal(HttpStatusCode.Accepted, (await client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task Preflight_from_another_origin_gets_no_CORS_allowance()
    {
        var client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/contact-requests");
        request.Headers.Add("Origin", "https://evil.test");
        request.Headers.Add("Access-Control-Request-Method", "POST");

        var response = await client.SendAsync(request);

        Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Endpoints_require_authentication_unless_they_opt_out()
    {
        var provider = factory.Services.GetRequiredService<IAuthorizationPolicyProvider>();

        var fallback = await provider.GetFallbackPolicyAsync();

        Assert.NotNull(fallback);
        Assert.Contains(fallback!.Requirements, r => r is Microsoft.AspNetCore.Authorization.Infrastructure.DenyAnonymousAuthorizationRequirement);
    }
}
