using Goodwork.Application.Contact;
using MediatR;
using Goodwork.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;

namespace Goodwork.Api.Tests;

public sealed class GoodworkFactory : WebApplicationFactory<Program>
{
    private readonly string databaseName = Guid.NewGuid().ToString();

    /// <summary>A folder to serve as the site's static files, standing in for the built Angular app.</summary>
    public string? WebRoot { get; init; }

    public FakeEmailSender Email { get; } = new();

    public FailingSaveInterceptor Storage { get; } = new();

    public CapturingLoggerProvider Logs { get; } = new();

    public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 10, 23, 12, 0, 0, TimeSpan.Zero));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        if (WebRoot is not null) builder.UseWebRoot(WebRoot);
        builder.UseSetting("Workers:Enabled", "false");
        builder.UseSetting("ForwardedHeaders:Enabled", "true");
        builder.UseSetting("StudioInbox:InboxAddress", "studio@example.test");
        builder.UseSetting("StudioInbox:FromAddress", "no-reply@example.test");
        builder.ConfigureLogging(l => l.AddProvider(Logs));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<GoodworkDbContext>>();
            services.RemoveAll(typeof(IDbContextOptionsConfiguration<GoodworkDbContext>));
            services.AddDbContext<GoodworkDbContext>(o => o.UseInMemoryDatabase(databaseName).AddInterceptors(Storage));
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Email);
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
        });
    }

    public async Task<List<Goodwork.Domain.ContactRequest>> StoredRequestsAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<GoodworkDbContext>();
        return await db.ContactRequests.AsNoTracking().ToListAsync();
    }

    public async Task<int> DeliverDueAsync()
    {
        using var scope = Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new DeliverDueContactRequestsCommand());
    }

    public async Task<int> DeleteExpiredAsync()
    {
        using var scope = Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(new DeleteExpiredContactRequestsCommand());
    }
}
