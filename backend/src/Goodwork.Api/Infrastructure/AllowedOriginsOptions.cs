namespace Goodwork.Api.Infrastructure;

public sealed class AllowedOriginsOptions
{
    public const string SectionName = "AllowedOrigins";

    /// <summary>Extra origins allowed to post, besides the site's own. Empty in production; the dev server in development.</summary>
    public string[] Origins { get; set; } = [];
}
