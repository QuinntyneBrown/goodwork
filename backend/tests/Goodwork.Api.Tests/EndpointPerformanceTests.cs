// Acceptance Test
// Traces to: L2-016
// Description: 20 concurrent valid submissions complete with a 95th percentile under 500 ms,
// and no email is sent on the request path.

using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;

namespace Goodwork.Api.Tests;

public sealed class EndpointPerformanceTests
{
    private readonly GoodworkFactory factory = new();

    private async Task<(HttpStatusCode Status, TimeSpan Elapsed)> PostAsync(HttpClient client, int clientNumber)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/contact-requests")
        {
            Content = JsonContent.Create(new { email = $"person{clientNumber}@example.org", message = "We would like a quote." }),
        };
        request.Headers.Add("X-Forwarded-For", $"203.0.113.{clientNumber}");
        var watch = Stopwatch.StartNew();
        var response = await client.SendAsync(request);
        return (response.StatusCode, watch.Elapsed);
    }

    [Fact]
    public async Task Twenty_concurrent_submissions_finish_with_p95_under_500_ms_and_send_no_email()
    {
        var client = factory.CreateClient();
        await PostAsync(client, 250); // warm-up: JIT and first-request costs are not what the budget measures

        var results = await Task.WhenAll(Enumerable.Range(1, 20).Select(n => Task.Run(() => PostAsync(client, n))));

        Assert.All(results, r => Assert.Equal(HttpStatusCode.Accepted, r.Status));
        var sorted = results.Select(r => r.Elapsed).Order().ToArray();
        var p95 = sorted[(int)Math.Ceiling(sorted.Length * 0.95) - 1];
        Assert.True(p95 < TimeSpan.FromMilliseconds(500), $"p95 was {p95.TotalMilliseconds:F0} ms");
        Assert.Empty(factory.Email.Sent);
        Assert.Equal(21, (await factory.StoredRequestsAsync()).Count);
    }
}
