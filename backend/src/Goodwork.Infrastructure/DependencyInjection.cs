using Goodwork.Application.Contact;
using Goodwork.Infrastructure.Email;
using Goodwork.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Goodwork.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<GoodworkDbContext>(o =>
            o.UseSqlite(configuration.GetConnectionString("Goodwork") ?? "Data Source=goodwork.db"));
        services.AddScoped<IGoodworkDbContext>(sp => sp.GetRequiredService<GoodworkDbContext>());
        services.AddSingleton(TimeProvider.System);
        services.AddOptions<StudioInboxOptions>().Bind(configuration.GetSection(StudioInboxOptions.SectionName));
        services.AddOptions<SmtpOptions>().Bind(configuration.GetSection(SmtpOptions.SectionName));
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        return services;
    }
}
