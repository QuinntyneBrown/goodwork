using MediatR;

namespace Goodwork.Application.Contact;

public sealed record SubmitContactRequestCommand(string? Email, string? Message, string? Website) : IRequest;
