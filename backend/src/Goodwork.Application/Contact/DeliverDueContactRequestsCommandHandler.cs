using Goodwork.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Goodwork.Application.Contact;

public sealed class DeliverDueContactRequestsCommandHandler(
    IGoodworkDbContext db,
    IEmailSender emailSender,
    IOptions<StudioInboxOptions> options,
    TimeProvider time,
    ILogger<DeliverDueContactRequestsCommandHandler> logger)
    : IRequestHandler<DeliverDueContactRequestsCommand, int>
{
    private const int BatchSize = 20;

    public async Task<int> Handle(DeliverDueContactRequestsCommand command, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var due = await db.ContactRequests
            .Where(c => c.DeliveryStatus == DeliveryStatus.Pending && c.NextAttemptAt != null && c.NextAttemptAt <= now)
            .OrderBy(c => c.NextAttemptAt)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        var delivered = 0;
        foreach (var request in due)
        {
            try
            {
                await emailSender.SendAsync(Compose(request), cancellationToken);
                request.MarkDelivered();
                delivered++;
                logger.LogInformation("Delivered contact request {ContactRequestId}", request.Id);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                request.RecordFailedAttempt(now);
                // Log the exception type only: provider messages can echo the addresses and body.
                logger.LogWarning(
                    "Delivery of contact request {ContactRequestId} failed on attempt {Attempt}: {ExceptionType}",
                    request.Id, request.DeliveryAttempts, ex.GetType().Name);
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        return delivered;
    }

    private EmailMessage Compose(ContactRequest request)
    {
        var settings = options.Value;
        var body = $"New contact request received {request.ReceivedAt:u}\n\nFrom: {request.Email}\n\n{request.Message}\n";
        return new EmailMessage(settings.FromAddress, settings.InboxAddress, request.Email, "New Goodwork contact request", body);
    }
}
