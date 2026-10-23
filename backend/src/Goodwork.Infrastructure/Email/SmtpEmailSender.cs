using Goodwork.Application.Contact;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Text;

namespace Goodwork.Infrastructure.Email;

public sealed class SmtpEmailSender(IOptions<SmtpOptions> options) : IEmailSender
{
    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (settings.PickupDirectory.Length > 0)
        {
            Directory.CreateDirectory(settings.PickupDirectory);
            var text = $"To: {message.To}\nFrom: {message.From}\nReply-To: {message.ReplyTo}\nSubject: {message.Subject}\n\n{message.PlainTextBody}";
            await File.WriteAllTextAsync(Path.Combine(settings.PickupDirectory, $"{Guid.NewGuid():N}.txt"), text, cancellationToken);
            return;
        }

        var mime = new MimeMessage();
        mime.From.Add(MailboxAddress.Parse(message.From));
        mime.To.Add(MailboxAddress.Parse(message.To));
        mime.ReplyTo.Add(MailboxAddress.Parse(message.ReplyTo));
        mime.Subject = message.Subject;
        mime.Body = new TextPart(TextFormat.Plain) { Text = message.PlainTextBody };

        using var client = new SmtpClient();
        await client.ConnectAsync(
            settings.Host, settings.Port,
            settings.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto, cancellationToken);
        if (settings.Username.Length > 0)
        {
            await client.AuthenticateAsync(settings.Username, settings.Password, cancellationToken);
        }

        await client.SendAsync(mime, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
