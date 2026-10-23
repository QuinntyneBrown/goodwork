using Goodwork.Domain;
using Microsoft.EntityFrameworkCore;

namespace Goodwork.Application.Contact;

public interface IGoodworkDbContext
{
    DbSet<ContactRequest> ContactRequests { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
