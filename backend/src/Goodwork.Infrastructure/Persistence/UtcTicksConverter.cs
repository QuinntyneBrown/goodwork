using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Goodwork.Infrastructure.Persistence;

public sealed class UtcTicksConverter()
    : ValueConverter<DateTimeOffset, long>(v => v.UtcTicks, v => new DateTimeOffset(v, TimeSpan.Zero));
