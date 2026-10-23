using MediatR;

namespace Goodwork.Application.Contact;

/// <summary>Deletes contact requests past the retention period. Returns how many were deleted.</summary>
public sealed record DeleteExpiredContactRequestsCommand : IRequest<int>;
