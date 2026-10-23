using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Goodwork.Application.Contact;

public sealed class DeleteExpiredContactRequestsCommandHandler(
    IGoodworkDbContext db,
    TimeProvider time,
    ILogger<DeleteExpiredContactRequestsCommandHandler> logger)
    : IRequestHandler<DeleteExpiredContactRequestsCommand, int>
{
    public const int RetentionMonths = 24;

    public async Task<int> Handle(DeleteExpiredContactRequestsCommand command, CancellationToken cancellationToken)
    {
        var cutoff = time.GetUtcNow().AddMonths(-RetentionMonths);
        var expired = await db.ContactRequests.Where(c => c.ReceivedAt < cutoff).ToListAsync(cancellationToken);
        db.ContactRequests.RemoveRange(expired);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Count} expired contact requests", expired.Count);
        return expired.Count;
    }
}
