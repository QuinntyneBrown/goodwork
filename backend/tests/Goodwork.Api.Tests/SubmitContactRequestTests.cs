// Acceptance Test
// Traces to: L2-008
// Description: POST /api/contact-requests stores a valid request and returns 202,
// and rejects invalid bodies with 400 naming each invalid field.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Goodwork.Api.Tests;

public sealed class SubmitContactRequestTests
{
    private readonly GoodworkFactory factory;
    private readonly HttpClient client;

    public SubmitContactRequestTests()
    {
        factory = new GoodworkFactory();
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Valid_body_returns_202_and_stores_a_trimmed_request()
    {
        var response = await client.PostAsJsonAsync("/api/contact-requests",
            new { email = "  ruth@hopehouse.org ", message = "  We need an app.  " });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var stored = Assert.Single(await factory.StoredRequestsAsync());
        Assert.Equal("ruth@hopehouse.org", stored.Email);
        Assert.Equal("We need an app.", stored.Message);
        Assert.Equal(factory.Time.GetUtcNow(), stored.ReceivedAt);
        Assert.NotEqual(Guid.Empty, stored.Id);
    }

    [Theory]
    [InlineData("ruth@", "Hello", "email")]
    [InlineData("", "Hello", "email")]
    [InlineData("ruth@hopehouse.org", "   ", "message")]
    [InlineData("ruth@hopehouse.org", "", "message")]
    public async Task Invalid_body_returns_400_naming_the_field_and_stores_nothing(string email, string message, string field)
    {
        var response = await client.PostAsJsonAsync("/api/contact-requests", new { email, message });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(problem.GetProperty("errors").TryGetProperty(field, out _));
        Assert.Empty(await factory.StoredRequestsAsync());
    }

    [Fact]
    public async Task Email_over_254_characters_returns_400()
    {
        var email = new string('a', 250) + "@x.org";
        var response = await client.PostAsJsonAsync("/api/contact-requests", new { email, message = "Hello" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.StoredRequestsAsync());
    }

    [Fact]
    public async Task Message_over_2000_characters_returns_400()
    {
        var response = await client.PostAsJsonAsync("/api/contact-requests",
            new { email = "ruth@hopehouse.org", message = new string('x', 2001) });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(await factory.StoredRequestsAsync());
    }

    [Fact]
    public async Task Message_of_exactly_2000_characters_is_accepted()
    {
        var response = await client.PostAsJsonAsync("/api/contact-requests",
            new { email = "ruth@hopehouse.org", message = new string('x', 2000) });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task Missing_fields_return_400()
    {
        var response = await client.PostAsJsonAsync("/api/contact-requests", new { });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        var errors = problem.GetProperty("errors");
        Assert.True(errors.TryGetProperty("email", out _));
        Assert.True(errors.TryGetProperty("message", out _));
    }

    [Fact]
    public async Task Unknown_properties_are_ignored()
    {
        var response = await client.PostAsJsonAsync("/api/contact-requests",
            new { email = "ruth@hopehouse.org", message = "Hello", isAdmin = true, id = Guid.NewGuid() });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var stored = Assert.Single(await factory.StoredRequestsAsync());
        Assert.NotEqual(Guid.Empty, stored.Id);
    }
}
