using Goodwork.Application.Contact;

namespace Goodwork.Api.Tests;

public sealed class FakeEmailSender : IEmailSender
{
    private readonly List<EmailMessage> sent = [];

    public IReadOnlyList<EmailMessage> Sent => sent;

    public bool Fail { get; set; }

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (Fail) throw new InvalidOperationException("Mail service unavailable.");
        sent.Add(message);
        return Task.CompletedTask;
    }
}
