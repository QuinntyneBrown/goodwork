namespace Goodwork.Application.Contact;

public sealed record EmailMessage(string From, string To, string ReplyTo, string Subject, string PlainTextBody);
