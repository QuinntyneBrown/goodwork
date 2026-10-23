using Goodwork.Infrastructure;
using Goodwork.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

if (args is not ["migrate"])
{
    Console.Error.WriteLine("Usage: goodwork migrate");
    return 64;
}

var configuration = new ConfigurationBuilder()
    .AddEnvironmentVariables()
    .Build();

await using var provider = new ServiceCollection().AddInfrastructure(configuration).BuildServiceProvider();
await using var scope = provider.CreateAsyncScope();
var db = scope.ServiceProvider.GetRequiredService<GoodworkDbContext>();
await db.Database.MigrateAsync();
Console.WriteLine("Database is up to date.");
return 0;
