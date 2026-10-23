using System.Text.RegularExpressions;
using FluentValidation;

namespace Goodwork.Application.Contact;

public sealed class SubmitContactRequestCommandValidator : AbstractValidator<SubmitContactRequestCommand>
{
    public const int EmailMaxLength = 254;
    public const int MessageMaxLength = 2000;

    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    public SubmitContactRequestCommandValidator()
    {
        RuleFor(c => c.Email)
            .Cascade(CascadeMode.Stop)
            .Must(e => !string.IsNullOrWhiteSpace(e)).WithMessage("Enter a complete email address like name@organization.org")
            .Must(e => e!.Trim().Length <= EmailMaxLength).WithMessage($"Email must be {EmailMaxLength} characters or fewer")
            .Must(e => EmailPattern.IsMatch(e!.Trim())).WithMessage("Enter a complete email address like name@organization.org");

        RuleFor(c => c.Message)
            .Cascade(CascadeMode.Stop)
            .Must(m => !string.IsNullOrWhiteSpace(m)).WithMessage("Tell us a little about your project so we know who to put on the call")
            .Must(m => m!.Trim().Length <= MessageMaxLength).WithMessage($"Message must be {MessageMaxLength} characters or fewer");
    }
}
