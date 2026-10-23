using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Goodwork.Api.Infrastructure;

public sealed class StorageExceptionHandler(ILogger<StorageExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not DbUpdateException)
        {
            return false;
        }

        // The exception message can echo submitted values, so log the type only.
        logger.LogError("Storage failed while handling {Path}: {ExceptionType}", httpContext.Request.Path, exception.GetType().Name);
        httpContext.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        await httpContext.Response.WriteAsJsonAsync(
            new ProblemDetails { Status = StatusCodes.Status503ServiceUnavailable, Title = "Service unavailable" },
            options: null,
            contentType: "application/problem+json",
            cancellationToken);
        return true;
    }
}
