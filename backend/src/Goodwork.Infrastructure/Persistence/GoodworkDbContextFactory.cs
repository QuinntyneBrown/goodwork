using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Goodwork.Infrastructure.Persistence;

/// <summary>Lets `dotnet ef` create the context at design time, without running the API.</summary>
public sealed class GoodworkDbContextFactory : IDesignTimeDbContextFactory<GoodworkDbContext>
{
    public GoodworkDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<GoodworkDbContext>().UseSqlite("Data Source=goodwork.db").Options);
}
