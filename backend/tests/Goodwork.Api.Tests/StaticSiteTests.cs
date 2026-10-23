// Acceptance Test
// Traces to: L2-001, L2-011, L2-015
// Description: The API serves the built Angular app: the shell at "/", client-side routes fall back to it,
// unknown API paths do not, hashed assets are cached for a year and the shell is never cached.

using System.Net;

namespace Goodwork.Api.Tests;

public sealed class StaticSiteTests : IDisposable
{
    private readonly string webRoot = Directory.CreateTempSubdirectory("goodwork-web").FullName;
    private readonly GoodworkFactory factory;
    private readonly HttpClient client;

    public StaticSiteTests()
    {
        File.WriteAllText(Path.Combine(webRoot, "index.html"), "<!doctype html><title>Goodwork</title><gw-root></gw-root>");
        File.WriteAllText(Path.Combine(webRoot, "main-ABC123.js"), "console.log('app');");
        factory = new GoodworkFactory { WebRoot = webRoot };
        client = factory.CreateClient(new() { BaseAddress = new Uri("https://goodwork.test") });
    }

    public void Dispose()
    {
        client.Dispose();
        factory.Dispose();
        Directory.Delete(webRoot, recursive: true);
    }

    [Fact]
    public async Task Root_serves_the_app_shell_anonymously_with_the_security_headers_and_no_caching()
    {
        var response = await client.GetAsync("/");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("<gw-root>", await response.Content.ReadAsStringAsync());
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
        Assert.Equal("no-cache", response.Headers.CacheControl?.ToString());
    }

    [Fact]
    public async Task Client_side_routes_fall_back_to_the_app_shell()
    {
        var response = await client.GetAsync("/some/client/route");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("<gw-root>", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Unknown_api_paths_return_404_not_the_app_shell()
    {
        var response = await client.GetAsync("/api/unknown");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Hashed_assets_are_served_with_a_one_year_immutable_cache()
    {
        var response = await client.GetAsync("/main-ABC123.js");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cache = response.Headers.CacheControl!;
        Assert.Equal(TimeSpan.FromDays(365), cache.MaxAge);
        Assert.Contains("immutable", cache.ToString());
        Assert.True(response.Headers.Contains("X-Content-Type-Options"));
    }

    [Fact]
    public async Task Static_responses_over_http_are_redirected_to_https()
    {
        var http = factory.CreateClient(new() { AllowAutoRedirect = false, BaseAddress = new Uri("http://goodwork.test") });

        var response = await http.GetAsync("/");

        Assert.Equal(HttpStatusCode.RedirectKeepVerb, response.StatusCode);
    }
}
