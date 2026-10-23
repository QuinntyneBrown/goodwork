using Goodwork.Application.Contact;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Goodwork.Api.Infrastructure;

namespace Goodwork.Api.Controllers;

[ApiController]
[Route("api/contact-requests")]
public sealed class ContactRequestsController(ISender sender) : ControllerBase
{
    public const long MaxBodyBytes = 16 * 1024;

    [HttpPost]
    [AllowAnonymous]
    [EnableRateLimiting(ContactRateLimiting.PolicyName)]
    [MaxBodySize(MaxBodyBytes)]
    public async Task<IActionResult> Submit(SubmitContactRequestCommand command, CancellationToken cancellationToken)
    {
        await sender.Send(command, cancellationToken);
        return Accepted();
    }
}
