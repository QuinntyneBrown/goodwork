using Goodwork.Application.Contact;
using MediatR;

namespace Goodwork.Api.Workers;

public sealed class ContactRequestDeliveryWorker(IServiceScopeFactory scopes, ILogger<ContactRequestDeliveryWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<ISender>().Send(new DeliverDueContactRequestsCommand(), stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError("Contact request delivery run failed: {ExceptionType}", ex.GetType().Name);
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
