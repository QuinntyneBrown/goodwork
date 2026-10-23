using Goodwork.Domain;
using MediatR;

namespace Goodwork.Application.Contact;

public sealed class SubmitContactRequestCommandHandler(IGoodworkDbContext db, TimeProvider time)
    : IRequestHandler<SubmitContactRequestCommand>
{
    public async Task Handle(SubmitContactRequestCommand command, CancellationToken cancellationToken)
    {
        // A filled honeypot field marks a bot: report success and keep nothing.
        if (!string.IsNullOrWhiteSpace(command.Website))
        {
            return;
        }

        db.ContactRequests.Add(ContactRequest.Create(command.Email!, command.Message!, time.GetUtcNow()));
        await db.SaveChangesAsync(cancellationToken);
    }
}
