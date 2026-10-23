using Goodwork.Application.Contact;
using MediatR;

namespace Goodwork.Api.Workers;

public sealed class ContactRequestRetentionWorker(IServiceScopeFactory scopes, ILogger<ContactRequestRetentionWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan RunInterval = TimeSpan.FromDays(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(RunInterval);
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<ISender>().Send(new DeleteExpiredContactRequestsCommand(), stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError("Contact request retention run failed: {ExceptionType}", ex.GetType().Name);
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
