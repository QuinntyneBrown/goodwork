namespace Goodwork.Application.Contact;

public sealed class StudioInboxOptions
{
    public const string SectionName = "StudioInbox";

    public string InboxAddress { get; set; } = "";

    public string FromAddress { get; set; } = "";
}
