namespace Goodwork.Infrastructure.Email;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = "";

    public int Port { get; set; } = 587;

    public bool UseStartTls { get; set; } = true;

    public string Username { get; set; } = "";

    public string Password { get; set; } = "";

    /// <summary>When set, messages are written here as text files instead of being sent. For local development.</summary>
    public string PickupDirectory { get; set; } = "";
}
