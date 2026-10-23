// Acceptance Test
// Traces to: L2-009, L2-011
// Description: Stored requests are emailed to the studio inbox with Reply-To set to the sender,
// retried when the mail service fails, never logged with their content, and deleted after 24 months.

using System.Net;
using System.Net.Http.Json;
using Goodwork.Domain;

namespace Goodwork.Api.Tests;

public sealed class DeliverContactRequestTests
{
    private const string Sender = "ruth@hopehouse.org";
    private const string Message = "We run a transitional housing program and need a case management app.";

    private readonly GoodworkFactory factory = new();

    private async Task SubmitAsync(string email = Sender, string message = Message)
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/contact-requests", new { email, message });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task Pending_request_is_emailed_to_the_studio_inbox_with_reply_to_the_sender()
    {
        await SubmitAsync();

        Assert.Equal(1, await factory.DeliverDueAsync());

        var email = Assert.Single(factory.Email.Sent);
        Assert.Equal("studio@example.test", email.To);
        Assert.Equal("no-reply@example.test", email.From);
        Assert.Equal(Sender, email.ReplyTo);
        Assert.Contains(Sender, email.PlainTextBody);
        Assert.Contains(Message, email.PlainTextBody);
        Assert.DoesNotContain("<html", email.PlainTextBody, StringComparison.OrdinalIgnoreCase);
        var stored = Assert.Single(await factory.StoredRequestsAsync());
        Assert.Equal(DeliveryStatus.Delivered, stored.DeliveryStatus);
    }

    [Fact]
    public async Task Delivered_request_is_not_sent_twice()
    {
        await SubmitAsync();
        await factory.DeliverDueAsync();

        Assert.Equal(0, await factory.DeliverDueAsync());
        Assert.Single(factory.Email.Sent);
    }

    [Fact]
    public async Task Markup_in_the_message_reaches_the_email_as_plain_text()
    {
        await SubmitAsync(message: "<script>alert(1)</script>");

        await factory.DeliverDueAsync();

        Assert.Contains("<script>alert(1)</script>", Assert.Single(factory.Email.Sent).PlainTextBody);
    }

    [Fact]
    public async Task Mail_failure_keeps_the_request_and_retries_after_a_delay()
    {
        await SubmitAsync();
        factory.Email.Fail = true;

        Assert.Equal(0, await factory.DeliverDueAsync());

        var stored = Assert.Single(await factory.StoredRequestsAsync());
        Assert.Equal(DeliveryStatus.Pending, stored.DeliveryStatus);
        Assert.Equal(1, stored.DeliveryAttempts);
        Assert.Equal(factory.Time.GetUtcNow().AddMinutes(1), stored.NextAttemptAt);

        // Not due yet: no second attempt.
        Assert.Equal(0, await factory.DeliverDueAsync());
        Assert.Equal(1, Assert.Single(await factory.StoredRequestsAsync()).DeliveryAttempts);

        factory.Email.Fail = false;
        factory.Time.Advance(TimeSpan.FromMinutes(1));

        Assert.Equal(1, await factory.DeliverDueAsync());
        Assert.Equal(DeliveryStatus.Delivered, Assert.Single(await factory.StoredRequestsAsync()).DeliveryStatus);
    }

    [Fact]
    public async Task Logs_never_contain_the_message_body_or_the_full_email_address()
    {
        await SubmitAsync();
        factory.Email.Fail = true;
        await factory.DeliverDueAsync();
        factory.Email.Fail = false;
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        await factory.DeliverDueAsync();

        var logs = string.Join('\n', factory.Logs.Lines);
        Assert.DoesNotContain(Message, logs);
        Assert.DoesNotContain(Sender, logs);
    }

    [Fact]
    public async Task Requests_older_than_24_months_are_deleted()
    {
        await SubmitAsync(email: "old@example.org");
        factory.Time.Advance(TimeSpan.FromDays(732));
        await SubmitAsync(email: "new@example.org");

        Assert.Equal(1, await factory.DeleteExpiredAsync());

        var remaining = Assert.Single(await factory.StoredRequestsAsync());
        Assert.Equal("new@example.org", remaining.Email);
    }

    [Fact]
    public async Task Requests_just_inside_24_months_are_kept()
    {
        await SubmitAsync();
        factory.Time.Advance(TimeSpan.FromDays(700));

        Assert.Equal(0, await factory.DeleteExpiredAsync());
        Assert.Single(await factory.StoredRequestsAsync());
    }
}
