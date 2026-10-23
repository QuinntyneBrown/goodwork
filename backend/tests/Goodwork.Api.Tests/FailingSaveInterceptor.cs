using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Goodwork.Api.Tests;

public sealed class FailingSaveInterceptor : SaveChangesInterceptor
{
    public bool Fail { get; set; }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        => Fail ? throw new DbUpdateException("Storage unavailable.") : base.SavingChangesAsync(eventData, result, cancellationToken);
}
