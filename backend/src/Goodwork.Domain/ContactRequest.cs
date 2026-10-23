namespace Goodwork.Domain;

public sealed class ContactRequest
{
    private ContactRequest()
    {
    }

    public Guid Id { get; private set; }

    public string Email { get; private set; } = "";

    public string Message { get; private set; } = "";

    public DateTimeOffset ReceivedAt { get; private set; }

    public DeliveryStatus DeliveryStatus { get; private set; }

    public int DeliveryAttempts { get; private set; }

    public DateTimeOffset? NextAttemptAt { get; private set; }

    public static ContactRequest Create(string email, string message, DateTimeOffset receivedAt) => new()
    {
        Id = Guid.NewGuid(),
        Email = email.Trim(),
        Message = message.Trim(),
        ReceivedAt = receivedAt,
        DeliveryStatus = DeliveryStatus.Pending,
        NextAttemptAt = receivedAt,
    };

    public void MarkDelivered()
    {
        DeliveryStatus = DeliveryStatus.Delivered;
        NextAttemptAt = null;
    }

    public void RecordFailedAttempt(DateTimeOffset now)
    {
        DeliveryAttempts++;
        NextAttemptAt = DeliveryAttempts >= MaxDeliveryAttempts ? null : now + BackoffAfter(DeliveryAttempts);
    }

    public const int MaxDeliveryAttempts = 24;

    private static TimeSpan BackoffAfter(int attempts) => attempts switch
    {
        1 => TimeSpan.FromMinutes(1),
        2 => TimeSpan.FromMinutes(5),
        3 => TimeSpan.FromMinutes(15),
        _ => TimeSpan.FromHours(1),
    };
}
