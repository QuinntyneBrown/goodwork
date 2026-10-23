using Goodwork.Application.Contact;
using Goodwork.Domain;
using Microsoft.EntityFrameworkCore;

namespace Goodwork.Infrastructure.Persistence;

public sealed class GoodworkDbContext(DbContextOptions<GoodworkDbContext> options) : DbContext(options), IGoodworkDbContext
{
    public DbSet<ContactRequest> ContactRequests => Set<ContactRequest>();

    // SQLite cannot compare or order DateTimeOffset values, so store them as UTC ticks.
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTimeOffset>().HaveConversion<UtcTicksConverter>();
        configurationBuilder.Properties<DateTimeOffset?>().HaveConversion<UtcTicksConverter>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ContactRequest>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Email).HasMaxLength(254).IsRequired();
            e.Property(c => c.Message).HasMaxLength(2000).IsRequired();
            e.Property(c => c.DeliveryStatus).HasConversion<string>().HasMaxLength(16);
            e.HasIndex(c => new { c.DeliveryStatus, c.NextAttemptAt });
            e.HasIndex(c => c.ReceivedAt);
        });
    }
}
