// Acceptance Test
// Traces to: L2-010, L2-009
// Description: The contact endpoint rate-limits, discards honeypot submissions, rejects
// oversized bodies, stores messages as plain text, and answers 503 when storage fails.

using System.Net;
using System.Net.Http.Json;

namespace Goodwork.Api.Tests;

public sealed class AbuseProtectionTests
{
    private readonly GoodworkFactory factory = new();

    private HttpClient Client => factory.CreateClient();

    private static object Valid => new { email = "ruth@hopehouse.org", message = "Hello" };

    [Fact]
    public async Task Sixth_request_within_the_window_returns_429_with_Retry_After()
    {
        var client = Client;
        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/contact-requests", Valid)).StatusCode);
        }

        var response = await client.PostAsJsonAsync("/api/contact-requests", Valid);

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("Retry-After", out var values));
        Assert.True(int.Parse(values!.Single()) > 0);
        Assert.Equal(5, (await factory.StoredRequestsAsync()).Count);
    }

    [Fact]
    public async Task Filled_honeypot_returns_202_but_stores_nothing()
    {
        var response = await Client.PostAsJsonAsync("/api/contact-requests",
            new { email = "bot@spam.test", message = "Buy now", website = "https://spam.test" });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Empty(await factory.StoredRequestsAsync());
    }

    [Fact]
    public async Task Body_over_16_KB_returns_413()
    {
        var response = await Client.PostAsJsonAsync("/api/contact-requests",
            new { email = "ruth@hopehouse.org", message = new string('x', 20 * 1024) });

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
        Assert.Empty(await factory.StoredRequestsAsync());
    }

    [Fact]
    public async Task Markup_in_the_message_is_stored_verbatim_as_plain_text()
    {
        const string markup = "<script>alert(1)</script> <b>hi</b>";

        var response = await Client.PostAsJsonAsync("/api/contact-requests", new { email = "ruth@hopehouse.org", message = markup });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(markup, Assert.Single(await factory.StoredRequestsAsync()).Message);
    }

    [Fact]
    public async Task Storage_failure_returns_503()
    {
        factory.Storage.Fail = true;

        var response = await Client.PostAsJsonAsync("/api/contact-requests", Valid);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }
}
