using MediatR;

namespace Goodwork.Application.Contact;

/// <summary>Sends every contact request that is due. Returns how many were delivered.</summary>
public sealed record DeliverDueContactRequestsCommand : IRequest<int>;
